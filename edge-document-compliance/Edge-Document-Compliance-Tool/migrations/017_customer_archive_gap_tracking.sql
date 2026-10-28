-- =============================================================================
-- MIGRATION 017: Customer Archive and GAP Analysis Tracking Enhancement
-- Purpose: Add contact details to tenants, GAP reference numbers, revisions, and tracking
-- =============================================================================

-- =============================================================================
-- 1. ADD CONTACT DETAILS TO TENANTS TABLE
-- =============================================================================

-- Add contact fields to tenants table if they don't exist
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_persons JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add comment for documentation
COMMENT ON COLUMN tenants.contact_email IS 'Primary contact email for customer communications';
COMMENT ON COLUMN tenants.contact_persons IS 'JSON array of contact person objects: [{"name": "...", "email": "...", "role": "...", "phone": "..."}]';
COMMENT ON COLUMN tenants.phone IS 'Primary contact phone number';
COMMENT ON COLUMN tenants.address IS 'Business address';
COMMENT ON COLUMN tenants.notes IS 'General notes about the customer';

-- =============================================================================
-- 2. ENHANCE GAP_ANALYSES TABLE FOR TRACKING AND ARCHIVE
-- =============================================================================

-- Only proceed if gap_analyses table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gap_analyses') THEN
    -- Add tracking fields to gap_analyses table if they don't exist
    ALTER TABLE gap_analyses
      ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS revision INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS created_date TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS created_by UUID,
      ADD COLUMN IF NOT EXISTS exported_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS exported_by UUID,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

    -- Add unique constraint on reference_number
    CREATE UNIQUE INDEX IF NOT EXISTS idx_gap_analyses_reference_number 
      ON gap_analyses(reference_number) 
      WHERE reference_number IS NOT NULL;

    -- Create index for customer and revision lookups (only if tenant_id column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gap_analyses' AND column_name = 'tenant_id') THEN
      CREATE INDEX IF NOT EXISTS idx_gap_analyses_customer_revision 
        ON gap_analyses(tenant_id, revision, created_date DESC);
    END IF;

    -- Create index for reference number lookups
    CREATE INDEX IF NOT EXISTS idx_gap_analyses_reference 
      ON gap_analyses(reference_number) 
      WHERE reference_number IS NOT NULL;

    -- Add comments for documentation (inside conditional block)
    EXECUTE 'COMMENT ON COLUMN gap_analyses.reference_number IS ''Unique reference number for this GAP analysis (e.g., GAP-2024-001)''';
    EXECUTE 'COMMENT ON COLUMN gap_analyses.revision IS ''Revision number for this analysis (increments for same customer/standard)''';
    EXECUTE 'COMMENT ON COLUMN gap_analyses.created_date IS ''Date when this GAP analysis was created''';
    EXECUTE 'COMMENT ON COLUMN gap_analyses.created_by IS ''User ID who created this analysis''';
    EXECUTE 'COMMENT ON COLUMN gap_analyses.exported_at IS ''Date when this GAP was last exported''';
    EXECUTE 'COMMENT ON COLUMN gap_analyses.exported_by IS ''User ID who last exported this GAP''';
    EXECUTE 'COMMENT ON COLUMN gap_analyses.notes IS ''Notes or comments about this GAP analysis''';
    EXECUTE 'COMMENT ON COLUMN gap_analyses.metadata IS ''Additional metadata in JSON format''';
  END IF;
END $$;

-- =============================================================================
-- 3. CREATE FUNCTION TO GENERATE GAP REFERENCE NUMBERS
-- =============================================================================

-- Only create function if gap_analyses table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gap_analyses') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION generate_gap_reference_number(tenant_id_param UUID, standard_code_param VARCHAR)
    RETURNS VARCHAR AS $func$
    DECLARE
      year_prefix VARCHAR(4);
      seq_num INT;
      ref_number VARCHAR(100);
    BEGIN
      -- Get current year
      year_prefix := TO_CHAR(NOW(), ''YYYY'');
      
      -- Get next sequence number for this year
      SELECT COALESCE(MAX(CAST(SUBSTRING(reference_number FROM ''\d+$'') AS INT)), 0) + 1
      INTO seq_num
      FROM gap_analyses
      WHERE reference_number LIKE ''GAP-'' || year_prefix || ''-%''
        AND tenant_id = tenant_id_param;
      
      -- Format: GAP-YYYY-XXX (e.g., GAP-2024-001)
      ref_number := ''GAP-'' || year_prefix || ''-'' || LPAD(seq_num::TEXT, 3, ''0'');
      
      RETURN ref_number;
    END;
    $func$ LANGUAGE plpgsql';
  END IF;
END $$;

-- =============================================================================
-- 4. CREATE FUNCTION TO GET NEXT REVISION NUMBER
-- =============================================================================

-- Only create function if gap_analyses table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gap_analyses') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION get_next_revision_number(tenant_id_param UUID, standard_id_param UUID)
    RETURNS INT AS $func$
    DECLARE
      next_revision INT;
    BEGIN
      -- Get the highest revision number for this customer/standard combination
      SELECT COALESCE(MAX(revision), 0) + 1
      INTO next_revision
      FROM gap_analyses
      WHERE tenant_id = tenant_id_param
        AND standard_id = standard_id_param;
      
      RETURN next_revision;
    END;
    $func$ LANGUAGE plpgsql';
  END IF;
END $$;

-- =============================================================================
-- 5. CREATE VIEW FOR GAP ANALYSIS ARCHIVE (for easier querying)
-- =============================================================================

-- Only create view if gap_analyses table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gap_analyses') THEN
    EXECUTE 'CREATE OR REPLACE VIEW gap_analysis_archive AS
    SELECT 
      ga.id,
      ga.reference_number,
      ga.revision,
      ga.tenant_id,
      t.name AS customer_name,
      t.key AS customer_key,
      ga.standard_id,
      s.code AS standard_code,
      s.name AS standard_name,
      ga.total_requirements,
      ga.covered_requirements,
      ga.gap_count,
      ga.gap_percentage,
      ga.status,
      ga.created_date,
      ga.analyzed_at,
      ga.exported_at,
      ga.notes,
      ga.metadata,
      ROW_NUMBER() OVER (PARTITION BY ga.tenant_id, ga.standard_id ORDER BY ga.revision DESC) AS is_latest_revision
    FROM gap_analyses ga
    LEFT JOIN tenants t ON ga.tenant_id = t.id
    LEFT JOIN standards s ON ga.standard_id = s.id
    ORDER BY ga.created_date DESC, ga.revision DESC';
    
    EXECUTE 'COMMENT ON VIEW gap_analysis_archive IS ''Complete view of all GAP analyses with customer and standard information, including latest revision flag''';
  END IF;
END $$;

-- =============================================================================
-- 6. BACKFILL EXISTING GAP ANALYSES
-- =============================================================================

-- Only backfill if gap_analyses table exists
DO $$
DECLARE
  gap_record RECORD;
  new_ref_number VARCHAR(100);
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gap_analyses') THEN
    -- Generate reference numbers for existing GAP analyses without them
    FOR gap_record IN 
      SELECT id, tenant_id, standard_id, analyzed_at
      FROM gap_analyses
      WHERE reference_number IS NULL
      ORDER BY analyzed_at
    LOOP
      -- Get standard code
      DECLARE
        std_code VARCHAR(50);
      BEGIN
        SELECT code INTO std_code
        FROM standards
        WHERE id = gap_record.standard_id;
        
        -- Generate reference number
        new_ref_number := generate_gap_reference_number(gap_record.tenant_id, std_code);
        
        -- Update the record
        UPDATE gap_analyses
        SET 
          reference_number = new_ref_number,
          revision = COALESCE(revision, 1),
          created_date = COALESCE(created_date, analyzed_at)
        WHERE id = gap_record.id;
        
      EXCEPTION
        WHEN OTHERS THEN
          -- Continue if standard not found or other error
          RAISE NOTICE 'Could not generate reference for GAP analysis %: %', gap_record.id, SQLERRM;
      END;
    END LOOP;

    -- Set created_date for existing records if null
    UPDATE gap_analyses
    SET created_date = COALESCE(created_date, analyzed_at, NOW())
    WHERE created_date IS NULL;

    -- Set revision to 1 for existing records if null
    UPDATE gap_analyses
    SET revision = COALESCE(revision, 1)
    WHERE revision IS NULL;
  END IF;
END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
