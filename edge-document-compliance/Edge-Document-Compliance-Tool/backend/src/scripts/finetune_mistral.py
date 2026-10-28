#!/usr/bin/env python3
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments
from peft import get_peft_model, LoraConfig, TaskType
import os

os.environ['HF_HOME'] = r'D:\huggingface_cache'

training_data = r"D:\quality-llm\data\training_data_final.jsonl"
output_dir = r"D:\quality-llm\models\mistral-v1.0.0"

print("\n" + "="*80)
print("FINE-TUNING MISTRAL 7B - DATA ON D: DRIVE")
print("="*80 + "\n")

print("Loading training data...", end="", flush=True)
dataset = load_dataset('json', data_files=training_data, split='train')
print(" ✅")

print(f"Training samples: {len(dataset)}\n")

print("Loading Mistral 7B Instruct...", end="", flush=True)
model_name = "mistralai/Mistral-7B-Instruct-v0.1"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto",
)
print(" ✅")

print("Configuring LoRA...", end="", flush=True)
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
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

dataset = dataset.map(tokenize_function, batched=True, batch_size=100)

print("="*80)
print("STARTING FINE-TUNING (1-3 hours)")
print("="*80 + "\n")

training_args = TrainingArguments(
    output_dir=output_dir,
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    save_steps=200,
    save_total_limit=3,
    logging_steps=100,
    learning_rate=2e-4,
    warmup_steps=100,
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
print(f"✅ Version 1.0.0 ready on D: drive!\n")