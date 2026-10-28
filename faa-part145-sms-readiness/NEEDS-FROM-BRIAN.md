# Needs From Brian — FAA Part 145 SMS Readiness Tool

**Status:** PROTOTYPE — awaiting Brian inputs before commercial launch  
**Date:** 2026-08-25

---

## LAUNCH BLOCKERS

### 1. Regulatory Status Disclosure Wording (CONFIRM — highest priority)
**Item:** The tool's regulatory status notice states no final FAA SMS rule for Part 145 exists as of publication. Brian must confirm this is accurate as of launch date, and that the disclaimer wording is sufficient before any commercial sale.  
**Action:** Review reg-notice div in tool header. Confirm current FAA SMS regulatory status. Adjust wording if needed.  
**Risk:** If FAA has finalized or proposed a rule post-tool-build, language needs updating. This is the most legally sensitive blocker.

### 2. Scoring Thresholds (CONFIRM)
**Item:** READY requires ≥80% in place + 0 partial; DEVELOPING requires ≥50%. These are INFERRED from Brian's experience.  
**Action:** Confirm thresholds are defensible. Adjust in DECISION-LOGIC.md and in the HTML file's `generateReport()` function.

### 3. Critical-Item List (CONFIRM)
**Item:** 4 questions are flagged as critical-mandatory: Safety Policy (Q1.1), Accountable Manager (Q1.4), Hazard ID (Q2.1), Risk Assessment (Q2.2). Any NOT-IN-PLACE forces NOT-STARTED. Confirm these are the right mandatory-minimum elements.  
**Action:** Review DECISION-LOGIC.md critical items table. Adjust `critical: true` flags in the COMPONENTS array in the HTML if needed.

### 4. FAA AC Reference (CONFIRM)
**Item:** Tool references FAA AC 120-92B as the SMS guidance. Confirm this is the current active AC (or identify superseding guidance).  
**Action:** Check FAA Advisory Circular page for current SMS AC for aviation service providers.

### 5. Pricing (CONFIRM)
**Item:** $149–$299 individual / $799 site is INFERRED. SMS bundle with EASA SMSVP Starter Kit at $499–$699 is INFERRED.  
**Action:** Confirm pricing and whether SMS bundle will be offered at launch.

---

## When You Confirm
Record confirmations in ANSWER_BANK. Regulatory status note (#1) is the release gate — do not list commercially until confirmed.
