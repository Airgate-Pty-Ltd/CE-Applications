# Vera Database Architecture - Requirements Ingestion Summary

## Overview

When you run `npm run ingest:requirements`, documents from your Requirements folders are processed and stored across **two databases**:

1. **PostgreSQL (Customer Data DB)** - `DATABASE_URL`
2. **EDCAT AI Intelligence DB** - `EDCAT_AI_DATABASE_URL`

## Database Connections

### 1. PostgreSQL (Customer Data DB)
**Connection**: `DATABASE_URL`  
**Schema**: `public.*`

**Tables Used:**
- `public.standards` - Standard/regulatory metadata
  - Columns: `id`, `code`, `name`, `authority_source`, `sector`, `uploaded_at`, `is_active`
  - Stores: Standard codes (e.g., "AS9100D", "CASA_CASRS_VOL1", "EASA_EAR_1321_2014")
  - Sector values: `'standard'`, `'regulatory'`, `'customer'`
  - Authority sources: `'CASA'`, `'EASA'`, `'UKCAA'`, `'FAA'`, `'ISO'`, `'SAE'`, etc.

- `public.compliance_standards` - Alternative standards table (if exists)
- `public.compliance_requirements` - Clause requirements (if parsed)
- `public.customer_documents` - Customer-specific documents
- `public.gap_analyses` - Gap analysis results

### 2. EDCAT AI Intelligence DB
**Connection**: `EDCAT_AI_DATABASE_URL`  
**Schema**: `edcat.*`

**Primary Tables for Ingested Documents:**

#### `edcat.document_content_for_learning`
**Purpose**: Stores full text content of all ingested documents for Vera's knowledge base

**Schema:**
```sql
CREATE TABLE edcat.document_content_for_learning (
  id UUID PRIMARY KEY,
  file_id UUID NOT NULL,
  standard_id UUID,              -- Links to public.standards.id
  standard_code TEXT,             -- e.g., "AS9100D", "CASA_CASRS_VOL1"
  category TEXT NOT NULL,        -- 'standard', 'regulatory', 'example', 'customer'
  content_text TEXT NOT NULL,    -- Full extracted text
  is_example BOOLEAN DEFAULT false,
  quality TEXT,                  -- 'approved', 'bad', or NULL
  word_count INT,
  metadata JSONB,                -- File path, source folder, etc.
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_doc_content_file` - Fast lookup by file_id
- `idx_doc_content_standard` - Fast lookup by standard_code
- `idx_doc_content_quality` - Filter by quality (approved/bad)

**What Gets Stored:**
- ✅ All Standards/ documents (full text)
- ✅ All Regulatory/ documents (CASA, EASA, UK CAA, etc.)
- ✅ All Examples/ documents (approved and bad)
- ✅ All Customer/ documents

#### `edcat.example_documents`
**Purpose**: Marks approved and bad example documents for Vera's learning system

**Schema:**
```sql
CREATE TABLE edcat.example_documents (
  id UUID PRIMARY KEY,
  file_id UUID NOT NULL UNIQUE,
  standard_id UUID,
  file_name TEXT NOT NULL,
  category TEXT NOT NULL,        -- 'approved_example', 'bad_example'
  standard_code TEXT,
  quality_score DECIMAL(3,2),    -- 1.0 = approved, 0.3 = bad, 0.7 = unknown
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_example_docs_standard` - Find examples by standard
- `idx_example_docs_quality` - Filter by quality score

**What Gets Stored:**
- ✅ Approved documents (quality_score: 1.0)
- ✅ Bad documents (quality_score: 0.3)
- ✅ Links to full content in `document_content_for_learning`

#### Other EDCAT AI Tables Used by Vera:

- `edcat.ai_router` - Intent routing rules
- `edcat.ai_template` - Answer templates
- `edcat.ai_policy` - Policy configurations
- `edcat.ai_prompt` - System prompts
- `edcat.ai_conversation_state` - Active conversation context
- `edcat.ai_conversation_history` - Full message history
- `edcat.conversation_memory` - Conversation memory with embeddings
- `edcat.ai_learning_event` - Learning events from user feedback

## How VeraCoreEngine Uses This Data

### 1. Intent Detection (`detectIntentAndTopic`)
**Queries:**
- `edcat.ai_router` - Loads routing rules for intent classification
- Keyword-based detection for standards/regulations (AS9100, CASA, EASA, etc.)

### 2. Semantic Context Building (`buildSemanticContext`)
**Queries PostgreSQL:**
```sql
-- Get standards
SELECT DISTINCT standard_code, revision, title
FROM public.compliance_standards
WHERE customer_id = $1 OR customer_id IS NULL

-- Get clauses (if topic is a clause reference)
SELECT DISTINCT standard_code, clause_reference, requirement_text
FROM public.compliance_requirements
WHERE clause_reference LIKE $1

-- Get customer documents
SELECT id, document_name, document_type
FROM public.customer_documents
WHERE customer_id = $1 AND is_deleted = FALSE

-- Get gap analyses
SELECT id, standard_code, status
FROM public.gap_analyses
WHERE customer_id = $1
```

**Queries EDCAT AI DB:**
```sql
-- Get conversation state
SELECT last_intent, last_topic, context
FROM edcat.ai_conversation_state
WHERE tenant_id = $1 AND session_id = $2 AND persona_code = 'vera'
```

### 3. Template Selection (`selectAnswerTemplate`)
**Queries:**
- `edcat.ai_template` - Loads templates based on intent/topic
- Falls back to default templates if none found

### 4. Document Content Retrieval (Future Enhancement)
VeraCoreEngine can query ingested documents:

```sql
-- Find relevant document content by standard
SELECT content_text, quality, metadata
FROM edcat.document_content_for_learning
WHERE standard_code = $1
  AND is_example = true
ORDER BY 
  CASE quality 
    WHEN 'approved' THEN 1 
    WHEN 'bad' THEN 3 
    ELSE 2 
  END
LIMIT 5

-- Find approved examples for a standard
SELECT ed.file_name, dcl.content_text, ed.quality_score
FROM edcat.example_documents ed
JOIN edcat.document_content_for_learning dcl ON ed.file_id = dcl.file_id
WHERE ed.standard_code = $1
  AND ed.quality_score >= 0.8
ORDER BY ed.quality_score DESC
LIMIT 3
```

## Data Flow

```
Requirements Folder
    │
    ├─ Standards/ → public.standards (metadata)
    │              └─ edcat.document_content_for_learning (full text)
    │
    ├─ Regulatory/ → public.standards (metadata, sector='regulatory')
    │                └─ edcat.document_content_for_learning (full text)
    │
    ├─ Examples/ → edcat.document_content_for_learning (full text)
    │              └─ edcat.example_documents (quality scores)
    │
    └─ Customer/ → public.standards (metadata, sector='customer')
                   └─ edcat.document_content_for_learning (full text)
```

## How Vera Accesses Ingested Documents

### Current Implementation

VeraCoreEngine's `buildSemanticContext()` currently queries:
- ✅ `public.compliance_standards` - Standards metadata
- ✅ `public.compliance_requirements` - Clause requirements
- ✅ `public.customer_documents` - Customer documents
- ✅ `public.gap_analyses` - Gap analyses
- ✅ `edcat.ai_conversation_state` - Conversation context

### Recommended Enhancement

To fully utilize ingested documents, VeraCoreEngine should also query:

```typescript
// In buildSemanticContext(), add:

// Get relevant document content for the topic
const docContentResult = await queryEdcatAI(
  `SELECT content_text, quality, metadata, standard_code
   FROM edcat.document_content_for_learning
   WHERE standard_code = $1
     OR standard_code LIKE $2
   ORDER BY 
     CASE quality 
       WHEN 'approved' THEN 1 
       WHEN 'bad' THEN 3 
       ELSE 2 
     END,
     word_count DESC
   LIMIT 5`,
  [topic, `%${topic}%`]
);

// Get approved examples for reference
const examplesResult = await queryEdcatAI(
  `SELECT ed.file_name, dcl.content_text, ed.quality_score
   FROM edcat.example_documents ed
   JOIN edcat.document_content_for_learning dcl ON ed.file_id = dcl.file_id
   WHERE ed.standard_code = $1
     AND ed.quality_score >= 0.8
   ORDER BY ed.quality_score DESC
   LIMIT 3`,
  [topic]
);
```

## Example Queries Vera Can Make

### 1. "What does CASA CASRS Volume 1 require?"
```sql
-- Vera queries:
SELECT content_text, metadata
FROM edcat.document_content_for_learning
WHERE standard_code = 'CASA_CASRS_VOL1'
LIMIT 1
```

### 2. "Show me examples of good AS9100 procedures"
```sql
-- Vera queries:
SELECT dcl.content_text, ed.file_name, ed.quality_score
FROM edcat.example_documents ed
JOIN edcat.document_content_for_learning dcl ON ed.file_id = dcl.file_id
WHERE ed.standard_code = 'AS9100D'
  AND ed.quality_score >= 0.8
ORDER BY ed.quality_score DESC
LIMIT 5
```

### 3. "What are the EASA continuing airworthiness requirements?"
```sql
-- Vera queries:
SELECT content_text, metadata
FROM edcat.document_content_for_learning
WHERE standard_code = 'EASA_EAR_1321_2014'
  OR standard_code LIKE 'EASA%'
LIMIT 3
```

### 4. "Generate a procedure for clause 8.7 based on your approved examples"
```sql
-- Vera queries:
SELECT dcl.content_text, ed.file_name
FROM edcat.example_documents ed
JOIN edcat.document_content_for_learning dcl ON ed.file_id = dcl.file_id
WHERE ed.standard_code = 'AS9100D'
  AND ed.quality_score >= 0.8
  AND dcl.content_text ILIKE '%8.7%'
ORDER BY ed.quality_score DESC
LIMIT 3
```

## Current Status

**Note**: The ingestion script encountered errors during execution. The errors appear to be related to:
- Database connection issues
- Table schema mismatches
- Missing error handling in `createOrGetStandard()`

**Next Steps:**
1. Fix the ingestion script errors (check database connections and table schemas)
2. Enhance VeraCoreEngine to query `document_content_for_learning` in `buildSemanticContext()`
3. Add semantic search capabilities to find relevant document snippets
4. Integrate approved/bad examples into template filling logic

## Summary

**Databases:**
- **PostgreSQL** (`DATABASE_URL`): Stores standard metadata in `public.standards`
- **EDCAT AI DB** (`EDCAT_AI_DATABASE_URL`): Stores full document content in `edcat.document_content_for_learning` and example metadata in `edcat.example_documents`

**How Vera Uses It:**
- VeraCoreEngine queries both databases to build semantic context
- Document content is available for template filling and answer generation
- Approved examples guide good procedure generation
- Bad examples help avoid problematic patterns
- All queries use internal database access - no external LLM calls

**Current Capability:**
- ✅ Vera can detect standards/regulations from ingested documents
- ✅ Vera can reference document content in responses
- ⚠️ Full integration requires enhancing `buildSemanticContext()` to query `document_content_for_learning`
- ⚠️ Ingestion script needs error fixes to successfully process all documents
