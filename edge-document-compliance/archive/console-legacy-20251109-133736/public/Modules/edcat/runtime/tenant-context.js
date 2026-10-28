// EDCAT: Tenant context loader.
// Determines active tenant/profile based on URL and exposes runtime configuration.

(function () {
  function getTenantIdFromUrl() {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('tenant_id');
    if (fromQuery) return fromQuery;

    const segments = url.pathname.split('/').filter(Boolean);
    const tenantIndex = segments.indexOf('tenants');
    if (tenantIndex !== -1 && segments[tenantIndex + 1]) {
      return segments[tenantIndex + 1];
    }

    return null;
  }

  function resolveTenantProvider() {
    if (window.TenantService && typeof window.TenantService.getTenant === 'function') {
      return {
        getTenant: window.TenantService.getTenant,
        getCachedTenant:
          typeof window.TenantService.getCachedTenant === 'function'
            ? window.TenantService.getCachedTenant
            : undefined
      };
    }
    if (window.TenantConfigStore && typeof window.TenantConfigStore.getTenant === 'function') {
      console.warn(
        '[EDCAT] TenantService not available. Falling back to legacy TenantConfigStore – data will not persist.'
      );
      return {
        getTenant: async (tenantId) => window.TenantConfigStore.getTenant(tenantId)
      };
    }
    return null;
  }

  function collectProfiles(profileIds) {
    if (!Array.isArray(profileIds) || !profileIds.length) {
      return [];
    }

    return profileIds
      .map((profileId) => window.ProfilesConfig.getProfile(profileId))
      .filter(Boolean);
  }

  function mergeRequirementPackIds(target, ids) {
    if (!Array.isArray(ids)) return;
    ids.forEach((id) => {
      if (id) target.add(id);
    });
  }

  async function loadTenantContext() {
    if (!window.ProfilesConfig || !window.RequirementsConfig) {
      console.error('EDCAT dependencies missing: ensure config modules are loaded.');
      return null;
    }

    const tenantId = getTenantIdFromUrl();
    if (!tenantId) {
      console.error('EDCAT: tenant_id not provided in URL.');
      return null;
    }

    const provider = resolveTenantProvider();
    if (!provider) {
      console.error('EDCAT: No tenant provider available. Ensure TenantService is loaded.');
      return null;
    }

    let tenant = provider.getCachedTenant ? provider.getCachedTenant(tenantId) : null;
    if (!tenant && provider.getTenant) {
      tenant = await provider.getTenant(tenantId, { force: true }).catch((error) => {
        console.error('EDCAT: Failed to resolve tenant from provider', error);
        return null;
      });
    }

    if (!tenant) {
      console.error('EDCAT: Unknown tenant_id', tenantId);
      return null;
    }

    const allowedProfiles = Array.isArray(tenant.allowed_profiles) ? tenant.allowed_profiles.slice() : [];
    const primaryProfileId =
      tenant.profile_id || tenant.active_profile_id || (allowedProfiles.length ? allowedProfiles[0] : null);

    if (primaryProfileId && !allowedProfiles.includes(primaryProfileId)) {
      allowedProfiles.unshift(primaryProfileId);
    }

    const profiles = collectProfiles(allowedProfiles.length ? allowedProfiles : [primaryProfileId]);

    if (!profiles.length) {
      console.error(
        'EDCAT: Tenant profile configuration missing. Ensure at least one valid profile is assigned.',
        allowedProfiles
      );
      return null;
    }

    const uniquePackIds = new Set();
    profiles.forEach((profile) => {
      mergeRequirementPackIds(uniquePackIds, profile.enabled_standards);
      mergeRequirementPackIds(uniquePackIds, profile.enabled_reg_packs);
    });

    mergeRequirementPackIds(uniquePackIds, tenant.standards_enabled);
    mergeRequirementPackIds(uniquePackIds, tenant.reg_packs_enabled);

    const requirementPacks = window.RequirementsConfig.getPacks(Array.from(uniquePackIds));

    return {
      tenant_id: tenantId,
      tenant,
      profiles,
      primaryProfileId,
      requirementPacks
    };
  }

  window.EdcatTenantContext = {
    loadTenantContext
  };
})();
