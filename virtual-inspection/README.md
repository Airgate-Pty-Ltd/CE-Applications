# Remote inspection

**An evidence engine, not a video-calling tool.**

Remote inspection is legal. What gets operators in trouble is not the camera — it is failing to
prove that substantive inspection actually occurred. The specific exposure is that a regulator
characterises the arrangement as the inspecting organisation providing *only* approval for return to
service while someone else did the real work. That characterisation is defeated by evidence, and
only by evidence.

So this product's job is to make it impossible to complete a session without simultaneously
producing the record set that shows the inspection was substantive: live directed inspection,
physical manipulation carried out under the inspector's direction, documents reviewed on screen,
tools used and their calibration position, nonconformances actually raised, and approvals actually
withheld where conformity could not be verified.

The video is incidental. The defensible record is the product.

**This software produces records and surfaces risks. It does not determine, advise, or represent
whether any organisation, arrangement, article, or session answers any obligation of any authority.**
That is enforced by a CI gate over the source text, not just promised here.

---

## Running it

```bash
npm install
npm run dev
```

| Route | Surface |
|---|---|
| `/inspector` | The cockpit — video, checklist, evidence log, approval position, interruption recovery. |
| `/presenter` | Tablet or phone on a shop floor — camera, one instruction in large type, one button. |
| `/dev/test-dashboard` | Twelve panels, each stating what it proves. Development and staging only. |

Open the inspector and the presenter in two windows: the inspector's current instruction appears on
the presenter surface, and the presenter's problem flag comes back.

```bash
npm run verify   # typecheck + unit tests + both CI gates
npm run test     # unit tests only
npm run scrub    # clean-room and opinion-language gates over the working tree
npm run scrub:history   # ...and over the content of every commit
```

---

## How it is built

```
src/
  engine/       pure decision logic — no I/O, no clock, no model
    eligibility.ts   hard blocks and warnings, evaluated before scheduling
    controls.ts      session control enforcement
    roles.ts         the capability matrix
    interruption.ts  the degradation state machine
    defensibility.ts the evidence-completeness report
    retention.ts     the retention floor
    rosters.ts       versioned roster resolution
    record.ts        sealing, hashing, revision chains
    hash.ts          pure SHA-256 and canonical JSON
  video/        provider adapter (interface + stub). No provider selected yet.
  content/      check packs as versioned data
  documents/    session record, authority record, evidence package
  schema/       zod schemas and inferred types
  ui/inspector/ the cockpit
  ui/presenter/ the presenter surface
  fixtures/     fictional data, shared by the tests and the dashboard
  dev/          the test dashboard
tools/scrub/    the two CI gates
```

**Everything in `src/engine/` is a pure function.** `now` is an input, never read from the clock.
That is what makes the determinism panel meaningful and what keeps a record reproducible years later.

**No model participates in any determination.** Eligibility, controls, interruption handling,
scoring and retention are decision logic all the way down.

---

## The parts worth knowing before you read the code

### The presenter holds nothing, structurally

The role model is enforced by capability, not by label. The presenter's determination-capability set
and the set of determination capabilities have an empty intersection — asserted by a test, rendered
by dashboard panel 3. The presenter UI does not render determination controls **because there is no
capability to render them from**. A disabled button is a policy; an absent capability is a structure.

### Live only

There is no file-upload path for conformity evidence anywhere in the product. Not a disabled one —
absent. Look at `src/video/provider.ts`: the interface has no import, attach or ingest method.

### A degraded session cannot release an article

Any interruption blocks approval immediately. The inspector picks one of four recovery paths; only
*resume and re-verify* can restore approval, and only once every affected check has actually been
re-verified. The other three terminate the session as non-approving, permanently. Recording failure
is terminal on its own: the session cannot stand as the sole conformity record.

### Rosters are versioned

Authorised personnel and locations are append-only revisions. Each record captures the revision in
force at its session. A record written years ago still resolves to the roster as it stood that day —
which is exactly what an authority asks for.

### The defensibility report is descriptive, never a verdict

It says "this session captured 6 of 8 applicable evidence elements; not captured: X, Y" and stops.
It does not grade, does not call a score adequate, and does not imply a threshold carries regulatory
meaning. Customers set their own review threshold and remediate everything below it.

### Light and dark are both first-class

Colours are semantic tokens (`bg-surface-panel`, `text-content-muted`) backed by CSS custom
properties, so no component states which theme it is in. Light / Dark / System, remembered, applied
before first paint so there is no flash on load.

This is not decoration. The presenter surface is a tablet held on a shop floor under bright light,
where a black screen is the wrong answer; the inspector cockpit is a desk, often dim, with the video
meant to be the brightest thing in view. The video well stays dark in both themes on purpose — a
bright surround changes how a picture reads, and the picture is what is being judged.

A test asserts every token exists in both themes and that every text token clears 3:1 against both
dominant surfaces. Adding the light theme is what surfaced that the dim end of the *dark* ramp had
been below that line all along; both were corrected together.

### Data residency is customer-controlled by default

Session recordings of aerospace articles may carry export-control and customer-confidentiality
obligations. **The app writes recordings to a storage target the customer configures. It does not
default to a vendor cloud.** This is a deliberate decision with a commercial cost — it rules out a
zero-config trial — and it is taken anyway. See `DESIGN-NOTES.md`.

### Two CI gates, both failing tests written before any feature code

1. **Clean-room identifier scrub** — no real-world identifier may appear in the repository or in the
   content of any commit. Findings print redacted, so CI logs never re-publish the string the gate
   exists to keep out. The denylist of company, person and third-party product names is owner-held
   and never committed; a file listing the names that must not appear would itself be the violation.
2. **Opinion language** — the product may not conclude that a user, a configuration, or a session
   has achieved a regulatory state.

Both are described in full in `DESIGN-NOTES.md`.

---

## Where to look next

| Document | What it holds |
|---|---|
| `DESIGN-NOTES.md` | The thesis, the architectural gate answered, and every structural decision with its reasoning. |
| `REGULATORY-SOURCES.md` | The authority this is built against, and three interpretation decisions flagged for owner verification. |
| `TEST-PLAN.md` | What is tested, at which layer, and what each dashboard panel proves. |
| `HANDOVER.md` | **Start here if you are picking this up.** How a session works step by step, the module map, how to extend it, everything not built, and the traps that have already cost time once. |

---

## A note on `node_modules` and OneDrive

This repository lives inside a OneDrive-synced folder. `node_modules` is git-ignored but OneDrive
will still sync it, which is thousands of files moving for no benefit. Either exclude the folder in
OneDrive's settings, or move the repository outside the synced tree and use git as the sync path
between machines.

---

© 2026 Conform-Edge Quality Consulting LLC. All rights reserved. See `LICENSE`.
