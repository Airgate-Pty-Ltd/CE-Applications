const { query } = require('../../database/db');
const TenantStore = require('./tenant-store');

const BASE_TABLES = {
  documents: `
    CREATE TABLE IF NOT EXISTS %TABLE_NAME% (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id VARCHAR(120) NOT NULL,
      document_name TEXT NOT NULL,
      document_type TEXT,
      storage_path TEXT,
      uploaded_by TEXT,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::JSONB
    );
  `,
  document_mappings: `
    CREATE TABLE IF NOT EXISTS %TABLE_NAME% (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id VARCHAR(120) NOT NULL,
      document_id UUID NOT NULL,
      requirement_id UUID NOT NULL,
      assessment_id UUID,
      status TEXT DEFAULT 'unmapped',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  requirements_snapshots: `
    CREATE TABLE IF NOT EXISTS %TABLE_NAME% (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id VARCHAR(120) NOT NULL,
      requirement_set_id UUID NOT NULL,
      requirement_id UUID NOT NULL,
      snapshot JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
  users: `
    CREATE TABLE IF NOT EXISTS %TABLE_NAME% (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id VARCHAR(120) NOT NULL,
      user_email TEXT NOT NULL,
      user_name TEXT,
      role TEXT DEFAULT 'member',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_login_at TIMESTAMP WITH TIME ZONE
    );
  `,
  activity_log: `
    CREATE TABLE IF NOT EXISTS %TABLE_NAME% (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id VARCHAR(120) NOT NULL,
      actor TEXT,
      activity TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
};

function sanitizeIdentifier(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 63);
}

function buildTableName(tenantId, baseName) {
  const safeTenant = sanitizeIdentifier(tenantId);
  const safeBase = sanitizeIdentifier(baseName);
  return `${safeBase}__${safeTenant}`;
}

async function ensureBaseTables(tenant) {
  const tableNames = [];
  const tenantId = tenant.tenant_id;

  for (const [baseName, definition] of Object.entries(BASE_TABLES)) {
    const tableName = buildTableName(tenantId, baseName);
    const sql = definition.replace(/%TABLE_NAME%/g, `"${tableName}"`);
    await query(sql);
    tableNames.push(tableName);
  }

  return tableNames;
}

async function provisionTenantDatabase(tenant) {
  if (!tenant || !tenant.tenant_id) {
    throw new Error('Tenant required for provisioning');
  }

  let tableNames = [];
  let isProvisioned = true;
  let provisionError = null;

  try {
    tableNames = await ensureBaseTables(tenant);
  } catch (error) {
    isProvisioned = false;
    provisionError = error.message || 'Unknown database error';
  }

  const provisionedTenant = {
    ...tenant,
    provisioned: isProvisioned,
    provisioned_at: isProvisioned ? new Date().toISOString() : tenant.provisioned_at || null,
    customer_tables: tableNames
  };

  if (provisionError) {
    provisionedTenant.provision_error = provisionError;
  }

  await TenantStore.upsertTenant(provisionedTenant);
  return provisionedTenant;
}

async function verifyTenantDatabase(tenant) {
  if (!tenant || !tenant.tenant_id) {
    return {
      ok: false,
      issues: ['Tenant not provided'],
      checked_at: new Date().toISOString()
    };
  }

  const issues = [];
  if (!tenant.provisioned) {
    issues.push('Tenant not marked as provisioned');
  }

  const expectedTables = tenant.customer_tables?.length
    ? tenant.customer_tables
    : Object.keys(BASE_TABLES).map((baseName) => buildTableName(tenant.tenant_id, baseName));

  const missingTables = [];
  for (const table of expectedTables) {
    try {
      const result = await query('SELECT to_regclass($1) AS exists', [table]);
      if (!result.rows[0] || result.rows[0].exists === null) {
        missingTables.push(table);
      }
    } catch (error) {
      issues.push(`Database error checking ${table}: ${error.message}`);
      break;
    }
  }

  if (missingTables.length) {
    issues.push(`Missing tables: ${missingTables.join(', ')}`);
  }

  if (!tenant.db_instance_name) {
    issues.push('db_instance_name not set');
  }

  return {
    ok: issues.length === 0,
    issues,
    checked_at: new Date().toISOString(),
    tables_checked: expectedTables
  };
}

module.exports = {
  provisionTenantDatabase,
  verifyTenantDatabase,
  buildTableName
};

/*
TODO (future enhancements):
- Integrate with Railway/Postgres APIs to create dedicated schemas or databases if required.
- Apply migrations per tenant table set to ensure structural updates.
- Add retry logic and logging instrumentation for provisioning operations.
*/

