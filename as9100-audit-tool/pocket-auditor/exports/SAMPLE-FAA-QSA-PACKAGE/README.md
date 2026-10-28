# Sample FAA QSA package (SYNTHETIC audit data)

Status: sample for Mike's import contract (v1.0). Not an audit. Nothing here is approved.

- The FAA QSA criteria are real rows from the Burrana-owned workbook (licence scope BURRANA_PRIVATE_SOURCE).
- The audit records are SYNTHETIC: audit ID, evidence, CAR, interview, photo, sampling, assessments and findings are invented.
- `audit-record/` holds the ledger, the publication and the snapshot that the packages were built from.

| Folder | Recipient | QSA section | FAA source |
|---|---|---|---|
| `burrana/` | Burrana Inc. (owner) | included | included |
| `external/` | External Recipient (sample) | not included | listed in `sources_withheld_for_licence` |

Verify a package (must print `(True, None)`):

```bash
python -I -c "import sys; sys.path.insert(0,'engine'); import pa_export as pe; print(pe.verify_export('exports/SAMPLE-FAA-QSA-PACKAGE/burrana'))"
```

Question, procedure, comments and condition text of the FAA criteria are not in either package.
