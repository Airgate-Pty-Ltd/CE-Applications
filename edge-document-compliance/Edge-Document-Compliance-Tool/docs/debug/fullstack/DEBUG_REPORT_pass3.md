# Debug Report - Pass 3: API Route Mismatches

**Date**: 2025-01-13  
**Focus**: API route enumeration, frontend/backend contract alignment

## Evidence Collection

### Frontend API Calls (from index.html)

**Upload Routes**:
- `POST /api/upload` - File upload (line 809)
- `GET /api/upload?type=standards` - List standards files (line 1569)
- `GET /api/upload?type=regulatory` - List regulatory files (line 998, 1575)
- `GET /api/upload?type=customer` - List customer files (line 1031, 1589)
- `GET /api/upload?type=documents` - List documents (line 1536)
- `DELETE /api/upload/:filename?type=:fileType` - Delete file (line 1072)

**Requirements Routes**:
- `GET /api/requirements/standards` - List all standards (lines 920, 1125, 1447, 1536, 2147)
- `GET /api/requirements/standards/:standardId/requirements` - Get requirements for standard (lines 1137, 1273, 2165)
- `PUT /api/requirements/standards/:standardId` - Update standard (line 2041)
- `DELETE /api/requirements/standards/:standardId` - Delete standard (line 2099)

**Parse Routes**:
- `POST /api/parse/standard/:standardId?force=true` - Parse/re-parse standard (lines 1235, 1464)

**Regulatory Routes**:
- `POST /api/regulatory/website` - Add regulatory website (line 1645)
- `GET /api/regulatory/websites` - List regulatory websites (line 1674)
- `DELETE /api/regulatory/website/:id?customerId=:customerId` - Delete regulatory website (line 1720)

**Regs Routes**:
- `POST /api/regs/refresh` - Refresh regulations (line 2351)

**Chat Routes**:
- `POST /api/chat/analyze` - Analyze document (line 1382)

**Persona Routes**:
- `GET /api/persona/greeting` - Get greeting (line 1791)

**Gap Routes**:
- `GET /api/gap/learn/last` - Get last learning (line 1818)
- `POST /api/gap/tuning/:id/approve` - Approve tuning (line 1896)
- `POST /api/gap/tuning/:id/reject` - Reject tuning (line 1912)

**Admin Routes**:
- `GET /api/admin/learning/proposals` - Get learning proposals (line 1840)
- `GET /api/admin/learning/stats` - Get learning stats (line 1841)

### Backend Routes (from route files)

**Upload Routes** (`upload.js`):
- ✅ `POST /api/upload` - Matches
- ✅ `GET /api/upload` - Matches (with type query param)
- ✅ `DELETE /api/upload/:filename` - Matches (with type query param)

**Requirements Routes** (`requirements.js`):
- ✅ `GET /api/requirements/standards` - Matches
- ✅ `GET /api/requirements/standards/:standardId/requirements` - Matches
- ✅ `PUT /api/requirements/standards/:standardId` - Matches
- ✅ `DELETE /api/requirements/standards/:standardId` - Matches

**Parse Routes** (`parse.js`):
- ✅ `POST /api/parse/standard/:standardId` - Matches (supports ?force=true)

**Regulatory Routes** (`regulatory.js`):
- ✅ `POST /api/regulatory/website` - Matches
- ✅ `GET /api/regulatory/websites` - Matches
- ✅ `DELETE /api/regulatory/website/:id` - Matches (customerId in query)

**Regs Routes** (`regs.js`):
- ✅ `POST /api/regs/refresh` - Matches

**Chat Routes** (`chat.js`):
- ✅ `POST /api/chat/analyze` - Matches

**Persona Routes** (`persona.js`):
- ✅ `GET /api/persona/greeting` - Matches

**Gap Routes** (`gap.js`):
- ✅ `GET /api/gap/learn/last` - Matches
- ✅ `POST /api/gap/tuning/:id/approve` - Matches
- ✅ `POST /api/gap/tuning/:id/reject` - Matches

**Admin Routes** (`admin.js`):
- ✅ `GET /api/admin/learning/proposals` - Matches
- ✅ `GET /api/admin/learning/stats` - Matches

## Analysis

### Route Matching Status

**All Frontend Calls Match Backend Routes**: ✅

All frontend API calls have corresponding backend routes. No 404 mismatches detected.

### Potential Issues

1. **Error Response Consistency**
   - Need to verify all routes return consistent error formats
   - Check for routes that return 500 vs 400 vs 404 inconsistently

2. **Query Parameter Handling**
   - `GET /api/upload?type=:type` - Verify all types handled correctly
   - `DELETE /api/regulatory/website/:id?customerId=:customerId` - Verify customerId optional

3. **Request Body Validation**
   - Verify all POST/PUT routes validate request bodies
   - Check for missing required fields

4. **Response Format Consistency**
   - Verify all routes return consistent JSON structure
   - Check for mixed success/error response formats

## Next Steps

See `TODO_pass3.md` for verification and consistency improvements.

