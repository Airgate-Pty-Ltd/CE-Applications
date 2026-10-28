'use strict';

/**
 * Generic CRUD router factory for the AIMS host record tables.
 * Every mutation route follows the M-AI event flow (integration-checklist.md
 * section 3): commit host write -> emitEvent (getSnapshot -> hashSnapshot ->
 * writeEvent -> kernel.processEvent -> markEventProcessed) -> respond 2xx.
 * The kernel call is awaited but never allowed to affect the HTTP response
 * (Design Law 3: fail quiet, log loud) — aims-adapter.emitEvent already
 * swallows all kernel errors internally.
 */

const express = require('express');
const crypto = require('crypto');

function dbRowToApi(row, fields) {
  if (!row) return null;
  const out = { id: row.id };
  for (const f of fields) {
    out[f.api] = row[f.db];
  }
  out.createdAt = row.created_at;
  out.updatedAt = row.updated_at;
  return out;
}

// Fields flagged `computed: true` are system-derived (see each route's
// deriveOnWrite) and must NEVER be settable directly from the request body —
// otherwise a caller could bypass the deterministic computation (e.g. POST a
// hand-picked risk `score` instead of letting likelihood x impact drive it).
// They are still listed in FIELDS so GET responses continue to expose them.
function apiBodyToDb(body, fields) {
  const out = {};
  for (const f of fields) {
    if (f.computed) continue;
    if (Object.prototype.hasOwnProperty.call(body, f.api)) {
      out[f.db] = body[f.api];
    }
  }
  return out;
}

/**
 * @param {Object} opts
 * @param {import('node:sqlite').DatabaseSync} opts.db
 * @param {import('../adapter/aims-adapter').AimsIntegration} opts.integration
 * @param {string} opts.table - host table name
 * @param {string} opts.recordType - event/record type key (e.g. 'soa')
 * @param {Array<{db:string, api:string, required?:boolean, computed?:boolean}>} opts.fields
 * @param {function(Object):Object} [opts.deriveOnWrite] - computed/derived fields before INSERT/UPDATE
 */
function createRecordRouter(opts) {
  const {
    db, integration, table, recordType, fields, deriveOnWrite
  } = opts;
  const router = express.Router();

  function tenantOf(req) {
    return req.header('X-Tenant-Id') || 'default';
  }

  router.get('/', (req, res) => {
    const tenantId = tenantOf(req);
    const rows = db.prepare(`SELECT * FROM ${table} WHERE tenant_id = ? ORDER BY created_at DESC`).all(tenantId);
    res.json(rows.map((r) => dbRowToApi(r, fields)));
  });

  router.get('/:id', (req, res) => {
    const tenantId = tenantOf(req);
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND tenant_id = ?`).get(req.params.id, tenantId);
    if (!row) return res.status(404).json({ error: 'not_found' });
    return res.json(dbRowToApi(row, fields));
  });

  router.post('/', async (req, res) => {
    const tenantId = tenantOf(req);
    const missing = fields.filter((f) => f.required && (req.body[f.api] === undefined || req.body[f.api] === null || req.body[f.api] === ''));
    if (missing.length > 0) {
      return res.status(400).json({ error: 'validation_error', missing: missing.map((f) => f.api) });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    let record = { id, tenant_id: tenantId, ...apiBodyToDb(req.body, fields), created_at: now, updated_at: now };
    if (deriveOnWrite) record = { ...record, ...deriveOnWrite(record) };

    const columns = Object.keys(record);
    const placeholders = columns.map((c) => `@${c}`).join(', ');
    db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`).run(record);

    const eventResult = await integration.emitEvent({
      tenantId, eventType: `${recordType}.created`, recordType, recordId: id, actor: req.header('X-Actor') || 'api'
    });

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    return res.status(201).json({ ...dbRowToApi(row, fields), _kernel: { assessmentCount: eventResult.assessmentCount || 0 } });
  });

  router.put('/:id', async (req, res) => {
    const tenantId = tenantOf(req);
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND tenant_id = ?`).get(req.params.id, tenantId);
    if (!existing) return res.status(404).json({ error: 'not_found' });

    const now = new Date().toISOString();
    let record = { ...existing, ...apiBodyToDb(req.body, fields), updated_at: now };
    if (deriveOnWrite) record = { ...record, ...deriveOnWrite(record) };

    const setClauses = Object.keys(record).filter((k) => k !== 'id' && k !== 'tenant_id').map((k) => `${k} = @${k}`);
    db.prepare(`UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = @id AND tenant_id = @tenant_id`).run(record);

    const eventResult = await integration.emitEvent({
      tenantId, eventType: `${recordType}.updated`, recordType, recordId: req.params.id, actor: req.header('X-Actor') || 'api'
    });

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    return res.json({ ...dbRowToApi(row, fields), _kernel: { assessmentCount: eventResult.assessmentCount || 0 } });
  });

  return router;
}

module.exports = { createRecordRouter, dbRowToApi, apiBodyToDb };
