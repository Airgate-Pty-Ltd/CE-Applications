/**
 * Diagnose Vera's conversational setup
 * Checks if all required data is in the database
 */

import { queryEdcatAI } from '../database/connection.js';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

async function diagnose() {
  console.log('🔍 Diagnosing Vera\'s Conversational Setup\n');
  console.log('='.repeat(60));

  // Check 1: ai_tenant table
  console.log('\n1. Checking ai_tenant table...');
  try {
    const tenantResult = await queryEdcatAI(
      `SELECT tenant_id, name FROM ai_tenant WHERE tenant_id = $1`,
      [DEFAULT_TENANT_ID]
    );
    if (tenantResult.rows.length > 0) {
      console.log('   ✅ Default tenant exists:', tenantResult.rows[0].name);
    } else {
      console.log('   ❌ Default tenant NOT found');
    }
  } catch (error) {
    console.log('   ❌ Error checking tenant:', error.message);
  }

  // Check 2: ai_persona_profile table
  console.log('\n2. Checking ai_persona_profile table...');
  try {
    const personaResult = await queryEdcatAI(
      `SELECT persona_code, profile FROM ai_persona_profile WHERE tenant_id = $1 AND persona_code = 'vera'`,
      [DEFAULT_TENANT_ID]
    );
    if (personaResult.rows.length > 0) {
      console.log('   ✅ Vera persona profile found');
      const profile = personaResult.rows[0].profile;
      console.log('   📋 Profile keys:', Object.keys(profile || {}).join(', '));
    } else {
      console.log('   ❌ Vera persona profile NOT found');
      console.log('   💡 Run: npm run seed:personality');
    }
  } catch (error) {
    console.log('   ❌ Error checking persona profile:', error.message);
  }

  // Check 3: ai_policy (intent router, expert credentials, knowledge)
  console.log('\n3. Checking ai_policy (Vera knowledge)...');
  const requiredPolicies = [
    'vera.intent.router',
    'vera.expert.credentials',
    'vera.knowledge.templates',
    'vera.knowledge.base',
    'vera.enhanced.intents',
    'vera.follow.rules'
  ];
  
  for (const policyName of requiredPolicies) {
    try {
      const policyResult = await queryEdcatAI(
        `SELECT name, config FROM ai_policy WHERE tenant_id = $1 AND name = $2`,
        [DEFAULT_TENANT_ID, policyName]
      );
      if (policyResult.rows.length > 0) {
        console.log(`   ✅ ${policyName}`);
      } else {
        console.log(`   ❌ ${policyName} NOT found`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error checking ${policyName}:`, error.message);
    }
  }

  // Check 4: ai_prompt (system prompts)
  console.log('\n4. Checking ai_prompt (system prompts)...');
  try {
    const promptResult = await queryEdcatAI(
      `SELECT name, kind FROM ai_prompt WHERE tenant_id = $1 AND persona_code = 'vera'`,
      [DEFAULT_TENANT_ID]
    );
    if (promptResult.rows.length > 0) {
      console.log(`   ✅ Found ${promptResult.rows.length} prompts`);
      promptResult.rows.slice(0, 5).forEach(row => {
        console.log(`      - ${row.kind}: ${row.name}`);
      });
    } else {
      console.log('   ❌ No prompts found for Vera');
    }
  } catch (error) {
    console.log('   ❌ Error checking prompts:', error.message);
  }

  // Check 5: ai_conversation_state table
  console.log('\n5. Checking ai_conversation_state table...');
  try {
    const stateResult = await queryEdcatAI(
      `SELECT COUNT(*) as count FROM ai_conversation_state WHERE tenant_id = $1`,
      [DEFAULT_TENANT_ID]
    );
    console.log(`   ✅ Table exists, ${stateResult.rows[0].count} conversation states`);
  } catch (error) {
    console.log('   ❌ Error checking conversation state:', error.message);
  }

  // Check 6: Seed files exist
  console.log('\n6. Checking seed files on disk...');
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const seedDir = path.join(__dirname, '../../EDCAT AIP/seed');
  
  const requiredSeedFiles = [
    'vera_persona_profile.json',
    'vera_intent_router.json',
    'vera_expert_credentials.json',
    'vera_knowledge_base.json',
    'vera_knowledge_templates.json',
    'vera_enhanced_intents.json'
  ];
  
  for (const filename of requiredSeedFiles) {
    const filePath = path.join(seedDir, filename);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${filename}`);
    } else {
      console.log(`   ❌ ${filename} NOT found`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 If any items show ❌, run: npm run seed:personality');
  console.log('   This will load all of Vera\'s knowledge into the database.\n');
}

diagnose().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

