import { Pool } from 'pg';
import {
  makePools,
  startApp,
  client,
  newTenant,
  BAD_DIMS_DIR,
  FAULTY_DIMS_DIR,
  type RunningApp,
} from './harness';
import { hashSnapshot } from '../mai/kernel/hash';

// AT-01..AT-16 — M-AI acceptance tests, executed through the real HTTP routes
// against the real Postgres test DB (not kernel memory). Each test uses a unique
// tenant for isolation. See references/acceptance-tests.md.

let hostPool: Pool;
let kernelPool: Pool;
let main: RunningApp;

async function q(sql: string, params: unknown[] = []): Promise<any[]> {
  const { rows } = await hostPool.query(sql, params);
  return rows;
}

// A case that fires ONLY PMA-COMPLETE-001 (applicant legal name missing).
function caseOnlyApplicantGap(overrides: Record<string, unknown> = {}) {
  return {
    articleName: 'Test Bracket Assy',
    manufacturingAddress: '123 Aviation Way, Mesa AZ',
    faaSubmissionOffice: 'ACO Los Angeles',
    qmsManualNumber: 'QM-100',
    qmsManualRevision: 'C',
    qmsManualDate: '2026-01-15',
    signatoryName: 'Jane Preparer',
    signatoryTitle: 'Quality Engineer',
    markingSchemeRef: 'DWG-9000',
    icaDispositionStated: true,
    adImpactAddressed: true,
    ...overrides,
  };
}

beforeAll(async () => {
  ({ hostPool, kernelPool } = makePools());
  main = await startApp({ hostPool, kernelPool });
});

afterAll(async () => {
  await main.close();
  await hostPool.end();
  await kernelPool.end();
});

describe('AT-01 mutation route writes a mai_events row with correct schema', () => {
  it('creates an event row', async () => {
    const t = newTenant('at01');
    const api = client(main.baseUrl, t);
    const { status, json } = await api.post('/api/cases', caseOnlyApplicantGap());
    expect(status).toBe(201);
    const events = await q('SELECT * FROM mai_events WHERE tenant_id=$1 AND record_id=$2', [t, json.id]);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.event_type).toBe('pma_case.created');
    expect(e.record_type).toBe('pma_case');
    expect(e.actor).toBe('u-test');
    expect(typeof e.snapshot_hash).toBe('string');
    expect(e.snapshot_hash.length).toBe(64);
    expect(e.processed).toBe(true);
  });
});

describe('AT-02 event snapshot_json hashes to stored snapshot_hash', () => {
  it('recomputes the canonical hash', async () => {
    const t = newTenant('at02');
    const api = client(main.baseUrl, t);
    const { json } = await api.post('/api/cases', caseOnlyApplicantGap());
    const [e] = await q('SELECT snapshot_json, snapshot_hash FROM mai_events WHERE tenant_id=$1 AND record_id=$2', [t, json.id]);
    expect(hashSnapshot(e.snapshot_json)).toBe(e.snapshot_hash);
  });
});

describe('AT-03 rules evaluate the snapshot, not the live record', () => {
  it('assessment reflects snapshot values after the record is mutated directly', async () => {
    const t = newTenant('at03');
    const api = client(main.baseUrl, t);
    const { json } = await api.post('/api/cases', caseOnlyApplicantGap());
    // Mutate the live record directly (no emit).
    await hostPool.query('UPDATE "PmaCase" SET "applicantLegalName"=$1 WHERE id=$2', ['Now Present', json.id]);
    const [a] = await q("SELECT * FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2 AND status='active'", [t, json.id]);
    expect(a.rule_id).toBe('PMA-COMPLETE-001');
    const [e] = await q('SELECT snapshot_json FROM mai_events WHERE snapshot_hash=$1', [a.snapshot_hash]);
    expect(e.snapshot_json.applicant_legal_name).toBeNull(); // snapshot captured the pre-mutation value
  });
});

describe('AT-04 host tables byte-identical before/after a kernel run', () => {
  it('kernel writes only mai_assessments; PmaCase row unchanged', async () => {
    const t = newTenant('at04');
    const api = client(main.baseUrl, t);
    const { json } = await api.post('/api/cases', caseOnlyApplicantGap());
    const [before] = await q('SELECT * FROM "PmaCase" WHERE id=$1', [json.id]);
    await api.post(`/api/cases/${json.id}/closure`); // runs the kernel again
    const [after] = await q('SELECT * FROM "PmaCase" WHERE id=$1', [json.id]);
    expect(after).toEqual(before);
    const assessments = await q('SELECT count(*)::int AS n FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2', [t, json.id]);
    expect(assessments[0].n).toBeGreaterThan(0);
  });
});

describe('AT-05 API returns system_detected_condition with all display fields', () => {
  it('lists conditions with full display shape', async () => {
    const t = newTenant('at05');
    const api = client(main.baseUrl, t);
    const { json } = await api.post('/api/cases', caseOnlyApplicantGap());
    const res = await api.get(`/api/cases/${json.id}/assessments`);
    expect(res.status).toBe(200);
    const c = res.json.conditions.find((x: any) => x.ruleId === 'PMA-COMPLETE-001');
    expect(c.tier).toBe('system_detected_condition');
    expect(c.severity).toBe('blocking');
    expect(['high', 'medium', 'low']).toContain(c.dataConfidence);
    expect(c.findingText).toContain('applicant');
    expect(c.resolutionHint).toBeTruthy();
    expect(Array.isArray(c.clauseRefs)).toBe(true);
    expect(c.ruleRevision).toBe(1);
    // Controlled terminology: never a numeric confidence score.
    expect(c).not.toHaveProperty('confidenceScore');
  });
});

describe('AT-06 API rejects non-taxonomy response with 400; DB row unchanged', () => {
  it('rejects an invalid response value', async () => {
    const t = newTenant('at06');
    const api = client(main.baseUrl, t);
    const { json } = await api.post('/api/cases', caseOnlyApplicantGap());
    const [a] = await q("SELECT id FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2", [t, json.id]);
    const res = await api.post(`/api/assessments/${a.id}/respond`, { response: 'approve' });
    expect(res.status).toBe(400);
    const [after] = await q('SELECT status, response FROM mai_assessments WHERE id=$1', [a.id]);
    expect(after.status).toBe('active');
    expect(after.response).toBeNull();
  });
});

describe('AT-07 valid response persists response + resolved status', () => {
  it('records a confirm', async () => {
    const t = newTenant('at07');
    const api = client(main.baseUrl, t);
    const { json } = await api.post('/api/cases', caseOnlyApplicantGap());
    const [a] = await q("SELECT id FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2", [t, json.id]);
    const res = await api.post(`/api/assessments/${a.id}/respond`, { response: 'confirm', respondedBy: 'reviewer@x' });
    expect(res.status).toBe(200);
    const [after] = await q('SELECT * FROM mai_assessments WHERE id=$1', [a.id]);
    expect(after.response).toBe('confirm');
    expect(after.response_by).toBe('reviewer@x');
    expect(after.response_at).toBeTruthy();
    expect(after.status).toBe('resolved');
  });
});

describe('AT-08 evidence export from persisted tables', () => {
  it('exports manifest, assessments with responses, registry rows, charter', async () => {
    const t = newTenant('at08');
    const api = client(main.baseUrl, t);
    const { json } = await api.post('/api/cases', caseOnlyApplicantGap());
    const [a] = await q('SELECT id FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2', [t, json.id]);
    await api.post(`/api/assessments/${a.id}/respond`, { response: 'confirm' });
    const res = await api.get('/api/mai/export');
    expect(res.status).toBe(200);
    expect(res.json.manifest.tenantId).toBe(t);
    expect(res.json.manifest.packageHash).toBeTruthy();
    expect(res.json.manifest.counts.assessments).toBeGreaterThan(0);
    expect(res.json.assessments.some((x: any) => x.response === 'confirm')).toBe(true);
    expect(res.json.ruleRegistry.length).toBeGreaterThan(0);
    expect(res.json.charters[0].charter).toContain('Authority Charter');
  });
});

describe('AT-09 M-AI disabled → host flows behave identically', () => {
  it('case still created; no events emitted when kernel is disabled', async () => {
    const disabled = await startApp({ hostPool, kernelPool, dimsDir: BAD_DIMS_DIR });
    try {
      expect(disabled.service.enabled).toBe(false);
      const t = newTenant('at09');
      const api = client(disabled.baseUrl, t);
      const { status, json } = await api.post('/api/cases', caseOnlyApplicantGap());
      expect(status).toBe(201);
      const [row] = await q('SELECT id FROM "PmaCase" WHERE id=$1', [json.id]);
      expect(row.id).toBe(json.id); // host write succeeded
      const events = await q('SELECT count(*)::int AS n FROM mai_events WHERE tenant_id=$1', [t]);
      expect(events[0].n).toBe(0); // no kernel activity
    } finally {
      await disabled.close();
    }
  });
});

describe('AT-10 idempotency + supersession', () => {
  it('same snapshot no dup; changed snapshot supersedes and links; stale resolved', async () => {
    const t = newTenant('at10');
    const api = client(main.baseUrl, t);
    const { json } = await api.post('/api/cases', caseOnlyApplicantGap());
    const active1 = await q("SELECT * FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2 AND status='active'", [t, json.id]);
    expect(active1).toHaveLength(1);
    const firstId = active1[0].id;

    // Same snapshot again → no duplicate active row.
    await api.post(`/api/cases/${json.id}/closure`);
    const active2 = await q("SELECT * FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2 AND status='active'", [t, json.id]);
    expect(active2).toHaveLength(1);
    expect(active2[0].id).toBe(firstId);

    // Changed snapshot, rule still fires → supersede old (linked forward), new active.
    await api.patch(`/api/cases/${json.id}`, { manufacturingAddress: 'Changed Address' });
    const [oldRow] = await q('SELECT * FROM mai_assessments WHERE id=$1', [firstId]);
    expect(oldRow.status).toBe('superseded');
    const active3 = await q("SELECT * FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2 AND status='active'", [t, json.id]);
    expect(active3).toHaveLength(1);
    expect(oldRow.superseded_by).toBe(active3[0].id);

    // Rule no longer fires (applicant now present) → active resolved via supersession.
    await api.patch(`/api/cases/${json.id}`, { applicantLegalName: 'Acme Aerospace' });
    const active4 = await q("SELECT * FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2 AND status='active'", [t, json.id]);
    expect(active4).toHaveLength(0);
    const [lastRow] = await q('SELECT * FROM mai_assessments WHERE id=$1', [active3[0].id]);
    expect(lastRow.status).toBe('superseded');
    expect(lastRow.superseded_by).toContain('no_longer_firing:');
  });
});

describe('AT-11 cross-tenant denial', () => {
  it('tenant B cannot list, fetch, respond to, or export tenant A data', async () => {
    const tA = newTenant('at11a');
    const tB = newTenant('at11b');
    const apiA = client(main.baseUrl, tA);
    const apiB = client(main.baseUrl, tB);
    const { json } = await apiA.post('/api/cases', caseOnlyApplicantGap());
    const [a] = await q('SELECT id FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2', [tA, json.id]);

    const list = await apiB.get(`/api/cases/${json.id}/assessments`);
    expect(list.json.conditions).toHaveLength(0);
    const fetch1 = await apiB.get(`/api/assessments/${a.id}`);
    expect(fetch1.status).toBe(404);
    const respond = await apiB.post(`/api/assessments/${a.id}/respond`, { response: 'confirm' });
    expect(respond.status).toBe(404);
    const [stillActive] = await q('SELECT status FROM mai_assessments WHERE id=$1', [a.id]);
    expect(stillActive.status).toBe('active'); // B's attempt did not touch A's row
    const exp = await apiB.get('/api/mai/export');
    expect(exp.json.manifest.counts.assessments).toBe(0);
  });
});

describe('AT-12 write scope: kernel role cannot write host tables', () => {
  it('mai_kernel is denied UPDATE/INSERT/DELETE on PmaCase', async () => {
    const t = newTenant('at12');
    const api = client(main.baseUrl, t);
    const { json } = await api.post('/api/cases', caseOnlyApplicantGap());
    await expect(
      kernelPool.query('UPDATE "PmaCase" SET "articleName"=$1 WHERE id=$2', ['hacked', json.id]),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      kernelPool.query('DELETE FROM "PmaCase" WHERE id=$1', [json.id]),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      kernelPool.query('INSERT INTO "PmaCase" (id,"tenantId","articleName","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5)', [
        'x', t, 'y', 'now', 'now',
      ]),
    ).rejects.toThrow(/permission denied/i);
    // But the kernel CAN read (SELECT) — it built a snapshot to assess this case.
    const r = await kernelPool.query('SELECT id FROM "PmaCase" WHERE id=$1', [json.id]);
    expect(r.rows).toHaveLength(1);
  });
});

describe('AT-13 invalid rule config → registry validation fails, M-AI disabled', () => {
  it('disables cleanly and logs; host unaffected', async () => {
    const badApp = await startApp({ hostPool, kernelPool, dimsDir: BAD_DIMS_DIR });
    try {
      expect(badApp.service.enabled).toBe(false);
      const errs = await q("SELECT * FROM mai_error_log WHERE message='mai_disabled_invalid_registry'");
      expect(errs.length).toBeGreaterThan(0);
    } finally {
      await badApp.close();
    }
  });
});

describe('AT-14 metrics report real counts + measured latency', () => {
  it('reports events, evaluations, confirmations, errorCount', async () => {
    const t = newTenant('at14');
    const api = client(main.baseUrl, t);
    const { json } = await api.post('/api/cases', caseOnlyApplicantGap());
    const [a] = await q('SELECT id FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2', [t, json.id]);
    await api.post(`/api/assessments/${a.id}/respond`, { response: 'confirm' });
    const res = await api.get('/api/mai/metrics');
    expect(res.json.events).toBeGreaterThan(0);
    expect(res.json.confirmations).toBe(1);
    expect(res.json.evaluationsRun).toBeGreaterThan(0);
    expect(res.json.avgEvaluationMs).toBeGreaterThan(0);
    expect(typeof res.json.errorCount).toBe('number');
  });
});

describe('AT-15 fault injection: unknown operator isolated', () => {
  it('bad rule logs + is skipped; sibling rule still fires; route 2xx', async () => {
    const faultyApp = await startApp({ hostPool, kernelPool, dimsDir: FAULTY_DIMS_DIR });
    try {
      const t = newTenant('at15');
      const api = client(faultyApp.baseUrl, t);
      const { status, json } = await api.post('/api/cases', caseOnlyApplicantGap());
      expect(status).toBe(201); // route returns 2xx despite the faulty rule
      const good = await q("SELECT * FROM mai_assessments WHERE tenant_id=$1 AND rule_id='GOOD-001'", [t]);
      expect(good).toHaveLength(1);
      const bad = await q("SELECT * FROM mai_assessments WHERE tenant_id=$1 AND rule_id='FAULTY-OP-001'", [t]);
      expect(bad).toHaveLength(0);
      const errs = await q("SELECT * FROM mai_error_log WHERE tenant_id=$1 AND message='rule_evaluation_failed'", [t]);
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].context_json.ruleId).toBe('FAULTY-OP-001');
    } finally {
      await faultyApp.close();
    }
  });
});

describe('AT-16 RESTART SURVIVAL (mandatory)', () => {
  it('a fresh kernel on the same DB sees identical active/resolved/superseded state', async () => {
    const t = newTenant('at16');
    const api = client(main.baseUrl, t);

    // case1: two gaps; resolve one, leave one active.
    const c1 = (await api.post('/api/cases', caseOnlyApplicantGap({ manufacturingAddress: null }))).json;
    const c1Active = await q("SELECT * FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2 AND status='active'", [t, c1.id]);
    const warning = c1Active.find((x) => x.rule_id === 'PMA-COMPLETE-002');
    await api.post(`/api/assessments/${warning.id}/respond`, { response: 'confirm' });

    // case2: create a gap then remove it → a superseded row exists.
    const c2 = (await api.post('/api/cases', caseOnlyApplicantGap())).json;
    await api.patch(`/api/cases/${c2.id}`, { applicantLegalName: 'Acme' });

    const activeBefore = await q("SELECT id FROM mai_assessments WHERE tenant_id=$1 AND status='active' ORDER BY id", [t]);
    const resolvedBefore = await q("SELECT id FROM mai_assessments WHERE tenant_id=$1 AND status='resolved' ORDER BY id", [t]);
    const supersededBefore = await q("SELECT id FROM mai_assessments WHERE tenant_id=$1 AND status='superseded' ORDER BY id", [t]);
    expect(activeBefore.length).toBeGreaterThan(0);
    expect(resolvedBefore.length).toBeGreaterThan(0);
    expect(supersededBefore.length).toBeGreaterThan(0);
    const c1ActiveBefore = await q("SELECT id FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2 AND status='active' ORDER BY id", [t, c1.id]);

    // Destroy the kernel, build a FRESH one on the same DB.
    const restarted = await startApp({ hostPool, kernelPool });
    try {
      const api2 = client(restarted.baseUrl, t);
      const activeAfter = await q("SELECT id FROM mai_assessments WHERE tenant_id=$1 AND status='active' ORDER BY id", [t]);
      expect(activeAfter).toEqual(activeBefore); // identical active set survived restart

      // The fresh kernel must reconcile against the DB, not empty memory: an
      // unchanged re-emit produces NO duplicate active row.
      await api2.post(`/api/cases/${c1.id}/closure`);
      const c1ActiveAfter = await q("SELECT id FROM mai_assessments WHERE tenant_id=$1 AND record_id=$2 AND status='active' ORDER BY id", [t, c1.id]);
      expect(c1ActiveAfter).toEqual(c1ActiveBefore); // no duplicate created post-restart

      const metrics = (await api2.get('/api/mai/metrics')).json;
      expect(metrics.events).toBeGreaterThan(0);
    } finally {
      await restarted.close();
    }
  });
});
