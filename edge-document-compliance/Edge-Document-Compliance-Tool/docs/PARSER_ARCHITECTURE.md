# Parser Architecture - Detailed Explanation

## Overview

The EDCAT parser is a **clause-aware, multi-stage requirement extraction system** designed to parse ISO standards (AS9100D, ISO 9001, ISO 13485, etc.) and extract structured requirements with accurate clause references, paragraph numbers, and classification metadata.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Endpoint                              │
│         POST /api/parse/standard/:standardId                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              File Retrieval (Multi-Strategy)                 │
│  1. Database (file_content) → 2. File Path → 3. Requirements │
│     Folder → 4. Filesystem Search                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          extractRequirementsBounded()                       │
│  Primary extraction orchestrator                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐        ┌──────────────────┐
│ ClauseAwareParser│        │ Fallback Parser   │
│   (Primary)      │        │ (If primary fails)│
└────────┬─────────┘        └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Requirement Storage                              │
│  PostgreSQL: public.parsed_requirements                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Stage 1: File Retrieval

The parser uses a **multi-strategy approach** to find the document:

### Strategy 0: Database Storage (Preferred)
- Checks `public.standards.file_content` (BYTEA column)
- **Why**: Railway's filesystem is ephemeral - files are lost on redeploy
- **Benefit**: Files survive redeployments

### Strategy 1: File Path
- Checks `public.standards.file_path`
- Falls back if `file_content` is NULL

### Strategy 2: Requirements Folder
- Searches `EDCAT AIP/Requirements/Standards/` (and subdirectories)
- Recursive search for files matching standard code/name

### Strategy 3: Filesystem Search
- Searches `uploads/` subdirectories (documents, standards, regulatory, customer_requirements)
- Matches by filename containing standard code/name

### Strategy 4: Aggressive Fallback
- If all strategies fail, returns 404 with helpful error message

---

## Stage 2: Document Reading

### Database Storage (Preferred)
```javascript
// Reads directly from PostgreSQL BYTEA column
fileContent = await readDocumentFromDatabase(standardId, null);
```

### Filesystem (Fallback)
```javascript
// Uses pdf-parse, mammoth, or xlsx based on file type
fileContent = await readDocumentFile(filePath);
```

**Supported Formats:**
- PDF (via `pdf-parse`)
- DOCX (via `mammoth`)
- DOC (via `mammoth`)
- XLSX (via `xlsx`)
- TXT (direct read)

---

## Stage 3: Requirement Extraction

### Primary Parser: ClauseAwareParser

The `ClauseAwareParser` is the **main extraction engine**. It follows this flow:

```
┌─────────────────────────────────────────────────────────────┐
│                    parse(text)                              │
│  Entry point - orchestrates the entire parsing process      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              splitByClauses(text)                            │
│  Step 1: Sanitize raw text (remove headers/footers)         │
│  Step 2: Merge multi-line clause headers                    │
│  Step 3: Detect clause patterns (8.7, 8.7.1, etc.)        │
│  Step 4: Filter table of contents entries                   │
│  Step 5: Extract content between clause headers              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         parseClauseSection(section)                          │
│  For each clause:                                            │
│  - Scope guard (skip clauses 1-3)                           │
│  - Store clause metadata                                     │
│  - Extract requirements from clause content                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│      extractRequirementsFromClause(content, clause, title)   │
│  Step 1: Strip NOTES                                         │
│  Step 2: Atomize list items (a., b., c., 1., 2., etc.)      │
│  Step 3: Group parent requirements with list items           │
│  Step 4: Classify each requirement                          │
│  Step 5: Create requirement objects                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Stage 4: Clause Detection (`splitByClauses`)

### Purpose
Identifies clause boundaries in the document and extracts clause numbers and titles.

### Process

1. **Text Sanitization** (`sanitizeRaw`)
   - Removes headers/footers (page numbers, document titles)
   - Heals hyphenated words split across lines
   - Normalizes whitespace

2. **Multi-Line Clause Merging**
   - Detects clause headers that span multiple lines:
     ```
     Before: "8.7\nControl of Nonconforming\nOutputs"
     After:  "8.7 Control of Nonconforming Outputs"
     ```
   - Merges continuation lines that start with capital letters

3. **Clause Pattern Matching**
   - Regex: `/^(\d+(?:\.\d+){0,3})\s+([^\n]{3,200})$/gm`
   - Matches patterns like:
     - `8.7 Control of Nonconforming Outputs`
     - `8.7.1 General`
     - `8.7.2.1 Identification`
   - Extracts clause number and title

4. **Table of Contents Filtering**
   - Detects TOC entries by:
     - Many periods/dots (e.g., `8.3.2.1.5.2.3.4.5.6`)
     - Repeated periods (e.g., `LEADERSHIP...........`)
     - Percentage of periods > 30% of line length
   - Skips these to avoid false positives

5. **Content Extraction**
   - For each clause, extracts all text between its header and the next clause header
   - Creates section objects: `{ clauseNumber, clauseTitle, content }`

### Fallback Strategies

If no clauses are found:
1. **Aggressive Parsing**: Looser pattern matching (just numbers with dots)
2. **Ultimate Fallback**: Treat entire document as single section

---

## Stage 5: Requirement Extraction (`extractRequirementsFromClause`)

### Purpose
Extracts individual requirements from a clause's content, handling lists, parent-child relationships, and classification.

### Process

#### Step 1: Strip NOTES
```javascript
const { text: noNotes, notes } = stripNotes(content);
```
- Removes NOTE sections (informative text, not requirements)
- Preserves the actual requirement text

#### Step 2: Atomize List Items (`atomizeList`)
```javascript
const atoms = atomizeList(parentClause, noNotes);
```

**What it does:**
- Detects list items: `a.`, `b.`, `c.`, `1.`, `2.`, `(a)`, `(1)`, `-`, etc.
- Creates atomic items with:
  - `clause_ref`: Parent clause (e.g., `8.7`)
  - `sub_ref`: List item identifier (e.g., `a`, `1`, `c.2`)
  - `full_ref`: Combined reference (e.g., `8.7.a`, `8.7.1.c.2`)
  - `text`: The requirement text
  - `parentShall`: Whether parent contains "shall"

**Incomplete Sentence Handling:**
- Detects incomplete sentences ending with `:`, `;`, `including:`, `such as:`
- Uses `incompleteBuffer` to capture multi-line requirements:
  ```
  "The organization shall:"
  "  a. Item one"
  "  b. Item two"
  ```
  Becomes: `"The organization shall: a. Item one b. Item two"`

**List Item Patterns:**
- Letter items: `a.`, `b.`, `c.` (case-insensitive)
- Number items: `1.`, `2.`, `3.`
- Parenthesized: `(a)`, `(1)`
- Dash items: `-`, `–`, `—`
- Nested: `c.1`, `c.2` (number under letter)

#### Step 3: Group Parent Requirements with Lists
```javascript
const groupedRequirements = this.groupRequirementsWithLists(atoms, parentClause, clauseTitle);
```

**Purpose:**
- Groups parent requirements with their bullet points into a single requirement entry
- Example:
  ```
  Parent: "The organization shall:"
  - a. Item one
  - b. Item two
  ```
  Becomes: One requirement with text containing all items

**How it works:**
- Identifies parent items (contain "shall", "must", "will", "should")
- Attaches child list items to their parent
- Formats as a single requirement text

#### Step 4: Classification (`classifySentence`)

For each atomic requirement, classifies it:

**Classification Rules (Priority Order):**

1. **PRIORITY 1: Explicit Prohibitions**
   - Pattern: `shall not`, `must not`, `prohibited`, `forbidden`
   - Type: `prohibition`

2. **PRIORITY 2: Mandatory Requirements**
   - Pattern: `shall`, `must`
   - Type: `mandatory`
   - Modal verb: `shall` or `must`

3. **PRIORITY 3: Will Statements**
   - Pattern: `will` (in scope clauses 4-10)
   - Type: `mandatory`
   - Modal verb: `will`

4. **PRIORITY 4: Recommendations**
   - Pattern: `should`, `could`, `may`
   - Type: `recommended`
   - Modal verb: `should`, `could`, or `may`
   - **Still extracted as a requirement** (not skipped)

5. **PRIORITY 5: Assurance Verbs**
   - Pattern: `ensure`, `maintain`, `establish`, `implement`, etc.
   - Type: `mandatory` (if in scope)
   - Modal verb: The assurance verb

6. **PRIORITY 6: Subject + Action**
   - Pattern: `The organization` + action verb
   - Type: `mandatory` (if in scope)

**Scope Guard:**
- Only processes clauses 4-10 (skips clauses 1-3 and annexes)
- Uses `inRequirementScope(clauseNumber)` to validate

**Paragraph Number Extraction:**
- Tries to find explicit paragraph numbers: `P1`, `P2`, `paragraph 1`, `para 2`, etc.
- Falls back to implicit paragraph numbering (P1, P2, P3 based on position)
- If no paragraph found, uses subject text or "implicit"

**Classification Output:**
```javascript
{
  kind: 'requirement' | 'informative' | 'skip',
  requirement_type: 'mandatory' | 'recommended' | 'prohibition',
  requirement_subtype: 'ops' | 'risk' | 'capa' | 'doc_control' | ...,
  modal_verb: 'shall' | 'must' | 'should' | 'will',
  subject_text: 'P1' | 'P2' | 'The organization' | 'implicit',
  is_informative_note: boolean,
  is_recommendation: boolean,
  is_in_scope: boolean,
  clause_path_depth: number,
  reason: string (if skipped)
}
```

#### Step 5: Create Requirement Objects (`createRequirement`)

For each classified requirement, creates a structured object:

**Requirement Object Structure:**
```javascript
{
  // Identifiers
  requirement_uid: string,        // Deterministic SHA256 hash
  clause_number: string,          // Full reference (e.g., "8.7.a")
  clause_ref: string,             // Parent clause (e.g., "8.7")
  sub_ref: string,                // List item (e.g., "a")
  full_ref: string,               // Full reference (e.g., "8.7.a")
  
  // Content
  clause_title: string,           // Clause title (e.g., "Control of Nonconforming Outputs")
  requirement_text: string,        // Full requirement text
  first_line: string,              // First 100 chars for preview
  
  // Classification
  requirement_type: string,        // 'mandatory' | 'recommended' | 'prohibition'
  requirement_subtype: string,     // 'ops' | 'risk' | 'capa' | ...
  intent: string,                 // 'PROCESS' | 'CONTROL' | 'COMPETENCE' | ...
  
  // Metadata
  confidence: number,             // 0.35 - 0.99
  keywords: string[],             // Extracted keywords
  modal_verb: string,             // 'shall' | 'must' | 'should' | 'will'
  subject_text: string,           // 'P1' | 'P2' | 'The organization' | 'implicit'
  clause_path_depth: number,       // Depth in clause hierarchy (1, 2, 3, ...)
  
  // Flags
  has_shall: boolean,
  has_must: boolean,
  has_should: boolean,
  is_informative_note: boolean,
  is_recommendation: boolean,
  is_in_scope: boolean,
  extraction_flags: string[],     // ['list_item', 'text_cleaned']
  
  // Aerospace-specific
  aerospace_addition: boolean,
  requires_maintained_di: boolean,
  requires_retained_di: boolean
}
```

**Deterministic ID Generation:**
```javascript
requirement_uid = SHA256(standardId + version + full_ref + normalized_text).substring(0, 16)
```
- Ensures re-parsing produces identical IDs
- Enables auditability and tracking

**Confidence Calculation:**
- Base: 0.65
- +0.18 for "shall"
- +0.16 for "must"
- +0.12 for "should"
- +0.08 for "will"
- +0.05 for valid clause reference
- +0.05-0.10 for longer text
- -0.10 for short text
- -0.20 for NOTE/EXAMPLE patterns
- Final: Clamped between 0.35 and 0.99

---

## Stage 6: Requirement Storage

### Database Schema: `public.parsed_requirements`

**Key Columns:**
- `id`: UUID (primary key)
- `standard_id`: UUID (foreign key to `public.standards`)
- `requirement_uid`: VARCHAR (deterministic ID)
- `clause_number`: VARCHAR (full reference, e.g., "8.7.a")
- `clause_ref`: VARCHAR (parent clause, e.g., "8.7")
- `sub_ref`: VARCHAR (list item, e.g., "a")
- `full_ref`: VARCHAR (full reference, e.g., "8.7.a")
- `clause_title`: VARCHAR (e.g., "Control of Nonconforming Outputs")
- `requirement_text`: TEXT (full requirement text)
- `requirement_type`: VARCHAR ('mandatory', 'recommended', 'prohibition')
- `requirement_subtype`: VARCHAR ('ops', 'risk', 'capa', etc.)
- `subject_text`: VARCHAR ('P1', 'P2', 'The organization', 'implicit')
- `modal_verb`: VARCHAR ('shall', 'must', 'should', 'will')
- `is_informative_note`: BOOLEAN
- `is_recommendation`: BOOLEAN
- `is_in_scope`: BOOLEAN
- `confidence`: DECIMAL
- `extracted_at`: TIMESTAMP
- `extracted_by_model_version`: VARCHAR

### Storage Process

1. **Force Re-parse Handling**
   - If `force=true` and existing requirements exist:
     ```sql
     DELETE FROM public.parsed_requirements WHERE standard_id = $1
     ```

2. **Insert/Update Logic**
   - Checks if requirement already exists (by `requirement_uid` or `full_ref`)
   - If exists and `force=true`: UPDATE
   - If not exists: INSERT
   - If exists and `force=false`: SKIP (avoid duplicates)

3. **Update Standard Metadata**
   - Updates `public.standards`:
     ```sql
     UPDATE public.standards
     SET total_clauses = $1, total_requirements = $1, parsed_at = NOW()
     WHERE id = $2
     ```
   - **CRITICAL**: Always updates, even if `storedCount = 0` (for re-parses)

---

## Stage 7: QA Validation

After extraction, performs quality assurance checks:

### Hard Gates (Fail if violated)
- **Out-of-scope requirements**: Requirements found in clauses 1-3 or marked `is_in_scope = false`
- If violated, parse returns 422 status with QA report

### Warnings (Non-fatal)
- **Range checks**: Total requirements < 300 or > 420
- **Missing clauses**: No requirements in expected clauses (4, 5, 6, 7, 8, 9, 10)
- **Out-of-scope count**: Requirements marked `is_in_scope = false`

### QA Report Structure
```javascript
{
  expected_range: '300–420',
  total_in_scope: number,
  total_out_scope: number,
  by_clause: [...],
  by_subtype: {...},
  by_type: {...},
  issues: [...],      // Hard gate violations
  warnings: [...],    // Non-fatal warnings
  status: 'PASS' | 'WARN' | 'FAIL'
}
```

---

## Key Design Principles

### 1. Clause-Aware Parsing
- Understands ISO standard structure (clauses, sub-clauses, list items)
- Maintains accurate clause references throughout extraction
- Handles nested hierarchies (8.7 → 8.7.1 → 8.7.1.a)

### 2. Scope Guard
- Only extracts requirements from clauses 4-10
- Skips clauses 1-3 (Scope, Normative References, Terms and Definitions)
- Skips annexes and appendices

### 3. List Item Handling
- Detects and preserves list item structure (a., b., c., 1., 2., etc.)
- Groups parent requirements with their bullet points
- Maintains sub-references (8.7.a, 8.7.b, 8.7.1.c.2)

### 4. Classification System
- Multi-level classification (type, subtype, intent)
- Modal verb detection (shall, must, should, will)
- Paragraph number extraction (P1, P2, P3, etc.)

### 5. Deterministic IDs
- Re-parsing produces identical requirement IDs
- Enables auditability and change tracking
- Based on standard ID, version, clause reference, and normalized text

### 6. Fallback Strategies
- Primary: ClauseAwareParser
- Secondary: RequirementExtractor + AccurateClauseExtractor
- Tertiary: Basic keyword extraction
- Ensures parsing always completes, even with non-standard formats

### 7. Text Sanitization
- Removes headers/footers
- Heals hyphenation
- Strips NOTES
- Cleans formatting artifacts

---

## Common Issues and Solutions

### Issue 1: 0 Requirements Extracted

**Possible Causes:**
1. Document format not supported
2. Clause detection failed (non-standard formatting)
3. All requirements filtered out (scope guard, TOC filtering)
4. File content is empty or corrupted

**Debugging:**
- Check console logs for clause detection counts
- Verify file content length
- Check if clauses 4-10 are present in document
- Review TOC filtering logs

### Issue 2: Requirements Missing "Will", "Must", "Should" Statements

**Solution:**
- Updated `classifySentence` to explicitly check for these patterns
- Added `WILL_PATTERN`, `RECOMMENDATION_PATTERN` detection
- Ensures all modal verb types are captured

### Issue 3: Paragraph Numbers Show "implicit"

**Solution:**
- Added paragraph pattern matching (P1, P2, paragraph 1, etc.)
- Falls back to implicit numbering based on position
- Uses subject text if no paragraph number found

### Issue 4: List Items Not Grouped with Parent

**Solution:**
- Implemented `groupRequirementsWithLists` function
- Detects incomplete sentences (ending with `:`, `including:`, etc.)
- Groups parent + children into single requirement entry

### Issue 5: Re-parse Shows 0 but UI Shows Old Count

**Solution:**
- Always update `total_requirements` even if `storedCount = 0`
- Frontend fetches actual count from `/api/parse/status/:id`
- Merges parse status with standards data

---

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**
   - Processes requirements in batches
   - Uses database transactions for atomicity

2. **Early Filtering**
   - Scope guard filters out clauses 1-3 early
   - TOC filtering prevents processing false positives
   - Minimum length checks skip short text

3. **Deterministic IDs**
   - Avoids duplicate checks on re-parse
   - Enables efficient updates vs inserts

4. **Content Capping**
   - Limits clause content to 2000 characters
   - Prevents processing extremely long sections

---

## Future Enhancements

### Potential Improvements

1. **Machine Learning Classification**
   - Train ML model on labeled requirements
   - Improve classification accuracy
   - Better handling of edge cases

2. **Multi-Language Support**
   - Detect document language
   - Language-specific pattern matching
   - Translation of extracted requirements

3. **Cross-Standard Mapping**
   - Automatic mapping between standards (ISO 9001 ↔ AS9100)
   - Clause equivalence detection
   - Requirement similarity matching

4. **Incremental Parsing**
   - Parse only changed sections
   - Update existing requirements instead of full re-parse
   - Faster processing for large documents

5. **Visual Document Analysis**
   - OCR for scanned PDFs
   - Table detection and extraction
   - Diagram/flowchart recognition

---

## Summary

The parser is a **sophisticated, multi-stage extraction system** that:

1. **Finds documents** using multiple strategies (database → filesystem → search)
2. **Reads documents** in multiple formats (PDF, DOCX, XLSX, TXT)
3. **Detects clauses** using pattern matching and structure analysis
4. **Extracts requirements** with accurate clause references and classification
5. **Handles lists** by grouping parent requirements with bullet points
6. **Classifies requirements** by type, subtype, and intent
7. **Stores requirements** in PostgreSQL with deterministic IDs
8. **Validates quality** through QA checks and reporting

The system is designed to be **robust, accurate, and maintainable**, with extensive fallback strategies to handle various document formats and edge cases.

