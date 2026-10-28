# Getting Started — ISO/IEC 42001 AIMS-in-a-Box

**Updated 2026-07-11:** this guide now leads with the real product (`app\`, the AIMS Command Center —
Express + SQLite + M-AI Kernel + records UI). The original single-file quiz
(`ISO42001-Readiness-GapCheck-Tool.html`) is kept as a deprecated/superseded first draft — see the
"Legacy: the free gap-check tool" section below if you want to use it as a standalone lead magnet, but it
is no longer the product to lead a demo with.

## Step 1 — Run the AIMS Command Center app

```bash
cd app
npm install
cp .env.example .env      # optional; defaults work without it
npm run setup             # creates data/aims.db and applies schema.sql
npm run seed               # loads demo data that deliberately triggers each of the 8 M-AI rules
npm start                 # listens on http://localhost:3100
```

Open `http://localhost:3100/`. You'll see:

- **Overview** — what needs action right now (open M-AI System-Detected Conditions), current record
  counts across all 7 registers, recent activity, and a recommended next action.
- **Seven registers** — Statement of Applicability (SoA), Risk Register, Risk Treatments, Objectives,
  Audit Findings, NCRs, and Competence records. Each table row opens a detail drawer with the record's
  fields, any M-AI conditions on it, and an edit form.
- **M-AI System-Detected Conditions** — a purple-tagged panel wherever the deterministic rules engine
  (never an LLM, no randomness, no autonomous decisions — see `app\lib\mai-kernel`) has flagged something
  against one of the 8 configured governance rules. Every condition requires a named human reviewer to
  Confirm, Dismiss as incorrect, or mark Not Applicable — M-AI never changes a record itself. Each panel
  links to its Authority Charter explaining exactly what that rule is permitted to do.

If `npm run setup` fails with a SQLite "disk I/O error," see `app\SETUP.md` — this is a known limitation
of running the app through a Windows-OneDrive-to-Linux sandbox bridge mount, not a normal-machine issue.
Point `DB_PATH` at a plain local path as documented there.

**Known open issue (2026-07-11):** creating or editing a record through most of the UI's forms currently
fails or silently no-ops for 6 of the 7 registers, because the UI's field names
(`app\src\ui\schemas.js`) don't match the real API's field names for those registers. See
`RISKS-AND-BOUNDARIES.md` for the exact mapping needed to fix this. Until it's fixed, use `curl`/Postman
against the documented API (`app\SETUP.md`) to create/edit records reliably, or view the seeded demo data
that already exists.

## Step 2 — Decide which document-kit tier fits your gaps (separate product, still valid)

The 23-document authoring kit under `Documents\` is independent of which tool sits alongside it. Look at
where your gaps clustered (see `KIT-CONTENTS.md` for the full SKU table):

- **Mostly gaps in Clauses 4–5 only, everything else reasonably strong?** → **Starter** ($600) gets you
  the core policy, scope, and risk/impact templates to close the foundational gaps.
- **Gaps spread across planning, support, operation, and Annex A** (the common pattern for most first-
  time assessors) → **Full Kit** ($1,500) — all 23 documents, the pre-populated Statement of
  Applicability, and the implementation guide.
- **Want the documents alongside a live, ongoing governance system, not just a one-time assessment?** →
  pair the Full Kit with the AIMS Command Center app above.
- **Expect your AI footprint to keep growing, or need to show ongoing governance to customers/auditors
  over time?** → **Monitored** ($750/mo) — Full Kit plus a recurring cadence so your evidence stays
  current.

If you're not sure, start with the Full Kit — it's the tier that covers the widest range of gap patterns
and includes everything from Starter.

## Step 3 — Tailor the documents

Every document in the kit is written in plain language and is deliberately **not** a copy of the ISO/IEC
42001 standard text — it explains the intent behind each clause/control and gives you an editable
structure to make your own. To tailor a document:

1. **Find every bracketed placeholder** — things like `[Your Organization]`, `[AI System Name]`,
   `[Responsible Role/Title]`, `[Review Frequency]`. A simple find-and-replace in your word processor
   catches most of these; do one final read-through to make sure none were missed.
2. **Match the document to how your organization actually works.** These are starting structures, not
   scripts — if your risk-review cadence is quarterly and the template says "review at planned
   intervals," write in your actual quarterly cadence and who owns it.
3. **Have someone with real authority sign off.** Policies and procedures only count as evidence once
   someone with the authority to enforce them approves them — a tailored-but-unapproved document won't
   hold up in an audit any better than a blank one.
4. **Use the app's registers to track ongoing evidence** once documents are tailored and approved — the
   SoA, Risk Register, and other registers in `app\` are where the living evidence lives going forward,
   not a one-time PDF.

## Legacy: the free gap-check tool

`ISO42001-Readiness-GapCheck-Tool.html` is a single self-contained HTML file — no install, no account, no
network calls, nothing saved between sessions. It still works exactly as documented below, and can still
be used as a quick, no-commitment first pass or a marketing lead magnet, but it is **not** the AIMS
Command Center and should not be presented as the current product.

Open it in any modern browser. For each of the 33 questions (Clauses 4–10 plus a representative Annex A
control set), select **Absent / Partial / Established**, watch the readiness meter update, then click
**"Generate gap report"** for a ranked table of every Gap/Partial item with a recommended next action. Use
**"Print / Save as PDF"** to keep a copy.

## What this kit will not do for you

- It will not certify your organization — only an accredited certification body auditing your actual,
  implemented management system can do that.
- It will not replace your own legal or compliance review of the tailored documents or of the app's M-AI
  governance rules.
- It will not stay current automatically — see `RISKS-AND-BOUNDARIES.md` for what still needs
  verification against the current published standard and current regulation.

## Questions or issues

If something in the kit or the app is unclear or you find an error, that feedback directly improves the
next revision (see `RELEASE-NOTES.md` for the version history).

---
© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
ISO/IEC 42001 AIMS-in-a-Box is proprietary software of Conform-Edge Quality Consulting LLC
(Idaho LLC No. 6463380), Pocatello, Idaho, USA. Unauthorized reproduction, distribution, modification,
or resale is prohibited. "Conform-Edge" and the Conform-Edge mark are trademarks of Conform-Edge Quality
Consulting LLC. Advisory documentation aid — does not certify compliance and does not replace the
judgment of the user's organization or top management.
