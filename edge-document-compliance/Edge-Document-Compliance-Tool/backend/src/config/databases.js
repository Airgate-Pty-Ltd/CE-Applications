/**
 * Two-Database Configuration
 * 
 * POSTGRESQL: Customer Data Warehouse (DATABASE_URL)
 * EDCAT AI: Compliance Intelligence Engine (EDCAT_AI_DATABASE_URL)
 */

import pg from 'pg';
const { Pool } = pg;

// POSTGRESQL: Customer Data
// CRITICAL: Wrap in try-catch to prevent module load failure
let postgresPool;
let edcatPool;

try {
  postgresPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
} catch (err) {
  console.error('[databases] ⚠️  Failed to create postgresPool (non-fatal):', err.message);
  // Create a dummy pool that will fail gracefully
  postgresPool = null;
}

// EDCAT AI: Intelligence Engine
// Always use SSL for Railway connections
try {
  const edcatConnectionString = process.env.EDCAT_AI_DATABASE_URL || process.env.DATABASE_URL;
  
  // Determine SSL configuration
  let sslConfig = false;
  if (edcatConnectionString) {
    const isRailway = edcatConnectionString.includes('railway') || edcatConnectionString.includes('railway.app');
    const isProduction = process.env.NODE_ENV === 'production';
    if (isRailway || isProduction) {
      sslConfig = { rejectUnauthorized: false };
    }
  }
  
  edcatPool = new Pool({
    connectionString: edcatConnectionString,
    ssl: sslConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Increased timeout for Railway
  });
} catch (err) {
  console.error('[databases] ⚠️  Failed to create edcatPool (non-fatal):', err.message);
  // Create a dummy pool that will fail gracefully
  edcatPool = null;
}

// Helper: Query customer data
export const queryPostgres = (text, params) => {
  if (!postgresPool) {
    throw new Error('PostgreSQL pool not initialized - DATABASE_URL may not be set');
  }
  return postgresPool.query(text, params);
};

// Helper: Query EDCAT AI intelligence
export const queryEdcatAI = (text, params) => {
  if (!edcatPool) {
    throw new Error('EDCAT AI pool not initialized - EDCAT_AI_DATABASE_URL may not be set');
  }
  return edcatPool.query(text, params);
};

// Helper: Check connections
export async function checkConnections() {
  try {
    const pg = await postgresPool.query('SELECT NOW() as now');
    const edcat = await edcatPool.query('SELECT NOW() as now');
    return {
      postgres: 'connected',
      edcatAI: 'connected',
      timestamp: new Date()
    };
  } catch (error) {
    return {
      error: error.message,
      postgres: 'error',
      edcatAI: 'error'
    };
  }
}

// Export pools for direct access if needed
export { postgresPool, edcatPool };

// Default export for backward compatibility (uses customer data DB)
export default {
  query: queryPostgres,
  pool: postgresPool,
  queryPostgres,
  queryEdcatAI,
  postgresPool,
  edcatPool,
  checkConnections
};

