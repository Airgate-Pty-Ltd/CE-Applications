const crypto = require('crypto');
const { query } = require('../database/db');

function generateTenantId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length >= 4
    ? `${slug}-${crypto.randomUUID().split('-')[0]}`
    : crypto.randomUUID();
}

function validateTenantPayload(payload, { requireId = false } = {}) {
  const errors = [];

  if (requireId && !payload.tenant_id) {
    errors.push('tenant_id is required');
  }

  if (!payload.tenant_name) {
    errors.push('tenant_name is required');
  }

  const tenantTypes = Array.isArray(payload.tenant_types)
    ? payload.tenant_types.map((type) => String(type).trim()).filter(Boolean)
    : [];

  if (!tenantTypes.length) {
    errors.push('tenant_types must include at least one tenant type');
  }

  if (!payload.tenant_type) {
    errors.push('tenant_type is required');
  }

  if (!payload.active_profile_id) {
    errors.push('active_profile_id is required');
  }

  if (!Array.isArray(payload.allowed_profiles) || !payload.allowed_profiles.length) {
    errors.push('allowed_profiles must include at least one profile');
  }

  if (!payload.base_url) {
    errors.push('base_url is required');
  }

  return errors;
}

async function persistTenants(updatedTenants) {
  return updatedTenants;
}

async function persistProfiles(updatedProfiles) {
  return updatedProfiles;
}

function validateProfilePayload(payload, { requireId = false } = {}) {
  const errors = [];

  if (requireId && !payload.profile_id) {
    errors.push('profile_id is required');
  }

  if (!payload.profile_id) {
    errors.push('profile_id is required');
  }

  if (!payload.label) {
    errors.push('label is required');
  }

  if (!Array.isArray(payload.tenant_types_allowed) || !payload.tenant_types_allowed.length) {
    errors.push('tenant_types_allowed must include at least one tenant type');
  }

  return errors;
}

async function listTenants() {
  const { rows } = await query(
    `SELECT
        tenant_id,
        tenant_name,
        tenant_type,
        tenant_types,
        industry_sector,
        active_profile_id,
        allowed_profiles,
        billing_country,
        provisioned,
        provisioned_at,
        customer_tables,
        provision_error,
        base_url,
        base_path,
        modules_enabled,
        branding,
        health_status,
        last_health_check
     FROM edcat_tenants
     ORDER BY tenant_name ASC`
  );

  return rows.map((row) => ({
    ...row,
    tenant_types: row.tenant_types || [],
    allowed_profiles: row.allowed_profiles || [],
    modules_enabled: row.modules_enabled || {},
    branding: row.branding || {},
    country: row.billing_country || null,
    provisioned: Boolean(row.provisioned),
    provisioned_at: row.provisioned_at ? row.provisioned_at.toISOString() : null,
    customer_tables: row.customer_tables || [],
    provision_error: row.provision_error || null,
    last_health_check: row.last_health_check ? row.last_health_check.toISOString() : null
  }));
}

async function getTenant(tenantId) {
  const { rows } = await query(
    `SELECT
        tenant_id,
        tenant_name,
        tenant_type,
        tenant_types,
        industry_sector,
        active_profile_id,
        allowed_profiles,
        base_url,
        base_path,
        company_legal_name,
        billing_contact_name,
        billing_contact_email,
        billing_contact_phone,
        billing_address_line1,
        billing_address_line2,
        billing_city,
        billing_state_region,
        billing_postal_code,
        billing_country,
        tax_id_vat,
        primary_admin_name,
        primary_admin_email,
        primary_admin_phone,
        technical_contact_name,
        technical_contact_email,
        technical_contact_phone,
        subscription_plan,
        subscription_status,
        subscription_start_date,
        subscription_renewal_date,
        max_users,
        modules_enabled,
        reg_packs_enabled,
        standards_enabled,
        db_instance_name,
        api_key_id,
        sso_enabled,
        health_status,
        last_health_check,
        branding,
        internal_notes,
        provisioned,
        provisioned_at,
        customer_tables,
        provision_error,
        created_at,
        updated_at
     FROM edcat_tenants
     WHERE tenant_id = $1`,
    [tenantId]
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    ...row,
    tenant_types: row.tenant_types || [],
    allowed_profiles: row.allowed_profiles || [],
    modules_enabled: row.modules_enabled || {},
    reg_packs_enabled: row.reg_packs_enabled || [],
    standards_enabled: row.standards_enabled || [],
    branding: row.branding || {},
    country: row.billing_country || null,
    provisioned: Boolean(row.provisioned),
    provisioned_at: row.provisioned_at ? row.provisioned_at.toISOString() : null,
    customer_tables: row.customer_tables || [],
    provision_error: row.provision_error || null,
    subscription_start_date: row.subscription_start_date ? row.subscription_start_date.toISOString() : null,
    subscription_renewal_date: row.subscription_renewal_date ? row.subscription_renewal_date.toISOString() : null,
    last_health_check: row.last_health_check ? row.last_health_check.toISOString() : null,
    created_at: row.created_at ? row.created_at.toISOString() : null,
    updated_at: row.updated_at ? row.updated_at.toISOString() : null
  };
}

async function upsertTenant(payload) {
  const normalizedTenantTypes = Array.isArray(payload.tenant_types)
    ? Array.from(new Set(payload.tenant_types.map((type) => String(type).trim()).filter(Boolean)))
    : [];

  const baseTenantType = payload.tenant_type || normalizedTenantTypes[0] || null;
  if (baseTenantType && !normalizedTenantTypes.includes(baseTenantType)) {
    normalizedTenantTypes.unshift(baseTenantType);
  }
  const allowedProfiles = Array.isArray(payload.allowed_profiles)
    ? Array.from(new Set(payload.allowed_profiles.map((id) => String(id).trim()).filter(Boolean)))
    : [];
  if (payload.active_profile_id && !allowedProfiles.includes(payload.active_profile_id)) {
    allowedProfiles.unshift(payload.active_profile_id);
  }

  const errors = validateTenantPayload(
    {
      ...payload,
      tenant_type: baseTenantType,
      tenant_types: normalizedTenantTypes,
      allowed_profiles: allowedProfiles
    },
    { requireId: Boolean(payload.tenant_id) }
  );

  if (errors.length) {
    const error = new Error(errors.join(', '));
    error.statusCode = 400;
    throw error;
  }

  const tenantId = payload.tenant_id || generateTenantId(payload.tenant_name);
  const modulesEnabled = payload.modules_enabled || {};
  const branding = payload.branding || {};
  const regPacks = Array.isArray(payload.reg_packs_enabled) ? payload.reg_packs_enabled : [];
  const standards = Array.isArray(payload.standards_enabled) ? payload.standards_enabled : [];
  const country = payload.country || payload.billing_country || null;

  const subscriptionStart = payload.subscription_start_date ? new Date(payload.subscription_start_date) : null;
  const subscriptionRenewal = payload.subscription_renewal_date ? new Date(payload.subscription_renewal_date) : null;
  const lastHealthCheck = payload.last_health_check ? new Date(payload.last_health_check) : null;

  const { rows } = await query(
    `INSERT INTO edcat_tenants (
        tenant_id,
        tenant_name,
        tenant_type,
        tenant_types,
        industry_sector,
        active_profile_id,
        allowed_profiles,
        base_url,
        base_path,
        company_legal_name,
        billing_contact_name,
        billing_contact_email,
        billing_contact_phone,
        billing_address_line1,
        billing_address_line2,
        billing_city,
        billing_state_region,
        billing_postal_code,
        billing_country,
        tax_id_vat,
        primary_admin_name,
        primary_admin_email,
        primary_admin_phone,
        technical_contact_name,
        technical_contact_email,
        technical_contact_phone,
        subscription_plan,
        subscription_status,
        subscription_start_date,
        subscription_renewal_date,
        max_users,
        modules_enabled,
        reg_packs_enabled,
        standards_enabled,
        db_instance_name,
        api_key_id,
        sso_enabled,
        health_status,
        last_health_check,
        branding,
        internal_notes,
        provisioned,
        provisioned_at,
        customer_tables,
        provision_error
     )
     VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46
     )
     ON CONFLICT (tenant_id) DO UPDATE
     SET tenant_name = EXCLUDED.tenant_name,
         tenant_type = EXCLUDED.tenant_type,
         tenant_types = EXCLUDED.tenant_types,
         industry_sector = EXCLUDED.industry_sector,
         active_profile_id = EXCLUDED.active_profile_id,
         allowed_profiles = EXCLUDED.allowed_profiles,
         base_url = EXCLUDED.base_url,
         base_path = EXCLUDED.base_path,
         company_legal_name = EXCLUDED.company_legal_name,
         billing_contact_name = EXCLUDED.billing_contact_name,
         billing_contact_email = EXCLUDED.billing_contact_email,
         billing_contact_phone = EXCLUDED.billing_contact_phone,
         billing_address_line1 = EXCLUDED.billing_address_line1,
         billing_address_line2 = EXCLUDED.billing_address_line2,
         billing_city = EXCLUDED.billing_city,
         billing_state_region = EXCLUDED.billing_state_region,
         billing_postal_code = EXCLUDED.billing_postal_code,
         billing_country = EXCLUDED.billing_country,
         tax_id_vat = EXCLUDED.tax_id_vat,
         primary_admin_name = EXCLUDED.primary_admin_name,
         primary_admin_email = EXCLUDED.primary_admin_email,
         primary_admin_phone = EXCLUDED.primary_admin_phone,
         technical_contact_name = EXCLUDED.technical_contact_name,
         technical_contact_email = EXCLUDED.technical_contact_email,
         technical_contact_phone = EXCLUDED.technical_contact_phone,
         subscription_plan = EXCLUDED.subscription_plan,
         subscription_status = EXCLUDED.subscription_status,
         subscription_start_date = EXCLUDED.subscription_start_date,
         subscription_renewal_date = EXCLUDED.subscription_renewal_date,
         max_users = EXCLUDED.max_users,
         modules_enabled = EXCLUDED.modules_enabled,
         reg_packs_enabled = EXCLUDED.reg_packs_enabled,
         standards_enabled = EXCLUDED.standards_enabled,
         db_instance_name = EXCLUDED.db_instance_name,
         api_key_id = EXCLUDED.api_key_id,
         sso_enabled = EXCLUDED.sso_enabled,
         health_status = EXCLUDED.health_status,
         last_health_check = EXCLUDED.last_health_check,
         branding = EXCLUDED.branding,
         internal_notes = EXCLUDED.internal_notes,
         provisioned = EXCLUDED.provisioned,
         provisioned_at = EXCLUDED.provisioned_at,
         customer_tables = EXCLUDED.customer_tables,
         provision_error = EXCLUDED.provision_error,
         updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      tenantId,
      payload.tenant_name,
      baseTenantType,
      normalizedTenantTypes,
      payload.industry_sector || null,
      payload.active_profile_id,
      allowedProfiles,
      payload.base_url,
      payload.base_path || null,
      payload.company_legal_name || null,
      payload.billing_contact_name || null,
      payload.billing_contact_email || null,
      payload.billing_contact_phone || null,
      payload.billing_address_line1 || null,
      payload.billing_address_line2 || null,
      payload.billing_city || null,
      payload.billing_state_region || null,
      payload.billing_postal_code || null,
      country,
      payload.tax_id_vat || null,
      payload.primary_admin_name || null,
      payload.primary_admin_email || null,
      payload.primary_admin_phone || null,
      payload.technical_contact_name || null,
      payload.technical_contact_email || null,
      payload.technical_contact_phone || null,
      payload.subscription_plan || 'trial',
      payload.subscription_status || 'trial',
      subscriptionStart,
      subscriptionRenewal,
      Number.isFinite(payload.max_users) ? payload.max_users : 1,
      modulesEnabled,
      regPacks,
      standards,
      payload.db_instance_name || null,
      payload.api_key_id || null,
      Boolean(payload.sso_enabled),
      payload.health_status || 'good',
      lastHealthCheck,
      branding,
      payload.internal_notes || null,
      Boolean(payload.provisioned),
      payload.provisioned_at ? new Date(payload.provisioned_at) : null,
      Array.isArray(payload.customer_tables) ? payload.customer_tables : [],
      payload.provision_error || null
    ]
  );

  return getTenant(rows[0].tenant_id);
}

async function deleteTenant(tenantId) {
  const { rowCount } = await query('DELETE FROM edcat_tenants WHERE tenant_id = $1', [tenantId]);
  return rowCount > 0;
}

async function listProfiles({ tenantTypes } = {}) {
  const filters = [];
  const params = [];

  if (Array.isArray(tenantTypes) && tenantTypes.length) {
    params.push(tenantTypes.map((type) => String(type).trim()).filter(Boolean));
    filters.push('(tenant_types_allowed = \'{}\'::text[] OR tenant_types_allowed && $1::text[])');
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT
        profile_id,
        label,
        description,
        tenant_types_allowed,
        enabled_standards,
        enabled_reg_packs,
        allow_customer_requirements,
        regulator_links,
        metadata,
        created_at,
        updated_at
     FROM edcat_profiles
     ${whereClause}
     ORDER BY label ASC`,
    params
  );

  return rows.map((row) => ({
    ...row,
    tenant_types_allowed: row.tenant_types_allowed || [],
    enabled_standards: row.enabled_standards || [],
    enabled_reg_packs: row.enabled_reg_packs || [],
    regulator_links: row.regulator_links || [],
    metadata: row.metadata || {},
    created_at: row.created_at ? row.created_at.toISOString() : null,
    updated_at: row.updated_at ? row.updated_at.toISOString() : null
  }));
}

async function getProfile(profileId) {
  const { rows } = await query(
    `SELECT
        profile_id,
        label,
        description,
        tenant_types_allowed,
        enabled_standards,
        enabled_reg_packs,
        allow_customer_requirements,
        regulator_links,
        metadata,
        created_at,
        updated_at
     FROM edcat_profiles
     WHERE profile_id = $1`,
    [profileId]
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    ...row,
    tenant_types_allowed: row.tenant_types_allowed || [],
    enabled_standards: row.enabled_standards || [],
    enabled_reg_packs: row.enabled_reg_packs || [],
    regulator_links: row.regulator_links || [],
    metadata: row.metadata || {},
    created_at: row.created_at ? row.created_at.toISOString() : null,
    updated_at: row.updated_at ? row.updated_at.toISOString() : null
  };
}

async function upsertProfile(payload) {
  const errors = validateProfilePayload(payload, { requireId: Boolean(payload.profile_id) });
  if (errors.length) {
    const error = new Error(errors.join(', '));
    error.statusCode = 400;
    throw error;
  }

  const enabledStandards = Array.isArray(payload.enabled_standards) ? payload.enabled_standards : [];
  const enabledRegPacks = Array.isArray(payload.enabled_reg_packs) ? payload.enabled_reg_packs : [];
  const regulatorLinks = Array.isArray(payload.regulator_links) ? payload.regulator_links : [];

  const { rows } = await query(
    `INSERT INTO edcat_profiles (
        profile_id,
        label,
        description,
        tenant_types_allowed,
        enabled_standards,
        enabled_reg_packs,
        allow_customer_requirements,
        regulator_links,
        metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (profile_id) DO UPDATE
     SET label = EXCLUDED.label,
         description = EXCLUDED.description,
         tenant_types_allowed = EXCLUDED.tenant_types_allowed,
         enabled_standards = EXCLUDED.enabled_standards,
         enabled_reg_packs = EXCLUDED.enabled_reg_packs,
         allow_customer_requirements = EXCLUDED.allow_customer_requirements,
         regulator_links = EXCLUDED.regulator_links,
         metadata = EXCLUDED.metadata,
         updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      payload.profile_id,
      payload.label,
      payload.description || null,
      payload.tenant_types_allowed,
      enabledStandards,
      enabledRegPacks,
      Boolean(payload.allow_customer_requirements),
      regulatorLinks,
      payload.metadata ? JSON.stringify(payload.metadata) : JSON.stringify({})
    ]
  );

  return getProfile(rows[0].profile_id);
}

async function deleteProfile(profileId) {
  const { rowCount } = await query('DELETE FROM edcat_profiles WHERE profile_id = $1', [profileId]);
  return rowCount > 0;
}

module.exports = {
  listTenants,
  getTenant,
  upsertTenant,
  deleteTenant,
  listProfiles,
  getProfile,
  generateTenantId,
  upsertProfile,
  deleteProfile
};

