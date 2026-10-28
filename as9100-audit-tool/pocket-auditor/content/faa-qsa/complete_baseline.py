"""Complete the FAA QSA baseline to the full workbook: 126 reference-bearing rows.

Changes to content/faa-qsa/faa-qsa-audit-checklist-1.0.json:
- adds the workbook description rows that the first import omitted (Organizational Management 1 and 2,
  Design Control 1 and 2);
- marks all twelve system-description rows kind = SYSTEM_DESCRIPTION; numbered criteria are kind = CRITERION;
- keeps the workbook's element-level notes and comments as element_context (14 cells), per system element.
Existing criterion rows are not changed. The workbook is read only; its SHA-256 must equal the recorded import hash.

Run from the product folder:  python -I content/faa-qsa/complete_baseline.py
"""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "content" / "qa"))
import reconcile_checklists as rc  # noqa: E402

JSON_PATH = ROOT / "content" / "faa-qsa" / "faa-qsa-audit-checklist-1.0.json"
PATTERN = re.compile(r"^\s*(\d+(?:-\d+)?)\.\s+(.*\S)\s*$", re.S)
DESCRIPTION_REFS = ("1", "2")


def _text(v):
    return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""


def workbook_cells():
    """Every sheet's cell texts (in order) and the numbered reference cells, read only."""
    import openpyxl
    wb = openpyxl.load_workbook(rc.WORKBOOK, read_only=True, data_only=True)
    out = {}
    for ws in wb.worksheets:
        cells = []
        for row in ws.iter_rows(values_only=True):
            cells += [_text(v) for v in row if v is not None and _text(v)]
        out[ws.title.strip()] = cells
    return out


def main():
    raw = rc.WORKBOOK.read_bytes()
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    if hashlib.sha256(raw).hexdigest() != data["source_sha256"]:
        raise SystemExit("workbook hash does not match the recorded import hash; re-import before completing the baseline")
    cells = workbook_cells()
    have = {(c["source_sheet"].strip(), c["criteria_ref"]) for c in data["criteria"]}
    added = []
    for sheet, texts in cells.items():
        for t in texts:
            m = PATTERN.match(t)
            if not m or m.group(1) not in DESCRIPTION_REFS:
                continue
            key = (sheet, m.group(1))
            if key in have:
                continue
            added.append({
                "source_sheet": sheet, "criteria_ref": m.group(1), "question": m.group(2),
                "procedure": "", "comments": "", "status": "DRAFT_SOURCE_IMPORTED",
                "applicability": "UNDECIDED", "assessment": "NOT_ASSESSED", "evidence_ids": [],
                "finding_id": None, "condition_text": [],
            })
            have.add(key)
    for c in data["criteria"] + added:
        is_desc = c["criteria_ref"] in DESCRIPTION_REFS and c["question"].startswith("System Element")
        c["kind"] = "SYSTEM_DESCRIPTION" if is_desc else "CRITERION"
    data["criteria"] = data["criteria"] + added
    data["criteria_count"] = len(data["criteria"])
    data["baseline_note"] = ("Complete workbook baseline: 126 reference-bearing rows, of which 12 are SYSTEM_DESCRIPTION rows "
                             "and 114 are CRITERION rows. The first import (122 rows) omitted four description rows.")
    # element context: workbook text outside numbered criteria, per system element (14 cells, kept as context)
    outside = [x for x in json.loads((ROOT / "content" / "qa" / "checklist-qa-result.json").read_text(encoding="utf-8"))
               ["workbook_text_outside_criteria"]]
    context = {}
    for x in outside:
        context.setdefault(x["sheet"], []).append(x["text"])
    data["element_context"] = [{"source_sheet": s, "text": t} for s, ts in context.items() for t in ts]
    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"added {len(added)} description rows; total {data['criteria_count']}; element context {len(data['element_context'])}")
    for a in added:
        print("  +", a["source_sheet"], a["criteria_ref"])


if __name__ == "__main__":
    main()
