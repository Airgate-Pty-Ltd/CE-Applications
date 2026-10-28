const TenantStore = require('./tenant-store');
const { provisionTenantDatabase, verifyTenantDatabase } = require('./tenant-provisioner');

function applyAutoPacks(config) {
  const country = config.country || '';
  const type = config.tenant_type || '';
  const normalizedCountry = country.toLowerCase();
  const normalizedType = type.toLowerCase();

  const regPacks = new Set(config.reg_packs_enabled || []);
  const standards = new Set(config.standards_enabled || []);

  const addRegPack = (id) => {
    if (id) regPacks.add(id);
  };
  const addStandard = (id) => {
    if (id) standards.add(id);
  };

  const countryMap = {
    usa: ['REGPACK_FAA_PART21', 'REGPACK_FAA_PART145'],
    'united states': ['REGPACK_FAA_PART21', 'REGPACK_FAA_PART145'],
    australia: ['REGPACK_CASA_PART21', 'REGPACK_CASA_PART145'],
    'european union': ['REGPACK_EASA_PART21', 'REGPACK_EASA_PART145'],
    germany: ['REGPACK_EASA_PART21', 'REGPACK_EASA_PART145'],
    france: ['REGPACK_EASA_PART21', 'REGPACK_EASA_PART145'],
    italy: ['REGPACK_EASA_PART21', 'REGPACK_EASA_PART145'],
    spain: ['REGPACK_EASA_PART21', 'REGPACK_EASA_PART145'],
    'united kingdom': ['REGPACK_UKCAA_PART21', 'REGPACK_UKCAA_PART145'],
    uk: ['REGPACK_UKCAA_PART21', 'REGPACK_UKCAA_PART145'],
    canada: ['REGPACK_TCCA_PART21', 'REGPACK_TCCA_PART145'],
    brazil: ['REGPACK_ANAC_PART21', 'REGPACK_ANAC_PART145'],
    china: ['REGPACK_CAAC_PART21', 'REGPACK_CAAC_PART145'],
    india: ['REGPACK_DGCA_PART21', 'REGPACK_DGCA_PART145'],
    'united arab emirates': ['REGPACK_GCAA_PART21', 'REGPACK_GCAA_PART145'],
    singapore: ['REGPACK_CAAS_PART21', 'REGPACK_CAAS_PART145'],
    'new zealand': ['REGPACK_CAANZ_PART21', 'REGPACK_CAANZ_PART145']
  };

  const standardMap = {
    oem: ['STANDARD_AS9100'],
    mro: ['STANDARD_AS9110'],
    enterprise: [],
    regulator: [],
    consultant: [],
    cert_body: []
  };

  const packsForCountry = countryMap[normalizedCountry];
  if (packsForCountry) {
    packsForCountry.forEach(addRegPack);
  }

  const standardsForType = standardMap[normalizedType];
  if (standardsForType) {
    standardsForType.forEach(addStandard);
  }

  if (normalizedType === 'oem' || normalizedType === 'oem_mro') {
    addStandard('STANDARD_AS9100');
  }
  if (normalizedType === 'mro' || normalizedType === 'oem_mro') {
    addStandard('STANDARD_AS9110');
  }

  return {
    ...config,
    reg_packs_enabled: Array.from(regPacks),
    standards_enabled: Array.from(standards)
  };
}

async function listTenantsHandler(_req, res) {
  try {
    const tenants = await TenantStore.listTenants();
    res.json({ success: true, tenants });
  } catch (error) {
    console.error('Failed to list tenants:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getTenantHandler(req, res) {
  try {
    const tenant = await TenantStore.getTenant(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    res.json({ success: true, tenant });
  } catch (error) {
    console.error('Failed to fetch tenant:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function upsertTenantHandler(req, res) {
  try {
    const payload = applyAutoPacks(req.body || {});
    const tenant = await TenantStore.upsertTenant(payload);
    res.json({ success: true, tenant });
  } catch (error) {
    console.error('Failed to upsert tenant:', error);
    res.status(400).json({ success: false, error: error.message });
  }
}

async function provisionTenantHandler(req, res) {
  try {
    const tenant = await TenantStore.getTenant(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    const updated = await provisionTenantDatabase(tenant);
    res.json({ success: true, tenant: updated });
  } catch (error) {
    console.error('Failed to provision tenant:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function verifyTenantHandler(req, res) {
  try {
    const tenant = await TenantStore.getTenant(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }
    const result = await verifyTenantDatabase(tenant);
    res.json({ ...result, tenant_id: tenant.tenant_id });
  } catch (error) {
    console.error('Failed to verify tenant:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  listTenantsHandler,
  getTenantHandler,
  upsertTenantHandler,
  provisionTenantHandler,
  verifyTenantHandler
};

/*
TODO (future iterations):
- Validate payloads more strictly (schema-based validation).
- Enforce authentication/authorization for administrative endpoints.
- Emit audit log events when provisioning or verification occurs.
*/

