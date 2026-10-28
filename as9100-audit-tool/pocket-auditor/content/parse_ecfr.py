"""Parse an eCFR full-part XML file into one row per regulatory paragraph.

Usage (from the product root):
  python -I content/parse_ecfr.py sources/ecfr-14-cfr-145.xml content/rows-faa-14cfr-145.json "FAA 14 CFR Part 145"

Each row: clause reference (section + paragraph path), section heading, paragraph text.
The text is the regulation's own wording and is kept only as a working extract in
content/. The library rows that ship later hold a clause reference, title and
Conform-Edge-authored intent (LD-10), so this file is an input to authoring, not the library.
"""
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

MARKER = re.compile(r"^\(([a-z]{1,3}|[0-9]{1,3}|[ivxlc]{1,6})\)")


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def main(src, out, source_label):
    raw = Path(src).read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    root = ET.fromstring(raw)
    rows = []
    for sec in root.iter("DIV8"):
        number = sec.attrib.get("N", "")          # e.g. 145.55
        if not number or sec.attrib.get("TYPE") != "SECTION":
            continue
        heading = ""
        path = []                                 # stack of paragraph markers, e.g. ['(c)', '(1)']
        seq = 0
        for child in sec:
            if child.tag == "HEAD":
                heading = clean("".join(child.itertext())).lstrip("§ ").strip()
                heading = re.sub(r"^[^0-9A-Za-z]*", "", heading)
                continue
            if child.tag != "P":
                continue
            text = clean("".join(child.itertext()))
            if not text:
                continue
            m = MARKER.match(text)
            if m:
                marker = "(" + m.group(1) + ")"
                # Depth heuristic: numbers after letters are deeper; letters after numbers reset.
                if marker[1].isdigit():
                    depth = 2 if path and path[-1][1].isalpha() else 1
                    if len(path) >= 2 and depth == 1:
                        depth = 2
                elif marker[1].isalpha():
                    depth = 1
                else:
                    depth = 1
                path = path[: depth - 1] + [marker]
                ref = number + "".join(path)
            else:
                ref = number + "".join(path) + " (intro)"
            seq += 1
            rows.append({
                "source": source_label,
                "clause_ref": ref,
                "section": number,
                "section_heading": heading,
                "text": text,
            })
    result = {
        "source": source_label,
        "source_file": Path(src).name,
        "source_sha256": sha,
        "row_count": len(rows),
        "rows": rows,
    }
    Path(out).write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{source_label}: {len(rows)} paragraph rows, sha256 {sha[:16]}..., wrote {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
