-- =============================================================================
-- MIGRATION 030: Vera Clause Intelligence Pack
-- Purpose: Add structured clause-level knowledge beyond raw parsed text
--          Includes clause summaries, audit focus, and cross-standard mappings
-- =============================================================================

-- =============================================================================
-- 1. CLAUSE SUMMARIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_clause_summaries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code           TEXT NOT NULL,              -- e.g., 'AS9100D', 'ISO9001_2015'
    clause_ref              TEXT NOT NULL,              -- e.g., '8.7', '7.5.1'
    short_title             TEXT NOT NULL,              -- Brief clause title
    plain_language_summary  TEXT NOT NULL,              -- 2-4 sentences, practitioner-level
    key_verbs               TEXT[],                     -- e.g., ['control', 'disposition', 'segregation']
    risk_focus              BOOLEAN DEFAULT FALSE,      -- Does this clause focus on risk?
    risk_focus_description  TEXT,                       -- Brief description of risk aspect
    documentation_expectations TEXT,                     -- Brief description of expected records/evidence
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(standard_code, clause_ref)
);

CREATE INDEX IF NOT EXISTS idx_vera_clause_summaries_standard
    ON edcat.vera_clause_summaries (standard_code, clause_ref);

CREATE INDEX IF NOT EXISTS idx_vera_clause_summaries_risk
    ON edcat.vera_clause_summaries (risk_focus) WHERE risk_focus = TRUE;

-- =============================================================================
-- 2. CLAUSE INTENT & AUDIT FOCUS
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_clause_audit_focus (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code               TEXT NOT NULL,
    clause_ref                  TEXT NOT NULL,
    auditor_focus               TEXT NOT NULL,              -- What auditors typically look for
    common_misunderstandings    TEXT,                       -- Common misconceptions
    typical_objective_evidence  TEXT,                       -- High-level evidence types
    signs_of_implementation     TEXT,                       -- Signs of real implementation
    signs_of_paper_compliance   TEXT,                       -- Signs of only paper compliance
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(standard_code, clause_ref)
);

CREATE INDEX IF NOT EXISTS idx_vera_clause_audit_focus_standard
    ON edcat.vera_clause_audit_focus (standard_code, clause_ref);

-- =============================================================================
-- 3. CROSS-STANDARD MAPPINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_cross_standard_mappings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_standard        TEXT NOT NULL,              -- e.g., 'ISO9001_2015'
    from_clause         TEXT NOT NULL,              -- e.g., '8.5.1'
    to_standard         TEXT NOT NULL,              -- e.g., 'AS9100D'
    to_clause           TEXT NOT NULL,              -- e.g., '8.5.1'
    relationship_type    TEXT NOT NULL,              -- 'equivalent', 'broader', 'adds_requirements', 'different_focus'
    explanation         TEXT NOT NULL,              -- One-sentence explanation
    notes               TEXT,                       -- Additional context
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(from_standard, from_clause, to_standard, to_clause)
);

CREATE INDEX IF NOT EXISTS idx_vera_cross_standard_from
    ON edcat.vera_cross_standard_mappings (from_standard, from_clause);

CREATE INDEX IF NOT EXISTS idx_vera_cross_standard_to
    ON edcat.vera_cross_standard_mappings (to_standard, to_clause);

-- Add comments
COMMENT ON TABLE edcat.vera_clause_summaries IS 'Human-friendly clause summaries with key verbs, risk focus, and documentation expectations';
COMMENT ON TABLE edcat.vera_clause_audit_focus IS 'Audit-focused guidance: what auditors look for, common misunderstandings, evidence patterns';
COMMENT ON TABLE edcat.vera_cross_standard_mappings IS 'Cross-standard clause mappings (e.g., ISO 9001 ↔ AS9100) with relationship types';

