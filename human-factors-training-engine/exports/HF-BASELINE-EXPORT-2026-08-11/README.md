# HF-ENGINE Regulatory Baseline Training — Standalone Export

**Exported:** 2026-08-11, from `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\HF-ENGINE`
**Source decisions:** `docs/DECISIONS-D058-D064-excerpt.md` (full text of D-058 through D-064)
**Status: everything in this export is DRAFT and UNAPPROVED.** No `PolicyPack`, `PolicyPackClause`, or `LearningAtom` row created by this work has an `approvedBy`/`approvedAt` set. Nothing here is live or in effect anywhere.

## What this is

The regulatory-baseline human-factors training curriculum built into HF-ENGINE this session:
- A 15-topic regulator-neutral **Requirement Spine** (SP-01..SP-15).
- The **GM1 145.A.30(e)** EASA HF training syllabus modeled as a `PolicyPack` (66 clauses).
- The **FAA 14 CFR Part 145 / AC 145-10** pack (21 clauses — 9 regulatory-floor, 12 HF-content).
- **34 draft `LearningAtom` rows**, verbatim-extracted (read-only source, no editorial changes)
  from 14 Annex Quality / Safety Academy courses, covering 47 of GM1's 66 items and, via direct
  reuse (zero new authoring), 9 of the FAA pack's 12 HF-content items.
- **19 real content gaps** in the GM1 baseline (see `docs/GAP-WORKLIST-GM1-INITIAL-TRAINING.md`),
  3 of which (Statistics, Vision, Hearing) also show up as gaps in the FAA pack, for the
  identical underlying reason — no source exists anywhere in the AQ library for those specific
  topics.

The core architectural point this export demonstrates: training content maps to a spine topic
**once**, and every regulator pack whose clauses map to that same topic gets automatic-eligible
coverage without re-authoring. The FAA pack is the executed proof — it reuses the GM1 atoms
directly (see `seed/seed-faa-part145-pack.ts`), with zero new content written for it.

## What's in this folder

| Path | Contents |
|---|---|
| `schema-fragment.prisma` | The Prisma model additions this data depends on (4 new models + field additions to `PolicyPack`/`PolicyPackClause`/`LearningAtom`) |
| `seed/seed-regulatory-clauses.ts` | Seeds the 15 spine topics + the GM1 145.A.30(e) pack (66 clauses) + the clause-topic coverage mapping |
| `seed/seed-baseline-content.ts` | Imports the 34 atoms from `seed/baseline-content/*.md` |
| `seed/seed-faa-part145-pack.ts` | Seeds the FAA Part 145 / AC 145-10 pack, reusing the same 34 atoms |
| `seed/baseline-content/` | The 34 verbatim-extracted content files (frontmatter: source course, source file, source section, GM1 items, spine topics) |
| `lib/json.ts` | The `toDbArray`/`fromDbArray` JSON-array-as-string helper the seed scripts depend on (SQLite has no native array type) |
| `data-snapshot/snapshot-2026-08-11.json` | A point-in-time dump of the actual seeded rows, for reference — **not** the reproduction mechanism |
| `docs/HF-ENGINE-POLICY-PACK-FAA-PART145-Draft1.md` | The FAA pack's controlled document (clause list, spine mapping, regulatory-character analysis, approval block) |
| `docs/CONTENT-INVENTORY-AQ-HF-MAPPING.md` | The original inventory + mapping of the two AQ source folders against GM1 145.A.30(e) |
| `docs/GAP-WORKLIST-GM1-INITIAL-TRAINING.md` | All 19 real gaps: GM1 item, paraphrase, spine topic, what content would need to exist |
| `docs/DECISIONS-D058-D064-excerpt.md` | The full design/decision trail, verbatim, from HF-ENGINE's `DECISIONS.md` |

## How to reproduce this elsewhere

1. Add the models/fields in `schema-fragment.prisma` to the target repo's own Prisma schema
   (or confirm they already exist, if the target already has WP-4.5-equivalent `PolicyPack`/
   `PolicyPackClause` models).
2. Run `prisma migrate dev` (a real migration — schema validation alone does not touch the
   database).
3. Run the three seed scripts **in order**: `seed-regulatory-clauses.ts`, then
   `seed-baseline-content.ts`, then `seed-faa-part145-pack.ts` (each depends on data the
   previous one creates). All three are idempotent — safe to re-run.

This was verified working from this exact export folder (not just the original in-repo copies)
on 2026-08-11 — all three scripts ran cleanly against HF-ENGINE's live dev database, correctly
reading their own bundled `baseline-content/` files and the relocated `lib/json.ts` helper.

**Real external dependency, not resolved by this export:** the seed scripts import
`@prisma/client`, which requires a generated Prisma client matching a schema that includes
the models above. This export does not bundle a Prisma client or a full schema — it assumes
the target repo has its own Prisma setup and only needs the additions listed here.

## Known open items (carried forward honestly, not resolved by this export)

- **19 real content gaps** in the GM1 baseline — see the gap worklist. 3 of these (Statistics,
  Vision, Hearing) are also FAA-pack gaps for the same reason.
- **The FAA pack is Draft 1, unapproved** — its AC 145-10 suggested-elements list is itself
  `[SME]`-flagged pending verification against the primary AC PDF (returned HTTP 403 on every
  fetch attempt this session; the list used is from two independent secondary characterizations).
- **The CAAC CCAR-145 R4 pack** (referenced throughout D-058-D-064 as the architectural
  precedent) exists only as a controlled markdown document elsewhere in HF-ENGINE
  (`docs/02-controlled/HF-ENGINE-POLICY-PACK-CAAC-CCAR145-R4-Rev-A.md`) — it was never
  instantiated as real `PolicyPack`/`PolicyPackClause` data, and is not part of this export.
  CCAR-cited content (AQ-160, AQ-166) is explicitly excluded from the shared atom pool per the
  owner's own cross-jurisdiction ruling (D-062) — it cannot be reused the way GM1/FAA content was.
- **No target codebase** was chosen for this export as of 2026-08-11 — it's a portable,
  documented kit, not yet integrated anywhere beyond HF-ENGINE itself.
