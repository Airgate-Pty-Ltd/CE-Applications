// EDCAT: Document metadata storage abstraction (front-end simulation).
// Replace with API-backed persistence when integrating real backend services.

const DocumentStore = (function () {
  const documentsByTenant = {};

  function ensureTenant(tenantId) {
    if (!documentsByTenant[tenantId]) {
      documentsByTenant[tenantId] = [];
    }
  }

  function saveMetadata(tenantId, docMeta) {
    if (!tenantId) throw new Error('DocumentStore.saveMetadata requires tenantId');
    ensureTenant(tenantId);

    const docs = documentsByTenant[tenantId];
    const index = docs.findIndex((doc) => doc.document_id === docMeta.document_id);
    if (index >= 0) {
      docs[index] = { ...docs[index], ...docMeta };
    } else {
      docs.push(docMeta);
    }
  }

  function listByTenant(tenantId, filters = {}) {
    ensureTenant(tenantId);
    let list = documentsByTenant[tenantId];

    if (filters.doc_type) {
      list = list.filter((doc) => doc.doc_type === filters.doc_type);
    }

    return list;
  }

  return {
    saveMetadata,
    listByTenant
  };
})();

if (typeof window !== 'undefined') {
  window.DocumentStore = DocumentStore;
}

