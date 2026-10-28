"""Audit package for Mike's import (I-1), with the FAA QSA section connected to the v1.0 contract.

The package keeps schema v1.0 exactly: no top-level key is added. The QSA section goes into the existing
keys (checklist_items, assessments, findings, evidence, not_assessed, sources, snapshot).

Licence rule: the FAA QSA source is Burrana-private (ORG_PRIVATE_LICENSED, owner Burrana Inc.).
- For Burrana Inc., the QSA section is included: identifiers, statuses, assessments, findings and evidence IDs.
- For any other recipient, the QSA section is left out entirely and the source is listed in
  sources_withheld_for_licence by pa_export.source_entries.
- Question, procedure, comments and condition text are never exported for any recipient.

Consistency rule: every evidence item that a QSA assessment or finding cites must be in the package evidence,
which comes from the audit snapshot. Record evidence after the snapshot, then take a new snapshot.

Standalone; writes nothing (the caller writes the package with pa_export.write_export).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pa_export as pe  # noqa: E402
import pa_report as pr  # noqa: E402
import pa_qsa_records as qr  # noqa: E402
import pa_qsa as qsa  # noqa: E402
import pa_selection as ps  # noqa: E402
from pa_engine import load_registry  # noqa: E402

FAA_SOURCE_ID = "FAA-QSA-1.0"


def faa_registry_entry(checklist):
    """The FAA source as a registry entry. Burrana-private, so pa_export withholds it from other recipients."""
    d = checklist["data"]
    return {
        "standard": d.get("standard", qsa.STANDARD),
        "edition": "1.0",
        "status": d.get("status"),
        "licence_use": "ORG_PRIVATE_LICENSED",
        "licence_scope_owner": qr.FAA_OWNER,
        "sha256": d.get("source_sha256"),
        "publication_url": None,
        "retrieved_on": None,
        "next_review_due": None,
    }


WITHHELD = "WITHHELD_FOR_LICENCE"
LICENSED_LICENCE_USES = ("ORG_PRIVATE_LICENSED", "CUSTOMER_PRIVATE_LICENSED")


def licensed_prefixes(registry):
    """Requirement-ID prefixes that belong to licensed sources: each private standard, and the FAA QSA source."""
    prefixes = {"REG:" + qsa.STANDARD + ":"}
    for entry in registry.values():
        if entry.get("licence_use") in LICENSED_LICENCE_USES and entry.get("standard"):
            prefixes.add(entry.get("id_prefix") or f"STD:{entry['standard']}:")
    return tuple(sorted(prefixes))


def _withhold_for_recipient(audit, snapshot, registry):
    """Remove licensed-source content for a recipient who is not the owner.

    If the snapshot standard is a licensed source, its checklist rows, not-assessed rows and assessments leave the
    package. Findings and CARs keep their record, but any reference into a licensed source is replaced with a marker.
    Question and condition text were never in the package."""
    prefixes = licensed_prefixes(registry)

    def withheld(value):
        return isinstance(value, str) and value.startswith(prefixes)

    entry = registry.get(snapshot["standard"], {})
    if entry.get("licence_use") in LICENSED_LICENCE_USES:
        audit["checklist_items"] = [i for i in audit["checklist_items"] if not withheld(i.get("requirement_id"))]
        audit["not_assessed"] = []
        audit["assessments"] = []
    for f in audit["findings"]:
        f["requirement_ids"] = [WITHHELD if withheld(r) else r for r in f.get("requirement_ids", [])]
        if withheld(f.get("checklist_item_ref")):
            f["checklist_item_ref"] = WITHHELD
    for car in audit["prior_car_reviews"]:
        if withheld(car.get("linked_requirement")):
            car["linked_requirement"] = WITHHELD
    for ev in audit["evidence"]:
        if withheld(ev.get("requirement_id")):
            ev["requirement_id"] = WITHHELD


def _withhold_customer_rows(audit, registry):
    """Customer-private checklist rows are for the customer only. Other recipients, including the owner, get the
    identifier replaced by the marker and the row removed from checklist_items, assessments and not_assessed."""
    prefixes = tuple(sorted(p for p in licensed_prefixes(registry) if p.startswith("REG:CUSTOMER ")))
    if not prefixes:
        return

    def is_customer(value):
        return isinstance(value, str) and value.startswith(prefixes)
    audit["checklist_items"] = [i for i in audit["checklist_items"] if not is_customer(i.get("requirement_id"))]
    audit["assessments"] = [a for a in audit["assessments"] if not is_customer(a.get("requirement_id"))]
    audit["not_assessed"] = [n for n in audit["not_assessed"] if not is_customer(n.get("requirement_id"))]
    for f in audit["findings"]:
        f["requirement_ids"] = [WITHHELD if is_customer(r) else r for r in f.get("requirement_ids", [])]
        if is_customer(f.get("checklist_item_ref")):
            f["checklist_item_ref"] = WITHHELD


def build_audit_package(snapshot, report, audits_root, audit_id, checklist, recipient_org,
                        export_id, generated_at, registry=None):
    audit = pr.export_audit(snapshot, report)
    reg = dict(registry if registry is not None else load_registry()["sources"])
    reg[FAA_SOURCE_ID] = faa_registry_entry(checklist)
    reg.update(ps.customer_registry_entries())
    if recipient_org == qr.FAA_OWNER:
        q = qr.export_section(audits_root, audit_id, checklist)
        package_evidence = {e["id"] for e in audit["evidence"]}
        missing = sorted({e["id"] for e in q["evidence"]} - package_evidence)
        if missing:
            raise ValueError("QSA items cite evidence not in this snapshot (take a new snapshot): " + ", ".join(missing))
        audit["checklist_items"] = audit["checklist_items"] + q["checklist_items"]
        audit["assessments"] = audit["assessments"] + q["assessments"]
        audit["findings"] = audit["findings"] + q["findings"]
        audit["not_assessed"] = audit["not_assessed"] + q["not_assessed"]
        audit["snapshot"]["qsa_publication"] = q["publication"]
        _withhold_customer_rows(audit, reg)
    else:
        audit["snapshot"]["qsa_publication"] = None
        _withhold_for_recipient(audit, snapshot, reg)
    pkg = pe.build_package(audit, reg, recipient_org, export_id, generated_at, not_assessed=audit["not_assessed"])
    errors = pe.check_package(pkg)
    if errors:
        raise ValueError("package refused: " + "; ".join(errors))
    return pkg
