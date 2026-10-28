# Global Regulatory and Standards Monitoring Directory

**Author:** Brian Olea. **Captured into the repo:** 2026-07-24.

This is the authoritative retrieval directory for RegIntel — direct official
collection points for regulations, proposed changes, guidance, standards status,
enforcement, recalls, safety directives and official journals. Search/collection
pages are preferred over individual documents so the tool has durable collection
points, not links to one revision.

> This markdown is the human-readable master. The machine-readable register the
> scraper consumes is generated from it — see `sources/registry.yaml` and
> `sources/build_registry.py`. When you add or correct a source, edit this file
> and regenerate.

Status legend used in the register: [Built] built · [Probe needed] probed (result recorded) ·
[Warning] licensed/commercial · — not yet probed.

---

## 1. Universal legal and regulatory sources

Shared validation services across all industries.

| Source | Direct location | Pull purpose |
|---|---|---|
| U.S. Federal Register | https://www.federalregister.gov/ | Proposed rules, final rules, notices, corrections |
| Federal Register API | https://www.federalregister.gov/developers/documentation/api/v1 | Structured U.S. regulatory retrieval |
| Regulations.gov | https://www.regulations.gov/ | Dockets, supporting documents, comments |
| Regulations.gov API | https://open.gsa.gov/api/regulationsgov/ | Structured docket retrieval (API key required) |
| eCFR | https://www.ecfr.gov/ | Current consolidated U.S. regulations |
| eCFR API | https://www.ecfr.gov/developers/documentation/api/v1 | Structured CFR retrieval and version comparison |
| U.S. Government Publishing Office | https://www.govinfo.gov/ | Official CFR, Federal Register, legislation |
| GovInfo API | https://api.govinfo.gov/docs/ | Structured official-publication retrieval (API key required) |
| U.S. Unified Regulatory Agenda | https://www.reginfo.gov/public/do/eAgendaMain | Planned/pending U.S. regulatory actions |
| EU EUR-Lex | https://eur-lex.europa.eu/ | EU law, Official Journal, consolidated legislation |
| EUR-Lex Official Journal | https://eur-lex.europa.eu/oj/direct-access.html | Legally authenticated EU publications |
| EUR-Lex web services | https://eur-lex.europa.eu/content/help/data-reuse/webservice.html | Structured EU legal retrieval |
| EU Have Your Say | https://ec.europa.eu/info/law/better-regulation/have-your-say_en | Planned laws, consultations, feedback periods |
| EU Data Portal | https://data.europa.eu/ | Structured European Commission datasets |
| UK Legislation | https://www.legislation.gov.uk/ | UK Acts, statutory instruments, revised law |
| UK Legislation API | https://www.legislation.gov.uk/developer | Structured UK legislation retrieval (Atom/XML) |
| UK Consultations | https://www.gov.uk/search/policy-papers-and-consultations | UK proposed policy and regulatory changes |
| Australian Federal Register of Legislation | https://www.legislation.gov.au/ | Australian Acts, regulations, instruments |
| Australian Government Consultations | https://consultations.ag.gov.au/ | Federal consultation notices |
| Canada Gazette | https://gazette.gc.ca/ | Proposed and final Canadian regulations |
| Justice Laws Canada | https://laws-lois.justice.gc.ca/ | Consolidated Canadian statutes and regulations |
| Mexico Diario Oficial de la Federación | https://www.dof.gob.mx/ | Legally published Mexican laws, NOMs, regulations |
| Mexico Cámara de Diputados laws | https://www.diputados.gob.mx/LeyesBiblio/index.htm | Consolidated federal laws |
| Mexico CONAMER | https://www.gob.mx/conamer | Regulatory proposals and impact assessments |
| Brazil Diário Oficial da União | https://www.in.gov.br/ | Official Brazilian federal publication |
| Brazil legislation portal | https://www4.planalto.gov.br/legislacao | Consolidated federal legislation |
| China national laws database | https://flk.npc.gov.cn/ | National laws and regulations |
| China State Council policies | https://english.www.gov.cn/policies/ | State Council policy and regulatory publications |
| Germany federal law portal | https://www.gesetze-im-internet.de/ | Consolidated German federal laws |
| Germany Federal Law Gazette | https://www.recht.bund.de/ | Official German legal publication |
| France Légifrance | https://www.legifrance.gouv.fr/ | French law and Official Journal |
| Japan e-Gov law search | https://elaws.e-gov.go.jp/ | Japanese laws and regulations |
| South Korea law database | https://elaw.klri.re.kr/eng_service/main.do | English Korean laws and regulations |
| India eGazette | https://egazette.gov.in/ | Gazette of India |
| India Code | https://www.indiacode.nic.in/ | Consolidated Indian law |
| Singapore statutes | https://sso.agc.gov.sg/ | Singapore legislation |
| Switzerland Fedlex | https://www.fedlex.admin.ch/ | Swiss federal law and official publications |
| New Zealand legislation | https://www.legislation.govt.nz/ | New Zealand laws and regulations |
| South Africa government notices | https://www.gov.za/documents/notices | Government Gazette notices and regulations |

> eCFR is continuously updated but is **not** the official legal edition — the
> tool must cross-check changes against the Federal Register or GovInfo.

---

## 2. Aerospace and aviation

### 2.1 International — ICAO

| Source | Direct location | Data to pull |
|---|---|---|
| ICAO standards-development overview | https://www.icao.int/how-icao-develops-standards | SARPs and PANS development process |
| ICAO publications store | https://store.icao.int/ | Annex, PANS, manual, circular edition metadata |
| ICAO safety management | https://www.icao.int/safety-management | Annex 19 and SMS guidance changes |
| ICAO safety management SARPs | https://www.icao.int/safety-management/standards-and-recommended-practices-sarps | Safety-management requirements |
| ICAO news | https://www.icao.int/news | Newly adopted standards, Council decisions |
| ICAO environmental protection | https://www.icao.int/environmental-protection | CORSIA, emissions, noise requirements |
| ICAO aviation security | https://www.icao.int/security | Annex 17 and security developments |
| ICAO USOAP | https://www.icao.int/safety/CMAForum/Pages/default.aspx | State oversight and implementation |
| ICAO eLibrary | https://elibrary.icao.int/ | Searchable ICAO document platform |

### 2.2 United States — FAA

| Source | Direct location | Data to pull |
|---|---|---|
| FAA regulations landing page | https://www.faa.gov/regulations_policies/faa_regulations | Current and historical FAA regulations |
| FAA rulemaking | https://www.faa.gov/regulations_policies/rulemaking | Proposed rules and rulemaking activity |
| Recently published FAA rules | https://www.faa.gov/regulations_policies/rulemaking/recently_published | Publication date, title, comment deadline |
| FAA petitions | https://www.faa.gov/regulations_policies/rulemaking/petition | Petitions for exemption and rulemaking |
| FAA rulemaking committees | https://www.faa.gov/regulations_policies/rulemaking/committees | ARAC recommendations and committee material |
| FAA Dynamic Regulatory System | https://drs.faa.gov/ | ADs, ACs, Orders, Notices, policy |
| FAA Airworthiness Directives | https://drs.faa.gov/browse/ADFRAWD/doctypeDetails | Current and historical ADs |
| FAA Advisory Circulars | https://www.faa.gov/regulations_policies/advisory_circulars | New, revised, cancelled ACs |
| FAA Orders and Notices | https://www.faa.gov/regulations_policies/orders_notices | FAA internal regulatory policy |
| FAA handbooks and manuals | https://www.faa.gov/regulations_policies/handbooks_manuals | Technical and inspector guidance |
| FAA aircraft certification | https://www.faa.gov/aircraft/air_cert | Part 21, certification, continued safety |
| FAA draft certification documents | https://www.faa.gov/aircraft/draft_docs | Draft ACs, policy, orders |
| FAA draft policy | https://www.faa.gov/aircraft/draft_docs/policy | Draft Aircraft Certification Service policy |
| FAA Type Certificate Data Sheets | https://drs.faa.gov/browse/TCDSMODEL/doctypeDetails | TCDS changes |
| FAA Supplemental Type Certificates | https://drs.faa.gov/browse/STC/doctypeDetails | STC approvals and changes |
| FAA Technical Standard Orders | https://drs.faa.gov/browse/TSO/doctypeDetails | TSO issuance and revision |
| FAA safety alerts for operators | https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/safo | SAFO notices |
| FAA Information for Operators | https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/info | InFO notices |
| FAA Service Difficulty Reports | https://av-info.faa.gov/sdrx/ | Service difficulty and failure reports |
| FAA lessons learned | https://lessonslearned.faa.gov/ | Accident and design lessons |
| FAA regulatory dockets | https://www.regulations.gov/search?filter=FAA | FAA docket documents |
| Title 14 eCFR | https://www.ecfr.gov/current/title-14 | Current aviation regulations |
| FAA Federal Register search | https://www.federalregister.gov/agencies/federal-aviation-administration | Official proposed and final FAA rules |

### 2.3 European Union — EASA

| Source | Direct location | Data to pull |
|---|---|---|
| EASA regulations | https://www.easa.europa.eu/en/regulations | Easy Access Rules and regulatory packages |
| EASA document library | https://www.easa.europa.eu/en/document-library | Central searchable document collection |
| EASA official publication | https://www.easa.europa.eu/en/official-publication | Authenticated Agency decisions and publications |
| EASA NPAs | https://www.easa.europa.eu/en/document-library/notices-of-proposed-amendment | Draft requirements and comment deadlines |
| EASA Opinions | https://www.easa.europa.eu/en/document-library/opinions | Proposals sent to the European Commission |
| EASA Agency Decisions | https://www.easa.europa.eu/en/document-library/agency-decisions | AMC, GM, CS, detailed specifications |
| EASA Certification Specifications | https://www.easa.europa.eu/en/document-library/certification-specifications | CS revisions and amendments |
| EASA Airworthiness Directives | https://ad.easa.europa.eu/ | ADs, emergency ADs, safety publications |
| EASA Safety Information Bulletins | https://ad.easa.europa.eu/sib-docs/page-1 | Nonmandatory safety information |
| EASA Certification Memoranda | https://www.easa.europa.eu/en/document-library/certification-memoranda | Certification policy and interpretation |
| EASA Safety Directives | https://www.easa.europa.eu/en/document-library/safety-directives | Mandatory organizational/operational actions |
| EASA Rulemaking Tasks | https://www.easa.europa.eu/en/document-library/rulemaking-subjects | Rulemaking projects and future deliverables |
| European Plan for Aviation Safety | https://www.easa.europa.eu/en/domains/safety-management/european-plan-aviation-safety | Planned rulemaking and safety actions |
| EU aviation legislation | https://eur-lex.europa.eu/summary/chapter/transport/3203.html | EU aviation laws and amendments |
| European Commission aviation consultations | https://transport.ec.europa.eu/transport-modes/air/consultations_en | Proposed aviation policies and rules |

### 2.4 United Kingdom — CAA

| Source | Direct location | Data to pull |
|---|---|---|
| CAA publications | https://www.caa.co.uk/data-and-publications/publications/ | CAPs, directives, official publications |
| CAA publication series | https://www.caa.co.uk/data-and-publications/publications/publication-series/ | Filterable publication collections |
| CAA consultations | https://www.caa.co.uk/our-work/consultations/ | Proposed regulatory and policy changes |
| CAA Airworthiness Directives | https://www.caa.co.uk/commercial-industry/aircraft/airworthiness/continuing-airworthiness/airworthiness-directives/ | Applicable AD policy and sources |
| UK-issued AD collection | https://www.caa.co.uk/data-and-publications/publications/publication-series/airworthiness-directives-uk-from-1-january-2021/ | UK ADs |
| Emergency ADs | https://www.caa.co.uk/data-and-publications/publications/publication-series/emergency-airworthiness-directives/ | Emergency safety requirements |
| CAP 747 | https://www.caa.co.uk/cap747 | Mandatory continuing-airworthiness requirements |
| CAA Official Record Series | https://www.caa.co.uk/data-and-publications/publications/publication-series/official-record-series/ | Decisions, exemptions, schemes |
| CAA safety notices | https://www.caa.co.uk/data-and-publications/publications/publication-series/safety-notices/ | Safety notices |
| CAA subscriptions | https://www.caa.co.uk/data-and-publications/publications/subscriptions/ | Email alert registration |
| UK Part 145 guidance | https://www.caa.co.uk/commercial-industry/aircraft/airworthiness/approval-information-and-guidance/guidance-for-part-145-approval-holders/ | Maintenance-organization policy |
| UK aviation legislation | https://www.legislation.gov.uk/aviation | Aviation Acts and statutory instruments |

> The `caa.co.uk` host returned HTTP 403 to automated requests on 2026-07-24.
> The subscriptions endpoint (email alerts) may be the compliant path to these.

### 2.5 Australia — CASA

| Source | Direct location | Data to pull |
|---|---|---|
| CASA rules and regulations | https://www.casa.gov.au/rules | Australian aviation rules |
| CASA legislation | https://www.casa.gov.au/rules/legislation | Acts, regulations, standards |
| CASA consultation hub | https://consultation.casa.gov.au/ | Proposed rules and guidance |
| CASA Airworthiness Directives | https://www.casa.gov.au/airworthiness-directives | Australian AD search |
| CASA advisory circulars | https://www.casa.gov.au/rules-and-regulations/standard-page/advisory-circulars | AC revisions |
| CASA Manuals of Standards | https://www.casa.gov.au/rules/legislation/manuals-standards | MOS revisions |
| CASA exemptions | https://www.casa.gov.au/rules/legislation/exemptions | Exemptions and instruments |
| CASA airworthiness bulletins | https://www.casa.gov.au/aircraft/airworthiness/airworthiness-bulletins | Safety and technical bulletins |
| Australian aviation legislation search | https://www.legislation.gov.au/Search?query=aviation | Official legal cross-check |

### 2.6 Canada — Transport Canada Civil Aviation

| Source | Direct location | Pull purpose |
|---|---|---|
| Canadian Aviation Regulations | https://tc.canada.ca/en/corporate-services/acts-regulations/list-regulations/canadian-aviation-regulations-sor-96-433 | CAR requirements |
| Transport Canada aviation regulations | https://tc.canada.ca/en/aviation/regulations | Aviation regulatory portal |
| Civil Aviation Reference Centre | https://tc.canada.ca/en/aviation/reference-centre | ACs, staff instructions, guidance |
| Transport Canada AD search | https://wwwapps.tc.gc.ca/Saf-Sec-Sur/2/cawis-swimn/awd-lv-cs1401.asp | Canadian ADs |
| Civil Aviation Safety Alerts | https://tc.canada.ca/en/aviation/reference-centre/civil-aviation-safety-alerts | Safety alerts |
| CARAC notices | https://tc.canada.ca/en/corporate-services/acts-regulations/canadian-aviation-regulation-advisory-council-carac | Proposed Canadian aviation changes |
| Canada Gazette search | https://gazette.gc.ca/rp-pr/publications-eng.html | Official proposed/final regulation cross-check |

### 2.7 Brazil — ANAC

| Source | Direct location |
|---|---|
| ANAC regulations | https://www.gov.br/anac/pt-br/assuntos/legislacao |
| RBAC regulations | https://www.anac.gov.br/assuntos/legislacao/legislacao-1/rbha-e-rbac |
| ANAC supplementary instructions | https://www.anac.gov.br/assuntos/legislacao/legislacao-1/iac-e-is |
| ANAC public consultations | https://www.gov.br/anac/pt-br/acesso-a-informacao/participacao-social/audiencias-e-consultas-publicas |
| ANAC regulatory agenda | https://www.gov.br/anac/pt-br/acesso-a-informacao/acoes-e-programas/agenda-regulatoria |
| ANAC Airworthiness Directives | https://sistemas.anac.gov.br/certificacao/DA/DAE.asp |
| Brazilian Official Gazette | https://www.in.gov.br/ |

### 2.8 Mexico — AFAC

| Source | Direct location |
|---|---|
| AFAC portal | https://www.gob.mx/afac |
| AFAC documents | https://www.gob.mx/afac/documentos |
| AFAC aviation regulations | https://www.gob.mx/afac/acciones-y-programas/normatividad-185250 |
| SICT aviation portal | https://www.gob.mx/sct/acciones-y-programas/aeronautica-civil |
| Diario Oficial | https://www.dof.gob.mx/ |
| Mexican federal laws | https://www.diputados.gob.mx/LeyesBiblio/index.htm |
| NOM catalog | https://www.sinec.gob.mx/SINEC/Vista/Normalizacion/BusquedaNormas.xhtml |
| CONAMER regulatory proposals | https://www.cofemersimir.gob.mx/portales |

### 2.9 China — CAAC

| Source | Direct location |
|---|---|
| CAAC official portal | http://www.caac.gov.cn/ |
| CAAC English portal | http://www.caac.gov.cn/en/ |
| CAAC policy and regulation section | http://www.caac.gov.cn/XXGK/XXGK/ZFGW/ |
| CAAC airworthiness section | http://www.caac.gov.cn/XXGK/XXGK/SHGL/ |
| China national-law database | https://flk.npc.gov.cn/ |
| State Council policies | https://www.gov.cn/zhengce/ |
| Chinese standards service platform | https://std.samr.gov.cn/ |

> For China, retain the Chinese-language source as authoritative; English CAAC
> pages are translation/convenience sources.

---

## 3. Automotive

### 3.1 International — UNECE WP.29

| Source | Direct location |
|---|---|
| UNECE vehicle regulations | https://unece.org/transport/vehicle-regulations |
| WP.29 introduction | https://unece.org/wp29-introduction |
| WP.29 meeting documents | https://unece.org/info/Transport/Vehicle-Regulations/events |
| UN Regulations — 1958 Agreement | https://unece.org/un-regulations-addenda-1958-agreement |
| UN Global Technical Regulations | https://unece.org/un-global-technical-regulations |
| UN Rules — 1997 Agreement | https://unece.org/un-rules |
| Working Party GRVA | https://unece.org/transport/vehicle-regulations/working-party-automatedautonomous-and-connected-vehicles-introduction |
| UNECE document search | https://documents.un.org/ |

### 3.2 United States — NHTSA, EPA, CARB

| Source | Direct location |
|---|---|
| NHTSA laws and regulations | https://www.nhtsa.gov/laws-regulations |
| NHTSA rulemaking | https://www.nhtsa.gov/laws-regulations/rulemaking |
| NHTSA interpretations | https://www.nhtsa.gov/nhtsa-interpretation-file-search |
| NHTSA recalls | https://www.nhtsa.gov/recalls |
| NHTSA recall API | https://api.nhtsa.gov/ |
| NHTSA investigations | https://www.nhtsa.gov/vehicle-safety/vehicle-related-investigations |
| NHTSA manufacturer communications | https://www.nhtsa.gov/vehicle-safety/manufacturer-communications |
| NHTSA Federal Register | https://www.federalregister.gov/agencies/national-highway-traffic-safety-administration |
| 49 CFR vehicle regulations | https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V |
| EPA vehicle regulations | https://www.epa.gov/regulations-emissions-vehicles-and-engines |
| EPA regulations | https://www.epa.gov/laws-regulations/regulations |
| EPA mobile-source compliance | https://www.epa.gov/vehicle-and-engine-certification |
| CARB regulations | https://ww2.arb.ca.gov/rulemaking |
| CARB vehicle programs | https://ww2.arb.ca.gov/our-work/programs |
| CARB enforcement | https://ww2.arb.ca.gov/our-work/programs/enforcement-policy-and-resources |

### 3.3 Automotive standards and certification

| Organization | Direct location | Pull purpose |
|---|---|---|
| IATF publications | https://www.iatfglobaloversight.org/iatf-169492016/iatf-169492016-publications/ | SIs, FAQs, publications |
| IATF sanctioned interpretations | https://www.iatfglobaloversight.org/iatf-169492016/iatf-169492016-sanctioned-interpretations/ | Binding interpretations |
| IATF FAQs | https://www.iatfglobaloversight.org/iatf-169492016/iatf-169492016-faqs/ | Official clarification |
| IATF OEM requirements | https://www.iatfglobaloversight.org/oem-requirements/customer-specific-requirements/ | Customer-specific requirements |
| AIAG publications | https://www.aiag.org/store/publications | Core-tool edition status |
| AIAG manuals | https://www.aiag.org/training-and-resources/manuals | Current manual directory |
| VDA QMC publications | https://vda-qmc.de/en/publications/ | VDA standards and manuals |
| SAE standards | https://www.sae.org/standards | Automotive and aerospace standards |
| ISO/TC 22 | https://www.iso.org/committee/46706.html | Road-vehicle standards work |
| ISO road-vehicle standards | https://www.iso.org/ics/43.040/x/ | Published and revised automotive standards |

> [Warning] IATF, AIAG, VDA, SAE and ISO sell their standards. Licensed content — monitor
> that a revision was *announced*; do not scrape or republish standard text.

---

## 4. Medical devices, IVD, IVDR and MDSAP

### 4.1 International — IMDRF and MDSAP

| Source | Direct location |
|---|---|
| IMDRF home | https://www.imdrf.org/ |
| IMDRF documents | https://www.imdrf.org/documents |
| IMDRF consultations | https://www.imdrf.org/consultations |
| IMDRF working groups | https://www.imdrf.org/working-groups |
| MDSAP working group | https://www.imdrf.org/working-groups/medical-device-single-audit-program-mdsap |
| FDA MDSAP resources | https://www.fda.gov/medical-devices/cdrh-international-programs/medical-device-single-audit-program-mdsap |
| Health Canada MDSAP | https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices/quality-systems-13485/medical-device-single-audit-program.html |
| TGA MDSAP | https://www.tga.gov.au/products/medical-devices/manufacturing/medical-device-single-audit-program-mdsap |

### 4.2 United States — FDA CDRH

| Source | Direct location |
|---|---|
| FDA medical devices | https://www.fda.gov/medical-devices |
| FDA device guidance database | https://www.fda.gov/regulatory-information/search-fda-guidance-documents |
| CDRH guidance | https://www.fda.gov/medical-devices/device-advice-comprehensive-regulatory-assistance/guidance-documents-medical-devices-and-radiation-emitting-products |
| Proposed-guidance agenda | https://www.fda.gov/medical-devices/guidance-documents-medical-devices-and-radiation-emitting-products/annual-comprehensive-list-cdrh-guidance-documents |
| FDA recognized standards | https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfstandards/search.cfm |
| FDA standards Federal Register notices | https://www.fda.gov/medical-devices/division-standards-and-conformity-assessment/federal-register-documents |
| FDA medical-device databases | https://www.fda.gov/medical-devices/device-advice-comprehensive-regulatory-assistance/medical-device-databases |
| FDA recalls | https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts |
| FDA enforcement reports | https://www.accessdata.fda.gov/scripts/ires/ |
| FDA warning letters | https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters |
| FDA safety communications | https://www.fda.gov/medical-devices/safety-communications |
| MAUDE | https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/search.cfm |
| GUDID / AccessGUDID | https://accessgudid.nlm.nih.gov/ |
| 510(k) database | https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm |
| De Novo database | https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/denovo.cfm |
| PMA database | https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm |
| FDA import alerts | https://www.accessdata.fda.gov/cms_ia/ialist.html |
| FDA Federal Register | https://www.federalregister.gov/agencies/food-and-drug-administration |
| 21 CFR | https://www.ecfr.gov/current/title-21 |
| openFDA APIs | https://open.fda.gov/apis/ |

> openFDA (`api.fda.gov`) exposes device recall, event (MAUDE), 510(k), PMA and
> classification as structured JSON with no key — confirmed live 2026-07-24. The
> recognized-standards database may update before the related Federal Register
> notice, so monitor both.

### 4.3 European Union — MDR and IVDR

| Source | Direct location |
|---|---|
| EU medical-device sector | https://health.ec.europa.eu/medical-devices-sector_en |
| MDCG guidance | https://health.ec.europa.eu/medical-devices-sector/new-regulations/guidance-mdcg-endorsed-documents-and-other-guidance_en |
| Medical-device harmonized standards | https://health.ec.europa.eu/medical-devices-topics-interest/harmonised-standards_en |
| MDCG working groups | https://health.ec.europa.eu/medical-devices-dialogue-between-interested-parties/medical-device-coordination-group-working-groups_en |
| EUDAMED information | https://health.ec.europa.eu/medical-devices-eudamed_en |
| EUDAMED public site | https://ec.europa.eu/tools/eudamed/ |
| MDR official text | https://eur-lex.europa.eu/eli/reg/2017/745/oj |
| MDR consolidated text | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02017R0745-20250110 |
| IVDR official text | https://eur-lex.europa.eu/eli/reg/2017/746/oj |
| IVDR consolidated search | https://eur-lex.europa.eu/search.html?scope=EURLEX&text=2017%2F746 |
| EU medical-device consultations | https://ec.europa.eu/info/law/better-regulation/have-your-say_en |
| NANDO notified bodies | https://webgate.ec.europa.eu/single-market-compliance-space/notified-bodies |
| EU Safety Gate alerts | https://ec.europa.eu/safety-gate-alerts/screen/webReport |

### 4.4 United Kingdom — MHRA

| Source | Direct location |
|---|---|
| MHRA medical-device guidance | https://www.gov.uk/government/collections/medical-devices-guidance-for-manufacturers |
| MHRA safety guidance | https://www.gov.uk/government/collections/medical-devices-safety-guidance |
| MHRA alerts and recalls | https://www.gov.uk/drug-device-alerts |
| MHRA consultations | https://www.gov.uk/search/policy-papers-and-consultations?organisations%5B%5D=medicines-and-healthcare-products-regulatory-agency |
| UK medical-device regulations | https://www.legislation.gov.uk/uksi/2002/618/contents |
| MHRA medical-device registration | https://www.gov.uk/guidance/register-medical-devices-to-place-on-the-market |
| UK approved bodies | https://www.gov.uk/government/publications/medical-devices-uk-approved-bodies |

### 4.5 Australia — TGA

| Source | Direct location |
|---|---|
| TGA medical devices | https://www.tga.gov.au/products/medical-devices |
| TGA consultations | https://consultations.tga.gov.au/ |
| TGA recalls and market actions | https://www.tga.gov.au/safety/recalls-and-other-market-actions |
| TGA safety alerts | https://www.tga.gov.au/safety/safety-alerts |
| TGA regulatory changes | https://www.tga.gov.au/products/medical-devices/medical-device-reforms |
| ARTG public search | https://www.tga.gov.au/resources/artg |
| Australian therapeutic-goods legislation | https://www.legislation.gov.au/Search?query=therapeutic%20goods |

### 4.6 Canada — Health Canada

| Source | Direct location |
|---|---|
| Health Canada medical devices | https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices.html |
| Medical-device guidance | https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices/application-information/guidance-documents.html |
| Medical-device notices | https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices/activities/announcements.html |
| Recalls and safety alerts | https://recalls-rappels.canada.ca/en |
| Medical-device licence database (MDALL) | https://health-products.canada.ca/mdall-limh/index-eng.jsp |
| Establishment licence database | https://health-products.canada.ca/mdel-leim/index-eng.jsp |
| Medical Devices Regulations | https://laws-lois.justice.gc.ca/eng/regulations/SOR-98-282/ |
| Canada Gazette Health Department | https://gazette.gc.ca/rp-pr/publications-eng.html |

### 4.7 Brazil — ANVISA

| Source | Direct location |
|---|---|
| ANVISA medical devices | https://www.gov.br/anvisa/pt-br/assuntos/produtosparasaude |
| ANVISA legislation | https://antigo.anvisa.gov.br/legislacao |
| ANVISA consultations | https://www.gov.br/anvisa/pt-br/assuntos/regulamentacao/participacao-social/consultas-publicas |
| ANVISA regulatory agenda | https://www.gov.br/anvisa/pt-br/assuntos/regulamentacao/agenda-regulatoria |
| ANVISA alerts | https://www.gov.br/anvisa/pt-br/assuntos/fiscalizacao-e-monitoramento/alertas |
| ANVISA product consultation | https://consultas.anvisa.gov.br/ |
| Brazilian Official Gazette | https://www.in.gov.br/ |

### 4.8 China — NMPA

| Source | Direct location |
|---|---|
| NMPA official portal | https://www.nmpa.gov.cn/ |
| NMPA English portal | https://english.nmpa.gov.cn/ |
| Medical-device regulations | https://www.nmpa.gov.cn/ylqx/ylqxfgwj/index.html |
| Medical-device announcements | https://www.nmpa.gov.cn/ylqx/ylqxggtg/index.html |
| Medical-device standards | https://www.nmpa.gov.cn/ylqx/ylqxbzh/index.html |
| CMDE | https://www.cmde.org.cn/ |
| China standards database | https://std.samr.gov.cn/ |
| National-law database | https://flk.npc.gov.cn/ |

### 4.9 Mexico — COFEPRIS

| Source | Direct location |
|---|---|
| COFEPRIS portal | https://www.gob.mx/cofepris |
| COFEPRIS documents | https://www.gob.mx/cofepris/documentos |
| Medical-device information | https://www.gob.mx/cofepris/acciones-y-programas/dispositivos-medicos |
| COFEPRIS health alerts | https://www.gob.mx/cofepris/acciones-y-programas/alertas-sanitarias |
| Diario Oficial | https://www.dof.gob.mx/ |
| NOM search | https://www.sinec.gob.mx/SINEC/Vista/Normalizacion/BusquedaNormas.xhtml |

---

## 5. Mining

### 5.1 United States — MSHA and related

| Source | Direct location |
|---|---|
| MSHA regulations | https://www.msha.gov/regulations |
| MSHA rulemaking | https://www.msha.gov/regulations/rulemaking |
| MSHA policy and procedures | https://www.msha.gov/regulations/policy-and-procedures |
| MSHA safety alerts | https://www.msha.gov/news-media/alerts-hazards |
| MSHA fatality reports | https://www.msha.gov/data-reports/fatality-reports |
| MSHA accident investigations | https://www.msha.gov/data-reports/accident-investigations |
| MSHA data | https://www.msha.gov/data-and-reports |
| MSHA equipment approvals | https://www.msha.gov/tech-support/approval-and-certification-center |
| MSHA petitions for modification | https://www.msha.gov/regulations/petitions-modification |
| MSHA Federal Register | https://www.federalregister.gov/agencies/mine-safety-and-health-administration |
| 30 CFR | https://www.ecfr.gov/current/title-30 |
| OSHA–MSHA jurisdiction memorandum | https://www.msha.gov/msha-and-osha-memorandum |
| NIOSH Mining Program | https://www.cdc.gov/niosh/mining/ |
| Office of Surface Mining | https://www.osmre.gov/ |
| Bureau of Land Management mining | https://www.blm.gov/programs/energy-and-minerals/mining-and-minerals |

### 5.2 Australia — Commonwealth and state mining regulators

| Jurisdiction | Direct location |
|---|---|
| Safe Work Australia mining | https://www.safeworkaustralia.gov.au/safety-topic/industry-and-business/mining |
| Safe Work Australia model WHS laws | https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws |
| Western Australia mining safety | https://www.worksafe.wa.gov.au/mining |
| WA legislation | https://www.legislation.wa.gov.au/ |
| Queensland Resources Safety and Health | https://www.rshq.qld.gov.au/ |
| Queensland mining safety alerts | https://www.rshq.qld.gov.au/safety-notices |
| Queensland legislation | https://www.legislation.qld.gov.au/ |
| NSW Resources Regulator | https://www.resourcesregulator.nsw.gov.au/ |
| NSW safety alerts | https://www.resourcesregulator.nsw.gov.au/safety-and-health/safety-alerts-and-bulletins |
| NSW legislation | https://legislation.nsw.gov.au/ |
| South Australia mining | https://www.energymining.sa.gov.au/industry/minerals-and-mining |
| Victoria Earth Resources | https://resources.vic.gov.au/ |
| Tasmania Mineral Resources | https://www.mrt.tas.gov.au/ |
| Northern Territory mining | https://industry.nt.gov.au/industries/mining-and-energy |

### 5.3 Brazil — mining

| Source | Direct location |
|---|---|
| National Mining Agency | https://www.gov.br/anm/pt-br |
| ANM legislation | https://www.gov.br/anm/pt-br/assuntos/legislacao |
| ANM public consultations | https://www.gov.br/anm/pt-br/acesso-a-informacao/participacao-social |
| ANM mining-dam safety | https://www.gov.br/anm/pt-br/assuntos/barragens |
| Brazilian labour regulations | https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/normas-regulamentadoras |
| IBAMA | https://www.gov.br/ibama/pt-br |
| Official Gazette | https://www.in.gov.br/ |

### 5.4 China — mining

| Source | Direct location |
|---|---|
| National Mine Safety Administration | https://www.chinamine-safety.gov.cn/ |
| Ministry of Emergency Management | https://www.mem.gov.cn/ |
| Ministry of Natural Resources | https://www.mnr.gov.cn/ |
| Ministry of Ecology and Environment | https://www.mee.gov.cn/ |
| China national standards | https://std.samr.gov.cn/ |
| National-law database | https://flk.npc.gov.cn/ |
| State Council policies | https://www.gov.cn/zhengce/ |

### 5.5 Mexico — mining

| Source | Direct location |
|---|---|
| Mexican mining authority | https://www.gob.mx/se/acciones-y-programas/mineria |
| Ministry of Economy mining documents | https://www.gob.mx/se/documentos?state=published&tags=mineria |
| STPS safety standards | https://www.gob.mx/stps/acciones-y-programas/normas-oficiales-mexicanas-de-seguridad-y-salud-en-el-trabajo |
| SEMARNAT laws and standards | https://www.gob.mx/semarnat/acciones-y-programas/leyes-y-normas-del-sector-medio-ambiente |
| CONAGUA | https://www.gob.mx/conagua |
| Diario Oficial | https://www.dof.gob.mx/ |
| NOM database | https://www.sinec.gob.mx/SINEC/Vista/Normalizacion/BusquedaNormas.xhtml |

### 5.6 International mining

| Organization | Direct location |
|---|---|
| ILO mining safety | https://www.ilo.org/topics-and-sectors/safety-and-health-work/mining |
| ILO standards database (NORMLEX) | https://normlex.ilo.org/ |
| ICMM | https://www.icmm.com/ |
| ICMM guidance | https://www.icmm.com/en-gb/guidance |
| Global Tailings Standard | https://globaltailingsreview.org/global-industry-standard/ |
| UNEP extractives | https://www.unep.org/explore-topics/extractives |
| IFC mining EHS guidelines | https://www.ifc.org/en/insights-reports/2000/general-environmental-health-and-safety-guidelines |
| OECD minerals due diligence | https://www.oecd.org/corporate/mne/mining.htm |
| Extractive Industries Transparency Initiative | https://eiti.org/ |
| International Seabed Authority | https://www.isa.org.jm/ |
| ISO/TC 82 Mining | https://www.iso.org/committee/50344.html |

---

## 6. Global standards development

| Standards body | Catalog / monitoring | Committee / work-program |
|---|---|---|
| ISO | https://www.iso.org/standards.html | https://www.iso.org/technical-committees.html |
| ISO Online Browsing Platform | https://www.iso.org/obp/ui/ | Terminology, clauses, metadata |
| IEC Webstore | https://webstore.iec.ch/ | https://www.iec.ch/technical-committees-and-subcommittees |
| IEC advanced search | https://webstore.iec.ch/advanced-search-form | Status and edition search |
| SAE standards | https://www.sae.org/standards | https://www.sae.org/standards/development |
| ASTM standards | https://www.astm.org/products-services/standards-and-publications/standards.html | https://www.astm.org/get-involved/technical-committees.html |
| ASTM work items | https://www.astm.org/workitem-wk.html | Draft-development monitoring |
| IAQG | https://iaqg.org/standards/ | https://iaqg.org/tools/ |
| IAQG SCMH | https://iaqg.org/tools/scmh/ | Supply-chain guidance |
| RTCA | https://www.rtca.org/products/ | https://www.rtca.org/committee/ |
| EUROCAE | https://www.eurocae.net/eurocae-documents/ | https://www.eurocae.net/working-groups/ |
| AAMI | https://store.aami.org/ | https://www.aami.org/standards |
| IEEE standards | https://standards.ieee.org/ | https://standards.ieee.org/about/sasb/ |
| UL standards | https://www.shopulstandards.com/ | https://ulse.org/standards-development |
| NFPA codes and standards | https://www.nfpa.org/codes-and-standards | Public-input and revision cycles |
| ASME codes and standards | https://www.asme.org/codes-standards | Standards committees |
| API standards | https://www.api.org/products-and-services/standards | Petroleum/extractive standards |
| IPC standards | https://www.ipc.org/ipc-standards | Electronics manufacturing standards |
| JEDEC standards | https://www.jedec.org/standards-documents | Semiconductor standards |
| CEN | https://standards.cencenelec.eu/ | European standards development |
| CENELEC | https://standards.cencenelec.eu/ | Electrotechnical EN standards |
| ETSI | https://www.etsi.org/standards | https://portal.etsi.org/ |
| BSI | https://knowledge.bsigroup.com/ | UK standards status |
| DIN | https://www.dinmedia.de/en | German standards |
| Standards Australia | https://store.standards.org.au/ | Australian standards |
| SCC Canada | https://www.scc.ca/en/standardsdb/standards | Canadian standards |
| ABNT Brazil | https://www.abntcatalogo.com.br/ | Brazilian standards |
| China national standards | https://std.samr.gov.cn/ | GB and GB/T status |
| Japan JIS search | https://www.jisc.go.jp/eng/jis-act/ | Japanese standards |
| Mexico SINEC | https://www.sinec.gob.mx/ | NOM and NMX search |

> [Warning] Most standards bodies sell their standards. Monitor announcement/status
> metadata only; do not scrape or republish standard text.

---

## 7. Collector record — the schema every source becomes

Each directory entry becomes a machine-readable record. Canonical schema
(`sources/registry.schema.yaml`), example:

```yaml
source_id: FAA-RULEMAKING-001
authority: Federal Aviation Administration
jurisdiction: United States
industry: [Aerospace]
source_name: FAA Recently Published Rulemaking Documents
source_type: [Proposed Rule, Final Rule, Notice]
url: https://www.faa.gov/regulations_policies/rulemaking/recently_published
official_domain: faa.gov
authority_level: Primary
cross_reference:
 - https://www.federalregister.gov/agencies/federal-aviation-administration
 - https://www.ecfr.gov/current/title-14
retrieval_method: HTML
structured_api_available: false
login_required: false
recommended_frequency: Daily
change_detection: [New document row, Publication date change, Comment deadline change, Link replacement]
retain_original: true
human_validation_required: true
```

The master register should additionally record, per source: exact RSS address;
API endpoint; email-subscription location; HTML selector / container id;
pagination behaviour; authentication requirement; robots and copyright limits;
language and translation handling; polling frequency; fallback URL; last
successful connection; failure status; source owner; parser type;
duplicate-detection method.
