#!/usr/bin/env python3
"""Run a governed maintenance pass over a domain registry.

    python sentinel_run.py sources.aerospace.json
    python sentinel_run.py sources.medical.json --limit 20

Validates each source (read-only), auto-follows in-domain redirects, records
multi-day failures, and — for sources dead across >=2 days — draws on-site
candidates from rediscover and applies Brian's trust boundary (same-domain +
identity match auto-heals; cross-domain proposes; required/sentinel escalate).
Persists the registry and appends to SOURCE-CHANGELOG.jsonl.
"""

from __future__ import annotations

import argparse
import sys

from sentinel_ports import DeterministicSentinel, RequestsFetcher
from source_sentinel import SourceRegistry


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("registry", help="sources.<domain>.json")
    ap.add_argument("--limit", type=int, default=0, help="only process the first N (for testing)")
    ap.add_argument("--changelog", default="SOURCE-CHANGELOG.jsonl")
    args = ap.parse_args()

    for stream in ("stdout", "stderr"):
        s = getattr(sys, stream)
        if hasattr(s, "reconfigure"):
            s.reconfigure(encoding="utf-8", errors="replace")

    reg = SourceRegistry.load(args.registry)
    if args.limit:
        reg.sources = reg.sources[: args.limit]

    sentinel = DeterministicSentinel(
        registry=reg,
        fetcher=RequestsFetcher(),
        changelog_path=args.changelog,
    )
    report = sentinel.run_maintenance_pass()
    reg.save(args.registry)
    print(report.render())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
