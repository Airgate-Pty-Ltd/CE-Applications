# Custom LLM Deployment Guide for Vera

Complete guide for deploying your fine-tuned Mistral 7B model with Vera.

---

## Project Structure

```
quality-llm/
├── scripts/
│   ├── extract-google-drive-documents.py  # Extract from Google Drive
│   ├── parse-documents.py                  # Parse to text + entities
│   ├── create-training-data.py            # Generate training pairs
│   ├── finetune-mistral.py                # Fine-tune Mistral 7B
│   ├── test-finetuned-model.py            # Test fine-tuned model
│   ├── serve-finetuned-model.py           # Flask API server
│   └── ollama-adapter-service.js          # Ollama adapter for Vera
├── data/
│   ├── raw_documents/                      # Original documents
│   ├── parsed/                             # Parsed JSON files
│   └── training/                           # Training data JSONL
└── models/
    └── mistral-finetuned/                  # Fine-tuned model
```

---

## Complete Workflow (8 Hours)

### Hour 1: Extract Documents

```bash
# Extract from Google Drive
python extract-google-drive-documents.py \
  --folder-id YOUR_FOLDER_ID \
  --output-dir ./data/raw_documents
```

**Result:** Thousands of quality documents extracted

---

### Hour 2: Parse Documents

```bash
# Parse to text and extract entities
python parse-documents.py \
  --input-dir ./data/raw_documents \
  --output-dir ./data/parsed
```

**Result:** 
- Text extracted from all documents
- Clauses, standards, procedures, definitions identified
- Structured JSON ready for training

---

### Hour 3: Create Training Data

```bash
# Generate Q&A training pairs
python create-training-data.py \
  --input ./data/parsed/parsed_documents.json \
  --output ./data/training/training_data.jsonl
```

**Result:** 15,000+ training pairs from your documents

---

### Hour 4: Install Ollama & Mistral

```bash
# Install Ollama (Windows: download installer)
# macOS/Linux:
curl -fsSL https://ollama.ai/install.sh | sh

# Pull Mistral 7B
ollama pull mistral

# Start server
ollama serve
```

**Result:** Mistral 7B running locally

---

### Hour 5-6: Fine-tune Model

```bash
# Fine-tune on your data (2-3 hours)
python finetune-mistral.py \
  --data ./data/training/training_data.jsonl \
  --output ./models/mistral-finetuned
```

**Result:** Custom Mistral 7B trained on your documents

---

### Hour 7: Test Fine-tuned Model

```bash
# Test and evaluate
python test-finetuned-model.py \
  --model ./models/mistral-finetuned \
  --compare-base
```

**Result:** Validated accuracy and quality

---

### Hour 8: Deploy & Integrate

```bash
# Start Flask server
python serve-finetuned-model.py \
  --model ./models/mistral-finetuned \
  --port 5000

# Or use Ollama adapter
node ollama-adapter-service.js --port 5001
```

**Result:** Custom LLM API ready for Vera

---

## Deployment Options

### Option A: Local Only (Your PC)

**Pros:**
- ✅ Free
- ✅ Private (all data stays local)
- ✅ Fast (no network latency)

**Cons:**
- ❌ PC must stay on
- ❌ Not accessible remotely

**Setup:**
```bash
# 1. Start fine-tuned model server
python serve-finetuned-model.py --model ./models/mistral-finetuned

# 2. Configure Vera (.env or Railway)
VERA_LLM_PROVIDER=local_http
VERA_LLM_ENDPOINT=http://localhost:5000/api/generate

# 3. Restart Vera
npm start
```

**Cost:** $0/month

---

### Option B: Railway Deployment (Recommended)

**Pros:**
- ✅ Always running (24/7)
- ✅ Accessible remotely
- ✅ Scalable
- ✅ Easy deployment

**Cons:**
- ❌ Monthly cost ($20-50)
- ❌ Model size limits (may need quantization)

**Setup:**

1. **Push model to GitHub:**
   ```bash
   git add models/mistral-finetuned
   git commit -m "Add fine-tuned Mistral model"
   git push origin main
   ```

2. **Create Railway service for model server:**
   - New service: `mistral-server`
   - Build command: `pip install flask transformers peft torch`
   - Start command: `python backend/src/scripts/serve-finetuned-model.py --model ./models/mistral-finetuned --port $PORT`

3. **Configure Vera:**
   ```
   VERA_LLM_PROVIDER=local_http
   VERA_LLM_ENDPOINT=https://mistral-server.railway.app/api/generate
   ```

**Cost:** $20-50/month

---

### Option C: Local GPU Server

**Pros:**
- ✅ Super fast (< 1 sec responses)
- ✅ Private
- ✅ One-time cost

**Cons:**
- ❌ Need to buy GPU ($500+)
- ❌ Electricity costs (~$10/month)

**Setup:**

1. **Buy GPU:** RTX 4060 Ti 16GB or similar
2. **Install CUDA drivers**
3. **Deploy model with GPU support:**
   ```bash
   python serve-finetuned-model.py \
     --model ./models/mistral-finetuned \
     --port 5000
   ```
4. **Configure Vera:**
   ```
   VERA_LLM_ENDPOINT=http://gpu-server-ip:5000/api/generate
   ```

**Cost:** $500 (GPU) + $10/month (electricity)

---

## Integration with Vera

### Method 1: Direct Integration (Fine-tuned Model Server)

```bash
# Start your fine-tuned model server
python serve-finetuned-model.py --model ./models/mistral-finetuned

# Configure Vera
VERA_LLM_PROVIDER=local_http
VERA_LLM_ENDPOINT=http://localhost:5000/api/generate
```

**Note:** Requires adapter because Vera sends different format. Use Method 2 or 3.

---

### Method 2: Ollama Adapter (Recommended)

```bash
# Start Ollama
ollama serve

# Start adapter service
node ollama-adapter-service.js --port 5001

# Configure Vera
VERA_LLM_PROVIDER=local_http
VERA_LLM_ENDPOINT=http://localhost:5001/adapt
```

**How it works:**
1. Vera sends request → Adapter
2. Adapter converts to Ollama format → Ollama
3. Ollama generates response → Adapter
4. Adapter converts to Vera format → Vera

---

### Method 3: Modify VeraLLMBridge

Update `VeraLLMBridge.ts` to detect Ollama and format accordingly:

```typescript
// In callLocalHTTPLLM function
if (endpoint.includes('ollama') || endpoint.includes('11434')) {
  // Format for Ollama
  const ollamaPayload = {
    model: 'mistral',
    prompt: `${req.systemPrompt}\n\n${contextText}\n\nUser: ${req.userMessage}\n\nVera:`,
    stream: false
  };
  // ... rest of Ollama-specific code
}
```

---

## Cost Breakdown

### Fine-tuning Setup

| Item | Cost |
|------|------|
| Google Drive extraction | $0 (your data) |
| Document parsing | $0 (2 hours your time) |
| Training data creation | $0 (automated, 1 hour) |
| Fine-tuning | $0 (on your PC, CPU) |
| Mistral 7B model | $0 (open source) |
| **Total Setup** | **$0** |

### Hosting Options

| Option | Monthly Cost | Notes |
|--------|-------------|-------|
| Local (PC) | $0 | PC must stay on |
| Railway | $20-50 | Always running, scalable |
| GPU Server | $10 | Electricity for GPU |
| Cloud GPU | $100-300 | AWS/GCP with GPU |

### Comparison to OpenAI API

- **OpenAI API**: ~$18,000/year (estimated for similar usage)
- **Your Custom LLM**: $0-600/year
- **Savings**: $17,400-18,000/year

---

## Testing Integration

### Test Fine-tuned Model Server

```bash
# Test direct server
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Define Quality", "stream": false}'
```

### Test Ollama Adapter

```bash
# Test adapter
curl -X POST http://localhost:5001/test \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Define Quality"}'
```

### Test Vera Integration

1. Set environment variables
2. Restart Vera server
3. Ask Vera a question
4. Check logs for LLM calls

---

## Maintenance

### Retrain Monthly

```bash
# Add new documents
python extract-google-drive-documents.py --folder-id NEW_FOLDER

# Parse and create training data
python parse-documents.py --input-dir ./data/new_documents
python create-training-data.py --input ./data/parsed/new_parsed.json

# Fine-tune with new data
python finetune-mistral.py --data ./data/training/updated_training.jsonl
```

### Monitor Performance

- Check response quality regularly
- Compare with base model
- Update training data based on gaps

---

## Troubleshooting

### Model Server Not Starting

**Problem:** Flask server fails to start

**Solution:**
```bash
# Check if port is in use
netstat -an | findstr 5000  # Windows
lsof -i :5000                # macOS/Linux

# Use different port
python serve-finetuned-model.py --port 5001
```

### Vera Can't Connect

**Problem:** Vera gets connection errors

**Solution:**
1. Check server is running: `curl http://localhost:5000/health`
2. Check environment variables are set
3. Check firewall settings
4. Use adapter service for format conversion

### Slow Responses

**Problem:** Model takes too long to respond

**Solutions:**
1. Use GPU acceleration
2. Reduce max_length in generation
3. Use quantized model (8-bit)
4. Optimize prompt length

---

## Summary

✅ **8 Hours of Work** = Your Custom AI  
✅ **$0-600/year** vs $18,000/year for OpenAI  
✅ **Proprietary** - trained on YOUR documents  
✅ **Private** - all data stays local  
✅ **Continuous Improvement** - retrain monthly with new documents

**Result:** Custom LLM that understands YOUR quality methodology, YOUR voice, and YOUR expertise.

