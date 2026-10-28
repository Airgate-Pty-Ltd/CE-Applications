# Ollama Setup Guide for Vera

This guide explains how to set up Ollama with Mistral 7B for local LLM inference with Vera.

## Overview

Ollama allows you to run large language models locally on your machine. This enables Vera to use a local LLM instead of external APIs, providing:
- ✅ **Privacy**: All data stays on your machine
- ✅ **Cost**: No API costs
- ✅ **Control**: Full control over the model
- ✅ **Offline**: Works without internet (after initial download)

## Prerequisites

- **RAM**: Minimum 8GB, recommended 16GB+ (Mistral 7B uses ~8-10GB)
- **Disk Space**: ~5GB for Mistral 7B model
- **OS**: Windows, macOS, or Linux

## Installation

### macOS / Linux

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Verify installation
ollama --version
```

### Windows

1. **Download installer:**
   - Go to: https://ollama.ai/download
   - Download `OllamaSetup.exe`
   - Run the installer

2. **Or use PowerShell:**
   ```powershell
   # Download and install
   Invoke-WebRequest -Uri "https://ollama.ai/download/OllamaSetup.exe" -OutFile "$env:TEMP\OllamaSetup.exe"
   Start-Process "$env:TEMP\OllamaSetup.exe"
   ```

3. **Verify installation:**
   ```powershell
   ollama --version
   ```

## Step 1: Download Mistral 7B Model

```bash
# Pull Mistral 7B (downloads ~4.1 GB)
ollama pull mistral

# Alternative: Pull smaller model if you have limited RAM
ollama pull mistral:7b-instruct-q4_0  # Quantized version (~4GB, uses less RAM)
```

### Available Models

| Model | Size | RAM Usage | Best For |
|-------|------|-----------|----------|
| `mistral` | 4.1 GB | ~8-10 GB | General quality/compliance |
| `mistral:7b-instruct-q4_0` | ~4 GB | ~6-8 GB | Lower RAM systems |
| `llama2` | 3.8 GB | ~8 GB | Alternative to Mistral |
| `codellama` | 3.8 GB | ~8 GB | Code-focused tasks |

## Step 2: Start Ollama Server

### macOS / Linux

```bash
# Start server in background
ollama serve &

# Or run in foreground (for debugging)
ollama serve
```

### Windows

```powershell
# Start server (runs in background automatically)
ollama serve

# Or start as Windows service (recommended)
# Ollama installs as a service on Windows
```

The server runs on: **http://localhost:11434**

## Step 3: Test Ollama

### Test with curl (macOS/Linux)

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Define Quality in 50 words",
  "stream": false
}'
```

### Test with PowerShell (Windows)

```powershell
$body = @{
    model = "mistral"
    prompt = "Define Quality in 50 words"
    stream = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $body -ContentType "application/json"
```

### Test with Python

```python
import requests

response = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "mistral",
        "prompt": "Define Quality in 50 words",
        "stream": False
    }
)

print(response.json()["response"])
```

### Expected Response

```
"Quality is the degree to which a product, service, or process meets 
specified requirements and customer expectations. In quality management, 
it involves meeting standards consistently, minimizing defects, and ensuring 
continuous improvement through systematic processes and controls."
```

## Step 4: Verify Hardware Usage

### Check Ollama Process

**macOS / Linux:**
```bash
ps aux | grep ollama
# Shows process using GPU/CPU

# Check memory usage
top -p $(pgrep ollama)
```

**Windows:**
```powershell
Get-Process ollama | Select-Object ProcessName, CPU, WorkingSet
# Shows memory usage (WorkingSet in bytes)

# Check if using GPU
nvidia-smi  # If you have NVIDIA GPU
```

### Expected Resource Usage

- **RAM**: 8-10 GB for Mistral 7B
- **CPU**: High during inference, idle when not in use
- **GPU**: Optional (uses GPU if available, falls back to CPU)

## Step 5: Configure Vera to Use Ollama

### Set Environment Variables

**On Railway (Production):**
1. Go to Railway Dashboard → Your Project → Variables
2. Add:
   ```
   VERA_LLM_PROVIDER=local_http
   VERA_LLM_ENDPOINT=http://localhost:11434/api/generate
   ```

**Local Development (.env file):**
```bash
# .env file
VERA_LLM_PROVIDER=local_http
VERA_LLM_ENDPOINT=http://localhost:11434/api/generate
```

### Ollama API Format

Vera's `VeraLLMBridge` expects this format:

```json
{
  "model": "mistral",
  "prompt": "System prompt + context + user message",
  "stream": false
}
```

Ollama returns:
```json
{
  "response": "Generated text...",
  "done": true
}
```

## Step 6: Test Vera with Ollama

### Start Vera Server

```bash
npm start
```

### Test Query

Ask Vera a question via the API or UI. If Ollama is configured correctly, Vera will:
1. Build context from databases
2. Send prompt to Ollama
3. Return Ollama's response

### Check Logs

Look for:
```
[VeraLLMBridge] Calling LLM at http://localhost:11434/api/generate
[VeraLLMBridge] LLM response received
```

## Troubleshooting

### "Connection refused" Error

**Problem:** Ollama server not running

**Solution:**
```bash
# Start Ollama
ollama serve

# Or check if it's running
curl http://localhost:11434/api/tags
```

### "Model not found" Error

**Problem:** Mistral model not downloaded

**Solution:**
```bash
# Pull the model
ollama pull mistral

# List available models
ollama list
```

### High Memory Usage

**Problem:** Model using too much RAM

**Solution:**
```bash
# Use quantized model (smaller, less RAM)
ollama pull mistral:7b-instruct-q4_0

# Update VERA_LLM_ENDPOINT to use quantized model
# Or stop Ollama when not in use
pkill ollama  # macOS/Linux
Stop-Process -Name ollama  # Windows
```

### Slow Response Times

**Problem:** Model running on CPU instead of GPU

**Solution:**
- Install GPU drivers (NVIDIA CUDA, AMD ROCm, or Apple Metal)
- Ollama will automatically use GPU if available
- Check GPU usage: `nvidia-smi` (NVIDIA) or Activity Monitor (macOS)

### Windows Service Issues

**Problem:** Ollama not starting automatically

**Solution:**
```powershell
# Check service status
Get-Service ollama

# Start service
Start-Service ollama

# Set to auto-start
Set-Service ollama -StartupType Automatic
```

## Advanced Configuration

### Custom Model

```bash
# Pull custom model
ollama pull llama2:13b

# Use in Vera
VERA_LLM_ENDPOINT=http://localhost:11434/api/generate
# Update prompt to specify model: "model": "llama2:13b"
```

### Adjust Temperature/Top-P

Modify `VeraLLMBridge.ts` to add parameters:

```typescript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'mistral',
    prompt: fullPrompt,
    stream: false,
    options: {
      temperature: 0.7,  // Lower = more focused
      top_p: 0.9        // Nucleus sampling
    }
  })
});
```

### Multiple Models

Run multiple Ollama instances on different ports:

```bash
# Start second instance
OLLAMA_HOST=localhost:11435 ollama serve

# Use different model
VERA_LLM_ENDPOINT=http://localhost:11435/api/generate
```

## Performance Tips

1. **Use Quantized Models**: Smaller models use less RAM
2. **GPU Acceleration**: Install GPU drivers for 10-100x speedup
3. **Batch Requests**: Process multiple queries together
4. **Model Caching**: Ollama caches models in memory
5. **Close Unused Models**: Stop Ollama when not in use

## Integration with Vera

### Current Status

Vera's `VeraLLMBridge` supports:
- ✅ `local_http` provider (Ollama compatible)
- ✅ Custom endpoints
- ✅ Graceful fallback if LLM unavailable

### Next Steps

1. ✅ Install Ollama
2. ✅ Download Mistral 7B
3. ✅ Start Ollama server
4. ✅ Configure Vera environment variables
5. ✅ Test with Vera queries
6. ✅ Monitor performance and adjust

## Security Notes

- **Local Only**: Ollama runs locally, no data leaves your machine
- **No Authentication**: Default Ollama has no auth (local network only)
- **Firewall**: Consider firewall rules if exposing Ollama
- **Production**: For production, use Railway's internal networking

## Resources

- **Ollama Docs**: https://ollama.ai/docs
- **Mistral Model**: https://ollama.ai/library/mistral
- **API Reference**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **Vera LLM Bridge**: `backend/src/services/vera/VeraLLMBridge.ts`

## Summary

✅ **Install**: `curl -fsSL https://ollama.ai/install.sh | sh`  
✅ **Download**: `ollama pull mistral`  
✅ **Start**: `ollama serve`  
✅ **Test**: `curl http://localhost:11434/api/generate ...`  
✅ **Configure**: Set `VERA_LLM_PROVIDER=local_http` and `VERA_LLM_ENDPOINT=http://localhost:11434/api/generate`  
✅ **Use**: Vera will automatically use Ollama for enhanced responses

