-- =============================================================================
-- MIGRATION 033: Vera Problem-Solving & Root Cause Knowledge Pack
-- Purpose: Add root cause frameworks, CAR guidance, and risk-linked reasoning
-- =============================================================================

-- =============================================================================
-- 1. ROOT CAUSE FRAMEWORKS
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_root_cause_frameworks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_name          TEXT NOT NULL UNIQUE,   -- e.g., '5 Why', 'Fishbone', '8D', 'A3'
    definition              TEXT NOT NULL,
    step_by_step            TEXT[] NOT NULL,        -- Array of steps
    good_example            TEXT NOT NULL,          -- Described scenario
    common_failure_modes     TEXT[],                 -- e.g., 'stopping at symptoms', 'assigning blame'
    when_to_use             TEXT,                   -- When this framework is appropriate
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_root_cause_frameworks_name
    ON edcat.vera_root_cause_frameworks (framework_name);

-- =============================================================================
-- 2. CORRECTIVE ACTION SCENARIOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS edcat.vera_car_scenarios (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_type           TEXT NOT NULL,          -- 'recurring_scrap', 'supplier_escape', 'documentation_error', 'training_gap'
    symptom_statement       TEXT NOT NULL,          -- Initial symptom
    good_root_cause_chain   TEXT NOT NULL,          -- Example good root cause chain
    weak_root_cause         TEXT NOT NULL,          -- Example weak root cause
    auditor_reaction_good   TEXT,                   -- How auditor would react to good root cause
    auditor_reaction_weak   TEXT,                   -- How auditor would react to weak root cause
    containment_example     TEXT,                   -- Example containment action
    correction_example      TEXT,                   -- Example correction
    corrective_action_example TEXT,                 -- Example corrective action
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vera_car_scenarios_type
    ON edcat.vera_car_scenarios (scenario_type);

-- Add comments
COMMENT ON TABLE edcat.vera_root_cause_frameworks IS 'Root cause analysis frameworks: 5 Why, Fishbone, 8D, A3 with examples and failure modes';
COMMENT ON TABLE edcat.vera_car_scenarios IS 'Corrective action scenarios with good vs weak root cause examples and auditor reactions';

