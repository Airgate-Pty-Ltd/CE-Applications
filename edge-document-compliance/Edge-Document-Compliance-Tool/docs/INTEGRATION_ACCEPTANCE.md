# Integration Acceptance Criteria

This document defines pass/fail criteria for the Audit Tool integration into EDC.

## Prerequisites

- Database migrations run successfully
- Seed data created (default users and roles)
- Server starts without errors
- Frontend builds successfully

## Test Scenarios

### 1. Authentication Flow

**Test:** User can login and access protected routes

**Steps:**
1. Navigate to `/login`
2. Enter credentials: `admin@example.com` / `admin123`
3. Submit login form

**Expected:**
- ✅ Login succeeds
- ✅ JWT token stored in localStorage
- ✅ Redirected to `/audits` dashboard
- ✅ User info displayed

**Pass Criteria:** All expected outcomes occur

---

### 2. Source Document Upload

**Test:** Upload and extract requirements from source document

**Steps:**
1. Login as admin
2. Upload a source document (standard, regulation, or customer requirement)
3. Extract requirements from the document

**Expected:**
- ✅ Document uploaded successfully
- ✅ Document appears in sources list
- ✅ Requirements extracted and stored
- ✅ Requirements visible in requirements list

**Pass Criteria:** All expected outcomes occur

---

### 3. Audit Creation Flow

**Test:** Create audit → generate checklist → view items

**Steps:**
1. Create new audit (draft)
2. Select source documents
3. Generate checklist
4. View audit items

**Expected:**
- ✅ Audit created with DRAFT status
- ✅ Checklist generated with items from selected sources
- ✅ Items grouped by section (Standards, Regulations, Customer)
- ✅ Each item has question and evidence expectations
- ✅ Audit pack JSON stored

**Pass Criteria:** All expected outcomes occur

---

### 4. Audit Lifecycle

**Test:** Complete audit lifecycle: DRAFT → SCHEDULED → IN_PROGRESS → SUBMITTED → CLOSED

**Steps:**
1. Create audit (DRAFT)
2. Schedule audit (SCHEDULED)
3. Start audit (IN_PROGRESS)
4. Submit audit (SUBMITTED)
5. Close audit (CLOSED)

**Expected:**
- ✅ Status transitions are valid
- ✅ State history recorded for each transition
- ✅ Invalid transitions rejected
- ✅ Status displayed correctly in UI

**Pass Criteria:** All expected outcomes occur

---

### 5. Audit Response Submission

**Test:** Submit responses to audit items

**Steps:**
1. Open audit in IN_PROGRESS status
2. View audit items
3. Submit response for an item (with conformance status)
4. Upload evidence for an item

**Expected:**
- ✅ Response saved successfully
- ✅ Conformance status recorded
- ✅ Evidence file uploaded
- ✅ Response visible in audit view

**Pass Criteria:** All expected outcomes occur

---

### 6. Role-Based Access Control

**Test:** Verify role-based permissions

**Steps:**
1. Login as Lead Auditor
2. Verify can assign auditors
3. Verify can return/close audits
4. Login as Internal Assessor
5. Verify can submit responses
6. Verify cannot close audits

**Expected:**
- ✅ Lead Auditor can perform all lead functions
- ✅ Internal Assessor can submit responses
- ✅ Internal Assessor cannot close audits (403 error)
- ✅ Unauthorized actions return 403

**Pass Criteria:** All expected outcomes occur

---

### 7. Export Functionality

**Test:** Export audit in different formats

**Steps:**
1. Create and complete an audit
2. Export as JSON
3. Export as XLSX
4. Attempt PDF export (may be stubbed)

**Expected:**
- ✅ JSON export returns audit data
- ✅ XLSX export downloads Excel file
- ✅ Excel file contains summary and checklist sheets
- ✅ PDF export handled gracefully (may return 501 if not implemented)

**Pass Criteria:** JSON and XLSX exports work; PDF handled gracefully

---

### 8. Integration with EDC Extraction

**Test:** Connect EDC document parsing to audit requirement extraction

**Steps:**
1. Upload document via EDC upload endpoint
2. Parse document (if EDC parsing exists)
3. Create source document from EDC document
4. Extract requirements
5. Use requirements in audit checklist generation

**Expected:**
- ✅ EDC document parsing works (if implemented)
- ✅ Source document created from EDC document
- ✅ Requirements extracted from parsed text
- ✅ Requirements used in checklist generation

**Pass Criteria:** Integration works end-to-end (or gracefully handles missing EDC features)

---

## Smoke Test Script

Run the automated smoke test:

```bash
cd backend
npm run audits:smoke
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║  AUDIT MODULE SMOKE TEST                                       ║
╚═══════════════════════════════════════════════════════════════╝

1. Testing login...
   ✓ Login successful
   User: admin@example.com, Roles: Admin

2. Creating source document...
   ✓ Source document created: <uuid>

3. Extracting requirements...
   ✓ Extracted <n> requirements

4. Creating audit...
   ✓ Audit created: <uuid>, Status: DRAFT

5. Generating checklist...
   ✓ Checklist generated with <n> items

6. Submitting audit...
   ✓ Audit submitted, Status: SUBMITTED

7. Closing audit...
   ✓ Audit closed, Status: CLOSED

╔═══════════════════════════════════════════════════════════════╗
║  ✅ SMOKE TEST PASSED                                          ║
╚═══════════════════════════════════════════════════════════════╝
```

**Pass Criteria:** Script completes with exit code 0

---

## Overall Acceptance

**Integration is considered successful if:**
- ✅ All 8 test scenarios pass
- ✅ Smoke test script passes
- ✅ No breaking changes to existing EDC functionality
- ✅ Documentation is complete
- ✅ Code follows EDC patterns (JavaScript, Express, PostgreSQL)

**Known Limitations:**
- PDF export may be stubbed (returns 501)
- Advanced EDC parsing integration may require additional work
- UI components are basic (can be enhanced later)

---

## Next Steps After Acceptance

1. Enhance UI components with better styling
2. Implement PDF export
3. Add more sophisticated requirement extraction
4. Add audit templates
5. Add bulk operations
6. Add reporting and analytics
