# PHASE 3 RUN DIRECTIVE — DEFENSE DOSSIER, PARTIAL CLOSURE, UI, PRODUCT CORE
**Issued:** 2026-08-06 by owner (Brian R. Olea)
**Authorization basis:** Phases 1–2 accepted per PHASE-1-VERIFICATION-REPORT-v2.md and PHASE-2-VERIFICATION-REPORT-v2.md (10 Verified / 2 Partial / 1 Not Implemented, partials logged).
**Authority documents (precedence):** `HF-ENGINE-BUILD-PROMPT-v3.md` → `HF-ENGINE-PHASE1-KERNEL-RULES-Rev-A.md` → this directive → v2 verification reports (as the record of accepted state).
**Standing rules from prior runs — all still in force:** evidence standard (executed proof or Partial; code review is never evidence; "design-verified" is banned), append-only run journal, correction entries over rewrites, default-and-log decisions, OPEN-QUESTIONS.md for owner items, strict TypeScript stays on, no bulk regex edits on schema, license-header gate stays wired, done marker written last and only when true.

---

## 1. Work Packages — execute in order, each with its own exit gate

### WP-1: Regulatory Defense Dossier (the flagship — differentiator #1)
Rebuild from scratch against the current schema; the parked `_prototypes/DefenseDossierBuilder.ts` is reference-only (it is out of sync — do not rescue it, and delete nothing; leave it parked).
Deliver a `DefenseDossier` service + API route + UI page that assembles, for a selected scope (organization / site / learner / intervention / date range):
1. applicable requirement mapping (Policy Pack revisions — see WP-4 for pack structure; where clause data is owner-pending, the dossier section renders "Requirement mapping: awaiting owner-supplied Policy Pack" — never invented clauses);
2. curriculum-to-objective mapping with content revisions;
3. per-learner frozen manifests + completion + assessment evidence;
4. occurrence-informed recurrency proof (which events produced which content, with approvals);
5. effectiveness evidence with honest levels and outcome language;
6. causal-status history for cited events;
7. kernel System-Detected Conditions history with human dispositions;
8. Content Bill of Materials (objects, revisions, sources, licenses, approvers, compiler + ruleset versions);
9. gap register: coverage gaps, overdue items, open conditions — shown, not suppressed;
10. integrity attestation: package hashes, audit-log hash-chain segment, generation timestamp, version/copyright stamp.
Formats: JSON (canonical) + printable HTML (browser print-to-PDF acceptable this phase; native PDF may be deferred with a log entry).
**Exit gate:** dossier generated end-to-end from seeded lifecycle data in the running app; every section either populated from real records or explicitly marked with its honest absent-data state; test proves a recalled/superseded atom appears correctly; pasted output in the journal.

### WP-2: Close the accepted Partials
1. **C-006** — classification inheritance: atoms derived from evidence inherit the most restrictive classification of their sources automatically; manual loosening requires an approval record. Test: BURRANA_PRIVATE evidence → atom cannot be created less restrictive without approval.
2. **C-009** — per-atom completion tracking (`AtomCompletion` model): learner-level completion per atom within an assignment; auto-closure logic updated to use it.
3. **C-013** — extend the immutability trigger to SUPERSEDED manifests; document the SQLite driver error-text limitation in the test.
4. **Emergency expiry configurable** (directive v3 §8.4): duration set at creation from a configurable default, mandatory expiration retained, renewal requires approval. Supersedes the fixed-30-day decision; log it.
**Exit gate:** all four demonstrated by executed tests; the Partial rows in a short addendum report flip to Verified with evidence, superseding nothing — append, don't rewrite.

### WP-3: Real UI for the core workflows (X-002)
Minimum screens, wired to the existing services, honest-state rendering throughout: Source Intake & Review queue (ingest → classify → causal status → appropriateness review); Kernel Conditions panel (three-response contract + Authority Charter link + advisory badge); Content Authoring/Approval (draft-beside-source for AI-assisted content); Learner assignment view + training player upgrade (atom-based); Manager five-minute view (pending observations, one-tap effectiveness verification); Defense Dossier generation screen (WP-1); Traceability view (forward + reverse). Keyboard accessible, light/dark, no dead ends.
**Exit gate:** the full Phase-1 lifecycle is executable entirely through the UI by three demo users (QM, supervisor, learner) — journal documents the click-through with screenshots or DOM-verified assertions (Playwright acceptable).

### WP-4: Product core increment (v3 increment 3)
1. **Structured HF event intake** (form + API: category, date, site, process/role, themes, severity) feeding the drift watch.
2. **Drift watch**: living HF exposure picture — theme trends from occurrences reconciled against current training coverage; kernel condition fires on uncovered rising theme (rule content: use approved Rev-A rules only; if a new rule is needed, log the request in OPEN-QUESTIONS.md — do not author it).
3. **Training Burden Budget** + compiler disposition queue (include/defer/convert/replace/narrow/escalate; nothing silently omitted).
4. **Drip recurrency**: approved occurrence-scenario atoms assignable at shift-brief cadence, evidenced, counted toward recurrency.
5. **Policy Pack structure**: versioned pack model + admin UI with all fields from v3 §6.4; ship EMPTY packs with owner-input placeholders. **Clause mappings, topics, and recurrence requirements are owner-supplied — request via OPEN-QUESTIONS.md, never invent.**
**Exit gate:** each demonstrated by executed test + at least one end-to-end journal demo (event intake → drift condition → scenario atom → drip assignment → dossier reflects it).

### WP-5: Deployment hardening (v3 increment 5, scoped)
Docker Compose for both editions (`online` / `onprem` config switch), backup + restore scripts with a tested restore, health/status screen (Online / Local Only / Degraded / AI Service Unavailable / Backup Overdue), documented no-internet verification of the onprem mode (AI Assist manual fallback path proven disconnected).
**Exit gate:** `docker compose up` from a clean clone reaches a working seeded app in both modes on the build machine; restore test executed; outputs pasted. If Docker is unavailable in the environment, implement everything, verify what is executable, and mark the compose bring-up Partial with exact reproduction steps for the owner — never claim it ran if it didn't.

---

## 2. Out of scope for this run
Federated sync (Mode 3), native PDF engine, external AI provider expansion beyond the existing abstraction, SSO/HRIS/QMS integrations, multi-tenant SaaS operations, any new kernel rule content, any new Policy Pack clause content, any Phase/increment beyond WP-5.

## 3. Run mechanics
New journal: `RUN-JOURNAL-PHASE3.md` (append-only; entry per work block with executed output). Done marker: `RUN-PHASE3.done`, written last, listing per-WP status (Verified / Partial / Not implemented) — a WP may close Partial only with the gap named and reproducible. Decisions continue in `DECISIONS.md` (D-024+). Owner items to `OPEN-QUESTIONS.md`. If context runs low, checkpoint the journal and stop cleanly at a WP boundary — a fresh session resumes from the journal. Never write the done marker to end a session; an unfinished run has no marker.

## 4. Verification protocol
Owner + independent validation will re-run: `npm test` (all suites, serial), `npx tsc --noEmit`, `node scripts/check-license-headers.js`, dossier generation, and spot-checks of every WP exit gate against the journal's pasted evidence. Claims that fail independent re-execution reopen the run.
