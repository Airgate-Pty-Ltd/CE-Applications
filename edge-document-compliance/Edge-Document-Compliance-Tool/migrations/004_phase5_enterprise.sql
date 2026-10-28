-- =============================================================================
-- EDCAT AI - PHASE 5: ENTERPRISE, MULTI-INDUSTRY, INTERNATIONAL, INTEGRATIONS
-- =============================================================================
-- Adds industry modules, i18n, regional compliance, integrations, API keys, audit logs
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- MULTI-INDUSTRY MODULES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS industry_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code VARCHAR(50) UNIQUE NOT NULL,
  module_name VARCHAR(255) NOT NULL,
  industry_sector VARCHAR(100),
  description TEXT,
  standards JSONB, -- Array of standard codes this module supports
  configuration JSONB, -- Module-specific settings
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_industry_module_code ON industry_modules(module_code);
CREATE INDEX IF NOT EXISTS idx_industry_sector ON industry_modules(industry_sector);

-- Tenant-specific module activation
CREATE TABLE IF NOT EXISTS tenant_industry_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  module_id UUID NOT NULL REFERENCES industry_modules(id),
  activated_at TIMESTAMP DEFAULT NOW(),
  configuration JSONB,
  UNIQUE(tenant_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules ON tenant_industry_modules(tenant_id);

-- ---------------------------------------------------------------------------
-- INTERNATIONALIZATION (i18n)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS i18n_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_key VARCHAR(255) NOT NULL,
  language_code VARCHAR(10) NOT NULL, -- e.g., 'en', 'es', 'fr', 'de', 'zh-CN'
  namespace VARCHAR(100) DEFAULT 'default', -- 'ui', 'reports', 'errors', etc.
  translated_text TEXT NOT NULL,
  context TEXT, -- Usage context/notes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(translation_key, language_code, namespace)
);

CREATE INDEX IF NOT EXISTS idx_i18n_key ON i18n_translations(translation_key);
CREATE INDEX IF NOT EXISTS idx_i18n_lang ON i18n_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_i18n_namespace ON i18n_translations(namespace);

-- Regional compliance mappings (e.g., ISO 9001:2015 → EN 9100:2018 in Europe)
CREATE TABLE IF NOT EXISTS regional_compliance_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_standard_code VARCHAR(100) NOT NULL,
  target_standard_code VARCHAR(100) NOT NULL,
  region_code VARCHAR(10) NOT NULL, -- 'US', 'EU', 'CN', 'JP', etc.
  mapping_type VARCHAR(50), -- 'equivalent', 'superset', 'subset', 'related'
  confidence_score DECIMAL(3,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_standard_code, target_standard_code, region_code)
);

CREATE INDEX IF NOT EXISTS idx_regional_source ON regional_compliance_mappings(source_standard_code);
CREATE INDEX IF NOT EXISTS idx_regional_target ON regional_compliance_mappings(target_standard_code);
CREATE INDEX IF NOT EXISTS idx_regional_region ON regional_compliance_mappings(region_code);

-- ---------------------------------------------------------------------------
-- INTEGRATION MARKETPLACE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type VARCHAR(50) NOT NULL, -- 'slack', 'teams', 'salesforce', 'jira', 'email', 'webhook'
  integration_name VARCHAR(255) NOT NULL,
  tenant_id UUID REFERENCES tenants(id), -- NULL = global/system integration
  configuration JSONB NOT NULL, -- Encrypted credentials, endpoints, etc.
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);

CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  event_type VARCHAR(50), -- 'notification_sent', 'data_synced', 'error', 'webhook_received'
  status VARCHAR(50), -- 'success', 'failed', 'pending'
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_integration ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created ON integration_logs(created_at);

-- ---------------------------------------------------------------------------
-- API KEYS & SECURITY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(255) NOT NULL UNIQUE, -- SHA-256 hash of the API key
  tenant_id UUID REFERENCES tenants(id),
  key_name VARCHAR(255),
  permissions JSONB, -- Array of allowed endpoints/scopes
  rate_limit_per_minute INT DEFAULT 60,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- ---------------------------------------------------------------------------
-- AUDIT LOGS (Enterprise Activity Tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id VARCHAR(100),
  action_type VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'export', 'login', 'api_call'
  resource_type VARCHAR(100), -- 'document', 'capa', 'training', 'standard', etc.
  resource_id UUID,
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  request_path VARCHAR(500),
  request_method VARCHAR(10),
  changes JSONB, -- Before/after for updates
  metadata JSONB, -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ---------------------------------------------------------------------------
-- SEED DEFAULT INDUSTRY MODULES
-- ---------------------------------------------------------------------------
INSERT INTO industry_modules (module_code, module_name, industry_sector, description, standards, configuration)
VALUES
  ('iso13485', 'ISO 13485 Medical Devices', 'Healthcare', 'Quality management for medical devices', 
   '["ISO 13485:2016", "FDA 21 CFR Part 820"]'::jsonb, 
   '{"requires_risk_management": true, "requires_sterilization": true}'::jsonb),
  ('iatf16949', 'IATF 16949 Automotive', 'Automotive', 'Quality management for automotive', 
   '["IATF 16949:2016", "ISO 9001:2015"]'::jsonb,
   '{"requires_apqp": true, "requires_ppap": true}'::jsonb),
  ('iso27001', 'ISO 27001 Information Security', 'IT/Security', 'Information security management', 
   '["ISO 27001:2022", "ISO 27002:2022"]'::jsonb,
   '{"requires_risk_assessment": true}'::jsonb),
  ('iso45001', 'ISO 45001 Occupational Health & Safety', 'Safety', 'OH&S management systems', 
   '["ISO 45001:2018"]'::jsonb,
   '{"requires_incident_tracking": true}'::jsonb),
  ('hipaa', 'HIPAA Healthcare Compliance', 'Healthcare', 'Health Insurance Portability and Accountability Act', 
   '["HIPAA", "HITECH"]'::jsonb,
   '{"requires_phi_protection": true}'::jsonb)
ON CONFLICT (module_code) DO NOTHING;

COMMIT;

