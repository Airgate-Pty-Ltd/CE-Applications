# EDC Current State Summary

**Date**: 2025-01-XX  
**Purpose**: Document current EDC architecture before integrating Audit Tool module

## Tech Stack

### Backend
- **Framework**: Node.js 20+ with Express 4.18
- **Language**: JavaScript (ES Modules)
- **Database**: PostgreSQL
- **ORM/Migration**: Custom migration system (no ORM)
- **File Upload**: Multer
- **Document Parsing**: pdf-parse, mammoth (DOCX)
- **Other**: axios, cheerio (web scraping), xlsx

### Frontend
- **Framework**: React with Vite
- **Location**: `frontend/` directory
- **Entry**: `frontend/src/main.jsx`

### Database Structure

#### Schemas
1. **compliance_lib** - Shared compliance standards and requirements
   - `standards` - ISO 9001, AS9100D, etc.
   - `requirements` - Extracted requirements from standards
   - `extraction_history` - Tracks requirement extraction events
   - `model_versions` - AI model version tracking

2. **customer_data** - Customer-specific data
   - `documents` - Uploaded customer files
   - `procedures` - Extracted procedures from documents
   - `requirement_mappings` - Links requirements to procedures
   - `gap_analyses` - Analysis results
   - `analysis_clarifications` - Clarification Q&A records

#### Migration System
- Location: `backend/src/database/migrations/`
- Format: JavaScript files (`.js`) and SQL files (`.sql`)
- Migration runner: `backend/src/database/migrate.js`
- Existing migrations:
  - `001_initial_schema.js`
  - `002_add_regulatory_websites.js`
  - `002_edcat_schema.sql`
  - `003_verify_and_fix_schema.js`
  - `004_add_learning_tables.js`

## Current API Structure

### Routes (Express)
Location: `backend/src/routes/`

- `upload.js` - File uploads (PDF, DOCX, XLSX)
- `parse.js` - Document parsing
- `requirements.js` - Requirements management
- `regs.js` - Regulatory data
- `regs.ingest.js` - Regulatory ingestion
- `gap-analysis.js` - Gap analysis
- `gap.js` - Gap analysis (alternative)
- `chat.js` - Chat interface
- `customers.js` - Customer management
- `admin.js` - Admin functions
- `diagnostics.js` - System diagnostics
- `db-status.js` - Database status
- `test-db.js` - Database testing
- `parser-training.js` - Parser training
- `persona.js` - Persona configuration
- `regulatory.js` - Regulatory functions

### Document Ingestion Pipeline

1. **Upload** (`/api/upload`)
   - Accepts: PDF, DOC, DOCX, XLS, XLSX
   - Stores files in `uploads/` directory
   - Records metadata in `customer_data.documents`

2. **Parsing** (`/api/parse`)
   - PDF: Uses `pdf-parse`
   - DOCX: Uses `mammoth`
   - Extracts text and stores in database

3. **Requirement Extraction**
   - From standards: Stored in `compliance_lib.requirements`
   - From customer docs: Extracted procedures in `customer_data.procedures`

## Authentication & Authorization

**Status**: ❌ **NOT FOUND**

- No authentication middleware detected
- No user/role tables in schema
- No session management
- Routes appear to be open (no auth checks visible)

**Action Required**: Implement minimal auth system for audit control

## Existing Features

### Document Management
- ✅ File upload (multiple formats)
- ✅ Document parsing (PDF, DOCX)
- ✅ Text extraction
- ✅ Document metadata storage

### Compliance Analysis
- ✅ Standards management
- ✅ Requirements extraction
- ✅ Gap analysis
- ✅ Chat-based clarification
- ✅ Learning engine (feedback processing)

### Regulatory Data
- ✅ Regulatory website crawling
- ✅ Regulatory data ingestion
- ✅ Regulatory data storage

## Integration Points for Audit Module

### Can Reuse
1. **Document Upload System** (`routes/upload.js`)
   - Can extend for audit evidence uploads
   - Already handles multiple file types

2. **Document Parsing** (`routes/parse.js`)
   - Can reuse for parsing audit evidence
   - PDF/DOCX parsing already implemented

3. **Database Connection** (`database/connection.js`)
   - Existing PostgreSQL connection pool
   - Can extend for audit tables

4. **Migration System** (`database/migrate.js`)
   - Existing migration runner
   - Can add audit migrations

### Need to Add
1. **Authentication System**
   - Users table
   - Roles table (Lead Auditor, Internal Assessor)
   - JWT or session-based auth
   - Auth middleware

2. **Audit Module Structure**
   - `src/modules/audits/` directory
   - Domain models
   - Services
   - API routes
   - UI components

3. **Audit Database Tables**
   - `audits`
   - `audit_assignments`
   - `audit_items`
   - `audit_responses`
   - `audit_evidence`
   - `audit_state_history`
   - `source_documents` (may extend existing `documents`)
   - `requirements` (may extend existing `compliance_lib.requirements`)

## File Structure

```
Edge-Document-Compliance-Tool/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express app setup
│   │   ├── server.js           # Server entry point
│   │   ├── database/
│   │   │   ├── connection.js   # DB connection
│   │   │   ├── migrate.js      # Migration runner
│   │   │   ├── migrations/     # Migration files
│   │   │   ├── schema/         # SQL schema files
│   │   │   └── repos/          # Repository pattern
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # Express middleware
│   │   └── utils/              # Utilities
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── package.json
```

## Environment Variables

Expected (from code analysis):
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default 8080)
- `OPENAI_API_KEY` - For AI parsing (if used)

## Next Steps

1. ✅ Create this current state document
2. ⏳ Add authentication system (minimal)
3. ⏳ Create audit module structure
4. ⏳ Add audit database migrations
5. ⏳ Integrate audit API routes
6. ⏳ Add audit UI components
7. ⏳ Connect EDC extraction to audit generation
8. ⏳ Add tests

## Notes

- EDC uses JavaScript (not TypeScript) - audit module should match
- Express (not Fastify) - need to adapt audit routes
- No existing auth - must add minimal version
- Existing document upload can be extended for audit evidence
- Existing requirement extraction can feed audit checklist generation
