# Technical Debt — IATF 16949 Core Tools Suite
**Date:** 2026-07-07

## Assessment: Near-zero debt. Cleanest new build in the portfolio.

| # | Item | Severity | Status |
|---|---|---|---|
| 1 | Revenue-model inconsistency in 00-Executive-Summary (doc debt, not code) | Medium | **Addressed** — Revenue-Expansion.md (2026-07-07) is the single source of truth; correct 00-Exec-Summary at next edit |
| 2 | FMEA question set lacks AIAG-VDA currency (content debt) | High | **Resolved 2026-07-10 (v1.0.1)** — 3 AIAG-VDA (2019) methodology questions added to FMEA tab in `artifact/index.html`, footer edition citation added. See README.md changelog. |
| 3 | localStorage-only persistence | Low | Appropriate for a self-hosted static tool the user opens locally; cloud opt-in planned v2.0. Note: if this file is ever embedded as a claude.ai artifact, localStorage must be replaced with in-memory state |
| 4 | No automated tests (manual 10-UI-TEST-PLAN only) | Low | Acceptable at this scale; add a Playwright smoke script when the v2.0 backend lands |
| 5 | Single 24 KB HTML file, 15 functions, no framework | — | Correct choice: zero dependencies, works offline, no build chain. Refactor into modules only at v2.0 backend split |
| 6 | Question content hardcoded in JS | Medium | Extract to a JSON block at v1.1 so quarterly content updates don't touch logic — this directly serves the subscription promise (ship content updates safely) |
| 7 | No versioning of assessment schema | Medium | Add `schemaVersion` to saved localStorage payloads at v1.0.1 so quarterly question updates don't corrupt saved assessments |
| 8 | .env.example absent | N/A | No secrets in a static tool; required when v2.0 backend lands |

## Architecture Direction (v2.0)
Keep the assessment engine client-side; add a thin sync/auth backend (Express + Postgres per 05-Premium-Roadmap). Do not move scoring server-side — client-side scoring is a privacy selling point for suppliers wary of exposing audit-readiness data. AI layer: M-AI Kernel rules first (governed, deterministic), local LLM for narrative only, provider abstraction per the portfolio AI Architecture Requirement.

## Security & Privacy
All data local in v1.0 — market it. At v2.0, cloud save must be opt-in per assessment, with export-and-delete supported (enterprise procurement will ask).
