'use strict';

/**
 * Database initializer.
 * Creates (or opens) the SQLite file and applies schema.sql idempotently.
 * Same physical DB file holds host tables and mai_* tables — the kernel is
 * still structurally restricted to mai_* tables at the application layer
 * (see src/adapter/aims-adapter.js and lib/mai-kernel/adapters/sqlite-adapter.js).
 *
 * Uses Node's built-in `node:sqlite` (DatabaseSync), NOT the `better-sqlite3`
 * npm package. `better-sqlite3` ships a native addon that must either
 * download a prebuilt binary or compile from source with node-gyp, both of
 * which require outbound network access to GitHub release assets /
 * nodejs.org — unavailable in some locked-down deployment/build
 * environments. `node:sqlite` ships inside Node itself (stable API surface
 * is close enough to better-sqlite3's — same prepare/run/get/all shape —
 * that no other file needed to change) so `npm install` never needs to
 * compile anything. Requires Node >=22.5 (still marked experimental by
 * Node upstream; a warning is printed, not an error).
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'data', 'aims.db');

function getDbPath() {
  return process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : DEFAULT_DB_PATH;
}

function openDb(dbPath = getDbPath()) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  // NOTE: WAL mode is intentionally NOT used. WAL relies on shared-memory
  // (mmap) files (-wal/-shm) that fail with "disk I/O error" on some
  // network-backed/synced mounts (confirmed in this deployment's OneDrive-
  // backed folder). The default rollback-journal mode is fully durable and
  // portable across filesystems; this is a single-process embedded demo, so
  // WAL's main benefit (concurrent readers during a writer) does not apply.
  db.exec('PRAGMA journal_mode = DELETE');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA synchronous = NORMAL');
  return db;
}

function applySchema(db) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

/** Used by `npm run setup`. */
function setup() {
  const dbPath = getDbPath();
  const db = openDb(dbPath);
  applySchema(db);
  db.close();
  return dbPath;
}

module.exports = { openDb, applySchema, setup, getDbPath, DEFAULT_DB_PATH };

if (require.main === module) {
  const dbPath = setup();
  // eslint-disable-next-line no-console
  console.log(`[setup] Schema applied to ${dbPath}`);
}
