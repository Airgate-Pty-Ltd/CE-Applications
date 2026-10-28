# Test Plan

What each dashboard panel proves, and how to read it.

The dashboard at `/dev/test-dashboard` is a **deliverable, not a debug page**.
Green on a panel means you can trust that panel's claim without reading the
code. That only holds if each panel states a claim narrow enough to be true, so
each one does.

Panel logic lives in `src/dev/panels.ts` as plain functions, and
`src/dev/panels.test.ts` asserts all fourteen are green in CI. The dashboard
therefore cannot quietly diverge from what the test suite verifies.

**Development and staging only.** The production build asserts the dashboard,
its chunk, and its fixture content are all absent from `dist/`.

---

## How to read a panel

Each panel shows a title, a **Proves:** line, and a list of rows with ✓ or ✗.
The header states how many panels are green.

A panel is green only when every row is green. Read the **Proves:** line first —
it tells you what a green result entitles you to believe. It does not entitle
you to believe anything wider.

---

## The panels

### 1. Scenario runner
**Proves:** twelve fictional receipts route as intended.

Each row shows the expected path, the path the router produced, and what that
scenario demonstrates. Covers: 8130-3 full inspection, CoC sample, documentation
mismatch hard stop, first-article escalation, open-CAR escalation, FOD failure,
label/serial mismatch, out-of-calibration tool, use-as-is disposition, scrap
disposition, supplier probation, and unconfigured sampling.

**Read it for:** whether the routing rules behave on realistic inputs.
**Does not prove:** that the rules are the *right* rules. That is your judgment.

### 2. Path router inspector
**Proves:** every rule that ran is shown in order, and an escalation to 100%
always names its trigger.

Shows the full decision trace — each rule, whether it fired, and why or why not.
The final row asserts the escalation is attributable to specific named triggers.

**Read it for:** confidence that no routing decision is unexplainable. If a
receipt escalates on the floor and an inspector asks why, this is the answer.

### 3. Determinism check
**Proves:** the same input always produces the same decision.

Runs the router 100 times on one receipt asserting byte-identical output, and
builds the same record twice asserting the two are byte-identical.

**Read it for:** the guarantee that no clock, random value or ambient state
leaks into a determination. The engine is lint-enforced against `Date`,
`Math.random`, `fetch` and storage APIs.

### 4. Immutability check
**Proves:** a signed record cannot be edited; corrections produce a referenced
revision.

Attempts to mutate a signed record and asserts refusal, attempts to re-sign it
and asserts refusal, then produces a revision and shows it references its
predecessor.

**Read it for:** record integrity. This is the panel an auditor's question about
"can someone change a signed record" resolves to.

### 5. NCR route tracer
**Proves:** every disposition branch routes and requires an approver.

Walks a failure through the chain: raised → quarantined → material review →
use-as-is / supplier action / scrap → terminal. Each row shows the required
role.

**Read it for:** that there is no silent disposition, and that the chain from
receipt to final disposition is walkable for any article.

### 6. Calibration gate test
**Proves:** an out-of-calibration tool BLOCKS the check — it is not a warning.

Three rows: expired tool blocked, no tool identified blocked, in-calibration
tool allowed.

**Read it for:** the differentiator worth putting on the landing page. Note the
boundary: a tool due *today* is still in calibration today. The due date is the
last valid day, not the first invalid one.

### 7. Document preview
**Proves:** the inspection record renders, and its structured JSON is what an
ERP would consume.

Shows the signed record's JSON and asserts the routing required a conformity
record on a full-inspection path.

**Read it for:** the shape of the machine-readable artefact.
**Does not prove:** PDF rendering or the 8100-1 layout — **neither is built
yet.** See HANDOVER.md.

### 8. Scrub audit (loaded content)
**Proves:** shipped check packs and fixtures carry no internal document or
certificate identifiers.

Scans the loaded content and fixtures against the structural patterns.

**Read this one carefully.** In a browser it can only scan what is loaded. **The
authoritative scan is `scripts/scrub-check.sh`**, which runs in the pre-commit
hook before a commit object exists and again in CI across full history. This
panel is a second look at shipped content, not a replacement. Run
`npm run scrub:history` for the real answer.

### 9. Retention check
**Proves:** configured retention is never below the regulatory floor, and the
library label is read back.

Asserts the product default passes, a below-floor value is refused, the
SharePoint library retention label is read and converted to years, and that
floors ship marked unverified.

**Read it for:** that the floor is enforced rather than advised — and that the
product is honest about its citations being unconfirmed. See
REGULATORY-SOURCES.md.

### 10. Storage adapter conformance
**Proves:** every adapter runs the same contract; passing it is what makes a
provider valid.

One row per adapter with operations passed. **Stubs are green when they fail
every operation** — a stub that reported partial success would be the lie. The
count tells you which: `memory` and `sharepoint` pass 12/12; `webdav` and `s3`
show 12/12 correctly unimplemented.

**Read it for:** whether a customer can bring their own storage. If your adapter
shows 12/12, it is supported.

### 11. Offline → commit
**Proves:** a record signed offline commits intact and exactly once when the
network returns.

Signs a record with the network gated off, asserts the commit fails and the
record is **retained** in the queue with the error recorded, restores the
network, asserts the queue drains, the record is intact upstream, and there is
exactly **one** revision — a retry must not double-write.

**This is the panel that matters most.** A record lost to a dropped connection
is the failure mode that kills this product. The "exactly once" row is the one
to watch: at-least-once delivery would duplicate regulatory records.

### 12. Concurrency test
**Proves:** the same receipt cannot be inspected on two devices, and the holder
is named.

Second device blocked with the holder named; then a lock an hour past expiry is
reassigned.

**Read it for:** that a dead tablet cannot block the receiving dock
indefinitely, which is why locks expire rather than persisting until released.

### 13. Role capability matrix
**Proves:** capabilities are enforced per mapped role.

One row per role with its full capability set, then two assertions: read-only
cannot sign, and an inspector cannot approve a disposition requiring a
supervisor.

**Read it for:** confirmation before rollout that your group mapping produces
the separation of duties your procedures require.

### 14. SharePoint metadata mapping
**Proves:** these are the library columns the app writes.

Shows every column and the value for a sample record: receipt id, part number,
serial numbers, supplier, inspection path, result, inspector, signed-at, NCR
reference, revision.

**Read it for:** confirming your library schema, views and reports work **before
rollout rather than after.** If a column here does not exist in your library,
the write succeeds and the view is incomplete — the adapter reports that
explicitly rather than failing silently.

---

## What the dashboard does not cover

Stated plainly, because a dashboard that implies total coverage is worse than
one that admits its edges:

- **No check-execution or NCR user interface exists yet.** Panels exercise the
  engine and the record layer directly.
- **PDF and 8100-1 rendering are not built.** Panel 7 shows JSON only.
- **The local IndexedDB adapter is not contract-run in CI** — jsdom has no
  IndexedDB. Run the contract against it in a browser.
- **The SharePoint adapter is verified against a fake Graph client**, not a real
  tenant. It proves the adapter honours the contract; it does not prove Graph
  behaves as the fake does. First-tenant verification is a deployment step.
- **No PWA, no Tauri, no billing.**

## Running the same checks headlessly

```bash
npm run verify
```

Panels 1–14 are asserted by `src/dev/panels.test.ts` in the `test` CI job, so a
regression fails CI whether or not anyone opens the dashboard.
