"""Vertical demo: synthetic quality manual -> proposed exclusions -> review -> audit-lock decision.

Uses SYNTHETIC manuals only. The 'approved source' used to show an allowed lock is an in-memory
DEMO copy of the registry. It is NOT an approval of any source and is not written to disk.

Run from the product root:  python -I tests/demo_qm_vertical.py
"""
import copy
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_engine as pa  # noqa: E402
import pa_qm as qm  # noqa: E402

FIX = ROOT / "tests" / "fixtures"
TODAY = date(2026, 10, 8)
UNIVERSE = json.loads((ROOT / "content" / "audit-rule" / "clause-universe.json").read_text(encoding="utf-8"))["rows"]
VALID = {"AS9110C": {r["clause_ref"] for r in UNIVERSE if r["standard"] == "AS9110C"}}
VALID_ALL = set().union(*VALID.values())


def show(title, obj):
    print(f"\n== {title}")
    print(json.dumps(obj, indent=1, ensure_ascii=False))


registry = pa.load_registry()["sources"]
audit = {"id": "DEMO-AUDIT-001 (synthetic)", "sources": ["AS9110C"], "manual": None, "exclusions": []}

# 1. import the synthetic manual v1
m1 = qm.import_manual(FIX / "SYNTHETIC-quality-manual-v1.txt", "Synthetic QM Author", "SYNTHETIC_FIXTURE", "2026-10-08T09:00:00")
show("1. manual imported", m1)
audit["manual"] = m1

# 2. extract proposed exclusions; invalid references stay visible
props, errs = qm.extract_exclusions((FIX / "SYNTHETIC-quality-manual-v1.txt").read_text(encoding="utf-8"), VALID_ALL, m1)
show("2. proposed exclusions (system extraction)", {"proposals": props, "errors": errs})
audit["exclusions"] = props

# 3. reviewer decisions: accept PX-001, amend PX-003 (reason wording only). PX-002 is invalid_ref.
qm.review_exclusion(props[0], "accept", "Reviewer A", "2026-10-08T09:30:00")
qm.review_exclusion(props[2], "amend", "Reviewer A", "2026-10-08T09:35:00",
                    amended={"reason": "No special processes are outsourced at this site (amended wording)."},
                    note="Wording aligned to the synthetic manual section.")
show("3. after reviewer decisions", audit["exclusions"])

# 4. manual review cannot complete while PX-002 (invalid reference) is open
try:
    qm.complete_manual_review(m1, props, "Reviewer A", "2026-10-08T09:40:00")
    print("\n== 4. manual review completed (unexpected)")
except ValueError as e:
    print(f"\n== 4. manual review refused: {e}")

# 5. audit-lock gate with the v1 manual and an unapproved source
ok, reasons = qm.audit_lock_gate(audit, registry, VALID, TODAY)
show("5. audit-lock decision (v1 manual, source AS9110C as recorded)", {"allowed": ok, "reasons": reasons})

# 6. the user imports corrected manual v2; re-extract, re-review, complete the manual review
m2 = qm.import_manual(FIX / "SYNTHETIC-quality-manual-v2.txt", "Synthetic QM Author", "SYNTHETIC_FIXTURE", "2026-10-08T10:00:00")
props2, errs2 = qm.extract_exclusions((FIX / "SYNTHETIC-quality-manual-v2.txt").read_text(encoding="utf-8"), VALID_ALL, m2)
qm.review_exclusion(props2[0], "accept", "Reviewer A", "2026-10-08T10:10:00")
qm.review_exclusion(props2[1], "accept", "Reviewer A", "2026-10-08T10:12:00")
qm.complete_manual_review(m2, props2, "Reviewer A", "2026-10-08T10:15:00")
audit.update({"manual": m2, "exclusions": props2})
show("6. manual v2 reviewed", {"manual_status": m2["status"], "reviewed_by": m2["reviewed_by"], "errors": errs2})

ok, reasons = qm.audit_lock_gate(audit, registry, VALID, TODAY)
show("6b. audit-lock decision (v2 manual reviewed; source still not approved)", {"allowed": ok, "reasons": reasons})

# 7. DEMO ONLY: in-memory copy where AS9110C is treated as approved and reviewed. Not saved.
demo_reg = copy.deepcopy(registry)
demo_reg["AS9110C"].update({"status": "approved", "next_review_due": "2027-10-08"})
ok, reasons = qm.audit_lock_gate(audit, demo_reg, VALID, TODAY)
show("7. audit-lock decision (DEMO copy: AS9110C treated as approved; not an approval)", {"allowed": ok, "reasons": reasons})

# 8. approved exclusions re-validated against the universe
approved, aerr = qm.approved_exclusions(audit["exclusions"], VALID_ALL, m2)
show("8. approved exclusion records (N/A basis)", {"records": approved, "errors": aerr})
