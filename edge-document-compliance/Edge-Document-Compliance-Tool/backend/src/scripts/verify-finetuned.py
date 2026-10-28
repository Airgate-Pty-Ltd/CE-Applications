#!/usr/bin/env python3
"""
Verify Fine-tuned Model Quality

Compares base Mistral model vs fine-tuned model to verify that
fine-tuning actually improved responses with domain-specific knowledge.

Usage:
    python verify-finetuned.py --model ./models/mistral-finetuned
    python verify-finetuned.py --model ./models/mistral-finetuned --base-model mistralai/Mistral-7B-Instruct
"""

import os
import sys
import argparse
import json
from pathlib import Path
from typing import Optional

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    import torch
except ImportError as e:
    print(f"❌ Missing required package: {e}")
    print("\n📦 Install with:")
    print("   pip install transformers peft torch")
    sys.exit(1)


def load_model(model_path: str, base_model_name: Optional[str] = None, is_base: bool = False):
    """Load model (base or fine-tuned)"""
    model_path = Path(model_path)
    
    if is_base:
        print(f"📥 Loading BASE model: {model_path}")
        model = AutoModelForCausalLM.from_pretrained(
            str(model_path),
            device_map="auto",
            torch_dtype=torch.float16
        )
        tokenizer = AutoTokenizer.from_pretrained(str(model_path))
    else:
        print(f"📥 Loading fine-tuned model: {model_path}")
        
        # Check if LoRA
        is_lora = (model_path / "adapter_config.json").exists()
        
        if is_lora:
            if not base_model_name:
                # Try to get from training_info.json
                info_file = model_path / "training_info.json"
                if info_file.exists():
                    with open(info_file, 'r') as f:
                        info = json.load(f)
                        base_model_name = info.get("base_model", "mistralai/Mistral-7B-v0.1")
                else:
                    base_model_name = "mistralai/Mistral-7B-v0.1"
            
            print(f"   🔗 Loading base model: {base_model_name}")
            base = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                device_map="auto",
                torch_dtype=torch.float16
            )
            model = PeftModel.from_pretrained(base, str(model_path))
            tokenizer = AutoTokenizer.from_pretrained(base_model_name)
        else:
            model = AutoModelForCausalLM.from_pretrained(
                str(model_path),
                device_map="auto",
                torch_dtype=torch.float16
            )
            tokenizer = AutoTokenizer.from_pretrained(str(model_path))
    
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.pad_token_id = tokenizer.eos_token_id
    
    print(f"   ✅ Model loaded\n")
    return model, tokenizer


def generate_response(model, tokenizer, prompt: str, max_length: int = 200) -> str:
    """Generate response from model"""
    formatted_prompt = f"### Instruction:\n{prompt}\n\n### Response:\n"
    
    inputs = tokenizer(formatted_prompt, return_tensors="pt")
    
    with torch.no_grad():
        outputs = model.generate(
            inputs['input_ids'],
            max_length=max_length,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id
        )
    
    full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    if "### Response:" in full_response:
        completion = full_response.split("### Response:")[-1].strip()
    else:
        completion = full_response[len(formatted_prompt):].strip()
    
    return completion


def compare_models(
    base_model_path: str,
    finetuned_model_path: str,
    base_model_name: Optional[str] = None,
    test_questions: Optional[list] = None
):
    """Compare base model vs fine-tuned model"""
    
    if test_questions is None:
        test_questions = [
            "What is AS9100D Clause 8.5.1?",
            "Explain the change control procedure",
            "Define Quality in our processes",
            "What does our non-conformance process look like?",
            "Describe the audit readiness checklist",
            "What are the critical control points we use?",
            "How should we handle supplier non-conformances?",
            "What is required for document control?",
            "Explain corrective action vs preventive action",
            "What is FOD prevention in aerospace?"
        ]
    
    print("="*70)
    print("Comparing Base Model vs Fine-Tuned Model")
    print("="*70)
    print()
    
    # Load models
    try:
        base_model, base_tokenizer = load_model(base_model_path, is_base=True)
        finetuned_model, finetuned_tokenizer = load_model(finetuned_model_path, base_model_name)
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        sys.exit(1)
    
    print("✅ Both models loaded successfully\n")
    
    differences = 0
    similarities = 0
    
    # Test each question
    for idx, question in enumerate(test_questions, 1):
        print(f"[{idx}/{len(test_questions)}] ❓ Question: {question}")
        print("-" * 70)
        
        try:
            # Base model response
            print("  📌 Base Model Response:")
            base_response = generate_response(base_model, base_tokenizer, question)
            base_preview = base_response[:250] if len(base_response) > 250 else base_response
            print(f"     {base_preview}")
            if len(base_response) > 250:
                print(f"     ... ({len(base_response)} total chars)")
            print()
            
            # Fine-tuned model response
            print("  ✨ YOUR Fine-Tuned Model Response:")
            finetuned_response = generate_response(finetuned_model, finetuned_tokenizer, question)
            finetuned_preview = finetuned_response[:250] if len(finetuned_response) > 250 else finetuned_response
            print(f"     {finetuned_preview}")
            if len(finetuned_response) > 250:
                print(f"     ... ({len(finetuned_response)} total chars)")
            print()
            
            # Compare
            base_words = set(base_response.lower().split())
            finetuned_words = set(finetuned_response.lower().split())
            
            # Calculate similarity (Jaccard similarity)
            intersection = len(base_words.intersection(finetuned_words))
            union = len(base_words.union(finetuned_words))
            similarity = intersection / union if union > 0 else 0
            
            if similarity < 0.7:  # Less than 70% similar
                print(f"  ✅ DIFFERENT! (Similarity: {similarity:.2%})")
                print(f"     Your model is using YOUR data!\n")
                differences += 1
            else:
                print(f"  ⚠️  Similar responses (Similarity: {similarity:.2%})")
                print(f"     May need more training or different data\n")
                similarities += 1
            
        except Exception as e:
            print(f"  ❌ Error: {e}\n")
        
        print("-" * 70)
        print()
    
    # Summary
    print("="*70)
    print("Comparison Summary")
    print("="*70)
    print(f"   📊 Total questions: {len(test_questions)}")
    print(f"   ✅ Different responses: {differences} ({differences/len(test_questions)*100:.1f}%)")
    print(f"   ⚠️  Similar responses: {similarities} ({similarities/len(test_questions)*100:.1f}%)")
    print()
    
    if differences > similarities:
        print("   🎉 SUCCESS! Fine-tuning is working!")
        print("   Your model shows clear differences from base model.")
        print("   This indicates it's using your training data.")
    elif differences == similarities:
        print("   ⚠️  MIXED RESULTS")
        print("   Some questions show improvement, others don't.")
        print("   Consider more training or better data quality.")
    else:
        print("   ⚠️  NEEDS IMPROVEMENT")
        print("   Responses are too similar to base model.")
        print("   Possible issues:")
        print("     - Training data not diverse enough")
        print("     - Not enough training epochs")
        print("     - Model not learning from your data")
    
    print("="*70)


def main():
    parser = argparse.ArgumentParser(
        description='Verify fine-tuned model quality by comparing with base model',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Compare with default base model
  python verify-finetuned.py --model ./models/mistral-finetuned --base-model mistralai/Mistral-7B-Instruct
  
  # Use custom base model path
  python verify-finetuned.py --model ./models/mistral-finetuned --base-model-path ./models/base-mistral
        """
    )
    
    parser.add_argument(
        '--model',
        required=True,
        help='Path to fine-tuned model directory'
    )
    
    parser.add_argument(
        '--base-model',
        help='Base model name (HuggingFace) for comparison'
    )
    
    parser.add_argument(
        '--base-model-path',
        help='Path to local base model directory (alternative to --base-model)'
    )
    
    parser.add_argument(
        '--questions',
        help='JSON file with test questions (default: use built-in questions)'
    )
    
    args = parser.parse_args()
    
    # Determine base model
    if args.base_model_path:
        base_model_path = args.base_model_path
    elif args.base_model:
        base_model_path = args.base_model  # Will download from HuggingFace
    else:
        base_model_path = "mistralai/Mistral-7B-Instruct"
    
    # Load test questions
    if args.questions:
        with open(args.questions, 'r') as f:
            data = json.load(f)
            test_questions = data.get('questions', [])
    else:
        test_questions = None  # Use defaults
    
    try:
        compare_models(
            base_model_path=base_model_path,
            finetuned_model_path=args.model,
            base_model_name=args.base_model,
            test_questions=test_questions
        )
    except Exception as e:
        print(f"\n❌ Verification failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

