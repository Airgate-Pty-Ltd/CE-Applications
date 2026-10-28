import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import type { MaiEvent, NowFn } from './kernel/types';
import { hashSnapshot, canonicalize, sha256Hex } from './kernel/hash';
import { MaiKernel } from './kernel/kernel';
import { RuleRegistry, RegistryValidationError } from './kernel/registry';
import { PgMaiAdapter } from './adapter/pg-adapter';
import { loadAllDims, defaultDimsDir } from './dims-loader';
import type { LoadedDim } from './kernel/registry';
import { generateCharter } from './charter';

// Wires the kernel into the host: loads DIMs, builds the registry + kernel
// (fail-quiet if configuration is invalid — AT-13), persists the rule registry,
// and exposes the emit "bell" used by host mutation routes.

export interface BuildMaiOptions {
  kernelPool: Pool;
  hostPool: Pool;
  dimsDir?: string;
  now?: NowFn;
}

export interface EmitArgs {
  eventType: string;
  recordId: string;
  tenantId: string;
  actor: string;
}

export class MaiService {
  readonly adapter: PgMaiAdapter;
  readonly kernel: MaiKernel | null;
  readonly registry: RuleRegistry | null;
  readonly enabled: boolean;
  private hostPool: Pool;
  private now: NowFn;
  private dims: LoadedDim[];

  private constructor(args: {
    adapter: PgMaiAdapter;
    kernel: MaiKernel | null;
    registry: RuleRegistry | null;
    hostPool: Pool;
    now: NowFn;
    dims: LoadedDim[];
  }) {
    this.adapter = args.adapter;
    this.kernel = args.kernel;
    this.registry = args.registry;
    this.enabled = args.kernel !== null;
    this.hostPool = args.hostPool;
    this.now = args.now;
    this.dims = args.dims;
  }

  static async build(opts: BuildMaiOptions): Promise<MaiService> {
    const now: NowFn = opts.now ?? (() => new Date().toISOString());
    const adapter = new PgMaiAdapter({
      kernelPool: opts.kernelPool,
      hostPool: opts.hostPool,
      now,
    });
    const dims = loadAllDims(opts.dimsDir ?? defaultDimsDir());

    let kernel: MaiKernel | null = null;
    let registry: RuleRegistry | null = null;
    try {
      registry = new RuleRegistry(dims);
      kernel = new MaiKernel({ adapter, registry, now });
    } catch (err) {
      // Invalid rule configuration → M-AI DISABLED; host is unaffected (AT-13).
      // Logged loud, fails quiet.
      if (err instanceof RegistryValidationError) {
        await adapter
          .log('error', 'mai_disabled_invalid_registry', { error: err.message })
          .catch(() => undefined);
      } else {
        throw err;
      }
    }

    const service = new MaiService({
      adapter,
      kernel,
      registry,
      hostPool: opts.hostPool,
      now,
      dims,
    });
    if (registry) await service.persistRegistry(registry);
    return service;
  }

  // Populate mai_rule_registry from the loaded rules (checklist §1).
  private async persistRegistry(registry: RuleRegistry): Promise<void> {
    const loadedAt = this.now();
    for (const row of registry.registryRows()) {
      await this.hostPool.query(
        `INSERT INTO mai_rule_registry
           (rule_id, dim_id, revision, effective_date, approved_by, loaded_at,
            definition_json, definition_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (dim_id, rule_id, revision) DO UPDATE
           SET definition_json = EXCLUDED.definition_json,
               definition_hash = EXCLUDED.definition_hash,
               loaded_at = EXCLUDED.loaded_at`,
        [
          row.ruleId,
          row.dimId,
          row.revision,
          row.effectiveDate,
          row.approvedBy,
          loadedAt,
          JSON.stringify(row.definition),
          row.definitionHash,
        ],
      );
    }
  }

  // The emit "bell": called by a host mutation route AFTER the host write commits.
  // commit → snapshot → real hash → write event → processEvent → mark processed.
  // Entirely fail-quiet: if M-AI is disabled or errors, the host is unaffected.
  async emitCaseEvent(args: EmitArgs): Promise<void> {
    if (!this.kernel) return;
    try {
      const snap = await this.adapter.getSnapshot('pma_case', args.recordId, args.tenantId);
      if (!snap) return;
      const event: MaiEvent = {
        id: randomUUID(),
        tenantId: args.tenantId,
        eventType: args.eventType,
        recordType: 'pma_case',
        recordId: args.recordId,
        actor: args.actor,
        occurredAt: snap.capturedAt,
        snapshotJson: snap.data,
        snapshotHash: hashSnapshot(snap.data),
        processed: false,
        processedAt: null,
      };
      await this.adapter.writeEvent(event);
      await this.kernel.processEvent(event);
      await this.adapter.markEventProcessed(event.id, this.now());
    } catch (err) {
      await this.adapter
        .log('error', 'emit_case_event_failed', {
          tenantId: args.tenantId,
          recordId: args.recordId,
          error: err instanceof Error ? err.message : String(err),
        })
        .catch(() => undefined);
    }
  }

  // Evidence export from PERSISTED tables (tenant-scoped) — checklist §7, AT-08.
  async exportEvidence(tenantId: string): Promise<Record<string, unknown>> {
    const { rows: assessments } = await this.hostPool.query(
      `SELECT * FROM mai_assessments WHERE tenant_id = $1 ORDER BY created_at ASC`,
      [tenantId],
    );
    const { rows: events } = await this.hostPool.query(
      `SELECT id, snapshot_hash, event_type, record_id FROM mai_events WHERE tenant_id = $1`,
      [tenantId],
    );
    const { rows: registryRows } = await this.hostPool.query(
      `SELECT rule_id, dim_id, revision, definition_hash FROM mai_rule_registry ORDER BY dim_id, rule_id`,
    );
    const manifests = this.registry?.manifests() ?? [];

    const manifest = {
      exportId: randomUUID(),
      exportedAt: this.now(),
      tenantId,
      scope: 'all',
      counts: {
        events: events.length,
        assessments: assessments.length,
        active: assessments.filter((a) => a.status === 'active').length,
        resolved: assessments.filter((a) => a.status === 'resolved').length,
        superseded: assessments.filter((a) => a.status === 'superseded').length,
        rules: registryRows.length,
      },
      snapshotHashes: [...new Set(events.map((e) => e.snapshot_hash))],
      ruleDefinitionHashes: registryRows.map((r) => ({
        ruleId: r.rule_id,
        revision: r.revision,
        definitionHash: r.definition_hash,
      })),
      dimRevisions: manifests.map((m) => ({ dimId: m.dimId, version: m.version })),
    };
    const charters = this.dims.map((d) => ({
      dimId: d.manifest.dimId,
      charter: generateCharter(d),
    }));
    const pkg = { manifest, assessments, ruleRegistry: registryRows, charters };
    const packageHash = sha256Hex(canonicalize(pkg));
    return { ...pkg, manifest: { ...manifest, packageHash } };
  }
}
