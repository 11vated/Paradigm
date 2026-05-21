#!/usr/bin/env python3
"""
export_gguf.py — merge a LoRA adapter into the base, then convert to GGUF
for Ollama / llama.cpp consumption. Requires `llama.cpp/convert-hf-to-gguf.py`
on PATH or via --llama-cpp-dir.

Produces:
  <out>/merged/                  fp16 merged model
  <out>/paradigm.gguf            Q4_K_M quant (default)
  <out>/Modelfile                Ollama Modelfile referencing the gguf

Run:
  python fine-tune/export_gguf.py --adapter ./fine-tune/out/<run-id>/adapter
"""
from __future__ import annotations
import argparse, os, subprocess, sys
from pathlib import Path

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--adapter", required=True)
    p.add_argument("--quant", default="Q4_K_M", help="GGUF quant type")
    p.add_argument("--llama-cpp-dir", default=os.environ.get("LLAMA_CPP_DIR", ""))
    args = p.parse_args()
    adapter = Path(args.adapter)
    out_root = adapter.parent
    merged = out_root / "merged"
    merged.mkdir(parents=True, exist_ok=True)

    # 1. Merge LoRA into base weights via peft.
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    print("[paradigm-export] merging LoRA adapter…")
    base_name = None
    cfg_path = adapter / "adapter_config.json"
    import json
    cfg = json.load(open(cfg_path))
    base_name = cfg["base_model_name_or_path"]
    base = AutoModelForCausalLM.from_pretrained(base_name, torch_dtype=torch.bfloat16, device_map="cpu")
    merged_model = PeftModel.from_pretrained(base, adapter).merge_and_unload()
    merged_model.save_pretrained(merged)
    AutoTokenizer.from_pretrained(base_name).save_pretrained(merged)

    # 2. Run llama.cpp's converter to GGUF.
    conv = Path(args.llama_cpp_dir or ".") / "convert-hf-to-gguf.py"
    if not conv.exists():
        print(f"!! convert-hf-to-gguf.py not found at {conv}", file=sys.stderr)
        print("   set --llama-cpp-dir or LLAMA_CPP_DIR env var", file=sys.stderr)
        return 2
    gguf_out = out_root / f"paradigm.{args.quant}.gguf"
    print("[paradigm-export] converting to GGUF…")
    subprocess.check_call(["python", str(conv), str(merged), "--outfile", str(gguf_out), "--outtype", args.quant.lower()])

    # 3. Write a Modelfile for Ollama.
    modelfile = out_root / "Modelfile"
    modelfile.write_text(f"""FROM {gguf_out.name}
PARAMETER temperature 0.4
PARAMETER top_p 0.9
PARAMETER stop "<|user|>"
PARAMETER stop "<|assistant|>"
SYSTEM "You are a Paradigm GSPL Agent. Emit only valid GSPL when asked for code."
""")
    print(f"[paradigm-export] done. gguf={gguf_out}  modelfile={modelfile}")
    print("   ollama create paradigm-tuned -f " + str(modelfile))
    return 0

if __name__ == "__main__":
    sys.exit(main())
