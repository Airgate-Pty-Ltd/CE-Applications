"""Add the fields every canonical row must carry: source locator, N/A handling, finding linkage,
and an explicit wording status. Idempotent: rows are rebuilt from the same inputs on every run.

Wording status is honest:
  AUTHORED            clause row with a question and evidence written from the licensed copy (draft)
  PENDING_AUTHORING   lettered row: reference and locator are exact; question and evidence not yet written

No row is marked approved. Approval is a separate gate (reconciliation plus reviewer sign-off).

Run from the product root:  python -I content/complete_rows.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NA_HANDLING = {
    "allowed": "Only on an approved quality-manual exclusion covering this exact reference (or an approved exclusion record)",
    "record_fields": ["ref", "status=NOT_APPLICABLE", "reason", "qm_section_ref", "evidence_links", "reviewer", "timestamp"],
    "without_basis": "Not accepted. The row stays applicable and must be assessed",
}


def finding_link(ref):
    return {
        "finding_must_cite": ["checklist_item_ref", "requirement_id", "source_snapshot_hash", "evidence_ids"],
        "checklist_item_ref": ref,
        "requirement_id_format": "STD:<standard>:<ref>",
    }


def complete(std):
    p = ROOT / "content" / "checklists" / f"{std}.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    items = [i for i in data["items"]]
    rows = []
    for it in items:
        ref = it["ref"]
        base = it.get("parent_ref") or ref
        is_lettered = it.get("type") == "lettered_subparagraph"
        if is_lettered:
            locator = f"licensed-private/{std}.pdf, clause {base}, item ({ref.split('(')[1][:-1]})"
            wording = "PENDING_AUTHORING"
        else:
            locator = f"licensed-private/{std}.pdf, clause {ref}"
            wording = "AUTHORED" if it.get("question") else "GROUP_HEADING"
        row = dict(it)
        row["source_locator"] = locator
        row["wording_status"] = wording
        row["na_handling"] = NA_HANDLING
        row["finding_link"] = finding_link(ref)
        if is_lettered and not it.get("question"):
            row["question"] = None
            row["evidence"] = []
        rows.append(row)
    data["items"] = rows
    data["row_fields"] = ["source_locator", "wording_status", "na_handling", "finding_link"]
    data["summary"] = {
        "rows": len(rows),
        "authored": sum(1 for r in rows if r["wording_status"] == "AUTHORED"),
        "pending_authoring": sum(1 for r in rows if r["wording_status"] == "PENDING_AUTHORING"),
        "group_headings": sum(1 for r in rows if r["wording_status"] == "GROUP_HEADING"),
    }
    p.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(std, data["summary"])


if __name__ == "__main__":
    complete("AS9100D")
    complete("AS9110C")
