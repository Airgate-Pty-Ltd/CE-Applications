"""EASA Easy Access Rules — structured (eRules XML) ingestion.

WHY THIS EXISTS
The EASA RSS feeds tell you a publication happened. They carry no effective
date and no comment deadline, which is why every EASA finding is marked
`unverified`: the item and its link are the authority's, but the date fields a
subscriber acts on are simply absent from the feed.

EASA also publishes each Easy Access Rules book as a machine-readable XML
export ("powered by eRules", with a published XSD). That export carries, per
clause, the authority's own:

    ERulesId            stable identity across revisions
    source-title        the clause heading
    TypeOfContent       IR / DR / AMC to IR / GM to IR / GM to AMC
    RegulatorySource    'Regulation (EU) 2019/947', 'ED Decision 2025/018/R'
    EntryIntoForceDate  the date the rule bites
    ApplicabilityDate   the date it applies from

So this module reads what the RSS could not, and it reads it from the
publisher's structured record rather than from prose.

NO LLM. NO PDF. Every field below is copied out of the export verbatim. Dates
are parsed from the authority's own attribute strings; where the export says
"n/a" the value is None rather than a guess — an invented effective date on an
airworthiness rule is exactly the failure this product exists to avoid.

FORMAT
The export is a flat-OPC Word package (`pkg:package`). Two parts matter:

    /customXml/item1.xml   er:document → er:toc → er:topic[]   (the metadata)
    /word/document.xml     w:sdt blocks keyed by w:id          (the text)

An `er:topic`'s `sdt-id` is the `w:id` of the `w:sdt` block holding its text,
which is what lets clause metadata and clause body be joined deterministically.
"""

from __future__ import annotations

import hashlib
import html
import io
import logging
import re
import zipfile
from dataclasses import dataclass
from datetime import date, datetime

log = logging.getLogger(__name__)

EASA_BASE = "https://www.easa.europa.eu"

# Change detection: revisions of Easy Access Rules publications appear here.
# Confirmed live and distinct from the six document-library feeds already in
# sources.py — a *revision* of an existing book shows up in this feed only.
EAR_FEED = f"{EASA_BASE}/en/document-library/easy-access-rules/feed.xml"

# The separator models.Finding.content_hash() joins on, reused so the hashing
# convention is identical across the codebase.
_SEP = "␟"

# "2 June, 2020" / "30 September, 2025" — the export's own date rendering.
_DATE_RE = re.compile(r"^\s*(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})\s*$")
_MONTHS = {
    m.lower(): i
    for i, m in enumerate(
        ["January", "February", "March", "April", "May", "June", "July",
         "August", "September", "October", "November", "December"], start=1)
}


def parse_easa_date(value: str | None) -> date | None:
    """Parse the export's date attributes.

    Returns None for 'n/a', empty, or anything not matching the publisher's
    format. Never falls back to "today" or to a neighbouring field: a missing
    date must stay missing.
    """
    if not value:
        return None
    v = value.strip()
    if not v or v.lower() in {"n/a", "na", "-"}:
        return None
    m = _DATE_RE.match(v)
    if m:
        day, month, year = m.group(1), m.group(2).lower(), m.group(3)
        if month in _MONTHS:
            try:
                return date(int(year), _MONTHS[month], int(day))
            except ValueError:
                return None
    # ISO, in case EASA changes rendering.
    try:
        return datetime.strptime(v[:10], "%Y-%m-%d").date()
    except ValueError:
        log.debug("unparseable EASA date attribute: %r", value)
        return None


@dataclass
class RegulatoryNode:
    """One clause: an Article, an AMC, a GM."""

    node_key: str                 # ERulesId — stable across revisions
    ordinal: int
    title: str | None
    node_type: str | None         # TypeOfContent
    regulatory_source: str | None # RegulatorySource
    parent_ir: str | None
    amended_by: str | None
    entry_into_force: date | None
    applicability_date: date | None
    body: str

    def content_hash(self) -> str:
        """Hash of everything a subscriber would act on.

        Body text plus the dates and the classification. A revision that
        reflows whitespace must not read as a regulatory change, so the body is
        whitespace-normalised before hashing (see _text_of).
        """
        material = _SEP.join(
            str(x or "")
            for x in (
                self.title,
                self.body,
                self.entry_into_force,
                self.applicability_date,
                self.node_type,
                self.regulatory_source,
            )
        )
        return hashlib.sha256(material.encode("utf-8")).hexdigest()


@dataclass
class ExportDocument:
    """A parsed Easy Access Rules export."""

    title: str
    revision: str | None
    published_at: datetime | None
    nodes: list[RegulatoryNode]

    def content_hash(self) -> str:
        h = hashlib.sha256()
        for n in self.nodes:
            h.update(n.content_hash().encode("ascii"))
        return h.hexdigest()


# --------------------------------------------------------------------------
# Parsing
# --------------------------------------------------------------------------

def _attr(tag: str, name: str) -> str | None:
    m = re.search(rf'{re.escape(name)}="([^"]*)"', tag)
    if not m:
        return None
    v = html.unescape(m.group(1)).strip()
    if not v or v.lower() in {"n/a", "na"}:
        return None
    return v


def _text_of(segment: str) -> str:
    """Visible text of a Word fragment.

    Only <w:t> runs carry text; everything else is formatting. Whitespace is
    collapsed so that a reflowed paragraph does not register as a change.
    """
    parts = re.findall(r"<w:t(?:\s[^>]*)?>(.*?)</w:t>", segment, re.S)
    return re.sub(r"\s+", " ", " ".join(html.unescape(p) for p in parts)).strip()


def _top_level_sdt_spans(body: str) -> list[tuple[int, int]]:
    """Byte spans of the outermost <w:sdt> blocks.

    Tracked with a stack because sdt blocks nest; only the outermost block
    corresponds to a table-of-contents topic.
    """
    spans: list[tuple[int, int]] = []
    stack: list[int] = []
    for tok in re.finditer(r"<w:sdt>|</w:sdt>", body):
        if tok.group(0) == "<w:sdt>":
            stack.append(tok.start())
        elif stack:
            start = stack.pop()
            if not stack:
                spans.append((start, tok.end()))
    return spans


def _package_part(xml: str, name: str) -> str | None:
    """Body of the named pkg:part.

    Located by index rather than a regex spanning the whole document: the CS-25
    export is 65 MB, and a `.*?` across that is both slow and fragile. Part
    names are matched case-insensitively because EASA is inconsistent about
    them — /customXml/ in one book, /customXML/ in another.
    """
    lowered = xml.lower()
    marker = f'pkg:name="{name.lower()}"'
    at = lowered.find(marker)
    if at == -1:
        return None
    start = lowered.find("<pkg:xmldata>", at)
    if start == -1:
        return None
    start += len("<pkg:xmlData>")
    end = lowered.find("</pkg:xmldata>", start)
    return xml[start:end] if end != -1 else xml[start:]


def _erules_metadata_part(xml: str) -> str | None:
    """The pkg:part holding <er:document>, found by content.

    Neither its index nor the case of its path is stable across books: the UAS
    export puts it in /customXml/item1.xml, Continuing Airworthiness in a later
    item because item1 holds SharePoint receivers, and CS-25 in
    /customXML/item9.xml with a capital XML. Anchoring on the element itself
    and walking out to the enclosing part avoids all of that.
    """
    at = xml.find("<er:document")
    if at == -1:
        return None
    lowered = xml.lower()
    start = lowered.rfind("<pkg:xmldata>", 0, at)
    if start == -1:
        return None
    start += len("<pkg:xmlData>")
    end = lowered.find("</pkg:xmldata>", at)
    return xml[start:end] if end != -1 else xml[start:]


def _collapse_repeats(nodes: list[RegulatoryNode]) -> list[RegulatoryNode]:
    """Collapse a clause that the book prints in more than one place.

    Easy Access Rules legitimately reproduce one AMC under several standard
    scenarios: in the UAS book six AMC/GM clauses appear twice, with the same
    ERulesId and byte-identical text. They are one regulatory requirement shown
    twice, not two requirements, so they are stored once — otherwise the delta
    would report a change against every placement of a clause that moved.

    A repeat whose CONTENT differs would be a different matter: that is real
    regulatory text which must not be silently discarded, so it is kept under a
    suffixed key and logged loudly.
    """
    seen: dict[str, RegulatoryNode] = {}
    out: list[RegulatoryNode] = []
    for n in nodes:
        prior = seen.get(n.node_key)
        if prior is None:
            seen[n.node_key] = n
            out.append(n)
        elif prior.content_hash() == n.content_hash():
            continue  # same clause printed again; already stored
        else:
            log.warning(
                "ERulesId %s repeats with DIFFERENT content (%r vs %r) — keeping both",
                n.node_key, prior.title, n.title)
            n.node_key = f"{n.node_key}#{n.ordinal}"
            out.append(n)
    return out


def parse_export(xml: str) -> ExportDocument:
    """Parse an eRules XML export into clause-level nodes."""
    meta_part = _erules_metadata_part(xml)
    if meta_part is None:
        raise ValueError("not an eRules export: no customXml part contains <er:document>")

    doc_tag = re.search(r"<er:document\b[^>]*>", meta_part)
    if doc_tag is None:
        raise ValueError("not an eRules export: <er:document> missing")
    doc_tag = doc_tag.group(0)

    title = _attr(doc_tag, "source-title") or "Easy Access Rules"
    published_at = None
    pub = _attr(doc_tag, "pub-time")
    if pub:
        try:
            published_at = datetime.fromisoformat(pub.replace("Z", "+00:00"))
        except ValueError:
            log.debug("unparseable pub-time: %r", pub)

    # Body text, keyed by the sdt id the topic metadata points at.
    body_part = _package_part(xml, "/word/document.xml") or ""
    text_by_id: dict[str, str] = {}
    for start, end in _top_level_sdt_spans(body_part):
        segment = body_part[start:end]
        m = re.search(r'<w:id w:val="(-?\d+)"', segment)
        if m:
            text_by_id[m.group(1)] = _text_of(segment)

    nodes: list[RegulatoryNode] = []
    for i, tag in enumerate(re.findall(r"<er:topic\b[^>]*/>", meta_part)):
        erules_id = _attr(tag, "ERulesId")
        sdt_id = _attr(tag, "sdt-id")
        if not erules_id:
            continue
        nodes.append(
            RegulatoryNode(
                node_key=erules_id,
                ordinal=i,
                title=_attr(tag, "source-title"),
                node_type=_attr(tag, "TypeOfContent"),
                regulatory_source=_attr(tag, "RegulatorySource"),
                parent_ir=_attr(tag, "ParentIR"),
                amended_by=_attr(tag, "AmendedBy"),
                entry_into_force=parse_easa_date(_attr(tag, "EntryIntoForceDate")),
                applicability_date=parse_easa_date(_attr(tag, "ApplicabilityDate")),
                body=text_by_id.get(sdt_id or "", ""),
            )
        )

    nodes = _collapse_repeats(nodes)

    revision = None
    m = re.search(r"Revision\s+([A-Za-z]+\s+\d{4})", title)
    if m:
        revision = f"Revision {m.group(1)}"

    return ExportDocument(title=title, revision=revision,
                          published_at=published_at, nodes=nodes)


def parse_export_zip(data: bytes) -> ExportDocument:
    """Parse the ZIP that EASA serves for the XML download."""
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = [n for n in zf.namelist() if n.lower().endswith(".xml")]
        if not names:
            raise ValueError(f"no .xml inside export archive: {zf.namelist()}")
        # Revision is in the filename when it is not in the document title.
        name = names[0]
        doc = parse_export(zf.read(name).decode("utf-8", errors="replace"))
        if not doc.revision:
            m = re.search(r"Revision\s+([A-Za-z]+\s+\d{4})", name)
            if m:
                doc.revision = f"Revision {m.group(1)}"
        return doc


# --------------------------------------------------------------------------
# Delta
# --------------------------------------------------------------------------

# Fields compared when a node's hash moves, so a change event says WHAT moved
# rather than merely that something did.
_TRACKED = ("title", "body", "entry_into_force", "applicability_date",
            "node_type", "regulatory_source")


@dataclass
class ChangeEvent:
    node_key: str
    change_type: str            # 'added' | 'changed' | 'removed'
    title: str | None
    node_type: str | None
    changed_fields: dict[str, bool] | None


def diff_nodes(old: list[RegulatoryNode], new: list[RegulatoryNode]) -> list[ChangeEvent]:
    """Clause-level delta between two revisions, keyed on the publisher's id.

    Matching on ERulesId rather than position means renumbering or reordering a
    book does not masquerade as hundreds of regulatory changes.
    """
    old_by = {n.node_key: n for n in old}
    new_by = {n.node_key: n for n in new}
    events: list[ChangeEvent] = []

    for key, n in new_by.items():
        prior = old_by.get(key)
        if prior is None:
            events.append(ChangeEvent(key, "added", n.title, n.node_type, None))
        elif prior.content_hash() != n.content_hash():
            changed = {
                f: True for f in _TRACKED
                if getattr(prior, f) != getattr(n, f)
            }
            events.append(ChangeEvent(key, "changed", n.title, n.node_type, changed or None))

    for key, o in old_by.items():
        if key not in new_by:
            events.append(ChangeEvent(key, "removed", o.title, o.node_type, None))

    return events
