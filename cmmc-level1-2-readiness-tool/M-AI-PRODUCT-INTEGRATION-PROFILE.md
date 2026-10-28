# M-AI PRODUCT INTEGRATION PROFILE
## CMMC 2.0 Level 1 Readiness Self-Assessment
**Build slug:** 2026-09-21-cmmc-level1-2-readiness-tool
**Profile written:** 2026-09-21 (auto-authoring mode)
**Gate Decision:** ARCHITECTURE DEFINED — RESERVED KERNEL INTERFACE
**M-AI Kernel integration status:** Reserved — static HTML tool; Kernel integration path defined but not yet implemented

---

## Gate Determination

This build is a **qualifying software product** — a self-contained scored assessment tool intended for repeated commercial use across 300,000+ organizations in the defense supply chain. The M-AI Kernel integration gate applies.

**Gate outcome: ARCHITECTURE DEFINED (RESERVED INTERFACE)**

Rationale: Static client-side HTML. No server-side runtime for live Kernel observation streams. Current build:
1. Signals M-AI status in UI ("ARCHITECTURE DEFINED — domain: cmmc-level1-readiness | Reserved Kernel Interface")
2. Exports structured JSON with M-AI metadata on each assessment
3. Reserves the integration interface — no private rules engine or LLM-only layer substituted
4. Does NOT copy, fork, or modify the M-AI Kernel Core

---

## Domain

**Domain identifier:** `cmmc-level1-readiness`

**Domain description:** Readiness self-assessment for CMMC 2.0 Level 1 (17 practices across 6 domains: AC, IA, MP, PE, SC, SI) aligned to NIST SP 800-171 Rev 2 and FAR 52.204-21. Used by DoD contractors and subtier suppliers preparing for DFARS 252.204-7019 annual self-assessment and SPRS score submission.

---

## Proposed DIMs (Domain Intelligence Modules)

| DIM ID | Name | Governed Decision | Evidence Signal |
|--------|------|-------------------|-----------------|
| DIM-AC-01 | Access Control Implementation | Is system access limited to authorized users and functions? | Q_ac1 + Q_ac2 responses; access control list or IAM policy reference |
| DIM-IA-01 | Authentication Enforcement | Is multi-factor or strong authentication enforced before system access? | Q_ia2 response (critical); authentication policy reference |
| DIM-MP-01 | Media Sanitization Practice | Is media sanitized before disposal or reuse? | Q_mp1 response; sanitization log reference |
| DIM-PE-01 | Physical Access Control | Is physical access to FCI/CUI systems restricted and logged? | Q_pe1 + Q_pe3 responses; access log reference |
| DIM-SC-01 | Boundary Protection | Is a firewall or equivalent perimeter control in place? | Q_sc1 response; network diagram reference |
| DIM-SI-01 | Malware Protection Currency | Is endpoint protection installed and signatures current? | Q_si2 (critical) + Q_si3 responses; AV management console reference |
| DIM-SI-02 | Vulnerability Management | Is patch management active with defined remediation timelines? | Q_si1 response; vulnerability tracker reference |
| DIM-SI-03 | Unauthorized Use Detection | Is unauthorized system use detected and investigated? | Q_si6 response; audit log / SIEM reference |

---

## Authority Charter (Proposed)

```
AUTHORITY: cmmc-level1-readiness
VERSION: 1.0 (proposed — not yet implemented)
SCOPE: CMMC 2.0 Level 1 readiness self-assessment (17 practices, NIST SP 800-171 Rev 2)
GOVERNED DECISIONS:
  - Access control implementation completeness
  - Authentication enforcement
  - Media sanitization practice existence
  - Physical access control and logging
  - Boundary protection implementation
  - Malware protection installation and currency
  - Vulnerability management process existence
  - Unauthorized use detection capability
AUTHORITY LIMITS:
  - Does NOT produce an official SPRS score — SPRS filing is the organization's responsibility
  - Does NOT certify CMMC Level 1 — certification requires government-approved documentation
  - Does NOT assess Level 2 (110 practices) — separate future build
  - Does NOT substitute for a C3PAO assessment at Level 2/3
ESCALATION TRIGGER: Any critical item (AC.L1-3.1.1, IA.L1-3.5.2, SI.L1-3.14.2) scored NO → surface as CMMC LEVEL 1 NOT READY regardless of overall score
HUMAN AUTHORITY: Organization management + IT leadership own all SPRS submissions and CMMC compliance commitments
```

---

## JSON Handoff Structure

The `exportJSON()` function produces:
```json
{
  "tool": "Conform-Edge CMMC 2.0 Level 1 Readiness Self-Assessment v1.0",
  "standard": "NIST SP 800-171 Rev 2",
  "cmmcLevel": "Level 1",
  "mAiSignal": "ARCHITECTURE_DEFINED",
  "domain": "cmmc-level1-readiness",
  "kernelDependency": "RESERVED_INTERFACE",
  "answers": {
    "q_ac1": { "pid": "AC.L1-3.1.1", "critical": true, "domain": "AC", "value": "yes|partial|no" }
  }
}
```
This is the input contract for the future Kernel adapter for domain `cmmc-level1-readiness`.

---

## Acceptance Tests (Reserved — for implementation phase)
AT-01: Domain identifier resolves to `cmmc-level1-readiness` in Kernel registry
AT-02: JSON export includes mAiSignal: ARCHITECTURE_DEFINED and kernelDependency: RESERVED_INTERFACE
AT-03: All 3 critical items (AC.L1-3.1.1, IA.L1-3.5.2, SI.L1-3.14.2) trigger NOT READY verdict on NO answer regardless of overall %
AT-04: Scoring is deterministic — same inputs = same output, always
AT-05: No Kernel Core files modified or forked; no private rules engine
AT-06: Domain authority limits enforced — no SPRS score calculation; no Level 2 assessment (preview text only)
