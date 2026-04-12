"""
Paradigm GSPL Agent — Fine-tuned Llama 3 Inference Server

Serves a QLoRA-tuned Llama 3 8B model trained on GSPL conversations,
domain specs, and seed creation patterns.

Usage:
  pip install fastapi uvicorn transformers torch bitsandbytes accelerate
  python main.py                                   # Defaults: port 8001
  LLM_MODEL_PATH=./my-lora python main.py         # Custom LoRA path

Docker:
  docker build -t paradigm-llm .
  docker run --gpus 1 -p 8001:8001 paradigm-llm

Protocol:
  POST /generate  { "prompt": "...", "max_tokens": 512, "temperature": 0.7 }
  → { "response": "...", "tokens_generated": N, "model": "..." }

  GET /health → { "status": "ok", "model": "...", "device": "..." }
"""
import os
import time
import logging
from typing import Optional

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# ─── Configuration ─────────────────────────────────────────────────────────────
MODEL_PATH = os.environ.get("LLM_MODEL_PATH", "unsloth/llama-3-8b-bnb-4bit")
LORA_PATH = os.environ.get("LLM_LORA_PATH", "./gspl-agent-lora")
PORT = int(os.environ.get("LLM_PORT", "8001"))
MAX_TOKENS = int(os.environ.get("LLM_MAX_TOKENS", "512"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("paradigm-llm")

app = FastAPI(
    title="Paradigm GSPL Agent LLM",
    description="Fine-tuned Llama 3 for GSPL seed creation and domain knowledge",
    version="1.0.0",
)

# ─── Model Loading ─────────────────────────────────────────────────────────────
tokenizer = None
model = None
device_info = "not loaded"


def load_model():
    global tokenizer, model, device_info

    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig

        logger.info(f"Loading base model from {MODEL_PATH}...")

        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )

        tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        # Try loading LoRA adapter if it exists
        if os.path.isdir(LORA_PATH):
            logger.info(f"Loading LoRA adapter from {LORA_PATH}...")
            from peft import PeftModel
            base = AutoModelForCausalLM.from_pretrained(
                MODEL_PATH,
                quantization_config=bnb_config,
                device_map="auto",
                torch_dtype=torch.bfloat16,
            )
            model = PeftModel.from_pretrained(base, LORA_PATH)
            model = model.merge_and_unload()
        else:
            logger.info("No LoRA adapter found, using base model")
            model = AutoModelForCausalLM.from_pretrained(
                MODEL_PATH,
                quantization_config=bnb_config,
                device_map="auto",
                torch_dtype=torch.bfloat16,
            )

        device_info = str(next(model.parameters()).device)
        logger.info(f"Model loaded on {device_info}")

    except ImportError as e:
        logger.warning(f"GPU dependencies not available: {e}")
        logger.warning("Running in stub mode — will return template responses")
        device_info = "stub (no GPU)"

    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        device_info = f"error: {e}"


# ─── Request/Response Models ──────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="The prompt to complete")
    max_tokens: int = Field(default=MAX_TOKENS, ge=1, le=2048)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    system_prompt: Optional[str] = Field(
        default="You are the Paradigm GSPL Agent. You help users create seeds, "
        "compose across domains, and write GSPL code. You know all 26 domains "
        "and 17 gene types. Respond with actionable GSPL code when appropriate.",
        description="System prompt prepended to the conversation",
    )


class GenerateResponse(BaseModel):
    response: str
    tokens_generated: int
    model: str
    latency_ms: float


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    load_model()


@app.get("/health")
async def health():
    return {
        "status": "ok" if model is not None or device_info == "stub (no GPU)" else "degraded",
        "model": MODEL_PATH,
        "lora": LORA_PATH if os.path.isdir(LORA_PATH) else "none",
        "device": device_info,
    }


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    start = time.time()

    if model is None or tokenizer is None:
        # Stub mode — return a helpful template response
        stub_response = _stub_generate(req.prompt)
        return GenerateResponse(
            response=stub_response,
            tokens_generated=len(stub_response.split()),
            model="stub",
            latency_ms=round((time.time() - start) * 1000, 2),
        )

    # Format as chat
    messages = []
    if req.system_prompt:
        messages.append({"role": "system", "content": req.system_prompt})
    messages.append({"role": "user", "content": req.prompt})

    # Tokenize
    try:
        if hasattr(tokenizer, "apply_chat_template"):
            input_text = tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
        else:
            input_text = f"### System:\n{req.system_prompt}\n\n### User:\n{req.prompt}\n\n### Assistant:\n"

        inputs = tokenizer(input_text, return_tensors="pt").to(model.device)
        input_len = inputs["input_ids"].shape[1]

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=req.max_tokens,
                temperature=req.temperature if req.temperature > 0 else None,
                do_sample=req.temperature > 0,
                top_p=0.9,
                repetition_penalty=1.1,
                pad_token_id=tokenizer.pad_token_id,
            )

        new_tokens = outputs[0][input_len:]
        response_text = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

        return GenerateResponse(
            response=response_text,
            tokens_generated=len(new_tokens),
            model=MODEL_PATH,
            latency_ms=round((time.time() - start) * 1000, 2),
        )

    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _stub_generate(prompt: str) -> str:
    """Template-based fallback when no GPU model is loaded."""
    p = prompt.lower()
    if "create" in p and "seed" in p:
        domain = "character"
        for d in ["music", "sprite", "animation", "ecosystem", "architecture", "narrative"]:
            if d in p:
                domain = d
                break
        return (
            f'seed NewSeed {{\n  domain: {domain};\n  gene core_power: scalar = 0.75;\n'
            f'  gene complexity: scalar = 0.6;\n  gene theme_color: vector = [0.8, 0.3, 0.1];\n}}'
        )
    elif "domain" in p:
        return "Available domains: character, sprite, animation, music, ecosystem, fullgame, architecture, fashion, cuisine, language, ritual, narrative, vehicle, weapon, terrain, weather, economy, politics, philosophy, mathematics, chemistry, biology, astronomy, technology, art, poetry"
    elif "gene type" in p:
        return "Available gene types: scalar, categorical, vector, expression, struct, array, graph, topology, temporal, regulatory, field, symbolic, quantum, gematria, resonance, dimensional, sovereignty"
    elif "compose" in p:
        return "Use composition to bridge domains: character→sprite, character→music, sprite→animation. Each bridge applies a functor that transforms gene structures."
    else:
        return f"I understand your query about: {prompt[:100]}. Use GSPL to define seeds with typed genes across 26 creative domains."


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
