# Discovery Record — FAA Part 120 Drug & Alcohol Compliance Tool

**Date:** 2026-09-05
**Opportunity Scanner Run:** Overnight 2026-09-05
**Brand:** Conform-Edge (software)
**Status:** BUILD AUTHORIZED

---

## Opportunity Summary

Self-contained HTML self-assessment tool for FAA-regulated employers (14 CFR Parts 121/135/145) evaluating compliance with the DOT/FAA drug and alcohol testing program requirements under 14 CFR Part 120 and 49 CFR Part 40.

**Market gap:** No peer tool exists for this regulatory domain in the portfolio or publicly. FAA Drug Abatement Division inspection activity is ongoing; repair stations (Part 145) are the primary Conform-Edge audience and are directly covered by Part 120.

---

## Product Definition

| Field | Value |
|-------|-------|
| Type | Self-contained HTML tool |
| Target user | VP Quality, Compliance Manager, DER, FAA Drug Abatement POC at Part 145/121/135 operators |
| Problem solved | Identifies D&A program gaps before FAA inspection; generates MR narrative for Clause 9.1 reporting |
| Standard scope | 14 CFR Part 120, 49 CFR Part 40, FAA Order 9790.1, DHHS Mandatory Guidelines |
| Questions | 30 (6 sections, 5 critical items) |
| Verdict engine | COMPLIANT / DEVELOPING / NON-COMPLIANT |
| Critical overrides | MRO, DER, post-accident testing, random rate, supervisor training |
| Outputs | Gap table with per-gap corrective actions, MR narrative, JSON export |
| External dependencies | None |
| M-AI integration | ARCHITECTURE DEFINED (domain: faa-part120-drug-alcohol) |

---

## Commercial Case

- **Pricing:** $149–$249 one-time; $199/yr subscription option
- **Revenue path:** ~$250k/yr (1,000+ Part 145 repair stations in US; 300+ Part 121/135 operators)
- **Bundle:** Pairs naturally with FAA Part 145 SMS Readiness Tool and FAA Part 145 Evidence-Readiness Tool for a "Part 145 Compliance Suite"
- **Startup cost:** <$50 (no infra; content-only product)
- **First-mover:** Yes — no equivalent DOT/FAA D&A self-assessment tool in the market

---

## FSA Gate Decision

**PASS** — Tool is deterministic rule-engine (not manual-entry calculator). 30-question structured input → weighted verdict with critical overrides → actionable gap output with regulatory citations. Meets FSA intent: governed decisions, authority-backed, evidence-driven output. No manual data entry without downstream computation.
