# DMAIC Tool - UI Test Plan

Comprehensive smoke test suite covering all major workflows and features.

## Test Environment

- **Browser:** Chrome 120+, Firefox 121+, Safari 17+, Edge 120+
- **Viewport:** Desktop (1920x1080), Tablet (768x1024), Mobile (375x812)
- **System:** Dark mode and Light mode (toggle)
- **Data:** Use pre-loaded sample project "Supplier On-Time Delivery Improvement"

## Test Cases

### TC-01: Application Load & Initial Display

**Steps:**
1. Open artifact/index.html in browser
2. Wait for page to fully load

**Expected Result:**
- Page loads without JavaScript errors (check F12 console)
- Header visible with title "DMAIC Continuous Improvement Tool"
- Conform-Edge branding visible
- Sample project "Supplier On-Time Delivery Improvement" pre-loaded
- Overall progress shows 75% (based on sample data)
- All 5 phase tabs visible (Define, Measure, Analyze, Improve, Control)

**Pass/Fail:** ☐

---

### TC-02: Dark Mode Toggle

**Steps:**
1. Click "🌙 Dark" or "☀️ Light" button in header
2. Observe UI changes
3. Toggle back to original mode

**Expected Result:**
- UI background switches between dark and light
- Text color inverts appropriately (readable)
- Glass panels update opacity/blur
- All text remains readable (WCAG AA contrast)
- Toggle state persists on page reload (localStorage)

**Pass/Fail:** ☐

---

### TC-03: Phase Tab Navigation

**Steps:**
1. Click "DEFINE" tab
2. Click "MEASURE" tab
3. Click "ANALYZE" tab
4. Click "IMPROVE" tab
5. Click "CONTROL" tab

**Expected Result:**
- Correct phase panel displays
- Tab styling changes (active tab highlighted in blue)
- No console errors
- Smooth transition between tabs

**Pass/Fail:** ☐

---

### TC-04: Define Phase - Content Display

**Steps:**
1. Click "DEFINE" tab
2. Observe all form fields and sections

**Expected Result:**
- Project Title field shows "Supplier On-Time Delivery Improvement"
- Project Owner field shows "Sarah Johnson"
- Charter/problem statement displays
- SMART goal displays
- Business case section visible
- Deliverables checklist shows: Charter ✓, Business Case ✓, Scope Statement ✓, Stakeholder Analysis ✓
- Progress bar shows 100%
- Phase gate approval shows "Approved by John Smith (Sponsor) on 2026-05-15"
- Status badge shows "COMPLETE - 100%"
- M-AI Suggestions section visible with at least 2 suggestions

**Pass/Fail:** ☐

---

### TC-05: Define Phase - SMART Goal Validation

**Steps:**
1. Click "DEFINE" tab
2. Clear SMART goal field
3. Type new goal: "Improve process"
4. Observe M-AI suggestions change

**Expected Result:**
- Warning suggestion appears about goal refinement
- Icon shows "⚠" for warning
- Message indicates missing specificity, measurability, or time-bound element
- Reload page (Ctrl+F5)
- Observe goal is still "Improve process" (localStorage saves changes)

**Pass/Fail:** ☐

---

### TC-06: Measure Phase - Baseline Metrics

**Steps:**
1. Click "MEASURE" tab
2. Observe baseline metric field
3. Verify sample size is displayed
4. Check data collection method

**Expected Result:**
- Baseline Metric shows "87"
- Sample Size shows "500"
- Data Collection Method shows "Daily shipment tracking system"
- Progress bar shows 100%
- Phase gate shows "Approved by John Smith (Sponsor) on 2026-06-05"
- M-AI suggestions include success message about adequate sample size (500 >= 100)

**Pass/Fail:** ☐

---

### TC-07: Measure Phase - Sample Size AI Suggestion

**Steps:**
1. Click "MEASURE" tab
2. Change Sample Size to "50"
3. Observe M-AI Suggestions update

**Expected Result:**
- Warning suggestion appears: "Sample size 50 may be too small"
- Message recommends ≥100-150 observations
- Icon shows "⚠"
- Change Sample Size back to "500"
- Success suggestion reappears

**Pass/Fail:** ☐

---

### TC-08: Analyze Phase - Pareto Chart Display

**Steps:**
1. Click "ANALYZE" tab
2. Observe Pareto Chart section

**Expected Result:**
- Title "Pareto Analysis (80/20 Root Causes)" visible
- Chart displays 4 bars in descending order:
  - "Supplier planning errors" (35 freq, ~44%)
  - "Transportation delays" (20 freq, ~25%)
  - "Quality issues requiring rework" (15 freq, ~19%)
  - "Other" (10 freq, ~12%)
- Bars are colored blue with varying heights
- Cumulative line (orange) overlays bars, rising to 100%
- X-axis shows cause labels
- Y-axis labeled "Frequency"
- No chart rendering errors

**Pass/Fail:** ☐

---

### TC-09: Analyze Phase - Correlation Matrix Display

**Steps:**
1. Click "ANALYZE" tab
2. Scroll down to Correlation Matrix section

**Expected Result:**
- Title "Correlation Matrix" visible
- 4x4 grid displayed with variables: Forecast Accuracy, Supplier Responsiveness, Inventory Level, Delivery Performance
- Diagonal cells show 1.0 (perfect self-correlation)
- Color-coded cells:
  - Green cells (r > 0.7): Forecast↔Delivery (0.88), Forecast↔Supplier (0.82), Supplier↔Delivery (0.75)
  - Orange/Yellow cells (0.4-0.7): Forecast↔Inventory (-0.45), Supplier↔Inventory (-0.32)
  - Red cells (r < 0): Inventory↔Delivery (-0.55)
- All correlation values displayed (2 decimal places)
- Grid properly aligned

**Pass/Fail:** ☐

---

### TC-10: Analyze Phase - Statistical Significance

**Steps:**
1. Click "ANALYZE" tab
2. Find p-Value field
3. Verify it shows "0.003"

**Expected Result:**
- p-Value field shows "0.003"
- M-AI suggestion displays: "Statistical significance detected (p-value 0.003 < 0.05)"
- Suggestion includes "Root causes are validated"
- Icon shows "✓" (success)
- Change p-Value to "0.08"
- M-AI warning appears: "p-value 0.08 > 0.05. Relationship may not be statistically significant"

**Pass/Fail:** ☐

---

### TC-11: Improve Phase - Solution Design & Pilot Results

**Steps:**
1. Click "IMPROVE" tab
2. Observe Solution Design field
3. Check Pilot Test Result field
4. Review FMEA Risk Assessment section

**Expected Result:**
- Solution Design shows: "Implement supplier scorecards, improve forecast accuracy, add expedite options"
- Pilot Test Result shows "92"
- Progress bar shows 100%
- FMEA Risk Assessment displays 2 risks:
  - "Supplier scorecard implementation" - Low Risk (green badge)
  - "Forecast accuracy improvement" - Medium Risk (orange badge)
- M-AI suggestion shows success: "Pilot shows 5.0% improvement"

**Pass/Fail:** ☐

---

### TC-12: Control Phase - SPC Chart Display

**Steps:**
1. Click "CONTROL" tab
2. Observe SPC Control Chart

**Expected Result:**
- Title "SPC Control Chart" visible
- Chart displays:
  - Red dashed lines for UCL (98) and LCL (92)
  - Green solid line for Center Line (95)
  - 7 blue data points from "Day 1" to "Day 7"
  - Points connected by blue line showing trend
  - Values approximately: [91, 93, 94, 93, 95, 94, 96]
  - X-axis labeled with days
  - Y-axis labeled with control limits
- Chart renders without errors

**Pass/Fail:** ☐

---

### TC-13: Control Phase - Current Metrics & Trend

**Steps:**
1. Click "CONTROL" tab
2. Find Current Metric field
3. Find Trend dropdown

**Expected Result:**
- Current Metric shows "94"
- Trend dropdown shows "Improving" selected
- Control Method field displays: "Daily delivery tracking dashboard"
- Deliverables checklist shows: Control Plan ✓, SPC Card ✓, Training Records ✓, Monitoring ☐
- Progress bar shows 60%
- Status badge shows "IN-PROGRESS - 60%"

**Pass/Fail:** ☐

---

### TC-14: Control Phase - M-AI Suggestions

**Steps:**
1. Click "CONTROL" tab
2. Review all M-AI suggestions

**Expected Result:**
- Suggestion displays: "Control limits set: UCL=98, Mean=95, LCL=92"
- Suggestion displays: "Current metric 94% is within 2% of target 95%"
- Both suggestions show "✓" icon (success)
- Third suggestion about operator training visible with "ℹ" icon (info)

**Pass/Fail:** ☐

---

### TC-15: Phase Gate Locking (Progressive Unlock)

**Steps:**
1. Click "MEASURE" tab
2. Attempt to change any field
3. Observe button state
4. Click "CONTROL" tab
5. Attempt to change fields

**Expected Result:**
- MEASURE phase is enabled (Define phase approved)
- Input fields in MEASURE are editable
- CONTROL phase is enabled (all phases approved through Improve)
- Input fields in CONTROL are editable
- If phase completeness < 80%, "Request Phase Gate Review" button is disabled
- If phase completeness >= 80%, button is enabled

**Pass/Fail:** ☐

---

### TC-16: Deliverables Checklist Interaction

**Steps:**
1. Click "DEFINE" tab
2. Scroll to "Define Phase Deliverables"
3. All checkboxes are checked
4. Reload page (Ctrl+F5)
5. Return to DEFINE tab

**Expected Result:**
- All 4 deliverable checkboxes are checked (Charter, Business Case, Scope Statement, Stakeholder Analysis)
- Checkboxes are read-only (disabled) because phase is complete
- State persists after reload (localStorage saves)
- Progress bar remains at 100%

**Pass/Fail:** ☐

---

### TC-17: Project Dashboard - Overall Progress

**Steps:**
1. Return to top of page (Define tab)
2. Observe project dashboard cards

**Expected Result:**
- Project Title card shows "Supplier On-Time Delivery Improvement"
- Overall Progress card shows "75%" (average of all phases)
- Progress bar reflects 75% fill
- Project Owner card shows "Sarah Johnson"
- Champion field shows "Mike Chen"

**Pass/Fail:** ☐

---

### TC-18: PDF Export

**Steps:**
1. Click "📄 Export PDF" button in header
2. Wait for download to complete
3. Open downloaded PDF

**Expected Result:**
- File downloads with name format: "Supplier On-Time Delivery Improvement-DMAIC.pdf"
- PDF opens successfully in Adobe Reader or browser
- PDF contains:
  - Project title and metadata
  - Phase statuses
  - Completion percentages
  - All section data (readable)
- No blank pages or rendering errors
- File size < 5MB

**Pass/Fail:** ☐

---

### TC-19: CSV Export

**Steps:**
1. Click "📊 Export CSV" button in header
2. Wait for download to complete
3. Open downloaded file in Excel or text editor

**Expected Result:**
- File downloads with name format: "Supplier On-Time Delivery Improvement-DMAIC.csv"
- CSV opens successfully in Excel
- Contains rows:
  - Header: "DMAIC Project Export" | "Supplier On-Time Delivery Improvement"
  - Owner row
  - Goal row
  - Phase data (Define, Measure, Analyze, Improve, Control)
  - Metrics data (On-Time Delivery %, Forecast Accuracy %, Supplier Score)
- All data is properly delimited (commas)
- Excel displays data correctly (no misaligned columns)

**Pass/Fail:** ☐

---

### TC-20: Responsive Design - Tablet (768px)

**Steps:**
1. Open developer tools (F12)
2. Toggle device toolbar
3. Set viewport to iPad (768x1024)
4. Reload page
5. Navigate all tabs

**Expected Result:**
- Layout adjusts to 2-column grid (Phase navigation stacks)
- Glass panels remain readable
- Form fields stack vertically
- Buttons stack if needed
- Charts resize proportionally
- No horizontal scroll bar
- All functionality works on touch (click buttons, fill forms)

**Pass/Fail:** ☐

---

### TC-21: Responsive Design - Mobile (375px)

**Steps:**
1. Set viewport to iPhone 13 (375x812)
2. Reload page
3. Navigate tabs
4. Fill a form field
5. Export PDF/CSV

**Expected Result:**
- Layout is single-column
- Phase tabs remain accessible (horizontal scroll or stack)
- Glass panels adapt to narrow width
- Form fields are full-width
- Charts scale down (still readable)
- Buttons are touch-friendly (min 44x44px)
- Export buttons work
- No text overflow or horizontal scroll

**Pass/Fail:** ☐

---

### TC-22: Browser Compatibility - Chrome

**Steps:**
1. Open artifact/index.html in Chrome 120+
2. Load all tabs
3. Check console (F12)

**Expected Result:**
- No errors in console
- All features work
- Charts render correctly
- Animations smooth (no jank)
- Exports work

**Pass/Fail:** ☐

---

### TC-23: Browser Compatibility - Firefox

**Steps:**
1. Open artifact/index.html in Firefox 121+
2. Repeat TC-22 steps

**Expected Result:**
- All same results as Chrome
- CSS transitions smooth
- No warnings in console

**Pass/Fail:** ☐

---

### TC-24: Browser Compatibility - Safari

**Steps:**
1. Open artifact/index.html in Safari 17+
2. Repeat TC-22 steps
3. Test glass morphism effects specifically

**Expected Result:**
- All features functional
- Backdrop-filter (glass effect) displays
- No layout shifts
- Exports work

**Pass/Fail:** ☐

---

### TC-25: Accessibility - Keyboard Navigation

**Steps:**
1. Open page in any browser
2. Press Tab repeatedly
3. Navigate through all interactive elements
4. Use Shift+Tab to go backward
5. Press Enter on buttons

**Expected Result:**
- Focus indicator visible on all interactive elements
- Tab order is logical (top to bottom, left to right)
- All buttons, form fields, and tabs are reachable via keyboard
- Enter key activates buttons
- Focus state has sufficient color contrast (WCAG AA)

**Pass/Fail:** ☐

---

## Summary

**Total Test Cases:** 25
**Passed:** ___/25
**Failed:** ___/25
**Blocked:** ___/25

**Overall Status:** ☐ PASS ☐ FAIL ☐ CONDITIONAL PASS

**Notes:**
_________________________________________________________________________

_________________________________________________________________________

**Tested By:** _____________________ **Date:** ___________________

**Sign-Off:** _____________________ **Date:** ___________________

---

## Regression Test (Run Before Each Release)

Quick validation before deploying new version:

1. ✓ App loads without errors
2. ✓ Sample project displays
3. ✓ All 5 phases accessible
4. ✓ Pareto chart renders
5. ✓ SPC chart renders
6. ✓ Phase gates lock/unlock correctly
7. ✓ PDF export works
8. ✓ CSV export works
9. ✓ Dark mode toggle works
10. ✓ M-AI suggestions appear

**Estimated Time:** 10 minutes

---

**Last Updated:** 2026-07-17
