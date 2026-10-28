"""Audit setup (Step 1) and audit status, recorded in the audit ledger.

- record_setup: writes the setup once. A second setup for the same audit is refused; amendments are not overwritten.
- change_status: moves the audit forward one step (PLANNED → IN_PROGRESS → CONDUCTED → REPORTED → CLOSED). Each change
  is its own ledger record, so the history is kept.
- current_setup / current_status: read from the verified ledger.

Standalone; writes only through the ledger under the audits root given by the caller.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pa_ledger as lg  # noqa: E402
import pa_setup_rules as rules  # noqa: E402


def _verified(audits_root, audit_id):
    entries = lg.read_entries(lg.ledger_path(audits_root, audit_id))
    errors, _ = lg.verify(entries)
    if errors:
        raise ValueError("ledger does not verify: " + "; ".join(errors))
    return entries


def current_setup(audits_root, audit_id):
    setups = [e for e in _verified(audits_root, audit_id) if e["record_type"] == "audit_setup"]
    return setups[-1]["record"] if setups else None


def current_status(audits_root, audit_id):
    entries = _verified(audits_root, audit_id)
    statuses = [e["record"]["status"] for e in entries if e["record_type"] == "audit_status"]
    if statuses:
        return statuses[-1]
    setups = [e["record"]["status"] for e in entries if e["record_type"] == "audit_setup"]
    return setups[-1] if setups else None


def record_setup(audits_root, audit_id, rec, now):
    if rec.get("audit_id") != audit_id:
        raise ValueError("audit_id in the setup must match the audit being set up")
    if current_setup(audits_root, audit_id) is not None:
        raise ValueError("setup already recorded for this audit; it is not overwritten")
    errors = rules.validate_setup(dict(rec, status=rec.get("status") or "PLANNED"))
    if errors:
        raise ValueError("; ".join(e for e in errors if e))
    return lg.append(audits_root, audit_id, "audit_setup", dict(rec, status="PLANNED"), now=now)


def change_status(audits_root, audit_id, status, changed_by, now):
    if current_setup(audits_root, audit_id) is None:
        raise ValueError("record the setup before changing the audit status")
    current = current_status(audits_root, audit_id)
    rec = {"status": status, "changed_by": changed_by, "changed_at": now}
    errors = rules.validate_status(rec, current)
    if errors:
        raise ValueError("; ".join(errors))
    return lg.append(audits_root, audit_id, "audit_status", rec, now=now)
