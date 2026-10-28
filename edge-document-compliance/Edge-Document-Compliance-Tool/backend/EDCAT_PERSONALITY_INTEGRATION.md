# EDCAT AI Personality System Integration

## Overview

The EDCAT AI Personality System has been integrated into the EDCAT AI Database. This includes:
- **Vera** - Primary EDCAT persona (British/Scottish tone, expert lead auditor)
- **Console Assistant** - Lightweight assistant for UI hints

## Database Tables Created

The following tables have been added to the EDCAT AI Database:

1. **ai_tenant** - Multi-tenancy support
2. **ai_persona** - Personality profiles (Vera, Console Assistant)
3. **ai_prompt** - System prompts, greetings, refusals, repairs
4. **ai_policy** - Tool policies and citation rules
5. **ai_template** - Retrieval templates, draft templates, mapping templates
6. **ai_validator** - Citation, style, and format validators
7. **ai_router** - Routing policies (cloud GPT-Lite vs on-prem student)
8. **ai_chat_log** - Full audit trail of every chat exchange
9. **ai_doc_ref** - Document snippet hashes for immutability checks

## Setup Steps

### 1. Run Database Migration

The personality tables are automatically created when you run the two-database migrations:

```bash
# The migration runs automatically on startup, or manually:
psql $EDCAT_AI_DATABASE_URL -f migrations/002_edcat_ai_intelligence.sql
```

### 2. Seed Personality Data

Run the seed script to load all personality data from JSON files:

```bash
cd backend
node src/scripts/seed-edcat-personality.js
```

This will:
- Create default tenant if needed
- Load 2 personas (Vera, Console Assistant)
- Load 4 system prompts
- Load tool policies
- Load 3 retrieval templates
- Load 4 validators
- Load routing policies

The script is **idempotent** - safe to run multiple times.

### 3. Verify Seeding

Check that data was loaded:

```sql
SELECT 
  (SELECT COUNT(*) FROM ai_persona) as personas,
  (SELECT COUNT(*) FROM ai_prompt) as prompts,
  (SELECT COUNT(*) FROM ai_policy) as policies,
  (SELECT COUNT(*) FROM ai_template) as templates,
  (SELECT COUNT(*) FROM ai_validator) as validators,
  (SELECT COUNT(*) FROM ai_router) as routers;
```

Expected results:
- Personas: 2
- Prompts: 4
- Policies: 1
- Templates: 3
- Validators: 4
- Routers: 1

## Personality Profiles

### Vera (Default)

- **Code**: `vera`
- **Voice**: British/Scottish female
- **Style**: Professional, confident, warm-but-formal
- **Capabilities**: 
  - retrieve.clause
  - retrieve.document
  - search.index
  - render.gap.table
  - draft.template
- **Refusal Policy**: If no authoritative snippet is retrieved, refuse or ask for the source document

### Console Assistant

- **Code**: `console-assistant`
- **Voice**: Neutral
- **Style**: Concise, technical
- **Capabilities**:
  - retrieve.clause
  - search.index
- **Refusal Policy**: Refuse if retrieval is empty

## Next Steps

1. **Wire Chat Endpoint**: Implement `/api/ai/chat` using the example handler
2. **Connect Retrieval**: Implement retrieval adapter for document snippets
3. **Enable Validators**: Run validators on every response (fail-closed)
4. **Configure Routing**: Set up cloud GPT-Lite and on-prem student model routing
5. **Update Chat UI**: Point frontend to `/api/ai/chat` endpoint

## Files

- **Migration**: `migrations/002_edcat_ai_intelligence.sql` (Section 13)
- **Seed Script**: `backend/src/scripts/seed-edcat-personality.js`
- **Seed Data**: `backend/EDCAT AIP/seed/*.json`
- **Example Handler**: `backend/EDCAT AIP/server/examples/chat_handler.ts`
- **API Contract**: `backend/EDCAT AIP/api/contracts/ai_chat_api.yaml`

## Design Principles

- **Retrieval-First**: Model must answer only from supplied context
- **Citations Required**: Clause answers must include `[Source: doc_id pX Lx–Ly]`
- **House Style**: Procedures state *what* (no how-to), single spacing, paragraph headers
- **Fail-Closed**: If citations/formatters fail, do not return an answer
- **Determinism**: Prefer fixed temperature and seeded sampling for auditability
- **Tenant Isolation**: All rows contain `tenant_id`; never cross tenants

