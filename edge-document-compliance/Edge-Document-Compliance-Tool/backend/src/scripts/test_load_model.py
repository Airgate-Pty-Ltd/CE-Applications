#!/usr/bin/env python3
import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

d_cache = r"D:\huggingface_cache"

print("Testing model load from D: drive...\n")

try:
    print("1. Loading tokenizer...", end="", flush=True)
    tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-Instruct-v0.1", cache_dir=d_cache)
    print(" ✅")
    
    print("2. Creating quantization config...", end="", flush=True)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )
    print(" ✅")
    
    print("3. Loading model (this takes 2-5 min)...", end="", flush=True)
    model = AutoModelForCausalLM.from_pretrained(
        "mistralai/Mistral-7B-Instruct-v0.1",
        quantization_config=bnb_config,
        device_map="auto",
        cache_dir=d_cache,
    )
    print(" ✅")
    
    print("\n✅ SUCCESS - Model loads from D: drive!\n")

except Exception as e:
    print(f"\n❌ ERROR: {e}\n")