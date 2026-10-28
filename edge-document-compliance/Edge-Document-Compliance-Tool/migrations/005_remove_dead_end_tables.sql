-- =============================================================================
-- CLEANUP: Remove Dead-End Tables (No Code Connections)
-- =============================================================================
-- These tables have no code connections and are wasting space
-- 
-- Run against: Both DATABASE_URL and EDCAT_AI_DATABASE_URL
-- =============================================================================

-- =============================================================================
-- POSTGRESQL DEAD-END TABLES
-- Run this section against DATABASE_URL
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

-- =============================================================================
-- EDCAT AI DEAD-END TABLES
-- Run this section against EDCAT_AI_DATABASE_URL
-- =============================================================================

-- ai_chat_log - No code connections found
DROP TABLE IF EXISTS public.ai_chat_log CASCADE;

-- ai_doc_ref - No code connections found
DROP TABLE IF EXISTS public.ai_doc_ref CASCADE;

-- ai_memories - No code connections found (check edcat schema too)
DROP TABLE IF EXISTS public.ai_memories CASCADE;
DROP TABLE IF EXISTS edcat.ai_memories CASCADE;

-- ai_messages - No code connections found
DROP TABLE IF EXISTS public.ai_messages CASCADE;
DROP TABLE IF EXISTS edcat.ai_messages CASCADE;

-- ai_sessions - No code connections found
DROP TABLE IF EXISTS public.ai_sessions CASCADE;
DROP TABLE IF EXISTS edcat.ai_sessions CASCADE;

-- baseline_metrics - No code connections found
DROP TABLE IF EXISTS public.baseline_metrics CASCADE;

-- personality_learning_events - No code connections found
DROP TABLE IF EXISTS public.personality_learning_events CASCADE;
DROP TABLE IF EXISTS edcat.personality_learning_events CASCADE;

-- qa_pairs - No code connections found
DROP TABLE IF EXISTS public.qa_pairs CASCADE;
DROP TABLE IF EXISTS edcat.qa_pairs CASCADE;

-- sync_log - No code connections found
DROP TABLE IF EXISTS public.sync_log CASCADE;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
  dead_end_count INTEGER;
BEGIN
  -- Count remaining dead-end tables in Postgres
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

COMMENT ON SCHEMA public IS 'Cleaned up: Removed dead-end tables with no code connections';

