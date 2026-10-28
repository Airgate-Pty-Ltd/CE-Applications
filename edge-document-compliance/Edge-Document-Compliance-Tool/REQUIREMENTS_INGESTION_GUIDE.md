# Requirements Folder Ingestion Guide

## Overview

The comprehensive ingestion script processes **ALL** documents from your Requirements folder structure and makes them available to VeraCoreEngine for compliance analysis.

## Folder Structure

```
backend/EDCAT AIP/Requirements/
├── Standards/        # Standard documents (ISO, AS, etc.)
├── Regulatory/       # Regulatory documents (CASA, EASA, UK CAA, FAA, etc.)
├── Examples/        # Approved and bad example documents for learning
└── Customer/        # Customer-specific documents
```

## Supported Regulatory Authorities

The script automatically detects and processes:

- **CASA** (Civil Aviation Safety Authority) - Australia
  - CASRS Volumes 1-5
- **EASA** (European Union Aviation Safety Agency)
  - Continuing Airworthiness Regulation EU No 1321/2014
- **UK CAA** (UK Civil Aviation Authority)
  - UK CAA Regulations
- **FAA** (Federal Aviation Administration) - USA
- **CAAC** (Civil Aviation Administration of China)
- **AFAC** (Australian Flight Accreditation Council)

## How to Run

### Option 1: Using npm script (Recommended)

```bash
npm run ingest:requirements
```

### Option 2: Direct node command

```bash
node backend/src/scripts/ingest-requirements-comprehensive.js
```

## What It Does

1. **Scans all folders** recursively:
   - Standards/
   - Regulatory/
   - Examples/
   - Customer/

2. **Extracts text** from documents:
   - PDF files
   - Word documents (.docx, .doc)
   - Excel spreadsheets (.xlsx, .xls)
   - Text files (.txt)
   - PowerPoint files (.pptx, .ppt) - limited support

3. **Detects document quality**:
   - "Approved" documents → quality: `approved` (quality_score: 1.0)
   - "BAD" documents → quality: `bad` (quality_score: 0.3)
   - Other documents → quality: `unknown` (quality_score: 0.7)

4. **Stores in databases**:
   - **PostgreSQL** (`public.standards`): Creates/updates standard records
   - **EDCAT AI DB** (`edcat.document_content_for_learning`): Stores full text for Vera
   - **EDCAT AI DB** (`edcat.example_documents`): Marks approved/bad examples for learning

5. **Makes available to Vera**:
   - All documents are now queryable by VeraCoreEngine
   - Approved examples help Vera generate good procedures
   - Bad examples help Vera understand what to avoid

## Example Output

```
📁 Comprehensive Requirements Folder Ingestion

📚 Processing Standards folder...
[ingest] 📄 Processing: AS9100D.pdf
[ingest] ✅ Indexed: AS9100D.pdf (AS9100D, quality: unknown)

⚖️  Processing Regulatory folder (CASA, EASA, UK CAA, etc.)...
[ingest] 📄 Processing: CASA CASRS VOL01 (1).pdf
[ingest] ✅ Indexed: CASA CASRS VOL01 (1).pdf (CASA_CASRS_VOL1, quality: unknown)

⭐ Processing Examples folder (approved and bad examples for learning)...
[ingest] 📄 Processing: AS9100 2016 Approved Documents/P-600-01 Planning.docx
[ingest] ✅ Indexed: P-600-01 Planning.docx (AS9100D, quality: approved)

📊 Ingestion Summary:
   Standards: 45 processed (0 approved, 0 bad)
   Regulatory: 9 processed (0 approved, 0 bad)
   Examples: 523 processed (487 approved, 36 bad)
   Customer: 1 processed

   Total: 578 files processed, 0 errors
```

## What Happens After Ingestion

1. **Documents are stored** in `edcat.document_content_for_learning`
2. **Standards are created/updated** in `public.standards`
3. **Examples are marked** in `edcat.example_documents` with quality scores
4. **Vera can now access** all documents via VeraCoreEngine

## Using with Vera

After ingestion, you can ask Vera:

- "What does CASA CASRS Volume 1 require?"
- "Show me examples of good AS9100 procedures"
- "What are the EASA continuing airworthiness requirements?"
- "Generate a procedure for clause 8.7 based on your approved examples"

Vera will:
- Query `edcat.document_content_for_learning` for relevant content
- Reference approved examples when generating procedures
- Avoid patterns from bad examples
- Use regulatory documents for compliance questions

## Troubleshooting

### Permission Errors (OneDrive)

If you see permission errors, the script will retry automatically. If it persists:
- Close any applications that might have the files open
- Wait a few seconds and run again

### Unsupported File Types

The script skips unsupported file types (e.g., ZIP files). To add support:
- Modify `extractTextFromFile()` function in the script

### Insufficient Text

If a document has less than 50 words of extracted text, it's skipped. This is normal for:
- Image-only PDFs
- Corrupted files
- Empty documents

## Re-running the Script

The script is **idempotent** - safe to run multiple times:
- Existing documents are updated (not duplicated)
- New documents are added
- File IDs are consistent (based on file path hash)

## Next Steps

1. **Run the ingestion**: `npm run ingest:requirements`
2. **Verify in database**: Check `edcat.document_content_for_learning` table
3. **Test with Vera**: Ask Vera questions about the ingested documents
4. **Add more documents**: Just add files to the folders and run again

## Database Tables Used

- `public.standards` - Standard/regulatory records
- `edcat.document_content_for_learning` - Full text content for Vera
- `edcat.example_documents` - Approved/bad examples with quality scores

All tables are automatically created if they don't exist.

