-- =============================================================================
-- MIGRATION 011: Remove Orphaned Tables from EDCAT AI Database
-- Removes tables that are defined in migrations but have no code connections
-- Based on comprehensive architecture audit
-- =============================================================================

-- =============================================================================
-- ORPHANED TABLES TO REMOVE:
-- 1. baseline_metrics - No code references found
-- 2. learned_patterns - No code references found
-- 3. sync_log - No code references found
-- 4. edcat.qa_pairs - No code references found
-- 5. edcat.personality_learning_events - No code references found
-- =============================================================================

-- Drop orphaned tables (CASCADE to remove dependent objects)
DO $$
BEGIN
  DROP TABLE IF EXISTS baseline_metrics CASCADE;
  DROP TABLE IF EXISTS learned_patterns CASCADE;
  DROP TABLE IF EXISTS sync_log CASCADE;
  DROP TABLE IF EXISTS edcat.qa_pairs CASCADE;
  DROP TABLE IF EXISTS edcat.personality_learning_events CASCADE;
  
  RAISE NOTICE 'Removed 5 orphaned tables from EDCAT AI database';
END $$;

-- Note: audit_trail_decisions may be used in the future
-- Review if this is duplicate of audit_trail in PostgreSQL
-- Keeping it for now but can be removed if confirmed duplicate

