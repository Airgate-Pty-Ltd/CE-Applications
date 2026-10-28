# UI Test Plan: IATF 16949 Core Tools Compliance Suite v1.0

## Pre-Launch Smoke Tests

### Test 1: Page Load & Initial Render
**Steps**:
1. Open artifact/index.html in Chrome (latest version)
2. Page should load completely in < 3 seconds
3. All content visible without scrolling (on 1920x1080 screen)

**Expected Result**:
- Header visible ("IATF 16949 Core Tools Compliance Suite")
- Info box visible ("How to use...")
- Controls visible (Company Name, Assessment Date, Customer Variant dropdown)
- All 6 tabs visible (APQP, PPAP, FMEA, MSA, SPC, IATF Integration)
- Radar chart canvas visible on right
- No console errors (press F12 → Console)

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### Test 2: Tab Navigation
**Steps**:
1. Click "PPAP" tab
2. Verify PPAP questions appear
3. Click "FMEA" tab
4. Verify FMEA questions appear
5. Repeat for MSA, SPC, IATF Integration tabs

**Expected Result**:
- Active tab shows as blue/highlighted
- Content changes instantly when tab clicked
- No console errors
- Tab button styling correct

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### Test 3: Question Answering & Real-Time Scoring
**Steps**:
1. On APQP tab, click score "5" for first question
2. Watch radar chart update immediately
3. Switch to PPAP tab
4. Click score "3" for first question
5. Watch radar chart update again
6. Verify Summary box shows updated scores

**Expected Result**:
- Radar chart updates within 500ms of clicking score
- Summary box shows "APQP: 5.0/5.0" and "PPAP: 3.0/5.0"
- Overall score reflects average
- No console errors

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### Test 4: Data Persistence (localStorage)
**Steps**:
1. Answer 5 questions across different tabs (vary scores: some 1, some 5)
2. Refresh browser (F5)
3. Verify all answers are still there
4. Radar chart matches previous session

**Expected Result**:
- Page reloads
- All previous answers intact
- Radar chart matches previous state
- No data loss

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### Test 5: PDF Export (Print-to-PDF)
**Steps**:
1. Complete at least 10 questions (mixed scores)
2. Click "Generate Report (PDF)"
3. System opens browser print dialog
4. Select "Print to PDF" (or "Save as PDF")
5. Save file
6. Open PDF in Adobe Reader

**Expected Result**:
- PDF contains company name + assessment date
- PDF shows maturity summary table
- Radar chart image visible in PDF
- All text readable
- File size < 2 MB

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### Test 6: CSV Export
**Steps**:
1. Complete assessment (answer all 45 questions)
2. Click "Export CSV"
3. Browser downloads file (e.g., iatf_assessment_2026-07-06.csv)
4. Open CSV in Excel or text editor

**Expected Result**:
- CSV contains headers: Company, Date, Tool, Question, Score
- All 45 questions listed with scores
- Data is clean (no encoding issues, all quotes escaped)
- File opens without errors in Excel

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### Test 7: Customer Variant Switching
**Steps**:
1. Select "Ford CSR" from dropdown (Customer Variant)
2. Verify question wording changes (Ford language)
3. Switch to "GM CSR"
4. Verify question wording reflects GM CSR language
5. Switch to "Stellantis"
6. Verify Stellantis-specific wording

**Expected Result**:
- Questions update when variant is selected
- Each variant has unique wording/language
- No console errors
- Scores reset (or preserved, depending on design)

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### Test 8: Reset Function
**Steps**:
1. Answer some questions
2. Click "Reset Assessment"
3. Click "OK" in confirmation dialog
4. Verify all answers are cleared

**Expected Result**:
- Confirmation dialog appears ("Reset all answers?")
- Clicking OK clears all localStorage data
- Radar chart resets to empty
- Summary shows no scores
- localStorage is cleared (dev tools → Application → Storage → localStorage)

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### Test 9: Mobile Responsiveness
**Steps**:
1. Open artifact/index.html on iPhone SE (or use Chrome DevTools mobile emulation)
2. Verify layout is readable (no text overflow, no horizontal scroll)
3. Verify all tabs are clickable (not cramped)
4. Verify controls are usable (dropdowns, buttons)
5. Repeat on iPad (portrait + landscape)

**Expected Result**:
- No horizontal scrolling needed (fits screen width)
- Text is readable (font size > 14px)
- Buttons are clickable (min 44px × 44px)
- Tabs stack or wrap appropriately
- Radar chart resizes to fit
- No console errors

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### Test 10: Cross-Browser Compatibility
**Steps**:
1. Open artifact/index.html in Safari (latest macOS)
2. Complete 5 questions, export CSV, generate PDF
3. Repeat in Firefox (latest)
4. Repeat in Edge (latest)

**Expected Result**:
- All functions work in all browsers
- No console errors
- Styling consistent (fonts, colors, layout)
- CSV/PDF exports work identically

**Pass/Fail**:
- Chrome: ☐ PASS ☐ FAIL
- Safari: ☐ PASS ☐ FAIL
- Firefox: ☐ PASS ☐ FAIL
- Edge: ☐ PASS ☐ FAIL

---

### Test 11: Accessibility (Keyboard Navigation)
**Steps**:
1. Open page
2. Press Tab to navigate through all form elements (no mouse)
3. Verify you can click all buttons using Space/Enter
4. Verify radio buttons are selectable via arrow keys
5. Verify tab switching is keyboard-accessible

**Expected Result**:
- Tab order is logical (left to right, top to bottom)
- All interactive elements are keyboard-accessible
- Focused elements have visible focus indicator
- No keyboard traps (can't get stuck)

**Pass/Fail**: ☐ PASS ☐ FAIL

---

### Test 12: Performance (Page Load Time)
**Steps**:
1. Open Chrome DevTools (F12 → Network tab)
2. Refresh page (clear cache: Shift+Cmd+R on Mac, Ctrl+Shift+R on Windows)
3. Note total page load time
4. Measure time until "DOMContentLoaded" event

**Expected Result**:
- Total page load: < 3 seconds
- DOMContentLoaded: < 1 second
- All resources (CSS, JS) load successfully (no 404s)
- No console warnings/errors

**Pass/Fail**: ☐ PASS ☐ FAIL

---

## Summary Checklist

| Test # | Category | Result | Notes |
|--------|----------|--------|-------|
| 1 | Page Load | ☐ P ☐ F | |
| 2 | Navigation | ☐ P ☐ F | |
| 3 | Scoring | ☐ P ☐ F | |
| 4 | Persistence | ☐ P ☐ F | |
| 5 | PDF Export | ☐ P ☐ F | |
| 6 | CSV Export | ☐ P ☐ F | |
| 7 | Variants | ☐ P ☐ F | |
| 8 | Reset | ☐ P ☐ F | |
| 9 | Mobile | ☐ P ☐ F | |
| 10 | Browsers | ☐ P ☐ F | |
| 11 | Accessibility | ☐ P ☐ F | |
| 12 | Performance | ☐ P ☐ F | |

---

## Launch Gate

**LAUNCH APPROVED** if:
- All 12 tests PASS
- No critical bugs
- NPS > 40 from beta users
- Performance < 3 sec page load on 4G
- Accessibility WCAG 2.1 AA compliant

**LAUNCH BLOCKED** if:
- Any test FAILS
- Console errors present
- PDF/CSV exports broken
- Mobile layout broken
- Performance > 5 sec on 4G

---

## Post-Launch Monitoring

After launch, monitor:
- **Weekly**: Support emails (feature requests, bugs)
- **Weekly**: Page load time (Google Analytics)
- **Monthly**: NPS score, churn rate
- **Monthly**: Browser version distribution (adjust compatibility if needed)
- **Quarterly**: Accessibility audit (automated + manual)

