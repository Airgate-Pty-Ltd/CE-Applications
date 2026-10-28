/**
 * SQLite Adapter (lib/mai-kernel/adapters/sqlite-adapter.js)
 *
 * Implements AdapterContract against a shared `node:sqlite` DatabaseSync
 * instance (the SAME file as the host tables — see src/db/init.js). This
 * adapter's SQL statements touch ONLY mai_* tables; it never reads or writes
 * a host table (Design Law 2). It receives an already-open `db` handle
 * rather than opening its own file, because SQLite is embedded and both the
 * host and kernel share one process/connection in this deployment (checklist
 * section 6: "Embedded engines without grants (SQLite demo): application-
 * layer scoping + write-scope tests are the compensating control").
 *
 * Uses Node's built-in `node:sqlite` rather than the `better-sqlite3` npm
 * package — see src/db/init.js for why (no native compilation required).
 * The `.prepare(sql).run/get/all(...)` shape used throughout this file is
 * the same for both, so only the require/constructor differs (in init.js).
 *
 * ADAPTED FROM the reference kernel: table/column names and the full method
 * set now match this host's mai_* schema (src/db/schema.sql) and the
 * adapter-contract.js method names from integration-checklist.md section 2,
 * instead of the reference product's simpler response_status-only schema.
 */

const crypto = require('crypto');
const AdapterContract = require('./adapter-contract');

class SqliteAdapter extends AdapterContract {
  /** @param {Object} config - { db: node:sqlite DatabaseSync instance, getHostSnapshot: fn } */
  constructor(config) {
    super(config);
    if (!config || !config.db) {
      throw new Error('SqliteAdapter requires config.db (an open node:sqlite DatabaseSync instance)');
    }
    this.db = config.db;
    // Optional host-record reader, injected by the host so getSnapshot() can
    // stay generic here without the kernel-side adapter importing host code.
    this.getHostSnapshotFn = config.getHostSnapshot || null;
  }

  getSnapshot(recordType, recordId, tenantId) {
    if (!this.getHostSnapshotFn) {
      throw new Error('getSnapshot() requires config.getHostSnapshot to be provided by the host');
    }
    const data = this.getHostSnapshotFn(recordType, recordId, tenantId);
    if (!data) return null;
    return { data, capturedAt: new Date().toISOString() };
  }

  // ---- Events -----------------------------------------------------------

  writeEvent(event) {
    const stmt = this.db.prepare(`
      INSERT INTO mai_events
        (id, tenant_id, event_type, record_type, record_id, actor, occurred_at, snapshot_json, snapshot_hash, processed, processed_at)
      VALUES (@id, @tenant_id, @event_type, @record_type, @record_id, @actor, @occurred_at, @snapshot_json, @snapshot_hash, 0, NULL)
    `);
    stmt.run({
      id: event.id,
      tenant_id: event.tenantId,
      event_type: event.eventType,
      record_type: event.recordType,
      record_id: event.recordId,
      actor: event.actor || null,
      occurred_at: event.occurredAt || new Date().toISOString(),
      snapshot_json: event.snapshotJson,
      snapshot_hash: event.snapshotHash
    });
    return true;
  }

  markEventProcessed(tenantId, eventId, processedAt) {
    const stmt = this.db.prepare(
      `UPDATE mai_events SET processed = 1, processed_at = ? WHERE id = ? AND tenant_id = ?`
    );
    const info = stmt.run(processedAt, eventId, tenantId);
    return info.changes > 0;
  }

  getEventById(tenantId, eventId) {
    return this.db.prepare(`SELECT * FROM mai_events WHERE id = ? AND tenant_id = ?`).get(eventId, tenantId);
  }

  // ---- Assessments --------------------------------------------------------

  writeAssessment(assessment) {
    const stmt = this.db.prepare(`
      INSERT INTO mai_assessments
        (id, tenant_id, event_id, dim_id, rule_id, rule_revision, record_type, record_id, snapshot_hash,
         tier, logic_result, data_confidence, severity, finding_text, resolution_hint, clause_refs,
         status, superseded_by, superseded_at, created_at, response, response_by, response_at,
         prev_hash, row_hash)
      VALUES
        (@id, @tenant_id, @event_id, @dim_id, @rule_id, @rule_revision, @record_type, @record_id, @snapshot_hash,
         @tier, @logic_result, @data_confidence, @severity, @finding_text, @resolution_hint, @clause_refs,
         @status, @superseded_by, @superseded_at, @created_at, @response, @response_by, @response_at,
         @prev_hash, @row_hash)
    `);
    stmt.run({
      ...assessment,
      logic_result: assessment.logic_result ? 1 : 0,
      clause_refs: JSON.stringify(assessment.clause_refs || [])
    });
    return true;
  }

  getActiveAssessmentsByHash(tenantId, recordType, recordId, snapshotHash) {
    return this.db.prepare(`
      SELECT * FROM mai_assessments
      WHERE tenant_id = ? AND record_type = ? AND record_id = ? AND snapshot_hash = ? AND status = 'active'
    `).all(tenantId, recordType, recordId, snapshotHash);
  }

  getActiveAssessmentsForRecord(tenantId, recordType, recordId) {
    return this.db.prepare(`
      SELECT * FROM mai_assessments
      WHERE tenant_id = ? AND record_type = ? AND record_id = ? AND status = 'active'
    `).all(tenantId, recordType, recordId);
  }

  markAssessmentSuperseded(tenantId, assessmentId, supersededBy, supersededAt) {
    const stmt = this.db.prepare(`
      UPDATE mai_assessments
      SET status = 'superseded', superseded_by = ?, superseded_at = ?
      WHERE id = ? AND tenant_id = ?
    `);
    const info = stmt.run(supersededBy, supersededAt, assessmentId, tenantId);
    return info.changes > 0;
  }

  recordAssessmentResponse(tenantId, assessmentId, response, respondedBy, respondedAt) {
    const stmt = this.db.prepare(`
      UPDATE mai_assessments
      SET response = ?, response_by = ?, response_at = ?, status = 'resolved'
      WHERE id = ? AND tenant_id = ?
    `);
    const info = stmt.run(response, respondedBy, respondedAt, assessmentId, tenantId);
    return info.changes > 0;
  }

  loadAssessments(tenantId, filters = {}) {
    let sql = `SELECT * FROM mai_assessments WHERE tenant_id = ?`;
    const params = [tenantId];
    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }
    if (filters.recordType) {
      sql += ` AND record_type = ?`;
      params.push(filters.recordType);
    }
    if (filters.recordId) {
      sql += ` AND record_id = ?`;
      params.push(filters.recordId);
    }
    sql += ` ORDER BY created_at DESC`;
    return this.db.prepare(sql).all(...params);
  }

  getAssessmentById(tenantId, assessmentId) {
    return this.db.prepare(`SELECT * FROM mai_assessments WHERE id = ? AND tenant_id = ?`).get(assessmentId, tenantId);
  }

  getLastRowHash(tenantId) {
    const row = this.db.prepare(`
      SELECT row_hash FROM mai_assessments WHERE tenant_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1
    `).get(tenantId);
    return row ? row.row_hash : null;
  }

  // ---- Links, errors, registry, metrics, notification --------------------

  listLinkedRecords(recordType, recordId, linkType, tenantId) {
    // Host-specific link resolution happens in src/adapter/aims-adapter.js
    // (precomputed onto the event snapshot). Kept as a documented stub here
    // so the kernel-facing contract is complete without importing host code.
    return [];
  }

  logError(tenantId, source, message, context) {
    const stmt = this.db.prepare(`
      INSERT INTO mai_error_log (id, tenant_id, source, message, context_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      crypto.randomUUID(),
      tenantId || 'system',
      source,
      message,
      JSON.stringify(context || {}),
      new Date().toISOString()
    );
    return true;
  }

  getErrorLog(tenantId, limit = 100) {
    return this.db.prepare(`
      SELECT * FROM mai_error_log WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?
    `).all(tenantId, limit);
  }

  upsertRuleRegistryEntry(entry) {
    const stmt = this.db.prepare(`
      INSERT INTO mai_rule_registry
        (rule_id, dim_id, revision, effective_date, approved_by, loaded_at, definition_json, definition_hash, status, rejection_reason)
      VALUES (@ruleId, @dimId, @revision, @effectiveDate, @approvedBy, @loadedAt, @definitionJson, @definitionHash, @status, @rejectionReason)
      ON CONFLICT(rule_id, revision) DO UPDATE SET
        dim_id = excluded.dim_id,
        effective_date = excluded.effective_date,
        approved_by = excluded.approved_by,
        loaded_at = excluded.loaded_at,
        definition_json = excluded.definition_json,
        definition_hash = excluded.definition_hash,
        status = excluded.status,
        rejection_reason = excluded.rejection_reason
    `);
    stmt.run(entry);
    return true;
  }

  getRuleRegistry() {
    return this.db.prepare(`SELECT * FROM mai_rule_registry ORDER BY dim_id, rule_id`).all();
  }

  getMetrics(tenantId) {
    const eventCount = this.db.prepare(`SELECT COUNT(*) AS c FROM mai_events WHERE tenant_id = ?`).get(tenantId).c;
    const confirmations = this.db.prepare(
      `SELECT COUNT(*) AS c FROM mai_assessments WHERE tenant_id = ? AND response = 'confirm'`
    ).get(tenantId).c;
    const dismissals = this.db.prepare(
      `SELECT COUNT(*) AS c FROM mai_assessments WHERE tenant_id = ? AND response IN ('dismiss_incorrect', 'not_applicable')`
    ).get(tenantId).c;
    const errorCount = this.db.prepare(`SELECT COUNT(*) AS c FROM mai_error_log WHERE tenant_id = ?`).get(tenantId).c;
    const activeCount = this.db.prepare(
      `SELECT COUNT(*) AS c FROM mai_assessments WHERE tenant_id = ? AND status = 'active'`
    ).get(tenantId).c;
    return { eventCount, confirmations, dismissals, errorCount, activeCount };
  }

  notify({ tenantId, role, message, assessmentId }) {
    // No external notification channel in this build (scope discipline —
    // "do not add ... workflow automation ... beyond the stated task").
    // eslint-disable-next-line no-console
    console.log(`[mai-notify] tenant=${tenantId} role=${role} assessment=${assessmentId}: ${message}`);
    return true;
  }

  log(level, message, context) {
    const fn = level === 'error' ? console.error : console.log;
    fn(`[mai-kernel:${level}] ${message}`, context || '');
    if (level === 'error') {
      try {
        this.logError((context && context.tenantId) || 'system', 'adapter.log', message, context);
      } catch (e) {
        // fail quiet
      }
    }
    return true;
  }
}

module.exports = SqliteAdapter;
