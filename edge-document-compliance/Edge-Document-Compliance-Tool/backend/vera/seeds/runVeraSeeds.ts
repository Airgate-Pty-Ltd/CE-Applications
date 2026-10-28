/**
 * Vera Seed Runner
 * 
 * Main script to run all Vera knowledge seeding functions.
 * This populates Vera's knowledge base with concepts, enrichments, profiles, rules, boundaries, and templates.
 * 
 * Usage: npm run seed:vera
 * Or: ts-node backend/vera/seeds/runVeraSeeds.ts
 */

import dotenv from 'dotenv';
import { queryEdcatAI } from '../../src/config/databases.js';
import { seedConcepts } from './conceptSeeds.js';
import { seedContextualEnrichment } from './contextualEnrichmentSeeds.js';
import { seedStandardProfiles } from './standardProfileSeeds.js';
import { seedClarificationRules } from './clarificationRuleSeeds.js';
import { seedKnowledgeBoundaries } from './knowledgeBoundarySeeds.js';
import { seedResponseTemplates } from './responseTemplateSeeds.js';

// Load environment variables
dotenv.config();

const SEED_FUNCTIONS = [
  { name: 'Concepts', fn: seedConcepts },
  { name: 'Contextual Enrichment', fn: seedContextualEnrichment },
  { name: 'Standard Profiles', fn: seedStandardProfiles },
  { name: 'Clarification Rules', fn: seedClarificationRules },
  { name: 'Knowledge Boundaries', fn: seedKnowledgeBoundaries },
  { name: 'Response Templates', fn: seedResponseTemplates }
];

async function runAllSeeds() {
  console.log('═══════════════════════════════════════════════');
  console.log('  VERA KNOWLEDGE SEEDING');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  // Test database connection
  try {
    await queryEdcatAI('SELECT NOW() as test');
    console.log('✅ Database connection verified');
    console.log('');
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.error('');
    console.error('Please ensure EDCAT_AI_DATABASE_URL is set correctly.');
    process.exit(1);
  }

  const results = {
    successful: [] as string[],
    failed: [] as string[],
    totalInserted: 0,
    totalSkipped: 0
  };

  // Run each seed function
  for (const { name, fn } of SEED_FUNCTIONS) {
    try {
      console.log(`[${name}] Starting...`);
      await fn(queryEdcatAI);
      results.successful.push(name);
      console.log(`[${name}] ✅ Complete`);
      console.log('');
    } catch (error: any) {
      console.error(`[${name}] ❌ Failed:`, error.message);
      console.error('');
      results.failed.push(name);
    }
  }

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log('  SEEDING SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Successful: ${results.successful.length} / ${SEED_FUNCTIONS.length}`);
  console.log(`   ${results.successful.join(', ')}`);
  
  if (results.failed.length > 0) {
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`   ${results.failed.join(', ')}`);
    process.exit(1);
  } else {
    console.log('');
    console.log('🎉 All seeds completed successfully!');
    console.log('');
    console.log('Vera\'s knowledge base is now populated with:');
    console.log('  • Aerospace and quality management concepts');
    console.log('  • Contextual enrichment for key clauses');
    console.log('  • Standard profiles (AS9100, AS9110, ISO 9001, etc.)');
    console.log('  • Clarification rules for uncertain mappings');
    console.log('  • Knowledge boundaries for safe operation');
    console.log('  • Response templates for consistent communication');
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('runVeraSeeds')) {
  runAllSeeds().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllSeeds };

