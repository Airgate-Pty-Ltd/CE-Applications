# HF Engine — Documentation Index
**Reorganized:** 2026-08-06. Application code is untouched (`src/`, `prisma/`, `scripts/`, `_prototypes/`). **Active working files live in `docs/05-run-records/`:** `DECISIONS.md`, `OPEN-QUESTIONS.md` (both continuous across runs), `RUN-JOURNAL-PACKAGING.md` (current run — Phase 4 WP-0/WP-1/WP-2 closed within `RUN-JOURNAL-PHASE4.md`, which stays open pending WP-3/WP-4; `RUN-JOURNAL-PHASE3.md` is closed history). Root holds only tooling-mandated files (package/tsconfig/next/jest configs, LICENSE, NOTICE, README) plus this index. Docker packaging config lives under `deploy/docker-optional/`, not root (Standalone Packaging Directive, 2026-08-06).

| Folder | Contents | Authority |
|---|---|---|
| `docs/01-directives/` | Build directive v3 (product authority), content & build map, autonomous run directive, Phase 3 run directive | **Read first** |
| `docs/02-controlled/` | Owner-approved controlled documents: **Progressive Autonomy Charter Rev A (HFPAC-CCB-2026-001 — constitutional governing document, DRAFT pending approval)**, Kernel Rules Rev-A (MAI-CCB-2026-001), CAAC CCAR-145 R4 Policy Pack Rev-A (HFPP-CCB-2026-001), Requirement Spine Spec (Spine Rev 1). `HF-ENGINE-AUTHORITY-MODEL-DRAFT.md` is SUPERSEDED (subsumed by Charter §18). | **Never modify without owner approval** |
| `docs/03-architecture/` | Design notes, schema delta, architecture summary, Kernel integration/provenance, organization-data ingestion, Phase 1 specification, original product/functional/architecture specs | Reference |
| `docs/04-verification/` | Accepted verification reports (v2) + WP-2 addendum — the record of what is proven | Evidence record |
| `docs/05-run-records/` | Completed run journals and done markers | Append-only history |
| `docs/99-superseded/` | Superseded directives, drafts, v1 reports, week checkpoints — retained per vault governance | **Do not implement from these** |

**Precedence:** `docs/01-directives/HF-ENGINE-BUILD-PROMPT-v3.md` → `docs/02-controlled/*` → active run directive → everything else.
**Confidentiality note:** the recovered "Human Factors App" folder (Burrana controlled material) was quarantined out of this repo on 2026-08-06 to `99 - Quarantine/Review Required/` in the vault. Nothing Burrana-classified may enter this repository.
