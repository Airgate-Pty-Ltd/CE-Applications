# Technical Debt — Repair Station Readiness Dashboard
**Date:** 2026-07-07

## Debt Register

| # | Item | Severity | Status |
|---|---|---|---|
| 1 | **Documentation/reality drift:** COMPLETION-MARKER claimed 02-Product-Brief, 03-Buyer-and-Pricing, BUILD-NOTES, customer-facing-copy, sample-data.json — none existed | Critical (integrity) | **FIXED 2026-07-07** — files created (except sample-data.json: demo data lives inline in index-v2-fsa.html by design; marker corrected), correction appended to marker |
| 2 | **Fictitious data sources:** "FAA AVRO API" and "EASA NANDO API" are not real public APIs; NANDO is the EU medical-device notified-body database | Critical (credibility/legal if marketed) | **FIXED in docs 2026-07-07** — all new docs describe user-supplied + monthly-refreshed public records (FAA DRS/directory downloads, EASA approvals list); live integration moved to roadmap |
| 3 | Hardcoded demo alerts in index-v2-fsa.html presented as AI output | High | **Partially resolved 2026-07-10** — see dated entry below. Static narrative alerts replaced with a DIM-pattern rule engine; full mai-kernel runtime wiring (DB, adapter, ledger) still open. |
| 4 | Two HTML files with unclear precedence (index.html v1 vs index-v2-fsa.html) | Medium | Mitigated — README now names v2 as production, v1 as archive; consider renaming v1 to `archive-index-v1.html` at deploy time |
| 5 | No automated tests / smoke-test checklist | Medium | Open — adopt the 10-UI-TEST-PLAN pattern from IATF suite at v1.1 |
| 6 | No persistence layer (refresh loses state) | Medium | Acceptable for demo; v1.1 adds localStorage for user-entered data (fine for self-hosted static tool) |
| 7 | Alert severity thresholds undocumented (magic numbers in JS) | Low | **Resolved 2026-07-10** — thresholds now live as versioned rule JSON (`artifact/mai-rules/repair-station-dim.manifest.json`), not magic numbers in render logic. See dated entry below. |
| 8 | No .env.example / config scaffolding | Low | N/A while static; required at v1.1 when refresh pipeline lands |

## Architecture Assessment
Single self-contained HTML (19 KB, one script block, no external deps) — appropriate for stage, fast, secure-by-simplicity (no backend attack surface). The FSA alert-driven redesign is architecturally sound. The debt is *honesty debt*, not code debt: the UI narrates intelligence the system doesn't yet have. Kernel integration (P0) converts the narrative into governed reality and clears items 3 and 7 together.

---

## 2026-07-10 — M-AI Kernel-Pattern Wiring (Items #3 and #7)

**What was done:** `artifact/index-v2-fsa.html`'s hardcoded, narrative-only `alerts` array (4 static objects with pre-assigned severities and no underlying data) has been replaced with:
1. `MaiConditionEvaluator` — a JS class ported verbatim (same operator grammar: `is_null`, `not_null`, `is_empty`, `not_empty`, `eq`, `ne`, `in`, `length_gte`, `length_lt`, `date_before_today`, `date_after_today`, `all[]`, `any[]`, `not{}`) from `mai-kernel/lib/condition-evaluator.js` in `builds/2026-07-03-MAI-KERNEL-BUILD/`.
2. `MAI_DIM_REPAIR_STATION_READINESS` — an embedded DIM/rule manifest (6 rules: SURV-001, CAPA-001, CAPA-002, STAFF-001, SUPPLIER-001, AS9110C-001) following the exact schema used by the portfolio's real, live DIM at `builds/2026-07-03-MAI-KERNEL-BUILD/supplier-scorecard-v2/src/dims/supplier-assessment/manifest.json` (id, revision, dimension, subscriptions, condition, severity, finding_text). A canonical, version-controlled copy of this manifest lives at `artifact/mai-rules/repair-station-dim.manifest.json`.
3. A `stationSnapshot` object — real numeric/derived data (days past due, renewal window, outstanding CA count, staff expirations, supplier risk count, AS9110C score) that the rules are evaluated against, replacing the previous approach of writing the conclusion directly into the alert object.
4. `evaluateStationAlerts()` — filters the DIM's rules by evaluating each rule's condition against the snapshot, then merges in `RSRD_ALERT_NARRATIVE` (the pre-existing FSA "7 questions" copy, preserved so no UX content was lost) to produce the final `alerts` array consumed unchanged by the existing `renderAlerts()`/`filterAlerts()` functions.
5. Each rendered alert card now shows its rule ID (e.g. "Rule: SURV-001") for traceability back to the manifest.
6. Header now discloses: "Rule-engine assessments — advisory only. Human authority controls all decisions."

**What this is NOT:** This is not the live mai-kernel runtime. There is no Postgres adapter, no `mai_*` schema, no append-only ledger, no event hashing/supersession, and no tenant scoping — those require a backend, and this tool is deliberately backend-free (client-side privacy is a stated selling point, see README "Data Sources — Honest Statement"). What changed is real: alert generation moved from "hardcoded conclusions in an array" to "versioned rule conditions evaluated against data," using the kernel's own grammar, which is a genuine architectural upgrade, not a re-skin.

**Still open:**
- True kernel runtime wiring (DB-backed events/assessments, adapter, ledger) — deferred to the v2.0 backend split noted in Product-Roadmap.md / 05-Premium-Roadmap pattern used elsewhere in the portfolio.
- The embedded rule manifest in `index-v2-fsa.html` and the canonical file at `artifact/mai-rules/repair-station-dim.manifest.json` must be kept in sync manually until a build step or the backend generates the embedded copy from the canonical file.
- `length_gte`/`length_lt` are used as greater-than/less-than substitutes (the kernel grammar has no dedicated `gt`/`lt` operator); thresholds are expressed as the smallest/largest qualifying integer. Documented in the manifest's `known_limitations`.
- Terminology-law alignment (Design Law 8: no numeric "confidence %" in rule output): the numeric confidence percentages that appeared in the old hardcoded alerts (e.g., "90% confidence," "$2M disruption possible," "70% confidence") were dropped from the narrative copy carried into `RSRD_ALERT_NARRATIVE` during this patch, since the kernel pattern prohibits numeric model-confidence claims in rule output. A follow-up pass should formally add a `data_confidence: high/medium/low` field per rule per the kernel's vocabulary rather than relying on omission alone.

## Security & Privacy
No data leaves the browser in v1.0 — state this prominently in marketing (it is a *selling point* for compliance buyers). When the refresh pipeline lands, keep station-identifying data local; only public regulator records come in.
