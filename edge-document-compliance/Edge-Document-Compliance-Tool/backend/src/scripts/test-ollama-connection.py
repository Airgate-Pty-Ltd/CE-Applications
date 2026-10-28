#!/usr/bin/env python3
"""
Test Ollama Connection for Vera
Verifies that Ollama is running and accessible

Usage:
    python test-ollama-connection.py
    python test-ollama-connection.py --model mistral
    python test-ollama-connection.py --endpoint http://localhost:11434
"""

import sys
import argparse
import json
from typing import Optional

try:
    import requests
except ImportError:
    print("❌ Missing requests library. Install with: pip install requests")
    sys.exit(1)


def test_ollama_connection(endpoint: str = "http://localhost:11434", model: str = "mistral") -> bool:
    """Test connection to Ollama server"""
    
    print("="*60)
    print("Ollama Connection Test for Vera")
    print("="*60)
    print()
    
    # Test 1: Check if server is running
    print("🔍 Test 1: Checking if Ollama server is running...")
    try:
        response = requests.get(f"{endpoint}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            print(f"   ✅ Server is running")
            print(f"   📦 Available models: {len(models)}")
            for m in models[:5]:
                print(f"      - {m.get('name', 'unknown')}")
        else:
            print(f"   ❌ Server returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Cannot connect to {endpoint}")
        print(f"   💡 Make sure Ollama is running: ollama serve")
        return False
    except requests.exceptions.Timeout:
        print(f"   ❌ Connection timeout")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    print()
    
    # Test 2: Check if model is available
    print(f"🔍 Test 2: Checking if model '{model}' is available...")
    model_names = [m.get("name", "") for m in models]
    if any(model in name for name in model_names):
        print(f"   ✅ Model '{model}' is available")
    else:
        print(f"   ⚠️  Model '{model}' not found in available models")
        print(f"   💡 Download with: ollama pull {model}")
        if model_names:
            print(f"   💡 Available models: {', '.join(model_names[:3])}")
    
    print()
    
    # Test 3: Test generation
    print(f"🔍 Test 3: Testing text generation with '{model}'...")
    try:
        test_prompt = "Define Quality in 50 words"
        print(f"   📝 Prompt: \"{test_prompt}\"")
        
        response = requests.post(
            f"{endpoint}/api/generate",
            json={
                "model": model,
                "prompt": test_prompt,
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            generated_text = result.get("response", "")
            
            if generated_text:
                print(f"   ✅ Generation successful")
                print(f"   📄 Response ({len(generated_text)} chars):")
                print(f"      {generated_text[:200]}...")
                return True
            else:
                print(f"   ⚠️  Empty response received")
                return False
        else:
            print(f"   ❌ Generation failed: Status {response.status_code}")
            print(f"   📄 Response: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"   ❌ Generation timeout (model may be slow or unavailable)")
        return False
    except Exception as e:
        print(f"   ❌ Error during generation: {e}")
        return False
    
    print()


def test_vera_format(endpoint: str = "http://localhost:11434", model: str = "mistral") -> bool:
    """Test if Ollama response format matches Vera's expectations"""
    
    print()
    print("="*60)
    print("Vera Format Compatibility Test")
    print("="*60)
    print()
    
    # Simulate Vera's request format
    system_prompt = "You are Vera, a quality and compliance expert."
    user_message = "What is AS9100D?"
    
    full_prompt = f"{system_prompt}\n\nUser: {user_message}\n\nVera:"
    
    print("🔍 Testing Vera-compatible request format...")
    print(f"   📝 System prompt: {system_prompt[:50]}...")
    print(f"   📝 User message: {user_message}")
    
    try:
        response = requests.post(
            f"{endpoint}/api/generate",
            json={
                "model": model,
                "prompt": full_prompt,
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            generated_text = result.get("response", "")
            
            if generated_text:
                print(f"   ✅ Format compatible")
                print(f"   📄 Generated response ({len(generated_text)} chars):")
                print(f"      {generated_text[:300]}...")
                return True
            else:
                print(f"   ⚠️  Empty response")
                return False
        else:
            print(f"   ❌ Format test failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Test Ollama connection for Vera',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Test with default settings
  python test-ollama-connection.py
  
  # Test with custom model
  python test-ollama-connection.py --model llama2
  
  # Test with custom endpoint
  python test-ollama-connection.py --endpoint http://localhost:11435
        """
    )
    
    parser.add_argument(
        '--endpoint',
        default='http://localhost:11434',
        help='Ollama API endpoint (default: http://localhost:11434)'
    )
    
    parser.add_argument(
        '--model',
        default='mistral',
        help='Model name to test (default: mistral)'
    )
    
    parser.add_argument(
        '--skip-vera-test',
        action='store_true',
        help='Skip Vera format compatibility test'
    )
    
    args = parser.parse_args()
    
    # Run tests
    connection_ok = test_ollama_connection(args.endpoint, args.model)
    
    if connection_ok and not args.skip_vera_test:
        vera_ok = test_vera_format(args.endpoint, args.model)
    else:
        vera_ok = False
    
    # Summary
    print()
    print("="*60)
    print("Test Summary")
    print("="*60)
    
    if connection_ok:
        print("✅ Ollama connection: SUCCESS")
        print(f"   Endpoint: {args.endpoint}")
        print(f"   Model: {args.model}")
        
        if vera_ok:
            print("✅ Vera format compatibility: SUCCESS")
            print()
            print("💡 Next steps:")
            print("   1. Set environment variables:")
            print(f"      VERA_LLM_PROVIDER=local_http")
            print(f"      VERA_LLM_ENDPOINT={args.endpoint}/api/generate")
            print("   2. Restart Vera server")
            print("   3. Test with a query to Vera")
        else:
            print("⚠️  Vera format compatibility: FAILED")
            print("   Check response format in VeraLLMBridge.ts")
    else:
        print("❌ Ollama connection: FAILED")
        print()
        print("💡 Troubleshooting:")
        print("   1. Make sure Ollama is running: ollama serve")
        print(f"   2. Check endpoint is correct: {args.endpoint}")
        print(f"   3. Verify model is downloaded: ollama pull {args.model}")
        print("   4. Check firewall/network settings")
    
    print("="*60)
    
    sys.exit(0 if (connection_ok and vera_ok) else 1)


if __name__ == "__main__":
    main()

