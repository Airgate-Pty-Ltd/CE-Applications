## Database Diagnostics

Run the built-in diagnostics to dump schema metadata and simulate migrations without modifying the database.

```bash
# 1) Configure environment
export DATABASE_URL="postgres://user:pass@host:5432/db"
export ENABLE_DB_INTROSPECTION=1
export MIGRATION_DIAGNOSE=1
export MIGRATE_DRYRUN=1
# In managed environments (Railway/Vercel/etc.) you must also opt-in:
export ALLOW_DIAGNOSE=1

# 2) Start the service
npm start
```

### What happens

- `npm run db:introspect` prints the live schema (tables, columns, PKs, FKs) and validation report.
- `npm run migrate --dry-run` lists every SQL statement that would run, without applying it.
- The server **does not** start while diagnostics are enabled; only the lightweight health/introspect server runs so logs capture the report.

Unset `MIGRATION_DIAGNOSE` (and `MIGRATE_DRYRUN` / `ALLOW_DIAGNOSE`) to return to the normal startup flow where migrations execute before the server boots.


