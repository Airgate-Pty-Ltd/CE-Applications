/**
 * Regulatory Repository
 * Database persistence layer for regulatory sources, packs, and clauses
 */

import { query } from '../connection.js';
import crypto from 'crypto';

/**
 * Upsert a regulatory source
 */
export async function upsertSource(authority, regId, label, url) {
  const q = `
    INSERT INTO edcat.reg_sources(authority, reg_id, label, url)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (authority, reg_id) 
    DO UPDATE SET label = EXCLUDED.label, url = EXCLUDED.url
    RETURNING id
  `;
  const result = await query(q, [authority, regId, label, url]);
  return result.rows[0].id;
}

/**
 * Save a regulatory pack
 */
export async function savePack(sourceId, version, hash, meta, rawText, packYaml) {
  const q = `
    INSERT INTO edcat.reg_packs(source_id, version, hash, meta, raw_text, pack_yaml)
    VALUES ($1, $2, $3, $4::jsonb, $5, $6)
    RETURNING id
  `;
  const result = await query(q, [sourceId, version, hash, meta, rawText, packYaml]);
  return result.rows[0].id;
}

/**
 * Save clauses for a pack
 * Uses a transaction to ensure all clauses are saved atomically
 */
export async function saveClauses(packId, clauses) {
  const { getClient } = await import('../connection.js');
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    for (const c of clauses) {
      await client.query(
        `INSERT INTO edcat.reg_clauses(pack_id, clause_id, title, level, text, modality, char_start, char_end, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          packId,
          c.id,
          c.title || null,
          c.level || 1,
          c.text,
          c.modality || [],
          c.char_start || null,
          c.char_end || null,
          c.tags || []
        ]
      );
    }
    
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Record a crawl run
 */
export async function recordRun(startedAt, result) {
  const q = `
    INSERT INTO edcat.crawl_runs(started_at, finished_at, ok_count, fail_count, flagged_count, summary)
    VALUES ($1, NOW(), $2, $3, $4, $5::jsonb)
  `;
  await query(q, [startedAt, result.ok, result.fail, result.flagged, result.summary]);
}

/**
 * Update source after crawl
 */
export async function updateSourceAfterCrawl(sourceId, status, hash) {
  const q = `
    UPDATE edcat.reg_sources 
    SET last_crawled_at = NOW(), last_status = $1, last_hash = $2
    WHERE id = $3
  `;
  await query(q, [status, hash, sourceId]);
}

/**
 * Get latest pack for a source
 */
export async function getLatestPack(sourceId) {
  const q = `
    SELECT id, version, hash, meta, pack_yaml
    FROM edcat.reg_packs
    WHERE source_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const result = await query(q, [sourceId]);
  return result.rows[0] || null;
}

/**
 * SHA256 hash utility
 */
export function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

