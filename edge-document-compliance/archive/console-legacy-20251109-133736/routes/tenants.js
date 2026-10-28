const express = require('express');
const router = express.Router();

const {
  listTenants,
  getTenant,
  upsertTenant,
  deleteTenant,
  listProfiles,
  getProfile,
  upsertProfile,
  deleteProfile
} = require('../services/tenantConfig');

router.get('/profiles', async (req, res) => {
  try {
    const rawType = req.query.tenant_type;
    const tenantTypes = typeof rawType === 'string'
      ? rawType.split(',').map((type) => type.trim()).filter(Boolean)
      : Array.isArray(rawType)
      ? rawType.flatMap((type) => String(type).split(',')).map((type) => type.trim()).filter(Boolean)
      : [];
    const profiles = await listProfiles({ tenantTypes });
    res.json({ success: true, profiles });
  } catch (error) {
    console.error('Failed to list tenant profiles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/profiles/:id', async (req, res) => {
  try {
    const profile = await getProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const tenants = await listTenants();
    res.json({ success: true, tenants });
  } catch (error) {
    console.error('Failed to list tenants:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    const profile = await getProfile(tenant.active_profile_id);
    const profiles = await listProfiles();
    const allowedProfiles = profiles.filter((item) => tenant.allowed_profiles?.includes(item.profile_id));

    res.json({
      success: true,
      tenant,
      active_profile: profile || null,
      allowed_profiles: allowedProfiles
    });
  } catch (error) {
    console.error('Failed to fetch tenant:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const normalizeArray = (value) =>
      Array.isArray(value)
        ? value
        : typeof value === 'string'
        ? value.split(',').map((item) => item.trim()).filter(Boolean)
        : [];

    const payload = {
      tenant_id: req.body.tenant_id,
      tenant_name: req.body.tenant_name,
      tenant_type: req.body.tenant_type,
      tenant_types: normalizeArray(req.body.tenant_types || req.body.tenant_types_array),
      industry_sector: req.body.industry_sector,
      active_profile_id: req.body.active_profile_id || req.body.profile_id,
      allowed_profiles: normalizeArray(req.body.allowed_profiles),
      base_url: req.body.base_url,
      base_path: req.body.base_path,
      company_legal_name: req.body.company_legal_name,
      billing_contact_name: req.body.billing_contact_name,
      billing_contact_email: req.body.billing_contact_email,
      billing_contact_phone: req.body.billing_contact_phone,
      billing_address_line1: req.body.billing_address_line1,
      billing_address_line2: req.body.billing_address_line2,
      billing_city: req.body.billing_city,
      billing_state_region: req.body.billing_state_region,
      billing_postal_code: req.body.billing_postal_code,
      billing_country: req.body.billing_country,
      tax_id_vat: req.body.tax_id_vat,
      primary_admin_name: req.body.primary_admin_name,
      primary_admin_email: req.body.primary_admin_email,
      primary_admin_phone: req.body.primary_admin_phone,
      technical_contact_name: req.body.technical_contact_name,
      technical_contact_email: req.body.technical_contact_email,
      technical_contact_phone: req.body.technical_contact_phone,
      subscription_plan: req.body.subscription_plan,
      subscription_status: req.body.subscription_status,
      subscription_start_date: req.body.subscription_start_date,
      subscription_renewal_date: req.body.subscription_renewal_date,
      max_users: req.body.max_users,
      modules_enabled: req.body.modules_enabled,
      reg_packs_enabled: normalizeArray(req.body.reg_packs_enabled),
      standards_enabled: normalizeArray(req.body.standards_enabled),
      db_instance_name: req.body.db_instance_name,
      api_key_id: req.body.api_key_id,
      sso_enabled: req.body.sso_enabled,
      health_status: req.body.health_status,
      last_health_check: req.body.last_health_check,
      branding: req.body.branding,
      internal_notes: req.body.internal_notes
    };

    const tenant = await upsertTenant(payload);
    res.json({ success: true, tenant });
  } catch (error) {
    console.error('Failed to upsert tenant:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.post('/profiles', async (req, res) => {
  try {
    const payload = {
      profile_id: req.body.profile_id,
      label: req.body.label,
      tenant_types_allowed: req.body.tenant_types_allowed,
      enabled_standards: req.body.enabled_standards,
      enabled_reg_packs: req.body.enabled_reg_packs,
      regulator_links: req.body.regulator_links,
      description: req.body.description,
      allow_customer_requirements: req.body.allow_customer_requirements,
      metadata: req.body.metadata
    };

    const profile = await upsertProfile(payload);
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Failed to upsert profile:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.delete('/profiles/:id', async (req, res) => {
  try {
    const deleted = await deleteProfile(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteTenant(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tenant:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

