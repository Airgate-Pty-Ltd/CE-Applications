# M-AI Product Integration Profile
## IATF 16949 Planned Change Gate Tool

**Date:** 2026-09-07
**Build ID:** 2026-09-07-iatf16949-planned-change-gate
**M-AI Gate Decision:** ARCHITECTURE DEFINED

---

## Integration Classification

**Product type:** Deterministic gate tool (rule-based, no LLM inference)
**M-AI integration level:** Reserved interface (Phase 2 ready)
**Current phase:** Phase 1 — standalone HTML with M-AI JSON handoff hook

## Reserved Interface

The tool exports a JSON record with `maiInterface` object:
```json
{
  "maiInterface": {
    "domain": "iatf-planned-change",
    "reserved": true
  }
}
```

## Phase 2 M-AI DIMs (defined, not implemented)

| DIM | Purpose |
|-----|---------|
| `iatf-change-classifier` | Classify change type from free-text description |
| `ppap-level-recommender` | Recommend PPAP level based on change type + customer |
| `csr-lookup` | Retrieve applicable CSR requirements by OEM |
| `change-completeness-assessor` | Assess evidence completeness before PPAP submission |

## Notes

Current tool is fully deterministic (no M-AI calls). M-AI integration adds value in:
1. Natural language change description → structured classification
2. Customer-specific PPAP level lookup (GM, Ford, Stellantis, VW, BMW, Toyota CSRs)
3. Completeness scoring on uploaded PPAP documentation packages
