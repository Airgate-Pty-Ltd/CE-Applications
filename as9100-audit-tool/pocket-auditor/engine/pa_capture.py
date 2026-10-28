"""Capture records for CAR review, interviews, sampling and photos.

Data layer only. There is no capture screen yet. Each function validates and returns a record, or
raises ValueError listing every problem. Nothing is written to disk here.

Photos are recorded by SHA-256 and metadata. The image file itself is not copied, so no file is
written outside its source location.
"""
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pa_engine import sha256_file, EVIDENCE_REQUIRED  # noqa: E402
from pa_governance import validate_car_review, car_flags  # noqa: E402
from pa_canonical import validate_interview, validate_sampling  # noqa: E402
from pa_vocab import EVIDENCE_RECORD_TYPES  # noqa: E402

PHOTO_REQUIRED = ["caption", "what_it_proves", "area_or_location", "auditor", "timestamp", "requirement_id"]
# A photo record in the ledger also carries the file name and hash the browser computed.
PHOTO_RECORD_REQUIRED = PHOTO_REQUIRED + ["file_name", "sha256"]
SHA256_HEX = re.compile(r"[0-9a-f]{64}")


def _raise(errors):
    if errors:
        raise ValueError("; ".join(errors))


def capture_interview(rec):
    _raise(validate_interview(rec))
    return dict(rec, record_type="interview", captured_at=datetime.now().isoformat(timespec="seconds"))


def capture_sampling(rec):
    _raise(validate_sampling(rec))
    return dict(rec, record_type="sampling", captured_at=datetime.now().isoformat(timespec="seconds"))


def capture_photo(path, rec):
    """Record a photo by hash. The file must exist; it is not copied."""
    p = Path(path)
    if not p.exists():
        raise ValueError(f"photo file not found: {p.name}")
    errors = [f"missing field: {k}" for k in PHOTO_REQUIRED if not rec.get(k)]
    if rec.get("timestamp"):
        try:
            datetime.fromisoformat(rec["timestamp"])
        except ValueError:
            errors.append("timestamp is not ISO 8601")
    _raise(errors)
    return dict(rec, record_type="photo", file_name=p.name, sha256=sha256_file(p), evidence_type="photo_file")


def _iso_error(value, name):
    try:
        datetime.fromisoformat(value)
        return []
    except (TypeError, ValueError):
        return [f"{name} is not ISO 8601"]


def validate_evidence_record(rec):
    """Errors for a generic evidence record. Photos use the photo record, so photo_file is refused here."""
    errors = [f"missing field: {k}" for k in EVIDENCE_REQUIRED if not rec.get(k)]
    if rec.get("evidence_type") and rec["evidence_type"] not in EVIDENCE_RECORD_TYPES:
        errors.append("evidence_type not recognised")
    if rec.get("timestamp"):
        errors += _iso_error(rec["timestamp"], "timestamp")
    if "file_path" in rec:
        errors.append("evidence records do not take a file path; files are captured as photo records")
    return errors


def validate_photo_record(rec):
    """Errors for a photo record: metadata, the browser-computed SHA-256 and the file name. No file is read."""
    errors = [f"missing field: {k}" for k in PHOTO_RECORD_REQUIRED if not rec.get(k)]
    if rec.get("timestamp"):
        errors += _iso_error(rec["timestamp"], "timestamp")
    if rec.get("sha256") and not SHA256_HEX.fullmatch(rec["sha256"]):
        errors.append("sha256 is not a SHA-256 hex digest")
    return errors


def capture_car_review(rec, today):
    errors = validate_car_review(rec)
    _raise(errors)
    flags = car_flags(rec, today)
    return dict(rec, record_type="car_review", flags=flags, captured_at=datetime.now().isoformat(timespec="seconds"))
