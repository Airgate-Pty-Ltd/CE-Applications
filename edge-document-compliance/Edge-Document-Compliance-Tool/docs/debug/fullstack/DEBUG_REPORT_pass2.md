# Debug Report - Pass 2: Database Connectivity

**Date**: 2025-01-13  
**Focus**: Database connectivity, migrations, connection pool health

## Evidence Collection

### Database Configuration

**File**: `backend/src/database/connection.js`
- Uses `pg.Pool` with `DATABASE_URL` from environment
- Pool creation is conditional (only if `DATABASE_URL` exists)
- SSL configured for production: `rejectUnauthorized: false`
- Pool settings:
  - `max: 20` clients
  - `idleTimeoutMillis: 30000` (30s)
  - `connectionTimeoutMillis: 2000` (2s)

**Environment Variables**:
- Primary: `DATABASE_URL` (PostgreSQL connection string)
- Fallback: `POSTGRES_URL` (not currently used in code)
- SSL: Auto-detected from `NODE_ENV === 'production'`

### Migration System

**File**: `backend/src/scripts/create-all-tables.js`
- Direct table creation script (bypasses migrations)
- Creates tables in `compliance_lib` and `public` schemas
- Runs on-demand, not automatically on startup
- ✅ Non-blocking: Server can start without tables

**File**: `backend/src/database/migrations/002_edcat_schema.sql`
- EDCAT schema migration (new)
- Creates `edcat` schema and tables
- Not automatically run on startup
- ⚠️ **RISK**: Routes using `edcat` tables will fail if migration not run

**Migration Runner**: `backend/src/scripts/run-migration.js`
- Exists but not called automatically
- Requires manual execution: `npm run migrate:edcat`

### Database Usage in Routes

**Routes that query database**:
- `upload.js`: Uses `query()` for file metadata
- `requirements.js`: Queries `compliance_lib.standards`
- `parse.js`: Queries `compliance_lib.standard_files`
- `regs.ingest.js`: Uses `edcat.reg_sources`, `edcat.reg_packs` (requires migration)
- `regs.js`: Uses `recordRun()` which writes to `edcat.crawl_runs` (requires migration)

**Blocking Operations**:
- ✅ No top-level `await query()` in route files
- ✅ All DB operations inside route handlers
- ✅ Connection pool creation is non-blocking

### Connection Pool Health

**Current Implementation**:
- Pool created synchronously at module load
- No connection test on startup
- Errors logged but don't block server start
- ⚠️ **RISK**: Invalid `DATABASE_URL` might cause silent failures

### Migration Status

**Existing Tables** (from `create-all-tables.js`):
- `compliance_lib.standard_files`
- `compliance_lib.standards`
- `compliance_lib.requirements`
- `public.standard_files`
- `public.standards`
- `public.requirements`
- `public.customers`
- `public.documents`
- `public.regulatory_websites`

**New Tables** (from `002_edcat_schema.sql`):
- `edcat.ai_agents`
- `edcat.ai_sessions`
- `edcat.ai_messages`
- `edcat.ai_memories`
- `edcat.qa_pairs`
- `edcat.tasks`
- `edcat.crawl_runs`
- `edcat.reg_sources`
- `edcat.reg_packs`
- `edcat.reg_clauses`
- `edcat.links`
- `edcat.doc_index`

**Status**: ⚠️ EDCAT schema migration not run automatically

## Root Cause Analysis

### Issues Identified

1. **No Connection Verification on Startup**
   - Pool created but never tested
   - Invalid `DATABASE_URL` might cause silent failures
   - Routes fail at runtime, not startup

2. **Migration Not Automatic**
   - EDCAT schema requires manual migration
   - Routes using `edcat` tables will fail if migration not run
   - No migration status check

3. **No Graceful Degradation**
   - Routes fail hard if DB unavailable
   - No feature flags for DB-dependent features
   - Healthcheck doesn't verify DB connectivity

4. **Connection Pool Errors Silent**
   - Pool errors logged but don't surface to healthcheck
   - No monitoring of pool health

## Evidence Files

- `backend/src/database/connection.js`: Pool configuration
- `backend/src/scripts/create-all-tables.js`: Table creation
- `backend/src/database/migrations/002_edcat_schema.sql`: EDCAT migration
- `scripts/probes/db-probe.mjs`: DB connectivity probe (created Pass 1)

## Next Steps

See `TODO_pass2.md` for fix plan.

