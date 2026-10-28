-- Edge Document Compliance Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers/Organizations table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  industry VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requirement sets unify standards, regulations, and customer requirements
CREATE TABLE IF NOT EXISTS requirement_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID,
  label VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(128),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE requirement_sets ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(128);

-- Standards uploaded into the platform
CREATE TABLE IF NOT EXISTS standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  title TEXT,
  version VARCHAR(50),
  issuing_body VARCHAR(255),
  category VARCHAR(100),
  source_type VARCHAR(50) DEFAULT 'standard',
  file_path TEXT,
  file_size INTEGER,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  parsed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'uploaded',
  requirement_set_id UUID REFERENCES requirement_sets(id) ON DELETE SET NULL,
  tenant_id VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE standards ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'standard';
ALTER TABLE standards ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE standards ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE standards ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE standards ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP;
ALTER TABLE standards ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'uploaded';
ALTER TABLE standards ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE standards ADD COLUMN IF NOT EXISTS requirement_set_id UUID REFERENCES requirement_sets(id) ON DELETE SET NULL;
ALTER TABLE standards ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(128);

-- Requirements extracted from requirement sets
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_set_id UUID REFERENCES requirement_sets(id) ON DELETE CASCADE,
  requirement_id VARCHAR(150),
  clause VARCHAR(150),
  requirement_text TEXT NOT NULL,
  source_name VARCHAR(255),
  source_type VARCHAR(50),
  category VARCHAR(255),
  keywords TEXT[],
  human_verified BOOLEAN DEFAULT FALSE,
  review_notes TEXT,
  last_reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS requirement_set_id UUID REFERENCES requirement_sets(id) ON DELETE CASCADE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS requirement_id VARCHAR(150);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS clause VARCHAR(150);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS source_name VARCHAR(255);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS category VARCHAR(255);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS human_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE requirements DROP COLUMN IF EXISTS standard_id;
ALTER TABLE requirements DROP COLUMN IF EXISTS requirement_type;
ALTER TABLE requirements DROP COLUMN IF EXISTS mandatory;
ALTER TABLE requirements DROP CONSTRAINT IF EXISTS requirements_standard_id_requirement_id_key;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS auto_verified BOOLEAN DEFAULT FALSE;

-- Compliance profiles (EDCAT)
CREATE TABLE IF NOT EXISTS edcat_profiles (
  profile_id VARCHAR(128) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  tenant_types_allowed TEXT[] DEFAULT '{}',
  enabled_standards TEXT[] DEFAULT '{}',
  enabled_reg_packs TEXT[] DEFAULT '{}',
  allow_customer_requirements BOOLEAN DEFAULT FALSE,
  regulator_links TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provisioned tenants (EDCAT)
CREATE TABLE IF NOT EXISTS edcat_tenants (
  tenant_id VARCHAR(128) PRIMARY KEY,
  tenant_name VARCHAR(255) NOT NULL,
  tenant_type VARCHAR(100) NOT NULL,
  tenant_types TEXT[] DEFAULT '{}',
  industry_sector VARCHAR(100),
  active_profile_id VARCHAR(128) REFERENCES edcat_profiles(profile_id),
  allowed_profiles TEXT[] DEFAULT '{}',
  base_url TEXT NOT NULL,
  base_path TEXT,
  company_legal_name VARCHAR(255),
  billing_contact_name VARCHAR(255),
  billing_contact_email VARCHAR(255),
  billing_contact_phone VARCHAR(50),
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_city VARCHAR(120),
  billing_state_region VARCHAR(120),
  billing_postal_code VARCHAR(40),
  billing_country VARCHAR(120),
  tax_id_vat VARCHAR(120),
  primary_admin_name VARCHAR(255),
  primary_admin_email VARCHAR(255),
  primary_admin_phone VARCHAR(50),
  technical_contact_name VARCHAR(255),
  technical_contact_email VARCHAR(255),
  technical_contact_phone VARCHAR(50),
  subscription_plan VARCHAR(60) DEFAULT 'trial',
  subscription_status VARCHAR(60) DEFAULT 'trial',
  subscription_start_date TIMESTAMP,
  subscription_renewal_date TIMESTAMP,
  max_users INTEGER DEFAULT 1,
  modules_enabled JSONB DEFAULT '{}'::JSONB,
  reg_packs_enabled TEXT[] DEFAULT '{}',
  standards_enabled TEXT[] DEFAULT '{}',
  db_instance_name VARCHAR(255),
  api_key_id VARCHAR(255),
  sso_enabled BOOLEAN DEFAULT FALSE,
  health_status VARCHAR(50) DEFAULT 'good',
  last_health_check TIMESTAMP,
  branding JSONB DEFAULT '{}'::JSONB,
  internal_notes TEXT,
  provisioned BOOLEAN DEFAULT FALSE,
  provisioned_at TIMESTAMP,
  customer_tables TEXT[] DEFAULT '{}',
  provision_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE edcat_tenants ADD COLUMN IF NOT EXISTS provisioned BOOLEAN DEFAULT FALSE;
ALTER TABLE edcat_tenants ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMP;
ALTER TABLE edcat_tenants ADD COLUMN IF NOT EXISTS customer_tables TEXT[] DEFAULT '{}';
ALTER TABLE edcat_tenants ADD COLUMN IF NOT EXISTS provision_error TEXT;

-- Organization documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  document_number VARCHAR(100),
  title VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  version VARCHAR(50),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_text TEXT,
  is_published BOOLEAN DEFAULT false,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  parsed_at TIMESTAMP,
  tenant_id VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(128);

-- Assessments consolidate requirement sets for a customer
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  customer VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'IN_PROGRESS',
  standard_set_ids UUID[] DEFAULT '{}',
  regulation_set_ids UUID[] DEFAULT '{}',
  customer_set_ids UUID[] DEFAULT '{}',
  progress INTEGER DEFAULT 0,
  fulfilled_requirements INTEGER DEFAULT 0,
  partial_requirements INTEGER DEFAULT 0,
  gap_count INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tenant_id VARCHAR(128) NOT NULL
);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS owner VARCHAR(255);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS customer VARCHAR(255);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'IN_PROGRESS';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS standard_set_ids UUID[] DEFAULT '{}';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS regulation_set_ids UUID[] DEFAULT '{}';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS customer_set_ids UUID[] DEFAULT '{}';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS fulfilled_requirements INTEGER DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS partial_requirements INTEGER DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS gap_count INTEGER DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE assessments ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE assessments DROP COLUMN IF EXISTS customer_id;
ALTER TABLE assessments DROP COLUMN IF EXISTS standard_id;
ALTER TABLE assessments DROP COLUMN IF EXISTS completed_at;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(128);

-- Gap registry for assessments
CREATE TABLE IF NOT EXISTS gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  evidence TEXT,
  owner VARCHAR(255),
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document to requirement mappings (evidence tracking)
CREATE TABLE IF NOT EXISTS document_requirement_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  coverage_score NUMERIC(5,2) DEFAULT 0,
  coverage_type VARCHAR(50),
  confidence_score NUMERIC(5,2) DEFAULT 0,
  matching_text TEXT,
  manual_override BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  user_name VARCHAR(255),
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requirements_set ON requirements(requirement_set_id);
CREATE INDEX IF NOT EXISTS idx_requirements_clause ON requirements(clause);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_assessments_customer ON assessments(customer);
CREATE INDEX IF NOT EXISTS idx_assessments_started ON assessments(started_at);
CREATE INDEX IF NOT EXISTS idx_gaps_assessment ON gaps(assessment_id);
CREATE INDEX IF NOT EXISTS idx_gaps_requirement ON gaps(requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_sets_label ON requirement_sets(label);
CREATE INDEX IF NOT EXISTS idx_requirement_sets_tenant ON requirement_sets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_standards_tenant ON standards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assessments_tenant ON assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_edcat_tenants_active_profile ON edcat_tenants(active_profile_id);
CREATE INDEX IF NOT EXISTS idx_edcat_tenants_health ON edcat_tenants(health_status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requirement_sets_updated_at ON requirement_sets;
CREATE TRIGGER update_requirement_sets_updated_at BEFORE UPDATE ON requirement_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_edcat_profiles_updated_at ON edcat_profiles;
CREATE TRIGGER update_edcat_profiles_updated_at BEFORE UPDATE ON edcat_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_edcat_tenants_updated_at ON edcat_tenants;
CREATE TRIGGER update_edcat_tenants_updated_at BEFORE UPDATE ON edcat_tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gaps_updated_at ON gaps;
CREATE TRIGGER update_gaps_updated_at BEFORE UPDATE ON gaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mappings_updated_at ON document_requirement_mappings;
CREATE TRIGGER update_mappings_updated_at BEFORE UPDATE ON document_requirement_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
