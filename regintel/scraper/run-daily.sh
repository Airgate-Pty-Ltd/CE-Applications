#!/bin/bash
#
# Daily regulatory ingestion, for a scheduler to call.
#
# Wraps `python main.py` with the things a cron-style run needs and a bare
# command does not: the virtualenv, credentials read from the gitignored env
# file rather than baked into a plist, a timestamped log, and an exit status a
# scheduler can act on.
#
# Installed on macOS via launchd — see scripts/install-schedule.sh. macOS is
# not incidental: the CAAC scanned-PDF fallback uses the Vision framework, so
# moving this to a Linux box would silently stop reading those documents.
#
#   ./run-daily.sh              # normal run, 14-day backstop window
#   ./run-daily.sh --pull       # update to origin/main first (what launchd does)
#   ./run-daily.sh --days 60    # wider window, e.g. after an outage
#
set -uo pipefail

SCRAPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRAPER_DIR/../nextjs/.env.local"
LOG_DIR="${REGINTEL_LOG_DIR:-$SCRAPER_DIR/.logs}"
LOG="$LOG_DIR/ingest.log"
PYTHON="$SCRAPER_DIR/.venv/bin/python"

mkdir -p "$LOG_DIR"

log() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >> "$LOG"; }

# Keep the log from growing without bound; a run is a few dozen lines.
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 2000000 ]; then
  mv "$LOG" "$LOG.1"
fi

# --pull is how the scheduled copy stays current: it runs committed code from
# origin/main rather than whatever happens to be checked out. Failing to pull
# is not fatal — running yesterday's code beats not running at all.
PULL=0
ARGS=()
for a in "$@"; do
  if [ "$a" = "--pull" ]; then PULL=1; else ARGS+=("$a"); fi
done

log "── run starting ──"

if [ "$PULL" = "1" ] && [ -d "$SCRAPER_DIR/../.git" ]; then
  if git -C "$SCRAPER_DIR/.." fetch --quiet origin main 2>>"$LOG" \
     && git -C "$SCRAPER_DIR/.." reset --hard --quiet origin/main 2>>"$LOG"; then
    log "updated to $(git -C "$SCRAPER_DIR/.." rev-parse --short HEAD)"
  else
    log "WARNING: could not update from origin; running the existing checkout"
  fi
fi

if [ ! -x "$PYTHON" ]; then
  log "FATAL: virtualenv missing at $PYTHON (run: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt)"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  log "FATAL: $ENV_FILE not found; cannot read Supabase credentials"
  exit 1
fi

# Read only the two keys needed, rather than sourcing the file: it also holds
# the handoff secret and Vercel's OIDC token, which this has no business with.
SUPABASE_URL="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
SUPABASE_SERVICE_ROLE_KEY="$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
export SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  log "FATAL: Supabase credentials missing or blank in $ENV_FILE"
  exit 1
fi

cd "$SCRAPER_DIR" || { log "FATAL: cannot cd to $SCRAPER_DIR"; exit 1; }

started=$(date +%s)
"$PYTHON" main.py ${ARGS[@]+"${ARGS[@]}"} >> "$LOG" 2>&1
status=$?
elapsed=$(( $(date +%s) - started ))

if [ $status -eq 0 ]; then
  log "── run finished OK in ${elapsed}s ──"
else
  # Surfaced in Notification Center so a silent failure is not invisible. A
  # feed that quietly stops updating looks exactly like a quiet week, which on
  # a compliance product is the failure that matters.
  log "── run FAILED (exit $status) after ${elapsed}s ──"
  /usr/bin/osascript -e 'display notification "Daily ingestion failed — see scraper/.logs/ingest.log" with title "RegIntel"' 2>/dev/null || true
fi

exit $status
