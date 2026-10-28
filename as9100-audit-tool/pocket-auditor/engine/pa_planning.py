"""Quality-manual-first planning, recorded in the audit ledger.

- record_manual: the quality manual, once, by its SHA-256 and uploader.
- propose_exclusion: a not-applicable proposal against a criterion of the published scope, with the manual section.
- review_exclusion: accept, reject or amend a proposal. The reviewer must differ from the proposer.
- complete_review: completes the manual review. The reviewer must differ from the uploader and every exclusion must be
  resolved.
- planning_state: whether planning is complete (manual reviewed, exclusions resolved, scope published) with reasons.
- accepted_exclusion_criteria: criterion IDs with an accepted exclusion (used by the conduct step).

Standalone; writes only through the ledger under the audits root given by the caller.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pa_ledger as lg  # noqa: E402
import pa_qsa as qsa  # noqa: E402
import pa_planning_rules as rules  # noqa: E402


def _entries(audits_root, audit_id):
    entries = lg.read_entries(lg.ledger_path(audits_root, audit_id))
    errors, _ = lg.verify(entries)
    if errors:
        raise ValueError("ledger does not verify: " + "; ".join(errors))
    return entries


def _manual(entries):
    manuals = [e for e in entries if e["record_type"] == "qm_manual"]
    return manuals[-1] if manuals else None


def _exclusions(entries):
    """Each proposal with its reviews applied in order. status: proposed, accepted, rejected or accepted_amended."""
    out = {}
    for e in entries:
        if e["record_type"] == "qm_exclusion":
            out[e["id"]] = {"id": e["id"], "record": e["record"], "status": "proposed", "effective": dict(e["record"])}
    for e in entries:
        if e["record_type"] == "qm_exclusion_review" and e["record"]["exclusion_id"] in out:
            x, r = out[e["record"]["exclusion_id"]], e["record"]
            if r["action"] == "accept":
                x["status"] = "accepted"
            elif r["action"] == "reject":
                x["status"] = "rejected"
            else:
                x["status"] = "accepted_amended"
                x["effective"].update(r.get("amended") or {})
            x["review"] = r
    return list(out.values())


def _complete(entries):
    return [e for e in entries if e["record_type"] == "qm_review_complete"]


def record_manual(audits_root, audit_id, rec, now):
    entries = _entries(audits_root, audit_id)
    if _manual(entries):
        raise ValueError("quality manual already recorded for this audit; it is not overwritten")
    errors = rules.validate_manual(rec)
    if errors:
        raise ValueError("; ".join(errors))
    return lg.append(audits_root, audit_id, "qm_manual", rec, now=now)


def propose_exclusion(audits_root, audit_id, rec, now):
    entries = _entries(audits_root, audit_id)
    if not _manual(entries):
        raise ValueError("record the quality manual before proposing an exclusion (quality-manual-first)")
    published = qsa.start_audit(audits_root, audit_id, qsa.load_checklist())
    ids = {c["criterion_id"] for c in published["criteria"]}
    if rec.get("criterion_id") not in ids:
        raise ValueError(f"criterion {rec.get('criterion_id')} is not in the published scope")
    rec = dict(rec, proposed_at=rec.get("proposed_at") or now)
    errors = rules.validate_exclusion(rec)
    if errors:
        raise ValueError("; ".join(errors))
    return lg.append(audits_root, audit_id, "qm_exclusion", rec, now=now)


def review_exclusion(audits_root, audit_id, exclusion_id, action, reviewer, note, amended, now):
    entries = _entries(audits_root, audit_id)
    match = [x for x in _exclusions(entries) if x["id"] == exclusion_id]
    if not match:
        raise ValueError(f"exclusion {exclusion_id} is not in the ledger")
    x = match[0]
    if x["status"] != "proposed":
        raise ValueError(f"exclusion {exclusion_id} is already {x['status']}; it is not overwritten")
    rec = {"exclusion_id": exclusion_id, "action": action, "reviewer": reviewer, "reviewed_at": now,
           "note": note, "amended": amended or {}}
    errors = rules.validate_exclusion_review(rec, x["record"]["proposed_by"])
    if errors:
        raise ValueError("; ".join(errors))
    return lg.append(audits_root, audit_id, "qm_exclusion_review", rec, now=now)


def complete_review(audits_root, audit_id, reviewer, now):
    entries = _entries(audits_root, audit_id)
    manual = _manual(entries)
    if not manual:
        raise ValueError("record the quality manual first")
    if _complete(entries):
        raise ValueError("quality manual review already completed")
    open_items = [x["id"] for x in _exclusions(entries) if x["status"] == "proposed"]
    if open_items:
        raise ValueError(f"unresolved exclusions: {', '.join(open_items)}")
    rec = {"reviewer": reviewer, "completed_at": now}
    errors = rules.validate_review_complete(rec, manual["record"]["uploader"])
    if errors:
        raise ValueError("; ".join(errors))
    return lg.append(audits_root, audit_id, "qm_review_complete", rec, now=now)


def planning_state(audits_root, audit_id):
    entries = _entries(audits_root, audit_id)
    manual = _manual(entries)
    exclusions = _exclusions(entries)
    reasons = []
    if not manual:
        reasons.append("quality manual not recorded")
    elif not _complete(entries):
        reasons.append("quality manual review not completed")
    open_items = [x["id"] for x in exclusions if x["status"] == "proposed"]
    if open_items:
        reasons.append(f"unresolved exclusions: {', '.join(open_items)}")
    if not any(e["record_type"] == "qsa_publication" for e in entries):
        reasons.append("scope not published")
    return {"ready": not reasons, "reasons": reasons,
            "manual": manual["record"] if manual else None,
            "review_completed": bool(_complete(entries)),
            "exclusions": [{k: v for k, v in x.items() if k != "review"} for x in exclusions]}


def accepted_exclusion_criteria(audits_root, audit_id):
    entries = _entries(audits_root, audit_id)
    return {x["effective"]["criterion_id"] for x in _exclusions(entries) if x["status"] in ("accepted", "accepted_amended")}
