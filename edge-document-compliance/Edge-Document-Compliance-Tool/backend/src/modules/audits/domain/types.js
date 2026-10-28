/**
 * Audit Module Domain Types
 * Type definitions for audit domain entities
 */

/**
 * @typedef {'DRAFT'|'SCHEDULED'|'IN_PROGRESS'|'SUBMITTED'|'RETURNED'|'CLOSED'|'ARCHIVED'} AuditStatus
 */

/**
 * @typedef {'STANDARD'|'REGULATION'|'CUSTOMER'|'CHECKLIST'|'MIXED'} AuditType
 */

/**
 * @typedef {'STANDARD'|'REGULATION'|'CUSTOMER'|'CHECKLIST'} SourceType
 */

/**
 * @typedef {'CONFORMANT'|'NON_CONFORMANT'|'PARTIAL'|'NOT_APPLICABLE'|'PENDING'} ConformanceStatus
 */

/**
 * @typedef {'Lead Auditor'|'Internal Assessor'|'Viewer'|'Admin'} RoleName
 */

/**
 * @typedef {Object} SourceDocument
 * @property {string} id - UUID
 * @property {string} tenant_id - UUID
 * @property {string|null} document_id - Reference to customer_data.documents
 * @property {SourceType} source_type
 * @property {string} name
 * @property {string|null} code
 * @property {string|null} revision
 * @property {string|null} authority
 * @property {string|null} jurisdiction
 * @property {string|null} file_path
 * @property {string|null} extracted_text
 * @property {Object} metadata
 * @property {Date} uploaded_at
 * @property {Date|null} extracted_at
 */

/**
 * @typedef {Object} Requirement
 * @property {string} id - UUID
 * @property {string} tenant_id - UUID
 * @property {string} source_document_id - UUID
 * @property {string} requirement_ref - e.g., '7.5.3.2'
 * @property {string} requirement_text
 * @property {string|null} requirement_type
 * @property {string|null} clause_number
 * @property {string|null} section_key
 * @property {string[]} keywords
 * @property {string[]} tags
 * @property {Object} metadata
 * @property {Date} extracted_at
 */

/**
 * @typedef {Object} Audit
 * @property {string} id - UUID
 * @property {string} tenant_id - UUID
 * @property {string} title
 * @property {string|null} description
 * @property {AuditType} audit_type
 * @property {AuditStatus} status
 * @property {Date|null} due_date
 * @property {Date|null} scheduled_date
 * @property {Object|null} audit_pack_json - Full audit pack JSON
 * @property {string} created_by - UUID
 * @property {Date} created_at
 * @property {Date} updated_at
 * @property {Date|null} closed_at
 */

/**
 * @typedef {Object} AuditItem
 * @property {string} id - UUID
 * @property {string} audit_id - UUID
 * @property {string} tenant_id - UUID
 * @property {SourceType} source_type
 * @property {string|null} requirement_id - UUID
 * @property {string} requirement_ref
 * @property {string} requirement_text
 * @property {string} question
 * @property {Object} evidence_expectations
 * @property {string|null} grouping_section
 * @property {string|null} grouping_subsection
 * @property {number} sort_order
 * @property {Object} metadata
 * @property {Date} created_at
 */

/**
 * @typedef {Object} AuditResponse
 * @property {string} id - UUID
 * @property {string} audit_id - UUID
 * @property {string} audit_item_id - UUID
 * @property {string} tenant_id - UUID
 * @property {string|null} response_text
 * @property {ConformanceStatus} conformance_status
 * @property {string|null} response_by - UUID
 * @property {Date} responded_at
 * @property {Date} updated_at
 */

/**
 * @typedef {Object} AuditAssignment
 * @property {string} id - UUID
 * @property {string} audit_id - UUID
 * @property {string} assigned_to - UUID
 * @property {string|null} assigned_by - UUID
 * @property {string} role
 * @property {Date} assigned_at
 */

/**
 * @typedef {Object} AuditEvidence
 * @property {string} id - UUID
 * @property {string} audit_id - UUID
 * @property {string|null} audit_item_id - UUID
 * @property {string} tenant_id - UUID
 * @property {string|null} document_id - UUID
 * @property {string} file_name
 * @property {string|null} file_path
 * @property {string|null} file_type
 * @property {string|null} uploaded_by - UUID
 * @property {Date} uploaded_at
 * @property {Object} metadata
 */

/**
 * @typedef {Object} AuditStateHistory
 * @property {string} id - UUID
 * @property {string} audit_id - UUID
 * @property {AuditStatus|null} from_status
 * @property {AuditStatus} to_status
 * @property {string|null} changed_by - UUID
 * @property {string|null} change_reason
 * @property {Date} changed_at
 */
