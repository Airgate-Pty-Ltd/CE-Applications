# Next Steps: Complete Vera Database Setup

## ✅ Completed
1. Blueprint tables created successfully:
   - `ai_standard`
   - `ai_clause_blueprint`
   - `ai_crosswalk_blueprint`

## 📋 Next Step: Run Seed Script

Run this command in PowerShell:

```powershell
$env:EDCAT_AI_DATABASE_URL='postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway'
npm run seed:personality
```

Or use the PowerShell script:

```powershell
.\run-seed.ps1
```

## What the Seed Script Does

The seed script will load all of Vera's knowledge into the database:

1. **Personalities** - Vera's persona configuration
2. **Prompts** - System prompts for Vera
3. **Policies** - Rules and configurations
4. **Templates** - Retrieval and extraction templates
5. **Validators** - Validation rules
6. **Routers** - Intent routing
7. **Blueprints** - Standard metadata (AS9100D, ISO 9001, etc.)
8. **Vera Knowledge**:
   - Expert credentials (CQE, FAA, FDA, AS9100, ISO 13485, MDSAP)
   - Knowledge templates
   - Knowledge base
   - Enhanced intents
   - Persona profile
   - Intent router

## Expected Output

You should see:
- ✓ Default tenant exists
- ✓ Seeding personas, prompts, policies, templates, validators, routers
- ✓ Seeding blueprints (standards metadata)
- ✓ Seeding Vera conversational extension
- ✓ Final counts of all seeded items

## After Seeding

Once the seed script completes successfully, Vera will have:
- ✅ All her knowledge loaded in the database
- ✅ Blueprint tables ready for standards
- ✅ Expert credentials and capabilities
- ✅ Conversational intelligence
- ✅ All frameworks and rules

Then you can test Vera in the chat interface and she should respond intelligently with her full knowledge base.

