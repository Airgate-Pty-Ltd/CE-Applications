# Build Notes — management-review-autopilot

## What was built
- **Product folder:** 00–09 numbered docs (exec summary, validation w/ Breakthrough
  Screen 10/10 + scoring table, product brief, buyer/pricing, MVP scope, premium roadmap,
  compliance alignment, implementation instructions, risks, next-build backlog).
- **Working app** `artifact/app/`: src/index.html (SPA: 4 standard packs, guided input
  board, deterministic coverage engine, action register, full package generation with
  Objective→Record-of-Review architecture, md export/print), src/styles.css (AQ
  navy/steel palette), server.js (zero-dependency Node static server + /health),
  package.json (start/dev/test), .env.example, railway.json, tests/smoke-test.md.
- **Deployment package:** UI-TEST-PLAN.md, RAILWAY-DEPLOYMENT.md, GITHUB-READY.md,
  DESIGN-NOTES.md (FSA), this file, NEEDS-FROM-BRIAN.md.
- **Samples:** artifact/sample-output.md (generated customer package), artifact/customer-facing-copy.md (landing page copy).
- **Verification:** server booted in sandbox; /health returned 200 JSON; / served the app (see run log line in report).

## Why this pick
Highest combined score (38/40 + FSA net +3) of 5 candidates. Universal recurring buyer
pain (every certificate holder, every cycle), zero overlap with all 41 ledger entries,
priority category in the scan mandate, fully deterministic (no content-feed curation like
the Regulatory Change Analyzer), and demonstrable today. Detail: 01-Opportunity-Validation.md.

## FSA gate summary
0 failed / 1 flagged (manual data entry as primary MVP input; remediation on roadmap:
CSV upload v1.2, Conform-Edge cross-product feed v2.0). See DESIGN-NOTES.md.

## M-AI kernel deferral (explicit, per mai-kernel-integration)
Full kernel integration deferred — resource ceiling + MVP scope. What shipped is the
deterministic skeleton only: rules-only evaluation, reproducible verdicts, advisory-only
outputs, human authority preserved, no ad-hoc LLM calls anywhere. v2.0 migrates the
inline engine to kernel DIMs (input-completeness, action-aging, repeat-gap) with an
Authority Charter and append-only ledger. No assessment feature bypasses kernel design laws.

## Key assumptions
1. [ASSUMPTION] Market size / CB-finding frequency from training knowledge; not re-verified online this unattended run.
2. [ASSUMPTION] Clause decompositions from management-review-intelligence + auditor skills are current at 2026-07; Brian spot-check requested.
3. [ASSUMPTION] $79/mo clears QM card-swipe threshold without procurement.
4. [ASSUMPTION] Browser-local data is acceptable (and marketable) for MVP.
5. [ASSUMPTION] Node ≥18 on Railway Nixpacks default.

## To go live — YOU do these
- [ ] Copy artifact/app out of OneDrive; run npm start; complete tests/smoke-test.md (15 rows)
- [ ] Create private GitHub repo + push (GITHUB-READY.md)
- [ ] Deploy on Railway + generate domain (RAILWAY-DEPLOYMENT.md)
- [ ] Spot-check the 4 standard packs against controlled standard copies
- [ ] Create Stripe payment links; put landing copy on the AQ/Conform-Edge site
- [ ] Cross-link from the 6 existing self-assessment tools
- [ ] Disable one of the two duplicate opportunity-scanner schedules
