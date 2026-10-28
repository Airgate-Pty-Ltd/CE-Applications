# Audit Module Database Schema

This document describes the database schema for the Audit module integrated into EDC.

## Schemas

### `auth` Schema
Authentication and authorization tables.

#### Tables
- `tenants` - Multi-tenant support
- `roles` - Role definitions (Lead Auditor, Internal Assessor, Viewer, Admin)
- `users` - User accounts
- `user_roles` - User-role assignments

### `audits` Schema
Audit control and checklist management.

#### Tables

##### `source_documents`
Uploaded standards, regulations, customer requirements, and checklists.

**Columns:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → auth.tenants)
- `document_id` (UUID, nullable) - Reference to customer_data.documents
- `source_type` (TEXT) - STANDARD, REGULATION, CUSTOMER, CHECKLIST
- `name` (TEXT) - Document name
- `code` (TEXT, nullable) - Standard/regulation code
- `revision` (TEXT, nullable) - Version/revision
- `authority` (TEXT, nullable) - Authority (e.g., 'ISO', 'FAA')
- `jurisdiction` (TEXT, nullable) - Jurisdiction
- `file_path` (TEXT, nullable) - File storage path
- `extracted_text` (TEXT, nullable) - Extracted text content
- `metadata` (JSONB) - Additional metadata
- `uploaded_at` (TIMESTAMP)
- `extracted_at` (TIMESTAMP, nullable)

##### `requirements`
Normalized requirement nodes extracted from source documents.

**Columns:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → auth.tenants)
- `source_document_id` (UUID, FK → audits.source_documents)
- `requirement_ref` (TEXT) - Human-readable reference (e.g., '7.5.3.2', '14 CFR 21.137(a)')
- `requirement_text` (TEXT) - Full requirement text
- `requirement_type` (TEXT, nullable) - 'shall', 'must', 'should', etc.
- `clause_number` (TEXT, nullable) - Clause number for standards
- `section_key` (TEXT, nullable) - Section key for regulations
- `keywords` (TEXT[]) - Extracted keywords
- `tags` (TEXT[]) - Tags
- `metadata` (JSONB) - Additional metadata
- `extracted_at` (TIMESTAMP)

##### `audits`
Audit records.

**Columns:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → auth.tenants)
- `title` (TEXT) - Audit title
- `description` (TEXT, nullable) - Audit description
- `audit_type` (TEXT) - STANDARD, REGULATION, CUSTOMER, CHECKLIST, MIXED
- `status` (TEXT) - DRAFT, SCHEDULED, IN_PROGRESS, SUBMITTED, RETURNED, CLOSED, ARCHIVED
- `due_date` (DATE, nullable)
- `scheduled_date` (DATE, nullable)
- `audit_pack_json` (JSONB, nullable) - Full audit pack JSON
- `created_by` (UUID, FK → auth.users)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `closed_at` (TIMESTAMP, nullable)

**Status Transitions:**
- DRAFT → SCHEDULED, CLOSED
- SCHEDULED → IN_PROGRESS, DRAFT
- IN_PROGRESS → SUBMITTED, DRAFT
- SUBMITTED → RETURNED, CLOSED
- RETURNED → IN_PROGRESS, DRAFT
- CLOSED → ARCHIVED
- ARCHIVED → (terminal)

##### `audit_assignments`
Auditor assignments to audits.

**Columns:**
- `id` (UUID, PK)
- `audit_id` (UUID, FK → audits.audits)
- `assigned_to` (UUID, FK → auth.users)
- `assigned_by` (UUID, FK → auth.users, nullable)
- `role` (TEXT) - 'Lead Auditor' or 'Internal Assessor'
- `assigned_at` (TIMESTAMP)

**Constraints:**
- UNIQUE(audit_id, assigned_to)

##### `audit_items`
Checklist items (requirements to be assessed).

**Columns:**
- `id` (UUID, PK)
- `audit_id` (UUID, FK → audits.audits)
- `tenant_id` (UUID, FK → auth.tenants)
- `source_type` (TEXT) - STANDARD, REGULATION, CUSTOMER, CHECKLIST
- `requirement_id` (UUID, FK → audits.requirements, nullable)
- `requirement_ref` (TEXT) - Display reference
- `requirement_text` (TEXT) - Requirement text
- `question` (TEXT) - Audit question
- `evidence_expectations` (JSONB) - Expected evidence types/criteria
- `grouping_section` (TEXT, nullable) - Section grouping (e.g., 'Section A: Standards')
- `grouping_subsection` (TEXT, nullable)
- `sort_order` (INTEGER) - Display order
- `metadata` (JSONB)
- `created_at` (TIMESTAMP)

##### `audit_responses`
Responses to audit items.

**Columns:**
- `id` (UUID, PK)
- `audit_id` (UUID, FK → audits.audits)
- `audit_item_id` (UUID, FK → audits.audit_items)
- `tenant_id` (UUID, FK → auth.tenants)
- `response_text` (TEXT, nullable) - Narrative response
- `conformance_status` (TEXT) - CONFORMANT, NON_CONFORMANT, PARTIAL, NOT_APPLICABLE, PENDING
- `response_by` (UUID, FK → auth.users, nullable)
- `responded_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Constraints:**
- UNIQUE(audit_id, audit_item_id)

##### `audit_evidence`
Evidence documents uploaded for audit items.

**Columns:**
- `id` (UUID, PK)
- `audit_id` (UUID, FK → audits.audits)
- `audit_item_id` (UUID, FK → audits.audit_items, nullable)
- `tenant_id` (UUID, FK → auth.tenants)
- `document_id` (UUID, nullable) - Reference to customer_data.documents
- `file_name` (TEXT) - Original filename
- `file_path` (TEXT, nullable) - Storage path
- `file_type` (TEXT, nullable) - MIME type
- `uploaded_by` (UUID, FK → auth.users, nullable)
- `uploaded_at` (TIMESTAMP)
- `metadata` (JSONB)

##### `audit_state_history`
Audit trail of state changes.

**Columns:**
- `id` (UUID, PK)
- `audit_id` (UUID, FK → audits.audits)
- `from_status` (TEXT, nullable) - Previous status
- `to_status` (TEXT) - New status
- `changed_by` (UUID, FK → auth.users, nullable)
- `change_reason` (TEXT, nullable) - Reason for change
- `changed_at` (TIMESTAMP)

##### `audit_templates`
Audit templates (optional, for future use).

**Columns:**
- `id` (UUID, PK)
- `tenant_id` (UUID, FK → auth.tenants)
- `name` (TEXT)
- `description` (TEXT, nullable)
- `template_json` (JSONB) - Template definition
- `created_by` (UUID, FK → auth.users, nullable)
- `created_at` (TIMESTAMP)

## Indexes

All foreign keys are indexed. Additional indexes:
- `idx_source_docs_tenant` on `source_documents(tenant_id)`
- `idx_source_docs_type` on `source_documents(source_type)`
- `idx_requirements_tenant` on `requirements(tenant_id)`
- `idx_requirements_source` on `requirements(source_document_id)`
- `idx_requirements_ref` on `requirements(requirement_ref)`
- `idx_audits_tenant` on `audits(tenant_id)`
- `idx_audits_status` on `audits(status)`
- `idx_audits_created_by` on `audits(created_by)`
- `idx_audit_assignments_audit` on `audit_assignments(audit_id)`
- `idx_audit_assignments_user` on `audit_assignments(assigned_to)`
- `idx_audit_items_audit` on `audit_items(audit_id)`
- `idx_audit_items_tenant` on `audit_items(tenant_id)`
- `idx_audit_responses_audit` on `audit_responses(audit_id)`
- `idx_audit_responses_item` on `audit_responses(audit_item_id)`
- `idx_audit_evidence_audit` on `audit_evidence(audit_id)`
- `idx_audit_evidence_item` on `audit_evidence(audit_item_id)`
- `idx_audit_state_history_audit` on `audit_state_history(audit_id)`

## Relationships

```
auth.tenants
  └─ auth.users
      └─ audits.audits (created_by)
      └─ audits.audit_assignments (assigned_to, assigned_by)
      └─ audits.audit_responses (response_by)
      └─ audits.audit_evidence (uploaded_by)
      └─ audits.audit_state_history (changed_by)

audits.source_documents
  └─ audits.requirements (source_document_id)

audits.audits
  └─ audits.audit_assignments (audit_id)
  └─ audits.audit_items (audit_id)
  └─ audits.audit_responses (audit_id)
  └─ audits.audit_evidence (audit_id)
  └─ audits.audit_state_history (audit_id)

audits.requirements
  └─ audits.audit_items (requirement_id)

audits.audit_items
  └─ audits.audit_responses (audit_item_id)
  └─ audits.audit_evidence (audit_item_id)
```

## Tenant Isolation

All audit-related tables include `tenant_id` for multi-tenant isolation. Queries should always filter by `tenant_id` to ensure data isolation.

## Migration Files

- `005_auth_schema.js` - Creates auth schema and tables
- `006_audit_schema.js` - Creates audits schema and tables
- `007_seed_auth_data.js` - Seeds default users and roles
