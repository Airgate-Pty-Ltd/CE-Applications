# RegIntel — Risks, Opportunities, and Mitigations

**Prepared for:** Mike Bower
**Owner:** Brian Olea — b.r.olea.gqm@gmail.com
**Date:** 2026-07-24
**Scope:** The whole program as it stands — Python ingestion, the Next.js
dashboard, the website paywall handoff, the source register, the link health
check, and the Source Sentinel.

This is a working review, not a status page. It states each risk, the evidence
for it, the impact if it is not addressed, and the mitigation. Opportunities are
handled the same way: what it is, the value, and the strategy to capture it.
Priorities and owners are called out so nothing sits unassigned.

---

## Summary

The engineering is sound and, where it has been run, it works. The exposure is
not in the code that exists — it is in what has never been executed, what is
sold but not built, and the maintenance burden that grows with every scraped
source.

The single most important fact: **no part of this system has completed a round
trip against a real database.** Everything below is secondary to closing that.

---

## Part A — Risks

### R1 — Nothing has run end to end. HIGH. Owner: Mike + Brian (infra)

**Evidence.** There is no Supabase project. Migrations 001–004 are written and
reviewed but have never been executed. No report has been persisted or displayed
to a subscriber.

**Impact.** Every "verified" claim in the handover is verified only against a
compiler, a linter, and live source pulls. The database schema, the row-level
security, the "changes since last login" delta, and the ingestion writes are
unproven. A defect anywhere in that chain is currently invisible.

**Mitigation.** Stand up a Supabase project, run `schema.sql` (it folds in all
four migrations), set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and run
`python scraper/main.py`. This is the first task and it unblocks real testing of
everything else. Until it is done, treat the system as unproven.

### R2 — The paywall is incomplete. HIGH. Owner: Mike + website owner

**Evidence.** Access control depends on `/enter`, which is not built. The token
verification library (`nextjs/lib/handoff.ts`) is done and tested (9/9), but the
endpoint that redeems a token and starts a session does not exist. It was left
unbuilt because it depends on how the Conform-Edge website identifies users,
which has not been confirmed.

**Impact.** Without `/enter`, there is no working entry path, and the security
boundary of the product is unresolved. Building it on an assumption about the
website is the wrong move — this is the one place a wrong guess is a breach.

**Mitigation.** Confirm the website's user-identity mechanism first (shared
Supabase project, or an independent user store), then build `/enter` against it.
Do not implement it speculatively.

### R3 — Coverage is thin against what the register implies. HIGH (commercial)

**Evidence.** The register catalogues 324 sources across six domains. Four are
built (FAA, FDA, EASA, MHRA). The link health check found 171 reachable, but
"reachable" is not "ingested."

**Impact.** If the product is sold as broad multi-authority coverage while
delivering four, the gap becomes a credibility problem with exactly the audience
that checks — quality managers and auditors. On a compliance product, overstated
coverage is worse than narrow coverage honestly stated.

**Mitigation.** Sell what is built. Position the strength as provenance and
depth on FAA/FDA/EASA/MHRA, not breadth. Expand deliberately, prioritised by
customer demand and by the low-cost API opportunities in Part B. Every report
already lists uncovered authorities as "Not Yet Covered" so the gap is visible
rather than hidden — keep that behaviour.

### R4 — Scraped (non-API) sources fail silently. HIGH. Owner: Mike

**Evidence.** The four built sources use structured APIs and feeds. The register
holds hundreds of HTML pages. HTML scrapers break whenever an authority
redesigns a page, and they break quietly — the run succeeds and returns nothing.

**Impact.** A silent scraper on a compliance product is the worst failure mode.
A subscriber believes they are monitored when they are not.

**Mitigation.** Two controls are already built and must be used before any
scraped source goes live: (1) the health check's `consecutive_failures` and the
distinction between "no activity" and "source unavailable"; (2) a staleness
alarm — if a source returns zero items for N consecutive runs, it must raise an
alert, not render as a quiet day. Do not add scraped sources without both.

### R5 — identity_markers are seeded, not curated. MEDIUM. Owner: Brian (domain)

**Evidence.** `to_sentinel_registry.py` seeds `identity_markers` from the
authority name and purpose. In testing, some FAA/eCFR pages failed the identity
check on markers that were too specific — a false content-drift. The multi-day
rule correctly held them rather than acting.

**Impact.** Markers that are too loose let a mirror or lookalike pass identity
and be auto-adopted. Too tight, and live pages read as drifted and get proposed
for replacement unnecessarily. Either way the register degrades.

**Mitigation.** Markers are the one part of the Sentinel that needs domain
judgement — Brian's, not an algorithm's. Review the markers per source before
trusting auto-heal. Each registry carries `identity_markers_needs_review: true`.
The guardrails (dead across ≥2 days, same-domain-only auto, human approval for
cross-domain) mean a bad marker cannot silently poison the register, but it can
create noise until corrected.

### R6 — Two ingestion paths exist. MEDIUM. Owner: Mike

**Evidence.** `worker/` (TypeScript, FAA+FDA) and `scraper/` (Python,
FAA+FDA+EASA+MHRA). The Python path supersedes the Node one.

**Impact.** Two sources of truth drift. A fix applied to one is missed in the
other.

**Mitigation.** Retire the Node worker's ingestion. Keep the Next.js frontend;
remove the worker's duplicate pull logic once the Python path is confirmed in
production.

### R7 — Licensed and restricted content. MEDIUM. Owner: Brian (decision)

**Evidence.** The register includes ISO, SAE, IAQG, IATF, VDA, AIAG, IEC, RTCA,
EUROCAE. These bodies sell their standards; redistribution is prohibited. This is
also ClaudeCowork vault policy. Separately, UK CAA (`caa.co.uk`) returns HTTP 403
to automated requests — a deliberate block.

**Impact.** Scraping and republishing licensed standard text is infringement.
Circumventing a deliberate block invites a legal and reputational problem.

**Mitigation.** Do not scrape or republish standard text. Monitoring that a
revision was *announced* is a different question from reproducing the standard,
and it needs Brian's judgement plus a licence check before either is built. UK
CAA coverage needs a licensed feed or written permission — the 403 must not be
worked around. Both boundaries are documented in the code and directory.

### R8 — Geo-blocking and host location. MEDIUM. Owner: Mike

**Evidence.** The health check found 27 sources unreachable from the build host,
concentrated in China and a few other jurisdictions.

**Impact.** A source reachable from one region may be blocked from another. A
scraper hosted in a US region will fail on those sources regardless of code
quality, and the failure will look like "dead."

**Mitigation.** The classifier already separates `unreachable` (DNS/TLS/timeout)
from `dead` (404/410) precisely so this is not misread. Before building any
source that was unreachable in testing, verify reachability from the actual
production host. Do not judge a source dead from a single vantage point.

### R9 — The ingestion pipeline has no automated tests. MEDIUM. Owner: Mike

**Evidence.** The handoff verification has 9 tests. The scraper, the report
builder, the register generation, and the health classifier have none.

**Impact.** The tier-column defect and the priority-sort defect earlier in this
build were both the kind a single unit test would have caught. Without tests,
the next regression ships.

**Mitigation.** Add tests for: priority derivation from dates, dedup by identity,
`content_hash` stability, the registry parser, and the health classifier's
status mapping. These are pure functions and cheap to cover.

### R10 — Politeness and rate limits. MEDIUM. Owner: Mike

**Evidence.** The health check probes 300+ government sites. Ingestion and the
Sentinel add more traffic.

**Impact.** Aggressive polling can get RegIntel's host IP blocked by an
authority — which converts a working source into a `blocked` one and damages the
relationship with the very bodies the product depends on.

**Mitigation.** Respect each site's robots directives, throttle concurrency, run
passes off-peak, and keep the descriptive User-Agent already in the code. The
weekly health-check cadence is deliberately light; do not increase it without
reason.

### R11 — Secret and key management. MEDIUM. Owner: Mike + Brian

**Evidence.** The system already needs the Supabase service-role key and the
handoff HMAC secret. Expanding coverage adds GovInfo and Regulations.gov API
keys.

**Impact.** A leaked service-role key bypasses all row-level security. A leaked
handoff secret lets anyone mint a valid entitlement token — a full paywall
bypass.

**Mitigation.** Keys live in environment variables only, never in the repo
(`.gitignore` already covers `.env` files, and the commits were checked for
secrets). Rotate the handoff secret on any suspected exposure. Handle keys per
ClaudeCowork vault policy — approved secret storage, not the vault.

### R12 — Provenance must be honoured in the UI. MEDIUM. Owner: Mike

**Evidence.** EASA findings are marked `verification: unverified` because the
feeds carry no effective or comment dates. The finding card renders a "Dates not
in source" badge for these.

**Impact.** If a future UI change drops that distinction, an item with no
authority-supplied dates could be presented as authoritative — the exact failure
the no-LLM decision was made to prevent.

**Mitigation.** Keep the `verification` flag visible wherever findings are shown.
Treat it as a required field, not decoration.

### R13 — API schema dependence. LOW/MEDIUM. Owner: Mike

**Evidence.** Ingestion depends on the Federal Register, openFDA, and GOV.UK API
response shapes.

**Impact.** The link health check watches URLs, not JSON schemas. If an API
changes a field name, the URL still returns 200 but ingestion silently produces
malformed findings.

**Mitigation.** Add a light schema check per API source — assert the expected
fields are present, and raise if not. This is the API equivalent of the staleness
alarm in R4.

### R14 — Cron is UTC-only. LOW. Owner: Mike

**Evidence.** Railway cron does not observe daylight saving. `0 8 * * *` is
01:00 MST in winter and 02:00 MDT in summer.

**Impact.** The run drifts an hour seasonally. Minor for a daily regulatory
sweep, but worth knowing.

**Mitigation.** Accept the drift, or use two seasonal schedules if 01:00 local is
required year-round.

---

## Part B — Opportunities

### O1 — openFDA is a strong medical-device source, already reachable. HIGH

**What.** `api.fda.gov` exposes device recall, adverse-event (MAUDE), 510(k),
De Novo and PMA as structured JSON with no key. Confirmed live 2026-07-24.

**Value.** Medical device is core scope. This is richer and more current than the
Federal Register alone for device events, and it is the same build pattern
already used for FAA/FDA.

**Strategy.** Build it next, alongside the Supabase stand-up. It is high value
per unit of effort and needs no credential.

### O2 — The eCFR API covers the whole US CFR in one integration. HIGH

**What.** `ecfr.gov/api` is a public API over the entire Code of Federal
Regulations, with amendment dates — including 21 CFR (medical), 49 CFR 571
(automotive FMVSS), 14 CFR (aviation), and 30 CFR (mining).

**Value.** One integration serves four industries. It also provides the
authoritative "current regulation text" cross-check that the register's
`cross_reference` fields are designed for.

**Strategy.** Build a single eCFR source module parameterised by title. Reuse it
across every industry vertical.

### O3 — The Federal Register API already reaches more agencies for free. HIGH

**What.** The built Federal Register source is parameterised by agency slug.
MSHA, NHTSA and EPA are all on the same API.

**Value.** Near-zero marginal cost to add mining (MSHA) and automotive (NHTSA,
EPA) rule monitoring — new verticals from code that already exists and is proven.

**Strategy.** Add agency slugs to the source registry as demand appears. No new
integration work.

### O4 — The GOV.UK Search API pattern extends beyond MHRA. MEDIUM

**What.** The MHRA source uses the GOV.UK Search API. DVSA, OPSS, and MHRA's own
consultations use the same API with a different filter.

**Value.** Cheap UK coverage across automotive safety (DVSA), product safety
(OPSS), and consultation tracking — reusing a proven module.

**Strategy.** Generalise the GOV.UK source to accept an organisation/document-type
filter; add the three feeds.

### O5 — Provenance is the real differentiator. HIGH (positioning)

**What.** Every finding is traceable to the publishing authority's own record.
There is no AI-generated regulatory content anywhere in the product.

**Value.** "Every item traceable to the authority's own record, with a versioned
rule trail" is a stronger and more defensible claim to a quality manager than
"AI-powered." It is the claim that survives the question "how do you know?"

**Strategy.** Lead the marketing with provenance and auditability, not breadth or
AI. This also aligns the product with Conform-Edge's own quality positioning.

### O6 — The Source Sentinel is itself a sellable capability. MEDIUM

**What.** A self-healing, identity-verified, audited source registry with an
append-only change log.

**Value.** Compliance buyers understand the value of a source list that proves it
is current and records every change. This is a feature competitors relying on
manual link maintenance cannot easily match.

**Strategy.** Surface "monitored and self-validating sources, with an audit
trail" as a product capability, not just internal plumbing.

### O7 — The M-AI kernel assessment layer. MEDIUM

**What.** Findings are structured records. The M-AI kernel can assess them
deterministically — deadline within a subscriber's approval scope, a change that
triggers a procedure review — and surface System-Detected Conditions.

**Value.** This is what turns a feed into intelligence, and it is auditable by
construction. It advances the product from "what changed" to "what this means for
you."

**Strategy.** Requires Brian's rule table (fires-when, severity, clause
references) — rule content is the domain authority's, not the builder's. Provide
that, and the kernel integration is a defined build. Note the kernel is
synchronous and SQLite-based today; the async/Postgres reconciliation is a known
task.

### O8 — Multi-industry expansion from one engine. MEDIUM

**What.** The register already spans aerospace, medical, automotive, mining and
standards. The ingestion engine is domain-agnostic.

**Value.** Each vertical is a separate market reachable from the same codebase.
Mining (MSHA via Federal Register) and automotive (NHTSA, eCFR 49 CFR) are the
nearest because the sources are already proven APIs.

**Strategy.** Expand by market demand, not by catalogue size. The register is the
backlog; O1–O4 are the low-cost entries.

### O9 — Cross-reference validation raises trust further. LOW/MEDIUM

**What.** The register carries `cross_reference` links (e.g. an FAA rule in the
Federal Register cross-referenced to 14 CFR in eCFR).

**Value.** Confirming a finding against a second authoritative source is a
stronger guarantee than a single source, and it is a natural extension of the
deterministic model.

**Strategy.** Once eCFR (O2) is built, cross-check high-priority findings against
the consolidated regulation and flag any mismatch for review.

---

## Part C — Recommended sequence

1. **Stand up Supabase and run the ingestion end to end (R1).** Nothing else is
   real until this is done.
2. **Confirm website identity, then build `/enter` (R2).**
3. **Build openFDA and eCFR (O1, O2)** — highest value, lowest cost, both proven
   reachable, both serve the core medical scope.
4. **Add the staleness alarm and per-API schema check (R4, R13)** before any
   scraped or additional API source goes live.
5. **Retire the Node worker's ingestion (R6).**
6. **Curate identity_markers for the built and next sources (R5),** then enable
   the Sentinel's weekly pass.
7. **Add ingestion unit tests (R9).**
8. **Decide the M-AI assessment layer and supply the rule table (O7)** when the
   base product is proven in production.

The order is deliberate: prove the system is real, close the security boundary,
then expand on the cheapest high-value sources, with the silent-failure controls
in place before the fragile sources are added.
