# Pocket Auditor — handover report, 2026-10-08

Scope of this report: the work done in this session, in this folder, against `CODEX-HANDOFF-2026-10-08.md`. Status is **prototype only**. Nothing here is production, tenant deployment, licensed clause verification, or store readiness.

## 1. Files changed (this session, in this folder)

| Path | Change |
|---|---|
| `08-SHAREPOINT-SCOPE.md` | Scope revised: standalone model, existing-tools rule (R-9, R-10), offline rule (R-11, §9), Railway removed, CCAR-145-R4 naming, PAD-011 to PAD-013 proposed |
| `content/parse_ecfr.py` | New. Parses eCFR XML into paragraph rows |
| `content/parse_easa.py` | New. Parses EASA annex text into paragraph rows |
| `content/rows-faa-14cfr-145.json` | New. 264 rows |
| `content/rows-faa-14cfr-21.json` | New. 871 rows |
| `content/rows-easa-part145.json` | New. 567 rows, 20 clauses |
| `content/rows-easa-part21.json` | New. 2,539 rows, 167 clauses |
| `content/rows-uk-part145.json` | New. 1,007 rows, 19 clauses. Differs from EASA (see §4) |
| `content/rows-caac-maint-org.json` | New. 43 articles, CCAR-145-R4, Chinese text |
| `content/SOURCE-INVENTORY.md` | New. Source list with hashes and status |
| `content/AS-licensed-clause-register.json` | New. Clause refs and standard headings only (R-2) |
| `content/AS-LICENSED-REGISTER-FINDINGS.md` | New. Seed-versus-licence findings |
| `content/build_as_findings.py` | New. Writes the findings report |
| `content/build_audit_rows.py` | New. Builds the clause 4–10 universe |
| `content/verify_audit_rows.py` | New. Verifies the universe against the rule |
| `content/audit-rule/rule.json` | New. The audit rule as data (not approved) |
| `content/audit-rule/clause-universe.json` | New. 93 AS9100D and 99 AS9110C clauses in scope |
| `prototype/index.html` | New. Local prototype viewer (see §3) |
| `tests/run_checks.py` | New. Check runner |
| `tests/RUN-LOG.txt` | New. Output of the last run |
| `licensed-private/` | New. Copies of AS9100D.pdf and AS9110C.pdf, plus extracted text and a draft register. **Private, do not ship** |
| `sources/` | New. Raw regulator files, unedited (see SOURCE-INVENTORY.md) |
| `HANDOVER-REPORT-2026-10-08.md` | This file |

Not changed by this session: `library-seed.json` (left as is, see §4), `mai/`, `01`–`07`, `13`, `BUILD-GOVERNANCE-STATUS.md`, `CODEX-HANDOFF-2026-10-08.md`.

## 2. Commands and real output

Run from the product folder: `python -I tests/run_checks.py`. Full log in `tests/RUN-LOG.txt`. Final output:

```
[PASS] parse FAA 14 CFR 145 extract        -> 264 paragraph rows
[PASS] parse FAA 14 CFR 21 extract         -> 871 paragraph rows
[PASS] build AS findings report
[PASS] build audit clause universe (4-10)  -> AS9100D 93, AS9110C 99
[PASS] verify audit clause universe        -> All structural checks pass
[PASS] JSON parses (10 files)
RESULT: ALL CHECKS PASS
```

Other commands run in this session (outputs were checked, not recorded in the log):
- `pip install pypdf` (installed pypdf 6.13.1 into the user Python, outside this folder)
- `python -I` extraction of AS9100D.pdf (54 pages) and AS9110C.pdf (55 pages) into `licensed-private/`
- A local static server: `python -I -m http.server 5173 --bind 127.0.0.1`, serving this folder only (background process, stops with the session)

Existing checks before and after: the three build scripts were run before the audit-rule step and again in the run above. No check was changed to pass.

## 3. What is demonstrably working

- Regulator text parsed to paragraph rows for FAA 14 CFR 145 and 21 (including §21.137(a)–(o), 23 rows), EASA 145 and 21, UK 145, and CAAC CCAR-145-R4.
- Source hashes recorded for every raw file.
- Licensed AS9100D and AS9110C clause headings extracted from the table of contents and body. Seed rows checked against them. Findings written.
- Clause universe for clauses 4 to 10, with subclauses, built from the licensed register.
- The audit rule is stored as data. The verifier checks that every headed clause 4–10 is in scope, that nothing defaults to N/A, and that the N/A condition is stated.
- Prototype viewer serves the source register, scope selection, the blocked checklist state (R-1), and the browsable regulator extracts. Confirmed in the browser pane that the page loads and the extracts populate.

## 4. What remains blocked or prototype-only

- **No checklist can be generated.** Generation is blocked by design: no requirement row has an approved status (R-1, handoff "source and claim rules").
- **Intent, expected evidence and failure modes:** not authored. 136 clauses in the universe have no source text. The handoff forbids authoring from memory, so these wait for approved source material. 56 seed texts are unverified and must not reach an approved checklist.
- **Seed defects (not changed):** 26 AS9100D and 6 AS9110C seed rows cite clause numbers that do not exist in the licensed standards. 11 AS9100D and 10 AS9110C seed titles differ from the licensed headings. Removal needs owner approval. Details in `content/AS-LICENSED-REGISTER-FINDINGS.md`.
- **Licensed verification is partial.** Clause headings were compared against the licensed table of contents. Body text was not checked clause by clause. 48 universe rows came from body lines, not headings, and may include non-clauses.
- **UK Part-145 mismatch:** three EASA clauses missing and two UK-only headings in the extraction. Not resolved.
- **CAAC text:** Chinese only, article level. No translation.
- **FAA 21.137(c):** source text appears cut at "Procedures that". Not checked against the eCFR page.
- **MX AFAC RAC 145:** no official text in the folder. Blocked on owner upload (open slot in the prototype).
- **Not built:** source approval workflow; source metadata approval; applicability decisions; N/A enforcement against quality-manual exceptions (the rule is stored, not enforced); objective evidence capture; findings linked to requirement and snapshot; immutable snapshots; SharePoint compatibility adapters and contracts; offline store and sync (scope only, §9 of 08); audit execution screens.
- **Prototype only.** Boundary from the existing build spec is unchanged: no production build, no store submission, no real client audit, no tenant.
- **Privacy/licence:** `licensed-private/` holds copies of licensed standards. CLAUDE.md says licensed standards belong in `06 - Controlled Documents\Licensed External Standards`. Not moved, awaiting owner decision.

## 5. Exact next steps for the owner

1. Approve or reject the seed removals and title corrections in `AS-LICENSED-REGISTER-FINDINGS.md`.
2. Decide where the licensed copies live (`licensed-private/` here, or `06 - Controlled Documents\Licensed External Standards`).
3. Provide the approved source material to author from: AS9100D and AS9110C clause text from your copies (or an approved paraphrase), and the source files for FAA 145, FAA 21, EASA 145, EASA 21, UK 145 and CAAC. Upload the MX RAC 145 file to `sources\` when available.
4. Confirm the UK Part-145 extract against the legislation.gov.uk text, and the FAA §21.137(c) wording against eCFR.
5. Decide the quality-manual exception record format, which will drive N/A enforcement.
6. Approve the audit rule text in `content/audit-rule/rule.json` (currently not approved).
7. Then the next build milestone is: approval workflow for sources and rows, followed by checklist generation that reads only approved rows.

## 6. Confirmation: no QMS repository or other product modified

- Only this folder was written to by this session.
- `E:\Conform-Edge\Conform-Edge-QMS-git` and `m365-qms` were read, not written. Files under `m365-qms/audits/` show modification times from 7 and 8 October, before this session's first write. `git status` for `.claude` and `m365-qms` reports no changes against the repository.
- No other product folder was written.
- The only write outside this folder is the `pip install pypdf` into the user Python environment (not a product or QMS repository).
