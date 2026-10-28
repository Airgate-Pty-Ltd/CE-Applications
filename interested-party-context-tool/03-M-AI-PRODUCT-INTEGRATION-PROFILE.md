# M-AI Product Integration Profile — Interested Party & Context Analysis Tool
**Date:** 2026-08-23
**Integration Gate Decision:** ARCHITECTURE DEFINED — Kernel wiring pending platform host

## Domain ID
`domain:interested-party-context`

## Governed Decisions (local, Kernel-shaped)
| Decision | Signal | Basis |
|----------|--------|-------|
| Register completeness | HOLD/PROCEED | Required party types present? |
| Monitoring gap | ADVISE | HIGH relevance party without monitoring method |
| Context completeness | HOLD | 0 external or 0 internal issues = incomplete |
| Overall verdict | PROCEED/HOLD/BLOCK | Combination of above |

## Kernel Dependency
`@mai/kernel` runtime: **RESERVED INTERFACE** — static offline HTML. `window.__MAI_RESERVED` marker present in artifact.

## M-AI Role
Completeness gate is the primary governed decision. On platform promotion: becomes HOLD-class decision requiring management sign-off before QMS record submission.
