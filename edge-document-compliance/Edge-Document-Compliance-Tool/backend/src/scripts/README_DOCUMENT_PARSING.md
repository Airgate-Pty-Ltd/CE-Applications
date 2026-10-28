# Document Parsing and Training Data Generation

This guide explains how to parse documents and generate training data for Vera from your quality documents.

## Overview

The document processing pipeline consists of two main scripts:

1. **`parse-documents.py`** - Extracts text and quality entities from documents
2. **`create-training-data.py`** - Converts parsed documents into Q&A training pairs

## Prerequisites

### Install Required Python Packages

```bash
pip install PyPDF2 python-docx openpyxl pandas
```

Or install all at once:

```bash
pip install PyPDF2 python-docx openpyxl pandas
```

## Step 1: Parse Documents

### Basic Usage

```bash
cd backend/src/scripts
python parse-documents.py --input-dir ./data/raw_documents --output-dir ./data/parsed
```

### What It Does

1. **Scans input directory** for PDF, DOCX, XLSX, CSV files
2. **Extracts text** from each document
3. **Extracts quality entities:**
   - **Clauses**: 8.5.1, 4.2.1, 21.137(n), etc.
   - **Standards**: AS9100D, ISO 9001, FAA Part 21, etc.
   - **Procedures**: Procedure names and references
   - **Definitions**: Term definitions and explanations
4. **Saves results** to `parsed_documents.json`

### Output Format

```json
{
  "metadata": {
    "parsed_at": "2024-12-05T...",
    "input_dir": "./data/raw_documents",
    "stats": {
      "total_files": 150,
      "parsed": 145,
      "errors": 5,
      "total_chars": 2500000,
      "total_clauses": 450,
      "total_standards": 120,
      "total_procedures": 80,
      "total_definitions": 200
    }
  },
  "documents": [
    {
      "filename": "AS9100D_Standard.pdf",
      "text": "...",
      "clauses": ["8.5.1", "8.7", "4.2.3"],
      "standards": ["AS9100D", "ISO 9001"],
      "procedures": ["Document Control Procedure", "..."],
      "definitions": [["Quality", "Quality is..."], ...],
      "length": 50000
    }
  ]
}
```

## Step 2: Generate Training Data

### Basic Usage

```bash
python create-training-data.py --input ./data/parsed/parsed_documents.json --output ./data/training/training_data.jsonl
```

### What It Does

1. **Loads parsed documents** from JSON file
2. **Generates 5 types of training pairs:**
   - **Clause explanations**: "Explain clause 8.5.1" → Context
   - **Standard references**: "What is AS9100D?" → Description
   - **Procedure descriptions**: "Describe the Document Control Procedure" → Details
   - **Definitions**: "What is Quality?" → Definition
   - **Quality Q&A**: Quality-focused questions → Answers
3. **Saves as JSONL** (one JSON object per line)

### Output Format

Each line in `training_data.jsonl` is a JSON object:

```json
{"type": "clause_explanation", "prompt": "Explain clause 8.5.1", "completion": "Clause 8.5.1: ...", "source": "AS9100D_Standard.pdf", "metadata": {"clause": "8.5.1", "standard": "AS9100D"}}
{"type": "standard_reference", "prompt": "What is AS9100D?", "completion": "AS9100D is referenced in...", "source": "AS9100D_Standard.pdf", "metadata": {"standard": "AS9100D"}}
```

## Complete Workflow

### 1. Extract from Google Drive (Optional)

```bash
python extract-google-drive-documents.py --folder-id YOUR_FOLDER_ID --output-dir ./data/raw_documents
```

### 2. Parse Documents

```bash
python parse-documents.py --input-dir ./data/raw_documents --output-dir ./data/parsed
```

### 3. Generate Training Data

```bash
python create-training-data.py --input ./data/parsed/parsed_documents.json --output ./data/training/training_data.jsonl
```

### 4. Verify Results

```bash
# Count training pairs
wc -l ./data/training/training_data.jsonl

# Preview first 5 pairs
head -5 ./data/training/training_data.jsonl | python -m json.tool
```

## Expected Results

### After Parsing

- ✅ **5,000-50,000+ characters** extracted per document
- ✅ **10-50 clauses** identified per document
- ✅ **1-10 standards** referenced per document
- ✅ **5-20 procedures** found per document
- ✅ **10-50 definitions** extracted per document

### After Training Data Generation

- ✅ **5,000-20,000+ training pairs** from 100-200 documents
- ✅ **Breakdown:**
  - Clause explanations: 30-40%
  - Quality Q&A: 25-35%
  - Standard references: 10-15%
  - Procedures: 10-15%
  - Definitions: 5-10%

## Integration with Vera

### Option 1: Ingest into Vera's Knowledge Base

After parsing, you can ingest documents into Vera:

```bash
# Move parsed documents to Requirements folder
cp -r ./data/parsed/*.json backend/EDCAT\ AIP/Requirements/

# Run Vera ingestion
npm run ingest:requirements
```

### Option 2: Use Training Data for LLM Fine-tuning

The JSONL file can be used for:
- Fine-tuning language models (OpenAI, Anthropic, etc.)
- Training custom embeddings
- Building domain-specific QA systems

### Option 3: Load into Vera's Q&A Bank

Convert training pairs to Vera's Q&A format:

```bash
# Use existing script or create new one
node backend/src/scripts/generate-vera-qa-from-documents.js
```

## Troubleshooting

### "No module named 'PyPDF2'"
```bash
pip install PyPDF2
```

### "No module named 'docx'"
```bash
pip install python-docx
```

### "No module named 'pandas'"
```bash
pip install pandas openpyxl
```

### Empty or Short Text Extracted

- **PDFs**: Some PDFs are image-based (scanned). Use OCR first.
- **DOCX**: Check if document has text (not just images)
- **Spreadsheets**: Very large files may be truncated (first 100 rows)

### No Clauses/Standards Found

- Documents may not contain clause references
- Try different document sources
- Check if documents are quality/compliance related

### Training Data Quality

- Review sample pairs: `head -20 training_data.jsonl`
- Filter out low-quality pairs
- Adjust chunk sizes and limits in scripts

## Advanced Usage

### Custom Chunk Sizes

Edit `create-training-data.py`:

```python
chunks = self.chunk_text(text, chunk_size=1000)  # Larger chunks
```

### More Training Pairs per Document

Edit limits in `create-training-data.py`:

```python
for clause in clauses[:10]:  # More clauses
for standard in standards[:5]:  # More standards
```

### Filter by Document Type

Add filtering in `parse-documents.py`:

```python
if 'procedure' in filename.lower():
    # Process procedures differently
```

## File Structure

```
backend/src/scripts/
├── extract-google-drive-documents.py  # Extract from Google Drive
├── parse-documents.py                 # Parse documents
├── create-training-data.py           # Generate training data
└── README_DOCUMENT_PARSING.md        # This file

data/
├── raw_documents/                    # Original documents
├── parsed/                           # Parsed JSON files
│   └── parsed_documents.json
└── training/                         # Training data
    └── training_data.jsonl
```

## Next Steps

1. ✅ Parse your documents
2. ✅ Generate training data
3. ✅ Review and validate training pairs
4. ✅ Ingest into Vera or use for fine-tuning
5. ✅ Test Vera's knowledge with parsed documents

## Support

For issues or questions:
- Check script error messages
- Review parsed JSON for data quality
- Validate training data format
- Check Vera ingestion logs

