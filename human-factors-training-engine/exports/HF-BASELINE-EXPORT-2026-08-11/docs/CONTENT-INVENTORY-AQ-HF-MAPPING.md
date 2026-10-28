# Content Inventory & Mapping — Annex Quality Source Material vs. GM1 145.A.30(e) Baseline

**Status:** DRAFT — awaiting owner review and approval. Nothing in this document has been imported. No draft atoms exist yet from this material.
**Scope:** inventory + proposed mapping only, per the owner's explicit instruction: *"Stop and show me the inventory + mapping for approval before importing anything."*
**Sources inventoried (read-only throughout — nothing modified, moved, or written into either folder):**
- `E:\Conform-Edge\ClaudeCowork\02 Active Projects\Teachable\Teachable Lessons\HF-TRAINING-COMPLETE-2026-07-21` (4 courses: AQ-083, AQ-086, AQ-160, AQ-050)
- `E:\Conform-Edge\ClaudeCowork\02 Active Projects\Teachable\Teachable Lessons\11 - Safety Academy (SMS)` (31 courses AQ-075–AQ-105, plus DOT Drug/Alcohol program, plus FAA Part 5 SMS series)
**Mapping target:** the 66-item GM1 145.A.30(e) syllabus seeded in `prisma/seed-regulatory-clauses.ts` (D-058).

---

## 0. TOP FLAG — an architectural fork the owner needs to resolve, not me

Mid-inventory, reading `docs/02-controlled/` for context, I found something D-058 did not know about: an **already-approved, broader architecture** that this baseline-training work may be duplicating rather than reusing.

- `docs/02-controlled/HF-ENGINE-REQUIREMENT-SPINE-SPEC.md` — **status APPROVED for implementation**, spine topics SP-01..SP-14 approved by the owner **2026-08-06** (the same day as this session). It defines a three-layer model: `PolicyPack` (per regulator) → `ClauseTopicMap` (clause → regulator-neutral spine topic) → `RequirementSpineTopic`. Its own §4 "Authoring workflow for each additional regulator" lists a **candidate queue that explicitly names "EASA Part-145"** as a pack to be drafted against this spine, "CAAC pattern as the template."
- `docs/02-controlled/HF-ENGINE-POLICY-PACK-CAAC-CCAR145-R4-Rev-A.md` — **status APPROVED, effective 2026-08-06** — an already-approved CAAC CCAR-145 R4 policy pack, drafted from **the same AQ-160/AQ-166 source material** this inventory is now looking at, mapped to spine topics SP-01 through SP-12. Its recurrence decision: **24 months** (owner-approved) — independently corroborates the 24-month figure D-058 used as unconfirmed GM/industry guidance.
- The `PolicyPack` / `PolicyPackClause` Prisma models **already exist** in `schema.prisma` (WP-4.5, shipped earlier this session per the task log) — `PolicyPackClause.mappedAtomIds` is already a working clause→atom linking mechanism, structurally different from the new `RegulatoryClause.atoms` relation D-058 just added.
- The spine layer itself (`RequirementSpineTopic`, `ClauseTopicMap`, `AtomTopicMap`, `PackAdoption`) is **not yet built** — only the pack/clause shell exists in code today.

**What this means concretely:** D-058 built a bespoke, single-framework `RegulatoryClause` table + `LearningAtom.regulatoryClauseId` FK for GM1 145.A.30(e), reusing the atom/approval/compile pipeline as instructed — but it did **not** reuse the `PolicyPack`/spine mechanism the owner had already approved the same day for exactly this purpose ("map the rest... EASA Part-145... CAAC pattern as template"). I did not know that spec existed when D-058 was designed. Two real options exist and I am not choosing between them:

1. **Keep D-058's `RegulatoryClause` model as-is** for GM1 145.A.30(e), treating it as a simpler, single-framework baseline distinct from the multi-regulator `PolicyPack` system (which stays reserved for cases needing the full spine/multi-pack compliance view, e.g. CAAC). Fastest path; leaves two parallel clause-to-atom linking mechanisms in the schema long-term.
2. **Fold GM1 145.A.30(e) into the `PolicyPack`/spine model instead** — represent it as a new `PolicyPack` (`regulatoryFramework: "GM1 145.A.30(e)"`), its 66 items as `PolicyPackClause` rows, and (once the spine layer is built in WP-4) map each to spine topics SP-01..SP-14 the same way the CAAC pack already is. This is more consistent with the owner's own approved direction and avoids a second parallel content path, but means migrating what D-058 just shipped and likely deferring full HF-baseline delivery until spine tables (`ClauseTopicMap`, `AtomTopicMap`) exist.

I'm flagging this rather than picking one, per the owner's own standing instruction to flag regulatory/architectural ambiguity instead of resolving it silently. **This decision should be made before any content import proceeds**, since it determines which table baseline atoms actually attach to.

---

## 1. Source-folder structural findings (informational, not compliance-blocking)

- **Duplicate folder:** `HF-TRAINING-COMPLETE-2026-07-21/AQ-083-Human-Factors` (unprefixed) is a byte-identical duplicate of `01-AQ-083-Human-Factors` (verified via `diff -rq` + MD5 on the largest file — zero differences). Redundant, not a content risk. Left untouched.
- **AQ-160 file-pair drift:** the course has both a numbered-folder copy (`05 - Instructor Materials/AQ-160_Module-Content.md`) and a flat-root copy (`Module-Content.md`) that are *not* identical — the numbered copy has a full closing attribution footer the flat copy lacks, plus one name-completion difference ("Miguel" vs "Miguel Santos"). Neither file cross-references or supersedes the other. I read the numbered copy as canonical.
- **Internal inconsistencies self-flagged by the source material itself** (not discovered independently by me — the authors' own Source-and-Accuracy-Notes call these out): stale "legacy v1.0" admin/pricing/duration files coexist unreconciled alongside the current build for AQ-083, AQ-086, and AQ-050 (duration drift as large as 8 hrs stated vs. ~79 min actual narrated content for AQ-083; pricing drift on AQ-086 and AQ-050). AQ-160 is the one course where stated and actual duration reconcile (210 min stated vs. ~185 min summed).
- **AeroMach Components (the recurring fictional case study) is not one consistent entity** across courses — different cast, different org size/profile in AQ-160 vs. AQ-083/086/050. Not a compliance issue, just worth knowing before quoting "the AeroMach case" as a single asset.
- Dangling course references: AQ-160 names a prerequisite "AQ-C01" not present in either folder; AQ-050 hands off to "AQ-044/045/046" (RCA/CAPA) also not present.

---

## 2. The regulatory-framework mismatch (already partly known, now confirmed at content level)

Only **AQ-160** contains actual clause-numbered regulatory citations, and every one of them is **CAAC CCAR-145 R4** (China) — none are EASA or FAA. AQ-083, AQ-086, and AQ-050 are, by their own authors' design, **regulator-agnostic conceptual courses** (SHELL model, error taxonomy, Dirty Dozen, Swiss-Cheese model, hierarchy of controls) with zero CCAR/EASA/FAA citations in either their content or their Source-and-Accuracy-Notes — they were written to be regulator-neutral, which is actually favorable for mapping onto GM1 145.A.30(e) (an EASA syllabus) on topic/concept fit rather than citation authority.

The Safety Academy courses AQ-084 (CRM) and AQ-085 (MRM) are similarly regulator-agnostic and concept-driven.

**Practical conclusion:** the CAAC/EASA framework mismatch is real but narrow — it affects AQ-160 specifically (and the DOT/FAA-folder content, which is 49 CFR Part 40 / 14 CFR Part 120 / 14 CFR Part 5, a different compliance domain again: substance-testing and SMS certificate compliance, not HF pedagogy). It does not block using AQ-083/084/085/086/050's *concepts* as GM1-mapped content, provided any imported atom is honest in its `contentSource` and `sourceClause` about being a concept-fit import, not a CAAC-clause-derived one.

---

## 3. Proposed clause-by-clause mapping (GM1 145.A.30(e), all 66 items)

Legend: **Strong** = direct topic match, ready to source from named lesson. **Partial** = related but not a full match, would need supplementing. **GAP** = no covering content found in either source folder. Course codes: AQ-083 (Human Factors foundation, folder 1), AQ-086 (Dirty Dozen, folder 1), AQ-160 (Personnel/HF/Airworthiness, folder 1, CAAC-cited), AQ-050 (HF Quality, folder 1), AQ-084 (CRM, folder 2), AQ-085 (MRM, folder 2), plus supporting Safety Academy courses noted where relevant.

### Section 1 — General/Introduction to Safety Management and Human Factors
| Item | Label | Fit | Candidate source |
|---|---|---|---|
| 1.1 | Need to address safety mgmt & HF | Partial | AQ-083 Welcome ("error is normal" thesis); AQ-075 SMS Awareness intro |
| 1.2 | Statistics | **GAP** | No course cites accident/incident statistics |
| 1.3 | Incidents | Partial | AQ-087 RCA / AQ-088 Incident Investigation teach *process*, not incident-driven motivation specifically |
| 1a.1 | Hazard identification | Partial (SMS-sourced) | AQ-075, AQ-080 SRM |
| 1a.2 | Safety risk assessment | Partial (SMS-sourced) | AQ-080 SRM |
| 1a.3 | Risk mitigation and management | Partial (SMS-sourced) | AQ-080 SRM |
| 1a.4 | Effectiveness of safety risk management | Partial (SMS-sourced) | AQ-081 Safety Assurance, AQ-104/105 SPI/SPT |

### Section 2 — Safety Culture/Organisational Factors
| Item | Label | Fit | Candidate source |
|---|---|---|---|
| 2.1 | Justness/trust | Strong | AQ-092 Just Culture |
| 2.2 | Commitment to safety | Strong | AQ-079 Executive SMS, AQ-093 Leadership |
| 2.3 | Adaptability | **GAP** | AQ-094 Change Management is process-focused, not a real fit |
| 2.4 | Awareness | Partial | AQ-076 SMS Participation, AQ-082 Safety Promotion |
| 2.5 | Behaviour | Strong | AQ-091 Safety Culture |
| 2.6 | Information | Partial | AQ-082 Safety Promotion, AQ-090 Lessons Learned |

### Section 3 — Human Error
| Item | Label | Fit | Candidate source |
|---|---|---|---|
| 3.1 | Error models and theories | Strong | AQ-083 Sec 4 (Swiss-Cheese); AQ-050 Sec 2 |
| 3.2 | Types of errors in maintenance tasks | Strong | AQ-083 Sec 2 (slips/lapses/mistakes); AQ-085 Mod 1 |
| 3.3 | Violations | Strong | AQ-083 Sec 2 (routine/situational/necessary) |
| 3.4 | Implications of errors | Strong | AQ-085 Mod 5 (ground-error-to-in-service-failure chain) |
| 3.5 | Avoiding and managing errors | Strong | AQ-083 Sec 5; AQ-050 Sec 3 (hierarchy of controls, poka-yoke) |
| 3.6 | Human reliability | Partial | AQ-050 Sec 3.2 (inspection ~70–80% effectiveness figure — flagged by its own authors as an unsourced rule of thumb) |

### Section 4 — Human Performance & Limitations
| Item | Label | Fit | Candidate source |
|---|---|---|---|
| 4.1 | Vision | **GAP** | Not taught anywhere as a limitation topic |
| 4.2 | Hearing | **GAP** | Not found |
| 4.3 | Information-processing | Strong | AQ-084 CRM Mod 2 (perceive/understand/project) |
| 4.4 | Attention and perception | Strong | AQ-050 Sec 1.1; AQ-086 (distraction) |
| 4.5 | Situational awareness | Strong | AQ-084 Mod 2; AQ-085 Mod 4 |
| 4.6 | Memory | Partial | AQ-050 Sec 1.1 (fragile working memory, brief) |
| 4.7 | Claustrophobia and physical access | **GAP** | Not found |
| 4.8 | Motivation | **GAP** | Not found as a dedicated topic |
| 4.9 | Fitness/Health | **GAP** | DOT program covers substance impairment specifically, not general fitness-for-duty |
| 4.10 | Stress | Strong | AQ-083 Sec 3; AQ-086 Group 2 |
| 4.11 | Workload management | Strong | AQ-084 Mod 5; AQ-083 Sec 3 |
| 4.12 | Fatigue | Strong | AQ-083 Sec 3; AQ-086 Group 2; AQ-160 L3.4 (CCAR numeric limits — CAAC-specific, usable as illustrative only) |
| 4.13 | Alcohol, medication, drugs | Strong (cross-jurisdiction) | DOT Drug and Alcohol Program (49 CFR 40 / 14 CFR 120 — different regulatory domain than GM1, but directly on-topic); AQ-160 L3.5 (CCAR §145.29(f)) |
| 4.14 | Physical work | **GAP** | Not found |
| 4.15 | Repetitive tasks/complacency | Strong | AQ-083 Sec 3; AQ-086 Group 2 (complacency) |

### Section 5 — Environment
| Item | Label | Fit | Candidate source |
|---|---|---|---|
| 5.1 | Peer pressure | Partial | AQ-086 Group 3 (pressure); AQ-084 (authority gradient) |
| 5.2 | Stressors | Strong | AQ-083 Sec 3 |
| 5.3 | Time pressure and deadlines | Strong | AQ-083 Sec 3; AQ-086 Group 3 |
| 5.4 | Workload | Strong | AQ-084 Mod 5 (overlaps 4.11) |
| 5.5 | Shift work | Partial | AQ-085 Mod 3 covers shift *handover*, not shift-work fatigue physiology specifically |
| 5.6 | Noise and fumes | **GAP** | Not found |
| 5.7 | Illumination | **GAP** | Not found |
| 5.8 | Climate and temperature | **GAP** | Not found |
| 5.9 | Motion and vibration | **GAP** | Not found |
| 5.10 | Complex systems | **GAP** | AQ-160 airworthiness complexity is adjacent, not a real fit |
| 5.11 | Other hazards in the workplace | **GAP** | Not found |
| 5.12 | Lack of manpower | Strong | AQ-086 Group 2 (lack of resources); AQ-160 L3.3 (§145.26(a), CAAC-specific) |
| 5.13 | Distractions and interruptions | Strong | AQ-086 Group 1; AQ-085 Mod 3 (interrupted-task problem, marquee topic) |

### Section 6 — Procedures, Information, Tools and Practices
| Item | Label | Fit | Candidate source |
|---|---|---|---|
| 6.1 | Visual inspection | Strong | AQ-050 Sec 3.2 (limits of human inspection) |
| 6.2 | Work logging and recording | **GAP** | Not directly taught as its own topic |
| 6.3 | Procedure - practice/mismatch/norms | Strong | AQ-085 Mod 4 (normalization of deviation); AQ-086 Group 3 (norms) |
| 6.4 | Technical documentation - access and quality | Partial | AQ-160 Sec 4 (AWR document control — CAAC-clause-specific, concept transferable) |
| 6.5 | Critical maintenance tasks and error-capturing methods | Strong | AQ-085 Mod 5 (independent duplicate inspection) |

### Section 7 — Communication
| Item | Label | Fit | Candidate source |
|---|---|---|---|
| 7.1 | Shift/task handover | Strong | AQ-085 Mod 3 (marquee topic, five-part structured handover) |
| 7.2 | Dissemination of information | Strong | AQ-082 Safety Promotion; AQ-084 Mod 1 |
| 7.3 | Cultural differences | **GAP** | AQ-160 L2.4 (foreign-personnel English-proficiency rule) is a regulatory requirement, not cultural-communication training |

### Section 8 — Teamwork
| Item | Label | Fit | Candidate source |
|---|---|---|---|
| 8.1 | Responsibility | Strong | AQ-160 Sec 1 (three managers); AQ-085 Mod 1 |
| 8.2 | Management, supervision and leadership | Strong | AQ-093 Leadership; AQ-084 Mod 4 (authority gradient) |
| 8.3 | Decision-making | Strong | AQ-084 Mod 3 |

### Section 9 — Professionalism and Integrity
| Item | Label | Fit | Candidate source |
|---|---|---|---|
| 9.1 | Keeping up to date; currency | Partial | AQ-160 L2.2 (certifying-staff currency, CAAC-specific) |
| 9.2 | Avoiding error-provoking behaviour | Strong | AQ-086 (all 12 precursors framed as avoidable) |
| 9.3 | Assertiveness | Strong | AQ-086 Group 3; AQ-084 Mod 1 (assertive ladder) |

### Section 10 — Organisation's Safety Programme
| Item | Label | Fit | Candidate source |
|---|---|---|---|
| 10.1 | Safety policy/objectives, just culture | Strong | AQ-075; AQ-092 Just Culture |
| 10.2 | Reporting errors/hazards, internal reporting scheme | Strong | AQ-076 SMS Participation |
| 10.3 | Error investigation process | Strong | AQ-088 Incident Investigation; AQ-087 RCA |
| 10.4 | Action to address problems | Partial | AQ-050 hands off to AQ-045/046 CAPA courses, which are **not present** in either folder — real gap in depth |
| 10.5 | Feedback and safety promotion | Strong | AQ-082 Safety Promotion; AQ-090 Lessons Learned |

---

## 4. Summary counts

- **Strong fit:** 34 of 66 items (~52%)
- **Partial fit:** 18 of 66 items (~27%)
- **Real gap — no covering content in either source folder:** **14 of 66 items (~21%)**: 1.2, 2.3, 4.1, 4.2, 4.7, 4.8, 4.9, 4.14, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 7.3 *(15 listed — see note)*.

**Note on the count:** I listed 15 items as GAP in the tables above (1.2, 2.3, 4.1, 4.2, 4.7, 4.8, 4.9, 4.14, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 7.3), not 14 — flagging my own arithmetic here rather than quietly picking one number. 15/66 ≈ 23%.

Notably, **all of Section 5's physical-environment items** (noise/fumes, illumination, climate, vibration, other workplace hazards — 5.6/5.7/5.8/5.9/5.11) are gaps — this source material has essentially no physical-ergonomics content. That is a coherent, explainable gap (this content was written as cognitive/behavioral HF training, not industrial-hygiene training) but a real one.

## 5. Supplementary content (imports would be tagged `supplementary`, excluded from the compliance matrix)

Everything in the Safety Academy folder not listed as a "Strong" or "Partial" source above: AQ-078, 079, 081, 090, 093 (partially), 094, 095, 096 (mostly), 097, 099, 100, 101, 102, 103, 104, 105, the DOT Drug and Alcohol Program, and the FAA Part 5 SMS series (except its one "Investigation and Human Factors" lesson in SMS-401, which is a light touchpoint worth cross-checking against AQ-087/088 for redundancy rather than importing separately). These are genuine, well-built SMS/quality content — just not Human Factors training-syllabus content under GM1 145.A.30(e).

## 6. Ambiguous items requiring an explicit owner call (beyond §0's architecture question)

1. **Cross-jurisdiction sourcing for 4.12/4.13/6.4/9.1/5.12/8.1** — several "Strong"/"Partial" matches above are only strong because AQ-160's CCAR-145 R4 clause-specific content covers the *concept* GM1 asks for, even though the regulatory citation itself is Chinese, not EASA/FAA. Is it acceptable to import an atom whose `sourceClause` is a GM1 item but whose underlying source narration cites CCAR-145 R4 clauses (with those citations either stripped, kept as illustrative-only context, or flagged)? I have not made this call.
2. **4.13 (substances) and the DOT program**: the DOT Drug and Alcohol Program is real, well-cited (49 CFR 40, 14 CFR 120) content squarely on-topic for GM1 4.13 — but it's built for a *US DOT-regulated safety-sensitary-function* context, not a Part-145 HF-training context. Importing it under GM1 4.13 would be a bigger jurisdictional/purpose stretch than the CCAR content is for other items.
3. **Section 1a's four SMS-pillar items (1a.1–1a.4)** are, structurally, generic SMS content (hazard ID / risk assessment / mitigation / effectiveness) that happens to sit inside the GM1 HF syllabus. Should these draw from the Safety Academy's SMS courses (AQ-080/081, tagged non-supplementary for just these four items), or should Section 1a be treated as out of scope for *this* import pass since it's arguably SMS-general rather than HF-specific? Not resolved here.
4. **10.4 depth gap**: AQ-050 explicitly hands off to CAPA courses (AQ-045/046) that don't exist in either folder. Section 10.4 would need either thinner coverage than the rest of Section 10, or new content, or a future import from wherever those CAPA courses actually live (not searched — out of scope for these two folders).

---

## 7. What happens next (not yet authorized)

No draft atoms have been created. No content has been imported. Per the owner's explicit instruction, this document is the stop-and-show checkpoint. Pending owner input on:
- §0's architecture question (RegulatoryClause vs. PolicyPack/spine) — this determines what table baseline atoms attach to, so it likely needs to be resolved *before* any import work, not after.
- §6's four ambiguous-mapping calls.
- Whether "Partial" and "GAP" items should get thinner/placeholder atoms now (per the original placeholder-content approach) or wait for future authored content, given Block 2 explicitly superseded placeholder content with "import from existing Annex Quality material" as the sourcing approach.
