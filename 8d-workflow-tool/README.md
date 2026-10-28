# 8D Corrective Action Workflow Tool

**Status:** Production-ready build. See EVOLUTION-REPORT.md for the full assessment and roadmap.
**README added:** 2026-07-07 by the Product Evolution Engine (deployment-readiness gap closure).

## Changelog

**2026-07-11 (C-E/AQ Master Task governance run) — critical data-loss bug fixed + false claims corrected:**
- **Fixed (index.html):** the step-to-step data capture logic read each step's form fields
  from IDs that didn't exist yet at the time they were read (they were created by a
  subsequent `innerHTML` write). Net effect, confirmed with a jsdom repro before fixing:
  in the natural "fill a step, click Next, never come back" flow, every step's typed data
  was silently dropped from the maturity score and the exported report — including D2's
  problem statement, which got wiped to `''` the instant D2 was first shown, even though the
  textarea kept displaying the correct text on-screen. Root cause: capture ran inside each
  step's own render branch (post-hoc, self-referential) instead of capturing the *outgoing*
  step before switching. Replaced with a `captureStepFields(currentD)` call at the top of
  `showD()`/`nextD()`/`showMaturity()` that reads the step being left, using `??` fallback so
  a not-yet-rendered field never overwrites previously captured data with `''`.
  Verified with a full jsdom walk-through of all 8 steps navigated forward-only (no revisits):
  all 8 fields now correctly retained end-to-end, maturity score computed 5/5 as expected.
- **Fixed (index.html):** added real `localStorage` persistence (save on every step
  navigation, restore on page load). Previously `findings` was an in-memory variable only —
  a page refresh silently discarded the whole investigation, contradicting the FAQ's "your
  data is still there" claim. Verified with jsdom: pre-seeding `localStorage` and reloading
  the page resumes to the correct step with all data intact.
- **Fixed (index.html):** the "📄 Export as Word" button previously downloaded a plain
  `.txt` file (`Blob` type `text/plain`, `.txt` extension) — clicking it did not produce a
  Word document. Rewrote `exportToWord()` to emit an HTML-formatted document served as
  `application/msword` with a `.doc` extension (the standard technique Word uses to open
  HTML content). Verified with jsdom: exported blob has the correct MIME type, includes the
  Word XML namespace, and contains the captured investigation data.
- **Corrected (USER-GUIDE.md):** removed/rewrote descriptions of features that don't exist
  in `index.html` — Excel export, per-step "?" help icons, a "Sample Investigations"
  library, a CAR-number/"Start" entry flow, app-level keyboard shortcuts (`Ctrl+S`/`Ctrl+E`),
  keyword-based weak-root-cause detection, and a "real-time" (per-step) maturity radar (it's
  actually calculated once, on demand, after D8). Updated the data-persistence FAQ to
  accurately describe the now-real localStorage behavior and its per-browser/per-device
  scope.
- **Not changed / still open:** no Excel export, no backend/multi-device sync, no
  authentication — these remain accurately documented as future roadmap items in
  EVOLUTION-REPORT.md, not present-tense claims.

## Quick Start
Open **`index.html`** in any modern browser. Self-contained — no install, no login, no backend; data stays on your device.

## Key Files
- `index.html` — the tool
- `EVOLUTION-REPORT.md` — assessment, roadmap, revenue model
- `USER-GUIDE.md` — end-user documentation
- `COMPETITIVE-ANALYSIS.md`

## Deploy
Static hosting (Railway/Vercel): push this folder to a private GitHub repo, deploy the HTML as a static site, add a custom domain. No env vars or build step. Commercial launch gated on portfolio-level payment platform + legal docs (see PORTFOLIO-DEPLOYMENT-READY-2026-07-04.md at the Opportunity-Scans root).
