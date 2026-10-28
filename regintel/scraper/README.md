# RegIntel Scraper

Deterministic regulatory ingestion. No LLM, no search API, no API keys.

## Run it

```bash
pip install -r requirements.txt
python main.py --dry-run          # pull and print; needs nothing
python main.py                    # pull and write to Supabase
python main.py --days 7           # override the trailing window
```

`--dry-run` needs no credentials: every configured source is a public endpoint.

## Schedule

Daily at 01:00 MST (08:00 UTC), 30-day trailing window. See `railway.toml`.

Railway cron is UTC-only and does not observe daylight saving, so `0 8 * * *`
fires at 01:00 MST in winter and 02:00 MDT in summer.

## Adding an authority

1. Write a class with `id`, `authority`, `authority_name` and
   `fetch(since_days) -> list[Finding]` in `sources.py`.
2. Register it in `SOURCES`.
3. Remove the matching entry from `UNCOVERED`.

Rules for any new source:

- **Never infer a field.** If the publisher does not supply an effective date
  or comment deadline, leave it `None`. Do not parse it out of prose.
- **Mark verification honestly.** `verified` only when every field came from a
  structured record. Otherwise `unverified` — the UI flags those.
- **Respect blocks.** UK CAA returns 403 to automated requests; that is a
  deliberate refusal and must not be worked around.
- **Licensed content.** ISO, SAE, IAQG and IATF sell their standards. Do not
  scrape or republish standard text.
