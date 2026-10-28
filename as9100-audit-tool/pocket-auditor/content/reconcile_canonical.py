"""Reconcile the canonical AS9100D and AS9110C checklists to the private licensed copies.

For each canonical row:
  - the clause reference must appear in the licensed copy (table of contents, a numbered body line,
    or the top-level structure line for clauses 4-10);
  - lettered sub-paragraphs (a), (b), (c) ... are added as rows ONLY where the licensed clause body
    shows them, in order. The body stops at the notes and annexes ("11. NOTES" or "ANNEX A".."ANNEX E"),
    because annex letters are informative and belong to no clause.

Each lettered row carries its exact reference and a locator into the licensed copy. Its wording is
not copied here.

Idempotent: lettered rows from an earlier run are dropped and rebuilt from the same inputs.

Outputs: content/checklists/<STD>.json and content/reconciliation/<STD>-reconciliation.json.
Unresolved rows make the report BLOCKED.

Run from the product root:  python -I content/reconcile_canonical.py
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIC = ROOT / "licensed-private"
LETTER_RE = re.compile(r"(?:(?<=\s)|^)([a-z])\. (?=\S)")
ANNEX_MARKERS = ["11. NOTES", "ANNEX A", "ANNEX B", "ANNEX C", "ANNEX D", "ANNEX E"]


def key(ref):
    return [int(x) for x in ref.split(".")]


def cut_at_annex(body):
    """Keep only the normative body of a clause: stop at the first notes or annex marker."""
    positions = [body.find(m) for m in ANNEX_MARKERS]
    positions = [p for p in positions if p >= 0]
    return body[:min(positions)] if positions else body


def lettered(body):
    """Top-level letters a, b, c ... present in order in a (normative) clause body."""
    found = []
    expected = "a"
    for m in LETTER_RE.finditer(body):
        if m.group(1) == expected:
            found.append(expected)
            expected = chr(ord(expected) + 1)
    return found


def process(std):
    checklist_path = ROOT / "content" / "checklists" / f"{std}.json"
    data = json.loads(checklist_path.read_text(encoding="utf-8"))
    data["items"] = [i for i in data["items"] if i.get("type") != "lettered_subparagraph"]
    lic_pdf = LIC / f"{std}.pdf"
    lic_txt = (LIC / f"{std}.txt").read_text(encoding="utf-8").replace("\xa0", " ")
    lic_lines = [re.sub(r"\s+", " ", l).strip() for l in lic_txt.split("\n")]
    body_refs = set()
    for i, l in enumerate(lic_lines):
        if i < 200:
            continue
        m = re.match(r"^(\d+(?:\.\d+){0,4})(?=\s|$)", l)
        if m:
            body_refs.add(m.group(1))
    toc_refs = set()
    for l in lic_lines[:400]:
        m = re.match(r"^(\d+(?:\.\d+){0,4})\s+(.+?)\s*\.{3,}\s*\d+$", l)
        if m:
            toc_refs.add(m.group(1))
    structure_line = any(l == "4 5 6 7 8 9 10" for l in lic_lines)
    clause_text = json.loads((LIC / f"clause-text-{std}.json").read_text(encoding="utf-8"))

    report_rows = []
    new_items = []
    for it in data["items"]:
        ref = it["ref"]
        if it.get("type") == "group":
            status = "MATCHED_STRUCTURE_LINE" if structure_line and ref in {str(n) for n in range(4, 11)} else "UNRESOLVED"
        elif ref in toc_refs:
            status = "MATCHED_TOC"
        elif ref in body_refs:
            status = "MATCHED_BODY"
        else:
            status = "UNRESOLVED"
        it["reconciliation"] = status
        report_rows.append({"ref": ref, "status": status})
        if status.startswith("MATCHED") and it.get("type") != "group":
            body = cut_at_annex(clause_text.get(ref, ""))
            for letter in lettered(body):
                new_items.append({
                    "ref": f"{ref}({letter})",
                    "parent_ref": ref,
                    "type": "lettered_subparagraph",
                    "title": None,
                    "intent": None,
                    "question": None,
                    "evidence": [],
                    "failure_modes": [],
                    "reconciliation": "LETTER_MATCHED_IN_LICENSED_BODY",
                    "locator": f"licensed-private/{std}.pdf, clause {ref}, item ({letter})",
                })
                report_rows.append({"ref": f"{ref}({letter})", "status": "LETTER_MATCHED_IN_LICENSED_BODY"})

    data["items"] = sorted(data["items"] + new_items, key=lambda x: (key(x["ref"].split("(")[0]), x["ref"]))
    data["lettered_rows_added"] = len(new_items)
    data["reconciled_against_sha256"] = hashlib.sha256(lic_pdf.read_bytes()).hexdigest()
    checklist_path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    unresolved = [r for r in report_rows if r["status"] == "UNRESOLVED"]
    rep = {
        "standard": std,
        "licensed_file": f"licensed-private/{std}.pdf",
        "licensed_sha256": data["reconciled_against_sha256"],
        "rows_checked": len([r for r in report_rows if "(" not in r["ref"]]),
        "lettered_rows_added": len(new_items),
        "unresolved": unresolved,
        "status": "BLOCKED" if unresolved else "RECONCILED",
        "note": "Lettered rows carry exact references and locators only. Clause bodies stop at the notes and annexes. Unresolved rows block approval.",
    }
    out = ROOT / "content" / "reconciliation"
    out.mkdir(exist_ok=True)
    (out / f"{std}-reconciliation.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    print(std, "canonical rows", len([r for r in report_rows if "(" not in r["ref"]]),
          "lettered rows", len(new_items), "unresolved", len(unresolved), "status", rep["status"])


if __name__ == "__main__":
    process("AS9100D")
    process("AS9110C")
