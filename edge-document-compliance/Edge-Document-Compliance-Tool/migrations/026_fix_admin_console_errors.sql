-- =============================================================================
-- MIGRATION 026: Fix Admin Console Errors
-- Purpose: Fix user management, customer archive, and gap analysis type mismatches
-- =============================================================================

-- =============================================================================
-- 1. ENSURE authorized_users TABLE EXISTS IN PUBLIC SCHEMA
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
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
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
    RAISE NOTICE 'authorized_users table already exists';
  END IF;
END $$;

-- Add any missing columns to authorized_users (for backward compatibility)
DO $$
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'authorized_users' 
                   AND column_name = 'user_id') THEN
        ALTER TABLE public.authorized_users ADD COLUMN user_id UUID DEFAULT gen_random_uuid();
        CREATE INDEX IF NOT EXISTS idx_authorized_users_user_id ON public.authorized_users(user_id);
    END IF;
    
    -- Ensure user_id has unique constraint if not already
    IF NOT EXISTS (SELECT 1 FROM pg_constraint 
                   WHERE conname = 'authorized_users_user_id_key' 
                   AND conrelid = 'public.authorized_users'::regclass) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS authorized_users_user_id_key ON public.authorized_users(user_id);
    END IF;
END $$;

-- =============================================================================
-- 2. ENSURE gap_analyses.tenant_id IS UUID TYPE (FIX TYPE MISMATCH)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'gap_analyses') THEN
    
    -- Check current type of tenant_id
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'gap_analyses' 
               AND column_name = 'tenant_id') THEN
      
      -- Get the current data type
      DECLARE
        current_type TEXT;
      BEGIN
        SELECT data_type INTO current_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'gap_analyses'
          AND column_name = 'tenant_id';
        
        -- If it's not UUID, convert it
        IF current_type != 'uuid' THEN
          -- Convert text/varchar to UUID if possible
          BEGIN
            ALTER TABLE public.gap_analyses
            ALTER COLUMN tenant_id TYPE uuid
            USING CASE 
              WHEN tenant_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
              THEN tenant_id::text::uuid
              ELSE NULL
            END;
            
            RAISE NOTICE 'Converted gap_analyses.tenant_id from % to uuid', current_type;
          EXCEPTION
            WHEN OTHERS THEN
              RAISE NOTICE 'Could not convert tenant_id to uuid: %', SQLERRM;
          END;
        ELSE
          RAISE NOTICE 'gap_analyses.tenant_id is already uuid type';
        END IF;
      END;
    END IF;
    
    -- Ensure foreign key constraint exists if tenant_id is UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'gap_analyses' 
               AND column_name = 'tenant_id'
               AND data_type = 'uuid') THEN
      
      -- Drop existing constraint if it exists with wrong type
      IF EXISTS (SELECT 1 FROM pg_constraint 
                 WHERE conname = 'gap_analyses_tenant_id_fkey') THEN
        ALTER TABLE public.gap_analyses DROP CONSTRAINT IF EXISTS gap_analyses_tenant_id_fkey;
      END IF;
      
      -- Add foreign key constraint if tenants table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'tenants') THEN
        BEGIN
          ALTER TABLE public.gap_analyses 
          ADD CONSTRAINT gap_analyses_tenant_id_fkey 
          FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
          
          RAISE NOTICE 'Added foreign key constraint for gap_analyses.tenant_id';
        EXCEPTION
          WHEN duplicate_object THEN
            RAISE NOTICE 'Foreign key constraint already exists';
          WHEN OTHERS THEN
            RAISE NOTICE 'Could not add foreign key: %', SQLERRM;
        END;
      END IF;
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 3. ENSURE gap_analyses.standard_id IS UUID TYPE
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'gap_analyses') THEN
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'gap_analyses' 
               AND column_name = 'standard_id') THEN
      
      DECLARE
        current_type TEXT;
      BEGIN
        SELECT data_type INTO current_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'gap_analyses'
          AND column_name = 'standard_id';
        
        IF current_type != 'uuid' THEN
          BEGIN
            ALTER TABLE public.gap_analyses
            ALTER COLUMN standard_id TYPE uuid
            USING CASE 
              WHEN standard_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
              THEN standard_id::text::uuid
              ELSE NULL
            END;
            
            RAISE NOTICE 'Converted gap_analyses.standard_id from % to uuid', current_type;
          EXCEPTION
            WHEN OTHERS THEN
              RAISE NOTICE 'Could not convert standard_id to uuid: %', SQLERRM;
          END;
        END IF;
      END;
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 4. ENSURE user_permissions TABLE EXISTS
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_permissions') THEN
    CREATE TABLE public.user_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        permission_id UUID DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.authorized_users(id) ON DELETE CASCADE,
        resource_type VARCHAR(50) NOT NULL,
        resource_id UUID,
        permission_type VARCHAR(50) NOT NULL,
        permission VARCHAR(100),
        granted_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        granted_by UUID REFERENCES public.authorized_users(id) ON DELETE SET NULL
    );

    -- Create indexes for user_permissions
    CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON public.user_permissions(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);
    
    RAISE NOTICE 'Created user_permissions table';
  ELSE
    RAISE NOTICE 'user_permissions table already exists';
  END IF;
END $$;

