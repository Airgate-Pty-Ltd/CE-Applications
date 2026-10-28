/**
 * Migrate document_content_for_learning from EDCAT AI DB to PostgreSQL
 * 
 * This script:
 * 1. Reads all data from document_content_for_learning in EDCAT AI DB
 * 2. Creates the table in PostgreSQL if it doesn't exist
 * 3. Migrates all data to PostgreSQL
 * 4. Preserves all relationships and metadata
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

async function migrateDocumentContentToPostgres() {
  console.log('\n📦 Migrating document_content_for_learning from EDCAT AI DB to PostgreSQL...\n');
  console.log('='.repeat(70));

  try {
    // Step 1: Create the table in PostgreSQL if it doesn't exist
    console.log('📋 Step 1: Ensuring document_content_for_learning table exists in PostgreSQL...');
    
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS public.document_content_for_learning (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL,
        standard_id UUID REFERENCES public.standards(id) ON DELETE SET NULL,
        standard_code TEXT,
        category TEXT NOT NULL,
        content_text TEXT NOT NULL,
        is_example BOOLEAN DEFAULT false,
        word_count INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Create indexes
    await queryPostgres(`
      CREATE INDEX IF NOT EXISTS idx_doc_content_file ON public.document_content_for_learning(file_id)
    `);
    await queryPostgres(`
      CREATE INDEX IF NOT EXISTS idx_doc_content_standard ON public.document_content_for_learning(standard_id) WHERE standard_id IS NOT NULL
    `);
    await queryPostgres(`
      CREATE INDEX IF NOT EXISTS idx_doc_content_standard_code ON public.document_content_for_learning(standard_code) WHERE standard_code IS NOT NULL
    `);
    await queryPostgres(`
      CREATE INDEX IF NOT EXISTS idx_doc_content_example ON public.document_content_for_learning(is_example) WHERE is_example = true
    `);

    console.log('   ✅ Table created/verified in PostgreSQL\n');

    // Step 2: Count records in EDCAT AI DB
    console.log('📊 Step 2: Counting records in EDCAT AI DB...');
    const countResult = await queryEdcatAI(`
      SELECT COUNT(*) as count FROM document_content_for_learning
    `);
    const totalRecords = parseInt(countResult.rows[0].count);
    console.log(`   Found ${totalRecords} records in EDCAT AI DB\n`);

    if (totalRecords === 0) {
      console.log('⚠️  No records to migrate. Exiting.');
      return;
    }

    // Step 3: Check existing records in PostgreSQL
    console.log('📊 Step 3: Checking existing records in PostgreSQL...');
    const existingResult = await queryPostgres(`
      SELECT COUNT(*) as count FROM public.document_content_for_learning
    `);
    const existingCount = parseInt(existingResult.rows[0].count);
    console.log(`   Found ${existingCount} existing records in PostgreSQL\n`);

    // Step 4: Fetch all records from EDCAT AI DB in batches
    console.log('📥 Step 4: Fetching records from EDCAT AI DB...');
    const batchSize = 1000;
    let offset = 0;
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    while (offset < totalRecords) {
      const batchResult = await queryEdcatAI(`
        SELECT 
          id,
          file_id,
          standard_id,
          standard_code,
          category,
          content_text,
          is_example,
          word_count,
          created_at
        FROM document_content_for_learning
        ORDER BY created_at
        LIMIT $1 OFFSET $2
      `, [batchSize, offset]);

      if (batchResult.rows.length === 0) {
        break;
      }

      console.log(`   Processing batch: ${offset + 1} to ${offset + batchResult.rows.length} of ${totalRecords}...`);

      // Step 5: Insert each record into PostgreSQL
      for (const row of batchResult.rows) {
        try {
          // Check if record already exists (by id or by file_id + standard_id + content_text hash)
          const existingCheck = await queryPostgres(`
            SELECT id FROM public.document_content_for_learning 
            WHERE id = $1 OR (
              file_id = $2 
              AND COALESCE(standard_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE($3::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
              AND LEFT(content_text, 100) = LEFT($4, 100)
            )
            LIMIT 1
          `, [row.id, row.file_id, row.standard_id || null, row.content_text]);

          if (existingCheck.rows.length > 0) {
            skippedCount++;
            continue;
          }

          // Map standard_id from EDCAT AI DB to PostgreSQL standard_id
          // If standard_id exists in EDCAT AI DB, try to find matching standard in PostgreSQL by code
          let postgresStandardId = null;
          if (row.standard_id || row.standard_code) {
            if (row.standard_code) {
              const standardMatch = await queryPostgres(`
                SELECT id FROM public.standards WHERE code = $1 LIMIT 1
              `, [row.standard_code]);
              if (standardMatch.rows.length > 0) {
                postgresStandardId = standardMatch.rows[0].id;
              }
            }
            // If no match by code, try by standard_id (if UUIDs match between DBs)
            if (!postgresStandardId && row.standard_id) {
              const standardMatch = await queryPostgres(`
                SELECT id FROM public.standards WHERE id = $1 LIMIT 1
              `, [row.standard_id]);
              if (standardMatch.rows.length > 0) {
                postgresStandardId = standardMatch.rows[0].id;
              }
            }
          }

          // Insert into PostgreSQL
          await queryPostgres(`
            INSERT INTO public.document_content_for_learning (
              id,
              file_id,
              standard_id,
              standard_code,
              category,
              content_text,
              is_example,
              word_count,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING
          `, [
            row.id,
            row.file_id,
            postgresStandardId,
            row.standard_code,
            row.category,
            row.content_text,
            row.is_example || false,
            row.word_count,
            row.created_at || new Date()
          ]);

          migratedCount++;
        } catch (error) {
          console.error(`   ❌ Error migrating record ${row.id}:`, error.message);
          errorCount++;
        }
      }

      offset += batchResult.rows.length;
    }

    // Step 6: Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ Migration Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   • Total records in EDCAT AI DB: ${totalRecords}`);
    console.log(`   • Records migrated: ${migratedCount}`);
    console.log(`   • Records skipped (already exist): ${skippedCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Final count in PostgreSQL: ${existingCount + migratedCount}\n`);

    // Verify final count
    const finalCount = await queryPostgres(`
      SELECT COUNT(*) as count FROM public.document_content_for_learning
    `);
    console.log(`   ✅ Verified: ${parseInt(finalCount.rows[0].count)} total records in PostgreSQL\n`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run migration
migrateDocumentContentToPostgres()
  .then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });

