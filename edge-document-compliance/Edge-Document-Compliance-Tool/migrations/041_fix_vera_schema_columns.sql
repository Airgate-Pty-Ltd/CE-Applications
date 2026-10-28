-- Migration 041: Fix Vera Schema Columns
-- Purpose: Add missing columns to tables on Railway deployment
-- Created: 2025-12-03

BEGIN;

-- Fix conversation_memory table
ALTER TABLE IF EXISTS edcat.conversation_memory
ADD COLUMN IF NOT EXISTS message_text TEXT,
ADD COLUMN IF NOT EXISTS question_text TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'assistant';

COMMENT ON COLUMN edcat.conversation_memory.message_text IS 'Full message text from user or assistant';
COMMENT ON COLUMN edcat.conversation_memory.question_text IS 'Question extracted from message (for lookup)';
COMMENT ON COLUMN edcat.conversation_memory.role IS 'user, assistant, or system';

-- Fix vera_learned_corrections table
ALTER TABLE IF EXISTS edcat.vera_learned_corrections
ADD COLUMN IF NOT EXISTS question_text TEXT;

COMMENT ON COLUMN edcat.vera_learned_corrections.question_text IS 'Question being corrected (for lookup)';

-- Fix vera_query_response_bank table
ALTER TABLE IF EXISTS edcat.vera_query_response_bank
ADD COLUMN IF NOT EXISTS question_text TEXT,
ADD COLUMN IF NOT EXISTS user_query_pattern TEXT;

COMMENT ON COLUMN edcat.vera_query_response_bank.question_text IS 'Question text (for matching)';
COMMENT ON COLUMN edcat.vera_query_response_bank.user_query_pattern IS 'Regex pattern for matching user queries';

-- Verify migrations
SELECT 'conversation_memory columns:' as check_name,
       string_agg(column_name, ', ')
FROM information_schema.columns
WHERE table_schema = 'edcat' AND table_name = 'conversation_memory'
AND column_name IN ('message_text', 'question_text', 'role');

COMMIT;

-- Success message
-- RESULT: Added missing columns to conversation_memory, vera_learned_corrections, vera_query_response_bank

