/**
 * Database Connection Pool
 * Handles TWO PostgreSQL connections:
 * 1. Customer Data DB (DATABASE_URL) - client documents, procedures, results
 * 2. EDCAT AI DB (EDCAT_AI_DATABASE_URL) - standards, requirements, learning
 */

import { queryPostgres, queryEdcatAI, postgresPool, edcatPool, checkConnections } from '../config/databases.js';
import dotenv from 'dotenv';

dotenv.config();

let pool = null;  // Backward compatibility - defaults to customer data

/**
 * Create database connection pools
 */
function createPool() {
  if (!process.env.DATABASE_URL) {
    console.log('[db] ⚠️  DATABASE_URL not set - database features disabled');
    return null;
  }

  console.log('[db] 🔌 Creating TWO database connection pools...');
  
  try {
    // Use customer data pool as default for backward compatibility
    pool = postgresPool;

    // Log connection events for customer data
    postgresPool.on('connect', () => {
      console.log('[db] ✅ Customer Data DB client connected');
    });

    postgresPool.on('error', (err) => {
      console.error('[db] ❌ Customer Data DB pool error:', err.message);
    });

    // Log connection events for EDCAT AI
    edcatPool.on('connect', () => {
      console.log('[db] ✅ EDCAT AI DB client connected');
    });

    edcatPool.on('error', (err) => {
      console.error('[db] ❌ EDCAT AI DB pool error:', err.message);
    });

    // Test both connections (non-blocking)
    Promise.all([
      postgresPool.query('SELECT NOW()'),
      edcatPool.query('SELECT NOW()')
    ])
      .then(() => {
        console.log('[db] ✅ Both database connections verified (Customer Data + EDCAT AI)');
      })
      .catch((err) => {
        console.error('[db] ⚠️  Database connection test failed:', err.message);
        console.error('[db]    Server will continue, but database features may not work');
      });

    return pool;
  } catch (error) {
    console.error('[db] ❌ Failed to create pool:', error.message);
    return null;
  }
}

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
export async function query(text, params) {
  // Ensure pool is initialized (non-blocking)
  if (!pool) {
    await initializePoolAsync();
  }
  
  if (!pool) {
    const errorMsg = 'Database not configured - DATABASE_URL not set';
    console.error('[db] ❌', errorMsg);
    console.error('[db]    DATABASE_URL:', process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET');
    throw new Error(errorMsg);
  }
  
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('[db] ❌ Query error:', error.message);
    console.error('[db]    Query:', text.substring(0, 100));
    console.error('[db]    Error code:', error.code);
    console.error('[db]    Error detail:', error.detail);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<pg.PoolClient>} Database client
 */
export async function getClient() {
  if (!pool) {
    throw new Error('Database not configured - DATABASE_URL not set');
  }
  return await pool.connect();
}

// CRITICAL FIX: Initialize pool asynchronously to prevent blocking module load
// This allows the server to start even if database connection fails
// The pool will be created on first use or in background
let poolInitialized = false;

async function initializePoolAsync() {
  if (!poolInitialized) {
    try {
      pool = createPool();
      poolInitialized = true;
      console.log('[db] ✅ Database pool initialized (async)');
    } catch (err) {
      console.error('[db] ⚠️  Failed to initialize pool (non-fatal):', err.message);
      // Don't throw - allow server to start
    }
  }
  return pool;
}

// Start pool initialization in background (non-blocking)
initializePoolAsync().catch(err => {
  console.warn('[db] ⚠️  Background pool initialization failed (non-fatal):', err.message);
});

// Re-export database functions from databases.js
export { queryPostgres, queryEdcatAI, postgresPool, edcatPool, checkConnections };

// Export pool for direct access if needed
export { pool };
