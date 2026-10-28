/**
 * Seed Script: Vera Query-Response Bank
 * Loads initial Q&A entries from seed file into database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryEdcatAI } from '../config/databases.js';
import VeraQueryResponseService from '../services/vera/VeraQueryResponseService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// Find seed file
function findSeedFile() {
  const possiblePaths = [
    path.join(__dirname, '../../EDCAT AIP/seed/vera_query_response_seed.json'),
    path.join(__dirname, '../../../EDCAT AIP/seed/vera_query_response_seed.json'),
    path.join(process.cwd(), 'backend/EDCAT AIP/seed/vera_query_response_seed.json'),
    path.join(process.cwd(), 'EDCAT AIP/seed/vera_query_response_seed.json'),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

async function seedQueryResponseBank() {
  console.log('\n🌱 Seeding Vera Query-Response Bank...\n');

  const seedFilePath = findSeedFile();
  if (!seedFilePath) {
    console.error('❌ Seed file not found: vera_query_response_seed.json');
    return false;
  }

  try {
    const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));
    const entries = seedData.entries || [];

    console.log(`📋 Found ${entries.length} Q&A entries to seed\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // FIXED: Use proper duplicate check that matches tenant_id exactly
    // The old query was using (tenant_id IS NULL OR tenant_id = $3) which was too permissive
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      try {
        // FIXED: Check if entry exists AND has content
        const existing = await queryEdcatAI(
          `SELECT id, response_text FROM edcat.vera_query_response_bank 
           WHERE user_query_pattern = $1 
           AND category = $2 
           AND persona_code = 'vera'
           AND tenant_id = $3
           LIMIT 1`,
          [entry.user_query_pattern, entry.category, DEFAULT_TENANT_ID]
        );

        if (existing.rows.length > 0) {
          const existingRow = existing.rows[0];
          const hasContent = existingRow.response_text && existingRow.response_text.trim().length > 0;
          
          if (hasContent) {
            // Entry exists with content - skip
            skippedCount++;
            if ((i + 1) % 10 === 0) {
              process.stdout.write(`   Progress: ${i + 1}/${entries.length} (${successCount} created, ${skippedCount} skipped)\r`);
            }
            continue;
          } else {
            // Entry exists but is empty - UPDATE it
            await queryEdcatAI(
              `UPDATE edcat.vera_query_response_bank 
               SET response_text = $1,
                   representative_examples = $2,
                   learning_notes = $3,
                   confidence_score = $4,
                   updated_at = NOW()
               WHERE id = $5`,
              [
                entry.response_template || entry.response_text || '',
                JSON.stringify(entry.representative_examples || []),
                entry.learning_notes ? JSON.stringify(entry.learning_notes) : null,
                entry.confidence_score || 0.8,
                existingRow.id
              ]
            );
            successCount++;
            if ((i + 1) % 10 === 0) {
              process.stdout.write(`   Progress: ${i + 1}/${entries.length} (${successCount} created, ${skippedCount} skipped)\r`);
            }
            continue;
          }
        }

        // Entry doesn't exist, create it
        await VeraQueryResponseService.createQueryResponseEntry({
          tenantId: DEFAULT_TENANT_ID, // Use default tenant for global seed data
          personaCode: 'vera',
          category: entry.category,
          userQueryPattern: entry.user_query_pattern,
          examples: entry.representative_examples || [],
          responseText: entry.response_template || entry.response_text || '',
          responseTemplate: entry.response_template || entry.response_text || '', // Backward compatibility
          learningNotes: entry.learning_notes || null,
          confidenceScore: entry.confidence_score || 0.8,
          userId: null
        });

        successCount++;
        if ((i + 1) % 10 === 0) {
          process.stdout.write(`   Progress: ${i + 1}/${entries.length} (${successCount} created, ${skippedCount} skipped)\r`);
        }
      } catch (error) {
        errorCount++;
        console.error(`\n   ⚠️  Error seeding entry ${i + 1} (${entry.category}):`, error.message);
      }
    }

    console.log(`\n\n✅ Seeding completed:`);
    console.log(`   Created: ${successCount} entries`);
    console.log(`   Skipped: ${skippedCount} entries (already exist)`);
    console.log(`   Errors: ${errorCount} entries\n`);

    return errorCount === 0;
  } catch (error) {
    console.error('❌ Error reading or parsing seed file:', error);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQueryResponseBank()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default seedQueryResponseBank;

