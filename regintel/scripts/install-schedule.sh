#!/bin/bash
#
# Install the daily RegIntel ingestion on macOS via launchd.
#
# WHY THERE IS A SEPARATE RUNTIME COPY
# This repo lives under ~/Documents, which macOS protects with TCC. A launchd
# agent has no Full Disk Access, so it can stat files there but NOT read them:
# a job pointed straight at the repo fails with "Operation not permitted"
# before it reads a single line (exit 126, verified).
#
# The alternative is granting Full Disk Access to /bin/bash in System Settings,
# which needs a human at the keyboard and widens that permission for every
# script on the machine. Instead the scheduler runs from a working copy under
# ~/Library/Application Support, which TCC does not protect.
#
# That separation is worth having anyway: the scheduled job runs COMMITTED code
# pulled from origin, not whatever is half-edited in the working tree.
#
# WHY LAUNCHD AND NOT CRON
# launchd runs a missed StartCalendarInterval job when the machine next wakes.
# cron would simply skip it, and a skipped regulatory pull is invisible — the
# dashboard looks like a quiet day rather than a broken one.
#
# WHY macOS AT ALL
# The CAAC fallback for scanned PDFs uses the Vision framework. A Linux runner
# would handle everything else and silently skip those documents.
#
#   ./scripts/install-schedule.sh              # install at 07:15 local
#   ./scripts/install-schedule.sh 6 30         # install at 06:30 local
#   ./scripts/install-schedule.sh --uninstall
#
set -euo pipefail

LABEL="com.conform-edge.regintel.daily"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
RUNTIME="$HOME/Library/Application Support/RegIntel"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORIGIN="$(git -C "$REPO" remote get-url origin 2>/dev/null || echo '')"

if [ "${1:-}" = "--uninstall" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Uninstalled $LABEL (runtime copy left at $RUNTIME)"
  exit 0
fi

HOUR="${1:-7}"
MINUTE="${2:-15}"

[ -n "$ORIGIN" ] || { echo "No git origin found in $REPO" >&2; exit 1; }

echo "Provisioning runtime copy at $RUNTIME"
mkdir -p "$RUNTIME"

if [ -d "$RUNTIME/repo/.git" ]; then
  git -C "$RUNTIME/repo" fetch --quiet origin main
  git -C "$RUNTIME/repo" reset --hard --quiet origin/main
else
  rm -rf "$RUNTIME/repo"
  git clone --quiet --depth 20 "$ORIGIN" "$RUNTIME/repo"
fi
echo "  code:  $(git -C "$RUNTIME/repo" rev-parse --short HEAD)"

# Credentials are gitignored, so they are copied rather than cloned. Locked
# down because this file carries the service-role key.
mkdir -p "$RUNTIME/repo/nextjs"
cp "$REPO/nextjs/.env.local" "$RUNTIME/repo/nextjs/.env.local"
chmod 600 "$RUNTIME/repo/nextjs/.env.local"
echo "  creds: copied (chmod 600)"

VENV="$RUNTIME/repo/scraper/.venv"
if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
fi
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r "$RUNTIME/repo/scraper/requirements.txt"
# Not in requirements.txt because they are only needed for the CAAC attachment
# path: pypdf reads embedded text, pyobjc drives Vision for scans.
"$VENV/bin/pip" install --quiet pypdf pyobjc-framework-Vision pyobjc-framework-Quartz
echo "  venv:  ready"

# Carry the PDF/OCR cache across reinstalls; re-reading every attachment costs
# minutes of OCR for no gain.
if [ -d "$REPO/scraper/.cache" ] && [ ! -d "$RUNTIME/repo/scraper/.cache" ]; then
  cp -R "$REPO/scraper/.cache" "$RUNTIME/repo/scraper/.cache"
  echo "  cache: seeded from the working tree"
fi

mkdir -p "$HOME/Library/LaunchAgents" "$RUNTIME/repo/scraper/.logs"

cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$RUNTIME/repo/scraper/run-daily.sh</string>
    <string>--pull</string>
  </array>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>$HOUR</integer>
    <key>Minute</key><integer>$MINUTE</integer>
  </dict>

  <!-- Deliberately false: loading the agent, or logging in, must not fire an
       ingestion run. The schedule decides when it runs, nothing else. -->
  <key>RunAtLoad</key><false/>

  <key>StandardOutPath</key><string>$RUNTIME/repo/scraper/.logs/launchd.out.log</string>
  <key>StandardErrorPath</key><string>$RUNTIME/repo/scraper/.logs/launchd.err.log</string>
  <key>WorkingDirectory</key><string>$RUNTIME/repo/scraper</string>

  <key>ProcessType</key><string>Background</string>
  <key>ExitTimeOut</key><integer>900</integer>
</dict>
</plist>
PLIST_EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

printf '\nInstalled %s\n' "$LABEL"
printf '  runs daily at %02d:%02d local (%s)\n' "$HOUR" "$MINUTE" "$(date +%Z)"
printf '  runtime  %s/repo\n' "$RUNTIME"
printf '  log      %s/repo/scraper/.logs/ingest.log\n' "$RUNTIME"
printf '\nRun now:  launchctl kickstart -p gui/%s/%s\n' "$(id -u)" "$LABEL"
printf 'Status:   launchctl print gui/%s/%s | grep -E "state|runs|last exit"\n' "$(id -u)" "$LABEL"
printf 'Remove:   ./scripts/install-schedule.sh --uninstall\n'
printf '\nAfter changing credentials or pushing scraper changes, re-run this script.\n'
