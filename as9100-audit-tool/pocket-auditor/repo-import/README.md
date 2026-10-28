# Pocket Auditor (prototype)

Status: **prototype. Nothing here is approved. Not ready for third-party audit use.**

This folder holds the Pocket Auditor engine and capture prototype. It is separate from the AS9100 audit tool in the rest of this repository, and nothing outside this folder was changed.

## What is here

- `engine/` — Python modules: audit ledger, snapshots, findings, reports, export package (schema v1.0, 19 required keys), local recorder (`pa_local_server.py`), FAA QSA selection and records.
- `prototype/capture.html`, `prototype/capture-rules.js` — evidence capture screens. The rules mirror the engine and are checked by parity tests.
- `prototype/qsa.html` — FAA QSA selection, assessment and finding screen.

## What is not here, and why

- **Licensed standards** (AS9100D, AS9110C text and extracts): not copied. Licence terms apply.
- **Checklists derived from the licensed standards** (`content/checklists/`): not copied pending a licensing decision.
- **FAA QSA source** (Burrana-owned workbook and derived criteria): not copied. It is private to Burrana Inc.
- **Regulator extracts** (`content/rows-*.json`) and the source registry: not copied; reuse terms not yet verified.
- **Audit data, samples and exports** (`audits/`, `exports/`): not copied. Samples use synthetic data.
- **Internal handovers and directives**: not copied.
- **Tests**: not copied here. They read the licensed and checklist content above, so they would fail in this repository.

## Running it

Run from a full copy of the Pocket Auditor product folder, not from this repository copy alone:

```bash
python -I engine/pa_local_server.py
```

Then open `http://127.0.0.1:5173/prototype/capture.html`. The recorder binds to 127.0.0.1 only. It is for local prototype use and must not be exposed on a network.

## Limits

- No authentication. Single local user only.
- Checklist wording awaits line-by-line reviewer approval.
- The lead-classifier name is free text.
- SharePoint integration and the Audits module import are not built here.
