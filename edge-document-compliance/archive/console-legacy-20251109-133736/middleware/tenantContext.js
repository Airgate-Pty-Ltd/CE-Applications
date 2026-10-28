const { getTenant, getProfile } = require('../services/tenantConfig');

async function requireTenantContext(req, res, next) {
  try {
    const tenantIdHeader = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    const tenantId = (tenantIdHeader || req.query.tenant_id || '').toString().trim();

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant context required (missing tenant_id).' });
    }

    const tenant = await getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found.' });
    }

    const profile = await getProfile(tenant.active_profile_id);
    if (!profile) {
      return res.status(500).json({ success: false, error: 'Tenant profile misconfigured.' });
    }

    req.tenantContext = {
      tenant,
      profile
    };

    next();
  } catch (error) {
    console.error('Failed to establish tenant context:', error);
    res.status(500).json({ success: false, error: 'Unable to resolve tenant context.' });
  }
}

module.exports = {
  requireTenantContext
};

