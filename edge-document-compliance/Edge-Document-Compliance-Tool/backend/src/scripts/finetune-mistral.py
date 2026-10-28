#!/usr/bin/env python3
"""
Fine-tune Mistral 7B on Quality/Compliance Data for Vera

This script fine-tunes Mistral 7B using LoRA (Low-Rank Adaptation) for efficient
training on quality and compliance documents.

Usage:
    python finetune-mistral.py --data training_data.jsonl --output ./models/mistral-finetuned

Requirements:
    pip install datasets transformers peft bitsandbytes torch accelerate
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

try:
    from datasets import load_dataset, Dataset
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        TrainingArguments,
        Trainer,
        DataCollatorForLanguageModeling
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    import torch
except ImportError as e:
    print(f"❌ Missing required package: {e}")
    print("\n📦 Install with:")
    print("   pip install datasets transformers peft bitsandbytes torch accelerate")
    sys.exit(1)


def load_training_data(data_file: str) -> Dataset:
    """Load training data from JSONL file"""
    print(f"📚 Loading training data from: {data_file}")
    
    if not os.path.exists(data_file):
        raise FileNotFoundError(f"Training data file not found: {data_file}")
    
    # Load JSONL file
    data = []
    with open(data_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                try:
                    data.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"⚠️  Skipping invalid JSON line: {e}")
    
    print(f"✅ Loaded {len(data)} training examples")
    
    # Convert to HuggingFace dataset
    dataset = Dataset.from_list(data)
    return dataset


def preprocess_training_data(examples: Dict, tokenizer, max_length: int = 512) -> Dict:
    """Format training data for Mistral"""
    
    # Format as prompt-completion pairs
    texts = []
    for prompt, completion in zip(examples.get('prompt', []), examples.get('completion', [])):
        # Format for instruction-following
        formatted = f"### Instruction:\n{prompt}\n\n### Response:\n{completion}<|endoftext|>"
        texts.append(formatted)
    
    # Tokenize
    tokenized = tokenizer(
        texts,
        truncation=True,
        max_length=max_length,
        padding="max_length",
        return_tensors=None
    )
    
    # Labels are same as input_ids for causal LM
    tokenized["labels"] = tokenized["input_ids"].copy()
    
    return tokenized


def finetune_mistral(
    data_file: str,
    output_dir: str,
    model_name: str = "mistralai/Mistral-7B-v0.1",
    num_epochs: int = 3,
    batch_size: int = 4,
    learning_rate: float = 2e-4,
    use_8bit: bool = True,
    lora_r: int = 16,
    lora_alpha: int = 32,
    max_length: int = 512
):
    """Fine-tune Mistral 7B on quality/compliance data"""
    
    print("="*60)
    print("Mistral 7B Fine-tuning for EDCAT Vera")
    print("="*60)
    print()
    
    # STEP 1: Load training data
    print("📚 Step 1: Loading training data...")
    dataset = load_training_data(data_file)
    
    if len(dataset) == 0:
        raise ValueError("No training data found in file")
    
    print(f"   ✅ Loaded {len(dataset)} training examples\n")
    
    # STEP 2: Load model and tokenizer
    print(f"🔧 Step 2: Loading model: {model_name}...")
    
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # Set padding token
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
            tokenizer.pad_token_id = tokenizer.eos_token_id
        
        print(f"   ✅ Tokenizer loaded")
        
        # Load model with quantization if requested
        model_kwargs = {
            "device_map": "auto",
            "torch_dtype": torch.float16,
        }
        
        if use_8bit:
            try:
                from transformers import BitsAndBytesConfig
                quantization_config = BitsAndBytesConfig(
                    load_in_8bit=True,
                    llm_int8_threshold=6.0
                )
                model_kwargs["quantization_config"] = quantization_config
                print(f"   📦 Using 8-bit quantization (reduces RAM usage)")
            except Exception as e:
                print(f"   ⚠️  8-bit quantization not available: {e}")
                print(f"   📦 Using 16-bit float instead")
                use_8bit = False
        
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            **model_kwargs
        )
        
        print(f"   ✅ Model loaded\n")
        
    except Exception as e:
        print(f"   ❌ Error loading model: {e}")
        print(f"\n💡 Troubleshooting:")
        print(f"   1. Check internet connection (model downloads from HuggingFace)")
        print(f"   2. Verify model name: {model_name}")
        print(f"   3. Check available disk space (model is ~13GB)")
        raise
    
    # STEP 3: Configure LoRA
    print("⚙️  Step 3: Configuring LoRA (Low-Rank Adaptation)...")
    
    # Prepare model for LoRA if using 8-bit
    if use_8bit:
        model = prepare_model_for_kbit_training(model)
    
    lora_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "v_proj", "k_proj", "o_proj"]  # Mistral attention modules
    )
    
    model = get_peft_model(model, lora_config)
    
    # Print trainable parameters
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"   ✅ LoRA configured")
    print(f"   📊 Trainable parameters: {trainable_params:,} / {total_params:,} ({100*trainable_params/total_params:.2f}%)\n")
    
    # STEP 4: Prepare data
    print("📝 Step 4: Preparing training data...")
    
    tokenized_dataset = dataset.map(
        lambda examples: preprocess_training_data(examples, tokenizer, max_length),
        batched=True,
        remove_columns=dataset.column_names
    )
    
    print(f"   ✅ Data prepared\n")
    
    # STEP 5: Configure training
    print("🎓 Step 5: Configuring training...")
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    training_args = TrainingArguments(
        output_dir=str(output_path),
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        learning_rate=learning_rate,
        warmup_steps=100,
        weight_decay=0.01,
        save_strategy="steps",
        save_steps=100,
        logging_steps=50,
        gradient_accumulation_steps=4,
        fp16=True,  # Use mixed precision
        optim="paged_adamw_8bit" if use_8bit else "adamw_torch",
        report_to="none",  # Disable wandb/tensorboard
        remove_unused_columns=False,
    )
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False  # Causal LM, not masked LM
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=data_collator,
    )
    
    print(f"   ✅ Training configured")
    print(f"   📊 Epochs: {num_epochs}")
    print(f"   📊 Batch size: {batch_size}")
    print(f"   📊 Learning rate: {learning_rate}")
    print(f"   📊 Max length: {max_length}")
    print()
    
    # STEP 6: Train
    print("🚀 Step 6: Starting fine-tuning...")
    print("   ⏱️  This will take 2-3 hours (or 20-30 min with GPU)")
    print("   💾 Checkpoints will be saved every 100 steps")
    print()
    
    try:
        trainer.train()
    except KeyboardInterrupt:
        print("\n⚠️  Training interrupted by user")
        print("💾 Saving current checkpoint...")
        trainer.save_model()
        print("✅ Checkpoint saved")
        return
    
    # STEP 7: Save model
    print("\n💾 Step 7: Saving fine-tuned model...")
    
    trainer.save_model()
    tokenizer.save_pretrained(str(output_path))
    
    # Save training info
    training_info = {
        "model_name": model_name,
        "base_model": model_name,
        "training_data": data_file,
        "num_examples": len(dataset),
        "num_epochs": num_epochs,
        "batch_size": batch_size,
        "learning_rate": learning_rate,
        "lora_r": lora_r,
        "lora_alpha": lora_alpha,
        "max_length": max_length,
        "trained_at": datetime.now().isoformat(),
        "final_loss": trainer.state.log_history[-1].get("loss", "unknown") if trainer.state.log_history else "unknown"
    }
    
    with open(output_path / "training_info.json", "w") as f:
        json.dump(training_info, f, indent=2)
    
    print(f"   ✅ Model saved to: {output_path}")
    print(f"   📄 Training info saved to: {output_path / 'training_info.json'}")
    print()
    
    print("="*60)
    print("✅ Fine-tuning complete!")
    print("="*60)
    print()
    print("💡 Next steps:")
    print("   1. Test the fine-tuned model")
    print("   2. Convert to Ollama format (if needed)")
    print("   3. Load into Ollama for use with Vera")
    print()
    print("📖 See README_FINETUNING.md for details")


def main():
    parser = argparse.ArgumentParser(
        description='Fine-tune Mistral 7B on quality/compliance data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage
  python finetune-mistral.py --data ./data/training/training_data.jsonl --output ./models/mistral-finetuned
  
  # Custom parameters
  python finetune-mistral.py --data training.jsonl --output ./models/custom --epochs 5 --batch-size 2
  
  # Without 8-bit quantization (if you have enough RAM)
  python finetune-mistral.py --data training.jsonl --no-8bit
        """
    )
    
    parser.add_argument(
        '--data',
        required=True,
        help='Path to training data JSONL file'
    )
    
    parser.add_argument(
        '--output',
        default='./models/mistral-finetuned',
        help='Output directory for fine-tuned model (default: ./models/mistral-finetuned)'
    )
    
    parser.add_argument(
        '--model',
        default='mistralai/Mistral-7B-v0.1',
        help='Base model name (default: mistralai/Mistral-7B-v0.1)'
    )
    
    parser.add_argument(
        '--epochs',
        type=int,
        default=3,
        help='Number of training epochs (default: 3)'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=4,
        help='Training batch size (default: 4, reduce if OOM)'
    )
    
    parser.add_argument(
        '--learning-rate',
        type=float,
        default=2e-4,
        help='Learning rate (default: 2e-4)'
    )
    
    parser.add_argument(
        '--no-8bit',
        action='store_true',
        help='Disable 8-bit quantization (uses more RAM)'
    )
    
    parser.add_argument(
        '--lora-r',
        type=int,
        default=16,
        help='LoRA rank (default: 16)'
    )
    
    parser.add_argument(
        '--lora-alpha',
        type=int,
        default=32,
        help='LoRA alpha (default: 32)'
    )
    
    parser.add_argument(
        '--max-length',
        type=int,
        default=512,
        help='Maximum sequence length (default: 512)'
    )
    
    args = parser.parse_args()
    
    try:
        finetune_mistral(
            data_file=args.data,
            output_dir=args.output,
            model_name=args.model,
            num_epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            use_8bit=not args.no_8bit,
            lora_r=args.lora_r,
            lora_alpha=args.lora_alpha,
            max_length=args.max_length
        )
    except Exception as e:
        print(f"\n❌ Fine-tuning failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

