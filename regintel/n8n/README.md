# RegIntel ingestion in n8n

An alternative to running the Python scraper: n8n (on your machine) fetches the
authority APIs and writes findings to Supabase. It stays correct by writing
through **one** database function, `upsert_finding()`, so the identity and
"what changed" rules live in a single reviewed place — n8n never hand-rolls the
dedup.

> **Pick one engine.** This does the same job as `scraper/`. Run n8n *or* the
> Python scraper against a given database, not both on the same schedule — two
> engines double-writing is how drift starts. (They can't corrupt each other —
> both compute the same content hash — but there's no reason to run both.)

## One-time setup

1. **Apply the schema + migrations to Supabase**, including
   `migrations/006-upsert-finding-function.sql` (creates `upsert_finding()` and
   the `pgcrypto` extension it needs). `schema.sql` for a fresh project, then
   the numbered migrations in order.
2. **Get two values from Supabase** → Project Settings → API:
   - Project URL, e.g. `https://abcd.supabase.co`
   - **service_role** key (secret — bypasses RLS; this writer needs it).
3. **Import the workflow**: n8n → Workflows → Import from File →
   `n8n/federal-register.json`.
4. Open the **Config** node and set `supabaseUrl` and `serviceKey` to the two
   values above. (For a shared n8n, move the key into an n8n *credential*
   instead of a Set node. For a local, single-user n8n this is fine.)
5. **Run once manually** (Execute Workflow) and check the Supabase
   `regulatory_findings` table fills. Then **Activate** the workflow for the
   daily 08:00 schedule.

## How it works

```
Schedule (weekdays 08:00)
  → Config (your Supabase URL + service key)
  → Code: fetch Federal Register for FAA / FDA / NHTSA, map each document to the
          upsert_finding() arguments (category lookup, priority arithmetic,
          verbatim abstract — identical to scraper/sources.py)
  → HTTP: POST each finding to  {supabaseUrl}/rest/v1/rpc/upsert_finding
```

`upsert_finding()` does the rest: inserts a new document (setting
`first_seen_at`), or on a re-sighting bumps `last_seen_at` and only moves
`last_changed_at` if the authority actually amended it. **You cannot get
`first_seen_at` wrong from n8n** — the function owns it.

Each item posted to the RPC is a flat JSON object whose keys are the function's
argument names (`p_finding_key`, `p_authority`, …). PostgREST maps them to the
function by name; missing dates are sent as `null`, never guessed.

## Adding more sources

Clone `federal-register.json` and change the **Code** node's fetch + map for the
new API. The output shape must stay the same — a list of `{ json: { p_… } }`
objects — and the HTTP upsert node is reused unchanged. Two ready patterns to
copy from `scraper/sources.py`:

- **GOV.UK Search API** (MHRA, DVSA, OPSS): `GET https://www.gov.uk/api/search.json`
  with `filter_organisations=<slug>` (or `filter_content_store_document_type=medical_safety_alert`
  for MHRA). No effective date/deadline in the response → set
  `p_verification: 'unverified'`, dates `null`.
- **EASA RSS**: parse the six `document-library/*/feed.xml` feeds. Also
  `unverified` (feeds carry no action dates).

For **not-yet-probed** APIs (eCFR, EASA AD tool, NHTSA recalls), probe them
first — the n8n workflows in `scraper/probe/` and the playbook in
`scraper/PROBING.md` are exactly for that. Confirm the shape, then build the
Code-node mapping.

## Notes

- The `serviceKey` is powerful. Keep this workflow on your local/private n8n;
  don't export it with the key filled in.
- If your n8n version disallows `this.helpers.httpRequest` inside a Code node,
  replace the single Code node with an **HTTP Request** node per agency feeding
  a **Code** map node — same output shape into the same upsert node.
- The Full-Report tab in the app reads a `regulatory_reports` row; this workflow
  populates the **findings feed** only. Report-row generation can be added later
  (or keep using the Python `report.py` for that).
