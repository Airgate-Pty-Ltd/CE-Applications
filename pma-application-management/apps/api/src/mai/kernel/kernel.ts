import { randomUUID } from 'crypto';
import type {
  Assessment,
  MaiAdapter,
  MaiEvent,
  NowFn,
  Rule,
  DimManifest,
} from './types';
import { canonicalize, sha256Hex } from './hash';
import { RuleRegistry } from './registry';
import { evaluateRule } from './evaluator';

// M-AI Core kernel. Deterministic, rules-only, advisory. Writes only to mai_*
// tables (through the adapter). Every entry point is wrapped: on any failure it
// logs to mai_error_log and returns quietly so the host workflow is untouched
// (design law 3, AT-09).

export interface ProcessResult {
  created: number;
  superseded: number;
  evaluated: number;
  errored: number;
  skippedIdempotent: number;
}

export interface KernelMetrics {
  eventsProcessed: number;
  evaluationsRun: number;
  assessmentsCreated: number;
  assessmentsSuperseded: number;
  errorCount: number;
  totalEvaluationMs: number;
  avgEvaluationMs: number;
}

export interface KernelOptions {
  adapter: MaiAdapter;
  registry: RuleRegistry;
  now?: NowFn;
  notifyRole?: string; // role notified on a BLOCKING condition; default 'REVIEWER'
}

export class MaiKernel {
  private adapter: MaiAdapter;
  private registry: RuleRegistry;
  private now: NowFn;
  private notifyRole: string;

  // The DB is the source of truth. Per event we read the record's assessments
  // directly (loadRecordAssessments), so a freshly constructed kernel behaves
  // identically to a long-running one (AT-16 restart survival) with no cache to
  // fall out of sync. Only the per-tenant hash-chain head is memoized, seeded
  // lazily from the DB.
  private lastRowHash = new Map<string, string>();
  private hydratedTenants = new Set<string>();

  private metricsState: KernelMetrics = {
    eventsProcessed: 0,
    evaluationsRun: 0,
    assessmentsCreated: 0,
    assessmentsSuperseded: 0,
    errorCount: 0,
    totalEvaluationMs: 0,
    avgEvaluationMs: 0,
  };

  constructor(opts: KernelOptions) {
    this.adapter = opts.adapter;
    this.registry = opts.registry;
    this.now = opts.now ?? (() => new Date().toISOString());
    this.notifyRole = opts.notifyRole ?? 'REVIEWER';
  }

  metrics(): KernelMetrics {
    const m = this.metricsState;
    return {
      ...m,
      avgEvaluationMs: m.evaluationsRun ? m.totalEvaluationMs / m.evaluationsRun : 0,
    };
  }

  // Process a persisted event. The event row (with real snapshot_json + hash) has
  // already been written by the host emit path before this is called.
  async processEvent(event: MaiEvent): Promise<ProcessResult> {
    const empty: ProcessResult = {
      created: 0,
      superseded: 0,
      evaluated: 0,
      errored: 0,
      skippedIdempotent: 0,
    };
    try {
      await this.ensureHydrated(event.tenantId);

      const applicable = this.registry.rulesForEvent(event.eventType);
      const existing = await this.adapter.loadRecordAssessments(
        event.tenantId,
        event.recordType,
        event.recordId,
      );
      const existingActive = existing.filter((a) => a.status === 'active');

      // Evaluate every applicable rule against the immutable snapshot.
      const fired: { dim: DimManifest; rule: Rule; dataConfidence: Assessment['dataConfidence'] }[] = [];
      let evaluated = 0;
      let errored = 0;
      const startNs = process.hrtime.bigint();
      for (const { dim, rule } of applicable) {
        evaluated += 1;
        try {
          const { result, dataConfidence } = await evaluateRule(rule.condition, {
            data: event.snapshotJson,
            recordType: event.recordType,
            recordId: event.recordId,
            tenantId: event.tenantId,
            adapter: this.adapter,
          });
          if (result) fired.push({ dim, rule, dataConfidence });
        } catch (err) {
          // Fault isolation (AT-15): one bad rule logs and is skipped; others run.
          errored += 1;
          this.metricsState.errorCount += 1;
          await this.safeLog('error', 'rule_evaluation_failed', {
            tenantId: event.tenantId,
            ruleId: rule.ruleId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
      this.metricsState.evaluationsRun += evaluated;
      this.metricsState.totalEvaluationMs += elapsedMs;

      const firedRuleIds = new Set(fired.map((f) => f.rule.ruleId));
      let created = 0;
      let superseded = 0;
      let skippedIdempotent = 0;

      for (const f of fired) {
        // Same rule + same snapshot already assessed (active OR human-resolved) →
        // idempotent: never re-raise a finding a human already saw or dispositioned
        // for this exact snapshot (checklist §5, AT-10, AT-16).
        const sameSnapshotHandled = existing.find(
          (a) =>
            a.ruleId === f.rule.ruleId &&
            a.snapshotHash === event.snapshotHash &&
            (a.status === 'active' || a.status === 'resolved'),
        );
        if (sameSnapshotHandled) {
          skippedIdempotent += 1;
          continue;
        }
        const priorActive = existingActive.find((a) => a.ruleId === f.rule.ruleId);
        const assessment = this.buildAssessment(event, f.dim, f.rule, f.dataConfidence);
        await this.adapter.writeAssessment(assessment);
        created += 1;
        this.metricsState.assessmentsCreated += 1;

        if (priorActive) {
          // Changed snapshot, rule re-fires → supersede old active, link forward.
          await this.adapter.markAssessmentSuperseded(
            event.tenantId,
            priorActive.id,
            assessment.id,
            this.now(),
          );
          superseded += 1;
          this.metricsState.assessmentsSuperseded += 1;
        }

        if (assessment.severity === 'blocking') {
          await this.safeNotify({
            tenantId: event.tenantId,
            role: this.notifyRole,
            message: `Blocking System-Detected Condition on ${event.recordType} ${event.recordId}: ${assessment.findingText}`,
            assessmentId: assessment.id,
          });
        }
      }

      // Resolve-stale: prior active rows whose rule no longer fires.
      for (const a of existingActive) {
        if (!firedRuleIds.has(a.ruleId)) {
          await this.adapter.markAssessmentSuperseded(
            event.tenantId,
            a.id,
            `no_longer_firing:${event.snapshotHash}`,
            this.now(),
          );
          superseded += 1;
          this.metricsState.assessmentsSuperseded += 1;
        }
      }

      this.metricsState.eventsProcessed += 1;
      return { created, superseded, evaluated, errored, skippedIdempotent };
    } catch (err) {
      // Fail quiet: kernel failure never disrupts the host workflow.
      this.metricsState.errorCount += 1;
      await this.safeLog('error', 'process_event_failed', {
        tenantId: event.tenantId,
        eventId: event.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return empty;
    }
  }

  private buildAssessment(
    event: MaiEvent,
    dim: DimManifest,
    rule: Rule,
    dataConfidence: Assessment['dataConfidence'],
  ): Assessment {
    const id = randomUUID();
    const createdAt = this.now();
    const prevHash = this.lastRowHash.get(event.tenantId) ?? null;
    const core = {
      id,
      tenantId: event.tenantId,
      eventId: event.id,
      dimId: rule.dimId,
      ruleId: rule.ruleId,
      ruleRevision: rule.revision,
      recordType: event.recordType,
      recordId: event.recordId,
      snapshotHash: event.snapshotHash,
      logicResult: rule.logicResult ?? 'condition_met',
      dataConfidence,
      severity: rule.gapClass.toLowerCase() as Assessment['severity'],
      findingText: rule.findingText,
      resolutionHint: rule.resolutionHint ?? null,
      clauseRefs: rule.clauseRefs,
      createdAt,
    };
    const rowHash = sha256Hex(canonicalize({ ...core, prevHash }));
    this.lastRowHash.set(event.tenantId, rowHash);
    return {
      ...core,
      tier: 'system_detected_condition',
      status: 'active',
      supersededBy: null,
      supersededAt: null,
      response: null,
      responseBy: null,
      responseAt: null,
      prevHash,
      rowHash,
    };
  }

  // Seed the per-tenant hash-chain head from the DB once (restart survival: a
  // fresh kernel continues the chain from the last persisted row).
  private async ensureHydrated(tenantId: string): Promise<void> {
    if (this.hydratedTenants.has(tenantId)) return;
    const all = await this.adapter.loadAssessments(tenantId);
    const latest = [...all].sort((x, y) => x.createdAt.localeCompare(y.createdAt)).pop();
    if (latest) this.lastRowHash.set(tenantId, latest.rowHash);
    this.hydratedTenants.add(tenantId);
  }

  private async safeLog(
    level: 'info' | 'warn' | 'error',
    message: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.adapter.log(level, message, context);
    } catch {
      // Logging must never throw into the host path.
    }
  }

  private async safeNotify(args: {
    tenantId: string;
    role: string;
    message: string;
    assessmentId: string;
  }): Promise<void> {
    try {
      await this.adapter.notify(args);
    } catch {
      // Notification failure must never disrupt processing.
    }
  }
}
