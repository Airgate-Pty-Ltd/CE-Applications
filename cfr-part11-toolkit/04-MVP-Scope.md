# 04 — MVP Scope
## 21 CFR Part 11 / ALCOA++ Data Integrity Toolkit v1.0
**© 2026 Conform-Edge Quality Consulting LLC**

---

## What Is In Scope for v1.0

### Core Application (`artifact/index.html`)
- [x] 50-question self-assessment tool, fully interactive
- [x] 6 sections with correct question counts (8 + 10 + 10 + 8 + 7 + 7 = 50)
- [x] 5-point Likert scale per question with descriptive labels
- [x] Regulatory reference citation visible on every question
- [x] ALCOA++ attribute badge on all 9 ALCOA++ questions (Section 2)
- [x] Section navigation via sidebar and Next/Back buttons
- [x] Live maturity score dashboard updating on every answer
- [x] Radar chart (Chart.js v4.4.0 CDN) showing all 6 section scores simultaneously
- [x] Section bar chart with color-coded fill (green ≥4.0, blue ≥3.0, amber ≥2.0, red <2.0)
- [x] Overall score ring with animated arc
- [x] Maturity level labels (Level 1 Initial through Level 5 Optimized)
- [x] Gap Report tab with executive summary, section gap table, critical gap drill-down
- [x] "Generate Report" button → `window.print()` (no alert, no modal)
- [x] CSV export with company name, date, assessor, all 50 question scores and references
- [x] Company name, assessment date, and assessor name header inputs
- [x] Demo mode pre-loads MediCore Devices, Inc. with 50 realistic scores
- [x] Dark mode toggle with full CSS variable support
- [x] Completion progress bar (questions answered / 50)
- [x] Sidebar section badges showing per-section score with color coding
- [x] Print-optimized CSS (`@media print`)
- [x] Conform-Edge dark navy header (#1a2332)
- [x] Footer: "© 2026 Conform-Edge Quality Consulting LLC. All rights reserved."
- [x] Footer disclaimer with legal/regulatory caveat
- [x] Regulatory references footer listing all four source documents

### Documentation Package
- [x] 00-Executive-Summary.md (pre-existing)
- [x] 01-Opportunity-Validation.md
- [x] 02-Product-Brief.md
- [x] 03-Buyer-and-Pricing.md
- [x] 04-MVP-Scope.md (this file)
- [x] 05-Premium-Roadmap.md
- [x] 06-Compliance-Alignment.md
- [x] 07-Implementation-Instructions.md
- [x] 08-Risks-Assumptions-Boundaries.md
- [x] 09-Next-Build-Backlog.md
- [x] README.md
- [x] UI-TEST-PLAN.md
- [x] RAILWAY-DEPLOYMENT.md
- [x] GITHUB-READY.md
- [x] sample-output.md
- [x] customer-facing-copy.md
- [x] COMPLETION-MARKER.md

---

## What Is Explicitly Out of Scope for v1.0

| Feature | Why Deferred | Roadmap Version |
|---------|-------------|-----------------|
| User accounts / authentication | Backend required; increases deployment complexity | v1.1 |
| Saved assessments / history | Requires database | v1.1 |
| Multi-facility comparison | Requires account layer | v2.0 |
| AI gap explanation | LLM API call; cost; latency | v2.0 |
| FDA 483 pattern matching | Requires curated 483 database | v2.0 |
| Benchmark database | Requires aggregate data collection | v2.0 |
| White-label report generation | Requires server-side PDF | v3.0 |
| Consultant dashboard | Multi-tenant architecture | v3.0 |
| Email capture / Stripe integration | Third-party services | Post-deployment |
| Procedure / template document kit | Second product tier | Post-v1.0 product |
| ISO 13485 module | Separate assessment track | v2.0 companion |
| EU MDR / EUDAMED module | Separate regulatory scope | v2.0 companion |

---

## Scoring Specification

### Per-Question Score
- Input: Radio button selection, integer 1–5
- Storage: In-memory JavaScript object `answers[questionId] = score`
- Default: Unselected (not counted in averages)

### Section Score
- Formula: `sum(answered question scores) / count(answered questions in section)`
- Returns null if no questions in section are answered
- Displayed as: X.XX (two decimal places)

### Overall Score
- Formula: `sum(all answered scores) / count(all answered questions)`
- Returns null if zero questions answered

### Color Thresholds
- Green (≥4.0): Compliant / Low priority
- Blue (≥3.0): Partial gap / Medium priority
- Amber (≥2.0): High gap / High priority
- Red (<2.0): Critical gap / Critical priority (same as Amber band but lowest end)

---

## Success Criteria

The v1.0 MVP is considered complete and deployable when:

1. All 50 questions render across 6 sections with correct question counts
2. Selecting answers on any question updates the dashboard within 100ms
3. Radar chart renders with 6 labeled axes
4. "Generate Report" triggers browser print dialog without error or alert
5. CSV export downloads a valid CSV file containing all 50 question rows
6. Demo mode loads and shows a non-trivial gap pattern (not all 5s)
7. Dark mode toggles cleanly without chart rendering artifacts
8. Print preview shows all 6 section panels and the gap report, not just the current tab
9. All regulatory references are visible per question
10. Footer shows "© 2026 Conform-Edge Quality Consulting LLC" and disclaimer

---

© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
