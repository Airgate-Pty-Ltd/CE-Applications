# RegIntel — Build Status

> Handing over to Mike Bower — see **HANDOVER.md** for what it does, how it
> does it, how often it runs, and the rules that must not be broken.

**Last updated:** 2026-07-24
**Owner:** Brian Olea (b.r.olea.gqm@gmail.com)
**Repo:** `Airgate-Pty-Ltd/regintel`

---

## What RegIntel is

A subscription regulatory-intelligence service for aerospace and quality
professionals — Part 145 repair stations, Production Approval Holders, AS9100D
manufacturers, QMS consultants. It monitors regulatory authorities daily and
surfaces what changed, with every item traceable to the publishing authority's
own record.

**Access model (changed 2026-07-24):** RegIntel no longer sells or bills.
Subscriptions are handled on the Conform-Edge website, which grants access and
hands the user off. RegIntel is a relying party.

---

## Architectural decisions

### 1. No LLM anywhere in the product

The original build used a local Ollama `qwen3:8b` model to read Google search
snippets and emit document numbers, effective dates and comment deadlines.

That was removed completely. Those fields are the load-bearing facts of the
product, and a model working from truncated snippets produces plausible,
well-formatted, wrong values — and fails silently, since the output looks
identical whether it is correct or invented. For a repair station acting on a
fabricated AC number or a comment deadline off by a week, that is not a
quality-of-service issue.

**Every value now comes from the authority's own structured record.** Priority
is arithmetic over the publisher's dates. The report is a template. The same
inputs always produce the same output.

> Do not reintroduce an LLM into the ingestion path.

Side effects: removed a ~5 GB model and its 8 GB-RAM host (~$20/mo), removed
the Serper search subscription (~$10–30/mo), and cut a 2–4 minute run to about
3 seconds.

### 2. Paywall lives on the website

RegIntel has no `/pricing`, `/signup`, `/login` or marketing page, and no
Stripe integration. Entitlement arrives as a short-lived HMAC-signed token
which RegIntel verifies before starting a session.

**A redirect is not a paywall.** `Referer` is forgeable and absent on direct
navigation, so "arrived from our site" is not access control — anyone who
learns the dashboard URL would walk in. Hence the signed token.

### 3. Ingestion in Python, on a daily schedule

`scraper/` runs once daily at **01:00 MST (08:00 UTC)** with a **14-day
trailing window**.

### 4. Findings are documents, not daily rows

A finding has a stable identity (`finding_key`) and is upserted across runs:
`first_seen_at` is set once and never moves, `content_hash` detects the
authority amending a document, `last_changed_at` records when.

This is what makes **"changes since your last login"** possible, and it
removes the duplicate noise that a trailing window otherwise creates. The
14-day window is now an overlap/backstop, not a report length.

Each subscriber carries `last_reviewed_at`, advanced **only by explicit
acknowledgement** — never as a side effect of loading a page. Opening the
dashboard by accident must not silently mark a batch of airworthiness
directives as reviewed, and on a compliance product "the user acknowledged up
to this point" should be a defensible claim.

---

## Source coverage

Every URL below was probed live before being committed. Nothing here is
assumed.

### Working

| Authority | Domain | Source | Verification | Items (14d, 2026-07-24) |
|---|---|---|---|---|
| **FAA** | Aviation | Federal Register API | `verified` | 53 |
| **FDA** | Medical device | Federal Register API | `verified` | 20 |
| **EASA** | Aviation | 6 official RSS feeds | `unverified` | 10 |
| **MHRA** | Medical device | GOV.UK Search API | `verified` | 5 |

**Total: 88 items in ~3.6 seconds over 14 days, with no API keys and no accounts.**
Verified: 83 unique identities, 0 collisions, all content hashes stable across
two consecutive pulls — so a repeat run does not falsely mark items as changed.

The Federal Register API returns `document_number`, `publication_date`,
`effective_on` and `comments_close_on` as typed fields — nothing is inferred.

EASA feeds covered: NPAs, Opinions, ED Decisions, AMC & GM, Regulations,
Certification Specifications.

**Why EASA is marked `unverified`:** the feeds carry the item and its link but
publish no effective date or comment deadline. Those fields are left `None`
rather than guessed from the item text, and the report flags these items with
"Dates not published in the source feed — confirm against the official
record." The UI must not present them as authoritative.

### Not covered, with evidence

| Authority | Finding when probed |
|---|---|
| **UK CAA** | `caa.co.uk` returns **HTTP 403** to automated requests. This is a deliberate block and has **not** been circumvented. Needs a licensed feed or written permission. |
| **TCCA** | Only a site-wide feed exists (`tc.canada.ca/en/rss.xml`, 10 items, all topics). Needs aviation filtering to be useful. |
| **Health Canada** | No feed found. Canada Gazette Part II is HTML only (`gazette.gc.ca/rp-pr/p2/`) and would need parsing. |
| **CAAC** | No public feed found at `caac.gov.cn`. |
| **ANAC** | No public feed found at `gov.br/anac`. |
| **IAQG / ISO / SAE / IATF** | Commercial bodies, no public feeds. **See licensing warning below.** |

Every uncovered authority appears in each report under "Not Yet Covered", so
the gap is visible rather than reading as a quiet news day. Sources that fail
mid-run are reported as *unavailable*, never as *quiet* — conflating those is
how someone misses a rule.

### [Warning] Licensing warning — standards bodies

ISO, SAE, IAQG and IATF sell their standards. Their content is licensed and
redistribution is prohibited. Do **not** scrape standard text, and do not
republish it to subscribers.

Monitoring *announcements* that a revision exists is a different matter from
reproducing the standard, but the boundary needs Brian's judgement and probably
a licence check before either is built. This is flagged, not decided.

---


## Source register and link health (2026-07-24)

Brian's full monitoring directory (324 sources across Universal, Aerospace,
Automotive, Medical device, Mining, Standards) is captured in
`docs/REGULATORY-DIRECTORY.md` and compiled to `sources/registry.json`.

Every connection was validated:

| Status | Count |
|---|---|
| ok | 171 |
| redirected | 41 |
| blocked (401/403/429) | 45 |
| dead (404/410) | 38 |
| server_error | 2 |
| unreachable (geo/timeout) | 27 |

- `sources/healthcheck.py` — probes all URLs, writes `health-report.md`. Weekly.
- `sources/rediscover.py` — deterministic dead-link replacement (no LLM):
 gathers candidates from the authority's own redirect/sitemap/parent page and
 ranks by similarity; human confirms. Verified finding a live replacement for a
 dead FDA link with no model.

`blocked` and `unreachable` are NOT dead. Only `dead` and confirmed
`redirected` should change a source URL.

## Repository layout

```
regintel/
├── scraper/ Python ingestion (daily 01:00 MST, 14-day window)
│ ├── models.py Finding, Source, priority derivation
│ ├── sources.py Federal Register + EASA + registry + gaps
│ ├── report.py Deterministic markdown rendering
│ ├── store.py Supabase persistence (lazy client)
│ ├── main.py CLI — supports --dry-run
│ └── railway.toml Cron service config
├── nextjs/ Subscriber dashboard
│ ├── lib/handoff.ts Entitlement token verification (9 tests)
│ ├── lib/supabase-client.ts Browser client
│ ├── lib/supabase-server.ts Server + service-role clients (SERVER ONLY)
│ └── app/ dashboard, archive, profile, admin
├── worker/ Node worker (TypeScript ingestion — superseded
│ by scraper/, see Open Questions)
├── migrations/ 001 RLS, 002 priority_rank, 003 provenance,
│ 004 document identity + since-last-login
└── schema.sql Full schema for a fresh install
```

---

## Defects found and fixed

The repo as inherited had never been executed. Neither package built.

| # | Defect | Impact |
|---|---|---|
| 1 | `next.config.ts` on Next 14 | Build failed instantly |
| 2 | `lib/supabase.ts` mixed server-only and browser clients | Webpack build failure |
| 3 | **`postcss.config.js` missing** | Tailwind never compiled — app rendered entirely unstyled |
| 4 | `Stripe.CheckoutSession` — not a real type | Typecheck failure |
| 5 | `cookiesToSet` implicit `any` | Typecheck failure |
| 6 | Untyped Serper response | Worker typecheck failure |
| 7 | **`tier` vs `subscription_tier`** | Four client pages queried a column that does not exist. One is the dashboard gate — **every paying subscriber was redirected to `/signup`** |
| 8 | **RLS had no `with check`** | Any user could set their own `subscription_status` to active and tier to enterprise from the browser. **Every paid tier was free** |
| 9 | **Stripe webhook ordering race** | `subscription.created` keyed on `stripe_customer_id` before checkout set it → paying customers silently got nothing |
| 10 | `dangerouslySetInnerHTML` on LLM markdown | Stored XSS via crafted third-party page titles |
| 11 | Findings sorted `priority` alphabetically | high, low, normal, **urgent** — urgent sorted last, on a product about urgency |
| 12 | Checkout required no authentication | Could create a subscription with no profile attached |

9, 10 and 12 became moot when billing moved to the website.

---

## Verified vs unverified

**Verified by execution:**
- Python scraper: 200 items live from 3 authorities, ~3s, no credentials
- `nextjs` build (11 routes) and lint clean
- 9/9 handoff tests passing, including tier-escalation forgery rejection
- Worker build and typecheck clean

**Never executed:**
- **Migrations 001, 002, 003** — written, reviewed, never run against a database
- No Stripe event ever replayed (now moot)
- No report ever persisted or displayed end-to-end

> There is still no Supabase project. Nothing in this system has completed a
> full round trip from pull to subscriber screen.

---

## Open questions

1. **Two ingestion paths exist.** `worker/` (TypeScript, FAA+FDA) and
 `scraper/` (Python, FAA+FDA+EASA). The Python one supersedes it. The Node
 worker's ingestion should be retired to avoid two sources of truth.
2. **`/enter` is not built** — the endpoint that redeems a handoff token and
 starts a session. It depends on how the website identifies users, which is
 unconfirmed.
3. **UI for the delta is not built.** `/api/findings/new` returns the per-user
 new/amended split; the dashboard does not yet render it or offer the
 acknowledge action.
4. **Railway cron is UTC-only** and does not observe daylight saving. `0 8 * * *`
 is 01:00 MST in winter but 02:00 MDT in summer.
5. **M-AI kernel integration** — the kernel is synchronous and SQLite-backed;
 RegIntel is async Postgres. Requires either an async kernel (recommended) or
 a local mirror with a durability caveat. A RegIntel DIM also needs Brian's
 rule table — rule content is the domain authority's, not the builder's.

---

## Branches

| Branch | Contents |
|---|---|
| `claude/regintel-local-build` | 6 build blockers |
| `claude/regintel-access-and-paywall` | tier mismatch + RLS lockdown |
| `claude/regintel-webhook-and-xss` | webhook race, XSS, priority sort |
| `claude/regintel-deterministic-ingestion` | LLM removal, Federal Register |
| `claude/regintel-website-paywall` | Stripe removal, handoff verification |

None merged. No pull requests opened.
