"""
RegIntelligence Source Sentinel — self-healing source registry.

Deterministic, dependency-free core. Network and search are injected (ports), so the
same governance runs on top of whatever HTTP/search stack RegIntelligence already uses.

Governance invariants (enforced below):
  * Validation is read-only and only ever fetches the source URL itself.
  * A replacement auto-applies ONLY if: original is dead (>=2 failures on >=2 days),
    the replacement is on the SAME registrable domain, and its content identity matches.
  * Cross-domain replacements are PROPOSED, never auto-applied.
  * `required` / `sentinel` sources are never auto-retired.
  * Every change is appended to an immutable change log.

Author: Brian Olea / Conform-Edge. Version 1.0.0.
"""

from __future__ import annotations

import json
import datetime
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Callable, Iterable, Optional, Protocol
from urllib.parse import urlparse
from urllib import request as _urlreq


# --------------------------------------------------------------------------- #
# Registrable-domain extraction (the trust boundary)
# --------------------------------------------------------------------------- #

# Two-label public suffixes that appear in the regulatory-source registries. This is a
# pragmatic, extensible list — NOT the full Public Suffix List. Add suffixes as needed;
# an unknown suffix simply falls back to "last two labels", which is conservative.
_MULTI_SUFFIXES = {
    "gov.uk", "co.uk", "org.uk", "ac.uk",
    "gov.au", "com.au", "gov.br", "com.br", "gov.cn", "com.cn",
    "gov.sg", "gov.in", "nic.in", "gov.ae", "gov.sa", "gov.it",
    "go.jp", "co.jp", "or.jp", "gob.mx", "gob.cl", "gob.es",
    "co.za", "org.za", "govt.nz", "co.nz", "go.kr", "or.kr",
}


def registrable_domain(url: str) -> str:
    """eTLD+1 of a URL's host. 'https://ad.easa.europa.eu/x' -> 'europa.eu';
    'https://consultation.casa.gov.au' -> 'casa.gov.au'."""
    host = (urlparse(url).hostname or "").lower().strip(".")
    if not host:
        return ""
    labels = host.split(".")
    if len(labels) <= 2:
        return host
    if ".".join(labels[-2:]) in _MULTI_SUFFIXES:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])


def same_domain(a: str, b: str) -> bool:
    return registrable_domain(a) == registrable_domain(b) and registrable_domain(a) != ""


# --------------------------------------------------------------------------- #
# Ports — inject RegIntelligence's real network / search stack
# --------------------------------------------------------------------------- #

@dataclass
class FetchResult:
    ok: bool          # transport succeeded and status < 400
    status: int       # HTTP status (0 on transport error)
    final_url: str    # URL after following redirects
    text: str         # decoded body (may be truncated)


class Fetcher(Protocol):
    def fetch(self, url: str) -> FetchResult: ...


class Searcher(Protocol):
    def search(self, query: str) -> list[str]: ...


class UrllibFetcher:
    """Stdlib fetcher. Follows redirects; caps body size. Replace with requests/httpx if
    you prefer, or wrap RegIntelligence's own client."""

    def __init__(self, timeout: float = 15.0, max_bytes: int = 200_000,
                 user_agent: str = "RegIntelligence-SourceSentinel/1.0 (+quality-monitoring)"):
        self.timeout = timeout
        self.max_bytes = max_bytes
        self.user_agent = user_agent

    def fetch(self, url: str) -> FetchResult:
        req = _urlreq.Request(url, headers={"User-Agent": self.user_agent})
        try:
            with _urlreq.urlopen(req, timeout=self.timeout) as resp:
                body = resp.read(self.max_bytes)
                text = body.decode(resp.headers.get_content_charset() or "utf-8", "replace")
                return FetchResult(ok=True, status=resp.status, final_url=resp.geturl(), text=text)
        except Exception as exc:  # noqa: BLE001 - any failure is a "broken" signal
            status = getattr(exc, "code", 0) or 0
            return FetchResult(ok=False, status=status, final_url=url, text=str(exc))


class NullSearcher:
    """Default when no search backend is wired: healing can only report, not replace."""

    def search(self, query: str) -> list[str]:
        return []


# --------------------------------------------------------------------------- #
# Domain model
# --------------------------------------------------------------------------- #

class Criticality(str, Enum):
    required = "required"    # register depends on it; never auto-retired
    common = "common"
    rare = "rare"
    sentinel = "sentinel"    # may be quiet for long periods; never auto-retired


class Status(str, Enum):
    validated = "validated"
    broken = "broken"
    proposed = "proposed"    # replacement awaiting human approval
    retired = "retired"      # only after human confirmation


class Outcome(str, Enum):
    ok = "OK"
    ok_redirect_indomain = "OK_REDIRECT_INDOMAIN"
    moved_crossdomain = "MOVED_CROSSDOMAIN"
    content_drift = "CONTENT_DRIFT"
    broken = "BROKEN"


class Mode(str, Enum):
    auto = "auto"
    proposed = "proposed"


@dataclass
class Source:
    id: str
    authority: str
    url: str
    identity_markers: list[str] = field(default_factory=list)
    criticality: Criticality = Criticality.common
    tier: str = "primary"
    country: str = ""
    purpose: str = ""
    registrable_domain: str = ""          # trust boundary; derived if empty
    status: Status = Status.validated
    last_validated: Optional[str] = None
    failure_dates: list[str] = field(default_factory=list)
    proposed_replacement: Optional[str] = None
    replacement_history: list[dict] = field(default_factory=list)

    def __post_init__(self):
        if isinstance(self.criticality, str):
            self.criticality = Criticality(self.criticality)
        if isinstance(self.status, str):
            self.status = Status(self.status)
        if not self.registrable_domain:
            self.registrable_domain = registrable_domain(self.url)


class SourceRegistry:
    def __init__(self, sources: list[Source], meta: Optional[dict] = None):
        self.sources = sources
        self.meta = meta or {}

    @classmethod
    def load(cls, path: str) -> "SourceRegistry":
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        srcs = [Source(**s) for s in data.get("sources", [])]
        meta = {k: v for k, v in data.items() if k != "sources"}
        return cls(srcs, meta)

    def save(self, path: str) -> None:
        payload = dict(self.meta)
        payload["sources"] = [
            {**asdict(s), "criticality": s.criticality.value, "status": s.status.value}
            for s in self.sources
        ]
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)


# --------------------------------------------------------------------------- #
# Change log (append-only, immutable)
# --------------------------------------------------------------------------- #

class ChangeLog:
    def __init__(self, path: Optional[str], clock: Callable[[], str]):
        self.path = path
        self.clock = clock
        self.entries: list[dict] = []

    def record(self, source_id: str, event: str, **fields) -> None:
        entry = {"ts": self.clock(), "source_id": source_id, "event": event, **fields}
        self.entries.append(entry)
        if self.path:
            with open(self.path, "a", encoding="utf-8") as fh:  # append-only
                fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


# --------------------------------------------------------------------------- #
# Report
# --------------------------------------------------------------------------- #

@dataclass
class Report:
    validated: list[str] = field(default_factory=list)
    auto_replaced: list[dict] = field(default_factory=list)
    proposed: list[dict] = field(default_factory=list)
    still_broken: list[dict] = field(default_factory=list)
    escalations: list[dict] = field(default_factory=list)

    def render(self) -> str:
        lines = ["RegIntelligence Source Sentinel — maintenance pass", "=" * 52,
                 f"validated:      {len(self.validated)}",
                 f"auto-replaced:  {len(self.auto_replaced)}  (review after the fact)",
                 f"proposed:       {len(self.proposed)}  (need approval)",
                 f"still broken:   {len(self.still_broken)}",
                 f"ESCALATIONS:    {len(self.escalations)}  (required/sentinel, no in-domain fix)"]
        for e in self.escalations:
            lines.append(f"  ! {e['source_id']} ({e['authority']}): {e['url']}")
        for p in self.proposed:
            lines.append(f"  ? {p['source_id']}: {p['old_url']}  ->  {p['candidate']}  [APPROVE?]")
        for a in self.auto_replaced:
            lines.append(f"  ~ {a['source_id']}: {a['old_url']}  ->  {a['new_url']}")
        return "\n".join(lines)


# --------------------------------------------------------------------------- #
# The Sentinel
# --------------------------------------------------------------------------- #

def _today() -> str:
    return datetime.date.today().isoformat()


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class SourceSentinel:
    def __init__(self, registry: SourceRegistry, fetcher: Fetcher,
                 searcher: Optional[Searcher] = None,
                 changelog_path: Optional[str] = None,
                 clock_date: Callable[[], str] = _today,
                 clock_ts: Callable[[], str] = _now,
                 min_marker_ratio: float = 0.5,
                 max_candidates: int = 3):
        self.registry = registry
        self.fetcher = fetcher
        self.searcher = searcher or NullSearcher()
        self.log = ChangeLog(changelog_path, clock_ts)
        self.clock_date = clock_date
        self.min_marker_ratio = min_marker_ratio
        self.max_candidates = max_candidates

    # ---- identity ----
    def identity_ok(self, text: str, markers: Iterable[str]) -> bool:
        markers = [m for m in markers if m]
        if not markers:
            return True  # no markers declared -> cannot verify; treat as pass (log elsewhere)
        low = text.lower()
        hits = sum(1 for m in markers if m.lower() in low)
        return hits >= max(1, round(len(markers) * self.min_marker_ratio))

    # ---- validate (READ-ONLY) ----
    def validate(self, s: Source) -> tuple[Outcome, FetchResult]:
        res = self.fetcher.fetch(s.url)
        if not res.ok or res.status >= 400:
            return Outcome.broken, res
        if not self.identity_ok(res.text, s.identity_markers):
            return Outcome.content_drift, res
        if res.final_url and res.final_url.rstrip("/") != s.url.rstrip("/"):
            if same_domain(res.final_url, s.url):
                return Outcome.ok_redirect_indomain, res
            return Outcome.moved_crossdomain, res
        return Outcome.ok, res

    # ---- verify a replacement candidate ----
    def verify_candidate(self, s: Source, candidate_url: str) -> bool:
        res = self.fetcher.fetch(candidate_url)
        return res.ok and res.status < 400 and self.identity_ok(res.text, s.identity_markers)

    # ---- helpers ----
    def _record_failure(self, s: Source) -> int:
        today = self.clock_date()
        if today not in s.failure_dates:
            s.failure_dates.append(today)
        return len(set(s.failure_dates))

    def _apply_replacement(self, s: Source, new_url: str, mode: Mode) -> None:
        entry = {"from": s.url, "to": new_url, "mode": mode.value,
                 "at": self.clock_date(), "same_domain": same_domain(new_url, s.url)}
        s.replacement_history.append(entry)
        if mode is Mode.auto:
            s.url = new_url
            s.registrable_domain = registrable_domain(new_url)
            s.status = Status.validated
            s.last_validated = self.clock_date()
            s.failure_dates.clear()
            s.proposed_replacement = None
        else:  # proposed: do NOT change the live url
            s.proposed_replacement = new_url
            s.status = Status.proposed

    def _heal(self, s: Source, report: Report) -> None:
        query = f"{s.authority} {s.purpose or 'official regulatory source'} official site {self.clock_date()[:4]}"
        candidates = self.searcher.search(query)[: self.max_candidates]
        for cand in candidates:
            if not self.verify_candidate(s, cand):
                continue
            if same_domain(cand, s.url):
                self._apply_replacement(s, cand, Mode.auto)
                self.log.record(s.id, "auto_replaced", old_url=s.replacement_history[-1]["from"],
                                new_url=cand, criticality=s.criticality.value)
                report.auto_replaced.append({"source_id": s.id, "old_url": s.replacement_history[-1]["from"],
                                             "new_url": cand})
                return
            else:
                self._apply_replacement(s, cand, Mode.proposed)
                self.log.record(s.id, "proposed_replacement", old_url=s.url, candidate=cand,
                                reason="cross_domain", criticality=s.criticality.value)
                report.proposed.append({"source_id": s.id, "old_url": s.url, "candidate": cand})
                return
        # nothing verified
        s.status = Status.broken
        self.log.record(s.id, "unresolved_broken", url=s.url, criticality=s.criticality.value)
        item = {"source_id": s.id, "authority": s.authority, "url": s.url}
        report.still_broken.append(item)
        if s.criticality in (Criticality.required, Criticality.sentinel):
            report.escalations.append(item)

    # ---- the maintenance pass ----
    def run_maintenance_pass(self) -> Report:
        report = Report()
        for s in self.registry.sources:
            if s.status is Status.retired:
                continue
            outcome, res = self.validate(s)

            if outcome is Outcome.ok:
                s.status = Status.validated
                s.last_validated = self.clock_date()
                s.failure_dates.clear()
                report.validated.append(s.id)

            elif outcome is Outcome.ok_redirect_indomain:
                old = s.url
                self._apply_replacement(s, res.final_url, Mode.auto)
                self.log.record(s.id, "auto_followed_redirect", old_url=old, new_url=res.final_url,
                                criticality=s.criticality.value)
                report.auto_replaced.append({"source_id": s.id, "old_url": old, "new_url": res.final_url})

            elif outcome is Outcome.moved_crossdomain:
                # a cross-domain redirect is a candidate, never auto-applied
                self._apply_replacement(s, res.final_url, Mode.proposed)
                self.log.record(s.id, "proposed_replacement", old_url=s.url, candidate=res.final_url,
                                reason="cross_domain_redirect", criticality=s.criticality.value)
                report.proposed.append({"source_id": s.id, "old_url": s.url, "candidate": res.final_url})

            else:  # BROKEN or CONTENT_DRIFT
                fail_days = self._record_failure(s)
                self.log.record(s.id, "validation_failed", url=s.url, outcome=outcome.value,
                                fail_days=fail_days, status=res.status)
                if fail_days >= 2:
                    self._heal(s, report)
                else:
                    # first failure: recheck on a later day before touching anything
                    report.still_broken.append({"source_id": s.id, "authority": s.authority,
                                                "url": s.url, "note": "1st failure; recheck pending"})
        return report


# --------------------------------------------------------------------------- #
# Self-contained demo:  python source_sentinel.py --demo
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    import sys

    if "--demo" in sys.argv:
        # Fakes prove the trust-boundary decision without touching the network.
        class FakeFetcher:
            def __init__(self, table): self.table = table
            def fetch(self, url):
                r = self.table.get(url)
                if r is None:
                    return FetchResult(ok=False, status=404, final_url=url, text="Not Found")
                status, final, text = r
                return FetchResult(ok=status < 400, status=status, final_url=final, text=text)

        class FakeSearcher:
            def __init__(self, results): self.results = results
            def search(self, query): return self.results

        # A healthy source, an in-domain move (auto), and a dead source whose only
        # replacement is on the SAME domain (auto) vs a CROSS-domain one (propose).
        fetch_table = {
            "https://ad.easa.europa.eu": (200, "https://ad.easa.europa.eu", "EASA Airworthiness Directives"),
            "https://www.faa.gov/regulations_policies": (200, "https://www.faa.gov/regulations-policies",
                                                          "FAA Regulations and Policies"),
            # rgl.faa.gov is dead; the working replacement is drs.faa.gov (same registrable domain)
            "https://drs.faa.gov": (200, "https://drs.faa.gov", "FAA Dynamic Regulatory System DRS"),
            # UK CAA library dead; only candidate found is a third-party mirror (cross-domain -> propose)
            "https://mirror.example.com/caa": (200, "https://mirror.example.com/caa", "UK CAA library mirror"),
        }
        reg = SourceRegistry([
            Source(id="easa-ad", authority="EASA", url="https://ad.easa.europa.eu",
                   identity_markers=["EASA", "Airworthiness Directives"], criticality="required"),
            Source(id="faa-regs", authority="FAA", url="https://www.faa.gov/regulations_policies",
                   identity_markers=["FAA", "Regulations"], criticality="required"),
            Source(id="faa-rgl", authority="FAA", url="https://rgl.faa.gov",
                   identity_markers=["FAA", "DRS", "Dynamic Regulatory"], criticality="required"),
            Source(id="ukcaa-lib", authority="UK CAA", url="https://regulatorylibrary.caa.co.uk",
                   identity_markers=["CAA"], criticality="common"),
        ])
        # Force the two dead ones to have already failed yesterday, so this pass can heal.
        for sid in ("faa-rgl", "ukcaa-lib"):
            next(s for s in reg.sources if s.id == sid).failure_dates.append("2000-01-01")

        sentinel = SourceSentinel(
            registry=reg,
            fetcher=FakeFetcher(fetch_table),
            searcher=FakeSearcher(["https://drs.faa.gov", "https://mirror.example.com/caa"]),
            clock_date=lambda: "2000-01-02",
        )
        print(sentinel.run_maintenance_pass().render())
        print("\nnote: faa-rgl auto-healed (same domain); ukcaa-lib PROPOSED (cross-domain mirror).")
    else:
        print("usage: python source_sentinel.py --demo")
