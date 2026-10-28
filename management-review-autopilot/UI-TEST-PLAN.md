# UI Test Plan — Management Review Autopilot v1.0

## Scope
Single-page app served by `artifact/app/server.js`. Pages/screens: header + score box,
Tab 1 Review Setup, Tab 2 Input Board, Tab 3 Output Actions, Tab 4 Generate Package, footer.

## Sample data to enter
- Org: `Acme Aerospace MRO`; Standard: `AS9110C`; Date: today; Period: `Jan–Jun 2026`;
  Chair: `General Manager`; Attendees: `GM, QM, Ops Mgr, Safety Mgr`
- Card "Internal and external audit results": status `Data entered`, data
  `2 internal audits, 5 minors all closed; FAA inspection no findings`, trend `Improving`
- Card "Performance of external providers": status `N/A` with NO justification (negative test)
- Action: `Hire second calibration technician` / `Resource need` / `QM` / due next month

## Buttons / actions to test → expected results
| Action | Expected |
|---|---|
| Tab buttons (×4) | Panel switches; active tab highlighted |
| "Start the Input Board →" | Jumps to Tab 2 |
| Standard dropdown change | Card list re-renders (ISO 9001: 12 cards; AS9100D: 14; AS9110C: 15; ISO 13485: 12); action categories change |
| Card status select | Border color: red=missing, green=entered, grey=N/A; N/A shows justification field |
| Any input/textarea | Coverage % updates live; persists after refresh |
| "Add to register" (empty desc) | Alert "Enter the action or decision first." |
| "Add to register" (valid) | Row added; table appears |
| Action status select | Value persists after refresh |
| Row × button | Row removed |
| "Generate / refresh package" | Verdict banner (green if 100%, amber otherwise) + Markdown in <pre> |
| "Download .md" | File downloads with std+date in name |
| "Copy to clipboard" | Confirmation alert; clipboard matches |
| "Print" | Print dialog; preview shows package only |
| "Reset all data" | Confirm dialog; app reloads empty |

## Failed-state behavior
- Unjustified N/A and empty "entered" cards are flagged in the gap banner and produce
  [PLACEHOLDER] markers in the generated package — never silent omission.
- Unknown URL on server → 404 "Not found". Path traversal attempts → 403.
- localStorage unavailable (private mode edge case): app still works; persistence off.

## Browser compatibility assumptions
Modern evergreen browsers (Chrome/Edge/Firefox/Safari, 2024+). Uses: template literals,
`navigator.clipboard` (requires HTTPS or localhost — Railway provides HTTPS), CSS grid.
No IE support. Mobile: responsive at ≤700px (single-column grids).

## Pass/fail checklist
Use `artifact/app/tests/smoke-test.md` (15 rows). All 15 must pass before attaching a
payment link. Any fail = fix, re-run full checklist.
