# Deploying Vera's Knowledge Base to Railway

## Problem
Vera has many new knowledge files that aren't in the EDCAT AI database on Railway, preventing her from learning and evolving.

## Solution
Run the seed script to load all Vera knowledge files into the database.

## Steps to Deploy

### Option 1: Run Seed Script Locally (if connected to Railway DB)
```bash
npm run seed:personality
```

### Option 2: Run Seed Script on Railway (Recommended)

1. **SSH into Railway or use Railway CLI:**
   ```bash
   railway run npm run seed:personality
   ```

2. **Or add to startup script:**
   The seed script is idempotent (safe to run multiple times), so you could add it to your startup process.

### Option 3: Manual Database Insert (if scripts don't work)

Connect to your Railway EDCAT AI database and run:
```sql
-- The seed script will handle all inserts automatically
-- But if needed, you can verify with:
SELECT name, updated_at 
FROM ai_policy 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND name LIKE 'vera.%'
ORDER BY name;
```

## Files Being Seeded

The seed script now loads these Vera knowledge files:

1. **vera_persona_profile.json** → `ai_persona_profile` table
2. **vera_intent_router.json** → `ai_policy` as `vera.intent.router`
3. **vera_expert_credentials.json** → `ai_policy` as `vera.expert.credentials`
4. **vera_knowledge_templates.json** → `ai_policy` as `vera.knowledge.templates` ✨ NEW
5. **vera_knowledge_base.json** → `ai_policy` as `vera.knowledge.base` ✨ NEW
6. **vera_enhanced_intents.json** → `ai_policy` as `vera.enhanced.intents` ✨ NEW
7. **vera_training_materials_template.json** → `ai_policy` as `vera.training.materials` (if filled in)

## Verification

After running the seed script, verify with:

```sql
SELECT 
  name,
  CASE 
    WHEN content IS NULL THEN 'NULL'
    WHEN jsonb_typeof(content) = 'object' THEN 'JSON Object'
    ELSE 'Other'
  END as content_type,
  updated_at
FROM ai_policy 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND name LIKE 'vera.%'
ORDER BY name;
```

You should see all 7 knowledge files listed.

## How Vera Accesses Knowledge

The `veraConversationalEngine.js` has been updated to:
1. **First try to load from database** (EDCAT AI database)
2. **Fall back to file system** if database load fails
3. **Use knowledge templates** for workflow guidance
4. **Use knowledge base** for domain-specific information

## Next Steps

1. Run `npm run seed:personality` on Railway
2. Verify the knowledge is loaded
3. Test Vera's responses - she should now have access to:
   - Workflow templates (gap analysis, audit prep, CAPA creation, etc.)
   - Domain knowledge (compliance fundamentals, standards knowledge, audit expertise)
   - Enhanced intents for better conversation handling

## Troubleshooting

If the seed script fails:
1. Check database connection: `EDCAT_AI_DATABASE_URL` environment variable
2. Verify tables exist: `ai_policy`, `ai_persona_profile`
3. Check file paths: Files should be in `backend/EDCAT AIP/seed/`
4. Review logs for specific errors

