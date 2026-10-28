# Fine-tuning Mistral 7B for Vera

This guide explains how to fine-tune Mistral 7B on your quality/compliance documents for use with Vera.

## Overview

Fine-tuning allows you to:
- ✅ **Customize** Mistral 7B to your specific quality/compliance domain
- ✅ **Improve** accuracy on quality terminology, standards, and procedures
- ✅ **Enhance** Vera's responses with domain-specific knowledge
- ✅ **Run locally** without external API costs

## Prerequisites

### Hardware Requirements

- **RAM**: Minimum 16GB, recommended 32GB+ (for 8-bit quantization)
- **Disk Space**: ~20GB (13GB base model + checkpoints + output)
- **GPU**: Optional but recommended (5-10x faster training)
- **CPU**: Works but slow (2-3 hours vs 20-30 min with GPU)

### Software Requirements

```bash
# Install Python packages
pip install datasets transformers peft bitsandbytes torch accelerate

# For GPU support (NVIDIA)
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

## Step 1: Prepare Training Data

Ensure you have training data in JSONL format:

```bash
# Generate training data from parsed documents
python create-training-data.py \
  --input ./data/parsed/parsed_documents.json \
  --output ./data/training/training_data.jsonl
```

Expected format (one JSON per line):
```json
{"type": "clause_explanation", "prompt": "Explain clause 8.5.1", "completion": "Clause 8.5.1: ...", "source": "AS9100D.pdf"}
{"type": "standard_reference", "prompt": "What is AS9100D?", "completion": "AS9100D is...", "source": "AS9100D.pdf"}
```

## Step 2: Run Fine-tuning

### Basic Usage

```bash
python finetune-mistral.py \
  --data ./data/training/training_data.jsonl \
  --output ./models/mistral-finetuned
```

### With Custom Parameters

```bash
python finetune-mistral.py \
  --data ./data/training/training_data.jsonl \
  --output ./models/mistral-finetuned \
  --epochs 5 \
  --batch-size 2 \
  --learning-rate 1e-4
```

### Without 8-bit Quantization (More RAM)

```bash
python finetune-mistral.py \
  --data ./data/training/training_data.jsonl \
  --output ./models/mistral-finetuned \
  --no-8bit
```

## Step 3: Monitor Training

Training progress will show:
- **Loss**: Should decrease over time (e.g., 0.45 → 0.22)
- **Steps**: Training progress
- **Checkpoints**: Saved every 100 steps

Example output:
```
🚀 Starting fine-tuning...
Training: [████████████████████] 100% complete
Loss: 0.45 → 0.22 (improving!)
✅ Fine-tuning complete!
```

## Step 4: Use Fine-tuned Model

### Option 1: Convert to Ollama Format

After fine-tuning, you can:
1. Merge LoRA weights into base model
2. Convert to GGUF format
3. Load into Ollama

See: `convert-to-ollama.py` (to be created)

### Option 2: Use with Transformers

Load directly in Python:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# Load base model
base_model = AutoModelForCausalLM.from_pretrained("mistralai/Mistral-7B-v0.1")
tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-v0.1")

# Load LoRA weights
model = PeftModel.from_pretrained(base_model, "./models/mistral-finetuned")

# Use for inference
prompt = "Explain clause 8.5.1"
inputs = tokenizer(prompt, return_tensors="pt")
outputs = model.generate(**inputs, max_length=200)
response = tokenizer.decode(outputs[0], skip_special_tokens=True)
```

## Training Parameters

### Recommended Settings

| Hardware | Batch Size | Gradient Accumulation | Notes |
|----------|-----------|----------------------|-------|
| 32GB RAM, CPU | 2 | 8 | Slow but works |
| 32GB RAM, GPU | 4 | 4 | Good balance |
| 64GB+ RAM, GPU | 8 | 2 | Faster training |

### LoRA Configuration

- **r (rank)**: 16 (default) - Higher = more parameters, more capacity
- **alpha**: 32 (default) - Scaling factor for LoRA weights
- **dropout**: 0.05 - Prevents overfitting

### Learning Rate

- **2e-4**: Default, good starting point
- **1e-4**: More conservative, slower but stable
- **5e-4**: Faster but may be unstable

## Troubleshooting

### Out of Memory (OOM) Errors

**Solution 1: Reduce batch size**
```bash
python finetune-mistral.py --data training.jsonl --batch-size 1
```

**Solution 2: Enable 8-bit quantization**
```bash
# Already enabled by default, but ensure it's not disabled
python finetune-mistral.py --data training.jsonl  # 8-bit is default
```

**Solution 3: Reduce max length**
```bash
python finetune-mistral.py --data training.jsonl --max-length 256
```

### Model Download Fails

**Problem**: Cannot download from HuggingFace

**Solution**:
```bash
# Set HuggingFace token if needed
export HUGGINGFACE_HUB_TOKEN=your_token_here

# Or download manually and use local path
python finetune-mistral.py --model ./local-models/mistral-7b
```

### Training Loss Not Decreasing

**Problem**: Loss stays high or increases

**Solutions**:
1. **Reduce learning rate**: `--learning-rate 1e-4`
2. **More epochs**: `--epochs 5`
3. **Check data quality**: Review training data format
4. **Increase LoRA rank**: `--lora-r 32`

### Slow Training

**Problem**: Training takes too long

**Solutions**:
1. **Use GPU**: Install CUDA and PyTorch with GPU support
2. **Increase batch size**: `--batch-size 8` (if RAM allows)
3. **Reduce max length**: `--max-length 256`
4. **Fewer epochs**: `--epochs 2` (may reduce quality)

## Expected Results

### Training Time

- **CPU (32GB RAM)**: 2-3 hours for 10,000 examples
- **GPU (NVIDIA)**: 20-30 minutes for 10,000 examples

### Loss Progression

Good training shows:
- **Initial loss**: 0.4-0.6
- **Final loss**: 0.15-0.25
- **Trend**: Steady decrease

### Model Quality

After fine-tuning, the model should:
- ✅ Answer quality questions more accurately
- ✅ Use domain-specific terminology correctly
- ✅ Reference standards and clauses appropriately
- ✅ Provide compliance-focused responses

## Integration with Vera

### Current Status

Vera's `VeraLLMBridge` supports:
- ✅ `local_http` provider
- ✅ Custom endpoints
- ✅ Response parsing (`data.response`)

### Next Steps

1. ✅ Fine-tune model on your data
2. ⏳ Convert to Ollama format (or use directly)
3. ⏳ Load into Ollama
4. ⏳ Configure Vera to use fine-tuned model
5. ⏳ Test and compare responses

## Advanced Topics

### Multi-GPU Training

```python
# In training_args
training_args = TrainingArguments(
    ...
    ddp_find_unused_parameters=False,  # For multi-GPU
)
```

### Custom Data Format

Modify `preprocess_training_data()` function to handle different formats.

### Evaluation Dataset

Add validation split:

```python
dataset = dataset.train_test_split(test_size=0.1)
trainer = Trainer(
    ...
    eval_dataset=dataset["test"],
    evaluation_strategy="steps",
    eval_steps=100,
)
```

## Resources

- **HuggingFace Transformers**: https://huggingface.co/docs/transformers
- **PEFT (LoRA)**: https://huggingface.co/docs/peft
- **Mistral Model**: https://huggingface.co/mistralai/Mistral-7B-v0.1
- **Training Guide**: https://huggingface.co/docs/transformers/training

## Summary

✅ **Prepare**: Generate training data from documents  
✅ **Install**: `pip install datasets transformers peft bitsandbytes torch`  
✅ **Train**: `python finetune-mistral.py --data training.jsonl`  
✅ **Wait**: 2-3 hours (CPU) or 20-30 min (GPU)  
✅ **Use**: Load fine-tuned model with Ollama or Transformers

**Note**: Fine-tuning is computationally intensive. Consider using cloud GPU (Google Colab, AWS, etc.) if local hardware is insufficient.

