-- =============================================================================
-- MIGRATION 029: Vera Quality Knowledge Base
-- Purpose: Create tables for storing comprehensive quality engineering knowledge
--          (CQE, Six Sigma, Lean, KPIs, Culture, Agile+QMS) to enable deep,
--          conversational quality discussions.
-- =============================================================================

-- Master topics for quality knowledge
CREATE TABLE IF NOT EXISTS edcat.vera_quality_topics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_code      TEXT NOT NULL UNIQUE,   -- e.g. 'CQE_OVERVIEW', 'SIX_SIGMA_DMAIC', 'LEAN_WASTES'
    category        TEXT NOT NULL,          -- e.g. 'CQE', 'Six Sigma', 'Lean', 'KPIs', 'Culture', 'Agile_QMS'
    title           TEXT NOT NULL,
    summary         TEXT NOT NULL,
    difficulty      TEXT NOT NULL DEFAULT 'intermediate', -- 'intro', 'intermediate', 'advanced'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_quality_topics_category
    ON edcat.vera_quality_topics (category);

CREATE INDEX IF NOT EXISTS idx_vera_quality_topics_code
    ON edcat.vera_quality_topics (topic_code);

CREATE INDEX IF NOT EXISTS idx_vera_quality_topics_active
    ON edcat.vera_quality_topics (is_active) WHERE is_active = TRUE;

-- Knowledge snippets (atomic pieces of explanation)
CREATE TABLE IF NOT EXISTS edcat.vera_quality_snippets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id        UUID NOT NULL REFERENCES edcat.vera_quality_topics(id) ON DELETE CASCADE,
    snippet_type    TEXT NOT NULL,       -- 'definition', 'principles', 'tooling', 'example', 'pitfall', 'exam_angle'
    content         TEXT NOT NULL,
    level           TEXT NOT NULL DEFAULT 'core', -- 'core', 'deep', 'exam'
    weight          INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_quality_snippets_topic
    ON edcat.vera_quality_snippets (topic_id, snippet_type);

CREATE INDEX IF NOT EXISTS idx_vera_quality_snippets_type
    ON edcat.vera_quality_snippets (snippet_type, level);

-- Q&A style entries for common questions (exam-style or practical)
CREATE TABLE IF NOT EXISTS edcat.vera_quality_qa (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id        UUID NOT NULL REFERENCES edcat.vera_quality_topics(id) ON DELETE CASCADE,
    question_pattern TEXT NOT NULL,      -- e.g. 'what is six sigma', 'define dmaic', 'what is cost of quality'
    answer_core     TEXT NOT NULL,       -- core canonical answer
    answer_layered  TEXT,                -- expanded teaching answer (multi-paragraph)
    tags            TEXT[] DEFAULT '{}', -- ['definition','example','exam']
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_quality_qa_topic
    ON edcat.vera_quality_qa (topic_id);

-- Note: gin_trgm_ops requires pg_trgm extension
-- Using standard index for now; can be enhanced later if needed
CREATE INDEX IF NOT EXISTS idx_vera_quality_qa_pattern
    ON edcat.vera_quality_qa (question_pattern);

-- Add comments
COMMENT ON TABLE edcat.vera_quality_topics IS 'Master topics for quality engineering knowledge (CQE, Six Sigma, Lean, KPIs, Culture, Agile+QMS)';
COMMENT ON TABLE edcat.vera_quality_snippets IS 'Atomic knowledge snippets for building layered explanations';
COMMENT ON TABLE edcat.vera_quality_qa IS 'Q&A patterns for common quality engineering questions';
COMMENT ON COLUMN edcat.vera_quality_topics.difficulty IS 'Difficulty level: intro, intermediate, or advanced';
COMMENT ON COLUMN edcat.vera_quality_snippets.snippet_type IS 'Type: definition, principles, tooling, example, pitfall, exam_angle';
COMMENT ON COLUMN edcat.vera_quality_snippets.level IS 'Depth level: core, deep, or exam';

