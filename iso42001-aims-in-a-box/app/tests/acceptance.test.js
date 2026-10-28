'use strict';

/**
 * M-AI Acceptance Tests AT-01..AT-16
 * (skills/mai-kernel-integration/references/acceptance-tests.md)
 *
 * Adapted to this host's record types. Primary test subject: soa_entries /
 * SOA-001 (linked-record rule: applicability + missing risk_treatments link)
 * and SOA-002 (direct-field rule: applicability + empty justification) —
 * chosen because together they exercise both rule patterns this kernel
 * supports on one record type.
 *
 * Tests go through the REAL path per the acceptance-tests.md brief ("Test
 * through the real path (API/routes against the DB), not kernel memory"):
 * a real Express app built from server.js's createApp(), listening on an
 * ephemeral local port, hit with real HTTP requests (global fetch). Where
 * there is no HTTP surface for what the test needs to inspect (host-table
 * byte-identity, registry validation, fault injection with a synthetic rule,
 * restart survival), the test drops to direct DB / kernel-library calls,
 * which is the only way to observe those things at all.
 *
 * Every test uses its own on-disk SQLite file under os.tmpdir() (never the
 * OneDrive-bridged repo folder — see SETUP.md's documented "disk I/O error"
 * finding for this host/mount combination).
 */

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const { openDb, applySchema } = require('../src/db/init');
const { AimsIntegration } = require('../src/adapter/aims-adapter');
const { createRecordRouter } = require('../src/routes/record-router-factory');
const { MaiKernel, SqliteAdapter, Snapshot } = require('../lib/mai-kernel');

const SOA_FIELDS = [
  { db: 'control_ref', api: 'controlRef', required: true },
  { db: 'control_title', api: 'controlTitle', required: true },
  { db: 'applicability', api: 'applicability', required: true },
  { db: 'justification', api: 'justification' },
  { db: 'status', api: 'status' },
  { db: 'owner', api: 'owner' }
];

const HOST_TABLE_NAMES = [
  'soa_entries', 'risk_register', 'risk_treatments', 'objectives',
  'audit_findings', 'ncr_entries', 'competence_records'
];

function tempDbPath() {
  return path.join(os.tmpdir(), `aims-at-${crypto.randomUUID()}.db`);
}

function freshSchemaDb(dbPath) {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = openDb(dbPath);
  applySchema(db);
  return db;
}

/** Builds a real Express app (server.js's createApp) on a fresh temp DB, listening on an ephemeral port. */
async function startRealApp() {
  const dbPath = tempDbPath();
  const seedDb = freshSchemaDb(dbPath);
  seedDb.close();

  const prevDbPath = process.env.DB_PATH;
  process.env.DB_PATH = dbPath;
  // eslint-disable-next-line global-require
  const { createApp } = require('../server');
  const { app, db, integration } = createApp();
  process.env.DB_PATH = prevDbPath;

  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const port = server.address().port;
  return {
    baseUrl: `http://localhost:${port}`, dbPath, db, integration, server
  };
}

async function stopRealApp(instance) {
  if (!instance) return;
  await new Promise((resolve) => instance.server.close(resolve));
  try { instance.db.close(); } catch (e) { /* already closed */ }
  try { fs.unlinkSync(instance.dbPath); } catch (e) { /* ignore */ }
  try { fs.unlinkSync(`${instance.dbPath}-journal`); } catch (e) { /* ignore */ }
}

async function api(baseUrl, urlPath, { method = 'GET', tenant = 'default', body, headers } = {}) {
  const finalHeaders = Object.assign({ 'X-Tenant-Id': tenant }, headers || {});
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';
  const res = await fetch(baseUrl + urlPath, {
    method, headers: finalHeaders, body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { status: res.status, data };
}

function soaPayload(overrides) {
  return Object.assign({
    controlRef: `A.${crypto.randomUUID().slice(0, 4)}`,
    controlTitle: 'AI risk assessment control',
    applicability: 'applicable',
    justification: '', // empty -> SOA-002 fires; no linked treatment -> SOA-001 fires too
    status: 'draft',
    owner: 'Test Owner'
  }, overrides);
}

// ===========================================================================
// Shared fixture: one real app per test (fresh DB each time) for AT-01..AT-11
// ===========================================================================
let ctx;
beforeEach(async () => {
  ctx = await startRealApp();
});
afterEach(async () => {
  await stopRealApp(ctx);
  ctx = null;
});

test('AT-01: mutation route writes a mai_events row with correct schema', async () => {
  const created = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload() });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const recordId = created.data.id;

  const row = ctx.db.prepare('SELECT * FROM mai_events WHERE record_id = ? AND tenant_id = ?').get(recordId, 'default');
  assert.ok(row, 'expected a mai_events row for the created record');
  assert.equal(row.record_type, 'soa');
  assert.equal(row.event_type, 'soa.created');
  assert.equal(row.tenant_id, 'default');
  assert.ok(row.actor, 'expected an actor');
  assert.ok(row.occurred_at, 'expected occurred_at');
  assert.equal(row.processed, 1, 'expected event to be marked processed');
  assert.ok(row.processed_at, 'expected processed_at to be set');
  assert.ok(row.snapshot_json && row.snapshot_json.length > 0, 'expected non-empty snapshot_json');
  assert.match(row.snapshot_hash, /^[a-f0-9]{64}$/, 'expected a sha256 hex digest');
});

test('AT-02: event snapshot_hash is a real SHA-256 over the stored canonical snapshot', async () => {
  const created = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload() });
  const recordId = created.data.id;
  const row = ctx.db.prepare('SELECT * FROM mai_events WHERE record_id = ?').get(recordId);

  // Recompute independently of the kernel's own Snapshot.hash to prove this
  // is a real, verifiable hash and not just "whatever the kernel says it is".
  const recomputed = crypto.createHash('sha256').update(row.snapshot_json).digest('hex');
  assert.equal(recomputed, row.snapshot_hash);
  // Cross-check against the library function too.
  assert.equal(Snapshot.hash(row.snapshot_json), row.snapshot_hash);
});

test('AT-03: assessment reflects the snapshot at event time, not the live record after a later un-eventful mutation', async () => {
  const created = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload({ justification: '' }) });
  const recordId = created.data.id;

  const conditionsBefore = await api(ctx.baseUrl, '/api/conditions', { method: 'GET' });
  const soa002 = conditionsBefore.data.find((c) => c.ruleId === 'SOA-002' && c.recordId === recordId);
  assert.ok(soa002, 'expected an active SOA-002 condition (empty justification)');
  const originalSnapshotHash = soa002.snapshotHash;
  const originalFinding = soa002.findingText;

  // Mutate the host row directly, bypassing the API/event pipeline entirely
  // (simulates a live record changing without a new governance event).
  ctx.db.prepare('UPDATE soa_entries SET justification = ? WHERE id = ?').run('Now has a real rationale', recordId);
  const liveRow = ctx.db.prepare('SELECT justification FROM soa_entries WHERE id = ?').get(recordId);
  assert.equal(liveRow.justification, 'Now has a real rationale', 'sanity: live record did change');

  // The existing assessment must still describe the OLD (empty-justification) snapshot.
  const conditionsAfter = await api(ctx.baseUrl, '/api/conditions', { method: 'GET' });
  const stillThere = conditionsAfter.data.find((c) => c.id === soa002.id);
  assert.ok(stillThere, 'assessment row must still exist, unmodified by the later live mutation');
  assert.equal(stillThere.snapshotHash, originalSnapshotHash, 'snapshot hash must not silently change');
  assert.equal(stillThere.findingText, originalFinding);
  assert.equal(stillThere.status, 'active', 'no new event was emitted, so no supersession should occur');
});

test('AT-04: host tables are byte-identical before/after a kernel run; new rows appear only in mai_assessments', async () => {
  const tenantId = 'default';
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  // Insert directly (bypassing the route) so we can snapshot the host row
  // ourselves, independent of any kernel code path.
  ctx.db.prepare(`
    INSERT INTO soa_entries (id, tenant_id, control_ref, control_title, applicability, justification, status, owner, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tenantId, 'A.9.9', 'Byte-identity control', 'applicable', '', 'draft', 'Owner', now, now);

  const before = ctx.db.prepare('SELECT * FROM soa_entries WHERE id = ?').get(id);
  const assessmentCountBefore = ctx.db.prepare('SELECT COUNT(*) AS c FROM mai_assessments').get().c;
  const otherHostRowCounts = {};
  for (const t of ['risk_register', 'risk_treatments', 'objectives', 'audit_findings', 'ncr_entries', 'competence_records']) {
    otherHostRowCounts[t] = ctx.db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
  }

  const result = await ctx.integration.emitEvent({
    tenantId, eventType: 'soa.created', recordType: 'soa', recordId: id, actor: 'at-04-test'
  });
  assert.ok(result.assessmentCount >= 1, 'expected at least one assessment to fire');

  const after = ctx.db.prepare('SELECT * FROM soa_entries WHERE id = ?').get(id);
  assert.deepEqual(after, before, 'host row must be byte-identical after the kernel run (Design Law 2)');

  const assessmentCountAfter = ctx.db.prepare('SELECT COUNT(*) AS c FROM mai_assessments').get().c;
  assert.ok(assessmentCountAfter > assessmentCountBefore, 'new rows must land in mai_assessments');

  for (const t of ['risk_register', 'risk_treatments', 'objectives', 'audit_findings', 'ncr_entries', 'competence_records']) {
    const countNow = ctx.db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
    assert.equal(countNow, otherHostRowCounts[t], `${t} must be untouched by a soa event`);
  }
});

test('AT-05: API returns tier system_detected_condition with all display fields', async () => {
  const created = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload() });
  const recordId = created.data.id;
  const conditions = await api(ctx.baseUrl, '/api/conditions', { method: 'GET' });
  const cond = conditions.data.find((c) => c.recordId === recordId && c.ruleId === 'SOA-001');
  assert.ok(cond, 'expected an active SOA-001 condition (no linked treatment)');
  assert.equal(cond.tier, 'system_detected_condition');
  for (const field of [
    'id', 'ruleId', 'ruleRevision', 'dimId', 'severity', 'findingText',
    'clauseRefs', 'recordType', 'recordId', 'status', 'dataConfidence',
    'createdAt', 'snapshotHash'
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(cond, field), `expected field "${field}" on the condition API shape`);
  }
  assert.ok(Array.isArray(cond.clauseRefs));
});

test('AT-06: API rejects a non-taxonomy response value with 400; DB row unchanged', async () => {
  const created = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload() });
  const conditions = await api(ctx.baseUrl, '/api/conditions', { method: 'GET' });
  const cond = conditions.data.find((c) => c.recordId === created.data.id && c.ruleId === 'SOA-002');
  assert.ok(cond);

  const before = ctx.db.prepare('SELECT * FROM mai_assessments WHERE id = ?').get(cond.id);
  const resp = await api(ctx.baseUrl, `/api/conditions/${cond.id}/respond`, {
    method: 'POST', body: { response: 'not_a_real_taxonomy_value', respondedBy: 'tester' }
  });
  assert.equal(resp.status, 400);

  const after = ctx.db.prepare('SELECT * FROM mai_assessments WHERE id = ?').get(cond.id);
  assert.deepEqual(after, before, 'row must be completely unchanged after a rejected response');
});

test('AT-07: responding via the API persists response/response_by/response_at and status=resolved', async () => {
  const created = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload() });
  const conditions = await api(ctx.baseUrl, '/api/conditions', { method: 'GET' });
  const cond = conditions.data.find((c) => c.recordId === created.data.id && c.ruleId === 'SOA-002');
  assert.ok(cond);

  const resp = await api(ctx.baseUrl, `/api/conditions/${cond.id}/respond`, {
    method: 'POST', body: { response: 'confirm', respondedBy: 'Priya Nair' }
  });
  assert.equal(resp.status, 200, JSON.stringify(resp.data));

  const row = ctx.db.prepare('SELECT * FROM mai_assessments WHERE id = ?').get(cond.id);
  assert.equal(row.response, 'confirm');
  assert.equal(row.response_by, 'Priya Nair');
  assert.ok(row.response_at);
  assert.equal(row.status, 'resolved');
});

test('AT-08: evidence export contains manifest, assessments with responses, rule registry rows, real charter text', async () => {
  const created = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload() });
  const conditions = await api(ctx.baseUrl, '/api/conditions', { method: 'GET' });
  const cond = conditions.data.find((c) => c.recordId === created.data.id && c.ruleId === 'SOA-002');
  await api(ctx.baseUrl, `/api/conditions/${cond.id}/respond`, {
    method: 'POST', body: { response: 'confirm', respondedBy: 'Priya Nair' }
  });

  const exp = await api(ctx.baseUrl, '/api/export', { method: 'GET' });
  assert.equal(exp.status, 200);
  const evidence = exp.data;
  assert.ok(evidence.manifest && evidence.manifest.exportId, 'expected a manifest with exportId');
  assert.ok(Array.isArray(evidence.assessments) && evidence.assessments.length > 0);
  const respondedAssessment = evidence.assessments.find((a) => a.id === cond.id);
  assert.ok(respondedAssessment, 'exported assessments must include our responded one');
  assert.equal(respondedAssessment.response, 'confirm');
  assert.ok(Array.isArray(evidence.ruleRegistry) && evidence.ruleRegistry.length >= 8, 'expected the 8 loaded rules in the registry export');
  assert.ok(typeof evidence.charter === 'string' && evidence.charter.includes('Authority Charter'), 'expected real charter markdown, not a placeholder');
});

test('AT-09: M-AI disabled -> host CRUD flows behave identically (Design Law 3: fail quiet, host unaffected)', async () => {
  // Reproduces the exact "kernel_disabled" stub shape server.js falls back to
  // when AimsIntegration fails to construct, wired into the SAME generic
  // record router the real app uses, against a fresh host-only DB.
  const disabledIntegration = {
    emitEvent: async () => ({ skipped: true, reason: 'kernel_disabled' }),
    getConditions: () => [],
    getConditionById: () => null,
    respondToCondition: async () => ({ success: false, error: 'kernel_disabled' }),
    getCharter: () => 'M-AI Kernel is currently disabled; no Authority Charter is available.',
    getMetrics: () => ({
      eventCount: 0, confirmations: 0, dismissals: 0, errorCount: 0, activeCount: 0
    }),
    exportEvidence: () => ({
      manifest: { note: 'kernel_disabled' }, assessments: [], ruleRegistry: [], charter: ''
    })
  };

  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api/soa', createRecordRouter({
    db: ctx.db, integration: disabledIntegration, table: 'soa_entries', recordType: 'soa', fields: SOA_FIELDS
  }));
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://localhost:${server.address().port}`;

  try {
    const created = await api(baseUrl, '/api/soa', { method: 'POST', body: soaPayload() });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    assert.ok(created.data.id, 'host route must still create and return the record with kernel disabled');

    const fetched = await api(baseUrl, `/api/soa/${created.data.id}`, { method: 'GET' });
    assert.equal(fetched.status, 200);
    assert.equal(fetched.data.controlRef, created.data.controlRef);

    const updated = await api(baseUrl, `/api/soa/${created.data.id}`, { method: 'PUT', body: { status: 'approved' } });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.status, 'approved');

    // No mai_events row should exist for this record, since the disabled
    // stub's emitEvent never actually writes one.
    const eventRow = ctx.db.prepare('SELECT * FROM mai_events WHERE record_id = ?').get(created.data.id);
    assert.equal(eventRow, undefined, 'kernel-disabled stub must not write mai_events');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('AT-10: idempotent duplicate snapshot -> no duplicate row; changed snapshot -> supersede, no stale row for a rule that stops firing', async () => {
  const tenantId = 'default';
  const created = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload({ justification: '' }) });
  const recordId = created.data.id;

  const conditions1 = await api(ctx.baseUrl, '/api/conditions', { method: 'GET' });
  const soa002_v1 = conditions1.data.find((c) => c.ruleId === 'SOA-002' && c.recordId === recordId);
  const soa001_v1 = conditions1.data.find((c) => c.ruleId === 'SOA-001' && c.recordId === recordId);
  assert.ok(soa002_v1 && soa001_v1, 'expected both SOA-001 and SOA-002 active initially');

  // Duplicate event, unchanged data -> idempotency gate must block it.
  const dup = await ctx.integration.emitEvent({
    tenantId, eventType: 'soa.updated', recordType: 'soa', recordId, actor: 'dup-test'
  });
  assert.equal(dup.assessmentCount, 0);
  assert.ok(dup.skipped, 'expected the duplicate-hash event to be skipped');
  const activeSoa002Count = ctx.db.prepare(
    "SELECT COUNT(*) AS c FROM mai_assessments WHERE tenant_id = ? AND record_id = ? AND rule_id = 'SOA-002' AND status = 'active'"
  ).get(tenantId, recordId).c;
  assert.equal(activeSoa002Count, 1, 'no duplicate active row for the same snapshot hash');

  // Changed snapshot: fill in justification (SOA-002 stops firing), keep no linked treatment (SOA-001 still fires).
  const updated = await api(ctx.baseUrl, `/api/soa/${recordId}`, { method: 'PUT', body: { justification: 'Now documented' } });
  assert.equal(updated.status, 200);

  const newestEvent = ctx.db.prepare(
    'SELECT * FROM mai_events WHERE record_id = ? ORDER BY occurred_at DESC LIMIT 1'
  ).get(recordId);

  const soa002Row = ctx.db.prepare('SELECT * FROM mai_assessments WHERE id = ?').get(soa002_v1.id);
  assert.equal(soa002Row.status, 'superseded', 'old SOA-002 row must be superseded once its snapshot changed');
  assert.equal(soa002Row.superseded_by, newestEvent.id);

  const activeSoa002After = ctx.db.prepare(
    "SELECT COUNT(*) AS c FROM mai_assessments WHERE tenant_id = ? AND record_id = ? AND rule_id = 'SOA-002' AND status = 'active'"
  ).get(tenantId, recordId).c;
  assert.equal(activeSoa002After, 0, 'no stale active row for a rule (SOA-002) that no longer fires');

  const soa001Row = ctx.db.prepare('SELECT * FROM mai_assessments WHERE id = ?').get(soa001_v1.id);
  assert.equal(soa001Row.status, 'superseded', 'old SOA-001 row must also be superseded (snapshot changed)');
  const activeSoa001After = ctx.db.prepare(
    "SELECT * FROM mai_assessments WHERE tenant_id = ? AND record_id = ? AND rule_id = 'SOA-001' AND status = 'active'"
  ).all(tenantId, recordId);
  assert.equal(activeSoa001After.length, 1, 'SOA-001 still fires (still no linked treatment) -> exactly one fresh active row');
  assert.notEqual(activeSoa001After[0].id, soa001_v1.id, 'the fresh SOA-001 row must be a NEW row, not the old one');
});

test('AT-11: cross-tenant denial on list, fetch, respond, and export', async () => {
  const createdA = await api(ctx.baseUrl, '/api/soa', { method: 'POST', tenant: 'tenant-a', body: soaPayload() });
  assert.equal(createdA.status, 201);
  const recordIdA = createdA.data.id;

  const conditionsA = await api(ctx.baseUrl, '/api/conditions', { method: 'GET', tenant: 'tenant-a' });
  const condA = conditionsA.data.find((c) => c.recordId === recordIdA);
  assert.ok(condA, 'sanity: tenant-a can see its own condition');

  // Fetch across tenants
  const fetchAsB = await api(ctx.baseUrl, `/api/soa/${recordIdA}`, { method: 'GET', tenant: 'tenant-b' });
  assert.equal(fetchAsB.status, 404, 'tenant-b must not be able to fetch tenant-a\'s record');

  // List across tenants
  const listAsB = await api(ctx.baseUrl, '/api/conditions', { method: 'GET', tenant: 'tenant-b' });
  assert.equal(listAsB.data.find((c) => c.recordId === recordIdA), undefined, 'tenant-b must not see tenant-a\'s conditions');

  const listSoaAsB = await api(ctx.baseUrl, '/api/soa', { method: 'GET', tenant: 'tenant-b' });
  assert.equal(listSoaAsB.data.find((r) => r.id === recordIdA), undefined, 'tenant-b must not see tenant-a\'s soa records');

  // Respond across tenants
  const respondAsB = await api(ctx.baseUrl, `/api/conditions/${condA.id}/respond`, {
    method: 'POST', tenant: 'tenant-b', body: { response: 'confirm', respondedBy: 'intruder' }
  });
  assert.equal(respondAsB.status, 404, 'tenant-b must not be able to respond to tenant-a\'s condition');
  const rowAfter = ctx.db.prepare('SELECT * FROM mai_assessments WHERE id = ?').get(condA.id);
  assert.equal(rowAfter.status, 'active', 'tenant-a\'s condition must remain untouched by tenant-b\'s attempt');

  // Export across tenants
  const exportB = await api(ctx.baseUrl, '/api/export', { method: 'GET', tenant: 'tenant-b' });
  assert.equal(exportB.status, 200);
  assert.equal(
    exportB.data.assessments.find((a) => a.id === condA.id),
    undefined,
    'tenant-b\'s export must not contain tenant-a\'s assessments'
  );
});

test('AT-12: kernel-visible adapter surface has no host-table write path; response UPDATE touches only whitelisted columns', async () => {
  const kernelAdapterSrc = fs.readFileSync(
    path.join(__dirname, '..', 'lib', 'mai-kernel', 'adapters', 'sqlite-adapter.js'), 'utf-8'
  );
  for (const table of HOST_TABLE_NAMES) {
    assert.ok(
      !kernelAdapterSrc.includes(table),
      `kernel-side SqliteAdapter must never reference host table "${table}" (Design Law 2)`
    );
  }

  const hostAdapterSrc = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'adapter', 'aims-adapter.js'), 'utf-8'
  );
  const mutatingVerbs = /\b(INSERT INTO|UPDATE|DELETE FROM)\b\s+([a-zA-Z_]+)/gi;
  let m;
  while ((m = mutatingVerbs.exec(hostAdapterSrc)) !== null) {
    const table = m[2];
    assert.ok(
      !HOST_TABLE_NAMES.includes(table),
      `aims-adapter.js (the ONLY place the kernel integration reads host tables) must never mutate host table "${table}"`
    );
  }

  // Behavioral check: recordAssessmentResponse only changes the 4 whitelisted columns.
  const created = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload() });
  const conditions = await api(ctx.baseUrl, '/api/conditions', { method: 'GET' });
  const cond = conditions.data.find((c) => c.recordId === created.data.id && c.ruleId === 'SOA-002');
  const before = ctx.db.prepare('SELECT * FROM mai_assessments WHERE id = ?').get(cond.id);

  await api(ctx.baseUrl, `/api/conditions/${cond.id}/respond`, {
    method: 'POST', body: { response: 'dismiss_incorrect', respondedBy: 'reviewer' }
  });
  const after = ctx.db.prepare('SELECT * FROM mai_assessments WHERE id = ?').get(cond.id);

  const whitelisted = new Set(['response', 'response_by', 'response_at', 'status']);
  for (const key of Object.keys(before)) {
    if (whitelisted.has(key)) continue;
    assert.equal(after[key], before[key], `column "${key}" must be unchanged by recordAssessmentResponse`);
  }
  assert.equal(after.response, 'dismiss_incorrect');
  assert.equal(after.status, 'resolved');
});

test('AT-13: a rule missing required registry fields is rejected at load time; other rules unaffected; host unaffected; error logged', async () => {
  const dbPath = tempDbPath();
  const db = freshSchemaDb(dbPath);
  try {
    const adapter = new SqliteAdapter({ db, getHostSnapshot: () => null });
    const kernel = new MaiKernel(adapter, { logger: { log() {}, error() {} } });

    const goodRule = {
      ruleId: 'TEST-GOOD-001',
      dimId: 'test-dim',
      revision: 1,
      effectiveDate: '2026-01-01',
      approvedBy: 'Test Approver',
      approvalRef: 'TEST-001',
      condition: { field: 'x', not_empty: true },
      findingText: 'ok',
      resolutionHint: 'ok',
      severity: 'minor',
      clauseRefs: []
    };
    // Missing ruleId, revision, effectiveDate, approvedBy (AT-13's exact list).
    const badRule = {
      dimId: 'test-dim',
      approvalRef: 'TEST-002',
      condition: { field: 'x', not_empty: true },
      findingText: 'bad',
      resolutionHint: 'bad',
      severity: 'minor',
      clauseRefs: []
    };

    const { manifests, loadedCount, rejectedCount } = kernel.loadRuleRegistry([
      { dimId: 'test-dim', subscribesTo: ['thing.created'], rules: [goodRule, badRule] }
    ]);

    assert.equal(loadedCount, 1);
    assert.equal(rejectedCount, 1);
    const survivingRuleIds = manifests[0].rules.map((r) => r.ruleId);
    assert.ok(survivingRuleIds.includes('TEST-GOOD-001'), 'the valid rule must still be loaded (host/other rules unaffected)');
    assert.equal(survivingRuleIds.length, 1, 'the invalid rule must be excluded (effectively disabled) from the active rule set');

    const registryRows = db.prepare("SELECT * FROM mai_rule_registry WHERE status = 'rejected'").all();
    assert.equal(registryRows.length, 1);
    assert.ok(registryRows[0].rejection_reason, 'expected a rejection_reason to be recorded');

    const errorRows = db.prepare("SELECT * FROM mai_error_log WHERE source = 'kernel.loadRuleRegistry'").all();
    assert.ok(errorRows.length >= 1, 'expected an mai_error_log row for the rejected rule');

    // Host unaffected: we can still write host data on this same db.
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    assert.doesNotThrow(() => {
      db.prepare(`
        INSERT INTO soa_entries (id, tenant_id, control_ref, control_title, applicability, justification, status, owner, created_at, updated_at)
        VALUES (?, 'default', 'A.1', 'title', 'not_applicable', 'n/a', 'draft', 'Owner', ?, ?)
      `).run(id, now, now);
    });
  } finally {
    db.close();
    fs.unlinkSync(dbPath);
  }
});

test('AT-14: metrics report real event counts, confirmations/dismissals, errorCount, and non-zero measured evaluation latency', async () => {
  const rec1 = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload({ justification: '' }) });
  const conds1 = await api(ctx.baseUrl, '/api/conditions', { method: 'GET' });
  const c1 = conds1.data.find((c) => c.recordId === rec1.data.id && c.ruleId === 'SOA-002');
  await api(ctx.baseUrl, `/api/conditions/${c1.id}/respond`, { method: 'POST', body: { response: 'confirm', respondedBy: 'A' } });

  const rec2 = await api(ctx.baseUrl, '/api/soa', { method: 'POST', body: soaPayload({ justification: '' }) });
  const conds2 = await api(ctx.baseUrl, '/api/conditions', { method: 'GET' });
  const c2 = conds2.data.find((c) => c.recordId === rec2.data.id && c.ruleId === 'SOA-002');
  await api(ctx.baseUrl, `/api/conditions/${c2.id}/respond`, { method: 'POST', body: { response: 'dismiss_incorrect', respondedBy: 'B' } });

  const metrics = ctx.integration.getMetrics('default');
  const realEventCount = ctx.db.prepare("SELECT COUNT(*) AS c FROM mai_events WHERE tenant_id = 'default'").get().c;
  const realErrorCount = ctx.db.prepare("SELECT COUNT(*) AS c FROM mai_error_log WHERE tenant_id = 'default'").get().c;

  assert.equal(metrics.eventCount, realEventCount, 'eventCount must match a real COUNT(*) on mai_events');
  assert.ok(metrics.confirmations >= 1);
  assert.ok(metrics.dismissals >= 1);
  assert.equal(metrics.errorCount, realErrorCount);
  assert.ok(metrics.avgEvaluationMs > 0, `expected non-zero measured evaluation latency, got ${metrics.avgEvaluationMs}`);
});

test('AT-15: fault injection — rule with unknown operator logs to mai_error_log, produces no assessment for that rule, other rules still complete', async () => {
  const dbPath = tempDbPath();
  const db = freshSchemaDb(dbPath);
  try {
    const adapter = new SqliteAdapter({ db, getHostSnapshot: () => null });
    const kernel = new MaiKernel(adapter, { logger: { log() {}, error() {} } });

    const brokenRule = {
      ruleId: 'FAULT-001',
      dimId: 'test-dim',
      revision: 1,
      effectiveDate: '2026-01-01',
      approvedBy: 'Test Approver',
      approvalRef: 'TEST-003',
      condition: { field: 'x', totally_unknown_operator: true }, // fails only at evaluation time, not registration
      findingText: 'should never persist',
      resolutionHint: 'n/a',
      severity: 'minor',
      clauseRefs: []
    };
    const validRule = {
      ruleId: 'FAULT-OK-001',
      dimId: 'test-dim',
      revision: 1,
      effectiveDate: '2026-01-01',
      approvedBy: 'Test Approver',
      approvalRef: 'TEST-004',
      condition: { field: 'x', not_empty: true },
      findingText: 'valid rule fired correctly',
      resolutionHint: 'n/a',
      severity: 'minor',
      clauseRefs: []
    };

    const { manifests, loadedCount } = kernel.loadRuleRegistry([
      { dimId: 'test-dim', subscribesTo: ['thing.created'], rules: [brokenRule, validRule] }
    ]);
    assert.equal(loadedCount, 2, 'both rules pass REGISTRY validation; the fault is at evaluation time');

    const tenantId = 'default';
    const eventId = crypto.randomUUID();
    const data = { x: 'present-value' };
    const { snapshotJson, snapshotHash } = kernel.hashSnapshot(data);
    adapter.writeEvent({
      id: eventId, tenantId, eventType: 'thing.created', recordType: 'thing', recordId: 'r1',
      actor: 'fault-test', occurredAt: new Date().toISOString(), snapshotJson, snapshotHash
    });

    const result = await kernel.processEvent({
      id: eventId, tenant_id: tenantId, event_type: 'thing.created', record_type: 'thing', record_id: 'r1', data, snapshot_hash: snapshotHash
    }, manifests);

    assert.equal(result.assessmentCount, 1, 'only the valid rule should have produced an assessment');
    assert.ok(result.errors && result.errors.some((e) => e.includes('FAULT-001')), 'expected the broken rule\'s error surfaced in the result');

    const faultAssessments = db.prepare("SELECT * FROM mai_assessments WHERE rule_id = 'FAULT-001'").all();
    assert.equal(faultAssessments.length, 0, 'the broken rule must never persist an assessment');

    const okAssessments = db.prepare("SELECT * FROM mai_assessments WHERE rule_id = 'FAULT-OK-001'").all();
    assert.equal(okAssessments.length, 1, 'the other rule must still complete normally');

    const errorRows = db.prepare("SELECT * FROM mai_error_log WHERE source = 'rule:FAULT-001'").all();
    assert.ok(errorRows.length >= 1, 'expected a mai_error_log row for the fault-injected rule');
    assert.match(errorRows[0].message, /Condition evaluation error/);
  } finally {
    db.close();
    fs.unlinkSync(dbPath);
  }
});

test('AT-16: RESTART SURVIVAL — fresh kernel+adapter on the same DB sees identical active assessments, the response, superseded rows, and non-zero persisted metrics', async () => {
  const dbPath = tempDbPath();
  const seedDb = freshSchemaDb(dbPath);
  seedDb.close();

  const prevDbPath = process.env.DB_PATH;
  process.env.DB_PATH = dbPath;
  // eslint-disable-next-line global-require
  const { createApp } = require('../server');

  // --- Instance 1: process events, respond, and create a supersession ---
  const instance1 = createApp();
  const server1 = instance1.app.listen(0);
  await new Promise((resolve) => server1.once('listening', resolve));
  const baseUrl1 = `http://localhost:${server1.address().port}`;

  const rec = await api(baseUrl1, '/api/soa', { method: 'POST', body: soaPayload({ justification: '' }) });
  const recordId = rec.data.id;
  const conds = await api(baseUrl1, '/api/conditions', { method: 'GET' });
  const soa002 = conds.data.find((c) => c.recordId === recordId && c.ruleId === 'SOA-002');
  const soa001 = conds.data.find((c) => c.recordId === recordId && c.ruleId === 'SOA-001');
  assert.ok(soa002 && soa001);

  const respondResult = await api(baseUrl1, `/api/conditions/${soa002.id}/respond`, {
    method: 'POST', body: { response: 'confirm', respondedBy: 'Restart Tester' }
  });
  assert.equal(respondResult.status, 200);

  // Force supersession of SOA-001 (still fires) by changing an unrelated field so the snapshot hash changes.
  await api(baseUrl1, `/api/soa/${recordId}`, { method: 'PUT', body: { owner: 'New Owner' } });

  const metrics1 = instance1.integration.getMetrics('default');
  const activeBefore = instance1.db.prepare("SELECT id, rule_id FROM mai_assessments WHERE tenant_id = 'default' AND status = 'active' ORDER BY rule_id").all();
  const supersededBefore = instance1.db.prepare("SELECT id FROM mai_assessments WHERE tenant_id = 'default' AND status = 'superseded'").all();
  assert.ok(activeBefore.length >= 1, 'expected at least one active assessment before restart');
  assert.ok(supersededBefore.length >= 1, 'expected at least one superseded assessment before restart (SOA-001 after the PUT)');

  await new Promise((resolve) => server1.close(resolve));
  instance1.db.close();

  // --- Instance 2: brand-new kernel + adapter + integration on the SAME db file ---
  const instance2 = createApp();
  process.env.DB_PATH = prevDbPath;

  try {
    const activeAfter = instance2.db.prepare("SELECT id, rule_id FROM mai_assessments WHERE tenant_id = 'default' AND status = 'active' ORDER BY rule_id").all();
    const supersededAfter = instance2.db.prepare("SELECT id FROM mai_assessments WHERE tenant_id = 'default' AND status = 'superseded'").all();

    assert.deepEqual(activeAfter, activeBefore, 'active assessments must be IDENTICAL after a fresh kernel+adapter construction');
    assert.equal(supersededAfter.length, supersededBefore.length, 'superseded rows must survive the restart');

    const respondedCondition = instance2.integration.getConditionById('default', soa002.id);
    assert.ok(respondedCondition, 'the responded condition must still be retrievable after restart');
    assert.equal(respondedCondition.response, 'confirm');
    assert.equal(respondedCondition.respondedBy, 'Restart Tester');
    assert.equal(respondedCondition.status, 'resolved');

    const metrics2 = instance2.integration.getMetrics('default');
    assert.ok(metrics2.eventCount > 0, 'metrics must be non-zero after restart');
    assert.equal(metrics2.eventCount, metrics1.eventCount, 'persisted event count must be identical (it is read straight from mai_events)');
    assert.equal(metrics2.confirmations, metrics1.confirmations);
    assert.equal(metrics2.activeCount, activeAfter.length);
  } finally {
    try { instance2.db.close(); } catch (e) { /* ignore */ }
    try { fs.unlinkSync(dbPath); } catch (e) { /* ignore */ }
    try { fs.unlinkSync(`${dbPath}-journal`); } catch (e) { /* ignore */ }
  }
});
