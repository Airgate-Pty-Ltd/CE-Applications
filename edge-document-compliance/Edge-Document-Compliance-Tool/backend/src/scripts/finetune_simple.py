#!/usr/bin/env python3
import os
import warnings
warnings.filterwarnings('ignore')

d_cache = r"D:\huggingface_cache"
training_data = r"D:\quality-llm\data\training_data_final.jsonl"
output_dir = r"D:\quality-llm\models\mistral-v1.0.0"

print("\nLoading training data...")
from datasets import load_dataset
dataset = load_dataset('json', data_files=training_data, split='train')
print(f"✅ {len(dataset)} samples loaded\n")

print("Loading tokenizer...")
from transformers import AutoTokenizer
tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-Instruct-v0.1", cache_dir=d_cache)
print("✅ Tokenizer loaded\n")

print("Loading model (please wait 5-10 minutes)...")
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
print("✅ Model loaded\n")

print("Configuring LoRA...")
from peft import get_peft_model, LoraConfig, TaskType
lora_config = LoraConfig(r=8, lora_alpha=16, lora_dropout=0.05, bias="none", task_type=TaskType.CAUSAL_LM)
model = get_peft_model(model, lora_config)
print("✅ LoRA configured\n")

print("Preparing dataset...")
def format_data(example):
    return {'text': f"Prompt: {example['prompt']}\n\nCompletion: {example['completion']}"}
dataset = dataset.map(format_data)
def tokenize_function(examples):
    return tokenizer(examples['text'], truncation=True, max_length=512)
dataset = dataset.map(tokenize_function, batched=True, batch_size=50)
print("✅ Dataset ready\n")

print("="*80)
print("STARTING FINE-TUNING (2-4 hours)")
print("="*80 + "\n")

from transformers import Trainer, TrainingArguments
training_args = TrainingArguments(
    output_dir=output_dir,
    num_train_epochs=2,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,
    save_steps=100,
    logging_steps=50,
    learning_rate=2e-4,
)

trainer = Trainer(model=model, args=training_args, train_dataset=dataset)
trainer.train()

model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)

print("\n" + "="*80)
print("✅ FINE-TUNING COMPLETE!")
print("="*80)
print(f"Model: {output_dir}\n")