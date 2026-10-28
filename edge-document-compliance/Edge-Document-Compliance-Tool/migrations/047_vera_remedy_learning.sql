-- Migration 047: Vera Remedy Learning System
-- Purpose: Track remedy applications and their effectiveness
-- Created: 2025-12-03

BEGIN;

-- Create vera_remedy_applications table
CREATE TABLE IF NOT EXISTS edcat.vera_remedy_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_code VARCHAR(50) NOT NULL,
    remedy_action TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolution_time_ms BIGINT, -- milliseconds between applied_at and resolved_at
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_remedy_issue_code 
    ON edcat.vera_remedy_applications(issue_code);

CREATE INDEX IF NOT EXISTS idx_remedy_resolved 
    ON edcat.vera_remedy_applications(resolved) 
    WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_remedy_applied_at 
    ON edcat.vera_remedy_applications(applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_remedy_issue_remedy 
    ON edcat.vera_remedy_applications(issue_code, remedy_action);

-- Add comments
COMMENT ON TABLE edcat.vera_remedy_applications IS 'Tracks remedy applications and their resolution status for learning';
COMMENT ON COLUMN edcat.vera_remedy_applications.issue_code IS 'The issue code this remedy was applied to';
COMMENT ON COLUMN edcat.vera_remedy_applications.remedy_action IS 'The specific remedy action that was applied';
COMMENT ON COLUMN edcat.vera_remedy_applications.resolution_time_ms IS 'Time taken to resolve the issue (in milliseconds)';

COMMIT;

