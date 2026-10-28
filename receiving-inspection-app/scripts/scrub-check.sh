#!/usr/bin/env bash
#
# scrub-check.sh — clean-room gate.
#
# This product's logic is the owner's work. The controlled-document instances,
# employer and site identifiers, personal names, third-party system names and
# brand names that the source procedures carried must NEVER appear in this
# repository — not in code, comments, fixtures, seed data, or git history.
#
# This script is the control. It runs:
#   - locally, from .husky/pre-commit, BEFORE a commit object is created
#   - in CI, across the whole tree and the whole history
#
# The local hook is the one that matters. CI catches a leak after the fact; a
# leak that reaches history is permanent and shows up in due diligence.
#
# TWO SELF-CONSISTENCY RULES GOVERN THIS FILE:
#
#   1. A gate that greps for a forbidden literal must not contain that literal.
#      Structural patterns are therefore written with one character bracketed —
#      `T-75[2]-01` matches the identifier without ever spelling it. The regex
#      is equivalent; the literal never exists on disk.
#
#   2. Names cannot be expressed structurally. They live in an owner-supplied
#      denylist that is permanently git-ignored (scripts/denylist.local.txt).
#      Committing that file would defeat the entire control.
#
# Usage:
#   scripts/scrub-check.sh              scan tracked files in the working tree
#   scripts/scrub-check.sh --staged     scan staged content (pre-commit hook)
#   scripts/scrub-check.sh --history    scan every commit reachable from any ref
#
# Environment:
#   SCRUB_EXTRA_TERMS         extra denied terms, newline- or comma-separated.
#                             Supplied in CI from the SCRUB_TERMS secret.
#   SCRUB_ALLOW_NO_DENYLIST=1 permit a structural-only scan when no term source
#                             is available. CI sets this; a developer should not.
#
# Exit: 0 clean · 1 forbidden content found · 2 misconfigured

set -euo pipefail

MODE="tree"
while [ $# -gt 0 ]; do
  case "$1" in
    --staged)  MODE="staged" ;;
    --history) MODE="history" ;;
    -h|--help)
      sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) printf 'scrub: unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  printf 'scrub: not inside a git repository\n' >&2
  exit 2
fi
cd "$(git rev-parse --show-toplevel)"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
STRUCTURAL="$WORK/structural.re"
TERMS="$WORK/terms.txt"

# ---------------------------------------------------------------------------
# Structural patterns (extended regex, case-sensitive).
#
# Every complete identifier below is bracketed so the literal does not exist in
# this file. Do not "tidy" the brackets away — that would put the very strings
# this gate exists to exclude into the repository.
# ---------------------------------------------------------------------------
cat >"$STRUCTURAL" <<'PATTERNS'
P-8[0-9]{2}-[0-9]{2}
SOP-8[0-9]{2}-[0-9]{2}
F-8[0-9]{2}-[0-9]{2}
A-85[1]-[0-9]{2}
PM-8[0-9]{2}-[0-9]{2}
PF-8[0-9]{2}-[0-9]{2}
PQM-[0-9]{3}-[0-9]
CORP-P-[0-9]{3}-[0-9]{2}
SPR-P-[0-9]{3}-[0-9]{2}
PUR-[A-Z0-9]{2,}
T-75[2]-01
SCI-P-[A-Z0-9]
EASA\.145\.[0-9]{4}
\b[A-Z0-9]{3}R[0-9]{3}[A-Z]\b
S[A]P\b
O[r]acle
N[e]tSuite
E[p]icor
I[n]for\b
I[F]S\b
Q[A]D\b
P[l]ex\b
O[d]oo
Microsoft D[y]namics
Q[u]antum Control
C[o]mponent Control
A[v]Sight
Pentagon 2[0]00
R[a]mco
T[r]axxall
V[e]ryon
T[R]AX\b
A[M]OS\b
Swiss-A[S]
e[M]RO
S[o]lumina
iB[a]se-t
M[a]sterControl
T[r]ackWise
E[T]Q\b
G[r]eenlight Guru
Q[u]alio
I[n]telex
I[d]eagen
V[e]eva
W[i]ndchill
T[e]amcenter
gh[po]_[A-Za-z0-9]{36}
AKIA[0-9A-Z]{16}
-----BEGIN [A-Z ]*PRIVATE KEY-----
PATTERNS

# ---------------------------------------------------------------------------
# Denied terms (fixed strings, case-insensitive, WHOLE WORD): employer and site
# names, personal names, product lines, brands. Owner-supplied, never committed.
#
# Whole-word matching is deliberate and was learned the hard way: a four-letter
# surname matched as a substring fires on the word "boolean", and a gate that
# cries wolf on ordinary source is a gate people learn to bypass.
#
# The trade-off is that a term glued inside a longer token (camelCase, a
# hostname without separators) will not match. Where a term must match inside
# a longer token, express it as a structural pattern above instead.
# ---------------------------------------------------------------------------
: >"$TERMS"
TERM_SOURCES=0

if [ -f scripts/denylist.local.txt ]; then
  grep -v -e '^[[:space:]]*#' -e '^[[:space:]]*$' scripts/denylist.local.txt >>"$TERMS" || true
  TERM_SOURCES=$((TERM_SOURCES + 1))
fi

if [ -n "${SCRUB_EXTRA_TERMS:-}" ]; then
  printf '%s' "$SCRUB_EXTRA_TERMS" | tr ',' '\n' \
    | grep -v -e '^[[:space:]]*#' -e '^[[:space:]]*$' >>"$TERMS" || true
  TERM_SOURCES=$((TERM_SOURCES + 1))
fi

# Strip trailing whitespace; a stray space would silently stop a term matching.
if [ -s "$TERMS" ]; then
  sed -i.bak 's/[[:space:]]*$//' "$TERMS" && rm -f "$TERMS.bak"
fi

TERM_COUNT=0
[ -s "$TERMS" ] && TERM_COUNT=$(wc -l <"$TERMS" | tr -d '[:space:]')

if [ "$TERM_SOURCES" -eq 0 ]; then
  if [ "${SCRUB_ALLOW_NO_DENYLIST:-0}" = "1" ]; then
    printf 'scrub: WARNING — no denylist and no SCRUB_EXTRA_TERMS.\n'
    printf 'scrub: running STRUCTURAL PATTERNS ONLY. Names and brands are NOT checked.\n'
  else
    cat >&2 <<'MISSING'
scrub: FAILED — no source of denied terms.

The structural patterns catch document numbers and certificate numbers. They
cannot catch an employer name, a site name, a person's name, or a brand. Those
must come from a denylist that is deliberately never committed.

Create scripts/denylist.local.txt — one term per line, '#' for comments. It is
git-ignored by design. Copy scripts/denylist.example.txt to start.

To run a structural-only scan anyway (CI does this):
  SCRUB_ALLOW_NO_DENYLIST=1 scripts/scrub-check.sh
MISSING
    exit 2
  fi
fi

# ---------------------------------------------------------------------------
# Scanning
#
# Only tracked content is scanned, so ignored files (including the denylist
# itself) are out of scope by construction. -I skips binaries.
#
# package-lock.json is excluded from the STRUCTURAL pass only: npm integrity
# hashes are long base64 runs that can coincidentally satisfy the certificate
# pattern. It is still scanned for denied terms, where a private registry host
# carrying a company name would show up.
# ---------------------------------------------------------------------------
EXCLUDE_ALL=':(exclude)scripts/denylist*'
EXCLUDE_STRUCTURAL=':(exclude)package-lock.json'

HITS_FILE="$WORK/hits.txt"
: >"$HITS_FILE"

scan_structural() { # $1 = optional commit-ish
  if [ -n "${1:-}" ]; then
    git grep -n -I -E -f "$STRUCTURAL" "$1" -- . "$EXCLUDE_ALL" "$EXCLUDE_STRUCTURAL" || true
  elif [ "$MODE" = "staged" ]; then
    git grep --cached -n -I -E -f "$STRUCTURAL" -- . "$EXCLUDE_ALL" "$EXCLUDE_STRUCTURAL" || true
  else
    git grep -n -I -E -f "$STRUCTURAL" -- . "$EXCLUDE_ALL" "$EXCLUDE_STRUCTURAL" || true
  fi
}

scan_terms() { # $1 = optional commit-ish
  [ "$TERM_COUNT" -eq 0 ] && return 0
  if [ -n "${1:-}" ]; then
    git grep -n -I -i -w -F -f "$TERMS" "$1" -- . "$EXCLUDE_ALL" || true
  elif [ "$MODE" = "staged" ]; then
    git grep --cached -n -I -i -w -F -f "$TERMS" -- . "$EXCLUDE_ALL" || true
  else
    git grep -n -I -i -w -F -f "$TERMS" -- . "$EXCLUDE_ALL" || true
  fi
}

case "$MODE" in
  tree|staged)
    { scan_structural; scan_terms; } >>"$HITS_FILE"
    ;;
  history)
    # Scan every commit reachable from any ref. Precise — reports the commit,
    # the path and the line — and affordable while this repository is young.
    COMMITS=$(git rev-list --all 2>/dev/null || true)
    if [ -z "$COMMITS" ]; then
      printf 'scrub: no commits yet; nothing to scan in history.\n'
    else
      COUNT=$(printf '%s\n' "$COMMITS" | wc -l | tr -d '[:space:]')
      printf 'scrub: scanning %s commit(s) of history...\n' "$COUNT"
      for c in $COMMITS; do
        { scan_structural "$c"; scan_terms "$c"; } >>"$HITS_FILE"
      done
    fi
    ;;
esac

# ---------------------------------------------------------------------------
# Verdict
# ---------------------------------------------------------------------------
if [ -s "$HITS_FILE" ]; then
  cat >&2 <<'HEADER'

  ============================================================
  SCRUB GATE FAILED — forbidden content detected
  ============================================================

HEADER
  sort -u "$HITS_FILE" >&2
  cat >&2 <<'FOOTER'

  Every one of these is a customer-configured value, not a constant. Where the
  source logic named a system, the product says "your configured system of
  record" and offers a generic export or webhook.

  If this fired on history, removing the file in a later commit is NOT enough —
  the string still exists in the earlier object. Stop and ask before rewriting.

FOOTER
  exit 1
fi

printf 'scrub: clean — mode=%s, structural patterns=%s, denied terms=%s\n' \
  "$MODE" "$(wc -l <"$STRUCTURAL" | tr -d '[:space:]')" "$TERM_COUNT"
exit 0
