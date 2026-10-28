-- =============================================================================
-- CLEANUP: Remove Dead-End Tables from EDCAT AI Database
-- =============================================================================
-- Run against: EDCAT_AI_DATABASE_URL
-- =============================================================================

-- ai_chat_log - No code connections found
DROP TABLE IF EXISTS public.ai_chat_log CASCADE;

-- ai_doc_ref - No code connections found
DROP TABLE IF EXISTS public.ai_doc_ref CASCADE;

-- ai_memories - No code connections found (check both schemas)
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

-- Verification
DO $$
DECLARE
  dead_end_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dead_end_count
  FROM information_schema.tables
  WHERE table_schema IN ('public', 'edcat')
    AND table_name IN ('ai_chat_log', 'ai_doc_ref', 'ai_memories', 'ai_messages', 
                       'ai_sessions', 'baseline_metrics', 'personality_learning_events', 
                       'qa_pairs', 'sync_log');
  
  IF dead_end_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: % dead-end tables still exist in EDCAT AI DB', dead_end_count;
  ELSE
    RAISE NOTICE '✅ All dead-end tables removed from EDCAT AI DB';
  END IF;
END $$;

