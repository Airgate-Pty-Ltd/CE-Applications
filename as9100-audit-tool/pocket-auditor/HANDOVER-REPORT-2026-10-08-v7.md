# Pocket Auditor — handover report v7, 2026-10-08

Written against the owner correction: no writes outside this folder (including temporary backups); complete lettered rows with locator, question, evidence, N/A handling and finding linkage; CAR, interview, sampling and photo capture; live lock-gate behaviour; no claims of approval or audit readiness.

Status: **prototype only.** Nothing is approved. This product is not ready for audit use.

## 1. Write locations (correction item 1)

- Tests used the system temporary folder. Fixed: all tests now use `tests\_scratch\` inside this folder, and the check runner removes it. Verified: scratch is clean after the run.
- Earlier writes outside this folder, disclosed:
  - a backup copy to my home directory during the reconciliation pass; deleted at once;
  - two failed shell redirects to `/tmp`-style paths; they wrote nothing;
  - `pip install pypdf` into the Python environment (an environment install, not a product write);
  - earlier test runs that used the system temporary folder; each run removed its own folder, but nothing was checked on disk afterwards.
- No further writes outside this folder.

## 2. Lettered checklist rows (correction item 2)

Every canonical row now carries: `source_locator`, `wording_status`, `na_handling`, and `finding_link`. Built by `content/complete_rows.py` (idempotent).

| Standard | Rows | Clause rows authored | Lettered rows pending authoring | Group headings |
|---|---|---|---|---|
| AS9100D | 397 | 93 | 297 | 7 |
| AS9110C | 418 | 99 | 312 | 7 |

- **Locator:** exact, for every row (for example `licensed-private/AS9110C.pdf, clause 8.5.1, item (d)`).
- **N/A handling:** every row is applicable unless an approved exclusion covers it. Field N/A needs the same basis as a manual N/A.
- **Finding link:** each finding must cite the checklist item, requirement ID, source snapshot hash and evidence IDs.
- **Not complete:** the 609 lettered rows have no question or evidence wording. They are marked `PENDING_AUTHORING` and are not usable as audit questions until written. The clause rows are authored drafts and have not been checked line by line.

## 3. Capture: CAR, interview, sampling, photo (correction item 3)

Data layer built and tested in `engine/pa_capture.py` (`tests/test_capture.py`):
- **Interview:** required fields, consent rules, transcript not authoritative until reviewed.
- **Sampling:** required fields; expansion decision required for nonconforming results.
- **Photo:** records the file's SHA-256 and metadata. Requires caption, what it proves, location, auditor, timestamp and requirement ID. The file is not copied.
- **CAR review:** required fields and effectiveness flags. A closed CAR is never assumed effective.

**Not built:** capture screens (camera, attachment, caption, preview), offline capture, and CAR linkage into audit snapshots.

## 4. Live lock gate (correction item 4)

- The prototype (`prototype/index.html`, section 5) recalculates the lock decision live when sources are ticked. The rules match the engine: manual review, approval, licence gate and review cycle.
- The prototype cannot record a manual review or an approval, so the lock is always REFUSED there. The page says so.
- The engine decision is also written to `prototype/data/gate-status.json` (generated, labelled DRAFT DEMONSTRATION).

## 5. Claims (correction item 5)

- Corrected: the v6 handover and the prototype's earlier wording used "approvable". Reconciliation shows that the report has no unresolved rows (structure only). It does not mean approved. The field is now named `structure_reconciled`, and the page reads: "reconciled to structure; not approved (content review and source approval still required)".
- No document in this folder states that any source, checklist or audit is approved or ready for audit.

## 6. Real output

```
python -I -m unittest discover -s tests -p "test_*.py"
Ran 117 tests ... OK

python -I tests/run_checks.py
RESULT: ALL CHECKS PASS   (17 steps)
```

Browser check (prototype, AS9110C ticked): lock REFUSED; reasons: no quality manual recorded; AS9110C status not approved; review cycle not started.

## 7. Remaining gaps

1. **609 lettered rows** need question and evidence wording, written from the licensed text, reviewed, then marked AUTHORED.
2. **Clause rows** (193) need a line-by-line check against the licensed copies.
3. **Capture screens** (interview, sampling, photo, CAR) are not built; only the record layer exists.
4. **Findings and report** UI and report package are not built.
5. **CAR linkage** into snapshots is not built.
6. **Approval workflow** is not built; no source or row can be approved in the product.
7. **Owner decisions:** canonical handoff filename; Burrana licensed copy location; the GPT 734-row files stay supplementary (not reconciled to clauses).
8. **MX AFAC RAC 145** has no approved source.

## 8. Files changed this pass

New: `content/complete_rows.py`, `engine/pa_capture.py`, `tests/test_capture.py`, `HANDOVER-REPORT-2026-10-08-v7.md`.
Changed: `content/checklists/AS9100D.json`, `AS9110C.json` (row fields), `content/build_prototype_status.py` (field rename), `prototype/index.html` (live gate; wording), `prototype/data/gate-status.json`, `tests/run_checks.py`, `tests/test_engine.py`, `tests/test_export.py`, `tests/test_canonical.py`, `tests/test_qm.py` (scratch folder inside this folder).

## 9. Confirmation

Writes this pass were inside `Builds\2026-09-27-pocket-auditor`. No QMS repository, RI-M365 folder, AI-Team record or other product was written to.
