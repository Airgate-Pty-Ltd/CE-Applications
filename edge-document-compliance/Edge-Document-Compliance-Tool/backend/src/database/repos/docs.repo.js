/**
 * Documents Repository
 * Database queries for client document search
 */

import { query } from '../connection.js';

/**
 * Search client documents using full-text search
 */
export async function docsSearch({ query_text, topK = 20, types, customer_id }) {
  const params = [];
  let filter = '';

  if (customer_id) {
    params.push(customer_id);
    filter = `AND d.customer_id = $${params.length}`;
  }

  if (types && types.length) {
    params.push(types);
    filter += ` AND d.type = ANY($${params.length})`;
  }

  params.push(query_text);

  const q = `
    SELECT d.id, d.title, d.type, d.customer_id,
           TS_RANK_CD(i.content_tsv, WEBSEARCH_TO_TSQUERY('english', $${params.length})) AS score
    FROM edcat.doc_index i
    JOIN public.documents d ON d.id = i.document_id
    WHERE i.content_tsv @@ WEBSEARCH_TO_TSQUERY('english', $${params.length})
    ${filter}
    ORDER BY score DESC
    LIMIT ${topK}
  `;

  const { rows } = await query(q, params);
  return { count: rows.length, hits: rows };
}

