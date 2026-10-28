# M-AI Product Integration Profile — ISO 9001:2026 Transition Readiness Assessor
**Date:** 2026-08-23 (retroactive governance)
**Product Version:** 1.0 (static HTML, no versioning in artifact)
**Integration Gate Decision:** ARCHITECTURE DEFINED — Kernel wiring pending platform host

---

## Purpose Statement
M-AI purpose: observe evidence of QMS transition readiness; issue governed readiness verdicts (READY / CONDITIONAL / NOT READY) with gap-specific evidence obligations; advise on improvement priority order.

## Domain ID
`domain:iso9001-2026-transition-readiness`

## Entity Registry (domain pack — not Kernel Core)
- `transition-assessment` (session entity)
- `clause-gap` (event: per question answered with gap)
- `readiness-verdict` (outcome: READY / CONDITIONAL / NOT READY)
- `critical-gap` (event: critical item answered as gap)

## Governed Decisions (local, Kernel-shaped)
| Decision | Kernel Signal | Basis |
|----------|--------------|-------|
| Overall verdict | PROCEED / HOLD / BLOCK | Weighted score + critical override |
| Per-clause gap severity | ADVISE | Gap depth vs. clause criticality |
| Priority remediation order | ADVISE | Score gap magnitude |

## Kernel Dependency Status
- Runtime `@mai/kernel` import: **RESERVED INTERFACE** — static HTML tool runs offline; Kernel wiring pending platform host
- Local governed logic: present (deterministic scoring + critical override engine)
- Domain pack: designed; not yet formally registered in Kernel-MASTER

## M-AI Role in this Product
Kernel-shaped domain pack embedded locally. All decisions are deterministic (rules-only). No LLM. No network. On promotion to the platform, the domain pack migrates to a `@mai/kernel` adapter.

## Prohibited
- No Kernel Core copy or fork
- No LLM-only assessment substituted for governed rules
- No self-expanding authority

## Implementation Surface
`window.__MAI_RESERVED` interface marker to be added on next artifact revision (currently absent — minor gap; add before platform promotion).

## Risks
1. Scoring thresholds not formally documented in artifact — NEEDS-FROM-BRIAN
2. Questions may need revision when ISO 9001:2026 final text publishes (Sept 2026)
