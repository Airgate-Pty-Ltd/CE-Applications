EDCAT AI - Official TODO & Delivery Checklist

Status Key: [✅ Done] [🟡 In Progress] [❌ Blocked] [📝 Pending]
Owner: Unassigned unless noted

Phase 0 – Infrastructure [✅ Done]
- [✅] Database schema, uploads, regulatory websites
- [✅] Healthcheck and static serving
- Acceptance Criteria:
  - /health returns 200
  - /api/upload accepts files
  - standards table accessible

Phase 1 – Core Engine [✅ Done]
1) Migrations and Schema
   - [✅] Add parsed_clauses, clause_correlation_matrix, edcat_learning_events, conversation_context
   - Acceptance: tables exist and accept inserts

2) Services
   - [✅] TextExtractor (PDF/DOCX/XLSX/TXT)
   - [✅] ParseService v1 (ISO/AS/FAA/EASA/generic parsing)
   - [✅] SemanticMatcher (signals: keywords, n-grams, intent, structure)
   - [✅] ClauseCorrelationEngine (generate/write matrix)
   - [✅] EdcatPersonality (greeting, explanations, recommendations)
   - Acceptance: parse → clauses saved; correlation → rows stored; persona responds

3) Routes
   - [✅] Ensure /api/parse, /api/chat, /api/requirements return Phase 1 data
   - Acceptance: cURL flows pass with non-empty results

4) Tests
   - [📝] Smoke test parse/chat/requirements (local and Railway)
   - Acceptance: basic end-to-end runbook executes with success

Phase 2 – Reports, Exports & Drafting [✅ Done]
1) Report Generator
   - [✅] Service: Word/Excel/PDF from correlation data
   - [✅] Route: GET /api/reports/:analysisId/:format?standardId=...
   - Acceptance: downloads .docx/.xlsx/.pdf with valid content

2) Clause Cross-Mapping
   - [✅] Service: ClauseMappingExporter
   - [✅] Route: GET /api/mappings/compare?standard1=&standard2=
   - Acceptance: Excel shows equivalent/related/no match rows

3) Document Drafting
   - [✅] Service: DocumentDraftingEngine (procedure/policy/WI/form)
   - [✅] Route: POST /api/documents/draft
   - Acceptance: .docx draft created with placeholders and sections

4) Audit Prep Export
   - [✅] Service: AuditPrepExporter
   - [✅] Route: GET /api/audit/prep/:customerId/:standardId
   - Acceptance: .docx checklist generated; highlights high-risk clauses

5) Dependencies
   - [✅] docx, exceljs, pdfkit added

Phase 3 – Regulatory Intel, Predictive, Mock Audits, Voice [🟡 In Progress]
1) Regulatory Intelligence
   - [🟡] Table regulatory_updates (added)
   - [🟡] Service/regIntel route: POST /api/reg-intel/scan-now (added)
   - [🟡] Cron 02:00 guarded by ENABLE_REG_INTEL & ENABLE_NET (added)
   - Acceptance: updates stored; optional email notifications

2) Conversational Mock Audits
   - [🟡] Tables: sessions/questions/responses/reports (added)
   - [🟡] Routes: /api/audit/mock/start, /answer, /complete (added baseline)
   - [📝] Enhance scoring, persistence, reporting
   - Acceptance: full Q/A session ends with computed score and report row

3) Predictive Layer
   - [🟡] Basic predictions endpoint /api/predictions/gaps/:customerId/:standardId (added)
   - [📝] PredictivePatternEngine (sector patterns, priorities) – refine
   - Acceptance: returns prioritized predicted gaps with rationale

4) Voice Interface
   - [📝] VoiceInterface (Google TTS) + endpoint
   - Acceptance: produces MP3 summaries from analysis; credentials configured

Phase 4 – QMS Integration (CAPA, Training, Documents, KPIs) [✅ Done]
1) CAPA System
   - [✅] Tables: capa_records, capa_actions, capa_effectiveness_checks
   - [✅] Service + routes: /api/capa/*
   - Acceptance: CAPA creation from gaps, status updates, dashboard

2) Training & Competency
   - [✅] Tables: training_records, training_completions, employee_competencies, employees
   - [✅] Service + routes: /api/training/*
   - Acceptance: training plans from procedures, completions, competency matrix

3) Document Management
   - [✅] Tables: qms_documents, document_versions, document_approvals, document_distribution
   - [✅] Service + routes: /api/documents/*, /api/qms/documents/*
   - Acceptance: create → approve → release → revise with history

4) KPI Dashboard
   - [✅] Service: KPIMetrics
   - [✅] Route: /api/kpi/dashboard/:customerId
   - Acceptance: returns all key KPIs and overall health score

5) QMS Integration Workflow
   - [✅] Service: EdcatQMSIntegration (orchestrates CAPA, Training, Docs, KPIs)
   - [✅] Routes: /api/qms/remediation-workflow, /api/qms/audit-trail/:customerId/:standardId
   - Acceptance: end-to-end workflow execution; comprehensive audit trail

6) Chat Integration
   - [✅] Phase 4 commands integrated into /api/chat/analyze
   - Acceptance: chat responses reflect QMS status, CAPA, training, docs

Phase 5 – Multi-Industry, Mobile, Voice, International, Enterprise [✅ Done]
1) Multi-Industry Modules
   - [✅] Tables: industry_modules, tenant_industry_modules (migration 004_phase5_enterprise.sql)
   - [✅] Service: IndustryModuleFactory + specific modules (ISO13485, IATF16949, ISO27001, ISO45001, HIPAA)
   - [✅] Route: POST /api/industry/switch-module, GET /api/industry/modules, GET /api/industry/tenant/:tenantId/active
   - Acceptance: module switches, industry-specific data loaded

2) Mobile App
   - [📝] React Native/Flutter project scaffold (out-of-repo, pending)
   - [📝] On-site auditing, gap recording, photo evidence, upload (out-of-repo, pending)
   - Acceptance: app runs, audit session completes, data uploaded

3) Voice-First Interface (Vera)
   - [📝] Service: VeraVoiceInterface (Google Speech/TTS) (stub created, pending full implementation)
   - [📝] Endpoint: POST /api/voice/vera (audio stream) + WebSocket (pending)
   - Acceptance: voice commands processed, audio responses generated

4) International Expansion
   - [✅] Tables: i18n_translations, regional_compliance_mappings (migration 004_phase5_enterprise.sql)
   - [✅] Service: I18nManager (localization, regional compliance)
   - [✅] Routes: /api/i18n/content/:key, /api/i18n/translations, /api/i18n/regional-compliance, /api/i18n/languages
   - Acceptance: localized content, regional compliance data

5) Advanced AI & Anomaly Detection
   - [✅] Service: AnomalyDetectionEngine (gap trends, training stalls, CAPA delays, audit score decline)
   - [✅] Routes: /api/ai/anomalies/:customerId, /api/ai/predictions/:customerId/:standardId
   - Acceptance: detects anomalies, predicts future gaps

6) Integration Marketplace
   - [✅] Tables: integrations, integration_logs (migration 004_phase5_enterprise.sql)
   - [✅] Service: IntegrationMarketplace (Slack, Teams, Jira, Email, Webhooks)
   - [✅] Routes: POST /api/integrations/enable, POST /api/integrations/slack/notify, POST /api/integrations/teams/notify, POST /api/integrations/jira/create-issue, POST /api/integrations/email/send, POST /api/integrations/webhook/trigger
   - Acceptance: integrations enabled, notifications sent, data synced

7) Enterprise Scaling & Security Hardening
   - [✅] Tables: api_keys, audit_logs (migration 004_phase5_enterprise.sql)
   - [✅] Middleware: enterpriseMiddleware (rate limiting, tenant isolation, API key validation, CORS, security headers)
   - [✅] Dependencies: express-rate-limit, helmet added to package.json
   - [✅] Integrated into app.js with correlation ID, audit logging, rate limiting
   - Acceptance: API keys work, tenant data isolated, rate limits active, audit logs recorded

8) Chat Integration
   - [✅] Phase 5 commands integrated into /api/chat/analyze (industry, anomaly, integration, i18n)
   - Acceptance: chat responses reflect Phase 5 capabilities

Cross-Cutting – Ops & Quality [🟡 In Progress]
- [📝] Add smoke test scripts for Railway (cURL or supertest)
- [🟡] Guarded features via env (ENABLE_NET, ENABLE_REG_INTEL, ENABLE_EMAIL, ENABLE_API_KEY_VALIDATION, ENABLE_AUDIT_LOGS)
- [📝] Docs: API usage for Phase 1–5 endpoints

Open Items – Next Up
- Finish Phase 1 & 2 smoke tests
- Enhance predictive engine and mock audit scoring
- Optional: Voice/TTS after credentials provision
- Mobile app development (out-of-repo)

Environment Flags
- ENABLE_NET=true to allow outbound fetches
- ENABLE_REG_INTEL=true to enable scheduled scans
- ENABLE_EMAIL=true with SMTP_* for notifications

Acceptance Summary (Go/No-Go)
- [ ] Parse → Correlation → Report download produce artifacts for a sample standard and tenant
- [ ] Predictions endpoint produces non-empty prioritized list
- [ ] Mock audit session runs through completion with a report score
- [ ] Regulatory scan can be triggered manually without errors

# TODO Run Checklist

- [x] Fix FK introspector (array normalization)
- [x] Force diagnose mode to serve /health and /__db/introspect
- [x] Make diagnose:db always emit JSON {ok,...}
- [x] Add check:dburl tool for syntactic DB URL validation (redacted)
- [x] Add unit tests for normalization and FK mapping
- [x] Add CLI recipes and docs
- [ ] Multi-pass deploy loop (up to 10 passes)
- [ ] Capture each pass logs to /REPORTS/logs
- [ ] Produce /REPORTS/CLAUDE_SUMMARY.md with full change log
- [x] Produce /ARTIFACTS/openapi.yaml (health + introspect)
