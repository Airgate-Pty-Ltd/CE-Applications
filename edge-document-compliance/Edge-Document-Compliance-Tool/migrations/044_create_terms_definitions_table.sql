-- Migration: Create Terms and Definitions Table
-- Stores terminology, acronyms, and definitions for Vera
-- Date: December 2024

-- ============================================================================
-- Create terms and definitions table in EDCAT AI database
-- ============================================================================

CREATE TABLE IF NOT EXISTS edcat.terms_and_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    
    -- Term identification
    term TEXT NOT NULL,                    -- The term or acronym (e.g., "CQE", "CAPA", "FOD")
    acronym TEXT,                          -- If term is an acronym, store expanded form here
    definition TEXT NOT NULL,              -- Full definition of the term
    short_definition TEXT,                 -- Abbreviated definition (optional)
    
    -- Categorization
    category TEXT,                         -- e.g., "quality", "manufacturing", "regulatory", "statistics"
    subcategory TEXT,                      -- e.g., "quality_tools", "measurement", "compliance"
    source_standard TEXT,                  -- e.g., "ISO9001", "AS9100D", "ASQ", "ETQ"
    source_document TEXT,                  -- Original document filename
    
    -- Context and usage
    context TEXT,                          -- Context where term is used
    related_terms TEXT[],                  -- Array of related term IDs or names
    synonyms TEXT[],                       -- Alternative names for the term
    usage_examples TEXT[],                 -- Example sentences or phrases
    
    -- Metadata
    quality_score DECIMAL(3,2) DEFAULT 1.0, -- Confidence/relevance score
    is_acronym BOOLEAN DEFAULT FALSE,     -- True if this is an acronym
    is_standard_term BOOLEAN DEFAULT FALSE, -- True if from official standard
    language TEXT DEFAULT 'en',            -- Language code
    
    -- Source tracking
    source_file_id UUID,                   -- Reference to ingested file
    source_file_path TEXT,                 -- Original file path
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_term_source UNIQUE (term, source_standard, source_document)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_terms_term ON edcat.terms_and_definitions(term);
CREATE INDEX IF NOT EXISTS idx_terms_acronym ON edcat.terms_and_definitions(acronym) WHERE acronym IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_terms_category ON edcat.terms_and_definitions(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_terms_source_standard ON edcat.terms_and_definitions(source_standard) WHERE source_standard IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_terms_is_acronym ON edcat.terms_and_definitions(is_acronym) WHERE is_acronym = TRUE;
CREATE INDEX IF NOT EXISTS idx_terms_tenant ON edcat.terms_and_definitions(tenant_id);

-- Full-text search index for definitions
CREATE INDEX IF NOT EXISTS idx_terms_definition_fts ON edcat.terms_and_definitions 
    USING gin(to_tsvector('english', COALESCE(term, '') || ' ' || COALESCE(definition, '') || ' ' || COALESCE(short_definition, '')));

-- Comments
COMMENT ON TABLE edcat.terms_and_definitions IS 'Terms, acronyms, and definitions for Vera - extracted from quality standards, glossaries, and terminology documents';
COMMENT ON COLUMN edcat.terms_and_definitions.term IS 'The term or acronym (e.g., "CQE", "CAPA", "FOD")';
COMMENT ON COLUMN edcat.terms_and_definitions.acronym IS 'If term is an acronym, the expanded form (e.g., "Corrective and Preventive Action" for CAPA)';
COMMENT ON COLUMN edcat.terms_and_definitions.definition IS 'Full definition of the term';
COMMENT ON COLUMN edcat.terms_and_definitions.source_standard IS 'Source standard or organization (e.g., "ISO9001", "AS9100D", "ASQ", "ETQ")';
COMMENT ON COLUMN edcat.terms_and_definitions.is_acronym IS 'True if this term is an acronym';

