# POLICY PACK: FAA 14 CFR Part 145 / AC 145-10 — HUMAN FACTORS
## STATUS: DRAFT — awaiting owner review and approval (not yet effective)

**Pack ID:** PP-FAA-Part145-HF · **Revision:** Draft 1 · **Drafted:** 2026-08-08 by Claude (working session), continuing D-058/D-060's "map the rest" candidate queue (`HF-ENGINE-REQUIREMENT-SPINE-SPEC.md` §4, "FAA Part 145... CAAC pattern as the template"). **Not yet owner-approved** — mirrors the CAAC pack's own "Drafted by Claude... Reviewed & approved by Brian R. Olea" two-step precedent (`HF-ENGINE-POLICY-PACK-CAAC-CCAR145-R4-Rev-A.md`).
**Clause source:** owner-authored AQ-145 (`FAA 145 Accountable/Teachable Lessons`, built 2026-08-07) Session 5 "Personnel, Training & Certification" and Session 5 Source card — a real, dedicated FAA Part 145 course, independently web-verified against ecfr.gov by its own author on 2026-08-07, with documented corrections to prior textbook citation errors. All references cite section number and regulatory intent only — no regulatory text is reproduced.
**AC 145-10 suggested-elements list:** sourced from web search (two independent characterizations, both consistent) since the primary FAA PDF (`AC_145-10.pdf` and its CHG 1) returned HTTP 403 to direct fetch on every attempt this session — a real access limitation, flagged rather than silently worked around, same treatment D-058 gave its own 403'd EASA PDF. **`[SME]` — primary-document verification still needed** before this pack is treated as final; items so flagged below.

---

## 0. The regulatory character of FAA HF training — materially different from CAAC and EASA, stated plainly

This is not a parallel structure to the CAAC or GM1 packs, and presenting it as one would misrepresent the regulation. Verified via AQ-145 Session 5 and cross-checked against D-058's own earlier 14 CFR 145.163 research:

- **14 CFR 145.163 itself contains no human-factors requirement.** Its only content standard is that the training program "ensure each employee assigned to perform maintenance, preventive maintenance, alterations, or inspection functions is capable of performing the assigned task" (145.163(b)). Capability, not a topic list.
- **AC 145-10 CHG 1** lists human factors as one *suggested* indoctrination-training subject among several (alongside CFR requirements, company manuals, hazmat awareness, computer systems, facility security) — explicitly "if adopted; may be required by bilateral agreements" (AQ-145 Session 5, citing AC 145-10 par. 301). The AC's own preface (per AQ-145's citation) states it is "an acceptable means, not the only means, of compliance."
- **The one real, binding trigger is the station's own choice, once made.** AQ-145 Session 5 makes this the explicit teaching point of its own knowledge check: once a station adopts HF content into its FAA-approved training program, 145.163(a)'s "have and use" duty makes continued delivery of that content a compliance matter — dropping it later without a processed program revision is a violation, even though adopting it in the first place was voluntary.
- **The second real, binding trigger is EASA overlap.** A US repair station holding or seeking EASA Part-145 approval must implement EASA's HF training mandate (GM1 145.A.30(e) — the pack already built in this engine) under the US–EU bilateral MAG special condition. For such a station, the "voluntary" FAA-side HF content is not voluntary in practice — and once it's written into the FAA-approved program to satisfy that EASA obligation, the same 145.163(a) "have and use" duty locks it in on the FAA side too.
- **Practical consequence for this pack:** unlike the CAAC pack (real regulatory mandate, specific provisions) or GM1 (EASA guidance material with real prescriptive weight), this pack models an **advisory-but-lockable** structure — mandatory program/records/personnel provisions, plus an HF-content topic list that is regulator-suggested rather than regulator-required, becoming binding only through the station's own adoption or an EASA cross-obligation.

## 1. Applicability criteria

Organizations holding or seeking an FAA Part 145 repair station certificate. HF-content clauses (§2 below) apply once the organization adopts human factors content into its FAA-approved training program (145.163(a)) — voluntarily, or because it also holds/seeks EASA Part-145 approval and must satisfy GM1 145.A.30(e) under the bilateral MAG special condition.

## 2. Regulatory-floor clauses (mandatory, program/personnel structure — not HF-content, no spine-topic mapping)

| # | Clause | Requirement | Source |
|---|---|---|---|
| 1 | 145.3(a) | Accountable manager: responsibility for and authority over all Part 145 operations; primary FAA contact | AQ-145 Session 5 |
| 2 | 145.151 | Personnel requirements: designate AM; sufficient qualified personnel; determine noncertificated employees' abilities | AQ-145 Session 5 |
| 3 | 145.153 | Supervisory personnel: sufficient supervisors, appropriately certificated, oversee unfamiliar work | AQ-145 Session 5 |
| 4 | 145.155 | Inspection personnel: familiarity with regulations/methods, proficiency with equipment, article-specific | AQ-145 Session 5 |
| 5 | 145.157 | Return-to-service authorization: Part 65 certification, English proficiency | AQ-145 Session 5 |
| 6 | 145.159 / 145.160 | Repairman recommendation (65.101 eligibility); former-FAA-employee cooling-off | AQ-145 Session 5 |
| 7 | 145.161 | Rosters (management/supervisory, inspection, RTS) + employment summaries, 5-business-day currency | AQ-145 Session 5 |
| 8 | 145.163(a)/(b)/(c)/(d) | FAA-approved training program (initial + recurrent); capability standard; 2-year records; revision procedure | AQ-145 Session 5 |
| 9 | 145.165 | Hazmat training (49 CFR 171.8 / Part 172 Subpart H triggers; operator-specific hazmat authorization) | AQ-145 Session 5 |

These are real, verified Part 145 requirements — deliberately not force-mapped to a spine topic. They govern *who* may be trained/authorized and *that* a program must exist; they are not themselves HF syllabus content, the same reasoning D-060 applied to GM1's own program-structure spine topics (SP-02/03/04).

## 3. HF-content clauses (AC 145-10 §301 suggested indoctrination elements — advisory, `[SME]` pending primary-source verification)

AC 145-10 par. 301 lists these as bullet items within one advisory paragraph, not independently numbered regulatory provisions — clause identifiers below (`AC145-10-HF.n`) are this pack's own reference scheme, not official AC section numbers. Coverage reuses the **same atoms already imported for the GM1 145.A.30(e) baseline** (D-062) — no new content authored. Two items remain real gaps for the identical underlying reason already flagged in `GAP-WORKLIST-GM1-INITIAL-TRAINING.md`.

| # | Element (AC 145-10 par. 301) | Spine Topic | Coverage (reused atom) |
|---|---|---|---|
| AC145-10-HF.1 | Introduction to human factors | SP-01 HF-Definition | Covered — "Why Competent People Make Mistakes" (AQ-083) |
| AC145-10-HF.2 | Statistics | SP-14 SMS-Interface | **Gap** — same as GM1 1.2, no source found anywhere in the library |
| AC145-10-HF.3 | Safety culture/organizational factors | SP-10 Organizational-Influences | Covered — "Visible Commitment and Going to the Floor" (AQ-093), "From Pathological to Generative" (AQ-091) |
| AC145-10-HF.4 | Human error | SP-07 Error-Models | Covered — "The Swiss-Cheese Model" (AQ-083) |
| AC145-10-HF.5 | Types of errors in maintenance task | SP-07 Error-Models | Covered — "Error Types: Why Competent People Err" (AQ-083) |
| AC145-10-HF.6 | Human reliability | SP-07 Error-Models | Covered — "Designing the Error Out, and the Limits of Catching It" (AQ-050) |
| AC145-10-HF.7 | Vision | SP-15 Physical-Environment-Performance-Limitations | **Gap** — same as GM1 4.1, no source found anywhere in the library |
| AC145-10-HF.8 | Hearing | SP-15 Physical-Environment-Performance-Limitations | **Gap** — same as GM1 4.2, no source found anywhere in the library |
| AC145-10-HF.9 | Stress | SP-05 Fatigue-Management | Covered — "Performance-Shaping Factors" (AQ-083), "Human Limits" (AQ-050) |
| AC145-10-HF.10 | Situational awareness | SP-07 Error-Models | Covered — "Situational Awareness: The Shared Mental Model" (AQ-084) |
| AC145-10-HF.11 | Workload management | SP-05 Fatigue-Management | Covered — "Workload and Task Management" (AQ-084), "Performance-Shaping Factors" (AQ-083) |
| AC145-10-HF.12 | Human performance and limitation | SP-07 Error-Models | Covered — "Why Good People Make Errors: Human Limits" (AQ-050) |

**Result: 9 of 12 suggested elements already have covered-pending-approval content; 3 (Statistics, Vision, Hearing) are real gaps — not new gaps, the same three items the GM1 gap worklist already surfaced.** This is the concrete "map once" proof the spine architecture was built for (D-060): zero new atoms were authored for this pack.

## 4. Recurrence requirements

145.163 sets no numeric recurrence interval — "initial and recurrent training," interval left to the approved program. **No default asserted here** (unlike GM1's 24-month guidance figure, which has independent multi-source corroboration) — `[SME]`: recurrence interval should be set at pack adoption per the adopting organization's own approved program, or left to whatever interval the EASA-side obligation already drives for a dual-certificated station.

## 5. Mandatory audiences

145.163(b): "each employee assigned to perform maintenance, preventive maintenance, alterations, or inspection functions." AC 145-10's indoctrination category (where HF sits) is typically all-personnel, broader than the certificated-technician-only scope — `[SME]` to confirm against the primary AC text once accessible.

## 6. Assessment & effectiveness expectations

145.163(c): document individual training in an FAA-acceptable format, retain minimum 2 years (matches this engine's existing evidence-retention pattern). AC 145-10's own evaluation-methods table (per AQ-145 Session 5: formal exam, certificates, course completion, practical evaluation, on-the-job assessment, oral exam) favors demonstrated capability over attendance — consistent with this engine's Level-2/Level-3 effectiveness model; pack-level Level assignment not set here, `[SME]`/owner decision at adoption.

## 7. Retention & records

145.163(c): 2-year minimum, individual employee training records, FAA-acceptable format. No engine-default retention period asserted beyond the regulatory floor — unlike the CAAC pack (which added an engine-default "cert + 5 years" on top of its own regulatory floor), left to owner decision at adoption.

## 8. Approval block

| Field | Value |
|---|---|
| Pack | PP-FAA-Part145-HF Draft 1 |
| Drafted by | Claude (from owner-authored AQ-145 Session 5, verified 2026-08-07 by its own author against ecfr.gov; AC 145-10 suggested-elements list from web search, primary PDF inaccessible — no authority) |
| Reviewed & approved by | *(pending)* |
| Approval ref | *(pending)* |
| Effective date | *(pending)* |
| Open SME items | AC 145-10 suggested-elements list (§3) not yet verified against the primary PDF/CHG 1 (403 on every fetch attempt this session); recurrence interval (§4) and mandatory-audience scope (§5) left owner-set at adoption, no default asserted |
