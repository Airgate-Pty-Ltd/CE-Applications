## D-058: Regulatory Baseline Training Data Model — Design Logged Before Implementation, Per Owner Instruction

**Context:** owner-directed scope addition, pre-UI-phase: "Build the data model and seed mechanism
for regulatorily-required initial HF training." Six hard constraints given; §6 explicitly
requires this design be logged as a decision *before* implementing, and requires flagging
regulatory ambiguity rather than silently resolving it. This entry is that log. No schema
change or migration has been applied yet as of this entry — that follows, same commit boundary.

## Regulatory verification (real, cited — constraint §1: "web-verify before building, do not
work from memory")

**Correction to the owner's own citation, flagged rather than silently followed:** the
directive names "AMC1 145.A.30(e)'s HF training syllabus." Verified against the UK CAA's
regulatory library mirror of the EASA AMC & GM to Part-145 (a clean, authoritative HTML source,
used after the primary EASA PDF proved to be a scanned/encoded document WebFetch could not
extract text from — logged as a real access limitation, not silently worked around by guessing)
and cross-checked against multiple independent EASA-approved training-provider course
descriptions (Wefly, FL Technics, Bostonair, SofemaOnline, CD Training Academy — all
independently citing the same provision): **the full, numbered syllabus topic enumeration is
published under GM1 145.A.30(e) ("Guidance Material"), not AMC1 145.A.30(e) ("Acceptable
Means of Compliance").** AMC1/AMC3/AMC4 145.A.30(e) are distinct, adjacent provisions under the
same paragraph (e.g. AMC3/AMC4 cover fuel tank safety training and personnel-requirement
specifics, not the HF syllabus topic list). This build proceeds against the verified **GM1
145.A.30(e)** topic list — the correct, current source for what the owner actually asked for
(the syllabus topics) — with this citation correction recorded here rather than silently
"fixed" without a trace.

**The complete, verified GM1 145.A.30(e) syllabus enumeration** (10 sections, 66 numbered leaf
items total; the regulation's own text permits an organisation to "combine, divide, or change
the order of any of the subjects... as long as all the subjects are covered" — so this build's
choice of one atom per leaf item, below, is a design decision, not a regulatory mandate):

1. General/Introduction to Safety Management and Human Factors — 1.1 Need to address safety
   management and human factors; 1.2 Statistics; 1.3 Incidents; 1a Safety risk management
   (1a.1 Hazard identification, 1a.2 Safety risk assessment, 1a.3 Risk mitigation and
   management, 1a.4 Effectiveness of safety risk management)
2. Safety Culture/Organisational Factors — 2.1 Justness/trust, 2.2 Commitment to safety,
   2.3 Adaptability, 2.4 Awareness, 2.5 Behaviour, 2.6 Information
3. Human Error — 3.1 Error models and theories, 3.2 Types of errors in maintenance tasks,
   3.3 Violations, 3.4 Implications of errors, 3.5 Avoiding and managing errors,
   3.6 Human reliability
4. Human Performance & Limitations — 4.1 Vision, 4.2 Hearing, 4.3 Information-processing,
   4.4 Attention and perception, 4.5 Situational awareness, 4.6 Memory, 4.7 Claustrophobia and
   physical access, 4.8 Motivation, 4.9 Fitness/Health, 4.10 Stress, 4.11 Workload management,
   4.12 Fatigue, 4.13 Alcohol/medication/drugs, 4.14 Physical work, 4.15 Repetitive
   tasks/complacency
5. Environment — 5.1 Peer pressure, 5.2 Stressors, 5.3 Time pressure and deadlines,
   5.4 Workload, 5.5 Shift work, 5.6 Noise and fumes, 5.7 Illumination, 5.8 Climate and
   temperature, 5.9 Motion and vibration, 5.10 Complex systems, 5.11 Other hazards in the
   workplace, 5.12 Lack of manpower, 5.13 Distractions and interruptions
6. Procedures, Information, Tools and Practices — 6.1 Visual inspection, 6.2 Work logging and
   recording, 6.3 Procedure - practice/mismatch/norms, 6.4 Technical documentation - access and
   quality, 6.5 Critical maintenance tasks and error-capturing methods
7. Communication — 7.1 Shift/task handover, 7.2 Dissemination of information,
   7.3 Cultural differences
8. Teamwork — 8.1 Responsibility, 8.2 Management, supervision and leadership,
   8.3 Decision-making
9. Professionalism and Integrity — 9.1 Keeping up to date; currency, 9.2 Avoiding
   error-provoking behaviour, 9.3 Assertiveness
10. Organisation's Safety Programme — 10.1 Safety policy and objectives, just culture
    principles, 10.2 Reporting errors and hazards, internal safety reporting scheme,
    10.3 Error investigation process, 10.4 Action to address problems,
    10.5 Feedback and safety promotion

**14 CFR 145.163 cross-reference (FAA applicability), verified:** the regulatory text itself
does **not** mention "human factors" anywhere and specifies no topic list or training
interval — it requires an FAA-approved training program (initial + recurrent) sufficient to
make each employee "capable of performing the assigned task," leaving specifics to the repair
station's own approved program. The FAA's own guidance on program content, AC 145-10, was
confirmed (via search, the primary PDF returned HTTP 403 to direct fetch — noted, not silently
worked around) to **explicitly decline to prescribe HF elements**: "the FAA will not prescribe
what human factors elements to include," beyond requiring relevance to aviation maintenance and
safety, informed by "existing legislation, where relevant." **This means there is no competing
FAA-specific HF topic taxonomy to reconcile against GM1 145.A.30(e)** — the FAA side of this
cross-reference is about *intent* (an approved training program should include human factors
content, and referencing an established framework like GM1 145.A.30(e) is a defensible way to
satisfy that intent), not a parallel regulatory enumeration. Flagged explicitly, not silently
asserted as equivalent regulatory force: **EASA's GM1 145.A.30(e) carries real (if
"guidance material," non-AMC) prescriptive weight for EASA-approved Part-145 organisations;
14 CFR 145.163 imposes no HF-specific requirement at all for FAA-certificated repair
stations** — this build's baseline is EASA-sourced by the owner's own explicit instruction,
used for FAA-side applicability as informative content, not as a claim of independent FAA
mandate.

**24-month continuation-training interval — flagged as not fully primary-source-verified.**
Multiple independent training-provider sources consistently cite a 24-month/2-year HF
continuation-training interval under Part-145; one search result attributed a closely-matching
clause ("all certifying staff and support staff receive sufficient continuation training in
each two-year period... to ensure up-to-date knowledge of relevant technology, organisation
procedures, and human factor issues") to **AMC 145.A.35(d)** (certifying-staff competence,
a *different* provision from 145.A.30(e)) rather than to 145.A.30(e) itself; another source
described "24 months" as a general recommended review interval without a specific clause
citation. The primary EASA IR/AMC/GM PDF could not be text-extracted (scanned/encoded, see
above) to resolve this with certainty. **Per the owner's own instruction, this build treats
24 months as GM/industry guidance, not a confirmed regulatory mandate specifically tied to
145.A.30(e)** — recorded as `intervalMonths: 24` with an explicit `source: "GM/industry
guidance - not confirmed as a 145.A.30(e)-specific regulatory mandate; see DECISIONS.md D-058"`
annotation, and made a configurable field per the owner's own requirement, not a hardcoded
constant presented as settled regulation.

**SMS/Safety Academy content's regulatory hook — explicitly NOT yet determined.** The owner's
follow-up (content-import) message asks the inventory to map Safety Academy content against
"SMS requirement hooks," but names no specific SMS regulation/provision to verify against (unlike
the HF side, which names AMC1/GM1 145.A.30(e) explicitly). No SMS-specific regulatory citation
is asserted in this entry. During the inventory phase (this same run, following entry), Safety
Academy content will be mapped either against GM1 145.A.30(e)'s own existing
safety-management-related items (Section 1's "safety risk management" 1a.1-1a.4, Section 10's
"organisation's safety programme" 10.1-10.5 — both already part of the verified HF syllabus and
already safety-management-flavored) or tagged `supplementary` if it does not fit those items -
not mapped against a fabricated or unverified separate SMS clause framework.

## Schema design

**`RegulatoryClause` (NEW model)** — the canonical clause registry, seeded once from the
verified GM1 145.A.30(e) enumeration above (paraphrased intent statements, never verbatim
regulatory text, per constraint §2): `framework` (e.g. `"GM1 145.A.30(e)"`), `section`,
`sectionLabel`, `itemNumber` (e.g. `"4.1"`), `itemLabel` (e.g. `"Vision"`), `intentSummary`
(paraphrased, one or two sentences - what the topic is for, not the regulation's own wording),
`@@unique([framework, itemNumber])`. A real table, not a hardcoded array, specifically so the
traceability matrix (§5/§4 of the two directive messages) can be a genuine SQL join/gap query
("which clauses have zero linked, approved atoms") rather than application-level
string-matching against a constant.

**`LearningAtom` additions:** `origin` (`String @default("event")`, values `"event"` |
`"regulatory-baseline"` - default preserves every existing row's real meaning without a
migration data-fix); `sourceClause` (`String?`, human-readable citation string, e.g.
`"GM1 145.A.30(e) item 4.1"` - kept as the owner's literally-named field even though a
relational FK also exists, so the citation is always present and readable even if the FK
linkage is momentarily unset); `regulatoryClauseId` (`String?`, FK to `RegulatoryClause`, for
the real join the matrix needs); `contentSource` (`String?`, the exact source file path
recorded at import time, per the content-import message's own requirement).

**`LearningIntervention` changes:** `origin` (`String @default("event")`, same values as
above); **`eventId` changes from a required to an optional foreign key** (`String?`, relation
no longer mandatory). This is the one schema change with real blast radius, checked by
grep across the codebase before deciding, not assumed safe:
- The compile -> assign pipeline itself (`compile-and-assign/route.ts`, `CurriculumCompiler.ts`)
  never references `eventId` - confirmed by direct inspection. Regulatory-baseline
  interventions flow through the identical pipeline G3 already proved, untouched, satisfying
  constraint §3 ("no parallel content path") exactly.
- `TraceabilityGraph.findAtomsForEvent(eventId)` (event -> atom forward trace) simply will not
  be invoked for baseline-origin interventions, which have no event to trace from - correct
  behavior, not a gap, since baseline atoms are traced via the new clause matrix instead.
- `DefenseDossier.ts` (two call sites: `hfEvent.findUnique({ where: { id: intervention.eventId
  } })` and an `.map(i => i.eventId)` feeding an `in:` filter) **will throw or misbehave on a
  null `eventId`** if left unguarded - confirmed by inspection, not left to be discovered as a
  bug later. Minimal fix applied alongside the schema change: both call sites now skip/filter
  interventions with a null `eventId` rather than assume one always exists. Building a
  baseline-specific dossier variant (a defense exhibit for "how do you know initial training
  covers this regulation," as opposed to an event-defense exhibit) is a real, separate future
  need, not attempted in this pass - named here, not silently left as a latent crash.

**`TrainingAssignment` addition:** `recurrenceIntervalMonths` (`Int?`), per the owner's literal
instruction ("add a recurrence interval to the assignment model"). Deliberately **not** the
same field as the existing `LearningAtom.recurrenceRule` - that field already has an entirely
different, live meaning (`DripRecurrencyService`'s short-cycle WEEKLY/BIWEEKLY/MONTHLY
shift-brief re-delivery cadence, Phase 3 WP-4.4) and conflating a multi-year regulatory
continuation-training interval with a days-scale drip-reminder cadence would be a real design
error, not a simplification. No scheduler reads this field yet (constraint §4: "auto-scheduling
itself can wait; the data must not") - it is populated at assignment-creation time for
regulatory-baseline-origin assignments and otherwise left null.

**Traceability matrix:** a new read-only service/API route querying `RegulatoryClause` LEFT
JOINed to `LearningAtom` (via `regulatoryClauseId`), reporting per clause: linked atom(s), each
atom's `status` (DRAFT/APPROVED/etc.), and `contentSource` - with clauses that have zero linked
atoms surfaced as real, visible gaps rather than silently absent rows. This is the artifact
"an auditor gets shown when asked how initial training covers the requirement," per the
owner's own framing, and is one of this work package's two acceptance deliverables (the other
being the owner's approval of the content inventory/mapping, per the follow-up message).

**Atom granularity decision, logged as a decision, not assumed:** one atom per GM1 leaf topic
item (66 atoms total across 10 sections) rather than one atom per section (10 atoms) or one
atom for the whole syllabus. Chosen because per-leaf-item granularity gives the strongest,
most specific traceability ("we can show exactly which atom covers 4.7 Claustrophobia and
physical access," not just "some atom in the Human Performance section presumably covers it
somewhere") - the more defensible choice for a compliance artifact, and consistent with the
regulation's own explicit flexibility to "combine, divide" as the organisation sees fit; this
build chooses maximum division. Sections remain modeled (via `RegulatoryClause.section`/
`sectionLabel`) so the curriculum can still be presented and compiled at the section level if
that later proves more useful for actual training delivery.

## What follows this entry

Implementation (Prisma migration + `DefenseDossier.ts` null-guards + the traceability
matrix service/route + `db:seed` registration of the 66 verified `RegulatoryClause` rows -
**no `LearningAtom` rows yet**, since real baseline atom content is explicitly gated behind
the content-import inventory and the owner's approval, per the follow-up message's own §1
"stop and show me... before importing anything"), same commit boundary as this entry. Then a
separate entry for the Annex Quality content inventory itself.

## D-059 — Annex Quality content inventory + GM1 145.A.30(e) mapping (STOP checkpoint, no import yet)

**Date:** 2026-08-07
**Trigger:** the owner's own explicit instruction (same message as the D-058 scope addition): "Content source for the regulatory baseline: import from existing Annex Quality training material... Stop and show me the inventory + mapping for approval before importing anything."

**What was done:** two parallel read-only research passes (general-purpose subagents, no write access exercised, both explicitly instructed never to touch the source folders) inventoried:
1. `HF-TRAINING-COMPLETE-2026-07-21` — 4 Teachable courses (AQ-083 Human Factors, AQ-086 Dirty Dozen, AQ-160 Personnel/HF/Airworthiness, AQ-050 HF Quality).
2. `11 - Safety Academy (SMS)` — 31 courses (AQ-075–AQ-105) plus a DOT Drug/Alcohol supervisor program and an FAA Part 5 SMS certificate series.

I then did the actual clause-by-clause mapping against the 66-item GM1 145.A.30(e) list myself (not delegated — this needed judgment, not extraction) and wrote the full inventory + mapping + gap analysis to `docs/05-run-records/CONTENT-INVENTORY-AQ-HF-MAPPING.md`. Neither source folder was modified, moved, or written into at any point. No draft atoms were created. Nothing has been imported.

**Headline finding — flagged, not resolved:** while reading `docs/02-controlled/` for context, found that an already-approved architecture (`HF-ENGINE-REQUIREMENT-SPINE-SPEC.md`, spine topics SP-01..SP-14 approved by the owner **2026-08-06**, the same day D-058 was written) explicitly names "EASA Part-145" as a future pack to be added via a `PolicyPack`/`ClauseTopicMap`/`RequirementSpineTopic` mechanism — a different, more general architecture than the single-framework `RegulatoryClause` table D-058 just built. A CAAC CCAR-145 R4 `PolicyPack` (`HF-ENGINE-POLICY-PACK-CAAC-CCAR145-R4-Rev-A.md`) is already approved and built from the same AQ-160/AQ-166 source material this inventory covers, independently using 24 months as its recurrence interval (corroborates D-058's unconfirmed 24-month guidance figure). `PolicyPack`/`PolicyPackClause` Prisma models already exist in `schema.prisma` (from WP-4.5, shipped earlier this session) with their own clause-to-atom linking mechanism (`PolicyPackClause.mappedAtomIds`), structurally different from D-058's `LearningAtom.regulatoryClauseId` FK. The spine layer itself (`RequirementSpineTopic`, `ClauseTopicMap`, `AtomTopicMap`, `PackAdoption`) is not yet built in code. I did not know this spec existed when D-058 was designed. This is now an open architecture question for the owner: keep D-058's `RegulatoryClause` model as a simpler parallel track, or fold GM1 145.A.30(e) into the `PolicyPack`/spine model instead (consistent with the owner's own approved direction, but requires migrating what D-058 just shipped). Not decided here.

**Mapping result:** of the 66 GM1 items — 34 Strong-fit, 18 Partial-fit, 15 real GAPs (no covering content in either source folder: items 1.2, 2.3, 4.1, 4.2, 4.7, 4.8, 4.9, 4.14, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 7.3). All of Section 5's physical-environment items (noise, illumination, climate, vibration, other workplace hazards) are gaps — this source material is cognitive/behavioral HF content, not industrial-hygiene content. Full per-item table in the mapping doc.

**Regulatory-framework mismatch confirmed at content level:** only AQ-160 carries clause-numbered citations, and all of them are CAAC CCAR-145 R4 (China), zero EASA/FAA. AQ-083/086/084/085/050 are deliberately regulator-agnostic conceptual courses (SHELL model, error taxonomy, Dirty Dozen, hierarchy of controls) with no citations at all in either direction — favorable for topic-fit mapping onto an EASA syllabus, since there's no competing citation to reconcile, but it means several "Strong"/"Partial" matches lean on AQ-160 content whose only real citation is Chinese law. Flagged as an open owner call in the mapping doc §6, not resolved.

**Other flagged ambiguities (full detail in the mapping doc):** whether Section 1a's four SMS-pillar items should draw from Safety Academy SMS courses or be treated as out-of-scope for this HF-specific import pass; whether the DOT Drug/Alcohol program (real, well-cited 49 CFR 40 / 14 CFR 120 content, but a different regulatory purpose than Part-145 HF training) is an acceptable source for GM1 4.13; a real depth gap on 10.4 (Action to address problems) since the source material's own authors hand off to CAPA courses that don't exist in either folder.

**Source-material quality notes** (self-flagged by the source material's own authors in most cases, not newly discovered problems): a byte-identical duplicate `AQ-083-Human-Factors` folder alongside `01-AQ-083-Human-Factors` (harmless, unreconciled); an unresolved file-pair drift between AQ-160's numbered- and flat-folder `Module-Content.md` copies (footer + one name completion, neither supersedes the other); internal pricing/duration inconsistencies across legacy vs. current admin files for AQ-083/086/050.

**Status:** STOP checkpoint per the owner's explicit instruction. No further action (schema changes, atom creation, content import) proceeds until the owner reviews `docs/05-run-records/CONTENT-INVENTORY-AQ-HF-MAPPING.md` and responds to: (1) the PolicyPack/spine architecture question in §0, (2) the four ambiguous-mapping calls in §6, (3) whether Partial/GAP items get thinner placeholder atoms now or wait for future content.

## D-060: Fold GM1 145.A.30(e) baseline into the PolicyPack/Requirement-Spine architecture — design logged before implementation

**Date:** 2026-08-08
**Trigger:** D-059's flagged architecture fork. Asked the owner directly: keep D-058's standalone `RegulatoryClause` model, or fold GM1 145.A.30(e) into the already-approved `PolicyPack`/Requirement-Spine architecture (`docs/02-controlled/HF-ENGINE-REQUIREMENT-SPINE-SPEC.md`, spine SP-01..SP-14 approved by the owner 2026-08-06)? **The owner chose: fold into PolicyPack/spine.** This entry is the design for that fold-in, written before implementing, per this project's own established convention (see D-058).

**D-058 is superseded by this entry, not edited or deleted** — this log is append-only. D-058's actual regulatory research (the AMC1-vs-GM1 citation correction, the 14 CFR 145.163/AC 145-10 cross-check, the 24-month recurrence-interval sourcing caveat) is NOT superseded — it's carried forward verbatim into the new seed file's header comment (`prisma/seed-regulatory-clauses.ts`) and remains fully valid. Only the *table shape* (`RegulatoryClause` + `LearningAtom.regulatoryClauseId`) is being replaced.

**Schema changes:**
- **Dropped:** `RegulatoryClause` model, `LearningAtom.regulatoryClauseId`/`.regulatoryClause`/its index. Confirmed zero atoms ever referenced it (content import stayed gated behind D-059 the whole time) — safe to drop cleanly rather than deprecate in place, matching this repo's convention of keeping the schema itself clean and putting history in `DECISIONS.md`, not in dead columns.
- **Added:** `RequirementSpineTopic` (id, code, title, intent, spineRevision, status — `@@unique([code, spineRevision])` so a future spine revision adds new rows rather than mutating old ones, keeping already-approved `ClauseTopicMap` rows pinned to the exact topic definition they were approved against), `ClauseTopicMap` (clause→topic coverage judgment, FULL/PARTIAL/DELTA), `AtomTopicMap` (atom→topic, set at atom approval; `atomId` is a bare indexed string with no formal relation, matching the existing `AtomCompletion`/`DripDelivery` precedent for "many rows soft-reference one atom" rather than introducing a third FK pattern), `PackAdoption` (tenant→pack-revision adoption record, append-only via `status`/`supersededAt` rather than mutated in place).
- **Modified:** `PolicyPack` gains `spineRevision Int?` (per spec §3). `PolicyPackClause` gains `section String?`/`sectionLabel String?` (generic — any future multi-section pack can use these, not GM1-specific).

**DELTA / `mappedAtomIds` reconciliation — a judgment call, not spec-mandated, logged rather than buried in code:** the one real precedent (the already-approved CAAC CCAR-145 R4 pack's own §7 mapping table) never actually uses `DELTA` as a coverage value itself — every row there is FULL or PARTIAL, with `DELTA` appearing only as free text inside a delta note describing an off-spine numeric residual (e.g. CAAC's specific working-hour limits). Adopted design: (1) **embedded delta** (the demonstrated, common case) — `coverage = FULL|PARTIAL`, `topicId` set, `deltaNote` documents the regulator-specific residual; (2) **whole-clause delta** (rare, spec-named but never actually instantiated in the precedent) — `coverage = DELTA`, `topicId = null`, an explicit "reviewed, deliberately has no spine topic" marker, distinguishable from an unmapped gap. `PolicyPackClause.mappedAtomIds` (the pre-existing, real, working direct clause→atom mechanism from WP-4.5) stays an always-available manual override, unioned on top of the topic-derived atom set for every clause regardless of coverage type — not conditionally switched on by coverage type, which would have been a more complex and less-precedented design.

**GM1 145.A.30(e) instantiated as data, not code:** a `PolicyPack` row (`regulatoryFramework: "GM1 145.A.30(e)"`, `recurrenceMonths: 24`) with 66 `PolicyPackClause` rows (one per syllabus leaf item, migrated 1:1 from D-058's seed data — same content, same paraphrased intent summaries, no new authorship). **Left unapproved** (`approvedBy`/`approvedAt` null) — matches the CAAC pack's own documented "Drafted by Claude... Reviewed & approved by Brian R. Olea" two-step precedent exactly.

**The clause→spine-topic coverage mapping (66 GM1 items → 14 spine topics) is my own draft judgment, seeded as real data but explicitly NOT final** — same treatment as D-059's content-mapping draft. Notable findings from doing this mapping, logged rather than smoothed over:
- `SP-02` (Initial-HF-Training), `SP-03` (Training-Scope-Breadth), and `SP-04` (Recurrent-Training) are **program-structure** topics the GM1 pack satisfies as a whole (via its own recurrence/audience fields), not syllabus-content topics — no individual GM1 leaf item maps to them, and that's a correct result, not a missing one.
- Several Section 4/5 items (vision, hearing, noise, illumination, climate, motion/vibration) only get a broad PARTIAL fit under `SP-07` Error-Models ("error-producing conditions") because the 14-topic spine has no dedicated physical-ergonomics/sensory-limitations topic. This is a **genuine granularity gap in the spine itself**, not a forced mapping — worth a future `SP-15` if the owner ever revises the spine. None of these needed the whole-clause-DELTA marker; a broad-but-real PARTIAL fit under SP-07 is defensible (SHELL model's Liveware-Environment interface literally covers this territory), just coarse.
- Item 6.5 (critical maintenance tasks / error-capturing methods) is the one clause given two topic rows (`SP-07` and `SP-09`), mirroring how the CAAC pack's own table cites multiple topics for some clauses.
- Every one of the 66 items got at least a defensible PARTIAL mapping — none needed the null-topicId whole-clause-DELTA treatment.

**Service/route changes:**
- `RegulatoryTraceabilityService.buildMatrix()` rewritten to query the new chain (`PolicyPackClause` → `ClauseTopicMap` → `RequirementSpineTopic` → `AtomTopicMap` → atom lookup), unioned with each clause's own `mappedAtomIds`. External result shape preserved (clause/section/item/atoms/coverageGap/approvalGap) — `GET /api/regulatory-traceability` (already real and live, defaulting `framework` to `"GM1 145.A.30(e)"`) needed zero route-code changes to stay compatible.
- `POST /api/atoms/[id]/approve` extended in place to accept an optional `topicIds: string[]` body field; on success, creates `AtomTopicMap` rows (atomId, topicId, mappedBy: resolved approver, approvedAt: same timestamp) for each. Approval is never blocked by a missing topic mapping — a kernel rule that flags unmapped published atoms is real future work (see spec §5, "kernel flags unmapped published atoms") but is explicitly deferred here (see below), not built in this pass.

**Explicitly deferred (named, not silently dropped):**
- A new kernel rule (`HFSRC-007`-style) for "published atom has no topic mapping" — genuine additional scope (rule-registry entry, 3 POS/NEG/MISSING test cases, updating the hardcoded `toHaveLength(14)` assertions in `MaiKernel.registry.test.ts` and `MaiKernel.rules.test.ts`). The spec doesn't require it land in the same pass as the schema it depends on.
- Any Annex Quality `LearningAtom` content creation — still fully gated behind D-059 §6's open content-mapping ambiguities (cross-jurisdiction sourcing, the DOT-program question, the Section 1a SMS-pillar question, the 10.4 depth gap). This pass only finishes the architecture those future atoms will attach to; it does not touch content import.
- Reconciling `PolicyPackClause`'s actual field names against the spine spec's own imagined shape (`clauseRef, intentSummary, audiences, recurrenceNote, smeFlags[]` vs. what WP-4.5 actually built) — a second, smaller mismatch discovered during research, out of scope for this pass.
- The Postgres schema mirror (`prisma/postgresql/schema.prisma`) was already stale before this change (no `RegulatoryClause` in it either, meaning `npm run db:generate:pg` was never rerun after D-058's migration) — not fixed retroactively here, consistent with this session's established pattern of leaving the Postgres mirror alone during SQLite-only passes.

**Status:** implemented in the same commit boundary as this entry — real `prisma migrate dev` applied (not just validate/generate), full test suite rerun, seed idempotency re-verified. Content import remains a separate, still-gated future step.

## D-061: Spine amendment — SP-15 Physical-Environment-Performance-Limitations (owner decision)

**Date:** 2026-08-08
**Trigger:** owner reviewed D-059/D-060 and issued six rulings. This entry covers ruling 1 (spine amendment); rulings 2-6 are covered by the content-import work that follows in the same session, logged separately.

**Change:** added `SP-15 Physical-Environment-Performance-Limitations` to the Requirement Spine (`docs/02-controlled/HF-ENGINE-REQUIREMENT-SPINE-SPEC.md`, revision-history section added). Additive only — no existing SP-01..SP-14 title/intent changed, so `spineRevision` stays at 1 for all rows (per the schema's own design: a revision bump exists to protect already-approved mappings from silent redefinition of an *existing* topic; adding a wholly new topic code doesn't trigger that concern).

**Why:** directly closes the granularity gap D-060 flagged and did not resolve: "several Section 4/5 items (vision, hearing, noise, illumination, climate, vibration) only get a broad PARTIAL fit under SP-07... a genuine spine-granularity gap, not a forced fit."

**Scope of the remap — a judgment call on the owner's wording, stated explicitly rather than assumed:** the owner's instruction said SP-15 should cover "GM1 Section 5 and the vision/hearing performance items." Read literally, "all of Section 5" would include items like 5.1 (peer pressure), 5.3 (time pressure), 5.4 (workload), 5.10 (complex systems), 5.12 (lack of manpower) — items that already had a correct, non-forced home on SP-10/SP-05/SP-09 and were never part of the flagged granularity problem. I resolved this by treating "covering Section 5" as describing SP-15's subject-matter scope (the physical/sensory core of Section 5), and reading "re-map the affected clauses from their Error-Models broad-fit" (the instruction's own second clause) as the operative, narrower selection criterion — i.e., exactly the six items D-060 itself named as the broad-SP-07-fit problem:

- **4.1 Vision** — SP-07 PARTIAL → **SP-15 FULL**
- **4.2 Hearing** — SP-07 PARTIAL → **SP-15 FULL**
- **5.6 Noise and fumes** — SP-07 PARTIAL → **SP-15 FULL**
- **5.7 Illumination** — SP-07 PARTIAL → **SP-15 FULL**
- **5.8 Climate and temperature** — SP-07 PARTIAL → **SP-15 FULL**
- **5.9 Motion and vibration** — SP-07 PARTIAL → **SP-15 FULL**

Coverage upgraded PARTIAL → FULL on all six: SP-15 is now a precise, dedicated fit for these items rather than a broad catch-all, so FULL is the accurate judgment, not PARTIAL.

**Deliberately left unmoved**, with reasoning: 5.1 (peer pressure, SP-10 — organizational, correct), 5.2 (stressors, SP-05 — fatigue-adjacent, correct), 5.3 (time pressure, SP-10 — organizational, correct), 5.4 (workload, SP-05 FULL — correct, strong fit), 5.5 (shift work, SP-05 — fatigue-adjacent, correct), 5.10 (complex systems, SP-09 — procedural/documentation, correct), 5.11 (other hazards, SP-14 — SMS-interface, correct), 5.12 (lack of manpower, SP-10 — organizational, correct), 5.13 (distractions/interruptions, SP-07 FULL — a canonical, precise Dirty-Dozen error-model item, not a "broad" forced fit and not really a physical-environment topic despite living in GM1's "Environment" section heading). Section-4 items 4.3-4.7 and 4.15 (information-processing, attention/perception, situational awareness, memory, claustrophobia, repetitive-tasks/complacency) were also left on their existing SP-07 mapping — the owner's phrase was "vision/hearing performance items" specifically, matching exactly the two Section-4 items D-060 named, not the broader Section-4 cluster.

**If this reading is wrong** (i.e., the owner intended literally all 13 Section-5 items to move to SP-15 regardless of their current fit quality), that's a one-line correction to `prisma/seed-regulatory-clauses.ts`'s `CLAUSE_TOPIC_MAP` array and a reseed — flagged here so it's an easy, visible fix rather than a silent divergence from intent.

**Mechanics:** `prisma/seed-regulatory-clauses.ts` updated (SP-15 added to `SPINE_TOPICS`; the six items' topic reassigned in `CLAUSE_TOPIC_MAP`) and given a real sync step — since nothing here was ever owner-approved, the seed now deletes any non-null-topicId `ClauseTopicMap` row for a clause that's no longer in that clause's current desired topic set (handles the SP-07→SP-15 moves cleanly, without leaving orphaned stale-topic rows that would otherwise double-count in the traceability matrix). Re-run and idempotency re-verified (see run log below this entry).

## D-062: Content import execution — re-derivation, gap worklist, and import design (logged before implementation)

**Date:** 2026-08-08
**Trigger:** owner rulings 2-6 on the D-059/D-060 follow-up (ruling 1, the SP-15 spine amendment, is D-061). This entry covers rulings 2-4 (re-derivation + gap worklist) and the design for ruling 5 (import execution), written before creating any atom, per this project's standing convention.

### Ruling 2 — cross-jurisdiction: CCAR-145 citations excluded from the GM1/EASA chain

Applied by removing AQ-160 as a usable content source for any GM1-mapped atom (AQ-160's narration is the only AQ-source course carrying inline CCAR-145 R4 clause citations — confirmed in the original D-059 inventory). Effect on the 66-item mapping (full detail in the re-derivation below):
- **6.4** and **9.1** had AQ-160 as their *only* candidate source → became real gaps.
- **4.13** had AQ-160 *and* the DOT Drug and Alcohol Program as candidates; DOT is excluded too — not because the owner's ruling named it explicitly, but because it was already flagged in D-059 §6 as a purpose mismatch (US DOT reasonable-suspicion supervisor training, not general Part-145 HF awareness) independent of citations. Both reasons hold, so 4.13 becomes a gap. Flagged as an extension of the owner's ruling by analogy, not something explicitly stated — noted so the owner can correct if 4.13's exclusion should rest on the DOT-purpose-mismatch reasoning alone rather than citation-parity with CCAR.
- **4.12, 5.12** kept AQ-160 as a *secondary* source alongside AQ-083/AQ-086 (primary) — losing AQ-160 doesn't weaken these; they stay Strong.
- **8.1** (Responsibility) had AQ-160 as its more detailed/precise source (three distinct manager roles) with AQ-085 as a secondary, more general source. Losing AQ-160 is a real quality loss here — downgraded from Strong to Partial, sourced from AQ-085 alone.
- **5.10, 7.3** were already gaps for fit reasons (AQ-160's content was "adjacent, not a real fit" / "a regulatory requirement, not communication training") — the ruling doesn't change their gap status, just removes a moot secondary consideration.

### Ruling 3 — Section 1a in scope, mapped to Safety Academy SMS courses

The four SMS-pillar items (1a.1 Hazard identification, 1a.2 Safety risk assessment, 1a.3 Risk mitigation and management, 1a.4 Effectiveness of safety risk management) move from "ambiguous, not yet approved for sourcing" (D-059 §6 item 3) to confirmed Strong, sourced from **AQ-080 (Safety Risk Management)** for 1a.1-1a.3 and **AQ-081 (Safety Assurance)** for 1a.4.

### Re-derived summary — corrected count, a second arithmetic issue caught and fixed

While re-deriving I found the original inventory's own §4 summary had undercounted its own table by one: **6.2 Work logging and recording** was marked GAP in the section-6 table but omitted from the §4 summary list — the original document had already flagged this exact class of discrepancy once ("I listed 15 items as GAP... not 14... flagging my own arithmetic here") without catching this specific instance. The true original table-gap count was **16**, not 15.

Applying rulings 2-3 to that corrected baseline: 16 original table-gaps + 3 newly gapped by the cross-jurisdiction ruling (6.4, 9.1, 4.13) = **19 real gaps**. The four Section-1a items were never in the gap bucket (they were "Partial (SMS-sourced)," an ambiguous-but-sourced status) and ruling 3 confirms them as Strong rather than moving them out of a gap count they were never in.

- **Real gap: 19** (full list + authoring guidance: `docs/05-run-records/GAP-WORKLIST-GM1-INITIAL-TRAINING.md`)
- **Non-gap (Strong + Partial combined): 47** — 66 − 19 = 47, the authoritative count, verified directly against the full 66-item re-derivation table rather than trying to reconcile running Strong/Partial sub-totals across two documents (the same kind of running-tally arithmetic that produced the original 15-vs-16 discrepancy in the first place).
- Within the 47: **8.1** (Responsibility) is downgraded from Strong to Partial (AQ-160, its more precise source, is excluded by ruling 2; AQ-085 alone is a real but weaker fit).

### Ruling 4 — gap worklist

Produced as `docs/05-run-records/GAP-WORKLIST-GM1-INITIAL-TRAINING.md` — 19 rows, each with GM1 item number, paraphrase, spine topic, and a one-line authoring-guidance statement. Not summarized or abbreviated, per the owner's explicit "exact and complete" instruction.

### Ruling 5 — import execution design

**Atomization principle:** one atom per *source lesson's own section* (its natural boundary, per the owner's original D-059 instruction: "split at the lesson's own section boundaries"), not one atom forced per GM1 item. Where a single AQ lesson section substantively teaches multiple GM1 items at once (e.g. AQ-083's "Performance-Shaping Factors" section covers fatigue, stress, workload, time pressure, and complacency together as one cohesive lesson), it becomes **one** atom, linked to **multiple** spine topics via multiple `AtomTopicMap` rows — not artificially fragmented into per-item duplicates, which would both violate the no-editorial-change fidelity rule (splitting a cohesive lesson isn't "the lesson's own boundary") and create redundant near-duplicate atoms.

**Scope discipline:** one atom per non-gap GM1 item's *primary* listed candidate source, not an exhaustive import of every secondary/overlapping source named in the original inventory. Every one of the 47 non-gap items gets at least one real atom; additional supplementary/redundant coverage from secondary sources is left for a future pass if the owner wants deeper multi-source coverage per item. Flagged here as a scope decision, not silently assumed.

**Content authoring/import content lives in tracked files, not just DB rows** — `prisma/dev.db` is gitignored (ephemeral, regenerable), so per this project's own established seed-script convention (D-058's `RegulatoryClause` seed, D-060/D-061's spine seed), the actual imported content is written to tracked content files under `prisma/baseline-content/<course-code>/<section-slug>.md` (frontmatter: atomTitle, sourceCourse, sourceFile [the real AQ path], sourceSection, gmItems, spineTopicCodes; body: the verbatim extracted lesson content), and a new `prisma/seed-baseline-content.ts` script reads them and creates the DRAFT atoms + `AtomTopicMap` rows idempotently — same pattern as every other seed in this project, and reproducible without needing the live DB as the source of truth.

**AtomTopicMap timing — a small, deliberate extension of the D-060 design, logged rather than silently done:** D-060's design says `AtomTopicMap` is "set at atom approval." Imported atoms land in `DRAFT` status (per the owner's own standing constraint — nothing arrives pre-approved) and stay there until a human approves them through the real workflow. But the owner's ruling 6 asks for a traceability matrix showing "covered-pending-approval vs. gap" for this batch *before* any approval happens — which requires the topic linkage to exist pre-approval. Resolution: the import seed creates `AtomTopicMap` rows at **atom-creation time** (`mappedBy: "system:seed-baseline-content"`), not at approval time. This doesn't contradict the spec's intent (the spec gates atom *approval/publication* behind human sign-off, not the *content-authoring-time* decision of what topic a draft is about) and makes `approvalGap` (not `coverageGap`) the correct, visible status for every imported item in the matrix until a human approves the atom. When a human later approves via `POST /api/atoms/:id/approve`, the existing optional `topicIds` parameter is idempotent against an already-present mapping (the route's `upsert` no-ops if the pairing already exists) or purely additive if the approver adds more.

**Fidelity:** content is copied from the read-only source files as authored — no rewriting, summarizing, or "improving." Minor format conversion (stripping Teachable-specific markdown scaffolding like `[ON SCREEN: ...]` slide cues where they're pure production direction rather than teaching content, converting to the atom content format) is within the owner's own stated allowance; no substantive prose is altered. Source folders are never modified, moved, or written into.

**Course list and section assignments for this import batch:** AQ-083 (5 sections), AQ-086 (3 sections), AQ-050 (3 sections, including a thin/partial 10.4 segment honestly flagged as depth-limited), AQ-084 (5 sections), AQ-085 (4 sections), AQ-080 (1a.1-1a.3), AQ-081 (1a.4), AQ-092 (2.1), AQ-093 (2.2), AQ-076 (2.4, 10.2), AQ-091 (2.5), AQ-082 (2.6, 10.5), AQ-088 (1.3, 10.3), AQ-075 (10.1) — 14 source courses, all previously inventoried read-only in D-059.

**Status:** import execution follows immediately after this entry, same commit boundary. Final atom count, updated traceability matrix, and this gap worklist are the deliverables presented to the owner per ruling 6 — no atom approvals are performed by this work; that decision is explicitly the owner's.

## D-063: coverage-computation defect found by actually running the matrix — topic-sharing is not a reliable per-clause coverage signal

**Date:** 2026-08-08
**Trigger:** after the D-062 content import (34 atoms, 40 AtomTopicMap rows), verifying the traceability matrix end-to-end against the real DB — not a design review, an actual `GET /api/regulatory-traceability` execution — showed only **8** coverage gaps where the re-derived gap worklist (D-062) said there should be **19**.

**Root cause:** `RegulatoryTraceabilityService.buildMatrix()` (as built in D-060) counted a clause "covered" if ANY atom was reachable via `ClauseTopicMap -> RequirementSpineTopic -> AtomTopicMap` — i.e. if any atom shared the clause's spine topic at all. GM1's 66 items resolve to only 15 spine topics, so several very different clauses share one broad topic. Concretely: the imported atom about "violations" (GM1 3.3) is linked to `SP-07 Error-Models`; GM1 item 4.7 "Claustrophobia and physical access" is *also* mapped to `SP-07` (its own broad-fit assignment from D-060) — so the matrix reported 4.7 as covered, even though not one word of actual claustrophobia content exists anywhere in the imported set. Same mechanism silently "covered" 1.2, 2.3, 4.7, 4.8, 4.9, 4.14, 5.10, 5.11, 6.2, 6.4, 7.3 — 11 of the 19 real gaps.

This is not a coding bug in the narrow sense (the query did exactly what D-060 specified) — it's a design defect: topic-indirection is genuinely valuable for its intended purpose (letting a *future* regulator pack's clauses automatically inherit coverage from atoms already mapped to a shared spine topic, so the curriculum never needs re-mapping per regulator) but is not precise enough to answer "does *this* GM1 clause specifically have covering content" when dozens of clauses share one topic. Caught only because the matrix was actually run against real imported data, not from reviewing the design — consistent with this project's own standing evidence rule (only executed proof counts).

**Fix:**
- `PolicyPackClause.mappedAtomIds` (the pre-existing, real WP-4.5 direct clause->atom mechanism) is now populated **precisely**, at import time, for exactly the GM1 items each atom's own frontmatter declared it covers (`prisma/seed-baseline-content.ts`) — not inferred from shared topics.
- `RegulatoryTraceabilityService.buildMatrix()` rewritten: `atoms` / `coverageGap` / `approvalGap` / `coveredClauses` / `approvedClauses` are now computed from `mappedAtomIds` **only**. Topic-indirection is still queried and surfaced as a new, clearly-separated `topicRelatedAtoms` field per row — real, useful information ("other atoms exist on this clause's broad topic elsewhere in the curriculum") — but it no longer counts toward coverage.
- `AtomTopicMap` rows are unchanged and still created at import time — they remain correct, real infrastructure for the spine's actual purpose (a future CAAC-pack-style adoption reusing these atoms via their own, separately-judged clause->topic mapping). This fix doesn't remove or weaken that; it just stops using topic-sharing as a proxy for GM1's own, much finer-grained coverage question.

**Re-verified after the fix:** `GET /api/regulatory-traceability` now reports the expected **19** `coverageGap` clauses, matching the gap worklist exactly (item-for-item cross-checked), and **47** `approvalGap` ("covered-pending-approval") clauses — all draft, none approved, matching D-062's import scope precisely.

**Status:** fixed in the same commit boundary as the D-062 import. `RegulatoryTraceabilityService.test.ts` updated to test the corrected (direct-link-primary) behavior.

## D-064: FAA 14 CFR Part 145 / AC 145-10 policy pack — drafted, real cross-pack content reuse proven

**Date:** 2026-08-08
**Trigger:** owner directive to draft the FAA Part 145 pack (WP-4's own spec §4 candidate queue, "FAA Part 145... CAAC pattern as the template"), following D-060's fold-in decision.

**Correction to my own assumption, caught by the owner asking a direct question rather than by my own diligence:** I initially assumed no dedicated FAA Part 145 HF course existed in the AQ library and was about to draft the pack from independent web research alone. The owner asked "Don't we already have the FAA HF training in the folder?" — prompting a review of the full `Teachable` tree beyond the two folders D-059 originally inventoried. Found:
- **`FAA 145 Accountable/Teachable Lessons`** (a third, previously un-inventoried folder) contains **AQ-145 — FAA Part 145 Accountable Manager Training**, built 2026-08-07 (one day before this work), with genuine 14 CFR Part 145 citations independently verified against ecfr.gov by its own author, including documented corrections to prior textbook citation errors (a real, high-quality source — the FAA-side equivalent of what AQ-160 is for CCAR). Session 5 "Personnel, Training & Certification" is the direct match: covers 145.151/153/155/157/159/160/161/163/165 and AC 145-10 in detail, including the exact regulatory character of HF training under FAA rules.
- **AQ-166 "CCAR 145 R4 Human Factors Deep Dive"** is also now complete (the D-059 inventory's "PARTIAL — Burrana-specific materials only" finding was accurate when written 2026-07-21, but the course was finished afterward — confirmed via its own `_Archive (pre-Core6 2026-07-24)` folder, indicating a build pass after that date). CCAR-cited throughout; valid future material for the (still un-instantiated) CAAC pack, not usable here per the cross-jurisdiction ruling.
- The `10 - Aviation Regulatory (FAA-EASA)` category folder was also checked — all administrative/process courses (FAA Form 8130-3, ODA/Delegation, dual release), none HF-specific.

**Regulatory finding, corrects part of D-058's own earlier research:** D-058 concluded "no competing FAA-specific HF topic taxonomy exists," based on AC 145-10's primary PDF returning HTTP 403. Fresh web search (two independent characterizations) surfaces that AC 145-10 par. 301 *does* list twelve suggested (non-mandatory) HF indoctrination elements — Vision, Hearing, Stress, Situational awareness, Workload management, Human performance and limitation, Introduction to human factors, Statistics, Safety culture/organizational factors, Human error, Types of errors in maintenance task, Human reliability — closely mirroring GM1's own categories. The primary PDF still returned 403 on every fetch attempt this session (both `AC_145-10.pdf` and the CHG 1 version), so this list is `[SME]`-flagged as not yet verified against the primary document, consistent with how D-058 flagged its own EASA-PDF access limitation. AQ-145 Session 5 independently corroborates the *existence and non-mandatory character* of this list ("human factors (if adopted; may be required by bilateral agreements)") without quoting the twelve items itself.

**The regulatory character is genuinely different from CAAC or GM1, stated plainly in the pack (§0):** 14 CFR 145.163 itself contains no HF requirement at all — only a "capable of performing the assigned task" standard. AC 145-10's HF list is advisory. Two real triggers make it binding in practice: (1) once a station adopts HF content into its FAA-approved program, 145.163(a) "have and use" locks it in — AQ-145 Session 5's own knowledge check teaches exactly this; (2) a station holding/seeking EASA Part-145 approval must satisfy GM1 145.A.30(e) under the US–EU MAG bilateral special condition, and that adopted content then becomes FAA-binding too under the same "have and use" logic. This pack models an advisory-but-lockable structure — a third regulatory shape distinct from CAAC (mandatory, specific provisions) and GM1 (EASA guidance material, real prescriptive weight).

**Pack structure:** `docs/02-controlled/HF-ENGINE-POLICY-PACK-FAA-PART145-Draft1.md`, mirroring the CAAC pack's template exactly. 9 regulatory-floor clauses (145.3(a)/151/153/155/157/159/160/161/163/165 — personnel/program/records structure, no spine-topic content, same treatment GM1's own program-structure spine topics got in D-060) + 12 HF-content clauses (`AC145-10-HF.1`–`.12`, this pack's own reference numbering — the AC lists these as bullet items in one paragraph, not independently numbered provisions, stated explicitly so the numbering isn't mistaken for official AC section numbers).

**Real, executed proof of the spine architecture's "map once" benefit (D-060's original design intent):** instantiated as real `PolicyPack`/`PolicyPackClause`/`ClauseTopicMap` data (`prisma/seed-faa-part145-pack.ts`), Draft 1, unapproved (`approvedBy`/`approvedAt` null) — same two-step precedent as the GM1 and CAAC packs. Every one of the 12 HF-content clauses reuses an atom **already imported for the GM1 baseline (D-062) — zero new content authored.** Per D-063's fix, reuse is explicit and direct (`PolicyPackClause.mappedAtomIds` populated per clause, not inferred from shared spine topics), so this is real, judged content-fit, not a topic-sharing shortcut. Result: **9 of 12 suggested elements already covered-pending-approval; 3 (Statistics, Vision, Hearing) are real gaps — the identical three items the GM1 gap worklist already surfaced**, for the identical underlying reason (no source exists anywhere in the AQ library for these specific topics). Seed run twice, idempotent.

**Status:** Draft 1, unapproved, pending owner review — same gate as GM1's own coverage mapping. No atoms were created or modified by this pack; it only adds clause/topic/link records pointing at already-existing DRAFT atoms.
