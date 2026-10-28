/**
 * Data Ingestion Script for Compliance Knowledge Pack
 * Converts learning_blocks into embeddings and stores them for the parser
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadKnowledgePack,
  extractLearningBlocks,
  validateKnowledgePack
} from '../services/knowledgePackLoader.js';
import { getEmbeddingService } from '../services/embeddingService.js';
import { query } from '../database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create database table for storing embeddings if it doesn't exist
 */
async function ensureEmbeddingsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS compliance_lib.learning_embeddings (
        id SERIAL PRIMARY KEY,
        learning_block_id VARCHAR(255) UNIQUE NOT NULL,
        standard_code VARCHAR(50) NOT NULL,
        clause_number VARCHAR(50),
        requirement_text TEXT NOT NULL,
        embedding JSONB,
        keywords TEXT[],
        requirement_type VARCHAR(50),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_learning_embeddings_standard 
      ON compliance_lib.learning_embeddings(standard_code)
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_learning_embeddings_clause 
      ON compliance_lib.learning_embeddings(standard_code, clause_number)
    `);

    console.log('✓ Embeddings table ensured');
  } catch (error) {
    console.error('Error creating embeddings table:', error.message);
    throw error;
  }
}

/**
 * Store learning block with embedding in database
 */
async function storeLearningBlock(block, embedding) {
  try {
    await query(`
      INSERT INTO compliance_lib.learning_embeddings (
        learning_block_id,
        standard_code,
        clause_number,
        requirement_text,
        embedding,
        keywords,
        requirement_type,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (learning_block_id) 
      DO UPDATE SET
        requirement_text = EXCLUDED.requirement_text,
        embedding = EXCLUDED.embedding,
        keywords = EXCLUDED.keywords,
        requirement_type = EXCLUDED.requirement_type,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
    `, [
      block.id,
      block.standard_code,
      block.clause_number,
      block.requirement_text,
      JSON.stringify(embedding),
      block.keywords || [],
      block.requirement_type,
      JSON.stringify(block.metadata || {})
    ]);
  } catch (error) {
    console.error(`Error storing learning block ${block.id}:`, error.message);
    throw error;
  }
}

/**
 * Main ingestion function
 */
async function ingestKnowledgePack(knowledgePackPath = null) {
  console.log('🚀 Starting Compliance Knowledge Pack ingestion...\n');

  try {
    // Load knowledge pack
    console.log('📦 Loading knowledge pack...');
    const knowledgePack = loadKnowledgePack(knowledgePackPath);
    
    // Validate structure
    console.log('✓ Validating knowledge pack structure...');
    const validation = validateKnowledgePack(knowledgePack);
    if (!validation.isValid) {
      console.error('❌ Knowledge pack validation failed:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }
    console.log('✓ Knowledge pack structure is valid\n');

    // Extract learning blocks
    console.log('📚 Extracting learning blocks...');
    const learningBlocks = extractLearningBlocks(knowledgePack);
    console.log(`✓ Extracted ${learningBlocks.length} learning blocks\n`);

    // Ensure database table exists
    console.log('🗄️  Ensuring database table...');
    await ensureEmbeddingsTable();
    console.log('✓ Database table ready\n');

    // Initialize embedding service
    console.log('🔧 Initializing embedding service...');
    const embeddingService = getEmbeddingService();
    
    // Build vocabulary for TF-IDF (if using TF-IDF strategy)
    if (learningBlocks.length > 0) {
      console.log('📖 Building vocabulary...');
      embeddingService.buildVocabulary(learningBlocks);
      console.log('✓ Vocabulary built\n');
    }

    // Process learning blocks and generate embeddings
    console.log('🔄 Generating embeddings and storing in database...');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < learningBlocks.length; i++) {
      const block = learningBlocks[i];
      
      try {
        // Generate embedding
        const embedding = await embeddingService.embedLearningBlock(block);
        
        // Store in database
        await storeLearningBlock(block, embedding);
        
        successCount++;
        
        if ((i + 1) % 10 === 0) {
          console.log(`   Processed ${i + 1}/${learningBlocks.length} blocks...`);
        }
      } catch (error) {
        console.error(`   ❌ Error processing block ${block.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Ingestion complete!`);
    console.log(`   Successfully processed: ${successCount} blocks`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} blocks`);
    }

    // Verify stored data
    console.log('\n🔍 Verifying stored data...');
    const result = await query(`
      SELECT COUNT(*) as count, 
             COUNT(DISTINCT standard_code) as standards_count
      FROM compliance_lib.learning_embeddings
    `);
    
    const storedCount = parseInt(result.rows[0].count);
    const standardsCount = parseInt(result.rows[0].standards_count);
    
    console.log(`✓ Verified: ${storedCount} learning blocks stored`);
    console.log(`✓ Standards represented: ${standardsCount}`);

  } catch (error) {
    console.error('\n❌ Ingestion failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const knowledgePackPath = process.argv[2] || null;
  ingestKnowledgePack(knowledgePackPath)
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

export { ingestKnowledgePack, ensureEmbeddingsTable, storeLearningBlock };

