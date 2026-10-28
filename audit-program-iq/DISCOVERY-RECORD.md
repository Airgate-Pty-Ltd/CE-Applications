# Discovery Record — AuditProgramIQ

**Date:** 2026-09-07
**Build ID:** 2026-09-07-audit-program-iq
**Brand:** Conform-Edge
**Scan run:** opportunity-scanner-overnight 2026-09-07
**Gate decision:** BUILD AUTHORIZED

---

## Product Definition

**Name:** AuditProgramIQ — Internal Audit Program Builder
**Type:** Self-contained HTML tool (0 external dependencies)
**Target user:** QMS coordinators, quality managers, internal lead auditors, consultants building audit programs for clients
**Market:** Any ISO 9001 / AS9100D / IATF 16949 / ISO 13485 certified or seeking organization needing a risk-based internal audit program per Cl. 9.2

**Problem solved:** Internal audit programs must be risk-based, cover all processes, assign resources, and document independence per ISO 9001 Cl. 9.2 / AS9100D / IATF 16949 / ISO 13485. Most organizations use ad-hoc spreadsheets, miss processes, don't calculate auditor day requirements, and lack a documented program narrative. CB auditors routinely find Cl. 9.2 nonconformities around incomplete program scope, no risk basis, and missing coverage evidence. No guided tool for this exists in the market.

**Proposed in ledger:** 2026-06-26 (twice — "AuditProgramIQ" and "AuditProgramIQ HTML Tool"). Never built until now.

---

## Commercial Case

**Pricing:** $199–$399 one-time | Consultant bundle: 5-license site pack $999
**Revenue path:** $280k+/yr — 1,400+ units/yr; CB auditors, quality consultants, QMS coordinators globally
**Startup cost:** $0 (HTML tool, no infrastructure)
**Bundle fit:** Pairs with AS9100D / IATF / ISO 13485 self-assessment tools; natural upsell from any Conform-Edge assessment tool ("now build your audit program")

---

## Scope

- 3-tab workflow: Organization Setup → Process Inventory → Audit Program
- 7-standard selector (ISO 9001, AS9100D, AS9110C, AS9120B, IATF 16949, ISO 13485, ISO 14001)
- Pre-loaded default process lists for ISO 9001, AS9100D, IATF 16949, ISO 13485
- Risk rating 1–5 per process; prior-NC flag bumps frequency
- Configurable frequency rules (high/medium/low risk → months between audits)
- 12-month visual calendar grid (color-coded by risk)
- Audit schedule table with auditor assignments, day estimates, clause references
- Resource adequacy check (required days vs. available days)
- Cl. 9.2-compliant audit program narrative auto-generated
- JSON export + CSV export
- M-AI reserved interface (domain: internal-audit-program)

---

## Verification

Build verified 2026-09-07:
- File: `audit-program-iq.html` — 32,163 bytes
- Engine checks: 12/12 PASS
- 3-tab structure | 7-standard selector | 4 pre-loaded process sets | risk-frequency engine | calendar | generateProgram | CSV export | JSON/M-AI | resource gap detection | independence requirement | 0 external deps
