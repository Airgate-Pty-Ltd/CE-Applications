-- =============================================================================
-- MIGRATION 019: Vera Query-Response Bank & Learning Loop
-- Purpose: Add Q&A knowledge base and "I don't know, teach me" learning system
-- =============================================================================

-- =============================================================================
-- 1. VERA QUERY-RESPONSE BANK
-- =============================================================================

CREATE TABLE IF NOT EXISTS edcat.vera_query_response_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NULL,
    persona_code TEXT NOT NULL DEFAULT 'vera',
    category TEXT NOT NULL,  -- e.g. 'compliance', 'training', 'architecture', 'emotional_support', 'meta_ai_query'
    user_query_pattern TEXT NOT NULL, -- regex or fuzzy match pattern
    representative_examples JSONB NOT NULL, -- array of example phrasings
    response_template TEXT NOT NULL, -- Vera's canonical response (natural language, not bullets)
    learning_notes JSONB NULL, -- notes on how to adapt/extend
    confidence_score DECIMAL(3,2) DEFAULT 0.8, -- Match confidence (0.0-1.0)
    usage_count INT DEFAULT 0, -- How many times this Q&A was used
    last_used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NULL, -- User who created/taught this entry
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_vera_qr_persona_category
    ON edcat.vera_query_response_bank (persona_code, category) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vera_qr_tenant
    ON edcat.vera_query_response_bank (tenant_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vera_qr_category
    ON edcat.vera_query_response_bank (category) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vera_qr_pattern
    ON edcat.vera_query_response_bank USING gin(user_query_pattern gin_trgm_ops) WHERE is_active = TRUE;

-- Add comment
COMMENT ON TABLE edcat.vera_query_response_bank IS 'Knowledge base of Q&A patterns for Vera. Grows over time as she learns from user interactions.';
COMMENT ON COLUMN edcat.vera_query_response_bank.tenant_id IS 'NULL for global defaults, UUID for tenant-specific overrides';
COMMENT ON COLUMN edcat.vera_query_response_bank.representative_examples IS 'JSONB array of example user phrasings that match this pattern';
COMMENT ON COLUMN edcat.vera_query_response_bank.response_template IS 'Full narrative response in Vera voice, not bullet lists';

-- =============================================================================
-- 2. VERA MISSING KNOWLEDGE LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS edcat.vera_missing_knowledge_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NULL,
    persona_code TEXT NOT NULL DEFAULT 'vera',
    session_id UUID NULL,
    user_query TEXT NOT NULL,
    detected_intent TEXT NULL,
    context JSONB NULL, -- Full conversation context when unknown was detected
    status TEXT NOT NULL DEFAULT 'awaiting_training', -- 'awaiting_training', 'trained', 'ignored', 'in_progress'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    trained_at TIMESTAMPTZ NULL,
    trained_query_response_id UUID NULL REFERENCES edcat.vera_query_response_bank(id) ON DELETE SET NULL,
    training_notes TEXT NULL, -- Notes on how it was resolved
    created_by UUID NULL -- User who asked the question
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vera_missing_knowledge_status
    ON edcat.vera_missing_knowledge_log (status) WHERE status = 'awaiting_training';

CREATE INDEX IF NOT EXISTS idx_vera_missing_knowledge_tenant
    ON edcat.vera_missing_knowledge_log (tenant_id);

CREATE INDEX IF NOT EXISTS idx_vera_missing_knowledge_session
    ON edcat.vera_missing_knowledge_log (session_id);

CREATE INDEX IF NOT EXISTS idx_vera_missing_knowledge_created
    ON edcat.vera_missing_knowledge_log (created_at DESC);

-- Add comment
COMMENT ON TABLE edcat.vera_missing_knowledge_log IS 'Log of questions Vera could not answer. Used for training and knowledge expansion.';
COMMENT ON COLUMN edcat.vera_missing_knowledge_log.status IS 'awaiting_training: needs answer, trained: resolved, ignored: not important, in_progress: being worked on';

-- =============================================================================
-- 3. VIEW: ACTIVE Q&A ENTRIES BY CATEGORY
-- =============================================================================

CREATE OR REPLACE VIEW edcat.vera_active_query_responses AS
SELECT 
    id,
    tenant_id,
    persona_code,
    category,
    user_query_pattern,
    representative_examples,
    response_template,
    learning_notes,
    confidence_score,
    usage_count,
    last_used_at,
    created_at,
    updated_at
FROM edcat.vera_query_response_bank
WHERE is_active = TRUE
ORDER BY category, usage_count DESC, created_at DESC;

-- =============================================================================
-- 4. FUNCTION: UPDATE USAGE STATS
-- =============================================================================

CREATE OR REPLACE FUNCTION edcat.increment_query_response_usage(p_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE edcat.vera_query_response_bank
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. FUNCTION: RESOLVE MISSING KNOWLEDGE
-- =============================================================================

CREATE OR REPLACE FUNCTION edcat.resolve_missing_knowledge(
    p_missing_knowledge_id UUID,
    p_query_response_id UUID,
    p_training_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE edcat.vera_missing_knowledge_log
    SET 
        status = 'trained',
        trained_at = NOW(),
        trained_query_response_id = p_query_response_id,
        training_notes = p_training_notes
    WHERE id = p_missing_knowledge_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMIT
-- =============================================================================

COMMENT ON SCHEMA edcat IS 'EDCAT AI Intelligence Database Schema - Vera AI Operations';

