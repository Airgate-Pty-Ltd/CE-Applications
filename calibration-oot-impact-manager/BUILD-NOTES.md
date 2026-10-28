# Build Notes — Calibration & OOT Impact Manager

**Date:** 2026-08-14 · **Run:** opportunity-scanner overnight (Phase 2) · **Origin:** deferred pick from 2026-08-12 report, ledgered.

## Gate compliance
- **future-systems-architect:** PASS. Deterministic rules-only engine; no LLM, no network, no persistence beyond the session; user owns all data. Decision is transparent — every verdict is accompanied by the driver list explaining *why*, and the required-action table is ordered by priority. Explicitly states the accountable quality function owns final disposition (no fabricated regulatory conclusion).
- **vera-molecule-design-system:** Navy/steel/ink palette, panel cards, verdict/tag chrome, ordered action table consistent with the portfolio.
- **mai-kernel-integration:** N/A for this client-side build. Good future DIM candidate — the OOT validity assessment is exactly the kind of governed, rules-only judgment the kernel is designed to host.

## Verification (not fabricated)
- `node --check` on extracted inline JS: **rc 0** (syntax valid).
- Self-containment: **0** external src/href http(s) refs; closes `</html>`.
- Risk engine replicated and unit-tested in node: **4/4** cases land in the correct band — tiny error/stock/reverify/non-KC → DOCUMENT (score 0); ratio ≥1 + shipped + KC + falsely-passes → RECALL (score 12); 50% ratio/unknown/no-reverify → CONTAIN (score 5); 20% ratio/falsely-passes/stock/reverify → DOCUMENT (score 2). Scoring is monotonic in every risk driver.

## Reference discipline
AS9100 7.1.5.2 referenced by clause/intent only; no standard text reproduced.
