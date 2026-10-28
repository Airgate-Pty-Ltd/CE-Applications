# Design Notes

Answers to the architectural gate, written before any feature code, plus the
decisions that follow from them.

---

## 1. The architectural gate

| Signal | Assessment | Verdict held? |
|---|---|---|
| Eliminates work rather than digitizing it | Pass | Yes |
| Deterministic, rules-based intelligence | Pass | Yes |
| Human role is decision-only | Partial | Yes — and this is correct, not a shortfall |
| Output is a decision and a record, not a dashboard | Pass | Yes |
| No direct enterprise equivalent | Partial | Yes — narrowed below |
| Static form as primary input | **Risk** | **Mitigated structurally, not aspirationally** |

The first four rows are accepted as stated. The last two are addressed below,
as required.

---

## 2. Row 3 — "Human role is decision-only": Partial, and that is the right answer

The inspector still opens the box. No software eliminates the physical act of
verifying that a connector is undamaged or that a closed assembly does not
rattle. Any product claiming otherwise is lying about what it does.

The claim this product actually makes is narrower and defensible:

> The app decides **what must be checked**, **what evidence is required**, and
> **what happens next**. The human contributes observation and judgement. The
> app contributes determination and record.

That division is stable. It does not degrade as the product matures, and it
does not depend on the inspector's diligence to hold.

---

## 3. Row 5 — "No direct enterprise equivalent": Partial. Where the line actually falls

ERP receiving modules exist and are widespread. Claiming a green field here
would not survive a first sales conversation. Three things distinguish this
product, and only the first is a feature — the other two are architecture.

**3.1 It routes on release-document type.** ERP receiving inspection is
configured per part, per supplier, or per inspection plan. It does not ask
*what document released this article* and change the inspection path on the
answer. An article on an FAA Form 8130-3 and an article on a Certificate of
Conformance alone are different regulatory situations requiring different
treatment, and the escalation triggers (first article, open corrective action,
key characteristics, supplier probation, configuration change) cut across the
part/supplier configuration an ERP indexes on.

**3.2 It refuses.** An ERP receiving module records what the user enters. This
app declines to proceed: it will not start an inspection against incomplete
documentation, will not accept a measurement from an out-of-calibration tool,
and will not produce a signed record with an unresolved mandatory field. The
refusals are in the engine, not the UI — they cannot be clicked past, and they
are what a customer is actually buying.

**3.3 It is a client, not a system of record.** Records are written to the
customer's own repository, under the customer's retention policy, in their
tenant. An ERP module puts the record inside the ERP. That is a different
commercial proposition: this product does not ask the customer to migrate, and
it does not hold their records hostage.

**Honest limitation:** where a customer already runs a configured aerospace ERP
receiving module *and* has disciplined document control, the incremental value
is 3.2 alone. That is a real segment and this product should not be sold into
it on breadth. It should be sold on the calibration block and the routing.

---

## 4. Row 6 — "Static form as primary input": the risk that would kill this product

**The failure mode, stated plainly.** The app degrades into a digital form. It
renders a fixed checklist, the inspector types whatever they observe, the app
records it faithfully, and it has become a clipboard with a database. Every
claim in section 3 evaporates, because a form that records anything cannot
refuse anything.

This is not a hypothetical. It is the default outcome, because a fixed
checklist is easier to build, easier to demo, and easier for a customer to
understand. The drift happens one reasonable concession at a time.

**Mitigation must be structural.** A design principle in a document does not
survive schedule pressure. Four enforced invariants:

**4.1 No screen renders "the checklist".** There is no fixed check list in the
UI layer. The router emits the required check set from the receipt, and the UI
renders the next unanswered check from that set. A developer cannot add a check
to a screen — checks exist only in versioned content packs, selected by
applicability expressions the engine evaluates. Adding a hardcoded field to a
screen is the thing to catch in review.

**4.2 The decision trace is part of the record, not a log.** The record carries
which rules fired, in order, and why the path and sample size are what they
are. A form has answers; this has answers plus the derivation. Dashboard panel
2 exists to make that trace visible, and it is a deliverable precisely because
an invisible trace rots.

**4.3 The reproducibility invariant — the actual guard.** For any signed
record, re-running the router against the receipt as it stood must reproduce
the record's check set exactly. Enforced as a test, not a convention:

> A signed record whose check set cannot be regenerated by the router is
> invalid. If a check reached the record without the router putting it there,
> the product has degraded into a form and the test fails.

This is the single assertion that makes the difference structural. It cannot be
satisfied by a screen that collects arbitrary input, and it will fail loudly the
first time someone adds one. It runs in CI and surfaces on dashboard panel 3.

**4.4 A failed check is an object, not a text box.** An inspector who cannot
pass a check does not write a note — they produce a deviation that routes
deterministically to a nonconformance with a disposition chain. Free text is
evidence attached to a decision, never a substitute for one.

**If these four cannot be held, the product has failed the gate** and should be
re-scoped rather than shipped as a form with a router bolted on.

---

## 5. Decisions that follow

**5.1 No LLM in any determination.** Paths, sampling, applicability,
dispositions, and gates are pure functions over data. A model that is right 99%
of the time is not usable in a record that certificated personnel sign. Pure,
no I/O, 100% branch coverage on `src/engine/`, enforced in CI.

**5.2 Immutability by revision chain.** A signed record is never edited. A
correction is a new revision referencing its predecessor. This is the reason
genuine sync conflicts are rare by design: two devices cannot disagree about an
immutable object.

**5.3 Persistence before interface.** Storage adapter, sync queue, and locking
are built before the UI. In an app that must survive a dropped connection
mid-inspection, persistence *is* the architecture. Retrofitting it under a
finished interface means rewriting every write path.

**5.4 The adapter seam is a commercial decision, not a technical one.** A
hardcoded SharePoint call sells to one customer and makes the asset harder to
resell. The contract test suite is the definition of a valid adapter: anything
that passes it is a supported provider.

**5.5 Retention floor is enforced, not advised.** Configurable upward, never
below the regulatory floor for the selected operating basis. The app validates
the repository's own retention label and warns when it is short.

---

## 6. Where I declined to guess

**6.1 The sampling table — an instruction conflict, resolved conservatively.**
§2.1 says to ship a default sampling table; §9 says not to invent an AQL
scheme. Both cannot hold. Resolution:

- The table **structure**, loader, validation, and the router's use of it are
  built in full.
- The shipped default file is **explicitly unconfigured**. It contains no
  invented sample sizes.
- A receipt routed to `SAMPLE_INSPECTION` against an unconfigured table returns
  a blocking outcome — `SAMPLING_TABLE_NOT_CONFIGURED` — naming what is missing.
  It does not fall back to a guess.

An invented AQL scheme is worse than a missing one: it looks authoritative,
gets used, and produces defective sample sizes on real receipts. **Owner action:
supply the values.**

**6.2 Regulatory citations are marked unverified** until checked against
controlled copies. Tracked in `REGULATORY-SOURCES.md` with revision and date.

**6.3 Open items from §9** — pilot tenant and library, Entra app registration
ownership, folder/metadata convention, single- vs multi-site, pricing and tier
boundaries, staging deploy timing, and the product name. None block the build
order through step 11.

---

## 7. Clean-room

The logic derives from procedures the owner authored and owns. The controlled
document instances, employer and site identifiers, personal names, third-party
system names, and brand names do not appear in this repository.

The gate is `scripts/scrub-check.sh`, run from `.husky/pre-commit` before a
commit object exists and again in CI across the full history. Two design points
worth stating, because both are easy to get wrong:

- **A gate cannot contain the literals it rejects.** Structural patterns are
  written with one character bracketed, so the regex matches the identifier
  while the literal never exists on disk.
- **Names cannot be expressed structurally**, so they live in an owner-supplied
  denylist that is permanently git-ignored. Committing it would defeat the
  control it enforces.

Verified by deliberate breach before the first commit: a staged file carrying an
internal document number, an employer name, and a third-party system name was
rejected and no commit object was created.
