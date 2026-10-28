/**
 * Migration 006: Audit Module Schema
 * Creates tables for audit control, assignments, items, responses, and evidence
 */

export async function up(client) {
  // Create audits schema
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS audits;
  `);

  // Source documents table (extends existing documents concept)
  await client.query(`
    CREATE TABLE IF NOT EXISTS audits.source_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
      document_id UUID, -- Reference to customer_data.documents if exists
      source_type TEXT NOT NULL CHECK (source_type IN ('STANDARD', 'REGULATION', 'CUSTOMER', 'CHECKLIST')),
      name TEXT NOT NULL,
      code TEXT, -- e.g., 'ISO9001', '14CFR21'
      revision TEXT,
      authority TEXT, -- e.g., 'ISO', 'FAA'
      jurisdiction TEXT, -- e.g., 'United States'
      file_path TEXT,
      extracted_text TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      extracted_at TIMESTAMP WITH TIME ZONE
    );
  `);

  // Requirements table (normalized requirement nodes)
  await client.query(`
    CREATE TABLE IF NOT EXISTS audits.requirements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
      source_document_id UUID REFERENCES audits.source_documents(id) ON DELETE CASCADE,
      requirement_ref TEXT NOT NULL, -- e.g., '7.5.3.2', '14 CFR 21.137(a)'
      requirement_text TEXT NOT NULL,
      requirement_type TEXT, -- 'shall', 'must', 'should', etc.
      clause_number TEXT, -- Denormalized for quick lookup
      section_key TEXT, -- For regulations
      keywords TEXT[],
      tags TEXT[],
      metadata JSONB DEFAULT '{}'::jsonb,
      extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Audit templates (optional, for future use)
  await client.query(`
    CREATE TABLE IF NOT EXISTS audits.audit_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      template_json JSONB NOT NULL,
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Audits table
  await client.query(`
    CREATE TABLE IF NOT EXISTS audits.audits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      audit_type TEXT CHECK (audit_type IN ('STANDARD', 'REGULATION', 'CUSTOMER', 'CHECKLIST', 'MIXED')),
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'RETURNED', 'CLOSED', 'ARCHIVED')),
      due_date DATE,
      scheduled_date DATE,
      audit_pack_json JSONB, -- Full audit pack JSON
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      closed_at TIMESTAMP WITH TIME ZONE
    );
  `);

  // Audit assignments (who is assigned to which audit)
  await client.query(`
    CREATE TABLE IF NOT EXISTS audits.audit_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      audit_id UUID NOT NULL REFERENCES audits.audits(id) ON DELETE CASCADE,
      assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES auth.users(id),
      role TEXT CHECK (role IN ('Lead Auditor', 'Internal Assessor')),
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(audit_id, assigned_to)
    );
  `);

  // Audit items (checklist items)
  await client.query(`
    CREATE TABLE IF NOT EXISTS audits.audit_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      audit_id UUID NOT NULL REFERENCES audits.audits(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL CHECK (source_type IN ('STANDARD', 'REGULATION', 'CUSTOMER', 'CHECKLIST')),
      requirement_id UUID REFERENCES audits.requirements(id) ON DELETE SET NULL,
      requirement_ref TEXT NOT NULL, -- e.g., '7.5.3.2'
      requirement_text TEXT NOT NULL,
      question TEXT NOT NULL,
      evidence_expectations JSONB DEFAULT '{}'::jsonb,
      grouping_section TEXT, -- e.g., 'Section A: Standards'
      grouping_subsection TEXT,
      sort_order INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Audit responses (answers to audit items)
  await client.query(`
    CREATE TABLE IF NOT EXISTS audits.audit_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      audit_id UUID NOT NULL REFERENCES audits.audits(id) ON DELETE CASCADE,
      audit_item_id UUID NOT NULL REFERENCES audits.audit_items(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
      response_text TEXT,
      conformance_status TEXT CHECK (conformance_status IN ('CONFORMANT', 'NON_CONFORMANT', 'PARTIAL', 'NOT_APPLICABLE', 'PENDING')),
      response_by UUID REFERENCES auth.users(id),
      responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(audit_id, audit_item_id)
    );
  `);

  // Audit evidence (uploaded evidence documents)
  await client.query(`
    CREATE TABLE IF NOT EXISTS audits.audit_evidence (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      audit_id UUID NOT NULL REFERENCES audits.audits(id) ON DELETE CASCADE,
      audit_item_id UUID REFERENCES audits.audit_items(id) ON DELETE SET NULL,
      tenant_id UUID REFERENCES auth.tenants(id) ON DELETE CASCADE,
      document_id UUID, -- Reference to customer_data.documents if exists
      file_name TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT,
      uploaded_by UUID REFERENCES auth.users(id),
      uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    );
  `);

  // Audit state history (audit trail)
  await client.query(`
    CREATE TABLE IF NOT EXISTS audits.audit_state_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      audit_id UUID NOT NULL REFERENCES audits.audits(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by UUID REFERENCES auth.users(id),
      change_reason TEXT,
      changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_source_docs_tenant ON audits.source_documents(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_source_docs_type ON audits.source_documents(source_type);
    CREATE INDEX IF NOT EXISTS idx_requirements_tenant ON audits.requirements(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_requirements_source ON audits.requirements(source_document_id);
    CREATE INDEX IF NOT EXISTS idx_requirements_ref ON audits.requirements(requirement_ref);
    CREATE INDEX IF NOT EXISTS idx_audits_tenant ON audits.audits(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audits_status ON audits.audits(status);
    CREATE INDEX IF NOT EXISTS idx_audits_created_by ON audits.audits(created_by);
    CREATE INDEX IF NOT EXISTS idx_audit_assignments_audit ON audits.audit_assignments(audit_id);
    CREATE INDEX IF NOT EXISTS idx_audit_assignments_user ON audits.audit_assignments(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_audit_items_audit ON audits.audit_items(audit_id);
    CREATE INDEX IF NOT EXISTS idx_audit_items_tenant ON audits.audit_items(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_responses_audit ON audits.audit_responses(audit_id);
    CREATE INDEX IF NOT EXISTS idx_audit_responses_item ON audits.audit_responses(audit_item_id);
    CREATE INDEX IF NOT EXISTS idx_audit_evidence_audit ON audits.audit_evidence(audit_id);
    CREATE INDEX IF NOT EXISTS idx_audit_evidence_item ON audits.audit_evidence(audit_item_id);
    CREATE INDEX IF NOT EXISTS idx_audit_state_history_audit ON audits.audit_state_history(audit_id);
  `);
}

export async function down(client) {
  await client.query(`DROP TABLE IF EXISTS audits.audit_state_history CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS audits.audit_evidence CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS audits.audit_responses CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS audits.audit_items CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS audits.audit_assignments CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS audits.audits CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS audits.audit_templates CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS audits.requirements CASCADE;`);
  await client.query(`DROP TABLE IF EXISTS audits.source_documents CASCADE;`);
  await client.query(`DROP SCHEMA IF EXISTS audits CASCADE;`);
}
