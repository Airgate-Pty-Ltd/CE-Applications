-- =============================================================================
-- MIGRATION 022: Vera Parser Supervision System
-- Purpose: Enable Vera to supervise, critique, and learn from document parser runs
-- =============================================================================

-- =============================================================================
-- 1. PARSER RUNS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS edcat.parser_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NULL,
    standard_id UUID NULL,                    -- Cross-ref to public.standards.id (by value, not FK)
    document_id UUID NULL,                     -- Cross-ref to public.customer_documents.id (by value, not FK)
    document_type TEXT NOT NULL,               -- 'STANDARD', 'REGULATION', 'CUSTOMER_REQUIREMENTS', 'LEARNING_DOC'
    parser_chain JSONB NOT NULL,               -- Ordered list of parsers used: ["UniversalComplianceParser", "SimpleShallParser"]
    requirements_extracted INT NOT NULL DEFAULT 0,
    qa_status TEXT NOT NULL,                   -- 'PASS', 'WARN', 'FAIL'
    qa_issues JSONB NULL,                      -- Array of issues: ["OUT-OF-SCOPE: Requirements found in clauses 1-3"]
    qa_warnings JSONB NULL,                    -- Array of warnings: ["Requirement total 75 below expected minimum (300)"]
    confidence_stats JSONB NULL,                -- {min: 0.5, max: 1.0, avg: 0.85, distribution: {...}}
    clause_coverage JSONB NULL,                 -- {4: 45, 5: 32, 6: 28, 7: 89, 8: 156, ...}
    run_metadata JSONB NULL,                   -- {doc_length: 500000, page_count: 120, file_type: "pdf", ...}
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,
    created_by UUID NULL,                      -- Link to edcat.ai_user_profile.id if available
    error_message TEXT NULL                    -- If parsing failed
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parser_runs_tenant
    ON edcat.parser_runs (tenant_id);

CREATE INDEX IF NOT EXISTS idx_parser_runs_standard
    ON edcat.parser_runs (standard_id) WHERE standard_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parser_runs_document
    ON edcat.parser_runs (document_id) WHERE document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parser_runs_qa_status
    ON edcat.parser_runs (qa_status);

CREATE INDEX IF NOT EXISTS idx_parser_runs_completed
    ON edcat.parser_runs (completed_at DESC) WHERE completed_at IS NOT NULL;

-- Comments
COMMENT ON TABLE edcat.parser_runs IS 'Logs of parser execution runs, allowing Vera to track and critique parser behavior';
COMMENT ON COLUMN edcat.parser_runs.parser_chain IS 'JSONB array of parser names used in order: ["UniversalComplianceParser", "SimpleShallParser"]';
COMMENT ON COLUMN edcat.parser_runs.qa_status IS 'QA validation status: PASS (good), WARN (suspicious but usable), FAIL (untrustworthy)';
COMMENT ON COLUMN edcat.parser_runs.confidence_stats IS 'JSONB with min, max, avg confidence scores and distribution buckets';
COMMENT ON COLUMN edcat.parser_runs.clause_coverage IS 'JSONB object mapping clause numbers to requirement counts: {"4": 45, "8.5.1": 12}';

-- =============================================================================
-- 2. PARSER FEEDBACK TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS edcat.parser_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    parser_run_id UUID NOT NULL REFERENCES edcat.parser_runs(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL,               -- 'MISSING_REQUIREMENTS', 'WRONG_CLAUSE', 'TOO_FEW_REQUIREMENTS', 'TOO_MANY_REQUIREMENTS', 'BAD_INTENT_MAPPING', 'LOW_CONFIDENCE', 'OTHER'
    feedback_details JSONB NOT NULL,           -- Structured payload: {clause: "8.5.1", expected_count: 12, actual_count: 3, user_explanation: "..."}
    created_by UUID NULL,                      -- Link to edcat.ai_user_profile.id
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL,              -- When feedback was addressed
    resolution_notes TEXT NULL                 -- How it was resolved
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parser_feedback_run
    ON edcat.parser_feedback (parser_run_id);

CREATE INDEX IF NOT EXISTS idx_parser_feedback_tenant
    ON edcat.parser_feedback (tenant_id);

CREATE INDEX IF NOT EXISTS idx_parser_feedback_type
    ON edcat.parser_feedback (feedback_type);

CREATE INDEX IF NOT EXISTS idx_parser_feedback_resolved
    ON edcat.parser_feedback (resolved_at) WHERE resolved_at IS NULL;

-- Comments
COMMENT ON TABLE edcat.parser_feedback IS 'User and Vera feedback on parser runs, enabling parser improvement over time';
COMMENT ON COLUMN edcat.parser_feedback.feedback_type IS 'Type of issue: MISSING_REQUIREMENTS, WRONG_CLAUSE, TOO_FEW_REQUIREMENTS, etc.';
COMMENT ON COLUMN edcat.parser_feedback.feedback_details IS 'JSONB with structured details about the issue and user explanation';

-- =============================================================================
-- 3. VIEW: ACTIVE PARSER RUNS WITH FEEDBACK COUNT
-- =============================================================================

CREATE OR REPLACE VIEW edcat.vera_active_parser_runs AS
SELECT 
    pr.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', pf.id,
                'feedback_type', pf.feedback_type,
                'feedback_details', pf.feedback_details,
                'created_at', pf.created_at,
                'resolved_at', pf.resolved_at
            )
        ) FILTER (WHERE pf.id IS NOT NULL),
        '[]'::json
    ) AS feedback_entries,
    COUNT(pf.id) FILTER (WHERE pf.resolved_at IS NULL) AS unresolved_feedback_count
FROM edcat.parser_runs pr
LEFT JOIN edcat.parser_feedback pf ON pf.parser_run_id = pr.id
WHERE pr.completed_at IS NOT NULL
GROUP BY pr.id;

-- =============================================================================
-- 4. FUNCTION: LINK PARSER FEEDBACK TO LEARNING EVENTS
-- =============================================================================

CREATE OR REPLACE FUNCTION edcat.link_parser_feedback_to_learning()
RETURNS TRIGGER AS $$
BEGIN
    -- When parser feedback is created, also create a learning event
    INSERT INTO edcat.edcat_learning_events (
        requirement_id,
        standard_id,
        event_type,
        confidence_before,
        confidence_after,
        improvement,
        feedback_rating,
        created_at
    )
    SELECT 
        NULL,  -- requirement_id not applicable for parser feedback
        NEW.parser_run_id::text::uuid,  -- Use parser_run_id as standard_id reference (if applicable)
        'parser_feedback',
        0.0,  -- confidence_before (not applicable)
        0.0,  -- confidence_after (not applicable)
        0.0,  -- improvement (not applicable)
        CASE 
            WHEN NEW.feedback_type IN ('MISSING_REQUIREMENTS', 'WRONG_CLAUSE', 'BAD_INTENT_MAPPING') THEN 1
            WHEN NEW.feedback_type IN ('TOO_FEW_REQUIREMENTS', 'LOW_CONFIDENCE') THEN 2
            ELSE 3
        END,
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM edcat.edcat_learning_events 
        WHERE event_type = 'parser_feedback' 
        AND standard_id::text = NEW.parser_run_id::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-link feedback to learning events
DROP TRIGGER IF EXISTS trigger_link_parser_feedback_learning ON edcat.parser_feedback;
CREATE TRIGGER trigger_link_parser_feedback_learning
    AFTER INSERT ON edcat.parser_feedback
    FOR EACH ROW
    EXECUTE FUNCTION edcat.link_parser_feedback_to_learning();

-- =============================================================================
-- COMMIT
-- =============================================================================

COMMENT ON SCHEMA edcat IS 'EDCAT AI Intelligence Database Schema - Vera AI Operations';

