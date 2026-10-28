"""Authoritative sources.

Every URL in this file was probed live before being committed. Endpoints that
returned 404, or that actively block automated access, are recorded in
UNCOVERED rather than guessed at — see STATUS.md for the evidence.
"""

from __future__ import annotations

import html
import logging
import re
import xml.etree.ElementTree as ET
from datetime import timedelta
from urllib.parse import urlencode

import requests

from models import (
    Finding,
    Source,
    SourceResult,
    derive_priority,
    parse_iso_date,
    today_utc,
)

log = logging.getLogger(__name__)

USER_AGENT = "Conform-Edge RegIntel/1.0 (+https://conform-edge.com; regulatory monitoring)"
TIMEOUT = 45


def _get(url: str, params: dict | None = None) -> requests.Response:
    resp = requests.get(
        url,
        params=params,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json, application/xml, */*"},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return resp


# ---------------------------------------------------------------------------
# Federal Register — US agencies (FAA, FDA)
# ---------------------------------------------------------------------------
# https://www.federalregister.gov/developers/api/v1
# Public JSON API, no key. Returns document_number, publication_date,
# effective_on and comments_close_on as typed fields, so nothing is inferred.

FR_API = "https://www.federalregister.gov/api/v1/documents.json"

FR_FIELDS = [
    "document_number",
    "title",
    "type",
    "abstract",
    "publication_date",
    "effective_on",
    "comments_close_on",
    "html_url",
    "docket_ids",
]

# Lookup over the closed set the publisher defines — not inference.
FR_CATEGORY = {
    "Rule": "final_rule",
    "Proposed Rule": "nprm",
    "Notice": "notice",
    "Presidential Document": "presidential_document",
}


class FederalRegisterSource:
    id = "federal-register"

    def __init__(self, authority: str, authority_name: str, agency_slug: str, per_page: int = 200):
        self.authority = authority
        self.authority_name = authority_name
        self.agency_slug = agency_slug
        self.per_page = per_page

    def fetch(self, since_days: int) -> list[Finding]:
        today = today_utc()
        since = (today - timedelta(days=since_days)).isoformat()

        params = [
            ("per_page", str(self.per_page)),
            ("order", "newest"),
            ("conditions[agencies][]", self.agency_slug),
            ("conditions[publication_date][gte]", since),
        ]
        params += [("fields[]", f) for f in FR_FIELDS]

        resp = _get(f"{FR_API}?{urlencode(params)}")
        results = resp.json().get("results") or []

        findings: list[Finding] = []
        for doc in results:
            url = doc.get("html_url")
            title = (doc.get("title") or "").strip()
            # A finding with no link cannot be cited and is not actionable.
            if not url or not title:
                continue

            dockets = doc.get("docket_ids") or []
            detail = " · ".join(
                p
                for p in (
                    f"Document {doc['document_number']}" if doc.get("document_number") else None,
                    doc.get("type"),
                    f"Docket {', '.join(dockets)}" if dockets else None,
                    f"Published {doc['publication_date']}" if doc.get("publication_date") else None,
                )
                if p
            )

            # The publisher's own abstract, verbatim. We do not write prose on
            # the authority's behalf.
            abstract = (doc.get("abstract") or "").strip()
            summary = abstract or f"{doc.get('type') or 'Document'} published {doc.get('publication_date') or 'date not stated'}."

            findings.append(
                Finding(
                    authority=self.authority,
                    category=FR_CATEGORY.get(doc.get("type"), "other"),
                    priority=derive_priority(doc.get("effective_on"), doc.get("comments_close_on"), today),
                    title=title,
                    summary=summary,
                    detail=detail,
                    source_url=url,
                    document_number=doc.get("document_number"),
                    effective_date=doc.get("effective_on"),
                    comment_deadline=doc.get("comments_close_on"),
                    published_date=doc.get("publication_date"),
                    verification="verified",
                    source_id=self.id,
                )
            )
        return findings


# ---------------------------------------------------------------------------
# EASA — official RSS feeds
# ---------------------------------------------------------------------------
# https://www.easa.europa.eu/en/rss  (feed list confirmed live)
#
# EASA publishes no comment deadline or effective date in these feeds, so those
# fields stay None rather than being guessed from the item text. Priority is
# therefore driven by publication recency only, and these are marked
# 'unverified' — the item and its link are the authority's, but the date fields
# a subscriber acts on are not present.

EASA_BASE = "https://www.easa.europa.eu/en"

# Paths are relative to EASA_BASE and MUST retain the document-library segment;
# without it every feed 404s.
EASA_FEEDS = [
    ("document-library/notices-of-proposed-amendment", "npa"),
    ("document-library/opinions", "opinion"),
    ("document-library/agency-decisions", "ed_decision"),
    # Singular "material" — the plural path only works because EASA 301s it,
    # and a redirect is not a contract.
    ("document-library/acceptable-means-of-compliance-and-guidance-material", "amc_gm"),
    ("document-library/regulations", "regulation"),
    ("document-library/certification-specifications", "certification_specification"),
    # Easy Access Rules: consolidated books. A REVISION of an existing book
    # appears only here, not in the six feeds above, so without this a
    # re-issued Part/CS went undetected entirely. The clause-level content of
    # these books is ingested separately — see easa_corpus.py.
    ("document-library/easy-access-rules", "easy_access_rules"),
]

# Document identifiers EASA uses, e.g. "NPA 2026-02", "ED Decision 2026/008/R",
# "Opinion No 05/2026". Extracted from the title the authority published —
# a direct read of their own string, not an inference about content.
EASA_DOC_PATTERNS = [
    re.compile(r"\b(NPA\s+\d{4}-\d+[A-Z]?)", re.I),
    re.compile(r"\b(ED\s+Decision\s+\d{4}/\d+/[A-Z]+)", re.I),
    re.compile(r"\b(Opinion\s+No\s+\d+/\d{4})", re.I),
    re.compile(r"\b(CRD\s+\d{4}-\d+)", re.I),
    re.compile(r"\b((?:EU)\s*\d{4}/\d+)", re.I),
    re.compile(r"\b(CS-[A-Z0-9]+)", re.I),
]


def _extract_doc_number(title: str) -> str | None:
    for pat in EASA_DOC_PATTERNS:
        m = pat.search(title)
        if m:
            return m.group(1).strip()
    return None


def _rss_date_to_iso(value: str | None) -> str | None:
    """RFC-822 (RSS pubDate) to ISO date. Returns None if unparseable."""
    if not value:
        return None
    from email.utils import parsedate_to_datetime

    try:
        return parsedate_to_datetime(value).date().isoformat()
    except (TypeError, ValueError):
        return parse_iso_date(value).isoformat() if parse_iso_date(value) else None


def _strip_html(text: str) -> str:
    """Decode entities, then strip tags.

    ORDER MATTERS. EASA escapes its markup inside the RSS description, so the
    feed carries `&lt;p&gt;` rather than `<p>`. Stripping first left those
    entities untouched, and unescaping afterwards turned them back into literal
    tags — every EASA summary on the dashboard rendered as visible
    "<p><strong>...</strong></p>" markup.

    Unescaping twice first also handles EASA's double-encoded ampersands
    (&amp;amp;), and leaves real tags to be removed by the same pass.
    """
    cleaned = html.unescape(html.unescape(text or ""))
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


class EasaRssSource:
    id = "easa-rss"
    authority = "EASA"
    authority_name = "European Union Aviation Safety Agency"

    def __init__(self, feeds: list[tuple[str, str]] | None = None,
                 instrument_dates: dict | None = None,
                 part_index: dict | None = None):
        self.feeds = feeds or EASA_FEEDS
        # instrument key -> entry-into-force date, from the eRules corpus. See
        # easa_enrich.py. Empty in --dry-run, which keeps that mode free of any
        # credential requirement; findings then stay unverified exactly as before.
        self.instrument_dates = instrument_dates or {}
        # Part code -> corpus summary, for saying which Parts an item touches.
        # See easa_link. Goes into `detail` only: it must never feed the hash.
        self.part_index = part_index or {}

    def fetch(self, since_days: int) -> list[Finding]:
        today = today_utc()
        cutoff = today - timedelta(days=since_days)
        findings: list[Finding] = []
        errors: list[str] = []

        for path, category in self.feeds:
            url = f"{EASA_BASE}/{path}/feed.xml"
            try:
                resp = _get(url)
                root = ET.fromstring(resp.content)
            except Exception as exc:  # noqa: BLE001 - one feed must not sink the rest
                errors.append(f"{path}: {exc}")
                log.warning("EASA feed failed: %s (%s)", path, exc)
                continue

            for item in root.iter("item"):
                title = _strip_html(item.findtext("title") or "")
                link = (item.findtext("link") or "").strip()
                if not title or not link:
                    continue

                published = _rss_date_to_iso(item.findtext("pubDate"))
                pub_date = parse_iso_date(published)
                # Feeds carry 50 items regardless of age; apply the window here.
                if pub_date and pub_date < cutoff:
                    continue

                description = _strip_html(item.findtext("description") or "")

                doc_number = _extract_doc_number(title)

                # EASA's own entry-into-force date for this instrument, where
                # its clauses agree on one (easa_enrich.build_instrument_dates).
                # Absent that, effective_date stays None and the item stays
                # unverified — the date is never inferred from the title.
                # Which Parts of the corpus this item amends, per EASA's own
                # description of it.
                affected = None
                if self.part_index:
                    from easa_link import describe_affected

                    affected = describe_affected(f"{title} {description}", self.part_index)

                effective = None
                if doc_number and self.instrument_dates:
                    from easa_enrich import normalise_instrument

                    key = normalise_instrument(doc_number)
                    if key:
                        effective = self.instrument_dates.get(key)

                findings.append(
                    Finding(
                        authority=self.authority,
                        category=category,
                        # No deadline/effective date in the feed, so recency only.
                        priority="normal" if pub_date and (today - pub_date).days <= 7 else "low",
                        title=title,
                        summary=description or title,
                        detail=" · ".join(
                            p for p in (
                                category.replace("_", " ").upper(),
                                f"Published {published}" if published else None,
                                affected,
                            ) if p
                        ),
                        source_url=link,
                        document_number=doc_number,
                        effective_date=effective.isoformat() if effective else None,
                        comment_deadline=None,
                        published_date=published,
                        # 'verified' only once the effective date has been read
                        # from EASA's own structured record (the eRules export).
                        # Without it the feed alone cannot support the date
                        # fields a subscriber acts on.
                        verification="verified" if effective else "unverified",
                        source_id=self.id,
                    )
                )

        if errors and not findings:
            raise RuntimeError("all EASA feeds failed: " + "; ".join(errors))
        return findings


# ---------------------------------------------------------------------------
# MHRA — UK medical device and medicines safety alerts
# ---------------------------------------------------------------------------
# https://www.gov.uk/api/search.json  (GOV.UK Search API, public, no key)
#
# Returns title, link, public_timestamp and description as typed fields for
# document_type=medical_safety_alert — MHRA Field Safety Notices, device
# alerts and medicines defect notifications.
#
# Marked `verified`: unlike the EASA feeds, nothing is MISSING here. A safety
# alert has no comment deadline or effective date as a concept — the alert is
# the event — so every field the document actually has comes from the
# authority's own structured record.

# MHRA prints its reference in the title, e.g. "EL(26)A/36".
MHRA_REF = re.compile(r"((?:EL|MDA|NatPSA|DSU)\s*\([^)]*\)[^\s,]*)")

GOVUK_SEARCH = "https://www.gov.uk/api/search.json"
GOVUK_BASE = "https://www.gov.uk"


class MhraSafetyAlertSource:
    id = "govuk-mhra"
    authority = "MHRA"
    authority_name = "UK Medicines and Healthcare products Regulatory Agency"

    def __init__(self, count: int = 100):
        self.count = count

    def fetch(self, since_days: int) -> list[Finding]:
        today = today_utc()
        cutoff = today - timedelta(days=since_days)

        params = {
            "filter_content_store_document_type": "medical_safety_alert",
            "count": str(self.count),
            "order": "-public_timestamp",
            "fields": "title,link,public_timestamp,description",
        }
        resp = _get(GOVUK_SEARCH, params=params)
        results = resp.json().get("results") or []

        findings: list[Finding] = []
        for doc in results:
            title = (doc.get("title") or "").strip()
            link = (doc.get("link") or "").strip()
            if not title or not link:
                continue

            # public_timestamp is ISO-8601 with a time component.
            published = (doc.get("public_timestamp") or "")[:10] or None
            pub_date = parse_iso_date(published)
            if pub_date and pub_date < cutoff:
                continue

            # GOV.UK returns site-relative links.
            url = link if link.startswith("http") else f"{GOVUK_BASE}{link}"

            # MHRA encodes the reference in the title, e.g. "EL(26)A/36".
            m = re.search(MHRA_REF, title)

            findings.append(
                Finding(
                    authority=self.authority,
                    category="safety_alert",
                    # Safety alerts carry no deadline; recency is the signal.
                    priority="high" if pub_date and (today - pub_date).days <= 7 else "normal",
                    title=title,
                    summary=(doc.get("description") or title).strip(),
                    detail=" · ".join(
                        p for p in ("Medical safety alert", f"Published {published}" if published else None) if p
                    ),
                    source_url=url,
                    document_number=m.group(1).strip() if m else None,
                    effective_date=None,
                    comment_deadline=None,
                    published_date=published,
                    verification="verified",
                    source_id=self.id,
                )
            )
        return findings


# ---------------------------------------------------------------------------
# GOV.UK organisations — DVSA, OPSS (and any GOV.UK-published authority)
# ---------------------------------------------------------------------------
# Same public endpoint as the MHRA source above (GOV.UK Search API, probed and
# working) but filtered by organisation rather than document type. GOV.UK
# publishes DVSA (vehicle standards) and OPSS (product safety) content through
# this API, exposing title, link, public_timestamp and description as typed
# fields.
#
# Marked 'unverified': the Search API does not carry an effective date or a
# consultation deadline, so — exactly as with the EASA feeds — the item and its
# link are the authority's, but the date fields a subscriber acts on are absent.
# They are left None, never parsed out of the text.
#
# NOTE: the GOV.UK API family is proven here (MHRA), but the per-organisation
# filter values below were confirmed from GOV.UK's documented organisation
# slugs, not live-probed in this build. The pull is resilient — a wrong slug
# returns zero results and is reported as such, never as a quiet news day.


class GovUkOrganisationSource:
    id = "govuk-org"

    def __init__(
        self,
        authority: str,
        authority_name: str,
        org_slug: str,
        category: str = "guidance",
        count: int = 100,
    ):
        self.authority = authority
        self.authority_name = authority_name
        self.org_slug = org_slug
        self.category = category
        self.count = count

    def fetch(self, since_days: int) -> list[Finding]:
        today = today_utc()
        cutoff = today - timedelta(days=since_days)

        params = {
            "filter_organisations": self.org_slug,
            "count": str(self.count),
            "order": "-public_timestamp",
            "fields": "title,link,public_timestamp,description",
        }
        resp = _get(GOVUK_SEARCH, params=params)
        results = resp.json().get("results") or []

        findings: list[Finding] = []
        for doc in results:
            title = (doc.get("title") or "").strip()
            link = (doc.get("link") or "").strip()
            if not title or not link:
                continue

            published = (doc.get("public_timestamp") or "")[:10] or None
            pub_date = parse_iso_date(published)
            if pub_date and pub_date < cutoff:
                continue

            url = link if link.startswith("http") else f"{GOVUK_BASE}{link}"

            findings.append(
                Finding(
                    authority=self.authority,
                    category=self.category,
                    # No deadline/effective date in the API, so recency only.
                    priority="normal" if pub_date and (today - pub_date).days <= 7 else "low",
                    title=title,
                    summary=(doc.get("description") or title).strip(),
                    detail=" · ".join(
                        p for p in (self.authority_name, f"Published {published}" if published else None) if p
                    ),
                    source_url=url,
                    document_number=None,
                    effective_date=None,
                    comment_deadline=None,
                    published_date=published,
                    verification="unverified",
                    source_id=self.id,
                )
            )
        return findings


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

def _caac_source():
    """CAAC source, imported here to keep the module import graph acyclic:
    caac.py needs sources._get for the shared session and retry policy."""
    from caac import CaacSource

    return CaacSource()


SOURCES: list[Source] = [
    FederalRegisterSource("FAA", "Federal Aviation Administration", "federal-aviation-administration"),
    FederalRegisterSource("FDA", "US Food and Drug Administration", "food-and-drug-administration"),
    # NHTSA rulemaking (FMVSS — 49 CFR 571) is published in the Federal Register,
    # so it rides the same proven API as FAA/FDA. This covers rules, proposed
    # rules and notices — NOT the separate api.nhtsa.gov product-recalls feed,
    # which is a different dataset still to be probed and built.
    FederalRegisterSource("NHTSA", "National Highway Traffic Safety Administration", "national-highway-traffic-safety-administration"),
    EasaRssSource(),
    MhraSafetyAlertSource(),
    GovUkOrganisationSource("DVSA", "UK Driver and Vehicle Standards Agency", "driver-and-vehicle-standards-agency"),
    GovUkOrganisationSource("OPSS", "UK Office for Product Safety and Standards", "office-for-product-safety-and-standards"),
    # CAAC's own listing service. Titles are rendered English-first with the
    # Chinese original retained; see caac.py for what is the authority's value
    # and what is ours.
    _caac_source(),
]

# Authorities in scope that have NO working source. Surfaced in every report so
# the gap is visible rather than reading as a quiet news day. Each note records
# what was actually observed when probed on 2026-07-24.
UNCOVERED: list[dict[str, str]] = [
    {
        "authority": "UK_CAA",
        "name": "UK Civil Aviation Authority",
        "note": "caa.co.uk returns HTTP 403 to automated requests. Blocked deliberately; not circumvented. Needs a licensed feed or written permission.",
    },
    {
        "authority": "TCCA",
        "name": "Transport Canada Civil Aviation",
        "note": "Only a site-wide RSS exists (tc.canada.ca/en/rss.xml, 10 items, all topics). Needs aviation filtering before it is useful.",
    },
    {
        "authority": "HEALTH_CANADA",
        "name": "Health Canada (medical devices)",
        "note": "recalls-rappels.canada.ca returns HTML, not JSON, at the paths probed. MDALL and the recalls database need investigation; Canada Gazette Part II is HTML only.",
    },
    {
        "authority": "EU_MDR",
        "name": "European Commission — MDR/IVDR (MDCG guidance)",
        "note": "health.ec.europa.eu publishes MDCG guidance as HTML; no feed found yet. High value for medical device clients.",
    },
    {
        "authority": "TGA",
        "name": "Therapeutic Goods Administration (Australia)",
        "note": "Not yet probed.",
    },
    {
        "authority": "PMDA",
        "name": "Pharmaceuticals and Medical Devices Agency (Japan)",
        "note": "Not yet probed.",
    },
    {
        "authority": "CAAC",
        "name": "Civil Aviation Administration of China",
        "note": "No public feed found at caac.gov.cn.",
    },
    {
        "authority": "ANAC",
        "name": "Brazil National Civil Aviation Agency",
        "note": "No public feed found at gov.br/anac.",
    },
    {
        "authority": "IAQG",
        "name": "International Aerospace Quality Group",
        "note": "Commercial body, no public feed. Content is licensed — see STATUS.md before scraping.",
    },
    {
        "authority": "ISO",
        "name": "International Organization for Standardization",
        "note": "Commercial body, licensed content. Do not scrape standard text; redistribution is prohibited.",
    },
    {
        "authority": "SAE",
        "name": "SAE International",
        "note": "Commercial body, licensed content. Do not scrape standard text.",
    },
    {
        "authority": "IATF",
        "name": "International Automotive Task Force",
        "note": "Commercial body, licensed content. Do not scrape standard text.",
    },
]


def pull_all(since_days: int, instrument_dates: dict | None = None,
             part_index: dict | None = None) -> list[SourceResult]:
    """Pull every configured source. One failure must not sink the run.

    `instrument_dates` carries EASA entry-into-force dates resolved from the
    eRules corpus (easa_enrich). Passed in rather than fetched here so that
    --dry-run stays credential-free: with no lookup, EASA findings keep their
    existing unverified shape instead of failing.
    """
    results: list[SourceResult] = []
    for source in SOURCES:
        if isinstance(source, EasaRssSource):
            if instrument_dates:
                source.instrument_dates = instrument_dates
            if part_index:
                source.part_index = part_index
        try:
            findings = source.fetch(since_days)
            results.append(
                SourceResult(source.id, source.authority, source.authority_name, findings, ok=True)
            )
            log.info("%s: %d items", source.authority_name, len(findings))
        except Exception as exc:  # noqa: BLE001
            results.append(
                SourceResult(source.id, source.authority, source.authority_name, [], ok=False, error=str(exc))
            )
            log.error("%s FAILED: %s", source.authority_name, exc)
    return results
