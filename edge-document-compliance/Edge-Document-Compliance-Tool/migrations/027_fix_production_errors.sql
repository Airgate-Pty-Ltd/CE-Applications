-- =============================================================================
-- MIGRATION 027: Fix Production Errors
-- Purpose: Ensure authorized_users table exists, fix GAP analysis routes
-- =============================================================================

-- =============================================================================
-- 1. ENSURE authorized_users TABLE EXISTS (if migration 013 or 026 didn't run)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'authorized_users') THEN
    CREATE TABLE public.authorized_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID DEFAULT gen_random_uuid() UNIQUE,
        username VARCHAR(100) UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        full_name VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        access_level VARCHAR(50) DEFAULT 'standard',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID REFERENCES public.authorized_users(id) ON DELETE SET NULL,
        metadata JSONB
    );

    -- Create indexes for authorized_users
    CREATE INDEX IF NOT EXISTS idx_authorized_users_user_id ON public.authorized_users(user_id);
    CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON public.authorized_users(email);
    CREATE INDEX IF NOT EXISTS idx_authorized_users_username ON public.authorized_users(username);
    CREATE INDEX IF NOT EXISTS idx_authorized_users_role ON public.authorized_users(role);
    CREATE INDEX IF NOT EXISTS idx_authorized_users_active ON public.authorized_users(is_active);
    CREATE INDEX IF NOT EXISTS idx_authorized_users_created_at ON public.authorized_users(created_at);
    
    RAISE NOTICE 'Created authorized_users table';
  ELSE
    -- Ensure timestamps are TIMESTAMPTZ if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'authorized_users' 
               AND column_name = 'created_at'
               AND data_type != 'timestamp with time zone') THEN
      ALTER TABLE public.authorized_users 
      ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'authorized_users' 
               AND column_name = 'updated_at'
               AND data_type != 'timestamp with time zone') THEN
      ALTER TABLE public.authorized_users 
      ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at::timestamptz;
    END IF;
    
    RAISE NOTICE 'authorized_users table already exists, verified columns';
  END IF;
END $$;

-- =============================================================================
-- 2. ENSURE gap_analyses TABLE HAS CORRECT COLUMN TYPES
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'gap_analyses') THEN
    
    -- Ensure tenant_id is UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'gap_analyses' 
               AND column_name = 'tenant_id'
               AND data_type != 'uuid') THEN
      BEGIN
        ALTER TABLE public.gap_analyses
        ALTER COLUMN tenant_id TYPE uuid
        USING CASE 
          WHEN tenant_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
          THEN tenant_id::text::uuid
          ELSE NULL
        END;
        RAISE NOTICE 'Converted gap_analyses.tenant_id to uuid';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not convert tenant_id to uuid: %', SQLERRM;
      END;
    END IF;
    
    -- Ensure standard_id is UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'gap_analyses' 
               AND column_name = 'standard_id'
               AND data_type != 'uuid') THEN
      BEGIN
        ALTER TABLE public.gap_analyses
        ALTER COLUMN standard_id TYPE uuid
        USING CASE 
          WHEN standard_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
          THEN standard_id::text::uuid
          ELSE NULL
        END;
        RAISE NOTICE 'Converted gap_analyses.standard_id to uuid';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not convert standard_id to uuid: %', SQLERRM;
      END;
    END IF;
  END IF;
END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

