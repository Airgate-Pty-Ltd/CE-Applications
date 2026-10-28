import express, { type Express, type Request, type Response } from 'express';
import multer from 'multer';
import { Pool } from 'pg';
import type { MaiService } from '../mai/service';
import { CaseStore, type CasePatch } from '../host/case-store';
import { OrganizationService } from '../host/organizations';
import { UserService } from '../host/users';
import { EvidenceService } from '../host/evidence';
import { DataFieldService, type WriteMethod } from '../host/datafields';
import { extractFromPdf } from '../host/intake/extract';
import { DOC_TYPE_FIELDS } from '../host/intake/field-registry';
import { GenerationService, GenerationBlockedError } from '../host/generation/service';
import type { DocType } from '../host/generation/documents';
import { RegulatorySourceService, type SourceFetcher, type FallbackResolver } from '../host/registry';
import { LibraryService } from '../host/library';
import { writeAudit, listAudit } from '../host/audit';
import { authContext, ctx, requireRole, signToken } from './auth';
import type { ResponseValue } from '../mai/kernel/types';

const DOC_TYPES = ['APPLICATION_LETTER', 'PMA_SUPPLEMENT', 'SUBMISSION_CHECKLIST', 'MANAGEMENT_REVIEW_PACK'];
const SOURCE_CATEGORIES = ['AC', 'CFR_SECTION', 'FAA_FORM'];

const EVIDENCE_TYPES = ['STC', 'ASSIST_LETTER', 'TC_HOLDER_LETTER', 'MASTER_DRAWING_LIST', 'DRAWING', 'TEST_REPORT', 'QMS_MANUAL_EXCERPT', 'OTHER'];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// HTTP surface. Auth routes are public; everything else runs behind authContext
// and is strictly tenant-scoped (AT-11). Case mutation routes ring the M-AI emit
// bell after committing the host write. Response values are taxonomy-validated.

const RESPONSE_TAXONOMY: ResponseValue[] = ['confirm', 'dismiss_incorrect', 'dismiss_not_applicable'];

const CASE_FORWARD_RANK: Record<string, number> = {
  INTAKE: 0,
  GAP_REVIEW: 1,
  DRAFTING: 2,
  UNDER_REVIEW: 3,
  READY_FOR_SIGNATURE: 4,
  EXPORTED: 5,
  ARCHIVED: 6,
};

export interface AppDeps {
  service: MaiService;
  pool: Pool;
  // Optional injection for the registry (tests supply a mock fetcher/resolver).
  registry?: { fetcher?: SourceFetcher; resolver?: FallbackResolver };
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const pool = deps.pool;
  const cases = new CaseStore(pool);
  const orgs = new OrganizationService(pool);
  const users = new UserService(pool);
  const evidence = new EvidenceService(pool);
  const dataFields = new DataFieldService(pool);
  const generation = new GenerationService(pool);
  const registry = new RegulatorySourceService(pool, { fetcher: deps.registry?.fetcher, resolver: deps.registry?.resolver });
  const library = new LibraryService(pool);

  const wrap =
    (fn: (req: Request, res: Response) => Promise<void>) =>
    (req: Request, res: Response) =>
      fn(req, res).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        if (!res.headersSent) res.status(500).json({ error: 'internal error' });
      });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'pma-autopilot-api', maiEnabled: deps.service.enabled });
  });

  // ── Public auth routes ────────────────────────────────────────────────────────
  app.post(
    '/api/auth/register',
    wrap(async (req, res) => {
      const { orgName, slug, email, password, fullName } = req.body ?? {};
      if (!orgName || !slug || !email || !password || !fullName) {
        res.status(400).json({ error: 'orgName, slug, email, password, fullName required' });
        return;
      }
      if (await orgs.findBySlug(slug)) {
        res.status(409).json({ error: 'slug already taken' });
        return;
      }
      const tenantId = await orgs.create({ name: orgName, slug });
      const userId = await users.create({ tenantId, email, password, fullName, role: 'ADMIN' });
      await writeAudit(pool, { tenantId, actorUserId: userId, action: 'org_registered', recordType: 'organization', recordId: tenantId });
      res.status(201).json({ token: signToken({ tenantId, userId, role: 'ADMIN' }) });
    }),
  );

  app.post(
    '/api/auth/login',
    wrap(async (req, res) => {
      const { email, password } = req.body ?? {};
      const user = await users.findByEmailGlobal(email ?? '');
      if (!user || !(await users.verifyLogin(user, password ?? ''))) {
        res.status(401).json({ error: 'invalid credentials' });
        return;
      }
      res.json({
        token: signToken({ tenantId: user.tenantId, userId: user.id, role: user.role }),
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      });
    }),
  );

  // ── Everything below requires auth context ─────────────────────────────────────
  app.use('/api', authContext);

  app.get('/api/me', (req, res) => res.json(ctx(req)));

  // Organization + Submission Office Profile (tenant-specific, never defaulted).
  app.get(
    '/api/org',
    wrap(async (req, res) => {
      const org = await orgs.get(ctx(req).tenantId);
      if (!org) return void res.status(404).json({ error: 'not found' });
      res.json(org);
    }),
  );
  app.patch(
    '/api/org/submission-office',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const { tenantId, userId } = ctx(req);
      await orgs.setSubmissionOffice(tenantId, req.body ?? {});
      await writeAudit(pool, { tenantId, actorUserId: userId, action: 'submission_office_updated', recordType: 'organization', recordId: tenantId, detail: req.body });
      res.json({ ok: true });
    }),
  );

  // User admin.
  app.post(
    '/api/users',
    requireRole('ADMIN'),
    wrap(async (req, res) => {
      const { tenantId, userId } = ctx(req);
      const { email, password, fullName, role } = req.body ?? {};
      if (!email || !password || !fullName) {
        res.status(400).json({ error: 'email, password, fullName required' });
        return;
      }
      const id = await users.create({ tenantId, email, password, fullName, role });
      await writeAudit(pool, { tenantId, actorUserId: userId, action: 'user_created', recordType: 'user', recordId: id, detail: { role } });
      res.status(201).json({ id });
    }),
  );

  // ── Cases ───────────────────────────────────────────────────────────────────
  app.post(
    '/api/cases',
    wrap(async (req, res) => {
      const { tenantId, userId } = ctx(req);
      const id = await cases.create(tenantId, req.body as CasePatch);
      await writeAudit(pool, { tenantId, actorUserId: userId, action: 'case_created', recordType: 'pma_case', recordId: id });
      await deps.service.emitCaseEvent({ eventType: 'pma_case.created', recordId: id, tenantId, actor: userId });
      res.status(201).json({ id });
    }),
  );

  app.get(
    '/api/cases',
    wrap(async (req, res) => {
      res.json({ cases: await cases.list(ctx(req).tenantId) });
    }),
  );

  app.get(
    '/api/cases/:id',
    wrap(async (req, res) => {
      const c = await cases.get(ctx(req).tenantId, req.params.id);
      if (!c) return void res.status(404).json({ error: 'not found' });
      res.json(c);
    }),
  );

  app.patch(
    '/api/cases/:id',
    wrap(async (req, res) => {
      const { tenantId, userId } = ctx(req);
      const ok = await cases.update(tenantId, req.params.id, req.body as CasePatch);
      if (!ok) return void res.status(404).json({ error: 'case not found' });
      await writeAudit(pool, { tenantId, actorUserId: userId, action: 'case_updated', recordType: 'pma_case', recordId: req.params.id });
      await deps.service.emitCaseEvent({ eventType: 'pma_case.updated', recordId: req.params.id, tenantId, actor: userId });
      res.json({ ok: true });
    }),
  );

  app.post(
    '/api/cases/:id/closure',
    wrap(async (req, res) => {
      const { tenantId, userId } = ctx(req);
      await deps.service.emitCaseEvent({ eventType: 'pma_case.closure_submitted', recordId: req.params.id, tenantId, actor: userId });
      res.json({ ok: true });
    }),
  );

  // Human confirms the approval basis (decision, not extraction).
  app.post(
    '/api/cases/:id/basis',
    wrap(async (req, res) => {
      const { tenantId, userId } = ctx(req);
      const basis = req.body?.approvalBasis;
      const allowed = ['STC_IDENTICALITY', 'TC_LICENSED', 'IDENTICALITY_NO_LICENSE', 'TEST_AND_COMPUTATION', 'AMBIGUOUS'];
      if (!allowed.includes(basis)) {
        res.status(400).json({ error: 'invalid approvalBasis', allowed });
        return;
      }
      const ok = await cases.confirmBasis(tenantId, req.params.id, basis, userId);
      if (!ok) return void res.status(404).json({ error: 'case not found' });
      await writeAudit(pool, { tenantId, actorUserId: userId, action: 'basis_confirmed', recordType: 'pma_case', recordId: req.params.id, detail: { basis } });
      await deps.service.emitCaseEvent({ eventType: 'pma_case.updated', recordId: req.params.id, tenantId, actor: userId });
      res.json({ ok: true });
    }),
  );

  // Status transition with the completeness gate + role gate.
  app.post(
    '/api/cases/:id/status',
    wrap(async (req, res) => {
      const { tenantId, userId, role } = ctx(req);
      const target = req.body?.status;
      if (!(target in CASE_FORWARD_RANK)) {
        res.status(400).json({ error: 'invalid status' });
        return;
      }
      const c = await cases.get(tenantId, req.params.id);
      if (!c) return void res.status(404).json({ error: 'case not found' });
      const forward = CASE_FORWARD_RANK[target] > CASE_FORWARD_RANK[c.status];

      // Gate: a case may NEVER leave GAP_REVIEW with an open BLOCKING condition.
      if (forward && c.status === 'GAP_REVIEW') {
        const blocking = await cases.countActiveBlocking(tenantId, req.params.id);
        if (blocking > 0) {
          res.status(409).json({ error: 'blocked', reason: `${blocking} open BLOCKING System-Detected Condition(s) must be resolved`, blocking });
          return;
        }
      }
      // Reviewer role required to move a case out of Drafting.
      if (forward && c.status === 'DRAFTING' && role === 'PREPARER') {
        res.status(403).json({ error: 'REVIEWER role required to move a case out of Drafting' });
        return;
      }
      await cases.setStatus(tenantId, req.params.id, target);
      await writeAudit(pool, { tenantId, actorUserId: userId, action: 'case_status_changed', recordType: 'pma_case', recordId: req.params.id, detail: { from: c.status, to: target } });
      res.json({ ok: true, status: target });
    }),
  );

  // ── Deterministic intake: evidence upload + extraction ────────────────────────
  app.post(
    '/api/cases/:id/evidence',
    upload.single('file'),
    wrap(async (req, res) => {
      const { tenantId, userId } = ctx(req);
      const type = (req.body?.type as string) || 'OTHER';
      if (!EVIDENCE_TYPES.includes(type)) {
        res.status(400).json({ error: 'invalid evidence type', allowed: EVIDENCE_TYPES });
        return;
      }
      const file = (req as unknown as { file?: { originalname: string; buffer: Buffer } }).file;
      if (!file) return void res.status(400).json({ error: 'file required (multipart field "file")' });
      const c = await cases.get(tenantId, req.params.id);
      if (!c) return void res.status(404).json({ error: 'case not found' });

      const stored = await evidence.store({ tenantId, caseId: req.params.id, type, fileName: file.originalname, buffer: file.buffer, uploadedByUserId: userId });
      await writeAudit(pool, { tenantId, actorUserId: userId, action: 'evidence_uploaded', recordType: 'evidence_document', recordId: stored.id, detail: { type, contentHash: stored.contentHash } });

      // Deterministic extraction (PDF form fields + format-known patterns).
      let extracted: { fieldKey: string; value: string; method: WriteMethod; citation: string }[] = [];
      if (/\.pdf$/i.test(file.originalname)) {
        extracted = (await extractFromPdf(file.buffer)).map((e) => ({ ...e }));
        await dataFields.writeMany(
          tenantId,
          req.params.id,
          extracted.map((e) => ({ fieldKey: e.fieldKey, value: e.value, method: e.method, sourceEvidenceId: stored.id, citation: e.citation })),
        );
        if (extracted.length) {
          await writeAudit(pool, { tenantId, actorUserId: userId, action: 'fields_extracted', recordType: 'evidence_document', recordId: stored.id, detail: { fields: extracted.map((e) => e.fieldKey) } });
          await deps.service.emitCaseEvent({ eventType: 'pma_case.updated', recordId: req.params.id, tenantId, actor: userId });
        }
      }

      const status = await dataFields.status(tenantId, req.params.id);
      res.status(201).json({
        evidenceId: stored.id,
        extracted,
        expectedFields: DOC_TYPE_FIELDS[type] ?? [],
        status,
      });
    }),
  );

  app.get(
    '/api/cases/:id/evidence',
    wrap(async (req, res) => {
      res.json({ evidence: await evidence.list(ctx(req).tenantId, req.params.id) });
    }),
  );

  // Guided transcription: preparer confirms fields read off the source document.
  app.post(
    '/api/cases/:id/fields',
    wrap(async (req, res) => {
      const { tenantId, userId } = ctx(req);
      const fields = (req.body?.fields ?? []) as { fieldKey: string; value: unknown; sourceEvidenceId?: string }[];
      if (!Array.isArray(fields) || fields.length === 0) {
        res.status(400).json({ error: 'fields[] required' });
        return;
      }
      const c = await cases.get(tenantId, req.params.id);
      if (!c) return void res.status(404).json({ error: 'case not found' });
      const n = await dataFields.writeMany(
        tenantId,
        req.params.id,
        fields.map((f) => ({ fieldKey: f.fieldKey, value: f.value, method: 'preparer_transcribed' as const, sourceEvidenceId: f.sourceEvidenceId ?? null, citation: 'preparer_transcribed' })),
      );
      await writeAudit(pool, { tenantId, actorUserId: userId, action: 'fields_transcribed', recordType: 'pma_case', recordId: req.params.id, detail: { count: n } });
      await deps.service.emitCaseEvent({ eventType: 'pma_case.updated', recordId: req.params.id, tenantId, actor: userId });
      res.json({ written: n, status: await dataFields.status(tenantId, req.params.id) });
    }),
  );

  app.get(
    '/api/cases/:id/fields',
    wrap(async (req, res) => {
      const { tenantId } = ctx(req);
      res.json({ fields: await dataFields.list(tenantId, req.params.id), status: await dataFields.status(tenantId, req.params.id) });
    }),
  );

  // ── Document generation (a BLOCKING condition blocks generation) ──────────────
  app.post(
    '/api/cases/:id/generate',
    wrap(async (req, res) => {
      const { tenantId, userId } = ctx(req);
      const type = req.body?.type as DocType;
      if (!DOC_TYPES.includes(type)) {
        res.status(400).json({ error: 'invalid document type', allowed: DOC_TYPES });
        return;
      }
      const c = await cases.get(tenantId, req.params.id);
      if (!c) return void res.status(404).json({ error: 'case not found' });
      // A detected regulatory-source change freezes new drafts until an Admin reviews it.
      if ((await registry.hasFrozen(tenantId)) > 0) {
        res.status(409).json({ error: 'blocked', reason: 'a regulatory source changed and is frozen pending Admin review; resolve it before generating new drafts' });
        return;
      }
      const org = await orgs.get(tenantId);
      try {
        const result = await generation.generate(tenantId, c, type, userId, org);
        await writeAudit(pool, { tenantId, actorUserId: userId, action: 'document_generated', recordType: 'generated_document', recordId: result.id, detail: { type, submissionStatus: result.submissionStatus, snapshotHash: result.dataSnapshotHash } });
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof GenerationBlockedError) {
          res.status(409).json({ error: 'blocked', reason: 'open BLOCKING System-Detected Condition(s) must be resolved before generation', blocking: err.gaps.blocking });
          return;
        }
        throw err;
      }
    }),
  );

  app.get(
    '/api/cases/:id/documents',
    wrap(async (req, res) => {
      res.json({ documents: await generation.list(ctx(req).tenantId, req.params.id) });
    }),
  );

  app.get(
    '/api/documents/:id/download',
    wrap(async (req, res) => {
      const found = await generation.getForDownload(ctx(req).tenantId, req.params.id);
      if (!found) return void res.status(404).json({ error: 'not found' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${found.type}.docx"`);
      res.sendFile(found.storageKey);
    }),
  );

  // ── Assessments (System-Detected Conditions) ──────────────────────────────────
  app.get(
    '/api/cases/:id/assessments',
    wrap(async (req, res) => {
      const { tenantId } = ctx(req);
      const status = (req.query.status as string | undefined) ?? 'active';
      const { rows } = await pool.query(
        `SELECT * FROM mai_assessments
          WHERE tenant_id=$1 AND record_type='pma_case' AND record_id=$2
            AND ($3='all' OR status=$3)
          ORDER BY created_at ASC`,
        [tenantId, req.params.id, status],
      );
      res.json({ conditions: rows.map(toDisplay) });
    }),
  );

  app.get(
    '/api/assessments/:id',
    wrap(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT * FROM mai_assessments WHERE id=$1 AND tenant_id=$2`,
        [req.params.id, ctx(req).tenantId],
      );
      if (rows.length === 0) return void res.status(404).json({ error: 'not found' });
      res.json(toDisplay(rows[0]));
    }),
  );

  app.post(
    '/api/assessments/:id/respond',
    wrap(async (req, res) => {
      const { tenantId, userId } = ctx(req);
      const response = req.body?.response as ResponseValue;
      if (!RESPONSE_TAXONOMY.includes(response)) {
        res.status(400).json({ error: 'invalid response', allowed: RESPONSE_TAXONOMY });
        return;
      }
      const respondedBy = (req.body?.respondedBy as string) || userId;
      const ok = await deps.service.adapter.recordAssessmentResponse(tenantId, req.params.id, response, respondedBy, new Date().toISOString());
      if (!ok) return void res.status(404).json({ error: 'active assessment not found' });
      await writeAudit(pool, { tenantId, actorUserId: userId, action: 'assessment_responded', recordType: 'mai_assessment', recordId: req.params.id, detail: { response } });
      res.json({ ok: true });
    }),
  );

  app.get('/api/mai/export', wrap(async (req, res) => {
    res.json(await deps.service.exportEvidence(ctx(req).tenantId));
  }));

  app.get(
    '/api/mai/metrics',
    wrap(async (req, res) => {
      const { tenantId } = ctx(req);
      const events = await count(pool, `SELECT count(*) FROM mai_events WHERE tenant_id=$1`, [tenantId]);
      const errors = await count(pool, `SELECT count(*) FROM mai_error_log WHERE tenant_id=$1`, [tenantId]);
      const confirmations = await count(pool, `SELECT count(*) FROM mai_assessments WHERE tenant_id=$1 AND response='confirm'`, [tenantId]);
      const dismissals = await count(pool, `SELECT count(*) FROM mai_assessments WHERE tenant_id=$1 AND response IN ('dismiss_incorrect','dismiss_not_applicable')`, [tenantId]);
      const kernel = deps.service.kernel?.metrics() ?? null;
      res.json({ events, errorCount: errors, confirmations, dismissals, avgEvaluationMs: kernel?.avgEvaluationMs ?? 0, evaluationsRun: kernel?.evaluationsRun ?? 0 });
    }),
  );

  app.get('/api/audit', requireRole('REVIEWER'), wrap(async (req, res) => {
    res.json({ entries: await listAudit(pool, ctx(req).tenantId) });
  }));

  // ── Regulatory Source Registry (Admin) ────────────────────────────────────────
  app.post('/api/registry', requireRole('ADMIN'), wrap(async (req, res) => {
    const { tenantId, userId } = ctx(req);
    const { title, canonicalUrl, category, currentRevision } = req.body ?? {};
    if (!title || !canonicalUrl || !SOURCE_CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'title, canonicalUrl, category (AC|CFR_SECTION|FAA_FORM) required' });
      return;
    }
    const id = await registry.create(tenantId, { title, canonicalUrl, category, currentRevision });
    await writeAudit(pool, { tenantId, actorUserId: userId, action: 'reg_source_created', recordType: 'regulatory_source', recordId: id });
    res.status(201).json({ id });
  }));

  app.get('/api/registry', wrap(async (req, res) => {
    res.json({ sources: await registry.list(ctx(req).tenantId) });
  }));

  app.post('/api/registry/check', requireRole('ADMIN'), wrap(async (req, res) => {
    const { tenantId, userId } = ctx(req);
    res.json({ results: await registry.checkAll(tenantId, userId) });
  }));

  app.post('/api/registry/:id/approve-url', requireRole('ADMIN'), wrap(async (req, res) => {
    const { tenantId, userId } = ctx(req);
    const ok = await registry.approveProposedUrl(tenantId, req.params.id, userId);
    if (!ok) return void res.status(409).json({ error: 'no approvable proposed URL for this source' });
    res.json({ ok: true });
  }));

  app.post('/api/registry/:id/accept-change', requireRole('ADMIN'), wrap(async (req, res) => {
    const { tenantId, userId } = ctx(req);
    const ok = await registry.acceptChange(tenantId, req.params.id, userId);
    if (!ok) return void res.status(409).json({ error: 'source is not in CHANGED state' });
    res.json({ ok: true });
  }));

  // ── Approved Document Library (promote / search / pattern-match) ───────────────
  app.post('/api/cases/:id/promote-to-library', requireRole('REVIEWER'), wrap(async (req, res) => {
    const { tenantId, userId } = ctx(req);
    const c = await cases.get(tenantId, req.params.id);
    if (!c) return void res.status(404).json({ error: 'case not found' });
    if (!c.approvalBasis || c.approvalBasis === 'AMBIGUOUS') {
      res.status(400).json({ error: 'confirm the approval basis before promoting to the library' });
      return;
    }
    const id = await library.promote(tenantId, c, userId, req.body?.summary);
    await writeAudit(pool, { tenantId, actorUserId: userId, action: 'promoted_to_library', recordType: 'library_entry', recordId: id, detail: { sourceCaseId: c.id } });
    res.status(201).json({ id });
  }));

  app.get('/api/library', wrap(async (req, res) => {
    const { tenantId } = ctx(req);
    res.json({ entries: await library.search(tenantId, { basis: req.query.basis as string, q: req.query.q as string }) });
  }));

  // Precedent suggestions for a case — read-only; the preparer selects, nothing is copied.
  app.get('/api/cases/:id/precedents', wrap(async (req, res) => {
    const { tenantId } = ctx(req);
    const c = await cases.get(tenantId, req.params.id);
    if (!c) return void res.status(404).json({ error: 'case not found' });
    res.json({ precedents: await library.precedents(tenantId, c) });
  }));

  return app;
}

function toDisplay(r: Record<string, unknown>) {
  return {
    id: r.id,
    tier: 'system_detected_condition',
    severity: r.severity,
    dataConfidence: r.data_confidence,
    findingText: r.finding_text,
    resolutionHint: r.resolution_hint,
    clauseRefs: normalizeArr(r.clause_refs),
    ruleId: r.rule_id,
    ruleRevision: r.rule_revision,
    dimId: r.dim_id,
    logicResult: r.logic_result,
    status: r.status,
    response: r.response ?? null,
    createdAt: r.created_at,
  };
}

function normalizeArr(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function count(pool: Pool, sql: string, params: unknown[]): Promise<number> {
  const { rows } = await pool.query(sql, params);
  return Number(rows[0].count);
}
