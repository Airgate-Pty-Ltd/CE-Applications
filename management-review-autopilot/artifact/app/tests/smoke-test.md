# Smoke Test Checklist — Management Review Autopilot v1.0

Run after `npm start`, at http://localhost:3000 (or the Railway URL).

| # | Check | Steps | Expected | Pass |
|---|-------|-------|----------|------|
| 1 | Server up | `npm start` | "MRA listening on :3000" in console | ☐ |
| 2 | Health check | GET /health (browser or curl) | HTTP 200, `{"status":"ok",...}` | ☐ |
| 3 | App loads | Open / | Header, 4 tabs, coverage 0% | ☐ |
| 4 | Setup persists | Enter org name, refresh page | Value still present (localStorage) | ☐ |
| 5 | Standard switch | Select AS9110C | Input Board shows 15 cards incl. Safety/HF and Airworthiness | ☐ |
| 6 | Card status | Set card 1 to "Data entered" + type text | Card border turns green, coverage % rises | ☐ |
| 7 | N/A guard | Set a card to N/A, leave justification blank | Gap banner flags unjustified N/A | ☐ |
| 8 | Action register | Add action w/ owner+due | Row appears; status editable; delete works | ☐ |
| 9 | Generate | Tab 4 → Generate | Verdict banner + full Markdown package rendered | ☐ |
| 10 | Placeholder logic | Generate with gaps open | Missing inputs show [PLACEHOLDER] markers | ☐ |
| 11 | Download | Click "Download .md" | File `management-review-<std>-<date>.md` downloads | ☐ |
| 12 | Copy | Click "Copy to clipboard" | Alert confirms; paste matches output | ☐ |
| 13 | Print view | Ctrl+P on tab 4 | Chrome print preview shows package only (no nav) | ☐ |
| 14 | Reset | "Reset all data" → confirm | App reloads empty | ☐ |
| 15 | Automated check | With server running: `npm test` | Exit code 0 | ☐ |

**Fail handling:** any failed row blocks deployment. Record the failure and fix before pushing.
