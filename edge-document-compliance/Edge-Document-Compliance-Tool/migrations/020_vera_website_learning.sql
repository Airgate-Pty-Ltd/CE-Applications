-- =============================================================================
-- MIGRATION 020: Vera Website Learning System
-- Purpose: Enable Vera to learn from websites and URLs
-- =============================================================================

-- =============================================================================
-- 1. WEBSITE CONTENT FOR LEARNING
-- =============================================================================

CREATE TABLE IF NOT EXISTS edcat.website_content_for_learning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NULL,
    url TEXT NOT NULL,
    authority TEXT NULL,         -- 'FAA', 'EASA', 'Customer', 'Vendor', etc.
    raw_html TEXT NULL,
    cleaned_text TEXT NOT NULL,
    metadata JSONB NULL,         -- title, fetch_timestamp, content_type, tags, source_type
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NULL,        -- User who requested learning from this URL
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vera_website_learning_url
    ON edcat.website_content_for_learning (url) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vera_website_learning_tenant
    ON edcat.website_content_for_learning (tenant_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vera_website_learning_authority
    ON edcat.website_content_for_learning (authority) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vera_website_learning_created
    ON edcat.website_content_for_learning (created_at DESC);

-- Add comments
COMMENT ON TABLE edcat.website_content_for_learning IS 'Stores website content that Vera has learned from. Only URLs explicitly provided by users.';
COMMENT ON COLUMN edcat.website_content_for_learning.tenant_id IS 'NULL for global learning, UUID for tenant-specific';
COMMENT ON COLUMN edcat.website_content_for_learning.authority IS 'Regulatory authority or source type (FAA, EASA, Customer, Vendor, etc.)';
COMMENT ON COLUMN edcat.website_content_for_learning.cleaned_text IS 'Extracted and cleaned text content from the website';
COMMENT ON COLUMN edcat.website_content_for_learning.metadata IS 'JSONB with title, fetch_timestamp, content_type, tags, source_type';

-- =============================================================================
-- 2. ENHANCE DOCUMENT_CONTENT_FOR_LEARNING METADATA
-- =============================================================================

-- Ensure document_content_for_learning has proper metadata structure
-- This is additive - won't break if columns don't exist yet
DO $$
BEGIN
    -- Add metadata fields if they don't exist in the structure
    -- We'll handle this in the service layer, but document the expected structure
    NULL;
END $$;

-- Comment on document_content_for_learning if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'edcat' AND table_name = 'document_content_for_learning') THEN
    EXECUTE 'COMMENT ON TABLE edcat.document_content_for_learning IS ''Stores document content for Vera to learn from. Should include metadata: tenant_id, document_name, source_type, original_path, upload_timestamp''';
  END IF;
END $$;

-- =============================================================================
-- 3. VIEW: ACTIVE LEARNING SOURCES
-- =============================================================================

-- Only create view if website_content_for_learning table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'edcat' AND table_name = 'website_content_for_learning') THEN
    -- Check if document_content_for_learning also exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'edcat' AND table_name = 'document_content_for_learning') THEN
      -- Create view with both sources
      EXECUTE 'CREATE OR REPLACE VIEW edcat.vera_active_learning_sources AS
      SELECT 
          ''document'' as source_type,
          dcl.id,
          dcl.tenant_id,
          dcl.document_id as source_id,
          dcl.metadata->>''document_name'' as source_name,
          dcl.metadata->>''source_type'' as source_category,
          dcl.created_at
      FROM edcat.document_content_for_learning dcl
      WHERE dcl.metadata IS NOT NULL

      UNION ALL

      SELECT 
          ''website'' as source_type,
          wcl.id,
          wcl.tenant_id,
          wcl.id as source_id,
          wcl.metadata->>''title'' as source_name,
          wcl.authority as source_category,
          wcl.created_at
      FROM edcat.website_content_for_learning wcl
      WHERE wcl.is_active = TRUE';
    ELSE
      -- Create view with only website sources
      EXECUTE 'CREATE OR REPLACE VIEW edcat.vera_active_learning_sources AS
      SELECT 
          ''website'' as source_type,
          wcl.id,
          wcl.tenant_id,
          wcl.id as source_id,
          wcl.metadata->>''title'' as source_name,
          wcl.authority as source_category,
          wcl.created_at
      FROM edcat.website_content_for_learning wcl
      WHERE wcl.is_active = TRUE';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 4. FUNCTION: GET LEARNING SOURCES FOR TENANT
-- =============================================================================

-- Create function only if view exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'edcat' AND table_name = 'vera_active_learning_sources') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION edcat.get_learning_sources(p_tenant_id UUID)
    RETURNS TABLE (
        source_type TEXT,
        source_id UUID,
        source_name TEXT,
        source_category TEXT,
        created_at TIMESTAMPTZ
    ) AS $func$
    BEGIN
        RETURN QUERY
        SELECT * FROM edcat.vera_active_learning_sources
        WHERE tenant_id = p_tenant_id OR tenant_id IS NULL
        ORDER BY created_at DESC;
    END;
    $func$ LANGUAGE plpgsql';
  END IF;
END $$;

-- =============================================================================
-- COMMIT
-- =============================================================================

COMMENT ON SCHEMA edcat IS 'EDCAT AI Intelligence Database Schema - Vera AI Operations';

