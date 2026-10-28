# Handover

For the developer taking this over. It explains how the product actually works, where every piece
lives, what is deliberately not built, and the traps that have already cost time once.

This file is named for the role rather than for a person, and contains no individual's name. That is
not an oversight — the repository is intended for eventual sale, and a CI gate fails the build on any
person's name appearing anywhere in it. See §6.

**Read §1 and §3 before touching anything.** The rest is reference.

---

## 1. The one idea, and why it constrains everything

Remote inspection is legal. What gets operators in trouble is failing to prove that substantive
inspection actually occurred — specifically, that a regulator characterises the arrangement as the
inspecting organisation providing *only* approval for return to service while someone else did the
real work. Evidence defeats that characterisation. Nothing else does.

**So this is an evidence engine, not a video tool.** Its job is to make it impossible to finish a
session without also producing the record set that shows the inspection was substantive. The video is
incidental; the defensible record is the product.

Three consequences you will hit within an hour of reading the code:

1. **The engine never asks the video layer for permission.** Every determination lives in
   `src/engine/`, which is pure — no I/O, no clock, no network, no model. If you find yourself
   putting a rule in a component, stop: two surfaces disagreeing about whether approval is available
   is the exact failure this product exists to prevent.
2. **The product never renders a regulatory conclusion.** It captures evidence and reports what it
   captured. It does not say anyone has met an obligation. This is enforced by a CI gate over the
   source text, not by good intentions (§6).
3. **Refusals are features.** A session that cannot start, a check that cannot be determined, an
   approval that cannot be granted — these are the product working. A demonstrable record of
   *withheld* approvals is the single cleanest rebuttal to an approval-only characterisation.

### The drift test

If you are reviewing a change and unsure whether it belongs, ask:

- Does the video provider now know something the record does not?
- Could the evidence package still be assembled if the video vendor were replaced tomorrow?
- Does this strengthen the evidence package, or does it just improve the call?

A feature that improves the call but not the record is how this becomes a video tool with a checklist
bolted on. `DESIGN-NOTES.md` has the longer version.

---

## 2. Running it

**Prerequisites:** Node 22+, npm 10+. Nothing else — no database, no Docker, no API keys. The video
provider is a deterministic stub, so the whole product runs offline.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server. |
| `npm run verify` | Typecheck + unit tests + both CI gates. **Run this before every commit.** |
| `npm run test` | Vitest, 225 tests. |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run scrub` | Both gates over the working tree. |
| `npm run scrub:history` | Both gates over the working tree **and every commit's patch content**. |
| `npm run build` | Production build. Excludes the test dashboard. |

| Route | Surface |
|---|---|
| `/` | Index, with links and the theme toggle. |
| `/inspector` | The cockpit. Opens on a fictional demo session. |
| `/presenter` | The presenter surface. Open in a second window alongside the cockpit. |
| `/dev/test-dashboard` | Twelve panels. Development and staging only. |

Open `/inspector` and `/presenter` in two windows: the inspector's current instruction appears on the
presenter surface, and the presenter's problem flag comes back. That is a `BroadcastChannel`, so both
windows must be the same origin.

### Getting a feel for it in five minutes

1. Open `/inspector`. Press **Run pre-session checks and start**.
2. Click the check **Part marking legibility and content**. Note the determination buttons are
   disabled and two obstacles are listed — it is a key characteristic, so angles and lighting are
   required first. Fill both; the buttons enable.
3. Type an instruction and press **Direct and log**. Press **Capture document on screen**.
4. Press **Record an interruption**, then try to grant approval. You cannot. Pick a recovery path.
5. Work through the remaining checks, **End session**, then **Grant approval**.
6. Watch the evidence panel on the right the whole time — that is the defensibility report updating
   live.

Then open `/dev/test-dashboard` and read panel 2 and panel 6.

---

## 3. How a session actually works

This is the spine of the product. Every step names the function that does the work.

### Step 1 — Eligibility, before a session can be scheduled

`evaluateEligibility(input)` → `src/engine/eligibility.ts`

**12 rules: 8 hard blocks, 4 warnings.** Every rule is evaluated on every input whether or not it
fires, and each carries both the reason it exists (constant) and what it observed (varies). The whole
evaluation is returned, not just the failures — that is what dashboard panel 2 renders and what lands
on the record.

Hard blocks — the session cannot be scheduled:

| Rule | Fires when |
|---|---|
| `article-is-complete-type-certificated-product` | Article classified as a complete aircraft, engine or propeller. |
| `inspector-not-on-personnel-roster` | Absent from the roster, or present without the `INSPECTOR` role. |
| `inspector-training-currency-lapsed` | Session date is after `trainingCurrentUntil`. The last day counts as current. |
| `presenter-not-on-personnel-roster` | **Added by the build.** Marked `BUILD`, not `SPEC`. |
| `location-not-on-authorised-locations-roster` | Unlisted location, or authorisation withdrawn. |
| `critical-article-without-recorded-authority-concurrence` | Article classed critical and no concurrence recorded in config. |
| `inspector-not-authorised-for-critical-article` | **Added by the build.** Marked `BUILD`. |
| `calibrated-tool-past-due` | Any listed tool past its due date. The due date itself still counts as current. |

Warnings — the session proceeds, the risk lands on the record:
`approval-only-boundary`, `first-session-at-this-facility`, `first-session-with-this-presenter`,
`article-configuration-changed-since-last-session`.

`approval-only-boundary` is the commercially important one. Read its `rationale` string in full — it
names the exposure, names the evidence that answers it, and stops short of telling the user where
they stand. **If you edit that text, keep all three properties.**

Decision is `BLOCKED` if any block fired, else `PROCEED_WITH_WARNINGS` if any warning fired, else
`CLEAR`.

### Step 2 — Pre-session controls

`evaluatePreSessionControls(input)` → `src/engine/controls.ts`

**6 controls, three kinds of enforcement:**

| Control | Enforcement | Behaviour |
|---|---|---|
| `live-only` | STRUCTURAL | Always satisfied. There is no upload path to check. |
| `scheduled-timeframe` | GATE | Blocks outside the window unless `scheduleOverrideReason` is recorded. |
| `minimum-video-resolution` | GATE | Measured, not asked. Blocks below the configured minimum unless `resolutionJustification` is recorded. |
| `audio-headset` | ATTESTATION | Blocks if not confirmed. No override. |
| `controlled-environment` | ATTESTATION | Blocks if not confirmed. No override. |
| `inspector-sole-conformity-authority` | STRUCTURAL | Always satisfied. Enforced by the capability model. |

An override is never silent: status becomes `OVERRIDDEN`, the reason is carried on the control, and
both appear on the record and in the evidence package. Whitespace is not a reason.

### Step 3 — The session runs

State moves `SCHEDULED` → `PRE_SESSION_CHECKS` → `ACTIVE`, and recording starts. All of this goes
through `liveSessionReducer` in `src/ui/session/reducer.ts`, which is a pure reducer that calls the
engine and holds no rule of its own.

**Per check**, `evaluateCheckControls` decides whether a determination may be *recorded*. It never
suggests what the determination should be — there is a test asserting no obstacle message contains
conformity vocabulary. It blocks when:

- the check is a key characteristic and angles or lighting are missing;
- the check requires a calibrated tool and none was recorded, or one used was past due at session
  start, or one used was never registered for the session;
- the check requires a document on screen and none was recorded as reviewed.

Determinations are `CONFORMS` / `DOES_NOT_CONFORM` / `NOT_VERIFIED`. Deliberately not pass/fail — an
inspector determines conformity of an article against a defined characteristic; they do not
adjudicate a regulation, and the vocabulary should not imply they do.

Directed manipulations and reviewed documents are logged as **events**, not summarised in a note.
Counting directed manipulations is one of the strongest answers to an approval-only characterisation,
and you cannot count a paragraph.

### Step 4 — Interruption

`recordInterruption` / `resolveInterruption` / `assessApprovalAvailability` →
`src/engine/interruption.ts`

Any degradation moves the session to `INTERRUPTED`, stamps it, and **invalidates the affected
checks** by clearing their `reVerifiedAt`. Approval is unavailable from that moment.

Four recovery paths, one of which is not like the others:

| Path | Resulting state | Approval recoverable |
|---|---|---|
| `RESUME_AND_REVERIFY` | `ACTIVE` | **Only** after every affected check is re-verified |
| `REPERFORM_SESSION` | `TERMINATED_REPERFORM` | Never |
| `ROUTE_FOR_PHYSICAL_INSPECTION` | `TERMINATED_PHYSICAL_INSPECTION` | Never |
| `DISPATCH_INSPECTOR` | `TERMINATED_INSPECTOR_DISPATCH` | Never |

Re-verification happens naturally: re-determining a check that carries
`invalidatedByInterruptionId` sets `reVerifiedAt`. There is no separate "re-verify" action, because a
re-verification that is not an actual re-determination is not a re-verification.

A recovery path cannot be recorded without a rationale — `resolveInterruption` throws.

### Step 5 — Recording, and its failure

Recording is mandatory. `stopRecording()` returns an artefact reference and a content hash, both of
which land on the record. If it rejects, the session becomes `RECORDING_FAILED` — terminal, and it
**cannot stand as the sole conformity record**. `assessApprovalAvailability` reports this ahead of
everything else, because it is the most serious condition a session can be in.

### Step 6 — Approval

Approval is **derived, never set directly.** `assessApprovalAvailability` returns whether it is
available and why not if it isn't, in this order of severity: recording failed → terminal state →
interrupted → unresolved interruption → outstanding re-verification → recording not retained.

The reducer's `TAKE_APPROVAL` then adds two more conditions before it will grant: every check in the
pack must have a determination, and every determination must be `CONFORMS`.

`WITHHOLD_APPROVAL` requires a reason. `sealRecord` refuses to seal a withheld approval that has no
reason — a withheld approval with no stated reason looks like an omission rather than a decision, and
the whole value of the withheld-approval register depends on it reading as a decision.

### Step 7 — The defensibility report

`scoreDefensibility(session)` → `src/engine/defensibility.ts`

**8 evidence elements**, each `PRESENT` / `ABSENT` / `NOT_APPLICABLE`:

1. `live-directed-inspection-recorded`
2. `directed-physical-manipulation-logged`
3. `documents-reviewed-on-screen`
4. `key-characteristics-angle-and-lighting`
5. `tools-with-calibration-status`
6. `nonconformances-raised-where-applicable`
7. `approval-withheld-where-conformity-unverified`
8. `full-session-recording-retained`

Element 7 is the sharpest: if conformity was incomplete **and approval was granted anyway**, it marks
`ABSENT`. That is the product catching the thing it exists to catch.

**It is descriptive and never a verdict.** It says "this session captured 6 of 8 applicable evidence
elements; not captured: X, Y" and stops. There is a test asserting the output contains no judgement
words. Do not add a grade, a percentage badge, or a colour that implies adequacy. Customers set their
own review threshold; the product does not have an opinion about it.

### Step 8 — Sealing, revision, export

`sealRecord` → `src/engine/record.ts`. Computes a SHA-256 over the canonical form and **deep-freezes
the object graph**, so a write throws in strict mode.

Corrections never edit. `reviseRecord` produces a new revision with `revision + 1` and
`supersedes` pointing at the prior record, requires a reason, and refuses to build on a record whose
hash does not verify. Both records survive — a record can be wrong, and the fact that it was wrong is
itself part of the evidence.

`buildEvidencePackage` → `src/documents/evidencePackage.ts`. Produces a manifest, per-entry content
hashes, and a hash over the entry set. **A recipient can verify it with any SHA-256 tool; this
software is not needed.** The recording is referenced with its hash rather than embedded, because it
lives in customer-controlled storage and may carry export-control obligations of its own.

---

## 4. Module map

```
src/
  engine/            pure decision logic - no I/O, no clock, no model
    eligibility.ts     12 rules; returns every evaluation, not just failures
    controls.ts        6 pre-session controls + the per-check gate
    roles.ts           19 capabilities, 9 of them determinations
    interruption.ts    degradation state machine + approval availability
    defensibility.ts   the 8 evidence elements
    retention.ts       floor, configurable upward only
    rosters.ts         append-only revisions, resolution by stamp
    record.ts          sealing, hashing, freezing, revision chains
    hash.ts            pure SHA-256 + canonical JSON
  schema/            zod schemas; types are inferred from them, never duplicated
  content/packs.ts   check packs as versioned data (2 packs, 6 and 5 checks)
  video/             provider interface + deterministic stub
  documents/         document model, session record, authority record, evidence package
  ui/session/        the reducer, the cross-window channel, the demo seed
  ui/inspector/      the cockpit
  ui/presenter/      the presenter surface
  ui/theme/          light/dark/system
  fixtures/          fictional data, shared by tests AND the dashboard
  dev/               the test dashboard
tools/scrub/         the two CI gates
tests/               225 tests
```

**`src/fixtures/` is shared on purpose.** The dashboard and the unit tests run the same 19 scenarios,
so a scenario that stops behaving as advertised fails CI rather than quietly misreporting on a
dashboard nobody is watching.

### The role model, in one paragraph

`src/engine/roles.ts` declares 19 capabilities, 9 of which are determinations. `INSPECTOR` holds 15
(all 9 determinations). `PRESENTER` holds 6 and **zero** determinations. `DESIGNATED_REPRESENTATIVE`
holds 2, of which 1 is a determination (completing the authority record).

The presenter UI does not render determination controls **because there is no capability to render
them from**. A disabled button is a policy; an absent capability is a structure. A test asserts the
presenter's determination set is empty, and dashboard panel 3 renders it. If you ever need to grant
the presenter something, think very hard about whether it belongs in `DETERMINATION_CAPABILITIES`.

### Rosters

Append-only revisions, each with an `effectiveFrom`. A record stamps the revision numbers in force
when the session started. `resolveRostersFromStamp` resolves a historical record to the roster **as it
stood that day** — after the person has left, after the location was withdrawn, after twenty more
revisions. Reconstructing who was authorised on the day is exactly what an authority asks for, and it
is impossible if the roster is mutated in place. `revisionByNumber` throws on a missing revision
rather than falling back to the latest.

---

## 5. The data model

`src/schema/` is the single source of truth. Types are inferred from zod schemas with
`z.infer`; never hand-write a type that duplicates a schema.

- **`primitives.ts`** — ids, ISO date/time, `Determination`.
- **`article.ts`** — `ArticleClassification` (6 values, 3 of which are complete products),
  `ArticleCriticality`, `CalibratedTool`, `MaintenanceProvenance`.
- **`roster.ts`** — roster entries, revisions, and the `RosterStamp` written onto a record.
- **`config.ts`** — `CustomerConfig`. **Everything the source procedures treated as fixed is a
  customer-configured value here.** That is what makes the repository clean-room and what makes the
  product sellable to more than one operator.
- **`session.ts`** — `SessionState` (10 values, 4 terminal), `Check`, `CheckPack`, `ExecutedCheck`,
  `DirectedManipulation`, `DocumentReviewed`, `ToolUsage`, `ControlAttestations`, `Interruption`,
  `RecordingState`, `Nonconformance`, `SessionSnapshot`.

`SessionConformityRecord` lives in `src/engine/record.ts` rather than `schema/`, because sealing and
hashing are behaviour rather than shape.

---

## 6. The two CI gates — how to work with them, not against them

Both were written as failing tests **before any feature code**. `tools/scrub/`.

### Gate 1 — clean-room identifiers (18 rules)

No real-world identifier may appear in the repository or in any commit's patch content: controlled
document numbering, certificate-number shapes, mailboxes, telephone numbers, named field offices,
postal addresses, honorific-plus-surname, and one specific cancelled notice number.

**Findings print redacted.** CI logs and tickets get a signpost, never a copy of the string the gate
exists to keep out.

**The denylist is not in this repository and must never be.** Company names, people's names,
third-party ERP/QMS/MES product names and specific product lines cannot be expressed as a pattern,
and a file listing the names that must not appear **is itself the violation**. Hashing them is
security theatre for short, guessable strings. So it is owner-held:

- locally: `tools/scrub/denylist.local.txt`, which `.gitignore` refuses to track, or `SCRUB_DENYLIST=/path`;
- in CI: the `SCRUB_DENYLIST` repository secret, written to a temp file for the run.

Format is one term per line, `#` for comments, optional `category: term`. Terms match across
separator styles, so one entry catches prose, `kebab-case` and `snake_case` alike.

**Without it the gate says so** — `NOT SUPPLIED - name-based terms are not covered on this run` —
rather than reporting a clean pass. A gate that implies coverage it does not have is worse than no
gate.

**What it does not cover:** commit metadata (author name and email are git plumbing — see §9), and
paraphrase. It is a floor, not a substitute for reading the diff.

### Gate 2 — opinion language (10 rules)

The product may quote regulatory text and may state what evidence it captured. It may not conclude
that a user, a configuration, or a session has achieved a regulatory state.

**This will catch you while writing documentation.** It caught the paragraph in `DESIGN-NOTES.md`
that explains the rule. That is the intended behaviour; the note is still there.

If you genuinely need a banned phrase — a verbatim quotation of regulatory text — add an inline
marker naming the rule. The marker is the literal token `SCRUB-ALLOW:` followed by the rule id, in a
comment on the same line as the phrase:

```ts
const quoted = '... the regulatory text ...' // SCRUB-ALLOW: <rule-id>
```

Substitute the actual rule id — `opinion-satisfies`, say — for the placeholder. The placeholder is
written in angle brackets here on purpose: it does not match the marker pattern, so this example does
not register as a real opt-out.

**Every marker in the tree is enumerated by a test**, so opt-outs cannot accumulate unnoticed. Adding
one means updating that test, which means someone reviews it. There are three today, and a
documentation example is deliberately not one of them.

### Two traps in the gates themselves, already fixed — do not re-introduce

1. **A rule whose pattern source matches itself.** The scanner reads the whole repository including
   the rule files. Every pattern isolates a letter in a character class (`complian[t]`) for this
   reason. There is a test.
2. **A rule id containing a word its own pattern bans.** Two ids did, so every mention — in the rule
   file, a finding, a log line, a dashboard panel — was a violation. They are now named for what they
   describe. There is a test.

The one content exclusion is `tests/fixtures/scrub/`, pinned by a test to exactly that path so it
cannot quietly widen into a hiding place. The history scan honours it per-hunk.

---

## 7. How to extend it — five recipes

### Add a check to a pack, or add a pack

`src/content/packs.ts`. Content is **data, never code**. A check needs `checkId`, `title`,
`instruction` (this is what appears in large type on the presenter surface — write it as a spoken
instruction), and the three flags: `keyCharacteristic`, `requiresDocumentOnScreen`,
`requiresCalibratedTool`. Those flags drive both the per-check gate and the defensibility elements, so
setting them correctly is the whole job. Bump `version` when you change a pack — the record stores
`packId` and `packVersion`, and a version that lies makes historical records unreadable.

### Add an eligibility rule

Append to the `RULES` array in `src/engine/eligibility.ts`. Give it a `ruleId`, `severity`,
`title`, a `rationale` explaining *why the rule exists*, an `evaluate` returning `{ fired, detail }`
where `detail` describes *what was observed*, and a `source` of `SPEC` or `BUILD`.

**Mark it `BUILD` if it is not in the original specification.** Two rules are marked that way so they
can be challenged on review rather than mistaken for a stated requirement. Dashboard panel 2 shows
the column.

Then add a test asserting it fires and does not fire, and add the boundary case — every date rule in
here has one.

### Wire a real video provider

Implement `VideoProvider` in `src/video/provider.ts`. Four things:

- `join` / `leave`
- `measureStream()` → `{ widthPx, heightPx, framesPerSecond, measuredAt }`, from WebRTC `getStats()`.
  This is what makes the resolution control a measurement rather than a question.
- `startRecording` / `stopRecording()` → `{ artefactRef, contentHash, startedAt, endedAt }`
- `onDegradation(listener)` → returns an unsubscribe. This is the interruption signal.

Two things to get right:

1. **Recording must be server-side egress, not browser `MediaRecorder`.** A closed laptop lid would
   otherwise destroy the conformity record.
2. **The content hash cannot be computed in the browser** for a server-side recording. It needs a
   webhook that hashes the artefact where it lands and writes the hash back onto the record.

Swap the construction site in `InspectorCockpit.tsx` and the dashboard's interruption panel. The
engine does not move.

**Do not add an import, upload, attach or ingest method to that interface.** Its absence is the
enforcement of the live-only control.

### Add persistence

Nothing is persisted today (§8). Whatever you choose, the constraint is that **IndexedDB cannot be
the system of record** — a cleared browser profile would destroy evidence held under a ten-year
retention floor. Sealed records are immutable and content-hashed, so an append-only store is the
natural shape, and the evidence package verifies without a database at all.

### Add a document output

`src/documents/model.ts` defines a small document model — sections of fields, paragraphs and tables —
rendered to HTML for screen and print, and to text for the evidence package. Builders take a sealed
record and return a `RenderedDocument`. Keep them pure: the same record must always produce the same
document, or the package hash means nothing.

---

## 8. What is NOT built

Build order steps **1–10 are complete**. The instruction was to stop after step 10 and show the
dashboard before proceeding, so **steps 11–14 were not started.**

### Step 11 — registers (do these first)

- **Withheld-approval register.** Every session where approval was not granted, and why. Small
  feature, disproportionate value: it is the cleanest rebuttal to an approval-only characterisation.
  Everything it needs is already on the record (`approval.granted`, `approval.withheldReason`). It is
  a query plus a document builder, not new logic. **Blocked only by persistence** — there is nothing
  to query across yet.
- **Audit sampling pack.** Deterministic selection of N completed sessions plus a reviewer worksheet.
  Must be deterministic and seeded, so a reviewer can reproduce the selection. Same blocker.

### Step 12 — PWA, then Tauri

The presenter surface is designed for a tablet and should be installable and offline-tolerant. The
inspector side benefits from a native window and screen capture.

### Step 13 — billing scaffold

`VITE_FEATURE_BILLING`, default off. Tiers: single inspector, site, multi-site/consultant. Prices from
config — none are set.

### Step 14 — remaining docs

Root documents are written. The rest follows the steps above.

### Independent gaps, not tied to a step

| Gap | Notes |
|---|---|
| **Persistence** | Nothing is stored. Sessions live in component state. Dexie is a dependency; no store is wired. **This blocks step 11.** |
| **Real video provider** | Stub only. No provider chosen. |
| **Headless PDF** | PDF today is produced by printing the rendered HTML — which has the real advantage that a recipient's copy is identical to what the inspector approved on screen. A server-side generator using `pdf-lib` is outstanding. |
| **Playwright** | Listed in the stack, not written. The cockpit was driven through a full session by hand and behaves correctly; that walkthrough is not scripted. |
| **Nonconformance UI** | The reducer, schema and document builder all handle nonconformances; the cockpit has no button to raise one. `RAISE_NONCONFORMANCE` is implemented and tested. |
| **Designated representative** | Role and capability exist and are configurable; no UI surface uses it. |
| **Demo seed** | The cockpit opens on a fictional session from `src/ui/session/demoSession.ts`. A deployment replaces that with a session loaded from storage; nothing else changes. |

---

## 9. Decisions still open — owner's call, not the developer's

1. **Video and recording provider.** Cost and data-residency implications.
2. **Recording storage target and retention architecture.** The app writes to a customer-configured
   target and deliberately has no vendor-cloud default.
3. **Persistence architecture.** See §7 and §8.
4. **Pricing and tiers.**
5. **Product name.** The remote repository name and this directory's name differ — worth reconciling
   before more people clone it.
6. **Licence text** is proprietary, all rights reserved. Terms of sale and end-user disclaimers still
   need legal review before any distribution.
7. **Commit identity.** The identifier gate scans patch *content*, not commit metadata. Author name
   and email are git plumbing, and the owner's identity being there is expected while the repository
   is theirs — it is not appropriate in a repository handed to an acquirer. Decide before it changes
   hands whether history is rewritten with a scrub-safe identity.

### Three regulatory items to verify — not the developer's call either

1. **Every citation** in `REGULATORY-SOURCES.md` is flagged UNVERIFIED. Nothing has been checked
   against a controlled copy at current revision.
2. **The retention-floor citation is the most likely error in the specification.** The ten-year floor
   is attributed to 14 CFR 145.213; the build could not verify that attribution. Part 145's
   recordkeeping obligation is generally understood to sit in §145.219 and to run a shorter period,
   with longer retention typically arising from customer contract or quality-system policy. **The
   engine is unaffected** — retention is a configurable floor, adjustable upward only. Only the
   displayed basis string depends on the answer: `RETENTION_FLOOR_BASIS` in `src/schema/config.ts`.
3. **Two conservative interpretation decisions** the build made, both recorded in
   `REGULATORY-SOURCES.md` rather than buried in code: propellers are treated as complete products
   (14 CFR 21.1 defines a product as an aircraft, aircraft engine, or propeller), and the
   complete-product block asserts nothing about legality — it records that the operator classified
   the article, that the class sits inside the contract-maintenance restriction, and that the
   configured policy is to stop.

---

## 10. Traps that have already cost time

Each of these was a live defect during the build. They are all fixed and all have tests; this list
exists so they are not re-introduced.

| Trap | What happened | Guard |
|---|---|---|
| **Dashboard in the production bundle** | A bare `lazy(() => import(...))` at module scope stays statically reachable, so the dashboard shipped as its own 108 KB chunk — unroutable, but present. Wrapping the `lazy()` call in the build flag took the bundle from 73 modules to 46. | CI checks for the chunk **and** the route string. |
| **`BroadcastChannel` closed under StrictMode** | The channel was memoised; StrictMode's first effect cleanup closed it, and the next post threw on a closed channel, taking the cockpit down. | `useSessionChannel` owns it in an effect and returns a stable no-op-if-closed `post`. |
| **Tailwind resolving config against the working directory** | Launching the dev server from a different directory silently produced an unstyled page. | `tailwind.config.js` and `postcss.config.js` anchor to their own file location. |
| **Scrub rule ids tripping their own rules** | See §6. | Test: no rule id trips any rule. |
| **History scan ignoring the content exclusion** | It flattened each commit into one blob, losing the file path, so the gate's own fixtures failed it once committed. | Path tracked per hunk; test asserts both scans agree. |
| **Contrast in the dim end of the ramp** | Adding light mode surfaced that the *dark* theme's dimmest text token had been below 3:1 against a panel all along. | Test computes contrast for every text token against both dominant surfaces in both themes, and asserts the ramp stays ordered. |

---

## 11. Before you ship anything

```bash
npm run verify
```

That is typecheck + 225 tests + both gates. Then:

- [ ] If you touched `src/engine/`, the change is still pure — no clock, no I/O, no randomness. The
      determinism panel and its tests will catch it, but know why.
- [ ] If you added an eligibility rule, it is marked `SPEC` or `BUILD` honestly.
- [ ] If you added user-facing text, it draws no regulatory conclusion. Gate 2 catches the obvious
      forms; it cannot catch a paraphrase.
- [ ] If you added an allow-marker, you updated the test that enumerates them.
- [ ] If you touched the UI, you looked at it in **both** themes.
- [ ] `npm run scrub:history` passes, and `SCRUB_DENYLIST` was set when you ran it.
- [ ] Commits go to `main`. No branches exist on either side and none should be created.

**The `SCRUB_DENYLIST` secret was not set at the time of the first push**, so CI's identifier gate is
currently running without name-based coverage. Structured identifiers are still gated. Setting it is
the first housekeeping job.

---

## 12. The one thing to protect

The thesis in §1. This passes its architectural gate today because it is an evidence engine that
happens to use video. It is lost the moment a feature is added because it improves the call rather
than the record. Say so in review when you see it.
