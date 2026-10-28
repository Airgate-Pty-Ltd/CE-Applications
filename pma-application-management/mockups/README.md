# PMA Autopilot — Draft UI mockups

Static HTML mockups of the PMA Autopilot screens, styled with the Conform-Edge /
Airgate instrument design system. **These are drafts for review — they are not wired
to a backend.** The working implementation is the React app in [`apps/web`](../apps/web).

## Easiest: the single-file version ⭐

**[`pma-autopilot-mockup.html`](pma-autopilot-mockup.html)** contains every screen in
one file — all CSS and JS inlined, zero external files, zero network requests.
**Download it and double-click** — it opens straight in your browser and you navigate
between screens using the sidebar. This is the one to use if the multi-file version
"didn't work".

> **Why the other files may not have worked:** clicking an `.html` *on GitHub's
> website* shows the source code, not a rendered page — GitHub doesn't serve repo HTML
> as a live site. And a single file downloaded on its own can't find the shared
> `assets/` folder. The single-file version above avoids both problems. To render the
> multi-file set live, use GitHub Pages or download the whole `mockups/` folder.

## Multi-file version (for development)

Open [`index.html`](index.html) — but you must have the whole folder (it shares
`assets/vera.css` and `assets/layout.js`). Serve it rather than relying on `file://`:

```bash
# from the repo root
python3 -m http.server -d mockups 8080   # then open http://localhost:8080
```

Theme and font size persist in `localStorage`, so the set stays consistent as you click.

## Screens

| File | Screen |
|------|--------|
| `login.html` | Sign in / register organization |
| `dashboard.html` | Persistent-memory dashboard (status, next action, oldest blocking) |
| `archive.html` | Cases & archive list (filter + new-case modal) |
| `upload.html` | Upload & intake (evidence + deterministic extraction + guided transcription) |
| `case.html` | Case overview (basis confirmation, gate-enforced status, ledger) |
| `conditions.html` | System-Detected Conditions + Authority Charter |
| `documents.html` | Document generation, submission status, downloads |
| `registry.html` | Self-repairing regulatory source registry (Admin) |
| `library.html` | Approved document library + precedent suggestions |
| `settings.html` | Submission Office Profile, users & roles, appearance |

## Notes

- The **Inter** webfont loads from Google Fonts; offline it falls back to `system-ui`.
- Sample data (Acme Aerospace, ST01234AT, etc.) is illustrative only.
- Language discipline matches the product: "System-Detected Condition" (never "AI
  finding"), high/medium/low confidence (never a numeric score), and every draft
  marked "Draft for internal review only — not for FAA submission."
