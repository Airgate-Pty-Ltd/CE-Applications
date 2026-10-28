# Regulator source inventory — Pocket Auditor

Status: **working extracts, not library content.** Every row below is regulation text, parsed mechanically. Library rows (clause reference, title, Conform-Edge intent, expected evidence) are authored from these extracts and approved per source (R-1, R-2, D-5). Nothing here is marked LOADED.

Raw files: `sources\` (never edited). Parsed rows: `content\rows-*.json`. Parsers: `content\parse_ecfr.py`, `content\parse_easa.py`. Intermediate text files `content\_tmp-*.txt` are kept so the parse can be re-run.

| # | Authority / source | Raw file (`sources\`) | SHA-256 (raw) | Retrieved from | Parsed rows (`content\`) | Clauses | Status |
|---|---|---|---|---|---|---|---|
| 1 | FAA 14 CFR Part 145 (eCFR, 2026-09-01 snapshot) | `ecfr-14-cfr-145.xml` | `7f5e362e…f40d8` | ecfr.gov versioner API (title-14, part 145) | `rows-faa-14cfr-145.json` | 37 sections, 264 paragraph rows | Parsed. Stray character in source text at §145.3(d) ("means�"), to be fixed in authoring |
| 2 | FAA 14 CFR Part 21 (eCFR, 2026-09-01 snapshot) | `ecfr-14-cfr-21.xml` | `435031ef…25ea6e` | ecfr.gov versioner API (title-14, part 21) | `rows-faa-14cfr-21.json` | sections per eCFR, 871 paragraph rows | Parsed. Not yet checked against section list |
| 3 | EASA Part-145: Commission Regulation (EU) 1321/2014, Annex II | `easa-1321-2014.html` | `38288e43…73007` | EUR-Lex HTML (CELEX:32014R1321) | `rows-easa-part145.json` | 20 (145.A.10 to 145.A.95) | Parsed. Numbering shows "1." style sub-points as separate rows |
| 4 | EASA Part 21: Commission Regulation (EU) 748/2012, Annex I | `easa-748-2012.html` | `1df842a1…3d8` | EUR-Lex HTML (CELEX:32012R0748) | `rows-easa-part21.json` | 167 (21.A.* clauses) | Parsed. Same sub-point caveat |
| 5 | UK Part-145: retained Commission Regulation (EU) 1321/2014, Annex II | `uk-1321-2014-annex-II.html` | `ca14aa6f…c171` | legislation.gov.uk (eur/2014/1321/annex/II) | `rows-uk-part145.json` | 19 | Parsed, **discrepancy to check**: vs. EASA, missing 145.A.15, 145.A.40, 145.A.42; extra 145.A.36, 145.A.155. Verify against the UK text before use. Also check the UK "changes to legislation" note (search results disagreed) |
| 6 | **CAAC CCAR-145-R4**: 《民用航空器维修单位合格审定规则》 (Maintenance Organisation Certification Rule), MOT Order 8 of 2022, adopted 2022-02-08, in force 2022-07-01. This is the fourth revision (R4) of CCAR-145, not a replacement. Chinese text | `caac-mot-maintenance-org-rule-2022.doc` | `d40c3ad9…90c8` | xxgk.mot.gov.cn (Ministry of Transport) | `rows-caac-maint-org.json` | 43 articles (art. 145.1 to 145.43) | Parsed, Chinese text, article level only. Verified as the R4 text: the vault R4 training cites §145.4, 145.5, 145.8, 145.13 and 145.14, and all five match the parsed articles. Translation needed for authoring. Check the MOT/CAAC site for any later amendment |
| 7 | MX AFAC: RAC 145 (Reglamento Aeronáutico Mexicano 145) | — | — | **Not retrieved.** gob.mx/afac page returned 404; search returned no AFAC copy | — | — | **BLOCKED.** Need the official DOF or AFAC PDF from you (upload), or a correct AFAC URL. The regional LAR 145 model rule is not a substitute |

## Not yet fetched (requested in the same instruction)

Nothing else is pending for the five authorities in scope. Still outside the five:

- AS9100D and AS9110C are not free (IAQG and SAE). They need your licensed copies (Route B, customer upload, D-9).
- Part 21 for FAA and EASA is parsed (rows 2 and 4).

## Decisions and checks before any row is LOADED

1. Confirm each source revision and effective date (RK-7). The FAA snapshot date is the date requested, 2026-09-01; confirm the current eCFR edition.
2. UK discrepancy (row 5) and CAAC currency (row 6) to be checked against the official sources.
3. AFAC (row 7) needs your upload or a verified URL.
4. Authoring of intent, expected evidence and failure modes is Conform-Edge work and needs your approval per source (R-1, LD-10). It starts from the extracts above.
5. Regulation text is government text, but the library ships only Conform-Edge-authored intent and clause references (R-2). The raw extracts stay in this build folder, not in any shared library.
