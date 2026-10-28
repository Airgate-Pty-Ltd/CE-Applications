"""Multi-source selection: one draft and one write-once publication across FAA QSA criteria, AS9100D/AS9110C
checklist rows and customer checklists.

Sources and identities:
- FAA QSA 1.0 criteria:        REG:FAA QSA 1.0:<system element>:<ref>            (pa_qsa.load_checklist)
- Standard checklist rows:     STD:SAE AS9100D:<ref> / STD:SAE AS9110C:<ref>      (content/checklists/<std>.json)
- Customer checklist rows:     REG:CUSTOMER <customer id>:<ref>                   (content/customers/<id>/checklist.json)
- Auditor additions:           REG:FAA QSA 1.0 ADDITIONAL:ADD-NNNN                 (pa_qsa)

Publication reuses the write-once snapshot and the ledger record (qsa_publication), so pa_qsa.start_audit and the
record functions work unchanged. A publication lists every source it used with its hash.
Standalone; writes only under the audits root and the customer folder when importing.
"""
import csv
import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pa_qsa as qsa  # noqa: E402
import pa_ledger as lg  # noqa: E402
from pa_engine import write_snapshot, sha256_file, load_registry  # noqa: E402
from pa_governance import requirement_id  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CHECKLISTS = ROOT / "content" / "checklists"
CUSTOMERS = ROOT / "content" / "customers"
STANDARD_SOURCES = ("AS9100D", "AS9110C")
CUSTOMER_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}")


# ---------- source catalogues ------------------------------------------------

_SHA_CACHE = {}


def _file_sha(path):
    key = (str(path), path.stat().st_mtime)
    if key not in _SHA_CACHE:
        _SHA_CACHE[key] = sha256_file(path)
    return _SHA_CACHE[key]


def standard_criteria(std):
    """Clause and lettered rows of an authored standard checklist (groups are headings and are not selectable)."""
    registry = load_registry()["sources"]
    label = registry.get(std, {}).get("standard", std)
    data = json.loads((CHECKLISTS / f"{std}.json").read_text(encoding="utf-8"))
    out = []
    for r in data["items"]:
        if r.get("type") == "group":
            continue
        out.append({
            "criterion_id": requirement_id("STD", label, r["ref"]),
            "source_sheet": std, "criteria_ref": r["ref"], "kind": "STANDARD_ROW",
            "question": r.get("question") or "", "procedure": "", "comments": "",
            "status": r.get("wording_status") or "AUTHORED", "applicability": "UNDECIDED",
            "assessment": "NOT_ASSESSED", "evidence_ids": [], "finding_id": None,
            "condition_text": [], "origin": "STANDARD_CHECKLIST", "source_citation": None,
            "source_sha256": _file_sha(CHECKLISTS / f"{std}.json"), "source_label": label,
            "evidence_prompts": r.get("evidence") or [], "locator": r.get("source_locator"),
            "licence_owner": "Burrana Inc.", "licence_use": "ORG_PRIVATE_LICENSED",
        })
    return out


REGULATOR_EXTRACTS = (
    ("content/rows-faa-14cfr-145.json", "14 CFR Part 145"),
    ("content/rows-faa-14cfr-21.json", "14 CFR Part 21"),
    ("content/rows-easa-part145.json", "Reg. (EU) 1321/2014 Annex II"),
    ("content/rows-easa-part21.json", "Reg. (EU) 748/2012 Annex I"),
    ("content/rows-uk-part145.json", "UK retained Reg. (EU) 1321/2014 Annex II"),
    ("content/rows-caac-maint-org.json", "CAAC CCAR-145-R4 (MOT Order 8/2022)"),
)
_REG_CACHE = {}


def regulator_criteria():
    """Regulator requirement rows (non-heading, with text) from the public extracts. Cached by file and mtime."""
    out = []
    for rel, label in REGULATOR_EXTRACTS:
        path = ROOT / rel
        if not path.exists():
            continue
        key = (str(path), path.stat().st_mtime)
        if key not in _REG_CACHE:
            data = json.loads(path.read_text(encoding="utf-8"))
            rows = data["rows"] if isinstance(data, dict) and "rows" in data else data
            items, seen = [], set()
            for r in rows:
                if r.get("kind") == "heading" or not (r.get("text") or "").strip():
                    continue
                ref = r.get("clause_ref") or r.get("section")
                if not ref or ref in seen:
                    continue
                seen.add(ref)
                items.append({
                    "criterion_id": requirement_id("REG", label, ref), "source_sheet": label, "criteria_ref": ref,
                    "kind": "REGULATOR_ROW", "question": r["text"], "procedure": "", "comments": "",
                    "status": "EXTRACTED_NOT_APPROVED", "applicability": "UNDECIDED", "assessment": "NOT_ASSESSED",
                    "evidence_ids": [], "finding_id": None, "condition_text": [], "origin": "REGULATOR_EXTRACT",
                    "source_citation": rel, "source_sha256": _file_sha(path), "source_label": label,
                    "evidence_prompts": [], "locator": r.get("section_heading"),
                    "licence_owner": "Public regulator publication", "licence_use": "SHARED_DISTRIBUTABLE",
                })
            _REG_CACHE[key] = items
        out += _REG_CACHE[key]
    return out


def customers():
    if not CUSTOMERS.exists():
        return []
    return sorted(p.name for p in CUSTOMERS.iterdir() if (p / "checklist.json").exists())


def customer_criteria(customer_id):
    path = CUSTOMERS / customer_id / "checklist.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    label = f"CUSTOMER {customer_id}"
    return [{
        "criterion_id": requirement_id("REG", label, r["ref"]), "source_sheet": f"CUSTOMER {customer_id}",
        "criteria_ref": r["ref"], "kind": "CUSTOMER_ROW", "question": r["question"], "procedure": "", "comments": "",
        "status": "PROPOSED_CUSTOMER", "applicability": "UNDECIDED", "assessment": "NOT_ASSESSED",
        "evidence_ids": [], "finding_id": None, "condition_text": [], "origin": "CUSTOMER_CHECKLIST",
        "source_citation": data.get("source_citation"), "source_sha256": data.get("sha256"),
        "source_label": label, "evidence_prompts": r.get("evidence") or [], "locator": None,
        "licence_owner": data.get("owner"), "licence_use": "CUSTOMER_PRIVATE_LICENSED",
    } for r in data["rows"]]


def customer_registry_entries():
    """Registry-style entries for each imported customer checklist, so withholding treats them like other sources."""
    out = {}
    for cid in customers():
        data = json.loads((CUSTOMERS / cid / "checklist.json").read_text(encoding="utf-8"))
        out[f"CUST-{cid}"] = {"standard": f"CUSTOMER {cid}", "edition": data.get("source_citation"), "status": "PROPOSED_CUSTOMER",
                              "licence_use": "CUSTOMER_PRIVATE_LICENSED", "licence_scope_owner": data.get("owner"),
                              "sha256": data.get("sha256"), "id_prefix": f"REG:CUSTOMER {cid}:",
                              "publication_url": None, "retrieved_on": None, "next_review_due": None}
    return out


def catalogue_all(audits_root, audit_id, checklist=None):
    """Every criterion the auditor can select, from every source, with its source tag."""
    checklist = checklist or qsa.load_checklist()
    draft = read_draft(audits_root, audit_id)
    faa = qsa.catalogue(checklist, {"selected": [], "additions": draft["additions"]})
    for c in faa:
        c.setdefault("kind", c.get("kind", "CRITERION"))
        c.setdefault("evidence_prompts", [])
        c.setdefault("locator", None)
        c.setdefault("source_label", "FAA QSA 1.0")
        c.setdefault("licence_owner", "Burrana Inc.")
        c.setdefault("licence_use", "ORG_PRIVATE_LICENSED")
    cat = list(faa)
    for std in STANDARD_SOURCES:
        cat += standard_criteria(std)
    cat += regulator_criteria()
    for cid in customers():
        cat += customer_criteria(cid)
    return cat


def sources_summary(cat):
    out = {}
    for c in cat:
        key = c["source_label"]
        out.setdefault(key, {"source": key, "criteria": 0, "licence_use": c["licence_use"], "licence_owner": c["licence_owner"]})
        out[key]["criteria"] += 1
    return list(out.values())


# ---------- draft ---------------------------------------------------------------

def read_draft(audits_root, audit_id):
    return qsa.read_draft(audits_root, audit_id)


def write_draft(audits_root, audit_id, draft):
    qsa.write_draft(audits_root, audit_id, draft)


def apply_action(audits_root, audit_id, action, ids=None, element=None):
    cat = catalogue_all(audits_root, audit_id)
    draft = read_draft(audits_root, audit_id)
    new = qsa.apply_action(draft, cat, action, ids=ids, element=element)
    write_draft(audits_root, audit_id, new)
    return new


# ---------- customer ingestion ----------------------------------------------------

def import_customer_checklist(customer_id, csv_path, owner, source_citation, now):
    """Import a customer checklist (CSV: ref, question, evidence). Stores it under content/customers/<id>/ with the
    file's SHA-256. Refuses duplicates, missing fields and an unusable identifier."""
    if not CUSTOMER_ID.fullmatch(customer_id or ""):
        raise ValueError("customer id must start with a letter or digit and use letters, digits, dot, dash or underscore")
    if not (owner or "").strip() or not (source_citation or "").strip():
        raise ValueError("customer checklist needs an owner and a source citation")
    raw = Path(csv_path).read_bytes()
    rows, seen, errors = [], set(), []
    for i, r in enumerate(csv.DictReader(raw.decode("utf-8-sig").splitlines()), start=2):
        ref = (r.get("ref") or "").strip()
        question = (r.get("question") or "").strip()
        if not ref:
            errors.append(f"line {i}: missing ref")
            continue
        if not question:
            errors.append(f"line {i} ({ref}): missing question")
        if ref in seen:
            errors.append(f"line {i}: duplicate ref {ref}")
        seen.add(ref)
        evidence = [e.strip() for e in (r.get("evidence") or "").split(";") if e.strip()]
        if not evidence:
            errors.append(f"line {i} ({ref}): missing evidence prompt")
        rows.append({"ref": ref, "question": question, "evidence": evidence})
    if errors:
        raise ValueError("; ".join(errors))
    if not rows:
        raise ValueError("customer checklist has no rows")
    folder = CUSTOMERS / customer_id
    if (folder / "checklist.json").exists():
        raise ValueError(f"customer checklist {customer_id} already imported; it is not overwritten")
    folder.mkdir(parents=True, exist_ok=True)
    body = {"customer_id": customer_id, "owner": owner.strip(), "source_citation": source_citation.strip(),
            "imported_at": now, "sha256": hashlib.sha256(raw).hexdigest(), "rows": rows}
    (folder / "checklist.json").write_text(json.dumps(body, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    return {"customer_id": customer_id, "rows": len(rows), "sha256": body["sha256"]}


# ---------- publication (multi-source) ---------------------------------------------

def publish(audits_root, audit_id, now=None):
    root = Path(audits_root)
    cat = catalogue_all(root, audit_id)
    draft = read_draft(root, audit_id)
    chosen = set(draft["selected"])
    selected = [c for c in cat if c["criterion_id"] in chosen]
    if not selected:
        raise ValueError("nothing selected: publication refused")
    entries = qsa_entries(root, audit_id)
    version = len([e for e in entries if e["record_type"] == "qsa_publication"]) + 1
    stamp = now or datetime.now().isoformat(timespec="seconds")
    sources = {}
    for c in selected:
        s = sources.setdefault(c["source_label"], {"source": c["source_label"], "licence_use": c["licence_use"],
                                                    "licence_owner": c["licence_owner"],
                                                    "source_sha256": c.get("source_sha256"), "criteria": 0})
        s["criteria"] += 1
    body = {
        "record_type": "qsa_selection", "audit_id": audit_id, "version": version, "published_at": stamp,
        "sources": list(sources.values()),
        "source": {"standard": "MULTI-SOURCE", "file_sha256": None, "xlsx_source_sha256": None,
                   "licence_scope": "MULTI", "status": "PUBLISHED_SELECTION"},
        "selected_count": len(selected),
        "criteria": [dict(qsa._snapshot_criterion(c), source_label=c["source_label"], kind=c.get("kind"),
                          licence_use=c["licence_use"], licence_owner=c["licence_owner"],
                          evidence_prompts=c.get("evidence_prompts", []), locator=c.get("locator"))
                     for c in selected],
    }
    rel = f"qsa/published-v{version}.json"
    written = write_snapshot(body, root / audit_id / "qsa", f"published-v{version}")
    lg.append(root, audit_id, "qsa_publication",
              {"version": version, "file": rel, "sha256": written["sha256"], "selected_count": len(selected)}, now=stamp)
    return {"version": version, "file": rel, "sha256": written["sha256"], "selected_count": len(selected),
            "sources": list(sources.values())}


def qsa_entries(audits_root, audit_id):
    entries = lg.read_entries(lg.ledger_path(audits_root, audit_id))
    errors, _ = lg.verify(entries)
    if errors:
        raise ValueError("ledger does not verify: " + "; ".join(errors))
    return entries
