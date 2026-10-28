# CODE HANDOFF — Conform-Edge Audit Toolkit

**Read this first. Then read, in order:** `BUILD-GOVERNANCE-STATUS.md`, `07-BUILD-SPEC.md` (framework),
and the two owner directives (`directive-01-product-reset.md`, `directive-02-ncr-amendment.md`) in this folder.
The directives are binding; where they conflict, the NCR amendment wins.

**Prepared:** 2026-10-10, by Claude (Opus), under Brian Olea. **This is a handoff, not an approval to ship.**

---

## 0. What you are building

An intelligent, offline-first, portable **auditing application** (Android first via Capacitor, path open to
tablet/iOS/web admin), distributed through Google Play. It is NOT a checklist app and NOT a Google Workspace
app. It must substantiate how an auditor reached every conclusion. The intelligence is **invisible**: the
customer never sees the names MAK, M-AI, Micro AI Kernel, or any internal agent/engine terminology.

## 1. Do not rebuild — preserve and build on these (PROVEN)

In `2026-10-10-clause-map-framework/`:
- `schema/clause-map.schema.json` — content pack contract. IP rule: no requirement text unless `source.publicDomain`.
- `tools/validate-pack.js` — enforces IP rules (no copied notes, fragment ≤6 words, ≤25% items quoted, no requirement text on non-public-domain). Proven PASS/FAIL. **Extend, do not weaken** (see §5).
- `packs/src/as9100d.pack.json` — authoring template (8 items). Expand to the obligation grain in §4.
- `src/core/resolver.js` — deterministic, explainable scope resolver. Reuse verbatim as the applicability engine.
- `prototype/index.html` — **the approved UX reference.** Owner-reviewed 2026-10-10. The production UI must match
  its information architecture, the detailed audit card, and the Should Be/As Found NCR flow. Light + dark both required.

Run `node tools/validate-pack.js packs/src/as9100d.pack.json` to confirm the chain before changing anything.

## 2. Build order (from directive §18 / amendment)

- **Phase A — Framework preservation:** document what is tested vs. not; write the architecture amendment integrating MAK/M-AI as background services. Do not rewrite proven files.
- **Phase C — MAK/M-AI capability baseline (do before the vertical slice):** inspect the ACTUAL MAK and M-AI implementations (canonical Kernel pointer: `04 Product Portfolio\M-AI\CANONICAL-KERNEL.md`). Produce the integration matrix (directive §16): capability, location, implemented/tested status, API/adapter, dependencies, test status, proposed use, required work. **Do not equate architecture docs with implemented capability.** If no production service exists, define versioned contracts + local stubs and label them stubs.
- **Phase D — Production vertical slice:** one complete audit workflow on AS9100D: setup → applicability → process audit → sampling → evidence → intelligent follow-up → governed recommendation → auditor decision → Should Be/As Found NCR → report → reproducible audit record.
- **Phase E — content + capability scale:** more packs, more skills. No bulk unreviewed content.
- **Phase F — security, offline, packaging, release validation.**

Create the production app folder `2026-10-11-audit-toolkit-app/` (Governor authorized, separate from the framework). Fill the Governor artifact contract (`01-DISCOVERY-RECORD.md` … `13-NEEDS-FROM-BRIAN.md`).

## 3. Architecture (three layers, directive §5.3)

- **Device layer:** UX, audit runtime, local encrypted store (SQLite), approved packs, deterministic applicability, policy enforcement, evidence capture, full offline core auditing.
- **Audit intelligence services:** MAK-style reasoning, server-side, versioned, privacy/auth-gated. Degrades gracefully offline ("Additional analysis available when connected").
- **Governed dev/release:** proprietary intelligence development, skill eval, policy authoring. Never embedded in the customer app. Versioned interfaces + adapters only. No Kernel fork, no source copied to accelerate.

Target **Android API 36** (Play requirement from 2026-08-31). Capacitor shell; reuse FieldAudit toolchain + signing. Local-host/local-build testing (owner preference) — no cloud staging required.

## 4. Data model (directive-02 §13 — REQUIRED; not a free-text note / Yes-No)

Entities with stable IDs and controlled relationships:
`Requirement → AuditableObligation → VerificationActivity`; `AuditSample`, `Evidence`, `Observation`,
`Evaluation`, `PotentialFinding`, `NCR{ShouldBe, AsFound}`, `ObjectiveEvidenceLink`, `FindingClassification`,
`AuditorReview`, `Approval`, `ReportOutput`, and `SourceVersion`/`IntelligenceVersion` stamps.

Evolve the clause-map item into a **Requirement Intelligence Record** with **auditable obligations** at the
subordinate-paragraph grain (e.g. 7.2(c), 8.5.1(c)(1)) — each with: identity+source version, intent, expected
control, verification objective, verification method, detailed steps, expected evidence, sampling guidance,
common weaknesses, related obligations, evidence/assessment links, validation status. One evidence item may
satisfy multiple obligations — do not duplicate evidence or generate redundant findings. **Verify real clause
structure before using any citation; never invent paragraph designators.** Business-rule validation lives at the
data/logic layer, not only the UI.

## 5. The NCR is the crux (directive-02 §5, §7 — NON-NEGOTIABLE)

Every formal NCR uses **Should Be / As Found**. Should Be = accurate paraphrase of the governing obligation with
exact clause hierarchy, no reproduced standard text, no invented requirement. As Found = objective condition with
record/sample identifiers, dates, linked evidence. **Gatekeeping (implemented in the prototype — port it, do not
drop it):** an NCR cannot finalize until (1) source identified, (2) exact clause hierarchy verified, (3)
applicable, (4) Should Be accurate, (5) As Found is a specific supportable condition, (6) objective evidence
linked, (7) a real unmet requirement, (8) contradictory evidence evaluated, (9) scheme-based classification,
(10) authorized auditor approval. Deficient NCRs are blocked. Extend `validate-pack.js`-style checks to content
(source identity, edition, clause hierarchy validity, obligation mapping, no unsupported mandatory controls/claims,
technical-review status). Human technical review is a required release gate for every standards pack.

## 6. Acceptance scenarios (must run interactively — directive-02 §11)

A Conforming · B Potential NC (fact unverified → held) · C Substantiated NC → defensible Should Be/As Found ·
D Incorrect citation (parent clause) → blocked · E Alternative compliant method → conforming · F Insufficient
evidence → no unsupported conclusion. Prototype currently demonstrates C, D, F and conforming; wire A, B, E to
full fidelity in the slice. Acceptance is judged from an experienced aerospace Lead Auditor's perspective.

## 7. Hard rules (do not violate)

1. MAK/M-AI invisible — never named in customer UI; provenance only in admin/diagnostic records.
2. No requirement text unless public-domain source; validator enforces; don't disable.
3. Intent-based auditing; a document's presence ≠ effective process; prior findings are leads, not proof.
4. Deterministic applicability stays authoritative and explainable; M-AI may govern actions (PROCEED/HOLD/BLOCK/ADVISE) but never manufactures evidence, silently changes a requirement, or converts inference to fact.
5. Auditor holds formal decision authority; intelligence recommends only.
6. Offline-first for core auditing; encrypted local storage; conflict/duplicate handling; never rely on cloud for evidence preservation.
7. Audit reproducibility: pin pack version/hash, resolver version, scheme, policy/skill/model versions to each audit; updates never silently change an open or historical audit (directive §12).
8. Tenant segregation, auth, RBAC, least privilege, audit logging; no customer evidence becomes MAK training data without authorization.
9. No claim of implemented/tested/integrated/production-ready without evidence.
10. Brand separation: Conform-Edge software only; no Annex Quality or Burrana branding.

## 8. Status honesty (what the prototype simulates)

Real in prototype: scope resolution, NCR gatekeeping logic, sample→evidence capture, report population, light/dark.
Simulated: contextual guidance (scripted, not live MAK/M-AI), AS9100D content (authored sample, not full), org/records
(fictional AeroTech), offline/camera/storage/PDF export (represented). Carry this honesty into all build docs.

## 9. Gates before release

Governor Stage 4 authorization recorded (conditional — see `BUILD-GOVERNANCE-STATUS.md`). Still required before
Stage 10: M-AI integration + verification (Stages 3,7), FSA review (Stage 6), product verification (Stage 8),
validation (Stage 9), counsel review of IP rules, website+Play verification. `RELEASE_NOT_AUTHORIZED` until then.
