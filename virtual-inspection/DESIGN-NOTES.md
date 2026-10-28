# Design notes

Written before the feature code, per section 6 of the build prompt.

---

## The thesis, restated so it can be checked against

Remote inspection is legal. What gets operators in trouble is not the camera — it is failing to
prove that substantive inspection actually occurred.

The specific exposure is that a regulator characterises the arrangement as the inspecting
organisation providing *only* approval for return to service while someone else did the real work.
That characterisation is defeated by evidence and only by evidence.

**So this is an evidence engine, not a video tool.** It must be impossible to complete a session
without producing the record set. The video is incidental; the defensible record is the product.

### The drift test

The build prompt asks the builder to say so if the product starts drifting into a video tool with a
checklist bolted on. Three questions catch it, and they are the standing review test:

1. **Does the video provider know anything the record does not?** If the answer is ever yes, the
   record is a by-product of the call instead of the other way round. Today the provider adapter
   returns measurements and a recording handle; every determination lives in the engine.
2. **Could the evidence package be assembled if the video vendor were replaced tomorrow?** It must
   be. That is why `src/video/provider.ts` is an interface with a stub behind it, and why the
   recording appears on the record as a reference plus a content hash rather than as an embed.
3. **Does a feature strengthen the evidence package?** If not, it is not in v1.

---

## Section 6 gate — answered

| Signal | Assessment | Where it shows up in the build |
|---|---|---|
| Eliminates work rather than digitizing it | **Pass** | Removes inspector travel outright. The defence package is produced as a by-product of running the session, not as a separate write-up afterwards. |
| Deterministic, rules-based | **Pass** | `src/engine/` is pure functions with no I/O and no clock. Eligibility, controls, interruption, retention and scoring are all decision logic. No model is consulted for any determination. |
| No direct enterprise equivalent | **Pass** | Video platforms do not enforce inspection controls. QMS platforms do not run live sessions. The overlap is empty in both directions. |
| Human role is decision-only | **Pass** | The inspector decides. The software captures, enforces and refuses. It never determines conformity and never proposes a determination. |
| Output is a decision and defensible evidence | **Pass** | Session conformity record, authority conformity inspection record, evidence package, nonconformance record, withheld-approval register. |
| Static form as primary input | **Low risk** | The input is a live session. Forms exist only as outputs. |

**The thing to protect in review is the thesis, not the feature list.** The gate is passed today; it
is lost the moment a feature is added because it improves the call rather than the record.

---

## Two gates

Both are CI-failing tests, written before any feature code (build order step 1).

### Gate 1 — the clean-room identifier scrub (section 1.1)

`tools/scrub/` scans every text file in the tree, and with `--history` every added and removed line
of every commit. Findings are printed **redacted**: CI logs and tickets get a signpost, never a copy
of the string the gate exists to keep out.

Structured identifiers are caught by pattern — controlled document numbering, certificate-number
shape, mailboxes, telephone numbers, postal addresses, named field offices, honorific-plus-surname,
and the cancelled notice number.

#### Why the denylist lives outside the repository

Company names, people's names, third-party ERP/QMS/MES product names and specific product lines
cannot be expressed as a pattern. The obvious implementation — a list of forbidden names checked
into the repo — **is itself the violation**. A file listing the names that must not appear is a file
containing the names.

Hashing them is not a fix either. These are short, guessable strings; a hash of a seven-letter
company name is recoverable by anyone who thinks to try, and shipping it would be security theatre
in a repository whose entire premise is that identifiers are absent.

So the denylist is owner-held and never committed:

- `SCRUB_DENYLIST=/path/to/list` in CI, from a repository secret, or
- `tools/scrub/denylist.local.txt`, which `.gitignore` refuses to track.

Terms match across separator styles, so one entry catches prose, `kebab-case` and `snake_case`
alike, and word boundaries stop a short term matching inside a longer word.

**The gate states its own limits.** With no denylist supplied it prints
`NOT SUPPLIED - name-based terms are not covered on this run` rather than a clean pass. A gate that
implies coverage it does not have is worse than no gate.

#### What the gate does not cover

- **Commit metadata.** Only patch *content* is scanned. Author name, author email and committer
  identity are git plumbing, and the owner's own identity is expected there. Deciding what commit
  identity this repository carries before it changes hands is an owner action — see `HANDOVER.md`.
- **Paraphrase.** An identifier spelled out in a sentence rather than written as a name will pass.
  The gate is a floor, not a substitute for reading the diff.

#### The one exclusion

`tests/fixtures/scrub/` holds synthetic strings shaped like the things the gate catches, so scanning
it would guarantee a finding on every run. A test pins the exclusion list to exactly that path, so it
cannot quietly widen into a hiding place.

### Gate 2 — opinion language (section 1.2)

The app may quote regulatory text and may state what evidence it captured. It may not conclude that
a user, a configuration, or a session has achieved a regulatory state.

Ten patterns, each with a rationale that prints alongside the finding. A line may opt out with an
inline `SCRUB-ALLOW: <rule-id>` marker; every marker in the tree is enumerated by a test, so opt-outs
cannot accumulate unnoticed. There are three today: one recording the prohibited citation, two inside
the gate's own tests.

#### The consequence this had on the product's vocabulary

Banning the requirement-has-been-met phrasing (rule `opinion-meets-the-requirement`) forced a decision
about how an inspector's determination is worded — and the first draft of this very paragraph tripped
the gate, which is the best evidence that it works. The answer: article-level determinations use
**CONFORMS / DOES_NOT_CONFORM / NOT_VERIFIED**
throughout. That is narrower and more accurate anyway — an inspector determines conformity of an
article against a defined characteristic. They do not adjudicate a regulation. The gate pushed the
domain language somewhere better.

#### A trap worth recording

Two rule *ids* originally contained the words their own patterns banned, so every mention of the id —
in the rule file, in a finding, in a log line, in a dashboard panel — was a violation. They are now
named for what they describe (`opinion-compliance-state`, `opinion-authority-endorsement`) and a test
asserts no rule id trips any rule. The same class of bug applies to pattern sources; there is a test
for that too.

---

## Determinations the engine makes, and the ones it refuses to make

**It determines:** whether a session may be scheduled; whether a control threshold was met; whether a
role holds a capability; what state an interrupted session is in and whether approval is available
from it; which evidence elements a session captured; when retention expires.

**It refuses:** whether an article conforms — that is the inspector's, always; whether an
arrangement answers a regulation; whether a record will satisfy anyone.

The defensibility score is the sharpest edge here. It reports "captured 6 of 8 applicable evidence
elements; not captured: X, Y" and stops. It never grades, never says adequate, never implies a
threshold has regulatory meaning. Customers set their own review threshold and pull everything below
it — that is the point of it.

---

## Structural choices

### The presenter has nothing, structurally

The role model is enforced by capability, not by label. `DETERMINATION_CAPABILITIES` and the
presenter's capability set have an empty intersection, asserted by a test and rendered by dashboard
panel 3. The presenter UI does not render determination controls **because there is no capability to
render them from** — not because a flag is switched off. A disabled button is a policy. An absent
capability is a structure.

This is why the presenter side ships in v1. If the presenter simply joins a generic call, the
guarantee degrades to a promise in a manual, and directed-manipulation logging depends on the
inspector transcribing what someone else did.

### Rosters are versioned; records resolve to the version in force

Authorised personnel and authorised locations are append-only revisions. A session record captures
the revision number in force at its start. When someone leaves or currency lapses, the roster
increments — and a record written two years ago still resolves to the roster as it stood that day.
Reconstructing who was authorised on the day is exactly what a regulator asks for.

### Recording failure is a terminal state, not a warning

If recording fails, the session is marked `RECORDING_FAILED` and **cannot stand as the sole
conformity record**. Enforced in code, not in a manual. The session must be re-performed or escalated.

### Interruption invalidates approval, and the recovery path is on the record

Any degradation moves the session to `INTERRUPTED` and blocks approval immediately. The inspector
picks one of four recoveries. Only *resume and re-verify* can restore approval, and only once every
affected check has actually been re-verified — the other three terminate the session as
non-approving, permanently.

A demonstrable record of **withheld** approvals is direct evidence against an approval-only
characterisation. That is why the withheld-approval register is a first-class output despite being a
small feature.

### Live only

There is no file-upload path for conformity evidence anywhere in the product. Not a disabled one —
absent. Pre-recorded material cannot become the basis of a determination because there is nowhere to
put it.

### Data residency: customer-controlled by default

Session recordings of aerospace articles may carry export-control and customer-confidentiality
obligations. The app writes recordings to a storage target **the customer configures**. It does not
default to the vendor's cloud. This is a deliberate decision with a commercial cost — it makes
onboarding harder and rules out a zero-config trial — and it is taken anyway, because a customer
whose recordings sit in someone else's bucket has swapped one exposure for another.

### The video provider is behind an adapter

`src/video/provider.ts` is an interface. A stub implementation drives the tests and the dashboard. No
provider has been selected; an acquirer may have their own. The recording surfaces on the record as a
durable reference plus a content hash, never as a vendor-specific embed.

---

## Open decisions

Recorded here so they do not become defaults by accident. Owner's call, all of them.

1. Video and recording provider — cost and data-residency implications.
2. Recording storage target and retention architecture.
3. Pricing and tiers. `VITE_FEATURE_BILLING` is off; prices come from config and none are set.
4. GitHub org and product name. The repository name is fixed; the product name is a configured
   display string with a neutral default.
5. The retention-floor citation — see `REGULATORY-SOURCES.md`, decision 3.
