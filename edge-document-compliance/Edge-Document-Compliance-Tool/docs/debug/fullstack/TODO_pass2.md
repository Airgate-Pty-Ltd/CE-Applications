# TODO - Pass 2: Database Connectivity

## Acceptance Criteria

### 1. Database Connection Verification ✅ (Probe Created)
- **Status**: `scripts/probes/db-probe.mjs` exists from Pass 1
- **Action**: Verify it works, add to startup if needed
- **Acceptance**: `node scripts/probes/db-probe.mjs` connects and prints version

### 2. Migration Status Check ⚠️ (CRITICAL)
- **Issue**: EDCAT schema migration not run automatically
- **Fix**: Add migration check/run on startup (optional, non-blocking)
- **Acceptance**: Server starts even if migration fails; logs migration status

### 3. Connection Pool Health Monitoring
- **Fix**: Add pool health check endpoint or startup verification
- **Acceptance**: `/api/db/health` returns pool status (optional endpoint)

### 4. Graceful Degradation for DB-Dependent Routes
- **Status**: Routes already have try-catch, but could be improved
- **Fix**: Ensure routes handle DB errors gracefully
- **Acceptance**: Routes return 503 with clear error if DB unavailable

### 5. Environment Variable Validation
- **Fix**: Validate `DATABASE_URL` format on startup (non-blocking)
- **Acceptance**: Log warning if `DATABASE_URL` invalid format

## Testable Tasks

### Task 1: Add Optional Migration Runner
**File**: `backend/src/server.js` or new `backend/src/database/migrate-on-startup.js`

**Approach**: Run migrations optionally, don't block startup
```javascript
// After app loads, optionally run migrations
if (process.env.RUN_MIGRATIONS === 'true') {
  import('./database/migrate-on-startup.js')
    .then(() => console.log('[migrate] Migrations complete'))
    .catch(err => console.warn('[migrate] Migration warning:', err.message));
}
```

**Acceptance**: 
- Server starts even if migrations fail
- Migrations run if `RUN_MIGRATIONS=true` set
- Logs migration status

### Task 2: Enhance DB Connection Error Handling
**File**: `backend/src/database/connection.js`

**Fix**: Add connection test and better error messages
```javascript
// After pool creation, test connection (non-blocking)
if (pool) {
  pool.query('SELECT 1')
    .then(() => console.log('[db] ✅ Database connection verified'))
    .catch(err => console.warn('[db] ⚠️ Database connection warning:', err.message));
}
```

**Acceptance**: Startup logs show DB connection status

### Task 3: Add DB Health Endpoint
**File**: `backend/src/routes/db-status.js` (may already exist)

**Fix**: Add `/api/db/health` that checks pool status
```javascript
router.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', pool: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});
```

**Acceptance**: Endpoint returns 200 if DB connected, 503 if not

### Task 4: Validate DATABASE_URL Format
**File**: `backend/src/database/connection.js`

**Fix**: Check URL format before creating pool
```javascript
function validateDatabaseUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
  } catch {
    return false;
  }
}
```

**Acceptance**: Logs warning if `DATABASE_URL` format invalid

## Verification Commands

```bash
# 1. DB connectivity probe
node scripts/probes/db-probe.mjs
# Expected: [db-probe] ✅ Connected: PostgreSQL 15.x

# 2. DB health endpoint
curl http://localhost:8080/api/db/health
# Expected: {"status":"ok","pool":"connected"}

# 3. Migration status (if endpoint exists)
curl http://localhost:8080/api/db/migrations
# Expected: Migration status JSON

# 4. Test with invalid DATABASE_URL
DATABASE_URL="invalid" npm start
# Expected: Warning logged, server still starts
```

