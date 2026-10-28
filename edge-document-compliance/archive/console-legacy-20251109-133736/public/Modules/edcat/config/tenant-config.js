// EDCAT: Tenant configuration store (front-end simulation).
// In production this should be replaced with API calls backed by persistent storage.

const TenantConfigStore = (function () {
  const tenants = {};

  function getAllTenants() {
    return Object.values(tenants);
  }

  function getTenant(tenantId) {
    return tenants[tenantId] || null;
  }

  function upsertTenant(config) {
    if (!config || !config.tenant_id) {
      console.error('Invalid tenant config supplied to TenantConfigStore.upsertTenant');
      return;
    }

    tenants[config.tenant_id] = {
      ...tenants[config.tenant_id],
      ...config
    };
  }

  return {
    getAllTenants,
    getTenant,
    upsertTenant
  };
})();

if (typeof window !== 'undefined') {
  window.TenantConfigStore = TenantConfigStore;
}

