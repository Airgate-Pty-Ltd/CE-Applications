/**
 * Database Module Wrapper
 * 
 * This is a thin wrapper that re-exports from the canonical database module
 * at backend/src/config/databases.js to maintain compatibility with imports
 * that expect this path.
 * 
 * The actual database pools and functions are defined in:
 * backend/src/config/databases.js
 */

// Re-export everything from the canonical database module
export {
  queryPostgres,
  queryEdcatAI,
  postgresPool,
  edcatPool,
  checkConnections
} from '../../config/databases.js';

// Also export default for backward compatibility
export { default } from '../../config/databases.js';

