/**
 * TypeScript-like types for Audit Pack (JavaScript with JSDoc)
 * Generated from audit_pack.schema.json
 */

/**
 * @typedef {Object} AuditPackSource
 * @property {string} sourceId - UUID reference to source_documents table
 * @property {'STANDARD'|'REGULATION'|'CUSTOMER'|'CHECKLIST'} sourceType
 * @property {string} name - Display name
 * @property {string} [code] - Standard/regulation code
 * @property {string} [revision] - Version/revision
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} EvidenceExpectations
 * @property {Array<'Procedure'|'WorkInstruction'|'Form'|'Record'|'Manual'|'Register'|'Policy'|'Plan'|'Other'>} [docTypes]
 * @property {string[]} [keywords]
 * @property {string} [criteria]
 */

/**
 * @typedef {Object} ItemGrouping
 * @property {string} [section] - Section name
 * @property {string} [subsection] - Subsection name
 * @property {number} [sortOrder] - Display order
 */

/**
 * @typedef {Object} AuditPackItem
 * @property {string} itemId - UUID
 * @property {'STANDARD'|'REGULATION'|'CUSTOMER'|'CHECKLIST'} sourceType
 * @property {string|null} requirementId - UUID reference to requirements table
 * @property {string} requirementRef - Human-readable reference
 * @property {string} requirementText - Full requirement text
 * @property {string} question - Audit question
 * @property {EvidenceExpectations} evidenceExpectations
 * @property {ItemGrouping} [grouping]
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} AuditPackFilters
 * @property {string} [scope]
 * @property {'high'|'medium'|'low'} [granularity]
 * @property {'minimal'|'standard'|'comprehensive'} [evidenceDepth]
 * @property {string[]} [clausePrefixes]
 */

/**
 * @typedef {Object} AuditPack
 * @property {string} version - Schema version (e.g., '1.0.0')
 * @property {string} auditId - UUID
 * @property {string} generatedAt - ISO 8601 timestamp
 * @property {AuditPackSource[]} sources
 * @property {AuditPackItem[]} items
 * @property {AuditPackFilters} [filters]
 * @property {Object} [metadata]
 */

/**
 * Validate audit pack structure (basic validation)
 * @param {any} pack - Object to validate
 * @returns {boolean} - True if valid structure
 */
export function validateAuditPack(pack) {
  if (!pack || typeof pack !== 'object') return false;
  if (!pack.version || !pack.auditId || !pack.generatedAt) return false;
  if (!Array.isArray(pack.sources) || !Array.isArray(pack.items)) return false;
  
  // Validate sources
  for (const source of pack.sources) {
    if (!source.sourceId || !source.sourceType || !source.name) return false;
    if (!['STANDARD', 'REGULATION', 'CUSTOMER', 'CHECKLIST'].includes(source.sourceType)) return false;
  }
  
  // Validate items
  for (const item of pack.items) {
    if (!item.itemId || !item.sourceType || !item.requirementRef || !item.question) return false;
    if (!['STANDARD', 'REGULATION', 'CUSTOMER', 'CHECKLIST'].includes(item.sourceType)) return false;
    if (!item.evidenceExpectations || typeof item.evidenceExpectations !== 'object') return false;
  }
  
  return true;
}

/**
 * Create empty audit pack
 * @param {string} auditId - UUID
 * @returns {AuditPack}
 */
export function createEmptyAuditPack(auditId) {
  return {
    version: '1.0.0',
    auditId,
    generatedAt: new Date().toISOString(),
    sources: [],
    items: [],
    filters: {},
    metadata: {}
  };
}
