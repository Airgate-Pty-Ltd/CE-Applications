/**
 * Requirement Metrics Service
 * Provides counts and distribution of requirements by type, subtype, and clause
 */

import { queryPostgres } from '../config/databases.js';

/**
 * Get requirement metrics for a standard
 */
export async function requirementMetrics(standardId) {
  // Total counts by type and scope - Use Customer Data DB (parsed_requirements is here)
  const totals = await queryPostgres(`
    SELECT
      COUNT(*) FILTER (WHERE is_in_scope) AS in_scope_total,
      COUNT(*) FILTER (WHERE NOT is_in_scope) AS out_scope_total,
      COUNT(*) FILTER (WHERE requirement_type='mandatory') AS mandatory_total,
      COUNT(*) FILTER (WHERE requirement_type='assurance') AS assurance_total,
      COUNT(*) FILTER (WHERE requirement_type='prohibition') AS prohibition_total,
      COUNT(*) FILTER (WHERE requirement_type='permission') AS permission_total
    FROM public.parsed_requirements
    WHERE standard_id = $1
  `, [standardId]);

  // Counts by top-level clause (4-10)
  const byClause = await queryPostgres(`
    SELECT 
      split_part(clause_number, '.', 1) AS top_clause, 
      COUNT(*) AS cnt
    FROM public.parsed_requirements
    WHERE standard_id = $1 AND is_in_scope
    GROUP BY 1 
    ORDER BY 1::int
  `, [standardId]);

  // Counts by subtype
  const bySubtype = await queryPostgres(`
    SELECT 
      requirement_subtype, 
      COUNT(*) AS cnt
    FROM public.parsed_requirements
    WHERE standard_id = $1 AND is_in_scope
    GROUP BY 1 
    ORDER BY cnt DESC
  `, [standardId]);

  // Counts by type
  const byType = await queryPostgres(`
    SELECT 
      requirement_type, 
      COUNT(*) AS cnt
    FROM public.parsed_requirements
    WHERE standard_id = $1 AND is_in_scope
    GROUP BY 1 
    ORDER BY cnt DESC
  `, [standardId]);

  return {
    totals: totals.rows[0] || {},
    byClause: byClause.rows || [],
    bySubtype: bySubtype.rows || [],
    byType: byType.rows || []
  };
}

