# M-AI Product Integration Profile — Internal Auditor Competency Assessment Tool

**Profile Version:** 1.0 | **Date:** 2026-09-05 | **Status:** ARCHITECTURE DEFINED

## Domain Registration

| Field | Value |
|-------|-------|
| Domain ID | `internal-auditor-competency` |
| Assessment type | competency-self-assessment |
| Standards | ISO 9001, AS9100D, AS9110C, ISO 13485, IATF 16949, ISO 14001 |

## DIM Slots (Reserved)

| Slot | Purpose |
|------|---------|
| `technical-knowledge` | Standard/clause understanding depth |
| `audit-methodology` | Planning, sampling, evidence gathering proficiency |
| `nc-writing` | Finding structure, evidence citation, report quality |
| `communication` | Interview skills, meeting management, composure |
| `process-risk` | Process approach, effectiveness vs conformance |
| `independence-ethics` | Impartiality, confidentiality, CPD maintenance |

## Kernel Interface

`window.__MAI_KERNEL_RESERVED` with `connect(kernel)`. When connected: domain weights can be tuned per standard (e.g., AS9110C weights AS9110-specific items higher), cross-tool correlation to AQ course catalogue for CPD recommendations, and competency gap → course recommendation linkage.
