"""SBERT embedder sidecar.

Exposes a minimal FastAPI service with two endpoints:

    GET  /health      -> {"status": "ok", "model": "<id>", "dim": <int>}
    POST /embed       -> {"vectors": [[float, ...]], "dim": <int>, "model": "<id>"}

The Node app calls /embed with either a single string or a batch; the service
returns 384-dim (MiniLM-L6) vectors by default. Vectors are L2-normalized so
cosine similarity reduces to a dot product — which matters because pgvector's
`<=>` operator is cosine distance, and we want the comparison math to agree
whether we run it in SQL or in-process.

This is per Appendix D D-5: self-hosted SBERT from day one, no vendor API in
the critical path for embeddings.
"""
from __future__ import annotations

import os
from typing import List, Union

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_ID = os.environ.get("SBERT_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
MAX_BATCH = int(os.environ.get("SBERT_MAX_BATCH", "128"))
MAX_TEXT_LEN = int(os.environ.get("SBERT_MAX_TEXT_LEN", "4096"))

app = FastAPI(title="Paradigm SBERT Embedder", version="1.0.0")
_model: SentenceTransformer | None = None


def _load_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_ID)
    return _model


class EmbedRequest(BaseModel):
    # Accept either a single string or a batch. Keeping this field shape
    # matches the Node client's TypeScript union `string | string[]`.
    text: Union[str, List[str]] = Field(..., description="Text or batch of texts to embed")


class EmbedResponse(BaseModel):
    vectors: List[List[float]]
    dim: int
    model: str


@app.on_event("startup")
def _warm() -> None:
    # Force the model into memory at boot so the first /embed call isn't slow.
    _load_model()


@app.get("/health")
def health() -> dict:
    model = _load_model()
    dim = model.get_sentence_embedding_dimension()
    return {"status": "ok", "model": MODEL_ID, "dim": dim}


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> EmbedResponse:
    texts: List[str] = [req.text] if isinstance(req.text, str) else list(req.text)

    if not texts:
        raise HTTPException(status_code=400, detail="text must be non-empty")
    if len(texts) > MAX_BATCH:
        raise HTTPException(status_code=400, detail=f"batch exceeds MAX_BATCH={MAX_BATCH}")
    for t in texts:
        if len(t) > MAX_TEXT_LEN:
            raise HTTPException(status_code=400, detail=f"text exceeds {MAX_TEXT_LEN} chars")

    model = _load_model()
    # normalize_embeddings=True yields unit-length vectors so cosine similarity
    # equals dot product. pgvector's `<=>` is cosine distance; agreement matters.
    vectors = model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
    # Defensive: sanity-check shape so a bad model swap can't leak garbage.
    if not isinstance(vectors, np.ndarray) or vectors.ndim != 2:
        raise HTTPException(status_code=500, detail="model produced unexpected shape")
    return EmbedResponse(
        vectors=vectors.tolist(),
        dim=vectors.shape[1],
        model=MODEL_ID,
    )
