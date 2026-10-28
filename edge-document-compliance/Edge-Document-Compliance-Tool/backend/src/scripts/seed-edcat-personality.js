/**
 * Seed EDCAT AI Personality System
 * Loads all personality data from JSON seed files into EDCAT AI database
 * Idempotent - safe to run multiple times
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryEdcatAI } from '../database/connection.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to seed files
const SEED_DIR = path.join(__dirname, '../../EDCAT AIP/seed');
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Get or create default tenant
 */
async function ensureDefaultTenant() {
  const result = await queryEdcatAI(
    `SELECT tenant_id FROM ai_tenant WHERE name = 'Default EDCAT Tenant' LIMIT 1`
  );
  
  if (result.rows.length === 0) {
    await queryEdcatAI(
      `INSERT INTO ai_tenant (tenant_id, name) VALUES ($1, 'Default EDCAT Tenant')`,
      [DEFAULT_TENANT_ID]
    );
    console.log('✓ Created default tenant');
  } else {
    console.log('✓ Default tenant exists');
  }
  
  return DEFAULT_TENANT_ID;
}

/**
 * Seed personalities from personalities.json
 */
async function seedPersonalities(tenantId) {
  const filePath = path.join(SEED_DIR, 'personalities.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`\n📋 Seeding ${data.personas.length} personas...`);
  
  for (const persona of data.personas) {
    await queryEdcatAI(
      `INSERT INTO ai_persona (
        tenant_id, code, display_name, description, voice, style, capabilities, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
      ON CONFLICT (tenant_id, code) 
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        voice = EXCLUDED.voice,
        style = EXCLUDED.style,
        capabilities = EXCLUDED.capabilities,
        is_default = EXCLUDED.is_default,
        updated_at = NOW()`,
      [
        tenantId,
        persona.code,
        persona.display_name,
        persona.description,
        persona.voice || null,
        JSON.stringify(persona.style),
        JSON.stringify(persona.capabilities),
        persona.is_default || false
      ]
    );
    console.log(`  ✓ ${persona.code} (${persona.display_name})`);
  }
}

/**
 * Seed prompts from prompts_system.json and prompts_more.json
 */
async function seedPrompts(tenantId) {
  // Load prompts_system.json
  const systemFilePath = path.join(SEED_DIR, 'prompts_system.json');
  const systemData = JSON.parse(fs.readFileSync(systemFilePath, 'utf8'));
  
  // Load prompts_more.json (if exists)
  let moreData = { prompts: [] };
  const moreFilePath = path.join(SEED_DIR, 'prompts_more.json');
  if (fs.existsSync(moreFilePath)) {
    moreData = JSON.parse(fs.readFileSync(moreFilePath, 'utf8'));
  }
  
  // Combine all prompts
  const allPrompts = [...(systemData.prompts || []), ...(moreData.prompts || [])];
  
  console.log(`\n💬 Seeding ${allPrompts.length} prompts...`);
  
  for (const prompt of allPrompts) {
    // Check if prompt already exists
    const existing = await queryEdcatAI(
      `SELECT id FROM ai_prompt 
       WHERE tenant_id = $1 AND persona_code = $2 AND kind = $3 AND name = $4`,
      [tenantId, prompt.persona_code, prompt.kind, prompt.name]
    );
    
    if (existing.rows.length === 0) {
      await queryEdcatAI(
        `INSERT INTO ai_prompt (tenant_id, persona_code, kind, name, content, version)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tenantId,
          prompt.persona_code,
          prompt.kind,
          prompt.name,
          prompt.content,
          prompt.version || 'v1'
        ]
      );
      console.log(`  ✓ ${prompt.persona_code}.${prompt.kind}.${prompt.name}`);
    } else {
      // Update existing
      await queryEdcatAI(
        `UPDATE ai_prompt 
         SET content = $1, version = $2, updated_at = NOW()
         WHERE tenant_id = $3 AND persona_code = $4 AND kind = $5 AND name = $6`,
        [
          prompt.content,
          prompt.version || 'v1',
          tenantId,
          prompt.persona_code,
          prompt.kind,
          prompt.name
        ]
      );
      console.log(`  ↻ Updated ${prompt.persona_code}.${prompt.kind}.${prompt.name}`);
    }
  }
}

/**
 * Seed policies from tool_policies.json
 */
async function seedPolicies(tenantId) {
  const filePath = path.join(SEED_DIR, 'tool_policies.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`\n🔒 Seeding tool policies...`);
  
  await queryEdcatAI(
    `INSERT INTO ai_policy (tenant_id, name, config)
     VALUES ($1, 'tool_policies', $2::jsonb)
     ON CONFLICT (tenant_id, name)
     DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
    [tenantId, JSON.stringify(data.policies)]
  );
  console.log(`  ✓ tool_policies`);
}

/**
 * Seed templates from retrieval_templates.json and extraction_templates.json
 */
async function seedTemplates(tenantId) {
  // Load retrieval_templates.json
  const retrievalFilePath = path.join(SEED_DIR, 'retrieval_templates.json');
  const retrievalData = JSON.parse(fs.readFileSync(retrievalFilePath, 'utf8'));
  
  // Load extraction_templates.json (if exists)
  let extractionData = { templates: [] };
  const extractionFilePath = path.join(SEED_DIR, 'extraction_templates.json');
  if (fs.existsSync(extractionFilePath)) {
    extractionData = JSON.parse(fs.readFileSync(extractionFilePath, 'utf8'));
  }
  
  // Combine all templates
  const allTemplates = [...(retrievalData.templates || []), ...(extractionData.templates || [])];
  
  console.log(`\n📝 Seeding ${allTemplates.length} templates...`);
  
  for (const template of allTemplates) {
    await queryEdcatAI(
      `INSERT INTO ai_template (tenant_id, name, kind, template)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET kind = EXCLUDED.kind, template = EXCLUDED.template, updated_at = NOW()`,
      [
        tenantId,
        template.name,
        template.kind,
        JSON.stringify(template.template)
      ]
    );
    console.log(`  ✓ ${template.name} (${template.kind})`);
  }
}

/**
 * Seed validators from validators.json, validators_extras.json, and validators_extraction.json
 */
async function seedValidators(tenantId) {
  // Load validators.json
  const validatorsFilePath = path.join(SEED_DIR, 'validators.json');
  const validatorsData = JSON.parse(fs.readFileSync(validatorsFilePath, 'utf8'));
  
  // Load validators_extras.json (if exists)
  let extrasData = { validators: [] };
  const extrasFilePath = path.join(SEED_DIR, 'validators_extras.json');
  if (fs.existsSync(extrasFilePath)) {
    extrasData = JSON.parse(fs.readFileSync(extrasFilePath, 'utf8'));
  }
  
  // Load validators_extraction.json (if exists)
  let extractionData = { validators: [] };
  const extractionFilePath = path.join(SEED_DIR, 'validators_extraction.json');
  if (fs.existsSync(extractionFilePath)) {
    extractionData = JSON.parse(fs.readFileSync(extractionFilePath, 'utf8'));
  }
  
  // Combine all validators
  const allValidators = [
    ...(validatorsData.validators || []),
    ...(extrasData.validators || []),
    ...(extractionData.validators || [])
  ];
  
  console.log(`\n✅ Seeding ${allValidators.length} validators...`);
  
  for (const validator of allValidators) {
    await queryEdcatAI(
      `INSERT INTO ai_validator (tenant_id, name, config)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [
        tenantId,
        validator.name,
        JSON.stringify(validator)
      ]
    );
    console.log(`  ✓ ${validator.name}`);
  }
}

/**
 * Seed blueprints and Vera follow rules
 */
async function seedBlueprintsAndRules(tenantId) {
  const blueprintsDir = path.join(SEED_DIR, '../blueprints');
  const policiesDir = path.join(SEED_DIR, '../policies');
  const promptsDir = path.join(SEED_DIR, '../prompts');
  
  console.log(`\n📋 Seeding blueprints and Vera rules...`);
  
  // Load Vera follow rules
  const veraRulesPath = path.join(policiesDir, 'vera_follow_rules.json');
  if (fs.existsSync(veraRulesPath)) {
    const veraRules = JSON.parse(fs.readFileSync(veraRulesPath, 'utf8'));
    await queryEdcatAI(
      `INSERT INTO ai_policy (tenant_id, name, config)
       VALUES ($1, 'vera.follow.rules', $2::jsonb)
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantId, JSON.stringify(veraRules)]
    );
    console.log(`  ✓ vera.follow.rules`);
  }
  
  // Load system follow rules prompt
  const followRulesPromptPath = path.join(promptsDir, 'system.vera.follow_rules.txt');
  if (fs.existsSync(followRulesPromptPath)) {
    const followRulesPrompt = fs.readFileSync(followRulesPromptPath, 'utf8');
    // Check if prompt already exists
    const existing = await queryEdcatAI(
      `SELECT id FROM ai_prompt 
       WHERE tenant_id = $1 AND persona_code = $2 AND kind = $3 AND name = $4`,
      [tenantId, 'vera', 'system', 'system.follow.rules']
    );
    
    if (existing.rows.length === 0) {
      await queryEdcatAI(
        `INSERT INTO ai_prompt (tenant_id, persona_code, kind, name, content, version)
         VALUES ($1, 'vera', 'system', 'system.follow.rules', $2, 'v1')`,
        [tenantId, followRulesPrompt]
      );
    } else {
      await queryEdcatAI(
        `UPDATE ai_prompt 
         SET content = $1, version = $2, updated_at = NOW()
         WHERE tenant_id = $3 AND persona_code = $4 AND kind = $5 AND name = $6`,
        [followRulesPrompt, 'v1', tenantId, 'vera', 'system', 'system.follow.rules']
      );
    }
    console.log(`  ✓ system.follow.rules prompt`);
  }
  
  // Load blueprints
  if (fs.existsSync(blueprintsDir)) {
    const blueprintFiles = fs.readdirSync(blueprintsDir).filter(f => f.endsWith('.json'));
    console.log(`  Loading ${blueprintFiles.length} blueprint files...`);
    
    for (const file of blueprintFiles) {
      const blueprintPath = path.join(blueprintsDir, file);
      const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
      const std = blueprint.standard;
      
      // Insert or update standard
      const standardResult = await queryEdcatAI(
        `INSERT INTO ai_standard (tenant_id, code, revision, title, authority, citation_style, parser_profile, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         ON CONFLICT (tenant_id, code, revision)
         DO UPDATE SET title = EXCLUDED.title, authority = EXCLUDED.authority, metadata = EXCLUDED.metadata, updated_at = NOW()
         RETURNING id`,
        [
          tenantId,
          std.code,
          std.revision,
          std.title,
          std.authority || null,
          std.citation_style || null,
          std.parser_profile || null,
          JSON.stringify(std.metadata || {})
        ]
      );
      
      const standardId = standardResult.rows[0].id;
      
      // Insert clauses
      if (blueprint.clauses && blueprint.clauses.length > 0) {
        for (const [i, clause] of blueprint.clauses.entries()) {
          await queryEdcatAI(
            `INSERT INTO ai_clause_blueprint (tenant_id, standard_id, clause_id, label, parent_clause_id, order_index, ontology_tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (tenant_id, standard_id, clause_id)
             DO UPDATE SET label = EXCLUDED.label, parent_clause_id = EXCLUDED.parent_clause_id, order_index = EXCLUDED.order_index, ontology_tags = EXCLUDED.ontology_tags, updated_at = NOW()`,
            [
              tenantId,
              standardId,
              clause.clause_id,
              clause.label || null,
              clause.parent || null,
              clause.order_index ?? i,
              clause.ontology_tags || []
            ]
          );
        }
        console.log(`  ✓ ${std.code} ${std.revision} (${blueprint.clauses.length} clauses)`);
      }
      
      // Insert crosswalk targets
      if (blueprint.crosswalk_targets && blueprint.crosswalk_targets.length > 0) {
        for (const targetFamily of blueprint.crosswalk_targets) {
          await queryEdcatAI(
            `INSERT INTO ai_crosswalk_blueprint (tenant_id, standard_id, target_family)
             VALUES ($1, $2, $3)
             ON CONFLICT (tenant_id, standard_id, target_family) DO NOTHING`,
            [tenantId, standardId, targetFamily]
          );
        }
      }
    }
  }
}

/**
 * Seed routing policies from routing_policies.json and intent_router.json
 */
async function seedRouting(tenantId) {
  // Load routing_policies.json
  const routingFilePath = path.join(SEED_DIR, 'routing_policies.json');
  const routingData = JSON.parse(fs.readFileSync(routingFilePath, 'utf8'));
  
  // Load intent_router.json (if exists) and merge with routing
  let intentRouterData = { routing: [] };
  const intentRouterFilePath = path.join(SEED_DIR, 'intent_router.json');
  if (fs.existsSync(intentRouterFilePath)) {
    intentRouterData = JSON.parse(fs.readFileSync(intentRouterFilePath, 'utf8'));
  }
  
  // Merge routing rules
  const mergedRouting = {
    ...routingData.routing,
    intents: intentRouterData.intents || [],
    intent_routing: intentRouterData.routing || []
  };
  
  console.log(`\n🛣️  Seeding routing policies...`);
  
  await queryEdcatAI(
    `INSERT INTO ai_router (tenant_id, name, rules)
     VALUES ($1, 'default-routing', $2::jsonb)
     ON CONFLICT (tenant_id, name)
     DO UPDATE SET rules = EXCLUDED.rules, updated_at = NOW()`,
    [tenantId, JSON.stringify(mergedRouting)]
  );
  console.log(`  ✓ default-routing`);
  
  // Also store conversation policies if they exist
  const conversationPoliciesPath = path.join(SEED_DIR, 'conversation_policies.json');
  if (fs.existsSync(conversationPoliciesPath)) {
    const conversationData = JSON.parse(fs.readFileSync(conversationPoliciesPath, 'utf8'));
    await queryEdcatAI(
      `INSERT INTO ai_policy (tenant_id, name, config)
       VALUES ($1, 'conversation_policies', $2::jsonb)
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantId, JSON.stringify(conversationData)]
    );
    console.log(`  ✓ conversation_policies`);
  }
}

/**
 * Seed Vera persona profile and intent router for conversational extension
 */
async function seedVeraConversation(tenantId) {
  console.log(`\n💬 Seeding Vera conversational extension...`);
  
  // Seed persona profile
  const personaProfilePath = path.join(SEED_DIR, 'vera_persona_profile.json');
  if (fs.existsSync(personaProfilePath)) {
    const personaProfile = JSON.parse(fs.readFileSync(personaProfilePath, 'utf8'));
    await queryEdcatAI(
      `INSERT INTO ai_persona_profile (tenant_id, persona_code, profile)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (tenant_id, persona_code)
       DO UPDATE SET profile = EXCLUDED.profile, updated_at = NOW()`,
      [tenantId, 'vera', JSON.stringify(personaProfile)]
    );
    console.log(`  ✓ vera_persona_profile`);
  }
  
  // Note: Intent router is already seeded via seedRouting function
  // but we can also store it separately if needed
  const intentRouterPath = path.join(SEED_DIR, 'vera_intent_router.json');
  if (fs.existsSync(intentRouterPath)) {
    const intentRouter = JSON.parse(fs.readFileSync(intentRouterPath, 'utf8'));
    // Store as policy for easy access
    await queryEdcatAI(
      `INSERT INTO ai_policy (tenant_id, name, config)
       VALUES ($1, 'vera.intent.router', $2::jsonb)
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantId, JSON.stringify(intentRouter)]
    );
    console.log(`  ✓ vera_intent_router`);
  }
  
  // Seed expert credentials knowledge base
  const expertCredentialsPath = path.join(SEED_DIR, 'vera_expert_credentials.json');
  if (fs.existsSync(expertCredentialsPath)) {
    const expertCredentials = JSON.parse(fs.readFileSync(expertCredentialsPath, 'utf8'));
      await queryEdcatAI(
        `INSERT INTO ai_policy (tenant_id, name, config)
         VALUES ($1, 'vera.expert.credentials', $2::jsonb)
         ON CONFLICT (tenant_id, name)
         DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
        [tenantId, JSON.stringify(expertCredentials)]
      );
    console.log(`  ✓ vera_expert_credentials`);
  }
  
  // Seed training materials if provided
  const trainingMaterialsPath = path.join(SEED_DIR, 'vera_training_materials_template.json');
  if (fs.existsSync(trainingMaterialsPath)) {
    const trainingMaterials = JSON.parse(fs.readFileSync(trainingMaterialsPath, 'utf8'));
    // Only store if it's been filled in (not just template)
    if (trainingMaterials.training_materials?.cqe_training?.course_provider !== 'ADD YOUR CQE COURSE PROVIDER') {
      await queryEdcatAI(
        `INSERT INTO ai_policy (tenant_id, name, config)
         VALUES ($1, 'vera.training.materials', $2::jsonb)
         ON CONFLICT (tenant_id, name)
         DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
        [tenantId, JSON.stringify(trainingMaterials)]
      );
      console.log(`  ✓ vera_training_materials`);
    }
  }

  // Seed knowledge templates for common compliance scenarios
  const knowledgeTemplatesPath = path.join(SEED_DIR, 'vera_knowledge_templates.json');
  if (fs.existsSync(knowledgeTemplatesPath)) {
    const knowledgeTemplates = JSON.parse(fs.readFileSync(knowledgeTemplatesPath, 'utf8'));
    await queryEdcatAI(
      `INSERT INTO ai_policy (tenant_id, name, config)
       VALUES ($1, 'vera.knowledge.templates', $2::jsonb)
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantId, JSON.stringify(knowledgeTemplates)]
    );
    console.log(`  ✓ vera_knowledge_templates`);
  }

  // Seed knowledge base with domain-specific knowledge
  const knowledgeBasePath = path.join(SEED_DIR, 'vera_knowledge_base.json');
  if (fs.existsSync(knowledgeBasePath)) {
    const knowledgeBase = JSON.parse(fs.readFileSync(knowledgeBasePath, 'utf8'));
    await queryEdcatAI(
      `INSERT INTO ai_policy (tenant_id, name, config)
       VALUES ($1, 'vera.knowledge.base', $2::jsonb)
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantId, JSON.stringify(knowledgeBase)]
    );
    console.log(`  ✓ vera_knowledge_base`);
  }

  // Seed enhanced intents (if different from main intent router)
  const enhancedIntentsPath = path.join(SEED_DIR, 'vera_enhanced_intents.json');
  if (fs.existsSync(enhancedIntentsPath)) {
    const enhancedIntents = JSON.parse(fs.readFileSync(enhancedIntentsPath, 'utf8'));
    await queryEdcatAI(
      `INSERT INTO ai_policy (tenant_id, name, config)
       VALUES ($1, 'vera.enhanced.intents', $2::jsonb)
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantId, JSON.stringify(enhancedIntents)]
    );
    console.log(`  ✓ vera_enhanced_intents`);
  }
}

/**
 * Main seed function
 */
async function main() {
  try {
    console.log('🌱 Seeding EDCAT AI Personality System');
    console.log('='.repeat(60));
    
    // Ensure default tenant exists
    const tenantId = await ensureDefaultTenant();
    
    // Seed all personality data
    await seedPersonalities(tenantId);
    await seedPrompts(tenantId);
    await seedPolicies(tenantId);
    await seedTemplates(tenantId);
    await seedValidators(tenantId);
    await seedRouting(tenantId);
    await seedBlueprintsAndRules(tenantId);
    await seedVeraConversation(tenantId);
    
    console.log('\n📦 Additional seed files loaded:');
    console.log('   - prompts_more.json (confidence, severity, sector prompts)');
    console.log('   - extraction_templates.json');
    console.log('   - validators_extras.json (reasoning chain validator)');
    console.log('   - vera_knowledge_templates.json (workflow templates)');
    console.log('   - vera_knowledge_base.json (domain knowledge)');
    console.log('   - vera_enhanced_intents.json (advanced intents)');
    console.log('   - validators_extraction.json');
    console.log('   - intent_router.json');
    console.log('   - conversation_policies.json');
    console.log('   - blueprints/*.json (standards metadata & clause IDs)');
    console.log('   - policies/vera_follow_rules.json');
    console.log('   - prompts/system.vera.follow_rules.txt');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ EDCAT AI Personality System seeded successfully!');
    console.log(`   Tenant ID: ${tenantId}`);
    
    // Verify counts
    const counts = await queryEdcatAI(`
      SELECT 
        (SELECT COUNT(*) FROM ai_persona WHERE tenant_id = $1) as personas,
        (SELECT COUNT(*) FROM ai_prompt WHERE tenant_id = $1) as prompts,
        (SELECT COUNT(*) FROM ai_policy WHERE tenant_id = $1) as policies,
        (SELECT COUNT(*) FROM ai_template WHERE tenant_id = $1) as templates,
        (SELECT COUNT(*) FROM ai_validator WHERE tenant_id = $1) as validators,
        (SELECT COUNT(*) FROM ai_router WHERE tenant_id = $1) as routers,
        (SELECT COUNT(*) FROM ai_standard WHERE tenant_id = $1) as standards,
        (SELECT COUNT(*) FROM ai_clause_blueprint WHERE tenant_id = $1) as clauses
    `, [tenantId]);
    
    const stats = counts.rows[0];
    console.log(`\n📊 Seeded Data:`);
    console.log(`   Personas: ${stats.personas}`);
    console.log(`   Prompts: ${stats.prompts}`);
    console.log(`   Policies: ${stats.policies}`);
    console.log(`   Templates: ${stats.templates}`);
    console.log(`   Validators: ${stats.validators}`);
    console.log(`   Routers: ${stats.routers}`);
    console.log(`   Standards (blueprints): ${stats.standards}`);
    console.log(`   Clause blueprints: ${stats.clauses}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding personality system:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

