# EDCAT Bounded AI System - Technical Documentation

## Overview

The **Bounded AI** is a deterministic, rule-based compliance analysis engine that operates strictly within the boundaries of uploaded compliance documents. It does NOT use external knowledge, internet search, or hallucinate information. All learning and analysis is constrained to the user's compliance corpus (standards, regulations, customer requirements).

## Core Principle

**"Bounded"** means the AI:
- ✅ ONLY uses document text provided in the prompt
- ✅ NEVER searches the internet or uses external tools
- ✅ NEVER invents, fabricates, or hallucinates requirements
- ✅ Responds with "Insufficient data" when context is missing
- ✅ Learns ONLY from user feedback on its own analysis

---

## 1. Code Location & Architecture

### Primary Service File
**Location**: `services/llmBoundedService.js`

This is the core bounded AI engine with two modes:
- **Bounded AI Engine**: Rule-based, deterministic (no LLM calls)
- **Advanced Engine**: GPT-4 with strict grounding constraints (optional)

**Key Functions**:
```javascript
// Rule-based extraction (100% deterministic)
extractRequirementsBounded(text, documentName)

// Advanced GPT-4 extraction (with strict constraints)
extractRequirementsAdvanced(text, documentName)

// Gap analysis task runner
runGapAnalysisTask(task)
```

### System Prompt (Non-Negotiable)
Located in `services/llmBoundedService.js` lines 14-34:
```javascript
const BOUNDED_SYSTEM_PROMPT = `You are the EDCAT Bounded Compliance Engine...
OPERATIONAL CONSTRAINTS:
1. You ONLY use the document text provided in this prompt.
2. You NEVER search the internet, use external tools, or reference knowledge outside this context.
3. You NEVER invent, fabricate, or hallucinate requirements...
`
```

### Chat Integration
**Location**: `backend/src/routes/chat.js`

The chat route uses bounded AI principles:
- Queries only uploaded documents and standards
- No external knowledge sources
- Generates responses based on compliance corpus only

---

## 2. Database Structure - Where AI "Lives"

### Per-Customer Schema Tables

The bounded AI learning system creates **three tables per customer** when a customer is created:

**Location**: `backend/src/routes/customers.js` lines 324-373

#### Table 1: `ai_learning_traces`
**Purpose**: Stores full trace of AI analysis process - where the AI "lives"

```sql
CREATE TABLE ${schemaName}.ai_learning_traces (
  trace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL,
  standard_code VARCHAR(50) NOT NULL,
  clause_ref VARCHAR(50),
  requirement_text TEXT,
  ai_confidence DECIMAL(3,2),
  decision_path JSONB,  -- Full trace of AI reasoning
  engine_config JSONB,  -- Parameters used for this analysis
  created_at TIMESTAMP DEFAULT NOW()
)
```

**What it stores**:
- Every AI decision/analysis
- Confidence scores
- Reasoning path (JSON)
- Engine configuration used

#### Table 2: `ai_learning_feedback`
**Purpose**: User feedback on AI performance

```sql
CREATE TABLE ${schemaName}.ai_learning_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES ai_learning_traces(trace_id),
  feedback_type VARCHAR(50),  -- 'correct', 'incorrect', 'partial'
  user_correction TEXT,
  accuracy_rating DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
)
```

**What it stores**:
- User corrections
- Accuracy ratings
- Links back to the trace that generated the analysis

#### Table 3: `ai_learning_tuning`
**Purpose**: Tuned parameters per standard/clause

```sql
CREATE TABLE ${schemaName}.ai_learning_tuning (
  tuning_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_code VARCHAR(50) NOT NULL,
  clause_ref VARCHAR(50),
  threshold_full DECIMAL(3,2),  -- Threshold for "full coverage"
  threshold_partial DECIMAL(3,2),  -- Threshold for "partial coverage"
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
)
```

**What it stores**:
- Learned thresholds per standard/clause
- Approval status (requires admin approval)
- Bounded changes (max ±0.01 per day)

### Shared Compliance Tables

**Location**: `database/schema.sql`

#### `public.compliance_standards`
- Stores uploaded standards (ISO 9001, AS9100D, etc.)
- Shared across all customers
- Source of truth for compliance requirements

#### `public.compliance_requirements`
- Individual clauses extracted from standards
- Linked to `compliance_standards` via `standard_id`
- Used by bounded AI for analysis

#### `public.analysis_clarifications`
- Every question + user response
- Used for learning feedback loop
- Links: analysis → requirement → procedure

---

## 3. Database Connections

### Connection Pool
**Location**: `backend/src/database/connection.js`

```javascript
import pg from 'pg';
const { Pool } = pg;

// Creates connection pool with Railway SSL support
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }  // Required for Railway
    : false,
  max: 10,
  idleTimeoutMillis: 30000
});
```

### Query Function
```javascript
export async function query(text, params) {
  // Executes SQL queries with error handling
  // Used by all routes to access database
}
```

### Schema Access Pattern

**Customer-Specific Data**:
```javascript
// Each customer has their own schema
const schemaName = `customer_${customerId}_${revision}`;

// AI learning tables are in customer schema
await query(`SELECT * FROM ${schemaName}.ai_learning_traces WHERE ...`);
```

**Shared Compliance Data**:
```javascript
// Standards are in public schema (shared)
await query(`SELECT * FROM public.compliance_standards WHERE ...`);
await query(`SELECT * FROM public.compliance_requirements WHERE standard_id = $1`, [id]);
```

---

## 4. Learning Flow

### Daily Learning Cycle
**Location**: `backend/src/scripts/learnNightly.js` (if implemented)

1. **02:30 AM**: Scheduler triggers learning job
2. **Analysis**: Analyzes last 30 days of traces and feedback
3. **Proposal**: Creates tuning proposals with bounded changes
4. **Auto-approval**: Micro changes (<0.005) auto-approved if enabled
5. **Reports**: Generates Markdown reports for admin review

### Learning Engine
**Location**: `backend/learningEngine.js`

**Key Functions**:
```javascript
// Record learning event
recordLearningEvent(eventType, data)

// Process clarification feedback
processClarificationFeedback(analysisId)

// Determine if new model version needed
shouldCreateNewModelVersion(analysis)
```

### Guardrails (Safety Limits)

- **Hard caps**: Thresholds clamped to [0.78, 0.88] for full, [0.68, 0.80] for partial
- **Max delta**: No more than ±0.01 change per day
- **Minimum samples**: Requires at least 25 traces with 20% feedback rate
- **Per-tenant isolation**: All tunings scoped to (tenant, standard, clause)
- **Audit trail**: Every run records engine_config in traces

---

## 5. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER UPLOADS STANDARDS                    │
│              (public.compliance_standards)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              BOUNDED AI EXTRACTS REQUIREMENTS                │
│         (services/llmBoundedService.js)                     │
│         - extractRequirementsBounded()                       │
│         - extractRequirementsAdvanced()                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         STORES IN public.compliance_requirements            │
│         (linked to standard_id)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              USER UPLOADS CUSTOMER DOCUMENTS                 │
│         (${customerSchema}.documents)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              BOUNDED AI PERFORMS GAP ANALYSIS                │
│         (runGapAnalysisTask())                              │
│         - Compares requirements vs procedures               │
│         - Generates trace in ai_learning_traces             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              USER PROVIDES FEEDBACK                          │
│         (via analysis_clarifications)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         LEARNING ENGINE PROCESSES FEEDBACK                  │
│         (backend/learningEngine.js)                          │
│         - Records in ai_learning_feedback                   │
│         - Proposes tuning in ai_learning_tuning             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         ADMIN APPROVES TUNING                                │
│         (ai_learning_tuning.approved = TRUE)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         NEXT ANALYSIS USES IMPROVED PARAMETERS               │
│         (Bounded AI learns and improves)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `services/llmBoundedService.js` | Core bounded AI engine | 1-461 |
| `backend/src/routes/chat.js` | Chat integration | 149-426 |
| `backend/src/routes/customers.js` | Creates AI learning tables | 324-373 |
| `backend/learningEngine.js` | Learning feedback processor | 1-186 |
| `backend/src/database/connection.js` | Database connection pool | 1-99 |
| `database/schema.sql` | Shared compliance tables | 1-230 |
| `public/index.html` | Frontend AI learning report | 2705-2767 |

---

## 7. Environment Variables

```bash
# LLM Provider (bounded = rule-based, openai = GPT-4)
LLM_PROVIDER=bounded  # or 'openai'
OPENAI_API_KEY=...    # Only if using advanced engine

# Learning System
LEARN_CRON_ENABLED=true
LEARN_CRON_SPEC=30 2 * * *  # 02:30 AM daily
LEARN_LOOKBACK_DAYS=30
LEARN_MIN_SAMPLES=25
LEARN_MAX_DELTA_SEMANTIC=0.01  # Max change per day

# Database
DATABASE_URL=postgresql://...  # Railway PostgreSQL connection
```

---

## 8. API Endpoints

### Learning & Feedback
- `POST /api/gap/learn/last` - Get last learning trace
- `POST /api/admin/learning/proposals` - List pending tuning proposals
- `POST /api/gap/tuning/:id/approve` - Approve tuning proposal
- `POST /api/gap/tuning/:id/reject` - Reject tuning proposal

### Chat (Bounded AI)
- `POST /api/chat/analyze` - Chat with bounded AI
  - Only uses uploaded documents/standards
  - No external knowledge

### Analysis
- `POST /api/gap/analyze` - Run gap analysis
  - Creates trace in `ai_learning_traces`
  - Uses bounded AI for comparison

---

## 9. Bounded AI Constraints Summary

### ✅ What It CAN Do
- Extract requirements from uploaded documents
- Compare customer procedures to compliance requirements
- Learn from user feedback (within bounds)
- Improve thresholds per standard/clause
- Generate clarifying questions when confidence is low

### ❌ What It CANNOT Do
- Search the internet
- Use external knowledge bases
- Invent or hallucinate requirements
- Reference standards not uploaded
- Make changes > ±0.01 per day (safety limit)

---

## 10. Example: How Bounded AI Learns

1. **Initial Analysis**:
   - AI analyzes AS9100D clause 8.3.2
   - Confidence: 0.75
   - Stores trace in `ai_learning_traces`

2. **User Feedback**:
   - User marks analysis as "incorrect"
   - Provides correction
   - Stored in `ai_learning_feedback`

3. **Learning Process**:
   - Learning engine analyzes feedback
   - Proposes threshold adjustment: 0.75 → 0.76
   - Stored in `ai_learning_tuning` (pending approval)

4. **Admin Approval**:
   - Admin reviews proposal
   - Approves if within bounds
   - `ai_learning_tuning.approved = TRUE`

5. **Next Analysis**:
   - Uses improved threshold (0.76)
   - Better accuracy on similar clauses
   - Cycle continues

---

## Summary

The **Bounded AI** is a deterministic compliance analysis engine that:
- Lives in customer-specific database schemas (`ai_learning_traces`, `ai_learning_feedback`, `ai_learning_tuning`)
- Operates strictly within uploaded compliance documents
- Learns from user feedback with strict safety guardrails
- Improves over time while remaining bounded to the compliance corpus
- Never hallucinates or uses external knowledge

**Key Principle**: All AI operations are traceable, auditable, and constrained to the user's compliance corpus.

