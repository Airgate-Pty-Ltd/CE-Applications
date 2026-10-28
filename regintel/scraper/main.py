#!/usr/bin/env python3
"""Conform-Edge RegIntel — daily regulatory ingestion.

Runs once daily at 01:00 MST (08:00 UTC) with a 30-day trailing window.

    python main.py --dry-run     # pull and print; no credentials needed
    python main.py               # pull and write to Supabase

--dry-run requires nothing at all: every configured source is a public
endpoint with no key. Use it to verify the pipeline before wiring up Supabase.
"""

from __future__ import annotations

import argparse
import io
import logging
import os
import sys
from datetime import datetime, timezone

from models import LOOKBACK_DAYS, Finding
from report import build_markdown, dedupe_and_sort
from sources import pull_all

log = logging.getLogger("regintel")


def categorise(findings: list[Finding], *names: str) -> list[Finding]:
    return [f for f in findings if f.category in names]


def build_report(since_days: int = LOOKBACK_DAYS, enrich: bool = False) -> dict:
    report_date = datetime.now(timezone.utc).date().isoformat()

    # EASA publishes no dates in its RSS feeds, which is the sole reason its
    # findings are marked unverified. Where the stored eRules corpus states an
    # unambiguous entry-into-force date for the instrument, use it. Skipped in
    # --dry-run, which must keep working with no credentials at all.
    instrument_dates = None
    part_index = None
    if enrich:
        from easa_enrich import load_instrument_dates
        from easa_link import load_part_index

        instrument_dates = load_instrument_dates()
        # Lets a thin "ED Decision 2026/005/R" say which Parts it amends and
        # how much regulation sits in each.
        part_index = load_part_index()

    results = pull_all(since_days, instrument_dates, part_index)

    findings = dedupe_and_sort([f for r in results for f in r.findings])
    markdown = build_markdown(findings, report_date, results)

    failed = [r for r in results if not r.ok]
    # If every source failed we have no basis for a report. Say so rather than
    # publishing an empty one that reads like a quiet day.
    status = "error" if results and len(failed) == len(results) else "complete"

    return {
        "report_date": report_date,
        "status": status,
        "priority_alerts": [f.to_row(report_date) for f in findings if f.priority == "urgent"],
        "final_rules": [f.to_row(report_date) for f in categorise(findings, "final_rule")],
        "open_nprs": [f.to_row(report_date) for f in categorise(findings, "nprm", "npa")],
        "advisory_guidance": [f.to_row(report_date) for f in categorise(findings, "notice", "amc_gm")],
        "standards_developments": [
            f.to_row(report_date)
            for f in categorise(findings, "regulation", "ed_decision", "opinion", "certification_specification")
        ],
        "international_updates": [],
        "no_activity": [r.authority_name for r in results if r.ok and not r.findings],
        "full_report_markdown": markdown,
        "authorities_searched": [r.authority_name for r in results if r.ok],
        "total_items_found": len(findings),
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="RegIntel daily regulatory ingestion")
    parser.add_argument("--dry-run", action="store_true", help="print the report; write nothing")
    parser.add_argument("--days", type=int, default=LOOKBACK_DAYS, help=f"trailing window (default {LOOKBACK_DAYS})")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    # Windows consoles default to cp1252 and cannot encode the report's emoji.
    for stream in ("stdout", "stderr"):
        s = getattr(sys, stream)
        if hasattr(s, "reconfigure"):
            s.reconfigure(encoding="utf-8", errors="replace")

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )
    # The Supabase client logs one INFO line per HTTP call, and a run makes
    # hundreds — including PATCH URLs carrying every row id. That buries the
    # handful of lines that matter in a scheduled run's log. -v still shows them.
    if not args.verbose:
        for noisy in ("httpx", "httpcore", "urllib3", "hpack", "supabase", "postgrest"):
            logging.getLogger(noisy).setLevel(logging.WARNING)

    if not args.dry_run:
        missing = [v for v in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") if not os.environ.get(v)]
        if missing:
            log.error("Missing environment variable(s): %s", ", ".join(missing))
            log.error("Set them, or use --dry-run to test without a database.")
            return 1

    started = datetime.now(timezone.utc)
    log.info("Pulling authoritative sources (%d-day window)%s", args.days, " — DRY RUN" if args.dry_run else "")

    try:
        report = build_report(args.days, enrich=not args.dry_run)
    except Exception as exc:  # noqa: BLE001
        log.exception("Report generation failed: %s", exc)
        if not args.dry_run:
            try:
                from store import mark_report_error

                mark_report_error(datetime.now(timezone.utc).date().isoformat(), str(exc))
            except Exception:  # noqa: BLE001
                log.error("Additionally failed to record the error state")
        return 1

    elapsed = (datetime.now(timezone.utc) - started).total_seconds()
    log.info("Found %d items in %.1fs (status=%s)", report["total_items_found"], elapsed, report["status"])

    if args.dry_run:
        print("\n" + "=" * 60)
        print(report["full_report_markdown"])
        print("=" * 60)
        print("\nDry run — nothing written.")
        return 0

    from store import save_report

    save_report(report)
    log.info("Saved to Supabase.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
