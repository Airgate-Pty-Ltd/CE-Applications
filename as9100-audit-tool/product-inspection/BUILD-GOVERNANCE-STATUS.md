# Build Governance Status — Product Inspection

*Quick-scan board. Update at the start of each session.*

**Last updated:** 2026-10-21  
**Source:** `../ProductInspection/src/base.html` (177 KB)  
**Dev server:** `http://127.0.0.1:7421` (port 7421, `ProductInspection-dev` launch config)

---

## Feature status

| Feature | Status | Notes |
|---|---|---|
| Part Setup — New | ✅ Built | |
| Part Setup — Open Existing | ✅ Built | Search UX only; DB not wired |
| Part Setup — Load Template | ✅ Built | UX built; DB template store pending |
| Sampling Plan card (Incoming) | ✅ Built + Verified | Z1.4 + C=0; lot 200/1.5%/II → n=32 ✓ |
| Auth Setup (FAA / EASA) | ✅ Built | syncAuthNote() complete |
| Inspection Screen — char rows | ✅ Built | Status badges, photo pill, BT button |
| Measurement Entry Card | ✅ Built | BT banner, photo attach, save UX |
| BT receive (simulated) | ✅ Built | 1.1s delay, random value; real BLE deferred |
| Photo capture | ✅ Built | Count pill, tagged to char |
| Form 3 table | ✅ Built | 11 columns incl. n + Cpk |
| SPC Cpk (display) | ✅ Built | Colour badges + legend |
| NCR creation | ⏳ Partial | Card shown; disposition loop deferred |
| Form 1 screen | ⏳ Pending | Field layout only |
| Form 2 screen | ⏳ Pending | Not started |
| Release doc screens | ⏳ Deferred | Auth setup complete; output screens deferred |
| JSON export | ⏳ Pending | Schema locked in content/schemas/ |
| PDF export | ⏳ Pending | Deferred to next phase |
| IndexedDB wiring | ⏳ Pending | Schema designed; Dexie not yet imported |
| Capacitor build | ⏳ Pending | Awaiting DB + export completion |

---

## Governance locks

| Lock | Status |
|---|---|
| G-01 Vanilla JS stack | 🔒 Locked |
| G-02 No INTERNET permission | 🔒 Locked |
| G-03 CE-authored forms | 🔒 Locked |
| G-04 JSON schema v1 field names | 🔒 Locked |
| G-05 ANSI Z1.4 / C=0 sampling | 🔒 Locked |
| G-06 SPC Cpk thresholds | 🔒 Locked |

---

## Open blockers

| # | Blocker | Owner | Impact |
|---|---------|-------|--------|
| B-01 | Mike has not supplied merged Capacitor repo | Mike → Brian | Cannot verify plugin alignment |
| B-02 | FAA Order 8130.21J current revision unconfirmed | Brian | Block 13/14 field verification |

---

## Next actions (priority order)

1. Wire IndexedDB (Dexie) — inspection, photo, instrument, template stores
2. Build Form 1 and Form 2 screens
3. Implement JSON export + SHA-256 hash
4. Build NCR disposition loop
5. Implement PDF package export (JSZip + jsPDF)
6. Capacitor sync and Android build
7. Physical device test (Android 11+)
