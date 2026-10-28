#!/usr/bin/env python3
"""Connection validator and dead-link reporter.

Probes every URL in registry.json, classifies the result, writes the health
fields back into the register, and emits health-report.md.

Run it on a schedule (weekly is plenty) to catch links that rot. It is the
"report on dead links" capability.

 python healthcheck.py # probe all, write report
 python healthcheck.py --industry Medical device
 python healthcheck.py --rediscover # also propose replacements for dead links

CLASSIFICATION — deliberately distinguishes three different facts, because
conflating them is how coverage silently degrades:

 ok 2xx, or a redirect that resolves to 2xx
 redirected landed on a different URL (candidate to adopt)
 blocked 401/403/429 — the host refuses automated access. NOT dead.
 dead 404/410 — the resource is gone. Rediscovery applies.
 server_error 5xx — the host erred; may be transient. Recheck before acting.
 unreachable DNS/TLS/timeout — could be a geo-block from the run host, NOT
 proof the source is dead.

Only `dead` (and confirmed `redirected`) should change a source URL. `blocked`
and `unreachable` are flagged for human review, never auto-actioned.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import logging
import os
import sys
from datetime import datetime, timezone

import requests

HERE = os.path.dirname(os.path.abspath(__file__))
REGISTRY = os.path.join(HERE, "registry.json")
REPORT = os.path.join(HERE, "health-report.md")

USER_AGENT = "Conform-Edge RegIntel/1.0 (+https://conform-edge.com; link health check)"
TIMEOUT = 25
WORKERS = 12

log = logging.getLogger("healthcheck")


def classify(url: str) -> dict:
 """Probe one URL. Returns a result dict; never raises."""
 try:
 resp = requests.get(
 url,
 headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
 timeout=TIMEOUT,
 allow_redirects=True,
 stream=True,
 )
 code = resp.status_code
 final = resp.url
 redirected = bool(resp.history) and final.rstrip("/") != url.rstrip("/")
 resp.close()

 if code in (401, 403, 429):
 status = "blocked"
 elif code in (404, 410):
 status = "dead"
 elif 500 <= code < 600:
 status = "server_error"
 elif 200 <= code < 300:
 status = "redirected" if redirected else "ok"
 else:
 status = "ok"

 return {"status": status, "http": code, "final_url": final if redirected else None}
 except requests.exceptions.SSLError as exc:
 return {"status": "unreachable", "http": None, "error": f"TLS: {exc}"[:120]}
 except requests.exceptions.ConnectionError as exc:
 return {"status": "unreachable", "http": None, "error": f"connection: {exc}"[:120]}
 except requests.exceptions.Timeout:
 return {"status": "unreachable", "http": None, "error": "timeout"}
 except Exception as exc: # noqa: BLE001
 return {"status": "unreachable", "http": None, "error": str(exc)[:120]}


def run(records: list[dict], only_industry: str | None) -> list[dict]:
 now = datetime.now(timezone.utc).isoformat()
 targets = [r for r in records if not only_industry or only_industry in r["industry"]]

 with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
 futures = {pool.submit(classify, r["url"]): r for r in targets}
 done = 0
 for fut in concurrent.futures.as_completed(futures):
 rec = futures[fut]
 result = fut.result()
 rec["last_checked"] = now
 rec["last_status"] = result["status"]
 ok = result["status"] in ("ok", "redirected")
 rec["last_ok"] = ok
 rec["last_http"] = result.get("http")
 rec["last_final_url"] = result.get("final_url")
 rec["last_error"] = result.get("error")
 rec["consecutive_failures"] = 0 if ok else rec.get("consecutive_failures", 0) + 1
 done += 1
 if done % 25 == 0:
 log.info("probed %d/%d", done, len(targets))

 return targets


def write_report(records: list[dict], probed: list[dict]) -> dict:
 buckets: dict[str, list[dict]] = {}
 for r in probed:
 buckets.setdefault(r["last_status"], []).append(r)

 order = ["dead", "server_error", "blocked", "unreachable", "redirected", "ok"]
 counts = {k: len(buckets.get(k, [])) for k in order}
 now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

 lines = [
 "# RegIntel — Link Health Report",
 "",
 f"**Generated:** {now} ",
 f"**Probed:** {len(probed)} of {len(records)} sources",
 "",
 "| Status | Count | Meaning |",
 "|---|---|---|",
 f"| [Built] ok | {counts['ok']} | Reachable, 2xx |",
 f"| ↪️ redirected | {counts['redirected']} | Landed elsewhere — candidate to adopt |",
 f"| [Blocked] blocked | {counts['blocked']} | 401/403/429 — refuses automation, NOT dead |",
 f"| [Dead] dead | {counts['dead']} | 404/410 — gone, rediscovery applies |",
 f"| [Warning] server_error | {counts['server_error']} | 5xx — may be transient, recheck |",
 f"| [Unreachable] unreachable | {counts['unreachable']} | DNS/TLS/timeout — maybe geo-blocked from run host |",
 "",
 ]

 def section(title: str, key: str) -> None:
 rows = sorted(buckets.get(key, []), key=lambda r: (r["industry"][0], r["jurisdiction"]))
 if not rows:
 return
 lines.append(f"## {title} ({len(rows)})\n")
 lines.append("| Source | Industry | HTTP | Detail |")
 lines.append("|---|---|---|---|")
 for r in rows:
 detail = r.get("last_final_url") or r.get("last_error") or ""
 lines.append(
 f"| [{r['source_name'][:48]}]({r['url']}) | {r['industry'][0]} | "
 f"{r.get('last_http') or '—'} | {str(detail)[:70]} |"
 )
 lines.append("")

 section("[Dead] Dead links — need a replacement URL", "dead")
 section("[Warning] Server errors — recheck before acting", "server_error")
 section("↪️ Redirected — confirm and adopt the new URL", "redirected")
 section("[Blocked] Blocked — need a licensed feed or permission", "blocked")
 section("[Unreachable] Unreachable — retry from production host before judging", "unreachable")

 lines.append("---")
 lines.append(
 "*`blocked` and `unreachable` are NOT proof a source is dead. A source "
 "reachable from a US-hosted runner may block this machine, and vice "
 "versa. Only `dead` (404/410) and confirmed `redirected` should change "
 "a source URL.*"
 )

 with open(REPORT, "w", encoding="utf-8", newline="\n") as f:
 f.write("\n".join(lines) + "\n")

 return counts


def main() -> int:
 parser = argparse.ArgumentParser(description="RegIntel link health check")
 parser.add_argument("--industry", help="only probe this industry")
 parser.add_argument("--rediscover", action="store_true", help="propose replacements for dead links")
 parser.add_argument("--verbose", "-v", action="store_true")
 args = parser.parse_args()

 for stream in ("stdout", "stderr"):
 s = getattr(sys, stream)
 if hasattr(s, "reconfigure"):
 s.reconfigure(encoding="utf-8", errors="replace")

 logging.basicConfig(
 level=logging.DEBUG if args.verbose else logging.INFO,
 format="%(asctime)s %(levelname)-7s %(message)s",
 datefmt="%H:%M:%S",
 )

 with open(REGISTRY, encoding="utf-8") as f:
 data = json.load(f)
 records = data["records"]

 log.info("Probing %d sources ...", len(records))
 probed = run(records, args.industry)
 counts = write_report(records, probed)

 with open(REGISTRY, "w", encoding="utf-8", newline="\n") as f:
 json.dump(data, f, indent=2, ensure_ascii=False)
 f.write("\n")

 log.info(
 "Done. ok=%d redirected=%d blocked=%d dead=%d server_error=%d unreachable=%d",
 counts["ok"], counts["redirected"], counts["blocked"],
 counts["dead"], counts["server_error"], counts["unreachable"],
 )
 log.info("Report: health-report.md")

 if args.rediscover and counts["dead"]:
 from rediscover import propose_for_dead

 propose_for_dead([r for r in probed if r["last_status"] == "dead"])

 return 0


if __name__ == "__main__":
 raise SystemExit(main())
