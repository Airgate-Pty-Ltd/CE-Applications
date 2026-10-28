# Supplier FAIR Submission Review Tool — Product Brief

**Brand:** Conform-Edge Quality Consulting LLC
**Version:** 1.0 prototype
**Status:** Pre-production prototype — pending Brian review and launch blockers (see NEEDS-FROM-BRIAN.md)
**Standard:** AS9102B First Article Inspection Requirements

---

## What It Is
A self-contained HTML tool for OEM quality engineers and supplier quality engineers to review incoming First Article Inspection Report (FAIR) packages against AS9102B requirements before issuing a FAIR acceptance determination.

## Problem
When a supplier submits a FAIR package, the receiving OEM must review it against AS9102B. Most organisations do this ad hoc — from memory, a checklist someone printed 3 years ago, or nothing at all. CB auditors sample FAIR acceptance records; incomplete reviews and undocumented acceptances are a top-5 AS9100D Clause 8.4 finding. No low-cost structured tool exists for this specific role.

## Who Uses It
- Supplier Quality Engineers reviewing incoming FAIRs from Tier 2/3 suppliers
- Quality Engineers at OEM/Tier 1 prime receiving FAIRs on first article parts
- DER representatives reviewing supplier FAIR submissions
- Procurement/sourcing teams with a supplier quality function

## What It Does
1. Reviewer selects FAIR type (Full / Partial / Delta) and enters part/supplier details
2. Walks through 25 questions across AS9102B Forms 1-5 plus supplier status checks
3. 7 critical items — any critical fail triggers immediate FAIR REJECTED verdict
4. 3-tier verdict: FAIR ACCEPTABLE / FAIR CONDITIONAL / FAIR REJECTED
5. Gap table lists every failed or partial item with section attribution
6. FAIR Review Record narrative (ready to paste into QMS or email to supplier)
7. JSON export for QMS system integration

## Differentiators
- OEM-side only — distinct from supplier readiness tools; this is the receiving review
- Critical-item override logic matches how CB auditors assess completeness failures
- 100% characteristic accountability check (Form 4) built into the decision engine
- Delta FAI mode shows change-scope-specific guidance
- Produces a documentable, auditable review record — not just a checklist

## Price Point
$149–$199 one-time (individual) | $499 site license
Bundle candidate: AS9102B Full Suite (FAI Submission Review + FAI Self-Scoring Toolkit) $249
