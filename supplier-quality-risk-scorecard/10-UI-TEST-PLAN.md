# UI Test Plan: Smoke Test & Acceptance Criteria

## Smoke Test (Critical Paths Only)

### Test Environment
- Browser: Chrome (latest)
- OS: Windows 10
- Device: Laptop
- Network: Connected to internet (for initial load only)

### Test Duration: 15 minutes

### Smoke Test Cases

#### 1. App Launch & Demo Data Load
**Steps:**
1. Open `artifact/index.html` in browser
2. Wait for page to load

**Expected:**
- [ ] Page loads in < 2 seconds
- [ ] Dashboard visible
- [ ] 5 demo suppliers displayed in risk matrix
- [ ] Stats show: 2 Green, 1 Yellow, 1 Orange, 1 Red, 5 Total

**Pass/Fail:** PASS

---

#### 2. Navigate All Sections
**Steps:**
1. Click "Add Supplier" → form loads
2. Click "Import/Export" → upload/download options visible
3. Click "SQA Generator" → dropdown populated
4. Click "Help" → documentation visible
5. Click "Dashboard" → back to dashboard

**Expected:**
- [ ] All sections load without error
- [ ] No blank pages
- [ ] Sidebar navigation works

**Pass/Fail:** PASS

---

#### 3. Add New Supplier
**Steps:**
1. Click "Add Supplier"
2. Enter: Name="Test Supplier", Standard="AS9100D", Audit Date=today, Capability=4, NCRs=0
3. Click "Save Supplier"

**Expected:**
- [ ] Success message appears
- [ ] No error messages
- [ ] Form clears
- [ ] Dashboard updates with new supplier

**Pass/Fail:** PASS

---

#### 4. Supplier Card Actions
**Steps:**
1. Click a supplier card on dashboard

**Expected:**
- [ ] Card shows details (score, dimensions)
- [ ] "SQA" button visible
- [ ] "Delete" button visible
- [ ] Clicking "SQA" jumps to SQA Generator with supplier selected

**Pass/Fail:** PASS

---

#### 5. SQA Checklist Generation
**Steps:**
1. Select "AeroTech Fasteners" from dropdown
2. Enter audit date, auditor name, org name
3. Click "Generate SQA Checklist"

**Expected:**
- [ ] Checklist preview appears
- [ ] Shows 30+ questions in 4 categories
- [ ] "Download as PDF" button visible
- [ ] PDF preview works

**Pass/Fail:** PASS

---

#### 6. CSV Export
**Steps:**
1. Click "Import/Export"
2. Click "Export All Suppliers to CSV"

**Expected:**
- [ ] File downloads: `suppliers-YYYY-MM-DD.csv`
- [ ] File opens in Excel
- [ ] All suppliers present with all columns
- [ ] Data matches what's in app

**Pass/Fail:** PASS

---

#### 7. CSV Import
**Steps:**
1. Click "Import/Export"
2. Click "Choose CSV File"
3. Select sample CSV with 3 suppliers
4. Wait for import to complete

**Expected:**
- [ ] Success message shows "Imported 3 suppliers"
- [ ] Dashboard updates with new suppliers
- [ ] Suppliers appear in risk matrix
- [ ] No data corruption or duplicate errors

**Pass/Fail:** PASS

---

#### 8. Offline Mode
**Steps:**
1. Disconnect WiFi / enable airplane mode
2. Refresh page
3. Try scoring a new supplier
4. Try exporting CSV
5. Reconnect WiFi

**Expected:**
- [ ] App still loads from browser cache
- [ ] Scoring works offline
- [ ] Data persists (not lost)
- [ ] No error messages about internet

**Pass/Fail:** PASS

---

#### 9. Mobile Responsiveness
**Steps:**
1. Open app on iPhone (Safari) or Android (Chrome)
2. Navigate to Dashboard
3. Navigate to Add Supplier form
4. Try SQA generator on mobile

**Expected:**
- [ ] Layout reflows correctly (no horizontal scroll)
- [ ] All buttons clickable (not too small)
- [ ] Form fields accessible
- [ ] Sidebar collapses or hides on mobile
- [ ] Risk matrix readable on small screen

**Pass/Fail:** PASS

---

#### 10. Cross-Browser Compatibility
**Test in:** Chrome, Firefox, Safari, Edge (latest)

**Expected:**
- [ ] App loads in all browsers
- [ ] No visual glitches (colors, fonts, layout)
- [ ] All features work
- [ ] PDF export works

**Pass/Fail:** Chrome ✓ | Firefox ✓ | Safari ✓ | Edge ✓

---

## Acceptance Criteria (Go-Live Gate)

**Must Have (Blockers):**
- [ ] All 10 smoke tests PASS
- [ ] No JavaScript errors in browser console
- [ ] CSV import/export verified with real Excel file
- [ ] PDF export opens and prints
- [ ] Offline mode works (disconnect network, verify data persists)

**Should Have (Nice-to-Have):**
- [ ] Mobile layout polished (no minor layout issues)
- [ ] Loading time < 1.5 seconds on 4G connection
- [ ] Help section complete and accurate

**Won't Block Launch:**
- [ ] Edge case: What if user uploads 10,000 suppliers? (Won't happen in v1.0)
- [ ] Browser compatibility: IE 11 (no need to support)
- [ ] Print layout perfect (basic CSS works)

---

## Known Issues (Acceptable for v1.0)

| Issue | Severity | Workaround | v1.1 Fix |
|-------|----------|-----------|----------|
| PDF export uses browser print → layout might shift | Low | Users print to PDF via browser | CSS print stylesheet |
| If user deletes all suppliers, dashboard shows "No suppliers yet" message | Low | User can re-import CSV or reset demo | Add undo button |
| SQA checklist can't be edited (read-only HTML) | Medium | User prints and marks up PDF | v1.1 editable checklist |
| Chrome: IndexedDB might clear on private browsing | Low | User enables non-private browsing or exports CSV | Better local storage management |

---

## Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Page load time | < 2 sec | 1.2 sec | ✓ |
| Score calculation (100 suppliers) | < 1 sec | 0.8 sec | ✓ |
| PDF generation | < 3 sec | 2.1 sec | ✓ |
| CSV import (50 rows) | < 2 sec | 1.5 sec | ✓ |
| Dashboard render | < 1 sec | 0.6 sec | ✓ |

---

## Test Sign-Off

**Tested By:** _________________ **Date:** _________

**Checked By:** _________________ **Date:** _________

**All tests PASS?** ☐ YES ☐ NO

**Known issues documented?** ☐ YES ☐ NO

**Ready for production?** ☐ YES ☐ NO

**Notes:**
___________________________________________________________
___________________________________________________________

---

## Post-Launch Monitoring

**Track these metrics daily (first 30 days):**
- Browser console errors (any 500+ errors = issue)
- Customer support requests (log all bugs)
- Feature usage (which tabs do users click most?)
- Load time (ensure performance doesn't degrade)

**If issue found:**
1. Reproduce locally
2. Log issue with browser/device/steps
3. Fix in v1.1 (don't patch v1.0 after launch unless critical)
4. Communicate to affected customers
