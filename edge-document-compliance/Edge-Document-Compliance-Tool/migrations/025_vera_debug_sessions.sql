-- Vera Debug Sessions Table
-- Stores debug mode state for users

CREATE TABLE IF NOT EXISTS edcat.vera_debug_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    is_debug_mode BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_vera_debug_sessions_tenant_user 
    ON edcat.vera_debug_sessions(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_vera_debug_sessions_debug_mode 
    ON edcat.vera_debug_sessions(is_debug_mode) WHERE is_debug_mode = true;

COMMENT ON TABLE edcat.vera_debug_sessions IS 'Stores debug mode state for Vera users. Activated via PIN 0331, deactivated via PIN 0000.';

