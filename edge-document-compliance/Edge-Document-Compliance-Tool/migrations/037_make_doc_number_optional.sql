-- =============================================================================
-- MIGRATION 037: Make document numbering optional (cosmetic metadata only)
-- =============================================================================
-- Purpose: Document numbers are not normative. No standard, regulation, or 
-- customer requirement requires a document number or specific numbering convention.
-- Therefore, doc_number should be optional and never used for compliance logic.
--
-- Changes:
-- 1. Make doc_number optional in qms_documents (remove NOT NULL constraint)
-- 2. Add comments clarifying numbering is cosmetic metadata only
-- =============================================================================

-- Make doc_number optional in qms_documents
DO $$
BEGIN
  -- Remove NOT NULL constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'qms_documents' 
    AND column_name = 'doc_number'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE qms_documents ALTER COLUMN doc_number DROP NOT NULL;
    RAISE NOTICE 'Made doc_number optional in qms_documents';
  END IF;
  
  -- Remove UNIQUE constraint if it exists (allow duplicates)
  -- Note: We keep the index for search convenience, but remove uniqueness
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'qms_documents_doc_number_key'
  ) THEN
    ALTER TABLE qms_documents DROP CONSTRAINT qms_documents_doc_number_key;
    RAISE NOTICE 'Removed UNIQUE constraint on doc_number (allowing duplicates)';
  END IF;
END $$;

-- Add comment to table clarifying numbering is cosmetic
COMMENT ON COLUMN qms_documents.doc_number IS 
  'Optional cosmetic metadata for user convenience. Compliance coverage is based on id, title, content, and explicit mappings, not numbering patterns.';

-- Add comment to customer_procedures.procedure_number if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'customer_procedures' 
    AND column_name = 'procedure_number'
  ) THEN
    COMMENT ON COLUMN customer_procedures.procedure_number IS 
      'Optional cosmetic metadata for user convenience. Compliance coverage is based on id, procedure_name, procedure_text, and explicit mappings, not numbering patterns.';
    RAISE NOTICE 'Added comment to customer_procedures.procedure_number';
  END IF;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 037 completed: Document numbering is now optional cosmetic metadata';
END $$;

