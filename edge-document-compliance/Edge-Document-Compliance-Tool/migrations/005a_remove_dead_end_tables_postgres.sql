-- =============================================================================
-- CLEANUP: Remove Dead-End Tables from PostgreSQL
-- =============================================================================
-- Run against: DATABASE_URL (PostgreSQL Customer Data DB)
-- =============================================================================

-- audit_logs_results - No code connections found
DROP TABLE IF EXISTS public.audit_logs_results CASCADE;

-- conversation_context - No code connections found (may have been replaced)
DROP TABLE IF EXISTS public.conversation_context CASCADE;

-- generated_reports - No code connections found
DROP TABLE IF EXISTS public.generated_reports CASCADE;

-- upload_files - Replaced by standard_files, no code connections
DROP TABLE IF EXISTS public.upload_files CASCADE;

-- user_feedback - No code connections found
DROP TABLE IF EXISTS public.user_feedback CASCADE;

-- Verification
DO $$
DECLARE
  dead_end_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dead_end_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('audit_logs_results', 'conversation_context', 'generated_reports', 'upload_files', 'user_feedback');
  
  IF dead_end_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % dead-end tables still exist in Postgres', dead_end_count;
  ELSE
    RAISE NOTICE '✅ All dead-end tables removed from Postgres';
  END IF;
END $$;

