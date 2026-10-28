/**
 * Batch Enrichment Script
 * 
 * Enriches all unenriched learning documents by extracting:
 * - Terminology and definitions
 * - Example classifications
 * - Requirement relationships
 * 
 * Usage:
 *   node backend/src/scripts/enrich-learning-content.js
 *   node backend/src/scripts/enrich-learning-content.js --limit 50
 *   node backend/src/scripts/enrich-learning-content.js --standard AS9100D
 */

import { batchEnrichDocuments } from '../services/vera/VeraKnowledgeEnrichmentService.js';

async function main() {
  console.log('\n🌱 Vera Knowledge Enrichment - Batch Processing\n');
  console.log('='.repeat(60));

  // Parse command line arguments
  const args = process.argv.slice(2);
  let limit = 100;
  let standardCode = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
    } else if (args[i] === '--standard' && args[i + 1]) {
      standardCode = args[i + 1];
    }
  }

  console.log(`Configuration:`);
  console.log(`  Limit: ${limit}`);
  console.log(`  Standard: ${standardCode || 'all'}`);
  console.log('');

  try {
    const result = await batchEnrichDocuments({ limit, standardCode });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Batch Enrichment Complete');
    console.log(`   Enriched: ${result.enriched} documents`);
    console.log(`   Errors: ${result.errors} documents`);
    console.log('='.repeat(60) + '\n');

    process.exit(result.errors > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Batch enrichment failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;

