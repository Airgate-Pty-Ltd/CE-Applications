'use strict';

/**
 * AIMS host adapter — the integration glue between the ISO/IEC 42001 AIMS
 * Command Center host tables and the M-AI Kernel.
 *
 * Implements the event flow from integration-checklist.md section 3:
 *   commit host write -> getSnapshot -> kernel.hashSnapshot -> writeEvent
 *   -> kernel.processEvent -> markEventProcessed
 *
 * Every kernel entry point here is wrapped in try/catch: the host request
 * always returns 2xx even if the kernel evaluation throws (Design Law 3 —
 * fail quiet, log loud). The kernel never touches a host table; this module
 * is the only place that reads host tables to build the record snapshot the
 * kernel evaluates against.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  MaiKernel, ManifestLoader, SqliteAdapter, Snapshot
} = require('../../lib/mai-kernel');

const DIMS_ROOT = path.join(__dirname, '..', 'dims');
const CHARTER_PATH = path.join(DIMS_ROOT, 'iso42001-aims-governance', 'AUTHORITY-CHARTER.md');

// record_type -> host table name (whitelisted; nothing else is ever queried)
const TABLE_BY_RECORD_TYPE = {
  soa: 'soa_entries',
  risk: 'risk_register',
  risk_treatment: 'risk_treatments',
  objective: 'objectives',
  audit_finding: 'audit_findings',
  ncr: 'ncr_entries',
  competence: 'competence_records'
};

function mapAssessmentToApi(row) {
  return {
    id: row.id,
    tier: row.tier,
    ruleId: row.rule_id,
    ruleRevision: row.rule_revision,
    dimId: row.dim_id,
    severity: row.severity,
    findingText: row.finding_text,
    resolutionHint: row.resolution_hint,
    clauseRefs: JSON.parse(row.clause_refs || '[]'),
    recordType: row.record_type,
    recordId: row.record_id,
    status: row.status,
    dataConfidence: row.data_confidence,
    createdAt: row.created_at,
    response: row.response,
    respondedBy: row.response_by,
    respondedAt: row.response_at,
    supersededBy: row.superseded_by,
    supersededAt: row.superseded_at,
    snapshotHash: row.snapshot_hash
  };
}

class AimsIntegration {
  /** @param {import('node:sqlite').DatabaseSync} db */
  constructor(db) {
    this.db = db;

    // getHostSnapshot(recordType, recordId, tenantId) -> plain object of the
    // CURRENT host row, with a small set of precomputed link fields the
    // kernel's condition-evaluator can check with linked_record_missing
    // (that evaluator only checks field presence — see condition-evaluator.js
    // — so link resolution itself must happen here, in the host layer).
    const getHostSnapshot = (recordType, recordId, tenantId) => this._getHostSnapshot(recordType, recordId, tenantId);

    this.kernelAdapter = new SqliteAdapter({ db, getHostSnapshot });
    this.kernel = new MaiKernel(this.kernelAdapter, { logger: console });

    const rawManifests = ManifestLoader.loadAllDims(DIMS_ROOT);
    const { manifests, loadedCount, rejectedCount } = this.kernel.loadRuleRegistry(rawManifests);
    this.manifests = manifests;
    this.registryStats = { loadedCount, rejectedCount };
    this.kernelActive = true;
  }

  _getHostSnapshot(recordType, recordId, tenantId) {
    const table = TABLE_BY_RECORD_TYPE[recordType];
    if (!table) return null;
    const row = this.db.prepare(`SELECT * FROM ${table} WHERE id = ? AND tenant_id = ?`).get(recordId, tenantId);
    if (!row) return null;

    const data = { ...row };

    if (recordType === 'soa') {
      const treatment = this.db.prepare(
        `SELECT id FROM risk_treatments WHERE tenant_id = ? AND soa_control_ref = ? ORDER BY created_at ASC LIMIT 1`
      ).get(tenantId, row.control_ref);
      data.linked_treatment_id = treatment ? treatment.id : null;
    }

    if (recordType === 'audit_finding') {
      const ncr = this.db.prepare(
        `SELECT id FROM ncr_entries WHERE tenant_id = ? AND linked_finding_id = ? ORDER BY created_at ASC LIMIT 1`
      ).get(tenantId, row.id);
      data.linked_ncr_id = ncr ? ncr.id : null;
    }

    return data;
  }

  /**
   * Emit a governance event for a host record mutation. MUST be called after
   * the host write has already committed. Never throws — any kernel failure
   * is logged to mai_error_log and swallowed so the host route still returns
   * 2xx (Design Law 3).
   */
  async emitEvent({
    tenantId, eventType, recordType, recordId, actor
  }) {
    try {
      const data = this._getHostSnapshot(recordType, recordId, tenantId);
      if (!data) {
        this.kernelAdapter.logError(tenantId, 'aims-adapter.emitEvent', 'No host snapshot found for record', { recordType, recordId });
        return { skipped: true, reason: 'record_not_found' };
      }

      const { snapshotJson, snapshotHash } = this.kernel.hashSnapshot(data);
      const eventId = crypto.randomUUID();
      const occurredAt = new Date().toISOString();

      this.kernelAdapter.writeEvent({
        id: eventId, tenantId, eventType, recordType, recordId, actor: actor || 'system', occurredAt, snapshotJson, snapshotHash
      });

      let result;
      try {
        result = await this.kernel.processEvent({
          id: eventId,
          tenant_id: tenantId,
          event_type: eventType,
          record_type: recordType,
          record_id: recordId,
          data,
          snapshot_hash: snapshotHash
        }, this.manifests);
      } catch (kernelErr) {
        this.kernelAdapter.logError(tenantId, 'aims-adapter.emitEvent', `kernel.processEvent threw: ${kernelErr.message}`, { eventId });
        result = { assessmentCount: 0, assessments: [], errors: [kernelErr.message] };
      }

      this.kernelAdapter.markEventProcessed(tenantId, eventId, new Date().toISOString());
      return { eventId, snapshotHash, ...result };
    } catch (err) {
      // Absolute last resort — never let a kernel/adapter failure break the host route.
      try {
        this.kernelAdapter.logError(tenantId, 'aims-adapter.emitEvent', `Unhandled: ${err.message}`, {});
      } catch (e) { /* fail quiet */ }
      return { skipped: true, reason: 'kernel_error' };
    }
  }

  getConditions(tenantId, filters = {}) {
    const status = filters.status || 'active';
    const rows = this.kernelAdapter.loadAssessments(tenantId, { ...filters, status: status === 'all' ? undefined : status });
    return rows.map(mapAssessmentToApi);
  }

  getConditionById(tenantId, id) {
    const row = this.kernelAdapter.getAssessmentById(tenantId, id);
    return row ? mapAssessmentToApi(row) : null;
  }

  async respondToCondition(tenantId, id, response, respondedBy) {
    const result = await this.kernel.recordResponse(tenantId, id, response, respondedBy);
    if (!result.success) return result;
    const updated = this.getConditionById(tenantId, id);
    return { success: true, condition: updated };
  }

  getCharter() {
    return fs.readFileSync(CHARTER_PATH, 'utf-8');
  }

  getMetrics(tenantId) {
    return this.kernel.getMetrics(tenantId);
  }

  /** AT-08: evidence export built entirely from persisted, tenant-scoped tables. */
  exportEvidence(tenantId) {
    const assessments = this.kernelAdapter.loadAssessments(tenantId, {});
    const ruleRegistry = this.kernelAdapter.getRuleRegistry();
    const charter = this.getCharter();

    const exportId = crypto.randomUUID();
    const exportedAt = new Date().toISOString();
    const counts = {
      totalAssessments: assessments.length,
      active: assessments.filter((a) => a.status === 'active').length,
      resolved: assessments.filter((a) => a.status === 'resolved').length,
      superseded: assessments.filter((a) => a.status === 'superseded').length
    };
    const snapshotHashes = [...new Set(assessments.map((a) => a.snapshot_hash))];

    const manifest = {
      exportId,
      exportedAt,
      tenantId,
      scope: 'tenant',
      counts,
      snapshotHashes,
      ruleDefinitionHashes: ruleRegistry.map((r) => ({ ruleId: r.rule_id, revision: r.revision, definitionHash: r.definition_hash })),
      dimRevisions: [...new Set(ruleRegistry.map((r) => r.dim_id))]
    };
    manifest.packageHash = Snapshot.hash(Snapshot.create({ manifest, assessments, ruleRegistry, charter }));

    return {
      manifest,
      assessments: assessments.map(mapAssessmentToApi),
      ruleRegistry,
      charter
    };
  }
}

module.exports = { AimsIntegration, mapAssessmentToApi, TABLE_BY_RECORD_TYPE };
