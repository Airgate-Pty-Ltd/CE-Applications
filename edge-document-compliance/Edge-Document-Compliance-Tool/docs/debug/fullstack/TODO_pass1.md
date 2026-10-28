# TODO - Pass 1: Fix Healthcheck Failure

## Acceptance Criteria

### 1. Healthcheck Isolation ✅ (Already Correct)
- **Status**: `/health` is registered before auth/SPA (line 31 in app.js)
- **Verification**: Route order confirmed
- **Action**: None needed

### 2. Bind Host/Port ✅ (Already Correct)
- **Status**: `listen(port, '0.0.0.0')` with `port = process.env.PORT || 8080`
- **Verification**: Confirmed in server.js line 26-31
- **Action**: None needed

### 3. Fix Dynamic Import Blocking ⚠️ (CRITICAL)
- **Issue**: `import('./app.js')` can hang if app.js imports fail
- **Fix**: Add timeout and error handling to dynamic import
- **Acceptance**: Server starts even if app.js has import errors (logs error, exits gracefully)
- **Test**: Simulate import failure, verify server logs error and exits

### 4. Ensure App Module Exports Default ✅ (Already Correct)
- **Status**: `app.js` exports `export default app;`
- **Verification**: Confirmed line 118
- **Action**: None needed

### 5. Add Startup Logging
- **Fix**: Add explicit logs before/after `listen()` call
- **Acceptance**: Railway logs show "[boot] listening on..." message
- **Test**: Deploy and verify logs

### 6. Database Connection Non-Blocking
- **Status**: Database pool creation is already conditional
- **Verification**: `connection.js` only creates pool if `DATABASE_URL` exists
- **Action**: Ensure no blocking DB calls in route imports

## Testable Tasks

### Task 1: Add Import Timeout
```javascript
// server.js
const IMPORT_TIMEOUT = 10000; // 10 seconds
const importPromise = import('./app.js');
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('App import timeout')), IMPORT_TIMEOUT)
);

Promise.race([importPromise, timeoutPromise])
  .then((appModule) => { /* ... */ })
  .catch((err) => { /* ... */ });
```

**Acceptance**: If app.js takes >10s to load, server logs timeout and exits

### Task 2: Add Explicit Listen Logging
```javascript
const server = app.listen(port, host, () => {
  console.log(`[boot] ✅ Server listening on http://${host}:${port}`);
  console.log(`[boot] Healthcheck available at http://${host}:${port}/health`);
});
```

**Acceptance**: Railway logs show both messages after successful start

### Task 3: Verify No Blocking Imports
- Check all route files for top-level database calls
- Ensure all DB operations are inside route handlers, not module scope

**Acceptance**: No route file has `await query(...)` at top level

## Verification Commands

```bash
# 1. Health probe
curl -i http://localhost:8080/health
# Expected: HTTP/1.1 200 OK

# 2. Port binding test
PORT=9090 npm start &
sleep 2
curl -i http://localhost:9090/health
# Expected: 200 OK

# 3. Import timeout test (simulate slow import)
# Add delay in app.js, verify timeout triggers
```

