# 07 — Build Specification / Claude Code Prompt: Pocket Auditor (prototype)

Governor decision: **PROTOTYPE BUILD AUTHORIZED: YES · PRODUCTION BUILD AUTHORIZED: NO** (baseline PA-BASELINE-001).

> Open Claude Code in
> `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\_Opportunity-Scans\Builds\2026-09-27-pocket-auditor`
> and paste everything below the line.

---

You are building **Conform-Edge · Pocket Auditor**, an offline-first audit application (Android, iOS, web) with a Laravel + PostgreSQL server, the canonical M-AI kernel as a Node sidecar, and a JudgmentProvider client. I (Brian) have little programming experience. Work autonomously, verify your own work, and give me clean, complete files with exact locations. Never fabricate a test result, and never claim something works without showing the check that proves it.

## 1. Read these first (source of truth — do not invent architecture)

In this folder, in order:
1. `BUILD-GOVERNANCE-STATUS.md` — locked decisions LD-01..LD-10. **Changing any of them requires my approval.**
2. `01-DISCOVERY-RECORD.md` — scope, MVP, exclusions, claim boundary, decision log.
3. `04-PRODUCT-REQUIREMENTS.md` — workflows, PR-xxx requirements, screens.
4. `05-PRODUCT-ARCHITECTURE.md` — framework, repo layout, data model, sync protocol, ingestion, skill reuse map.
5. `06-DECISION-LOGIC.md` — every deterministic rule you must implement and unit-test.
6. `03-M-AI-PRODUCT-INTEGRATION-PROFILE.md` + `mai/dims-draft/pocket-audit-integrity/` (manifest, 16 draft rules, `DERIVED-FIELDS.md`, charter) + `mai/authority/AP-PA-REPORT-HOLD.json` — M-AI integration, sidecar contract, draft DIM.
7. `content/` — `library-seed.json` (329 PROPOSED requirements), `convert_catalogs.py`, `CONVERSION-REPORT.md`.

Governing platform documents (read the sections cited in 05):
`E:\Conform-Edge\ClaudeCowork\02 Active Projects\CE-QMS-Next-Architecture-Constitution.md`, `CE-QMS-Next-ADRs.md`, `CE-QMS-Next-Interface-Contracts.md`, `CE-QMS-Next-Authority-Matrix.md`, `CE-QMS-Next-Domain-Rationalization.md`.
M-AI: `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\Conform-Edge Software\M-AI\M-AI-Kernel\` (`README.md`, `DECISIONS.md`, `kernel/`, `dims/`).
Engineering standards: `E:\Conform-Edge\ClaudeCowork\07 Automation\Build-Standards.md` (applies to TypeScript; apply the PHP equivalents: PSR-12, Larastan level 8, Pest).

**Constitution status:** the CE-QMS Next Constitution is DRAFT and says no implementation before approval. I approved an exception on 2026-09-27 (PAD-010, LD-11): this Pocket Auditor prototype may be built inside this product folder, implementing the Constitution's contracts. It does not authorize creating the CE-QMS Next repository, production release, or use of real client data. Do not stop on this point.

If available in this Claude Code session, load these skills before coding: `future-systems-architect`, `mai-kernel-integration`, `mai-symbiotic-product-integration`, `vera-molecule-design-system`, `product-build-governor`. **If anything I write here conflicts with the documents above, stop and tell me which line conflicts. Do not choose for me.**

Some files under `ClaudeCowork` are hardlinked (OneDrive/Obsidian). Read them in place; do not move, rename or delete them.

## 2. Operating rules
- **Plan first, then wait.** Produce a short plan for M0–M2 (steps, the riskiest step, and the check that proves each step). Do not write code until I approve it. After that, continue milestone by milestone and report at the end of each one.
- **Verify everything.** For each milestone, run the listed checks and paste the real output. If something cannot be verified here, say so and say what you need.
- **Clean complete files.** When you change a file for me to handle, give the whole file and its path.
- **Root cause over patch.** State the cause in one sentence with evidence before fixing a defect.
- **Stay in this folder.** Write only inside the product root. Never modify the M-AI kernel folder, `_Skills`, other `Builds\` folders, or CE-QMS repos. Consume `@mai/kernel` as a dependency (local path `file:` reference to the kernel package, pinned), never a copy.
- **No real data.** Seeds and fixtures use invented organizations (e.g., "Orion Aero Components", "Northwind Medical"). No Burrana data, no client data, no text copied from any standard.
- **US English** in all UI and report text.
- **Terminology:** M-AI outputs are "System-Detected Conditions". Never "AI finding", "AI decision", or "confidence score" for M-AI.
- Keep reports to me concise.

## 3. Non-negotiable rules (enforce in code and tests)
1. Host (Laravel) is authoritative. Device writes are proposals (A2) until the host accepts them.
2. Authority A0–A3 enforced in middleware on every route; every A1–A3 action written to `activity_log`.
3. Finding classification is A3 and never set by sync or by any service.
4. Only APPROVED requirements and APPROVED relations reach a checklist.
5. `organization_id` on every table and every query; cross-organization access tested on every route.
6. M-AI kernel writes only `mai_*` tables under its own least-privilege DB role; M-AI down = host works (Constitution K.2).
7. JudgmentProvider results are A0, carry provenance, and never change assessments or findings. Offline/unavailable = `PENDING_JUDGMENT`.
8. Nothing is hard-deleted. Void or supersede with reason.
9. Device data encrypted at rest; tokens in secure storage.
10. DIM rules in `mai/dims-draft` and `mai/authority/AP-PA-REPORT-HOLD.json` stay **inactive**: `approvedBy` and `effectiveDate` are empty on purpose. Production config does not load `mai/dims-draft/`. Tests use a copy in `mai/tests/fixtures/pocket-audit-integrity/` with `approvedBy: "TEST FIXTURE — NOT AN APPROVAL"`, loaded only when `NODE_ENV=test`. Never edit the draft files to fake approval.
11. The host never computes a report hold. It executes only a kernel `GovernedDecision` HOLD (03 §9–11).
12. Event types follow `domain.entity.verb` and are registered before use (03 §6).

## 4. Milestones

| # | Build | Done when (show evidence) |
|---|---|---|
| M0 | Repo scaffold per 05 §2; CI (lint, types, tests) for `server`, `mai-sidecar`, `app`; `packages/contracts` JSON Schemas (event envelope C.1, provenance J.1, sync-v1, audit package); dev database on E: PostgreSQL 16; verify Railway topology assumption A-04 (read docs; no deploy) | CI green locally; `php artisan migrate:fresh` clean; schemas validate sample payloads |
| M1 | Platform: organizations, legal entities, sites, departments, users, memberships, devices, auditees; Fortify + Sanctum; authority middleware; activity log; event outbox; provenance table | Pest tests for auth, authority gate (each level), cross-org denial |
| M2 | Requirement Graph (05 §4) + platform library organization + import of `content/library-seed.json` (import mapping: seed `standard_code`→`standard_ref`, `applicability`→`applicability_text`; keep `regulatory_reference`, `exclusion_condition`, `extra_fields` in a `source_notes jsonb` column; PROPOSED defaults as delivered) + library approval API/UI (web) + crosswalk review | Import count = 329 requirements, 354 closure rows, 119 relations, 16 proposed triggers, all PROPOSED; re-running the converter against `E:\Conform-Edge\ClaudeCowork\_Skills\Auditor-Profile-and-Audit-Engine\Skills-Library` reproduces the same catalog SHA-256 values; approve-by-source works; unapproved content never returned to planner |
| M3 | Audit planner + applicability + checklist generator (06 §2–3) + plan lock/snapshot | Unit tests for every rule in 06 §2–3 incl. parallel regulations, superset standard, guidance never governing, LIGHT preset; identical inputs → identical snapshot hash |
| M4 | App: Ionic React + Capacitor; login; Today, Cockpit, Item card, Finding composer, Interview mode (04 §5); encrypted SQLite repositories; evidence capture with SHA-256; package download | Android emulator/device run with screenshots; airplane-mode test of a 40-item audit; kill-app test shows no data loss |
| M5 | Sync v1 (05 §5): outbox, batching, idempotency, evidence upload with hash verification, conflicts, sync center | Tests: duplicate batch → no duplicates; concurrent edit → CONFLICT; hash mismatch recorded; revoked device rejected |
| M6 | `mai-sidecar` wrapping pinned `@mai/kernel` with the endpoints and DB roles in 03 "Sidecar contract"; host `dim_determinations`/`dim_human_responses`; snapshot builders per `DERIVED-FIELDS.md` incl. re-emission triggers; confirm which rule schema the pinned kernel registry accepts (flat DIM rule vs `KernelRule`) and convert the drafts mechanically without changing meaning; HOLD executor + A3 override + K.2 "issue without determination" | AT-01..AT-16 + PT-01..PT-04 green (03 §26); every `*-MISSING-001` test has its expected result written down before it runs; production start-up does not load `mai/dims-draft/` and M-AI stays enabled |
| M7 | Ingestion: upload, hash, text extraction (PDF text layer, DOCX, TXT), deterministic segmentation, candidate review UI, crosswalk proposals; regulator detection data file from router packs; `JP_DECOMPOSE` flag **off** with a stub | Fixture documents (invented) segment deterministically; reviewer accept/edit/split/merge/reject covered by tests |
| M8 | JudgmentProvider client (IC-003 `evaluateRequirementIntent`, `evaluateEvidence`) with a local stub provider + VERA config; lead review screen; classification (A3); close-out; reports PDF + DOCX | Report contains every finding with requirement, source revision, evidence refs, classifier; provider outage shows "Semantic Review Pending" |
| M9 | Hardening: accessibility pass (PR-086), performance checks (PR-087), Android + iOS debug builds (iOS needs a Mac or cloud build — tell me what is needed), write `08-BUILD-NOTES.md`, `09-FSA-REVIEW.md` (FSA REVIEW mode), `10-M-AI-INTEGRATION-VERIFICATION.md`, `11-VERIFICATION-REPORT.md`, `12-VALIDATION-PLAN.md` | Each file present with real command output; `BUILD-GOVERNANCE-STATUS.md` updated to Stage 8 with decision VALIDATION_REQUIRED |

## 5. Verification commands to report (at minimum)
`composer test` / `php artisan test` · `./vendor/bin/phpstan analyse` · `npm run lint && npm run typecheck && npm test` in `app` and `mai-sidecar` · the M-AI acceptance suite · `npx cap run android` evidence (screenshots) · migration fresh/upgrade parity.

## 6. Traceability
Maintain a PR→test matrix (every PR-xxx in 04 and every rule in 06 → test name → result) in `11-VERIFICATION-REPORT.md`.

## 7. Stop and ask me when
- A locked decision (LD-xx) or a governing document seems wrong or conflicts.
- A requirement needs content only I can supply (clause references for DIM rules, intent statements, authority-level confirmations — see `13-NEEDS-FROM-BRIAN.md`).
- The kernel's public API does not support something 03 needs (do not build a private version; mark it reserved).
- Any step would need a paid account, store submission, public deployment, or real client data.

## 8. Out of scope for this build
Public app-store release, payments, CE-QMS connector, OCR, voice transcription, on-device M-AI, learning/experience features, any autonomous action beyond the report HOLD.
