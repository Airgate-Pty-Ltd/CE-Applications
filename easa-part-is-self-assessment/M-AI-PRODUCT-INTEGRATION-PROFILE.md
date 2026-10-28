# M-AI Product Integration Profile — EASA Part-IS Self-Assessment Tool

**Product:** easa-part-is-self-assessment  
**Version:** 1.0.0  
**Date:** 2026-09-03  
**M-AI Status:** ARCHITECTURE_DEFINED

---

## Domain

`easa-part-is-readiness`

## DIMs (Domain Intelligence Modules)

| DIM ID | Name | Governs |
|--------|------|---------|
| is-governance-policy | IS Governance & Policy | ISMS scope, IS Policy, accountable manager, IS objectives |
| is-risk-assessment | IS Risk Assessment | Risk identification, aviation-specific threats, treatment plan |
| is-security-controls | IS Security Controls | Access control, supply chain IS, patch management, BC/DR |
| is-competence-awareness | Competence & Awareness | IS training, competence records, communication |
| is-monitoring-incident | Monitoring & Incident | Audit, monitoring, NAA incident reporting, management review |

## Authority Charter

`EASA-Part-IS-2022-1645`  
Regulation (EU) 2022/1645 — Part IS implementing rule  
Regulation (EU) 2023/203 — cybersecurity ATM/ANS

## Reserved Interface

```html
<div id="mai-kernel-interface"
  data-product="easa-part-is-self-assessment"
  data-domain="easa-part-is-readiness"
  data-version="1.0.0"
  data-dims='["is-governance-policy","is-risk-assessment","is-security-controls","is-competence-awareness","is-monitoring-incident"]'
  data-authority-charter="EASA-Part-IS-2022-1645"
  data-mai-status="ARCHITECTURE_DEFINED">
</div>
```

## Integration Gate Decision

**ARCHITECTURE DEFINED** — Reserved interface present in HTML. Full kernel integration deferred pending M-AI production deployment. No blocking issue.
