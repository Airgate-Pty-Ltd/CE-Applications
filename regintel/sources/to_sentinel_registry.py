#!/usr/bin/env python3
"""Convert registry.json into the Source Sentinel's per-domain registries.

Emits sources.<domain>.json (aerospace, medical, automotive, standards,
universal, mining) in the Sentinel schema, seeding `identity_markers` and
`criticality` from what we know.

    python to_sentinel_registry.py

IMPORTANT — identity_markers are SEEDED, not authoritative. They are generated
from the authority name and purpose as a starting point. A marker set that is
too loose lets a lookalike pass; too tight flags a live page as drifted. Review
them before trusting auto-heal. Each generated file carries a needs_review flag.
"""

from __future__ import annotations

import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
REGISTRY = os.path.join(HERE, "registry.json")

INDUSTRY_FILE = {
    "Universal": "sources.universal.json",
    "Aerospace": "sources.aerospace.json",
    "Automotive": "sources.automotive.json",
    "Medical device": "sources.medical.json",
    "Mining": "sources.mining.json",
    "Standards": "sources.standards.json",
}

# Common authority acronyms → a distinctive second marker, so identity needs
# more than just the acronym appearing somewhere on a page.
KNOWN_MARKERS = {
    "FAA": ["FAA", "Federal Aviation"],
    "FDA": ["FDA", "Food and Drug"],
    "EASA": ["EASA", "Aviation Safety"],
    "MHRA": ["MHRA", "Medicines and Healthcare"],
    "CASA": ["CASA", "Civil Aviation Safety"],
    "CAAC": ["CAAC", "Civil Aviation Administration"],
    "TCCA": ["Transport Canada"],
    "ANAC": ["ANAC"],
    "NHTSA": ["NHTSA", "Highway Traffic Safety"],
    "MSHA": ["MSHA", "Mine Safety"],
    "TGA": ["TGA", "Therapeutic Goods"],
    "IMDRF": ["IMDRF"],
    "NMPA": ["NMPA"],
    "ANVISA": ["ANVISA"],
    "IATF": ["IATF", "16949"],
    "ISO": ["ISO"],
    "IEC": ["IEC"],
    "ICAO": ["ICAO"],
}

# Sources whose absence would break coverage → required; long-quiet safety feeds
# → sentinel. Everything else defaults to common.
REQUIRED_HINTS = ("federal register", "easa document", "faa dynamic", "ecfr", "eur-lex", "openfda", "mhra alerts")
SENTINEL_HINTS = ("airworthiness directive", "safety alert", "recall", "safety communication", "safety directive")

_STOP = {"the", "and", "of", "for", "a", "to", "in", "on", "us", "uk", "eu", "and", "or", "new"}


def markers_for(authority: str, name: str, purpose: str) -> list[str]:
    for acro, mk in KNOWN_MARKERS.items():
        if re.search(rf"\b{re.escape(acro)}\b", f"{authority} {name}"):
            base = list(mk)
            break
    else:
        # Fall back to the first strong token of the authority/name.
        toks = [t for t in re.split(r"[^A-Za-z0-9]+", authority or name) if len(t) > 2 and t.lower() not in _STOP]
        base = toks[:1]

    # Add one distinctive purpose word so identity is more than the acronym.
    ptoks = [t for t in re.split(r"[^A-Za-z0-9]+", purpose) if len(t) > 3 and t.lower() not in _STOP]
    for t in ptoks:
        if t.capitalize() not in base and t.upper() not in base:
            base.append(t.capitalize())
            break
    return base[:3]


def criticality_for(name: str, purpose: str) -> str:
    hay = f"{name} {purpose}".lower()
    if any(h in hay for h in SENTINEL_HINTS):
        return "sentinel"
    if any(h in hay for h in REQUIRED_HINTS):
        return "required"
    return "common"


def main() -> int:
    data = json.load(open(REGISTRY, encoding="utf-8"))
    buckets: dict[str, list[dict]] = {}

    for r in data["records"]:
        industry = r["industry"][0]
        name = r["source_name"]
        purpose = r.get("purpose", "")
        src = {
            "id": r["source_id"],
            "authority": r["authority"],
            "tier": "primary",
            "country": r["jurisdiction"],
            "purpose": purpose,
            "url": r["url"],
            "identity_markers": markers_for(r["authority"], name, purpose),
            "criticality": criticality_for(name, purpose),
        }
        buckets.setdefault(industry, []).append(src)

    total = 0
    for industry, srcs in buckets.items():
        fn = INDUSTRY_FILE.get(industry, f"sources.{industry.lower()}.json")
        payload = {
            "registry_version": "1.0.0",
            "domain": industry.lower(),
            "identity_markers_needs_review": True,
            "last_full_validation": None,
            "sources": srcs,
        }
        with open(os.path.join(HERE, fn), "w", encoding="utf-8", newline="\n") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
            f.write("\n")
        total += len(srcs)
        crit = {}
        for s in srcs:
            crit[s["criticality"]] = crit.get(s["criticality"], 0) + 1
        print(f"{fn:30} {len(srcs):3} sources  {crit}")

    print(f"\n{total} sources across {len(buckets)} registries.")
    print("identity_markers are SEEDED — review before trusting auto-heal.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
