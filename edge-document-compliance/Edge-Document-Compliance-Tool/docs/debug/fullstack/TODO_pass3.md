# TODO - Pass 3: API Route Mismatches

## Acceptance Criteria

### 1. Route Enumeration ✅ (COMPLETE)
- **Status**: All frontend calls mapped to backend routes
- **Result**: No missing routes detected
- **Action**: None needed

### 2. Error Response Consistency ⚠️ (VERIFY)
- **Issue**: Routes may return inconsistent error formats
- **Fix**: Standardize error responses across all routes
- **Acceptance**: All errors return `{ error: string, detail?: string }` format

### 3. Query Parameter Validation
- **Fix**: Verify all query params handled correctly
- **Acceptance**: Invalid query params return 400 with clear message

### 4. Request Body Validation
- **Fix**: Add validation middleware or manual checks
- **Acceptance**: Missing required fields return 400 before processing

### 5. Response Format Consistency
- **Fix**: Ensure all success responses follow consistent structure
- **Acceptance**: Success responses include `success: true` or consistent data shape

## Testable Tasks

### Task 1: Verify Upload Type Parameter Handling
**File**: `backend/src/routes/upload.js`

**Check**: `GET /api/upload?type=standards|regulatory|customer|documents`

**Acceptance**: 
- All types return correct file lists
- Invalid type returns 400
- Missing type returns all files or 400 (document behavior)

### Task 2: Standardize Error Responses
**Files**: All route files

**Fix**: Create error response helper
```javascript
function sendError(res, status, message, detail) {
  res.status(status).json({ error: message, ...(detail && { detail }) });
}
```

**Acceptance**: All routes use consistent error format

### Task 3: Add Request Validation
**Files**: Routes with POST/PUT bodies

**Fix**: Add validation checks before processing
```javascript
if (!req.body.requiredField) {
  return res.status(400).json({ error: 'BAD_REQUEST', detail: 'Missing required field: requiredField' });
}
```

**Acceptance**: Missing required fields return 400 before DB/processing

### Task 4: Verify DELETE Routes
**Routes**: 
- `DELETE /api/upload/:filename`
- `DELETE /api/requirements/standards/:standardId`
- `DELETE /api/regulatory/website/:id`

**Acceptance**: 
- All return 200 on success
- All return 404 if resource not found
- All return 500 on server error

## Verification Commands

```bash
# 1. Test upload type parameter
curl "http://localhost:8080/api/upload?type=standards"
curl "http://localhost:8080/api/upload?type=invalid"
# Expected: First returns files, second returns 400

# 2. Test error responses
curl -X POST http://localhost:8080/api/upload
# Expected: 400 with { error: "...", detail: "..." }

# 3. Test missing routes
curl http://localhost:8080/api/nonexistent
# Expected: 404 with { error: "Route not found" }

# 4. Test DELETE routes
curl -X DELETE http://localhost:8080/api/requirements/standards/invalid-id
# Expected: 404 if not found, 200 if deleted
```

