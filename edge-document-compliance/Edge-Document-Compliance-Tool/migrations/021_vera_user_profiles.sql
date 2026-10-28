-- =============================================================================
-- MIGRATION 021: Vera User Profiles & Preferences
-- Purpose: Enable Vera to know who is logged in and adapt behavior accordingly
-- =============================================================================

-- =============================================================================
-- 1. USER PROFILE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS edcat.ai_user_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_external_id TEXT NOT NULL,         -- e.g. auth user id, email, or UUID from auth system
    display_name TEXT NULL,                 -- user's name as known to Vera
    primary_role TEXT NULL,                 -- 'founder', 'auditor', 'engineer', 'qa_manager', 'executive', etc.
    metadata JSONB NULL,                    -- any additional info (departments, sites, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, user_external_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_user_profile_tenant
    ON edcat.ai_user_profile (tenant_id);

CREATE INDEX IF NOT EXISTS idx_ai_user_profile_external_id
    ON edcat.ai_user_profile (user_external_id);

CREATE INDEX IF NOT EXISTS idx_ai_user_profile_role
    ON edcat.ai_user_profile (primary_role) WHERE primary_role IS NOT NULL;

-- Comments
COMMENT ON TABLE edcat.ai_user_profile IS 'User profiles for Vera to recognize and adapt to individual users';
COMMENT ON COLUMN edcat.ai_user_profile.user_external_id IS 'External identifier from auth system (email, UUID, etc.)';
COMMENT ON COLUMN edcat.ai_user_profile.primary_role IS 'User role: founder, auditor, engineer, qa_manager, executive, etc.';
COMMENT ON COLUMN edcat.ai_user_profile.metadata IS 'Additional user information (departments, sites, preferences hints, etc.)';

-- =============================================================================
-- 2. USER PREFERENCES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS edcat.ai_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_profile_id UUID NOT NULL REFERENCES edcat.ai_user_profile(id) ON DELETE CASCADE,
    preference_key TEXT NOT NULL,          -- 'response_style', 'detail_level', 'summary_first', etc.
    preference_value JSONB NOT NULL,       -- generic value container
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_profile_id, preference_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_profile
    ON edcat.ai_user_preferences (user_profile_id);

CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_tenant
    ON edcat.ai_user_preferences (tenant_id);

CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_key
    ON edcat.ai_user_preferences (preference_key);

-- Comments
COMMENT ON TABLE edcat.ai_user_preferences IS 'User-specific preferences that Vera remembers and applies';
COMMENT ON COLUMN edcat.ai_user_preferences.preference_key IS 'Preference identifier: response_style, detail_level, summary_first, etc.';
COMMENT ON COLUMN edcat.ai_user_preferences.preference_value IS 'JSONB value for the preference (flexible structure)';

-- =============================================================================
-- 3. VIEW: ACTIVE USER PROFILES WITH PREFERENCES
-- =============================================================================

CREATE OR REPLACE VIEW edcat.vera_active_user_profiles AS
SELECT 
    up.id,
    up.tenant_id,
    up.user_external_id,
    up.display_name,
    up.primary_role,
    up.metadata,
    COALESCE(
        json_object_agg(
            pref.preference_key, 
            pref.preference_value
        ) FILTER (WHERE pref.preference_key IS NOT NULL),
        '{}'::json
    ) AS preferences,
    up.created_at,
    up.updated_at
FROM edcat.ai_user_profile up
LEFT JOIN edcat.ai_user_preferences pref ON pref.user_profile_id = up.id
GROUP BY up.id, up.tenant_id, up.user_external_id, up.display_name, up.primary_role, up.metadata, up.created_at, up.updated_at;

-- =============================================================================
-- 4. FUNCTION: GET USER PROFILE WITH PREFERENCES
-- =============================================================================

CREATE OR REPLACE FUNCTION edcat.get_user_profile_with_preferences(
    p_tenant_id UUID,
    p_user_external_id TEXT
)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    user_external_id TEXT,
    display_name TEXT,
    primary_role TEXT,
    metadata JSONB,
    preferences JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.tenant_id,
        up.user_external_id,
        up.display_name,
        up.primary_role,
        up.metadata,
        COALESCE(
            json_object_agg(
                pref.preference_key, 
                pref.preference_value
            ) FILTER (WHERE pref.preference_key IS NOT NULL),
            '{}'::json
        ) AS preferences
    FROM edcat.ai_user_profile up
    LEFT JOIN edcat.ai_user_preferences pref ON pref.user_profile_id = up.id
    WHERE up.tenant_id = p_tenant_id 
      AND up.user_external_id = p_user_external_id
    GROUP BY up.id, up.tenant_id, up.user_external_id, up.display_name, up.primary_role, up.metadata;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMIT
-- =============================================================================

COMMENT ON SCHEMA edcat IS 'EDCAT AI Intelligence Database Schema - Vera AI Operations';

