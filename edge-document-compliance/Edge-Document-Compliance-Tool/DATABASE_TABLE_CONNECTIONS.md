# Complete Database Table Connections Map

## Current Problem: DUPLICATE TABLES

### Duplicate Tables Found:
1. **`standards`** - EXISTS IN BOTH:
   - `public.standards` (Postgres DATABASE_URL) ✅ CORRECT
   - `standards` (EDCAT AI DATABASE_URL) ❌ DUPLICATE

2. **`standard_files`** - EXISTS IN BOTH:
   - `public.standard_files` (Postgres DATABASE_URL) ✅ CORRECT
   - `standard_files` (EDCAT AI DATABASE_URL) ❌ DUPLICATE

3. **`parsed_requirements`** - EXISTS IN BOTH:
   - `public.parsed_requirements` (Postgres DATABASE_URL) ✅ CORRECT
   - `parsed_requirements` (EDCAT AI DATABASE_URL) ❌ DUPLICATE

---

## CORRECT ARCHITECTURE (Single Source of Truth)

### PostgreSQL (DATABASE_URL) - Customer Data Warehouse
**Purpose**: Store ALL compliance data for the application

#### Core Tables:

1. **`public.standards`**
   - **What it does**: Stores standard metadata (ISO9001, AS9100, etc.)
   - **Why it exists**: Single source of truth for all standards
   - **Code connections**:
     - `backend/src/routes/requirements.js` - READS (line 127-143)
     - `backend/src/routes/upload.js` - WRITES (line 122-205)
     - `backend/src/routes/parse.js` - READS/WRITES (line 454-458)
     - `backend/src/routes/chat.js` - READS
     - `backend/src/scripts/process-requirements-folder.js` - WRITES
   - **Columns**: id, code, name, sector, uploaded_at, total_clauses, total_requirements

2. **`public.standard_files`**
   - **What it does**: Links uploaded files to standards
   - **Why it exists**: Tracks which files belong to which standard (supports multiple files per standard)
   - **Code connections**:
     - `backend/src/routes/requirements.js` - READS (line 56-64) - Gets file_category for filtering
     - `backend/src/routes/upload.js` - WRITES (line 225-231) - Saves file metadata
     - `backend/src/routes/parse.js` - READS (line 569-595) - Finds file to parse
   - **Columns**: id, file_name, file_path, file_category, standard_id, uploaded_at

3. **`public.parsed_requirements`**
   - **What it does**: Stores extracted requirements from parsed standards
   - **Why it exists**: Requirements library for gap analysis and compliance checking
   - **Code connections**:
     - `backend/src/routes/requirements.js` - READS (line 333-368) - Displays requirements
     - `backend/src/routes/parse.js` - WRITES (line 641-750) - Saves extracted requirements
     - `backend/src/services/veraConversationalEngine.js` - READS - Vera's clause queries
     - `backend/src/routes/chat.js` - READS - Chat functionality
   - **Columns**: id, standard_id, clause_number, requirement_text, full_ref, clause_ref, sub_ref

4. **`public.tenants`**
   - **What it does**: Multi-tenant support (customer organizations)
   - **Why it exists**: Support multiple customers in one database
   - **Code connections**:
     - `backend/src/routes/customers.js` - READS/WRITES
     - `backend/src/middleware/enterpriseMiddleware.js` - READS
   - **Columns**: id, key, name, email, industry, region

5. **`public.gap_analyses`**
   - **What it does**: Stores gap analysis results
   - **Why it exists**: Track compliance gaps for each customer
   - **Code connections**:
     - `backend/src/routes/gap.js` - READS/WRITES
     - `backend/src/services/complianceGapAnalyzer.js` - WRITES
   - **Columns**: id, tenant_id, standard_id, analysis_date, analysis_id

6. **`public.customer_procedures`**
   - **What it does**: Stores customer procedures extracted from documents
   - **Why it exists**: Map customer procedures to compliance requirements
   - **Code connections**:
     - `backend/src/routes/customers.js` - READS/WRITES
     - `backend/src/services/complianceGapAnalyzer.js` - READS
   - **Columns**: id, tenant_id, document_id, procedure_text

7. **`public.audit_trail`**
   - **What it does**: Audit log of all actions
   - **Why it exists**: Track who did what and when
   - **Code connections**:
     - `backend/src/routes/audit.js` - READS
     - `backend/src/middleware/enterpriseMiddleware.js` - WRITES
   - **Columns**: audit_id, gap_analysis_id, actor, action, details, timestamp

### EDCAT AI Database (EDCAT_AI_DATABASE_URL) - AI Intelligence Engine
**Purpose**: Store AI-specific data for Vera's learning and intelligence

#### AI-Specific Tables (CORRECT):

1. **`ai_standard`**
   - **What it does**: Vera's blueprint system for standards
   - **Why it exists**: AI's internal representation of standards
   - **Code connections**:
     - `backend/src/services/veraConversationalEngine.js` - READS/WRITES
     - `backend/src/routes/chat.js` - READS
   - **KEEP**: ✅ This is Vera-specific

2. **`ai_persona`**
   - **What it does**: Vera's personality profiles
   - **Why it exists**: Configure Vera's conversational style
   - **Code connections**:
     - `backend/src/services/veraConversationalEngine.js` - READS
   - **KEEP**: ✅ This is Vera-specific

3. **`ai_conversation_history`**
   - **What it does**: Chat history with Vera
   - **Why it exists**: Conversation context and learning
   - **Code connections**:
     - `backend/src/routes/chat.js` - WRITES
     - `backend/src/services/veraConversationalEngine.js` - READS
   - **KEEP**: ✅ This is Vera-specific

4. **`ai_memories`**
   - **What it does**: Vera's long-term memory
   - **Why it exists**: Store learned patterns and context
   - **Code connections**:
     - `backend/src/services/aiMemoryService.js` - READS/WRITES
   - **KEEP**: ✅ This is Vera-specific

5. **`learned_patterns`**
   - **What it does**: Patterns Vera has learned from parsing
   - **Why it exists**: Improve requirement extraction accuracy
   - **Code connections**:
     - `backend/src/services/requirementParser.js` - WRITES
   - **KEEP**: ✅ This is AI-specific

6. **`regulatory_websites`**
   - **What it does**: Regulatory website URLs for crawling
   - **Why it exists**: Track regulatory sources
   - **Code connections**:
     - `backend/src/routes/regulatory.js` - READS/WRITES
   - **KEEP**: ✅ This is AI-specific (could also be in Postgres, but okay here)

#### DUPLICATE TABLES (MUST DELETE):

1. **`standards`** in EDCAT AI DB
   - **Status**: ❌ DUPLICATE - DELETE
   - **Why**: Already exists in Postgres as `public.standards`
   - **Code that uses it**: NONE (code uses `public.standards`)

2. **`standard_files`** in EDCAT AI DB
   - **Status**: ❌ DUPLICATE - DELETE
   - **Why**: Already exists in Postgres as `public.standard_files`
   - **Code that uses it**: NONE (code uses `public.standard_files`)

3. **`parsed_requirements`** in EDCAT AI DB
   - **Status**: ❌ DUPLICATE - DELETE
   - **Why**: Already exists in Postgres as `public.parsed_requirements`
   - **Code that uses it**: NONE (code uses `public.parsed_requirements`)

---

## Code Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (UI)                             │
│  - index.html calls /api/requirements/standards             │
│  - detail.html calls /api/requirements/standards/:id/reqs   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND ROUTES                                  │
│                                                              │
│  upload.js ────────────┐                                     │
│    │                   │                                     │
│    ├─> createStandard()                                     │
│    │   └─> WRITES to public.standards (Postgres) ✅         │
│    │                                                         │
│    └─> saveFileMetadata()                                   │
│        └─> WRITES to public.standard_files (Postgres) ✅    │
│                                                              │
│  requirements.js ──────┐                                     │
│    │                   │                                     │
│    ├─> GET /standards                                      │
│    │   ├─> READS public.standard_files (Postgres) ✅        │
│    │   └─> READS public.standards (Postgres) ✅             │
│    │                                                         │
│    └─> GET /standards/:id/requirements                      │
│        └─> READS public.parsed_requirements (Postgres) ✅   │
│                                                              │
│  parse.js ─────────────┐                                     │
│    │                   │                                     │
│    ├─> READS public.standards (Postgres) ✅                 │
│    ├─> READS public.standard_files (Postgres) ✅            │
│    ├─> WRITES public.parsed_requirements (Postgres) ✅      │
│    └─> UPDATES public.standards.total_clauses ✅            │
│                                                              │
│  chat.js ──────────────┐                                     │
│    │                   │                                     │
│    ├─> READS public.standards (Postgres) ✅                 │
│    ├─> READS public.parsed_requirements (Postgres) ✅       │
│    └─> READS ai_standard (EDCAT AI) ✅                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASES                                       │
│                                                              │
│  PostgreSQL (DATABASE_URL) ✅                               │
│    ├─> public.standards ────────────┐                       │
│    ├─> public.standard_files ───────┤                       │
│    ├─> public.parsed_requirements ───┤                       │
│    ├─> public.tenants               │                       │
│    ├─> public.gap_analyses          │                       │
│    └─> public.customer_procedures   │                       │
│                                     │                       │
│  EDCAT AI (EDCAT_AI_DATABASE_URL) ✅                        │
│    ├─> ai_standard (Vera blueprints)│                       │
│    ├─> ai_persona                   │                       │
│    ├─> ai_conversation_history      │                       │
│    ├─> ai_memories                  │                       │
│    ├─> learned_patterns             │                       │
│    └─> regulatory_websites          │                       │
│                                     │                       │
│  ❌ DUPLICATES TO DELETE:                                    │
│    ├─> standards (EDCAT AI) ─────────┘                       │
│    ├─> standard_files (EDCAT AI) ────┘                       │
│    └─> parsed_requirements (EDCAT AI) ─┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Action Plan: Clean Up Database

### Step 1: Identify ALL duplicate tables

**Postgres Database (DATABASE_URL)**:
- ✅ `public.standards` - KEEP (used by requirements.js, upload.js, parse.js)
- ✅ `public.standard_files` - KEEP (used by requirements.js, upload.js, parse.js)
- ✅ `public.parsed_requirements` - KEEP (used by requirements.js, parse.js, chat.js)

**EDCAT AI Database (EDCAT_AI_DATABASE_URL)**:
- ❌ `standards` - DELETE (duplicate, code uses `public.standards`)
- ❌ `standard_files` - DELETE (duplicate, code uses `public.standard_files`)
- ❌ `parsed_requirements` - DELETE (duplicate, code uses `public.parsed_requirements`)
- ✅ `ai_standard` - KEEP (Vera-specific)
- ✅ `ai_persona` - KEEP (Vera-specific)
- ✅ `ai_conversation_history` - KEEP (Vera-specific)
- ✅ `ai_memories` - KEEP (Vera-specific)
- ✅ `learned_patterns` - KEEP (AI-specific)
- ✅ `regulatory_websites` - KEEP (used by regulatory.js)

### Step 2: Migration Script to Clean Up

Create a migration that:
1. Drops duplicate tables from EDCAT AI DB
2. Ensures all data is in Postgres (single source of truth)
3. Verifies no code references the deleted tables

