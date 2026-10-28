# Debug Report - Pass 1: Healthcheck Failure

**Date**: 2025-01-13  
**Issue**: Healthcheck returning 503 after ~100s, server not responding to `/health`

## Evidence Collection

### Repo Topology
- **Type**: Monorepo (root + backend)
- **Backend Entry**: `backend/src/server.js`
- **Start Script**: `npm start` → `cd backend && node src/server.js`
- **Node Version**: 22 (per Nixpacks logs)

### Backend Boot Path Analysis

**File**: `backend/src/server.js`
- ✅ Uses dynamic import: `import('./app.js')`
- ✅ Binds to `0.0.0.0` and `process.env.PORT || 8080`
- ⚠️ **ISSUE**: If `app.js` import fails or hangs, server never calls `listen()`
- ⚠️ **ISSUE**: No timeout on dynamic import - could hang indefinitely

**File**: `backend/src/app.js`
- ✅ `/health` route registered at line 31, BEFORE auth/SPA middleware
- ✅ Returns `200 OK` unconditionally
- ⚠️ **ISSUE**: Top-level imports (lines 36-52) execute synchronously
- ⚠️ **RISK**: If any route import fails, entire app.js fails to load

### Database Connectivity

**File**: `backend/src/database/connection.js`
- Uses `pg.Pool` with `DATABASE_URL`
- Pool creation is conditional (only if `DATABASE_URL` exists)
- ⚠️ **RISK**: If `DATABASE_URL` is invalid, pool might fail silently
- ⚠️ **RISK**: No connection timeout visible in startup

### API Routes

- `/health` correctly registered before all other routes
- SPA catch-all at line 92 correctly excludes `/health` and `/api/*`
- Route order appears correct

### Build/Deploy Config

**File**: `package.json`
- ✅ `start` script: `cd backend && node src/server.js`
- ✅ No dev servers in production
- ✅ Single process (no PM2/cluster)

**File**: `.nixpacks.toml` (if exists)
- Node 22 confirmed from logs
- Start command: `npm start`

## Root Cause Analysis

### Primary Issue: Dynamic Import Blocking

The server uses `import('./app.js')` which is async. If:
1. Any top-level import in `app.js` fails (route modules, middleware)
2. Any synchronous operation in route modules blocks
3. Database connection pool initialization hangs

Then `app.listen()` never executes, and Railway's healthcheck gets 503.

### Secondary Issues

1. **No startup timeout**: Dynamic import could hang indefinitely
2. **No error recovery**: If app.js fails to load, process exits but Railway might retry
3. **Route imports are synchronous**: All route imports happen at module load time

## Evidence Files

- `backend/src/server.js` (lines 21-51): Dynamic import pattern
- `backend/src/app.js` (lines 30-33): Health route registration
- Railway logs: Healthcheck 503 after 100s timeout

## Next Steps

See `TODO_pass1.md` for fix plan.

