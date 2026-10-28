"""Pocket Auditor prototype engine (approval-gated checklist rendering and controls).

Standalone. No QMS, SharePoint, or tenant access. Reads files in this product folder only.

Covers:
  - clause hierarchy (clause > subclause > deeper subclause > lettered paragraph), exact refs
  - source status (approved / proposed / unverified / unavailable / superseded)
  - checklist rendering: always rendered when a source has structure; the audit package
    is APPROVED only when every selected source is approved
  - reconciliation of seed references against the licensed copies
  - applicability: requirements stay applicable unless an approved exclusion covers them
  - N/A decision and evidence validation (required fields are enforced)
  - immutable snapshots (write-once, hash-recorded)
  - user checklist import (hash, metadata, identifiers preserved; import is 'proposed')

Nothing in this module writes standard text or authors requirement text.
"""
import csv
import hashlib
import json
import os
import re
import sys
import tempfile
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pa_governance import licence_gate, requirement_id  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
STATUSES = {"approved", "proposed", "unverified", "unavailable", "superseded"}
EVIDENCE_TYPES = {"document_review", "record_review", "interview", "observation", "photo_file"}
NA_REQUIRED = ["ref", "reason", "qm_section_ref", "evidence_links", "reviewer", "timestamp"]
EVIDENCE_REQUIRED = ["evidence_type", "description", "timestamp", "location", "auditor", "source_ref"]


# ---------- hierarchy -------------------------------------------------------

def parse_ref(ref, ref_style="clause"):
    """Return the level chain for an exact reference.

    ref_style 'clause' (AS9100D, AS9110C: numbered clauses):
        '8.1.1'        -> ['8', '8.1', '8.1.1']
    ref_style 'section' (regulations: the section is the top level, the Part is not a row):
        '145.55(a)(1)' -> ['145.55', '145.55(a)', '145.55(a)(1)']
        '21.137(a)'    -> ['21.137', '21.137(a)']
        '145.A.25(a)'  -> ['145.A.25', '145.A.25(a)']
    """
    base, *_ = re.split(r"(?=\()", ref, maxsplit=1)
    paren = re.findall(r"\([^()]+\)", ref)
    chain = []
    if ref_style == "clause" and re.fullmatch(r"\d+(\.\d+)*", base):
        parts = base.split(".")
        for i in range(1, len(parts) + 1):
            chain.append(".".join(parts[:i]))
    else:
        chain.append(base)
    acc = chain[-1]
    for p in paren:
        acc = acc + p
        chain.append(acc)
    return chain


def parent_of(ref, ref_style="clause"):
    chain = parse_ref(ref, ref_style)
    return chain[-2] if len(chain) > 1 else None


def depth_of(ref, ref_style="clause"):
    return len(parse_ref(ref, ref_style))


# ---------- registry and rendering ------------------------------------------

def load_registry():
    return json.loads((ROOT / "content" / "source-registry.json").read_text(encoding="utf-8"))


def load_rows(source_entry):
    """Return the list of (ref, title_or_None) for a source, from its rows file."""
    path = ROOT / source_entry["rows"]
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data["rows"] if "rows" in data else []
    out = []
    for r in rows:
        if r.get("kind") == "heading":
            continue
        ref = r.get("clause_ref") or r.get("section")
        if ref:
            out.append((ref, r.get("heading_in_standard") or r.get("section_heading") or None))
    # de-duplicate while keeping order
    seen, uniq = set(), []
    for ref, title in out:
        if ref not in seen:
            seen.add(ref)
            uniq.append((ref, title))
    return uniq


def render_checklist(selection, registry, approved_text=None):
    """Render checklist lines for the selected sources.

    selection: list of source ids.
    approved_text: optional {(source_id, ref): question text}, only approved question text.
    Returns {'package_status', 'pending_sources', 'lines'}.
    """
    approved_text = approved_text or {}
    lines, pending = [], []
    for sid in selection:
        src = registry["sources"].get(sid)
        if src is None:
            pending.append({"source": sid, "reason": "unknown source id"})
            continue
        if src["status"] == "unavailable" or not src.get("rows"):
            pending.append({"source": sid, "reason": "unavailable: no approved source supplied"})
            lines.append({"source": sid, "ref": None, "type": "UNAVAILABLE", "source_status": "unavailable",
                          "message": "Upload or import the source to render its checklist."})
            continue
        if src["status"] != "approved":
            pending.append({"source": sid, "reason": f"status '{src['status']}' is not approved"})
        ok, reasons = licence_gate(src)
        if not ok:
            pending.append({"source": sid, "reason": "licence gate: " + "; ".join(reasons)})
        style = src.get("ref_style", "section")
        for ref, title in load_rows(src):
            question = approved_text.get((sid, ref))
            kind = "STD" if src.get("ref_style") == "clause" else "REG"
            lines.append({
                "source": sid,
                "requirement_id": requirement_id(kind, src["standard"], ref),
                "ref": ref,
                "level": depth_of(ref, style),
                "parent": parent_of(ref, style),
                "title": title,
                "type": "approved question" if question else "controlled clause item",
                "question": question,
                "source_status": src["status"],
                "instruction": None if question else "Auditor records the question or evidence request for this item.",
            })
    package_ok = bool(selection) and not pending
    return {
        "package_status": "APPROVED" if package_ok else "DRAFT - NOT FOR AUDIT USE",
        "pending_sources": pending,
        "line_count": len(lines),
        "lines": lines,
    }


# ---------- reconciliation ----------------------------------------------------

def reconcile(register_path, seed_path):
    """Compare seed clause references with the licensed register.

    Returns invalid seed refs (not in the licensed standard) and title differences.
    Nothing is removed or remapped here; each item needs an owner decision.
    """
    reg = json.loads(Path(register_path).read_text(encoding="utf-8"))["sources"]
    seed = json.loads(Path(seed_path).read_text(encoding="utf-8"))["requirements"]
    report = {}
    for code, src in reg.items():
        valid = {c["clause_ref"]: c.get("heading") for c in src["clauses"]}
        rows = [r for r in seed if r["standard_code"] == code]
        invalid = [r["clause_ref"] for r in rows if r["clause_ref"] not in valid]
        title_diff = [{"clause": r["clause_ref"], "seed_title": r["title"], "standard_heading": valid[r["clause_ref"]]}
                      for r in rows if r["clause_ref"] in valid and valid[r["clause_ref"]]
                      and valid[r["clause_ref"]].lower()[:20] != r["title"].lower()[:20]]
        report[code] = {
            "seed_rows": len(rows),
            "invalid_seed_refs": invalid,
            "title_differences": title_diff,
            "status": "UNRESOLVED - owner decision required (remove or remap only with licensed locator)",
        }
    return report


# ---------- applicability and controls --------------------------------------

def validate_na(decision, valid_refs=None):
    """Return a list of errors for an N/A decision. Empty list = valid.

    valid_refs: the set of exact references in the source universe. When given, the decision's
    ref must be in it, so an N/A cannot attach to a reference that does not exist.
    """
    errors = [f"missing field: {k}" for k in NA_REQUIRED if not decision.get(k)]
    if valid_refs is not None and decision.get("ref") and decision["ref"] not in valid_refs:
        errors.append("ref is not in the source universe")
    if decision.get("status") not in (None, "NOT_APPLICABLE"):
        errors.append("status must be NOT_APPLICABLE")
    if decision.get("evidence_links") and not isinstance(decision["evidence_links"], list):
        errors.append("evidence_links must be a list")
    ts = decision.get("timestamp")
    if ts:
        try:
            datetime.fromisoformat(ts)
        except ValueError:
            errors.append("timestamp is not ISO 8601")
    if decision.get("reviewer") and decision.get("reviewer") == decision.get("auditor"):
        errors.append("reviewer must differ from the auditor who recorded the N/A")
    return errors


def is_applicable(ref, approved_exclusions, valid_refs=None):
    """Default: applicable. Not applicable only if an approved, valid exclusion covers the ref."""
    for ex in approved_exclusions:
        if validate_na(ex, valid_refs) == [] and ex.get("approved") is True and ex["ref"] == ref:
            return False
    return True


def validate_evidence(item):
    errors = [f"missing field: {k}" for k in EVIDENCE_REQUIRED if not item.get(k)]
    if item.get("evidence_type") == "photo_file":
        for k in ("file_path", "sha256"):
            if not item.get(k):
                errors.append(f"photo/file evidence requires {k}")
    if item.get("evidence_type") and item["evidence_type"] not in EVIDENCE_TYPES:
        errors.append("unknown evidence_type")
    if item.get("timestamp"):
        try:
            datetime.fromisoformat(item["timestamp"])
        except ValueError:
            errors.append("timestamp is not ISO 8601")
    if item.get("file_path"):
        p = ROOT / item["file_path"]
        if not p.exists():
            errors.append("file_path not found")
        elif item.get("sha256") != sha256_file(p):
            errors.append("sha256 does not match file")
    return errors


# ---------- snapshots and hashing --------------------------------------------

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def write_snapshot(obj, directory, name):
    """Write a write-once JSON snapshot. Refuses to overwrite. Returns the file path and hash."""
    d = Path(directory)
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"{name}.json"
    if path.exists():
        raise FileExistsError(f"snapshot already exists and is immutable: {path.name}")
    body = json.dumps(obj, ensure_ascii=False, sort_keys=True, indent=1)
    # Unique temp name per write: overlapping requests must not share one temp file.
    fd, tmp_name = tempfile.mkstemp(dir=d, prefix=f".{name}-", suffix=".tmp")
    tmp = Path(tmp_name)
    # newline="" stops Windows writing CRLF, so the bytes on disk are exactly the bytes hashed below
    with os.fdopen(fd, "w", encoding="utf-8", newline="") as f:
        f.write(body)
        f.flush()
        os.fsync(f.fileno())
    try:
        os.link(tmp, path)  # fails if the final name exists: write-once, and no partial final file
    finally:
        tmp.unlink(missing_ok=True)
    try:
        shown = str(path.relative_to(ROOT))
    except ValueError:
        shown = str(path)
    return {"path": shown, "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest()}


# ---------- user checklist import (AFAC path) --------------------------------

def import_checklist_csv(csv_path, source_id, uploader, standard_label):
    """Import a user checklist CSV with columns: ref, question (optional).

    Identifiers are preserved exactly. The result is 'proposed' until reviewed and approved.
    Returns (import_record, approved_text_candidates).
    """
    p = Path(csv_path)
    digest = sha256_file(p)
    rows, seen = [], set()
    with open(p, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            ref = (r.get("ref") or "").strip()
            if not ref:
                continue
            if ref in seen:
                raise ValueError(f"duplicate reference in import: {ref}")
            seen.add(ref)
            rows.append({"ref": ref, "question": (r.get("question") or "").strip() or None})
    record = {
        "source_id": source_id,
        "standard": standard_label,
        "file": str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p),
        "sha256": digest,
        "uploader": uploader,
        "imported_at": datetime.now().isoformat(timespec="seconds"),
        "row_count": len(rows),
        "status": "proposed",
        "approved_by": None,
        "approved_at": None,
        "rows": rows,
    }
    return record


# ---------- authored checklist drafts (from the licensed copy) -------------------

def load_authored(source_id):
    """Authored checklist items for a source, if a file exists under content/checklists/.

    Items carry intent, question, evidence and failure modes written from the licensed copy.
    They are drafts until a reviewer approves them (see status in the file).
    """
    path = ROOT / "content" / "checklists" / f"{source_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def render_authored_draft(source_id, registry):
    """Render authored items as draft lines. The package stays DRAFT until the source is approved."""
    src = registry.get(source_id, {})
    data = load_authored(source_id)
    if data is None:
        return {"package_status": "DRAFT - NOT FOR AUDIT USE", "reason": "no authored checklist", "lines": []}
    lines = []
    for it in data["items"]:
        lines.append({
            "source": source_id,
            "requirement_id": requirement_id("STD", src.get("standard", source_id), it["ref"]),
            "ref": it["ref"],
            "level": depth_of(it["ref"], "clause"),
            "type": "group heading (no body text)" if it.get("type") == "group" else "authored draft item",
            "title": it.get("title"),
            "intent": it.get("intent"),
            "question": it.get("question"),
            "evidence": it.get("evidence", []),
            "failure_modes": it.get("failure_modes", []),
            "note": it.get("note"),
            "source_status": "authored_draft",
        })
    return {"package_status": "DRAFT - NOT FOR AUDIT USE",
            "reason": "authored from the licensed copy; awaiting reviewer approval",
            "line_count": len(lines), "lines": lines}
