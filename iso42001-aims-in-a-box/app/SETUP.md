# Setup

Requires Node.js >=22.5 (built and verified on Node 22.22.3; uses the
built-in `node:sqlite` module, still marked experimental by Node — you'll
see one `ExperimentalWarning` line, which is expected and harmless).

```bash
cd app
npm install
cp .env.example .env      # optional; defaults work without it
npm run setup             # creates data/aims.db and applies schema.sql
npm run charter            # (optional) regenerate AUTHORITY-CHARTER.md from rules/*.json
npm run seed               # loads demo data that deliberately triggers each of the 8 rules
npm start                  # listens on PORT (default 3100)
```

Then, in another terminal:

```bash
curl http://localhost:3100/health
curl http://localhost:3100/api/soa
curl http://localhost:3100/api/conditions
curl -X POST http://localhost:3100/api/conditions/<id>/respond \
  -H "Content-Type: application/json" \
  -d '{"response":"confirm","respondedBy":"Priya Nair"}'
curl http://localhost:3100/api/export
```

To reset the demo database, delete `data/aims.db*` and re-run
`npm run setup && npm run seed`.

`npm test` runs `tests/smoke.test.js` (Node's built-in `node:test` runner) —
a minimal sanity suite, not the full AT-01..16 acceptance suite.

## Troubleshooting: "disk I/O error" on `npm run setup`

SQLite (via `node:sqlite`, and this applies equally to `better-sqlite3`)
needs a real local disk under the database file — its locking/journal model
is unreliable over network-mounted or cross-OS-bridged filesystems. This was
hit and confirmed during this build: running the app from a Linux sandbox
against this repo's folder through a Windows-OneDrive-to-Linux bridge mount
failed with `disk I/O error` on `db.exec(schema)`, while the *exact same
code* against a genuine local disk path worked immediately (schema, seed,
all 8 rules, full CRUD, respond, export, and restart-survival all verified
there). This is not expected to occur when running `npm start` directly on
a normal machine (Windows/macOS/Linux) where the project folder sits on a
real local disk — including a normal OneDrive-synced folder opened directly
on the OneDrive-owning machine, since there it's just an NTFS path, not a
cross-OS network bridge.

If you do hit `disk I/O error`, point `DB_PATH` (in `.env` or the
environment) at a plain local path instead, e.g.:

```bash
DB_PATH=/tmp/aims-data/aims.db npm run setup
DB_PATH=/tmp/aims-data/aims.db npm run seed
DB_PATH=/tmp/aims-data/aims.db npm start
```
