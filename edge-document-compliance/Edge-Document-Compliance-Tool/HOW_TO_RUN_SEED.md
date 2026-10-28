# How to Run the Seed Script

## Quick Start

The seed script loads all Vera knowledge files into the EDCAT AI database. It's **idempotent** (safe to run multiple times).

## Option 1: Run Locally (if connected to Railway DB)

If your local `.env` file has `EDCAT_AI_DATABASE_URL` pointing to Railway:

```bash
npm run seed:personality
```

This will:
- Connect to your Railway EDCAT AI database
- Load all Vera knowledge files from `backend/EDCAT AIP/seed/`
- Populate `ai_policy`, `ai_persona_profile`, and other tables

## Option 2: Run on Railway (Recommended)

### Using Railway CLI:

```bash
railway run npm run seed:personality
```

### Using Railway Dashboard:

1. Go to your Railway project dashboard
2. Open the EDCAT Administrator service
3. Click on "Deployments" or "Shell"
4. Run: `npm run seed:personality`

### Using Railway Web Terminal:

1. Go to Railway dashboard
2. Select your service
3. Click "Shell" or "Terminal"
4. Run: `npm run seed:personality`

## What Gets Loaded

The seed script loads these files into the database:

1. ✅ **vera_persona_profile.json** → `ai_persona_profile` table
2. ✅ **vera_intent_router.json** → `ai_policy` as `vera.intent.router`
3. ✅ **vera_expert_credentials.json** → `ai_policy` as `vera.expert.credentials`
4. ✅ **vera_knowledge_templates.json** → `ai_policy` as `vera.knowledge.templates`
5. ✅ **vera_knowledge_base.json** → `ai_policy` as `vera.knowledge.base`
6. ✅ **vera_enhanced_intents.json** → `ai_policy` as `vera.enhanced.intents`
7. ✅ **vera_training_materials_template.json** → `ai_policy` as `vera.training.materials` (if filled in)

Plus all other personality system files (prompts, templates, validators, etc.)

## Verification

After running, verify the data was loaded:

### Option A: Check via SQL (Railway Database)

Connect to your Railway EDCAT AI database and run:

```sql
-- Check Vera knowledge policies
SELECT 
  name,
  CASE 
    WHEN config IS NULL THEN 'NULL'
    WHEN jsonb_typeof(config) = 'object' THEN 'JSON Object'
    ELSE 'Other'
  END as config_type,
  updated_at
FROM ai_policy 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
  AND name LIKE 'vera.%'
ORDER BY name;
```

You should see entries like:
- `vera.expert.credentials`
- `vera.intent.router`
- `vera.knowledge.templates`
- `vera.knowledge.base`
- `vera.enhanced.intents`

### Option B: Test Vera

Ask Vera:
- "What are your capabilities?" - Should show expert credentials
- "Do you have audit capability?" - Should show audit capabilities
- "What level of education have you completed?" - Should show education info

## Troubleshooting

### Error: "Cannot find module"
- Make sure you're in the project root directory
- Run `npm install` first

### Error: "Database connection failed"
- Check `EDCAT_AI_DATABASE_URL` environment variable is set
- Verify database is accessible from where you're running the script

### Error: "Table does not exist"
- Run migrations first: `npm run migrate:edcat`
- Or ensure `002_edcat_ai_intelligence.sql` migration has been applied

### No output / Script hangs
- Check database connection
- Verify seed files exist in `backend/EDCAT AIP/seed/`
- Check Railway logs for errors

## Expected Output

When the script runs successfully, you should see:

```
✓ Default tenant exists
📋 Seeding 1 personas...
  ✓ vera
📝 Seeding prompts...
  ✓ system.vera.follow_rules
  ✓ system.vera.confidence
  ... (more prompts)
🔧 Seeding policies...
  ✓ vera.intent.router
  ✓ vera.expert.credentials
  ✓ vera.knowledge.templates
  ✓ vera.knowledge.base
  ✓ vera.enhanced.intents
... (more output)
✅ Seed completed successfully!
```

## When to Run

- **After deployment** - To populate Vera's knowledge
- **After adding new knowledge files** - To load them into database
- **After database reset** - To restore Vera's knowledge
- **Anytime** - Safe to run multiple times (idempotent)

## Notes

- The script is **idempotent** - running it multiple times won't create duplicates
- It uses `ON CONFLICT` clauses to update existing records
- All data goes to the **EDCAT AI database** (not Customer Data DB)
- The script automatically creates the default tenant if it doesn't exist

