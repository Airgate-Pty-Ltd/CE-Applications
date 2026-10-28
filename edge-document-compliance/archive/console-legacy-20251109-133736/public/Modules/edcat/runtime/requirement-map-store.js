// EDCAT: Requirement mapping storage abstraction (front-end simulation).
// Replace with persistent storage when integrating backend APIs.

const RequirementMapStore = (function () {
  const mappingsByTenant = {};

  function ensureTenant(tenantId) {
    if (!mappingsByTenant[tenantId]) {
      mappingsByTenant[tenantId] = [];
    }
  }

  function saveMappings(tenantId, mappings) {
    if (!tenantId) throw new Error('RequirementMapStore.saveMappings requires tenantId');
    ensureTenant(tenantId);
    mappingsByTenant[tenantId] = Array.isArray(mappings) ? mappings.slice() : [];
  }

  function getByTenantAndDocument(tenantId, documentId) {
    ensureTenant(tenantId);
    return mappingsByTenant[tenantId].filter((mapping) => mapping.document_id === documentId);
  }

  function getByTenantAndRequirement(tenantId, requirementId) {
    ensureTenant(tenantId);
    return mappingsByTenant[tenantId].filter((mapping) => mapping.requirement_id === requirementId);
  }

  return {
    saveMappings,
    getByTenantAndDocument,
    getByTenantAndRequirement
  };
})();

if (typeof window !== 'undefined') {
  window.RequirementMapStore = RequirementMapStore;
}

