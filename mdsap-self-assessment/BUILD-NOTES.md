# Build Notes — mdsap-self-assessment

## What was built

**File:** `mdsap-self-assessment-tool.html` (~650 lines, self-contained single-file HTML)

A fully interactive MDSAP 7-Process Self-Assessment Tool covering all 7 MDSAP audit processes, 50+ individual requirements, and 5 regulatory authorities (FDA, Health Canada, ANVISA, TGA, PMDA). Features:

- **7 tabbed audit processes** — MG, DMAFR, DD, PC, PSC, MAI, SP — matching the official MDSAP Audit Approach document structure
- **50+ checkable requirements** organized into 22 requirement groups; each requirement tagged by applicable authority/criticality
- **Live dashboard** — overall % score, MDSAP readiness grade (A–F), open gap count, N/A count, and answered-items progress bar
- **Gap Report generator** — one-click report of all unchecked items, separated into Critical and Standard, with process attribution
- **CSV export** — downloads conforming/open/N/A status for all items, importable to Excel for evidence tracking
- **N/A marking** — mark inapplicable requirements (e.g., PMDA items for non-Japan-market companies) to exclude from scoring
- **Print-friendly** — all 7 processes expand when printed; navigation collapses
- **Zero external dependencies** — runs fully offline, no CDN, no server required; can be emailed to clients or embedded in a Conform-Edge portal

## Why this pick

**Scoring vs. other 2026-06-22 candidates:**

| Opportunity | Automation | Brian's Edge | Buildability Today | Pick? |
|---|---|---|---|---|
| MDSAP 7-Process Self-Assessment Tool | HIGH — one-time digital product | Very High — holds ISO 13485 + MDSAP lead auditor cert; iso13485-mdsap-auditor skill exists | HIGH — HTML, fully buildable | ✅ PICK |
| AS9102B FAI Toolkit | High | High | High | Runner-up |
| IATF CSR Navigator | High | Medium | High | 3rd |
| Conform-Edge Consultant License Program | Very High | High | Low (needs business framework) | 4th |

MDSAP scored highest on the combination of automation (sell once, deliver digitally), edge (no one else has a single-file 5-authority self-assessment tool at this price point), and buildability (all requirements are within Brian's certified knowledge base, no research gap).

## Key assumptions

1. **[ASSUMPTION]** MDSAP Audit Approach document structure (7 processes: MG, DMAFR, DD, PC, PSC, MAI, SP) reflects the current MDSAP Council-published version as of mid-2026. Verify against the current MDSAP Audit Approach and Companion Document before any go-live claim.

2. **[ASSUMPTION]** Reporting timelines cited for each authority (FDA 5/10/30 days, HC 10/30, ANVISA 72 hrs/15 days, TGA 2/10/30, PMDA 15/30 days) are correct as of knowledge cutoff. These change periodically — Brian should verify before publishing.

3. **[ASSUMPTION]** TGA currently accepts MDSAP audit reports in lieu of separate TGA GMP audits under TGA's MDSAP recognition scheme. Verify current TGA MDSAP recognition scope.

4. **[ASSUMPTION]** PMDA marketing authorization process references are accurate for Class III/IV devices. Japan's recognition of MDSAP audit reports for domestic QMS certification should be verified with a Japan-market regulatory specialist.

5. **[ASSUMPTION]** Pricing model ($297 Gumroad or $49/mo Conform-Edge portal) will generate the assumed conversion rates. No customer research was conducted in this unattended session.

6. **[ASSUMPTION]** The 50+ requirements captured cover the primary MDSAP audit sample points. A full commercial version should be expanded to match the complete MDSAP Audit Approach task list (~300+ audit tasks).

## To go live — YOU do these

- [ ] **Review and verify** all 50+ requirements against current MDSAP Audit Approach document (download from MDSAP Council/IMDRF)
- [ ] **Verify regulatory timelines** for each authority's vigilance/MDR reporting requirements
- [ ] **Verify TGA MDSAP scope** — confirm TGA currently accepts MDSAP for all device classes
- [ ] **Verify PMDA** MDSAP recognition scope — confirm current status
- [ ] **Expand to full scope** (optional for v2.0) — MDSAP Audit Approach contains ~300 tasks; current tool covers the primary 50+; expand for a premium tier
- [ ] **Add company/assessor name fields** and report date to the HTML (minor enhancement, ~30 min)
- [ ] **Create Gumroad product listing** — upload HTML as a zip; set price $297 one-time or $97 intro
- [ ] **Alternatively: add to Conform-Edge portal** as a subscriber-gated tool (higher margin, recurring)
- [ ] **Write LinkedIn launch post** — "I just built a free preview of the MDSAP self-assessment tool I use with clients..." → link to Gumroad or Conform-Edge
- [ ] **Legal disclaimer review** — confirm the disclaimer language is adequate for your jurisdiction before distribution
- [ ] **Create 3-email nurture sequence** for Conform-Edge leads who download the tool → upsell to Conform-Edge platform license
