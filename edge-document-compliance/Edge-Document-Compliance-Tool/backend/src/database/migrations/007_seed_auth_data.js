/**
 * Migration 007: Seed Authentication Data
 * Creates default tenant, roles, and admin user
 */

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export async function up(client) {
  // Get default tenant
  const tenantResult = await client.query(
    "SELECT id FROM auth.tenants WHERE name = 'Default Tenant'"
  );
  let tenantId;
  
  if (tenantResult.rows.length === 0) {
    tenantId = uuidv4();
    await client.query(
      'INSERT INTO auth.tenants (id, name) VALUES ($1, $2)',
      [tenantId, 'Default Tenant']
    );
  } else {
    tenantId = tenantResult.rows[0].id;
  }

  // Get role IDs
  const rolesResult = await client.query(
    "SELECT id, name FROM auth.roles WHERE name IN ('Lead Auditor', 'Internal Assessor', 'Viewer', 'Admin')"
  );
  const roleMap = new Map(rolesResult.rows.map(r => [r.name, r.id]));

  // Create default admin user (password: admin123)
  const adminEmail = 'admin@example.com';
  const userCheck = await client.query(
    'SELECT id FROM auth.users WHERE email = $1 AND tenant_id = $2',
    [adminEmail, tenantId]
  );

  if (userCheck.rows.length === 0) {
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('admin123', 10);

    await client.query(
      `INSERT INTO auth.users (id, tenant_id, email, password_hash, display_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, tenantId, adminEmail, passwordHash, 'Admin User', true]
    );

    // Assign Admin role
    if (roleMap.has('Admin')) {
      await client.query(
        'INSERT INTO auth.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, roleMap.get('Admin')]
      );
    }

    console.log(`✓ Created admin user: ${adminEmail} / admin123`);
  }

  // Create sample Lead Auditor
  const leadAuditorEmail = 'lead.auditor@example.com';
  const leadCheck = await client.query(
    'SELECT id FROM auth.users WHERE email = $1 AND tenant_id = $2',
    [leadAuditorEmail, tenantId]
  );

  if (leadCheck.rows.length === 0) {
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('auditor123', 10);

    await client.query(
      `INSERT INTO auth.users (id, tenant_id, email, password_hash, display_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, tenantId, leadAuditorEmail, passwordHash, 'Lead Auditor', true]
    );

    if (roleMap.has('Lead Auditor')) {
      await client.query(
        'INSERT INTO auth.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, roleMap.get('Lead Auditor')]
      );
    }

    console.log(`✓ Created Lead Auditor: ${leadAuditorEmail} / auditor123`);
  }

  // Create sample Internal Assessor
  const assessorEmail = 'assessor@example.com';
  const assessorCheck = await client.query(
    'SELECT id FROM auth.users WHERE email = $1 AND tenant_id = $2',
    [assessorEmail, tenantId]
  );

  if (assessorCheck.rows.length === 0) {
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('assessor123', 10);

    await client.query(
      `INSERT INTO auth.users (id, tenant_id, email, password_hash, display_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, tenantId, assessorEmail, passwordHash, 'Internal Assessor', true]
    );

    if (roleMap.has('Internal Assessor')) {
      await client.query(
        'INSERT INTO auth.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, roleMap.get('Internal Assessor')]
      );
    }

    console.log(`✓ Created Internal Assessor: ${assessorEmail} / assessor123`);
  }
}

export async function down(client) {
  // Remove seeded users (keep structure)
  await client.query("DELETE FROM auth.users WHERE email IN ('admin@example.com', 'lead.auditor@example.com', 'assessor@example.com')");
}
