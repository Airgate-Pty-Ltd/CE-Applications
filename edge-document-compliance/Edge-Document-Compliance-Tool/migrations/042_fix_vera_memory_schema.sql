-- Migration: Fix Vera Memory Schema Mismatches
-- Fixes missing columns: message_text, question_text, role
-- Date: December 2024

-- ============================================================================
-- 1. Fix ai_conversation_history - Add message_text column if missing
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'edcat' 
      AND table_name = 'ai_conversation_history' 
      AND column_name = 'message_text'
  ) THEN
    ALTER TABLE edcat.ai_conversation_history 
      ADD COLUMN message_text TEXT;
    
    -- Populate message_text from existing 'message' column if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'edcat' 
        AND table_name = 'ai_conversation_history' 
        AND column_name = 'message'
    ) THEN
      UPDATE edcat.ai_conversation_history 
      SET message_text = message 
      WHERE message_text IS NULL AND message IS NOT NULL;
    END IF;
    
    COMMENT ON COLUMN edcat.ai_conversation_history.message_text IS 'User or assistant message text (replaces message column)';
  END IF;
END $$;

-- ============================================================================
-- 2. Fix conversation_memory - Add role column if missing
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'edcat' 
      AND table_name = 'conversation_memory' 
      AND column_name = 'role'
  ) THEN
    ALTER TABLE edcat.conversation_memory 
      ADD COLUMN role TEXT DEFAULT 'assistant';
    
    COMMENT ON COLUMN edcat.conversation_memory.role IS 'Role: user or assistant';
  END IF;
END $$;

-- ============================================================================
-- 3. Fix vera_learned_corrections - Add question_text column if missing
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'edcat' 
      AND table_name = 'vera_learned_corrections' 
      AND column_name = 'question_text'
  ) THEN
    ALTER TABLE edcat.vera_learned_corrections 
      ADD COLUMN question_text TEXT;
    
    -- Populate from original_question if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'edcat' 
        AND table_name = 'vera_learned_corrections' 
        AND column_name = 'original_question'
    ) THEN
      UPDATE edcat.vera_learned_corrections 
      SET question_text = original_question 
      WHERE question_text IS NULL AND original_question IS NOT NULL;
    END IF;
    
    COMMENT ON COLUMN edcat.vera_learned_corrections.question_text IS 'Original question text that was corrected';
  END IF;
END $$;

-- ============================================================================
-- 4. Fix vera_query_response_bank - Add question_text column if missing
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'edcat' 
      AND table_name = 'vera_query_response_bank' 
      AND column_name = 'question_text'
  ) THEN
    ALTER TABLE edcat.vera_query_response_bank 
      ADD COLUMN question_text TEXT;
    
    -- Populate from question_pattern if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'edcat' 
        AND table_name = 'vera_query_response_bank' 
        AND column_name = 'question_pattern'
    ) THEN
      UPDATE edcat.vera_query_response_bank 
      SET question_text = question_pattern 
      WHERE question_text IS NULL AND question_pattern IS NOT NULL;
    END IF;
    
    -- Also try user_query_pattern
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'edcat' 
        AND table_name = 'vera_query_response_bank' 
        AND column_name = 'user_query_pattern'
    ) THEN
      UPDATE edcat.vera_query_response_bank 
      SET question_text = COALESCE(question_text, user_query_pattern) 
      WHERE question_text IS NULL AND user_query_pattern IS NOT NULL;
    END IF;
    
    COMMENT ON COLUMN edcat.vera_query_response_bank.question_text IS 'Question text for matching';
  END IF;
END $$;

-- ============================================================================
-- 5. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_conversation_history_message_text 
  ON edcat.ai_conversation_history(message_text) 
  WHERE message_text IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_memory_role 
  ON edcat.conversation_memory(role) 
  WHERE role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vera_learned_corrections_question_text 
  ON edcat.vera_learned_corrections USING gin(to_tsvector('english', question_text)) 
  WHERE question_text IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vera_query_response_bank_question_text 
  ON edcat.vera_query_response_bank USING gin(to_tsvector('english', question_text)) 
  WHERE question_text IS NOT NULL;

-- ============================================================================
-- Done!
-- ============================================================================

COMMENT ON TABLE edcat.ai_conversation_history IS 'Vera conversation history - fixed schema with message_text column';
COMMENT ON TABLE edcat.conversation_memory IS 'Vera conversation memory - fixed schema with role column';
COMMENT ON TABLE edcat.vera_learned_corrections IS 'Vera learned corrections - fixed schema with question_text column';
COMMENT ON TABLE edcat.vera_query_response_bank IS 'Vera query response bank - fixed schema with question_text column';

