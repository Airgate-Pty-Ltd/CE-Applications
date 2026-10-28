# Prototype Acceptance Sweep — 2026-10-11

**Subject:** `prototype/index.html` v0.2 (also bundled as `prototype/dist/audit-toolkit-prototype.html`) · **Browser:** Chromium (Claude Browser pane) · **Status:** sweep complete; commercial release remains unauthorized.
**Method:** `tests/ui/acceptance-sweep.js` drives the same functions the on-screen buttons call, then asserts on the **rendered DOM text**. Phone = 375 px, tablet = 820 px (also 1024 px earlier). Headless logic tests (`node --test`, 87 passing) cover the same rules without a browser.
**What this is not:** a test with real finger input on a real device, or in a Capacitor WebView.

## 1. Results

| Phase | Checks | Pass |
|---|---|---|
| 1. Scenarios A–F, duplicate evidence, discard, audit switching, no-internal-names scan | 75 | **75** |
| 2. After a real page reload: restored audits, samples, conclusions, issued NCR, discarded drafts, stale-conclusion flag, record-hash stability, switching to partial audits | 12 | **12** |
| 3. Storage write failure surfaced (not silent) | 1 | **1** (after fix, see §3) |
| 3b. Corrupt stored data (manual, same session): starts fresh, shows notice, keeps an unreadable-copy backup key | 3 | **3** (manual checks, not in script) |
| Layout: 13 screens × phone (375) and × tablet (820): no horizontal overflow, no tap target under 26 px (non-toolbar), rail on tablet / tab bar on phone | 26 | **26** |
| NCR screen scanned for internal system names | 1 | **1** |

## 2. Per-scenario verification (UI path)

| Scenario | Initial state | Governing ref | Evidence entry | Sampling traceability | Evaluation | Permitted | Prohibited | NCR behaviour | Report |
|---|---|---|---|---|---|---|---|---|---|
| **A** Conforming | 8.5.2, 0 of 6 reviewed, all aspects "not yet tested", no evidence | 8.5.2 | 3 lots + interview; duplicate interview click → one evidence item, one log entry | IDs and method recorded; below-minimum sample refused | Evidence supports the requirement | demonstrated | NC; demonstrated with no/short sample | none offered, none in Findings | Demonstrated, sample IDs, DEMONSTRATION banner, 64-hex record hash |
| **B** Potential NC | 8.4.2(d), untested | 8.4.2(d) | 5 receipts, supplier entry; RCV-26-0903 has no certificate in file | all five receipts recorded | "Possible gap — unconfirmed", Additional Investigation Recommended names RCV-26-0903 | held (potential) | NC; demonstrated | no NCR; Findings shows "held — potential". Pending request resolves nothing. Branch 1: favourable portal record → demonstrated, and the earlier held conclusion is **flagged for review**. Branch 2 (new audit): adverse record still held until alternative evidence checked, then NC permitted | Held items listed (not findings) |
| **C** Substantiated NC | 7.1.5.2(a), untested | 7.1.5.2(a) | register sample incl. TW-0417; work order; 3 alternative-explanation checks; interview | recorded | register alone ≠ finding; follow-up leads to work order; NC refused until alternatives evaluated | NC after evaluation | NC on register alone | 12 gates; submit → auditor review → approve → issued | Should Be / As Found / Statement of nonconformity, edition, approver authorization |
| **D** Incorrect citation | gates block | — | — | — | — | 7.1.5.2(a) | 7.1.5.2 and 7.1.5 (incomplete), 7.1.5.2(b) (does not govern), 7.1.5.2(e) and 7.9.9 (invalid) | submit button disabled with a bad citation | — |
| **E** Alternative method | 7.2(c) | 7.2(c) | form search (absent), 3 records, WI, interview | recorded | all 4 aspects met via MES gate; "different method" notice | demonstrated | NC (refused on missing form, still refused with evidence) | no NCR possible | alt-method note in report |
| **F** Insufficient evidence | 8.5.1.2 | 8.5.1.2 | spec, survey request (unavailable), matrix, interview | n/a (no population) | two aspects met, two "statement only" (interview alone not corroboration) | insufficient | demonstrated; NC | no NCR offered | limitation line: no conclusion of conformity or nonconformity |

No internal system names (MAK, M-AI, Kernel) appear in any rendered screen, the page title, or attributes (scanned: 8 screens + 5 requirement cards + NCR; scripts and comments excluded).

## 3. Defects found by the sweep and fixed

| # | Defect | Class | Fix |
|---|---|---|---|
| 1 | Report screen overflowed horizontally on phone (long hash/stamp strings) | **product** | `overflow-wrap:anywhere` on content blocks |
| 2 | Requirement card overflowed on phone: status tag forced `nowrap` with long evidence IDs | **product** | tags wrap |
| 3 | Sample and attestation checkboxes were 20–22 px | **product** | 28 px |
| 4 | "Changes are not being saved" notice appeared one render late | **product** | save before render |
| 5–7 | Three sweep-script assertions mis-read the DOM (CSS uppercase, first `.okbox`, closed `<details>` text) | harness | script corrected; each failure was analysed before changing |
Note: the first phase-1 run scored 71/75. All 4 failing assertions traced to the three harness causes in rows 5–7 (none was a product fault); layout defects 1–3 were found in the layout pass and defect 4 in phase 3. Final run: phase 1 = 75/75.

## 4. Capability status for items you asked about

| Item | Status |
|---|---|
| State persistence | **Partially implemented.** Browser `localStorage`, **not encrypted**, single device/browser. Survives reload (tested). No sync, no backup, no export-then-import of an audit. |
| Browser refresh | **Implemented and tested.** Restores audit list, current audit, current screen (incl. NCR). Unsaved text typed in an input but not yet committed by an input event is not applicable (inputs commit on typing). |
| Corrupt/unavailable storage | **Implemented and tested** (notice, fresh start, backup key). |
| Duplicate evidence | **Implemented and tested** (same record cannot be recorded twice; sample cannot hold a record twice). Duplicates **across** differently-named records are not detected. |
| Discarded findings | **Implemented for NCR drafts** (reason required, retained, shown in Findings and Report). **Absent:** discarding/removing evidence, withdrawing an **issued** NCR (blocked with a message; no withdrawal workflow). |
| Navigation between partially completed audits | **Implemented** (audit list, switch, new audit). Absent: archive, delete, search, per-user separation. |
| Concurrent tabs / devices | **Absent.** Last write wins. |
| Browser back button / deep links | **Absent.** Internal navigation stack only. |
| Evidence attachments, camera, signature | **Absent** (records are synthetic text). |
| Real PDF | **Absent** — print stylesheet only ("Print / save as PDF" uses the browser). |
| Multi-user, roles, real auth | **Absent.** One synthetic auditor, who is both author and approver. |
| Offline | Page works offline once loaded (no network calls); **no service worker/installable shell**; not tested airplane-mode on a device. |
| Accessibility | Not audited (labels on key inputs; no screen-reader pass; colour contrast not measured). |
| Real follow-up intelligence | **Stub only.** Deterministic rules; not MAK intelligence. |
