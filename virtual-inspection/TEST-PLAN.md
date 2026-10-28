# Test plan

Three layers, each answering a different question.

| Layer | Question it answers | How to run |
|---|---|---|
| CI gates | Does the repository carry anything it must not, and does the product draw a conclusion it must not? | `npm run scrub:history` |
| Unit tests | Does the decision logic behave as specified, at every branch? | `npm run test` |
| Test dashboard | Can someone who does not read TypeScript see the guarantees hold? | `npm run dev` → `/dev/test-dashboard` |

`npm run verify` runs the first two together with a typecheck.

**Current state: 204 unit tests passing, typecheck clean, both gates clean, all twelve dashboard
panels rendering with every assertion panel passing.**

---

## Layer 1 — the CI gates

Written before any feature code, per build order step 1.

### Clean-room identifier scrub — 18 rules

Proved three ways, so no rule is decorative:

1. **Every rule fires on a synthetic sample.** `tests/fixtures/scrub/samples.json` holds one
   fictional sample per rule; a test asserts the sample set and the rule set match exactly, so a new
   rule without a sample fails CI.
2. **Clean product prose produces nothing.** A gate that cries wolf gets switched off.
3. **The repository itself is clean**, and with `--history` so is the content of every commit.

Two self-reference traps are tested for explicitly, because both were live bugs during the build:

- **No rule's pattern source matches itself.** The scanner reads the whole repository including the
  rule files; a rule matching its own definition makes the gate unusable.
- **No rule id trips any rule.** Two ids originally contained the words their own patterns banned,
  so every mention of the id — in the rule file, a finding, a log line, a dashboard panel — was a
  violation. They were renamed.

Findings print **redacted**. CI logs and tickets get a signpost, never a copy of the string.

**The one content exclusion** is `tests/fixtures/scrub/`, pinned by a test to exactly that path so it
cannot quietly widen into a hiding place.

**What the gate does not cover, and says so:** commit metadata (author name and email are git
plumbing — see `HANDOVER.md`), and paraphrase. Without an owner-supplied denylist the gate prints
`NOT SUPPLIED - name-based terms are not covered on this run` rather than a clean pass.

### Opinion language — 10 rules

Same three-way proof. A line may opt out with an inline `SCRUB-ALLOW: <rule-id>` marker; **every
marker in the tree is enumerated by a test**, so opt-outs cannot accumulate unnoticed. There are
three: one recording the prohibited citation in `REGULATORY-SOURCES.md`, two inside the gate's own
tests.

This gate caught its own documentation during the build — the paragraph in `DESIGN-NOTES.md`
explaining the rule was written using the banned phrasing and failed CI. That is the intended
behaviour, and it is noted there.

---

## Layer 2 — unit tests

`tests/engine/`, 204 tests. The engine is pure, so every test is a plain input-output assertion with
no fixtures to stand up and no clock to freeze.

| File | What it pins down |
|---|---|
| `hash.test.ts` | Published SHA-256 vectors, including one that forces a second block. Canonical JSON: key order cannot change a hash, array order can, non-canonicalisable values throw rather than hashing something else. |
| `roles.test.ts` | **The assertion**: the presenter's determination-capability set is empty. Also that every declared capability is granted somewhere, and that a caller mutating the returned set cannot widen the matrix. |
| `eligibility.test.ts` | Every block and every warning, fired and not fired. Boundary dates (training current *through* its last day; a tool in calibration *on* its due date). That a block outranks a warning. That the complete-product rationale asserts nothing about what a regulation permits. Determinism over 100 runs. |
| `controls.test.ts` | Each control satisfied, blocked, and overridden. Whitespace is not a reason. Window boundaries are inclusive. An override is not recorded when the control passed anyway. Every blocking control is reported, not only the first. That no obstacle message ever suggests what the determination should be. |
| `interruption.test.ts` | Approval unavailable on interruption, on an unresolved recovery, and after resuming until every affected check is re-verified. All three terminal paths permanently non-approving even with a retained recording and every check re-verified. Recording failure reported ahead of everything else. Resolving does not mutate its input. |
| `defensibility.test.ts` | Each of the eight elements present, absent and not-applicable. That the report never grades — asserted by matching the output against a list of judgement words. The case that matters most: approval granted while conformity was incomplete marks the element **absent**. |
| `retention.test.ts` | The floor refuses rather than clamps. 29 February plus one year lands on 28 February, because rolling into March would destroy a record a day early. |
| `rosters.test.ts` | A record stamped at an earlier revision still resolves the person who has since been removed. A missing revision throws rather than falling back to the latest. |
| `record.test.ts` | Deep-freeze mutation throws at every level. Field assembly order cannot change a hash. A withheld approval cannot be sealed without a reason. A revision names what it supersedes and leaves the original verifiable. A tampered record cannot be revised. |
| `scenarios.test.ts` | Every scenario behaves as its own description claims, so a scenario cannot drift into misreporting on a dashboard nobody is watching. |

---

## Layer 3 — the test dashboard

`/dev/test-dashboard`, development and staging only. Each panel states what it proves.

| # | Panel | Proves |
|---|---|---|
| 1 | Scenario runner | All 19 fictional scenarios run end to end through the real engine. |
| 2 | Eligibility gate inspector | Every rule evaluated on every input, fired or not, with the reason it exists beside what it observed. Rules the build added are marked `BUILD` rather than passed off as specified. |
| 3 | Role capability matrix | The presenter's determination set is provably empty. |
| 4 | Determinism check | Four functions, byte-identical over 100 runs each. |
| 5 | Immutability check | Mutation throws at top level and nested; a reconstructed record fails its hash; a correction supersedes without touching the original. |
| 6 | Interruption simulator | Kills the stream through the provider's real degradation path. Resuming alone does **not** restore approval — only re-verification does. |
| 7 | Recording-failure test | `RECORDING_FAILED` blocks the session standing as the sole conformity record. |
| 8 | Defensibility scorer | Element-by-element breakdown for any scenario, with the disclaimer alongside. |
| 9 | Evidence package preview | The full export as a recipient receives it, re-verified from its own hashes. |
| 10 | Roster versioning test | A record stamped at revision 1 still resolves a person removed at revision 2. |
| 11 | Clean-room scrub audit | The 18 identifier rules against everything the build **emits** — 57 artefacts including rendered documents and sealed records. |
| 12 | Opinion-language audit | The 10 opinion rules against the same 57 artefacts. |

**Panels 11 and 12 are not a duplicate of the CI gates.** CI scans the source tree and commit
history. These scan the *output*: a string assembled at runtime from three innocent fragments is
still an identifier by the time a regulator reads it, and a source grep cannot see it.

### Production exclusion, verified two ways

`VITE_ENABLE_TEST_DASHBOARD` is compiled off for production. CI checks both that the route string is
absent **and that no dashboard chunk was emitted** — a lazy import left statically reachable still
ships the code as its own chunk, unroutable but present. That was a live defect during the build; the
production bundle went from 73 modules to 46 once the build flag wrapped the `lazy()` call itself.

---

## What has been exercised by hand

The inspector cockpit was driven through a full session in the browser:

- Pre-session checks measured the stream through the provider adapter, attestations recorded, session
  started, recording started.
- A key-characteristic check **refused** a determination until camera angles and supplementary
  lighting were recorded, with both obstacles shown in the inspector's own words and the
  determination controls disabled.
- All six checks determined, a manipulation directed and logged, a document captured.
- Session ended, recording retained with a content hash, approval available, approval granted.
- Final position: 6 of 6 applicable evidence elements captured.

The interruption simulator was driven through kill → resume → re-verify and confirmed that approval
stays unavailable in the middle state.

---

## Not yet covered

- **Playwright end-to-end tests.** Listed in the stack; the browser walkthrough above was performed
  by hand rather than scripted. The cockpit flow is stable enough to script now.
- **A headless PDF generator.** PDF today is produced by printing the rendered HTML, which keeps what
  a recipient receives identical to what the inspector approved on screen. A server-side generator is
  outstanding — see `HANDOVER.md`.
- **Persistence.** Sessions live in component state; Dexie is a dependency but no store is wired.
- **Steps 11 to 14 of the build order**, which were deliberately not started pending sign-off.
