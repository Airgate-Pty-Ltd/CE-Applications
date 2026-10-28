-- Migration 046: Fix Railway Schema Errors
-- Fixes:
-- 1. UNIQUE constraint syntax error in vera_memory table
-- 2. document_content_for_learning table schema prefix
-- 3. Ensures all required columns exist
-- Date: December 2024

-- ============================================================================
-- 1. Ensure edcat schema exists
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS edcat;

-- ============================================================================
-- 2. Fix document_content_for_learning table (move to edcat schema if needed)
-- ============================================================================

-- Check if table exists in public schema and move it
DO $$
BEGIN
  -- If table exists in public schema, move it to edcat
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'document_content_for_learning'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'edcat' 
    AND table_name = 'document_content_for_learning'
  ) THEN
    ALTER TABLE public.document_content_for_learning SET SCHEMA edcat;
  END IF;
END $$;

-- Create table in edcat schema if it doesn't exist
CREATE TABLE IF NOT EXISTS edcat.document_content_for_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL,
  standard_id UUID,  -- Reference to public.standards(id) in Postgres (no FK - cross-database)
  standard_code TEXT,
  category TEXT NOT NULL,
  content_text TEXT NOT NULL,
  is_example BOOLEAN DEFAULT false,
  word_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_doc_content_file ON edcat.document_content_for_learning(file_id);
CREATE INDEX IF NOT EXISTS idx_doc_content_standard ON edcat.document_content_for_learning(standard_id);
CREATE INDEX IF NOT EXISTS idx_doc_content_standard_code ON edcat.document_content_for_learning(standard_code);
CREATE INDEX IF NOT EXISTS idx_doc_content_example ON edcat.document_content_for_learning(is_example) WHERE is_example = true;

-- ============================================================================
-- 3. Fix vera_memory table UNIQUE constraint (replace COALESCE with unique index)
-- ============================================================================

-- Drop the problematic UNIQUE constraint if it exists (it will fail if table doesn't exist, that's OK)
DO $$
BEGIN
  -- Try to drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'edcat' 
    AND table_name = 'vera_memory' 
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%tenant_id%'
  ) THEN
    -- Find and drop the constraint
    EXECUTE (
      SELECT 'ALTER TABLE edcat.vera_memory DROP CONSTRAINT IF EXISTS ' || constraint_name
      FROM information_schema.table_constraints 
      WHERE constraint_schema = 'edcat' 
      AND table_name = 'vera_memory' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%tenant_id%'
      LIMIT 1
    );
  END IF;
END $$;

-- Create vera_memory table if it doesn't exist (without the problematic UNIQUE constraint)
CREATE TABLE IF NOT EXISTS edcat.vera_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  session_id TEXT,
  user_id TEXT,
  memory_key TEXT NOT NULL,
  memory_value JSONB NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fact', 'preference', 'correction', 'context', 'standard_knowledge')),
  standard_code TEXT,
  topic TEXT,
  confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT DEFAULT 'conversation',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1
);

-- Create unique index using a function to handle NULL standard_code (replaces UNIQUE constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vera_memory_unique 
  ON edcat.vera_memory(tenant_id, memory_key, category, COALESCE(standard_code, ''));

-- Create other indexes
CREATE INDEX IF NOT EXISTS idx_vera_memory_tenant ON edcat.vera_memory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vera_memory_key ON edcat.vera_memory(memory_key);
CREATE INDEX IF NOT EXISTS idx_vera_memory_category ON edcat.vera_memory(category);
CREATE INDEX IF NOT EXISTS idx_vera_memory_standard ON edcat.vera_memory(standard_code);
CREATE INDEX IF NOT EXISTS idx_vera_memory_topic ON edcat.vera_memory(topic);
CREATE INDEX IF NOT EXISTS idx_vera_memory_accessed ON edcat.vera_memory(last_accessed DESC);

-- ============================================================================
-- 4. Ensure embedding column exists in ai_conversation_history (as JSONB)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'edcat' 
    AND table_name = 'ai_conversation_history' 
    AND column_name = 'embedding'
  ) THEN
    ALTER TABLE edcat.ai_conversation_history 
      ADD COLUMN embedding JSONB;
    
    CREATE INDEX IF NOT EXISTS idx_ach_embedding ON edcat.ai_conversation_history
      USING gin(embedding) WHERE embedding IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 5. Ensure all required columns exist in ai_conversation_history
-- ============================================================================

DO $$
BEGIN
  -- Add message_text if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'edcat' 
    AND table_name = 'ai_conversation_history' 
    AND column_name = 'message_text'
  ) THEN
    ALTER TABLE edcat.ai_conversation_history 
      ADD COLUMN message_text TEXT;
    
    -- Populate from existing 'message' column if it exists
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
  END IF;
  
  -- Add role if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'edcat' 
    AND table_name = 'ai_conversation_history' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE edcat.ai_conversation_history 
      ADD COLUMN role TEXT DEFAULT 'assistant';
  END IF;
END $$;

-- ============================================================================
-- 6. Ensure question_text column exists in vera_query_response_bank
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
  END IF;
END $$;

-- ============================================================================
-- 7. Ensure question_text column exists in vera_learned_corrections
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
  END IF;
END $$;

-- ============================================================================
-- 8. Ensure role column exists in conversation_memory
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
  END IF;
END $$;

-- ============================================================================
-- Done!
-- ============================================================================

COMMENT ON TABLE edcat.document_content_for_learning IS 'Extracted text content from documents that Vera uses for learning and knowledge retrieval - fixed schema';
COMMENT ON TABLE edcat.vera_memory IS 'Vera memory storage - fixed UNIQUE constraint syntax';
COMMENT ON COLUMN edcat.ai_conversation_history.embedding IS 'JSONB embedding for semantic search (Iteration 3)';
COMMENT ON COLUMN edcat.ai_conversation_history.message_text IS 'User or assistant message text';
COMMENT ON COLUMN edcat.vera_query_response_bank.question_text IS 'Question text for matching';
COMMENT ON COLUMN edcat.vera_learned_corrections.question_text IS 'Original question text that was corrected';

