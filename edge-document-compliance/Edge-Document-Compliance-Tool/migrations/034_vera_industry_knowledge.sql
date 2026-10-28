-- =============================================================================
-- MIGRATION 034: Vera Multi-Industry Domain Knowledge Pack
-- Purpose: Add industry profiles, domain-specific examples, and audit style differences
-- =============================================================================

-- =============================================================================
-- 1. INDUSTRY PROFILES
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_industry_profiles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_code           TEXT NOT NULL UNIQUE,   -- 'aerospace', 'medical_device', 'automotive', 'pharma'
    industry_name           TEXT NOT NULL,
    primary_standards       TEXT[] NOT NULL,         -- Array of standard codes
    primary_regulators      TEXT[] NOT NULL,         -- Array of regulator names
    high_level_risks        TEXT NOT NULL,           -- Plain language risk description
    typical_qms_modules     TEXT[],                  -- e.g., 'configuration_management', 'APQP', 'risk_management'
    audit_style_notes       TEXT,                   -- How auditors in this domain operate
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_industry_profiles_code
    ON edcat.vera_industry_profiles (industry_code);

-- =============================================================================
-- 2. DOMAIN-SPECIFIC EXAMPLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_domain_examples (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_code       TEXT NOT NULL,
    example_category    TEXT NOT NULL,              -- 'terminology', 'process', 'documentation', 'audit'
    example_title       TEXT NOT NULL,
    example_description TEXT NOT NULL,
    related_standard    TEXT,                       -- Related standard code
    related_clause      TEXT,                       -- Related clause reference
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_domain_examples_industry
    ON edcat.vera_domain_examples (industry_code, example_category);

-- Add comments
COMMENT ON TABLE edcat.vera_industry_profiles IS 'Industry profiles: aerospace, medical device, automotive with standards, regulators, risks, QMS modules';
COMMENT ON TABLE edcat.vera_domain_examples IS 'Domain-specific examples: terminology, processes, documentation, audit patterns per industry';

