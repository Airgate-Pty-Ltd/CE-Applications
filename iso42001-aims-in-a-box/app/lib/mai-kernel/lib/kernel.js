/**
 * M-AI Kernel (lib/mai-kernel/lib/kernel.js)
 *
 * Deterministic, rules-only assessment kernel. No LLM, no network calls, no
 * randomness (Design Law 1). Writes ONLY to mai_* tables via the adapter
 * (Design Law 2). Every entry point fails quiet / logs loud (Design Law 3).
 *
 * ADAPTED FROM the reference kernel at
 * builds/2026-07-03-MAI-KERNEL-BUILD/mai-kernel/lib/kernel.js for this host
 * (ISO/IEC 42001 AIMS Command Center). The reference implementation:
 *   - persisted the mai_events row itself inside processEvent(); this host's
 *     event flow (integration-checklist.md section 3) requires the HOST to
 *     write the event row (via the adapter) using the kernel's own hash
 *     BEFORE calling processEvent, so processEvent here only evaluates +
 *     persists assessments against an already-written event.
 *   - supported exactly one DIM manifest per call; this host requires
 *     multi-DIM manifest-driven dispatch (Design Law 11), implemented below.
 *   - used a different assessment schema/response taxonomy than this host's
 *     API contract (confirm / dismiss_incorrect / not_applicable). Field
 *     names and the response taxonomy have been aligned; dim_id,
 *     resolution_hint, clause_refs, status and the row_hash/prev_hash ledger
 *     chain fields have been added because this host's mai_assessments
 *     schema (integration-checklist.md section 1) requires them.
 * condition-evaluator.js and snapshot.js are reused unmodified — they were
 * already fully generic and match the required operator grammar exactly.
 *
 * Evaluation-latency instrumentation (AT-14): tracked in-memory per kernel
 * instance (process.hrtime.bigint() around the rule-evaluation loop in
 * processEvent), not persisted to any mai_* table. This is live process
 * instrumentation, not a governance/ledger fact, so it intentionally does
 * NOT survive a kernel restart (AT-16 restart survival concerns the
 * persisted assessments/events/metrics from mai_* tables, which this does
 * not touch).
 */

const crypto = require('crypto');
const ConditionEvaluator = require('./condition-evaluator');
const Snapshot = require('./snapshot');
const Validators = require('./validators');

class MaiKernel {
  /**
   * @param {Object} adapter - Host adapter implementing adapters/adapter-contract.js
   * @param {Object} config - { logger }
   */
  constructor(adapter, config = {}) {
    if (!adapter) {
      throw new Error('Adapter required: kernel needs a database implementation');
    }
    this.adapter = adapter;
    this.logger = config.logger || console;
    this.evaluator = new ConditionEvaluator();
    // AT-14: live (in-process) rule-evaluation latency instrumentation.
    this._evalTotalNs = 0n;
    this._evalCount = 0;
  }

  /**
   * The ONE canonical hash function (Design Law 6). Hosts call this BEFORE
   * writing the mai_events row, so the event's snapshot_hash and the
   * assessment's snapshot_hash are guaranteed to be produced identically.
   */
  hashSnapshot(data) {
    const snapshotJson = Snapshot.create(data);
    const snapshotHash = Snapshot.hash(snapshotJson);
    return { snapshotJson, snapshotHash };
  }

  /**
   * Validate every rule in every DIM manifest against the registry
   * requirements (AT-13) and persist the registry rows. Rules that fail
   * validation are EXCLUDED from the returned (filtered) manifests — they
   * will never fire — but nothing else about the kernel or host is affected.
   *
   * @param {Array} manifests - [{ dimId, subscribesTo, rules: [...] }, ...]
   * @returns {{manifests: Array, loadedCount: number, rejectedCount: number}}
   */
  loadRuleRegistry(manifests) {
    const loadedAt = new Date().toISOString();
    const filtered = [];
    let loadedCount = 0;
    let rejectedCount = 0;

    for (const manifest of manifests || []) {
      const goodRules = [];
      for (const rule of (manifest && manifest.rules) || []) {
        const err = Validators.validateRuleRegistration(rule);
        const definitionJson = JSON.stringify(rule);
        const definitionHash = Snapshot.hash(Snapshot.create(rule));

        if (err) {
          rejectedCount += 1;
          this._logError('system', 'kernel.loadRuleRegistry', `Rule rejected: ${err}`, {
            ruleId: rule && rule.ruleId,
            dimId: manifest && manifest.dimId
          });
          this._safeRegistryWrite({
            ruleId: (rule && rule.ruleId) || 'unknown',
            dimId: (rule && rule.dimId) || (manifest && manifest.dimId) || 'unknown',
            revision: (rule && typeof rule.revision === 'number') ? rule.revision : 0,
            effectiveDate: (rule && rule.effectiveDate) || loadedAt,
            approvedBy: (rule && rule.approvedBy) || 'unknown',
            loadedAt,
            definitionJson,
            definitionHash,
            status: 'rejected',
            rejectionReason: err
          });
          continue;
        }

        loadedCount += 1;
        this._safeRegistryWrite({
          ruleId: rule.ruleId,
          dimId: rule.dimId,
          revision: rule.revision,
          effectiveDate: rule.effectiveDate,
          approvedBy: rule.approvedBy,
          loadedAt,
          definitionJson,
          definitionHash,
          status: 'loaded',
          rejectionReason: null
        });
        goodRules.push(rule);
      }
      filtered.push({ ...manifest, rules: goodRules });
    }

    return { manifests: filtered, loadedCount, rejectedCount };
  }

  _safeRegistryWrite(entry) {
    try {
      this.adapter.upsertRuleRegistryEntry(entry);
    } catch (err) {
      this.logger.error('[mai-kernel] rule registry write failed', err);
    }
  }

  /**
   * Process a single host event.
   *
   * Expects `event` already written to mai_events by the host adapter, i.e.
   * event = { id, tenant_id, event_type, record_type, record_id, data,
   *           snapshot_hash }. The host mutation route is responsible for:
   *   commit host write -> getSnapshot -> kernel.hashSnapshot -> writeEvent
   *   -> kernel.processEvent (this method) -> markEventProcessed
   *
   * @param {Object} event
   * @param {Array} manifests - filtered manifests from loadRuleRegistry()
   * @returns {Promise<Object>} { assessmentCount, assessments, errors }
   */
  async processEvent(event, manifests) {
    const tenantId = event && event.tenant_id;
    try {
      const validationErr = Validators.validateEvent(event);
      if (validationErr) {
        this._logError(tenantId, 'kernel.processEvent', `Event validation failed: ${validationErr}`, { event });
        return { assessmentCount: 0, assessments: [], errors: [validationErr] };
      }

      const { record_type: recordType, record_id: recordId, snapshot_hash: snapshotHash, data } = event;

      // Idempotency gate (Design Law 7): same snapshot hash -> no duplicate active assessment.
      const priorSameHash = this.adapter.getActiveAssessmentsByHash(tenantId, recordType, recordId, snapshotHash) || [];
      if (priorSameHash.length > 0) {
        return {
          assessmentCount: 0,
          assessments: [],
          skipped: true,
          reason: 'duplicate_snapshot_hash: prior assessments still active'
        };
      }

      // Manifest-driven dispatch (Design Law 11): gather rules from EVERY DIM
      // whose manifest.subscribesTo includes this event type. No prefix routing.
      const applicableRules = [];
      for (const manifest of manifests || []) {
        if (!manifest || !Array.isArray(manifest.subscribesTo)) continue;
        if (!manifest.subscribesTo.includes(event.event_type)) continue;
        for (const rule of manifest.rules || []) {
          if (Array.isArray(rule.events) && rule.events.length > 0 && !rule.events.includes(event.event_type)) {
            continue;
          }
          applicableRules.push(rule);
        }
      }

      // Snapshot which assessments were ALREADY active for this record BEFORE
      // we write any new ones — this is the correct "prior" set to supersede
      // (Design Law 7). Capturing it now (not after writing) avoids the
      // just-written rows superseding themselves in the sweep below.
      let priorActiveBeforeWrite = [];
      try {
        priorActiveBeforeWrite = this.adapter.getActiveAssessmentsForRecord(tenantId, recordType, recordId) || [];
      } catch (err) {
        this._logError(tenantId, 'kernel.processEvent', `getActiveAssessmentsForRecord (pre-write) failed: ${err.message}`, {});
      }

      const newAssessments = [];
      const errors = [];
      let prevHash = null;
      try {
        prevHash = this.adapter.getLastRowHash(tenantId);
      } catch (err) {
        this._logError(tenantId, 'kernel.processEvent', `getLastRowHash failed: ${err.message}`, {});
      }

      // AT-14: measure real rule-evaluation wall time for this event (high
      // resolution so it is non-zero even when evaluation is very fast).
      const evalStartNs = process.hrtime.bigint();

      for (const rule of applicableRules) {
        let logicResult = false;
        try {
          logicResult = this.evaluator.evaluate(rule.condition, data);
        } catch (evalErr) {
          // Design Law 3 / AT-15: unknown operator or evaluation error -> log,
          // no assessment for THIS rule, other rules continue.
          this._logError(tenantId, `rule:${rule.ruleId}`, `Condition evaluation error: ${evalErr.message}`, {
            ruleId: rule.ruleId,
            eventId: event.id
          });
          errors.push(`Rule ${rule.ruleId} evaluation error: ${evalErr.message}`);
          continue;
        }

        if (!logicResult) continue;

        const confidence = this._inferConfidence(data, rule);
        const nowIso = new Date().toISOString();
        const id = crypto.randomUUID(); // Design Law 5: kernel owns assessment IDs

        const rowHash = Snapshot.hash(Snapshot.create({
          id, eventId: event.id, ruleId: rule.ruleId, snapshotHash, prevHash, createdAt: nowIso
        }));

        const assessment = {
          id,
          tenant_id: tenantId,
          event_id: event.id,
          dim_id: rule.dimId,
          rule_id: rule.ruleId,
          rule_revision: rule.revision,
          record_type: recordType,
          record_id: recordId,
          snapshot_hash: snapshotHash,
          tier: 'system_detected_condition',
          logic_result: true,
          data_confidence: confidence,
          severity: rule.severity,
          finding_text: rule.findingText,
          resolution_hint: rule.resolutionHint || null,
          clause_refs: Array.isArray(rule.clauseRefs) ? rule.clauseRefs : [],
          status: 'active',
          superseded_by: null,
          superseded_at: null,
          created_at: nowIso,
          response: null,
          response_by: null,
          response_at: null,
          prev_hash: prevHash,
          row_hash: rowHash
        };

        const assessErr = Validators.validateAssessment(assessment);
        if (assessErr) {
          this._logError(tenantId, `rule:${rule.ruleId}`, `Assessment validation failed: ${assessErr}`, { ruleId: rule.ruleId });
          errors.push(assessErr);
          continue;
        }

        try {
          this.adapter.writeAssessment(assessment);
          newAssessments.push(assessment);
          prevHash = rowHash;
        } catch (writeErr) {
          this._logError(tenantId, `rule:${rule.ruleId}`, `Assessment persistence failed: ${writeErr.message}`, { ruleId: rule.ruleId });
          errors.push(writeErr.message);
        }
      }

      const evalEndNs = process.hrtime.bigint();
      this._evalTotalNs += (evalEndNs - evalStartNs);
      this._evalCount += 1;

      // Supersession (Design Law 7): we only reach here when no active row
      // shares this exact hash, so every row that was active for this record
      // BEFORE this call reflects a stale (changed) snapshot -> supersede all
      // of them, linked forward to this event. Rules that no longer fire
      // simply produced no new row above, so after this step they correctly
      // have none active. (Uses priorActiveBeforeWrite, captured before the
      // writes above, so the rows just created are never superseded here.)
      let supersededCount = 0;
      const supersededAt = new Date().toISOString();
      for (const prior of priorActiveBeforeWrite) {
        try {
          this.adapter.markAssessmentSuperseded(tenantId, prior.id, event.id, supersededAt);
          supersededCount += 1;
        } catch (supErr) {
          this._logError(tenantId, 'kernel.supersession', `markAssessmentSuperseded failed: ${supErr.message}`, { assessmentId: prior.id });
          errors.push(supErr.message);
        }
      }

      return {
        assessmentCount: newAssessments.length,
        assessments: newAssessments.map((a) => ({
          id: a.id, ruleId: a.rule_id, severity: a.severity, dataConfidence: a.data_confidence
        })),
        supersededCount,
        errors: errors.length ? errors : null
      };
    } catch (err) {
      this._logError(tenantId, 'kernel.processEvent', `Unhandled kernel error: ${err.message}`, { stack: err.stack });
      return { assessmentCount: 0, assessments: [], errors: [err.message] };
    }
  }

  /**
   * Record a human response to a System-Detected Condition (Design Law 3:
   * human authority controls all decisions). Adapter UPDATE is limited to
   * whitelisted columns only (response, response_by, response_at, status).
   */
  async recordResponse(tenantId, assessmentId, response, respondedBy) {
    const validResponses = ['confirm', 'dismiss_incorrect', 'not_applicable'];
    if (!validResponses.includes(response)) {
      return { success: false, error: `response must be one of: ${validResponses.join(', ')}` };
    }
    if (!respondedBy || typeof respondedBy !== 'string') {
      return { success: false, error: 'respondedBy is required' };
    }
    try {
      const respondedAt = new Date().toISOString();
      const ok = this.adapter.recordAssessmentResponse(tenantId, assessmentId, response, respondedBy, respondedAt);
      if (!ok) {
        return { success: false, error: 'assessment not found for this tenant' };
      }
      return { success: true, assessmentId, response, respondedBy, respondedAt, status: 'resolved' };
    } catch (err) {
      this._logError(tenantId, 'kernel.recordResponse', err.message, { assessmentId });
      return { success: false, error: err.message };
    }
  }

  /** AT-14: real metrics from persisted tables, plus live evaluation latency. */
  getMetrics(tenantId) {
    try {
      const base = this.adapter.getMetrics(tenantId);
      const avgEvaluationMs = this._evalCount > 0
        ? Number(this._evalTotalNs) / 1e6 / this._evalCount
        : 0;
      return { ...base, avgEvaluationMs };
    } catch (err) {
      this._logError(tenantId, 'kernel.getMetrics', err.message, {});
      return {
        eventCount: 0, confirmations: 0, dismissals: 0, errorCount: 0, activeCount: 0, avgEvaluationMs: 0
      };
    }
  }

  /**
   * data_confidence: 'high' if every field the rule declares as required
   * exists in the snapshot (key present, even if null); otherwise 'medium'.
   * (An evaluation exception is handled by the caller as false/'low' before
   * this is ever invoked.)
   */
  _inferConfidence(data, rule) {
    const fields = Array.isArray(rule.requiredFields) ? rule.requiredFields : [];
    if (fields.length === 0) return 'high';
    const allExist = fields.every((f) => this._fieldExists(f, data));
    return allExist ? 'high' : 'medium';
  }

  _fieldExists(fieldPath, data) {
    const parts = String(fieldPath).split('.');
    let cur = data;
    for (const part of parts) {
      if (cur === null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, part)) {
        return false;
      }
      cur = cur[part];
    }
    return true;
  }

  /** Fail quiet, log loud (Design Law 3). Never throws. */
  _logError(tenantId, source, message, context) {
    try {
      this.adapter.logError(tenantId || 'system', source, message, context || {});
    } catch (err) {
      this.logger.error('[mai-kernel] failed to write mai_error_log', err);
    }
    this.logger.error(`[mai-kernel] ${source}: ${message}`);
  }
}

module.exports = MaiKernel;
