# Build Spec — Food Safety FSMA/HACCP Self-Assessment
**Date:** 2026-08-20

## Deliverable
Single-file HTML: `food-safety-fsma-haccp.html`

## Structure
- 35 questions, 7 sections, 8 critical items (critical override = NOT READY if any at 0)
- Scoring: 0=Not Established / 1=Partial / 2=Established
- Sections: Management Commitment, PRPs/GMP, Hazard Analysis/HARPC, Preventive Controls, Allergen Controls, Verification/Records, Recall/Crisis
- Output: scored gap table (FDA reference, status, priority, corrective action), MR narrative, JSON export
- M-AI reserved interface: domain `food-safety-readiness`, 3 DIMs

## Standards/Regulations Addressed
21 CFR Part 117 (FSMA PCQI/HARPC), HACCP principles, 21 CFR Part 7 (Recall), 21 CFR Part 121 (Intentional Adulteration advisory)
