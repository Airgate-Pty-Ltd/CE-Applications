# CE-Applications

Conform-Edge application portfolio — one self-contained app per repository. This index describes each application, its technology stack, and its current readiness status. Applications range from production-ready tools available for sale today to products still under active construction.

## Applications

| Repo | App | Stack | Readiness | Description |
|------|-----|-------|-----------|-------------|
| [Human-Factors-Training-Engine](https://github.com/Airgate-Pty-Ltd/Human-Factors-Training-Engine) | Human Factors Training Engine | Node.js · Express · SQLite | 🔧 Under Construction | Adaptive training engine that delivers Human Factors and Dirty Dozen content. Specification and skeleton complete; lesson execution, NCR UI, and student-facing interface not yet built. |
| [receiving-inspection-app](https://github.com/Airgate-Pty-Ltd/receiving-inspection-app) | Receiving Inspection App | Node.js · Express · SQLite | 🔧 Under Construction | Inspection engine with full test coverage for receiving/incoming inspection workflows. Check-execution UI, NCR workflow, PDF report generation, PWA shell, and billing integration not yet built. |
| [PMA-Application-Management](https://github.com/Airgate-Pty-Ltd/PMA-Application-Management) | PMA Application Management | Node.js · Express · PostgreSQL · Railway | 🔜 Near Release | FAA PMA supplement management — 10 build steps complete, 69 passing tests, real Postgres, Railway deployment configured. Production sign-off and final QA review pending. |
| [Virtual-Inspection](https://github.com/Airgate-Pty-Ltd/Virtual-Inspection) | Virtual Inspection | Node.js · Express · SQLite | 🔧 Under Construction | Remote inspection tool with inspection engine and UI built. Live video provider integration (WebRTC / third-party service) not yet connected. |
| [no-undue-burden-generator](https://github.com/Airgate-Pty-Ltd/no-undue-burden-generator) | No-Undue-Burden Generator | Node.js · Tauri · docx | 🔜 Near Release | FAA "no undue burden" determination generator. Feature complete with 159 passing tests. Tauri desktop shell not yet compiled; Word output layout not verified by human review. |
| [repair-station-readiness-dashboard](https://github.com/Airgate-Pty-Ltd/repair-station-readiness-dashboard) | Repair Station Readiness Dashboard | HTML · CSS · Vanilla JS (static) | ✅ Ready to Sell | Single-file static web app for FAR 145 repair station readiness assessment. Production build complete; distributable via Gumroad or direct download. |
| [mdsap-self-assessment](https://github.com/Airgate-Pty-Ltd/mdsap-self-assessment) | MDSAP Self-Assessment | HTML · CSS · Vanilla JS (static) | ✅ Ready to Sell | Production-ready single-file self-assessment tool for MDSAP audit readiness. Distributable as a standalone HTML file. |
| [product-inspection-app](https://github.com/Airgate-Pty-Ltd/product-inspection-app) | Product Inspection | HTML · CSS · Vanilla JS · Capacitor · Android | 🔧 Under Construction | First-article and in-process inspection tool packaged as an Android APK via Capacitor. Debug APK builds successfully; release keystore, BLE integration, and PDF export not yet complete. |

## Readiness Key

| Status | Meaning |
|--------|---------|
| ✅ Ready to Sell | Production build complete — distributable today |
| 🔜 Near Release | Feature complete; final QA or packaging step remaining |
| 🔧 Under Construction | Core engine exists but significant features not yet built |

## Conventions

- Each repository is self-contained — one app, one repo.
- All applications are private under the [Airgate-Pty-Ltd](https://github.com/Airgate-Pty-Ltd) organisation.
- Static tools (single-file HTML) are distributed as downloads; server-backed apps target Railway or equivalent PaaS.
- Android apps use Capacitor wrapping a vanilla JS or React bundle; iOS support is not planned at this stage.
- Readiness status is updated at each significant milestone commit.
