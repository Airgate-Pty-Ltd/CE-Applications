# Conform-Edge RegIntel™ — Setup Guide

> **Just want to see it run?** Jump to [Local development](#local-development).
> You can get the site rendering with no accounts at all.

## What's in this folder

```
regintel/
├── schema.sql                          ← Run this in Supabase first
├── .env.example                        ← Copy to .env.local and .env
├── SETUP.md                            ← This file
├── worker/                             ← New Railway service (persistent Node.js)
│   ├── package.json
│   ├── tsconfig.json
│   ├── railway.toml
│   └── src/
│       ├── index.ts                    ← Express server (POST /api/generate)
│       ├── ingest.ts                   ← Deterministic report builder
│       ├── generate-once.ts            ← One-shot CLI (supports --dry-run)
│       ├── sources/                    ← One module per authoritative source
│       │   ├── types.ts                ←   Source + Finding contracts
│       │   ├── federal-register.ts     ←   FAA + FDA (public API, no key)
│       │   └── index.ts                ←   Registry + coverage gaps
│       └── supabase.ts                 ← DB writes
└── nextjs/                             ← Add these files to your existing Next.js site
    ├── lib/
    │   ├── types.ts                    ← Shared DB types (no runtime imports)
    │   ├── supabase-client.ts          ← Browser client ('use client' components)
    │   └── supabase-server.ts          ← Server + service-role clients (SERVER ONLY)
    └── app/
        ├── dashboard/page.tsx          ← Main subscriber dashboard
        ├── login/page.tsx
        ├── signup/page.tsx
        └── api/
            ├── reports/generate/route.ts   ← Cron endpoint (calls worker)
            ├── reports/latest/route.ts     ← Fetch latest report
            ├── findings/route.ts           ← Filtered findings endpoint
            └── stripe/
                ├── checkout/route.ts       ← Create Stripe checkout session
                └── webhook/route.ts        ← Handle Stripe subscription events
```

---

## Local development

Three levels, in increasing order of what you need to sign up for. Start at
level 1 — it needs nothing but Node.

### Level 1 — Run the site (no accounts needed)

The marketing site, pricing page, login and signup screens all render without
any external service. Anything behind the paywall will not load, which is
expected.

```bash
cd nextjs
npm install
cp ../.env.example .env.local     # placeholder values are fine at this level
npm run dev
```

Open <http://localhost:3000>. You should see the landing page, fully styled.

> The Supabase values in `.env.local` must be *present* or the build fails when
> prerendering `/login` and `/signup` — but they do not have to be real until
> level 2.

### Level 2 — Run the report engine (still no accounts)

This exercises the actual product: pull every configured authority source and
print the report. No API keys, no LLM, no database.

```bash
cd worker
npm install
npm run generate -- --dry-run
```

Completes in about a second. Every item printed comes from the publishing
authority's own structured record.

### Level 3 — Full stack (adds Supabase + Stripe)

Complete steps 1–6 below, then run the frontend and worker together:

```bash
cd worker && npm run build && npm start    # worker on :3001
cd nextjs && npm run dev                   # frontend on :3000
```

Trigger a report and save it:

```bash
curl -X POST http://localhost:3001/api/generate -H "x-cron-secret: YOUR_CRON_SECRET"
```

### Checks before pushing

```bash
cd nextjs && npm run build && npm run lint
cd worker && npm run build
```

---

## Step 1 — Supabase

1. Go to your Supabase project → SQL Editor → New Query
2. Paste the contents of `schema.sql` and run it
3. Go to Authentication → Email settings → Enable email signups
4. Copy your Project URL, anon key, and service role key to `.env.example`

---

## Step 2 — Railway: Add Worker Service

1. **New Service → GitHub Repo**
   - Connect your repo
   - Root directory: point at wherever you place the `worker/` folder
   - Railway will detect `railway.toml` automatically
2. **Environment variables** (Service Settings → Variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   CRON_SECRET=... (same value you set on the Next.js frontend)
   ```

---

## Step 3 — Railway: Add Cron Service

1. **New Service → Cron**
2. Schedule: `0 13 * * 1-5` (6:00 AM MT, weekdays)
3. Command:
   ```bash
   curl -X POST https://[your-worker-url].railway.app/api/generate \
     -H "x-cron-secret: YOUR_CRON_SECRET"
   ```

---

## Step 4 — Next.js Frontend

1. Copy the `nextjs/` files into your existing Next.js project:
   - `nextjs/lib/*.ts` → `lib/` (all three files)
   - `nextjs/app/dashboard/` → `app/dashboard/`
   - `nextjs/app/login/` → `app/login/`
   - `nextjs/app/signup/` → `app/signup/`
   - `nextjs/app/api/` → `app/api/` (merge with existing)

2. Install dependencies (if not already present):
   ```bash
   npm install @supabase/supabase-js @supabase/ssr stripe
   ```

3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   STRIPE_SECRET_KEY=...
   STRIPE_WEBHOOK_SECRET=...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
   STRIPE_PRICE_BASIC=price_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_ENTERPRISE=price_...
   CRON_SECRET=...
   WORKER_URL=https://your-worker.railway.app
   NEXT_PUBLIC_APP_URL=https://regintel.conform-edge.com
   ADMIN_EMAIL=b.r.olea.gqm@gmail.com
   ```

4. Add the cron trigger to `vercel.json` (root of your Next.js project):
   ```json
   {
     "crons": [
       {
         "path": "/api/reports/generate",
         "schedule": "0 13 * * 1-5"
       }
     ]
   }
   ```

---

## Step 5 — Stripe

1. Create 3 products in the Stripe Dashboard:
   - Basic $29/mo, Pro $79/mo, Enterprise $299/mo
2. Copy each Price ID to your `.env.local`
3. Add webhook endpoint: `https://your-site.com/api/stripe/webhook`
   - Events to listen for: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Step 6 — Test end-to-end

```bash
# From your local machine (with .env set):
curl -X POST http://localhost:3001/api/generate \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Watch the worker logs — it should pull every configured source and write the report to Supabase. Then open `/dashboard` in your browser.

---

## Dashboard URL layout

| Path | Who sees it |
|---|---|
| `/` | Public landing page (build separately) |
| `/login` | Anyone |
| `/signup` | Anyone — 14-day trial |
| `/dashboard` | Active/trialing subscribers only |
| `/dashboard/archive` | Paid subscribers (depth by tier) |
| `/dashboard/settings` | Subscribers |
| `/dashboard/profile` | Subscribers — billing portal |

---

## Notes for your developer

- `lib/supabase-server.ts` is server-only (it imports `next/headers` and holds
  the service-role key). Importing it from a `'use client'` component breaks the
  build. Client components use `lib/supabase-client.ts`.
- `worker/src/sources/` holds one module per authoritative source. To add an
  authority: write a source module implementing the `Source` interface and
  register it in `worker/src/sources/index.ts`. Nothing else changes.
- An authority with no configured source is reported as "Not Yet Covered",
  never as "no activity" — those mean very different things to a subscriber.
- There is no LLM in this product. Do not reintroduce one into the
  ingestion path: regulatory dates and document numbers must be the
  authority's own values, never model output.
- The `nextjs/app/dashboard/page.tsx` uses only Tailwind (no shadcn dependency) so it works with any Next.js setup. Add `react-markdown` for better report rendering.
- The dashboard polls `/api/reports/latest` once on load. Add a `setInterval` call if you want live "generating…" → "ready" updates.
