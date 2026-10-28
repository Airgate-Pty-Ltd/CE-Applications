# Conform-Edge Regulatory Intelligence Dashboard
## Full Build Specification & AI Coding Prompt

> **How to use this document:**
> Paste the section titled "SYSTEM PROMPT FOR DEVELOPER / AI CODING ASSISTANT" directly into Claude Code, GitHub Copilot, Cursor, or any AI coding assistant to begin building. The remaining sections provide background context and design decisions.

---

## BACKGROUND & VISION

**Product name:** Conform-Edge RegIntel™
**Owner:** Brian Olea, Conform-Edge (b.r.olea.gqm@gmail.com)
**Purpose:** A subscription-based web service that automatically monitors the world's major aviation, quality, and medical device regulatory authorities daily and delivers a structured intelligence dashboard to paying subscribers.

**Target audience:**
- Aerospace MRO / Part 145 Repair Stations (FAA, EASA, CAAC, UK CAA, TCCA)
- Production Approval Holders (PAH): PMA, STC, TC, OEM, ODA, POA holders under FAA and EASA Part 21
- Aerospace Manufacturers certified to AS9100D / IA9100
- Quality Managers and Lead Auditors tracking standards changes (ISO 9001, ISO 13485, IATF 16949, AS9100/IA9100)
- QMS Consultants needing daily regulatory awareness

**Value proposition:** Subscribers never miss a regulatory change that could trigger a nonconformity, require a procedure update, or generate an audit finding. Instead of manually checking 12+ authority websites daily, they get one clean, filtered dashboard.

---

## SYSTEM PROMPT FOR DEVELOPER / AI CODING ASSISTANT

> Paste everything below this line into your AI coding assistant or give to your developer.

---

### PROJECT: Conform-Edge RegIntel™ — Regulatory Intelligence Subscription Dashboard

Build a full-stack web application called **Conform-Edge RegIntel™**. This is a B2B subscription service where paying members log in to access a daily-updated regulatory intelligence dashboard covering aviation and quality management standards worldwide.

---

## TECH STACK RECOMMENDATION

> **[Engine] AI ENGINE: Ollama (Local) with Qwen 3**
> This build uses a self-hosted Ollama instance running Qwen 3 instead of a paid AI API. See the "Ollama Configuration" section below for setup. This eliminates per-call AI costs entirely but requires a persistent server (not compatible with pure serverless).

Use the following stack (chosen for low operational complexity, Ollama compatibility, and fast time-to-market):

**Frontend:**
- Next.js 14+ (App Router) with TypeScript
- Tailwind CSS for styling
- shadcn/ui for component library
- Recharts for any data visualization

**Backend / Worker (IMPORTANT — must be a persistent server, not serverless):**
- A dedicated Node.js worker process running on Railway, Render, or a VPS (DigitalOcean Droplet, Linode)
- This worker hosts Ollama OR connects to an Ollama instance on your local machine/network
- Ollama exposes an OpenAI-compatible API at `http://localhost:11434/v1` — no SDK changes needed beyond pointing the client at this URL
- Serper API (Google Search wrapper) for web searches

**Frontend hosting:**
- Vercel for the Next.js frontend and non-AI API routes (auth, Stripe, data fetching)
- The Vercel frontend calls the persistent backend worker for report generation

**Database:**
- Supabase (PostgreSQL) — for reports storage, user accounts, subscription status
- Supabase Auth for authentication (email/password + magic link)

**Subscriptions & Payments:**
- Stripe for subscription billing
- Stripe webhooks to sync subscription status to Supabase

**Scheduling (report generation):**
- Railway Cron service — Railway has a native cron job service type that triggers the worker on a schedule (no node-cron library needed)
- Set schedule to `0 13 * * 1-5` (6:00 AM MT, weekdays only)
- The cron service calls the worker's `/generate` endpoint via Railway's internal private network

**Deployment — Railway via GitHub (existing setup):**
- You already use Railway with GitHub — add two new services to your existing Railway project:
 1. **Worker service** — Node.js, connected to the same GitHub repo (point at `/worker` directory or a separate repo)
 2. **Ollama service** — deployed from the official `ollama/ollama` Docker image, no GitHub repo needed
- Vercel remains the frontend host (or move the Next.js frontend to Railway too if preferred)
- Supabase (database + auth)

**Email (optional Phase 2):**
- Resend or SendGrid for daily email digest to subscribers

---

## OLLAMA CONFIGURATION

### Setup Qwen 3 in Ollama

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the Qwen 3 model (choose based on available RAM/VRAM)
ollama pull qwen3:8b # Recommended — good quality, ~5GB RAM
ollama pull qwen3:14b # Better quality — ~9GB RAM
ollama pull qwen3:4b # Lightweight — ~3GB RAM (lower quality for complex tasks)

# Verify it's running
ollama run qwen3:8b "Hello, are you working?"

# Start Ollama server (it runs on port 11434 by default)
ollama serve
```

### Switching from Anthropic SDK to Ollama in the Code

Replace the Anthropic client with the OpenAI package pointed at Ollama's local endpoint. Ollama is fully OpenAI API-compatible, so **only the client initialization and model name change** — all prompt logic stays the same:

```typescript
// BEFORE (Anthropic):
// import Anthropic from '@anthropic-ai/sdk';
// const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
// const response = await client.messages.create({
// model: 'claude-haiku-4-5-20251001',
// max_tokens: 2000,
// messages: [{ role: 'user', content: prompt }],
// });
// const text = response.content[0].text;

// AFTER (Ollama via OpenAI-compatible client):
import OpenAI from 'openai';

const ollama = new OpenAI({
 baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
 apiKey: 'ollama', // Ollama doesn't require a real key — any string works
});

async function callLLM(prompt: string, maxTokens = 2000): Promise<string> {
 const response = await ollama.chat.completions.create({
 model: process.env.OLLAMA_MODEL || 'qwen3:8b',
 max_tokens: maxTokens,
 messages: [{ role: 'user', content: prompt }],
 // Disable Qwen 3's built-in chain-of-thought for structured JSON tasks:
 // Add "/no_think" at the end of the prompt, or set temperature to 0
 temperature: 0,
 });
 return response.choices[0].message.content || '';
}
```

### Important: Qwen 3 Thinking Mode

Qwen 3 has a built-in "thinking" (chain-of-thought) mode that wraps responses in `<think>...</think>` tags. For structured JSON extraction tasks, **disable thinking mode** to get clean output:

```typescript
// Option 1: Append /no_think to the prompt
const prompt = `...your prompt here...\n\n/no_think`;

// Option 2: Strip think tags from output if they appear
function stripThinkTags(text: string): string {
 return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// Usage in extractFindings():
const raw = await callLLM(prompt + '\n\n/no_think');
const cleaned = stripThinkTags(raw);
return JSON.parse(cleaned);
```

### Ollama Environment Variables

```env
# Replace Anthropic vars with these:
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen3:8b

# If Ollama runs on a different machine on the same network:
# OLLAMA_BASE_URL=http://192.168.1.xxx:11434/v1

# If deploying worker to Railway/Render with Ollama on the same container:
# OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
```

### Deployment Architecture with Ollama on Railway (GitHub-connected)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ RAILWAY PROJECT (existing) │
│ │
│ ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────────┐ │
│ │ Cron Service │ │ Worker Service │ │ Ollama Service │ │
│ │ (Railway type) │──▶│ (Node.js) │──▶│ (Docker image) │ │
│ │ │ │ GitHub repo: │ │ ollama/ollama │ │
│ │ Schedule: │ │ /worker dir │ │ │ │
│ │ 0 13 * * 1-5 │ │ ├── search.ts │ │ Model: qwen3:8b │ │
│ │ (6 AM MT M–F) │ │ ├── extract.ts │ │ Port: 11434 │ │
│ └─────────────────┘ │ └── report.ts │ │ Private network: │ │
│ │ │ │ ollama.railway. │ │
│ │ Env vars: │ │ internal:11434 │ │
│ │ OLLAMA_BASE_URL= │ └──────────────────────┘ │
│ │ ollama.railway. │ │
│ │ internal:11434 │ │
│ └──────────────────┘ │
│ │ │
└──────────────────────────────────┼────────────────────────────────────────┘
 │
 ┌────────────────────┼──────────────────┐
 ▼ ▼ ▼
 ┌─────────────┐ ┌──────────────────┐ ┌──────────────┐
 │ Supabase │ │ Vercel (or │ │ Serper API │
 │ Database │ │ Railway frontend │ │ (web search)│
 │ + Auth │ │ Next.js app) │ └──────────────┘
 └─────────────┘ └──────────────────┘
```

**Key Railway detail — private networking:** Railway services in the same project communicate over a private internal network using the service name as hostname. Set `OLLAMA_BASE_URL=http://ollama.railway.internal:11434/v1` in the Worker service's environment variables. This means Ollama is never exposed to the public internet — faster and more secure.

### Railway Service Setup (step by step)

**Service 1 — Ollama (Docker image, no GitHub needed):**
```
Railway Dashboard → New Service → Docker Image
Image: ollama/ollama
Port: 11434
Volume: /root/.ollama (persistent — so the model survives restarts)
RAM: 8 GB minimum
```

After the service starts, open a Railway shell and run:
```bash
ollama pull qwen3:8b
```
This only needs to be done once — the model is stored in the mounted volume.

**Service 2 — Worker (GitHub repo):**
```
Railway Dashboard → New Service → GitHub Repo
Repo: your existing repo
Root directory: /worker (or wherever the worker code lives)
Start command: node dist/index.js
```

Environment variables to set in Railway dashboard:
```
OLLAMA_BASE_URL=http://ollama.railway.internal:11434/v1
OLLAMA_MODEL=qwen3:8b
SERPER_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
```

**Service 3 — Cron trigger (Railway cron type):**
```
Railway Dashboard → New Service → Cron
Schedule: 0 13 * * 1-5
Command: curl -X POST https://[worker-url]/api/generate \
 -H "x-cron-secret: $CRON_SECRET"
```

**Service 4 — Next.js frontend (GitHub repo, likely already exists):**
No changes needed if already deployed. Add `WORKER_URL` env var pointing to the worker service URL.

### Worker Directory Structure

```
/worker
├── package.json
├── tsconfig.json
├── railway.toml ← tells Railway how to build/start
├── src/
│ ├── index.ts ← Express server, exposes POST /api/generate
│ ├── search-engine.ts ← authority search logic
│ ├── extract.ts ← Ollama extraction calls
│ ├── report.ts ← report synthesis
│ └── supabase.ts ← database writes
└── Dockerfile ← optional, Railway can use Nixpacks auto-detect
```

```toml
# worker/railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
```

### Model Persistence (Important)

Without a persistent volume, Ollama re-downloads the model every time the Railway service restarts, which takes several minutes and uses bandwidth. Always attach a Railway volume to the Ollama service at `/root/.ollama`. In Railway: Service Settings → Volumes → Add Volume → Mount path: `/root/.ollama`.

### Server Sizing for Ollama

| Model | Min RAM | Recommended | Monthly Cost (Railway) |
|---|---|---|---|
| qwen3:4b | 4 GB | 6 GB | ~$10/mo |
| qwen3:8b | 6 GB | 10 GB | ~$20/mo |
| qwen3:14b | 10 GB | 16 GB | ~$35/mo |
| qwen3:32b | 20 GB | 32 GB | ~$80/mo |

**Recommendation:** Start with `qwen3:8b` on an 8GB RAM Railway instance (~$20/month). The report only runs once per weekday, so the server is idle most of the time. For GPU acceleration (much faster), a RunPod or Lambda Labs GPU instance reduces generation time from ~2 minutes to ~10 seconds.

### Cost Comparison

| Component | Anthropic Version | Ollama/Qwen 3 Version |
|---|---|---|
| AI per report | ~$0.15–$0.30 | $0.00 |
| AI per month (20 reports) | ~$3–$6 | $0.00 |
| Server cost | $0 (serverless) | ~$20/mo (Railway 8GB) |
| Search API (Serper) | ~$10–$30/mo | ~$10–$30/mo (same) |
| **Total monthly infra** | **~$10–$36** | **~$30–$50** |

The Ollama approach costs slightly more in server fees but gives you **zero marginal cost per report** — critical if you later want to add features like on-demand re-runs, custom client reports, or real-time queries without worrying about API bills.

---

## DATABASE SCHEMA

```sql
-- Users table (managed by Supabase Auth, extended here)
create table public.profiles (
 id uuid references auth.users primary key,
 email text not null,
 full_name text,
 organization text,
 role text, -- "MRO", "PAH", "Manufacturer", "Consultant", "Auditor"
 subscription_status text default 'inactive', -- 'active', 'inactive', 'trialing', 'cancelled'
 stripe_customer_id text,
 stripe_subscription_id text,
 subscription_tier text default 'basic', -- 'basic', 'pro', 'enterprise'
 subscribed_authorities text[], -- which authority filters subscriber tracks
 created_at timestamptz default now()
);

-- Reports table — one row per daily report
create table public.regulatory_reports (
 id uuid primary key default gen_random_uuid(),
 report_date date not null unique,
 generated_at timestamptz default now(),
 status text default 'pending', -- 'pending', 'generating', 'complete', 'error'
 
 -- Structured content sections (stored as JSONB)
 priority_alerts jsonb, -- array of alert objects
 final_rules jsonb, -- array of rule objects
 open_nprs jsonb, -- array of NPRM objects
 advisory_guidance jsonb, -- ACs, Orders, AMC/GM
 standards_developments jsonb, -- ISO, IAQG, SAE
 international_updates jsonb, -- non-FAA/EASA authorities
 consulting_opportunities jsonb,-- flagged business opportunities
 no_activity jsonb, -- authorities with nothing new

 -- Raw markdown (for download / email)
 full_report_markdown text,
 
 -- Metadata
 authorities_searched text[],
 total_items_found integer default 0,
 error_message text
);

-- Individual findings — normalized for filtering
create table public.regulatory_findings (
 id uuid primary key default gen_random_uuid(),
 report_id uuid references public.regulatory_reports(id),
 report_date date not null,
 
 authority text not null, -- 'FAA', 'EASA', 'IAQG', 'ISO', 'UK_CAA', etc.
 category text not null, -- 'final_rule', 'nprm', 'advisory_circular', 'standard', 'alert'
 priority text default 'normal', -- 'urgent', 'high', 'normal', 'low'
 
 title text not null,
 summary text not null,
 detail text,
 source_url text,
 effective_date date,
 comment_deadline date,
 document_number text, -- e.g., "AC 120-92C", "NPA 2026-01"
 
 is_comment_deadline_soon boolean generated always as (
 comment_deadline is not null and comment_deadline <= (current_date + interval '30 days')
 ) stored,
 
 created_at timestamptz default now()
);

-- Subscriber alert preferences
create table public.alert_preferences (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references public.profiles(id),
 authority text not null, -- which authority to watch
 category text, -- which category (null = all)
 enabled boolean default true
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.regulatory_reports enable row level security;
alter table public.regulatory_findings enable row level security;

-- Policies: subscribers can read reports only if subscription is active
create policy "Active subscribers can read reports"
 on public.regulatory_reports for select
 using (
 exists (
 select 1 from public.profiles
 where id = auth.uid()
 and subscription_status in ('active', 'trialing')
 )
 );

create policy "Active subscribers can read findings"
 on public.regulatory_findings for select
 using (
 exists (
 select 1 from public.profiles
 where id = auth.uid()
 and subscription_status in ('active', 'trialing')
 )
 );

create policy "Users can read and update own profile"
 on public.profiles for all
 using (id = auth.uid());
```

---

## REGULATORY SEARCH ENGINE

This is the core engine that runs on a schedule and populates the database. Build it as a standalone TypeScript module at `lib/regulatory-search-engine.ts`.

### Authorities to Monitor

```typescript
export const AUTHORITIES = [
 {
 id: 'FAA',
 name: 'Federal Aviation Administration',
 searches: [
 'FAA new advisory circular {MONTH} {YEAR} site:faa.gov',
 'FAA NPRM final rule {MONTH} {YEAR} site:federalregister.gov',
 'FAA airworthiness directive {MONTH} {YEAR} site:federalregister.gov',
 'FAA Part 145 Part 21 rulemaking {YEAR}',
 ],
 categories: ['final_rule', 'nprm', 'advisory_circular', 'airworthiness_directive']
 },
 {
 id: 'EASA',
 name: 'European Union Aviation Safety Agency',
 searches: [
 'EASA NPA opinion AMC GM {MONTH} {YEAR} site:easa.europa.eu',
 'EASA ED Decision {YEAR} site:easa.europa.eu',
 'EASA airworthiness directive {MONTH} {YEAR}',
 ],
 categories: ['npa', 'opinion', 'amc_gm', 'ed_decision', 'airworthiness_directive']
 },
 {
 id: 'IAQG',
 name: 'International Aerospace Quality Group',
 searches: [
 'IAQG IA9100 IA9110 IA9120 AS9100 revision update {YEAR}',
 'IAQG OASIS announcement {YEAR}',
 'AS9100 AS9110 AS9120 sanctioned interpretation {YEAR}',
 ],
 categories: ['standard_revision', 'interpretation', 'announcement']
 },
 {
 id: 'ISO',
 name: 'International Organization for Standardization',
 searches: [
 'ISO 9001 amendment revision DIS FDIS {YEAR} site:iso.org',
 'ISO 13485 revision update {YEAR}',
 'ISO 14001 amendment {YEAR}',
 'ISO 45001 revision {YEAR}',
 ],
 categories: ['standard_revision', 'dis_ballot', 'fdis_ballot', 'published_standard']
 },
 {
 id: 'UK_CAA',
 name: 'UK Civil Aviation Authority',
 searches: [
 'UK CAA CAP publication {MONTH} {YEAR} site:caa.co.uk',
 'UK CAA airworthiness notice {YEAR}',
 ],
 categories: ['cap_publication', 'airworthiness_notice']
 },
 {
 id: 'TCCA',
 name: 'Transport Canada Civil Aviation',
 searches: [
 'Transport Canada TCCA aviation regulation standard {MONTH} {YEAR}',
 'TCCA airworthiness directive notice {YEAR} site:tc.canada.ca',
 ],
 categories: ['airworthiness_directive', 'standard', 'policy_letter']
 },
 {
 id: 'FDA',
 name: 'US Food and Drug Administration',
 searches: [
 'FDA QMSR medical device guidance {MONTH} {YEAR} site:fda.gov',
 'FDA 21 CFR 820 update {YEAR}',
 'FDA medical device regulation {MONTH} {YEAR}',
 ],
 categories: ['guidance', 'final_rule', 'draft_guidance']
 },
 {
 id: 'HEALTH_CANADA',
 name: 'Health Canada',
 searches: [
 'Health Canada medical device regulation guidance {MONTH} {YEAR}',
 'Canada Gazette medical devices {MONTH} {YEAR}',
 ],
 categories: ['regulation_amendment', 'guidance']
 },
 {
 id: 'CAAC',
 name: 'Civil Aviation Administration of China',
 searches: [
 'CAAC CCAR aviation regulation update {MONTH} {YEAR}',
 'Civil Aviation Administration China airworthiness {YEAR}',
 ],
 categories: ['ccar_amendment', 'airworthiness_directive', 'advisory_circular']
 },
 {
 id: 'ANAC',
 name: 'Brazil National Civil Aviation Agency',
 searches: [
 'ANAC Brazil RBAC amendment aviation {YEAR} site:gov.br',
 ],
 categories: ['rbac_amendment', 'airworthiness_directive']
 },
 {
 id: 'SAE',
 name: 'SAE International',
 searches: [
 'SAE International aerospace standard AS ARP new revision {MONTH} {YEAR} site:sae.org',
 ],
 categories: ['new_standard', 'standard_revision']
 },
 {
 id: 'IATF',
 name: 'International Automotive Task Force',
 searches: [
 'IATF 16949 sanctioned interpretation update {YEAR}',
 'IATF 16949 revision {YEAR}',
 ],
 categories: ['sanctioned_interpretation', 'standard_revision']
 }
];
```

### Search Engine Implementation

```typescript
// lib/regulatory-search-engine.ts

import OpenAI from 'openai';

const ollama = new OpenAI({
 baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
 apiKey: 'ollama',
});

async function callLLM(prompt: string, maxTokens = 2000): Promise<string> {
 const response = await ollama.chat.completions.create({
 model: process.env.OLLAMA_MODEL || 'qwen3:8b',
 max_tokens: maxTokens,
 messages: [{ role: 'user', content: prompt }],
 temperature: 0,
 });
 return response.choices[0].message.content || '';
}

function stripThinkTags(text: string): string {
 return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

interface SearchResult {
 title: string;
 url: string;
 snippet: string;
}

interface Finding {
 authority: string;
 category: string;
 priority: 'urgent' | 'high' | 'normal' | 'low';
 title: string;
 summary: string;
 detail: string;
 source_url: string;
 effective_date?: string;
 comment_deadline?: string;
 document_number?: string;
}

// Search using Serper API (Google Search wrapper)
async function webSearch(query: string): Promise<SearchResult[]> {
 const response = await fetch('https://google.serper.dev/search', {
 method: 'POST',
 headers: {
 'X-API-KEY': process.env.SERPER_API_KEY!,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({ 
 q: query, 
 num: 10,
 tbs: 'qdr:w2' // past 2 weeks
 }),
 });
 const data = await response.json();
 return (data.organic || []).map((r: any) => ({
 title: r.title,
 url: r.link,
 snippet: r.snippet,
 }));
}

// Use Ollama/Qwen 3 to extract structured findings from raw search results
async function extractFindings(
 authority: string,
 searchResults: SearchResult[]
): Promise<Finding[]> {
 if (searchResults.length === 0) return [];

 const today = new Date().toISOString().split('T')[0];
 const prompt = `You are a regulatory intelligence analyst specializing in aviation quality management systems (AS9100, FAA, EASA, ISO 9001, ISO 13485, IATF 16949).

Today's date: ${today}

Analyze the following web search results for regulatory activity from ${authority} published in the last 7 days.

SEARCH RESULTS:
${searchResults.map(r => `TITLE: ${r.title}\nURL: ${r.url}\nSNIPPET: ${r.snippet}`).join('\n\n---\n\n')}

Extract only genuinely NEW regulatory items (final rules, NPRMs, advisory circulars, standard revisions, guidance documents). Do NOT include items older than 14 days from today unless they have an imminent deadline (within 30 days).

For each item found, return a JSON array with this structure:
[
 {
 "title": "Short descriptive title",
 "summary": "1-2 sentence plain-language summary of what changed and why it matters",
 "detail": "More detail including document number, scope, who is affected",
 "source_url": "direct URL to the document",
 "category": "final_rule|nprm|advisory_circular|standard_revision|airworthiness_directive|guidance|interpretation",
 "priority": "urgent|high|normal|low",
 "effective_date": "YYYY-MM-DD or null",
 "comment_deadline": "YYYY-MM-DD or null",
 "document_number": "e.g. AC 120-92C or null"
 }
]

Priority rules:
- "urgent": effective date is within 7 days, or comment deadline within 7 days
- "high": effective date or comment deadline within 30 days, or major standard revision
- "normal": new final rule or guidance with future effective date
- "low": informational update or announcement with no immediate deadline

If no relevant new items found, return an empty array [].
Return ONLY valid JSON, no other text.

/no_think`;

 const raw = await callLLM(prompt, 2000);
 const cleaned = stripThinkTags(raw);

 try {
 return JSON.parse(cleaned);
 } catch {
 return [];
 }
}

// Generate the full daily report
export async function generateDailyReport() {
 const today = new Date().toISOString().split('T')[0];
 const month = new Date().toLocaleString('en-US', { month: 'long' });
 const year = new Date().getFullYear().toString();

 const allFindings: (Finding & { authority: string })[] = [];
 const authoritiesSearched: string[] = [];
 const noActivity: string[] = [];

 for (const authority of AUTHORITIES) {
 let authorityFindings: Finding[] = [];

 for (const searchTemplate of authority.searches) {
 const query = searchTemplate
 .replace('{MONTH}', month)
 .replace('{YEAR}', year);
 
 const results = await webSearch(query);
 
 if (results.length > 0) {
 const extracted = await extractFindings(authority.name, results);
 authorityFindings.push(...extracted);
 }

 // Rate limit: wait 500ms between searches
 await new Promise(r => setTimeout(r, 500));
 }

 // Deduplicate by URL
 const seen = new Set<string>();
 authorityFindings = authorityFindings.filter(f => {
 if (seen.has(f.source_url)) return false;
 seen.add(f.source_url);
 return true;
 });

 if (authorityFindings.length > 0) {
 allFindings.push(...authorityFindings.map(f => ({ ...f, authority: authority.id })));
 } else {
 noActivity.push(authority.name);
 }

 authoritiesSearched.push(authority.name);
 }

 // Generate full markdown report
 const reportMarkdown = await generateMarkdownReport(allFindings, today, authoritiesSearched, noActivity);

 // Categorize for structured storage
 const priorityAlerts = allFindings.filter(f => f.priority === 'urgent');
 const finalRules = allFindings.filter(f => f.category === 'final_rule');
 const openNPRMs = allFindings.filter(f => f.category === 'nprm');
 const advisoryGuidance = allFindings.filter(f => ['advisory_circular', 'guidance', 'amc_gm'].includes(f.category));
 const standardsDev = allFindings.filter(f => ['standard_revision', 'interpretation', 'dis_ballot', 'fdis_ballot'].includes(f.category));
 const intlUpdates = allFindings.filter(f => !['FAA', 'EASA'].includes(f.authority) && f.category !== 'standard_revision');

 return {
 report_date: today,
 status: 'complete',
 priority_alerts: priorityAlerts,
 final_rules: finalRules,
 open_nprs: openNPRMs,
 advisory_guidance: advisoryGuidance,
 standards_developments: standardsDev,
 international_updates: intlUpdates,
 no_activity: noActivity,
 full_report_markdown: reportMarkdown,
 authorities_searched: authoritiesSearched,
 total_items_found: allFindings.length,
 findings: allFindings,
 };
}

async function generateMarkdownReport(
 findings: Finding[],
 date: string,
 authoritiesSearched: string[],
 noActivity: string[]
): Promise<string> {
 const prompt = `You are a senior aviation quality management consultant writing a daily regulatory intelligence report for aerospace and quality professionals.

Date: ${date}
Findings: ${JSON.stringify(findings, null, 2)}
Authorities with no activity: ${noActivity.join(', ')}

Write a structured markdown report in this exact format:

# Regulatory Intelligence Report — ${date}

## URGENT Priority Alerts
[urgent items only — if none, say "No urgent items today."]

## New New Final Rules & Regulations
[enacted regulations]

## [Proposed] Draft Rules & NPRMs Open for Comment
[proposed rules — always include comment deadlines]

## [Notice] Advisory Circulars, Orders & Guidance
[ACs, FAA Orders, EASA AMC/GM, policy guidance]

## [Standard] Standards Developments (IAQG / SAE / ISO)
[standards activity]

## [International] International Authority Updates
[non-FAA/EASA authorities]

## [Opportunity] Consulting Opportunity Flags
[changes that signal upcoming client needs — formatted as a brief bullet list]

## No activity No Activity Found
[list authorities searched with no new items]

---
*Sources searched: ${authoritiesSearched.join(', ')}*
*Report generated: ${date} — Conform-Edge RegIntel™*

Write clearly for working quality professionals. Include document numbers, effective dates, and comment deadlines prominently. Flag anything with a deadline within 30 days as HIGH PRIORITY.`;

 return await callLLM(prompt, 4000);
}
```

---

## API ROUTES

### `POST /api/reports/generate` (internal, cron-protected)
Triggers report generation. Protected by a secret header — only callable by the cron job.

```typescript
// app/api/reports/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateDailyReport } from '@/lib/regulatory-search-engine';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
 // Verify cron secret
 if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const today = new Date().toISOString().split('T')[0];

 // Check if report already exists for today
 const { data: existing } = await supabase
 .from('regulatory_reports')
 .select('id')
 .eq('report_date', today)
 .single();

 if (existing) {
 return NextResponse.json({ message: 'Report already generated today' });
 }

 // Insert placeholder
 const { data: report } = await supabase
 .from('regulatory_reports')
 .insert({ report_date: today, status: 'generating' })
 .select()
 .single();

 // Generate (fire and forget — respond immediately, generate in background)
 generateDailyReport().then(async (result) => {
 // Save findings
 if (result.findings.length > 0) {
 await supabase.from('regulatory_findings').insert(
 result.findings.map(f => ({ ...f, report_id: report.id, report_date: today }))
 );
 }

 // Update report
 await supabase
 .from('regulatory_reports')
 .update({
 status: 'complete',
 priority_alerts: result.priority_alerts,
 final_rules: result.final_rules,
 open_nprs: result.open_nprs,
 advisory_guidance: result.advisory_guidance,
 standards_developments: result.standards_developments,
 international_updates: result.international_updates,
 no_activity: result.no_activity,
 full_report_markdown: result.full_report_markdown,
 authorities_searched: result.authorities_searched,
 total_items_found: result.total_items_found,
 })
 .eq('id', report.id);
 });

 return NextResponse.json({ message: 'Report generation started', report_id: report.id });
}
```

### `GET /api/reports/latest` (authenticated)
Returns the most recent complete report for subscribers.

### `GET /api/reports/[date]` (authenticated)
Returns report for a specific date. Subscribers can access last 90 days.

### `GET /api/findings` (authenticated)
Returns findings with filters: `?authority=FAA&category=nprm&priority=high&since=2026-06-01`

### `POST /api/stripe/webhook`
Handles Stripe subscription events (created, updated, cancelled) and syncs to `profiles.subscription_status`.

---

## DASHBOARD UI SPECIFICATION

### Page Structure

```
/ → Marketing landing page (public)
/pricing → Pricing page (public)
/signup → Registration + Stripe checkout
/login → Sign in
/dashboard → Main intelligence dashboard (subscribers only)
/dashboard/archive → Past reports (subscribers only, last 90 days)
/dashboard/settings → Authority filter preferences, notification settings
/dashboard/profile → Account + billing management
/admin → Admin panel (Brian only) — trigger manual reports, view stats
```

### Dashboard Main Page (`/dashboard`)

Layout: Clean, professional, dark-navy sidebar with content area. Mobile responsive.

**Header bar:**
- "Conform-Edge RegIntel™" logo left
- Today's date + "Last updated: [timestamp]" center
- User avatar / account dropdown right

**Top ribbon — Priority Alert Cards:**
Horizontal scrollable row of red/amber alert cards. Each card shows:
- Authority badge (e.g., "FAA")
- Short title
- Deadline chip if applicable (e.g., "Comment due July 6")
- "View" button

If no priority alerts: green banner "[Built] No urgent items today."

**Authority Filter Sidebar (left, collapsible on mobile):**
Checkbox filters:
- [ ] FAA
- [ ] EASA
- [ ] IAQG / IA9100
- [ ] ISO
- [ ] UK CAA
- [ ] Transport Canada
- [ ] FDA / QMSR
- [ ] Health Canada
- [ ] CAAC
- [ ] ANAC

Category filters:
- [ ] Final Rules
- [ ] Open NPRMs (with deadlines)
- [ ] Advisory Circulars / Guidance
- [ ] Standards Revisions
- [ ] Airworthiness Directives

Priority filter: [ ] Urgent [ ] High [ ] Normal

**Main content area — Findings Feed:**
Card-per-finding layout. Each card:

```
┌────────────────────────────────────────────────────────────┐
│ [FAA] [FINAL RULE] [Urgent] HIGH │
│ │
│ Airworthiness Directive: Airbus AS332 Series │
│ Effective August 3, 2026 │
│ │
│ Supersedes AD 2019-09-03. Addresses cabin lateral sliding │
│ door release system on AS332C/C1/L/L1 helicopters. │
│ Requires modification installation per updated OEM instr. │
│ │
│ [View Source ↗] [Save] [Flag for Client] │
└────────────────────────────────────────────────────────────┘
```

Color-coded left border: Red = urgent, Orange = high, Blue = normal, Gray = low.

**"Full Report" tab:**
Renders the complete markdown report as formatted HTML. Includes a "Download as PDF" and "Download as Markdown" button.

**Consulting Flags section (Pro tier only):**
Highlighted section showing business development opportunities flagged from today's findings.

### Archive Page (`/dashboard/archive`)
Calendar view + list of past reports. Click any date to view that day's report.
Free tier: last 7 days. Pro tier: last 90 days. Enterprise: full history.

---

## SUBSCRIPTION TIERS

| Feature | Free Trial (14 days) | Basic ($29/mo) | Pro ($79/mo) | Enterprise ($299/mo) |
|---|---|---|---|---|
| Daily reports | [Built] | [Built] | [Built] | [Built] |
| All authorities | [Built] | [Built] | [Built] | [Built] |
| Archive access | 7 days | 30 days | 90 days | Unlimited |
| Consulting flags | [No] | [No] | [Built] | [Built] |
| Email digest | [No] | [No] | [Built] | [Built] |
| Custom authority filters | [No] | [Built] | [Built] | [Built] |
| Client tagging / notes | [No] | [No] | [Built] | [Built] |
| API access | [No] | [No] | [No] | [Built] |
| Team seats | 1 | 1 | 3 | Unlimited |
| White-label export | [No] | [No] | [No] | [Built] |

Stripe Product IDs: create in Stripe Dashboard and save to `.env`.

---

## CRON SCHEDULE

```json
// vercel.json
{
 "crons": [
 {
 "path": "/api/reports/generate",
 "schedule": "0 13 * * 1-5"
 }
 ]
}
```
(13:00 UTC = 6:00 AM MT on weekdays)

For the cron to call the protected endpoint, set header `x-cron-secret` from `CRON_SECRET` env var.

---

## ENVIRONMENT VARIABLES

```env
# Ollama (local LLM — no API key needed, Ollama runs on your server)
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen3:8b

# Serper API (Google Search wrapper — https://serper.dev)
SERPER_API_KEY=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Worker cron protection (shared secret between Vercel frontend and Railway worker)
CRON_SECRET=a-long-random-string
WORKER_URL=https://your-worker.railway.app

# App
NEXT_PUBLIC_APP_URL=https://regintel.conform-edge.com
ADMIN_EMAIL=b.r.olea.gqm@gmail.com
```

---

## MARKETING LANDING PAGE (/)

Include the following sections:

1. **Hero:** "Never Miss a Regulatory Change That Costs You an Audit Finding." Subhead: "Conform-Edge RegIntel™ monitors 12+ aviation and quality authorities daily so your QMS stays current." CTA: "Start 14-Day Free Trial"

2. **Authority logos strip:** FAA · EASA · IAQG · ISO · UK CAA · FDA · CAAC · Transport Canada · ANAC · Health Canada · SAE · IATF

3. **Who it's for:** 3 tiles — MRO & Repair Stations / Production Approval Holders / QMS Consultants & Auditors

4. **Sample report preview:** Screenshot or live demo of the dashboard showing today's date, a few sample findings with priority badges.

5. **Pricing table** (link to /pricing)

6. **Social proof placeholder:** "Trusted by aerospace QMS professionals" (add testimonials as collected)

7. **Footer:** About / Contact / Privacy Policy / Terms

---

## ADMIN PANEL (`/admin` — Brian-only)

Accessible only when logged in as `ADMIN_EMAIL`.

Features:
- View all reports and their generation status
- Manually trigger report generation ("Run Now" button)
- View subscriber list and subscription statuses
- See total findings by authority over time (simple bar chart)
- Flag/unflag individual findings
- Edit finding text (for corrections)
- Add manual findings (for items the AI may have missed)

---

## BUILD ORDER (RECOMMENDED PHASES)

**Phase 1 — Core MVP (target: 2 weeks)**
1. Initialize Next.js project with TypeScript, Tailwind, shadcn/ui — push to GitHub repo
2. Set up Supabase project, run schema migrations
3. Implement Supabase Auth (signup/login pages)
4. **Add Ollama service to existing Railway project** (Docker image: `ollama/ollama`, attach volume at `/root/.ollama`, pull `qwen3:8b` via Railway shell)
5. **Add Worker service to Railway** — connect same GitHub repo, set root directory to `/worker`, configure env vars including `OLLAMA_BASE_URL=http://ollama.railway.internal:11434/v1`
6. Build the worker: `src/index.ts` (Express), `src/search-engine.ts`, `src/extract.ts`, `src/report.ts`
7. Build dashboard page (shows latest report, findings cards with filters)
8. **Manual test:** POST to worker `/api/generate` with the cron secret header — verify report saves to Supabase and displays in dashboard
9. Add Railway Cron service on `0 13 * * 1-5` schedule
10. Basic styling and responsive layout

**Phase 2 — Subscriptions (target: week 3)**
1. Set up Stripe products and pricing
2. Build pricing page and checkout flow
3. Build Stripe webhook handler
4. Lock dashboard behind active subscription check
5. Build 14-day free trial logic
6. Build `/dashboard/profile` with billing management (Stripe Customer Portal)

**Phase 3 — Polish & Marketing (target: week 4)**
1. Build archive page with calendar
2. Marketing landing page
3. Email digest (Resend integration)
4. Admin panel
5. Custom authority filter preferences
6. "Download as PDF" feature
7. SEO meta tags
8. Privacy policy and terms pages

---

## IMPORTANT NOTES FOR THE DEVELOPER

- **AI engine is Ollama running Qwen 3 locally.** The OpenAI-compatible client (`openai` npm package) is used with `baseURL` pointed at `http://localhost:11434/v1`. No Anthropic SDK is needed. The `apiKey` field can be set to any string (e.g., `"ollama"`) — Ollama ignores it.

- **Qwen 3 think tags:** Qwen 3 wraps its reasoning in `<think>...</think>` blocks. Always append `/no_think` to prompts that require clean JSON output, and apply the `stripThinkTags()` helper to all responses before parsing. For the full narrative report, think mode is acceptable (and may improve quality) — just don't try to parse that output as JSON.

- **The worker must be a persistent process** (Railway, Render, or a VPS), not a serverless function. Ollama maintains a model loaded in memory and requires a long-lived process. The Next.js frontend on Vercel calls the worker via a secure HTTP endpoint for report generation; everything else (auth, Stripe, data display) stays on Vercel.

- **Ollama model loading time:** The first request after the worker starts cold will be slow (~10–30 seconds) while the model loads into RAM. Subsequent requests are fast. Consider sending a warm-up ping to Ollama when the worker starts.

- **The Serper API costs ~$10–$30/month** for the search volume needed (roughly 50–100 searches per weekday). Brave Search API is a cheaper alternative at ~$3/month for similar volume.

- **Total daily report generation time with qwen3:8b on CPU:** approximately 2–4 minutes for a full sweep of all 12 authorities. On a GPU-enabled server, this drops to under 30 seconds.

- **The search queries use `{MONTH}` and `{YEAR}` placeholders** replaced at runtime so results stay current. Do not hardcode dates.

- **Always store `full_report_markdown`** so you can re-display a report without re-running searches or re-calling Ollama.

- **Brian Olea is the domain expert.** When in doubt about regulatory content, preserve the original text from search results rather than having the model paraphrase inaccurately. The extraction prompt instructs Qwen 3 to quote document numbers and effective dates verbatim.

- **Model upgrade path:** The `OLLAMA_MODEL` env var makes it trivial to switch models. If qwen3:8b quality is insufficient for complex synthesis, change to `qwen3:14b` or `qwen3:32b` with no code changes.

---

*Document prepared for Conform-Edge — June 29, 2026*
*For questions on implementation, contact: b.r.olea.gqm@gmail.com*
