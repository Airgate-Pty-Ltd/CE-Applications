"""FAA QSA criterion selection, publication and Start Audit.

Source: content/faa-qsa/faa-qsa-audit-checklist-1.0.json (imported from the Burrana-owned workbook; licence
scope BURRANA_PRIVATE_SOURCE). The 126 source rows (114 criteria, 12 system-description rows) are never changed here.

Identity: a criterion is (source_sheet, criteria_ref). The reference alone is not unique (each system element
has its own "1" and "2" description rows), so the sheet is part of the ID:
    REG:FAA QSA 1.0:<source_sheet>:<criteria_ref>

Auditor additions carry their own ID (REG:FAA QSA 1.0 ADDITIONAL:ADD-0001), origin ADDED_BY_AUDITOR, a
citation for their source, and never overwrite a source row.

Workflow:
- selection (draft, mutable): select / clear / select all / clear all, per element or across elements
- publication: refused when nothing is selected. Writes a write-once snapshot holding only the selected
  criteria, then records the file's SHA-256 in the capture ledger (record type qsa_publication).
- Start Audit: reads the latest publication from the ledger, checks the file against the ledger hash, and
  returns the published criteria. Draft edits after publication do not change the audit.

Standalone; writes only under the audits root given by the caller.
"""
import hashlib
import json
import os
import re
import sys
import tempfile
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pa_engine import sha256_file, write_snapshot  # noqa: E402
from pa_governance import requirement_id  # noqa: E402
import pa_ledger as lg  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CHECKLIST = ROOT / "content" / "faa-qsa" / "faa-qsa-audit-checklist-1.0.json"
SCHEMA = "pocket-auditor.source-checklist.v1"
STANDARD = "FAA QSA 1.0"
ADDITIONAL_STANDARD = "FAA QSA 1.0 ADDITIONAL"
ADDITIONAL_SHEET = "ADDITIONAL"
EXPECTED_COUNT = 126
ACTIONS = ("select", "clear", "select_all", "clear_all")
ADDITION_LABEL = re.compile(r"ADD-\d{4}")


# ---------- source ----------------------------------------------------------

def load_checklist(path=DEFAULT_CHECKLIST):
    """Load and check the imported checklist. Returns {'data', 'file_sha256', 'criteria'}; criteria carry IDs."""
    raw = Path(path).read_bytes()
    data = json.loads(raw.decode("utf-8"))
    errors = []
    if data.get("schema") != SCHEMA:
        errors.append("unexpected schema")
    rows = data.get("criteria", [])
    if len(rows) != EXPECTED_COUNT or data.get("criteria_count") != EXPECTED_COUNT:
        errors.append(f"expected {EXPECTED_COUNT} criteria, found {len(rows)}")
    seen, criteria = set(), []
    for r in rows:
        sheet = str(r.get("source_sheet", "")).strip()
        ref = str(r.get("criteria_ref", "")).strip()
        cid = requirement_id("REG", STANDARD, f"{sheet}:{ref}")
        if cid in seen:
            errors.append(f"duplicate criterion {cid}")
        seen.add(cid)
        criteria.append(dict(r, source_sheet=sheet, criteria_ref=ref, criterion_id=cid,
                             origin="FAA_SOURCE", source_sha256=data.get("source_sha256"),
                             kind=r.get("kind", "CRITERION")))
    if errors:
        raise ValueError("; ".join(errors))
    return {"data": data, "file_sha256": hashlib.sha256(raw).hexdigest(), "criteria": criteria,
            "element_context": data.get("element_context", [])}


def elements(criteria):
    """System elements in source order, with counts. Trailing spaces in sheet names are already removed."""
    order, counts = [], {}
    for c in criteria:
        s = c["source_sheet"]
        if s not in counts:
            order.append(s)
            counts[s] = 0
        counts[s] += 1
    return [{"element": s, "count": counts[s]} for s in order]


def filter_criteria(criteria, element=None, text=None):
    out = criteria
    if element:
        out = [c for c in out if c["source_sheet"] == element]
    if text:
        t = text.lower()
        out = [c for c in out if t in c["question"].lower() or t in c["criteria_ref"].lower()]
    return out


# ---------- draft (mutable working selection) --------------------------------

def _draft_path(audits_root, audit_id):
    return lg.ledger_path(audits_root, audit_id).parent / "qsa" / "draft.json"


def read_draft(audits_root, audit_id):
    p = _draft_path(audits_root, audit_id)
    if not p.exists():
        return {"selected": [], "additions": []}
    return json.loads(p.read_text(encoding="utf-8"))


def write_draft(audits_root, audit_id, draft):
    """Overwrites the working draft atomically. The draft is not evidence; publications are."""
    p = _draft_path(audits_root, audit_id)
    p.parent.mkdir(parents=True, exist_ok=True)
    # Unique temp name per write: two overlapping requests must not share one temp file.
    fd, tmp_name = tempfile.mkstemp(dir=p.parent, prefix=".draft-", suffix=".tmp")
    tmp = Path(tmp_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(draft, ensure_ascii=False, sort_keys=True, indent=1))
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, p)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def add_additional(draft, label, question, source_citation, when):
    """Return a new draft with an auditor addition. It is marked and sourced; it cannot replace a source row."""
    if not ADDITION_LABEL.fullmatch(label or ""):
        raise ValueError("addition label must look like ADD-0001")
    if not (question or "").strip():
        raise ValueError("addition needs a question")
    if not (source_citation or "").strip():
        raise ValueError("addition needs a source citation")
    cid = requirement_id("REG", ADDITIONAL_STANDARD, label)
    if any(a["criterion_id"] == cid for a in draft["additions"]):
        raise ValueError(f"addition {label} already exists")
    addition = {"criterion_id": cid, "label": label, "question": question.strip(),
                "source_citation": source_citation.strip(), "added_at": when}
    return dict(draft, additions=draft["additions"] + [addition])


def catalogue(checklist, draft):
    """All criteria the auditor can select: FAA source rows, then additions (marked separately)."""
    extra = [{"criterion_id": a["criterion_id"], "source_sheet": ADDITIONAL_SHEET, "criteria_ref": a["label"],
              "question": a["question"], "procedure": "", "comments": "", "status": "PROPOSED_ADDITION",
              "applicability": "UNDECIDED", "assessment": "NOT_ASSESSED", "evidence_ids": [], "finding_id": None,
              "condition_text": [], "origin": "ADDED_BY_AUDITOR", "source_citation": a["source_citation"],
              "source_sha256": None}
             for a in draft["additions"]]
    return checklist["criteria"] + extra


def apply_action(draft, cat, action, ids=None, element=None):
    """Return the new list of selected IDs. Unknown IDs are refused, so a typo cannot select nothing silently."""
    if action not in ACTIONS:
        raise ValueError(f"unknown action {action}")
    known = {c["criterion_id"] for c in cat}
    selected = set(draft["selected"])
    if action in ("select", "clear"):
        if not ids:
            raise ValueError(f"{action} needs at least one criterion")
        targets = list(ids)
    else:
        scope = [c for c in cat if not element or c["source_sheet"] == element]
        if element and not scope:
            raise ValueError(f"unknown system element: {element}")
        targets = [c["criterion_id"] for c in scope]
    unknown = [t for t in targets if t not in known]
    if unknown:
        raise ValueError("unknown criterion: " + ", ".join(unknown))
    if action in ("select", "select_all"):
        selected |= set(targets)
    else:
        selected -= set(targets)
    return dict(draft, selected=sorted(selected))


# ---------- publication and Start Audit --------------------------------------

def _publications(entries):
    return [e for e in entries if e["record_type"] == "qsa_publication"]


def _verified_entries(audits_root, audit_id):
    entries = lg.read_entries(lg.ledger_path(audits_root, audit_id))
    errors, _ = lg.verify(entries)
    if errors:
        raise ValueError("ledger does not verify: " + "; ".join(errors))
    return entries


def _snapshot_criterion(c):
    keep = ("criterion_id", "source_sheet", "criteria_ref", "kind", "question", "procedure", "comments", "status",
            "applicability", "assessment", "evidence_ids", "finding_id", "condition_text", "origin",
            "source_sha256", "source_citation")
    return {k: c.get(k) for k in keep}


def publish(audits_root, audit_id, checklist, now=None):
    """Publish the selected criteria as a new write-once version. Refused when nothing is selected."""
    root = Path(audits_root)
    draft = read_draft(root, audit_id)
    cat = catalogue(checklist, draft)
    chosen = set(draft["selected"])
    selected = [c for c in cat if c["criterion_id"] in chosen]
    if not selected:
        raise ValueError("nothing selected: publication refused")
    entries = _verified_entries(root, audit_id)
    version = len(_publications(entries)) + 1
    stamp = now or datetime.now().isoformat(timespec="seconds")
    by_element = {}
    for c in selected:
        by_element[c["source_sheet"]] = by_element.get(c["source_sheet"], 0) + 1
    body = {
        "record_type": "qsa_selection",
        "audit_id": audit_id,
        "version": version,
        "published_at": stamp,
        "source": {"standard": STANDARD, "file": "content/faa-qsa/faa-qsa-audit-checklist-1.0.json",
                   "file_sha256": checklist["file_sha256"], "xlsx_source_sha256": checklist["data"]["source_sha256"],
                   "licence_scope": checklist["data"]["licence_scope"], "status": checklist["data"]["status"]},
        "selected_count": len(selected),
        "by_element": by_element,
        "criteria": [_snapshot_criterion(c) for c in selected],
        "element_context": checklist.get("element_context", []),
    }
    rel = f"qsa/published-v{version}.json"
    written = write_snapshot(body, root / audit_id / "qsa", f"published-v{version}")
    sha = written["sha256"]
    lg.append(root, audit_id, "qsa_publication",
              {"version": version, "file": rel, "sha256": sha, "selected_count": len(selected)}, now=stamp)
    return {"version": version, "file": rel, "sha256": sha, "selected_count": len(selected)}


def start_audit(audits_root, audit_id, checklist):
    """The criteria for the audit: the latest published selection, checked against the ledger hash."""
    root = Path(audits_root)
    entries = _verified_entries(root, audit_id)
    pubs = _publications(entries)
    if not pubs:
        raise ValueError("no published selection: publish a selection before starting the audit")
    last = pubs[-1]["record"]
    path = root / audit_id / last["file"]
    if not path.exists():
        raise ValueError("published selection file is missing")
    actual = sha256_file(path)
    if actual != last["sha256"]:
        raise ValueError("published selection does not match the ledger (changed or replaced)")
    snap = json.loads(path.read_bytes().decode("utf-8"))
    return {
        "version": last["version"],
        "sha256": actual,
        "criteria": snap["criteria"],
        "source_changed_since_publication": (snap["source"].get("file_sha256") is not None
                                             and snap["source"]["file_sha256"] != checklist["file_sha256"]),
    }


def export_section(start):
    """Criteria for the export package: references, source, applicability, assessment, finding and evidence fields.
    Question, procedure, comments and condition text are never exported."""
    keys = ("criterion_id", "source_sheet", "criteria_ref", "kind", "origin", "status", "applicability", "assessment",
            "finding_id", "evidence_ids", "source_sha256", "source_citation")
    return {"version": start["version"], "sha256": start["sha256"],
            "criteria": [{k: c.get(k) for k in keys} for c in start["criteria"]]}
