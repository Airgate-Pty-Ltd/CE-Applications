"""Generate the sample FAA QSA package through the real pipeline.

The criteria are the real FAA QSA rows (content/faa-qsa, Burrana-private). The audit records are SYNTHETIC: the
audit ID, evidence, CAR, interview, photo, sampling and findings are invented for the sample. The output shows
what Mike's import receives in two cases:
  burrana/   recipient Burrana Inc. (the owner): includes the QSA section and the FAA source entry.
  external/  any other recipient: no QSA section; the FAA source is listed in sources_withheld_for_licence.

Write-once: refuses to run if exports/SAMPLE-FAA-QSA-PACKAGE already exists. Remove it by hand to regenerate.
Run from the product folder:  python -I engine/build_qsa_sample.py
Writes only under exports/SAMPLE-FAA-QSA-PACKAGE/.
"""
import hashlib
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pa_qsa as qsa  # noqa: E402
import pa_qsa_records as qr  # noqa: E402
import pa_ledger as lg  # noqa: E402
import pa_audit_record as ar  # noqa: E402
import pa_report as pr  # noqa: E402
import pa_export as pe  # noqa: E402
import pa_mike_export as mx  # noqa: E402
from pa_engine import load_registry  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports" / "SAMPLE-FAA-QSA-PACKAGE"
AUDIT = "SYNTHETIC-QSA-001"
TODAY = date(2026, 10, 8)
EXTERNAL = "External Recipient (sample)"


def pick(sheet, skip_descriptions=True):
    checklist = qsa.load_checklist()
    return next(c["criterion_id"] for c in checklist["criteria"]
                if c["source_sheet"] == sheet and (not skip_descriptions or c["criteria_ref"] not in ("1", "2")))


def build():
    if OUT.exists():
        raise SystemExit(f"{OUT.name} already exists. This sample is write-once; remove it by hand to regenerate.")
    checklist = qsa.load_checklist()
    audits = OUT / "audit-record"
    snapdir = audits / "snapshots"
    t = "2026-10-08T"
    org = pick("Organizational Management")
    mp = pick("Manufacturing Processes")
    sc = pick("Supplier Control")

    # 1. Selection across three elements plus one auditor addition
    draft = {"selected": [], "additions": []}
    draft = qsa.add_additional(draft, "ADD-0001", "SYNTHETIC: is the bench calibration label current?",
                               "SYNTHETIC source citation for the sample", t + "09:00:00")
    draft["selected"] = sorted([org, mp, sc, draft["additions"][0]["criterion_id"]])
    qsa.write_draft(audits, AUDIT, draft)
    qsa.publish(audits, AUDIT, checklist, now=t + "09:05:00")

    # 2. Capture records (synthetic)
    rec_ev = lg.append(audits, AUDIT, "evidence", {
        "evidence_type": "record_review", "description": "SYNTHETIC: certificate copy on file",
        "timestamp": t + "09:10", "location": "SYNTHETIC quality office", "auditor": "SYNTHETIC Auditor B",
        "source_ref": "SYN-CERT-2026-001"}, now=t + "09:11:00")["id"]
    doc_ev = lg.append(audits, AUDIT, "evidence", {
        "evidence_type": "document_review", "description": "SYNTHETIC: controlled procedure revision",
        "timestamp": t + "09:12", "location": "SYNTHETIC document system", "auditor": "SYNTHETIC Auditor B",
        "source_ref": "SYN-PROC-07-R3"}, now=t + "09:13:00")["id"]
    iv = lg.append(audits, AUDIT, "interview", {
        "interviewee_role": "SYNTHETIC technician", "interviewer": "SYNTHETIC Auditor B",
        "date_time": t + "10:00", "location": "SYNTHETIC Bay 2", "method": "in person",
        "consent_state": "NOTIFIED", "notes": "SYNTHETIC notes", "evidence_class": "direct_statement"},
        now=t + "10:01:00")["id"]
    photo = lg.append(audits, AUDIT, "photo", {
        "caption": "SYNTHETIC: bench tooling tag", "what_it_proves": "SYNTHETIC: tool is tagged",
        "area_or_location": "SYNTHETIC Bay 2", "auditor": "SYNTHETIC Auditor B", "timestamp": t + "11:00",
        "requirement_id": mp, "file_name": "SYNTHETIC-bench.jpg",
        "sha256": hashlib.sha256(b"SYNTHETIC photo bytes, not stored").hexdigest()}, now=t + "11:01:00")["id"]
    car = lg.append(audits, AUDIT, "car", {
        "car_id": "CAR-SYN-101", "source_system": "SYNTHETIC QMS export", "linked_requirement": org,
        "problem_statement": "SYNTHETIC: certificate not on file at audit", "owner": "SYNTHETIC maintenance lead",
        "due_date": "2026-12-01", "status": "open"}, now=t + "12:00:00")["id"]
    smp = lg.append(audits, AUDIT, "sampling", {
        "population_basis": "SYNTHETIC jobs Q3", "selection_method": "random", "sample_identity": "SYN-J-101",
        "period": "Q3", "result": "NONCONFORMING", "evidence_refs": [rec_ev], "expanded": True},
        now=t + "12:05:00")["id"]

    # 3. Assessments against published criteria
    qr.record_assessment(audits, AUDIT, checklist, {"criterion_id": org, "applicability": "APPLICABLE",
                         "assessment": "NONCONFORMING", "assessor": "SYNTHETIC Auditor B", "assessed_at": t + "12:10:00",
                         "evidence_ids": [rec_ev]}, now=t + "12:10:00")
    qr.record_assessment(audits, AUDIT, checklist, {"criterion_id": mp, "applicability": "APPLICABLE",
                         "assessment": "CONFORMING", "assessor": "SYNTHETIC Auditor B", "assessed_at": t + "12:11:00",
                         "evidence_ids": [photo]}, now=t + "12:11:00")
    addition = draft["additions"][0]["criterion_id"]
    qr.record_assessment(audits, AUDIT, checklist, {"criterion_id": addition, "applicability": "NOT_APPLICABLE",
                         "assessment": "NOT_APPLICABLE", "assessor": "SYNTHETIC Auditor B", "assessed_at": t + "12:12:00",
                         "reason": "SYNTHETIC: no bench calibration in scope", "reviewer": "SYNTHETIC Lead L"},
                         now=t + "12:12:00")

    # 4. Findings: one nonconformity with CAR and record evidence (lead classified), one observation (unclassified)
    f1 = qr.record_finding(audits, AUDIT, checklist, {"criterion_id": org,
                           "statement": "SYNTHETIC: certificate not on file at the time of audit.",
                           "proposed_by": "SYNTHETIC Auditor B", "proposed_classification": "MINOR_NC",
                           "car_id": car, "evidence_ids": [rec_ev, doc_ev]}, now=t + "12:20:00")["id"]
    qr.classify_finding(audits, AUDIT, checklist, f1, "MINOR_NC", "SYNTHETIC Lead L", "LEAD_AUDITOR", t + "12:25:00")
    qr.record_finding(audits, AUDIT, checklist, {"criterion_id": mp,
                      "statement": "SYNTHETIC: tooling tag present; observation on tag legibility.",
                      "proposed_by": "SYNTHETIC Auditor B", "proposed_classification": "OBSERVATION",
                      "evidence_ids": [photo]}, now=t + "12:30:00")

    # 5. Snapshot, report, and the two packages
    result = ar.build_linked_snapshot(AUDIT, "AS9110C", ["8.5.1"], None, [], snapdir, 1, TODAY, audits_root=audits)
    if not result["ready_for_export"]:
        raise SystemExit("snapshot not ready: " + "; ".join(result["blocking_issues"]))
    snap = json.loads((ROOT / result["path"]).read_text(encoding="utf-8"))
    report = pr.build_report(snap, result["sha256"], [], pr.evidence_register(snap), [], "Burrana Inc.", t + "13:00:00")
    registry = load_registry()["sources"]
    for name, recipient in (("burrana", "Burrana Inc."), ("external", EXTERNAL)):
        pkg = mx.build_audit_package(snap, report, audits, AUDIT, checklist, recipient,
                                     f"SAMPLE-{name.upper()}-001", t + "13:05:00", registry=registry)
        pe.write_export(pkg, OUT / name, OUT / name)
    (OUT / "README.md").write_text(README, encoding="utf-8", newline="\n")
    return OUT


README = """# Sample FAA QSA package (SYNTHETIC audit data)

Status: sample for Mike's import contract (v1.0). Not an audit. Nothing here is approved.

- The FAA QSA criteria are real rows from the Burrana-owned workbook (licence scope BURRANA_PRIVATE_SOURCE).
- The audit records are SYNTHETIC: audit ID, evidence, CAR, interview, photo, sampling, assessments and findings are invented.
- `audit-record/` holds the ledger, the publication and the snapshot that the packages were built from.

| Folder | Recipient | QSA section | FAA source |
|---|---|---|---|
| `burrana/` | Burrana Inc. (owner) | included | included |
| `external/` | External Recipient (sample) | not included | listed in `sources_withheld_for_licence` |

Verify a package (must print `(True, None)`):

```bash
python -I -c "import sys; sys.path.insert(0,'engine'); import pa_export as pe; print(pe.verify_export('exports/SAMPLE-FAA-QSA-PACKAGE/burrana'))"
```

Question, procedure, comments and condition text of the FAA criteria are not in either package.
"""


if __name__ == "__main__":
    out = build()
    print(f"sample written to {out.relative_to(ROOT)}")
