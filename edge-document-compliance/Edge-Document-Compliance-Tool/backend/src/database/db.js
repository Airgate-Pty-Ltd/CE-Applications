/**
 * LEGACY Database Connection Pool
 * 
 * ⚠️  DEPRECATED: This file is kept for backward compatibility.
 *     New code should use queryPostgres/queryEdcatAI from '../config/databases.js'
 * 
 * This file creates its own pool for Customer Data DB (DATABASE_URL).
 * For two-database architecture, use the centralized databases.js instead.
 */

import { queryPostgres, postgresPool } from '../config/databases.js';

/**
 * Execute a query (legacy wrapper - uses centralized queryPostgres)
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
export async function query(text, params) {
  // Use centralized queryPostgres for Customer Data DB
  return queryPostgres(text, params);
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<pg.PoolClient>} Database client
 */
export async function getClient() {
  if (!postgresPool) {
    throw new Error('Database not configured - DATABASE_URL not set');
  }
  return await postgresPool.connect();
}

// Export pool for direct access if needed (from centralized databases.js)
export { postgresPool as pool };

