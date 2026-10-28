# MAK Test Failure Analysis

Date run: 2026-10-10 (system clock Sat Oct 10 2026, MDT). Facts only; undetermined items are marked.

## 1. Protected repo evidence (read-only commands)

Repo `E:\Conform-Edge\ClaudeCowork\MAK`, HEAD `6cac29ee698d6d469c17b01c30dd41959dc8853d`.

`git status --short`:
```
 M src/mak/cognition/composer.py
 M src/mak/cognition/index.py
 M src/mak/cognition/interpreter.py
 M src/mak/cognition/runtime.py
 M src/mak/cognition/worldview.py
 M src/mak/health.py
 M src/mak/observer/inventory.py
 M src/mak/web/app.py
 M src/mak/world/database.py
 M tests/test_acceptance.py
 M tests/test_cognition.py
?? src/mak/cognition/conversation_layer.py
?? tests/test_conversational_acceptance.py
```
`git diff --stat`: 11 tracked files changed, 815 insertions, 384 deletions (composer 125, index 247, interpreter 42, runtime 286, worldview 25, health 120, inventory 64, app.py 2, database.py 267, tests/test_acceptance.py 5, tests/test_cognition.py 16). Plus 2 untracked files (13 status entries in total). Nothing in the repo was modified by this investigation.

## 2. Method and isolation

- Copies made in the scratchpad (tar with `--exclude=.git --exclude=.venv --exclude=.mak --exclude=.pytest_cache --exclude=.ruff_cache --exclude=__pycache__`): `mak-wt` (working tree incl. uncommitted + untracked), `mak-head` (`git archive HEAD`), `mak-mix` (working-tree `src` + HEAD `tests`, to separate source changes from test edits). `.git`, `.venv`, `.mak` were NOT copied.
- Interpreter: the repo's `.venv\Scripts\python.exe` (read-only use, `PYTHONDONTWRITEBYTECODE=1`). Verified `mak.__file__` resolves to each scratchpad copy's `src`, not the E: repo.
- Isolation check: `tests/conftest.py` sets pytest basetemp to `<tempdir>/mak-pytest`; `TEMP`/`TMP` were redirected to the scratchpad `tmp` folder. Settings resolve only from `MAK_CONFIG` (unset) or `<cwd>/.mak/config/workspace.json` (cwd = scratchpad copy, no `.mak`). No path to `E:\Conform-Edge\ClaudeCowork\.mak` was involved.
- Command: `python -m pytest -p no:cacheprovider`.

## 3. Results matrix (the 3 named tests)

| Configuration | test_D (acceptance) | test_acceptance_conversation_end_to_end (cognition) | test_gate_001 (provenance) |
|---|---|---|---|
| Working tree (WT src + WT tests) | PASS | PASS | FAIL |
| HEAD export (HEAD src + HEAD tests) | PASS | FAIL | PASS |
| WT src + HEAD tests (mix) | FAIL | FAIL | FAIL |

The "3 failing" state reproduces only in the mix configuration (uncommitted source changes run against the committed tests). With the uncommitted test edits applied, test_D and the cognition test pass in the working tree, and only gate_001 fails. Whether the requester's 3-failure observation used the mix configuration is undetermined.

## 4. Full-suite comparison

- HEAD export: 1 failed, 271 passed (64 s). Failure: `tests/test_cognition.py::test_acceptance_conversation_end_to_end`.
- Working tree: 9 failed, 296 passed (71 s). Failures: gate_001 (provenance) plus 8 in the untracked `tests/test_conversational_acceptance.py` (CA2 test_with_open_gaps_mentions_them; CA4 test_how_are_you_variant_phrasing; CA5 test_open_question_appears_in_summary and test_alternative_phrasings; CA6 test_general_learning_question_not_date_bounded; CA9 test_learning_question_variants; CA10 test_no_invented_skill_names; CA12 test_morning_conversation_flow).
- Full outputs were saved in the scratchpad (`wt-full.txt`, `head-full.txt`, `wt-3.txt`, `head-3.txt`, `mix-3.txt`).

## 5. Per-test analysis

### 5.1 tests/test_provenance_quarantine.py::test_gate_001_concepts_are_preserved_but_ineligible

Fails in: working tree and mix. Passes at HEAD.

Output:
```
>       assert row["state"] == "QUARANTINED"
E       AssertionError: assert 'ACTIVE' == 'QUARANTINED'
tests\test_provenance_quarantine.py:36
```
Test: `db.initialize()`, inserts concept `lc006-audit-programme-oversight-purpose`, calls `db._ensure_v12_tables(conn)` again, expects state `QUARANTINED`.

Root cause (determined, in uncommitted change): the uncommitted `src/mak/world/database.py` wraps the Gate 001 quarantine, fixture-contamination handling and confidence recompute inside `if not (already_at_12 and already_at_12[0] >= '12')`, a one-time-migration guard keyed on `metadata.governance_revision`. `initialize()` already writes `governance_revision = '12'`, so the second call skips the quarantine; the injected Gate 001 concept stays `ACTIVE`. At HEAD the quarantine ran on every call. Additional observations: (a) the guard compares strings (`'12'`), so e.g. `'9' >= '12'` is true lexicographically; (b) `integrity.py:110` writes a timestamp (`now`) into the same `governance_revision` key, and a timestamp string compares `>= '12'`, so after an integrity run the migration body would also be skipped; whether that is intended is undetermined.

Relevance: source provenance (direct), evidence integrity (direct), audit reasoning (concepts invalidated by Gate 001 as contaminated can be eligible for retrieval if inserted or restored after revision 12), historical reproducibility (quarantine state depends on migration history rather than data content). Conversation state: none.

**Blocker: YES.** Provenance/integrity failure; blocker for using MAK-derived audit recommendations until resolved.

### 5.2 tests/test_cognition.py::test_acceptance_conversation_end_to_end

Fails in: HEAD export and mix. Passes in working tree (only with the uncommitted test edits).

Failure at HEAD (HEAD src + HEAD tests):
```
AssertionError: {'audit-checklist': 'ADOPTED', 'audit-intent': 'ADOPTED', 'docx-tools': 'ADOPTED'}
tests\test_cognition.py:215  (assert all(states[k] == "VALIDATED" ...))
```
Failure in mix (WT src + HEAD tests), earlier assertion:
```
>       assert r1.intent == "learned" and "not yet" in r1.text.lower()
E  "good morning. i haven't worked through any skill files yet. say 'go learn' and i'll start."
tests\test_cognition.py:201
```
Root causes:
- (A) Wording: the uncommitted `composer.py` (`learned_answer`) no longer emits "Not yet" for the empty-inventory case; it emits "I haven't worked through any skill files yet. Say 'go learn' and I'll start." (composer.py:106). The uncommitted test edit widens the accepted phrases. Determined.
- (B) Adoption policy: independent of the uncommitted changes. At HEAD the studied skills end `ADOPTED`, while the committed test asserts `VALIDATED` and `nothing self-adopts without a gap`. The uncommitted test edit comment attributes this to a liberal adoption default "since ee864b1" (commit ee864b1 exists in history; its effect on this behavior was not independently verified). The uncommitted edit relaxes the assertion to `VALIDATED` or `ADOPTED` and deletes the assertion `not TraitRegistry(db).get_all(states=["ADOPTED"])`. Whether liberal adoption is intended policy is undetermined (owner decision).

Relevance: conversation state (A, wording only); audit reasoning (B: which skills/traits are adopted as bases for reasoning, and the removed "no self-adoption without a gap" check); evidence integrity and provenance: not directly implicated by the failing assertion; historical reproducibility: the committed test and committed behavior disagree at HEAD, so HEAD itself is not self-consistent.

Blocker: NOT a provenance/integrity blocker by the stated criteria. Open item: the adoption-policy conflict (B) is unresolved and the removed assertion weakens the test guarding adoption without a recorded gap; resolve with the owner before relying on adopted-trait-based reasoning. (A) is a non-blocking wording change.

### 5.3 tests/test_acceptance.py::test_D_conversation_followup_why_resolves_without_repeat

Fails in: mix only. Passes at HEAD and in the working tree (with the uncommitted test edit).

Output (mix):
```
>       assert "authentication flow" in first.text.lower()
E  "i haven't worked through any skill files yet. say 'go learn' and i'll start."
tests\test_acceptance.py:225
```
Root cause (determined): the uncommitted `runtime.py::_h_learned` now applies `_temporal_scope()` (conversation_layer.py:122; "today" maps to `date.today()`) and passes `since=` to `view.learnings(...)`. The committed test seeds a learning dated `2026-09-04`; the question "Did you learn anything today?" now filters it out, so no evidence is returned. The uncommitted test edit reseeds with today's date. Test is therefore clock-dependent: the committed version passes at HEAD only because HEAD has no date filter.

Relevance: conversation state (follow-up "why" depends on the first answer carrying evidence; with no learnings the follow-up chain has nothing to trace); historical reproducibility (answers to "today" now vary with the wall clock; dated learnings from earlier days are intentionally excluded from that answer); source provenance and evidence integrity: no corruption shown (the record still exists; it is excluded by a date filter).

Blocker: NOT a provenance/integrity blocker. It indicates an intended-looking behavior change, but a time-relative filter means conversational answers are not reproducible across dates; treat as non-blocking for provenance, with the reproducibility caveat noted.

## 6. Other observations

- The 8 untracked-test failures (test_conversational_acceptance.py) are outside the named three. Messages include `sqlite3.OperationalError: table capability_gaps has no column named created_at` and `table targeted_questions has no column named question_key` (test fixtures vs schema mismatch; cause undetermined between test and schema), and several intent-routing mismatches (e.g. `working_on` instead of `learned`). Not analyzed further.
- No test was skipped, suppressed, or reclassified. No file in the protected repo was written.

## 7. Blocker summary

| Test | Provenance/integrity? | Integration blocker |
|---|---|---|
| test_gate_001_concepts_are_preserved_but_ineligible | Yes | **BLOCKER until resolved** |
| test_acceptance_conversation_end_to_end | No (adoption policy open) | Not a provenance blocker; adoption-policy conflict needs owner decision |
| test_D_conversation_followup_why_resolves_without_repeat | No | Not a blocker; reproducibility caveat |
