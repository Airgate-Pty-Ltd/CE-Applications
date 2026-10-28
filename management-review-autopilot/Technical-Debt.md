# Technical Debt — Management Review Autopilot

## Architecture review

The product is a single static HTML file (`src/index.html`, 359 lines including embedded
`<script>` and inline event wiring) served by a 25-line zero-dependency Node server
(`server.js`). No build step, no framework, no external runtime dependencies. For an MVP at
this customer count, this is the *correct* amount of architecture — not technical debt, a
deliberate simplicity choice consistent with the portfolio's other early builds.

## Debt items found (all minor)

1. **All state lives in `localStorage` on one browser.** Intentional for v1 (stated in the
   footer: "All data stays in this browser — nothing is transmitted") but it means no
   cross-device continuity and no team sharing. This is the correct v1 trade-off (privacy +
   simplicity + zero backend cost) but should be called out explicitly as a v2.0+ migration,
   not silently outgrown. Already captured in Product-Roadmap.md v2.1.

2. **No automated tests.** `tests/smoke-test.md` exists but is a manual checklist, not an
   automated test. For a single static file with no build pipeline this is proportionate today;
   revisit once the M-AI kernel integration (v2.0) adds real logic branching worth regression-
   testing.

3. **Inline `onclick=` handlers in HTML** (`onclick="switchTab('inputs')"` etc.) rather than
   fully unobtrusive event binding. Not a bug, but if the file grows past v1.2 scope this should
   move to addEventListener-only wiring for maintainability. Flagged, not fixed this pass — low
   risk, low value to change pre-emptively per the user's clean-code-when-possible preference
   (touching working code without a concrete reason introduces more risk than it removes).

4. **No `.env` values actually consumed by `server.js`** — `.env.example` exists for Railway
   convention but the server only reads `process.env.PORT`. Harmless; documented correctly in
   RAILWAY-DEPLOYMENT.md.

## What was NOT found
No security issues (path traversal is explicitly guarded in `server.js` line 18: `if
(!full.startsWith(SRC))`), no XSS gaps (the `esc()` helper is applied everywhere user input is
interpolated into `innerHTML`), no broken logic in the coverage/gap engine (hand-traced this
pass, see Evolution-Report.md). This is a clean codebase for its size.

## Recommendation
No refactor needed before v1.1. Revisit architecture (state persistence, event binding pattern)
only when v2.0's M-AI kernel integration requires it — don't refactor ahead of need.
