#!/usr/bin/env python3
"""
Pocket Auditor - Requirement Library Converter  (v0.1.1)

Reads the Conform-Edge auditor skill requirement catalogs
(<skills-root>/<skill>/references/requirements-catalog.md) and converts them into
a Requirement Library seed file that matches the CE-QMS Next Requirement Graph
(ADR-008 + PPD-002 closure-table schema).

It does NOT invent content. Every field is copied from the catalog text.
Every record is emitted with status = PROPOSED and approved_by = null.
Nothing enters a customer-facing library until Brian R. Olea approves the pack.

Usage:
    python convert_catalogs.py --skills-root "E:/Conform-Edge/ClaudeCowork/_Skills" \
                               --out library-seed.json --report CONVERSION-REPORT.md

Standard library only. Python 3.9+.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import uuid
from pathlib import Path

PACK_VERSION = "0.1.1"

# Source registry. authority_level follows the Enterprise Audit Intelligence Engine
# hierarchy: 1 Law/Regulation, 2 AD, 3 Order/Interpretation/Program, 4 Contract,
# 5 Certification Standard, 6 Internal Policy.
# Items marked confirm=True need Brian's confirmation before approval.
SOURCES = {
    "as9100d-auditor":        dict(code="AS9100D",    name="AS9100 Rev D", issuer="SAE / IAQG", revision="D (2016)", level=5, stype="STANDARD", base=["ISO9001"], confirm=False),
    "as9110c-auditor":        dict(code="AS9110C",    name="AS9110 Rev C", issuer="SAE / IAQG", revision="C (2016)", level=5, stype="STANDARD", base=["AS9100D", "ISO9001"], confirm=False),
    "as9120b-auditor":        dict(code="AS9120B",    name="AS9120 Rev B", issuer="SAE / IAQG", revision="B (2016)", level=5, stype="STANDARD", base=["AS9100D", "ISO9001"], confirm=False),
    "iso9001-auditor":        dict(code="ISO9001",    name="ISO 9001:2015", issuer="ISO", revision="2015", level=5, stype="STANDARD", base=[], confirm=False),
    "iso13485-auditor":       dict(code="ISO13485",   name="ISO 13485:2016", issuer="ISO", revision="2016", level=5, stype="STANDARD", base=[], confirm=False),
    "iso13485-qmsr-auditor":  dict(code="QMSR",       name="FDA QMSR (21 CFR Part 820) delta", issuer="US FDA", revision="Effective 2026-02-02 (per catalog)", level=1, stype="REGULATION", base=["ISO13485"], confirm=True),
    "iso13485-mdsap-auditor": dict(code="MDSAP",      name="MDSAP audit model delta", issuer="IMDRF MDSAP regulatory authorities", revision="per catalog", level=3, stype="REGULATORY_PROGRAM", base=["ISO13485"], confirm=True),
    "iso14001-auditor":       dict(code="ISO14001",   name="ISO 14001:2015", issuer="ISO", revision="2015", level=5, stype="STANDARD", base=[], confirm=False),
    "iatf16949-auditor":      dict(code="IATF16949",  name="IATF 16949:2016", issuer="IATF", revision="2016", level=5, stype="STANDARD", base=["ISO9001"], confirm=False),
}

# Sources that appear inside another skill's catalog under their own code.
EMBEDDED = {
    "EU_MDR": dict(code="EU_MDR", name="EU MDR (Regulation (EU) 2017/745) hooks", issuer="European Union", revision="2017/745 (per catalog)", level=1, stype="REGULATION", base=["ISO13485"], confirm=True),
}

# Standards whose clause numbering is ISO 9001-based, so equal clause numbers are
# candidate MAPS_TO relations. Candidates only - a human approves every relation.
ISO9001_FAMILY = {"ISO9001", "AS9100D", "AS9110C", "AS9120B", "IATF16949"}

NS = uuid.UUID("6f1b2c7e-3c55-4d7a-9a51-0c0ffee00001")  # fixed namespace -> stable IDs

HEAD_RE = re.compile(r"^###\s+((?:STD|REG):([A-Z0-9_]+):([^\s]+))\s+[\u2014-]+\s+(.+?)\s*$")
SUB_RE = re.compile(r"^\*\*(\d+(?:\.\d+)+)\s+[\u2014-]+\s+(.+?)\*\*\s*$")
FIELD_RE = re.compile(r"^\*\*([A-Za-z][A-Za-z /()'-]*?):\*\*\s*(.*)$")

FIELD_MAP = {
    "intent": "intent",
    "evidence": "expected_evidence",
    "failure modes": "failure_modes",
    "doc types": "doc_types",
    "applicability": "applicability",
    "cfr reference": "regulatory_reference",
    "excludable only if": "exclusion_condition",
    "note": "note",
}
LIST_FIELDS = {"expected_evidence", "failure_modes", "doc_types"}


def split_list(text: str) -> list[str]:
    """Split on ';' and on ', ' before a capital letter, never inside parentheses."""
    parts, buf, depth = [], "", 0
    t = text.strip().rstrip(".")
    i = 0
    while i < len(t):
        ch = t[i]
        depth += ch == "("
        depth -= ch == ")" and depth > 0
        if depth == 0 and ch == ";":
            parts.append(buf); buf = ""; i += 1; continue
        if depth == 0 and ch == "," and t[i + 1:i + 2] == " " and t[i + 2:i + 3].isupper():
            parts.append(buf); buf = ""; i += 2; continue
        buf += ch; i += 1
    parts.append(buf)
    return [p.strip().rstrip(".") for p in parts if p.strip()]


def new_record(src: dict, key: str, clause: str, title: str, parent_key: str | None, source_file: str) -> dict:
    # key is kept exactly as written in the skill catalog so findings stay traceable to it.
    return {
        "requirement_id": str(uuid.uuid5(NS, key)),
        "requirement_key": key,
        "standard_code": src["code"],
        "clause_ref": clause,
        "title": title,
        "parent_key": parent_key,
        "intent": None,
        "expected_evidence": [],
        "failure_modes": [],
        "doc_types": [],
        "applicability": None,
        "regulatory_reference": None,
        "exclusion_condition": None,
        "note": None,
        "extra_fields": {},
        "authority_level": src["level"],
        "source_type": src["stype"],
        "source_file": source_file,
        "status": "PROPOSED",
        "approved_by": None,
        "approved_at": None,
        "pack_version": PACK_VERSION,
    }


def parse_catalog(path: Path, src: dict, rel: str) -> list[dict]:
    records: list[dict] = []
    cur: dict | None = None
    parent: dict | None = None
    pending_desc = False
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        m = HEAD_RE.match(line)
        if m:
            hsrc = EMBEDDED.get(m.group(2), src) if m.group(2) != src["code"] else src
            cur = new_record(hsrc, m.group(1), m.group(3), m.group(4), None, rel)
            parent = cur
            records.append(cur)
            pending_desc = False
            continue
        if cur is None:
            continue
        m = SUB_RE.match(line)
        if m and parent is not None:
            # nearest ancestor = longest clause already seen under this heading that prefixes this clause
            anc = parent
            for r in reversed(records):
                if r["standard_code"] != parent["standard_code"]:
                    continue
                if m.group(1).startswith(r["clause_ref"] + ".") and len(r["clause_ref"]) > len(anc["clause_ref"]):
                    anc = r
                if r is parent:
                    break
            pkey = anc["requirement_key"]
            psrc = EMBEDDED.get(parent["standard_code"], src) if parent["standard_code"] != src["code"] else src
            cur = new_record(psrc, f"{pkey.rsplit(':', 1)[0]}:{m.group(1)}", m.group(1), m.group(2), pkey, rel)
            records.append(cur)
            pending_desc = True  # next plain line is the sub-clause intent statement
            continue
        m = FIELD_RE.match(line)
        if m:
            label = m.group(1).strip().lower()
            value = m.group(2).strip()
            field = FIELD_MAP.get(label)
            # Doc Types / Applicability printed after the last sub-clause belong to the parent.
            target = parent if (field in ("doc_types", "applicability") and cur is not parent and parent is not None) else cur
            if field in LIST_FIELDS:
                target[field] = split_list(value)
            elif field:
                target[field] = value
            else:
                target["extra_fields"][m.group(1).strip()] = value
            pending_desc = False
            continue
        if pending_desc and line.strip() and not line.startswith("#") and not line.startswith("---"):
            cur["intent"] = line.strip()
            pending_desc = False
    return records


TRIGGER_KEYWORDS = [
    ("performs_design", r"design (responsibility|authority|activities)|perform(s)? design|design and development"),
    ("special_processes", r"special process"),
    ("customer_property", r"customer property"),
    ("outsourced_processes", r"outsourc"),
    ("software_in_product", r"software"),
    ("sterile_devices", r"steril"),
    ("distributes_only", r"distribut"),
    ("maintenance_return_to_service", r"return to service|maintenance release|authorized release"),
    ("product_release_authority", r"release of product|product release"),
]


def propose_import_defaults(r: dict) -> None:
    """Deterministic PROPOSED defaults for fields the catalogs do not carry. Reviewed at approval."""
    text = (r.get("applicability") or "") + " " + (r.get("exclusion_condition") or "")
    trig = None
    if not re.search(r"^\s*all\b", (r.get("applicability") or ""), re.I):
        for key, pat in TRIGGER_KEYWORDS:
            if re.search(pat, text, re.I):
                trig = key
                break
    r["applicability_trigger_key"] = trig
    r["enforcement_sensitivity"] = "HIGH" if r["authority_level"] in (1, 2) else "MEDIUM"
    r["catastrophic_flag"] = False
    r["major_likelihood"] = None
    r["question_text"] = None
    r["interview_prompts"] = []
    r["expected_controls"] = []
    r["level"] = r["requirement_key"].count(".") if r["parent_key"] else 0
    r["defaults_status"] = "PROPOSED_DEFAULTS"


def candidate_relations(records: list[dict]) -> list[dict]:
    by_clause: dict[str, list[dict]] = {}
    for r in records:
        if r["standard_code"] in ISO9001_FAMILY:
            by_clause.setdefault(r["clause_ref"], []).append(r)
    rels = []
    for clause, group in sorted(by_clause.items()):
        codes = sorted({r["standard_code"] for r in group})
        if len(codes) < 2:
            continue
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                if a["standard_code"] == b["standard_code"]:
                    continue
                rels.append({
                    "from_key": a["requirement_key"],
                    "to_key": b["requirement_key"],
                    "relation_type": "MAPS_TO",
                    "basis": f"Equal clause number {clause} in ISO 9001-based structure (deterministic candidate)",
                    "status": "PROPOSED",
                    "approved_by": None,
                })
    return rels


def closure_rows(records: list[dict]) -> list[dict]:
    by_key = {r["requirement_key"]: r for r in records}
    rows = []
    for r in records:
        rows.append({"ancestor_key": r["requirement_key"], "descendant_key": r["requirement_key"], "depth": 0})
        depth, p = 1, r["parent_key"]
        while p:
            rows.append({"ancestor_key": p, "descendant_key": r["requirement_key"], "depth": depth})
            p = by_key[p]["parent_key"] if p in by_key else None
            depth += 1
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--skills-root", required=True)
    ap.add_argument("--out", default="library-seed.json")
    ap.add_argument("--report", default="CONVERSION-REPORT.md")
    a = ap.parse_args()
    root = Path(a.skills_root)

    all_records, sources, stats, missing = [], [], [], []
    for skill, src in SOURCES.items():
        path = root / skill / "references" / "requirements-catalog.md"
        if not path.exists():
            missing.append(str(path))
            continue
        data = path.read_bytes()
        rel = f"{root.name}/{skill}/references/requirements-catalog.md"  # portable, relative to --skills-root parent
        recs = parse_catalog(path, src, rel)
        all_records.extend(recs)
        sources.append({
            "source_code": src["code"], "name": src["name"], "issuer": src["issuer"],
            "revision": src["revision"], "authority_level": src["level"], "source_type": src["stype"],
            "base_sources": src["base"], "needs_brian_confirmation": src["confirm"],
            "catalog_file": rel, "catalog_sha256": hashlib.sha256(data).hexdigest(),
            "effective_date": None,
            "content_license": "Conform-Edge authored paraphrase (clause number + intent only). No standard text.",
        })
        for code in sorted({r["standard_code"] for r in recs}, key=lambda c: c != src["code"]):
            sub = [r for r in recs if r["standard_code"] == code]
            if code != src["code"]:
                e = EMBEDDED[code]
                sources.append({
                    "source_code": e["code"], "name": e["name"], "issuer": e["issuer"], "revision": e["revision"],
                    "authority_level": e["level"], "source_type": e["stype"], "base_sources": e["base"],
                    "needs_brian_confirmation": e["confirm"], "catalog_file": rel,
                    "catalog_sha256": hashlib.sha256(data).hexdigest(),
                    "content_license": "Conform-Edge authored paraphrase (clause number + intent only). No standard text.",
                })
            tops = [r for r in sub if r["parent_key"] is None]
            stats.append({
                "code": code, "total": len(sub), "top": len(tops), "sub": len(sub) - len(tops),
                "no_intent": [r["requirement_key"] for r in sub if not r["intent"]],
                "no_evidence": [r["requirement_key"] + (" (parent; children carry evidence)" if any(c["parent_key"] == r["requirement_key"] for c in sub) else "") for r in sub if not r["expected_evidence"]],
            })

    for r in all_records:
        propose_import_defaults(r)
    for r in all_records:  # hierarchy depth from parent chain
        d, p = 0, r["parent_key"]
        idx = {x["requirement_key"]: x for x in all_records}
        while p:
            d += 1; p = idx[p]["parent_key"] if p in idx else None
        r["level"] = d
    keys = [r["requirement_key"] for r in all_records]
    dupes = sorted({k for k in keys if keys.count(k) > 1})
    rels = candidate_relations(all_records)
    seed = {
        "pack": {
            "pack_id": "CE-PA-LIB-CORE", "pack_version": PACK_VERSION,
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "generator": "convert_catalogs.py", "status": "PROPOSED", "approved_by": None,
        },
        "sources": sources,
        "requirements": all_records,
        "requirement_paths": closure_rows(all_records),
        "requirement_relations": rels,
    }
    Path(a.out).write_text(json.dumps(seed, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        "# Requirement Library Conversion Report", "",
        f"Pack CE-PA-LIB-CORE v{PACK_VERSION} - generated {seed['pack']['generated_at']}", "",
        "All records are PROPOSED. None are approved. Approval by Brian R. Olea is required per pack.", "",
        "| Source | Authority level | Records | Top-level | Sub-clauses | Missing intent | Missing evidence |",
        "|---|---|---|---|---|---|---|",
    ]
    lvl = {s["source_code"]: s["authority_level"] for s in sources}
    for s in stats:
        lines.append(f"| {s['code']} | {lvl[s['code']]} | {s['total']} | {s['top']} | {s['sub']} | {len(s['no_intent'])} | {len(s['no_evidence'])} |")
    lines += ["", f"Total requirements: {len(all_records)}",
              f"Closure-table rows: {len(seed['requirement_paths'])}",
              f"Candidate MAPS_TO relations (deterministic, unapproved): {len(rels)}",
              f"Proposed applicability triggers: {sum(1 for r in all_records if r['applicability_trigger_key'])}",
              f"Duplicate keys: {', '.join(dupes) if dupes else 'none'}",
              f"Missing catalog files: {', '.join(missing) if missing else 'none'}", "",
              "## Records needing content before approval", ""]
    for s in stats:
        if s["no_intent"] or s["no_evidence"]:
            lines.append(f"**{s['code']}**")
            if s["no_intent"]:
                lines.append(f"- No intent statement: {', '.join(s['no_intent'])}")
            if s["no_evidence"]:
                lines.append(f"- No expected evidence: {', '.join(s['no_evidence'])}")
            lines.append("")
    lines += ["## Sources needing authority confirmation", ""]
    for s in sources:
        if s["needs_brian_confirmation"]:
            lines.append(f"- {s['source_code']}: proposed authority level {s['authority_level']} ({s['source_type']}). Confirm.")
    Path(a.report).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"requirements={len(all_records)} relations={len(rels)} paths={len(seed['requirement_paths'])} dupes={len(dupes)} missing={len(missing)}")


if __name__ == "__main__":
    main()
