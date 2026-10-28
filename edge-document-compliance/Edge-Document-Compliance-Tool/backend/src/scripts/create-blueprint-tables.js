/**
 * Directly create blueprint tables
 * This bypasses the migration file parsing issues
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const BLUEPRINT_TABLES_SQL = `
-- Blueprint tables for standards metadata and clause IDs
CREATE TABLE IF NOT EXISTS ai_standard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ai_tenant(tenant_id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  revision TEXT NOT NULL,
  title TEXT NOT NULL,
  authority TEXT,
  citation_style TEXT,
  parser_profile TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code, revision)
);

CREATE INDEX IF NOT EXISTS idx_ai_standard_code ON ai_standard(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_ai_standard_authority ON ai_standard(tenant_id, authority);

CREATE TABLE IF NOT EXISTS ai_clause_blueprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ai_tenant(tenant_id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES ai_standard(id) ON DELETE CASCADE,
  clause_id TEXT NOT NULL,
  label TEXT,
  parent_clause_id TEXT,
  order_index INT NOT NULL,
  ontology_tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, standard_id, clause_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_clause_blueprint_standard ON ai_clause_blueprint(tenant_id, standard_id);
CREATE INDEX IF NOT EXISTS idx_ai_clause_blueprint_parent ON ai_clause_blueprint(tenant_id, standard_id, parent_clause_id);

CREATE TABLE IF NOT EXISTS ai_crosswalk_blueprint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ai_tenant(tenant_id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES ai_standard(id) ON DELETE CASCADE,
  target_family TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, standard_id, target_family)
);

CREATE INDEX IF NOT EXISTS idx_ai_crosswalk_blueprint_standard ON ai_crosswalk_blueprint(tenant_id, standard_id);
`;

async function main() {
  console.log('🚀 Creating Blueprint Tables Directly\n');
  console.log('='.repeat(60));

  if (!process.env.EDCAT_AI_DATABASE_URL) {
    console.error('❌ EDCAT_AI_DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.EDCAT_AI_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // First, verify ai_tenant exists
    console.log('\n📋 Checking prerequisites...');
    const tenantCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ai_tenant'
    `);

    if (tenantCheck.rows.length === 0) {
      console.error('❌ ai_tenant table does not exist!');
      console.error('   Please run the full migration first.');
      await pool.end();
      process.exit(1);
    }
    console.log('   ✅ ai_tenant table exists');

    // Execute the SQL directly
    console.log('\n📦 Creating blueprint tables...');
    await pool.query(BLUEPRINT_TABLES_SQL);
    console.log('   ✅ Tables created successfully');

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('ai_standard', 'ai_clause_blueprint', 'ai_crosswalk_blueprint')
      ORDER BY table_name
    `);

    if (tableCheck.rows.length === 3) {
      console.log('   ✅ All blueprint tables created:');
      tableCheck.rows.forEach(row => {
        console.log(`      - ${row.table_name}`);
      });
    } else {
      console.error(`   ⚠️  Expected 3 tables, found ${tableCheck.rows.length}`);
      tableCheck.rows.forEach(row => {
        console.log(`      - ${row.table_name}`);
      });
    }

    await pool.end();
    console.log('\n' + '='.repeat(60));
    console.log('✅ Blueprint tables creation completed!');
    console.log('📋 Next step: Run the seed script to load blueprints');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating tables:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('\n💡 Tip: Make sure ai_tenant table exists first.');
    }
    await pool.end();
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

