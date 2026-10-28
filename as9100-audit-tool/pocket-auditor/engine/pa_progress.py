"""Audit progress, next action and report readiness, derived from the verified audit ledger.

One place decides what each step requires, what is complete, what blocks the next step, and what the auditor should
do next. The interface reads this; it does not decide these things itself.

Steps: setup, scope, planning, conduct, review. Each step has: state (complete, in_progress, blocked, not_started),
a plain-language requirement, the blockers still open, and the next action text.
"""
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pa_ledger as lg  # noqa: E402
import pa_qsa as qsa  # noqa: E402
import pa_qsa_records as qr  # noqa: E402
import pa_planning as pl  # noqa: E402
import pa_audit_record as arec  # noqa: E402
import pa_setup as su  # noqa: E402
import pa_review as rv  # noqa: E402


def _entries(audits_root, audit_id):
    return lg.read_entries(lg.ledger_path(audits_root, audit_id))


def progress(audits_root, audit_id, checklist=None, today=None):
    checklist = checklist or qsa.load_checklist()
    today = today or date.today()
    entries = _entries(audits_root, audit_id)
    setup = su.current_setup(audits_root, audit_id)
    status = su.current_status(audits_root, audit_id)
    pubs = [e for e in entries if e["record_type"] == "qsa_publication"]
    scope_count = pubs[-1]["record"]["selected_count"] if pubs else 0
    plan = pl.planning_state(audits_root, audit_id) if pubs and setup else None
    qs = qr.status(audits_root, audit_id, checklist) if pubs else None

    steps = {}
    # 1. setup
    steps["setup"] = {
        "label": "Setup", "state": "complete" if setup else "not_started",
        "requires": "Audit type, title, objectives, lead auditor, auditee contact, independence declaration, site and method, schedule, report due date, sponsor, and permissions.",
        "blockers": [] if setup else ["Audit setup not recorded"],
        "next": "Scope & Criteria: select the clauses and criteria to audit." if setup else "Record the audit setup.",
    }
    # 2. scope
    scope_ok = bool(pubs)
    steps["scope"] = {
        "label": "Scope & Criteria",
        "state": "complete" if scope_ok else ("in_progress" if setup else "blocked"),
        "requires": "At least one clause or criterion selected from any source, then the scope published.",
        "blockers": [] if scope_ok else (["Scope not published"] if setup else ["Setup must be recorded first"]),
        "next": f"Scope published with {scope_count} criteria. Next: Planning." if scope_ok else "Select clauses or criteria, then publish the scope.",
    }
    # 3. planning (quality manual first)
    plan_blockers = plan["reasons"] if plan else (["Scope must be published first"] if setup else ["Setup must be recorded first"])
    plan_ok = bool(plan and plan["ready"])
    steps["planning"] = {
        "label": "Planning (quality manual first)",
        "state": "complete" if plan_ok else ("blocked" if not scope_ok or not setup else "in_progress"),
        "requires": "Quality manual recorded and reviewed by someone other than its uploader; every exclusion proposed against the published scope is accepted, rejected or amended, each reviewed by someone other than its proposer.",
        "blockers": plan_blockers,
        "next": "Planning complete. You can start the audit." if plan_ok else (plan_blockers[0] if plan_blockers else "Complete planning."),
    }
    # 4. conduct
    total = qs["counts"]["published"] if qs else 0
    assessed = qs["counts"]["assessed"] if qs else 0
    started = status in ("IN_PROGRESS", "CONDUCTED", "REPORTED", "CLOSED")
    conduct_blockers = []
    if not plan_ok:
        conduct_blockers.append("Planning is not complete")
    if total and assessed < total:
        conduct_blockers.append(f"{total - assessed} of {total} criteria not yet assessed")
    steps["conduct"] = {
        "label": "Conduct", "state": ("complete" if status in ("CONDUCTED", "REPORTED", "CLOSED") else
                                      "in_progress" if started else "blocked" if not plan_ok else "not_started"),
        "requires": "Start the audit (requires complete planning). Assess each published criterion against evidence, and record findings, interviews, samples, photos and CARs.",
        "blockers": conduct_blockers if status not in ("CONDUCTED", "REPORTED", "CLOSED") else [],
        "next": ("Mark the audit CONDUCTED when every criterion is assessed." if started and status == "IN_PROGRESS"
                 else "Start the audit." if plan_ok and not started else "Complete planning before the audit can start."),
    }
    # 5. review and report
    latest = _latest_snapshot(audits_root, audit_id)
    cars = [e["record"] for e in entries if e["record_type"] == "car"]
    car_flags = {c.get("car_id"): arec.car_flags(c, today) for c in cars}
    unclassified = qs["counts"]["findings_unclassified"] if qs else 0
    checks = [
        {"label": "Setup recorded", "ok": bool(setup), "detail": ""},
        {"label": "Planning complete", "ok": plan_ok, "detail": "; ".join(plan_blockers)},
        {"label": "Every criterion assessed", "ok": bool(total) and assessed == total,
         "detail": f"{assessed} of {total} assessed"},
        {"label": "Every finding classified by the lead auditor", "ok": unclassified == 0,
         "detail": f"{unclassified} without a lead classification"},
        {"label": "Snapshot taken and ready", "ok": bool(latest and latest.get("ready_for_export")),
         "detail": "" if latest else "No snapshot yet"},
        {"label": "Audit status CONDUCTED or later", "ok": status in ("CONDUCTED", "REPORTED", "CLOSED"),
         "detail": f"Status {status or 'not set'}"},
    ]
    report_ready = all(c["ok"] for c in checks)
    open_cars = [c for c in cars if c.get("status") != "closed"]
    steps["review"] = {
        "label": "Review & Report",
        "state": "complete" if status in ("REPORTED", "CLOSED") else ("in_progress" if latest else "not_started"),
        "requires": "Every criterion assessed, every finding classified, a snapshot taken and ready, and the audit CONDUCTED.",
        "blockers": [c["label"] + (f" ({c['detail']})" if c["detail"] else "") for c in checks if not c["ok"]],
        "next": ("Report ready. Export for each recipient." if report_ready else
                 "Work through the readiness checks below."),
    }
    order = ["setup", "scope", "planning", "conduct", "review"]
    current = next((k for k in order if steps[k]["state"] != "complete"), "review")
    return {
        "audit_id": audit_id,
        "status": status,
        "current_step": current,
        "steps": [dict(steps[k], key=k) for k in order],
        "next_action": steps[current]["next"],
        "readiness": checks,
        "report_ready": report_ready,
        "cars": [{"car_id": c.get("car_id"), "status": c.get("status"), "flags": car_flags.get(c.get("car_id"), []),
                  "open": c.get("status") != "closed"} for c in cars],
        "open_cars": len(open_cars),
        "snapshot": None if not latest else {"version": latest.get("snapshot_version"),
                                             "ready_for_export": latest.get("ready_for_export"),
                                             "blocking_issues": latest.get("blocking_issues", [])},
    }


def _latest_snapshot(audits_root, audit_id):
    latest = rv.latest_snapshot(audits_root, audit_id)
    return None if latest is None else latest[0]
