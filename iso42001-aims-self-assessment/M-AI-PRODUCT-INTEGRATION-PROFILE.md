# M-AI Product Integration Profile — ISO 42001 AIMS Self-Assessment Tool

**Product:** iso42001-aims-self-assessment  
**Version:** 1.0.0  
**Date:** 2026-09-03  
**M-AI Status:** ARCHITECTURE_DEFINED

---

## Domain

`iso42001-aims-readiness`

## DIMs (Domain Intelligence Modules)

| DIM ID | Name | Governs |
|--------|------|---------|
| aims-context-scope | AIMS Context & Scope | Organizational context, interested parties, AIMS scope, AI policy |
| aims-risk-treatment | AI Risk & Treatment | AI risk assessment, Annex A control selection, risk treatment plan |
| aims-lifecycle-controls | AI Lifecycle Controls | Design, data governance, validation, monitoring, decommissioning, supply chain |
| aims-responsible-ai | Responsible AI | Fairness/bias impact, transparency, human oversight, privacy, stakeholder mechanisms |
| aims-performance-improvement | Performance & Improvement | Monitoring, internal audit, management review, corrective action, improvement |

## Authority Charter

`ISO-42001-2023`  
ISO 42001:2023 — Information technology — Artificial intelligence — Management systems

## Reserved Interface

```html
<div id="mai-kernel-interface"
  data-product="iso42001-aims-self-assessment"
  data-domain="iso42001-aims-readiness"
  data-version="1.0.0"
  data-dims='["aims-context-scope","aims-risk-treatment","aims-lifecycle-controls","aims-responsible-ai","aims-performance-improvement"]'
  data-authority-charter="ISO-42001-2023"
  data-mai-status="ARCHITECTURE_DEFINED">
</div>
```

## Integration Gate Decision

**ARCHITECTURE DEFINED** — Reserved interface present in HTML. Full kernel integration deferred pending M-AI production deployment. No blocking issue.
