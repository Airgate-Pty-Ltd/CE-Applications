const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const LEGACY_RESET_SQL = `
DROP TABLE IF EXISTS edcat_tenants;
DROP TABLE IF EXISTS edcat_profiles;
DROP TABLE IF EXISTS gaps;
DROP TABLE IF EXISTS gap_analysis_results;
DROP TABLE IF EXISTS document_requirement_mappings;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS requirements;
DROP TABLE IF EXISTS standards;
DROP TABLE IF EXISTS requirement_sets;
`;

async function detectLegacySchema(client) {
  try {
    const { rows: assessmentIdType } = await client.query(
      `SELECT data_type FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'id'`
    );

    if (assessmentIdType.length) {
      const type = assessmentIdType[0]?.data_type;
      if (type && type.toLowerCase() !== 'uuid') {
        return true;
      }
    }

    const { rows: legacyRequirementsColumns } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'standard_id'`
    );

    if (legacyRequirementsColumns.length) {
      return true;
    }

    return false;
  } catch (err) {
    console.warn('⚠️  Failed legacy schema detection check:', err.message);
    return false;
  }
}

function shouldResetLegacySchema(error) {
  if (!error || !error.message) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('gaps_assessment_id_fkey') || msg.includes('column "name" does not exist');
}

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/edge_compliance',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000 to 10000 for Railway
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
  // Don't exit - let the connection pool try to recover
  // Only log the error for monitoring
});

// Initialize database schema with retry logic
async function initializeDatabase(retries = 3) {
  let lastError;
  let legacyResetAttempted = false;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Initializing database schema (attempt ${attempt}/${retries})...`);
      const client = await pool.connect();

      try {
        if (!legacyResetAttempted) {
          const legacyDetected = await detectLegacySchema(client);
          if (legacyDetected) {
            legacyResetAttempted = true;
            console.warn('⚠️  Legacy schema detected prior to initialization. Dropping legacy tables.');
            await client.query(LEGACY_RESET_SQL);
            console.log('🧹 Legacy tables removed. Proceeding with schema initialization...');
          }
        }

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        await client.query(schema);
        console.log('✅ Database schema initialized successfully');
        return; // Success!
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error;
      console.error(`❌ Error initializing database (attempt ${attempt}/${retries}):`, error.message);

      if (!legacyResetAttempted && shouldResetLegacySchema(error)) {
        legacyResetAttempted = true;
        console.warn('⚠️  Legacy schema detected. Dropping legacy tables and retrying initialization.');
        try {
          await pool.query(LEGACY_RESET_SQL);
          console.log('🧹 Legacy tables removed. Retrying schema initialization...');
          attempt--; // retry current attempt without incrementing counter
          continue;
        } catch (resetError) {
          console.error('❌ Failed to reset legacy schema:', resetError.message);
        }
      }

      if (attempt < retries) {
        const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError; // All retries failed
}

// Helper function for queries with error handling
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error: error.message });
    throw error;
  }
}

// Transaction helper
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  transaction,
  initializeDatabase
};
