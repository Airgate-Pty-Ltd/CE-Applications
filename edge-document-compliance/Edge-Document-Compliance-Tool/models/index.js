import bcrypt from 'bcryptjs';
import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_SALT_ROUNDS = Number.parseInt(process.env.PASSWORD_SALT_ROUNDS || '12', 10);

export const User = {
  async list() {
    const result = await query(
      `SELECT id, email, full_name, role, status, last_login, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  async findById(id) {
    const result = await query(
      `SELECT id, email, full_name, role, status, last_login, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findWithPasswordByEmail(email) {
    const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
    return result.rows[0];
  },

  async create({ email, full_name, role, password, status = 'active' }) {
    const hashed = await bcrypt.hash(password, DEFAULT_SALT_ROUNDS);
    const result = await query(
      `INSERT INTO users (id, email, full_name, role, password_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, status, last_login, created_at, updated_at`,
      [uuidv4(), email, full_name, role, hashed, status]
    );
    return result.rows[0];
  },

  async update(id, { full_name, role, status }) {
    const result = await query(
      `UPDATE users
         SET full_name = COALESCE($1, full_name),
             role = COALESCE($2, role),
             status = COALESCE($3, status),
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, full_name, role, status, last_login, created_at, updated_at`,
      [full_name, role, status, id]
    );
    return result.rows[0];
  },

  async setPassword(id, password) {
    const hashed = await bcrypt.hash(password, DEFAULT_SALT_ROUNDS);
    const result = await query(
      `UPDATE users
         SET password_hash = $1,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, full_name, role, status, last_login, created_at, updated_at`,
      [hashed, id]
    );
    return result.rows[0];
  },

  async verifyPassword(email, password) {
    const user = await this.findWithPasswordByEmail(email);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status
    };
  }
};

export const Customer = {
  async create(data) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO customers (id, org_name, company_name, contact_name, contact_email, contact_phone, customer_type, industry)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        data.org_name,
        data.company_name || data.org_name,
        data.contact_name || null,
        data.contact_email || null,
        data.contact_phone || null,
        data.customer_type || 'operator',
        data.industry || null
      ]
    );
    return result.rows[0];
  },

  async getAll() {
    const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
    return result.rows;
  },

  async getById(id) {
    const result = await query('SELECT * FROM customers WHERE id = $1', [id]);
    return result.rows[0];
  },

  async update(id, data) {
    const result = await query(
      `UPDATE customers
         SET org_name = $1,
             company_name = $2,
             contact_name = $3,
             contact_email = $4,
             contact_phone = $5,
             customer_type = $6,
             industry = $7,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        data.org_name,
        data.company_name || data.org_name,
        data.contact_name || null,
        data.contact_email || null,
        data.contact_phone || null,
        data.customer_type || 'operator',
        data.industry || null,
        id
      ]
    );
    return result.rows[0];
  },

  async remove(id) {
    await query('DELETE FROM customers WHERE id = $1', [id]);
  }
};

export const Assessment = {
  async create(data) {
    const id = uuidv4();
    const purposeTags = Array.isArray(data.purpose_tags)
      ? data.purpose_tags
      : data.purpose_tags
      ? [data.purpose_tags]
      : null;
    const regulatoryIds = Array.isArray(data.regulatory_ids)
      ? data.regulatory_ids.map((entry) => entry.toString())
      : data.regulatory_ids
      ? [data.regulatory_ids.toString()]
      : [];
    const standardIds = Array.isArray(data.standard_ids)
      ? data.standard_ids.map((entry) => entry.toString())
      : data.standard_ids
      ? [data.standard_ids.toString()]
      : [];
    const requirementModel =
      data.requirement_model ||
      {
        generatedAt: new Date().toISOString(),
        regulators: [],
        standards: [],
        requirements: [],
        documents: [],
        meta: { note: 'auto-generated placeholder' }
      };
    
    // Check if owner column exists and handle it
    const ownerColumnExists = await query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assessments' AND column_name = 'owner'`
    );
    
    const ownerValue = data.owner || data.actor || 'system';
    
    if (ownerColumnExists.rowCount > 0) {
      // Include owner column if it exists
      const result = await query(
        `INSERT INTO assessments (id, customer_id, assessment_name, scope, status, notes, purpose_primary, purpose_secondary, purpose_tags, regulatory_ids, standard_ids, requirement_model, owner)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          id,
          data.customer_id,
          data.assessment_name,
          data.scope || null,
          data.status || 'draft',
          data.notes || null,
          data.purpose_primary || null,
          data.purpose_secondary || null,
          purposeTags,
          regulatoryIds,
          standardIds,
          requirementModel,
          ownerValue
        ]
      );
      return result.rows[0];
    } else {
      // Standard insert without owner column
      const result = await query(
        `INSERT INTO assessments (id, customer_id, assessment_name, scope, status, notes, purpose_primary, purpose_secondary, purpose_tags, regulatory_ids, standard_ids, requirement_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          id,
          data.customer_id,
          data.assessment_name,
          data.scope || null,
          data.status || 'draft',
          data.notes || null,
          data.purpose_primary || null,
          data.purpose_secondary || null,
          purposeTags,
          regulatoryIds,
          standardIds,
          requirementModel
        ]
      );
      return result.rows[0];
    }
  },

  async getAll() {
    const result = await query('SELECT * FROM assessments ORDER BY created_at DESC');
    return result.rows;
  },

  async getById(id) {
    const result = await query('SELECT * FROM assessments WHERE id = $1', [id]);
    return result.rows[0];
  },

  async update(id, data) {
    const purposeTags = Array.isArray(data.purpose_tags)
      ? data.purpose_tags
      : data.purpose_tags
      ? [data.purpose_tags]
      : null;
    const regulatoryIds = Array.isArray(data.regulatory_ids)
      ? data.regulatory_ids.map((entry) => entry.toString())
      : data.regulatory_ids
      ? [data.regulatory_ids.toString()]
      : [];
    const standardIds = Array.isArray(data.standard_ids)
      ? data.standard_ids.map((entry) => entry.toString())
      : data.standard_ids
      ? [data.standard_ids.toString()]
      : [];
    const requirementModel =
      data.requirement_model ||
      {
        generatedAt: new Date().toISOString(),
        regulators: [],
        standards: [],
        requirements: [],
        documents: [],
        meta: { note: 'auto-generated placeholder' }
      };
    const result = await query(
      `UPDATE assessments
         SET assessment_name = $1,
             scope = $2,
             status = $3,
             notes = $4,
             purpose_primary = $5,
             purpose_secondary = $6,
             purpose_tags = $7,
             regulatory_ids = $8,
             standard_ids = $9,
             requirement_model = $10,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        data.assessment_name,
        data.scope || null,
        data.status || 'draft',
        data.notes || null,
        data.purpose_primary || null,
        data.purpose_secondary || null,
        purposeTags,
        regulatoryIds,
        standardIds,
        requirementModel,
        id
      ]
    );
    return result.rows[0];
  },

  async remove(id) {
    await query('DELETE FROM assessments WHERE id = $1', [id]);
  }
};

export const Document = {
  async create(data) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO documents (id, customer_id, assessment_id, document_name, document_type, file_path, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        data.customer_id,
        data.assessment_id || null,
        data.document_name,
        data.document_type || null,
        data.file_path,
        data.file_size || null,
        data.uploaded_by || 'system'
      ]
    );
    return result.rows[0];
  },

  async getAll() {
    const result = await query('SELECT * FROM documents ORDER BY uploaded_at DESC');
    return result.rows;
  },

  async getById(id) {
    const result = await query('SELECT * FROM documents WHERE id = $1', [id]);
    return result.rows[0];
  },

  async updateParseStatus(id, status, extractedText = null, errorMessage = null) {
    const result = await query(
      `UPDATE documents
         SET parse_status = $1,
             extracted_text = $2,
             parse_error = $3,
             last_parsed = CASE WHEN $1 = 'complete' THEN CURRENT_TIMESTAMP ELSE last_parsed END,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, extractedText, errorMessage, id]
    );
    return result.rows[0];
  },

  async getPending(limit = 10) {
    const result = await query(
      `SELECT * FROM documents
       WHERE parse_status = 'pending'
       ORDER BY uploaded_at ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async remove(id) {
    await query('DELETE FROM documents WHERE id = $1', [id]);
  }
};

export const ParsedContent = {
  async insert(documentId, chunks) {
    if (!chunks?.length) return [];

    const values = [];
    const params = [];
    let idx = 1;

    chunks.forEach((chunk, index) => {
      const id = uuidv4();
      values.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3})`);
      params.push(id, documentId, index, chunk);
      idx += 4;
    });

    const sql = `INSERT INTO parsed_content (id, document_id, chunk_index, content)
                 VALUES ${values.join(', ')}`;

    await query(sql, params);
  }
};

export const RegulatorySource = {
  async create(data) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO regulatory_sources (id, name, region, source_type, description, version_label, revision_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        data.name,
        data.region || null,
        data.source_type || 'standard',
        data.description || null,
        data.version_label || null,
        data.revision_date || null
      ]
    );
    return result.rows[0];
  },

  async getAll() {
    const result = await query('SELECT * FROM regulatory_sources ORDER BY name ASC');
    return result.rows;
  },

  async getByName(name) {
    const result = await query('SELECT * FROM regulatory_sources WHERE name = $1', [name]);
    return result.rows[0];
  },

  async listByType(types = []) {
    if (!Array.isArray(types) || types.length === 0) {
      return this.getAll();
    }
    const params = types.map((_t, idx) => `$${idx + 1}`).join(', ');
    const result = await query(
      `SELECT * FROM regulatory_sources WHERE source_type = ANY(ARRAY[${params}]) ORDER BY name ASC`,
      types
    );
    return result.rows;
  }
};

export const RegulatorySourceDocument = {
  async create(data) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO regulatory_source_documents (id, regulatory_source_id, document_name, file_path, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        data.regulatory_source_id,
        data.document_name,
        data.file_path,
        data.file_size || null,
        data.uploaded_by || 'system'
      ]
    );
    return result.rows[0];
  },

  async listBySource(regulatorySourceId) {
    const result = await query(
      `SELECT id, document_name, file_path, file_size, uploaded_by, uploaded_at
       FROM regulatory_source_documents
       WHERE regulatory_source_id = $1
       ORDER BY uploaded_at DESC`,
      [regulatorySourceId]
    );
    return result.rows;
  }
};

export const RegulatoryIngestion = {
  async create(data) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO regulatory_ingestions (id, regulatory_source_id, document_name, file_path, status, summary)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        data.regulatory_source_id,
        data.document_name,
        data.file_path,
        data.status || 'pending',
        data.summary || null
      ]
    );
    return result.rows[0];
  },

  async markCompleted(id, summary) {
    const result = await query(
      `UPDATE regulatory_ingestions
       SET status = 'complete',
           summary = $2,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, summary || null]
    );
    return result.rows[0];
  },

  async listBySource(regulatorySourceId, { limit = 10 } = {}) {
    const result = await query(
      `SELECT * FROM regulatory_ingestions
       WHERE regulatory_source_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [regulatorySourceId, limit]
    );
    return result.rows;
  }
};

export const RegulatoryIngestionRequirement = {
  async bulkInsert(ingestionId, requirements = []) {
    if (!requirements.length) return [];
    const values = [];
    const params = [];
    let idx = 1;

    requirements.forEach((req) => {
      const id = uuidv4();
      values.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5})`);
      params.push(
        id,
        ingestionId,
        req.keyword || null,
        req.requirement_text,
        req.line_number || null,
        typeof req.confidence === 'number' ? req.confidence : null
      );
      idx += 6;
    });

    await query(
      `INSERT INTO regulatory_ingestion_requirements
         (id, ingestion_id, keyword, requirement_text, line_number, confidence)
       VALUES ${values.join(', ')}`,
      params
    );
  },

  async listByIngestion(ingestionId) {
    const result = await query(
      `SELECT keyword, requirement_text, line_number, confidence, created_at
       FROM regulatory_ingestion_requirements
       WHERE ingestion_id = $1
       ORDER BY line_number ASC NULLS LAST`,
      [ingestionId]
    );
    return result.rows;
  }
};

export const AnalyticsSnapshot = {
  async record({ customer_id = null, assessment_id = null, snapshot_type, metrics }) {
    const id = uuidv4();
    await query(
      `INSERT INTO analytics_snapshots (id, customer_id, assessment_id, snapshot_type, metrics)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, customer_id, assessment_id, snapshot_type, metrics || {}]
    );
  },

  async recentByAssessment(assessmentId, limit = 5) {
    const result = await query(
      `SELECT snapshot_type, metrics, taken_at
       FROM analytics_snapshots
       WHERE assessment_id = $1
       ORDER BY taken_at DESC
       LIMIT $2`,
      [assessmentId, limit]
    );
    return result.rows;
  }
};

export const PredictiveScore = {
  async upsert({ assessment_id, forecast_period, predicted_score, confidence, risk_level, drivers }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO predictive_compliance_scores (id, assessment_id, forecast_period, predicted_score, confidence, risk_level, drivers)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (assessment_id, forecast_period)
       DO UPDATE SET predicted_score = EXCLUDED.predicted_score,
                     confidence = EXCLUDED.confidence,
                     risk_level = EXCLUDED.risk_level,
                     drivers = EXCLUDED.drivers,
                     generated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, assessment_id, forecast_period, predicted_score, confidence, risk_level, drivers || {}]
    );
    return result.rows[0];
  },

  async listRecent(limit = 10) {
    const result = await query(
      `SELECT assessment_id, forecast_period, predicted_score, confidence, risk_level, drivers, generated_at
       FROM predictive_compliance_scores
       ORDER BY generated_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
};

export const AuditAnalytics = {
  async log({ assessment_id = null, customer_id = null, actor = null, action, details = {} }) {
    const id = uuidv4();
    await query(
      `INSERT INTO audit_analytics (id, assessment_id, customer_id, actor, action, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, assessment_id, customer_id, actor, action, details]
    );
  },

  async recent(limit = 20) {
    const result = await query(
      `SELECT assessment_id, customer_id, actor, action, details, activity_at
       FROM audit_analytics
       ORDER BY activity_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
};

export const WorkflowModel = {
  async create({ customer_id = null, name, definition }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO workflows (id, customer_id, name, definition)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, customer_id, name, definition || {}]
    );
    return result.rows[0];
  },

  async list() {
    const result = await query(`SELECT * FROM workflows ORDER BY created_at DESC`);
    return result.rows;
  },

  async getById(id) {
    const result = await query(`SELECT * FROM workflows WHERE id = $1`, [id]);
    return result.rows[0];
  }
};

export const WorkflowRuleModel = {
  async create(workflow_id, rules = []) {
    if (!rules.length) return [];
    const values = [];
    const params = [];
    let idx = 1;

    rules.forEach((rule) => {
      const id = uuidv4();
      values.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`);
      params.push(id, workflow_id, rule.rule_type, rule.conditions || {}, rule.action || {});
      idx += 5;
    });

    await query(
      `INSERT INTO workflow_rules (id, workflow_id, rule_type, conditions, action)
       VALUES ${values.join(', ')}`,
      params
    );
  },

  async listByWorkflow(workflow_id) {
    const result = await query(
      `SELECT id, rule_type, conditions, action, created_at
       FROM workflow_rules
       WHERE workflow_id = $1
       ORDER BY created_at ASC`,
      [workflow_id]
    );
    return result.rows;
  }
};

export const WorkflowQueueModel = {
  async enqueue({ workflow_id, payload }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO workflow_queue (id, workflow_id, payload)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, workflow_id, payload || {}]
    );
    return result.rows[0];
  },

  async nextPending(limit = 5) {
    const result = await query(
      `SELECT *
       FROM workflow_queue
       WHERE status = 'pending'
       ORDER BY enqueued_at ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async markProcessed(id, error = null) {
    await query(
      `UPDATE workflow_queue
       SET status = $2,
           processed_at = CURRENT_TIMESTAMP,
           error = $3
       WHERE id = $1`,
      [id, error ? 'error' : 'processed', error]
    );
  }
};

export const WorkflowExecutionModel = {
  async start(workflow_id) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO workflow_executions (id, workflow_id, status)
       VALUES ($1, $2, 'running')
       RETURNING *`,
      [id, workflow_id]
    );
    return result.rows[0];
  },

  async complete(id, status = 'completed') {
    await query(
      `UPDATE workflow_executions
       SET status = $2,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, status]
    );
  }
};

export const WorkflowTaskModel = {
  async insert(tasks = []) {
    if (!tasks.length) return [];
    const values = [];
    const params = [];
    let idx = 1;
    const ids = [];

    tasks.forEach((task) => {
      const id = task.id || uuidv4();
      ids.push(id);
      values.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7})`);
      params.push(
        id,
        task.workflow_id,
        task.execution_id || null,
        task.step_name,
        task.assignee || null,
        task.status || 'pending',
        task.due_at || null,
        task.metadata || {}
      );
      idx += 8;
    });

    await query(
      `INSERT INTO workflow_tasks
         (id, workflow_id, execution_id, step_name, assignee, status, due_at, metadata)
       VALUES ${values.join(', ')}`,
      params
    );
    return ids;
  },

  async listByWorkflow(workflow_id) {
    const result = await query(
      `SELECT id, execution_id, step_name, assignee, status, due_at, metadata, created_at, completed_at
       FROM workflow_tasks
       WHERE workflow_id = $1
       ORDER BY created_at DESC`,
      [workflow_id]
    );
    return result.rows;
  },

  async updateStatus(id, status, comment = null) {
    const result = await query(
      `UPDATE workflow_tasks
       SET status = $2,
           completed_at = CASE WHEN $2 IN ('completed','approved','rejected') THEN CURRENT_TIMESTAMP ELSE completed_at END,
           metadata = jsonb_set(coalesce(metadata, '{}'), '{comment}', to_jsonb($3::text), true)
       WHERE id = $1
       RETURNING *`,
      [id, status, comment]
    );
    return result.rows[0];
  }
};

export const ApprovalModel = {
  async request({ workflow_task_id, approver }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO approvals (id, workflow_task_id, approver)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, workflow_task_id, approver]
    );
    return result.rows[0];
  },

  async decide(id, status, comment = null) {
    const result = await query(
      `UPDATE approvals
       SET status = $2,
           comment = $3,
           decided_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, status, comment]
    );
    return result.rows[0];
  },

  async pendingForApprover(approver) {
    const result = await query(
      `SELECT a.*, wt.step_name, wt.assignee
       FROM approvals a
       JOIN workflow_tasks wt ON wt.id = a.workflow_task_id
       WHERE a.approver = $1 AND a.status = 'pending'
       ORDER BY a.created_at DESC`,
      [approver]
    );
    return result.rows;
  }
};

export const CustomReportTemplateModel = {
  async create({ name, description, sections, created_by }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO custom_report_templates (id, name, description, sections, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, name, description || null, sections || {}, created_by || 'system']
    );
    return result.rows[0];
  },

  async list() {
    const result = await query('SELECT * FROM custom_report_templates ORDER BY created_at DESC');
    return result.rows;
  }
};

export const CustomReportModel = {
  async create({ template_id = null, assessment_id = null, title, parameters, status = 'generated', generated_by = 'system', file_path = null }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO custom_reports (id, template_id, assessment_id, title, parameters, status, generated_by, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, template_id, assessment_id, title, parameters || {}, status, generated_by, file_path]
    );
    return result.rows[0];
  },

  async list(limit = 100) {
    const result = await query(
      `SELECT * FROM custom_reports
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
};

export const WebhookModel = {
  async register({ event_type, callback_url, secret }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO webhooks (id, event_type, callback_url, secret)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, event_type, callback_url, secret || null]
    );
    return result.rows[0];
  },

  async listActive(event_type = null) {
    const result = await query(
      `SELECT * FROM webhooks
       WHERE is_active = TRUE
       ${event_type ? 'AND event_type = $1' : ''}
       ORDER BY created_at DESC`,
      event_type ? [event_type] : []
    );
    return result.rows;
  }
};

export const WebhookDeliveryLogModel = {
  async record({ webhook_id, event_payload, response_code, response_body }) {
    await query(
      `INSERT INTO webhook_delivery_log (id, webhook_id, event_payload, response_code, response_body)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), webhook_id, event_payload || {}, response_code || null, response_body || null]
    );
  }
};

export const SystemMetricsSnapshotModel = {
  async insert(metric_key, metric_value) {
    await query(
      `INSERT INTO system_metrics_snapshot (id, metric_key, metric_value)
       VALUES ($1, $2, $3)`,
      [uuidv4(), metric_key, metric_value]
    );
  },

  async latest() {
    const result = await query(
      `SELECT DISTINCT ON (metric_key) metric_key, metric_value, recorded_at
       FROM system_metrics_snapshot
       ORDER BY metric_key, recorded_at DESC`
    );
    return result.rows;
  }
};

export const SystemAlertModel = {
  async create({ alert_type, severity, message, context }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO system_alerts (id, alert_type, severity, message, context)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, alert_type, severity, message, context || {}]
    );
    return result.rows[0];
  },

  async latest(limit = 20) {
    const result = await query(
      `SELECT * FROM system_alerts
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
};

export const SystemSettings = {
  async getAll() {
    const result = await query('SELECT setting_key, setting_value FROM system_settings');
    return result.rows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});
  },

  async set(settingKey, settingValue) {
    const result = await query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
       RETURNING setting_key, setting_value`,
      [settingKey, settingValue]
    );
    return result.rows[0];
  }
};

export const Requirement = {
  async create(data) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO requirements (id, regulatory_source_id, requirement_ref, requirement_text, requirement_type, hierarchy_level)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        data.regulatory_source_id,
        data.requirement_ref,
        data.requirement_text,
        data.requirement_type || null,
        data.hierarchy_level || 1
      ]
    );
    return result.rows[0];
  },

  async bulkInsert(regulatorySourceId, requirements) {
    if (!requirements.length) return [];

    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const req of requirements) {
      const id = uuidv4();
      values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`);
      params.push(
        id,
        regulatorySourceId,
        req.requirement_ref,
        req.requirement_text,
        req.requirement_type || null,
        req.hierarchy_level || 1
      );
      paramIndex += 6;
    }

    const sql = `INSERT INTO requirements (id, regulatory_source_id, requirement_ref, requirement_text, requirement_type, hierarchy_level)
                 VALUES ${values.join(', ')}
                 ON CONFLICT (regulatory_source_id, requirement_ref) DO UPDATE
                 SET requirement_text = EXCLUDED.requirement_text,
                     requirement_type = EXCLUDED.requirement_type,
                     hierarchy_level = EXCLUDED.hierarchy_level
                 RETURNING *`;

    const result = await query(sql, params);
    return result.rows;
  },

  async getBySource(sourceId) {
    const result = await query(
      'SELECT * FROM requirements WHERE regulatory_source_id = $1 ORDER BY hierarchy_level, requirement_ref',
      [sourceId]
    );
    return result.rows;
  }
};

