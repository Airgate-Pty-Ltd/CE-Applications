#!/usr/bin/env python3
import os
os.environ['HF_HOME'] = r'D:\huggingface_cache'
os.environ['TRANSFORMERS_CACHE'] = r'D:\huggingface_cache'

import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments, BitsAndBytesConfig
from peft import get_peft_model, LoraConfig, TaskType

training_data = r"D:\quality-llm\data\training_data_final.jsonl"
output_dir = r"D:\quality-llm\models\mistral-v1.0.0-quantized"

print("\n" + "="*80)
print("FINE-TUNING MISTRAL 7B (4-BIT QUANTIZED - LOWER MEMORY)")
print("="*80 + "\n")

print("Loading training data...", end="", flush=True)
dataset = load_dataset('json', data_files=training_data, split='train')
print(" ✅")
print(f"Training samples: {len(dataset)}\n")

print("Loading quantized Mistral 7B...", end="", flush=True)

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)

model_name = "mistralai/Mistral-7B-Instruct-v0.1"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto",
)
print(" ✅")

print("Configuring LoRA...", end="", flush=True)
lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)
model = get_peft_model(model, lora_config)
print(" ✅\n")

def format_data(example):
    return {'text': f"Prompt: {example['prompt']}\n\nCompletion: {example['completion']}"}

dataset = dataset.map(format_data)

def tokenize_function(examples):
    return tokenizer(examples['text'], truncation=True, max_length=512)

dataset = dataset.map(tokenize_function, batched=True, batch_size=50)

print("="*80)
print("STARTING FINE-TUNING (2-4 hours)")
print("="*80 + "\n")

training_args = TrainingArguments(
    output_dir=output_dir,
    num_train_epochs=2,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,
    save_steps=100,
    save_total_limit=2,
    logging_steps=50,
    learning_rate=2e-4,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
)

trainer.train()

print("\n" + "="*80)
print("FINE-TUNING COMPLETE!")
print("="*80 + "\n")

model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)

print(f"Model saved to: {output_dir}")
print(f"✅ Quantized v1.0.0 ready!\n")