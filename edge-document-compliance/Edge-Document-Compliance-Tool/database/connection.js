import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DATABASE_POOL_SIZE, 10) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith('--'));
}

function extractCreateTableStatements(sql) {
  const statements = [];
  const regex = /CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const tableName = match[1];
    const statement = match[0];
    statements.push({ tableName, statement });
  }
  return statements;
}

async function ensureCustomersOrgNameColumn() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const columnExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'org_name'`
  );

  if (columnExists.rowCount === 0) {
    await query(`ALTER TABLE customers ADD COLUMN org_name VARCHAR(255)`);
    await query(`UPDATE customers SET org_name = COALESCE(org_name, 'Unknown Organization')`);
    await query(`ALTER TABLE customers ALTER COLUMN org_name SET NOT NULL`);
  }
}

async function ensureCustomersTypeColumn() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const columnExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'customer_type'`
  );

  if (columnExists.rowCount === 0) {
    await query(`ALTER TABLE customers ADD COLUMN customer_type VARCHAR(50) NOT NULL DEFAULT 'operator'`);
  }
}

async function ensureAssessmentsCustomerColumn() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const columnExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assessments' AND column_name = 'customer_id'`
  );

  if (columnExists.rowCount === 0) {
    await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS customer_id UUID`);
  }
}

async function ensureDocumentsAssessmentColumn() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const columnExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'assessment_id'`
  );

  if (columnExists.rowCount === 0) {
    await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS assessment_id UUID`);
  }
}

async function ensureDocumentsParseStatusColumn() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const columnExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'parse_status'`
  );

  if (columnExists.rowCount === 0) {
    await query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS parse_status VARCHAR(30) DEFAULT 'pending'`);
    await query(`UPDATE documents SET parse_status = COALESCE(parse_status, 'pending')`);
    await query(`ALTER TABLE documents ALTER COLUMN parse_status SET DEFAULT 'pending'`);
    await query(`ALTER TABLE documents ALTER COLUMN parse_status SET NOT NULL`);
  }
}

async function ensureAssessmentsCoreColumns() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS scope VARCHAR(120)`);

  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'`);
  await query(`UPDATE assessments SET status = 'draft' WHERE status IS NULL`);
  await query(`ALTER TABLE assessments ALTER COLUMN status SET NOT NULL`);
  await query(`ALTER TABLE assessments ALTER COLUMN status SET DEFAULT 'draft'`);

  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS purpose_primary VARCHAR(50)`);
  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS purpose_secondary VARCHAR(50)`);
  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS purpose_tags TEXT[]`);
  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS regulatory_ids TEXT[]`);
  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS standard_ids TEXT[]`);
  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS requirement_model JSONB`);

  await query(`UPDATE assessments SET regulatory_ids = ARRAY[]::TEXT[] WHERE regulatory_ids IS NULL`);
  await query(`UPDATE assessments SET standard_ids = ARRAY[]::TEXT[] WHERE standard_ids IS NULL`);

  await query(`ALTER TABLE assessments ALTER COLUMN regulatory_ids SET DEFAULT ARRAY[]::TEXT[]`);
  await query(`ALTER TABLE assessments ALTER COLUMN standard_ids SET DEFAULT ARRAY[]::TEXT[]`);

  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS notes TEXT`);
}

async function ensureRequirementsRegulatorySourceColumn() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'requirements'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const columnExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'requirements' AND column_name = 'regulatory_source_id'`
  );

  if (columnExists.rowCount === 0) {
    await query(`ALTER TABLE requirements ADD COLUMN IF NOT EXISTS regulatory_source_id UUID`);
  }
}

async function ensureRequirementsRefColumn() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'requirements'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const columnExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'requirements' AND column_name = 'requirement_ref'`
  );

  if (columnExists.rowCount === 0) {
    await query(`ALTER TABLE requirements ADD COLUMN IF NOT EXISTS requirement_ref VARCHAR(120)`);
  }
}

async function ensureParsedContentTable() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parsed_content'`
  );
  if (tableExists.rowCount === 0) {
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await query(`
      CREATE TABLE IF NOT EXISTS parsed_content (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID NOT NULL,
        chunk_index INT,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

async function ensureReportsTable() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports'`
  );
  if (tableExists.rowCount === 0) {
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        assessment_id UUID,
        customer_id UUID,
        report_type VARCHAR(50),
        report_title VARCHAR(255),
        generated_by VARCHAR(255),
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        content JSONB,
        retention_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

async function ensureReportFilesTable() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'report_files'`
  );
  if (tableExists.rowCount === 0) {
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await query(`
      CREATE TABLE IF NOT EXISTS report_files (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        report_id UUID,
        file_format VARCHAR(20),
        file_path TEXT,
        file_size BIGINT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hash_sha256 VARCHAR(128)
      )
    `);
  }
}

async function ensureUuidExtension() {
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
}

async function ensureTablesFromSchema(schemaSql) {
  const tables = extractCreateTableStatements(schemaSql);
  for (const { tableName, statement } of tables) {
    const tableExists = await query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    if (tableExists.rowCount === 0) {
      await query(statement);
    }
  }
}

async function ensureDocumentsTimestamps() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const uploadedAtExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_at'`
  );
  if (uploadedAtExists.rowCount === 0) {
    await query(`ALTER TABLE documents ADD COLUMN uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  }

  const updatedAtExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'updated_at'`
  );
  if (updatedAtExists.rowCount === 0) {
    await query(`ALTER TABLE documents ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  }
}

async function ensureAssessmentsTimestamps() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const createdAtExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assessments' AND column_name = 'created_at'`
  );
  if (createdAtExists.rowCount === 0) {
    await query(`ALTER TABLE assessments ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  }

  const updatedAtExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assessments' AND column_name = 'updated_at'`
  );
  if (updatedAtExists.rowCount === 0) {
    await query(`ALTER TABLE assessments ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  }
}

async function ensureEmailQueueTable() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_queue'`
  );
  if (tableExists.rowCount === 0) {
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'queued',
        queued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        error TEXT
      )
    `);
  }
}

async function ensureRegulatorySourceVersionColumns() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regulatory_sources'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const versionExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'regulatory_sources' AND column_name = 'version_label'`
  );
  if (versionExists.rowCount === 0) {
    await query(`ALTER TABLE regulatory_sources ADD COLUMN version_label VARCHAR(50)`);
  }

  const revisionExists = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'regulatory_sources' AND column_name = 'revision_date'`
  );
  if (revisionExists.rowCount === 0) {
    await query(`ALTER TABLE regulatory_sources ADD COLUMN revision_date DATE`);
  }
}

async function ensureAssessmentsPurposeColumns() {
  const tableExists = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments'`
  );
  if (tableExists.rowCount === 0) {
    return;
  }

  const columnsToEnsure = [
    { name: 'purpose_primary', type: 'VARCHAR(50)' },
    { name: 'purpose_secondary', type: 'VARCHAR(50)' },
    { name: 'purpose_tags', type: 'TEXT[]' }
  ];

  for (const column of columnsToEnsure) {
    const exists = await query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assessments' AND column_name = $1`,
      [column.name]
    );
    if (exists.rowCount === 0) {
      await query(`ALTER TABLE assessments ADD COLUMN ${column.name} ${column.type}`);
    }
  }
}

async function ensureRegulatoryDocumentsTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS regulatory_source_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        regulatory_source_id UUID NOT NULL REFERENCES regulatory_sources(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size BIGINT,
        uploaded_by VARCHAR(255),
        uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_reg_source_documents_source
       ON regulatory_source_documents(regulatory_source_id)`
  );
}

async function ensureRegulatoryIngestionTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS regulatory_ingestions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        regulatory_source_id UUID NOT NULL REFERENCES regulatory_sources(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'pending',
        summary JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
     )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS regulatory_ingestion_requirements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ingestion_id UUID NOT NULL REFERENCES regulatory_ingestions(id) ON DELETE CASCADE,
        keyword VARCHAR(50),
        requirement_text TEXT NOT NULL,
        line_number INTEGER,
        confidence NUMERIC(5,2),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_reg_ingestions_source
       ON regulatory_ingestions(regulatory_source_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_reg_ingestion_requirements_ingestion
       ON regulatory_ingestion_requirements(ingestion_id)`
  );
}

async function ensureAnalyticsTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS analytics_snapshots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
        snapshot_type VARCHAR(60) NOT NULL,
        metrics JSONB NOT NULL,
        taken_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_assessment
       ON analytics_snapshots(assessment_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_type
       ON analytics_snapshots(snapshot_type)`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS predictive_compliance_scores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        forecast_period VARCHAR(30) NOT NULL,
        predicted_score NUMERIC(5,2) NOT NULL,
        confidence NUMERIC(5,2),
        risk_level VARCHAR(30),
        drivers JSONB,
        generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (assessment_id, forecast_period)
     )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_predictive_scores_assessment
       ON predictive_compliance_scores(assessment_id)`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS audit_analytics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        actor VARCHAR(255),
        action VARCHAR(255),
        details JSONB,
        activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_audit_analytics_assessment
       ON audit_analytics(assessment_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_audit_analytics_customer
       ON audit_analytics(customer_id)`
  );
}

async function ensureWorkflowTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS workflow_rules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
        rule_type VARCHAR(60) NOT NULL,
        conditions JSONB NOT NULL,
        action JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS workflow_queue (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        payload JSONB NOT NULL,
        enqueued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        error TEXT
     )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS workflow_tasks (
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
     )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS approvals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workflow_task_id UUID REFERENCES workflow_tasks(id) ON DELETE CASCADE,
        approver VARCHAR(255) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        comment TEXT,
        decided_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_workflow_rules_workflow ON workflow_rules(workflow_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_workflow_queue_status ON workflow_queue(status)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_workflow_tasks_workflow ON workflow_tasks(workflow_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_approvals_task ON approvals(workflow_task_id)`
  );
}

async function ensureReportBuilderTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS custom_report_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sections JSONB NOT NULL,
        created_by VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS custom_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        template_id UUID REFERENCES custom_report_templates(id) ON DELETE SET NULL,
        assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        parameters JSONB,
        status VARCHAR(40) NOT NULL DEFAULT 'generated',
        generated_by VARCHAR(255),
        file_path TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_custom_reports_template ON custom_reports(template_id)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_custom_reports_assessment ON custom_reports(assessment_id)`
  );
}

async function ensureIntegrationTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS webhooks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_type VARCHAR(120) NOT NULL,
        callback_url TEXT NOT NULL,
        secret TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS webhook_delivery_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
        event_payload JSONB,
        response_code INT,
        response_body TEXT,
        delivered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event_type)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_webhook_delivery_webhook ON webhook_delivery_log(webhook_id)`
  );
}

async function ensureMonitoringTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS system_metrics_snapshot (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        metric_key VARCHAR(120) NOT NULL,
        metric_value NUMERIC(12,2) NOT NULL,
        recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE TABLE IF NOT EXISTS system_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        alert_type VARCHAR(120) NOT NULL,
        severity VARCHAR(40) NOT NULL,
        message TEXT NOT NULL,
        context JSONB,
        acknowledged_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_metrics_key ON system_metrics_snapshot(metric_key)`
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity)`
  );
}

async function ensureGapAnalysisSchema() {
  const gapAnalysisSchemaPath = path.join(__dirname, 'gap-analysis-schema.sql');
  if (fs.existsSync(gapAnalysisSchemaPath)) {
    const gapAnalysisSchema = fs.readFileSync(gapAnalysisSchemaPath, 'utf8');
    
    // Split statements, handling DO $$ blocks specially
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    const lines = gapAnalysisSchema.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('--')) {
        continue;
      }
      
      // Detect start of DO $$ block
      if (line.startsWith('DO $$')) {
        inDoBlock = true;
        doBlockDepth = 1;
        currentStatement = line + '\n';
        continue;
      }
      
      // Track DO block depth (looking for $$; to end)
      if (inDoBlock) {
        currentStatement += line + '\n';
        if (line.includes('$$')) {
          doBlockDepth--;
          if (doBlockDepth === 0 && line.endsWith(';')) {
            statements.push(currentStatement.trim());
            currentStatement = '';
            inDoBlock = false;
          }
        }
        continue;
      }
      
      // Regular statement
      currentStatement += line;
      if (line.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else {
        currentStatement += '\n';
      }
    }
    
    // Execute statements
    for (const statement of statements) {
      if (!statement) continue;
      try {
        await query(statement);
      } catch (error) {
        const isExtensionStatement = /CREATE\s+EXTENSION/i.test(statement);
        const isPermissionIssue = error.message && /permission denied/i.test(error.message);
        if (isExtensionStatement && isPermissionIssue) {
          console.warn('[DB WARN]', 'Skipping pgvector extension creation due to permissions');
          continue;
        }
        // For DO blocks, log but don't fail (they handle their own errors)
        if (statement.trim().startsWith('DO $$')) {
          console.warn('[DB WARN]', 'DO block execution warning:', error.message);
          continue;
        }
        // For other errors, log but continue (non-critical schema additions)
        console.warn('[DB WARN]', 'Schema statement warning:', error.message);
        continue;
      }
    }
  }
}

async function ensureLegacyPatches(schemaSql) {
  await ensureUuidExtension();
  await ensureTablesFromSchema(schemaSql);
  await ensureParsedContentTable();
  await ensureReportsTable();
  await ensureReportFilesTable();
  await ensureEmailQueueTable();
  await ensureCustomersOrgNameColumn();
  await ensureCustomersTypeColumn();
  await ensureAssessmentsTimestamps();
  await ensureAssessmentsCustomerColumn();
  await ensureDocumentsAssessmentColumn();
  await ensureDocumentsParseStatusColumn();
  await ensureDocumentsTimestamps();
  await ensureRequirementsRegulatorySourceColumn();
  await ensureRequirementsRefColumn();
  await ensureRegulatorySourceVersionColumns();
  await ensureRegulatoryDocumentsTable();
  await ensureRegulatoryIngestionTables();
  await ensureAssessmentsPurposeColumns();
  await ensureAnalyticsTables();
  await ensureWorkflowTables();
  await ensureAssessmentsCoreColumns();
  await ensureReportBuilderTables();
  await ensureIntegrationTables();
  await ensureMonitoringTables();
  await ensureGapAnalysisSchema();
  await ensureDynamicStandardsSchema();
}

async function ensureDynamicStandardsSchema() {
  const dynamicStandardsSchemaPath = path.join(__dirname, 'dynamic-standards-schema.sql');
  if (fs.existsSync(dynamicStandardsSchemaPath)) {
    const dynamicStandardsSchema = fs.readFileSync(dynamicStandardsSchemaPath, 'utf8');
    
    // Split statements, handling DO $$ blocks specially
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    const lines = dynamicStandardsSchema.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('--')) {
        continue;
      }
      
      // Detect start of DO $$ block
      if (line.startsWith('DO $$')) {
        inDoBlock = true;
        doBlockDepth = 1;
        currentStatement = line + '\n';
        continue;
      }
      
      // Track DO block depth
      if (inDoBlock) {
        currentStatement += line + '\n';
        if (line.includes('$$')) {
          doBlockDepth--;
          if (doBlockDepth === 0 && line.endsWith(';')) {
            statements.push(currentStatement.trim());
            currentStatement = '';
            inDoBlock = false;
          }
        }
        continue;
      }
      
      // Regular statement
      currentStatement += line;
      if (line.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else {
        currentStatement += '\n';
      }
    }
    
    // Execute statements
    for (const statement of statements) {
      if (!statement) continue;
      try {
        await query(statement);
      } catch (error) {
        // Log but continue for non-critical schema additions
        console.warn('[DB WARN]', 'Dynamic standards schema statement warning:', error.message);
        continue;
      }
    }
  }
}

export async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[DB QUERY]', { text: text.substring(0, 50), duration, rows: result.rows.length });
    return result;
  } catch (error) {
    console.error('[DB ERROR]', { text, error: error.message });
    throw error;
  }
}

export async function applySchema(sql) {
  await ensureLegacyPatches(sql);
  const statements = splitStatements(sql);
  for (const statement of statements) {
    try {
      await query(statement);
    } catch (error) {
      const isExtensionStatement = /CREATE\s+EXTENSION/i.test(statement);
      const isPermissionIssue = error.message && /permission denied/i.test(error.message);
      if (isExtensionStatement && isPermissionIssue) {
        console.warn('[DB WARN]', 'Skipping extension creation due to permissions');
        continue;
      }
      throw error;
    }
  }
}

export async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await applySchema(schema);
}

export async function getClient() {
  return pool.connect();
}

export default pool;

