#!/usr/bin/env python3
"""
Serve Fine-tuned Mistral 7B Model via HTTP API

Provides an Ollama-compatible API endpoint for the fine-tuned model.
Can be used with Vera's LLM bridge.

Usage:
    python serve-finetuned-model.py --model ./models/mistral-finetuned --port 5000

Requirements:
    pip install flask transformers peft torch
"""

import os
import sys
import argparse
import json
from pathlib import Path
from typing import Optional, Dict, Any

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
except ImportError:
    print("❌ Missing Flask. Install with: pip install flask flask-cors")
    sys.exit(1)

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    import torch
except ImportError:
    print("❌ Missing transformers. Install with: pip install transformers peft torch")
    sys.exit(1)


app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Global model and tokenizer
model = None
tokenizer = None
model_name = "mistral-finetuned-custom"


def load_model(model_path: str, base_model: Optional[str] = None):
    """Load fine-tuned model"""
    global model, tokenizer
    
    model_path = Path(model_path)
    
    if not model_path.exists():
        raise FileNotFoundError(f"Model path not found: {model_path}")
    
    print(f"📦 Loading model from: {model_path}")
    
    # Check if it's a LoRA model
    is_lora = (model_path / "adapter_config.json").exists()
    
    if is_lora:
        print("   🔍 Detected LoRA fine-tuned model")
        
        # Get base model name
        if base_model:
            base_model_name = base_model
        else:
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
    
    print(f"   ✅ Model loaded and ready\n")


def generate_response(prompt: str, max_length: int = 500, temperature: float = 0.7, top_p: float = 0.9) -> str:
    """Generate response from model"""
    global model, tokenizer
    
    if model is None or tokenizer is None:
        raise RuntimeError("Model not loaded")
    
    # Format prompt for instruction-following
    formatted_prompt = f"### Instruction:\n{prompt}\n\n### Response:\n"
    
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
    
    # Extract completion
    if "### Response:" in full_response:
        completion = full_response.split("### Response:")[-1].strip()
    else:
        completion = full_response[len(formatted_prompt):].strip()
    
    return completion


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': model_name,
        'loaded': model is not None
    })


@app.route('/api/generate', methods=['POST'])
def generate():
    """
    Ollama-compatible generate endpoint
    
    Expected format:
    {
        "model": "mistral",
        "prompt": "Your prompt here",
        "stream": false,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9
        }
    }
    
    Returns:
    {
        "response": "Generated text...",
        "done": true,
        "model": "mistral-finetuned-custom"
    }
    """
    try:
        data = request.json or {}
        
        # Extract prompt
        prompt = data.get('prompt', '')
        if not prompt:
            return jsonify({'error': 'Missing prompt'}), 400
        
        # Extract generation parameters
        options = data.get('options', {})
        max_length = options.get('num_predict', 500)
        temperature = options.get('temperature', 0.7)
        top_p = options.get('top_p', 0.9)
        
        # Generate response
        response_text = generate_response(prompt, max_length, temperature, top_p)
        
        # Return Ollama-compatible format
        return jsonify({
            'response': response_text,
            'model': model_name,
            'done': True,
            'created_at': None,
            'total_duration': None,
            'load_duration': None,
            'prompt_eval_count': len(prompt.split()),
            'prompt_eval_duration': None,
            'eval_count': len(response_text.split()),
            'eval_duration': None
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'done': True
        }), 500


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Chat endpoint (alternative format)
    
    Expected format:
    {
        "model": "mistral",
        "messages": [
            {"role": "system", "content": "You are Vera..."},
            {"role": "user", "content": "What is Quality?"}
        ]
    }
    """
    try:
        data = request.json or {}
        messages = data.get('messages', [])
        
        if not messages:
            return jsonify({'error': 'Missing messages'}), 400
        
        # Combine messages into prompt
        prompt_parts = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            if role == 'system':
                prompt_parts.append(f"System: {content}")
            elif role == 'user':
                prompt_parts.append(f"User: {content}")
            elif role == 'assistant':
                prompt_parts.append(f"Assistant: {content}")
        
        prompt = "\n".join(prompt_parts) + "\n\nAssistant:"
        
        # Generate
        response_text = generate_response(prompt)
        
        return jsonify({
            'message': {
                'role': 'assistant',
                'content': response_text
            },
            'model': model_name,
            'done': True
        })
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'done': True
        }), 500


@app.route('/api/tags', methods=['GET'])
def tags():
    """List available models (Ollama-compatible)"""
    return jsonify({
        'models': [
            {
                'name': model_name,
                'modified_at': None,
                'size': None,
                'digest': None
            }
        ]
    })


def main():
    parser = argparse.ArgumentParser(
        description='Serve fine-tuned Mistral 7B model via HTTP API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage
  python serve-finetuned-model.py --model ./models/mistral-finetuned
  
  # Custom port
  python serve-finetuned-model.py --model ./models/mistral-finetuned --port 5000
  
  # With base model for LoRA
  python serve-finetuned-model.py --model ./models/mistral-finetuned --base-model mistralai/Mistral-7B-v0.1
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
        '--port',
        type=int,
        default=5000,
        help='Port to run server on (default: 5000)'
    )
    
    parser.add_argument(
        '--host',
        default='0.0.0.0',
        help='Host to bind to (default: 0.0.0.0)'
    )
    
    parser.add_argument(
        '--model-name',
        default='mistral-finetuned-custom',
        help='Model name to report (default: mistral-finetuned-custom)'
    )
    
    args = parser.parse_args()
    
    global model_name
    model_name = args.model_name
    
    # Load model
    try:
        load_model(args.model, args.base_model)
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        sys.exit(1)
    
    # Start server
    print("="*60)
    print(f"🚀 Serving fine-tuned Mistral on http://{args.host}:{args.port}")
    print("="*60)
    print()
    print("📡 Endpoints:")
    print(f"   POST http://{args.host}:{args.port}/api/generate")
    print(f"   POST http://{args.host}:{args.port}/api/chat")
    print(f"   GET  http://{args.host}:{args.port}/api/tags")
    print(f"   GET  http://{args.host}:{args.port}/health")
    print()
    print("💡 Configure Vera with:")
    print(f"   VERA_LLM_PROVIDER=local_http")
    print(f"   VERA_LLM_ENDPOINT=http://localhost:{args.port}/api/generate")
    print()
    print("Press Ctrl+C to stop")
    print("="*60)
    print()
    
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == '__main__':
    main()

