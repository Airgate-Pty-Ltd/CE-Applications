-- =============================================================================
-- CLEANUP MIGRATION: Remove Duplicate Tables from EDCAT AI Database
-- =============================================================================
-- This migration removes duplicate tables that should ONLY exist in PostgreSQL
-- 
-- CRITICAL: Run this against EDCAT_AI_DATABASE_URL, NOT DATABASE_URL!
-- =============================================================================

-- Drop duplicate tables that should only exist in Postgres
-- These tables are duplicates and cause confusion about which database to use

DROP TABLE IF EXISTS public.standards CASCADE;
DROP TABLE IF EXISTS public.standard_files CASCADE;
DROP TABLE IF EXISTS public.parsed_requirements CASCADE;

-- Verify they're gone
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'standards') THEN
    RAISE NOTICE 'WARNING: standards table still exists in EDCAT AI DB';
  ELSE
    RAISE NOTICE '✅ standards table removed from EDCAT AI DB';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'standard_files') THEN
    RAISE NOTICE 'WARNING: standard_files table still exists in EDCAT AI DB';
  ELSE
    RAISE NOTICE '✅ standard_files table removed from EDCAT AI DB';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parsed_requirements') THEN
    RAISE NOTICE 'WARNING: parsed_requirements table still exists in EDCAT AI DB';
  ELSE
    RAISE NOTICE '✅ parsed_requirements table removed from EDCAT AI DB';
  END IF;
END $$;

-- =============================================================================
-- EDCAT AI DB SHOULD ONLY HAVE:
-- - ai_standard (Vera's blueprint system)
-- - ai_persona (Vera's personality)
-- - ai_conversation_history (Chat history)
-- - ai_memories (Vera's memory) - in edcat schema
-- - learned_patterns (AI learning)
-- - regulatory_websites (Regulatory sources)
-- - example_documents (Learning examples)
-- - document_content_for_learning (Learning data)
-- - Other AI-specific tables
-- 
-- NOT:
-- - standards (use public.standards in Postgres)
-- - standard_files (use public.standard_files in Postgres)
-- - parsed_requirements (use public.parsed_requirements in Postgres)
-- =============================================================================

COMMENT ON SCHEMA public IS 'EDCAT AI DB: AI-specific tables only. Compliance data is in Postgres DATABASE_URL.';

