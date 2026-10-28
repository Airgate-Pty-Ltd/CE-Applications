/**
 * Requirements Repository
 * Database queries for regulatory requirements/clauses
 */

import { query } from '../connection.js';

/**
 * List requirements for an authority/regulation
 */
export async function requirementsList({ authority, reg_id, clause_prefix, modalities }) {
  // Get latest pack for this source
  const { rows: latest } = await query(
    `SELECT p.id 
     FROM edcat.reg_packs p
     JOIN edcat.reg_sources s ON s.id = p.source_id
     WHERE s.authority = $1 AND s.reg_id = $2
     ORDER BY p.created_at DESC 
     LIMIT 1`,
    [authority, reg_id]
  );

  if (!latest.length) {
    return { error: 'PACK_NOT_FOUND' };
  }

  const params = [latest[0].id];
  let where = 'pack_id = $1';

  if (clause_prefix) {
    params.push(clause_prefix + '%');
    where += ` AND clause_id LIKE $${params.length}`;
  }

  if (modalities && modalities.length) {
    params.push(modalities);
    where += ` AND EXISTS (SELECT 1 FROM UNNEST(modality) m WHERE m = ANY($${params.length}))`;
  }

  const q = `
    SELECT clause_id, title, level, text, modality, char_start, char_end
    FROM edcat.reg_clauses
    WHERE ${where}
    ORDER BY clause_id ASC
  `;

  const { rows } = await query(q, params);
  return { count: rows.length, requirements: rows };
}

/**
 * Show a specific requirement by clause_id
 */
export async function requirementsShow({ authority, reg_id, clause_id }) {
  const { rows } = await query(
    `SELECT c.clause_id, c.title, c.level, c.text, c.modality, c.char_start, c.char_end
     FROM edcat.reg_clauses c
     JOIN edcat.reg_packs p ON p.id = c.pack_id
     JOIN edcat.reg_sources s ON s.id = p.source_id
     WHERE s.authority = $1 AND s.reg_id = $2 AND c.clause_id = $3
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [authority, reg_id, clause_id]
  );

  if (!rows.length) {
    return { error: 'CLAUSE_NOT_FOUND' };
  }

  return { requirement: rows[0] };
}

/**
 * Search requirements by text
 */
export async function requirementsSearch({ authority, reg_id, query_text, topK = 50 }) {
  const { rows } = await query(
    `SELECT c.clause_id, c.title, c.level, c.text, c.modality
     FROM edcat.reg_clauses c
     JOIN edcat.reg_packs p ON p.id = c.pack_id
     JOIN edcat.reg_sources s ON s.id = p.source_id
     WHERE s.authority = $1 
       AND s.reg_id = $2
       AND (c.text ILIKE $3 OR c.title ILIKE $3)
     ORDER BY p.created_at DESC, c.clause_id ASC
     LIMIT $4`,
    [authority, reg_id, `%${query_text}%`, topK]
  );

  return { count: rows.length, requirements: rows };
}

