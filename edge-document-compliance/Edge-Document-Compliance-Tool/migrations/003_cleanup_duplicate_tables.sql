-- =============================================================================
-- CLEANUP: Remove Duplicate Tables from EDCAT AI Database
-- =============================================================================
-- PROBLEM: Duplicate tables exist in both Postgres and EDCAT AI databases
-- - standards (should only exist in Postgres as public.standards)
-- - standard_files (should only exist in Postgres as public.standard_files)
-- - parsed_requirements (should only exist in Postgres as public.parsed_requirements)
-- 
-- SOLUTION: Drop duplicates from EDCAT AI DB
-- EDCAT AI DB should ONLY have AI-specific tables (ai_standard, ai_persona, etc.)
-- =============================================================================
-- 
-- CRITICAL: Run this against EDCAT_AI_DATABASE_URL, NOT DATABASE_URL!
-- =============================================================================

-- Drop duplicate tables from EDCAT AI DB (they should only exist in Postgres)
DROP TABLE IF EXISTS standards CASCADE;
DROP TABLE IF EXISTS standard_files CASCADE;
DROP TABLE IF EXISTS parsed_requirements CASCADE;

-- Verify they're gone (informational - won't error if already deleted)
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
-- - ai_memories (Vera's memory)
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

