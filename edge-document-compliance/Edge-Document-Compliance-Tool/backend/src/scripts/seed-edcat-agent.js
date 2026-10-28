/**
 * Seed EDCAT Administrator Agent
 * One-time script to create the AI agent configuration
 */

import { queryEdcatAI } from '../database/connection.js';

const SYSTEM_PROMPT = `You are the bounded EDCAT Administrator. You must:

- Answer only from data in Postgres and approved packs
- Use the command layer to: requirements.list/search/show, docs.search, gap.run, trace.build, export.matrix, explain
- Never fabricate; include source pointers for all regulatory text
- If no pack exists for a requested regulation, enqueue a regs.refresh task for that source`;

const PERSONA_JSON = {
  tone: 'precise',
  jurisdictions: ['FAA', 'EASA', 'AFAC', 'CAAC', 'UK CAA']
};

const CAPABILITIES_JSON = {
  commands: [
    'requirements.list',
    'requirements.search',
    'requirements.show',
    'docs.search',
    'gap.run',
    'trace.build',
    'export.matrix',
    'explain',
    'teach.ingest',
    'health.check'
  ]
};

(async () => {
  try {
    // Use EDCAT AI database
    console.log('🌱 Seeding EDCAT Administrator agent in EDCAT AI database...');

    // Insert or update the agent (schema should already exist from migration)
    const result = await queryEdcatAI(
      `INSERT INTO edcat.ai_agents(code, name, system_prompt, persona_json, capabilities_json)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       ON CONFLICT (code) 
       DO UPDATE SET 
         name = EXCLUDED.name,
         system_prompt = EXCLUDED.system_prompt,
         persona_json = EXCLUDED.persona_json,
         capabilities_json = EXCLUDED.capabilities_json,
         updated_at = NOW()
       RETURNING id, code, name`,
      [
        'edcat-admin',
        'EDCAT Administrator',
        SYSTEM_PROMPT,
        JSON.stringify(PERSONA_JSON),
        JSON.stringify(CAPABILITIES_JSON),
        true  // learning_enabled
      ]
    );

    console.log('✓ EDCAT Administrator agent seeded:');
    console.log(`  ID: ${result.rows[0].id}`);
    console.log(`  Code: ${result.rows[0].code}`);
    console.log(`  Name: ${result.rows[0].name}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding agent:', err);
    process.exit(1);
  }
})();

