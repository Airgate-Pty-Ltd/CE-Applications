# EDCAT Database Schema Summary

## Overview

The EDCAT system uses **PostgreSQL** as the primary database with tables in the `public` schema. Standards, regulations, and customer requirements are all stored in a **unified `standards` table** with a `file_category` field to distinguish them.

---

## 1️⃣ STANDARDS Table

**Location:** `public.standards`

**Purpose:** Master table storing ALL compliance documents (standards, regulations, customer requirements)

**Key Design:** Uses `file_category` to distinguish types:
- `'standard'` - ISO, AS9100D, etc.
- `'regulatory'` - FAA, EASA, etc.
- `'customer_requirements'` - Customer-specific requirements

### Schema:

```sql
CREATE TABLE public.standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,              -- "AS9100D", "FAA Part 21", "Customer-ABC"
  name VARCHAR(255) NOT NULL,                     -- "AS9100D Rev D", "FAA Part 21", etc.
  authority_source VARCHAR(100),                   -- "ISO", "FAA", "Customer"
  sector VARCHAR(100),                             -- "aerospace", "medical", etc.
  description TEXT,
  
  -- File storage
  file_path TEXT,                                 -- Filesystem path (ephemeral on Railway)
  file_name VARCHAR(255),                         -- Original filename
  file_size BIGINT,                               -- File size in bytes
  file_type VARCHAR(100),                         -- "pdf", "docx", "txt"
  file_content BYTEA,                             -- Binary file content (for Railway persistence)
  
  -- Categorization
  file_category VARCHAR(100) DEFAULT 'standard',  -- 'standard' | 'regulatory' | 'customer_requirement'
  
  -- Metadata
  total_clauses INT DEFAULT 0,                     -- Number of clauses
  total_requirements INT DEFAULT 0,                -- Number of parsed requirements
  uploaded_at TIMESTAMP DEFAULT NOW(),
  parsed_at TIMESTAMP,                             -- When parsing completed
  model_version_used VARCHAR(20) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB                                  -- Additional metadata
);

-- Indexes
CREATE INDEX idx_standards_code ON public.standards(code);
CREATE INDEX idx_standards_file_category ON public.standards(file_category);
CREATE INDEX idx_standards_sector ON public.standards(sector);
```

### How to Query:

```sql
-- Get all standards
SELECT * FROM public.standards WHERE file_category = 'standard';

-- Get all regulatory requirements
SELECT * FROM public.standards WHERE file_category = 'regulatory';

-- Get all customer requirements
SELECT * FROM public.standards WHERE file_category = 'customer_requirement';
```

---

## 2️⃣ REGULATIONS

**Storage:** **NOT stored separately** - stored in `public.standards` table with `file_category = 'regulatory'`

**Example:**
```sql
SELECT * FROM public.standards 
WHERE file_category = 'regulatory';
-- Returns: FAA Part 21, EASA, etc.
```

**Why unified?** All compliance documents (standards, regulations, customer requirements) share the same structure and are parsed the same way, so they're stored in one table with a category field.

---

## 3️⃣ CUSTOMER REQUIREMENTS

**Storage:** **NOT stored separately** - stored in `public.standards` table with `file_category = 'customer_requirement'`

**Example:**
```sql
SELECT * FROM public.standards 
WHERE file_category = 'customer_requirement';
-- Returns: Customer-specific requirements documents
```

**Related Tables:**
- `public.customer_documents` - Stores uploaded customer documents (procedures, manuals)
- `public.customer_procedures` - Extracted procedures from customer documents

---

## 4️⃣ PARSED_REQUIREMENTS Table

**Location:** `public.parsed_requirements`

**Purpose:** Stores individual requirements extracted from standards/regulations/customer requirements

**Relationship:** `standard_id` → `public.standards(id)`

### Schema:

```sql
CREATE TABLE public.parsed_requirements (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
  
  -- Clause Information
  clause_number VARCHAR(100) NOT NULL,             -- "4.1", "8.5.1", "8.3.2"
  clause_title VARCHAR(500),                      -- "Understanding the organization"
  clause_ref VARCHAR(100),                        -- Top-level clause (e.g., "8")
  sub_ref VARCHAR(100),                           -- Sub-reference (e.g., "a", "b", "c")
  full_ref VARCHAR(200),                          -- Full path (e.g., "8.5.1.a")
  clause_path_depth INT DEFAULT 0,                -- 1 for "8", 2 for "8.5", 3 for "8.5.1"
  subject_text TEXT,                               -- Paragraph context (e.g., "P1", "P2")
  
  -- Requirement Content
  requirement_text TEXT NOT NULL,                 -- Full requirement text
  requirement_type VARCHAR(100),                   -- "Requirement", "Policy", "Procedure"
  requirement_subtype VARCHAR(100),                -- Domain bucket (e.g., "Records/Retention")
  
  -- Classification
  keyword VARCHAR(50),                            -- "shall", "must", "should"
  modal_verb VARCHAR(50),                         -- "shall", "must", "should", "will"
  intent TEXT,                                    -- What this requirement achieves
  why_it_matters TEXT,                            -- Business/regulatory rationale
  common_gaps TEXT,                                -- Where organizations typically fail
  
  -- Metadata
  confidence DECIMAL(3,2) DEFAULT 0.75,          -- Extraction confidence (0.00-1.00)
  keywords TEXT,                                   -- Comma-separated keywords
  requirement_uid VARCHAR(16),                    -- Deterministic UID for deduplication
  extracted_at TIMESTAMP DEFAULT NOW(),
  extracted_by_model_version VARCHAR(20) DEFAULT '1.0.0',
  
  -- Flags
  is_informative_note BOOLEAN DEFAULT FALSE,
  is_recommendation BOOLEAN DEFAULT FALSE,        -- "should", "could", "may"
  is_in_scope BOOLEAN DEFAULT TRUE,               -- TRUE only for clauses 4-10
  aerospace_addition BOOLEAN DEFAULT FALSE,       -- AS9100-specific additions
  requires_maintained_di BOOLEAN DEFAULT FALSE,   -- Requires maintained documented information
  requires_retained_di BOOLEAN DEFAULT FALSE,      -- Requires retained documented information
  
  -- Additional Metadata
  evidence_requirements JSONB,                    -- Expected evidence type
  related_clauses JSONB,                          -- Related requirements
  audit_frequency VARCHAR(50),                    -- How often audited
  extraction_flags JSONB,                        -- Edge case flags
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_parsed_requirements_standard_id ON public.parsed_requirements(standard_id);
CREATE INDEX idx_parsed_requirements_clause_number ON public.parsed_requirements(clause_number);
CREATE INDEX idx_parsed_requirements_clause_ref ON public.parsed_requirements(clause_ref);
CREATE INDEX idx_parsed_requirements_full_ref ON public.parsed_requirements(full_ref);
CREATE INDEX idx_parsed_requirements_requirement_uid ON public.parsed_requirements(requirement_uid);
CREATE INDEX idx_parsed_requirements_extracted_at ON public.parsed_requirements(extracted_at DESC);
```

### Key Fields Explained:

| Field | Purpose | Example |
|-------|---------|---------|
| `clause_number` | Full clause path | "8.5.1" |
| `clause_ref` | Top-level clause | "8" |
| `sub_ref` | Sub-item reference | "a", "b", "c" |
| `full_ref` | Complete path | "8.5.1.a" |
| `subject_text` | Paragraph number | "P1", "P2", "P3" |
| `requirement_text` | Full requirement | "The organization shall..." |
| `requirement_uid` | Deterministic ID | SHA256 hash (16 chars) |

---

## 5️⃣ CUSTOMER_DOCUMENTS Table

**Location:** `public.customer_documents`

**Purpose:** Stores uploaded customer documents (procedures, manuals, etc.)

### Schema:

```sql
CREATE TABLE public.customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  upload_file_id UUID REFERENCES upload_files(id) ON DELETE SET NULL,
  file_name VARCHAR(255),
  original_name VARCHAR(255),
  file_type VARCHAR(50),
  raw_content BYTEA,
  extracted_text TEXT,
  extraction_confidence DECIMAL(3,2),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  extracted_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  page_count INT,
  word_count INT,
  document_hash VARCHAR(64)
);
```

---

## 6️⃣ CUSTOMER_PROCEDURES Table

**Location:** `public.customer_procedures`

**Purpose:** Stores extracted procedures from customer documents

### Schema:

```sql
CREATE TABLE public.customer_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES customer_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255),
  procedure_number VARCHAR(100),
  section_number VARCHAR(100),
  procedure_text TEXT,
  extracted_text TEXT,
  extracted_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);
```

---

## Summary

### Storage Strategy:

1. **Standards, Regulations, Customer Requirements** → All in `public.standards` table
   - Distinguished by `file_category` field
   - Same structure, same parsing logic

2. **Parsed Requirements** → `public.parsed_requirements` table
   - One row per requirement
   - Linked to `standards` via `standard_id`
   - Contains full clause hierarchy and metadata

3. **Customer Documents** → `public.customer_documents` table
   - Uploaded customer files (procedures, manuals)

4. **Customer Procedures** → `public.customer_procedures` table
   - Extracted procedures from customer documents

### Key Relationships:

```
public.standards (id)
    ↓
public.parsed_requirements (standard_id) → References standards.id

public.customer_documents (id)
    ↓
public.customer_procedures (document_id) → References customer_documents.id
```

### Query Examples:

```sql
-- Get all standards with their requirement counts
SELECT 
  s.code,
  s.name,
  s.file_category,
  COUNT(pr.id) as requirement_count
FROM public.standards s
LEFT JOIN public.parsed_requirements pr ON s.id = pr.standard_id
GROUP BY s.id, s.code, s.name, s.file_category
ORDER BY s.file_category, s.code;

-- Get all requirements for a specific standard
SELECT 
  clause_number,
  clause_title,
  requirement_text,
  paragraph,
  confidence
FROM public.parsed_requirements
WHERE standard_id = 'your-standard-uuid-here'
ORDER BY clause_number, subject_text;

-- Get all regulatory requirements
SELECT 
  s.code,
  s.name,
  COUNT(pr.id) as requirement_count
FROM public.standards s
LEFT JOIN public.parsed_requirements pr ON s.id = pr.standard_id
WHERE s.file_category = 'regulatory'
GROUP BY s.id, s.code, s.name;
```

---

## Notes

- **No separate regulations table** - Everything is in `standards` with `file_category = 'regulatory'`
- **No separate customer_requirements table** - Everything is in `standards` with `file_category = 'customer_requirement'`
- **Unified approach** - All compliance documents share the same structure and parsing logic
- **Railway persistence** - `file_content` BYTEA column stores files in database (survives redeploys)

