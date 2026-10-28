-- Migration 048: Fix vera_debug_sessions schema for health logging
-- Purpose: Add columns needed for VeraEngineHealthService logging
-- Created: 2025-12-03

BEGIN;

-- Add columns to vera_debug_sessions if they don't exist
ALTER TABLE IF EXISTS edcat.vera_debug_sessions
  ADD COLUMN IF NOT EXISTS issue_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'error')),
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS first_seen TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS occurrences INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS details JSONB;

-- Create indexes for health queries
CREATE INDEX IF NOT EXISTS idx_vera_debug_sessions_issue_code 
  ON edcat.vera_debug_sessions(issue_code) WHERE issue_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vera_debug_sessions_severity 
  ON edcat.vera_debug_sessions(severity) WHERE severity IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vera_debug_sessions_last_seen 
  ON edcat.vera_debug_sessions(last_seen DESC);

COMMENT ON COLUMN edcat.vera_debug_sessions.issue_code IS 'Issue code (e.g., DB_SCHEMA_MISMATCH, SEMANTIC_SEARCH_DISABLED)';
COMMENT ON COLUMN edcat.vera_debug_sessions.severity IS 'Severity level: info, warning, or error';
COMMENT ON COLUMN edcat.vera_debug_sessions.message IS 'Human-readable issue message';
COMMENT ON COLUMN edcat.vera_debug_sessions.occurrences IS 'Number of times this issue has occurred';

COMMIT;

