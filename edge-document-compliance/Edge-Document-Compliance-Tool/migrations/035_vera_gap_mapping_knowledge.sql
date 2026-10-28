-- =============================================================================
-- MIGRATION 035: Vera Gap Analysis & Mapping Knowledge Pack
-- Purpose: Add mapping logic, unmapped clause explanations, and example mappings
-- =============================================================================

-- =============================================================================
-- 1. MAPPING LOGIC PATTERNS
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_mapping_logic_patterns (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name            TEXT NOT NULL,          -- e.g., 'labeling', 'traceability', 'inspection_records'
    pattern_description     TEXT NOT NULL,
    typical_clauses         TEXT[],                 -- Array of clause refs that typically match
    mapping_rationale       TEXT NOT NULL,          -- How to decide if this pattern applies
    example_scenarios       TEXT[],                 -- Example scenarios
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_mapping_logic_patterns_name
    ON edcat.vera_mapping_logic_patterns (pattern_name);

-- =============================================================================
-- 2. UNMAPPED CLAUSE EXPLANATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_unmapped_clause_explanations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code           TEXT NOT NULL,
    clause_ref              TEXT NOT NULL,
    gap_type                TEXT NOT NULL,          -- 'documentation_gap', 'mapping_gap', 'implementation_gap'
    explanation             TEXT NOT NULL,          -- What it means if this clause is unmapped
    likely_causes           TEXT[],                  -- Array of likely causes
    suggested_actions       TEXT[],                 -- Array of suggested actions
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(standard_code, clause_ref)
);

CREATE INDEX IF NOT EXISTS idx_vera_unmapped_clause_standard
    ON edcat.vera_unmapped_clause_explanations (standard_code, clause_ref);

CREATE INDEX IF NOT EXISTS idx_vera_unmapped_clause_gap_type
    ON edcat.vera_unmapped_clause_explanations (gap_type);

-- =============================================================================
-- 3. EXAMPLE MAPPINGS (Synthetic but realistic)
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_example_mappings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code           TEXT NOT NULL,
    clause_ref              TEXT NOT NULL,
    customer_document_type  TEXT NOT NULL,          -- e.g., 'procedure', 'work_instruction', 'form'
    customer_document_name  TEXT NOT NULL,          -- Hypothetical document name
    section_reference       TEXT,                   -- Section in customer document
    mapping_rationale       TEXT NOT NULL,          -- Why this mapping makes sense
    is_synthetic            BOOLEAN DEFAULT TRUE,    -- Marked as example/synthetic
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_example_mappings_standard
    ON edcat.vera_example_mappings (standard_code, clause_ref);

-- Add comments
COMMENT ON TABLE edcat.vera_mapping_logic_patterns IS 'Patterns for mapping customer requirements to standard clauses (labeling, traceability, etc.)';
COMMENT ON TABLE edcat.vera_unmapped_clause_explanations IS 'Explanations of what unmapped clauses mean: documentation gap, mapping gap, or implementation gap';
COMMENT ON TABLE edcat.vera_example_mappings IS 'Synthetic but realistic example mappings between standards and customer documents';

