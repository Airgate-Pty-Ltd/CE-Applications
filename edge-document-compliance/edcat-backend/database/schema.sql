-- Hour 1 baseline schema for EDCAT
-- Minimal tables for customers, assessments, and document uploads.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users manage access to the platform.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('master_admin', 'admin', 'analyst', 'viewer')),
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Customers represent tenant organizations using EDCAT.
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(40),
  customer_type VARCHAR(50) NOT NULL DEFAULT 'operator',
  industry VARCHAR(120),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_org_name ON customers(org_name);

-- Assessments capture compliance evaluations for a customer.
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assessment_name VARCHAR(255) NOT NULL,
  scope VARCHAR(120),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  purpose_primary VARCHAR(50),
  purpose_secondary VARCHAR(50),
  purpose_tags TEXT[],
  regulatory_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  standard_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  requirement_model JSONB,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assessments_customer ON assessments(customer_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);

-- Advanced analytics artifacts (Hour 6).
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  snapshot_type VARCHAR(60) NOT NULL,
  metrics JSONB NOT NULL,
  taken_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_assessment ON analytics_snapshots(assessment_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_type ON analytics_snapshots(snapshot_type);

CREATE TABLE IF NOT EXISTS predictive_compliance_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  forecast_period VARCHAR(30) NOT NULL,
  predicted_score NUMERIC(5,2) NOT NULL,
  confidence NUMERIC(5,2),
  risk_level VARCHAR(30),
  drivers JSONB,
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (assessment_id, forecast_period)
);

CREATE INDEX IF NOT EXISTS idx_predictive_scores_assessment ON predictive_compliance_scores(assessment_id);

CREATE TABLE IF NOT EXISTS audit_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  actor VARCHAR(255),
  action VARCHAR(255),
  details JSONB,
  activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_analytics_assessment ON audit_analytics(assessment_id);
CREATE INDEX IF NOT EXISTS idx_audit_analytics_customer ON audit_analytics(customer_id);

-- Documents uploaded as supporting evidence for assessments.
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(40),
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  parse_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  parse_error TEXT,
  extracted_text TEXT,
  last_parsed TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_assessment ON documents(assessment_id);
CREATE INDEX IF NOT EXISTS idx_documents_parse_status ON documents(parse_status);

-- Regulatory sources catalogue (Hour 2).
CREATE TABLE IF NOT EXISTS regulatory_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  region VARCHAR(100),
  source_type VARCHAR(50) NOT NULL DEFAULT 'standard',
  description TEXT,
  version_label VARCHAR(50),
  revision_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name)
);

CREATE INDEX IF NOT EXISTS idx_regulatory_sources_type ON regulatory_sources(source_type);

-- Requirements derived from regulatory sources.
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  regulatory_source_id UUID NOT NULL REFERENCES regulatory_sources(id) ON DELETE CASCADE,
  requirement_ref VARCHAR(120) NOT NULL,
  requirement_text TEXT NOT NULL,
  requirement_type VARCHAR(40),
  hierarchy_level INT DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(regulatory_source_id, requirement_ref)
);

CREATE INDEX IF NOT EXISTS idx_requirements_source ON requirements(regulatory_source_id);
CREATE INDEX IF NOT EXISTS idx_requirements_ref ON requirements(requirement_ref);

-- Parsed content chunks for search / NLP enrichment.
CREATE TABLE IF NOT EXISTS parsed_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parsed_content_doc ON parsed_content(document_id);

-- Reports metadata (Hour 4).
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  report_title VARCHAR(255) NOT NULL,
  generated_by VARCHAR(255),
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  content JSONB,
  retention_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_customer ON reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_reports_assessment ON reports(assessment_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);

-- Report files tracking for multi-format exports.
CREATE TABLE IF NOT EXISTS report_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  file_format VARCHAR(20) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hash_sha256 VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_report_files_report ON report_files(report_id);

-- Supporting documents tied to regulatory sources (standards, regulators).
CREATE TABLE IF NOT EXISTS regulatory_source_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  regulatory_source_id UUID NOT NULL REFERENCES regulatory_sources(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reg_source_documents_source ON regulatory_source_documents(regulatory_source_id);

-- AI regulatory intelligence ingestion results (bounded local processing)
CREATE TABLE IF NOT EXISTS regulatory_ingestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  regulatory_source_id UUID NOT NULL REFERENCES regulatory_sources(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  summary JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS regulatory_ingestion_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingestion_id UUID NOT NULL REFERENCES regulatory_ingestions(id) ON DELETE CASCADE,
  keyword VARCHAR(50),
  requirement_text TEXT NOT NULL,
  line_number INTEGER,
  confidence NUMERIC(5,2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reg_ingestions_source ON regulatory_ingestions(regulatory_source_id);
CREATE INDEX IF NOT EXISTS idx_reg_ingestion_requirements_ingestion ON regulatory_ingestion_requirements(ingestion_id);

-- System settings for global configuration.
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Legal content pages for compliance.
CREATE TABLE IF NOT EXISTS legal_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  published_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Email queue for notifications (Hour 5).
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  queued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);

-- Scheduled jobs registry.
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name VARCHAR(120) NOT NULL,
  cron_expression VARCHAR(50) NOT NULL,
  timezone VARCHAR(60) DEFAULT 'UTC',
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Job execution log for auditing.
CREATE TABLE IF NOT EXISTS job_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES scheduled_jobs(id) ON DELETE SET NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(30) NOT NULL,
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_exec_status ON job_executions(status);

-- Simple metrics table for admin dashboard.
CREATE TABLE IF NOT EXISTS system_metrics_snapshot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metric_key VARCHAR(120) NOT NULL,
  metric_value NUMERIC,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_metrics_key ON system_metrics_snapshot(metric_key);

-- Websocket sessions for realtime engine.
CREATE TABLE IF NOT EXISTS websocket_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  connection_id VARCHAR(120) NOT NULL UNIQUE,
  subscriptions JSONB DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Configuration feature flags per tenant (AI assistant etc.).
CREATE TABLE IF NOT EXISTS tenant_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY,
  ai_preferences JSONB DEFAULT '{}'::jsonb
);

-- Mobile devices and sync log.
CREATE TABLE IF NOT EXISTS mobile_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  device_name VARCHAR(255),
  device_os VARCHAR(40),
  app_version VARCHAR(40),
  fcm_token TEXT,
  last_sync TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mobile_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  device_id UUID REFERENCES mobile_devices(id) ON DELETE SET NULL,
  sync_type VARCHAR(20),
  changes_count INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Marketplace listings and installations.
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  category VARCHAR(100),
  tags TEXT[],
  pricing_type VARCHAR(30) DEFAULT 'free',
  price NUMERIC(10,2) DEFAULT 0,
  install_count INT DEFAULT 0,
  status VARCHAR(30) DEFAULT 'published',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketplace_installations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  installed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Simple workflows table for future expansion.
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  definition JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  rule_type VARCHAR(60) NOT NULL,
  conditions JSONB NOT NULL,
  action JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL,
  enqueued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  error TEXT
);

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_name VARCHAR(255) NOT NULL,
  assignee VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  due_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_task_id UUID REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  approver VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  comment TEXT,
  decided_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_workflow ON workflow_rules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_queue_status ON workflow_queue(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_workflow ON workflow_tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_approvals_task ON approvals(workflow_task_id);

-- Custom report builder (Hour 6).
CREATE TABLE IF NOT EXISTS custom_report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sections JSONB NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES custom_report_templates(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  parameters JSONB,
  status VARCHAR(40) NOT NULL DEFAULT 'generated',
  generated_by VARCHAR(255),
  file_path TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(120) NOT NULL,
  callback_url TEXT NOT NULL,
  secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_payload JSONB,
  response_code INT,
  response_body TEXT,
  delivered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_metrics_snapshot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_key VARCHAR(120) NOT NULL,
  metric_value NUMERIC(12,2) NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(120) NOT NULL,
  severity VARCHAR(40) NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_reports_template ON custom_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_assessment ON custom_reports(assessment_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_webhook ON webhook_delivery_log(webhook_id);
CREATE INDEX IF NOT EXISTS idx_metrics_key ON system_metrics_snapshot(metric_key);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
