# MVP Scope — what v1.0 (this build) does and does not do

## In scope (BUILT in artifact/app)
1. Standard packs: ISO 9001:2015, AS9100D, AS9110C, ISO 13485:2016 — required inputs,
   outputs, and auditor-evidence guidance encoded as data.
2. Guided input board: status per input (Entered / Missing / N/A + justification),
   data summary, trend (Improving/Stable/Declining), notes.
3. Deterministic completeness engine: % score, per-gap audit-exposure flags,
   readiness verdict (advisory only).
4. Package generation: agenda, pre-populated minutes, executive summary,
   output-action register (§9.3.3 + deltas).
5. Markdown export (download + clipboard) and print-friendly output.
6. localStorage persistence (data never leaves the browser in MVP).
7. Zero-dependency Node static server with /health route (Railway-ready).

## Out of scope for MVP (see 05-Premium-Roadmap.md)
- Accounts, auth, payments (Stripe link sits in front of the app)
- Server-side storage / multi-user
- File upload parsing (KPI spreadsheets)
- M-AI kernel full integration (deterministic skeleton only — see BUILD-NOTES deferral)
- ISO 14001 / IATF 16949 / ISO 45001 packs
- Trend charts, prior-review comparison

## MVP acceptance
See artifact/app/tests/smoke-test.md and UI-TEST-PLAN.md — all checks must pass before
attaching a payment link.
