'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { Snapshot, ConditionEvaluator } = require('../lib/mai-kernel');
const { AimsIntegration } = require('../src/adapter/aims-adapter');

test('Snapshot.hash is deterministic and key-order independent', () => {
  const a = Snapshot.create({ b: 1, a: 2 });
  const b = Snapshot.create({ a: 2, b: 1 });
  assert.equal(a, b);
  assert.equal(Snapshot.hash(a), Snapshot.hash(b));
  assert.equal(Snapshot.hash(a), crypto.createHash('sha256').update(a).digest('hex'));
});

test('ConditionEvaluator: is_empty / eq / date_before_today', () => {
  const ev = new ConditionEvaluator();
  assert.equal(ev.evaluate({ field: 'x', is_empty: true }, { x: '' }), true);
  assert.equal(ev.evaluate({ field: 'x', is_empty: true }, { x: 'set' }), false);
  assert.equal(ev.evaluate({ field: 'x', eq: 'applicable' }, { x: 'applicable' }), true);
  assert.equal(ev.evaluate({ field: 'x', date_before_today: true }, { x: '2000-01-01' }), true);
  assert.equal(ev.evaluate({ field: 'x', date_before_today: true }, { x: '2999-01-01' }), false);
});

test('end-to-end: soa.created with missing justification produces an active SOA-002 condition, respond resolves it', async () => {
  // Written to the OS temp dir (not the repo folder): SQLite's file locking
  // model is unreliable on some network-synced/mounted folders, so scratch
  // test databases belong on a genuine local disk regardless of where the
  // repo itself happens to live.
  const dbPath = path.join(os.tmpdir(), `aims-smoke-${crypto.randomUUID()}.db`);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf-8'));

  const integration = new AimsIntegration(db);
  const tenantId = 'test-tenant';
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO soa_entries (id, tenant_id, control_ref, control_title, applicability, justification, status, owner, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tenantId, 'A.6.2.2', 'AI risk assessment', 'applicable', '', 'draft', 'Test Owner', now, now);

  const result = await integration.emitEvent({
    tenantId, eventType: 'soa.created', recordType: 'soa', recordId: id, actor: 'test'
  });
  assert.ok(result.assessmentCount >= 1, 'expected at least one assessment (SOA-001 + SOA-002)');

  const conditions = integration.getConditions(tenantId, { status: 'active' });
  const soa002 = conditions.find((c) => c.ruleId === 'SOA-002' && c.recordId === id);
  assert.ok(soa002, 'expected an active SOA-002 condition');
  assert.equal(soa002.tier, 'system_detected_condition');
  assert.equal(soa002.status, 'active');

  const resp = await integration.respondToCondition(tenantId, soa002.id, 'confirm', 'test-user');
  assert.equal(resp.success, true);
  assert.equal(resp.condition.status, 'resolved');
  assert.equal(resp.condition.response, 'confirm');
  assert.equal(resp.condition.respondedBy, 'test-user');

  db.close();
  fs.unlinkSync(dbPath);
});
