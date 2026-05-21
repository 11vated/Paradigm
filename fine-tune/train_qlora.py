#!/usr/bin/env python3
"""
train_qlora.py — Paradigm local QLoRA fine-tune.

Loads a ShareGPT-format JSONL dataset shipped by ship-dataset.ts,
4-bit-quantises the base model, attaches a LoRA adapter, and trains.

Defaults are sized for a 24 GB GPU on a 7B model. Drop --batch to 2 or
--rank to 8 if you OOM. Everything is deterministic given --seed.
"""
from __future__ import annotations
import argparse, json, os, random, sys
from pathlib import Path

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True, help="HF repo or local path of the base model")
    p.add_argument("--dataset", required=True, help="ShareGPT JSONL produced by ship-dataset.ts")
    p.add_argument("--out", required=True, help="Output dir (adapter + tokenizer)")
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--batch", type=int, default=4)
    p.add_argument("--grad-accum", type=int, default=4)
    p.add_argument("--lr", type=float, default=2e-4)
    p.add_argument("--rank", type=int, default=16)
    p.add_argument("--alpha", type=int, default=32)
    p.add_argument("--dropout", type=float, default=0.05)
    p.add_argument("--max-seq", type=int, default=2048)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--warmup-ratio", type=float, default=0.03)
    args = p.parse_args()

    random.seed(args.seed)
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

    # Lazy imports so --help works without GPU stack installed.
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from datasets import load_dataset
    from trl import SFTTrainer

    torch.manual_seed(args.seed)

    print(f"[paradigm-qlora] base={args.base} dataset={args.dataset} out={args.out}")
    bnb = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )
    tok = AutoTokenizer.from_pretrained(args.base, use_fast=True)
    if tok.pad_token is None: tok.pad_token = tok.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        args.base,
        quantization_config=bnb,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model)
    lora = LoraConfig(
        r=args.rank, lora_alpha=args.alpha, lora_dropout=args.dropout,
        bias="none", task_type="CAUSAL_LM",
        target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"],
    )
    model = get_peft_model(model, lora)
    model.print_trainable_parameters()

    ds = load_dataset("json", data_files=args.dataset, split="train")

    def format_sharegpt(example):
        msgs = example.get("conversations") or []
        # Convert OpenAI-style messages to a flat instruction text the SFTTrainer can consume
        out = []
        for m in msgs:
            role = m.get("from") or m.get("role")
            content = m.get("value") or m.get("content") or ""
            if role in ("system","human","user"):
                out.append(f"<|{role}|>\n{content}")
            else:
                out.append(f"<|{role or 'assistant'}|>\n{content}")
        return {"text": "\n".join(out) + tok.eos_token}

    ds = ds.map(format_sharegpt, remove_columns=ds.column_names)

    targs = TrainingArguments(
        output_dir=args.out,
        per_device_train_batch_size=args.batch,
        gradient_accumulation_steps=args.grad_accum,
        num_train_epochs=args.epochs,
        learning_rate=args.lr,
        warmup_ratio=args.warmup_ratio,
        lr_scheduler_type="cosine",
        logging_steps=10,
        save_strategy="epoch",
        bf16=True,
        gradient_checkpointing=True,
        report_to=[],
        seed=args.seed,
    )
    trainer = SFTTrainer(
        model=model,
        args=targs,
        train_dataset=ds,
        tokenizer=tok,
        dataset_text_field="text",
        max_seq_length=args.max_seq,
    )
    trainer.train()
    out = Path(args.out) / "adapter"
    out.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(out)
    tok.save_pretrained(out)
    with (Path(args.out) / "training-summary.json").open("w") as f:
        json.dump({
            "base": args.base, "dataset": args.dataset, "epochs": args.epochs,
            "batch": args.batch, "lr": args.lr, "rank": args.rank, "alpha": args.alpha,
            "seed": args.seed,
        }, f, indent=2)
    print(f"[paradigm-qlora] done. adapter at {out}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
