# REQUIREMENT SPINE & MULTI-REGULATION PACK MAPPING — SPECIFICATION
**Status:** APPROVED for implementation — spine topic set SP-01..SP-14 approved by Brian R. Olea 2026-08-06 (working session, ref HFPP-CCB-2026-001) as Spine Revision 1. WP-4 implements this spec; spine changes require owner approval and a new spine revision.
**Purpose:** one HF training program, N per-regulation compliance views. Customers adopt the Policy Packs matching their certificates; the engine maps every pack's clauses to a regulator-neutral **Requirement Spine**, and training content maps to spine topics once. Adding a regulator never requires re-mapping the curriculum.

## Revision history
- **Spine Revision 1 (2026-08-06):** SP-01..SP-14 approved (ref HFPP-CCB-2026-001).
- **Spine Revision 1, Amendment 1 (2026-08-08, owner decision, DECISIONS.md D-061):** added **SP-15 Physical-Environment-Performance-Limitations**. Origin: while mapping the GM1 145.A.30(e) EASA pack (D-060), several Section 4/5 items (vision, hearing, noise, illumination, climate, motion/vibration) only reached a broad PARTIAL fit under SP-07 Error-Models — a genuine granularity gap flagged, not silently smoothed over. The owner approved closing it by adding a dedicated topic rather than continuing to force these into Error-Models. Additive only — no existing SP-01..SP-14 row's title/intent changed, so this amendment does not require a spineRevision integer bump (existing `RequirementSpineTopic` rows at `spineRevision: 1` are unaffected; SP-15 joins them at the same revision).

---

## 1. The model (three layers)

```
Regulation layer:   PolicyPack (per regulator/standard, versioned)
                      └─ PolicyPackClause (clause ref + intent summary + audiences + recurrence)
Mapping layer:      ClauseTopicMap (clause → spine topic, coverage FULL/PARTIAL/DELTA + delta note)
Neutral layer:      RequirementSpineTopic (regulator-neutral HF requirement topics)
Content layer:      LearningAtom.objectives → spine topics (mapped once, at authoring/approval)
```

**Compliance view for an adopted pack** = for each of its clauses: clause → spine topic(s) → atoms covering those topics → learner completion/effectiveness evidence → status (Covered / Partially covered / Gap / Exceeds). DELTA clauses (regulator-specific requirements with no spine equivalent, e.g. CAAC numeric working-hour limits) attach directly to atoms or render as in-pack obligations — never silently dropped, per the no-blending rule: each pack's deltas stay visibly that pack's.

## 2. Requirement Spine — DRAFT topic set (owner approval required)

| ID | Topic | Intent (regulator-neutral) |
|---|---|---|
| SP-01 | HF-Definition | HF/human performance is a defined, scoped concept in the management system |
| SP-02 | Initial-HF-Training | Personnel receive foundational HF training before/upon entering duties |
| SP-03 | Training-Scope-Breadth | All relevant personnel categories are in HF-training scope, not only certifying staff |
| SP-04 | Recurrent-Training | HF training recurs — periodic and/or trigger-based (regulatory change, procedure change, events) |
| SP-05 | Fatigue-Management | Fatigue as an error condition; organizational controls on working time/alertness |
| SP-06 | Substance-Awareness | Psychoactive substance risk, including medication scope where applicable |
| SP-07 | Error-Models | Human error models and error-producing conditions (e.g., Dirty Dozen, active/latent) |
| SP-08 | Communication-Handover | Communication failure modes; shift/task handover discipline |
| SP-09 | Procedural-Documentation-Discipline | Procedure compliance, documentation validity, data-control interfaces with HF |
| SP-10 | Organizational-Influences | Organizational/latent conditions, supervision, workload allocation, culture |
| SP-11 | Just-Culture-Reporting | Reporting culture, just culture, non-punitive reporting expectations |
| SP-12 | Effectiveness-Verification | Training effectiveness is verified beyond completion |
| SP-13 | Competence-Records | Training/competence records exist, are controlled and retrievable |
| SP-14 | SMS-Interface | HF program interfaces with the safety/quality management system |
| SP-15 | Physical-Environment-Performance-Limitations | Physical/sensory environment and performance limitations (vision, hearing, noise, illumination, climate, motion/vibration) — added Amendment 1, 2026-08-08, owner decision (D-061) |

Owner may add/rename/merge; spine changes are versioned (spine revision recorded in every dossier).

## 3. Schema additions (Code implements in WP-4)

- `RequirementSpineTopic` (id, code SP-xx, title, intent, spineRevision, status)
- `PolicyPack` (already specified in v3 §6.4 — add spineRevision field)
- `PolicyPackClause` (packId, clauseRef, intentSummary, audiences, recurrenceNote, smeFlags[])
- `ClauseTopicMap` (clauseId, topicId, coverage: FULL|PARTIAL|DELTA, deltaNote, approvedBy, effectiveDate)
- `AtomTopicMap` (atomId, topicId, mappedBy, approvedAt) — set at atom approval; kernel condition if a published atom has no topic mapping
- `PackAdoption` (tenantId/org, packId, packRevision, adoptedAt, approvedBy) — drives which compliance views render
- Dossier §1 renders one requirement-mapping section **per adopted pack**, each showing: clause table, coverage status, evidence links, deltas, "exceeds requirement" items, and any `[SME]`/pending flags honestly.

## 4. Authoring workflow for each additional regulator (the "map the rest" process)

1. Owner supplies (or approves a Claude draft mined from owner-authored course sources, as done for CAAC): clause list by article + intent, audiences, recurrence basis, deltas. **Never invented; SME-verify checklist carried where applicable.**
2. Pack drafted → clause→spine mapping table drafted → owner approves pack + mapping (approval block, real effective date).
3. Import into engine as versioned pack. Compliance view is live immediately — atoms are already spine-mapped.
4. Candidate queue (owner-authored source material exists in the AQ library for most): FAA Part 145 · EASA Part-145 · UK CAA · TCCA · CASA · AS9100D-context HF · AS9110C-context HF · MDSAP/13485-context (medical HF) — each to be drafted one at a time against this spine, CAAC pattern as the template.

## 5. Rules
Spine topics are intent-level only — never clause text. Coverage judgments are owner-approved, not AI-decided (AI Assist may draft; kernel flags unmapped published atoms; humans approve all mappings). A pack's compliance view never borrows evidence from another pack's deltas. Where a regulator exceeds the spine, the delta stays in-pack; where the engine exceeds a regulator, the view shows "exceeds requirement" — both directions visible, per the never-blend rule.
