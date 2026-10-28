# Railway Deploy Guide

## Diagnose (pre-flight) deployment
- **Variables**
  - `PORT=8080`
  - `DATABASE_URL=postgresql://postgres:***@postgres.railway.internal:5432/railway`
  - `MIGRATION_DIAGNOSE=1`
  - `MIGRATE_DRYRUN=1`
  - `ENABLE_DB_INTROSPECTION=1`
  - `ALLOW_DIAGNOSE=1` _(required in managed environments to opt-in)_
- **Healthcheck path**: `/health`
- **Expected behaviour**
  - Railway build succeeds (Nixpacks + npm install)
  - `npm run diagnose:db` emits JSON summary
  - Container keeps an Express server alive; `/health` returns 200
  - `/__db/introspect` returns schema (because `ENABLE_DB_INTROSPECTION=1`)

## Production deployment
- **Variables**
  - `PORT=8080`
  - `DATABASE_URL=postgresql://postgres:***@postgres.railway.internal:5432/railway`
  - `MIGRATION_DIAGNOSE=0`
  - `MIGRATE_DRYRUN=0`
  - `ENABLE_DB_INTROSPECTION=0`
  - `ALLOW_DIAGNOSE=0` (or unset)
- **Healthcheck path**: `/health`
- **Expected behaviour**
  - Prestart runs migrations for real
  - Main backend boots (`backend/index.js`)
  - `/health` performs `SELECT 1` and responds `200 OK`
  - `/__db/introspect` disabled (403) unless explicitly re-enabled

## Switching modes
1. Set diagnose env vars, redeploy → confirm `/health` + `/__db/introspect`.
2. Flip env vars to production values, redeploy → confirm `/health` stays green.

All deployments still use the same GitHub `main` branch push trigger. Attach build/deploy logs for each pass under `/REPORTS/logs/`.

