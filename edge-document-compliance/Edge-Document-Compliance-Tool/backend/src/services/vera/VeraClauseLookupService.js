/**
 * Vera Clause Lookup Service
 * Unified service for retrieving standard clauses with normalization
 * Handles clause queries like "8.7" matching "8.7", "8.7.1", "8.7.2", etc.
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Normalize clause query (e.g., "8.7" → matches "8.7", "8.7.1", "8.7.2", etc.)
 * @param {string} clauseQuery - User's clause query (e.g., "8.7", "8.5.1")
 * @returns {Object} Normalized patterns for SQL matching
 */
function normalizeClauseQuery(clauseQuery) {
  const trimmed = (clauseQuery || '').trim();
  
  // Remove any non-numeric characters except dots
  const cleaned = trimmed.replace(/[^\d.]/g, '');
  
  // Split into parts
  const parts = cleaned.split('.').filter(p => p.length > 0);
  
  if (parts.length === 0) {
    return null;
  }
  
  // Build patterns:
  // "8.7" should match:
  //   - clause_ref = '8' AND (full_ref = '8.7' OR full_ref LIKE '8.7.%')
  //   - OR clause_number = '8.7'
  //   - OR clause_number LIKE '8.7.%'
  
  const exactMatch = cleaned; // "8.7"
  const prefixMatch = cleaned + '.'; // "8.7."
  const topLevel = parts[0]; // "8"
  
  return {
    exact: exactMatch,
    prefix: prefixMatch,
    topLevel: topLevel,
    parts: parts
  };
}

/**
 * Get standard clause with normalization
 * @param {string} standardId - UUID of the standard
 * @param {string} clauseQuery - Clause query (e.g., "8.7", "8.5.1")
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Structured clause data or null if not found
 */
export async function getStandardClause(standardId, clauseQuery, options = {}) {
  const { tenantId = DEFAULT_TENANT_ID, includeChildren = true, diagnostic = false } = options;
  
  if (!standardId || !clauseQuery) {
    if (diagnostic) console.log('[VeraClauseLookup] Missing standardId or clauseQuery');
    return null;
  }
  
  const normalized = normalizeClauseQuery(clauseQuery);
  if (!normalized) {
    if (diagnostic) console.log('[VeraClauseLookup] Invalid clause query format');
    return null;
  }
  
  if (diagnostic) {
    console.log(`[VeraClauseLookup] Looking up clause "${clauseQuery}" for standard ${standardId}`);
    console.log(`[VeraClauseLookup] Normalized patterns:`, normalized);
  }
  
  try {
    // First, get standard info to determine which database it's in
    let standardInfo = null;
    try {
      const standardResult = await queryPostgres(
        `SELECT id, code, name, file_category 
         FROM public.standards 
         WHERE id = $1 
         LIMIT 1`,
        [standardId]
      );
      
      if (standardResult.rows.length > 0) {
        standardInfo = standardResult.rows[0];
      }
    } catch (e) {
      if (diagnostic) console.log('[VeraClauseLookup] Standard not found in Customer Data DB, checking EDCAT AI DB...');
    }
    
    if (!standardInfo) {
      try {
        const standardResult = await queryEdcatAI(
          `SELECT id, code, name 
           FROM edcat.standards 
           WHERE id = $1 
           LIMIT 1`,
          [standardId]
        );
        
        if (standardResult.rows.length > 0) {
          standardInfo = standardResult.rows[0];
        }
      } catch (e) {
        if (diagnostic) console.log('[VeraClauseLookup] Standard not found in EDCAT AI DB either');
      }
    }
    
    if (!standardInfo) {
      if (diagnostic) console.log('[VeraClauseLookup] Standard not found in either database');
      return {
        found: false,
        error: 'Standard not found',
        message: 'Clause found in source document but not parsed. Re-parse required.'
      };
    }
    
    // Query parsed_requirements from Customer Data DB (single source of truth)
    // Build SQL with clause normalization
    const sqlQuery = `
      SELECT 
        id,
        standard_id,
        clause_ref,
        clause_number,
        full_ref,
        sub_ref,
        clause_title,
        requirement_text,
        requirement_type,
        requirement_subtype,
        confidence,
        extracted_at,
        is_in_scope,
        subject_text,
        keyword,
        modal_verb,
        intent,
        keywords
      FROM public.parsed_requirements
      WHERE standard_id = $1
        AND is_in_scope = true
        AND (
          -- Exact match on clause_number
          clause_number = $2
          -- Exact match on full_ref
          OR full_ref = $2
          -- Prefix match (8.7 matches 8.7.1, 8.7.2, etc.)
          OR clause_number LIKE $3
          OR full_ref LIKE $3
          -- Top-level clause match (8.7 matches if clause_ref = '8' and full_ref starts with '8.7')
          OR (clause_ref = $4 AND (full_ref = $2 OR full_ref LIKE $3))
        )
      ORDER BY 
        -- Prioritize exact matches
        CASE 
          WHEN clause_number = $2 OR full_ref = $2 THEN 0
          ELSE 1
        END,
        -- Then by clause number ordering
        CASE 
          WHEN clause_number ~ '^[0-9]+\.?[0-9]*' THEN 
            CAST(SPLIT_PART(clause_number, '.', 1) AS INTEGER)
          ELSE 9999
        END,
        CASE 
          WHEN clause_number ~ '^[0-9]+\.?[0-9]*' AND SPLIT_PART(clause_number, '.', 2) ~ '^[0-9]+' THEN 
            CAST(SPLIT_PART(clause_number, '.', 2) AS INTEGER)
          ELSE 9999
        END,
        sub_ref,
        clause_number,
        extracted_at DESC
    `;
    
    const params = [
      standardId,
      normalized.exact,      // $2: exact match
      normalized.prefix + '%', // $3: prefix match (8.7.%)
      normalized.topLevel     // $4: top-level clause (8)
    ];
    
    if (diagnostic) {
      console.log('[VeraClauseLookup] Executing SQL query with params:', params);
    }
    
    const result = await queryPostgres(sqlQuery, params);
    
    if (diagnostic) {
      console.log(`[VeraClauseLookup] Found ${result.rows.length} matching requirements`);
    }
    
    if (result.rows.length === 0) {
      // Check if standard exists but has no parsed requirements
      const checkResult = await queryPostgres(
        `SELECT COUNT(*) as total_count 
         FROM public.parsed_requirements 
         WHERE standard_id = $1`,
        [standardId]
      );
      
      const totalCount = parseInt(checkResult.rows[0]?.total_count || 0);
      
      if (totalCount === 0) {
        return {
          found: false,
          error: 'not_parsed',
          message: 'Clause found in source document but not parsed. Re-parse required.',
          standard: {
            id: standardInfo.id,
            code: standardInfo.code,
            name: standardInfo.name
          }
        };
      }
      
      return {
        found: false,
        error: 'clause_not_found',
        message: `Clause "${clauseQuery}" not found in parsed requirements for ${standardInfo.code || standardInfo.name}`,
        standard: {
          id: standardInfo.id,
          code: standardInfo.code,
          name: standardInfo.name
        }
      };
    }
    
    // Separate main clause from children
    const exactMatches = result.rows.filter(r => 
      r.clause_number === normalized.exact || r.full_ref === normalized.exact
    );
    
    const mainClause = exactMatches.length > 0 ? exactMatches[0] : result.rows[0];
    const children = includeChildren 
      ? result.rows.filter(r => r.id !== mainClause.id && (
          r.clause_number?.startsWith(normalized.prefix) || 
          r.full_ref?.startsWith(normalized.prefix)
        ))
      : [];
    
    // Build structured response
    const response = {
      found: true,
      clause: {
        id: mainClause.id,
        clauseRef: mainClause.clause_ref,
        clauseNumber: mainClause.clause_number,
        fullRef: mainClause.full_ref || mainClause.clause_number,
        subRef: mainClause.sub_ref,
        clauseTitle: mainClause.clause_title,
        requirementText: mainClause.requirement_text,
        requirementType: mainClause.requirement_type,
        requirementSubtype: mainClause.requirement_subtype,
        confidence: mainClause.confidence ? parseFloat(mainClause.confidence) : null,
        extractedAt: mainClause.extracted_at,
        isInScope: mainClause.is_in_scope,
        subjectText: mainClause.subject_text,
        keyword: mainClause.keyword || mainClause.modal_verb,
        intent: mainClause.intent,
        keywords: mainClause.keywords
      },
      children: children.map(row => ({
        id: row.id,
        clauseRef: row.clause_ref,
        clauseNumber: row.clause_number,
        fullRef: row.full_ref || row.clause_number,
        subRef: row.sub_ref,
        clauseTitle: row.clause_title,
        requirementText: row.requirement_text,
        requirementType: row.requirement_type,
        requirementSubtype: row.requirement_subtype,
        confidence: row.confidence ? parseFloat(row.confidence) : null,
        extractedAt: row.extracted_at,
        isInScope: row.is_in_scope,
        subjectText: row.subject_text,
        keyword: row.keyword || row.modal_verb,
        intent: row.intent,
        keywords: row.keywords
      })),
      standard: {
        id: standardInfo.id,
        code: standardInfo.code,
        name: standardInfo.name
      },
      query: clauseQuery,
      normalized: normalized,
      totalMatches: result.rows.length,
      hasChildren: children.length > 0,
      childCount: children.length
    };
    
    if (diagnostic) {
      console.log('[VeraClauseLookup] Returning structured response:', {
        found: response.found,
        clauseNumber: response.clause.clauseNumber,
        childCount: response.childCount
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('[VeraClauseLookup] Error querying clause:', error);
    return {
      found: false,
      error: 'database_error',
      message: `Database error while looking up clause: ${error.message}`,
      diagnostic: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
}

/**
 * Find standard by code or name
 * @param {string} standardCode - Standard code (e.g., "AS9100", "ISO9001")
 * @returns {Promise<Object|null>} Standard info or null
 */
export async function findStandardByCode(standardCode) {
  if (!standardCode) return null;
  
  const code = standardCode.trim().toUpperCase();
  
  try {
    // Try Customer Data DB first
    const result = await queryPostgres(
      `SELECT id, code, name, file_category, sector
       FROM public.standards
       WHERE UPPER(code) = $1 OR UPPER(name) LIKE $2
       LIMIT 1`,
      [code, `%${code}%`]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Try EDCAT AI DB
    const edcatResult = await queryEdcatAI(
      `SELECT id, code, name
       FROM edcat.standards
       WHERE UPPER(code) = $1 OR UPPER(name) LIKE $2
       LIMIT 1`,
      [code, `%${code}%`]
    );
    
    if (edcatResult.rows.length > 0) {
      return edcatResult.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('[VeraClauseLookup] Error finding standard:', error);
    return null;
  }
}

export default {
  getStandardClause,
  findStandardByCode,
  normalizeClauseQuery
};

