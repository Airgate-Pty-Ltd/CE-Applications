-- ============================================================================
-- EDCAT Bounded AI - GAP Analysis Schema
-- ============================================================================
-- This schema supports clause-based GAP analysis with bounded AI operations.
-- All operations are scoped to tenants and only operate on documents/sources
-- explicitly stored in the EDCAT system.
-- ============================================================================

-- Enable pgvector extension for embeddings (if available)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. TENANTS
-- ============================================================================
-- Multi-tenant architecture: all data is scoped to tenants.
-- Note: The existing 'customers' table acts as tenants in the current system.
-- This table provides explicit tenant management if needed.

CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(100) UNIQUE NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- ============================================================================
-- 2. STANDARDS
-- ============================================================================
-- Represents authoritative requirement sources: AS9100D, AS9110, ISO 9001, 
-- FAA 21.137, customer specs, etc.
-- These are global references; tenants link to subsets via tenant_standards.

CREATE TABLE IF NOT EXISTS standards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,          -- "AS9100D"
    code            VARCHAR(100) NOT NULL,          -- "AS9100D", "FAA-21.137"
    version         VARCHAR(100),                   -- "Rev D", "Amendment X", etc.
    source_type     VARCHAR(50) NOT NULL,           -- "standard", "regulation", "customer_req"
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (code, version)
);

CREATE INDEX IF NOT EXISTS idx_standards_code ON standards(code);
CREATE INDEX IF NOT EXISTS idx_standards_source_type ON standards(source_type);
CREATE INDEX IF NOT EXISTS idx_standards_active ON standards(is_active);

-- ============================================================================
-- 3. CLAUSES
-- ============================================================================
-- Each row = a specific requirement fragment that can be mapped and tested.

CREATE TABLE IF NOT EXISTS clauses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standard_id     UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
    clause_ref      VARCHAR(100) NOT NULL,          -- "8.3.2", "21.137(e)", etc.
    title           VARCHAR(500),
    requirement_text TEXT NOT NULL,                 -- cleaned/normalized requirement
    is_mandatory    BOOLEAN NOT NULL DEFAULT TRUE,
    category        VARCHAR(255),                   -- e.g. "Design & Development"
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (standard_id, clause_ref)
);

CREATE INDEX IF NOT EXISTS idx_clauses_standard ON clauses(standard_id);
CREATE INDEX IF NOT EXISTS idx_clauses_ref ON clauses(clause_ref);
CREATE INDEX IF NOT EXISTS idx_clauses_category ON clauses(category);

-- ============================================================================
-- 4. GAP PROFILES
-- ============================================================================
-- Structured Conform-Edge intelligence for each clause. This is the backbone 
-- of GAP analysis.

CREATE TABLE IF NOT EXISTS gap_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clause_id           UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
    interpretation      TEXT NOT NULL,             -- Conform-Edge explanation
    expected_evidence   TEXT NOT NULL,             -- What fully compliant looks like
    expected_documents  TEXT,                      -- e.g. CSV or JSON of doc types
    audit_questions     TEXT,                      -- suggested questions
    common_pitfalls     TEXT,                      -- common misreads/failures
    risk_level          VARCHAR(50),               -- "Low", "Medium", "High", etc.
    criticality_notes   TEXT,
    tags                TEXT,                      -- serialized list of tags (JSON or CSV)
    version_label       VARCHAR(100) DEFAULT 'v1',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (clause_id, version_label)
);

CREATE INDEX IF NOT EXISTS idx_gap_profiles_clause ON gap_profiles(clause_id);
CREATE INDEX IF NOT EXISTS idx_gap_profiles_active ON gap_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_gap_profiles_version ON gap_profiles(version_label);

-- ============================================================================
-- 5. TENANT_STANDARDS
-- ============================================================================
-- Map which standards/GAP profiles are enabled for which tenants.

CREATE TABLE IF NOT EXISTS tenant_standards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    standard_id     UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tenant_id, standard_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_standards_tenant ON tenant_standards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_standards_standard ON tenant_standards(standard_id);
CREATE INDEX IF NOT EXISTS idx_tenant_standards_enabled ON tenant_standards(is_enabled);

-- ============================================================================
-- 6. DOCUMENTS (Extended)
-- ============================================================================
-- The existing 'documents' table already exists. We extend it with new columns
-- if needed. For GAP analysis, we track:
-- - doc_type: "qm", "procedure", "form", "wi", "spec", "standard_copy"
-- - source: "upload", "crawler", "manual_seed"
-- - standard_id: optional link if it is a copy/variant
-- - version_label, revision
-- - metadata: JSONB for flexible storage

-- Note: The existing documents table has customer_id which acts as tenant_id.
-- We'll add columns if they don't exist.

DO $$
BEGIN
    -- Add doc_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'doc_type') THEN
        ALTER TABLE documents ADD COLUMN doc_type VARCHAR(100);
    END IF;

    -- Add source if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'source') THEN
        ALTER TABLE documents ADD COLUMN source VARCHAR(100) DEFAULT 'upload';
    END IF;

    -- Add standard_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'standard_id') THEN
        ALTER TABLE documents ADD COLUMN standard_id UUID REFERENCES standards(id);
    END IF;

    -- Add version_label if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'version_label') THEN
        ALTER TABLE documents ADD COLUMN version_label VARCHAR(100);
    END IF;

    -- Add revision if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'revision') THEN
        ALTER TABLE documents ADD COLUMN revision VARCHAR(50);
    END IF;

    -- Add metadata if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'metadata') THEN
        ALTER TABLE documents ADD COLUMN metadata JSONB;
    END IF;

    -- Add is_active if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'documents' AND column_name = 'is_active') THEN
        ALTER TABLE documents ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);
CREATE INDEX IF NOT EXISTS idx_documents_standard ON documents(standard_id);
CREATE INDEX IF NOT EXISTS idx_documents_active ON documents(is_active);

-- ============================================================================
-- 7. DOCUMENT_CHUNKS
-- ============================================================================
-- Chunked text segments for retrieval and analysis.

CREATE TABLE IF NOT EXISTS document_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL,                  -- References customers(id) or tenants(id)
    position        INTEGER NOT NULL,              -- chunk index
    section_label   VARCHAR(500),                  -- e.g. "4.2 Scope", "Clause 8.3.2"
    text            TEXT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_position ON document_chunks(document_id, position);

-- ============================================================================
-- 8. EMBEDDINGS
-- ============================================================================
-- Embeddings for semantic search. Uses pgvector if available.
-- Note: If pgvector is not available, we'll store embeddings as JSONB arrays
-- and handle vector operations in application code.

CREATE TABLE IF NOT EXISTS embeddings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL,              -- References customers(id) or tenants(id)
    document_chunk_id   UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    embedding           JSONB NOT NULL,             -- Store as JSONB array if vector type unavailable
    model               VARCHAR(255) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (document_chunk_id, model)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_tenant ON embeddings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk ON embeddings(document_chunk_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_model ON embeddings(model);

-- ============================================================================
-- 9. GAP_PROFILE_EMBEDDINGS
-- ============================================================================
-- Embeddings for GAP profiles so they can be matched semantically to 
-- client documents.

CREATE TABLE IF NOT EXISTS gap_profile_embeddings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gap_profile_id  UUID NOT NULL REFERENCES gap_profiles(id) ON DELETE CASCADE,
    embedding       JSONB NOT NULL,                 -- Store as JSONB array if vector type unavailable
    model           VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (gap_profile_id, model)
);

CREATE INDEX IF NOT EXISTS idx_gap_profile_embeddings_profile ON gap_profile_embeddings(gap_profile_id);
CREATE INDEX IF NOT EXISTS idx_gap_profile_embeddings_model ON gap_profile_embeddings(model);

-- ============================================================================
-- 10. GAP_ANALYSIS_LOGS
-- ============================================================================
-- Log table for GAP analysis runs (admin console integration)

CREATE TABLE IF NOT EXISTS gap_analysis_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,                  -- References customers(id) or tenants(id)
    user_id         UUID,                           -- References users(id) if users table exists
    standard_code   VARCHAR(100) NOT NULL,
    target_docs     JSONB NOT NULL,                 -- Array of document IDs
    requested_clauses JSONB,                       -- Array of clause references
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gap_analysis_logs_tenant ON gap_analysis_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_logs_standard ON gap_analysis_logs(standard_code);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_logs_created ON gap_analysis_logs(created_at);

