"""Supabase persistence.

Findings are DOCUMENTS with a stable identity, not per-day rows. Each run
upserts on `finding_key`:

  - new document      -> inserted, first_seen_at = now
  - unchanged         -> last_seen_at bumped, nothing else touched
  - content changed   -> fields updated, last_changed_at = now,
                         first_seen_at LEFT ALONE

`first_seen_at` must never move once set: it is what "new since your last
login" is measured against. Overwriting it would make an item the subscriber
already read reappear as new.

The client is created lazily so importing this module needs no credentials —
that is what lets `--dry-run` work with no configuration at all.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger(__name__)

_client = None

# Fields that describe a finding without defining whether it CHANGED. They are
# safe to refresh on an otherwise-unchanged row; content_hash governs the rest.
PRESENTATION_FIELDS = ("title", "summary", "detail", "source_url")


def client():
    global _client
    if _client is None:
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")  # service role bypasses RLS
        if not url or not key:
            raise RuntimeError(
                "Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
            )
        _client = create_client(url, key)
    return _client


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_findings(findings: list, report_date: str, report_id: str | None = None) -> dict[str, int]:
    """Upsert findings by identity. Returns counts of new/changed/unchanged."""
    sb = client()
    now = _now()

    if not findings:
        return {"new": 0, "changed": 0, "unchanged": 0}

    keys = [f.key() for f in findings]

    # Existing rows for the keys in this batch. Chunked: PostgREST puts these
    # in the URL, and a few hundred keys would exceed the length limit.
    existing: dict[str, dict[str, Any]] = {}
    CHUNK = 100
    for i in range(0, len(keys), CHUNK):
        resp = (
            sb.table("regulatory_findings")
            .select("id, finding_key, content_hash, first_seen_at, title, summary, detail, source_url")
            .in_("finding_key", keys[i : i + CHUNK])
            .execute()
        )
        for row in resp.data or []:
            existing[row["finding_key"]] = row

    presentation_updates: list[tuple[str, dict[str, Any]]] = []
    to_insert: list[dict[str, Any]] = []
    to_update: list[dict[str, Any]] = []
    unchanged_ids: list[str] = []

    for f in findings:
        key = f.key()
        digest = f.content_hash()
        row = f.to_row(report_date)
        row["finding_key"] = key
        row["content_hash"] = digest
        row["last_seen_at"] = now
        if report_id:
            row["report_id"] = report_id

        prior = existing.get(key)
        if prior is None:
            row["first_seen_at"] = now
            row["last_changed_at"] = now
            to_insert.append(row)
        elif prior.get("content_hash") != digest:
            # Amended by the authority — an extended deadline or revised
            # effective date is news, so surface it as changed.
            row["last_changed_at"] = now
            row.pop("first_seen_at", None)  # never move the original sighting
            row["_id"] = prior["id"]
            to_update.append(row)
        else:
            unchanged_ids.append(prior["id"])
            # The hash says the PUBLISHER's content is unchanged. Our
            # PRESENTATION of it may still have improved — a better translation,
            # a description that now names the affected Parts, body text newly
            # read from a PDF attachment. Those fields either sit outside the
            # hash or are pinned to the publisher's own text on purpose, so
            # without this they could never reach a row already stored and
            # improvements stayed invisible forever.
            #
            # Refreshed in place, never touching last_changed_at: a better
            # description must not tell a subscriber the authority amended the
            # document.
            changed = {
                f: row.get(f) for f in PRESENTATION_FIELDS
                if (row.get(f) or "") != (prior.get(f) or "")
            }
            if changed:
                presentation_updates.append((prior["id"], changed))

    if to_insert:
        sb.table("regulatory_findings").insert(to_insert).execute()

    for row in to_update:
        row_id = row.pop("_id")
        sb.table("regulatory_findings").update(row).eq("id", row_id).execute()

    # One statement for the untouched majority rather than a call each.
    for i in range(0, len(unchanged_ids), CHUNK):
        sb.table("regulatory_findings").update({"last_seen_at": now}).in_(
            "id", unchanged_ids[i : i + CHUNK]
        ).execute()

    for row_id, fields in presentation_updates:
        sb.table("regulatory_findings").update(fields).eq("id", row_id).execute()
    if presentation_updates:
        log.info("Refreshed presentation on %d unchanged finding(s)", len(presentation_updates))

    counts = {"new": len(to_insert), "changed": len(to_update), "unchanged": len(unchanged_ids)}
    log.info("Findings — new: %(new)d, changed: %(changed)d, unchanged: %(unchanged)d", counts)
    return counts


def save_report(report: dict[str, Any]) -> dict[str, int]:
    sb = client()
    report_date = report["report_date"]
    findings = report.pop("findings", [])

    row = {k: v for k, v in report.items() if k != "findings"}
    saved = sb.table("regulatory_reports").upsert(row, on_conflict="report_date").execute()
    if not saved.data:
        raise RuntimeError("failed to save report row")

    counts = save_findings(findings, report_date, saved.data[0]["id"])
    log.info("Saved report %s (%d findings seen)", report_date, len(findings))
    return counts


def mark_report_error(report_date: str, message: str) -> None:
    """Record a failure so the dashboard shows an error rather than hanging on
    'generating…' forever."""
    client().table("regulatory_reports").upsert(
        {"report_date": report_date, "status": "error", "error_message": message},
        on_conflict="report_date",
    ).execute()
