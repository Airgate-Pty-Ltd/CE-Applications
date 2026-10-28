"""Ports that wire the Source Sentinel to RegIntel's real stack — no LLM, no
search API.

The Sentinel (source_sentinel.py, Brian's governed core) needs two injected
ports: a Fetcher and a Searcher. Its docstring notes the Searcher normally
needs "an API or an LLM web tool". We have neither, and want neither.

But `rediscover.py` is exactly a deterministic candidate finder that needs
neither: given a dead URL it gathers candidates from the authority's OWN site
(redirect target, sitemap, parent page). So it slots straight into the Sentinel
as the candidate engine, and the Sentinel's trust boundary — same registrable
domain + identity_markers match + dead across ≥2 days — governs what it does
with them.

This module provides:
  * RequestsFetcher  — a Fetcher using `requests` (better TLS/redirect handling
                       than urllib for these government sites).
  * DeterministicSentinel — a SourceSentinel whose _heal() draws candidates from
                       rediscover instead of a web search. Everything else — the
                       identity check, the same-domain/cross-domain decision, the
                       changelog, criticality escalation — is Brian's unchanged
                       governance.
"""

from __future__ import annotations

import requests

from rediscover import find_replacement, tokens
from source_sentinel import (
    FetchResult,
    Mode,
    Report,
    Source,
    SourceSentinel,
    Status,
    same_domain,
)

USER_AGENT = "Conform-Edge RegIntel/1.0 (+https://conform-edge.com; source sentinel)"


class RequestsFetcher:
    """Fetcher port backed by requests. Follows redirects, caps body size."""

    def __init__(self, timeout: float = 25.0, max_bytes: int = 300_000):
        self.timeout = timeout
        self.max_bytes = max_bytes

    def fetch(self, url: str) -> FetchResult:
        try:
            resp = requests.get(
                url,
                headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
                timeout=self.timeout,
                allow_redirects=True,
                stream=True,
            )
            body = resp.raw.read(self.max_bytes, decode_content=True) or b""
            text = body.decode(resp.encoding or "utf-8", "replace")
            ok = resp.status_code < 400
            final = resp.url
            resp.close()
            return FetchResult(ok=ok, status=resp.status_code, final_url=final, text=text)
        except Exception as exc:  # noqa: BLE001 - any failure is a "broken" signal
            status = getattr(exc, "code", 0) or 0
            return FetchResult(ok=False, status=status, final_url=url, text=str(exc))


def keywords_for(s: Source) -> set[str]:
    """Search keywords for a source: its name/authority and purpose."""
    return tokens(s.authority) | tokens(s.purpose)


class DeterministicSentinel(SourceSentinel):
    """SourceSentinel that heals from on-site rediscovery instead of web search.

    Overrides only _heal. The candidate SOURCE changes (deterministic, on the
    authority's own domain); the GOVERNANCE is unchanged — identity_markers must
    match, same-domain auto-applies, cross-domain is proposed, required/sentinel
    escalate, and every change is logged.
    """

    def _heal(self, s: Source, report: Report) -> None:
        candidates = [url for _score, url, _prov in find_replacement(s.url, keywords_for(s))]

        for cand in candidates[: self.max_candidates]:
            # Identity check is mandatory — a bare 200 is never enough. This is
            # what stops a mirror/aggregator/lookalike being adopted.
            if not self.verify_candidate(s, cand):
                continue
            if same_domain(cand, s.url):
                self._apply_replacement(s, cand, Mode.auto)
                self.log.record(
                    s.id, "auto_replaced",
                    old_url=s.replacement_history[-1]["from"], new_url=cand,
                    source="rediscover", criticality=s.criticality.value,
                )
                report.auto_replaced.append(
                    {"source_id": s.id, "old_url": s.replacement_history[-1]["from"], "new_url": cand}
                )
                return
            # Cross-domain: propose only, never auto-apply.
            self._apply_replacement(s, cand, Mode.proposed)
            self.log.record(
                s.id, "proposed_replacement", old_url=s.url, candidate=cand,
                reason="cross_domain", source="rediscover", criticality=s.criticality.value,
            )
            report.proposed.append({"source_id": s.id, "old_url": s.url, "candidate": cand})
            return

        # Nothing verified — mark broken and escalate the critical ones.
        s.status = Status.broken
        self.log.record(s.id, "unresolved_broken", url=s.url, criticality=s.criticality.value)
        item = {"source_id": s.id, "authority": s.authority, "url": s.url}
        report.still_broken.append(item)
        from source_sentinel import Criticality

        if s.criticality in (Criticality.required, Criticality.sentinel):
            report.escalations.append(item)
