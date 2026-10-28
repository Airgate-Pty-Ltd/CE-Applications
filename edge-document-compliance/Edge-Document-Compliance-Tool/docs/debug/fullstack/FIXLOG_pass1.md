# Fix Log - Pass 1: Healthcheck Failure

## Changes Applied

### 1. Added Import Timeout Protection
**File**: `backend/src/server.js`  
**Lines**: 20-51 (modified)

**Change**: Added 30-second timeout to dynamic import to prevent indefinite hanging.

**Rationale**: If `app.js` or any of its route imports fail or hang, the server never calls `listen()`, causing Railway healthcheck to timeout with 503.

**Code Added**:
```javascript
const IMPORT_TIMEOUT = 30000; // 30 seconds max
const importPromise = import('./app.js');
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`App import timeout after ${IMPORT_TIMEOUT}ms`)), IMPORT_TIMEOUT)
);
Promise.race([importPromise, timeoutPromise])
```

### 2. Enhanced Startup Logging
**File**: `backend/src/server.js`  
**Lines**: 35-42 (modified)

**Change**: Added explicit logging before and after `listen()` call, including healthcheck URL.

**Rationale**: Railway logs will now clearly show when server starts listening, making debugging easier.

**Code Added**:
```javascript
console.log(`[boot] Healthcheck will be available at http://${host}:${port}/health`);
// ... after listen ...
console.log(`[boot] ✅ Server listening on http://${host}:${port}`);
console.log(`[boot] ✅ Healthcheck available at http://${host}:${port}/health`);
console.log('[boot] Server startup complete - ready to accept connections');
```

### 3. Improved Error Messages
**File**: `backend/src/server.js`  
**Lines**: 50-58 (modified)

**Change**: Enhanced error logging to include message and stack separately, plus Railway retry note.

**Rationale**: Better error visibility in Railway logs.

## Files Changed

1. `backend/src/server.js` - Added timeout and enhanced logging
2. `scripts/probes/db-probe.mjs` - Created (for future DB connectivity testing)
3. `scripts/verify/health-probe.sh` - Created (for local healthcheck verification)

## Risk Assessment

**Low Risk**: Changes are additive (timeout wrapper, logging). No business logic modified.

**Testing**: 
- Timeout will trigger if app.js takes >30s to load
- Logging will appear in Railway logs if server starts successfully
- Error messages will be clearer if import fails

## Backward Compatibility

✅ Fully backward compatible - no breaking changes.

## Next Steps

1. Deploy and monitor Railway logs for new startup messages
2. Verify healthcheck passes within 30s
3. If still failing, check for route import errors in logs

