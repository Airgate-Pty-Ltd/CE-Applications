# RegIntel — Handover

**For:** Mike Bower
**From:** Claude (working session, 2026-07-23/24)
**Owner:** Brian Olea — b.r.olea.gqm@gmail.com
**Repo:** `Airgate-Pty-Ltd/regintel`

This covers what RegIntel does, how it does it, how often it runs, and exactly
where the build stands. Read "Rules that must not be broken" before changing
anything — several of them look like ordinary code decisions and are not.

---

## 1. What it does

RegIntel is a subscription regulatory-intelligence service for aerospace and
quality professionals: Part 145 repair stations, Production Approval Holders
(PMA/STC/TC/ODA/POA), AS9100D manufacturers, quality managers and QMS
consultants.

It monitors civil aviation and medical-device regulators, and tells a
subscriber **what has changed since they last looked** — new final rules,
proposed rules, airworthiness directives, guidance, and open comment deadlines.

The promise is that a subscriber never misses a regulatory change that could
trigger a nonconformity, force a procedure update, or produce an audit finding.

**The defining property: every item is traceable to the publishing authority's
own record.** Document numbers, effective dates and comment deadlines are the
authority's values, not anyone's summary of them. That is what makes it usable
by someone who has to defend a decision to an auditor.

**Access model:** RegIntel does not sell, bill or register anyone. Subscriptions
are handled on the Conform-Edge website, which grants access and hands the user
off to RegIntel.

---

## 2. How it does it

### Data flow

```
 Authority sources Python scraper Supabase
 ──────────────── ────────────── ────────
 Federal Register API ──┐
 (FAA, FDA) │
 │
 EASA RSS × 6 ├──► pull → normalise ──► upsert by identity
 (NPA, Opinion, ED │ derive priority first_seen_at
 Decision, AMC/GM, │ render report content_hash
 Regulation, CS) │ last_changed_at
 │ │
 GOV.UK Search API ──┘ │
 (MHRA safety alerts) │
 ▼
 Next.js dashboard
 "since your last login"
```

### Ingestion — `scraper/` (Python)

Each configured source is a class exposing `fetch(since_days) -> list[Finding]`.
Sources are registered in `scraper/sources.py`; adding an authority means adding
a class and registering it, and nothing else in the pipeline changes.

| Authority | Domain | Source | Provenance |
|---|---|---|---|
| FAA | Aviation | Federal Register JSON API | `verified` |
| FDA | Medical device | Federal Register JSON API | `verified` |
| EASA | Aviation | 6 official RSS feeds | `unverified` |
| MHRA | Medical device | GOV.UK Search API | `verified` |

**Medical device is core scope, not secondary.** FDA (rules and guidance, via
Federal Register) and MHRA (Field Safety Notices, device alerts and defect
notifications, via the GOV.UK Search API) are both live. Health Canada, EU
MDR/IVDR (MDCG guidance), TGA and PMDA are curated in
`regulatory-intel-medical` and not yet built — see `sources.py: UNCOVERED`.

The Federal Register API returns `document_number`, `publication_date`,
`effective_on` and `comments_close_on` as **typed fields** — nothing is parsed
out of prose or inferred.

MHRA is marked `verified` even though its alerts carry no deadline: a safety
alert has no comment window as a concept — the alert *is* the event — so every
field the document actually has comes from the authority. EASA is different:
an NPA genuinely has a comment deadline and the feed omits it.

EASA is therefore marked `unverified` because its feeds carry the item and its
link but publish no effective date or comment deadline. Those fields are left `null`
rather than guessed, and the UI shows a "Dates not in source" badge. That
distinction is a safety feature, not a limitation to paper over.

**Priority is arithmetic**, computed from the publisher's own dates:

| Condition | Priority |
|---|---|
| Comment deadline or effective date within 7 days | `urgent` |
| Within 30 days | `high` |
| Has a future date | `normal` |
| No dates | `low` |

Deadlines dominate effective dates because a missed comment window cannot be
reopened.

### Storage — findings are documents, not daily rows

A finding has a stable identity and is tracked over time:

| Column | Meaning |
|---|---|
| `finding_key` | Stable identity — document number, else source URL. Unique. |
| `first_seen_at` | When RegIntel first ingested it. **Set once, never moved.** |
| `last_seen_at` | Most recent run that still returned it |
| `content_hash` | SHA-256 of the fields a subscriber acts on |
| `last_changed_at` | When the content last actually differed |

This is what makes the per-subscriber delta possible, and it removes the
duplicate noise a trailing window otherwise creates.

**Change detection matters as much as new-item detection.** An extended comment
deadline or a revised effective date is news; `content_hash` catches it and the
item surfaces as *Amended*.

### Per-subscriber delta

`profiles.last_reviewed_at` records what each subscriber has acknowledged.

- `GET /api/findings/new` returns `new` and `amended` as separate lists,
 measured against that timestamp.
- `POST /api/findings/new` advances it.

The marker advances **only on an explicit acknowledgement**, never as a side
effect of loading a page. Opening the dashboard and closing it by accident must
not silently mark a batch of airworthiness directives as reviewed — and on a
compliance product, "the subscriber acknowledged up to this point" should be a
claim that survives scrutiny.

A first-time subscriber gets a 14-day window rather than everything ever
ingested.

### Access control

The Conform-Edge website mints a short-lived HMAC-signed token carrying
`{sub, email, tier, status, iat, jti}`. RegIntel verifies the signature,
freshness (120s max) and clock skew before starting a session —
`nextjs/lib/handoff.ts`, covered by 9 tests.

### Source register, health checks and link rediscovery

The full monitoring directory (Brian's authored master, 324 sources across
Universal, Aerospace, Automotive, Medical device, Mining and Standards) lives in
`docs/REGULATORY-DIRECTORY.md`. It is compiled to a machine-readable register:

- `sources/build_registry.py` → `sources/registry.json` (324 records, one per
 source, in the collector schema). Edit the directory, rerun, commit both.
- `sources/healthcheck.py` probes **every** URL, classifies the result, writes
 the status back into the register, and emits `sources/health-report.md`. This
 is the dead-link report. It runs weekly.
- `sources/rediscover.py` proposes replacements for dead links —
 **deterministically, no LLM**. See below.

**Every connection was validated on 2026-07-24.** Of 324: 171 ok, 41 redirected,
45 blocked (401/403/429), 38 dead (404/410), 2 server-error, 27 unreachable. The
health report has the full breakdown. Note the classification is deliberate:
`blocked` and `unreachable` are NOT dead — a US-hosted runner will reach some
sources this machine could not, and vice versa. Only `dead` (404/410) and
confirmed `redirected` should change a source URL.

**How rediscovery finds a new link when one breaks, without an LLM:** it gathers
candidate URLs from the authority's OWN site — the redirect target, its sitemap,
and its parent page — then ranks them by string similarity (Jaccard over path
tokens) to the dead URL plus the source's keywords, with bonuses for shared path
prefix and depth. The top candidates go to `sources/rediscovery-report.md` for a
human to confirm. A source URL is never changed automatically. This holds the
product's line: deterministic retrieval, transparent scoring, human decides.
(Verified: for the dead FDA `safety-communications` link it proposed
`medical-device-safety`, HTTP 200 — a correct replacement, found with no model.)


### Self-healing source registry (Source Sentinel)

Brian supplied a governed self-healing design (`sources/source_sentinel.py`,
his authored core). It is incorporated and wired to run with NO LLM and NO
search API:

- **Governance (his design):** a replacement auto-applies ONLY when the source
 is dead across ≥2 different days, the replacement is on the SAME registrable
 domain, AND its content identity matches (`identity_markers` found in the
 page). Cross-domain replacements are proposed for human approval, never
 auto-applied. `required`/`sentinel` sources are never auto-retired. Every
 change is appended to `SOURCE-CHANGELOG.jsonl`.
- **The candidate engine is rediscover.py**, not a web search. Its docstring
 notes a Searcher normally needs an API or an LLM tool; we use neither.
 `sentinel_ports.py: DeterministicSentinel` draws candidates from the
 authority's own site (redirect/sitemap/parent) and lets his trust boundary
 govern them. This is the key integration decision.
- `to_sentinel_registry.py` split the 324-source register into six
 `sources.<domain>.json` files in his schema, seeding identity_markers and
 criticality.

Verified: his `--demo` reproduces the trust boundary (same-domain auto-heal,
cross-domain mirror proposed); a live pass on aerospace validated 7, auto-healed
an ICAO in-domain redirect, and correctly HELD 4 first-failures pending a second
day rather than acting.

**identity_markers are seeded, not curated** — some FAA/eCFR pages failed
identity on too-tight markers in testing (the multi-day rule held them safely).
Review markers before trusting auto-heal; each registry carries
`identity_markers_needs_review: true`.

### Risks and Opportunities

`REVIEW-RISKS-AND-OPPORTUNITIES.md` is the full program review — 14 risks and 9
opportunities, each with evidence, impact, mitigation, and owner, plus a
recommended build sequence. Read it before planning the next phase. The headline
is unchanged: nothing has run against a real database yet, and that is the first
thing to fix.

---

## 3. How often

| What | Schedule |
|---|---|
| Ingestion run | **Once daily, 01:00 MST (08:00 UTC)** |
| Trailing window | **14 days** |
| Runtime | ~3 seconds |
| Link health check | **Weekly, Mondays 09:00 UTC** |

Configured in `scraper/railway.toml` (`0 8 * * *`) and
`scraper/railway-healthcheck.toml` (`0 9 * * 1`).

The 14-day window is an **overlap and backstop**, not a report length. Because
findings are deduplicated by identity, re-seeing an item costs nothing — the
window exists so a missed or failed run self-heals on the next pass.

[Warning] **Railway cron is UTC-only and does not observe daylight saving.** `0 8 * * *`
is 01:00 MST in winter and 02:00 MDT in summer. If 01:00 local year-round is
required, it needs a DST-aware scheduler or two seasonal schedules.

---

## 4. State of the build

### Verified by execution

- Python scraper: **88 items across FAA (53), FDA (20), EASA (10), MHRA (5)**
 over 14 days, in ~3.6 seconds, with no API keys or accounts
- **88 unique identities, 0 collisions**; content hashes stable across two
 consecutive pulls — a repeat run does not falsely mark items as changed
- `nextjs` build clean (12 routes), lint clean, **9/9 tests passing**
- Handoff token verification rejects tier-escalation forgery, expired tokens,
 future-dated tokens, tampered payloads and an unset secret

### NOT verified — nothing has touched a real database

**There is no Supabase project.** Migrations 001–004 are written and reviewed
but **have never been executed**. No report has been persisted or displayed. The
system has never completed a round trip from pull to subscriber screen.

This is the single most important thing to do first.

### Not built

| Item | Notes |
|---|---|
| Dashboard delta UI | `/api/findings/new` returns the data; nothing renders it. `app/dashboard/FindingCard.tsx` is a **complete, unwired** card component — a starting point, not finished work. |
| `/enter` handoff endpoint | Verification library is done and tested. Session establishment was left unbuilt because it depends on how the Conform-Edge website identifies users, which was never confirmed. Building it on a guess would be guessing at the security boundary. |
| Staleness alarms | If a source returns zero items for N runs, that must raise an alert. Not yet implemented — see below. |
| **156 more sources** | **`SOURCES.md` is the full curated registry — 160 sources across aerospace, automotive, medical device and standards bodies. Four are built.** That file is the real backlog. |
| VERA Molecule styling | Current UI is generic Tailwind, not the Conform-Edge design system. |

### Two ingestion paths exist

`worker/` (TypeScript, FAA+FDA) and `scraper/` (Python, FAA+FDA+EASA). **The
Python one supersedes the Node one.** The Node ingestion should be retired so
there is a single source of truth. It was left in place rather than deleted
mid-session.

---

## 5. Rules that must not be broken

These are not style preferences. Each has a specific failure mode.

**1. No LLM in the ingestion path.**
The original build had an 8B model read Google search snippets and emit
document numbers and comment deadlines. It was removed deliberately. A model
working from snippets produces plausible, well-formatted, wrong values and
fails *silently* — output looks identical whether correct or invented. A repair
station acting on a fabricated AC number is not a quality-of-service problem.

**2. `first_seen_at` must never be updated after insert.**
It is what the per-subscriber delta is measured against. Move it and items a
subscriber already reviewed reappear as new, permanently.

**3. A redirect is not a paywall.**
`Referer` is forgeable and absent on direct navigation. Access must be proven
by verifying the signed token — never by where the visitor appears to have come
from.

**4. Never present an item as authoritative when the authority did not supply
the field.**
That is what `verification: unverified` is for. Do not fill missing dates by
parsing them out of item text.

**5. "No activity" and "not checked" are different things.**
An authority with no configured source, or one whose fetch failed, must be
reported as *not covered* or *unavailable* — never as quiet. Conflating them is
how a subscriber concludes nothing happened when in fact nobody looked.

**6. Do not scrape licensed standards.**
ISO, SAE, IAQG and IATF sell their standards. Their content is licensed and
redistribution is prohibited — this is also vault policy. Monitoring that a
revision was announced is a different question from reproducing the standard,
and needs Brian's judgement plus probably a licence check.

**7. UK CAA returns HTTP 403 to automated requests.**
That is a deliberate block. It was not circumvented and should not be. UK CAA
coverage needs a licensed feed or written permission.

---

## 6. Suggested order of work

1. **Create the Supabase project and run `schema.sql`.** It already includes
 migrations 001–004 folded in, so a fresh project needs only this one file.
 Then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and run
 `python main.py`. Until this is done, nothing else can be genuinely tested.
2. **Confirm how the website identifies users**, then build `/enter`.
2b. **Work `SOURCES.md`** — 160 curated sources, four built. Start with the
 "Known-viable APIs, not yet built" table at the top: eCFR, NHTSA, GOV.UK
 (DVSA/OPSS), and the EASA AD tool. All four were probed and respond.
 Probe before writing any parser — roughly half of plausible endpoints 404.
3. **Build the dashboard delta UI** on `/api/findings/new`.
4. **Add staleness alarms** before any scraped (non-API) source goes live.
5. **Retire the Node worker's ingestion.**
6. Additional authorities, prioritised by customer demand rather than count.

---

## 7. Running it

```bash
# Ingestion — needs nothing at all
cd scraper
pip install -r requirements.txt
python main.py --dry-run

# Dashboard
cd nextjs
npm install
cp ../.env.example .env.local
npm run dev # http://localhost:3000

# Checks before pushing
cd nextjs && npm run build && npm run lint && npm test
```

`--dry-run` requires no credentials because every configured source is a public
endpoint with no key.

---

## 8. Branches

None merged. No pull requests opened.

| Branch | Contents |
|---|---|
| `claude/regintel-local-build` | 6 build blockers — neither package built before this |
| `claude/regintel-access-and-paywall` | tier column mismatch + RLS privilege-escalation fix |
| `claude/regintel-webhook-and-xss` | Stripe webhook race, stored XSS, priority sort |
| `claude/regintel-deterministic-ingestion` | LLM removal, Federal Register source |
| `claude/regintel-website-paywall` | Stripe removal, handoff verification, Python scraper, EASA, document identity |

The last branch contains the current state and builds on the others.
`STATUS.md` has the full defect register and source-probe evidence.
`SOURCES.md` has the complete 160-source registry with per-source status.
