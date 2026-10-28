# M-AI Product Integration Profile — FAA Part 120 Drug & Alcohol Compliance Tool

**Profile Version:** 1.0
**Date:** 2026-09-05
**Governed by:** MAI-ARCH-001 Rev C
**Integration Status:** ARCHITECTURE DEFINED

---

## Domain Registration

| Field | Value |
|-------|-------|
| Domain ID | `faa-part120-drug-alcohol` |
| Assessment type | regulatory-compliance |
| Authority | FAA / DOT |
| Regulations | 14 CFR Part 120, 49 CFR Part 40 |

---

## DIM Slots (Reserved)

| Slot | Purpose |
|------|---------|
| `program-admin` | MRO/DER designation completeness, policy coverage |
| `testing-requirements` | Pre-employment, post-accident, reasonable suspicion, RTD completeness |
| `random-testing` | Pool integrity, rate adequacy, selection method validity |
| `laboratory` | NLCP certification, CCF chain of custody, EBT device currency |
| `training` | Employee education completion, supervisor 60+60 min training status |
| `records` | Retention schedule compliance, MIS filing, DAMIS registration |

---

## M-AI Kernel Interface

The tool exposes `window.__MAI_KERNEL_RESERVED` with `connect(kernel)` method. When the M-AI Kernel connects, it may:
- Read `domainId`, `assessmentType`, `criticalItems` to configure domain-specific scoring weights
- Inject real-time regulatory currency checks (e.g., current DOT random testing rate changes)
- Enable cross-tool correlation (e.g., link Part 120 gaps to Part 145 Evidence-Readiness findings)

No Kernel fork. Single canonical Kernel adapter pattern per MAI-ARCH-001.
