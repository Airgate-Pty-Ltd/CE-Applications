# Complete Database Architecture Documentation

## Overview

EDCAT Administrator uses a **TWO-DATABASE ARCHITECTURE** to separate customer data from compliance intelligence.

---

## 🗄️ Database 1: Customer Data DB (PostgreSQL) - SINGLE SOURCE OF TRUTH

**Environment Variable**: `DATABASE_URL`  
**Purpose**: Compliance Library, Client Data, Standards Management  
**Connection File**: `backend/src/config/databases.js` → `postgresPool`  
**Query Function**: `queryPostgres()` from `backend/src/config/databases.js`

**ARCHITECTURE**: This is the **SINGLE SOURCE OF TRUTH** for:
- Standards (uploaded compliance documents)
- Standard files (PDF/DOCX files)
- Parsed requirements (extracted clauses)
- Client documents and procedures

### Tables (from `migrations/001_postgres_customer_data.sql`):

| Table | Purpose | Used By |
|-------|---------|---------|
| `tenants` | Client organizations | `routes/users.js`, `routes/admin.js` |
| `users` | Team members | `routes/users.js`, `middleware/auth.js` |
| `upload_files` | Uploaded documents tracking | `routes/upload.js` |
| `customer_documents` | Document metadata + extracted text | `routes/upload.js`, `routes/chat.js` |
| `customer_procedures` | Extracted procedures from docs | `routes/upload.js`, `services/semanticMatcher.js` |
| `gap_analyses` | Analysis results per document | `routes/gap.js`, `routes/chat.js` |
| `analysis_clarifications` | Q&A during analysis | `routes/gap.js` |
| `generated_reports` | Reports created for customers | `routes/reports.js` |
| `user_feedback` | Accuracy ratings and comments | `routes/feedback.js` |
| `audit_logs` | What actions happened | `middleware/audit.js` |
| `integration_logs` | Data sent to external systems | `routes/integrations.js` |
| `standard_files` | **CRITICAL**: Uploaded PDF/DOCX files | `routes/upload.js`, `routes/requirements.js` |
| `compliance_requirements` | Legacy requirements table | `routes/parse.js` (legacy) |

### Code Files Using Customer Data DB:

```javascript
// Connection
backend/src/config/databases.js          → postgresPool
backend/src/database/connection.js      → query() (defaults to Customer Data)

// Routes
backend/src/routes/upload.js            → Stores files in standard_files
backend/src/routes/requirements.js      → Reads standard_files to verify files exist
backend/src/routes/parse.js             → Reads files from standard_files
backend/src/routes/chat.js              → Reads customer_documents
backend/src/routes/gap.js               → Reads/writes gap_analyses
backend/src/routes/users.js             → Reads/writes users, tenants
backend/src/routes/admin.js             → Reads/writes tenants

// Scripts
backend/src/scripts/process-requirements-folder.js → Stores files in standard_files
backend/src/scripts/cleanup-standards-without-files.js → Checks standard_files
```

---

## 🧠 Database 2: EDCAT AI Intelligence DB (PostgreSQL) - VERA'S DOMAIN

**Environment Variable**: `EDCAT_AI_DATABASE_URL`  
**Purpose**: Vera AI Operations, Learning, AI Models  
**Connection File**: `backend/src/config/databases.js` → `edcatPool`  
**Query Function**: `queryEdcatAI()` from `backend/src/config/databases.js`

**ARCHITECTURE**: This database is for **Vera to manipulate, store and learn**:
- Vera reads standards/requirements from PostgreSQL (source of truth)
- Vera writes learning data to EDCAT AI DB
- AI models, patterns, and learning events stored here

### Tables (from `migrations/002_edcat_ai_intelligence.sql`):

| Table | Purpose | Used By |
|-------|---------|---------|
| ~~`standards`~~ | ~~REMOVED~~ - Now in PostgreSQL only | ~~N/A~~ |
| ~~`parsed_requirements`~~ | ~~REMOVED~~ - Now in PostgreSQL only | ~~N/A~~ |
| `extraction_history` | Parse decisions with confidence | `routes/parse.js` |
| `clause_correlation_matrix` | Requirement ↔ Procedure mappings | `services/clauseCorrelationEngine.js` |
| `edcat_learning_events` | Every extraction feedback | `services/requirementParser.js` |
| `learned_patterns` | Patterns that improved accuracy | `services/requirementParser.js` |
| `model_versions` | v1.0.0 → v1.0.1 → v1.0.2 | `routes/parse.js` |
| `baseline_metrics` | Accuracy/precision/recall per version | `services/metricsService.js` |
| `audit_trail_decisions` | Why EDCAT made each decision | `middleware/audit.js` |
| `regulatory_websites` | Where standards come from | `routes/regulatory.js` |
| `document_content_for_learning` | Extracted text for Vera AI | `routes/chat.js`, `services/veraConversationalEngine.js` |
| `example_documents` | Example documents for learning | `routes/chat.js` |
| `ai_*` tables | Vera conversational AI system | `services/veraConversationalEngine.js` |

### Code Files Using EDCAT AI DB:

```javascript
// Connection
backend/src/config/databases.js          → edcatPool
backend/src/database/connection.js      → queryEdcatAI()

// Routes
backend/src/routes/chat.js              → Reads standards from PostgreSQL, writes learning data to EDCAT AI DB
backend/src/routes/regulatory.js        → Reads/writes regulatory_websites

// Services
backend/src/services/veraConversationalEngine.js → Reads ai_* tables, document_content_for_learning
backend/src/services/metricsService.js → Reads parsed_requirements, baseline_metrics
backend/src/services/clauseCorrelationEngine.js → Reads clause_correlation_matrix

// Scripts
backend/src/scripts/process-requirements-folder.js → Writes to standards, document_content_for_learning
backend/src/scripts/cleanup-standards-without-files.js → Deletes from standards, parsed_requirements
backend/src/scripts/pull-vera-learning-standards.js → Reads document_content_for_learning
```

---

## 🔗 Connection Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Start                         │
│              backend/index.js                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         backend/src/config/databases.js                      │
│                                                              │
│  DATABASE_URL ──────► postgresPool (Customer Data)          │
│  EDCAT_AI_DATABASE_URL ──► edcatPool (EDCAT AI)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│      backend/src/database/connection.js                      │
│                                                              │
│  export query() ────────► Uses postgresPool (default)      │
│  export queryEdcatAI() ──► Uses edcatPool                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────┐           ┌──────────────────┐
│ Customer Data │           │   EDCAT AI DB     │
│     DB        │           │                  │
│               │           │                  │
│ standard_files│           │ standards        │
│ customer_*    │           │ parsed_requirements│
│ gap_analyses  │           │ document_content_*│
└───────────────┘           └──────────────────┘
```

---

## 📋 Critical Data Flow: Standards & Requirements

### 1. Upload Standard File
```
User uploads PDF
    ↓
routes/upload.js
    ↓
query() → Customer Data DB
    ↓
INSERT INTO standard_files (file_path, standard_id, file_category)
    ↓
queryEdcatAI() → EDCAT AI DB
    ↓
INSERT INTO standards (code, name, uploaded_at)
```

### 2. Parse Standard
```
User clicks "Parse"
    ↓
routes/parse.js
    ↓
query() → Customer Data DB
    ↓
SELECT file_path FROM standard_files WHERE standard_id = ?
    ↓
Read file from disk
    ↓
Extract requirements (clauseAwareParser.js)
    ↓
queryEdcatAI() → EDCAT AI DB
    ↓
INSERT INTO parsed_requirements (standard_id, clause_number, requirement_text, ...)
    ↓
UPDATE standards SET total_clauses = ?, parsed_at = NOW()
```

### 3. Display Standards in Dropdown
```
Frontend calls /api/requirements/standards
    ↓
routes/requirements.js
    ↓
query() → Customer Data DB
    ↓
SELECT standard_id, file_category FROM standard_files
    ↓ (creates standardsWithFiles Set)
    ↓
queryEdcatAI() → EDCAT AI DB
    ↓
SELECT * FROM standards WHERE uploaded_at IS NOT NULL
    ↓
FILTER: Only show standards where standard_id IN standardsWithFiles
    ↓
Return to frontend
```

### 4. Display Requirements
```
Frontend calls /api/requirements/standards/:id/requirements
    ↓
routes/requirements.js
    ↓
queryEdcatAI() → EDCAT AI DB
    ↓
SELECT * FROM parsed_requirements WHERE standard_id = ?
    ↓
Return to frontend
```

---

## ⚠️ CRITICAL ISSUE: Why AS9110C Still Appears

**Problem**: AS9110C appears in dropdown but has no file.

**Root Cause**: The filtering logic in `routes/requirements.js` has a fallback that shows standards even when `standard_files` table is empty or can't be checked.

**Current Code** (lines 130-138):
```javascript
.filter(row => {
  if (hasStandardFiles && standardsWithFiles.size > 0) {
    return standardsWithFiles.has(row.standard_id);
  }
  return true;  // ❌ FALLBACK - Shows all standards!
})
```

**Fix Applied**: Removed fallback - now returns `false` if files can't be verified.

---

## ✅ Verification Script

Run this to verify all connections:

```javascript
// backend/src/scripts/verify-database-connections.js
import { query, queryEdcatAI } from '../database/connection.js';

async function verifyConnections() {
  console.log('🔍 Verifying Database Connections...\n');
  
  // Test Customer Data DB
  try {
    const customerResult = await query('SELECT NOW() as time, current_database() as db');
    console.log('✅ Customer Data DB:', customerResult.rows[0].db);
    
    // Check standard_files table
    const filesCheck = await query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'standard_files'
    `);
    console.log('   standard_files table exists:', filesCheck.rows[0].count > 0);
    
    // Count files
    const filesCount = await query('SELECT COUNT(*) as count FROM standard_files');
    console.log('   Files in standard_files:', filesCount.rows[0].count);
  } catch (error) {
    console.error('❌ Customer Data DB Error:', error.message);
  }
  
  // Test EDCAT AI DB
  try {
    const edcatResult = await queryEdcatAI('SELECT NOW() as time, current_database() as db');
    console.log('✅ EDCAT AI DB:', edcatResult.rows[0].db);
    
    // Check standards table
    const standardsCheck = await queryEdcatAI(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'standards'
    `);
    console.log('   standards table exists:', standardsCheck.rows[0].count > 0);
    
    // Count standards
    const standardsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM standards');
    console.log('   Standards in database:', standardsCount.rows[0].count);
    
    // Count requirements
    const reqsCount = await queryEdcatAI('SELECT COUNT(*) as count FROM parsed_requirements');
    console.log('   Requirements in database:', reqsCount.rows[0].count);
  } catch (error) {
    console.error('❌ EDCAT AI DB Error:', error.message);
  }
}

verifyConnections();
```

---

## 🗂️ File Locations

### Connection Files:
- `backend/src/config/databases.js` - Creates both pools
- `backend/src/database/connection.js` - Exports query() and queryEdcatAI()

### Migration Files:
- `migrations/001_postgres_customer_data.sql` - Customer Data DB schema
- `migrations/002_edcat_ai_intelligence.sql` - EDCAT AI DB schema

### Route Files (using databases):
- `backend/src/routes/requirements.js` - **CRITICAL**: Standards dropdown
- `backend/src/routes/parse.js` - **CRITICAL**: Requirement extraction
- `backend/src/routes/upload.js` - File uploads
- `backend/src/routes/chat.js` - Chat with Vera

---

## 🔧 Environment Variables Required

```bash
# Customer Data DB (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:port/customer_data_db

# EDCAT AI Intelligence DB (PostgreSQL)
EDCAT_AI_DATABASE_URL=postgresql://user:pass@host:port/edcat_ai_db
```

---

## 📊 Summary

| Database | Env Var | Tables | Primary Use |
|----------|---------|--------|-------------|
| Customer Data | `DATABASE_URL` | `standard_files`, `customer_*`, `gap_analyses` | File storage, customer data |
| EDCAT AI | `EDCAT_AI_DATABASE_URL` | `standards`, `parsed_requirements`, `document_content_*` | Standards, requirements, AI learning |

**Key Insight**: Standards appear in dropdown only if they have entries in BOTH:
1. `standards` table (EDCAT AI DB) - Standard definition
2. `standard_files` table (Customer Data DB) - Actual file on disk

