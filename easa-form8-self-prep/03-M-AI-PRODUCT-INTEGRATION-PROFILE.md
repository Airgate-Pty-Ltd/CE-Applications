# M-AI Product Integration Profile
## EASA Form 8 Self-Prep Assessment Tool

**Product:** EASA Form 8 Self-Prep Assessment  
**Build folder:** `2026-08-18-easa-form8-self-prep`  
**Gate decision:** ARCHITECTURE DEFINED (RESERVED INTERFACE)  
**Date:** 2026-08-18

---

## Integration Authorization

**Stage:** ARCHITECTURE DEFINED — Reserved interface established. No Kernel fork. Kernel injection path preserved via `window.FORM8_MAI_INTERFACE`.

---

## Domain Pack

**Domain identifier:** `easa-form8-readiness`  
**Authority:** MAG CHG 10; EASA Part-145; US-EU BASA  
**Decision scope:** EASA bilateral oversight readiness pattern recognition

---

## Reserved Interface

```javascript
window.FORM8_MAI_INTERFACE = {
  version: '1.0',
  domain: 'easa-form8-readiness',
  getAnswers: function() { return answers; },
  lastResults: null   // populated after showResults()
};
```

---

## Governed Decisions (Domain Pack Design)

| DIM ID | Name | Level | Trigger | Output |
|--------|------|-------|---------|--------|
| DIM-F8-01 | SMSNewRequirement | ADVISE | Section 16 (SMS) scored 0 | Flags as new MAG CHG 10 requirement; highest-risk oversight finding for 2025-2026 visit cycle |
| DIM-F8-02 | SupplementCurrencyBlock | ADVISE | Section 2 (Supplement) scored 0 | Flags that all other findings are dependent on Supplement update; suggests sequencing Supplement revision first |
| DIM-F8-03 | CertifyingStaffConcentration | OBSERVE | Section 4 scored 0 with Sections 13 and 8 also < 2 | Pattern: release-authority triad gap; notes correlated risk |
| DIM-F8-04 | ContractorAuditOverdue | OBSERVE | Section 7 scored 0 | Flags specific MAG CHG 10 annual audit requirement; notes 12-month trigger |

---

## Non-Negotiable Constraints

1. No private rules engine. All governed logic routes through canonical Kernel when injected.
2. No Kernel fork. `easa-form8-readiness` is a domain pack only.
3. Interface contract must not be renamed without version bump.
4. All DIM outputs advisory only — no automated regulatory determination.
5. Kernel injection must not alter deterministic scoring engine.
