"""Reword the checklist rows that the reconciliation found copying 8 or more words of licensed text.

Every flagged row is rewritten in every file that holds it: lettered batch files (source of the lettered rows),
clause part files, and the canonical checklist. Only rows of the named standard are changed.
After this script, run content/checklists/lettered/merge_lettered.py to rebuild the canonical lettered rows, then
content/qa/reconcile_checklists.py to confirm the verbatim checks pass.

Changes are recorded in content/qa/wording-fixes.json (old and new text for every change).
Run from the product folder:  python -I content/qa/apply_wording_fixes.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHECKLISTS = ROOT / "content" / "checklists"
LOG = ROOT / "content" / "qa" / "wording-fixes.json"

Q = "question"
E = "evidence"

# (standard, ref) -> field changes. Evidence entries are replaced by exact string.
FIXES = {
    ("AS9100D", "5.1.1(b)"): {Q: "What quality policy and quality objectives do you hold, and how do they fit your organization's context and strategy?"},
    ("AS9100D", "5.1.1(f)"): {Q: "How does top management explain why effective quality management and conformity to QMS requirements matter to the people doing the work?"},
    ("AS9100D", "7.5.3.1(a)"): {Q: "Can the people who need this controlled document reach a current copy, and is it usable where the work happens? Show the point of use."},
    ("AS9100D", "7.5.3.1(b)"): {Q: "How do you guard this document against unauthorised disclosure, misuse or corruption?"},
    ("AS9100D", "8.3.4.1(b)"): {Q: "Do the test procedures set out the methods, the steps to carry out the test, and what to record?"},

    ("AS9110C", "5.3.1"): {Q: "Who holds the Accountable Manager role, and how do they know maintenance can be financed and carried out to standard?",
                           E: {"Direct access to top executive if the Accountable Manager is not the top executive":
                               "Direct reporting line to the top executive where the Accountable Manager and the top executive are different people"}},
    ("AS9110C", "5.1.1(b)"): {Q: "What quality policy and quality objectives do you hold, and how do they fit your organization's context and strategy?"},
    ("AS9110C", "5.1.1(f)"): {Q: "How does top management explain why effective quality management and conformity to QMS requirements matter to the people doing the work?"},
    ("AS9110C", "7.5.3.1(a)"): {Q: "Can the people who need this controlled document reach a current copy, and is it usable where the work happens? Show the point of use."},
    ("AS9110C", "7.5.3.1(b)"): {Q: "How do you guard this document against unauthorised disclosure, misuse or corruption?"},
    ("AS9110C", "8.1(d)"): {Q: "How do you run each maintenance process against the criteria you set? Show it for one maintenance process."},
    ("AS9110C", "8.1(g)"): {Q: "What process and resources sustain the products and services you maintain?"},
    ("AS9110C", "8.1(j)"): {Q: "How do you manage the maintenance tasks that the customer or the type certificate holder has flagged as critical? Show one critical task and its planning and change control."},
    ("AS9110C", "8.1.6(e)"): {Q: "If a part came off an aircraft that was involved in an accident or incident, was it processed under a specific work order covering the inspections and repairs needed for airworthiness?",
                              E: {"Technical data source acceptable to the competent authority and the customer":
                                  "Technical data source that both the competent authority and the customer approve"}},
    ("AS9110C", "8.2.2(d)"): {Q: "What operational risks have you identified, for example pressure on delivery dates or resource shortfalls?"},
    ("AS9110C", "8.5.1(n)"): {Q: "For one job, how do you show the work matches the applicable reference standards, quality plans, type certificate holder recommendations, customer specifications and documented procedures?"},
    ("AS9110C", "8.5.1(p)"): {Q: "How do you show that work on one item cannot harm the airworthiness of parts outside the scope of the work order?"},
    ("AS9110C", "9.3.2(h)"): {Q: "At the last management review, was the training programme assessed for whether it is adequate, completed and effective?"},
    ("AS9110C", "9.3.2(i)"): {Q: "At the last management review, were upcoming changes in what the competent authority and customers will require, and their effect on the organization, discussed?"},
}


def _files():
    return sorted(p for p in CHECKLISTS.rglob("*.json") if "__pycache__" not in p.parts)


def apply():
    log = []
    for path in _files():
        data = json.loads(path.read_text(encoding="utf-8"))
        std = data.get("standard")
        rows = data.get("rows") if isinstance(data.get("rows"), list) else data.get("items")
        if not isinstance(rows, list):
            continue
        changed = False
        for row in rows:
            fix = FIXES.get((std, row.get("ref")))
            if not fix:
                continue
            for field, new in fix.items():
                if field == Q:
                    if row.get(Q) != new:
                        log.append({"file": str(path.relative_to(ROOT)), "standard": std, "ref": row["ref"],
                                    "field": Q, "old": row.get(Q), "new": new})
                        row[Q] = new
                        changed = True
                elif field == E:
                    ev = row.get(E) or []
                    for old, repl in new.items():
                        if old in ev:
                            log.append({"file": str(path.relative_to(ROOT)), "standard": std, "ref": row["ref"],
                                        "field": E, "old": old, "new": repl})
                            ev[ev.index(old)] = repl
                            changed = True
                    row[E] = ev
        if changed:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    LOG.write_text(json.dumps({"changes": log}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    return log


if __name__ == "__main__":
    changes = apply()
    print(f"{len(changes)} field changes written; log: {LOG.relative_to(ROOT)}")
