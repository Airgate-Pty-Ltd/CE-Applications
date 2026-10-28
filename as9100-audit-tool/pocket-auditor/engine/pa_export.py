"""Pocket Auditor export package (I-1) and finding model.

Implements the compatibility contract in MIKE-AUDITS-MODULE-HANDOFF-2026-10-08.md:
- findings keep factual statement, proposed classification and lead classification separate
- lead classification may only be set by a lead auditor who is not the proposer
- export package = JSON + SHA-256 sidecar + evidence manifest
- ORG_PRIVATE_LICENSED source entries leave the package unless the recipient is the owning organization
- no body text of any source is exported; only identifiers, headings and hashes

Standalone. Writes only where the caller points it (inside the product folder for the sample).
"""
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pa_governance import requirement_id  # noqa: E402

PACKAGE_VERSION = "1.0"
FINDING_CLASSES = {"MAJOR_NC", "MINOR_NC", "OBSERVATION", "OFI"}
FINDING_STATUSES = {"DRAFT", "SUBMITTED", "CLASSIFIED", "CLOSED"}
# The v1.0 contract (docs/MIKE-HANDOFF-PACKAGE.md §2, authoritative). Nineteen required top-level keys.
# sources_withheld_for_licence lists the IDs of sources left out for the recipient, so the recipient
# knows what it has not received. It is required even when the list is empty.
PACKAGE_REQUIRED = [
    "package_version", "export_id", "audit_id", "organization", "generated_at",
    "audit", "sources", "sources_withheld_for_licence", "manual", "checklist_items", "assessments", "evidence",
    "interviews", "sampling", "findings", "prior_car_reviews", "snapshot",
    "unresolved_items", "not_assessed",
]
# Fields that may never appear in an export (they would carry source body text)
FORBIDDEN_KEYS = {"body", "body_text", "clause_text", "verbatim", "rows"}


def validate_finding(f):
    """Return a list of errors. Factual statement and classifications are checked separately."""
    errors = []
    for k in ("id", "audit_id", "checklist_item_ref", "statement", "proposed_by", "status"):
        if not f.get(k):
            errors.append(f"missing field: {k}")
    if f.get("status") and f["status"] not in FINDING_STATUSES:
        errors.append("unknown status")
    reqs = f.get("requirement_ids") or []
    if not reqs:
        errors.append("finding must link at least one requirement")
    for r in reqs:
        parts = r.split(":", 2)
        if len(parts) != 3 or parts[0] not in ("STD", "REG") or not parts[2]:
            errors.append(f"requirement id not in STD:/REG: format: {r}")
    if not (f.get("evidence_ids") or []):
        errors.append("finding must link at least one evidence record")
    pc = f.get("proposed_classification")
    if pc is not None and pc not in FINDING_CLASSES:
        errors.append("unknown proposed_classification")
    lc = f.get("lead_classification")
    if lc is not None:
        if lc not in FINDING_CLASSES:
            errors.append("unknown lead_classification")
        if not f.get("lead_classified_by"):
            errors.append("lead classification needs lead_classified_by")
        elif f["lead_classified_by"] == f.get("proposed_by"):
            errors.append("lead classifier must differ from the proposer")
        if f.get("lead_role") != "LEAD_AUDITOR":
            errors.append("only a LEAD_AUDITOR may set lead classification")
    return errors


def set_lead_classification(f, classification, lead_name, role, timestamp):
    if role != "LEAD_AUDITOR":
        raise ValueError("only a LEAD_AUDITOR may classify a finding")
    if lead_name == f.get("proposed_by"):
        raise ValueError("lead classifier must differ from the proposer")
    if classification not in FINDING_CLASSES:
        raise ValueError("unknown classification")
    datetime.fromisoformat(timestamp)
    f.update({"lead_classification": classification, "lead_classified_by": lead_name,
              "lead_role": role, "lead_classified_at": timestamp, "status": "CLASSIFIED"})
    return f


def source_entries(registry, recipient_org):
    """Source metadata for the package. Excludes ORG_PRIVATE sources not owned by the recipient."""
    out, excluded = [], []
    for sid, s in registry.items():
        use = s.get("licence_use")
        if use in ("ORG_PRIVATE_LICENSED", "CUSTOMER_PRIVATE_LICENSED") and s.get("licence_scope_owner") != recipient_org:
            excluded.append(sid)
            continue
        out.append({
            "source_id": sid,
            "standard": s.get("standard"),
            "edition": s.get("edition"),
            "status": s.get("status"),
            "licence_use": use,
            "licence_scope_owner": s.get("licence_scope_owner"),
            "sha256": s.get("sha256"),
            "publication_url": s.get("publication_url"),
            "retrieved_on": s.get("retrieved_on"),
            "next_review_due": s.get("next_review_due"),
        })
    return out, excluded


def build_package(audit, registry, recipient_org, export_id, generated_at, not_assessed=None):
    sources, excluded = source_entries(registry, recipient_org)
    manual = audit.get("manual") or {}
    pkg = {
        "package_version": PACKAGE_VERSION,
        "export_id": export_id,
        "audit_id": audit["id"],
        "organization": recipient_org,
        "generated_at": generated_at,
        "audit": {k: audit.get(k) for k in ("type", "objective", "criteria", "team", "dates") if k in audit},
        "sources": sources,
        "sources_withheld_for_licence": excluded,
        "manual": {k: manual.get(k) for k in ("sha256", "source_class", "status", "uploaded_on", "reviewed_on", "reviewed_by")},
        "checklist_items": audit.get("checklist_items", []),
        "assessments": audit.get("assessments", []),
        "evidence": audit.get("evidence", []),
        "interviews": audit.get("interviews", []),
        "sampling": audit.get("sampling", []),
        "findings": audit.get("findings", []),
        "prior_car_reviews": audit.get("prior_car_reviews", []),
        "snapshot": audit.get("snapshot", {}),
        "unresolved_items": audit.get("unresolved_items", []),
        "not_assessed": not_assessed or audit.get("not_assessed", []),
    }
    return pkg


def check_package(pkg):
    """Structural checks used by tests and by the importing module before it accepts a package."""
    errors = [f"missing top-level key: {k}" for k in PACKAGE_REQUIRED if k not in pkg]
    def walk(o, path=""):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in FORBIDDEN_KEYS:
                    errors.append(f"forbidden key (may carry source text): {path}{k}")
                walk(v, f"{path}{k}.")
        elif isinstance(o, list):
            for i, v in enumerate(o):
                walk(v, f"{path}{i}.")
    walk(pkg)
    for f in pkg.get("findings", []):
        errors += [f"finding {f.get('id')}: {e}" for e in validate_finding(f)]
    return errors


def write_export(pkg, out_dir, evidence_root):
    """Write package JSON, its SHA-256 sidecar, and an evidence manifest with per-file hashes."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    body = json.dumps(pkg, ensure_ascii=False, sort_keys=True, indent=1)
    raw = body.encode("utf-8")  # write the exact bytes that are hashed (no OS newline conversion)
    (out / "package.json").write_bytes(raw)
    digest = hashlib.sha256(raw).hexdigest()
    (out / "package.sha256").write_text(f"{digest}  package.json\n", encoding="utf-8")
    manifest = []
    root = Path(evidence_root)
    for ev in pkg.get("evidence", []):
        fp = ev.get("file_path")
        if not fp:
            continue
        p = root / fp
        manifest.append({"evidence_id": ev.get("id"), "file": fp,
                         "sha256": hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None,
                         "present": p.exists()})
    (out / "evidence-manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    return {"package_sha256": digest, "files": ["package.json", "package.sha256", "evidence-manifest.json"]}


def verify_export(out_dir):
    """Re-hash package.json and compare with the sidecar. Returns (ok, reason)."""
    out = Path(out_dir)
    body = (out / "package.json").read_bytes()
    recorded = (out / "package.sha256").read_text(encoding="utf-8").split()[0]
    if hashlib.sha256(body).hexdigest() != recorded:
        return False, "package.json does not match package.sha256"
    return True, None
