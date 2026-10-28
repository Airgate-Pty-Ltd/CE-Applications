-- =============================================================================
-- MIGRATION 013: Restore authorized_users and user_permissions tables
-- These tables were incorrectly removed during cleanup but are actively used
-- by the /api/users endpoint and Admin section
-- =============================================================================

-- Create authorized_users table if it doesn't exist
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
        -- First create unique index, then add constraint if needed
        CREATE UNIQUE INDEX IF NOT EXISTS authorized_users_user_id_key ON public.authorized_users(user_id);
    END IF;
END $$;

-- Create user_permissions table if it doesn't exist
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

