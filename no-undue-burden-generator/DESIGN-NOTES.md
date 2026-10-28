# Design notes

Answers to the architectural gate, plus the decisions that are not obvious from
reading the code.

---

## 1. The architectural gate

| Signal | Assessment | Where it is true in the code |
|---|---|---|
| Eliminates work rather than digitizing it | **Pass** | Replaces a consultant drafting engagement. The output is a submission-formatted document plus a go/no-go verdict, not a form the user still has to turn into a filing. |
| Intelligence is deterministic and rules-based | **Pass** | `src/engine/` is pure functions. No clock, no randomness, no network, no LLM. 100% branch coverage, enforced in CI. A determinism test runs each scenario 100 times and asserts byte-identical output. |
| Human role is decision-only | **Pass** | The user supplies facts and approves. The software drafts, validates and refuses. It never asserts CPL status and never fills the FAA Validation column. |
| No direct enterprise software equivalent | **Pass** | Market scan found no competing tool. Unverified claim — see `REGULATORY-SOURCES.md`. |
| Output is a decision, not a dashboard | **Pass** | Emits the AC 21-55 Appendix A document, a gap report, and a routing verdict (full plan vs initial notification). |
| Static forms as primary input | **Risk — mitigated, see below** | |

### The forms risk, addressed

The concern is real: a filing tool decays into a long static form that collects
answers and pronounces at the end. The mitigation is behavioural, and it is
verified by the UI smoke tests rather than asserted here.

**Questions appear and disappear based on the determination.**

- Sections 3 to 5 do not exist until the risk determination routes to a full
  project plan. A user filing an initial notification never sees 19 fields that
  do not apply to them. (`app.smoke.test.tsx`: *hides Sections 3 to 5 until the
  risk determination routes to a full plan*)
- Critical characteristics appear only when the article is CPL-listed or
  high-risk.
- Un-inspectable characteristics appear only when the article is not fully
  inspectable.
- Non-bilateral access mitigation appears only in a non-bilateral country.
- Designee justification, function codes and the travel commitment appear only
  when designees are used.

**The app tells the user what their answers mean, as they answer.**

A routing banner sits at the top of the intake and updates live: *"Full project
plan required — Sections 1 to 5"* or *"Initial notification may suffice"*, each
with the rationale naming which answers produced it. The user is not told at the
end what they have committed to.

**It pushes back on boilerplate at the moment it is typed.** AC 21-55 §6 says
the plan "should not be a generic replication of the PAH's current quality
system". A narrative under 40 characters warns immediately, in the field, while
the user still has the context to fix it — not in a report they read later.

**It surfaces disagreement rather than resolving it silently.** Answering "not
high-risk" while risk indicators have fired produces a visible warning that
names them, because an FAA reviewer reads the same design data.

If this still reads as a form to Mike, the next step is to collapse Section 1
and 2 into a guided sequence with one decision per screen. The engine already
supports it — routing is derived, not stored, so screen order is a UI concern
only.

---

## 2. Why the scrub gate matches shapes, not strings

The specification asked for a grep against a list of literal proprietary values,
and in the same section forbade those values from appearing in the repository
**including git history**.

Those cannot both hold. To grep for a document number you must store it, and
committing that file writes the leak permanently into history, where a later
edit cannot reach it and where it ships to any future acquirer along with the
repo.

`src/gates/scrubPatterns.ts` matches the **shape** instead:
`[A-Z]{1,4}(-[A-Z]{1,4})?-\d{3}-\d{1,2}` catches every internal document number
on the original list without any of them being written down. This is strictly
stronger than the literal list — it also catches sibling values nobody
enumerated.

The cost is false positives. **The rule is to change the repository, never to
widen the exception.** Fixture model numbers avoid the `PREFIX-999-99` shape
(`ACT-4410`, `LSP-2200`). The allowlist is asserted empty by a test.

Two narrow exemptions exist, both for ranges a public standard reserves for
fiction: the NANP 555-0100..0199 telephone block and RFC 2606 `example.invalid`.
Appendix A requires a phone number and an address in its header, so the fixtures
need them. A test asserts both that reserved values are exempt **and** that a
number one digit outside the reserved block still trips the gate — so the
exemption cannot quietly swallow the rule.

---

## 3. Where the AC overrode the specification

The specification said the AC wins on any difference. It differed in six places.
All are documented in `REGULATORY-SOURCES.md`; the two that changed the design
most:

**High risk is not a checklist.** AC §7.2.2 asks whether *the PAH* identified the
articles as high-risk *in the design data*. The AC supplies no criteria. The six
triggers from the specification are therefore modelled as an elicitation **aid**
that produces a suggestion and a rationale; the PAH's recorded answer is
authoritative. Making the checklist the rule would have had the software issue a
regulatory determination it has no standing to make.

**Appendix A asks for model numbers, not part numbers.** Section 1 item 3 is
"names and model numbers". It does not ask for part numbers, drawing numbers,
drawing revisions, or who holds design authority — all of which the
specification listed. The schema matches the AC; the extra identifiers belong in
the project description, where the AC does invite detail.

---

## 4. Local-first, and why it is not negotiable

All data stays in IndexedDB. There is no backend and none is planned for v1.

This is a product decision before it is a technical one. The data a customer
enters here — facility names, article model numbers, critical characteristics,
which of their processes cannot be verified after receipt — is a description of
their manufacturing weak points, prepared for a federal regulator, before
submission. Quality departments will not paste that into a service they do not
control, and they are right not to.

It also means the app works on a tablet at a supplier's site with no
connectivity, which is where a lot of this work actually gets done. Consequences:
the service worker caches the shell and assets; the Tauri build is a window
around the same code; nothing calls out.

---

## 5. Deliberate omissions

- **No LLM anywhere in the shipped path.** The specification permits one for
  convenience extraction from uploaded documents, marked `LIKELY`. The evidence
  states are modelled and rendered, but no extraction is implemented. Better to
  ship none than to ship one whose output looks like a determination.
- **No cloud sync**, no accounts, no telemetry.
- **Billing is scaffolded and flagged off.** Every gate the paid product needs
  exists and is called; with the flag unset they all return "allowed". No prices
  are hardcoded — a test asserts they are all null.
- **Tauri is scaffolded but unbuilt.** No Rust toolchain was available on the
  build machine. See `HANDOVER-TO-MIKE.md` for exactly what that means.

---

## 6. Things that would be wrong to change without thinking

- **The three banner values.** Defined once in `src/engine/banner.ts`; the CI
  claim gate re-exports that definition rather than keeping a copy. A fourth
  value implying FAA acceptance is blocked by the claim gate.
- **Refusal to generate lives in `render.ts`, not the UI.** Disabling a button is
  the visible half; the throw is the mechanism. A batch export or CLI added later
  cannot route around it.
- **The FAA Validation column and the Approvals block ship empty.** They belong
  to the FAA. Pre-filling them would fabricate a federal record.
- **Appendix A section titles, order and item numbering.** The FAA rejects other
  formats. `acConformance.ts` transcribes them; the tests fail if the document
  drifts.
