# M-AI PRODUCT INTEGRATION PROFILE
## ITAR/EAR Export Control Compliance Self-Assessment
**Build slug:** 2026-09-21-itar-ear-export-control-tool
**Profile written:** 2026-09-21 (auto-authoring mode)
**Gate Decision:** ARCHITECTURE DEFINED — RESERVED KERNEL INTERFACE
**M-AI Kernel integration status:** Reserved — static HTML tool; Kernel integration path defined but not yet implemented

---

## Gate Determination

This build is a **qualifying software product** — a self-contained scored assessment tool intended for repeated commercial use across many organizations in the defense supply chain. The M-AI Kernel integration gate applies.

**Gate outcome: ARCHITECTURE DEFINED (RESERVED INTERFACE)**

Rationale: The current build is a deterministic, client-side HTML tool with no server-side runtime. Full Kernel integration (observation streams, governed decision logging, replay, learning feedback) requires a hosted application context. The current architecture:
1. Signals M-AI status correctly in UI ("ARCHITECTURE DEFINED — domain: itar-ear-export-control | Reserved Kernel Interface")
2. Exports structured JSON with M-AI metadata on each assessment
3. Reserves the integration interface — no private rules engine or LLM-only layer substituted
4. Does NOT copy, fork, or modify the M-AI Kernel Core

For production Kernel integration, the JSON export structure is the handoff point. When the hosted platform is ready, the Kernel adapter for `itar-ear-export-control` will consume assessment JSON as structured input events.

---

## Domain

**Domain identifier:** `itar-ear-export-control`

**Domain description:** Compliance gap assessment for organizations subject to International Traffic in Arms Regulations (ITAR, 22 CFR Parts 120–130) and/or Export Administration Regulations (EAR, 15 CFR Parts 730–774). Covers jurisdiction determination, registration/authorization, empowered official and compliance program, deemed export controls, and records/enforcement.

---

## Proposed DIMs (Domain Intelligence Modules)

When this product integrates with the canonical M-AI Kernel, the following DIMs are proposed:

| DIM ID | Name | Governed Decision | Evidence Signal |
|--------|------|-------------------|-----------------|
| DIM-ITAR-01 | Jurisdiction Determination Completeness | Has the organization performed a formal jurisdiction determination for its products? | Q1 response + notes; supporting documentation reference |
| DIM-ITAR-02 | DDTC Registration Status | Is ITAR registration current and in scope? | Q5 response; DDTC registration expiry tracking |
| DIM-ITAR-03 | License Pre-Authorization | Are export licenses obtained before export events? | Q6 response + Q7 (license type awareness) |
| DIM-EAR-01 | ECCN Classification Currency | Are EAR-controlled items correctly classified with current ECCNs? | Q8 response + commodity jurisdiction history |
| DIM-EMCP-01 | EMCP/TCP Program Implementation | Is an Empowered Official designated and Compliance Program documented? | Q9 response + program documentation reference |
| DIM-EMCP-02 | Training Program Currency | Is export control training provided and current? | Q11 response + training records |
| DIM-DE-01 | Deemed Export Risk Assessment | Has the organization assessed deemed export risk for foreign national employees/visitors? | Q13 response + nationality screening evidence |
| DIM-REC-01 | Record Retention Compliance | Are export records retained for the required period (5 years EAR/ITAR)? | Q15 response + records management system evidence |
| DIM-ENF-01 | Voluntary Disclosure Readiness | Does the organization have a process to identify and voluntarily disclose apparent violations? | Q17 response + voluntary disclosure procedure reference |

---

## Authority Charter (Proposed)

```
AUTHORITY: itar-ear-export-control
VERSION: 1.0 (proposed — not yet implemented)
SCOPE: Internal export control readiness assessment for ITAR/EAR-regulated organizations
GOVERNED DECISIONS:
  - Jurisdiction determination completeness
  - DDTC registration currency
  - License pre-authorization evidence
  - EMCP/TCP program existence
  - Deemed export risk assessment
  - Record retention adequacy
  - Voluntary disclosure process existence
AUTHORITY LIMITS:
  - Does NOT determine compliance — determinations made by qualified export control counsel
  - Does NOT substitute for DDTC or BIS audit or enforcement review
  - Does NOT classify defense articles or items on the CCL — classification is an organization responsibility
  - Does NOT assess transaction-specific license requirements
ESCALATION TRIGGER: Any critical item scored NO → surface as COMPLIANCE ACTION REQUIRED regardless of overall percentage
HUMAN AUTHORITY: Organization management + export control counsel own all compliance determinations and disclosures
```

---

## Acceptance Tests (Reserved — for implementation phase)

AT-01: Domain identifier resolves to `itar-ear-export-control` in Kernel registry
AT-02: Assessment JSON exports M-AI metadata block with domain, kernelDependency: RESERVED_INTERFACE
AT-03: Critical fail logic triggers COMPLIANCE ACTION REQUIRED verdict regardless of overall score
AT-04: No LLM layer, no private rules engine — all verdicts deterministic from answer inputs
AT-05: No Kernel Core files modified or forked
AT-06: DIM boundary respected — tool does NOT classify specific defense articles or make transaction-specific license determinations

---

## JSON Handoff Structure

The current `exportJSON()` function produces the following M-AI-relevant fields:
```json
{
  "mAiSignal": "ARCHITECTURE_DEFINED",
  "domain": "itar-ear-export-control",
  "kernelDependency": "RESERVED_INTERFACE",
  "regime": "...",
  "answers": {
    "q_jd1": { "value": "yes|partial|no|na", "critical": true|false, "domain": "Jurisdiction Determination", ... }
  }
}
```
This structure is the input contract for the future Kernel adapter.
