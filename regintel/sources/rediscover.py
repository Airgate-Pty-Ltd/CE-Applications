#!/usr/bin/env python3
"""Deterministic link rediscovery — find a replacement when a source 404s.

NO LLM. This is pure retrieval and string similarity, which is exactly what the
product's ethos requires: a proposed replacement is evidence (a real link that
exists on the authority's own site), scored transparently, and always left for
a human to confirm. Nothing is auto-adopted.

HOW IT FINDS A NEW LINK WHEN ONE BREAKS
Given a dead URL for a known authority domain, it gathers candidate URLs from
the authority's OWN site, then ranks them by how well they match the dead link:

  1. Redirect     — if the dead URL 3xx-redirects, that target is the strongest
                    candidate (the site is telling us where it moved).
  2. Sitemap      — fetch robots.txt, follow its `Sitemap:` entries (and one
                    level of sitemap-index nesting), collect URLs on the same
                    domain.
  3. Parent page  — walk up the path; the first ancestor that returns 200 is
                    fetched and its on-page links are harvested.

Each candidate is scored by:
  - Jaccard overlap of path-slug tokens with the dead URL's tokens
  - overlap with keywords from the source's name and purpose (e.g. "safety",
    "directive", "recall", "consultation")
  - a bonus for matching path depth and a shared leading path

The top candidates are written to rediscovery-report.md for human validation.
A source URL is only ever changed by a person acting on that report.
"""

from __future__ import annotations

import logging
import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.parse import urljoin, urlsplit

import requests

HERE = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.join(HERE, "rediscovery-report.md")

USER_AGENT = "Conform-Edge RegIntel/1.0 (+https://conform-edge.com; link rediscovery)"
TIMEOUT = 25
MAX_SITEMAP_URLS = 3000
MAX_CANDIDATES = 5

log = logging.getLogger("rediscover")

_STOP = {
    "en", "index", "html", "htm", "aspx", "asp", "php", "www", "gov", "org",
    "com", "the", "and", "of", "for", "pt", "br", "cn", "de", "a", "s", "pages",
    "default", "home", "list", "search",
}


def _get(url: str, **kw):
    return requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
        timeout=TIMEOUT,
        **kw,
    )


def tokens(text: str) -> set[str]:
    """Lowercase alphanumeric tokens, minus noise words and bare numbers."""
    raw = re.split(r"[^a-zA-Z0-9]+", (text or "").lower())
    return {t for t in raw if len(t) > 1 and t not in _STOP and not t.isdigit()}


def path_tokens(url: str) -> set[str]:
    return tokens(urlsplit(url).path)


def sitemap_candidates(domain_root: str) -> list[str]:
    """Collect on-site URLs from robots.txt Sitemap entries (one nesting level)."""
    urls: list[str] = []
    sitemaps: list[str] = []

    try:
        robots = _get(urljoin(domain_root, "/robots.txt"))
        if robots.ok:
            for line in robots.text.splitlines():
                if line.lower().startswith("sitemap:"):
                    sitemaps.append(line.split(":", 1)[1].strip())
    except requests.RequestException:
        pass

    if not sitemaps:
        sitemaps = [urljoin(domain_root, "/sitemap.xml")]

    host = urlsplit(domain_root).netloc
    for sm in sitemaps[:5]:
        try:
            resp = _get(sm)
            if not resp.ok:
                continue
            root = ET.fromstring(resp.content)
            locs = [e.text.strip() for e in root.iter() if e.tag.endswith("loc") and e.text]
            # A sitemap index points at more sitemaps; descend one level.
            if root.tag.endswith("sitemapindex"):
                for child_sm in locs[:5]:
                    try:
                        r2 = _get(child_sm)
                        if r2.ok:
                            r2root = ET.fromstring(r2.content)
                            urls += [e.text.strip() for e in r2root.iter() if e.tag.endswith("loc") and e.text]
                    except (requests.RequestException, ET.ParseError):
                        continue
            else:
                urls += locs
        except (requests.RequestException, ET.ParseError):
            continue
        if len(urls) >= MAX_SITEMAP_URLS:
            break

    return [u for u in urls[:MAX_SITEMAP_URLS] if urlsplit(u).netloc == host]


def parent_page_candidates(dead_url: str) -> list[tuple[str, str]]:
    """Walk up the path; harvest links from the first ancestor that returns 200.

    Returns (url, anchor_text) pairs.
    """
    parts = urlsplit(dead_url)
    segments = [s for s in parts.path.split("/") if s]
    for depth in range(len(segments) - 1, 0, -1):
        ancestor = f"{parts.scheme}://{parts.netloc}/" + "/".join(segments[:depth]) + "/"
        try:
            resp = _get(ancestor, allow_redirects=True)
        except requests.RequestException:
            continue
        if not resp.ok:
            continue
        pairs: list[tuple[str, str]] = []
        for m in re.finditer(r'<a\s[^>]*href="([^"]+)"[^>]*>(.*?)</a>', resp.text, re.I | re.S):
            href = urljoin(ancestor, m.group(1))
            if urlsplit(href).netloc != parts.netloc:
                continue
            anchor = re.sub(r"<[^>]+>", " ", m.group(2))
            anchor = re.sub(r"\s+", " ", anchor).strip()
            pairs.append((href.split("#")[0], anchor))
        if pairs:
            return pairs[:400]
    return []


def score(dead_url: str, keywords: set[str], candidate_url: str, anchor: str = "") -> float:
    """Similarity of a candidate to the dead link. Higher is better."""
    dead_tok = path_tokens(dead_url) | keywords
    cand_tok = path_tokens(candidate_url) | tokens(anchor)
    if not dead_tok or not cand_tok:
        return 0.0

    inter = len(dead_tok & cand_tok)
    union = len(dead_tok | cand_tok)
    jaccard = inter / union if union else 0.0

    # Bonus: shares the leading path segment (same area of the site).
    dead_lead = urlsplit(dead_url).path.strip("/").split("/")[:1]
    cand_lead = urlsplit(candidate_url).path.strip("/").split("/")[:1]
    lead_bonus = 0.15 if dead_lead and dead_lead == cand_lead else 0.0

    # Bonus: similar path depth (not a landing page, not buried deeper).
    dd = urlsplit(dead_url).path.count("/")
    cd = urlsplit(candidate_url).path.count("/")
    depth_bonus = 0.1 if abs(dd - cd) <= 1 else 0.0

    return round(jaccard + lead_bonus + depth_bonus, 4)


def find_replacement(dead_url: str, keywords: set[str]) -> list[tuple[float, str, str]]:
    """Return ranked (score, candidate_url, provenance) for a dead URL."""
    parts = urlsplit(dead_url)
    root = f"{parts.scheme}://{parts.netloc}"
    scored: dict[str, tuple[float, str]] = {}

    # 1. Redirect target (strongest signal if present).
    try:
        r = _get(dead_url, allow_redirects=True)
        if r.history and r.ok and r.url.rstrip("/") != dead_url.rstrip("/"):
            scored[r.url] = (1.0, "redirect")
    except requests.RequestException:
        pass

    # 2. Sitemap.
    for u in sitemap_candidates(root):
        sc = score(dead_url, keywords, u)
        if sc > scored.get(u, (0, ""))[0]:
            scored[u] = (sc, "sitemap")

    # 3. Parent-page links.
    for u, anchor in parent_page_candidates(dead_url):
        sc = score(dead_url, keywords, u, anchor)
        if sc > scored.get(u, (0, ""))[0]:
            scored[u] = (sc, "parent-page")

    ranked = sorted(
        ((sc, url, prov) for url, (sc, prov) in scored.items() if sc > 0.05),
        reverse=True,
    )
    return ranked[:MAX_CANDIDATES]


def propose_for_dead(dead_records: list[dict]) -> None:
    """Write rediscovery-report.md with ranked replacement candidates."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# RegIntel — Link Rediscovery Proposals",
        "",
        f"**Generated:** {now}",
        "",
        "Deterministic candidates for dead links, drawn from each authority's own "
        "site (redirect target, sitemap, or parent page) and ranked by similarity "
        "to the dead URL. **No LLM.** Every proposal requires human confirmation "
        "before the source URL is changed.",
        "",
    ]

    for rec in dead_records:
        kw = tokens(rec.get("source_name", "")) | tokens(rec.get("purpose", ""))
        log.info("rediscovering %s", rec["url"])
        candidates = find_replacement(rec["url"], kw)

        lines.append(f"## {rec['source_name']} ({rec['source_id']})")
        lines.append(f"- **Dead:** {rec['url']}")
        if not candidates:
            lines.append("- No on-site candidate scored above threshold. Needs manual search.")
        else:
            lines.append("- **Candidates (confirm before adopting):**")
            for sc, url, prov in candidates:
                lines.append(f"  - `{sc:.2f}` [{prov}] {url}")
        lines.append("")

    with open(REPORT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")
    log.info("Wrote %s", REPORT)


if __name__ == "__main__":
    import json
    import sys

    for stream in ("stdout", "stderr"):
        s = getattr(sys, stream)
        if hasattr(s, "reconfigure"):
            s.reconfigure(encoding="utf-8", errors="replace")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(message)s", datefmt="%H:%M:%S")

    data = json.load(open(os.path.join(HERE, "registry.json"), encoding="utf-8"))
    dead = [r for r in data["records"] if r.get("last_status") == "dead"]
    if not dead:
        print("No dead links recorded. Run healthcheck.py first.")
    else:
        propose_for_dead(dead)
