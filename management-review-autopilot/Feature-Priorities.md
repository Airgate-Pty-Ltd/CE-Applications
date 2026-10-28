# Feature Priorities — Ranked Roadmap

20+ candidate features, ranked by Revenue Impact (R), Customer Value (C), Dev Effort (E, lower
is easier), and Competitive Impact (K), each 1–5. Priority = (R+C+K) − E.

| # | Feature | R | C | E | K | Priority | Tier |
|---|---|---|---|---|---|---|---|
| 1 | Stripe license gate | 5 | 2 | 2 | 2 | 7 | v1.1 |
| 2 | Prior-review carryover (auto-populate open actions) | 4 | 5 | 2 | 3 | 10 | v1.1 |
| 3 | PDF export pack | 3 | 4 | 1 | 2 | 8 | v1.1 |
| 4 | ISO 14001 / IATF / 45001 / AS9120B packs | 4 | 4 | 2 | 3 | 9 | v1.2 |
| 5 | CSV KPI upload → auto-populate cards | 3 | 5 | 3 | 3 | 8 | v1.2 |
| 6 | Multi-cycle trend charts | 3 | 4 | 3 | 2 | 6 | v1.2 |
| 7 | M-AI kernel integration (DIMs) | 3 | 4 | 4 | 4 | 7 | v2.0 |
| 8 | Auto-draft narrative summaries | 3 | 4 | 4 | 3 | 6 | v2.0 |
| 9 | Cross-product data feed (Supplier Scorecard, RSRD) | 4 | 3 | 4 | 4 | 7 | v2.0 |
| 10 | Consultant multi-client workspaces + white-label | 5 | 3 | 4 | 3 | 7 | v2.1 |
| 11 | ISO 9001:2026 transition pack | 4 | 4 | 3 | 4 | 9 | v2.1 |
| 12 | Calendar integration + review-due reminders | 3 | 4 | 3 | 2 | 6 | v2.1 |
| 13 | Cloud-persisted shared team state | 3 | 4 | 5 | 2 | 4 | v2.1 |
| 14 | Cross-sell nav strip (live, once other tools deploy) | 3 | 2 | 1 | 3 | 7 | v1.1 |
| 15 | Digital signature capture for Record of Review table | 2 | 3 | 3 | 2 | 4 | v2 |
| 16 | Voice-to-text data entry for input cards | 1 | 3 | 4 | 2 | 2 | v2.1 |
| 17 | Attachments/evidence upload per input card | 2 | 4 | 3 | 3 | 6 | v2 |
| 18 | Benchmark library (anonymized peer coverage %) | 2 | 3 | 4 | 3 | 4 | v2.1 |
| 19 | API for eQMS integration (push MR record out) | 2 | 2 | 5 | 3 | 2 | v2.1+ |
| 20 | Mobile-native app wrapper | 1 | 2 | 5 | 1 | -1 | backlog |

## Top 5 by priority score
1. Prior-review carryover (10) — directly reduces the manual-work pain the product exists to kill
2. ISO 9001:2026 transition pack (9) — time-boxed monetization event when the standard publishes
3. ISO 14001/IATF/45001/AS9120B packs (9) — cheapest reach expansion in the entire backlog (data only)
4. PDF export pack (8) — nearly free (print CSS already exists), raises perceived professionalism
5. CSV KPI upload (8) — biggest reduction in remaining manual data entry

## What NOT to build yet
Mobile-native wrapper (item 20) scores negative — the responsive web UI already works on mobile
(`@media(max-width:700px)` in styles.css) and a native wrapper adds cost without adding value at
this customer count.
