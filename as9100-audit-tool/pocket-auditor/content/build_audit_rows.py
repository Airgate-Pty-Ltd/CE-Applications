"""Build the audit clause universe (clauses 4 to 10) for AS9100D and AS9110C.

Rule (owner, 2026-10-08): every clause and subclause from Clause 4 to Clause 10 is audited.
No exceptions, except exceptions listed in the organization's quality manual. N/A may be
applied only on the basis of such a listed exception.

Inputs:
  content/AS-licensed-clause-register.json   clause refs and headings from the licensed copies
  content/library-seed.json                  PROPOSED seed rows (Conform-Edge paraphrase)

Outputs:
  content/audit-rule/clause-universe.json    one row per clause 4-10 per standard
  content/audit-rule/rule.json               the rule as data, read by verify_audit_rows.py

Clause text from the standard is not written to any output. Headings are kept as
clause references (R-2).
Run from the product root:  python -I content/build_audit_rows.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "audit-rule"
OUT.mkdir(exist_ok=True)


def in_scope(ref):
    head = ref.split(".")[0]
    return head.isdigit() and 4 <= int(head) <= 10


register = json.loads((ROOT / "AS-licensed-clause-register.json").read_text(encoding="utf-8"))
seed = json.loads((ROOT / "library-seed.json").read_text(encoding="utf-8"))["requirements"]
seed_by = {(r["standard_code"], r["clause_ref"]): r for r in seed}

universe = []
counts = {}
for code, src in register["sources"].items():
    rows = []
    for c in src["clauses"]:
        ref = c["clause_ref"]
        if not in_scope(ref):
            continue
        heading = c["heading"]
        status = c["status"]
        sd = seed_by.get((code, ref))
        if sd is None:
            basis, intent_state = "NO SEED ROW", "AUTHOR"
        elif heading and heading.lower()[:20] == sd["title"].lower()[:20]:
            basis, intent_state = "SEED MATCHES STANDARD HEADING", "SEED TEXT - VERIFY"
        elif heading is None:
            basis, intent_state = "NUMBERED REQUIREMENT, NO HEADING; SEED ROW PRESENT", "SEED TEXT - VERIFY"
        else:
            basis, intent_state = "SEED TITLE DIFFERS FROM STANDARD HEADING", "AUTHOR (title corrected)"
        rows.append({
            "standard": code,
            "clause_ref": ref,
            "heading_in_standard": heading,
            "basis": basis,
            "intent_state": intent_state,
            "seed_intent": sd["intent"] if sd else None,
            "seed_expected_evidence": sd["expected_evidence"] if sd else None,
            "audit_required": True,
            "na_allowed": "ONLY IF listed as an exception in the organization's quality manual",
        })
    rows.sort(key=lambda r: [int(x) for x in r["clause_ref"].split(".")])
    universe.extend(rows)
    counts[code] = {
        "clauses_4_to_10": len(rows),
        "seed_text_to_verify": sum(1 for r in rows if r["intent_state"].startswith("SEED")),
        "author_required": sum(1 for r in rows if r["intent_state"].startswith("AUTHOR")),
    }

(OUT / "clause-universe.json").write_text(json.dumps({"rows": universe, "counts": counts},
                                                    ensure_ascii=False, indent=1), encoding="utf-8")
rule = {
    "rule_id": "AUDIT-RULE-4-10",
    "statement": "Every clause and subclause of the standard from Clause 4 to Clause 10 is audited. No exceptions, except exceptions listed in the organization's quality manual.",
    "na_rule": "N/A may be applied to a clause only when the organization's quality manual lists that exception; the listed exception is recorded with the item.",
    "owner": "Brian R. Olea",
    "approved": False,
    "standards": ["AS9100D", "AS9110C"],
    "scope_clauses": "4 to 10 inclusive (subclauses included)",
}
(OUT / "rule.json").write_text(json.dumps(rule, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(counts, indent=1))
