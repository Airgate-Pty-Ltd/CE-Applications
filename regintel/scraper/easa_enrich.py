"""Resolve EASA effective dates from the eRules corpus.

THE PROBLEM
EASA's RSS feeds announce a publication — "ED Decision 2025/018/R" — and carry
no date a subscriber can act on. That is the only reason every EASA finding is
marked `unverified`.

THE FIX
The Easy Access Rules XML export states, per clause, which instrument it came
from (`RegulatorySource`) and when that clause entered into force
(`EntryIntoForceDate`). Both are EASA's own attributes. So if every clause
attributed to ED Decision 2025/018/R carries the same entry-into-force date,
that date is EASA's, stated by EASA, and the finding for that decision can
carry it.

THE RULE THAT MAKES IT HONEST
An instrument only yields a date when its clauses AGREE on one. Real data makes
this necessary rather than theoretical: in the UAS book, ED Decision 2019/021/R
gives one date across 75 clauses, but Regulation (EU) 2019/947 carries TWO
distinct entry-into-force dates because it was later amended. Picking one would
be inventing a fact. Instruments whose clauses disagree resolve to nothing and
the finding stays `unverified`.

WHY THIS RUNS AT FETCH TIME, NOT AS A LATER UPDATE
`models.Finding.content_hash()` includes effective_date. If the date were
written in afterwards, the next scrape would recompute the hash without it, see
a mismatch, and report the document as amended by the authority — every single
run. Resolving during the pull keeps the hash stable and means findings are
still only ever written through the normal store path.

A finding DOES legitimately show as changed the first time its date resolves:
an item going from "no effective date published" to "effective 30 September
2025" is real news for a subscriber, not a bookkeeping artefact.
"""

from __future__ import annotations

import logging
import re
from datetime import date

log = logging.getLogger(__name__)


def normalise_instrument(value: str | None) -> str | None:
    """Canonical key for an EASA/EU instrument.

    The same instrument is written differently either side of the join. A
    finding's document_number comes from an RSS title ("ED Decision 2026/008/R",
    "EU 2024/1110"); a node's RegulatorySource comes from the XML ("ED Decision
    2019/021/R", "Regulation (EU) 2024/1110", "Commission Implementing
    Regulation (EU) 2021/1166", "Regulation (EU) No 452/2014"). Both sides are
    reduced to the same key so the match is exact rather than fuzzy.

    Returns None when the string is not an instrument identifier we recognise —
    a near-miss must not become a wrong match.
    """
    if not value:
        return None
    v = re.sub(r"\s+", " ", value).strip()

    # ED Decision 2019/021/R  → ED:2019/021/R
    m = re.search(r"\bED\s*Decision\s*(\d{4})/(\d+)/([A-Z]+)\b", v, re.I)
    if m:
        return f"ED:{m.group(1)}/{int(m.group(2)):03d}/{m.group(3).upper()}"

    # MB Decision No 01-2023  → MB:2023/001
    m = re.search(r"\bMB\s*Decision\s*(?:No\.?\s*)?(\d+)[-/](\d{4})\b", v, re.I)
    if m:
        return f"MB:{m.group(2)}/{int(m.group(1)):03d}"

    # Regulation (EU) No 452/2014 — old style, number BEFORE year.
    m = re.search(r"\(EU\)\s*No\.?\s*(\d+)/(\d{4})\b", v, re.I)
    if m:
        return f"EU:{m.group(2)}/{int(m.group(1)):04d}"

    # Regulation (EU) 2019/947 — current style, year first. Also bare "EU 2024/1110".
    m = re.search(r"\(?EU\)?\s*(\d{4})/(\d+)\b", v, re.I)
    if m:
        return f"EU:{m.group(1)}/{int(m.group(2)):04d}"

    # NPA 2026-02 / CRD 2024-01 — consultation documents, no in-force date to find.
    m = re.search(r"\b(NPA|CRD)\s*(\d{4})-(\d+)\b", v, re.I)
    if m:
        return f"{m.group(1).upper()}:{m.group(2)}-{int(m.group(3)):03d}"

    m = re.search(r"\bOpinion\s*No\.?\s*(\d+)/(\d{4})\b", v, re.I)
    if m:
        return f"OPINION:{m.group(2)}/{int(m.group(1)):02d}"

    return None


def build_instrument_dates(sb) -> dict[str, date]:
    """Map instrument key → entry-into-force, for instruments whose clauses agree.

    Reads the stored eRules corpus. An instrument appearing with more than one
    distinct entry-into-force date is deliberately omitted: see the module
    docstring.
    """
    by_key: dict[str, set[date]] = {}
    page = 0
    while True:
        rows = (sb.table("regulatory_nodes")
                  .select("regulatory_source, entry_into_force")
                  .not_.is_("regulatory_source", "null")
                  .not_.is_("entry_into_force", "null")
                  .range(page * 1000, page * 1000 + 999)
                  .execute()).data or []
        for r in rows:
            key = normalise_instrument(r["regulatory_source"])
            if key:
                by_key.setdefault(key, set()).add(date.fromisoformat(r["entry_into_force"]))
        if len(rows) < 1000:
            break
        page += 1

    resolved = {k: next(iter(v)) for k, v in by_key.items() if len(v) == 1}
    ambiguous = {k: sorted(v) for k, v in by_key.items() if len(v) > 1}
    for k, dates in ambiguous.items():
        log.info("ambiguous entry-into-force, left unresolved: %s → %s",
                 k, ", ".join(d.isoformat() for d in dates))
    log.info("instrument dates resolved: %d (%d ambiguous, %d instruments seen)",
             len(resolved), len(ambiguous), len(by_key))
    return resolved


def load_instrument_dates() -> dict[str, date]:
    """Build the lookup from Supabase. Requires credentials; returns {} without."""
    try:
        from store import client

        return build_instrument_dates(client())
    except Exception as exc:  # noqa: BLE001 — enrichment is optional, never fatal
        log.warning("EASA date enrichment unavailable (%s); findings stay unverified", exc)
        return {}
