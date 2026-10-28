"""CAAC — Civil Aviation Administration of China.

DISCOVERY
The published index pages carry no items: they are JavaScript-driven, and
?fl=12 and ?fl=15 return byte-identical HTML. The listings they display come
from a TRS WCM service, found by watching what a real browser requests:

    /was5/web/search?page=<n>&channelid=211383&fl=<category>

That returns a server-rendered table, ten rows per page, newest first, with the
fields change detection needs — title and canonical URL, 发文日期 (issue date),
文号 (document number), 办文单位 (issuing department) and 有效性 (validity).

Access is permitted: robots.txt allows general crawling and excludes only
/CAAC/local/ and /image/.

WHAT IS THE AUTHORITY'S AND WHAT IS OURS
The date, document number, department, validity and URL are CAAC's own values,
read verbatim. The Chinese title is CAAC's own words and is always preserved.

The English rendering is OURS, produced by a deterministic glossary
(caac_terms) rather than a model, and it is always presented alongside the
Chinese rather than replacing it. Because it is derived rather than published,
these findings are marked `unverified` — a subscriber must be able to tell at a
glance that the English is an aid, not the authority's text.

No effective date is published in the listing, so effective_date stays None
rather than being read off a title that happens to mention one.
"""

from __future__ import annotations

import html
import logging
import re
from datetime import timedelta
from urllib.parse import urljoin

from caac_terms import bilingual, render
from models import Finding, parse_iso_date, today_utc

log = logging.getLogger(__name__)

CAAC_BASE = "https://www.caac.gov.cn"
CAAC_SEARCH = f"{CAAC_BASE}/was5/web/search"

# The listing channel behind the 信息公开 (information disclosure) indexes.
CAAC_CHANNEL = "211383"

# fl -> (category, human label). Confirmed by sampling each; fl=11 is
# production statistics and deliberately excluded — it is not regulatory.
CAAC_CATEGORIES: list[tuple[str, str, str]] = [
    ("12", "regulation", "Laws and regulations"),
    ("13", "regulation", "CCAR rules"),
    ("14", "notice", "Advisory and normative documents"),
    ("15", "standard", "Standards"),
]

# 有效性 — CAAC's own validity vocabulary.
VALIDITY = {
    "有效": "in_force",
    "已废止": "repealed",
    "废止": "repealed",
    "失效": "not_in_force",
    "部分有效": "partially_in_force",
}

_ROW = re.compile(r"<tr>(.*?)</tr>", re.S)
_LINK = re.compile(r'<a[^>]+href="([^"]*t\d{8}_\d+\.html)"[^>]*>(.*?)</a>', re.S)
_FIELD_DATE = re.compile(r"发文日期：\s*</b>\s*(\d{4})年(\d{1,2})月(\d{1,2})日")
_FIELD_DEPT = re.compile(r"办文单位：\s*</b>\s*([^<]{1,40})")
_TD_DATE = re.compile(r'<td[^>]*class="tdRQ"[^>]*>\s*(\d{4})年(\d{1,2})月(\d{1,2})日')
_TD_DOCNUM = re.compile(r'<td[^>]*class="strFL"[^>]*>\s*([^<]{1,80}?)\s*</td>', re.S)
_TD_VALID = re.compile(r'<td[^>]*class="strGF"[^>]*>.*?>\s*([^<]{1,20}?)\s*</', re.S)


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", text))).strip()


def parse_listing(page_html: str) -> list[dict]:
    """Parse one listing page into raw records. No network, no interpretation."""
    out: list[dict] = []
    for row in _ROW.findall(page_html):
        link = _LINK.search(row)
        if not link:
            continue

        url, title_html = link.group(1), link.group(2)
        title = _clean(title_html)
        if not title:
            continue

        # CAAC prints the issue date twice: in the expandable detail block and
        # in its own column. Read either, so a change to one layout does not
        # silently drop every date and leave the window filter with nothing to
        # bite on.
        published = None
        m = _FIELD_DATE.search(row) or _TD_DATE.search(row)
        if m:
            published = f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"

        dept = _FIELD_DEPT.search(row)
        docnum = _TD_DOCNUM.search(row)
        valid = _TD_VALID.search(row)

        out.append({
            "title_zh": title,
            "url": url if url.startswith("http") else CAAC_BASE + url,
            "published": published,
            "department_zh": _clean(dept.group(1)) or None if dept else None,
            # CAAC leaves 文号 blank for some instruments; an empty string would
            # become a finding_key of "" and collide across documents.
            "document_number": (_clean(docnum.group(1)) or None) if docnum else None,
            "validity_zh": (_clean(valid.group(1)) or None) if valid else None,
        })
    return out


def total_pages(page_html: str) -> int | None:
    """Pages available, from CAAC's own '共N页' footer."""
    m = re.search(r"共\s*(\d+)\s*页", page_html)
    return int(m.group(1)) if m else None


# Layer 2 of the CAAC architecture: the listing gives a title and nothing else,
# which left a card with 17 characters of text and a link to click. The
# document page carries the regulation itself.
_CONTENT = re.compile(r'class="content"')
_CHAPTER = re.compile(r"第[一二三四五六七八九十百]+章\s*([^\s第]{2,14})")
_ARTICLE_1 = re.compile(r"第一条\s*(.{40,400}?)(?:第二条|$)", re.S)
# Site chrome appended below the body on every document page.
_NAV = re.compile(r"综合司|附件：|相关附件|扫一扫|打印本页|分享到")


_ATTACHMENT = re.compile(r'href="([^"]+\.(?:pdf|doc|docx))"', re.I)


def extract_attachments(page_html: str, base_url: str) -> list[str]:
    """Attachment URLs on a document page.

    CAAC publishes laws as inline HTML, but advisory circulars, CCAR rules and
    technical standards as a stub page whose text lives entirely in a PDF. We
    do not parse those PDFs, so the least we can do is point at the document
    itself rather than the stub that mentions it.
    """
    # Attachment hrefs are relative to the DOCUMENT's directory
    # ("./P020260701736960460304.pdf"), not to the site root. Joining them to
    # the root produced a 404 for every attachment, silently — the finding just
    # came back with no text and no error.
    out: list[str] = []
    for href in _ATTACHMENT.findall(page_html):
        url = urljoin(base_url, href)
        if url not in out:
            out.append(url)
    return out


def extract_body(page_html: str) -> tuple[list[str], str]:
    """Chapter headings and the opening article, from a CAAC document page.

    Returns ([], "") rather than raising: a document whose body cannot be read
    should still appear in the feed with its publisher metadata intact.
    """
    m = _CONTENT.search(page_html)
    if not m:
        return [], ""
    # Start after the '>' that closes the opening tag, or the attribute text
    # ('class="content" data-role=...') lands in the extracted body.
    open_end = page_html.find(">", m.end())
    start = open_end + 1 if open_end != -1 else m.end()
    chunk = page_html[start:start + 60000]
    chunk = re.sub(r"<script.*?</script>", " ", chunk, flags=re.S | re.I)
    chunk = re.sub(r"<style.*?</style>", " ", chunk, flags=re.S | re.I)
    text = _clean(chunk)

    chapters = _CHAPTER.findall(text)[:8]
    opening = ""
    a = _ARTICLE_1.search(text)
    if a:
        opening = a.group(1).strip()
    elif text:
        # No numbered articles (a State Council decision, say). Take the head of
        # the text but stop at the department navigation CAAC appends to every
        # page, which is chrome rather than content.
        opening = _NAV.split(text[:900])[0].strip()[:400]
    return chapters, opening


_META_CHARSET = re.compile(rb'charset=["\']?\s*([A-Za-z0-9_-]+)', re.I)


def _decode(resp) -> str:
    """Decode a CAAC page using the charset it declares.

    CAAC serves document pages as a bare `Content-Type: text/html` with no
    charset, so requests falls back to ISO-8859-1 and every Chinese character
    arrives as mojibake. The document's own <meta> tag says utf-8; trust that,
    then chardet, then utf-8.
    """
    m = _META_CHARSET.search(resp.content[:2048])
    for enc in ([m.group(1).decode("ascii", "ignore")] if m else []) + [resp.apparent_encoding, "utf-8"]:
        if not enc:
            continue
        try:
            return resp.content.decode(enc, errors="strict")
        except (LookupError, UnicodeDecodeError):
            continue
    return resp.content.decode("utf-8", errors="replace")


def fetch_body(url: str) -> tuple[list[str], str, list[str]]:
    from sources import _get

    try:
        page = _decode(_get(url))
        chapters, opening = extract_body(page)
        return chapters, opening, extract_attachments(page, url)
    except Exception as exc:  # noqa: BLE001 — never let one document sink the run
        log.debug("CAAC body unavailable for %s (%s)", url, exc)
        return [], "", []


def _summary(chapters: list[str], opening: str, title_zh: str, pdf=None) -> str:
    """Card text: English structure first, then CAAC's own words.

    Chapter headings are noun compounds and render well; the body prose does
    not, so it is shown in the original rather than mangled into pseudo-English.
    """
    parts: list[str] = []
    if chapters:
        rendered = []
        for c in chapters:
            en, cov = render(c)
            rendered.append(en if cov >= 0.6 else c)
        parts.append("Contents: " + "; ".join(rendered) + ".")
    if opening:
        parts.append(opening if len(opening) <= 700 else opening[:700] + "…")
    elif pdf is not None and pdf.text:
        body = pdf.text
        parts.append(body if len(body) <= 700 else body[:700] + "…")
    return " ".join(parts) if parts else title_zh


class CaacSource:
    id = "caac-listing"
    authority = "CAAC"
    authority_name = "Civil Aviation Administration of China"

    def __init__(self, categories: list[tuple[str, str, str]] | None = None,
                 max_pages: int = 3, fetch_bodies: bool = True,
                 max_bodies: int = 60, read_attachments: bool = True):
        self.categories = categories or CAAC_CATEGORIES
        # One extra request per in-window document. Bounded so an unusually
        # busy window cannot turn a 10-second run into a several-minute one.
        self.fetch_bodies = fetch_bodies
        self.max_bodies = max_bodies
        # Advisory circulars and standards publish their text only as a PDF.
        # Read once and cached on disk, so a daily run re-reads nothing.
        self.read_attachments = read_attachments
        self._bodies_fetched = 0
        # The listing is ordered newest first, so the window is reached within
        # a couple of pages in normal operation. The cap stops a date-parsing
        # failure from walking all 136 pages of a category.
        self.max_pages = max_pages

    def fetch(self, since_days: int) -> list[Finding]:
        from sources import _get  # shared session/retry policy

        today = today_utc()
        cutoff = today - timedelta(days=since_days)
        findings: list[Finding] = []
        errors: list[str] = []

        for fl, category, label in self.categories:
            for page in range(1, self.max_pages + 1):
                url = f"{CAAC_SEARCH}?page={page}&channelid={CAAC_CHANNEL}&fl={fl}"
                try:
                    resp = _get(url)
                except Exception as exc:  # noqa: BLE001 — one category must not sink the rest
                    errors.append(f"fl={fl} page={page}: {exc}")
                    log.warning("CAAC listing failed: %s (%s)", url, exc)
                    break

                records = parse_listing(resp.text)
                if not records:
                    break

                stop = False
                for r in records:
                    pub = parse_iso_date(r["published"]) if r["published"] else None
                    if pub and pub < cutoff:
                        stop = True   # newest-first: everything after is older
                        continue

                    chapters, opening, attachments = ([], "", [])
                    if self.fetch_bodies and self._bodies_fetched < self.max_bodies:
                        chapters, opening, attachments = fetch_body(r["url"])
                        self._bodies_fetched += 1

                    # No inline text: the document lives in an attachment.
                    pdf_text = None
                    if self.read_attachments and attachments and not opening:
                        from caac_pdf import text_for
                        from sources import _get as _fetch

                        pdf = text_for(attachments[0], _fetch)
                        if pdf.text:
                            pdf_text = pdf

                    title_en, coverage = render(r["title_zh"])
                    department = None
                    if r["department_zh"]:
                        dept_en, _ = render(r["department_zh"])
                        department = f"{dept_en} ({r['department_zh']})"

                    validity = VALIDITY.get(r["validity_zh"] or "", r["validity_zh"])

                    detail = " · ".join(p for p in (
                        label,
                        f"Status: {validity.replace('_', ' ')}" if validity else None,
                        f"Issuing department: {department}" if department else None,
                        f"Published {r['published']}" if r["published"] else None,
                        # Say so plainly when the text is not on the page: the
                        # card would otherwise look thin for no stated reason.
                        f"Full text published as an attachment: {attachments[0]}"
                        if attachments and not opening else None,
                        # Say how the text was obtained. OCR is recognition, not
                        # a copy, and a reader is entitled to know which they
                        # are looking at before relying on it.
                        ("Text read from the attachment's embedded text layer"
                         if pdf_text and pdf_text.is_exact else
                         "Text recognised from a scanned attachment by OCR — "
                         "verify against the source before relying on it"
                         if pdf_text else None),
                        "English title rendered from a terminology glossary; "
                        "the Chinese title is CAAC's own and is authoritative",
                    ) if p)

                    findings.append(
                        Finding(
                            authority=self.authority,
                            category=category,
                            # No deadline or effective date is published in the
                            # listing, so recency is the only honest signal.
                            priority="normal" if pub and (today - pub).days <= 7 else "low",
                            title=bilingual(r["title_zh"]),
                            summary=_summary(chapters, opening, r["title_zh"], pdf_text),
                            detail=detail,
                            source_url=r["url"],
                            document_number=r["document_number"],
                            effective_date=None,
                            comment_deadline=None,
                            published_date=r["published"],
                            # The English is ours, not CAAC's. Until an official
                            # English text is matched, this must not be
                            # presented as the authority's own record.
                            verification="unverified",
                            source_id=self.id,
                            # Hash CAAC's own Chinese title, so extending the
                            # translation glossary never reports a document as
                            # amended by the authority when only our rendering
                            # of it improved.
                            hash_title=r["title_zh"],
                            # Hash CAAC's own text, not our rendering of it.
                            # Hash CAAC's title, never the extracted body: OCR
                            # is not guaranteed byte-identical across macOS
                            # versions, and a re-recognition must not report the
                            # document as amended by the authority.
                            hash_summary=(opening or r["title_zh"]),
                        )
                    )

                if stop:
                    break

        if errors and not findings:
            raise RuntimeError("all CAAC categories failed: " + "; ".join(errors))
        return findings
