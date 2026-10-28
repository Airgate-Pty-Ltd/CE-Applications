"""Link EASA findings to the clauses they affect in the eRules corpus.

THE PROBLEM
An EASA RSS item is thin. "ED Decision 2026/005/R" tells a subscriber nothing
about what it does, and the effective date cannot be resolved from the corpus
either, because a 2026 decision does not appear in any Easy Access Rules book
until EASA re-issues that book incorporating it.

WHAT CAN BE SAID TODAY
The decision's own description names the Parts it amends:

    "AMC and GM to Part 21 — Issue 2, Amendment 18
     AMC and GM to Part-M — Issue 2, Amendment 10
     AMC and GM to Part-145 — Issue 2, Amendment 9"

and the corpus holds those Parts clause by clause, because eRules clause titles
carry the Part code:  `145.A.35(k)`, `M.A.706(i)`, `AMC1 145.A.30(e)`.

So a finding can say which Parts it touches, how much regulation sits in each,
and when that Part last changed. Both halves are EASA's own text — the Part
names come from EASA's description, the clause counts from EASA's XML. Nothing
is inferred.

WHERE IT GOES
Into `detail`, never `summary` or `title`. Those feed the content hash, and a
finding must not appear to have been amended by the authority because our
corpus grew. `detail` sits outside the hash and is refreshed in place by
store.py.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import date

log = logging.getLogger(__name__)

# "AMC1 145.A.30(e)" / "GM2 M.A.706" — the Part code follows the AMC/GM marker.
_AMC_GM_PREFIX = re.compile(r"^(?:AMC|GM)\d*\s+", re.I)

# A clause title opens with its Part code: 145.A.35(k), M.A.706, ORO.GEN.110,
# 21.A.14, CAT.OP.MPA.100. Codes are short and alphanumeric.
_CLAUSE_CODE = re.compile(r"^([A-Z0-9]{1,5})\.")

# "Part-145", "Part 21", "Part-CAMO" as EASA writes them in a decision summary.
_PART_REF = re.compile(r"\bPart[\s‑-]?([A-Z]{1,5}|\d{1,3}[A-Z]?)\b")

# Parts that are real, so a stray capitalised word after "Part" cannot invent one.
# Populated from the corpus at runtime; this is only the floor.
_MIN_CLAUSES = 5


def part_of(clause_title: str | None) -> str | None:
    """Part code a clause belongs to, from its own title."""
    if not clause_title:
        return None
    t = _AMC_GM_PREFIX.sub("", clause_title.strip())
    m = _CLAUSE_CODE.match(t)
    return m.group(1).upper() if m else None


@dataclass
class PartSummary:
    code: str
    clauses: int = 0
    amc_gm: int = 0
    latest_change: date | None = None
    books: set[str] = field(default_factory=set)

    def describe(self) -> str:
        bits = [f"{self.clauses} clauses"]
        if self.amc_gm:
            bits.append(f"{self.amc_gm} AMC/GM")
        if self.latest_change:
            bits.append(f"last change {self.latest_change.isoformat()}")
        return f"Part-{self.code} ({', '.join(bits)})"


def build_part_index(sb) -> dict[str, PartSummary]:
    """Index the stored corpus by Part code."""
    index: dict[str, PartSummary] = {}
    titles: dict[str, str] = {}
    page = 0
    while True:
        rows = (sb.table("regulatory_nodes")
                  .select("title, node_type, entry_into_force, document_id")
                  .range(page * 1000, page * 1000 + 999).execute()).data or []
        for r in rows:
            code = part_of(r.get("title"))
            if not code:
                continue
            p = index.setdefault(code, PartSummary(code))
            p.clauses += 1
            nt = (r.get("node_type") or "")
            if nt.startswith("AMC") or nt.startswith("GM"):
                p.amc_gm += 1
            eif = r.get("entry_into_force")
            if eif:
                d = date.fromisoformat(eif)
                if p.latest_change is None or d > p.latest_change:
                    p.latest_change = d
            p.books.add(r["document_id"])
        if len(rows) < 1000:
            break
        page += 1

    # Drop codes seen only a handful of times: those are parsing noise
    # (a heading that happens to start "A.") rather than real Parts.
    pruned = {k: v for k, v in index.items() if v.clauses >= _MIN_CLAUSES}
    log.info("corpus Part index: %d Parts across %d clauses",
             len(pruned), sum(p.clauses for p in pruned.values()))
    return pruned


def parts_referenced(text: str, known: dict[str, PartSummary]) -> list[str]:
    """Part codes an EASA item says it amends, restricted to Parts we hold.

    Matching against the corpus is what keeps this honest: "Part of the
    application" cannot become Part-OF, because no such Part exists in the XML.
    """
    if not text:
        return []
    out: list[str] = []
    for m in _PART_REF.finditer(text):
        code = m.group(1).upper()
        if code in known and code not in out:
            out.append(code)
    return out


def describe_affected(text: str, index: dict[str, PartSummary], limit: int = 6) -> str | None:
    """One line naming the Parts an item affects and how much sits in each."""
    codes = parts_referenced(text, index)
    if not codes:
        return None
    shown = [index[c].describe() for c in codes[:limit]]
    more = len(codes) - len(shown)
    line = "Affects " + "; ".join(shown)
    if more > 0:
        line += f"; and {more} more"
    return line


def load_part_index() -> dict[str, PartSummary]:
    try:
        from store import client

        return build_part_index(client())
    except Exception as exc:  # noqa: BLE001 — enrichment is optional, never fatal
        log.warning("EASA Part index unavailable (%s)", exc)
        return {}
