"""FAA QSA assessments, findings and lead classification, recorded in the audit ledger.

Every record is written only against the audit's published selection (pa_qsa.start_audit verifies the
published file against the ledger first). Cross-record rules here; record rules in pa_qsa_rules.

- record_assessment: the criterion must be in the published selection; cited evidence must exist in the
  ledger. Each assessment is appended, so earlier assessments remain in the ledger and the latest one is current.
- record_finding: the criterion must be published; evidence must exist. A nonconformity needs a CAR in the
  ledger and at least one record or controlled-document evidence item.
- classify_finding: the lead classification is set once, by a LEAD_AUDITOR who is not the proposer. The
  proposed classification is not changed.
- status: the current state of every published criterion.
- export_section: the contract pieces for Mike's import (docs/MIKE-HANDOFF-PACKAGE.md), built from the ledger.

Standalone; writes only through the ledger.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pa_ledger as lg  # noqa: E402
import pa_qsa as qsa  # noqa: E402
import pa_qsa_rules as rules  # noqa: E402
import pa_planning as pl  # noqa: E402

FAA_OWNER = "Burrana Inc."
STRONG_LEDGER_TYPES = ("record_review", "document_review")
EVIDENCE_LEDGER_TYPES = ("evidence", "photo", "interview")


def _context(audits_root, audit_id, checklist):
    entries = lg.read_entries(lg.ledger_path(audits_root, audit_id))
    errors, _ = lg.verify(entries)
    if errors:
        raise ValueError("ledger does not verify; nothing recorded: " + "; ".join(errors))
    start = qsa.start_audit(audits_root, audit_id, checklist)
    return {
        "entries": entries,
        "start": start,
        "published": {c["criterion_id"]: c for c in start["criteria"]},
        "by_id": {e["id"]: e for e in entries},
    }


def _evidence_kind(entry):
    """The ledger record type group an evidence entry belongs to, or None."""
    if entry is None:
        return None
    if entry["record_type"] == "evidence":
        return entry["record"]["evidence_type"]
    if entry["record_type"] == "photo":
        return "photo"
    if entry["record_type"] == "interview":
        return "interview"
    return None


def _check_evidence(ctx, ids):
    problems = []
    for eid in ids:
        entry = ctx["by_id"].get(eid)
        if entry is None:
            problems.append(f"evidence {eid} is not in the ledger")
        elif entry["record_type"] not in EVIDENCE_LEDGER_TYPES:
            problems.append(f"{eid} is not an evidence record")
    return problems


def _strong(ctx, ids):
    return any(ctx["by_id"].get(e, {}).get("record_type") == "evidence"
               and ctx["by_id"][e]["record"]["evidence_type"] in STRONG_LEDGER_TYPES for e in ids)


def record_assessment(audits_root, audit_id, checklist, rec, now):
    ctx = _context(audits_root, audit_id, checklist)
    cid = rec.get("criterion_id")
    if cid not in ctx["published"]:
        raise ValueError(f"criterion {cid} is not in the published selection")
    problems = _check_evidence(ctx, rec.get("evidence_ids") or [])
    if problems:
        raise ValueError("; ".join(problems))
    if rec.get("assessment") == "NOT_APPLICABLE" and any(e["record_type"] == "qm_manual" for e in ctx["entries"]):
        if cid not in pl.accepted_exclusion_criteria(audits_root, audit_id):
            raise ValueError("not applicable needs an accepted quality-manual exclusion for this criterion")
    body = dict(rec, publication_version=ctx["start"]["version"], publication_sha256=ctx["start"]["sha256"])
    return lg.append(audits_root, audit_id, "qsa_assessment", body, now=now)


def record_finding(audits_root, audit_id, checklist, rec, now):
    ctx = _context(audits_root, audit_id, checklist)
    cid = rec.get("criterion_id")
    if cid not in ctx["published"]:
        raise ValueError(f"criterion {cid} is not in the published selection")
    problems = _check_evidence(ctx, rec.get("evidence_ids") or [])
    car = rec.get("car_id")
    if car and ctx["by_id"].get(car, {}).get("record_type") != "car":
        problems.append(f"CAR {car} is not in the ledger")
    if rec.get("proposed_classification") in rules.NC_CLASSES:
        if not _strong(ctx, rec.get("evidence_ids") or []):
            problems.append("nonconformity needs record or controlled-document evidence")
    if problems:
        raise ValueError("; ".join(problems))
    return lg.append(audits_root, audit_id, "qsa_finding", rec, now=now)


def classify_finding(audits_root, audit_id, checklist, finding_id, classification, classified_by, role, now):
    ctx = _context(audits_root, audit_id, checklist)
    finding = ctx["by_id"].get(finding_id)
    if finding is None or finding["record_type"] != "qsa_finding":
        raise ValueError(f"finding {finding_id} is not in the ledger")
    if any(e["record_type"] == "qsa_finding_classification" and e["record"]["finding_id"] == finding_id
           for e in ctx["entries"]):
        raise ValueError(f"finding {finding_id} already has a lead classification; it is not overwritten")
    if classified_by == finding["record"]["proposed_by"]:
        raise ValueError("lead classifier must differ from the proposer")
    if classification in rules.NC_CLASSES:
        car = finding["record"].get("car_id")
        if not car or ctx["by_id"].get(car, {}).get("record_type") != "car":
            raise ValueError("nonconformity needs a CAR in the ledger")
        if not _strong(ctx, finding["record"]["evidence_ids"]):
            raise ValueError("nonconformity needs record or controlled-document evidence")
    rec = {"finding_id": finding_id, "classification": classification, "classified_by": classified_by,
           "role": role, "classified_at": now}
    problems = rules.validate_classification(rec)
    if problems:
        raise ValueError("; ".join(problems))
    return lg.append(audits_root, audit_id, "qsa_finding_classification", rec, now=now)


def _latest_assessments(ctx):
    latest = {}
    for e in ctx["entries"]:
        if e["record_type"] == "qsa_assessment":
            latest[e["record"]["criterion_id"]] = e
    return latest


def _findings_by_criterion(ctx):
    classes = {e["record"]["finding_id"]: e["record"] for e in ctx["entries"] if e["record_type"] == "qsa_finding_classification"}
    out = {}
    for e in ctx["entries"]:
        if e["record_type"] == "qsa_finding":
            r = e["record"]
            out.setdefault(r["criterion_id"], []).append({
                "finding_id": e["id"], "proposed_classification": r["proposed_classification"],
                "proposed_by": r["proposed_by"], "statement": r["statement"],
                "lead_classification": classes.get(e["id"], {}).get("classification"),
                "lead_classified_by": classes.get(e["id"], {}).get("classified_by"),
                "lead_classified_at": classes.get(e["id"], {}).get("classified_at"),
                "evidence_ids": r["evidence_ids"], "car_id": r.get("car_id"), "record": e,
            })
    return out


def status(audits_root, audit_id, checklist):
    """Current state of each published criterion, plus open counts."""
    ctx = _context(audits_root, audit_id, checklist)
    latest = _latest_assessments(ctx)
    findings = _findings_by_criterion(ctx)
    rows = []
    for c in ctx["start"]["criteria"]:
        cid = c["criterion_id"]
        a = latest.get(cid)
        fs = findings.get(cid, [])
        rows.append({
            "criterion_id": cid, "source_sheet": c["source_sheet"], "criteria_ref": c["criteria_ref"],
            "origin": c["origin"],
            "applicability": a["record"]["applicability"] if a else "UNDECIDED",
            "assessment": a["record"]["assessment"] if a else "NOT_ASSESSED",
            "assessment_id": a["id"] if a else None,
            "assessed_by": a["record"]["assessor"] if a else None,
            "assessed_at": a["record"]["assessed_at"] if a else None,
            "findings": [{k: v for k, v in f.items() if k != "record"} for f in fs],
        })
    unclassified = sum(1 for r in rows for f in r["findings"] if not f["lead_classification"])
    return {
        "publication": {"version": ctx["start"]["version"], "sha256": ctx["start"]["sha256"]},
        "source_changed_since_publication": ctx["start"]["source_changed_since_publication"],
        "criteria": rows,
        "counts": {
            "published": len(rows),
            "assessed": sum(1 for r in rows if r["assessment"] != "NOT_ASSESSED"),
            "not_assessed": sum(1 for r in rows if r["assessment"] == "NOT_ASSESSED"),
            "findings": sum(len(r["findings"]) for r in rows),
            "findings_unclassified": unclassified,
        },
    }


def _contract_evidence(ctx, eid):
    entry = ctx["by_id"][eid]
    r = entry["record"]
    kind = _evidence_kind(entry)
    out = {"id": eid, "evidence_type": rules.EVIDENCE_CONTRACT_TYPE[kind], "record_sha256": entry["record_sha256"],
           "entry_sha256": entry["entry_sha256"]}
    if entry["record_type"] == "evidence":
        out.update(timestamp=r["timestamp"], auditor=r["auditor"], source_ref=r["source_ref"])
    elif entry["record_type"] == "photo":
        out.update(timestamp=r["timestamp"], auditor=r["auditor"], file_name=r["file_name"],
                   file_sha256=r["sha256"], requirement_id=r["requirement_id"])
    else:
        out.update(timestamp=r["date_time"], auditor=r["interviewer"])
    return out


def export_section(audits_root, audit_id, checklist):
    """Contract pieces for Mike's import. Built from the ledger; question and condition text are never included."""
    ctx = _context(audits_root, audit_id, checklist)
    latest = _latest_assessments(ctx)
    findings = _findings_by_criterion(ctx)
    items, assessments, out_findings, not_assessed, referenced = [], [], [], [], set()
    for c in ctx["start"]["criteria"]:
        rid = c["criterion_id"]
        items.append({"ref": c["criteria_ref"], "requirement_id": rid, "title": c["source_sheet"],
                      "origin": c["origin"]})
        a = latest.get(rid)
        if a is None:
            not_assessed.append({"ref": c["criteria_ref"], "requirement_id": rid,
                                 "reason": "no assessment recorded"})
        else:
            r = a["record"]
            referenced.update(r.get("evidence_ids") or [])
            assessments.append({"id": a["id"], "requirement_id": rid, "applicability": r["applicability"],
                                "assessment": r["assessment"], "evidence_ids": r.get("evidence_ids", []),
                                "assessor": r["assessor"], "assessed_at": r["assessed_at"],
                                "publication_version": r["publication_version"],
                                "publication_sha256": r["publication_sha256"], "record_sha256": a["record_sha256"]})
        for f in findings.get(rid, []):
            referenced.update(f["evidence_ids"])
            lead = f["lead_classification"]
            out_findings.append({
                "id": f["finding_id"], "audit_id": audit_id, "checklist_item_ref": rid,
                "requirement_ids": [rid], "statement": f["statement"], "proposed_by": f["proposed_by"],
                "status": "CLASSIFIED" if lead else "SUBMITTED",
                "proposed_classification": f["proposed_classification"],
                "evidence_ids": f["evidence_ids"],
                **({"car_id": f["car_id"]} if f.get("car_id") else {}),
                **({"lead_classification": lead, "lead_classified_by": f["lead_classified_by"],
                    "lead_role": rules.LEAD_ROLE, "lead_classified_at": f["lead_classified_at"]} if lead else {}),
            })
    return {
        "publication": {"version": ctx["start"]["version"], "sha256": ctx["start"]["sha256"]},
        "checklist_items": items,
        "assessments": assessments,
        "findings": out_findings,
        "not_assessed": not_assessed,
        "evidence": [_contract_evidence(ctx, e) for e in sorted(referenced)],
    }
