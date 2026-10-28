-- Vera Learned Corrections Table
-- Stores corrections and learning from user feedback

CREATE TABLE IF NOT EXISTS edcat.vera_learned_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NULL,
    broken_input TEXT NOT NULL,
    corrected_output TEXT NOT NULL,
    correction_type TEXT NOT NULL, -- 'incorrect', 'missed', 'needs_review', 'correct'
    confidence_before DECIMAL(3,2) DEFAULT 0.5,
    confidence_after DECIMAL(3,2) DEFAULT 0.8,
    usage_count INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_learned_corrections_broken 
    ON edcat.vera_learned_corrections(broken_input);
CREATE INDEX IF NOT EXISTS idx_vera_learned_corrections_active 
    ON edcat.vera_learned_corrections(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_vera_learned_corrections_usage 
    ON edcat.vera_learned_corrections(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_vera_learned_corrections_tenant 
    ON edcat.vera_learned_corrections(tenant_id);

COMMENT ON TABLE edcat.vera_learned_corrections IS 'Stores corrections and learning from user feedback for Vera';

