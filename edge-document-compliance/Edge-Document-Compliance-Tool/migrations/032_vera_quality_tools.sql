-- =============================================================================
-- MIGRATION 032: Vera Quality Tools & Statistics Knowledge Pack
-- Purpose: Add structured knowledge for quality tools, SPC, capability, MSA, DOE, FMEA, etc.
-- =============================================================================

-- =============================================================================
-- 1. QUALITY TOOLS KNOWLEDGE
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_quality_tools (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_name           TEXT NOT NULL UNIQUE,       -- e.g., 'Pareto Chart', 'Cp', 'GR&R'
    category            TEXT NOT NULL,              -- '7QC Tools', 'SPC', 'Capability', 'MSA', 'DOE', 'FMEA', 'Risk Management'
    definition          TEXT NOT NULL,              -- Clear definition
    when_to_use         TEXT NOT NULL,              -- When this tool is appropriate
    basic_steps         TEXT[],                     -- Array of basic steps
    common_mistakes     TEXT[],                     -- Array of common mistakes
    simple_example      TEXT,                       -- Short, conceptual example
    related_tools       TEXT[],                     -- Related tool names
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_quality_tools_category
    ON edcat.vera_quality_tools (category);

CREATE INDEX IF NOT EXISTS idx_vera_quality_tools_name
    ON edcat.vera_quality_tools (tool_name);

-- Add comments
COMMENT ON TABLE edcat.vera_quality_tools IS 'Structured knowledge for quality tools: 7QC, SPC, capability, MSA, DOE, FMEA, risk management';
COMMENT ON COLUMN edcat.vera_quality_tools.category IS 'Tool category: 7QC Tools, SPC, Capability, MSA, DOE, FMEA, Risk Management';

