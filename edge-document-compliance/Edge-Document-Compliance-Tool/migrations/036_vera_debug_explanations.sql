-- =============================================================================
-- MIGRATION 036: Vera Debug & Self-Explanation Knowledge Pack
-- Purpose: Add templates for debug mode explanations of routing and knowledge selection
-- =============================================================================

-- =============================================================================
-- 1. DEBUG EXPLANATION TEMPLATES
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_debug_explanations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    explanation_type        TEXT NOT NULL,          -- 'intent_selection', 'knowledge_source', 'standards_vs_qna', 'no_data_fallback'
    template_title          TEXT NOT NULL,
    template_text           TEXT NOT NULL,          -- Template with placeholders
    placeholders            TEXT[],                 -- Array of placeholder names
    example_usage           TEXT,                   -- Example of filled template
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_debug_explanations_type
    ON edcat.vera_debug_explanations (explanation_type);

-- Add comments
COMMENT ON TABLE edcat.vera_debug_explanations IS 'Templates for debug mode explanations: how intent was chosen, knowledge sources used, fallback logic';

