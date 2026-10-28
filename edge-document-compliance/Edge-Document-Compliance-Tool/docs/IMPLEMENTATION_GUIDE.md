# Implementation Guide: Parser & Gap Analyzer Learning System

## Overview

This guide walks through integrating the enhanced parser and gap analyzer learning system into your EDCAT application.

## Step 1: Database Migrations

### 1.1 Migrations are automatically applied

When a customer is created, the learning migrations are automatically run via `runLearningMigrations()` in `backend/src/routes/customers.js`.

### 1.2 Run migrations for existing customers

For existing customers, run manually:

```bash
# For each customer schema
psql -U postgres -d edcat -c "
  -- Replace \${schemaName} with actual schema name (e.g., customer_abc_v1)
  -- Run migration 001 and 002
"
```

Or use the migration script directly:

```javascript
// In Node.js REPL or script
import { query } from './backend/src/database/connection.js';
import fs from 'fs';

const schemaName = 'customer_abc_v1'; // Replace with actual schema
const migration1 = fs.readFileSync('./database/migrations/001_parser_gap_learning_schema.sql', 'utf8');
const migration2 = fs.readFileSync('./database/migrations/002_create_learning_indexes.sql', 'utf8');

// Replace ${schemaName} and execute
const script1 = migration1.replace(/\$\{schemaName\}/g, schemaName);
const script2 = migration2.replace(/\$\{schemaName\}/g, schemaName);

// Execute statements
for (const stmt of script1.split(';').filter(s => s.trim())) {
  await query(stmt.trim());
}
for (const stmt of script2.split(';').filter(s => s.trim())) {
  await query(stmt.trim());
}
```

## Step 2: Services

### 2.1 Learning Engine

The learning engine (`backend/src/services/learningEngine.js`) is already created and provides:
- `analyzeParserPerformance()` - Analyzes parser feedback trends
- `analyzeGapAnalyzerPerformance()` - Analyzes gap analyzer feedback trends
- `learnTerminology()` - Extracts terminology patterns from confirmed matches
- `proposeTunings()` - Generates tuning proposals with safety guardrails
- `updateTerminologySynonyms()` - Updates gap analyzer with learned synonyms

### 2.2 Enhanced LLM Bounded Service

The existing `services/llmBoundedService.js` can be enhanced to store traces. See the implementation package for the enhanced version that:
- Stores parser traces when extracting requirements
- Stores gap analysis traces when analyzing coverage
- Uses learned tunings from database
- Records decision paths for audit trail

## Step 3: API Routes

### 3.1 Feedback Routes

The feedback routes (`backend/src/routes/feedback.js`) are already created and registered:
- `POST /api/feedback/parser/:traceId` - Submit parser feedback
- `POST /api/feedback/gap/:traceId` - Submit gap analysis feedback
- `GET /api/feedback/learning-progress` - Get learning statistics

### 3.2 Learning Routes

The learning routes (`backend/src/routes/learning.js`) are already created and registered:
- `GET /api/learning/pending-tunings` - List pending tuning proposals
- `POST /api/learning/approve-tuning/:tuningId` - Approve a tuning proposal
- `GET /api/learning/history` - Get learning history

## Step 4: Nightly Learning Script

### 4.1 Set up scheduled job

The enhanced `backend/src/scripts/learnNightly.js` is already created.

#### Option A: Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add line (runs at 2:30 AM daily)
30 2 * * * cd /path/to/project && node backend/src/scripts/learnNightly.js >> logs/learning.log 2>&1
```

#### Option B: Node scheduler (within app)

```javascript
// In your main server file (backend/index.js)
import cron from 'node-cron';
import './src/scripts/learnNightly.js'; // Import to register

// Or call directly:
import { runNightlyLearning } from './src/scripts/learnNightly.js';

// Run at 2:30 AM UTC daily
cron.schedule('30 2 * * *', () => {
  console.log('🌙 Starting nightly learning...');
  runNightlyLearning();
});
```

#### Option C: PM2 (Production recommended)

```bash
pm2 start backend/src/scripts/learnNightly.js --name "learning" --cron "30 2 * * *"
pm2 save
```

### 4.2 Environment variables

Add to `.env`:

```bash
# Learning system config
LEARN_CRON_ENABLED=true
LEARN_CRON_SPEC="30 2 * * *"  # 2:30 AM UTC
LEARN_LOOKBACK_DAYS=30
LEARN_MIN_SAMPLES=20
LEARN_MAX_DELTA_SEMANTIC=0.01  # Max threshold change per day
```

## Step 5: Frontend Integration

### 5.1 Add LearningProgress component

Create `public/components/LearningProgress.jsx` (see implementation package)

### 5.2 Integrate into analysis display

In your analysis results page, add feedback UI:

```javascript
// After displaying analysis results
import LearningProgress from './components/LearningProgress';

// In your component
<LearningProgress 
  analysisId={analysisId} 
  traceId={traceId} 
  traceType="parser"  // or "gap"
/>
```

## Step 6: Update EDCAT to Store Traces

### 6.1 Modify parser calls

When extracting requirements, store traces:

```javascript
// In your parser service
import { extractRequirementsBounded } from '../services/llmBoundedService.js';

// After parsing, store trace
const traceId = await storeParserTrace(
  requirement,
  standardCode,
  documentText,
  tuning,
  schemaName
);
```

### 6.2 Modify gap analysis calls

When analyzing gaps, store traces:

```javascript
// In your gap analysis service
const result = await runGapAnalysisTask(
  requirementId,
  procedureId,
  analysisId,
  standardCode,
  customerId,
  schemaName
);

// Result includes traceId for feedback collection
const traceId = result.gapTraceId;
```

## Step 7: Testing

### 7.1 Test parser trace storage

```javascript
// Upload a standard and parse it
// Check database:
SELECT COUNT(*) FROM customer_abc_v1.parser_traces;
```

### 7.2 Test gap analysis trace storage

```javascript
// Run a gap analysis
// Check database:
SELECT COUNT(*) FROM customer_abc_v1.gap_analysis_traces;
```

### 7.3 Test feedback submission

```javascript
// Submit feedback through UI
// Check database:
SELECT COUNT(*) FROM customer_abc_v1.parser_feedback;
SELECT COUNT(*) FROM customer_abc_v1.gap_analysis_feedback;
```

### 7.4 Test learning script

```bash
# Run learning script manually
node backend/src/scripts/learnNightly.js

# Should output:
# - Parser improvements found
# - Gap analyzer improvements found
# - Terminology learned
# - Tunings proposed
```

## Step 8: Monitoring

### 8.1 Check learning progress endpoint

```bash
curl "http://localhost:5000/api/feedback/learning-progress?customerId=abc_corp"

# Response:
# {
#   "learning_stats": [...],
#   "recent_tunings": [...],
#   "summary": {
#     "total_learning_events": 150,
#     "avg_improvement": 0.052
#   }
# }
```

### 8.2 View pending tunings

```bash
curl "http://localhost:5000/api/learning/pending-tunings?customerId=abc_corp"
```

### 8.3 Approve tunings manually

```bash
curl -X POST "http://localhost:5000/api/learning/approve-tuning/[tuning-id]" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "abc_corp",
    "analyzerType": "parser",
    "approvedBy": "admin@company.com"
  }'
```

## Step 9: Production Checklist

- [ ] Database migrations applied to all customer schemas
- [ ] Enhanced llmBoundedService.js deployed (if enhanced version used)
- [ ] learningEngine.js deployed
- [ ] Feedback and learning API routes working
- [ ] Nightly learning script scheduled
- [ ] Learning progress component integrated (if using React)
- [ ] Tests passing (parser traces, gap traces, feedback)
- [ ] Monitoring set up
- [ ] Team trained on new learning system
- [ ] Documentation updated

## Troubleshooting

### Parser traces not being stored

- Check: Is `schemaName` parameter passed correctly?
- Check: Are database permissions correct?
- Check: Run `SELECT * FROM ${schemaName}.parser_traces LIMIT 1;`

### Feedback not being submitted

- Check: Is feedback API endpoint accessible?
- Check: Browser console for errors
- Check: Customer ID being sent correctly

### Learning script not running

- Check: Is cron job scheduled correctly? `crontab -l`
- Check: Are permissions correct?
- Check: Check logs: `tail -f logs/learning.log`

### Tunings not being approved

- Check: Are tunings in database? `SELECT * FROM ${schemaName}.parser_tuning;`
- Check: Is approval endpoint being called?
- Check: Browser network tab for errors

## Next Steps

1. Deploy to staging and test with 1-2 customers
2. Monitor learning metrics for 2 weeks
3. Gather feedback from users
4. Deploy to production for all customers
5. Continue monitoring and iterating

## Support

For issues or questions:
- Check EDCAT logs: `journalctl -u edcat -f`
- Review learning script output: `tail -f logs/learning.log`
- Query database directly for traces
- Reach out to your development team

---

**System Ready! Start collecting feedback and watch your bounded AI improve daily.**

