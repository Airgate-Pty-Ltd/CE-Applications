#!/usr/bin/env python3
"""
Test Fine-tuned Mistral 7B Model for Vera

Tests the fine-tuned model on quality/compliance questions and evaluates
response quality, accuracy, and domain-specific knowledge.

Usage:
    python test-finetuned-model.py --model ./models/mistral-finetuned
    python test-finetuned-model.py --model ./models/mistral-finetuned --compare-base
"""

import os
import sys
import argparse
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    import torch
except ImportError as e:
    print(f"❌ Missing required package: {e}")
    print("\n📦 Install with:")
    print("   pip install transformers peft torch")
    sys.exit(1)


def load_finetuned_model(model_path: str, base_model: Optional[str] = None):
    """Load fine-tuned model (LoRA or full fine-tune)"""
    model_path = Path(model_path)
    
    if not model_path.exists():
        raise FileNotFoundError(f"Model path not found: {model_path}")
    
    # Check if it's a LoRA model (has adapter_config.json)
    is_lora = (model_path / "adapter_config.json").exists()
    
    print(f"📦 Loading model from: {model_path}")
    
    if is_lora:
        print("   🔍 Detected LoRA fine-tuned model")
        
        # Load base model
        if base_model:
            base_model_name = base_model
        else:
            # Try to read from training_info.json
            info_file = model_path / "training_info.json"
            if info_file.exists():
                with open(info_file, 'r') as f:
                    info = json.load(f)
                    base_model_name = info.get("base_model", "mistralai/Mistral-7B-v0.1")
            else:
                base_model_name = "mistralai/Mistral-7B-v0.1"
        
        print(f"   📥 Loading base model: {base_model_name}")
        base = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            device_map="auto",
            torch_dtype=torch.float16
        )
        
        print(f"   🔗 Loading LoRA weights...")
        model = PeftModel.from_pretrained(base, str(model_path))
        tokenizer = AutoTokenizer.from_pretrained(base_model_name)
    else:
        print("   🔍 Detected full fine-tuned model")
        model = AutoModelForCausalLM.from_pretrained(
            str(model_path),
            device_map="auto",
            torch_dtype=torch.float16
        )
        tokenizer = AutoTokenizer.from_pretrained(str(model_path))
    
    # Set padding token
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.pad_token_id = tokenizer.eos_token_id
    
    print(f"   ✅ Model loaded successfully\n")
    
    return model, tokenizer


def generate_response(
    model,
    tokenizer,
    prompt: str,
    max_length: int = 300,
    temperature: float = 0.7,
    top_p: float = 0.9,
    format_instruction: bool = True
) -> str:
    """Generate response from model"""
    
    # Format as instruction if requested
    if format_instruction:
        formatted_prompt = f"### Instruction:\n{prompt}\n\n### Response:\n"
    else:
        formatted_prompt = prompt
    
    # Tokenize
    inputs = tokenizer(formatted_prompt, return_tensors="pt")
    
    # Generate
    with torch.no_grad():
        outputs = model.generate(
            inputs['input_ids'],
            max_length=max_length,
            temperature=temperature,
            top_p=top_p,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id
        )
    
    # Decode
    full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Extract only the completion part
    if format_instruction:
        if "### Response:" in full_response:
            completion = full_response.split("### Response:")[-1].strip()
        else:
            completion = full_response[len(formatted_prompt):].strip()
    else:
        completion = full_response[len(formatted_prompt):].strip()
    
    return completion


def evaluate_response(response: str, question: str) -> Dict[str, float]:
    """Evaluate response quality"""
    
    quality_keywords = [
        'quality', 'compliance', 'standard', 'requirement', 'procedure',
        'audit', 'nonconformance', 'corrective action', 'clause', 'process',
        'documentation', 'evidence', 'verification', 'validation'
    ]
    
    # Check for domain-specific keywords
    response_lower = response.lower()
    keyword_count = sum(1 for kw in quality_keywords if kw in response_lower)
    keyword_score = min(keyword_count / 5.0, 1.0)  # Max 1.0 if 5+ keywords
    
    # Check length (should be substantial)
    length_score = min(len(response) / 200.0, 1.0)  # Max 1.0 if 200+ chars
    
    # Check for question answering (mentions question terms)
    question_terms = set(question.lower().split())
    response_terms = set(response_lower.split())
    overlap = len(question_terms.intersection(response_terms))
    relevance_score = min(overlap / max(len(question_terms), 1), 1.0)
    
    # Overall score (weighted average)
    overall_score = (
        keyword_score * 0.4 +
        length_score * 0.3 +
        relevance_score * 0.3
    )
    
    return {
        'keyword_score': keyword_score,
        'length_score': length_score,
        'relevance_score': relevance_score,
        'overall_score': overall_score
    }


def test_model(
    model,
    tokenizer,
    test_questions: List[str],
    compare_base: bool = False,
    base_model_name: Optional[str] = None
) -> Dict:
    """Test model on quality/compliance questions"""
    
    print("="*60)
    print("Testing Fine-tuned Mistral 7B Model")
    print("="*60)
    print()
    
    results = {
        'fine_tuned': [],
        'base': [] if compare_base else None,
        'summary': {}
    }
    
    # Load base model for comparison if requested
    base_model = None
    base_tokenizer = None
    if compare_base:
        print("📦 Loading base model for comparison...")
        try:
            base_model_name = base_model_name or "mistralai/Mistral-7B-v0.1"
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                device_map="auto",
                torch_dtype=torch.float16
            )
            base_tokenizer = AutoTokenizer.from_pretrained(base_model_name)
            if base_tokenizer.pad_token is None:
                base_tokenizer.pad_token = base_tokenizer.eos_token
            print("   ✅ Base model loaded\n")
        except Exception as e:
            print(f"   ⚠️  Could not load base model: {e}")
            print("   📝 Continuing without base comparison\n")
            compare_base = False
    
    # Test each question
    for idx, question in enumerate(test_questions, 1):
        print(f"[{idx}/{len(test_questions)}] ❓ Question: {question}")
        print("-" * 60)
        
        # Generate with fine-tuned model
        try:
            response = generate_response(model, tokenizer, question)
            eval_scores = evaluate_response(response, question)
            
            print(f"✅ Fine-tuned Answer ({eval_scores['overall_score']:.2f}):")
            print(f"   {response[:300]}...")
            if len(response) > 300:
                print(f"   ... ({len(response)} total chars)")
            
            results['fine_tuned'].append({
                'question': question,
                'response': response,
                'scores': eval_scores,
                'length': len(response)
            })
            
        except Exception as e:
            print(f"   ❌ Error generating response: {e}")
            results['fine_tuned'].append({
                'question': question,
                'response': '',
                'error': str(e),
                'scores': {'overall_score': 0.0}
            })
        
        # Compare with base model if requested
        if compare_base and base_model and base_tokenizer:
            try:
                base_response = generate_response(base_model, base_tokenizer, question)
                base_scores = evaluate_response(base_response, question)
                
                print(f"\n📊 Base Model Answer ({base_scores['overall_score']:.2f}):")
                print(f"   {base_response[:300]}...")
                if len(base_response) > 300:
                    print(f"   ... ({len(base_response)} total chars)")
                
                results['base'].append({
                    'question': question,
                    'response': base_response,
                    'scores': base_scores,
                    'length': len(base_response)
                })
                
                # Show improvement
                improvement = eval_scores['overall_score'] - base_scores['overall_score']
                if improvement > 0:
                    print(f"   📈 Improvement: +{improvement:.2f} ({improvement*100:.1f}%)")
                elif improvement < 0:
                    print(f"   📉 Difference: {improvement:.2f} ({improvement*100:.1f}%)")
                else:
                    print(f"   ➡️  No change")
                    
            except Exception as e:
                print(f"   ⚠️  Base model error: {e}")
        
        print()
    
    # Calculate summary statistics
    if results['fine_tuned']:
        fine_tuned_scores = [r['scores']['overall_score'] for r in results['fine_tuned'] if 'scores' in r]
        if fine_tuned_scores:
            results['summary'] = {
                'fine_tuned': {
                    'avg_score': sum(fine_tuned_scores) / len(fine_tuned_scores),
                    'min_score': min(fine_tuned_scores),
                    'max_score': max(fine_tuned_scores),
                    'total_questions': len(results['fine_tuned'])
                }
            }
    
    if compare_base and results['base']:
        base_scores = [r['scores']['overall_score'] for r in results['base'] if 'scores' in r]
        if base_scores:
            results['summary']['base'] = {
                'avg_score': sum(base_scores) / len(base_scores),
                'min_score': min(base_scores),
                'max_score': max(base_scores),
            }
            if 'fine_tuned' in results['summary']:
                improvement = results['summary']['fine_tuned']['avg_score'] - results['summary']['base']['avg_score']
                results['summary']['improvement'] = improvement
    
    return results


def print_summary(results: Dict):
    """Print test summary"""
    print("="*60)
    print("Test Summary")
    print("="*60)
    
    if 'fine_tuned' in results['summary']:
        ft = results['summary']['fine_tuned']
        print(f"\n📊 Fine-tuned Model:")
        print(f"   Average Score: {ft['avg_score']:.2f} ({ft['avg_score']*100:.1f}%)")
        print(f"   Score Range: {ft['min_score']:.2f} - {ft['max_score']:.2f}")
        print(f"   Questions Tested: {ft['total_questions']}")
    
    if 'base' in results['summary']:
        base = results['summary']['base']
        print(f"\n📊 Base Model:")
        print(f"   Average Score: {base['avg_score']:.2f} ({base['avg_score']*100:.1f}%)")
        print(f"   Score Range: {base['min_score']:.2f} - {base['max_score']:.2f}")
    
    if 'improvement' in results['summary']:
        imp = results['summary']['improvement']
        print(f"\n📈 Improvement:")
        if imp > 0:
            print(f"   ✅ Fine-tuned model is {imp*100:.1f}% better")
        elif imp < 0:
            print(f"   ⚠️  Fine-tuned model is {abs(imp)*100:.1f}% worse (may need more training)")
        else:
            print(f"   ➡️  No significant difference")
    
    # Quality assessment
    if 'fine_tuned' in results['summary']:
        avg_score = results['summary']['fine_tuned']['avg_score']
        print(f"\n🎯 Quality Assessment:")
        if avg_score >= 0.85:
            print(f"   ✅ Excellent (≥85%) - Ready for production")
        elif avg_score >= 0.75:
            print(f"   ✅ Good (75-85%) - Ready with minor improvements")
        elif avg_score >= 0.65:
            print(f"   ⚠️  Fair (65-75%) - Consider more training or data")
        else:
            print(f"   ❌ Poor (<65%) - Needs significant improvement")
    
    print("="*60)


def get_default_test_questions() -> List[str]:
    """Get default quality/compliance test questions"""
    return [
        "Define Quality as it relates to AS9100D",
        "Explain the change control procedure",
        "What is clause 8.5.1 in AS9100D?",
        "How should we handle non-conformances?",
        "What does the process approach mean?",
        "Describe the audit readiness checklist",
        "What is required for document control?",
        "Explain corrective action vs preventive action",
        "What is FOD prevention in aerospace?",
        "How do we ensure product safety?"
    ]


def main():
    parser = argparse.ArgumentParser(
        description='Test fine-tuned Mistral 7B model',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Test fine-tuned model
  python test-finetuned-model.py --model ./models/mistral-finetuned
  
  # Compare with base model
  python test-finetuned-model.py --model ./models/mistral-finetuned --compare-base
  
  # Custom test questions
  python test-finetuned-model.py --model ./models/mistral-finetuned --questions questions.json
        """
    )
    
    parser.add_argument(
        '--model',
        required=True,
        help='Path to fine-tuned model directory'
    )
    
    parser.add_argument(
        '--base-model',
        help='Base model name for LoRA models (default: auto-detect)'
    )
    
    parser.add_argument(
        '--compare-base',
        action='store_true',
        help='Compare with base model (requires downloading base model)'
    )
    
    parser.add_argument(
        '--questions',
        help='JSON file with test questions (default: use built-in questions)'
    )
    
    parser.add_argument(
        '--max-length',
        type=int,
        default=300,
        help='Maximum response length (default: 300)'
    )
    
    parser.add_argument(
        '--temperature',
        type=float,
        default=0.7,
        help='Generation temperature (default: 0.7)'
    )
    
    parser.add_argument(
        '--output',
        help='Save test results to JSON file'
    )
    
    args = parser.parse_args()
    
    # Load test questions
    if args.questions:
        with open(args.questions, 'r') as f:
            data = json.load(f)
            test_questions = data.get('questions', [])
    else:
        test_questions = get_default_test_questions()
    
    print(f"📋 Using {len(test_questions)} test questions\n")
    
    # Load model
    try:
        model, tokenizer = load_finetuned_model(args.model, args.base_model)
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        sys.exit(1)
    
    # Run tests
    try:
        results = test_model(
            model,
            tokenizer,
            test_questions,
            compare_base=args.compare_base,
            base_model_name=args.base_model
        )
        
        # Print summary
        print_summary(results)
        
        # Save results if requested
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\n💾 Results saved to: {args.output}")
        
    except Exception as e:
        print(f"\n❌ Testing failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

