# BUILD NOTES — ISO/IEC 42001 AIMS-in-a-Box (2026-06-17, Desktop, automated run)

## 2026-07-10 UPDATE — UI rebuilt, not just re-skinned
Brian reviewed the original tool and rejected it: "looks like the same old ugly tool... not next
generation." He was right — the 2026-06-17 build never went through an FSA gate check and failed it on
first review (see EVOLUTION-REPORT.md "UI REVIEW — CORRECTED 2026-07-10" for the full account).
`ISO42001-Readiness-GapCheck-Tool.html` was rebuilt to v2.0 the same day: FSA dark/light palette with
theme toggle, a cockpit summary bar, a rule-based dependency graph across the 33 items that surfaces
inconsistency flags and a priority-ordered remediation sequence, plus local-storage autosave/resume and
a JSON export. Still zero server, zero network calls, opens in any browser — the addition is
`localStorage` for session persistence only (no data leaves the device). Details below describe the
original 2026-06-17 build; content/question set is unchanged, only scoring is unchanged, everything
about presentation and the analysis layer changed.

## What I built
- **`ISO42001-Readiness-GapCheck-Tool.html`** — a self-contained, single-file readiness/gap-check tool.
  - Covers AIMS clauses 4–10 and a representative Annex A control set (A.2–A.10).
  - 0/1/2 maturity scoring (Absent / Partial / Established), live overall-readiness meter, per-section progress.
  - "Generate gap report" produces a ranked table of Gaps + Partials with recommended actions, printable to PDF.
  - No external dependencies, no network calls — opens in any browser, safe to ship as a kit component or lead-magnet. (As of the 2026-07-10 v2.0 rebuild: uses `localStorage` for session autosave/resume; still no network calls and no server.)
- **`KIT-CONTENTS.md`** — full product definition: SKU ladder, the 24-item document set, cross-framework bridges, build status.

## Why this pick (ranking)
Ranked the 4 scanned opportunities by automation level, closeness to Brian's edge, and buildability-with-info-on-hand:
1. **ISO 42001 AIMS** — highest combined score. It is the only NEW certifiable standard that sits *exactly* on Brian's stated thesis (AI-integrated QMS), reuses the Conform-Edge intent-based engine directly, has a deadline tailwind (EU AI Act), and was buildable today from on-hand structure. **Chosen.**
2. 21 CFR Part 11 / Data Integrity — strong & fast, but a more crowded space and less differentiated.
3. EcoVadis/CSRD — large TAM but newest lane to Brian; needs fresh methodology research before authoring.
4. AuditProgramIQ — highest passive ceiling but real-software build effort; stage later.

## Assumptions / notes
- **[ASSUMPTION]** Annex A control labels/numbering (A.2–A.10) and clause sub-references are from on-hand knowledge of ISO/IEC 42001:2023; the question set is intent-based, not verbatim standard text (deliberately, to avoid copyright and keep plain-language). **Confirm exact control list against the current standard before sale.**
- **[ASSUMPTION]** EU AI Act / NIST AI RMF cross-maps (docs 22–23) were scoped but not authored this run.
- Prices are proposals derived from the report's $250k math; not validated against market.
- No live web verification performed (unattended run, tool/time ceiling).

## TO GO LIVE, YOU (BRIAN) DO — HARD-LIMIT items not done unattended
1. Purchase a legitimate copy of ISO/IEC 42001:2023 for authoring reference (do NOT paste standard text into the kit).
2. Author/finish documents 1–23 (run `standards-aligned-document-author` + `qms-document-kit-generator`; structure is in KIT-CONTENTS.md).
3. Register a domain + digital storefront account (Gumroad / Lemon Squeezy / Shopify-digital) and set up payment — **account creation & payment are your actions**.
4. Verify EU AI Act / NIST AI RMF dates and obligations against current sources before any marketing claim.
5. Add your own branding/disclaimers and a licence/terms file before publishing.
