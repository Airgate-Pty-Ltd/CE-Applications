/**
 * Migration 005: Authentication Schema
 * Adds users, roles, and authentication tables for audit control
 */

export async function up(client) {
  // Create auth schema if it doesn't exist
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS auth;
  `);

  // Tenants table (for multi-tenancy support)
  await client.query(`
    CREATE TABLE IF NOT EXISTS auth.tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Roles table
  await client.query(`
    CREATE TABLE IF NOT EXISTS auth.roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE CHECK (name IN ('Lead Auditor', 'Internal Assessor', 'Viewer', 'Admin')),
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_login TIMESTAMP WITH TIME ZONE,
      UNIQUE(tenant_id, email)
    );
  `);

  // User roles junction table
  await client.query(`
    CREATE TABLE IF NOT EXISTS auth.user_roles (
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (user_id, role_id)
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON auth.users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON auth.user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON auth.user_roles(role_id);
  `);

  // Create default tenant if none exists
  await client.query(`
    INSERT INTO auth.tenants (id, name)
    SELECT gen_random_uuid(), 'Default Tenant'
    WHERE NOT EXISTS (SELECT 1 FROM auth.tenants WHERE name = 'Default Tenant');
  `);

  // Create default roles
  await client.query(`
    INSERT INTO auth.roles (id, name, description)
    VALUES 
      (gen_random_uuid(), 'Lead Auditor', 'Can create audits, assign auditors, review and close audits'),
      (gen_random_uuid(), 'Internal Assessor', 'Can execute assigned audits and submit responses'),
      (gen_random_uuid(), 'Viewer', 'Can view audit results and reports'),
      (gen_random_uuid(), 'Admin', 'Full system administration access')
    ON CONFLICT (name) DO NOTHING;
  `);
}

export async function down(client) {
  await client.query(`DROP TABLE IF EXISTS auth.user_roles CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS auth.users CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS auth.roles CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS auth.tenants CASCADE;`);
  await client.query(`DROP SCHEMA IF EXISTS auth CASCADE;`);
}
