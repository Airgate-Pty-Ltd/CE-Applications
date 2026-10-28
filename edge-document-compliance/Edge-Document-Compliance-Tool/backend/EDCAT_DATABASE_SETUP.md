# EDCAT Database Setup Guide

This guide explains how to set up and use the new database-backed AI system with regulatory persistence.

## Overview

The EDCAT system now uses a dedicated `edcat` schema in PostgreSQL for:
- **AI Agents**: Configuration and personality for the EDCAT Administrator
- **Regulatory Persistence**: Stored regulatory packs, clauses, and sources
- **Document Indexing**: Full-text search for client documents
- **AI Memory**: Sessions, messages, memories, and QA pairs for learning
- **Task Management**: Queue for regulatory refreshes and indexing jobs

## Setup Steps

### 1. Run Database Migration

The migration creates the `edcat` schema and all required tables:

```bash
cd backend
npm run migrate:edcat
```

Or manually run the migration file:

```bash
psql $DATABASE_URL -f src/database/migrations/002_edcat_schema.sql
```

### 2. Seed the EDCAT Administrator Agent

Create the initial AI agent configuration:

```bash
npm run seed:agent
```

This creates the `edcat-admin` agent with:
- System prompt (bounded AI instructions)
- Persona configuration
- Command capabilities

### 3. Add Regulatory Sources

Insert regulatory sources into `edcat.reg_sources`:

```sql
INSERT INTO edcat.reg_sources(authority, reg_id, label, url, enabled)
VALUES 
  ('faa', '14-CFR-21.137', 'FAA 14 CFR 21.137', 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-21#p-21.137', true),
  ('easa', 'EASA-Part-145', 'EASA Part-145', 'https://www.easa.europa.eu/en/document-library/easy-access-rules/easy-access-rules-part-145', true);
```

### 4. Discover API Endpoints (Optional)

Probe regulator domains for OpenAPI, RSS, or other API surfaces:

```bash
npm run apis:discover
```

This will:
- Check for OpenAPI/Swagger endpoints
- Look for RSS/Atom feeds
- Store findings in `edcat.reg_api_endpoints`

## Usage

### Ingest a Single Regulatory URL

Use the `/api/regs/ingest` endpoint to fetch and store a regulation:

```bash
curl -X POST http://localhost:8080/api/regs/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "authority": "faa",
    "reg_id": "14-CFR-21.137",
    "label": "FAA 14 CFR 21.137",
    "url": "https://www.ecfr.gov/current/title-14/...#p-21.137"
  }'
```

**Note**: Requires `ENABLE_NET=true` environment variable.

### Refresh All Regulations

Trigger a batch refresh of all enabled sources:

```bash
curl -X POST http://localhost:8080/api/regs/refresh
```

This will:
- Fetch all enabled regulatory sources
- Parse and normalize to clauses
- Store packs and clauses in database
- Record crawl run statistics
- Return RED FLAG status if failures or suspicious diffs detected

### Query Requirements

Use the repository functions to query stored requirements:

```javascript
import { requirementsList, requirementsShow, requirementsSearch } from './database/repos/requirements.repo.js';

// List all clauses for a regulation
const result = await requirementsList({
  authority: 'faa',
  reg_id: '14-CFR-21.137'
});

// Show a specific clause
const clause = await requirementsShow({
  authority: 'faa',
  reg_id: '14-CFR-21.137',
  clause_id: '21.137(e)'
});

// Search clauses by text
const matches = await requirementsSearch({
  authority: 'faa',
  reg_id: '14-CFR-21.137',
  query_text: 'training',
  topK: 20
});
```

### Search Client Documents

Use full-text search on indexed client documents:

```javascript
import { docsSearch } from './database/repos/docs.repo.js';

const results = await docsSearch({
  query_text: 'training effectiveness',
  topK: 20,
  customer_id: 'uuid-here' // optional
});
```

## Database Schema

### Core Tables

- **`edcat.ai_agents`**: AI agent configurations
- **`edcat.ai_sessions`**: Chat session tracking
- **`edcat.ai_messages`**: Individual messages in sessions
- **`edcat.ai_memories`**: Long-lived facts (global/customer/standard scoped)
- **`edcat.qa_pairs`**: Question/answer pairs for learning

### Regulatory Tables

- **`edcat.reg_sources`**: Whitelisted regulatory sources (FAA, EASA, etc.)
- **`edcat.reg_api_endpoints`**: Discovered API endpoints per source
- **`edcat.reg_packs`**: Versioned regulatory packs (YAML snapshots)
- **`edcat.reg_clauses`**: Atomic clauses extracted from packs

### Task & Index Tables

- **`edcat.tasks`**: Queue for jobs (regs.refresh, index.docs, etc.)
- **`edcat.crawl_runs`**: Summary of each regulatory refresh run
- **`edcat.links`**: Traceability links (requirement ↔ document)
- **`edcat.doc_index`**: Full-text search index (TSVector) for client docs

## Validation Queries

### Check Latest Regulatory Packs

```sql
SELECT s.authority, s.reg_id, s.label, p.version, p.created_at, COUNT(c.id) as clause_count
FROM edcat.reg_sources s
JOIN edcat.reg_packs p ON p.source_id = s.id
LEFT JOIN edcat.reg_clauses c ON c.pack_id = p.id
GROUP BY s.id, p.id
ORDER BY p.created_at DESC;
```

### View Latest Crawl Run

```sql
SELECT * FROM edcat.crawl_runs 
ORDER BY started_at DESC 
LIMIT 1;
```

### Check AI Agent Configuration

```sql
SELECT code, name, status, 
       jsonb_pretty(persona_json) as persona,
       jsonb_pretty(capabilities_json) as capabilities
FROM edcat.ai_agents;
```

### Search Client Documents

```sql
SELECT d.id, d.title, d.type,
       ts_rank_cd(i.content_tsv, websearch_to_tsquery('english', 'training')) as score
FROM edcat.doc_index i
JOIN public.documents d ON d.id = i.document_id
WHERE i.content_tsv @@ websearch_to_tsquery('english', 'training')
ORDER BY score DESC
LIMIT 20;
```

## Environment Variables

- **`ENABLE_NET=true`**: Required for regulatory crawling/ingestion
- **`DATABASE_URL`**: PostgreSQL connection string (required)

## Next Steps

1. **Wire up AI chat**: Update `/api/chat` to use `requirementsList`, `docsSearch`, etc.
2. **Add UI components**: Create "Capture to Library" buttons for regulatory links
3. **Implement learning**: Store Q/A pairs and memories from chat interactions
4. **Enable pgvector** (optional): Add semantic search with embeddings

## Troubleshooting

### Migration Fails

If the migration fails, check:
- PostgreSQL version (requires 12+)
- Database permissions (needs CREATE SCHEMA)
- Existing tables don't conflict

### Ingestion Returns 403

Set `ENABLE_NET=true` in your environment variables.

### No Clauses Extracted

Check:
- URL is accessible
- Content is parseable (HTML/PDF)
- Text extraction is working (check logs)

### Transaction Errors

Ensure `DATABASE_URL` is set and the connection pool is initialized.

