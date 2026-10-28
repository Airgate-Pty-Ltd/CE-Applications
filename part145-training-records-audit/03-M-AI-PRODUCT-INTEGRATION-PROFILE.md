# M-AI Product Integration Profile
## Part 145 Training Records Compliance Audit Tool

**Gate decision:** ARCHITECTURE DEFINED (RESERVED INTERFACE)  
**Date:** 2026-08-18

---

## Reserved Interface

```javascript
window.PART145TR_MAI_INTERFACE = {
  version: '1.0',
  domain: 'part145-training-records',
  getAnswers: function() { return answers; },
  getTechs: function() { return techs; },
  lastResults: null
};
```

## Domain Pack: `part145-training-records`

| DIM | Name | Level | Trigger | Output |
|-----|------|-------|---------|--------|
| DIM-TR-01 | InitialBeforeAssignment | ADVISE | Req. 3 scored 0 | Flags as highest-risk §145.163 finding pattern; initial training post-assignment is a regulatory violation, not a documentation gap |
| DIM-TR-02 | RecurrentOverdue | OBSERVE | Req. 5 scored 0 or 1 | Notes recurrent tracking gap; suggests immediate due-date audit across all technicians |
| DIM-TR-03 | TechnicianGapConcentration | OBSERVE | ≥3 technicians with <75% record completion | Notes systemic records gap vs. individual gap; suggests program-level corrective action over individual remediation |
| DIM-TR-04 | RetentionRisk | ADVISE | Req. 10 scored 0 | Flags 2-year retention as an inspection-trigger requirement; records destruction constitutes evidence of non-compliance |

All decisions OBSERVE or ADVISE only. No ENFORCE. No Kernel fork.
