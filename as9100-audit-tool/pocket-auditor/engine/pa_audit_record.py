"""Audit record: CAR review linked into the write-once audit snapshot.

- car_state: one state per CAR (ACTIVE, CLOSED_EFFECTIVE, CLOSED_PARTIALLY_EFFECTIVE,
  CLOSED_INEFFECTIVE, CLOSED_NOT_VERIFIED). A closure in another system is never treated as effective.
- link_cars: validates each CAR, applies the flags, and checks its requirement link is in the snapshot.
- link_nonconformities: each nonconformity must cite a CAR that exists in the supplied records.
- build_linked_snapshot: one write-once snapshot carrying the rows, the CAR section, the licensed
  source hash (checked against the file on disk) and every blocking issue.
- verify_snapshot: recomputes the file hash so a later change to the file is detected.

A snapshot with blocking issues is still written, because the record of what was known at the time
matters. It is marked ready_for_export: false, and the report and export steps must refuse it.

Standalone. Writes only the one snapshot file, in the directory the caller gives.
"""
import hashlib
import json
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pa_engine import sha256_file, write_snapshot  # noqa: E402
from pa_governance import validate_car_review, car_flags, requirement_id  # noqa: E402
from pa_canonical import reconciliation_gate, select_rows  # noqa: E402
import pa_ledger as lg  # noqa: E402
import pa_qsa as qsa  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


def standard_label(std):
    """Registry label used in requirement IDs, e.g. 'SAE AS9110C'."""
    reg = json.loads((ROOT / "content" / "source-registry.json").read_text(encoding="utf-8"))
    src = reg["sources"].get(std)
    return src["standard"] if src and src.get("standard") else std


def car_state(car):
    if car.get("status") != "closed":
        return "ACTIVE"
    result = car.get("auditor_result")
    if result in ("ineffective", "recurring"):
        return "CLOSED_INEFFECTIVE"
    if result == "partially_effective":
        return "CLOSED_PARTIALLY_EFFECTIVE"
    if result == "effective" and car.get("effectiveness_evidence"):
        return "CLOSED_EFFECTIVE"
    return "CLOSED_NOT_VERIFIED"


def link_cars(cars, snapshot_req_ids, today):
    """Return (car_records, blockers). Invalid or duplicate CARs are blockers, not records."""
    records, blockers, seen = [], [], set()
    for car in cars:
        cid = car.get("car_id") or "<no car_id>"
        errors = validate_car_review(car)
        if errors:
            blockers.append(f"CAR {cid}: " + "; ".join(errors))
            continue
        if car["car_id"] in seen:
            blockers.append(f"CAR {cid}: duplicate car_id in the supplied records")
            continue
        seen.add(car["car_id"])
        if car["linked_requirement"] not in snapshot_req_ids:
            blockers.append(f"CAR {cid}: linked requirement {car['linked_requirement']} is not in the selected rows")
        state = car_state(car)
        flags = car_flags(car, today)
        # the full CAR record is kept, so its problem statement and owner are preserved in the snapshot
        records.append(dict(car, state=state, flags=flags,
                            sampling_expansion_recommended=state == "CLOSED_INEFFECTIVE" or bool(car.get("recurrence"))))
    records.sort(key=lambda r: r["car_id"])
    return records, blockers


def link_nonconformities(nonconformities, car_records):
    """Each nonconformity must cite a CAR that exists and whose linked requirement matches. Returns (links, blockers)."""
    by_id = {c["car_id"]: c for c in car_records}
    links, blockers = [], []
    for nc in nonconformities:
        nid = nc.get("nc_id") or "<no nc_id>"
        if not nc.get("nc_id"):
            blockers.append("nonconformity record missing nc_id")
        cid = nc.get("car_id")
        if not cid:
            blockers.append(f"nonconformity {nid}: missing CAR reference")
            continue
        car = by_id.get(cid)
        if car is None:
            blockers.append(f"nonconformity {nid}: CAR {cid} is not in the supplied CAR records")
            continue
        if nc.get("requirement_id") != car["linked_requirement"]:
            blockers.append(f"nonconformity {nid}: requirement {nc.get('requirement_id')} does not match CAR {cid}")
        links.append({"nc_id": nid, "car_id": cid, "requirement_id": nc.get("requirement_id")})
    return links, blockers


def verify_licensed_source(std, licensed_file=None):
    """Return (recorded_sha256, on_disk_sha256, blockers). The licensed file is read for hashing only."""
    rec = json.loads((ROOT / "content" / "reconciliation" / f"{std}-reconciliation.json").read_text(encoding="utf-8"))
    recorded = rec["licensed_sha256"]
    path = Path(licensed_file) if licensed_file else ROOT / rec["licensed_file"]
    if not path.exists():
        return recorded, None, [f"licensed source not found on disk: {path.name}"]
    on_disk = sha256_file(path)
    blockers = [] if on_disk == recorded else ["licensed source hash on disk differs from the reconciliation record"]
    return recorded, on_disk, blockers


def build_linked_snapshot(audit_id, std, clause_refs, cars, nonconformities, out_dir, version, today,
                          licensed_file=None, audits_root=None):
    """Write one write-once snapshot with the CAR section and the capture records.

    If audits_root is given, the capture records and CARs come from the audit's ledger (verified on read),
    and the ledger head is recorded. Otherwise `cars` is used and no capture records are included.
    Returns {'path', 'sha256', 'ready_for_export', 'blocking_issues'}.
    """
    blockers = []
    gate_ok, gate_reasons = reconciliation_gate(std)
    if not gate_ok:
        blockers += gate_reasons
    rec = json.loads((ROOT / "content" / "reconciliation" / f"{std}-reconciliation.json").read_text(encoding="utf-8"))
    rows = select_rows(std, clause_refs)
    if not rows:
        blockers.append("no rows selected for the clauses given")
    label = standard_label(std)
    req_ids = {requirement_id("STD", label, r["ref"]) for r in rows}
    recorded, on_disk, src_blockers = verify_licensed_source(std, licensed_file)
    blockers += src_blockers
    capture_records, ledger_head, ledger_length = [], None, 0
    qsa_publication = None
    if audits_root is not None:
        entries = lg.read_entries(lg.ledger_path(audits_root, audit_id))
        ledger_errors, ledger_head = lg.verify(entries)
        blockers += [f"capture ledger: {e}" for e in ledger_errors]
        capture_records, ledger_length = entries, len(entries)
        cars = [e["record"] for e in entries if e["record_type"] == "car"]
        ids = {e["id"] for e in entries}
        for e in entries:
            if e["record_type"] == "sampling":
                unknown = [x for x in e["record"].get("evidence_refs", []) if x not in ids]
                if unknown:
                    blockers.append(f"{e['id']} cites {', '.join(unknown)}, which is not in the ledger")
        pubs = [e for e in entries if e["record_type"] == "qsa_publication"]
        if pubs:
            # CARs may link to the audit's published FAA QSA criteria as well as the clause rows
            try:
                start = qsa.start_audit(audits_root, audit_id, qsa.load_checklist())
                req_ids |= {c["criterion_id"] for c in start["criteria"]}
                qsa_publication = {"version": start["version"], "sha256": start["sha256"]}
            except ValueError as exc:
                blockers.append(f"FAA QSA selection: {exc}")
    car_records, car_blockers = link_cars(cars or [], req_ids, today)
    links, nc_blockers = link_nonconformities(nonconformities, car_records)
    blockers += car_blockers + nc_blockers

    counts = {}
    for c in car_records:
        counts[c["state"]] = counts.get(c["state"], 0) + 1
    snap = {
        "record_type": "audit_snapshot_with_car",
        "audit_id": audit_id,
        "standard": std,
        "snapshot_version": version,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "as_of_date": today.isoformat(),
        "licensed_source_sha256": recorded,
        "licensed_source_sha256_on_disk": on_disk,
        "reconciliation_status": rec["status"],
        "clauses_selected": sorted(set(clause_refs), key=lambda r: [int(x) for x in r.split(".")]),
        "rows": rows,
        "car_records": car_records,
        "car_state_counts": counts,
        "nonconformity_links": links,
        "capture_records": capture_records,
        "capture_ledger_head": ledger_head,
        "capture_ledger_length": ledger_length,
        "qsa_publication": qsa_publication,
        "blocking_issues": blockers,
        "ready_for_export": not blockers,
        "status": "IMMUTABLE_SNAPSHOT",
    }
    written = write_snapshot(snap, out_dir, f"{audit_id}-{std}-v{version}-CAR")
    return {"path": written["path"], "sha256": written["sha256"],
            "ready_for_export": not blockers, "blocking_issues": blockers}


def verify_snapshot(path, expected_sha256):
    """True only if the file on disk still has the hash recorded when it was written."""
    return hashlib.sha256(Path(path).read_bytes()).hexdigest() == expected_sha256
