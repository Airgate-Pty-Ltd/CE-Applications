# Test plan

What each part of the verification proves, and how to read it.

The rule throughout: **a green panel is trustworthy on its own claim and nothing
wider.** A check that overstates its scope is worse than no check, because it
converts an unexamined area into an examined-looking one.

```bash
npm run gate
```

Runs typecheck, build, and both CI gates in the order CI runs them.

```bash
npm run test:coverage
```

Full suite plus the engine's 100% branch threshold.

---

## The two CI gates

### Gate 1 — proprietary content scrub (`tests/gates/scrub.test.ts`)

**Proves:** no value shaped like a PMA number, an internal controlled-document
number, an email address, a telephone number or a street address appears in the
source tree, in the scripts, tests and docs, or **in the emitted bundle**.

**Does not prove:** that no proprietary content exists in a form the patterns do
not match — a facility name or a person's name in prose would not be caught.
Reading a diff is still required.

**How to read a failure:** it prints file, line, column, the matched text, what
class of value it is, and the remedy. Resolve by changing the repository, never
by widening the exception.

The gate proves itself first: it plants a synthetic violation of every pattern in
a temp directory and asserts each is caught, before asserting the repo is clean.
Without that half a broken regex sits green forever — the ordinary way this kind
of check fails. It also asserts that standards-reserved fictional values are
exempt **and** that a value one digit outside the reserved range still trips, so
the exemption cannot swallow the rule.

In CI it **fails rather than skips** when `dist/` is missing.

### Gate 2 — forbidden regulatory claims (`tests/gates/forbidden-phrases.test.ts`)

**Proves:** no string anywhere in source, docs or bundle predicts the FAA's
decision — no claim that the package is cleared, will be accepted, or is
complete in the regulator's eyes; and the status banner is a closed set of
exactly three values.

**Does not prove:** that the tone of the marketing copy is appropriate. It
catches the specific claim family, not overselling in general.

Also proves itself, including a negative case: it asserts the gate does **not**
flag legitimate regulatory language it sits next to — "FAA-approved design data",
"the FAA managing office makes the final determination", and the three banners.

---

## Automated suites

| Suite | Count | Proves |
|---|---|---|
| `src/engine/engine.test.ts` | 81 | Every rule, every branch of the risk determination, gap classification, consistency checks and banner selection. 100% branch coverage enforced. Includes determinism across 25 repeat runs of all eight scenarios. |
| `src/documents/documents.test.ts` | 22 | The generated `.docx` actually contains every Appendix A item — verified by unzipping the emitted file and reading its XML, not by re-rendering the same data. Also: refusal to generate when blocked, `[CONFIRM: …]` tokens for absent values, empty FAA Validation and Approvals blocks. |
| `src/ui/app.smoke.test.tsx` | 16 | The application mounts and works. Drives the real App with real state: adaptive field reveal, the live thin-narrative warning, the dashboard loading a scenario, the determinism panel, the disabled download. |
| `src/billing/billing.test.ts` | 10 | The billing flag is off, every feature is available with it off, and no price is hardcoded. |

---

## The test dashboard

`#/dev/test-dashboard` — development and staging only, excluded from production
by `TEST_DASHBOARD_ENABLED` in `src/config.ts`.

### 1. Scenario runner
**Proves:** eight fictional scenarios load end to end in one click, covering both
routing outcomes, all three banner values, and each class of high-risk trigger.
**Read it:** each card states what it demonstrates and what it expects. Load one,
then read the other seven panels against it.

### 2. Rules engine inspector
**Proves:** every rule that ran, in order, with its inputs and its output. When
high risk returns Yes you can see exactly which indicators caused it.
**Read it:** fired rules are highlighted. `high-risk.trigger.*` rows are the
indicators; `routing.outcome` is the conclusion.
**Does not prove:** that the rules are *correct* — only what they did.

### 3. Determinism check
**Proves:** 100 consecutive runs of the loaded scenario produce byte-identical
determination output, trace and rationale strings included.
**Read it:** PASS means the engine has no hidden dependence on time, randomness
or iteration order. FAIL names the run on which output diverged.

### 4. Document preview
**Proves:** the text actually written into the `.docx`, extracted from the
generated file itself.
**Does not prove:** layout. Column widths, page breaks and table borders still
need eyeballing in Word against the AC appendix — use the "Open plan .docx"
button for that.

### 5. AC 21-55 Appendix A conformance
**Proves:** every heading and numbered item of the published Appendix A is
present in the generated document.
**Read it:** green = present, red = missing, grey = n/a. Grey appears for
Sections 3–5 on an initial notification, where absence is correct.
**Does not prove:** that the content of each item is adequate — only that the
item exists and is populated.

### 6. Scrub audit
**Proves:** the generated document and the loaded scenario contain nothing
matching the proprietary-content patterns.
**Does not prove:** the repository is clean. A browser cannot read the source
tree or the built bundle. **Gate 1 in CI is the authoritative scan** — this panel
is a live check on the data in front of you.

### 7. Validation matrix
**Proves:** every cross-section consistency check with live pass/fail.
**Read it:** these catch *contradictions* (address omits the stated country;
"fully inspectable: yes" alongside a list of un-inspectable characteristics), not
omissions. Omissions are panel 8. `n/a` means the check does not apply.

### 8. Gap report
**Proves:** what the customer sees — every gap in blocking, warning,
informational order, exactly as the engine produced it.
**Read it:** blocking gaps refuse generation. Warnings stamp the document
DRAFTED WITH GAPS. Every entry names a location, a citation, and what to do.

### Scenario expectation cross-check
**Proves:** the live engine agrees with what the loaded scenario declares it
should produce. Catches a fixture and the engine drifting apart — the failure
mode where the dashboard looks healthy because the expectation moved with the
bug.

---

## What is not covered by any of this

- **Layout fidelity against the printed AC appendix.** Requires opening the
  `.docx` in Word. Panel 4 gets you the file.
- **The Tauri desktop build.** Never compiled — no Rust toolchain on the build
  machine. See `HANDOVER-TO-MIKE.md`.
- **Service worker behaviour in a real browser.** The registration path is not
  exercised by any test; it is skipped in dev by design.
- **Regulatory correctness of the citations.** Owner action, listed in
  `REGULATORY-SOURCES.md`.
- **Cross-browser rendering.** No Playwright suite; the smoke tests run in jsdom.
