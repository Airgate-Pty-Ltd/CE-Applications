#!/usr/bin/env python3
"""Generate the machine-readable source register from the master directory.

Parses docs/REGULATORY-DIRECTORY.md (the human-authored master) into
sources/registry.json — one record per source, per Brian's collector schema.

Deterministic: the markdown is the single point of transcription, and the
register is generated from it. Edit the directory, rerun this, commit both.

    python build_registry.py
"""

from __future__ import annotations

import json
import os
import re
from urllib.parse import urlsplit

HERE = os.path.dirname(os.path.abspath(__file__))
DIRECTORY = os.path.join(HERE, "..", "docs", "REGULATORY-DIRECTORY.md")
OUT = os.path.join(HERE, "registry.json")

# Top-level section number -> industry label.
INDUSTRY = {
    "1": "Universal",
    "2": "Aerospace",
    "3": "Automotive",
    "4": "Medical device",
    "5": "Mining",
    "6": "Standards",
}

INDUSTRY_CODE = {
    "Universal": "UNI",
    "Aerospace": "AER",
    "Automotive": "AUT",
    "Medical device": "MED",
    "Mining": "MIN",
    "Standards": "STD",
}

# Region words we recognise in subsection headings, longest first.
REGIONS = [
    ("United States", "United States"),
    ("United Kingdom", "United Kingdom"),
    ("European Union", "European Union"),
    ("New Zealand", "New Zealand"),
    ("South Africa", "South Africa"),
    ("South Korea", "South Korea"),
    ("Australia", "Australia"),
    ("Canada", "Canada"),
    ("Mexico", "Mexico"),
    ("Brazil", "Brazil"),
    ("China", "China"),
    ("Japan", "Japan"),
    ("India", "India"),
    ("International", "International"),
]

URL_RE = re.compile(r"https?://[^\s|)>\]]+")


def slug_id(industry: str, seq: int) -> str:
    return f"{INDUSTRY_CODE.get(industry, 'GEN')}-{seq:03d}"


def region_for(heading: str) -> str:
    for needle, label in REGIONS:
        if needle.lower() in heading.lower():
            return label
    # e.g. "3.1 International — UNECE WP.29" already handled; default:
    return "International"


def parse() -> list[dict]:
    records: list[dict] = []
    section = "1"
    jurisdiction = "Multiple"
    seq = 0
    seen_urls: set[str] = set()

    with open(DIRECTORY, encoding="utf-8") as f:
        lines = f.readlines()

    in_code = False
    for line in lines:
        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue

        # Section / subsection headings.
        m = re.match(r"^#{1,3}\s+(\d+)(?:\.(\d+))?\.?\s+(.*)", line)
        if m:
            section = m.group(1)
            heading = m.group(3)
            # Subsections carry the jurisdiction; top sections reset it.
            if re.match(r"^#{1,3}\s+\d+\.\d+", line):
                jurisdiction = region_for(heading)
            else:
                jurisdiction = "Multiple"
            continue

        # Table rows: | name | url ... |
        if not line.lstrip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        # Skip header and separator rows.
        if not cells or set("".join(cells)) <= set("-: "):
            continue
        if cells[0].lower() in ("source", "source name", "data source", "organization", "jurisdiction", "standards body"):
            continue

        urls = URL_RE.findall(line)
        if not urls:
            continue
        url = urls[0].rstrip(".")
        if url in seen_urls:
            continue
        seen_urls.add(url)

        name = re.sub(r"\[|\]", "", cells[0]) or url
        purpose = ""
        # Last cell that is not the URL cell often holds the purpose.
        for c in reversed(cells):
            if "http" not in c and c and c != name:
                purpose = c
                break

        industry = INDUSTRY.get(section, "Universal")
        seq += 1

        cross = [u for u in urls[1:]]  # extra URLs on the row become cross-refs

        records.append(
            {
                "source_id": slug_id(industry, seq),
                "authority": name,
                "jurisdiction": jurisdiction,
                "industry": [industry],
                "source_name": name,
                "source_type": [],
                "url": url,
                "official_domain": urlsplit(url).netloc,
                "authority_level": "Primary",
                "cross_reference": cross,
                "purpose": purpose,
                "retrieval_method": "HTML",
                "structured_api_available": False,
                "login_required": False,
                "recommended_frequency": "Daily",
                "change_detection": [
                    "New document row",
                    "Publication date change",
                    "Comment deadline change",
                    "Link replacement",
                ],
                "retain_original": True,
                "human_validation_required": True,
                # Health fields, filled by healthcheck.py.
                "last_checked": None,
                "last_status": None,
                "last_ok": None,
                "consecutive_failures": 0,
            }
        )

    return records


def main() -> int:
    records = parse()
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump({"records": records}, f, indent=2, ensure_ascii=False)
        f.write("\n")

    by_industry: dict[str, int] = {}
    for r in records:
        by_industry[r["industry"][0]] = by_industry.get(r["industry"][0], 0) + 1
    print(f"Wrote {len(records)} records to registry.json")
    for k, v in by_industry.items():
        print(f"  {k:14} {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
