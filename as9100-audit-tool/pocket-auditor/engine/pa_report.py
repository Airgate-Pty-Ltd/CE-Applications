"""Audit report package built from one snapshot. Data first; formatting comes later.

- check_assessment: an assessment needs a row in the snapshot and evidence. A not-applicable
  assessment uses the same validator as the quality-manual N/A (pa_engine.validate_na).
- build_report: refuses (raises ValueError with every problem) unless the snapshot is ready for export,
  every finding passes pa_findings.check_finding, and every assessment is valid. It never writes
  APPROVED: the package status is fixed at draft.
- write_report: write-once, through pa_engine.write_snapshot, with the SHA-256 of the bytes on disk.

Group headings have no body text and are not assessed on their own, so they are not listed as not assessed.
Standalone; writes only the report file in the directory the caller gives.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pa_engine import validate_na, write_snapshot  # noqa: E402
import pa_findings as pf  # noqa: E402
import pa_audit_record as ar  # noqa: E402
from pa_qsa_rules import EVIDENCE_CONTRACT_TYPE as CONTRACT_EVIDENCE  # noqa: E402

ASSESSMENT_RESULTS = {"CONFORMING", "NONCONFORMING", "NOT_APPLICABLE"}
DRAFT_STATUS = "DRAFT - NOT APPROVED FOR AUDIT USE"
DRAFT_REASON = "Checklist wording awaits line-by-line reviewer approval. No source is approved."


def check_assessment(a, snapshot_refs, evidence_by_id):
    errors = []
    ref = a.get("ref")
    if a.get("result") not in ASSESSMENT_RESULTS:
        errors.append("unknown result")
    if ref not in snapshot_refs:
        errors.append(f"ref {ref} is not a row in this snapshot")
    if a.get("result") == "NOT_APPLICABLE":
        errors += validate_na(a, snapshot_refs)
    else:
        ids = a.get("evidence_ids") or []
        if not ids:
            errors.append("assessment needs evidence")
        for eid in ids:
            if eid not in evidence_by_id:
                errors.append(f"evidence {eid} is not in the evidence register")
    return errors


def evidence_register(snapshot):
    """Evidence that findings and assessments may cite: evidence, photo and interview records in the snapshot."""
    out = []
    for e in snapshot.get("capture_records", []):
        t, r = e["record_type"], e["record"]
        if t == "evidence":
            out.append({"id": e["id"], "evidence_type": r["evidence_type"]})
        elif t == "photo":
            out.append({"id": e["id"], "evidence_type": "photo_file"})
        elif t == "interview":
            out.append({"id": e["id"], "evidence_type": "interview"})
    return out


def build_report(snapshot, snapshot_sha256, findings, evidence_register, assessments, recipient_org, generated_at):
    problems = []
    if not snapshot.get("ready_for_export"):
        problems += [f"snapshot: {b}" for b in snapshot.get("blocking_issues") or ["snapshot not ready for export"]]
    refs = {r["ref"] for r in snapshot["rows"]}
    ev_by_id = {e["id"]: e for e in evidence_register}
    for f in findings:
        problems += [f"finding {f.get('id')}: {e}" for e in pf.check_finding(f, snapshot, evidence_register, snapshot_sha256)]
    seen = set()
    for a in assessments:
        if a.get("ref") in seen:
            problems.append(f"assessment {a.get('ref')}: duplicate assessment for this row")
        seen.add(a.get("ref"))
        problems += [f"assessment {a.get('ref')}: {e}" for e in check_assessment(a, refs, ev_by_id)]
    if problems:
        raise ValueError("report refused: " + "; ".join(problems))

    assessed = {a["ref"] for a in assessments}
    not_assessed = [{"ref": r["ref"], "reason": "no assessment recorded"}
                    for r in snapshot["rows"] if r["ref"] not in assessed and r.get("type") != "group"]
    return {
        "report_type": "pocket_auditor_audit_report",
        "report_version": "1.0",
        "package_status": DRAFT_STATUS,
        "status_reason": DRAFT_REASON,
        "audit_id": snapshot["audit_id"],
        "organization": recipient_org,
        "generated_at": generated_at,
        "snapshot": {
            "standard": snapshot["standard"],
            "snapshot_version": snapshot["snapshot_version"],
            "sha256": snapshot_sha256,
            "licensed_source_sha256": snapshot["licensed_source_sha256"],
            "reconciliation_status": snapshot["reconciliation_status"],
            "as_of_date": snapshot["as_of_date"],
        },
        "scope": {"clauses_selected": snapshot["clauses_selected"]},
        "car_review": [{k: c.get(k) for k in ("car_id", "linked_requirement", "status", "state", "auditor_result",
                                              "flags", "sampling_expansion_recommended", "owner", "due_date")}
                       for c in snapshot.get("car_records", [])],
        "findings": [{k: f.get(k) for k in ("id", "checklist_item_ref", "requirement_ids", "statement",
                                            "proposed_classification", "lead_classification", "lead_classified_by",
                                            "lead_classified_at", "evidence_ids", "car_id", "status")}
                     for f in findings],
        "assessments": [dict(a) for a in assessments],
        "evidence_index": [{"id": e["id"], "evidence_type": e["evidence_type"]} for e in evidence_register],
        "capture_ledger": {"head": snapshot.get("capture_ledger_head"), "length": snapshot.get("capture_ledger_length", 0)},
        "capture_index": [{"id": e["id"], "record_type": e["record_type"], "record_sha256": e["record_sha256"],
                           "entry_sha256": e["entry_sha256"]} for e in snapshot.get("capture_records", [])],
        "not_assessed": not_assessed,
        "counts": {
            "snapshot_rows": len(snapshot["rows"]),
            "assessed": len(assessed),
            "not_assessed": len(not_assessed),
            "findings": len(findings),
            "car_records": len(snapshot.get("car_records", [])),
        },
    }


def write_report(report, out_dir, name):
    """Write-once. Returns {'path', 'sha256'} with the hash of the bytes on disk."""
    return write_snapshot(report, out_dir, name)


def export_audit(snapshot, report, standard_label_text=None):
    """Audit payload for pa_export.build_package. Carries IDs and hashes; no licensed source text.

    Checklist items carry the reference, requirement ID, heading and locator only.
    """
    label = standard_label_text or ar.standard_label(snapshot["standard"])
    cars_by_id = {c["car_id"]: c for c in snapshot.get("car_records", [])}
    out = {"evidence": [], "interviews": [], "sampling": [], "prior_car_reviews": []}
    for e in snapshot.get("capture_records", []):
        base = {"id": e["id"], "record_sha256": e["record_sha256"], "entry_sha256": e["entry_sha256"]}
        r, t = e["record"], e["record_type"]
        if t == "evidence":
            out["evidence"].append(dict(base, evidence_type=CONTRACT_EVIDENCE.get(r["evidence_type"], r["evidence_type"]),
                                        timestamp=r["timestamp"], auditor=r["auditor"], source_ref=r["source_ref"]))
        elif t == "photo":
            out["evidence"].append(dict(base, evidence_type="photo_file", timestamp=r["timestamp"], auditor=r["auditor"],
                                        file_name=r["file_name"], file_sha256=r["sha256"],
                                        requirement_id=r["requirement_id"]))
        elif t == "interview":
            out["interviews"].append(dict(base, interviewer=r["interviewer"], date_time=r["date_time"],
                                          consent_state=r["consent_state"], evidence_class=r["evidence_class"]))
        elif t == "sampling":
            out["sampling"].append(dict(base, sample_identity=r["sample_identity"], period=r["period"],
                                        result=r["result"], expanded=r.get("expanded"),
                                        evidence_refs=r.get("evidence_refs", [])))
        elif t == "car":
            c = cars_by_id.get(r["car_id"], {})
            out["prior_car_reviews"].append(dict(base, car_id=r["car_id"], state=c.get("state"), status=r["status"],
                                                 auditor_result=r.get("auditor_result"),
                                                 linked_requirement=r["linked_requirement"]))
    checklist = [{"ref": row["ref"], "requirement_id": f"STD:{label}:{row['ref']}",
                  "title": row.get("title"), "locator": row.get("locator")}
                 for row in snapshot["rows"] if row.get("type") != "group"]
    return {
        "id": snapshot["audit_id"],
        "type": "Pocket Auditor draft",
        "snapshot": {
            "sha256": report["snapshot"]["sha256"],
            "standard": snapshot["standard"],
            "snapshot_version": snapshot["snapshot_version"],
            "licensed_source_sha256": snapshot["licensed_source_sha256"],
            "reconciliation_status": snapshot["reconciliation_status"],
            "capture_ledger_head": snapshot.get("capture_ledger_head"),
            "capture_ledger_length": snapshot.get("capture_ledger_length", 0),
        },
        "checklist_items": checklist,
        "assessments": report["assessments"],
        "evidence": out["evidence"],
        "interviews": out["interviews"],
        "sampling": out["sampling"],
        "prior_car_reviews": out["prior_car_reviews"],
        "findings": report["findings"],
        "not_assessed": report["not_assessed"],
        "unresolved_items": snapshot.get("blocking_issues", []),
    }
