"""Governance additions for Pocket Auditor (2026-10-08 directives).

- Requirement IDs in the skill format: STD:<Standard>:<Clause> and REG:<Reg>:<Section>
- Evidence rank from the skill's hierarchy: records > documents > system data > observation > interview > verbal
- Source licence/use states and the verbatim-use guard (SOURCE-LICENSING-DECISION)
- Corrective Action (CAR) review record validation and effectiveness flags (CLAUDE-CORRECTION)

Standalone; reads and writes nothing outside the product folder.
"""
from datetime import datetime

LICENCE_STATES = {
    "ORG_PRIVATE_LICENSED",       # verbatim use only in the owning organization's tenant
    "CUSTOMER_PRIVATE_LICENSED",  # verbatim use only in the supplying customer's tenant
    "SHARED_DISTRIBUTABLE",       # approved for shared / customer distribution
    "REFERENCE_METADATA_ONLY",    # identifiers and permitted metadata only; no verbatim text
    "UNVERIFIED_OR_UNAVAILABLE",  # cannot generate an approved checklist
}
# Evidence rank: lower number = stronger evidence (skill hierarchy)
EVIDENCE_RANK = {
    "record": 1, "controlled_document": 2, "system_data": 3,
    "observation": 4, "photo_file": 4, "interview": 5, "verbal": 6,
}
CAR_REVIEW_RESULTS = {"effective", "partially_effective", "ineffective", "recurring", "not_available", "not_applicable"}
CAR_REQUIRED = ["car_id", "source_system", "linked_requirement", "problem_statement", "owner", "due_date", "status"]


def requirement_id(source_kind, standard, ref):
    """STD for standards (clause refs); REG for regulations (section refs)."""
    if source_kind not in ("STD", "REG"):
        raise ValueError("source_kind must be STD or REG")
    return f"{source_kind}:{standard}:{ref}"


def evidence_rank(evidence_type):
    if evidence_type not in EVIDENCE_RANK:
        raise ValueError(f"unknown evidence type: {evidence_type}")
    return EVIDENCE_RANK[evidence_type]


def licence_gate(source):
    """Return (may_generate_approved_checklist, reasons). Blocks missing or non-usable licence states."""
    reasons = []
    state = source.get("licence_use")
    if state not in LICENCE_STATES:
        reasons.append("licence_use missing or not a recognised state")
    if state == "UNVERIFIED_OR_UNAVAILABLE":
        reasons.append("licence/use state is UNVERIFIED_OR_UNAVAILABLE")
    if source.get("status") == "approved" and not source.get("licence_scope_owner"):
        reasons.append("approved source has no licence_scope_owner")
    return (not reasons, reasons)


def verbatim_allowed(source, viewer_org):
    """Verbatim text may be shown only to the owning organization, and only under a private licence state."""
    state = source.get("licence_use")
    owner = source.get("licence_scope_owner")
    if state == "ORG_PRIVATE_LICENSED":
        return owner == viewer_org
    if state == "CUSTOMER_PRIVATE_LICENSED":
        return owner == viewer_org
    if state == "SHARED_DISTRIBUTABLE":
        return True
    return False  # REFERENCE_METADATA_ONLY, UNVERIFIED_OR_UNAVAILABLE, missing


def validate_car_review(car):
    """Validate a CAR review record. Returns a list of errors."""
    errors = [f"missing field: {k}" for k in CAR_REQUIRED if not car.get(k)]
    if car.get("auditor_result") and car["auditor_result"] not in CAR_REVIEW_RESULTS:
        errors.append("auditor_result not recognised")
    if car.get("due_date") and car.get("review_date"):
        try:
            if datetime.fromisoformat(car["review_date"]) < datetime.fromisoformat(car["created"]) if car.get("created") else False:
                errors.append("review_date precedes created")
        except ValueError:
            errors.append("bad date format")
    return errors


def car_flags(car, today):
    """Visible conditions for a CAR. Closure in another system is never assumed effective."""
    flags = []
    if car.get("status") == "closed" and not car.get("effectiveness_evidence"):
        flags.append("CLOSED WITHOUT EFFECTIVENESS EVIDENCE: do not assume effective")
    due = car.get("due_date")
    if due and car.get("status") != "closed" and datetime.fromisoformat(due).date() < today:
        flags.append("OVERDUE")
    if car.get("recurrence") or car.get("auditor_result") in ("recurring", "ineffective"):
        flags.append("RECURRING OR INEFFECTIVE: raise item risk and sampling")
    if car.get("status") == "closed" and not car.get("auditor_result"):
        flags.append("NO AUDITOR EFFECTIVENESS REVIEW RECORDED")
    return flags
