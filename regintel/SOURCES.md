# RegIntel — Source Registry

The complete curated authority list from Brian's `regulatory-intel-*` skills,
captured here so it lives with the code rather than only in the skill files.

**160 sources across four domains. Seven are built** (FAA, FDA, NHTSA via
Federal Register; EASA via RSS; MHRA, DVSA, OPSS via GOV.UK). This file is the
backlog.

## Status key

| Mark | Meaning |
|---|---|
| [Built] | Built and pulling live |
| [Probe needed] | Probed — result recorded below |
| [Warning] | Licensed/commercial content — read the licensing note first |
| — | Not yet probed |

## Before building any source

1. **Probe first.** Roughly half of plausible endpoints 404. Every URL below
 marked [Built] or [Probe needed] was actually requested; the rest are Brian's curation and
 have not been tested.
2. **Never infer a field.** If the publisher does not supply an effective date
 or comment deadline, leave it null. Do not parse it out of prose.
3. **Mark provenance honestly.** `verified` only when every field the document
 has came from a structured record.
4. **Respect blocks.** UK CAA's `caa.co.uk` returns HTTP 403 to automated
 requests. That is deliberate and must not be worked around.

## [Warning] Licensing note — standards bodies

ISO, SAE, IAQG, IATF, VDA, AIAG, IEC, RTCA, EUROCAE and similar bodies **sell
their standards**. Their content is licensed and redistribution is prohibited —
this is also ClaudeCowork vault policy. Do not scrape or republish standard
text. Monitoring that a revision was *announced* is a different question and
needs Brian's judgement plus probably a licence check.

## Known-viable APIs — build status

| Source | Why it matters | Status |
|---|---|---|
| **GOV.UK Search API → DVSA + OPSS** | Same proven endpoint as MHRA, filtered by organisation. | [Built] **Built** (`GovUkOrganisationSource`) |
| **NHTSA rulemaking** (Federal Register) | FMVSS (49 CFR 571) rules/NPRMs ride the same proven Federal Register API as FAA/FDA. | [Built] **Built** (`FederalRegisterSource`) |
| **NHTSA recalls API** (`api.nhtsa.gov`) | Product-recalls feed — a *different* dataset from the rulemaking above. | [Probe needed] needs a live probe |
| **eCFR API** (`ecfr.gov/api`) | Amendment dates for 49 CFR 571 (FMVSS) and 21 CFR 820 (QMSR). | [Probe needed] needs a live probe |
| **EASA AD tool** (`ad.easa.europa.eu`) | Highest-value aviation gap — ADs are what MROs action. Has ExportToXML/CSV. | [Probe needed] needs a live probe |

> The three items marked [Probe needed] have novel API shapes and were **not** probed in the
> build environment (its egress policy blocks these hosts). Per the "probe
> first" rule they were left unbuilt rather than coded against a guess. Probe
> them from somewhere with outbound web access, then build.

---

## Aerospace

49 sources.

| Source | Context | Status |
|---|---|---|
| <http://ad.caac.gov.cn> | CAAC China · | — not probed |
| <https://ad.easa.europa.eu> | EASA European Union · | [Probe needed] session-based; has ExportToXML/CSV — viable, unbuilt |
| <https://asims.cab.mlit.go.jp> | JCAB/MLIT Japan · | — not probed |
| <https://consultation.casa.gov.au> | CASA Australia · | — not probed |
| <https://drs.faa.gov> | FAA United States · · · | — not probed |
| <https://regulatorylibrary.caa.co.uk> | UK CAA United Kingdom · | [Probe needed] MadCap Flare JS site — scrapeable, fragile |
| <https://rgl.faa.gov> | FAA United States · · · | — not probed |
| <https://sistemas.anac.gov.br/certificacao/DA/DAE.asp> | ANAC Brazil · | — not probed |
| <https://tc.canada.ca> | EASA–TCCA EU–Canada | [Probe needed] site-wide RSS only, needs aviation filtering |
| <https://tc.canada.ca/en/aviation> | TCCA Canada · | [Probe needed] site-wide RSS only, needs aviation filtering |
| <https://tc.canada.ca/en/aviation/aircraft-airworthiness/international-agreements-arrangements> | FAA–TCCA USA–Canada | [Probe needed] site-wide RSS only, needs aviation filtering |
| <https://www.anac.gov.br> | FAA–ANAC USA–Brazil | — not probed |
| <https://www.anac.gov.br/en> | ANAC Brazil · | — not probed |
| <https://www.aviation.govt.nz> | NZCA/CAA NZ New Zealand | — not probed |
| <https://www.caa.co.uk/commercial-industry/aircraft/airworthiness/> | UK CAA United Kingdom · | [Probe needed] HTTP 403 — blocks automated access, NOT circumvented |
| <https://www.caac.gov.cn/English/Regulations/> | CAAC China · | — not probed |
| <https://www.caas.gov.sg> | CAAS Singapore | — not probed |
| <https://www.casa.gov.au> | FAA–CASA USA–Australia | — not probed |
| <https://www.casa.gov.au/airworthiness/airworthiness-directives> | CASA Australia · | — not probed |
| <https://www.dgac.gob.cl/normativa/> | DGAC Chile | — not probed |
| <https://www.dgca.gov.in> | DGCA India | — not probed |
| <https://www.dof.gob.mx> | AFAC Mexico · | — not probed |
| <https://www.easa.europa.eu> | EASA–UK CAA Working Arrangement EU–UK | [Built] BUILT — 6 RSS feeds |
| <https://www.easa.europa.eu/en/document-library> | EASA European Union · | [Built] BUILT — 6 RSS feeds |
| <https://www.easa.europa.eu/en/the-agency/member-states> | EASA Member States (collective) EU Members | [Built] BUILT — 6 RSS feeds |
| <https://www.ecologie.gouv.fr/dsac> | DGAC France France | — not probed |
| <https://www.enac.gov.it> | ENAC Italy | — not probed |
| <https://www.eurocae.net> | EUROCAE European technical standards (ED-series) | [Warning] Licensed/commercial — see licensing note |
| <https://www.faa.gov> | US–EU Maintenance Annex Guidance (MAG) USA–EU (MAG Change 10 effective Oct 2025) | — not probed |
| <https://www.faa.gov/aircraft> | FAA United States · · · | — not probed |
| <https://www.faa.gov/aircraft/air_cert/international/bilateral_agreements> | FAA–UK CAA USA–UK | — not probed |
| <https://www.faa.gov/aircraft/air_cert/international/bilateral_agreements/baa_basa_listing> | FAA–EASA BASA/TIP/MAG USA–EU | — not probed |
| <https://www.faa.gov/regulations_policies> | FAA United States · · · | — not probed |
| <https://www.gaca.gov.sa> | GACA Saudi Arabia | — not probed |
| <https://www.gcaa.gov.ae> | GCAA UAE | — not probed |
| <https://www.gob.mx/afac> | AFAC Mexico · | — not probed |
| <https://www.iaa.ie> | CAAIP/IAASA Ireland | — not probed |
| <https://www.iaqg.org> | IAQG AS-series standards | [Warning] Licensed/commercial — see licensing note |
| <https://www.iata.org> | IATA Operational guidance, ground-handling, DGR | — not probed |
| <https://www.icao.int/Pages/StateLetters.aspx> | ICAO State Letters Regulatory notifications | — not probed |
| <https://www.icao.int/safety/airnavigation/nationalitymarks/annexes_booklet.pdf> | ICAO (Standards & SARPs) International | — not probed |
| <https://www.icao.int/safety/airnavigation/pages/anb-manuals-and-guidance-material.aspx> | ICAO Annexes International SARPs | — not probed |
| <https://www.lba.de> | LBA Germany | — not probed |
| <https://www.mlit.go.jp/en/koku/> | JCAB/MLIT Japan · | — not probed |
| <https://www.molit.go.kr/USR/WPGE0201/m_37054/> | KASA/MOLIT South Korea | — not probed |
| <https://www.rtca.org> | SAE / RTCA Technical standards (DO-178C, DO-254, etc.) · | [Warning] Licensed/commercial — see licensing note |
| <https://www.sacaa.co.za> | SACAA South Africa | — not probed |
| <https://www.sae.org> | SAE / RTCA Technical standards (DO-178C, DO-254, etc.) · | [Warning] Licensed/commercial — see licensing note |
| <https://wwwapps.tc.gc.ca/Saf-Sec-Sur/2/cawis-swimn/AD> | TCCA Canada · | — not probed |

## Automotive

46 sources.

| Source | Context | Status |
|---|---|---|
| <https://bis.gov.in> | MoRTH / AIS India · | [Warning] Licensed/commercial — see licensing note |
| <https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act> | EU Cyber Resilience Act Product cybersecurity | — not probed |
| <https://digital-strategy.ec.europa.eu/en/policies/data-act> | EU Data Act Connected vehicle data | — not probed |
| <https://ec.europa.eu/safety-gate-alerts/screen/webReport> | EU Safety Gate EU | — not probed |
| <https://echa.europa.eu/regulations/reach/understanding-reach> | EU Chemical (ECHA REACH) EU | — not probed |
| <https://echa.europa.eu/scip-database> | ECHA SCIP EU | — not probed |
| <https://eur-lex.europa.eu> | EU AI Act AI in safety functions | [Probe needed] SOAP web service responds; usually needs registration |
| <https://eur-lex.europa.eu/eli/reg/2018/858/oj> | EU Type Approval (Reg 2018/858) EU | [Probe needed] SOAP web service responds; usually needs registration |
| <https://eur-lex.europa.eu/eli/reg/2023/1542/oj> | EU Battery Regulation EU | [Probe needed] SOAP web service responds; usually needs registration |
| <https://morth.nic.in> | MoRTH / AIS India · | — not probed |
| <https://oehha.ca.gov/proposition-65> | California Prop 65 California | — not probed |
| <https://single-market-economy.ec.europa.eu/sectors/automotive-industry_en> | European Commission EU · | — not probed |
| <https://unece.org/transport/vehicle-regulations> | UNECE WP.29 International | — not probed |
| <https://unece.org/transport/vehicle-regulations/un-regulation-no-155> | UNECE R155 Cybersecurity management system | — not probed |
| <https://unece.org/transport/vehicle-regulations/un-regulation-no-156> | UNECE R156 Software update management | — not probed |
| <https://vpic.nhtsa.dot.gov/mid/> | NHTSA VPIC US manufacturer portal | — not probed |
| <https://ww2.arb.ca.gov> | California ARB (CARB) California / US | — not probed |
| <https://www.acea.auto> | ACEA European auto manufacturers | — not probed |
| <https://www.aiag.org> | AIAG Core tools (FMEA, MSA, SPC, PPAP, APQP) | [Warning] Licensed/commercial — see licensing note |
| <https://www.clepa.eu> | CLEPA European automotive suppliers | — not probed |
| <https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V/part-571> | NHTSA United States · · | [Probe needed] eCFR has a public API (ecfr.gov/api) — VIABLE, unbuilt |
| <https://www.enisa.europa.eu> | ENISA EU cybersecurity guidance | — not probed |
| <https://www.epa.gov/chemicals-under-tsca> | EPA TSCA United States | — not probed |
| <https://www.epa.gov/vehicle-and-engine-certification> | EPA United States | — not probed |
| <https://www.fmcsa.dot.gov> | FMCSA US (commercial vehicles) | — not probed |
| <https://www.gov.uk/government/organisations/driver-and-vehicle-standards-agency> | DVSA United Kingdom | [Built] BUILT — GOV.UK Search API (organisation filter) |
| <https://www.gov.uk/government/organisations/office-for-product-safety-and-standards> | UK OPSS United Kingdom | [Built] BUILT — GOV.UK Search API (organisation filter) |
| <https://www.hse.gov.uk/reach/> | UK REACH United Kingdom | — not probed |
| <https://www.iatfglobaloversight.org> | IATF IATF 16949 certification rules and SIs | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org> | ISO/SAE 21434 Same | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/committee/46706.html> | ISO/TC 22 ISO 26262, ISO 21434, ISO 15765 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/standard/70918.html> | ISO 21434 Automotive cybersecurity | [Warning] Licensed/commercial — see licensing note |
| <https://www.jama.or.jp/english/> | JAMA Japan Automobile Manufacturers | — not probed |
| <https://www.mee.gov.cn> | China MEE (emissions) China | — not probed |
| <https://www.miit.gov.cn> | China MIIT (NEV) China | — not probed |
| <https://www.mlit.go.jp/en/jidosha/> | MLIT Japan · | — not probed |
| <https://www.mlit.go.jp/en/jidosha/recall.html> | MLIT Japan · | — not probed |
| <https://www.molit.go.kr/USR/WPGE0201/m_37054/> | MOLIT South Korea | — not probed |
| <https://www.nhtsa.gov> | NHTSA United States · · | [Built] BUILT — rulemaking via Federal Register (FMVSS 49 CFR 571) |
| <https://www.nhtsa.gov/recalls> | NHTSA United States · · | [Probe needed] api.nhtsa.gov recalls — different dataset, still unbuilt |
| <https://www.osha.gov> | OSHA United States | — not probed |
| <https://www.sae.org> | SAE International ARP, AS, technical standards | [Warning] Licensed/commercial — see licensing note |
| <https://www.samr.gov.cn> | SAMR / DPRC China · | — not probed |
| <https://www.samrdprc.org.cn> | SAMR / DPRC China · | — not probed |
| <https://www.vda-qmc.de> | VDA German automotive quality standards | [Warning] Licensed/commercial — see licensing note |
| <https://www.vehicle-certification-agency.gov.uk> | VCA United Kingdom | — not probed |

## Medical device

26 sources.

| Source | Context | Status |
|---|---|---|
| <https://ec.europa.eu/tools/eudamed> | European Commission (MDR/IVDR) EU / EEA · | — not probed |
| <https://english.nmpa.gov.cn/medicaldevices.html> | NMPA China | — not probed |
| <https://health.ec.europa.eu/medical-devices-new-regulations_en> | European Commission (MDR/IVDR) EU / EEA · | — not probed |
| <https://health.ec.europa.eu/medical-devices-sector/new-regulations/guidance-mdcg-endorsed-documents-and-other-guidance_en> | MDCG EU guidance (MDR/IVDR) | — not probed |
| <https://www.aemps.gob.es> | AEMPS Spain | — not probed |
| <https://www.ansm.sante.fr> | ANSM France | — not probed |
| <https://www.bfarm.de/EN> | BfArM Germany | — not probed |
| <https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices.html> | Health Canada Canada | — not probed |
| <https://www.fda.gov/medical-devices> | FDA United States · | — not probed |
| <https://www.federalregister.gov> | FDA United States · | [Built] BUILT — FAA + FDA via JSON API |
| <https://www.gob.mx/cofepris> | COFEPRIS (→ COFEPRIS) Mexico | — not probed |
| <https://www.gov.br/anvisa/pt-br/assuntos/legislacao> | ANVISA Brazil · | — not probed |
| <https://www.gov.br/anvisa/pt-br/english> | ANVISA Brazil · | — not probed |
| <https://www.gov.uk/drug-device-alerts> | MHRA United Kingdom · | [Built] BUILT — MHRA via GOV.UK Search API |
| <https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency> | MHRA United Kingdom · | — not probed |
| <https://www.hsa.gov.sg/medical-devices> | HSA Singapore | — not probed |
| <https://www.iec.ch/technical-committees/tc62> | IEC/TC 62 IEC 60601, 62304, 62366 | [Warning] Licensed/commercial — see licensing note |
| <https://www.imdrf.org> | IMDRF International harmonization | — not probed |
| <https://www.imdrf.org/resources/ghtf-documents> | GHTF Legacy harmonization docs | — not probed |
| <https://www.iso.org/committee/54892.html> | ISO/TC 210 ISO 13485, ISO 14971 | [Warning] Licensed/commercial — see licensing note |
| <https://www.medsafe.govt.nz> | Medsafe New Zealand | — not probed |
| <https://www.mfds.go.kr/eng/index.do> | MFDS South Korea | — not probed |
| <https://www.mhlw.go.jp/english/> | MHLW / PMDA Japan · | — not probed |
| <https://www.pmda.go.jp/english/index.html> | MHLW / PMDA Japan · | — not probed |
| <https://www.swissmedic.ch/swissmedic/en/home/medical-devices.html> | Swissmedic Switzerland | — not probed |
| <https://www.tga.gov.au/resources/tga-basics/what-we-regulate/medical-devices> | TGA Australia | — not probed |

## Standards bodies

39 sources.

| Source | Context | Status |
|---|---|---|
| <https://www.aiag.org> | AIAG PPAP 4th Edition AIAG | [Warning] Licensed/commercial — see licensing note |
| <https://www.aiag.org/quality/automotive-core-tools/fmea> | AIAG FMEA (AIAG & VDA 1st Ed) AIAG | [Warning] Licensed/commercial — see licensing note |
| <https://www.eauditnet.com> | NADCAP AC7116 (Chemical Processing) PRI | [Warning] Licensed/commercial — see licensing note |
| <https://www.eauditnet.com/advisory> | NADCAP Supplier Support Committee notices PRI | [Warning] Licensed/commercial — see licensing note |
| <https://www.eurocae.net> | DO-326A / ED-202A (Cybersecurity) RTCA / EUROCAE / | [Warning] Licensed/commercial — see licensing note |
| <https://www.eurocae.net/publications/> | ED-12C (European DO-178C equivalent) EUROCAE | [Warning] Licensed/commercial — see licensing note |
| <https://www.iaqg.org/projects> | AS9110C / AS9110 Rev D IAQG / SAE | [Warning] Licensed/commercial — see licensing note |
| <https://www.iaqg.org/projects/details?id=4> | AS9100D / AS9100 Rev E (in development) IAQG / SAE | [Warning] Licensed/commercial — see licensing note |
| <https://www.iaqg.org/resources/scmh> | IAQG SCMH (Supply Chain Management Handbook) IAQG | [Warning] Licensed/commercial — see licensing note |
| <https://www.iatfglobaloversight.org/iatf-rules/> | IATF Rules 6th Edition + SIs IATF | [Warning] Licensed/commercial — see licensing note |
| <https://www.iatfglobaloversight.org/sanctioned-interpretations/> | IATF 16949:2016 + SIs IATF | [Warning] Licensed/commercial — see licensing note |
| <https://www.iec.ch> | IEC 62366-1 (Usability Engineering) IEC/TC 62 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iec.ch/technical-committees/tc62> | IEC 60601 series IEC/TC 62 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org> | ISO 15765 (UDS/Communication) ISO | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/committee/4857698.html> | ISO 45001 ISO/PC 283 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/committee/53882.html> | ISO 9001 / ISO 9000 ISO/TC 176 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/committee/54808.html> | ISO 14001 ISO/TC 207 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/committee/54892.html> | ISO 13485:2016 (revision watch) ISO/TC 210 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/committee/629121.html> | ISO 31000 ISO/TC 262 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/standard/26439.html> | ISO 10012 ISO/TC 213 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/standard/27001> | ISO/IEC 27001 ISO/IEC JTC 1/SC 27 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/standard/62085.html> | ISO 9001:2026 FDIS progress ISO | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/standard/68383.html> | ISO 26262:2018 (Functional Safety) ISO/TC 22/SC 32 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/standard/70017.html> | ISO 19011 ISO/TC 176 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/standard/70918.html> | ISO 21434:2021 (Cybersecurity) ISO/TC 22/SC 32 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/standard/72704.html> | ISO 14971:2019 + AMD ISO/TC 210 | [Warning] Licensed/commercial — see licensing note |
| <https://www.iso.org/standard/81230.html> | ISO/IEC 42001 (AI MS) ISO/IEC JTC 1/SC 42 | [Warning] Licensed/commercial — see licensing note |
| <https://www.oasis-reg.com> | OASIS Database IAQG | [Warning] Licensed/commercial — see licensing note |
| <https://www.rtca.org> | DO-326A / ED-202A (Cybersecurity) RTCA / EUROCAE / | [Warning] Licensed/commercial — see licensing note |
| <https://www.rtca.org/content/documents-published> | DO-178C (Airborne Software) RTCA | [Warning] Licensed/commercial — see licensing note |
| <https://www.sae.org> | AS9115 (Deliverable Software) IAQG / SAE | [Warning] Licensed/commercial — see licensing note |
| <https://www.sae.org/standards/> | AS13100 / AESQ IAQG | [Warning] Licensed/commercial — see licensing note |
| <https://www.sae.org/standards/content/arp4754b/> | ARP4754B (Systems Development) SAE | [Warning] Licensed/commercial — see licensing note |
| <https://www.sae.org/standards/content/arp4761a/> | ARP4761A (Safety Assessment) SAE | [Warning] Licensed/commercial — see licensing note |
| <https://www.sae.org/standards/content/as5553/> | AS5553 (Counterfeit Electronic Parts) SAE | [Warning] Licensed/commercial — see licensing note |
| <https://www.sae.org/standards/content/as9102b/> | AS9102B (FAI) IAQG / SAE | [Warning] Licensed/commercial — see licensing note |
| <https://www.sae.org/standards/content/as9145/> | AS9145 (APQP/PPAP) IAQG / SAE | [Warning] Licensed/commercial — see licensing note |
| <https://www.vda-qmc.de> | VDA 2 (Production Parts Approval) VDA | [Warning] Licensed/commercial — see licensing note |
| <https://www.vda-qmc.de/publikationen/> | VDA 6.3 (Process Audit) VDA | [Warning] Licensed/commercial — see licensing note |

---

*Generated from the `regulatory-intel-*` skills, 2026-07-24.*

---

## Probe results — 2026-08-22

Verified against the live endpoints, in response to three proposed ingestion
architectures (EASA, CAAC, ISO/IAQG). Every status below was reproduced with a
real request; nothing here is inferred from the proposals.

### EASA — structured XML confirmed, now implemented

| Endpoint | Status |
|---|---|
| `/en/document-library/easy-access-rules/feed.xml` | **200** — revision feed; a re-issue of an existing book appears *only* here. Now the 7th feed in `sources.py`. |
| `/en/easy-access-rules-xml-export` | **200** — "powered by eRules"; publishes an XSD and XSL transforms |
| Publication page → `/en/downloads/<id>/en` | **200 application/zip** → one machine-readable XML (UAS: 7 MB zip, 24 MB XML) |
| `/en/document-library/acceptable-means-of-compliance-and-guidance-material**s**/feed.xml` | **301** → singular `material`. Worked only via redirect; path corrected. |
| EUR-Lex SPARQL `publications.europa.eu/webapi/rdf/sparql` | **200** — returned document and entry-into-force dates for CELEX 32019R0947 |

The export carries, per clause, the authority's own `ERulesId`, `TypeOfContent`
(IR / DR / AMC / GM), `RegulatorySource`, `EntryIntoForceDate` and
`ApplicabilityDate`. For the UAS book: 301 distinct clauses, 294 with an entry-
into-force date. **This is what lets EASA stop being `unverified`** — the RSS
feeds carry no dates at all, which is the sole reason for that marking.

Implemented in `scraper/easa_erules.py` (parse + delta) and
`scraper/easa_corpus.py` (discover, retrieve, store). No PDF, no LLM.

Caveat found in the data: `ERulesId` is **not** unique within a book. The UAS
export prints six AMC/GM clauses twice, byte-identical, under different standard
scenarios. They are collapsed to one node; a repeat with *differing* content
would be kept and logged, never silently dropped.

### CAAC — data endpoint found (probed 2026-08-22)

The published pages are JavaScript-driven and carry no items, which is why the
proposed "monitor the HTML indexes" approach fails as written:

| Endpoint | Status |
|---|---|
| `https://www.caac.gov.cn/` | **200**, but a 902-byte JavaScript redirect stub |
| `/XXGK/XXGK/index_172.html?fl=12` | **200**, 61 KB — zero dates, zero document links |
| `?fl=12` vs `?fl=15` | byte-identical; the parameter is applied client-side |
| `robots.txt` | **200** — `User-agent: *` with an empty `Disallow`; only `/CAAC/local/` and `/image/` excluded |

Loading a page in a real browser and capturing its network traffic revealed
the endpoint those pages actually read from — a TRS WCM listing service:

```
https://www.caac.gov.cn/was5/web/search?page=<n>&channelid=211383&fl=<category>
```

It returns server-rendered HTML (not JSON) as a labelled table, 10 items per
page, newest first, with a page count in the footer (`共136页` for `fl=14`).
The columns are exactly the fields the change-detection layer needs:

| Column | Meaning |
|---|---|
| 名称 | title, linking to the canonical document URL |
| 发文日期 | issue date, e.g. `2025年12月27日` |
| 文号 | document number |
| 办文单位 | issuing department, e.g. 政策法规司 |
| 有效性 | validity / in-force status |

Category codes, confirmed by sampling each:

| `fl` | Content | Sample first item |
|---|---|---|
| 11 | Statistics — not regulatory | 中国民航2026年7月份主要生产指标统计 |
| **12** | 法律法规 — laws and regulations | 中华人民共和国民用航空法（2026年7月1日起施行） |
| **13** | 规章 — CCAR rules | 通用航空经营管理规定 |
| **14** | 规范性文件 / AC — advisory + normative | 补充型号合格证和改装设计批准书合格审定程序 |
| **15** | 标准 — standards | 空中交通无线电通话用语 |

`channelid=269689` mirrors `fl=13` and `channelid=238066` mirrors `fl=15`.

**Implemented** in `scraper/caac.py`. Dates are converted from `2025年12月27日`
to ISO, `有效性` is mapped to a status vocabulary, and document number,
department and URL are stored verbatim.

Titles are shown English-first with the Chinese second, per the owner's
decision. The English comes from a deterministic terminology glossary
(`scraper/caac_terms.py`), NOT a model — CAAC titles are compounds of a stable
regulatory vocabulary, so a longest-match glossary renders most of them
accurately while staying auditable and reproducible. A title the glossary
cannot cover to 45% falls back to the Chinese alone rather than fronting a
half-rendered string. `caac_terms.untranslated_terms()` lists what to add next.

Because the English is ours rather than published, CAAC findings are marked
`unverified` and say so in their detail line. The Chinese title is kept as the
`summary` and is the authoritative record.

CAAC also publishes an official English section (`/English/Regulations/`) with
Laws, CCAR, Airworthiness Directives, Normative Documents and Notices — but it
is thin: CCAR 14 items, Normative 76, Directives and Notices empty, against
~1,360 in the Chinese listing for one category alone. Worth matching against
later where it overlaps, since that English is the publisher's own.

### ISO and IAQG — deliberately blocked, not circumvented

| Endpoint | Status |
|---|---|
| `https://www.iso.org/standard/88431.html` | **403** |
| `https://www.iso.org/standards.html` | **403** |
| `https://www.iso.org/robots.txt` | **403** — even the robots file is refused |
| `https://iaqg.org/standards/` | **403** |
| `https://iaqg.org/robots.txt` | **200** — permissive (`Disallow: /9104-2-survey/` only) |

The ISO 403 persists with an ordinary browser user-agent, so it is deliberate
bot protection rather than a user-agent quirk. This is the same situation as UK
CAA, and it gets the same answer: **not circumvented.** IAQG is the awkward
case — its `robots.txt` permits crawling while the server refuses it. The
server's refusal is the operative answer.

The proposed ISO/IAQG architecture is careful about copyright and its split
between public *metadata* and licensed *normative text* is sound. But its
Layer 1 depends on reading iso.org and iaqg.org pages, and that door is shut
before licensing even arises.

**"ISO Open Data" could not be verified.** The proposal asserts machine-readable
CSV/JSON/Parquet metadata but cites only `iso.org/standards.html`, which 403s.
Treat it as unconfirmed until an actual endpoint is produced.

A licensed data route is the only clean path here — either an ISO/SAE data
licence, or clause ingestion from copies the organisation lawfully holds.
