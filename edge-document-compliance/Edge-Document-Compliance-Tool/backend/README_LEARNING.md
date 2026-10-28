# EDCAT Learning System

## Overview

The EDCAT learning system continuously improves gap analysis accuracy by learning from user feedback and analysis traces. It runs nightly to propose small, bounded adjustments to tuning parameters.

## Environment Variables

Add these to your `.env` file:

```bash
# Learning System Configuration
LEARN_CRON_ENABLED=true                    # Enable nightly learning scheduler
LEARN_CRON_TZ=America/Boise                # Timezone for scheduler
LEARN_CRON_SPEC=30 2 * * *                 # Cron schedule (02:30 daily)
LEARN_LOOKBACK_DAYS=30                     # Days of history to analyze
LEARN_MIN_SAMPLES=25                       # Minimum traces needed for tuning
LEARN_MAX_DELTA_SEMANTIC=0.01              # Max threshold change per day
LEARN_AUTO_APPROVE_MICRO=true              # Auto-approve tiny changes
LEARN_MICRO_MAX=0.005                      # Max change size for auto-approval
LEARN_REPORT_DIR=./learn-reports           # Directory for Markdown reports
```

## How It Works

### Daily Learning Cycle

1. **02:30 AM (America/Boise)**: Scheduler triggers learning job
2. **Analysis**: Job analyzes last 30 days of traces and feedback
3. **Proposal**: Creates tuning proposals with bounded changes
4. **Auto-approval**: Micro changes (<0.005) auto-approved if enabled
5. **Reports**: Generates Markdown reports for admin review

### Guardrails

- **Hard caps**: Thresholds clamped to [0.78, 0.88] for full, [0.68, 0.80] for partial
- **Max delta**: No more than ±0.01 change per day
- **Minimum samples**: Requires at least 25 traces with 20% feedback rate
- **Per-tenant isolation**: All tunings scoped to (tenant, standard, clause)
- **Audit trail**: Every run records engine_config in traces

### Admin Review

Access proposals via:
- `GET /api/admin/learning/proposals` - List pending proposals
- `POST /api/gap/tuning/:id/approve` - Approve a proposal
- `POST /api/gap/tuning/:id/reject` - Reject a proposal
- `POST /api/gap/tuning/:id/revert` - Revert to previous version
- `GET /api/gap/tuning/history/:tenant_id/:standard_code/:clause_ref` - View history

## Manual Execution

Run the learning job manually:

```bash
npm run learn:run
```

## Reports

Markdown reports are saved to `LEARN_REPORT_DIR` with format:
`{tenant_id}_{standard_code}_{clause_ref}_{timestamp}.md`

Each report includes:
- Proposed changes (thresholds, boosts, penalties)
- Statistics (samples, error rate)
- Rationale (JSON)

## Monitoring

Check learning status:
- `GET /api/gap/learn/last` - Last run info and pending count
- `GET /api/admin/learning/stats` - Learning statistics

## Rollback

To revert a tuning:
1. Get tuning history: `GET /api/gap/tuning/history/...`
2. Find the version to revert to
3. Call: `POST /api/gap/tuning/:id/revert`

This marks the old version as approved and unapproves newer versions.

