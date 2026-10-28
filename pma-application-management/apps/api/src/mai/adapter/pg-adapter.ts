import { Pool } from 'pg';
import type {
  Assessment,
  LinkedRecordRef,
  MaiAdapter,
  MaiEvent,
  ResponseValue,
  Snapshot,
} from '../kernel/types';

// Postgres implementation of the host adapter.
//
// TWO principals (design law 12):
//   • kernelPool — connects as `mai_kernel`: SELECT host tables, INSERT mai_*,
//     UPDATE only supersession/processed columns. Used for every kernel-side write.
//   • hostPool   — connects as the host application principal. Used ONLY for
//     recordAssessmentResponse (a human acted through the host UI).
//
// In production these are two distinct DB roles. In a single-role dev/test setup
// the same pool may be passed for both; the write-scope test (AT-12) is then a
// compensating application-layer control, and the docs say so.

export interface PgAdapterOptions {
  kernelPool: Pool;
  hostPool: Pool;
  now?: () => string;
}

// DIM-read columns on "PmaCase" (Prisma camelCase) → snake_case snapshot keys.
const CASE_FIELD_MAP: Record<string, string> = {
  stcNumber: 'stc_number',
  tcNumber: 'tc_number',
  tcHolder: 'tc_holder',
  licenseAgreementPresent: 'license_agreement_present',
  complianceDataPresent: 'compliance_data_present',
  applicantLegalName: 'applicant_legal_name',
  manufacturingAddress: 'manufacturing_address',
  faaSubmissionOffice: 'faa_submission_office',
  qmsManualNumber: 'qms_manual_number',
  qmsManualRevision: 'qms_manual_revision',
  qmsManualDate: 'qms_manual_date',
  markingSchemeRef: 'marking_scheme_ref',
  icaDispositionStated: 'ica_disposition_stated',
  adImpactAddressed: 'ad_impact_addressed',
  signatoryName: 'signatory_name',
  signatoryTitle: 'signatory_title',
  pmaPartNumbers: 'pma_part_numbers',
  oemPartNumbers: 'oem_part_numbers',
  letterStcNumber: 'letter_stc_number',
  supplementStcNumber: 'supplement_stc_number',
  letterModelEligibility: 'letter_model_eligibility',
  supplementModelEligibility: 'supplement_model_eligibility',
};

const CASE_COLUMNS = Object.keys(CASE_FIELD_MAP);

function nonEmpty(v: unknown): boolean {
  return typeof v === 'string' ? v.trim().length > 0 : v != null;
}

export class PgMaiAdapter implements MaiAdapter {
  private kernel: Pool;
  private host: Pool;
  private now: () => string;

  constructor(opts: PgAdapterOptions) {
    this.kernel = opts.kernelPool;
    this.host = opts.hostPool;
    this.now = opts.now ?? (() => new Date().toISOString());
  }

  async getSnapshot(
    recordType: string,
    recordId: string,
    tenantId: string,
  ): Promise<Snapshot | null> {
    if (recordType !== 'pma_case') return null;
    const cols = CASE_COLUMNS.map((c) => `"${c}"`).join(', ');
    const { rows } = await this.kernel.query(
      `SELECT ${cols} FROM "PmaCase" WHERE id = $1 AND "tenantId" = $2`,
      [recordId, tenantId],
    );
    if (rows.length === 0) return null;
    const row = rows[0];

    const data: Record<string, unknown> = {};
    for (const [col, key] of Object.entries(CASE_FIELD_MAP)) {
      data[key] = row[col] ?? null;
    }

    // Derived same-record booleans so cross-document LINKAGE rules stay inside the
    // approved operator grammar (no invented cross-field operator — spec §4a note).
    data.stc_letter_supplement_mismatch =
      nonEmpty(row.letterStcNumber) &&
      nonEmpty(row.supplementStcNumber) &&
      String(row.letterStcNumber).trim() !== String(row.supplementStcNumber).trim();
    data.model_eligibility_letter_supplement_mismatch =
      nonEmpty(row.letterModelEligibility) &&
      nonEmpty(row.supplementModelEligibility) &&
      String(row.letterModelEligibility).trim() !==
        String(row.supplementModelEligibility).trim();
    const pma: string[] = Array.isArray(row.pmaPartNumbers) ? row.pmaPartNumbers : [];
    const oem: string[] = Array.isArray(row.oemPartNumbers) ? row.oemPartNumbers : [];
    data.pma_oem_part_number_collision = pma.some((p) =>
      oem.map((o) => o.trim()).includes(String(p).trim()),
    );

    return {
      recordType,
      recordId,
      tenantId,
      capturedAt: this.now(),
      data,
    };
  }

  async writeEvent(event: MaiEvent): Promise<void> {
    await this.kernel.query(
      `INSERT INTO mai_events
         (id, tenant_id, event_type, record_type, record_id, actor, occurred_at,
          snapshot_json, snapshot_hash, processed, processed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        event.id,
        event.tenantId,
        event.eventType,
        event.recordType,
        event.recordId,
        event.actor,
        event.occurredAt,
        JSON.stringify(event.snapshotJson),
        event.snapshotHash,
        event.processed,
        event.processedAt,
      ],
    );
  }

  async markEventProcessed(eventId: string, processedAt: string): Promise<void> {
    await this.kernel.query(
      `UPDATE mai_events SET processed = true, processed_at = $2 WHERE id = $1`,
      [eventId, processedAt],
    );
  }

  async writeAssessment(a: Assessment): Promise<void> {
    await this.kernel.query(
      `INSERT INTO mai_assessments
         (id, tenant_id, event_id, dim_id, rule_id, rule_revision, record_type,
          record_id, snapshot_hash, tier, logic_result, data_confidence, severity,
          finding_text, resolution_hint, clause_refs, status, superseded_by,
          superseded_at, created_at, response, response_by, response_at,
          prev_hash, row_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
               $19,$20,$21,$22,$23,$24,$25)`,
      [
        a.id,
        a.tenantId,
        a.eventId,
        a.dimId,
        a.ruleId,
        a.ruleRevision,
        a.recordType,
        a.recordId,
        a.snapshotHash,
        a.tier,
        a.logicResult,
        a.dataConfidence,
        a.severity,
        a.findingText,
        a.resolutionHint,
        JSON.stringify(a.clauseRefs),
        a.status,
        a.supersededBy,
        a.supersededAt,
        a.createdAt,
        a.response,
        a.responseBy,
        a.responseAt,
        a.prevHash,
        a.rowHash,
      ],
    );
  }

  // Runs under the HOST principal — a human acted through the UI.
  async recordAssessmentResponse(
    tenantId: string,
    assessmentId: string,
    response: ResponseValue,
    respondedBy: string,
    respondedAt: string,
  ): Promise<boolean> {
    const { rowCount } = await this.host.query(
      `UPDATE mai_assessments
          SET response = $3, response_by = $4, response_at = $5, status = 'resolved'
        WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [assessmentId, tenantId, response, respondedBy, respondedAt],
    );
    return (rowCount ?? 0) > 0;
  }

  // Runs under the kernel principal — supersession columns only.
  async markAssessmentSuperseded(
    tenantId: string,
    assessmentId: string,
    supersededBy: string,
    supersededAt: string,
  ): Promise<void> {
    await this.kernel.query(
      `UPDATE mai_assessments
          SET status = 'superseded', superseded_by = $3, superseded_at = $4
        WHERE id = $1 AND tenant_id = $2`,
      [assessmentId, tenantId, supersededBy, supersededAt],
    );
  }

  async loadAssessments(tenantId: string): Promise<Assessment[]> {
    const { rows } = await this.kernel.query(
      `SELECT * FROM mai_assessments WHERE tenant_id = $1 ORDER BY created_at ASC`,
      [tenantId],
    );
    return rows.map(rowToAssessment);
  }

  async loadRecordAssessments(
    tenantId: string,
    recordType: string,
    recordId: string,
  ): Promise<Assessment[]> {
    const { rows } = await this.kernel.query(
      `SELECT * FROM mai_assessments
        WHERE tenant_id = $1 AND record_type = $2 AND record_id = $3
        ORDER BY created_at ASC`,
      [tenantId, recordType, recordId],
    );
    return rows.map(rowToAssessment);
  }

  async listLinkedRecords(
    _recordType: string,
    _recordId: string,
    _linkType: string,
    _tenantId: string,
  ): Promise<LinkedRecordRef[]> {
    // No link-based rules in the pma-application-assessment DIM (cross-document
    // consistency is handled via derived same-record booleans). Returns empty so
    // linked_record_* operators evaluate deterministically if ever authored.
    return [];
  }

  async notify(args: {
    tenantId: string;
    role: string;
    message: string;
    assessmentId: string;
  }): Promise<void> {
    // Foundation: surface to the server log. A host notification table is wired in
    // the dashboard build step. Never written to mai_error_log (keeps error counts clean).
    // eslint-disable-next-line no-console
    console.log(
      `[M-AI notify] tenant=${args.tenantId} role=${args.role} assessment=${args.assessmentId}: ${args.message}`,
    );
  }

  async log(
    level: 'info' | 'warn' | 'error',
    message: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    const tenantId = (context.tenantId as string | undefined) ?? null;
    await this.kernel.query(
      `INSERT INTO mai_error_log (id, tenant_id, source, message, context_json, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        randomId(),
        tenantId,
        `kernel:${level}`,
        message,
        JSON.stringify(context),
        this.now(),
      ],
    );
  }
}

function rowToAssessment(r: Record<string, unknown>): Assessment {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    eventId: r.event_id as string,
    dimId: r.dim_id as string,
    ruleId: r.rule_id as string,
    ruleRevision: Number(r.rule_revision),
    recordType: r.record_type as string,
    recordId: r.record_id as string,
    snapshotHash: r.snapshot_hash as string,
    tier: 'system_detected_condition',
    logicResult: r.logic_result as string,
    dataConfidence: r.data_confidence as Assessment['dataConfidence'],
    severity: r.severity as Assessment['severity'],
    findingText: r.finding_text as string,
    resolutionHint: (r.resolution_hint as string | null) ?? null,
    clauseRefs: normalizeJsonArray(r.clause_refs),
    status: r.status as Assessment['status'],
    supersededBy: (r.superseded_by as string | null) ?? null,
    supersededAt: (r.superseded_at as string | null) ?? null,
    createdAt: r.created_at as string,
    response: (r.response as Assessment['response']) ?? null,
    responseBy: (r.response_by as string | null) ?? null,
    responseAt: (r.response_at as string | null) ?? null,
    prevHash: (r.prev_hash as string | null) ?? null,
    rowHash: r.row_hash as string,
  };
}

function normalizeJsonArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function randomId(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('crypto').randomUUID();
}
