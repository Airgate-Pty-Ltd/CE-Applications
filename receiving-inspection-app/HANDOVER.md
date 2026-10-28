# Handover

What is done, what is deliberately unbuilt, and where the seams are.

Written for whoever picks this up next — including future me.

---

## The one-paragraph version

The decision layer is complete and heavily tested: routing, checks,
nonconformance disposition, the calibration gate, retention, storage with a
contract suite, the offline sync queue, record locking, identity role mapping,
check content packs, and the inspection record with its immutability and
signing rules. The **user interface for executing an inspection does not
exist**. That is the main outstanding work, and it was left last on purpose.

---

## Build order and where it stopped

| Step | State |
|---|---|
| 1. Repository guardrails, scrub gate, CI | Done |
| 2. Schemas | Done |
| 3. Engine (router, checks, ncr, calibration, retention) | Done — 100% branch coverage |
| 4. Storage interface, contract suite, local adapter | Done |
| 5. Sync queue, record locking, conflict surfacing | Done |
| 6. SharePoint adapter, auth, role mapping | Done |
| 7. Check content packs as data | Done — 19 checks |
| 8. Document builders | **Partial** — record JSON done; PDF and 8100-1 **not built** |
| 9. Check-execution UI, tablet-first | **Not built** |
| 10. NCR and disposition UI | **Not built** |
| 11. Test dashboard, 14 panels | Done — all green |
| 12–16. Receiving log, PWA, Tauri, billing, docs | Not built (docs now done) |

Stopped at step 11 because the build specification says to: *"Stop after step 11
and show me the dashboard. Do not proceed without my sign-off."*

## Why storage came before the UI

The conventional order would build the interface first. In an app that must
survive a dropped connection mid-inspection, persistence **is** the
architecture. Building it after the UI means retrofitting every write path.
That reordering is the single most consequential structural decision here.

---

## Where the UI seams are

Everything the UI needs already exists as pure functions. The interface should
be a thin rendering layer over these, and **should not contain rules**.

### Starting an inspection
```ts
createDraft({ id, receipt, pack, samplingTable })  // src/documents/record.ts
```
Returns a record whose `requiredCheckIds` were **emitted by the engine**. The UI
renders the next unanswered check from that list.

**There must be no fixed checklist in a screen.** A developer adding a hardcoded
field to a form is the thing to catch in review — it is how this product turns
into a digital clipboard. See DESIGN-NOTES.md §4.

### Answering a check
```ts
applyResult(record, { checkId, value, evidenceRefs, toolId, note })
evaluateToolGate({ requiresMeasurement, tool, evaluationDate })  // BEFORE accepting a measurement
```
`applyResult` refuses on a signed record. The tool gate must be called before a
measurement is accepted — if it returns `allowed: false`, the UI shows
`verdict.message` and **does not offer a way past it**.

### Signing
```ts
signRecord({ record, pack, samplingTable, signedBy, signedByName, role, signedAt })
```
Returns `{ ok: false, reasons: string[] }` or `{ ok: true, record }`. **Render
every reason** — the refusal deliberately returns all of them at once, because
an inspector told one problem at a time makes several trips to the bench.

### Nonconformance
```ts
nextNcrAction(ncr)   // src/engine/ncr.ts — returns the required next action and role
canPerform(actorRole, requiredRole)
```
The UI never decides what happens next; it renders `action.description` and
enables the control only when `canPerform` is true.

### Persistence
```ts
queue.enqueue({ id, key, body, contentType, metadata, now });
queue.flush(now);
await queue.depth();   // show this in the UI AT ALL TIMES
```
Queue depth and last-sync time must be visible on every screen. An inspector has
to be able to tell at a glance whether their work is safely upstream. This is
not decoration.

### Locking
```ts
provider.lock(receiptId, deviceId, ttlMinutes, now)  // throws LockHeldError
```
Catch `LockHeldError` and show `error.lock.holder`. "In progress on another
device" without naming the holder is not enough to resolve on a shop floor.

---

## What is deliberately unstyled

`src/App.tsx` is a placeholder. There is no design system, no component library,
no theme. Nothing has been styled beyond making the dashboard legible. Tailwind
is configured with a `min-h-touch` / `min-w-touch` utility bound to a 44px
custom property — that is the entire design decision made so far.

**Deliberate, not neglected.** The interface is the part where the domain
expert's and the designer's judgment should shape the result, and guessing at it
would produce work that has to be thrown away.

### Constraints the UI must respect

- **Tablet first.** The primary user is an inspector at a receiving bench
  holding a tablet in one hand. Not a desktop layout that reflows.
- **Gloves.** Touch targets at least 44px. No hover-dependent affordances, no
  small close buttons, no drag gestures.
- **Camera capture** for evidence must be reachable one-handed.
- **Playwright already runs a `tablet` project on WebKit** (iPad viewport)
  alongside desktop Chromium. Keep both green.
- Supervisor and quality-manager screens are laptop-shaped and can be denser.

---

## Known gaps and rough edges

**PDF rendering and FAA Form 8100-1 are not built.** The router already requires
a `CONFORMITY_RECORD` on a full-inspection path and the record carries
everything needed to populate one. `pdf-lib` is not yet a dependency. Dashboard
panel 7 shows JSON only and says so.

**The receiving log and supplier performance rollup (step 12) are not built.**
Both are derivable from records already held — the rollup is what turns a
per-seat tool into something a quality manager renews, so it is worth doing
properly rather than as a table dump.

**The local IndexedDB adapter is not contract-run in CI** (jsdom has no
IndexedDB). Run `runProviderContract` against it in a browser before trusting
single-user mode.

**The SharePoint adapter has never touched a real tenant.** It is verified
against a fake Graph client, which proves it honours the contract, not that
Graph behaves as the fake does. Treat first-tenant connection as a verification
step with time budgeted for it.

**No sampling table ships.** By design — see README and DESIGN-NOTES §6.1.
Nothing routes a sample inspection until values are supplied. Scenario S12 on
the dashboard demonstrates the block.

**Regulatory citations are all unverified.** See REGULATORY-SOURCES.md,
including a correction already applied to the retention floor.

**Secret scanning is not enabled** on the repository — blocked by an
organisation metered-usage setting, needs enabling in the UI. Push protection is
therefore off; the pre-commit scrub gate is the compensating control.

---

## Two traps that already caught this build

Both were real, both were found and fixed, and both are the kind that recur.

**1. A build gate that could not fail.** The production bundle was emitting a
`TestDashboard-<hash>.js` chunk containing the check-pack fixtures, while CI
reported the bundle clean. Two independent faults: a top-level
`lazy(() => import(...))` is emitted even when its only branch is dead code; and
the assertion grepped bundle *content* for `test-dashboard`, a string the
chunk's *filename* never contains. The assertion now checks content
case-insensitively, chunk filenames via `find`, and a fixture marker.

*The lesson: an assertion that has never failed is not evidence it works.*

**2. A clean-room gate that fired on ordinary English.** Denied terms were
matched as substrings, so a four-letter surname matched inside the word
`boolean` and failed every commit touching typed code. Now whole-word.

*The lesson: a gate that cries wolf is a gate people learn to bypass.*

---

## Running it

See README.md. Short version:

```bash
npm install && npm run verify && npm run dev
```

Dashboard at `/dev/test-dashboard`. If all 14 panels are green, the decision
layer is behaving.

---

## The clean-room obligation

`scripts/denylist.local.txt` is **machine-local and never committed**. A fresh
clone has no denylist, so the pre-commit gate runs structurally only and says
so. **Whoever works on this must create their own denylist** —
`scripts/denylist.example.txt` shows the format. The gate can only catch what is
listed, and history is permanent.
