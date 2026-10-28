# Vera Requirements Folder Integration

## Overview

Vera can now scan and learn from documents in the `backend/EDCAT AIP/Requirements/` folder structure. This includes:

- **"Approved Documents" folders** - Good examples that passed audit
- **"BAD Documents" folders** - Bad examples that failed audit

Vera uses these documents to:
- Learn what good vs bad documents look like
- Reference approved examples during gap analysis
- Provide guidance on document structure and content
- Help users understand what auditors look for

## Folder Structure

The Requirements folder contains:

```
backend/EDCAT AIP/Requirements/
├── AS9100 2016 Approved Documents/     # Good examples for AS9100
├── AS9120 2016 Approved Documents/     # Good examples for AS9120
├── ISO9001 2015 Approved Documents/    # Good examples for ISO 9001
├── ISO13485 2016 Approved Documents/   # Good examples for ISO 13485
├── ISO13485 2016 BAD Documents/        # Bad examples (failed audit)
├── FAA Part 21 Approved Documents/     # Good examples for FAA Part 21
├── FAA Part 145 Approved Documents/    # Good examples for FAA Part 145
├── CAAC Part 145 2022 Approved Documents/  # Good examples for CAAC Part 145
├── Customer/                           # Customer-specific documents
├── Examples/                           # Additional examples
├── Regulatory/                         # Regulatory documents
└── Standards/                          # Standard documents
```

## How Vera Sees These Folders

### 1. Automatic Detection

Vera's `VeraRequirementsFolderScanner` service:

- **Scans folder names** to detect:
  - Standard codes (AS9100, ISO9001, ISO13485, FAA Part 21, etc.)
  - Document quality ("Approved" vs "BAD")
  
- **Extracts text** from:
  - PDF files (`.pdf`)
  - Word documents (`.docx`, `.doc`)
  - Excel files (`.xlsx`, `.xls`)

- **Indexes documents** into:
  - `edcat.document_content_for_learning` (with `is_example = true`)
  - `edcat.example_documents` (with quality scores)

### 2. Quality Classification

Documents are classified as:

- **Approved Examples** (`quality = 'approved'`):
  - Quality score: 1.0 (high)
  - Category: `approved_example`
  - Used as positive examples

- **Bad Examples** (`quality = 'bad'`):
  - Quality score: 0.3 (low)
  - Category: `bad_example`
  - Used as negative examples (what to avoid)

### 3. Standard Code Parsing

The scanner automatically extracts standard codes from folder names:

- `"AS9100 2016 Approved Documents"` → `AS9100D`
- `"ISO13485 2016 BAD Documents"` → `ISO13485`
- `"FAA Part 21 Approved Documents"` → `FAA_PART_21`
- `"CAAC Part 145 2022 Approved Documents"` → `CAAC_PART_145`

## Usage

### Scanning the Requirements Folder

**Option 1: Via API**
```bash
POST /api/vera/requirements/scan-requirements
Body: { "dryRun": false }
```

**Option 2: Via Script**
```bash
npm run vera:scan-requirements
# Or with dry-run:
npm run vera:scan-requirements:dry-run
```

**Option 3: Direct Node Script**
```bash
node backend/src/scripts/scan-vera-requirements-folder.js
node backend/src/scripts/scan-vera-requirements-folder.js --dry-run
```

### Getting Summary

```bash
GET /api/vera/requirements/requirements-summary
```

Returns a summary of indexed documents by standard and quality.

## How Vera Uses These Documents

### 1. Gap Analysis

When running gap analysis, Vera:
- Checks for approved examples for the standard
- Mentions available examples in the gap analysis response
- Suggests referencing approved examples to address gaps

Example response:
```
💡 Tip: I have 12 approved example document(s) for AS9100D that you can 
reference for guidance on addressing these gaps.
```

### 2. Document Assessment

Vera can compare customer documents against approved/bad examples:

```javascript
import VeraDocumentAssessmentService from './services/vera/VeraDocumentAssessmentService.js';

// Get approved examples for a standard
const approved = await VeraDocumentAssessmentService.getApprovedExamples({
  standardCode: 'AS9100D',
  clauseRef: '8.7',  // Optional
  limit: 5
});

// Get bad examples (what to avoid)
const bad = await VeraDocumentAssessmentService.getBadExamples({
  standardCode: 'ISO13485',
  limit: 3
});
```

### 3. Learning and Knowledge Base

Documents are stored in:
- `edcat.document_content_for_learning` - Full text content
- `edcat.example_documents` - Metadata and quality scores

Vera can:
- Search these documents by standard code
- Filter by quality (approved vs bad)
- Reference them in responses
- Use them to learn document patterns

## Database Schema

### document_content_for_learning

```sql
CREATE TABLE edcat.document_content_for_learning (
  id UUID PRIMARY KEY,
  file_id UUID NOT NULL,
  standard_id UUID,
  standard_code TEXT,
  category TEXT NOT NULL,  -- 'approved_example', 'bad_example', 'example'
  content_text TEXT NOT NULL,
  is_example BOOLEAN DEFAULT false,
  word_count INT,
  metadata JSONB,  -- Contains: source_folder, quality, standard_code
  created_at TIMESTAMPTZ
);
```

### example_documents

```sql
CREATE TABLE edcat.example_documents (
  id UUID PRIMARY KEY,
  file_id UUID NOT NULL UNIQUE,
  standard_id UUID,
  file_name TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'approved_example', 'bad_example'
  standard_code TEXT,
  quality_score DECIMAL(3,2),  -- 1.0 for approved, 0.3 for bad
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

## Integration Points

### 1. Gap Analysis Service

`VeraGapAnalysisService.runBasicGapAnalysis()` now:
- Checks for approved examples after gap analysis
- Mentions available examples in the response

### 2. Reasoning Engine

`VeraReasoningEngine.reason()` can:
- Detect requests to scan requirements folder
- Route to appropriate handler

### 3. Document Assessment Service

`VeraDocumentAssessmentService` provides:
- `getApprovedExamples()` - Get good examples
- `getBadExamples()` - Get bad examples (what to avoid)
- `assessDocumentAgainstExamples()` - Compare customer doc to examples

## Example Workflow

1. **User adds documents to Requirements folder:**
   - Places approved documents in `AS9100 2016 Approved Documents/`
   - Places bad documents in `ISO13485 2016 BAD Documents/`

2. **Admin scans the folder:**
   ```bash
   npm run vera:scan-requirements
   ```

3. **Vera indexes documents:**
   - Extracts text from PDF/DOCX files
   - Classifies as approved or bad
   - Stores in `document_content_for_learning` and `example_documents`

4. **User asks for gap analysis:**
   ```
   "Vera, run a gap analysis for AS9100D"
   ```

5. **Vera responds with:**
   - Gap analysis results
   - Reference to approved examples: "I have 12 approved example document(s) for AS9100D..."

6. **User can ask for examples:**
   ```
   "Vera, show me approved examples for AS9100D clause 8.7"
   ```

## Future Enhancements

- Automatic scanning on startup (if enabled)
- Real-time folder watching for new documents
- Document similarity matching
- Automated quality scoring based on approved examples
- Integration with gap analysis to suggest specific examples for unmapped clauses

