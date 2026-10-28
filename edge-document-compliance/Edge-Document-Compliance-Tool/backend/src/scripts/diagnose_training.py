#!/usr/bin/env python3
import os
import sys

d_cache = r"D:\huggingface_cache"
training_data = r"D:\quality-llm\data\training_data_final.jsonl"

print("\n" + "="*80)
print("DIAGNOSTIC: Finding What's Failing")
print("="*80 + "\n")

# Test 1: Check files exist
print("1. Checking files...")
if os.path.exists(training_data):
    size = os.path.getsize(training_data) / 1024 / 1024
    print(f"   ✅ training_data_final.jsonl exists ({size:.1f} MB)")
else:
    print(f"   ❌ training_data_final.jsonl NOT FOUND!")
    sys.exit(1)

if os.path.exists(d_cache):
    print(f"   ✅ D:\\huggingface_cache exists")
else:
    print(f"   ❌ D:\\huggingface_cache NOT FOUND!")
    sys.exit(1)

# Test 2: Load dataset
print("\n2. Loading dataset...")
try:
    from datasets import load_dataset
    dataset = load_dataset('json', data_files=training_data, split='train')
    print(f"   ✅ Dataset loaded: {len(dataset)} samples")
except Exception as e:
    print(f"   ❌ Dataset load failed: {e}")
    sys.exit(1)

# Test 3: Load tokenizer
print("\n3. Loading tokenizer...")
try:
    from transformers import AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-Instruct-v0.1", cache_dir=d_cache)
    print(f"   ✅ Tokenizer loaded")
except Exception as e:
    print(f"   ❌ Tokenizer load failed: {e}")
    sys.exit(1)

# Test 4: Load model with quantization
print("\n4. Loading model (this takes 2-5 minutes)...")
try:
    import torch
    from transformers import AutoModelForCausalLM, BitsAndBytesConfig
    
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )
    
    model = AutoModelForCausalLM.from_pretrained(
        "mistralai/Mistral-7B-Instruct-v0.1",
        quantization_config=bnb_config,
        device_map="auto",
        cache_dir=d_cache,
    )
    print(f"   ✅ Model loaded successfully")
except Exception as e:
    print(f"   ❌ Model load failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Setup LoRA
print("\n5. Setting up LoRA...")
try:
    from peft import get_peft_model, LoraConfig, TaskType
    
    lora_config = LoraConfig(
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )
    model = get_peft_model(model, lora_config)
    print(f"   ✅ LoRA configured")
except Exception as e:
    print(f"   ❌ LoRA setup failed: {e}")
    sys.exit(1)

print("\n" + "="*80)
print("✅ ALL CHECKS PASSED - Ready for fine-tuning!")
print("="*80 + "\n")