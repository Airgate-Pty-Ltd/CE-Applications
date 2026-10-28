-- =============================================================================
-- MIGRATION 031: Vera Audit & Nonconformity Intelligence Pack
-- Purpose: Add audit question patterns, NC examples, and severity guidance
-- =============================================================================

-- =============================================================================
-- 1. AUDIT QUESTION PATTERNS
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_audit_question_patterns (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code           TEXT NOT NULL,
    clause_ref              TEXT NOT NULL,
    open_questions          TEXT[] NOT NULL,             -- Array of open question examples
    closed_questions        TEXT[] NOT NULL,             -- Array of closed question examples
    silent_question_tips    TEXT,                       -- Description of silent question tactics
    follow_up_patterns      TEXT,                       -- Patterns for follow-up questions
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(standard_code, clause_ref)
);

CREATE INDEX IF NOT EXISTS idx_vera_audit_questions_standard
    ON edcat.vera_audit_question_patterns (standard_code, clause_ref);

-- =============================================================================
-- 2. NONCONFORMITY EXAMPLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_nc_examples (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code       TEXT NOT NULL,
    clause_ref          TEXT NOT NULL,
    severity            TEXT NOT NULL,              -- 'major', 'minor', 'ofi'
    good_nc_example     TEXT NOT NULL,              -- Clear, fact-based, clause-referenced
    bad_nc_example      TEXT NOT NULL,              -- Vague, opinion-based
    why_good            TEXT NOT NULL,              -- Explanation of why good example is effective
    why_bad             TEXT NOT NULL,              -- Explanation of why bad example is weak
    suggested_rewrite   TEXT,                       -- How to fix the bad example
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_nc_examples_standard
    ON edcat.vera_nc_examples (standard_code, clause_ref);

CREATE INDEX IF NOT EXISTS idx_vera_nc_examples_severity
    ON edcat.vera_nc_examples (severity);

-- =============================================================================
-- 3. AUDIT SEVERITY GUIDANCE
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_audit_severity_guidance (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code       TEXT NOT NULL,
    severity_type       TEXT NOT NULL,              -- 'major', 'minor', 'ofi'
    condition_pattern   TEXT NOT NULL,              -- Description of condition
    rationale           TEXT NOT NULL,              -- Why this severity
    examples            TEXT[],                     -- Example scenarios
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_severity_standard
    ON edcat.vera_audit_severity_guidance (standard_code, severity_type);

-- Add comments
COMMENT ON TABLE edcat.vera_audit_question_patterns IS 'Audit question patterns per clause: open, closed, silent, and follow-up questions';
COMMENT ON TABLE edcat.vera_nc_examples IS 'Nonconformity examples: good vs bad, with explanations and suggested rewrites';
COMMENT ON TABLE edcat.vera_audit_severity_guidance IS 'Guidance on audit severity (major/minor/OFI) for different standards';

