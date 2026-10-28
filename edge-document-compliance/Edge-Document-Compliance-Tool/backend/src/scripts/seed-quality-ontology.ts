/**
 * Seed Quality Ontology
 * 
 * Populates the quality_concepts and quality_concept_relations tables
 * with core Quality concepts, tools, documents, processes, and roles.
 * 
 * Usage:
 *   node backend/src/scripts/seed-quality-ontology.ts
 */

import { queryEdcatAI } from '../config/databases.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedQualityOntology() {
  console.log('\n🌱 Seeding Quality Ontology\n');
  console.log('='.repeat(60));

  try {
    // Read seed data
    const seedPath = join(__dirname, '../../seeds/quality_ontology.json');
    const seedData = JSON.parse(readFileSync(seedPath, 'utf8'));

    let conceptsCreated = 0;
    let conceptsSkipped = 0;
    let relationsCreated = 0;

    // Seed concepts
    console.log(`\n📚 Seeding ${seedData.concepts.length} concepts...\n`);

    for (const concept of seedData.concepts) {
      try {
        // Check if concept already exists
        const existing = await queryEdcatAI(`
          SELECT id FROM edcat.quality_concepts
          WHERE name = $1 AND category = $2
          LIMIT 1
        `, [concept.name, concept.category]);

        if (existing.rows.length > 0) {
          // Update existing
          await queryEdcatAI(`
            UPDATE edcat.quality_concepts
            SET description = $1,
                aliases = $2,
                domain_tags = $3,
                standard_codes = $4,
                updated_at = NOW()
            WHERE name = $5 AND category = $6
          `, [
            concept.description,
            JSON.stringify(concept.aliases || []),
            JSON.stringify(concept.domain_tags || []),
            JSON.stringify(concept.standard_codes || []),
            concept.name,
            concept.category
          ]);
          conceptsSkipped++;
          process.stdout.write(`  ⏭️  Updated: ${concept.name} (${concept.category})\r`);
        } else {
          // Insert new
          await queryEdcatAI(`
            INSERT INTO edcat.quality_concepts
            (id, name, category, description, aliases, domain_tags, standard_codes, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `, [
            uuidv4(),
            concept.name,
            concept.category,
            concept.description,
            JSON.stringify(concept.aliases || []),
            JSON.stringify(concept.domain_tags || []),
            JSON.stringify(concept.standard_codes || [])
          ]);
          conceptsCreated++;
          process.stdout.write(`  ✅ Created: ${concept.name} (${concept.category})\r`);
        }
      } catch (error: any) {
        console.error(`\n  ❌ Error seeding concept ${concept.name}:`, error.message);
      }
    }

    console.log(`\n\n✅ Concepts: ${conceptsCreated} created, ${conceptsSkipped} updated\n`);

    // Seed relations
    console.log(`🔗 Seeding ${seedData.relations.length} relations...\n`);

    for (const relation of seedData.relations) {
      try {
        // Get source and target concept IDs
        const sourceResult = await queryEdcatAI(`
          SELECT id FROM edcat.quality_concepts WHERE name = $1 LIMIT 1
        `, [relation.source]);

        const targetResult = await queryEdcatAI(`
          SELECT id FROM edcat.quality_concepts WHERE name = $1 LIMIT 1
        `, [relation.target]);

        if (sourceResult.rows.length === 0 || targetResult.rows.length === 0) {
          console.warn(`  ⚠️  Skipping relation ${relation.source} → ${relation.target} (concept not found)`);
          continue;
        }

        const sourceId = sourceResult.rows[0].id;
        const targetId = targetResult.rows[0].id;

        // Check if relation already exists
        const existing = await queryEdcatAI(`
          SELECT id FROM edcat.quality_concept_relations
          WHERE source_concept_id = $1 AND target_concept_id = $2 AND relation_type = $3
          LIMIT 1
        `, [sourceId, targetId, relation.relation_type]);

        if (existing.rows.length > 0) {
          // Update existing
          await queryEdcatAI(`
            UPDATE edcat.quality_concept_relations
            SET metadata = $1
            WHERE source_concept_id = $2 AND target_concept_id = $3 AND relation_type = $4
          `, [
            JSON.stringify(relation.metadata || {}),
            sourceId,
            targetId,
            relation.relation_type
          ]);
          process.stdout.write(`  ⏭️  Updated: ${relation.source} → ${relation.target} (${relation.relation_type})\r`);
        } else {
          // Insert new
          await queryEdcatAI(`
            INSERT INTO edcat.quality_concept_relations
            (id, source_concept_id, target_concept_id, relation_type, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
          `, [
            uuidv4(),
            sourceId,
            targetId,
            relation.relation_type,
            JSON.stringify(relation.metadata || {})
          ]);
          relationsCreated++;
          process.stdout.write(`  ✅ Created: ${relation.source} → ${relation.target} (${relation.relation_type})\r`);
        }
      } catch (error: any) {
        console.error(`\n  ❌ Error seeding relation ${relation.source} → ${relation.target}:`, error.message);
      }
    }

    console.log(`\n\n✅ Relations: ${relationsCreated} created\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Quality Ontology Seeding Complete');
    console.log(`   Concepts: ${conceptsCreated + conceptsSkipped} total`);
    console.log(`   Relations: ${relationsCreated} created`);
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQualityOntology()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default seedQualityOntology;

