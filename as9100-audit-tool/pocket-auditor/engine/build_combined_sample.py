"""Synthetic combined-source sample: one audit that selects from FAA QSA, AS9100D, AS9110C and a customer checklist.

Runs the whole data flow through the real modules:
  customer checklist import -> multi-source selection -> write-once publication (ledger) -> Start Audit ->
  assessments and findings on criteria from each source -> snapshot -> report -> Mike export (owner and external).

The audit data is SYNTHETIC. The FAA and AS criteria are the real rows (Burrana-private and licensed); the customer
checklist is a synthetic example. Owner package carries the sources; external package withholds licensed and
customer-private content, and lists what was withheld.

Write-once: refuses to run if the output folder exists. Run from the product folder:
  python -I engine/build_combined_sample.py
"""
import json
import sys
import tempfile
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pa_selection as ps  # noqa: E402
import pa_qsa as qsa  # noqa: E402
import pa_qsa_records as qr  # noqa: E402
import pa_ledger as lg  # noqa: E402
import pa_audit_record as ar  # noqa: E402
import pa_report as pr  # noqa: E402
import pa_export as pe  # noqa: E402
import pa_mike_export as mx  # noqa: E402
from pa_engine import load_registry  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports" / "SAMPLE-COMBINED-PACKAGE"
CUSTOMER_ID = "SYNTHETIC-CUSTOMER-01"
AUDIT = "SYNTHETIC-COMBINED-001"
TODAY = date(2026, 10, 8)
WHEN = "2026-10-08T14:00:00"
SYNTHETIC_CSV = """ref,question,evidence
SYN-1,SYNTHETIC: Is the customer-specified tooling tag scheme applied at each bench?,Tooling tag log;Bench photo
SYN-2,SYNTHETIC: How is the customer's first-article approval recorded before series release?,First-article report;Customer approval record
"""


def _pick(sheet, skip_descriptions=True):
    checklist = qsa.load_checklist()
    return next(c["criterion_id"] for c in checklist["criteria"]
                if c["source_sheet"] == sheet and (not skip_descriptions or c["criteria_ref"] not in ("1", "2")))


def build(out_dir, customers_dir=None, audits_root=None):
    """Build the combined sample. Returns the output folder. Tests pass scratch folders."""
    out_dir = Path(out_dir)
    if out_dir.exists():
        raise SystemExit(f"{out_dir.name} already exists. This sample is write-once; remove it by hand to regenerate.")
    customers_dir = Path(customers_dir) if customers_dir else ROOT / "content" / "customers"
    audits = Path(audits_root) if audits_root else out_dir / "audit-record"
    ps.CUSTOMERS = customers_dir
    checklist = qsa.load_checklist()

    # 1. customer checklist ingestion (synthetic CSV, written next to the sample)
    csv_path = out_dir / "input" / "synthetic-customer-checklist.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.write_text(SYNTHETIC_CSV, encoding="utf-8", newline="\n")
    ps.import_customer_checklist(CUSTOMER_ID, csv_path, owner="SYNTHETIC Customer Ltd",
                                 source_citation="SYNTHETIC customer checklist for the sample", now=WHEN)
    cust = ps.customer_criteria(CUSTOMER_ID)

    # 2. multi-source selection: FAA + AS9100D + AS9110C + customer
    org, mp = _pick("Organizational Management"), _pick("Manufacturing Processes")
    std_9100 = "STD:SAE AS9100D:8.5.1"
    std_9110 = "STD:SAE AS9110C:8.5.1"
    draft = {"selected": sorted([org, mp, std_9100, std_9110, cust[0]["criterion_id"]]), "additions": []}
    qsa.write_draft(audits, AUDIT, draft)
    pub = ps.publish(audits, AUDIT, now=WHEN)

    # 3. capture and assessments on criteria from each source
    ev = lg.append(audits, AUDIT, "evidence", {"evidence_type": "record_review", "description": "SYNTHETIC certificate copy",
                   "timestamp": "2026-10-08T09:30", "location": "SYNTHETIC office", "auditor": "SYNTHETIC Auditor B",
                   "source_ref": "SYN-CERT-001"}, now=WHEN)["id"]
    doc = lg.append(audits, AUDIT, "evidence", {"evidence_type": "document_review", "description": "SYNTHETIC procedure revision",
                    "timestamp": "2026-10-08T09:40", "location": "SYNTHETIC system", "auditor": "SYNTHETIC Auditor B",
                    "source_ref": "SYN-PROC-1"}, now=WHEN)["id"]
    car = lg.append(audits, AUDIT, "car", {"car_id": "CAR-SYN-201", "source_system": "SYNTHETIC QMS",
                    "linked_requirement": std_9110, "problem_statement": "SYNTHETIC: tag not applied at bench 2",
                    "owner": "SYNTHETIC lead", "due_date": "2026-12-01", "status": "open"}, now=WHEN)["id"]
    for crit, result, evid in ((org, "NONCONFORMING", [ev]), (std_9110, "NONCONFORMING", [doc]),
                               (std_9100, "CONFORMING", [doc]), (cust[0]["criterion_id"], "CONFORMING", [ev])):
        qr.record_assessment(audits, AUDIT, checklist, {"criterion_id": crit, "applicability": "APPLICABLE",
                             "assessment": result, "assessor": "SYNTHETIC Auditor B", "assessed_at": WHEN,
                             "evidence_ids": evid}, now=WHEN)
    fid = qr.record_finding(audits, AUDIT, checklist, {"criterion_id": std_9110,
                            "statement": "SYNTHETIC: tooling tag not applied at bench 2.",
                            "proposed_by": "SYNTHETIC Auditor B", "proposed_classification": "MINOR_NC",
                            "car_id": car, "evidence_ids": [ev, doc]}, now=WHEN)["id"]
    qr.classify_finding(audits, AUDIT, checklist, fid, "MINOR_NC", "SYNTHETIC Lead L", "LEAD_AUDITOR", WHEN)

    # 4. snapshot (clause rows of AS9110C 8.5.1 plus the published selection), report, packages
    snapdir = out_dir / "audit-record" / "snapshots"
    result = ar.build_linked_snapshot(AUDIT, "AS9110C", ["8.5.1"], None, [], snapdir, 1, TODAY, audits_root=audits)
    if not result["ready_for_export"]:
        raise SystemExit("snapshot not ready: " + "; ".join(result["blocking_issues"]))
    snap = json.loads(Path(snapdir / f"{AUDIT}-AS9110C-v1-CAR.json").read_text(encoding="utf-8"))
    report = pr.build_report(snap, result["sha256"], [], pr.evidence_register(snap), [], "Burrana Inc.", WHEN)
    registry = load_registry()["sources"]
    for name, recipient in (("owner", "Burrana Inc."), ("external", "External Recipient (sample)")):
        pkg = mx.build_audit_package(snap, report, audits, AUDIT, checklist, recipient,
                                     f"SAMPLE-COMBINED-{name.upper()}-001", "2026-10-08T14:30:00", registry=registry)
        pe.write_export(pkg, out_dir / name, out_dir / name)
    (out_dir / "README.md").write_text(README.format(publication=pub["version"], sources=len(pub["sources"]),
                                                     criteria=pub["selected_count"]), encoding="utf-8", newline="\n")
    return out_dir


README = """# Synthetic combined-source sample

SYNTHETIC audit data. The criteria are real rows: FAA QSA 1.0 (Burrana-private), AS9100D and AS9110C (licensed, Burrana Inc.).
The customer checklist is a synthetic example ({criteria} criteria selected across {sources} sources; publication version {publication}).

- `owner/`: recipient Burrana Inc. Includes the sources and the QSA section.
- `external/`: any other recipient. The QSA section, licensed standard rows and customer-private rows are withheld.
  `sources_withheld_for_licence` lists what was withheld.
- `audit-record/`: the ledger, publication and snapshot the packages were built from.
- `input/`: the synthetic customer checklist CSV used for ingestion.

Verify a package: `pe.verify_export(folder)` must return `(True, None)`.
"""


if __name__ == "__main__":
    print(f"sample written to {build(OUT).relative_to(ROOT)}")
