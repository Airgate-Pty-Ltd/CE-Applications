# Build Spec — AS13100A Aero-Engine Supplier Readiness Tool
**Stage:** 4 — Build Specification  
**Date:** 2026-08-16 (retroactive governance pass; build pre-exists)  
**Governor authorization:** PROCEED (retroactive; artifact matches spec)  

---

## What This Spec Authorizes

This retroactive Build Spec documents the authorized MVP boundary for the existing artifact (`as13100a-aero-engine-supplier-readiness.html`). The build is complete; this spec confirms the artifact is within scope.

---

## Authorized MVP

| Element | Specification | Actual |
|---------|--------------|--------|
| Assessment families | 8 AS13100A requirement families | 8 ✓ |
| Assessment elements | 52 total | 52 ✓ |
| Weights | Major=3, Significant=2, OFI=1 | ✓ |
| Input options | IMPLEMENTED / PARTIAL / NOT_IMPLEMENTED / N/A per element | ✓ |
| Family verdict | COMPLIANT / CONDITIONAL / NON-COMPLIANT per family | ✓ |
| Overall verdict | Aggregate | ✓ |
| N/A exclusion | Excluded from denominator | ✓ |
| OEM context notes | GE/RR/PW/Safran/Honeywell per family | ✓ |
| JSON export | Full findings export | ✓ |
| Design system | VERA navy/steel | ✓ |
| Delivery | Single self-contained HTML file | ✓ |
| External dependencies | None | ✓ (0 external refs) |

## Out of Scope (not in this build)

- M-AI Kernel runtime integration (RESERVED INTERFACE)
- Cloud hosting or user accounts
- OEM-variant modules (GE-specific vs. RR-specific scoring overlays)
- Standards disclaimer in footer (LAUNCH BLOCKER LB-1 — must be added before publishing)
- Team collaboration / multi-user assessment

## Pre-Launch Required (before calling RELEASE-AUTHORIZED)

| Item | Action required |
|------|----------------|
| Add disclaimer footer | Brian to confirm language; Claude to add to HTML |
| Verify AS13100A standard currency | Brian to confirm |
| Confirm threshold values | Brian to validate 85%/60% per audit experience |
| Pricing decision | Brian to decide |

---

## Governor Authorization

```
BUILD AUTHORIZED (retroactive, as Brian — auto-authoring mode)
Stage: 4 complete
Proceed to: Stage 5 (Build Report)
```
