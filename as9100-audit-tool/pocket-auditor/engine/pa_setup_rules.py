"""Record rules for the audit setup (Step 1 of the stepper) and audit status.

Record-level checks only (no ledger access), so pa_ledger can validate with them.
Cross-field rules that need the whole record (end after start, lead not the auditee, conflict refusal) are here too,
because they are pure functions of the record.

Setup fields follow the owner's specification: audit type, audit ID and title, objectives, lead auditor and team,
auditee contact, independence/conflict declaration, site and method, start and end, opening and closing meetings,
report due date, sponsor/approver, safety / confidentiality / access / photo permissions, and audit status.
"""
import re
from datetime import date, datetime

AUDIT_TYPES = ("INTERNAL", "SUPPLIER", "CERTIFICATION", "SURVEILLANCE", "FAA_PMA_QSA", "CUSTOMER", "REGULATOR")
METHODS = ("ON_SITE", "REMOTE", "HYBRID", "DOCUMENT_ONLY")
STATUSES = ("PLANNED", "IN_PROGRESS", "CONDUCTED", "REPORTED", "CLOSED")
# Allowed status moves. A status can only move forward one step at a time.
STATUS_NEXT = {"PLANNED": ("IN_PROGRESS",), "IN_PROGRESS": ("CONDUCTED",), "CONDUCTED": ("REPORTED",),
               "REPORTED": ("CLOSED",), "CLOSED": ()}
AUDIT_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}")
REQUIRED = ["audit_type", "audit_id", "title", "objectives", "lead_auditor", "auditee_contact", "independence",
            "site", "method", "start", "end", "report_due", "sponsor_approver", "permissions", "status"]


def _iso(value):
    try:
        datetime.fromisoformat(value)
        return True
    except (TypeError, ValueError):
        return False


def _date(value):
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def validate_setup(rec):
    errors = [f"missing field: {k}" for k in REQUIRED if rec.get(k) in (None, "", [], {})]
    if rec.get("audit_type") and rec["audit_type"] not in AUDIT_TYPES:
        errors.append("audit_type not recognised")
    if rec.get("audit_id") and not AUDIT_ID.fullmatch(str(rec["audit_id"])):
        errors.append("audit_id must start with a letter or digit and use letters, digits, dot, dash or underscore")
    if rec.get("method") and rec["method"] not in METHODS:
        errors.append("method not recognised")
    if rec.get("status") and rec["status"] != "PLANNED":
        errors.append("a new setup must have status PLANNED")
    for k in ("start", "end", "opening_meeting", "closing_meeting"):
        if rec.get(k) and not _iso(rec[k]):
            errors.append(f"{k} is not ISO 8601")
    if rec.get("start") and rec.get("end") and _iso(rec["start"]) and _iso(rec["end"]):
        if datetime.fromisoformat(rec["end"]) < datetime.fromisoformat(rec["start"]):
            errors.append("end is before start")
    if rec.get("report_due"):
        due, end = _date(rec["report_due"]), _date(rec.get("end"))
        if due is None:
            errors.append("report_due is not a date")
        elif end and due < end:
            errors.append("report_due is before the end of the audit")
    if rec.get("lead_auditor") and rec.get("lead_auditor") == rec.get("auditee_contact"):
        errors.append("lead auditor cannot be the auditee contact")
    ind = rec.get("independence") or {}
    if ind:
        if "conflict" not in ind:
            errors.append("independence needs a conflict declaration (true or false)")
        elif ind["conflict"] is True:
            errors.append("a conflict of interest is declared: reassign the audit before planning it")
        elif ind["conflict"] is False and not ind.get("statement"):
            errors.append("independence declaration needs a statement")
    perm = rec.get("permissions") or {}
    if perm and any(k not in perm for k in ("safety", "confidentiality", "access", "photos")):
        errors.append("permissions need safety, confidentiality, access and photos")
    return errors


def validate_status(rec, current):
    """A status record moves the audit one step forward. `current` is the status before this record."""
    errors = [f"missing field: {k}" for k in ("status", "changed_by", "changed_at") if rec.get(k) in (None, "")]
    if rec.get("status") and rec["status"] not in STATUSES:
        errors.append("status not recognised")
    if rec.get("status") and current and rec["status"] not in STATUS_NEXT.get(current, ()):
        errors.append(f"status cannot move from {current} to {rec['status']}")
    if rec.get("changed_at") and not _iso(rec["changed_at"]):
        errors.append("changed_at is not ISO 8601")
    return errors
