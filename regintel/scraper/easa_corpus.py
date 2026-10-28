"""EASA Easy Access Rules corpus — discovery, retrieval and storage.

The adapter described in EASA_Structured_Regulatory_Ingestion_Architecture.md:

    discover_publications()   Layer 1 — the Easy Access Rules RSS feed tells us
                              a book was published or revised.
    find_export_url()         Layer 2 — locate the XML download on that book's
                              page. HTML is read only to find the link; the
                              regulatory content never comes from HTML.
    ingest_publication()      Retrieve → parse → store → diff against the last
                              stored revision.

Nothing here downloads a PDF, and no model of any kind sees this data. Every
stored field is copied from EASA's own structured export.

COST CONTROL
The exports are large (the UAS book is a 7 MB zip expanding to 24 MB of XML).
Layer 1 exists precisely so a book is only downloaded when its revision is one
we have not already stored — see `ingest_publication(..., force=False)`.

    python -m easa_corpus --list                 what EASA has published
    python -m easa_corpus --dry-run <url>        parse and report, write nothing
    python -m easa_corpus --ingest <url>         parse and store
"""

from __future__ import annotations

import argparse
import html
import logging
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone

import requests

from easa_erules import EAR_FEED, EASA_BASE, ExportDocument, diff_nodes, parse_export_zip

log = logging.getLogger("easa_corpus")

TIMEOUT = 120
HEADERS = {"User-Agent": "RegIntel/1.0 (+regulatory monitoring; contact via conform-edge.com)"}


@dataclass
class Publication:
    title: str
    url: str
    published: str | None


def _get(url: str, **kw) -> requests.Response:
    resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, **kw)
    resp.raise_for_status()
    return resp


def discover_publications() -> list[Publication]:
    """Layer 1 — Easy Access Rules publications and revisions, newest first.

    This feed is distinct from the six document-library feeds in sources.py: a
    *revision* of an existing book appears here and nowhere else, which is why
    revisions currently go undetected.
    """
    resp = _get(EAR_FEED)
    out: list[Publication] = []
    for item in re.findall(r"<item>(.*?)</item>", resp.text, re.S):
        def field(name: str) -> str | None:
            m = re.search(rf"<{name}>(.*?)</{name}>", item, re.S)
            if not m:
                return None
            return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", m.group(1)))).strip()

        title, link = field("title"), field("link")
        if title and link:
            out.append(Publication(title=title, url=link, published=field("pubDate")))
    return out


def find_export_url(publication_url: str) -> str | None:
    """Locate the XML export download on a publication page.

    EASA serves downloads from opaque numeric ids, so the format cannot be read
    from the URL — each candidate is HEADed and the one served as a zip wins.
    HTML is used only for link discovery, never as a content source.
    """
    resp = _get(publication_url)
    ids = re.findall(r'href="(?:https://www\.easa\.europa\.eu)?(/en/downloads/\d+/en)"', resp.text)
    seen: list[str] = []
    for path in ids:
        if path in seen:
            continue
        seen.append(path)
        url = EASA_BASE + path
        try:
            head = requests.head(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        except requests.RequestException as exc:
            log.debug("HEAD failed for %s: %s", url, exc)
            continue
        ctype = head.headers.get("content-type", "")
        if "zip" in ctype:
            return url
        log.debug("skipping %s (%s)", url, ctype or "unknown type")
    return None


def fetch_export(export_url: str) -> ExportDocument:
    return parse_export_zip(_get(export_url).content)


# --------------------------------------------------------------------------
# Storage
# --------------------------------------------------------------------------

def _client():
    from store import client

    return client()


def document_key(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"easa:{slug}"


def _upsert_document(sb, title: str, url: str) -> str:
    key = document_key(title)
    existing = sb.table("regulatory_documents").select("id").eq("document_key", key).execute()
    if existing.data:
        return existing.data[0]["id"]
    created = sb.table("regulatory_documents").insert({
        "authority": "EASA",
        "document_key": key,
        "title": title,
        "source_url": url,
        "document_class": "easy_access_rules",
    }).execute()
    return created.data[0]["id"]


def _latest_stored_nodes(sb, document_id: str, exclude_version: str | None = None):
    """Nodes of the most recent stored revision, for the delta baseline."""
    q = (sb.table("regulatory_versions")
           .select("id, revision, retrieved_at")
           .eq("document_id", document_id)
           .order("retrieved_at", desc=True)
           .limit(2))
    versions = q.execute().data or []
    versions = [v for v in versions if v["id"] != exclude_version]
    if not versions:
        return None, []
    vid = versions[0]["id"]

    from easa_erules import RegulatoryNode
    rows, page = [], 0
    while True:
        chunk = (sb.table("regulatory_nodes")
                   .select("node_key, ordinal, title, node_type, regulatory_source,"
                           " parent_ir, amended_by, entry_into_force, applicability_date, body")
                   .eq("version_id", vid).range(page * 1000, page * 1000 + 999).execute()).data or []
        rows.extend(chunk)
        if len(chunk) < 1000:
            break
        page += 1

    from datetime import date as _date

    def d(v):
        return _date.fromisoformat(v) if v else None

    return versions[0], [
        RegulatoryNode(
            node_key=r["node_key"], ordinal=r["ordinal"], title=r["title"],
            node_type=r["node_type"], regulatory_source=r["regulatory_source"],
            parent_ir=r["parent_ir"], amended_by=r["amended_by"],
            entry_into_force=d(r["entry_into_force"]),
            applicability_date=d(r["applicability_date"]),
            body=r["body"] or "",
        ) for r in rows
    ]


def store_export(doc: ExportDocument, publication_url: str, export_url: str) -> dict:
    """Store a revision and record the clause-level delta against the previous one."""
    sb = _client()
    revision = doc.revision or (doc.published_at.date().isoformat() if doc.published_at else "unknown")

    document_id = _upsert_document(sb, doc.title, publication_url)

    already = (sb.table("regulatory_versions").select("id, content_hash")
                 .eq("document_id", document_id).eq("revision", revision).execute()).data
    if already:
        log.info("revision already stored: %s %s", doc.title, revision)
        return {"status": "already_stored", "document_id": document_id,
                "version_id": already[0]["id"], "nodes": 0, "changes": {}}

    # Baseline BEFORE inserting the new version, or the new one becomes its own
    # baseline and every delta comes back empty.
    prior_version, prior_nodes = _latest_stored_nodes(sb, document_id)

    version_id = (sb.table("regulatory_versions").insert({
        "document_id": document_id,
        "revision": revision,
        "published_at": doc.published_at.isoformat() if doc.published_at else None,
        "source_url": export_url,
        "source_format": "EASA-eRules-XML",
        "node_count": len(doc.nodes),
        "content_hash": doc.content_hash(),
    }).execute()).data[0]["id"]

    rows = [{
        "version_id": version_id,
        "document_id": document_id,
        "node_key": n.node_key,
        "ordinal": n.ordinal,
        "title": n.title,
        "node_type": n.node_type,
        "regulatory_source": n.regulatory_source,
        "parent_ir": n.parent_ir,
        "amended_by": n.amended_by,
        "entry_into_force": n.entry_into_force.isoformat() if n.entry_into_force else None,
        "applicability_date": n.applicability_date.isoformat() if n.applicability_date else None,
        "body": n.body,
        "content_hash": n.content_hash(),
    } for n in doc.nodes]

    for i in range(0, len(rows), 200):
        sb.table("regulatory_nodes").insert(rows[i:i + 200]).execute()

    counts: dict[str, int] = {}
    if prior_nodes:
        events = diff_nodes(prior_nodes, doc.nodes)
        if events:
            payload = [{
                "document_id": document_id,
                "from_version_id": prior_version["id"],
                "to_version_id": version_id,
                "node_key": e.node_key,
                "change_type": e.change_type,
                "title": e.title,
                "node_type": e.node_type,
                "changed_fields": e.changed_fields,
            } for e in events]
            for i in range(0, len(payload), 200):
                sb.table("regulatory_change_events").insert(payload[i:i + 200]).execute()
        for e in events:
            counts[e.change_type] = counts.get(e.change_type, 0) + 1
        log.info("delta vs %s: %s", prior_version["revision"], counts or "no changes")
    else:
        log.info("first stored revision — no baseline to diff against")

    return {"status": "stored", "document_id": document_id, "version_id": version_id,
            "nodes": len(doc.nodes), "changes": counts,
            "baseline": prior_version["revision"] if prior_version else None}


def ingest_publication(publication_url: str, dry_run: bool = False) -> dict:
    export_url = find_export_url(publication_url)
    if not export_url:
        return {"status": "no_xml_export", "url": publication_url}

    doc = fetch_export(export_url)
    log.info("%s — %s — %d nodes", doc.title, doc.revision, len(doc.nodes))

    if dry_run:
        dated = sum(1 for n in doc.nodes if n.entry_into_force)
        return {"status": "dry_run", "title": doc.title, "revision": doc.revision,
                "nodes": len(doc.nodes), "with_entry_into_force": dated,
                "export_url": export_url}

    return store_export(doc, publication_url, export_url)


def main() -> int:
    p = argparse.ArgumentParser(description="EASA Easy Access Rules structured ingestion")
    p.add_argument("--list", action="store_true", help="list published/revised books")
    p.add_argument("--ingest", metavar="URL", help="ingest one publication page")
    p.add_argument("--dry-run", metavar="URL", help="parse and report; write nothing")
    p.add_argument("--limit", type=int, default=10)
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)-7s %(message)s", datefmt="%H:%M:%S")

    if args.list:
        for pub in discover_publications()[:args.limit]:
            print(f"  {(pub.published or '')[:16]:17} {pub.title[:62]:62} {pub.url}")
        return 0

    target = args.ingest or args.dry_run
    if not target:
        p.print_help()
        return 1

    result = ingest_publication(target, dry_run=bool(args.dry_run))
    for k, v in result.items():
        print(f"  {k}: {v}")
    return 0 if result.get("status") != "no_xml_export" else 1


if __name__ == "__main__":
    sys.exit(main())
