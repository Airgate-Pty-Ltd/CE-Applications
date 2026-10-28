"""Record rules for quality-manual-first planning. Record-level only (no ledger access), so pa_ledger can validate with them.

Order of work:
  1. record the quality manual (hash, name, uploader, class)
  2. propose exclusions (not-applicable requirements, each with the manual section that states it)
  3. review each exclusion (accept, reject or amend; reviewer must differ from the proposer)
  4. complete the manual review (reviewer must differ from the uploader; every exclusion resolved)
Only then can the audit start (status IN_PROGRESS), and a not-applicable assessment is accepted only for a criterion
with an accepted exclusion.

The manual is recorded by its SHA-256. The file itself is not stored or uploaded by Pocket Auditor.
"""
import re
from datetime import datetime

MANUAL_CLASSES = ("CUSTOMER_UPLOAD", "SYNTHETIC_FIXTURE")
REVIEW_ACTIONS = ("accept", "reject", "amend")
AMENDABLE = ("qm_section_ref", "reason")
HEX64 = re.compile(r"[0-9a-f]{64}")


def _iso(value):
    try:
        datetime.fromisoformat(value)
        return True
    except (TypeError, ValueError):
        return False


def _missing(rec, keys):
    return [f"missing field: {k}" for k in keys if rec.get(k) in (None, "", [])]


def validate_manual(rec):
    errors = _missing(rec, ["file_name", "sha256", "uploader", "uploaded_on", "source_class"])
    if rec.get("sha256") and not HEX64.fullmatch(str(rec["sha256"])):
        errors.append("sha256 is not a SHA-256 hex digest")
    if rec.get("source_class") and rec["source_class"] not in MANUAL_CLASSES:
        errors.append("source_class must be CUSTOMER_UPLOAD or SYNTHETIC_FIXTURE")
    if rec.get("uploaded_on") and not _iso(rec["uploaded_on"]):
        errors.append("uploaded_on is not ISO 8601")
    return errors


def validate_exclusion(rec):
    errors = _missing(rec, ["criterion_id", "qm_section_ref", "reason", "proposed_by", "proposed_at"])
    if rec.get("proposed_at") and not _iso(rec["proposed_at"]):
        errors.append("proposed_at is not ISO 8601")
    return errors


def validate_exclusion_review(rec, proposed_by):
    errors = _missing(rec, ["exclusion_id", "action", "reviewer", "reviewed_at"])
    if rec.get("action") and rec["action"] not in REVIEW_ACTIONS:
        errors.append("action must be accept, reject or amend")
    if rec.get("reviewer") and rec["reviewer"] == proposed_by:
        errors.append("reviewer must differ from the proposer")
    if rec.get("action") == "reject" and not rec.get("note"):
        errors.append("rejection needs a note")
    if rec.get("action") == "amend":
        amended = rec.get("amended") or {}
        if not amended or not rec.get("note"):
            errors.append("amendment needs amended fields and a note")
        extra = [k for k in amended if k not in AMENDABLE]
        if extra:
            errors.append(f"only {', '.join(AMENDABLE)} can be amended")
    if rec.get("reviewed_at") and not _iso(rec["reviewed_at"]):
        errors.append("reviewed_at is not ISO 8601")
    return errors


def validate_review_complete(rec, uploader):
    errors = _missing(rec, ["reviewer", "completed_at"])
    if rec.get("reviewer") and rec["reviewer"] == uploader:
        errors.append("manual reviewer must differ from the uploader")
    if rec.get("completed_at") and not _iso(rec["completed_at"]):
        errors.append("completed_at is not ISO 8601")
    return errors
