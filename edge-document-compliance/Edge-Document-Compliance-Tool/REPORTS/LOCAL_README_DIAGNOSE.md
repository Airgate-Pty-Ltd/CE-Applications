# Local Diagnose Workflow

1. **Ensure dependencies are installed**
   ```bash
   npm install
   ```

2. **Preflight checks**
   ```bash
   npm run check:syntax
   npm run check:dburl
   npm run test:introspect
   ```

3. **Run diagnose server locally**
   ```bash
   ENABLE_DB_INTROSPECTION=1 MIGRATION_DIAGNOSE=1 ALLOW_DIAGNOSE=1 PORT=8080 npm run diag:serve
   ```

4. **Verify endpoints**
   - `GET http://localhost:8080/health` → expect `{ status: "ok", mode: "diagnose" }`
   - `GET http://localhost:8080/__db/introspect` (requires `ENABLE_DB_INTROSPECTION=1`) → returns schema JSON

5. **Exit diagnose mode**
   - `Ctrl+C` to stop the local server
   - Unset `MIGRATION_DIAGNOSE`, `MIGRATE_DRYRUN`, and `ALLOW_DIAGNOSE` (or set them to `0`) to return to normal `npm start` behaviour

