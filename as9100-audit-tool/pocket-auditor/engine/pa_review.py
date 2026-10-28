"""Review and report (Step 5 of the stepper): snapshots and recipient packages, built from the audit ledger.

- take_snapshot: a write-once snapshot of the clauses selected in Scope & Criteria for one standard.
  Refused when no clause of that standard is selected, or when the snapshot is not ready (its blockers are returned).
- latest_snapshot: the newest snapshot file for the audit.
- export_package: the Mike import package (schema v1.0) for one recipient, written under the audit's exports folder.
  Refused when there is no snapshot, or when the package fails its checks.

Standalone; writes only under the audits root given by the caller.
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pa_audit_record as ar  # noqa: E402
import pa_report as pr  # noqa: E402
import pa_export as pe  # noqa: E402
import pa_mike_export as mx  # noqa: E402
import pa_selection as ps  # noqa: E402
import pa_qsa as qsa  # noqa: E402
from pa_engine import load_registry  # noqa: E402

STANDARDS = ("AS9100D", "AS9110C")
SNAPSHOT = re.compile(r"(?P<audit>.+)-(?P<std>AS9100D|AS9110C)-v(?P<v>\d+)-CAR\.json")


def _clause_refs(audits_root, audit_id, standard):
    label = load_registry()["sources"].get(standard, {}).get("standard", standard)
    prefix = f"STD:{label}:"
    selected = set(ps.read_draft(audits_root, audit_id)["selected"])
    refs = []
    for c in ps.catalogue_all(audits_root, audit_id):
        cid = c["criterion_id"]
        if cid in selected and cid.startswith(prefix) and "(" not in c["criteria_ref"]:
            refs.append(c["criteria_ref"])
    return sorted(set(refs), key=lambda r: [int(x) for x in r.split(".")])


def scoped_standards(audits_root, audit_id):
    """The standards with at least one clause selected in Scope & Criteria. No standard is assumed."""
    return [s for s in STANDARDS if _clause_refs(audits_root, audit_id, s)]


def take_snapshot(audits_root, audit_id, standard, today=None):
    if standard not in STANDARDS:
        raise ValueError(f"standard must be one of {', '.join(STANDARDS)}")
    refs = _clause_refs(audits_root, audit_id, standard)
    if not refs:
        raise ValueError(f"no {standard} clause is selected in Scope & Criteria; select at least one clause first")
    folder = Path(audits_root) / audit_id / "snapshots"
    version = len(list(folder.glob(f"{audit_id}-{standard}-v*-CAR.json"))) + 1 if folder.exists() else 1
    result = ar.build_linked_snapshot(audit_id, standard, refs, None, [], folder, version, today or date.today(),
                                      audits_root=audits_root)
    return dict(result, version=version, clauses=refs)


def latest_snapshot(audits_root, audit_id):
    folder = Path(audits_root) / audit_id / "snapshots"
    if not folder.exists():
        return None
    files = [p for p in folder.glob("*-CAR.json") if SNAPSHOT.fullmatch(p.name)]
    if not files:
        return None
    newest = max(files, key=lambda p: int(SNAPSHOT.fullmatch(p.name).group("v")))
    return json.loads(newest.read_text(encoding="utf-8")), newest


def export_package(audits_root, audit_id, recipient, checklist, now):
    latest = latest_snapshot(audits_root, audit_id)
    if latest is None:
        raise ValueError("no snapshot yet: take a snapshot in Review & Report before exporting")
    snap, path = latest
    snapshot_sha = ar.sha256_file(path)
    report = pr.build_report(snap, snapshot_sha, [], pr.evidence_register(snap), [], recipient, now)
    slug = re.sub(r"[^A-Za-z0-9]+", "-", recipient).strip("-").lower()
    pkg = mx.build_audit_package(snap, report, audits_root, audit_id, checklist, recipient,
                                 f"{audit_id}-{slug}", now, registry=load_registry()["sources"])
    out = Path(audits_root) / audit_id / "exports" / slug
    pe.write_export(pkg, out, out)
    ok, reason = pe.verify_export(out)
    if not ok:
        raise ValueError(f"exported package does not verify: {reason}")
    return {"folder": str(out.relative_to(Path(audits_root))), "recipient": recipient,
            "withheld": pkg["sources_withheld_for_licence"], "snapshot_sha256": snapshot_sha,
            "package_sha256": (out / "package.sha256").read_text(encoding="utf-8").split()[0]}
