const {
  listProfiles,
  upsertProfile,
  listTenants,
  upsertTenant
} = require('../../services/tenantConfig');

async function ensureProfile(profilePayload) {
  const profiles = await listProfiles();
  const existing = profiles.find((profile) => profile.profile_id === profilePayload.profile_id);
  if (!existing) {
    await upsertProfile(profilePayload);
  }
}

async function ensureTenant(tenantPayload) {
  const tenants = await listTenants();
  const existing = tenants.find((tenant) => tenant.tenant_id === tenantPayload.tenant_id);
  if (!existing) {
    await upsertTenant(tenantPayload);
  }
}

async function seedEdcatDefaults() {
  // Seed core aerospace profile
  await ensureProfile({
    profile_id: 'PROFILE_ENTERPRISE_AEROSPACE_FULL',
    label: 'Enterprise – Full Aerospace Compliance Stack',
    description: 'AS9100 + AS9110 with FAA Part 21/145 coverage.',
    tenant_types_allowed: ['enterprise', 'oem', 'mro', 'oem_mro'],
    enabled_standards: ['STANDARD_AS9100', 'STANDARD_AS9110'],
    enabled_reg_packs: ['REGPACK_FAA_PART21', 'REGPACK_FAA_PART145'],
    allow_customer_requirements: true,
    regulator_links: [
      'https://www.faa.gov/regulations_policies',
      'https://www.ecfr.gov/current/title-14'
    ],
    metadata: {
      sector: 'aerospace'
    }
  });

  await ensureProfile({
    profile_id: 'PROFILE_REG_FAA_PART21',
    label: 'FAA Part 21 Certification Oversight',
    tenant_types_allowed: ['regulator', 'oem', 'oem_mro'],
    enabled_standards: [],
    enabled_reg_packs: ['REGPACK_FAA_PART21'],
    allow_customer_requirements: false,
    regulator_links: ['https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-21'],
    metadata: {
      authority: 'FAA',
      focus: 'Part 21'
    }
  });

  await ensureProfile({
    profile_id: 'PROFILE_REG_FAA_PART145',
    label: 'FAA Part 145 Repair Station Oversight',
    tenant_types_allowed: ['regulator', 'mro', 'oem_mro'],
    enabled_standards: [],
    enabled_reg_packs: ['REGPACK_FAA_PART145'],
    allow_customer_requirements: false,
    regulator_links: ['https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-145'],
    metadata: {
      authority: 'FAA',
      focus: 'Part 145'
    }
  });

  // Seed demo tenant
  await ensureTenant({
    tenant_id: 'faa-nw',
    tenant_name: 'FAA Northwest Ops',
    tenant_type: 'oem_mro',
    tenant_types: ['oem', 'mro', 'oem_mro'],
    industry_sector: 'aerospace',
    active_profile_id: 'PROFILE_ENTERPRISE_AEROSPACE_FULL',
    allowed_profiles: [
      'PROFILE_ENTERPRISE_AEROSPACE_FULL',
      'PROFILE_REG_FAA_PART21',
      'PROFILE_REG_FAA_PART145'
    ],
    base_url: process.env.PUBLIC_BASE_URL || 'https://edge-document-compliance-production.up.railway.app',
    base_path: '/Modules/edcat/ui/edcat.html?tenant_id=faa-nw',
    company_legal_name: 'FAA Northwest Operations',
    billing_contact_name: 'Finance Team',
    billing_contact_email: 'finance@faa-nw.example',
    billing_contact_phone: '+1-555-0100',
    billing_address_line1: '100 Aviation Way',
    billing_city: 'Seattle',
    billing_state_region: 'WA',
    billing_postal_code: '98101',
    billing_country: 'United States',
    primary_admin_name: 'Compliance Admin',
    primary_admin_email: 'admin@faa-nw.example',
    primary_admin_phone: '+1-555-0101',
    technical_contact_name: 'Tech Lead',
    technical_contact_email: 'tech@faa-nw.example',
    technical_contact_phone: '+1-555-0102',
    subscription_plan: 'regulator',
    subscription_status: 'active',
    subscription_start_date: '2025-01-01T00:00:00.000Z',
    subscription_renewal_date: '2026-01-01T00:00:00.000Z',
    max_users: 50,
    modules_enabled: { edcat_core: true },
    reg_packs_enabled: ['REGPACK_FAA_PART21', 'REGPACK_FAA_PART145'],
    standards_enabled: ['STANDARD_AS9100', 'STANDARD_AS9110'],
    db_instance_name: 'edcat_faa_nw',
    sso_enabled: false,
    health_status: 'good',
    internal_notes: 'Seed tenant for production demo environment.'
  });
}

module.exports = {
  seedEdcatDefaults
};

