"""Capture ledger: one append-only, hash-chained file per audit.

Location: <audits_root>/<audit_id>/ledger.jsonl (audits_root defaults to the product folder's audits/).

Each line is an entry:
  seq, id (e.g. CAR-0001), record_type, record (validated, with captured_at),
  record_sha256 (of the canonical record), prev_sha256 (entry hash before it, or 64 zeros),
  entry_sha256 (of the canonical entry without itself).

Edits, deletions, reordering and mid-file insertion break the chain. Truncating the tail is caught when a
snapshot records the ledger head (see check_head).

Every record is validated by the engine before it is written, so the browser checks are never the only check.
Standalone; writes only under the audits root given by the caller.
"""
import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pa_governance import validate_car_review  # noqa: E402
from pa_canonical import validate_interview, validate_sampling  # noqa: E402
from pa_capture import validate_evidence_record, validate_photo_record  # noqa: E402
from pa_vocab import RECORD_TYPE_PREFIX  # noqa: E402
import pa_qsa_rules  # noqa: E402
import pa_setup_rules  # noqa: E402
import pa_planning_rules  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_AUDITS_ROOT = ROOT / "audits"
GENESIS = "0" * 64
AUDIT_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}")


def canonical(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha_text(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def ledger_path(audits_root, audit_id):
    if not AUDIT_ID.fullmatch(audit_id or ""):
        raise ValueError("audit id must start with a letter or digit and use only letters, digits, dot, dash or underscore")
    return Path(audits_root) / audit_id / "ledger.jsonl"


def validate_qsa_publication(rec):
    """A publication commits a selection file to the ledger by its SHA-256. The file must be a published selection."""
    errors = [f"missing field: {k}" for k in ("version", "file", "sha256", "selected_count") if rec.get(k) in (None, "")]
    if rec.get("version") not in (None, "") and (not isinstance(rec["version"], int) or rec["version"] < 1):
        errors.append("version must be a positive integer")
    if rec.get("sha256") and not re.fullmatch(r"[0-9a-f]{64}", str(rec["sha256"])):
        errors.append("sha256 is not a SHA-256 hex digest")
    if rec.get("file") and not str(rec["file"]).startswith("qsa/published-v"):
        errors.append("file must be a published selection under qsa/")
    return errors


def validate_record(record_type, rec):
    if record_type == "car":
        return validate_car_review(rec)
    if record_type == "interview":
        return validate_interview(rec)
    if record_type == "sampling":
        return validate_sampling(rec)
    if record_type == "evidence":
        return validate_evidence_record(rec)
    if record_type == "photo":
        return validate_photo_record(rec)
    if record_type == "qsa_publication":
        return validate_qsa_publication(rec)
    if record_type == "qsa_assessment":
        return pa_qsa_rules.validate_assessment(rec)
    if record_type == "qsa_finding":
        return pa_qsa_rules.validate_finding(rec)
    if record_type == "qsa_finding_classification":
        return pa_qsa_rules.validate_classification(rec)
    if record_type == "audit_setup":
        return pa_setup_rules.validate_setup(rec)
    if record_type == "audit_status":
        return pa_setup_rules.validate_status(rec, None)
    if record_type == "qm_manual":
        return pa_planning_rules.validate_manual(rec)
    if record_type == "qm_exclusion":
        return pa_planning_rules.validate_exclusion(rec)
    if record_type == "qm_exclusion_review":
        return pa_planning_rules.validate_exclusion_review(rec, None)
    if record_type == "qm_review_complete":
        return pa_planning_rules.validate_review_complete(rec, None)
    return ["unknown record type"]


def read_entries(path):
    p = Path(path)
    if not p.exists():
        return []
    entries = []
    with open(p, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                entries.append(json.loads(line))
    return entries


def verify(entries):
    """Return (errors, head). head is the last entry hash, or GENESIS for an empty ledger."""
    errors, prev = [], GENESIS
    for i, e in enumerate(entries, start=1):
        eid = e.get("id", f"entry {i}")
        if e.get("seq") != i:
            errors.append(f"{eid}: sequence break at position {i}")
        if e.get("prev_sha256") != prev:
            errors.append(f"{eid}: chain broken (previous entry hash does not match)")
        if e.get("record_sha256") != sha_text(canonical(e.get("record"))):
            errors.append(f"{eid}: record does not match its hash")
        body = {k: v for k, v in e.items() if k != "entry_sha256"}
        if e.get("entry_sha256") != sha_text(canonical(body)):
            errors.append(f"{eid}: entry does not match its hash")
        prev = e.get("entry_sha256") or prev
    return errors, prev


def check_head(entries, expected_head):
    """A ledger shorter than or different from the head a snapshot recorded has lost entries or changed."""
    _, head = verify(entries)
    if head != expected_head:
        return [f"ledger head {head[:12]} does not match the head recorded in the snapshot {expected_head[:12]}"]
    return []


def append(audits_root, audit_id, record_type, record, now=None):
    """Validate, then append one record. Returns the entry. Refuses if the existing ledger does not verify."""
    if record_type not in RECORD_TYPE_PREFIX:
        raise ValueError("unknown record type")
    errors = validate_record(record_type, record)
    if errors:
        raise ValueError("; ".join(errors))
    path = ledger_path(audits_root, audit_id)
    entries = read_entries(path)
    chain_errors, head = verify(entries)
    if chain_errors:
        raise ValueError("ledger does not verify; nothing appended: " + "; ".join(chain_errors))
    seq = len(entries) + 1
    rec = dict(record, captured_at=now or datetime.now().isoformat(timespec="seconds"))
    entry = {
        "seq": seq,
        "id": f"{RECORD_TYPE_PREFIX[record_type]}-{seq:04d}",
        "record_type": record_type,
        "record": rec,
        "record_sha256": sha_text(canonical(rec)),
        "prev_sha256": head,
    }
    entry["entry_sha256"] = sha_text(canonical(entry))
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8", newline="\n") as f:
        f.write(canonical(entry) + "\n")
    return entry
