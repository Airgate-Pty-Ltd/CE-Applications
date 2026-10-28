/**
 * Audit Domain Validators
 * Validation functions for audit domain entities
 */

/**
 * Validate audit status transition
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean} - True if transition is valid
 */
export function isValidStatusTransition(fromStatus, toStatus) {
  const validTransitions = {
    'DRAFT': ['SCHEDULED', 'CLOSED'],
    'SCHEDULED': ['IN_PROGRESS', 'DRAFT'],
    'IN_PROGRESS': ['SUBMITTED', 'DRAFT'],
    'SUBMITTED': ['RETURNED', 'CLOSED'],
    'RETURNED': ['IN_PROGRESS', 'DRAFT'],
    'CLOSED': ['ARCHIVED'],
    'ARCHIVED': [] // Terminal state
  };

  const allowed = validTransitions[fromStatus] || [];
  return allowed.includes(toStatus);
}

/**
 * Validate source type
 * @param {string} sourceType - Source type to validate
 * @returns {boolean} - True if valid
 */
export function isValidSourceType(sourceType) {
  return ['STANDARD', 'REGULATION', 'CUSTOMER', 'CHECKLIST'].includes(sourceType);
}

/**
 * Validate audit type
 * @param {string} auditType - Audit type to validate
 * @returns {boolean} - True if valid
 */
export function isValidAuditType(auditType) {
  return ['STANDARD', 'REGULATION', 'CUSTOMER', 'CHECKLIST', 'MIXED'].includes(auditType);
}

/**
 * Validate conformance status
 * @param {string} status - Conformance status to validate
 * @returns {boolean} - True if valid
 */
export function isValidConformanceStatus(status) {
  return ['CONFORMANT', 'NON_CONFORMANT', 'PARTIAL', 'NOT_APPLICABLE', 'PENDING'].includes(status);
}

/**
 * Validate requirement reference format
 * @param {string} ref - Requirement reference
 * @param {string} sourceType - Source type
 * @returns {boolean} - True if format matches source type
 */
export function isValidRequirementRef(ref, sourceType) {
  if (!ref || typeof ref !== 'string') return false;

  if (sourceType === 'STANDARD') {
    // Standard clause format: 7.5.3.2, 8.2.1, etc.
    return /^\d+(\.\d+)*$/.test(ref);
  } else if (sourceType === 'REGULATION') {
    // Regulation format: 14 CFR 21.137(a), etc.
    return /CFR|regulation|part|section/i.test(ref) || /^\d+/.test(ref);
  } else if (sourceType === 'CUSTOMER' || sourceType === 'CHECKLIST') {
    // Customer/checklist can be any format
    return ref.length > 0;
  }

  return false;
}

/**
 * Validate role name
 * @param {string} roleName - Role name to validate
 * @returns {boolean} - True if valid
 */
export function isValidRole(roleName) {
  return ['Lead Auditor', 'Internal Assessor', 'Viewer', 'Admin'].includes(roleName);
}
