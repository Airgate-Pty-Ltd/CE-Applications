/**
 * Load Vera Blueprints and Follow Rules
 * JavaScript version of server/seed_loader.ts
 * Idempotent - safe to run multiple times
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryEdcatAI } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDCAT_AIP_DIR = path.join(__dirname, '../../EDCAT AIP');
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Load Vera blueprints and follow rules
 * @param {string} tenantId - Tenant ID (defaults to default tenant)
 * @param {string} baseDir - Base directory for EDCAT AIP files (defaults to '../../EDCAT AIP')
 */
export async function loadVeraBlueprints(tenantId = DEFAULT_TENANT_ID, baseDir = EDCAT_AIP_DIR) {
  const blueprintsDir = path.join(baseDir, 'blueprints');
  const policiesDir = path.join(baseDir, 'policies');
  const promptsDir = path.join(baseDir, 'prompts');

  console.log('📋 Loading Vera blueprints and follow rules...');
  console.log(`   Base directory: ${baseDir}`);
  console.log(`   Tenant ID: ${tenantId}`);

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
    console.log('  ✓ vera.follow.rules policy loaded');
  } else {
    console.warn(`  ⚠️  vera_follow_rules.json not found at ${veraRulesPath}`);
  }

  // Load system follow rules prompt
  const followRulesPromptPath = path.join(promptsDir, 'system.vera.follow_rules.txt');
  if (fs.existsSync(followRulesPromptPath)) {
    const followRulesPrompt = fs.readFileSync(followRulesPromptPath, 'utf8');
    await queryEdcatAI(
      `INSERT INTO ai_prompt (tenant_id, persona_code, kind, name, content, version)
       VALUES ($1, 'vera', 'system', 'system.follow.rules', $2, 'v1')
       ON CONFLICT (tenant_id, persona_code, kind, name)
       DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
      [tenantId, followRulesPrompt]
    );
    console.log('  ✓ system.follow.rules prompt loaded');
  } else {
    console.warn(`  ⚠️  system.vera.follow_rules.txt not found at ${followRulesPromptPath}`);
  }

  // Load blueprints
  if (!fs.existsSync(blueprintsDir)) {
    console.warn(`  ⚠️  Blueprints directory not found: ${blueprintsDir}`);
    return;
  }

  const blueprintFiles = fs.readdirSync(blueprintsDir).filter(f => f.endsWith('.json'));
  console.log(`  Loading ${blueprintFiles.length} blueprint files...`);

  let standardsLoaded = 0;
  let totalClauses = 0;

  for (const file of blueprintFiles) {
    try {
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
      let clausesInserted = 0;
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
          clausesInserted++;
        }
        totalClauses += clausesInserted;
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

      standardsLoaded++;
      console.log(`  ✓ ${std.code} ${std.revision} (${clausesInserted} clauses)`);
    } catch (error) {
      console.error(`  ❌ Error loading ${file}:`, error.message);
    }
  }

  console.log(`\n✅ Blueprints loaded: ${standardsLoaded} standards, ${totalClauses} clauses`);
}

/**
 * Main execution (if run directly)
 */
async function main() {
  try {
    await loadVeraBlueprints();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error loading blueprints:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

