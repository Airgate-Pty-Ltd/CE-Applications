# Discovery Record — IATF 16949 LPA Builder

**Date:** 2026-09-09
**Status:** BUILD AUTHORIZED
**Brand:** Conform-Edge (software)
**Opportunity Source:** Ledger gap scan — IATF portfolio has Core Tools Suite, Planned Change Gate, but no LPA execution tool; CSR mandates LPAs

## Product Definition

**Product:** IATF 16949 Layered Process Audit Builder v1.0
**File:** iatf-lpa-builder.html (self-contained, 0 external deps)
**Clause:** IATF 16949:2016 Cl. 10.2.3 + applicable CSR (GM/Ford/Stellantis/BMW/VW/Toyota)

## Architecture

- 6 default processes (configurable); add/remove rows
- L1 (Operator/Supervisor): 10 questions per process — daily/shift frequency
- L2 (Quality/Engineering): 10 questions per process — weekly frequency
- L3 (Management): 8 questions per process — monthly frequency
- Total with 6 default processes: 168 questions
- 14 critical items that trigger ESCALATE outcome regardless of overall score
- 3 outcomes: COMPLIANT / NEEDS-CORRECTIVE-ACTION / ESCALATE
- CSR selector: GM, Ford, Stellantis, BMW, VW, Toyota, General IATF
- Narrative generates a signed audit record ready for QMS file

## Market & Revenue

- Target: IATF 16949 certified automotive Tier 1/2 suppliers; CSR-mandated LPA programs
- Price: $149–$199 one-time; bundle with IATF Core Tools Suite at $299–$399
- Revenue path: ~$250k/yr path; LPA is a high-frequency use case (weekly/monthly runs)

## Governance

- FSA Gate: PASS — process audit tool with checklist inputs; not a manual calculation tool
- M-AI Integration: ARCHITECTURE DEFINED (domain: iatf-lpa-builder); interface reserved
- Build Governor: PROCEED
