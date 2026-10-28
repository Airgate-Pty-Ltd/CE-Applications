# Two-Database Architecture

## Overview

EDCAT Administrator uses a **two-database architecture** to separate customer data from compliance intelligence:

1. **PostgreSQL Customer Data DB** (`DATABASE_URL`) - Stores client documents, procedures, analysis results
2. **EDCAT AI Intelligence DB** (`EDCAT_AI_DATABASE_URL`) - Stores standards, requirements, learning system

## Environment Variables

```bash
# PostgreSQL: Customer Data Warehouse
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/customer_data_db

# EDCAT AI: Compliance Intelligence Engine
EDCAT_AI_DATABASE_URL=postgresql://[user]:[password]@[host]:5432/edcat_ai_db
```

## Database Schemas

### PostgreSQL Customer Data DB

**Purpose**: Store what customers gave you + analysis results

**Tables**:
- `tenants` - Client organizations
- `users` - Team members
- `upload_files` - Uploaded documents tracking
- `customer_documents` - Document metadata + extracted text
- `customer_procedures` - Extracted procedures from docs
- `gap_analyses` - Analysis results per document
- `analysis_clarifications` - Q&A during analysis
- `generated_reports` - Reports created for customers
- `user_feedback` - Accuracy ratings and comments
- `audit_logs_results` - What actions happened
- `integration_logs` - Data sent to external systems

### EDCAT AI Intelligence DB

**Purpose**: Store compliance standards, requirement definitions, learning system

**Tables**:
- `standards` - ISO 9001, AS9100D, FAA definitions
- `parsed_requirements` - Extracted clauses with intent
- `extraction_history` - Parse decisions with confidence
- `clause_correlation_matrix` - Requirement ↔ Procedure mappings
- `edcat_learning_events` - Every extraction feedback
- `learned_patterns` - Patterns that improved accuracy
- `model_versions` - v1.0.0 → v1.0.1 → v1.0.2
- `baseline_metrics` - Accuracy/precision/recall per version
- `audit_trail_decisions` - Why EDCAT made each decision
- `regulatory_websites` - Where standards come from
- `sync_log` - Track when customer data came in

## Running Migrations

```bash
# Run both migrations
node backend/src/scripts/run-migrations.js

# Or manually:
psql $DATABASE_URL < migrations/001_postgres_customer_data.sql
psql $EDCAT_AI_DATABASE_URL < migrations/002_edcat_ai_intelligence.sql
```

## Code Usage

### Query Customer Data

```javascript
import { queryPostgres } from './database/connection.js';

const result = await queryPostgres(
  'SELECT * FROM customer_documents WHERE tenant_id = $1',
  [tenantId]
);
```

### Query EDCAT AI

```javascript
import { queryEdcatAI } from './database/connection.js';

const result = await queryEdcatAI(
  'SELECT * FROM parsed_requirements WHERE standard_id = $1',
  [standardId]
);
```

### Backward Compatibility

The default `query()` function still works and defaults to customer data DB:

```javascript
import { query } from './database/connection.js';

// Uses customer data DB
const result = await query('SELECT * FROM tenants');
```

## Data Flow

```
USER UPLOADS DOCUMENT
        ↓
        ├─→ POSTGRESQL (Stores file)
        │   └─ upload_files
        │   └─ customer_documents
        │   └─ customer_procedures (extracted)
        │
        └─→ EDCAT AI (Analyzes)
            ├─ READ standards & parsed_requirements
            ├─ PROCESS with current model_version
            ├─ CREATE clause_correlation_matrix
            ├─ LOG decisions in audit_trail_decisions
            └─ SEND results back to POSTGRESQL

RESULTS STORED IN POSTGRESQL
├─ gap_analyses (summary)
├─ analysis_clarifications (Q&A)
└─ audit_logs_results (what happened)
```

## Railway Configuration

In Railway, you should have:

1. **Postgres Service** - Connected to `EDCAT-Administrator` via `DATABASE_URL`
2. **EDCAT AI Service** - Connected to `EDCAT-Administrator` via `EDCAT_AI_DATABASE_URL`

Both connection strings are configured as environment variables in the `EDCAT-Administrator` service.

