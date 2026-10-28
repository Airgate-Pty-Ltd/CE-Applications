-- =============================================================================
-- MIGRATION 028: Vera Dynamic Greetings System
-- Purpose: Create tables for storing hundreds of greetings and greeting components
--          to enable varied, fresh greetings while keeping technical questions
--          routed to the reasoning engine.
-- =============================================================================

-- edcat.vera_greetings: full, ready-to-use greetings
CREATE TABLE IF NOT EXISTS edcat.vera_greetings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    culture_tag         TEXT NOT NULL DEFAULT 'uk_scotland',  -- e.g. 'uk_scotland', 'neutral'
    tone                TEXT NOT NULL DEFAULT 'friendly',      -- 'friendly', 'professional', 'casual', 'formal'
    time_of_day         TEXT DEFAULT NULL,                     -- 'morning', 'afternoon', 'evening', 'any'
    channel             TEXT NOT NULL DEFAULT 'default',       -- 'default', 'debug', 'smalltalk'
    text                TEXT NOT NULL,                         -- full greeting text
    weight              INTEGER NOT NULL DEFAULT 1,            -- for weighted randomness
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_greetings_active
    ON edcat.vera_greetings (is_active);

CREATE INDEX IF NOT EXISTS idx_vera_greetings_tone_time_culture
    ON edcat.vera_greetings (tone, time_of_day, culture_tag);

CREATE INDEX IF NOT EXISTS idx_vera_greetings_culture_tone
    ON edcat.vera_greetings (culture_tag, tone, is_active);

-- edcat.vera_greeting_components: reusable fragments
CREATE TABLE IF NOT EXISTS edcat.vera_greeting_components (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_type      TEXT NOT NULL,                         -- 'prefix', 'core', 'suffix'
    culture_tag         TEXT NOT NULL DEFAULT 'uk_scotland',
    tone                TEXT NOT NULL DEFAULT 'friendly',
    time_of_day         TEXT DEFAULT NULL,                     -- 'morning', 'afternoon', 'evening', 'any'
    text                TEXT NOT NULL,                         -- fragment text, e.g. "Good morning", "How's your audit world?"
    weight              INTEGER NOT NULL DEFAULT 1,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_greeting_components_type
    ON edcat.vera_greeting_components (component_type, is_active);

CREATE INDEX IF NOT EXISTS idx_vera_greeting_components_culture_tone
    ON edcat.vera_greeting_components (culture_tag, tone, component_type, is_active);

-- Add comments
COMMENT ON TABLE edcat.vera_greetings IS 'Full, ready-to-use greetings for Vera with culture, tone, and time-of-day variations';
COMMENT ON TABLE edcat.vera_greeting_components IS 'Reusable greeting fragments (prefix, core, suffix) for composing dynamic greetings';
COMMENT ON COLUMN edcat.vera_greetings.weight IS 'Weight for weighted random selection (higher = more likely to be chosen)';
COMMENT ON COLUMN edcat.vera_greeting_components.component_type IS 'Type of component: prefix (e.g., "Good morning"), core (e.g., "how are you"), or suffix (e.g., "what can I help with?")';

