# ─── SBERT Embedder Sidecar — self-hosted sentence-transformers ────────────
# Per Appendix D D-5: self-hosted SBERT from day one, no vendor API in the
# critical path. Exposes a minimal FastAPI server with a single /embed route.
#
# Image is intentionally CPU-only to keep the default deployment footprint
# small (MiniLM-L6-v2 runs fine on CPU at ~15ms/seq for 384-dim vectors).
# GPU image can be added later via a build arg if needed.
# ────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models

WORKDIR /app

# System deps: gcc for torch wheels on certain archs; curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py ./

# Pre-warm the default model into the image cache so the first request isn't
# blocked on a network download. Override with SBERT_MODEL env at runtime.
ARG SBERT_MODEL=sentence-transformers/all-MiniLM-L6-v2
ENV SBERT_MODEL=${SBERT_MODEL}
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('${SBERT_MODEL}')"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
