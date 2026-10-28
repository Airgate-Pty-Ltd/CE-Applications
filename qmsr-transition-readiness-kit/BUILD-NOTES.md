# Build Notes — QMSR Transition Readiness Tool (2026-06-24 | Remediated 2026-06-30)

## Status
This folder was previously EMPTY — no files were created by the original automated scan run.
Remediated 2026-06-30 by manual review and rebuild.

## What was built

**`qmsr-transition-readiness-tool.html`** — A complete, self-contained single-file HTML/JS tool:
- 40 scored assessment items across 8 QMSR process areas
- Covers 21 CFR Part 820 (QMSR, effective February 2, 2026) + ISO 13485:2016 incorporated by reference
- Section-by-section scoring with collapsible section cards
- 4 scoring options per item: Fully Compliant / Partially / Not Compliant / N/A
- Inline delta flags identifying NEW requirements and terminology CHANGES from the legacy QSR
- SVG score ring with 4-tier verdict (Compliant / Moderate / High / Critical)
- Section bar chart, prioritized action plan with specific remediation actions per item
- Print/PDF export
- No backend, no dependencies — runs 100% offline in any browser
- Conform-Edge navy/steel/amber branding

## Sections covered

| # | Section | Items |
|---|---------|-------|
| 1 | QMS Foundation & QMSR Scope | 6 |
| 2 | Design Controls & DHF | 6 |
| 3 | DMR & Device History Records | 5 |
| 4 | Complaint Handling & MDR Reporting | 6 |
| 5 | CAPA | 4 |
| 6 | Supplier & Purchasing Controls | 5 |
| 7 | Process Validation & Production Controls | 4 |
| 8 | Internal Audit, Document & Record Control | 4 |
| **Total** | | **40** |

## Why this matters (original scanner rationale)

- QMSR became effective **February 2, 2026** — the transition grace period is over
- FDA Warning Letters citing QMSR violations began issuing Q1 2026
- Every US medical device manufacturer (~18,000+ registered) must conform now
- ISO 13485 incorporation by reference creates confusion — many QMS teams don't know what changed
- No low-cost self-assessment tool exists at this price point for this exact transition moment

## To go live — YOU do these

- [ ] Open in Chrome; test all 40 items and verify report generates correctly
- [ ] Review each of the 40 remediation action texts for accuracy against current 21 CFR Part 820 text
- [ ] **Verify QMSR-specific additions** (DHF, DMR, DHR terminology; UDI; MDR reporting timelines) against current published regulation
- [ ] Decide on price point ($199 single-user / $349 org license recommended)
- [ ] Create Gumroad listing: upload HTML, add screenshots, write 200-word description
- [ ] Write LinkedIn post: "FDA QMSR has been in effect since February 2026 — are you compliant? Warning letters are already going out..."
- [ ] Consider bundling: QMSR Tool + ISO 13485 Gap Analyzer + MDSAP Tool as a Medical Device QMS Bundle ($499)
- [ ] Add legal disclaimer review before distribution

## Revenue potential

| Scenario | Math | Revenue |
|----------|------|---------|
| Conservative | 100 buyers × $199 | $19,900 |
| Target | 300 buyers × $199 | $59,700 |
| Org license upsell | 50 orgs × $349 | $17,450 |
| Conform-Edge upsell | 30 subscribers × $299/mo | $107,640/yr |

*Build date: 2026-06-30 | Built by: Manual remediation after empty folder detected*
