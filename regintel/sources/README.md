# RegIntel — Source Register & Link Health

This folder is the source-of-truth machinery: the master directory becomes a
machine-readable register, the register is validated, and dead links are
rediscovered — all deterministically, no LLM.

## Files

| File | Purpose |
|---|---|
| `../docs/REGULATORY-DIRECTORY.md` | Human-authored master directory (edit here) |
| `build_registry.py` | Generates `registry.json` from the directory |
| `registry.json` | Machine-readable register (324 sources) |
| `healthcheck.py` | Fast whole-register snapshot → `health-report.md` |
| `rediscover.py` | On-domain candidate finder for dead links (no LLM) |
| `source_sentinel.py` | **Governed** self-healing registry (Brian's core) |
| `sentinel_ports.py` | Fetcher + `DeterministicSentinel` (heals via rediscover) |
| `to_sentinel_registry.py` | registry.json → `sources.<domain>.json` |
| `sentinel_run.py` | Run a governed maintenance pass over a domain |
| `sources.<domain>.json` | Per-domain Sentinel registries (6 files, 324 sources) |
| `registry.schema.md` | The collector-record schema |

## Two layers: snapshot vs governed pass

- **`healthcheck.py`** is a fast, read-only, concurrent snapshot of the whole
 register — the "is anything broken right now" report. It changes nothing.
- **`source_sentinel.py`** is the governed, stateful maintenance pass that
 actually *heals*. It only acts on a link dead across **≥2 different days**,
 verifies a candidate's **content identity** before adopting it, auto-applies
 only **same-domain** replacements (cross-domain is proposed for a human), never
 auto-retires `required`/`sentinel` sources, and appends every change to an
 immutable `SOURCE-CHANGELOG.jsonl`.

Both use `rediscover.py` as the candidate engine, so healing needs **no search
API and no LLM** — candidates come only from the authority's own site.

```bash
# governed maintenance pass (weekly, off-peak)
python sentinel_run.py sources.aerospace.json
python source_sentinel.py --demo # trust-boundary demo, no network

# regenerate the per-domain registries after editing the directory
python build_registry.py && python to_sentinel_registry.py
```

## [Warning] identity_markers are seeded, not authoritative

`to_sentinel_registry.py` seeds `identity_markers` from the authority name and
purpose. They are a **starting point**. Too loose lets a lookalike pass; too
tight flags a live page as drifted (observed on some FAA/eCFR pages in testing —
the multi-day rule correctly held them rather than acting). Review the markers
per source before trusting auto-heal. Each generated registry carries
`identity_markers_needs_review: true`.

## Workflow

```bash
# 1. Regenerate the register after editing the directory
python build_registry.py

# 2. Validate every connection (weekly)
python healthcheck.py

# 3. Validate + propose replacements for anything dead
python healthcheck.py --rediscover
```

## How rediscovery works (no LLM)

When a link 404s, `rediscover.py` gathers candidate URLs **from the authority's
own site** — the redirect target, its sitemap, and its parent page — then ranks
them by string similarity to the dead URL and the source's keywords. The top
candidates go into `rediscovery-report.md` for a human to confirm. A source URL
is never changed automatically: the proposal is evidence, the person decides.

This mirrors the whole product's rule — deterministic retrieval, transparent
scoring, human authority over the decision. There is no model guessing a URL.

## Status classification

`healthcheck.py` distinguishes facts that must not be conflated:

- **dead** (404/410) — gone; rediscovery applies.
- **blocked** (401/403/429) — the host refuses automation; NOT dead. Needs a
 licensed feed or permission (e.g. UK CAA).
- **unreachable** (DNS/TLS/timeout) — may be a geo-block from the run host, NOT
 proof the source is dead. Recheck from production before judging.

Only `dead` and confirmed `redirected` should ever change a source URL.
