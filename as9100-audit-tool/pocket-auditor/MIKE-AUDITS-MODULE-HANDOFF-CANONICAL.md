# Pocket Auditor → Audits module: canonical handoff

Supersedes the framework handoff in `MIKE-AUDITS-MODULE-HANDOFF-2026-10-08.md` for the checklist, snapshot and export contract. The export package schema (`docs/MIKE-HANDOFF-PACKAGE.md`) is unchanged.

Pocket Auditor is standalone. The Audits module is not a dependency of Pocket Auditor. No existing QMS tool was modified.

## 1. Canonical checklist set

| Standard | File | Clause rows | Lettered rows | Reconciliation |
|---|---|---|---|---|
| AS9100D | `content/checklists/AS9100D.json` | 100 | 294 (all authored) | `content/reconciliation/AS9100D-reconciliation.json`: RECONCILED, 0 unresolved |
| AS9110C | `content/checklists/AS9110C.json` | 106 | 309 (all authored) | `content/reconciliation/AS9110C-reconciliation.json`: RECONCILED, 0 unresolved |

The GPT-generated `content/burrana-*-checklist-clauses-4-10.*` files are supplementary source and difference material only. They are not checklist alternatives and are not rendered as audit rows.

Lettered rows (for example `8.5.1(d)`) exist only where the licensed clause body shows the letter, in order, under that clause. The clause body stops at the notes and annexes, so annex letters are never attributed to a clause. Each row carries its exact reference, a locator into the licensed copy, an audit question and evidence prompts written from the licensed text (draft), N/A handling and finding linkage. Question wording is Conform-Edge's own; no standard text is copied into the checklist.

Status: **AUTHORED DRAFT.** All 603 lettered rows and the clause rows are reconciled to the licensed structure and carry authored wording. That wording has not yet been checked line by line by a reviewer, and no source is approved.

## 2. Reconciliation and approval

- `content/reconcile_canonical.py` checks every canonical row against the private licensed copy and records each row's status.
- Any unresolved row sets the report to BLOCKED. `engine/pa_canonical.reconciliation_gate()` then refuses approval.
- The licensed copies stay in `licensed-private/`. They are not included in any export.

## 3. Audit snapshot

An audit selects clauses. The snapshot records:
- `clauses_selected`
- each selected row, including its lettered rows, with its locator
- the SHA-256 of the licensed source used for the reconciliation
- the reconciliation status at the time of the snapshot

Snapshots are write-once. A later source correction creates a new version, and the earlier snapshot is not changed.

Sample (synthetic): `exports/SAMPLE-SYNTHETIC-snapshot/SYNTHETIC-DEMO-001-AS9110C-v1.json`

## 4. Quality-manual applicability and N/A

- Quality-manual review is the first audit activity.
- An exclusion is proposed from the manual, then accepted, amended or rejected by a reviewer who is not the proposer.
- An N/A requires: exact reference, reason, quality-manual section, evidence link, reviewer and timestamp. The reference must exist in the canonical set.
- Requirements without an approved exclusion stay applicable.
- AS9110C 8.5.1.3 is marked "not applicable" in the licensed text. That is not an automatic N/A. It needs a quality-manual exclusion.

## 5. Export contract

- Package schema v1.0 with 19 required top-level keys, including `sources_withheld_for_licence` (`engine/pa_export.py`). The v1.0 contract is authoritative. Every import field is documented in `docs/MIKE-IMPORT-FIELD-DICTIONARY.md`. Sample packages are in `exports/SAMPLE-FAA-QSA-PACKAGE/`: `burrana/` (owner) and `external/` (withheld). The audit data in the samples is synthetic; the FAA criteria are real.
- Body text keys are rejected. Organization-private sources are withheld unless the recipient owns them.
- SHA-256 sidecar and evidence manifest. Tampering is detected by `verify_export()`.
- Sample (synthetic): `exports/SAMPLE-SYNTHETIC-package/`.

Import mode: **I-1 (versioned export package)** first. I-2 (read-only) only if I-1 is not enough. I-3 (two-way sync) is deferred.

## 6. What the Audits module receives and must not do

Receives: the export package and, when an audit is locked, the snapshot.

Must not: import Pocket Auditor implementation files, write to Pocket Auditor storage, alter Pocket Auditor schemas, or rewrite requirement references or evidence provenance. Identifiers must be preserved.

## 7. Licensing

Licensed AS9100D and AS9110C text is private to Burrana Inc. It must not be copied into public or external exports. External organizations load their own licensed copies.

## 8. Status and blockers

- No source is approved. Approval requires reviewer sign-off on the checklist content, source reconciliation (done for structure, not line by line), and licence scope.
- MX AFAC RAC 145: no approved source.
- Regulator reuse terms: owner-asserted, not independently verified.
- CAR review: linked into the write-once audit snapshot (`engine/pa_audit_record.py`). Each CAR carries a state (active, closed effective, closed partially effective, closed ineffective, closed not verified). Blockers are recorded, and export is refused while any remain.
- Findings: linked to the snapshot, its checklist row, its evidence and its file hash (`engine/pa_findings.py`). The lead classification is separate from the proposal and is set once.
- Report package: draft only, built from one snapshot, with a "not assessed" list (`engine/pa_report.py`). It is refused while any blocker remains.
- Capture records: CAR review, interview, sampling, evidence and photo are validated, then saved by the local recorder (`engine/pa_local_server.py`) into the audit's hash-chained ledger (`engine/pa_ledger.py`, `audits/<audit_id>/ledger.jsonl`). Each record has an ID (CAR-, INT-, SMP-, EVD-, PHO-) and hashes. Snapshots, reports and the export carry those IDs and hashes, and the ledger head.
- Controlled values (proposed for owner confirmation): consent states and sampling results (`engine/pa_vocab.py`).
- Photos: the browser hashes the file with SHA-256 and does not upload it. Pocket Auditor holds the hash, not the image.
- The local recorder is single-user and bound to 127.0.0.1. It is not a multi-user service.
- FAA QSA selection: the 122 imported criteria (`content/faa-qsa/`, Burrana-private) are grouped by system element and selected individually, per element, or across elements (`engine/pa_qsa.py`, `prototype/qsa.html`). Publication is refused when nothing is selected. Each publication is a write-once snapshot with only the selected criteria, and its file hash is recorded in the capture ledger. Start Audit uses the latest published selection. Auditor additions are marked and sourced and never change a source row.
- FAA QSA assessments and findings: recorded in the ledger against published criteria only (`engine/pa_qsa_records.py`, `engine/pa_qsa_rules.py`). Assessments keep history, and the latest is current. A lead classification is set once, by a LEAD_AUDITOR other than the proposer.
- Mike's package (I-1, schema v1.0): the QSA section goes into the existing keys (`engine/pa_mike_export.py`). For Burrana Inc. only, the QSA section is included. Other recipients get no QSA content, and the FAA source is listed as withheld. Question and condition text are never exported. The contract key `sources_withheld_for_licence` is outside `pa_export.PACKAGE_REQUIRED`; this needs agreement with Mike.
- Review screens and SharePoint adapters: not built and not authorised.
- SharePoint adapters and any tenant work: not built and not authorised.
- Offline sync and device testing: not done.

## 9. Verification

Commands and results are recorded in `tests/RUN-LOG.txt` and `HANDOVER-REPORT-2026-10-08-v6.md`.

## 10. Checklist reconciliation (QA evidence, 2026-10-08)

Command: `python -I content/qa/reconcile_checklists.py` (also a blocking step in `tests/run_checks.py`). Output is exceptions only: `content/qa/CHECKLIST-QA-EXCEPTIONS.md`, with counts and details in `content/qa/checklist-qa-result.json`.

Current result: **8,170 checks run. Blocking: 0. Warnings: 4. Owner decisions: 2.**

What is checked:
- AS9100D and AS9110C, every row: reference exists in the licensed text (body, uppercase top-level heading, or table-of-contents entry); parent row exists; locator names the clause or the clause and item; question and evidence present, with no empty or blank prompt; wording status AUTHORED; no question or evidence shares an 8-word run with the licensed text; no question duplicated across rows.
- AS9100D and AS9110C, lettered rows: every licensed sub-paragraph has a row and every row exists in the licensed text (omissions and inventions); letters run a, b, c with no gap; no duplicate reference.
- AS9100D and AS9110C, coverage: every audit-universe clause has a row; every licensed clause in 4-10 is in the universe or flagged as an owner decision.
- FAA QSA 1.0, all 122 imported rows: the workbook hash equals the recorded import hash; each row exists in the workbook; question text equals the workbook cell; every word of workbook text owned by a criterion (13,817 words in total) is inside the imported row; condition text is a run of words in the workbook sheet.

Corrections made in this pass (logged):
- **20 checklist rows reworded.** Each copied an 8-word run from the licensed text. 42 field changes, in the lettered batch files, the clause part files and the canonical checklist. Log: `content/qa/wording-fixes.json`. Lettered rows were rebuilt with `content/checklists/lettered/merge_lettered.py` (AS9100D 294 and AS9110C 309 authored, pending 0).
- **Derived lettered extracts regenerated.** `licensed-private/lettered-AS9100D.*` and `lettered-AS9110C.*` were rebuilt from the licensed clause text with the annex boundary applied (`content/qa/extract_lettered.py`). They now match the checklist exactly (294 and 309). The licensed PDF and licensed text were not touched. An earlier attempt to correct the extract removed the wrong entries; it was reversed by the regeneration. Details are in `HANDOVER-REPORT-2026-10-08-v14.md`.

Owner decisions (not defects):
1. **FAA workbook rows not imported.** The workbook has twelve system-description rows across six elements (1 and 2 per element). The import has eight. Organizational Management and Design Control are missing. The brief said six. Decide: import all twelve (baseline becomes 126 rows), or exclude all description rows from selection (114 criteria).
2. **Workbook text outside numbered criteria.** Fourteen cells are element-level text: element names, element comments and notes. Decide whether they belong in the checklist baseline.

Warnings (quality, not wrong): page footers and replacement characters in the licensed text extracts. They are removed for comparison only.

Limits of this reconciliation:
- It cannot verify that a question is requirement-specific. A term-overlap check was tried and produced 34 false alarms where licensed text is paraphrased, so it was removed. Requirement-specific wording remains a reviewer judgement.
- It verifies structure, locators, verbatim use, duplicates and the workbook. It does not verify that the wording is correct against the standard. That is the line-by-line reviewer approval, which is still pending.
- Nothing here is an approved audit record. Checklists remain DRAFT until reviewer approval.

## 11. Closeout (2026-10-08): canonical repository state

Canonical location: `Airgate-Pty-Ltd/AS9100-audit-tool`, folder `pocket-auditor/` (branch `main`). Work is done only here. The earlier product folder under `_Opportunity-Scans\Builds` is no longer canonical.

Counts and results at closeout:
- FAA QSA 1.0 baseline: **126 reference-bearing rows** (114 CRITERION, 12 SYSTEM_DESCRIPTION). The 14 element-level notes are kept as `element_context`, per system element.
- Selectable items across sources: **923** = FAA QSA 126 + AS9100D 387 + AS9110C 408 (clause and lettered rows, groups excluded) + customer checklist 2 (synthetic).
- Checklist reconciliation (`content/qa/reconcile_checklists.py`): **8,185 checks, 0 blocking, 4 warnings (extract cosmetics), 0 owner decisions.**
- Tests: **367 OK** (`python -I -m unittest discover -s tests -p "test_*.py"`).
- Checks: **ALL CHECKS PASS** (`python -I tests/run_checks.py`), 18 steps, including the blocking checklist reconciliation.

Multi-source selection and customer ingestion:
- One draft and one write-once publication across FAA QSA, AS9100D, AS9110C and customer checklists (`engine/pa_selection.py`). Publication lists each source with its licence and hash. Start Audit reads the same ledger-verified publication.
- Customer checklist import validates ref, question and evidence, refuses duplicates and overwrites, and stores the file's SHA-256. Customer-private rows are withheld from every recipient except the customer, including the Burrana owner package.

5173 prototype (restored 2026-10-08): the recorder (`engine/pa_local_server.py`, port 5173, 127.0.0.1 only) opens `prototype/index.html`, the Pocket Auditor entry page with regulator sources, the authored checklists, audit start and the lock gate. It links to `capture.html` (evidence capture) and `qsa.html` (FAA QSA selection, assessments and findings). A partial multi-source shell that briefly became the entry page has been removed; its API endpoints remain (`/api/selection/*`), but no UI for multi-source selection is in the prototype yet.

Contract: the v1.0 package keeps **19 required keys**, including `sources_withheld_for_licence`. Verified by tests on the owner package, the external package, and the combined sample.

Combined-source synthetic package: `exports/SAMPLE-COMBINED-PACKAGE/` (`owner/`, `external/`, `audit-record/`, `input/`). Audit data is SYNTHETIC. The owner package carries the licensed standards and FAA source (the owner is Burrana Inc.) and withholds the customer rows. The external package withholds the QSA section, licensed rows and customer rows, and lists them in `sources_withheld_for_licence`.

Blockers and limits, open at closeout:
- Checklist wording remains draft until line-by-line reviewer approval. Nothing here is an approved audit record.
- Mike's Audits module import is not implemented here; the contract and the sample packages are the specification.
- No authentication. The recorder and console are for local single-user prototype use only and must not be exposed on a network.
- The customer checklist used in the sample is synthetic. Real customer checklists must be imported under the customer's own licence terms.
- SharePoint integration is not built.
- Licensed standard text and Burrana-private FAA content are in this repository as directed by the owner. Redistribution outside a private Burrana repository remains prohibited by the licence terms.

## 12. Stepper workflow (2026-10-08 redesign)

The entry page at `/` is now the audit workflow, one stepper: **Setup → Scope & Criteria → Planning → Conduct → Review & Report** (`prototype/index.html`). The original source and checklist page is kept as `prototype/sources.html`, with its audit depth unchanged.

- **Setup** (`engine/pa_setup.py`, `engine/pa_setup_rules.py`): audit type, ID and title, objectives, lead auditor and team, auditee contact, independence/conflict declaration (a declared conflict refuses the audit; lead auditor cannot be the auditee contact), site and method, start and end, opening and closing meetings, report due date (not before the end), sponsor/approver, safety / confidentiality / access / photo permissions. Recorded once in the ledger (`audit_setup`, prefix SET). Status moves forward one step at a time as separate records (`audit_status`, prefix STA).
- **Scope & Criteria**: one selection across FAA QSA, AS9100D and AS9110C rows and customer checklists; published write-once (see §11).
- **Planning**: shows setup and scope status, and links to prior CARs, sampling and interviews on the capture screen. The quality manual, applicability and risks are shown as **not in this prototype**.
- **Conduct**: assess each published criterion with evidence (latest assessment is current; history kept). Status IN_PROGRESS and CONDUCTED are recorded here.
- **Review & Report**: write-once snapshot of the selected clauses for AS9110C or AS9100D (refused, with blockers listed, when not ready), Mike export for the owner and for an external recipient (each verified before it is reported), REPORTED and CLOSED status.

Verified user path (browser, 2026-10-08): setup recorded → scope published (2 criteria, 2 sources) → assessment saved with evidence → status CONDUCTED → snapshot ready for export → owner package written and verified.

Gaps still open, stated plainly:
- Regulator sources (FAA 14 CFR, EASA, UK, CAAC) are browsed on `sources.html` and are not yet selectable in Scope & Criteria.
- Sites and processes are free text in Setup; they are not a selectable list.
- Quality manual, applicability review, risk register and audit-plan approval are not built.
- Findings are classified on `qsa.html`; Review shows counts only.
- Customer checklist import is a function (`pa_selection.import_customer_checklist`); there is no upload screen.
- Approvals and sign-off by the sponsor are recorded as fields only; nothing enforces them.

## 13. Integrated workflow on port 5173 (2026-10-08)

One working experience: `prototype/index.html`, served by `engine/pa_local_server.py` on port 5173. The stepper is **Setup → Scope & Criteria → Planning → Conduct → Review & Report**. Every step writes to the audit ledger; nothing is kept only in the browser.

- **Setup**: audit type, ID, title, objectives, lead auditor and team, auditee contact, independence (a declared conflict or a lead who is the auditee contact is refused), site and method, start and end, opening and closing meetings, report due date (not before the end), sponsor or approver, safety, confidentiality, access and photo permissions, status.
- **Scope & Criteria**: one selection across regulators (14 CFR Part 145 and 21, EASA Reg. 1321/2014 and 748/2012, UK retained 1321/2014, CAAC CCAR-145-R4), AS9100D and AS9110C rows, FAA QSA 1.0 criteria and customer checklists. 2,658 items in the catalogue. Publication is write-once; regulator rows are public-regulator text (reuse terms unverified).
- **Planning (quality manual first)**: the quality manual is recorded by its SHA-256 (the file stays in the browser). Exclusions are proposed against the published scope and reviewed by someone other than the proposer (accept, reject or amend). The manual review is completed by someone other than the uploader, with every exclusion resolved. **Audit start (IN_PROGRESS) is refused until planning is complete.** A not-applicable assessment is accepted only for a criterion with an accepted exclusion, once a manual is recorded.
- **Conduct**: the capture screen (evidence, photos, interviews, sampling, CAR records) is embedded in the step. Assessments are recorded per criterion with evidence. Status CONDUCTED is recorded here.
- **Review & Report**: CAR review (state and flags for each CAR in the ledger); findings and lead classification on the embedded FAA QSA screen; report summary (counts from the latest snapshot and the conduct assessments); write-once snapshot of the selected clauses (refused with blockers listed when not ready); Mike export for the owner and for an external recipient (each verified before it is reported); REPORTED and CLOSED status.

Verified user path, browser, port 5176 on a scratch audit folder (2026-10-08): setup recorded; scope published with a regulator row and an AS9100D clause; quality manual recorded from a file, exclusion proposed, reviewed and manual review completed; audit started; evidence and CAR recorded through the recorder; criterion assessed NONCONFORMING with evidence; status CONDUCTED; snapshot ready; report summary; owner package written and verified. Automated: 394 tests, all checks pass.

Open gaps, stated plainly:
- Sites and processes are free text in Setup; they are not selectable lists.
- Findings are classified on the embedded FAA QSA screen; the report counts them but does not list them.
- Customer checklist import is a function (`pa_selection.import_customer_checklist`); there is no upload screen.
- Sponsor and approver sign-off are recorded as fields only; nothing enforces them.
- The NOT_APPLICABLE rule applies only once a quality manual is recorded; an audit without a manual can still record not-applicable with a reviewer.
- The capture form does not check that a CAR's linked requirement is in the published scope; the snapshot does, and reports it as a blocker.
- The 5173 server must be restarted from the repository copy to load these changes.

## 14. Final pass on the 5173 workbench (2026-10-08)

This pass closes the gaps listed in section 13 that concern the prototype. The contract (schema v1.0, 19 keys, source identities, withheld-source rules) is unchanged.

**What changed**
- **Findings and CARs from criteria.** Each conduct card has a "Raise a finding or CAR" panel. A major or minor nonconformity records a CAR in the ledger first, linked to the criterion, then the finding (`POST /api/audits/<id>/qsa/findings`). A nonconformity needs evidence IDs before any CAR is recorded (checked in the page), and record or controlled-document evidence (checked by `engine/pa_qsa_records.py`). If the finding is refused, the CAR is reused on retry. The engine rules are not changed.
- **No hard-coded snapshot standard.** `engine/pa_review.py` `scoped_standards` returns the standards with at least one clause selected in Scope & Criteria. `GET /api/audits/<id>/review` returns them as `snapshot_standards`. The page offers only those and disables the snapshot control when none are selected.
- **README** (`README.md`) describes how to run the 5173 preview, the five steps, the raise rules, the snapshot rule and the open items.

**Verified**
- Automated: 405 tests pass (`python -I -m unittest discover -s tests -p "test_*.py"`). Six are new, in `tests/test_conduct_records.py`: nonconformity refused without a CAR; accepted with a CAR and record evidence; refused with observation evidence only; observation needs no CAR; snapshot standards follow the scope. `python -I tests/run_checks.py`: all checks pass.
- Browser, scratch server on port 5176 with a scratch ledger: a nonconformity without evidence records the CAR and refuses the finding (the server message is shown, the CAR is reused on retry); the same nonconformity with a record-review evidence ID records finding QFN-0010 linked to the CAR, with one CAR in the ledger. The page-side evidence check refuses a nonconformity with no evidence, and no CAR is recorded. The review step offers no snapshot standard for an FAA-only scope, and the snapshot control is disabled with the reason shown.
- The 5173 preview was stopped and restarted from this folder with `engine/pa_local_server.py 5173`. The index loads, `/` redirects, and the progress and review endpoints answer. A read on an unknown audit creates no folder.
- Browser clicks on the raise panel were dispatched through the DOM in one check, because pointer coordinates were unreliable for an element below the fold. The handler and the server path are the same either way.

**Open gaps, stated plainly**
- A finding refused by the server after its CAR was recorded leaves that CAR open in the ledger until the finding is raised again. If it is abandoned, the CAR must be closed or explained in the review. The page's evidence check prevents the common case, not every case (for example, an observation used as evidence for a nonconformity).
- CAR IDs in the page are generated from the audit reference and a timestamp. The ledger ID (`CAR-nnnn`) is the reference used by findings.
- CAR closure and effectiveness review are recorded on the capture screen, not in the conduct cards. Closure in another system is never treated as effective (unchanged).
- Sites and processes are still free text. The customer checklist import has no upload screen. Sponsor sign-off is recorded as a field only. The not-applicable rule applies once a quality manual is recorded.
- Device and SharePoint validation are not done.

**Commit.** This section is committed with the Pocket Auditor changes listed in the commit message on `origin/main`. The commit hash is the HEAD of that push (`git log -1 -- pocket-auditor`); it cannot be written into this section without a second commit.
