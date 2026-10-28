"""Record rules for FAA QSA assessments, findings and lead classification.

Record-level checks only (no ledger access), so pa_ledger can validate with them without an import cycle.
Cross-record checks (criterion is in the published selection, evidence exists, lead differs from proposer,
classification set once) are in pa_qsa_records.

The vocabularies below are final for the v1.0 handoff (owner instruction, 2026-10-08). A change to any of them
changes what Mike's import receives, so it needs a new contract version.

Nonconformity evidence rule (final): a nonconformity (MAJOR_NC, MINOR_NC), proposed or lead, needs
(a) a CAR recorded in the ledger, and (b) at least one evidence record of type record or controlled_document
(ledger types record_review or document_review). Interview, observation and photo evidence supports a finding
but does not, on its own, support a nonconformity. The workbook's system_data type has no ledger record type yet.
"""
import re
from datetime import datetime

# Applicability (final). UNDECIDED is the workbook's import value and the default for a criterion not yet assessed.
APPLICABILITY = ("APPLICABLE", "NOT_APPLICABLE", "UNDECIDED")
# Assessment (final). NOT_ASSESSED is the workbook's import value. CONFORMING and NONCONFORMING need evidence.
# NOT_APPLICABLE needs applicability NOT_APPLICABLE, a reason and a reviewer other than the assessor.
ASSESSMENTS = ("CONFORMING", "NONCONFORMING", "NOT_ASSESSED", "NOT_APPLICABLE")
FINDING_CLASSES = ("MAJOR_NC", "MINOR_NC", "OBSERVATION", "OFI")
NC_CLASSES = ("MAJOR_NC", "MINOR_NC")
LEAD_ROLE = "LEAD_AUDITOR"

# Evidence record types in the ledger, and the contract's evidence_type they map to (docs/MIKE-HANDOFF-PACKAGE.md §3).
EVIDENCE_CONTRACT_TYPE = {
    "record_review": "record",
    "document_review": "controlled_document",
    "observation": "observation",
    "interview": "interview",
    "photo": "photo_file",
}
# Ranks from the skill hierarchy: record 1, controlled document 2, system data 3 are strong enough for a nonconformity.
STRONG_CONTRACT_TYPES = ("record", "controlled_document", "system_data")

EVIDENCE_ID = re.compile(r"(EVD|PHO|INT)-\d{4}")
HEX64 = re.compile(r"[0-9a-f]{64}")


def _iso(value):
    try:
        datetime.fromisoformat(value)
        return True
    except (TypeError, ValueError):
        return False


def _missing(rec, keys):
    return [f"missing field: {k}" for k in keys if rec.get(k) in (None, "", [])]


def validate_assessment(rec):
    errors = _missing(rec, ["criterion_id", "applicability", "assessment", "assessor", "assessed_at"])
    if rec.get("applicability") and rec["applicability"] not in APPLICABILITY:
        errors.append("applicability not recognised")
    if rec.get("assessment") and rec["assessment"] not in ASSESSMENTS:
        errors.append("assessment not recognised")
    if rec.get("assessed_at") and not _iso(rec["assessed_at"]):
        errors.append("assessed_at is not ISO 8601")
    evidence = rec.get("evidence_ids") or []
    bad = [e for e in evidence if not EVIDENCE_ID.fullmatch(str(e))]
    if bad:
        errors.append("evidence_ids must be ledger evidence IDs (EVD-, PHO- or INT-): " + ", ".join(map(str, bad)))
    if rec.get("assessment") in ("CONFORMING", "NONCONFORMING") and not evidence:
        errors.append(f"{rec['assessment']} assessment needs evidence")
    na = rec.get("assessment") == "NOT_APPLICABLE" or rec.get("applicability") == "NOT_APPLICABLE"
    if rec.get("assessment") == "NOT_APPLICABLE" and rec.get("applicability") != "NOT_APPLICABLE":
        errors.append("NOT_APPLICABLE assessment needs NOT_APPLICABLE applicability")
    if rec.get("applicability") == "NOT_APPLICABLE" and rec.get("assessment") != "NOT_APPLICABLE":
        errors.append("NOT_APPLICABLE applicability needs NOT_APPLICABLE assessment")
    if na:
        errors += _missing(rec, ["reason", "reviewer"])
        if rec.get("reviewer") and rec.get("reviewer") == rec.get("assessor"):
            errors.append("reviewer must differ from the assessor for a not-applicable decision")
    if rec.get("publication_version") in (None, "") or not isinstance(rec.get("publication_version"), int):
        errors.append("publication_version must be an integer (set by the engine)")
    if rec.get("publication_sha256") and not HEX64.fullmatch(str(rec["publication_sha256"])):
        errors.append("publication_sha256 is not a SHA-256 hex digest")
    return errors


def validate_finding(rec):
    errors = _missing(rec, ["criterion_id", "statement", "proposed_by", "proposed_classification", "evidence_ids"])
    if rec.get("proposed_classification") and rec["proposed_classification"] not in FINDING_CLASSES:
        errors.append("proposed_classification not recognised")
    bad = [e for e in (rec.get("evidence_ids") or []) if not EVIDENCE_ID.fullmatch(str(e))]
    if bad:
        errors.append("evidence_ids must be ledger evidence IDs (EVD-, PHO- or INT-): " + ", ".join(map(str, bad)))
    if rec.get("proposed_classification") in NC_CLASSES and not rec.get("car_id"):
        errors.append("nonconformity needs a CAR reference (ledger ID, e.g. CAR-0004)")
    if rec.get("car_id") and not re.fullmatch(r"CAR-\d{4}", str(rec["car_id"])):
        errors.append("car_id must be a ledger CAR ID")
    return errors


def validate_classification(rec):
    errors = _missing(rec, ["finding_id", "classification", "classified_by", "classified_at"])
    if rec.get("classification") and rec["classification"] not in FINDING_CLASSES:
        errors.append("classification not recognised")
    if rec.get("role") != LEAD_ROLE:
        errors.append("only a LEAD_AUDITOR may set the lead classification")
    if rec.get("classified_at") and not _iso(rec["classified_at"]):
        errors.append("classified_at is not ISO 8601")
    if rec.get("finding_id") and not re.fullmatch(r"QFN-\d{4}", str(rec["finding_id"])):
        errors.append("finding_id must be a QSA finding ID (QFN-)")
    return errors
