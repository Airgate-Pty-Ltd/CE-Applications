"""Regenerate the derived lettered extracts from the licensed clause text.

Writes licensed-private/lettered-<std>.json and lettered-<std>.md. Source: licensed-private/clause-text-<std>.json,
cut at the first notes or annex marker (reconcile_canonical.cut_at_annex). Letters a, b, c ... are taken in order
within each clause body, as reconcile_canonical.lettered does. Each item's text runs to the next letter.

Verified before writing: the set of lettered references must equal the lettered rows of the canonical checklist for
the same standard. Nothing is written if they differ.

Only the derived extracts are written. The licensed PDF and licensed text file are not touched.
Run from the product folder:  python -I content/qa/extract_lettered.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "content"))
import reconcile_canonical as rcn  # noqa: E402

LIC = ROOT / "licensed-private"
STANDARDS = ("AS9100D", "AS9110C")


def extract(std):
    clauses = json.loads((LIC / f"clause-text-{std}.json").read_text(encoding="utf-8"))
    items = []
    for ref in sorted(clauses, key=lambda r: [int(x) for x in r.split(".")]):
        body = rcn.cut_at_annex(clauses[ref] or "")
        marks = [(m.start(1), m.group(1)) for m in rcn.LETTER_RE.finditer(body)]
        expected, starts = "a", []
        for pos, letter in marks:
            if letter == expected:
                starts.append((letter, pos))
                expected = chr(ord(expected) + 1)
        for i, (letter, pos) in enumerate(starts):
            end = starts[i + 1][1] if i + 1 < len(starts) else len(body)
            items.append({"ref": f"{ref}({letter})", "text": re.sub(r"\s+", " ", body[pos:end]).strip()})
    return items


def checklist_lettered(std):
    rows = json.loads((ROOT / "content" / "checklists" / f"{std}.json").read_text(encoding="utf-8"))["items"]
    return {r["ref"] for r in rows if r.get("type") == "lettered_subparagraph"}


def write(std, items):
    (LIC / f"lettered-{std}.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    lines = [f"# {std} lettered sub-paragraph working extract (PRIVATE, licensed text, Burrana Inc.)", ""]
    current = None
    for it in items:
        clause = it["ref"].split("(")[0]
        if clause != current:
            lines += [f"## {clause}"]
            current = clause
        lines.append(f"- {it['ref']}: {it['text']}")
    (LIC / f"lettered-{std}.md").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


def main():
    results = {}
    for std in STANDARDS:
        items = extract(std)
        extracted = {i["ref"] for i in items}
        expected = checklist_lettered(std)
        if extracted != expected:
            raise SystemExit(f"{std}: extract does not match the checklist. Extract only: "
                             f"{sorted(extracted - expected)[:10]}. Checklist only: {sorted(expected - extracted)[:10]}")
        results[std] = len(items)
    for std in STANDARDS:
        write(std, extract(std))
    print("lettered extracts written:", results)


if __name__ == "__main__":
    main()
