"""Generate prototype/data/gate-status.json from the engine, and a synthetic sample snapshot.

The prototype is a static page, so the engine's lock-gate decision is written to a file it can read.
Everything here is labelled DRAFT DEMONSTRATION. It is not an approval of any source or checklist.

Run from the product root:  python -I content/build_prototype_status.py
"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import pa_engine as pa  # noqa: E402
import pa_qm as qm  # noqa: E402
import pa_canonical as pc  # noqa: E402

TODAY = date(2026, 10, 8)
universe = json.loads((ROOT / "content" / "audit-rule" / "clause-universe.json").read_text(encoding="utf-8"))["rows"]
valid = {std: {r["clause_ref"] for r in universe if r["standard"] == std} for std in ("AS9100D", "AS9110C")}
valid_all = set().union(*valid.values())
registry = pa.load_registry()["sources"]

# Demonstration audit: no quality manual yet, sources as recorded (not approved)
audit = {"id": "DEMO-AUDIT (synthetic)", "sources": ["AS9110C"], "manual": None, "exclusions": []}
allowed, reasons = qm.audit_lock_gate(audit, registry, valid, TODAY)

status = {
    "label": "DRAFT DEMONSTRATION - NOT AN APPROVAL",
    "generated_on": TODAY.isoformat(),
    "reconciliation": {std: {"structure_reconciled": pc.reconciliation_gate(std)[0], "reasons": pc.reconciliation_gate(std)[1]}
                       for std in ("AS9100D", "AS9110C")},
    "canonical_rows": {std: len([r for r in json.loads((ROOT / "content" / "checklists" / f"{std}.json").read_text(encoding="utf-8"))["items"] if "(" not in r["ref"]]) for std in ("AS9100D", "AS9110C")},
    "lettered_rows": {std: json.loads((ROOT / "content" / "checklists" / f"{std}.json").read_text(encoding="utf-8")).get("lettered_rows_added", 0) for std in ("AS9100D", "AS9110C")},
    "demo_audit": audit["id"],
    "lock_allowed": allowed,
    "lock_reasons": reasons,
}
out = ROOT / "prototype" / "data"
out.mkdir(parents=True, exist_ok=True)
(out / "gate-status.json").write_text(json.dumps(status, ensure_ascii=False, indent=1), encoding="utf-8")

# Synthetic sample snapshot for the Mike handoff (clauses selected, licensed source hash recorded)
snap_dir = ROOT / "exports" / "SAMPLE-SYNTHETIC-snapshot"
snap_name = snap_dir / "SYNTHETIC-DEMO-001-AS9110C-v1.json"
if snap_name.exists():
    print("gate-status written; lock allowed:", allowed, "| snapshot already exists (immutable):", snap_name.name)
else:
    rec = pc.build_audit_snapshot("SYNTHETIC-DEMO-001", "AS9110C", ["8.5.1", "8.7.1", "10.2.1"], snap_dir, 1)
    print("gate-status written; lock allowed:", allowed, "| snapshot:", rec["path"])
