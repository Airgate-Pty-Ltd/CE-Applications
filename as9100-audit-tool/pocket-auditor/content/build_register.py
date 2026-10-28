"""Rebuild AS-licensed-clause-register.json from the licensed copies.

Clause references come from the union of (a) table-of-contents headings and (b) numbered
lines in the body. Headings come only from the table of contents. Nothing else is copied.

Inputs : licensed-private/AS9100D.txt, licensed-private/AS9110C.txt (private extracts)
Output : content/AS-licensed-clause-register.json (refs and headings only, R-2)

Run from the product root:  python -I content/build_register.py
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = json.loads((ROOT / "content" / "library-seed.json").read_text(encoding="utf-8"))["requirements"]
TOC_LINE = re.compile(r"^(\d+(?:\.\d+){0,4})\s+(.+?)\s*\.{3,}\s*\d+$")
BODY_LINE = re.compile(r"^(\d+(?:\.\d+){0,4})(?=\s|$)")


def key(ref):
    return [int(x) for x in ref.split(".")]


out = {"note": "Clause references and standard headings only (R-2). Built from licensed-private copies by content/build_register.py. Status compares each clause with library-seed.json (PROPOSED).", "sources": {}}
for code in ["AS9100D", "AS9110C"]:
    pdf = ROOT / "licensed-private" / f"{code}.pdf"
    txt = (ROOT / "licensed-private" / f"{code}.txt").read_text(encoding="utf-8").replace("\xa0", " ")
    lines = [re.sub(r"[ \t]+", " ", l).strip() for l in txt.split("\n")]
    lines = [l for l in lines if l]
    toc = {}
    for l in lines[:400]:
        m = TOC_LINE.match(l)
        if m and m.group(1) not in toc:
            toc[m.group(1)] = m.group(2).strip()
    body = set()
    for i, l in enumerate(lines):
        m = BODY_LINE.match(l)
        if m and i > 200 and m.group(1)[0] in "45678910":
            body.add(m.group(1))
    in_scope_toc = {r for r in toc if r.split(".")[0].isdigit() and 4 <= int(r.split(".")[0]) <= 10}
    # Top-level clauses 4-10: the extract has no heading text for them, only the structure line.
    # Existence is taken from that line; titles are NOT invented and stay null until verified.
    structure_line = any(l == "4 5 6 7 8 9 10" for l in lines)
    top_level = {str(n) for n in range(4, 11)} if structure_line else set()
    refs = sorted(body | in_scope_toc | top_level, key=key)
    seed = {r["clause_ref"]: r for r in SEED if r["standard_code"] == code}
    clauses = []
    for ref in refs:
        head = toc.get(ref)
        sd = seed.get(ref)
        if sd is None:
            status = "NOT IN SEED - author intent"
        elif head is None:
            status = "IN SEED - no heading in standard (numbered requirement); seed title: " + sd["title"]
        elif head.lower()[:20] == sd["title"].lower()[:20]:
            status = "IN SEED - title matches"
        else:
            status = 'IN SEED - TITLE DIFFERS: seed="' + sd["title"] + '"'
        found = ("toc" if ref in toc else "") + ("+body" if ref in body else "")
        if ref in top_level and not found:
            found = "structure line only (title not extracted; verify against licensed copy)"
        clauses.append({"clause_ref": ref, "heading": head, "status": status, "found_in": found})
    out["sources"][code] = {
        "file": f"licensed-private/{code}.pdf",
        "sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
        "toc_headings": len(toc),
        "clauses_in_standard_4_to_11": len(refs),
        "seed_rows": len(seed),
        "seed_clauses_not_in_standard": [r for r in seed if r not in set(refs)],
        "clauses": clauses,
    }
    print(code, "toc", len(toc), "clauses 4-10", len(refs), "seed rows", len(seed))

(ROOT / "content" / "AS-licensed-clause-register.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote content/AS-licensed-clause-register.json")
