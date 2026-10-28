/**
 * Snapshot Module (mai-kernel/lib/snapshot.js)
 *
 * Canonical SHA-256 hashing for event data snapshots.
 * Design Laws:
 * - Law 2: No randomness (same data → same hash always)
 * - Law 4: Idempotency (duplicate snapshot = gate against duplicate assessments)
 * - Law 5: All decisions persist (snapshot recorded with every assessment)
 *
 * Snapshot must be:
 * 1. Deterministic (same input → same hash)
 * 2. Immutable (immutable snapshot field on every assessment)
 * 3. Canonical (JSON.stringify with sorted keys)
 */

const crypto = require('crypto');

class Snapshot {
  /**
   * Create a canonical snapshot from event data
   * Snapshot = JSON representation with sorted keys (deterministic string form)
   *
   * @param {Object} data - Event data (e.g., supplier fields)
   * @returns {string} Canonical JSON string with sorted keys
   */
  static create(data) {
    if (!data || typeof data !== 'object') {
      return JSON.stringify(null);
    }

    // Recursively sort keys to ensure deterministic string representation
    const sortedData = Snapshot._sortKeys(data);
    return JSON.stringify(sortedData);
  }

  /**
   * Compute SHA-256 hash of a snapshot
   * Used as idempotency key: same snapshot → no duplicate assessments
   *
   * Design Law 2: No randomness
   * Design Law 4: Idempotency — same hash blocks duplicate active assessments
   *
   * @param {string} snapshot - Canonical snapshot JSON
   * @returns {string} SHA-256 hex digest
   */
  static hash(snapshot) {
    if (typeof snapshot !== 'string') {
      throw new Error('Snapshot must be a string for hashing');
    }

    return crypto
      .createHash('sha256')
      .update(snapshot)
      .digest('hex');
  }

  /**
   * Verify that a hash matches a snapshot
   * Used in testing and audit validation
   *
   * @param {string} snapshot - Canonical snapshot JSON
   * @param {string} expectedHash - Hash to verify
   * @returns {boolean} true if hash matches
   */
  static verify(snapshot, expectedHash) {
    const computed = Snapshot.hash(snapshot);
    return computed === expectedHash;
  }

  /**
   * Recursively sort object keys (depth-first)
   * Ensures deterministic JSON representation
   *
   * @param {*} obj - Object to sort
   * @returns {*} Object with all keys sorted recursively
   */
  static _sortKeys(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Primitive types pass through
    if (typeof obj !== 'object') {
      return obj;
    }

    // Arrays: recursively sort keys in each element, preserve order
    if (Array.isArray(obj)) {
      return obj.map(item => Snapshot._sortKeys(item));
    }

    // Objects: sort keys and recurse
    const sorted = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sorted[key] = Snapshot._sortKeys(obj[key]);
      });

    return sorted;
  }
}

module.exports = Snapshot;
