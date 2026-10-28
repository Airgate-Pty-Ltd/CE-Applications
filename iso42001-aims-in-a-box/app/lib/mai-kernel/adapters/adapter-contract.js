/**
 * Adapter Contract (lib/mai-kernel/adapters/adapter-contract.js)
 *
 * Abstract base class defining the interface the kernel calls into. Design
 * Law 12: kernel imports nothing from any host — the host's database
 * specifics live entirely behind this contract.
 *
 * ADAPTED FROM the reference kernel: method names/shape now match
 * integration-checklist.md section 2 (getSnapshot, writeEvent,
 * markEventProcessed, writeAssessment, recordAssessmentResponse,
 * markAssessmentSuperseded, loadAssessments, listLinkedRecords, notify, log)
 * plus the small set of query methods the kernel itself needs for the
 * idempotency/supersession/ledger-chain logic (getActiveAssessmentsByHash,
 * getActiveAssessmentsForRecord, getLastRowHash, logError,
 * upsertRuleRegistryEntry, getMetrics).
 */

class AdapterContract {
  constructor(config = {}) {
    this.config = config;
  }

  // ---- Host record snapshot -------------------------------------------------

  /** Read the current row for a host record as a plain object + capturedAt. */
  getSnapshot(recordType, recordId, tenantId) {
    throw new Error('getSnapshot() must be implemented by adapter');
  }

  // ---- Events ----------------------------------------------------------------

  /** Insert a mai_events row (host writes this BEFORE calling kernel.processEvent). */
  writeEvent(event) {
    throw new Error('writeEvent() must be implemented by adapter');
  }

  /** UPDATE limited to processed, processed_at. */
  markEventProcessed(tenantId, eventId, processedAt) {
    throw new Error('markEventProcessed() must be implemented by adapter');
  }

  // ---- Assessments -------------------------------------------------------

  /** INSERT a new mai_assessments row (kernel-generated id persisted verbatim). */
  writeAssessment(assessment) {
    throw new Error('writeAssessment() must be implemented by adapter');
  }

  /** Active (status='active') assessments sharing this exact snapshot hash — idempotency gate. */
  getActiveAssessmentsByHash(tenantId, recordType, recordId, snapshotHash) {
    throw new Error('getActiveAssessmentsByHash() must be implemented by adapter');
  }

  /** All active assessments for a record, any rule — used for supersession sweep. */
  getActiveAssessmentsForRecord(tenantId, recordType, recordId) {
    throw new Error('getActiveAssessmentsForRecord() must be implemented by adapter');
  }

  /** UPDATE limited to status='superseded', superseded_by, superseded_at. */
  markAssessmentSuperseded(tenantId, assessmentId, supersededBy, supersededAt) {
    throw new Error('markAssessmentSuperseded() must be implemented by adapter');
  }

  /** UPDATE limited to response, response_by, response_at, status='resolved'. Returns boolean. */
  recordAssessmentResponse(tenantId, assessmentId, response, respondedBy, respondedAt) {
    throw new Error('recordAssessmentResponse() must be implemented by adapter');
  }

  /** Kernel cache hydration at startup / general listing (tenant-scoped). */
  loadAssessments(tenantId, filters) {
    throw new Error('loadAssessments() must be implemented by adapter');
  }

  getAssessmentById(tenantId, assessmentId) {
    throw new Error('getAssessmentById() must be implemented by adapter');
  }

  /** Most recent row_hash for this tenant (ledger hash-chaining). */
  getLastRowHash(tenantId) {
    throw new Error('getLastRowHash() must be implemented by adapter');
  }

  // ---- Links, errors, registry, metrics, notification ------------------------

  listLinkedRecords(recordType, recordId, linkType, tenantId) {
    throw new Error('listLinkedRecords() must be implemented by adapter');
  }

  logError(tenantId, source, message, context) {
    throw new Error('logError() must be implemented by adapter');
  }

  upsertRuleRegistryEntry(entry) {
    throw new Error('upsertRuleRegistryEntry() must be implemented by adapter');
  }

  getRuleRegistry() {
    throw new Error('getRuleRegistry() must be implemented by adapter');
  }

  getMetrics(tenantId) {
    throw new Error('getMetrics() must be implemented by adapter');
  }

  notify({ tenantId, role, message, assessmentId }) {
    throw new Error('notify() must be implemented by adapter');
  }

  log(level, message, context) {
    throw new Error('log() must be implemented by adapter');
  }
}

module.exports = AdapterContract;
