"""Quality-manual-first workflow and audit-lock gate.

Vertical flow:
  import manual (hash, metadata)
  -> extract stated exclusions as PROPOSED decisions (exact refs checked against the source universe)
  -> reviewer accepts / rejects / amends each proposal (reviewer must differ from proposer)
  -> complete manual review
  -> audit-lock gate: allowed only when the manual review is complete, every exclusion is resolved
     and valid, every selected source is approved with a licence gate pass and a current review cycle

Manuals are classed SYNTHETIC_FIXTURE (testing only) or CUSTOMER_UPLOAD. A synthetic manual is
always labelled and is never presented as a customer or regulatory source.

Standalone. Reads and writes only inside the product folder (via callers).
"""
import re
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pa_engine import sha256_file, validate_na  # noqa: E402
from pa_governance import licence_gate  # noqa: E402

EXCL_RE = re.compile(r"^EXCLUSION\s+(\S+)\s*\|\s*(.+?)\s*\|\s*(.+)$")
MANUAL_CLASSES = {"SYNTHETIC_FIXTURE", "CUSTOMER_UPLOAD"}
REVIEW_ACTIONS = {"accept", "reject", "amend"}


def import_manual(path, uploader, source_class, uploaded_on):
    if source_class not in MANUAL_CLASSES:
        raise ValueError(f"source_class must be one of {sorted(MANUAL_CLASSES)}")
    if not uploader:
        raise ValueError("uploader required")
    datetime.fromisoformat(uploaded_on)
    p = Path(path)
    label = ("SYNTHETIC - FOR PRODUCT TESTING ONLY - NOT A CUSTOMER MANUAL"
             if source_class == "SYNTHETIC_FIXTURE" else "CUSTOMER QUALITY MANUAL")
    return {
        "file": str(p),
        "sha256": sha256_file(p),
        "bytes": p.stat().st_size,
        "uploader": uploader,
        "uploaded_on": uploaded_on,
        "source_class": source_class,
        "label": label,
        "status": "uploaded_unreviewed",   # -> reviewed only via complete_manual_review()
    }


def extract_exclusions(text, valid_refs, manual):
    """Turn 'EXCLUSION <ref> | <QM section> | <reason>' lines into PROPOSED decisions.

    A reference outside the source universe is kept visible with status invalid_ref and reported.
    Nothing is silently dropped.
    """
    proposals, errors = [], []
    for n, line in enumerate(text.splitlines(), 1):
        m = EXCL_RE.match(line.strip())
        if not m:
            continue
        ref, section, reason = m.group(1), m.group(2), m.group(3)
        status = "proposed" if ref in valid_refs else "invalid_ref"
        if status == "invalid_ref":
            errors.append(f"line {n}: reference {ref} is not in the source universe")
        proposals.append({
            "id": f"PX-{len(proposals) + 1:03d}",
            "ref": ref,
            "qm_section_ref": section,
            "reason": reason,
            "source_line": n,
            "manual_sha256": manual["sha256"],
            "proposed_by": "system-extraction",
            "status": status,
            "reviewer": None,
            "timestamp": None,
            "note": None,
        })
    return proposals, errors


def review_exclusion(prop, action, reviewer, timestamp, amended=None, note=None):
    """Auditor decision on one proposal. Reviewer must differ from the proposer."""
    if action not in REVIEW_ACTIONS:
        raise ValueError("action must be accept, reject or amend")
    if prop["status"] != "proposed":
        raise ValueError(f"only proposed items can be reviewed (status is {prop['status']})")
    if not reviewer or reviewer == prop["proposed_by"]:
        raise ValueError("reviewer required and must differ from the proposer")
    datetime.fromisoformat(timestamp)
    prop["reviewer"] = reviewer
    prop["timestamp"] = timestamp
    if action == "accept":
        prop["status"] = "accepted"
    elif action == "reject":
        if not note:
            raise ValueError("rejection needs a note")
        prop["status"] = "rejected"
        prop["note"] = note
    else:  # amend
        if not amended or not note:
            raise ValueError("amendment needs amended fields and a note")
        allowed = {"ref", "qm_section_ref", "reason"}
        if set(amended) - allowed:
            raise ValueError(f"only {sorted(allowed)} can be amended")
        prop.update(amended)
        prop["status"] = "accepted_amended"
        prop["note"] = note
    return prop


def approved_exclusions(props, valid_refs, manual):
    """Accepted proposals as N/A-style records. Each must pass validate_na with its manual basis."""
    out, errors = [], []
    for p in props:
        if p["status"] not in ("accepted", "accepted_amended"):
            continue
        rec = {
            "id": p["id"],
            "ref": p["ref"],
            "status": "NOT_APPLICABLE",
            "reason": p["reason"],
            "qm_section_ref": p["qm_section_ref"],
            "evidence_links": [f"{manual['file']} (sha256 {manual['sha256']})"],
            "reviewer": p["reviewer"],
            "auditor": p["proposed_by"],
            "timestamp": p["timestamp"],
            "approved": True,
        }
        errs = validate_na(rec, valid_refs)
        if errs:
            errors.append((p["id"], errs))
        else:
            out.append(rec)
    return out, errors


def complete_manual_review(manual, props, reviewer, timestamp):
    """Mark the manual reviewed only when no proposal is left open."""
    if manual["status"] != "uploaded_unreviewed":
        raise ValueError("manual review already recorded")
    open_items = [p["id"] for p in props if p["status"] in ("proposed", "invalid_ref")]
    if open_items:
        raise ValueError(f"open exclusion items: {open_items}")
    if not reviewer or reviewer == manual["uploader"]:
        raise ValueError("manual reviewer must differ from the uploader")
    datetime.fromisoformat(timestamp)
    manual.update({"status": "reviewed", "reviewed_by": reviewer, "reviewed_on": timestamp})
    return manual


def review_due(source, today):
    """Return (ok, reason). A source needs a recorded review and a next due date not yet passed."""
    nxt = source.get("next_review_due")
    if not nxt:
        return False, "review cycle not started (no next_review_due)"
    if date.fromisoformat(nxt) < today:
        return False, f"review overdue since {nxt}"
    return True, None


def audit_lock_gate(audit, registry, valid_refs_by_source, today):
    """Return (allowed, reasons). Lock is refused for any unmet condition."""
    reasons = []
    manual = audit.get("manual")
    if not manual:
        reasons.append("no quality manual recorded")
    elif manual.get("status") != "reviewed":
        reasons.append("quality manual review not complete")
    props = audit.get("exclusions", [])
    open_items = [p["id"] for p in props if p["status"] in ("proposed", "invalid_ref")]
    if open_items:
        reasons.append(f"unresolved exclusion items: {open_items}")
    sources = audit.get("sources", [])
    if not sources:
        reasons.append("no sources selected")
    for sid in sources:
        src = registry.get(sid)
        if src is None:
            reasons.append(f"{sid}: unknown source")
            continue
        if src.get("status") != "approved":
            reasons.append(f"{sid}: status '{src.get('status')}' is not approved")
        ok, why = licence_gate(src)
        if not ok:
            reasons.append(f"{sid}: licence gate: " + "; ".join(why))
        ok, why = review_due(src, today)
        if not ok:
            reasons.append(f"{sid}: {why}")
    if manual:
        valid = set().union(*valid_refs_by_source.values()) if valid_refs_by_source else set()
        _, errs = approved_exclusions([p for p in props if p["status"] in ("accepted", "accepted_amended")], valid, manual)
        for pid, es in errs:
            reasons.append(f"exclusion {pid} invalid: " + "; ".join(es))
    return (not reasons, reasons)
