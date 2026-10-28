"""Write AS-LICENSED-REGISTER-FINDINGS.md from AS-licensed-clause-register.json.

Run from the product root:  python -I content/build_as_findings.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / "AS-licensed-clause-register.json").read_text(encoding="utf-8"))

lines = [
    "# AS9100D and AS9110C: licensed clause register and seed check",
    "",
    "Built from the licensed PDFs in `licensed-private\\` (private, not for shipping). "
    "The register holds clause references and standard headings only (R-2). "
    "It is in `content\\AS-licensed-clause-register.json`.",
    "",
    "**Status:** the seed (`content\\library-seed.json`, PROPOSED) does not match the licensed standards. "
    "It is not changed here. Removals and title corrections need your approval (N-01).",
    "",
]

for code, src in data["sources"].items():
    seed_missing = src["seed_clauses_not_in_standard"]
    diff = [c for c in src["clauses"] if "DIFFERS" in c["status"]]
    new = [c for c in src["clauses"] if c["status"].startswith("NOT IN SEED")]
    lines += [
        f"## {code}",
        "",
        f"- Licensed file sha256: `{src['sha256'][:16]}...`",
        f"- Headings in the table of contents: {src['toc_headings']}",
        f"- Clauses 4 to 11 found in the standard body: {src['clauses_in_standard_4_to_11']}",
        f"- Seed rows: {src['seed_rows']}. Seed rows whose clause is not in the standard: **{len(seed_missing)}**",
        "",
        "### Seed clauses not found in the licensed standard (remove or re-map)",
        "",
        ", ".join(seed_missing),
        "",
        f"### Seed title differs from the licensed heading ({len(diff)})",
        "",
        "| Clause | Seed title | Heading in standard |",
        "|---|---|---|",
    ]
    for c in diff:
        seed_title = c["status"].split('seed="', 1)[1].rsplit('"', 1)[0]
        lines.append(f"| {c['clause_ref']} | {seed_title} | {c['heading'] or '-'} |")
    lines += [
        "",
        f"### Clauses in the standard with no seed row ({len(new)}): intent and evidence still to author",
        "",
        ", ".join(c["clause_ref"] for c in new),
        "",
    ]

(ROOT / "AS-LICENSED-REGISTER-FINDINGS.md").write_text("\n".join(lines), encoding="utf-8")
print("wrote AS-LICENSED-REGISTER-FINDINGS.md")
