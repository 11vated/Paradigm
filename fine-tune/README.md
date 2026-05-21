# Paradigm Local Fine-Tune

Sovereign QLoRA fine-tuning of small base models on captures from the
self-bootstrapping loop. Runs on a single consumer GPU (≥ 16 GB VRAM
recommended for Llama-3.1-8B / Qwen2.5-7B 4-bit; 24+ GB for 13B).

## Pipeline

```
   InMemoryBootstrapStore  ──► ship-dataset.ts  ──►  dataset/{sharegpt.jsonl, alpaca.jsonl}
                                                             │
                                                             ▼
                                                  fine-tune/train_qlora.py
                                                             │
                                                             ▼
                                                  fine-tune/out/<run-id>/adapter
                                                             │
                                                             ▼
                                                  Ollama Modelfile / GGUF export
                                                             │
                                                             ▼
                                                  src/lib/intelligence/llm/ollama.ts
                                                  (set OLLAMA_MODEL=paradigm-tuned:v1)
```

## Quick start

```bash
# 1. Ship the current bootstrap store to a HF-compatible dataset
bun fine-tune/ship-dataset.ts \
  --store    /var/lib/paradigm/bootstrap.jsonl \
  --out      ./fine-tune/dataset \
  --format   sharegpt \
  --min-score 0.65 \
  --approved-only

# 2. Install Python deps (one-time, on the training rig)
python -m venv .venv && source .venv/bin/activate
pip install -r fine-tune/requirements.txt

# 3. Run QLoRA training
python fine-tune/train_qlora.py \
  --base      Qwen/Qwen2.5-7B-Instruct \
  --dataset   ./fine-tune/dataset/sharegpt.jsonl \
  --out       ./fine-tune/out/$(date +%Y%m%d-%H%M%S) \
  --epochs    3 \
  --batch     4 \
  --lr        2e-4 \
  --rank      16

# 4. Export to GGUF for Ollama
python fine-tune/export_gguf.py --adapter ./fine-tune/out/<run-id>/adapter
ollama create paradigm-tuned -f ./fine-tune/out/<run-id>/Modelfile
```

## Sovereignty notes

- Training runs entirely on the user's GPU. No weights leave the rig.
- The dataset is also exportable to disk; nothing is shipped externally
  unless the user explicitly chooses to publish a HuggingFace adapter.
- Default base models are open-weight (Apache-2 or similar) — Llama 3.1,
  Qwen 2.5, Mistral 7B, Phi-3.5. No proprietary models.
- All training arguments are deterministic given `--seed` (default 42).
