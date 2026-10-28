/**
 * Create standard_files table in Customer Data DB
 * This table stores file metadata and links to standards
 */

import { queryPostgres } from '../config/databases.js';

async function createStandardFilesTable() {
  console.log('🔧 Creating standard_files table in Customer Data DB...\n');
  
  try {
    // Check if table already exists
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'standard_files'
      ) as exists
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Table public.standard_files already exists');
      
      // Check structure
      const columns = await queryPostgres(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'standard_files'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Current table structure:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
      
      return;
    }
    
    console.log('📝 Creating table...');
    
    // Create the table with the correct schema
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS public.standard_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(512) NOT NULL,
        file_size BIGINT NOT NULL DEFAULT 0,
        file_type VARCHAR(50),
        file_category VARCHAR(50) NOT NULL,
        standard_id UUID NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        parsed_at TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Created table public.standard_files');
    
    // Create indexes for performance
    console.log('📝 Creating indexes...');
    
    await queryPostgres(`
      CREATE INDEX IF NOT EXISTS idx_standard_files_standard_id 
      ON public.standard_files(standard_id)
    `);
    
    await queryPostgres(`
      CREATE INDEX IF NOT EXISTS idx_standard_files_file_category 
      ON public.standard_files(file_category)
    `);
    
    await queryPostgres(`
      CREATE INDEX IF NOT EXISTS idx_standard_files_uploaded_at 
      ON public.standard_files(uploaded_at DESC)
    `);
    
    console.log('✅ Created indexes');
    
    // Verify table structure
    const columns = await queryPostgres(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'standard_files'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table structure:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Test write
    console.log('\n🧪 Testing write operation...');
    await queryPostgres('BEGIN');
    try {
      const testResult = await queryPostgres(`
        INSERT INTO public.standard_files 
        (id, file_name, file_path, file_size, file_type, file_category, standard_id, uploaded_at)
        VALUES (gen_random_uuid(), 'TEST_FILE', '/test/path', 0, 'test', 'test', gen_random_uuid(), NOW())
        RETURNING id
      `);
      await queryPostgres('ROLLBACK');
      console.log('✅ Write test passed');
    } catch (error) {
      await queryPostgres('ROLLBACK');
      console.error('❌ Write test failed:', error.message);
      throw error;
    }
    
    console.log('\n✅ standard_files table is ready!');
    
  } catch (error) {
    console.error('\n❌ Error creating table:', error);
    throw error;
  }
}

// Run
createStandardFilesTable()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });

