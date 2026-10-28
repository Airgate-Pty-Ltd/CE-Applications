"""Core types for the deterministic ingestion pipeline.

Every field on a Finding must be traceable to a value the publishing authority
actually emitted. Nothing here is inferred, summarised or generated. There is
no LLM anywhere in this pipeline, by design: a fabricated document number or a
comment deadline off by a week is not a quality-of-service issue for a Part 145
repair station.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timezone
from typing import Any, Protocol

# How far back every run looks. Findings are deduplicated by identity across
# runs, so this is an overlap/backstop window, not a report length.
LOOKBACK_DAYS = 14

# Severity ordering, mirrors regulatory_findings.priority_rank in the schema.
PRIORITY_RANK = {"urgent": 0, "high": 1, "normal": 2, "low": 3}


@dataclass
class Finding:
    """A single regulatory item, as published by the authority."""

    authority: str
    category: str
    priority: str
    title: str
    summary: str
    detail: str
    source_url: str

    document_number: str | None = None
    effective_date: str | None = None
    comment_deadline: str | None = None
    published_date: str | None = None

    # Provenance.
    # 'verified'   - every field came from an official structured source.
    # 'unverified' - source is not structured; never present as authoritative.
    verification: str = "verified"
    source_id: str = ""

    # What the AUTHORITY published as the title, when `title` also carries
    # something of ours. CAAC publishes in Chinese and the feed shows an
    # English rendering first; without this, improving the translation glossary
    # would change the hash and report every affected document as amended by
    # the authority. Change detection must track the publisher's text, not our
    # presentation of it. Never written to the database — see to_row().
    hash_title: str | None = None
    # Same idea for the summary, where the displayed text mixes the authority's
    # words with our rendering of them.
    hash_summary: str | None = None

    def key(self) -> str:
        """Stable identity across runs.

        Document number where the authority publishes one, else the URL. This
        is the unique key in the database, so it must stay stable for the same
        document between runs.
        """
        return (self.document_number or "").strip() or self.source_url

    def content_hash(self) -> str:
        """Hash of the fields a subscriber acts on.

        Changes when the authority amends the document — an extended comment
        deadline or revised effective date is news, not noise.
        """
        import hashlib

        material = "␟".join(
            str(x or "")
            for x in (
                # The publisher's own text where ours differs from it.
                self.hash_title or self.title,
                self.hash_summary or self.summary,
                self.effective_date,
                self.comment_deadline,
                self.priority,
                self.category,
            )
        )
        return hashlib.sha256(material.encode("utf-8")).hexdigest()

    def to_row(self, report_date: str) -> dict[str, Any]:
        """Map to a regulatory_findings row."""
        d = asdict(self)
        d.pop("published_date", None)
        # Internal only: there is no such column, and it is not a finding field.
        d.pop("hash_title", None)
        d.pop("hash_summary", None)
        d["report_date"] = report_date
        return d


@dataclass
class SourceResult:
    """Outcome of pulling one source, including failure detail.

    A source that fails is reported as unavailable, never as quiet. Those mean
    very different things to a subscriber and conflating them is how someone
    misses a rule.
    """

    source_id: str
    authority: str
    authority_name: str
    findings: list[Finding] = field(default_factory=list)
    ok: bool = True
    error: str | None = None


class Source(Protocol):
    """A pullable authoritative source."""

    id: str
    authority: str
    authority_name: str

    def fetch(self, since_days: int) -> list[Finding]:
        """Pull recent items.

        Implementations must not infer values: if the publisher does not
        supply a field, return None for it.
        """
        ...


def today_utc() -> date:
    return datetime.now(timezone.utc).date()


def parse_iso_date(value: str | None) -> date | None:
    """Parse YYYY-MM-DD, returning None rather than raising."""
    if not value:
        return None
    try:
        return date.fromisoformat(value.strip()[:10])
    except (ValueError, AttributeError):
        return None


def days_until(target: str | None, today: date) -> int | None:
    d = parse_iso_date(target)
    return (d - today).days if d else None


def derive_priority(
    effective_date: str | None,
    comment_deadline: str | None,
    today: date,
) -> str:
    """Priority computed purely from the publisher's own dates.

    Deliberately arithmetic rather than judgement: the same input always gives
    the same output and the reasoning is inspectable. Deadlines dominate
    effective dates because a missed comment window cannot be reopened.
    """
    to_deadline = days_until(comment_deadline, today)
    to_effective = days_until(effective_date, today)

    # Only future dates matter; a closed comment window is not urgent.
    deadline = to_deadline if to_deadline is not None and to_deadline >= 0 else None
    effective = to_effective if to_effective is not None and to_effective >= 0 else None

    if (deadline is not None and deadline <= 7) or (effective is not None and effective <= 7):
        return "urgent"
    if (deadline is not None and deadline <= 30) or (effective is not None and effective <= 30):
        return "high"
    if deadline is not None or effective is not None:
        return "normal"
    return "low"
