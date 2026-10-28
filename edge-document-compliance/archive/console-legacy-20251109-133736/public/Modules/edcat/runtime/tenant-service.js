// EDCAT TenantService: thin wrapper around backend control-plane APIs with client-side caching

const TenantService = (function () {
  const API_BASE = '/api/edcat';
  let cache = [];

  function hydrate(tenants) {
    if (!Array.isArray(tenants)) {
      return;
    }
    cache = tenants.slice();
  }

  function getCachedTenant(tenantId) {
    return cache.find((tenant) => tenant.tenant_id === tenantId) || null;
  }

  async function refreshTenants() {
    const response = await fetch(`${API_BASE}/tenants-list`);
    if (!response.ok) {
      throw new Error(`Failed to load tenants (${response.status})`);
    }
    const payload = await response.json();
    cache = Array.isArray(payload.tenants) ? payload.tenants : [];
    return cache.slice();
  }

  async function listTenants({ force = false } = {}) {
    if (force || !cache.length) {
      await refreshTenants();
    }
    return cache.slice();
  }

  async function getTenant(tenantId, { force = false } = {}) {
    if (!tenantId) return null;
    if (!force) {
      const existing = getCachedTenant(tenantId);
      if (existing) return existing;
    }
    const response = await fetch(`${API_BASE}/tenants/${tenantId}`);
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    if (payload.success && payload.tenant) {
      upsertCache(payload.tenant);
      return payload.tenant;
    }
    return null;
  }

  function upsertCache(tenant) {
    const idx = cache.findIndex((item) => item.tenant_id === tenant.tenant_id);
    if (idx >= 0) {
      cache[idx] = { ...cache[idx], ...tenant };
    } else {
      cache.push(tenant);
    }
  }

  async function upsertTenant(config) {
    const response = await fetch(`${API_BASE}/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to save tenant');
    }
    const payload = await response.json();
    if (payload.success && payload.tenant) {
      upsertCache(payload.tenant);
      return payload.tenant;
    }
    return null;
  }

  async function provisionTenant(tenantId) {
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/provision`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Provisioning failed');
    }
    const payload = await response.json();
    if (payload.success && payload.tenant) {
      upsertCache(payload.tenant);
      return payload.tenant;
    }
    return null;
  }

  async function verifyTenant(tenantId) {
    const response = await fetch(`${API_BASE}/tenants/${tenantId}/verify`);
    if (!response.ok) {
      throw new Error('Verification failed');
    }
    return response.json();
  }

  return {
    hydrate,
    listTenants,
    refresh: refreshTenants,
    getTenant,
    getCachedTenant,
    upsertTenant,
    provisionTenant,
    verifyTenant
  };
})();

if (typeof window !== 'undefined') {
  window.TenantService = TenantService;
}
