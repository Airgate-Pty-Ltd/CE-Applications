"""Finding model linked to a snapshot, its checklist row and its evidence.

Builds on pa_export.validate_finding (required fields, separate proposed and lead classification,
lead must differ from the proposer). This module adds the audit-specific links:

- checklist_item_ref must be a row in the snapshot, and its requirement ID must be in requirement_ids
- every requirement_id must belong to a row in the snapshot
- every evidence_id must exist in the evidence register
- the finding must cite the snapshot file hash it was raised against
- a nonconformity (MAJOR_NC, MINOR_NC) needs a CAR reference that exists in the snapshot, and at least
  one record, controlled document or system-data evidence item (ranks 1 to 3)
- the lead classification is set once; it is not overwritten

The proposed classification and the lead classification are never merged into one field.
Standalone; reads and writes nothing on disk.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pa_export import validate_finding, set_lead_classification  # noqa: E402
from pa_governance import evidence_rank, requirement_id  # noqa: E402
from pa_audit_record import standard_label  # noqa: E402

NC_CLASSES = {"MAJOR_NC", "MINOR_NC"}
STRONG_EVIDENCE_RANK = 3  # record (1), controlled document (2), system data (3)


def snapshot_requirement_ids(snapshot):
    label = standard_label(snapshot["standard"])
    return {requirement_id("STD", label, r["ref"]) for r in snapshot["rows"]}


def check_finding(f, snapshot, evidence_register, snapshot_sha256):
    """Return a list of errors for a finding raised against this snapshot. Empty = valid."""
    errors = validate_finding(f)
    rows = {r["ref"] for r in snapshot["rows"]}
    req_ids = snapshot_requirement_ids(snapshot)
    ref = f.get("checklist_item_ref")
    if ref and ref not in rows:
        errors.append(f"checklist_item_ref {ref} is not a row in this snapshot")
    item_req = requirement_id("STD", standard_label(snapshot["standard"]), ref) if ref else None
    for r in f.get("requirement_ids") or []:
        if r not in req_ids:
            errors.append(f"requirement {r} is not in this snapshot")
    if item_req and item_req not in (f.get("requirement_ids") or []):
        errors.append(f"finding does not link its own checklist row {item_req}")
    ev_by_id = {e["id"]: e for e in evidence_register}
    for eid in f.get("evidence_ids") or []:
        if eid not in ev_by_id:
            errors.append(f"evidence {eid} is not in the evidence register")
    if f.get("snapshot_sha256") != snapshot_sha256:
        errors.append("finding is not linked to this snapshot hash")
    if f.get("status") == "CLASSIFIED" and not f.get("lead_classification"):
        errors.append("CLASSIFIED status needs a lead classification")

    effective = f.get("lead_classification") or f.get("proposed_classification")
    if effective in NC_CLASSES:
        car_ids = {c["car_id"] for c in snapshot.get("car_records", [])}
        if not f.get("car_id"):
            errors.append("nonconformity needs a CAR reference")
        elif f["car_id"] not in car_ids:
            errors.append(f"CAR {f['car_id']} is not in this snapshot")
        strong = [eid for eid in (f.get("evidence_ids") or []) if eid in ev_by_id
                  and evidence_rank(ev_by_id[eid]["evidence_type"]) <= STRONG_EVIDENCE_RANK]
        if not strong:
            errors.append("nonconformity needs record, controlled document or system data evidence")
    return errors


def classify(f, classification, lead_name, role, timestamp):
    """Set the lead classification once. Returns a new finding dict; the proposal is left untouched."""
    if f.get("lead_classification"):
        raise ValueError("lead classification is already recorded and is not overwritten")
    return set_lead_classification(dict(f), classification, lead_name, role, timestamp)
