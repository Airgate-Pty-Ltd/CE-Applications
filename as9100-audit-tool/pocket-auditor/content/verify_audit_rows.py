"""Verify the clause 4-10 audit universe against the audit rule.

Checks:
  1. Every clause heading in the licensed table of contents for clauses 4-10 is in the universe.
  2. Every universe row is audit_required = True. No row can default to N/A.
  3. Every row states that N/A needs a quality-manual exception.
  4. Counts of rows still needing authored intent are reported (not a pass/fail).

Exit code 1 if checks 1-3 fail.
Run from the product root:  python -I content/verify_audit_rows.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
universe = json.loads((ROOT / "audit-rule" / "clause-universe.json").read_text(encoding="utf-8"))
register = json.loads((ROOT / "AS-licensed-clause-register.json").read_text(encoding="utf-8"))
rule = json.loads((ROOT / "audit-rule" / "rule.json").read_text(encoding="utf-8"))

failures = []
by_std = {}
for row in universe["rows"]:
    by_std.setdefault(row["standard"], set()).add(row["clause_ref"])
    if row["audit_required"] is not True:
        failures.append(f"{row['standard']} {row['clause_ref']}: audit_required is not True")
    if "quality manual" not in row["na_allowed"]:
        failures.append(f"{row['standard']} {row['clause_ref']}: N/A rule missing")

for code, src in register["sources"].items():
    toc_scope = {c["clause_ref"] for c in src["clauses"]
                 if c["clause_ref"].split(".")[0].isdigit() and 4 <= int(c["clause_ref"].split(".")[0]) <= 10
                 and c["heading"]}
    missing = sorted(toc_scope - by_std.get(code, set()),
                     key=lambda r: [int(x) for x in r.split(".")])
    if missing:
        failures.append(f"{code}: headed clauses 4-10 missing from universe: {missing}")

print(f"Rule {rule['rule_id']}: {rule['statement']}")
for code in rule["standards"]:
    n = len(by_std.get(code, set()))
    print(f"  {code}: {n} clauses in scope (4-10, subclauses included)")
seed_verify = sum(1 for r in universe["rows"] if r["intent_state"].startswith("SEED"))
author = sum(1 for r in universe["rows"] if r["intent_state"].startswith("AUTHOR"))
print(f"  Seed text to verify against the standard: {seed_verify}")
print(f"  Intent still to author: {author}")

if failures:
    print("\nFAILURES:")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("\nAll structural checks pass. Intent authoring is not complete (see counts above).")
