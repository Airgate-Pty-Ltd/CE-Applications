# AUTONOMOUS RUN DIRECTIVE — PHASES 1 & 2
**Issued:** 2026-08-05 by owner (Brian R. Olea)
**Governs:** one unattended build run. Work continuously without owner feedback until the Exit State (§7) is reached or a Hard Stop (§5) applies. **Do not begin Phase 3 under any circumstances.**
**Authority documents (precedence order):** `HF-ENGINE-BUILD-PROMPT-v3.md` → `HF-ENGINE-PHASE1-KERNEL-RULES-Rev-A.md` → `PHASE-1-SPECIFICATION.md` → this directive. Conflicts resolve upward; log any conflict found in `OPEN-QUESTIONS.md`.

---

## 1. Scope of this run

**Task 0 — Kernel evaluator defect (do first, before anything else):**
Rewrite `evaluateOperator` in `src/services/MaiKernel.ts` to implement exactly the closed grammar keyed on `op` (not `operator`): `is_null, not_null, is_empty, not_empty` (strings trimmed), `eq, ne, in, length_gte, length_lt, date_before_today, date_after_today` (server-local midnight, documented), `linked_record_exists, linked_record_missing`, composites `all[] / any[] / not{}` arbitrarily nested. Delete `count_events`, `no_covering_training`, `equals`, `contains`. The kernel never queries the database during evaluation — snapshot only. Unknown field/op → `mai_error_log`, skip that rule, others continue. Implement `data_confidence` (high = all referenced fields present in snapshot schema; medium otherwise; low on exception → result false). Add the registry-validation test: load `prisma/seed-kernel-rules.json`, assert every condition of all 14 rules parses and evaluates; run each rule's positive/negative/missing-data cases against the real evaluator. **Task 0 is complete only when these tests execute and pass — paste the real test output into the run journal.**

**Phase 1 — complete the vertical slice** per `PHASE-1-SPECIFICATION.md` and directive v3 §14: AiAssist service with classification gate and no-AI manual fallback; CurriculumCompiler with deterministic hashing and frozen manifests; API endpoints; UI pages; seed data (synthetic only); all Phase 1 tests. Then **self-verify every exit criterion C-001..C-014 in the running application** and write `PHASE-1-VERIFICATION-REPORT.md` (format in §4).

**Phase 2 — full governance** (v3 increment 2 ONLY): dual approval workflows; emergency interim content with mandatory expiration; content versioning and replacement logic; periodic kernel self-audit; role dashboards (honest-data rules apply). Then write `PHASE-2-VERIFICATION-REPORT.md`.

**Explicitly out of scope for this run:** increment 3+ (burden budget, drip recurrency, drift watch, Policy Packs), Defense Dossier build-out, deployment hardening, AI provider expansion, federated sync, any Phase 3 work, any schema change that weakens a governance decision already logged in `DECISIONS.md`.

---

## 2. Decision authority while unattended

- **Default and log.** For any implementation decision that does not touch a Hard Stop category, choose the most reasonable option consistent with the authority documents, record it in `DECISIONS.md` (what, why, alternatives), and continue. Never wait for input.
- **Open questions never halt the run.** If something genuinely needs the owner, write it to `OPEN-QUESTIONS.md` with context and your recommended answer, mark the affected item Partial, and move to the next work item.
- **Never invent:** kernel rule content, clause citations, regulatory interpretations, effectiveness thresholds, or seed content derived from restricted material. Mark as deferred/owner-input instead.
- **Never modify:** `HF-ENGINE-PHASE1-KERNEL-RULES-Rev-A.md` (approved controlled document), superseded files, or approval records. Rule changes require owner approval — if a rule appears wrong, log it in `OPEN-QUESTIONS.md` and implement it as approved.

---

## 3. Run integrity (crash must never look finished)

1. Maintain `RUN-JOURNAL-2026-08-05.md`: append an entry after every completed work block (timestamp, what was done, files changed, tests run with real output, next planned block). Append-only — never rewrite history.
2. Commit-style checkpoints: after each work block, ensure the app still builds (`npm run build` or typecheck) before moving on; record the result in the journal.
3. Write `RUN-2026-08-05.done` **LAST**, only after both verification reports exist and the final journal entry is written. Its absence means the run is incomplete regardless of what any other document claims.
4. If the session is interrupted and restarted, first read the journal, verify the last claimed state against the disk, correct the journal if reality differs, then resume. Never re-do completed verified work; never trust an unverified claim — including your own.

---

## 4. Verification report format (both phases)

For each exit criterion: **ID · Verified / Partial / Not implemented · evidence.** Evidence means real executed proof: actual terminal output for tests, actual API responses, actual DB rows (paste them), reproduction steps. A criterion without executed evidence is Partial at best. Include: full test-suite output, files-changed list, migration status, open risks, `OPEN-QUESTIONS.md` reference, and an acceptance recommendation that separates verified from unverified. Prohibited claim language stands: no "production-ready," "certifiable," "all passing" unless the pasted output shows it.

**Phase 2 exit gate (self-check before writing the report):** dual approval demonstrably enforced on a product-safety-classified item; emergency interim content auto-expires in a test; a content replacement produces correct supersession links and disposition records; the periodic kernel audit runs and produces findings on seeded defects; dashboards show explicit absent-data states; no historical record mutated (re-run the immutability tests).

---

## 5. Hard Stops (log, skip the item, continue other work — end the run only if nothing else remains)

- Any change that would weaken confidentiality/classification enforcement (`BURRANA_PRIVATE` / `CUSTOMER_PRIVATE` reachability).
- Any change to kernel design laws (new operators, DB access in evaluation, writes outside `mai_*`, LLM in kernel).
- Anything requiring new approved rule content or clause citations.
- Data-destructive operations (dropping tables with data, deleting files — quarantine/supersede instead).
- Anything that would alter frozen manifests, learner evidence, or audit history.

---

## 6. Environment notes

- Node 20 LTS assumed; SQLite for this run's dev database is acceptable; document any environment limitation honestly in the journal (a test that could not run is reported as not run, never as passed).
- No external network dependencies for core function; AI Assist work must prove the no-AI fallback path works even if no provider is configured.

---

## 7. Exit State

The run is complete when: Task 0 defect fixed with passing grammar tests · Phase 1 implemented with `PHASE-1-VERIFICATION-REPORT.md` covering C-001..C-014 · Phase 2 implemented with `PHASE-2-VERIFICATION-REPORT.md` · `DECISIONS.md` and `OPEN-QUESTIONS.md` current · journal complete · `RUN-2026-08-05.done` written last. Then STOP. The owner will independently validate both reports before authorizing Phase 3. Do not pre-build Phase 3 "while waiting."
