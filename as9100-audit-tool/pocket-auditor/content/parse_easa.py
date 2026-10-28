"""Parse an EASA regulation (EUR-Lex HTML) annex into one row per paragraph.

The HTML is converted to plain text (one paragraph per line), then the annex between
the given line numbers is walked. Clause headings look like "145.A.30 Personnel requirements";
paragraph markers are (a), (1), (i) at the start of a line, nested in that order.

Usage (from the product root, after converting the HTML to text as in _tmp-*.txt):
  python -I content/parse_easa.py <text-file> <first-line> <last-line> <clause-prefix> <source-label> <out.json> <source-html>

Line numbers are 1-based and inclusive. Used with:
  Regulation (EU) 1321/2014, Annex II (Part-145): lines 2374-3028, prefix 145.A
  Regulation (EU) 748/2012,  Annex I  (Part 21):  lines 1004-3542, prefix 21.A
"""
import hashlib
import json
import re
import sys
from pathlib import Path

LETTER = re.compile(r"^\(([a-z])\)")
DIGIT = re.compile(r"^\((\d{1,2})\)")
ROMAN = re.compile(r"^\(([ivx]{1,6})\)")


def parse(lines, prefix):
    heading_re = re.compile(r"^(" + re.escape(prefix) + r"\.\d+[A-Z]?)\s+(\S.{2,160})$")
    rows = []
    clause = None
    title = ""
    path = []  # [letter?, digit?, roman?] current marker chain
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        h = heading_re.match(line)
        if h and len(h.group(2)) <= 120:
            clause, title = h.group(1), h.group(2).strip()
            path = []
            rows.append({"clause_ref": clause, "section": clause, "section_heading": title,
                         "text": title, "kind": "heading"})
            continue
        if clause is None:
            continue
        marker = None
        if ROMAN.match(line) and path and path[-1][0] == "digit":
            marker, kind = ROMAN.match(line).group(1), "roman"
        elif DIGIT.match(line):
            marker, kind = DIGIT.match(line).group(1), "digit"
        elif LETTER.match(line):
            marker, kind = LETTER.match(line).group(1), "letter"
        if marker is not None:
            order = {"letter": 0, "digit": 1, "roman": 2}[kind]
            path = [p for p in path if p[2] < order]
            path.append((kind, marker, order))
            ref = clause + "".join("(" + p[1] + ")" for p in path)
        else:
            ref = clause + "".join("(" + p[1] + ")" for p in path) + ("" if not path else "")
        rows.append({"clause_ref": ref, "section": clause, "section_heading": title,
                     "text": line, "kind": "paragraph"})
    return rows


def main(text_file, first, last, prefix, label, out, source_html):
    all_lines = Path(text_file).read_text(encoding="utf-8").split("\n")
    segment = all_lines[int(first) - 1:int(last)]
    rows = parse(segment, prefix)
    sha = hashlib.sha256(Path(source_html).read_bytes()).hexdigest()
    clauses = sorted({r["section"] for r in rows})
    result = {
        "source": label,
        "source_file": Path(source_html).name,
        "source_sha256": sha,
        "clause_count": len(clauses),
        "row_count": len(rows),
        "rows": rows,
    }
    Path(out).write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{label}: {len(clauses)} clauses, {len(rows)} rows, sha256 {sha[:16]}..., wrote {out}")


if __name__ == "__main__":
    main(*sys.argv[1:8])
