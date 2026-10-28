"""Canonical checklist gates, audit snapshot, interview and sampling records.

- reconciliation_gate: approval is blocked while the reconciliation report is BLOCKED or missing
- select_rows / build_audit_snapshot: selected clause rows, with the licensed source hash, written
  as an immutable snapshot (write-once, SHA-256)
- validate_interview / validate_sampling: required fields for the interview and sampling records

Standalone. Writes only where the caller points it.
"""
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pa_engine import write_snapshot  # noqa: E402
from pa_vocab import CONSENT_STATES, SAMPLING_RESULTS, INTERVIEW_CLASSES  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
INTERVIEW_REQUIRED = ["interviewee_role", "interviewer", "date_time", "location", "method",
                      "consent_state", "notes", "evidence_class"]
SAMPLING_REQUIRED = ["population_basis", "selection_method", "sample_identity", "period", "result",
                     "evidence_refs", "expanded"]


def reconciliation_gate(std):
    """Return (approvable, reasons). Blocked when the report is missing, BLOCKED, or has unresolved rows."""
    path = ROOT / "content" / "reconciliation" / f"{std}-reconciliation.json"
    if not path.exists():
        return False, [f"{std}: reconciliation report missing"]
    rep = json.loads(path.read_text(encoding="utf-8"))
    if rep.get("status") != "RECONCILED" or rep.get("unresolved"):
        return False, [f"{std}: reconciliation status {rep.get('status')}, unresolved rows {len(rep.get('unresolved', []))}"]
    return True, []


def select_rows(std, clause_refs):
    """Canonical rows for the selected clause references, including their lettered rows."""
    data = json.loads((ROOT / "content" / "checklists" / f"{std}.json").read_text(encoding="utf-8"))
    wanted = set(clause_refs)
    rows = []
    for it in data["items"]:
        base = it["ref"].split("(")[0]
        if base in wanted or it["ref"] in wanted:
            rows.append({
                "ref": it["ref"],
                "parent_ref": it.get("parent_ref"),
                "type": it.get("type"),
                "title": it.get("title"),
                "reconciliation": it.get("reconciliation"),
                "locator": it.get("locator"),
                "question": it.get("question"),
                "evidence": it.get("evidence", []),
                "intent": it.get("intent"),
            })
    return rows


def build_audit_snapshot(audit_id, std, clause_refs, out_dir, version):
    rec = json.loads((ROOT / "content" / "reconciliation" / f"{std}-reconciliation.json").read_text(encoding="utf-8"))
    snap = {
        "audit_id": audit_id,
        "standard": std,
        "snapshot_version": version,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "licensed_source_sha256": rec["licensed_sha256"],
        "reconciliation_status": rec["status"],
        "clauses_selected": sorted(set(clause_refs), key=lambda r: [int(x) for x in r.split(".")]),
        "rows": select_rows(std, clause_refs),
        "status": "IMMUTABLE_SNAPSHOT",
    }
    return write_snapshot(snap, out_dir, f"{audit_id}-{std}-v{version}")


def validate_interview(rec):
    errs = [f"missing field: {k}" for k in INTERVIEW_REQUIRED if not rec.get(k)]
    if rec.get("evidence_class") and rec["evidence_class"] not in INTERVIEW_CLASSES:
        errs.append("evidence_class not recognised")
    if rec.get("consent_state") and rec["consent_state"] not in CONSENT_STATES:
        errs.append("consent_state not recognised")
    if rec.get("date_time"):
        try:
            datetime.fromisoformat(rec["date_time"])
        except ValueError:
            errs.append("date_time is not ISO 8601")
    if rec.get("recording") and rec.get("consent_state") != "CONSENT_RECORDED":
        errs.append("audio recording requires CONSENT_RECORDED")
    if rec.get("transcript") and not rec.get("transcript_reviewed_by"):
        errs.append("transcript is not authoritative until reviewed by the auditor")
    return errs


def validate_sampling(rec):
    errs = [f"missing field: {k}" for k in SAMPLING_REQUIRED if rec.get(k) in (None, "")]
    if rec.get("result") and rec["result"] not in SAMPLING_RESULTS:
        errs.append("result not recognised")
    if rec.get("result") == "NONCONFORMING" and rec.get("expanded") is None:
        errs.append("nonconforming sample requires an expansion decision")
    if rec.get("expanded") is False and not rec.get("expansion_reason"):
        errs.append("no expansion requires a documented reason")
    return errs
