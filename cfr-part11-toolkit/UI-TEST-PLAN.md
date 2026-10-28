# UI Test Plan
## 21 CFR Part 11 / ALCOA++ Data Integrity Toolkit v1.0
**© 2026 Conform-Edge Quality Consulting LLC**

---

## Pre-Test Setup
1. Open `artifact/index.html` in Chrome (latest)
2. Open browser DevTools (F12) → Console tab
3. Confirm: no errors in console on load
4. If Chart.js CDN is unavailable, note it but continue (radar chart optional for scoring tests)

---

## Smoke Test Suite

### TC-01: Application Loads
**Steps:** Open `artifact/index.html`
**Expected:**
- Header shows "Conform-Edge Quality Consulting LLC" and "21 CFR Part 11 / ALCOA++ Data Integrity Toolkit v1.0"
- Dark navy header (#1a2332) is visible
- Section 1 questions are visible (not blank)
- Maturity Dashboard is visible with "Awaiting responses" state
- Completion progress bar shows 0%
- No JavaScript console errors
**Pass/Fail:** ___

### TC-02: All 50 Questions Render
**Steps:**
1. Count questions in Section 1: should be 8
2. Click "Record Creation & ALCOA++" in sidebar: count questions = 10
3. Click "Electronic Records" = 10
4. Click "Electronic Signatures" = 8
5. Click "Training & Competence" = 7
6. Click "Supplier & CSV Controls" = 7
**Expected:** Total = 50 questions. Each question has a Q-number badge, question text, regulatory reference, and 5 Likert radio buttons labeled 1–5.
**Pass/Fail:** ___

### TC-03: Scoring Calculates Correctly
**Steps:**
1. In Section 1, select score 5 for all 8 questions
2. Check sidebar badge for Section 1
**Expected:** Section 1 badge shows "5.0" in green
**Steps continued:**
3. In Section 2, select score 1 for all 10 questions
4. Check sidebar badge for Section 2
**Expected:** Section 2 badge shows "1.0" in red
5. Check overall score ring
**Expected:** Overall score = (8×5 + 10×1) / 18 = (40+10)/18 = 2.78. Score ring shows approximately 2.78.
**Pass/Fail:** ___

### TC-04: Radar Chart Renders
**Steps:** After answering at least one question per section (use demo mode)
**Expected:**
- Radar chart visible with 6 labeled axes: Culture & Gov., ALCOA++, Elec. Records, E-Signatures, Training, Supplier/CSV
- Chart fills based on scores
- No canvas error visible
**Pass/Fail:** ___

### TC-05: Demo Mode Loads
**Steps:** Click "Load Demo" button
**Expected:**
- Alert: "Demo data loaded — MediCore Devices, Inc. Assessment..."
- Company name field = "MediCore Devices, Inc."
- Assessment date = 2026-07-12
- Assessor = "Quality Systems Manager"
- All 50 questions show selected radio buttons
- Sidebar shows scores for all 6 sections
- Radar chart updates
- Completion bar shows 100%
**Pass/Fail:** ___

### TC-06: Gap Report Tab
**Steps:** With demo loaded, click "Gap Report" tab
**Expected:**
- Tab switches cleanly (Assessment tab becomes inactive, Gap Report active)
- Executive summary paragraph mentions "MediCore Devices, Inc." and the maturity level
- Section gap table has 6 rows with scores, maturity labels, and priority badges
- Critical gap section shows questions scored ≤ 2 (if any in demo)
**Pass/Fail:** ___

### TC-07: Generate Report (Print)
**Steps:** Click "Generate Report" button (either in header or Gap Report tab)
**Expected:**
- Browser print dialog opens immediately
- No JavaScript alert or modal appears
- Print preview shows content (not a blank page)
**Pass/Fail:** ___

### TC-08: CSV Export
**Steps:** With demo loaded, click "CSV" button
**Expected:**
- Browser initiates a file download named: `CFR-Part11-Assessment-MediCore-Devices,-Inc.-2026-07-12.csv`
- Open the downloaded file in a text editor or Excel
- First row: product title header
- Rows include: Q1 through Q50 with section name, question text, ALCOA++ attribute (where applicable), score (1–5), score label, and regulatory reference
- Final rows: 6 section scores and overall score
**Pass/Fail:** ___

### TC-09: Dark Mode Toggle
**Steps:** Click "Dark Mode" button
**Expected:**
- Background changes to dark (#0f172a)
- Text remains readable (light on dark)
- Card backgrounds change to dark (#1e293b)
- Radar chart re-renders without artifacts
- Click again → reverts to light mode
**Pass/Fail:** ___

### TC-10: All 6 Tabs Navigate
**Steps:** Using sidebar, click each section in turn; also use Next/Back buttons
**Expected:**
- Each section panel shows its questions when selected
- Section header shows correct section name and description
- "Next" button advances to the next section
- "Back" button returns to the previous section
- Clicking "View Gap Report" from Section 6 switches to the Gap Report tab
**Pass/Fail:** ___

### TC-11: Question Card Answered State
**Steps:** Answer any question with any score
**Expected:**
- The question card gets a blue left-border highlight (`.answered` class)
- The answered count in the sidebar increments
- The completion bar percentage increases
**Pass/Fail:** ___

### TC-12: Print View Clean (All Sections Visible)
**Steps:** Load demo → Ctrl+P (or Cmd+P)
**Expected:**
- All 6 section panels render in print preview (not just the active section)
- Sidebar and header buttons are hidden
- Footer disclaimer appears at the bottom
**Pass/Fail:** ___

### TC-13: Company Name and Date Header Inputs
**Steps:**
1. Type a company name in the Organization field
2. Check Gap Report tab
**Expected:** Executive summary in Gap Report shows the typed company name
**Pass/Fail:** ___

### TC-14: ALCOA++ Attribute Badges
**Steps:** Navigate to Section 2 (Record Creation & ALCOA++)
**Expected:**
- Q9 shows "ATTRIBUTABLE" badge
- Q10 shows "LEGIBLE" badge
- Q11 shows "CONTEMPORANEOUS" badge
- Q12 shows "ORIGINAL" badge
- Q13 shows "ACCURATE" badge
- Q14 shows "COMPLETE" badge
- Q15 shows "CONSISTENT" badge
- Q16 shows "ENDURING" badge
- Q17 shows "AVAILABLE" badge
- Q18 has no ALCOA++ badge (paper record controls)
**Pass/Fail:** ___

### TC-15: Footer Copyright
**Steps:** Scroll to bottom of any page
**Expected:** Footer reads "© 2026 Conform-Edge Quality Consulting LLC. All rights reserved. | 21 CFR Part 11 / ALCOA++ Data Integrity Toolkit v1.0"
**Pass/Fail:** ___

---

## Test Result Summary

| Test | Status |
|------|--------|
| TC-01 Application Loads | |
| TC-02 All 50 Questions | |
| TC-03 Scoring Calculates | |
| TC-04 Radar Chart | |
| TC-05 Demo Mode | |
| TC-06 Gap Report | |
| TC-07 Generate Report | |
| TC-08 CSV Export | |
| TC-09 Dark Mode | |
| TC-10 All 6 Tabs Navigate | |
| TC-11 Answered State | |
| TC-12 Print View Clean | |
| TC-13 Company Name Input | |
| TC-14 ALCOA++ Badges | |
| TC-15 Footer Copyright | |

**Tester:** _______________ **Date:** _______________ **Version:** v1.0

---

© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
