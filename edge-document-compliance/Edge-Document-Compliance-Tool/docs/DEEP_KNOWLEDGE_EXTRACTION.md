# Deep Knowledge Extraction Script

## Overview

This script intelligently extracts knowledge from 22,437 quality documents by categorizing them into domains (Six Sigma, RCA, CAPA, Audit, Lean, 8D, Regulatory, etc.) and generating enriched Q&A training pairs.

## Location

The script is located at:
- Repository: `backend/src/scripts/deep_knowledge_extraction.py`
- Production: `D:\quality-llm\scripts\deep_knowledge_extraction.py` (copy from repo)

## Usage

### Option 1: Run from Repository

```bash
cd backend/src/scripts
python deep_knowledge_extraction.py [input_file] [output_file]
```

### Option 2: Copy to Production Location

```bash
# Copy script to D:\quality-llm\scripts\
cp backend/src/scripts/deep_knowledge_extraction.py D:\quality-llm\scripts\

# Run from production location
cd D:\quality-llm
python scripts/deep_knowledge_extraction.py
```

## Input/Output

- **Input**: `D:\quality-llm\data\parsed_all_comprehensive.json` (22,437 documents)
- **Output**: `D:\quality-llm\data\training_data_deep_enriched.jsonl` (100,000+ training pairs)

## Features

### Domain Categorization

The script automatically categorizes documents into:
- **Six Sigma** (DMAIC, Cpk, SPC)
- **RCA** (5-Why, Fishbone, Fault Tree)
- **CAPA** (Corrective/Preventive Actions)
- **Audit** (Internal/External Audits)
- **Lean** (5S, Kaizen, VSM)
- **8D** (8 Disciplines Problem Solving)
- **Regulatory** (FDA, FAA, EASA)
- **Quality Tools** (Pareto, FMEA, DOE)
- **Supplier Quality** (APQP, PPAP)
- **Training** (Competence, Effectiveness)
- **Standards** (ISO, AS9100, IATF)

### Knowledge Extraction

For each domain, extracts:
- Structured methodology steps
- Key concepts and definitions
- Process workflows
- Examples and case studies
- Best practices

### Q&A Generation

Generates contextual Q&A pairs such as:
- "Explain the DMAIC process" → Detailed explanation
- "How to perform 5-Why analysis?" → Step-by-step guide
- "What is the CAPA workflow?" → Process description
- "When to use Pareto chart?" → Application guidance

## Expected Output

After running, you should see:

```
DEEP KNOWLEDGE EXTRACTION STATISTICS
================================================================================

Total Documents Analyzed: 22,437
Total Training Pairs Generated: 100,000+

Breakdown by Domain:
--------------------------------------------------------------------------------
SIX_SIGMA          | Documents:  1234 | Pairs:   15234
RCA                | Documents:   856 | Pairs:   12456
CAPA               | Documents:  1023 | Pairs:   14567
AUDIT              | Documents:  2341 | Pairs:   23456
LEAN               | Documents:   567 | Pairs:    8765
8D                 | Documents:   234 | Pairs:    3456
REGULATORY         | Documents:  1456 | Pairs:   18765
QUALITY_TOOLS      | Documents:  1876 | Pairs:   21345
...
================================================================================
```

## Next Steps

1. Run the extraction script
2. Review the generated training pairs
3. Retrain Mistral with enriched data
4. Deploy VERA v1.0.1 with multi-domain expertise

## Timeline

- **Extraction**: 2-3 hours (processing 22,437 documents)
- **Training**: 4-6 hours (retraining Mistral)
- **Result**: VERA v1.0.1 ready same day!

