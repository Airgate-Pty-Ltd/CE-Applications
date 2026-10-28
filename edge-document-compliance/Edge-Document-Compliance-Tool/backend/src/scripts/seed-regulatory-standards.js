/**
 * Regulatory Standards Seeder
 * 
 * Loads regulatory standards from JSON seed files into the database.
 * Reads regulatory_registry.json and processes each regulation's seed files.
 * 
 * Usage: node backend/src/scripts/seed-regulatory-standards.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { queryPostgres, queryEdcatAI } from '../config/databases.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEEDS_DIR = join(__dirname, '../../edcat-seeds/regulatory');
const REGISTRY_FILE = join(SEEDS_DIR, 'regulatory_registry.json');

/**
 * Load and parse JSON file
 */
function loadJSON(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[seed-regulatory] Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Seed a standard into public.standards
 */
async function seedStandard(regulation) {
  try {
    // Check if standard already exists
    const existing = await queryPostgres(
      `SELECT id FROM public.standards WHERE code = $1`,
      [regulation.code]
    );

    if (existing.rows.length > 0) {
      console.log(`[seed-regulatory] Standard ${regulation.code} already exists, updating...`);
      await queryPostgres(
        `UPDATE public.standards
         SET name = $1,
             sector = $2,
             authority_source = $3,
             updated_at = NOW()
         WHERE code = $4`,
        [regulation.name, regulation.sector, regulation.authority, regulation.code]
      );
      return existing.rows[0].id;
    }

    // Insert new standard
    const result = await queryPostgres(
      `INSERT INTO public.standards
       (code, name, sector, authority_source, status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id`,
      [
        regulation.code,
        regulation.name,
        regulation.sector,
        regulation.authority,
        regulation.status || 'active',
        JSON.stringify({
          jurisdiction: regulation.jurisdiction,
          primary_focus: regulation.primary_focus,
          tags: regulation.tags,
          current_revision_label: regulation.current_revision_label
        })
      ]
    );

    console.log(`[seed-regulatory] ✓ Created standard: ${regulation.code}`);
    return result.rows[0].id;
  } catch (error) {
    console.error(`[seed-regulatory] Error seeding standard ${regulation.code}:`, error.message);
    return null;
  }
}

/**
 * Seed clauses from a detailed seed file (like faa_part21_137.json)
 */
async function seedClauses(standardCode, seedFile) {
  const filePath = join(SEEDS_DIR, seedFile);
  const data = loadJSON(filePath);

  if (!data || !data.clauses) {
    console.log(`[seed-regulatory] No clauses found in ${seedFile}`);
    return;
  }

  console.log(`[seed-regulatory] Processing ${data.clauses.length} clauses from ${seedFile}...`);

  for (const clause of data.clauses) {
    try {
      // Check if clause already exists
      const existing = await queryPostgres(
        `SELECT id FROM public.compliance_requirements
         WHERE standard_code = $1 AND clause_reference = $2`,
        [standardCode, clause.reference]
      );

      if (existing.rows.length > 0) {
        // Update existing
        await queryPostgres(
          `UPDATE public.compliance_requirements
           SET title = $1,
               requirement_text = $2,
               category = $3,
               metadata = $4,
               updated_at = NOW()
           WHERE standard_code = $5 AND clause_reference = $6`,
          [
            clause.short_label,
            clause.requirement_text,
            clause.requirement_type,
            JSON.stringify({
              key_concepts: clause.key_concepts,
              typical_evidence: clause.typical_evidence
            }),
            standardCode,
            clause.reference
          ]
        );
        console.log(`[seed-regulatory]   ✓ Updated clause: ${clause.reference}`);
      } else {
        // Insert new
        await queryPostgres(
          `INSERT INTO public.compliance_requirements
           (standard_code, clause_reference, title, requirement_text, category, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [
            standardCode,
            clause.reference,
            clause.short_label,
            clause.requirement_text,
            clause.requirement_type,
            JSON.stringify({
              key_concepts: clause.key_concepts,
              typical_evidence: clause.typical_evidence
            })
          ]
        );
        console.log(`[seed-regulatory]   ✓ Created clause: ${clause.reference}`);
      }

      // Also add to document_content_for_learning for semantic search
      try {
        const learningContent = `${clause.short_label}\n\n${clause.requirement_text}\n\nKey concepts: ${clause.key_concepts.join(', ')}`;
        
        await queryEdcatAI(
          `INSERT INTO edcat.document_content_for_learning
           (file_id, content_text, standard_code, quality, metadata, word_count, created_at)
           VALUES (gen_random_uuid(), $1, $2, 'approved', $3, $4, NOW())
           ON CONFLICT DO NOTHING`,
          [
            learningContent,
            standardCode,
            JSON.stringify({
              clause_reference: clause.reference,
              requirement_type: clause.requirement_type,
              key_concepts: clause.key_concepts,
              source: 'regulatory_seed'
            }),
            learningContent.split(/\s+/).length
          ]
        );
      } catch (err) {
        // Non-fatal - learning table might not exist or have different structure
        console.warn(`[seed-regulatory] Could not add to learning table:`, err.message);
      }

    } catch (error) {
      console.error(`[seed-regulatory] Error seeding clause ${clause.reference}:`, error.message);
    }
  }
}

/**
 * Seed metadata-only files (like casa_casrs_vol1.json)
 */
async function seedMetadata(standardCode, seedFile) {
  const filePath = join(SEEDS_DIR, seedFile);
  const data = loadJSON(filePath);

  if (!data) {
    return;
  }

  console.log(`[seed-regulatory] Processing metadata from ${seedFile}...`);

  // Store metadata in standards table
  try {
    const existingMetadata = await queryPostgres(
      `SELECT metadata FROM public.standards WHERE code = $1`,
      [standardCode]
    );

    let metadata = {};
    if (existingMetadata.rows.length > 0 && existingMetadata.rows[0].metadata) {
      metadata = typeof existingMetadata.rows[0].metadata === 'string'
        ? JSON.parse(existingMetadata.rows[0].metadata)
        : existingMetadata.rows[0].metadata;
    }

    // Merge in seed file metadata
    metadata.seed_file = seedFile;
    metadata.source_reference = data.source_reference;
    if (data.parts) metadata.parts = data.parts;
    if (data.key_subparts) metadata.key_subparts = data.key_subparts;
    if (data.topic_clusters) metadata.topic_clusters = data.topic_clusters;
    if (data.alignment_hints) metadata.alignment_hints = data.alignment_hints;

    await queryPostgres(
      `UPDATE public.standards
       SET metadata = $1, updated_at = NOW()
       WHERE code = $2`,
      [JSON.stringify(metadata), standardCode]
    );

    console.log(`[seed-regulatory] ✓ Updated metadata for ${standardCode}`);
  } catch (error) {
    console.error(`[seed-regulatory] Error updating metadata:`, error.message);
  }
}

/**
 * Main seeding function
 */
async function seedRegulatoryStandards() {
  console.log('[seed-regulatory] Starting regulatory standards seeding...\n');

  // Load registry
  const registry = loadJSON(REGISTRY_FILE);
  if (!registry || !registry.regulations) {
    console.error('[seed-regulatory] Failed to load registry file');
    process.exit(1);
  }

  console.log(`[seed-regulatory] Found ${registry.regulations.length} regulations in registry\n`);

  // Process each regulation
  for (const regulation of registry.regulations) {
    console.log(`[seed-regulatory] Processing: ${regulation.code}`);
    
    // Seed the standard
    const standardId = await seedStandard(regulation);
    if (!standardId) {
      console.warn(`[seed-regulatory] Skipping ${regulation.code} - failed to create standard`);
      continue;
    }

    // Process seed files
    if (regulation.seed_files && regulation.seed_files.length > 0) {
      for (const seedFile of regulation.seed_files) {
        const filePath = join(SEEDS_DIR, seedFile);
        const seedData = loadJSON(filePath);

        if (!seedData) {
          console.warn(`[seed-regulatory] Could not load ${seedFile}`);
          continue;
        }

        // Check if it has clauses (detailed seed) or is metadata-only
        if (seedData.clauses && seedData.clauses.length > 0) {
          await seedClauses(regulation.code, seedFile);
        } else {
          await seedMetadata(regulation.code, seedFile);
        }
      }
    }

    console.log('');
  }

  console.log('[seed-regulatory] ✓ Regulatory standards seeding complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRegulatoryStandards()
    .then(() => {
      console.log('[seed-regulatory] Done.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[seed-regulatory] Fatal error:', error);
      process.exit(1);
    });
}

export { seedRegulatoryStandards };

