/**
 * Clause Query Service
 * Fast query layer for retrieving clauses by number
 * Supports parent-child clause relationships
 */

import { query } from '../database/connection.js';

export class ClauseQuery {
  /**
   * Get clause by number (e.g., "8.7") for a standard
   * Returns clause + immediate children (8.7.1, 8.7.2)
   */
  async getByNumber(standardId, clauseNumber) {
    // Sanitize input
    const normalized = clauseNumber.trim();
    if (!normalized.match(/^\d+(?:\.\d+)*$/)) {
      throw new Error(`Invalid clause number: ${normalized}`);
    }

    // Query main clause and all sub-items (e.g., if "8.5.1", find "8.5.1", "8.5.1.a", "8.5.1.b", etc.)
    const mainResult = await query(
      `SELECT id, clause_number, clause_title, requirement_text, confidence, 
              requirement_type, intent, keywords, extracted_at,
              clause_ref, sub_ref, full_ref, requirement_uid
       FROM compliance_requirements
       WHERE standard_id = $1 AND (clause_ref = $2 OR full_ref = $2)
       ORDER BY full_ref NULLS FIRST, clause_number ASC`,
      [standardId, normalized]
    );

    if (mainResult.rows.length === 0) {
      return null;
    }

    // Separate main clause from sub-items
    const mainClause = mainResult.rows.find(r => !r.sub_ref) || mainResult.rows[0];
    const children = mainResult.rows.filter(r => r.sub_ref && r.id !== mainClause.id);

    return {
      clause: {
        id: mainClause.id,
        clause_number: mainClause.clause_number || mainClause.full_ref,
        clause_title: mainClause.clause_title,
        requirement_text: mainClause.requirement_text,
        confidence: mainClause.confidence,
        requirement_type: mainClause.requirement_type,
        intent: mainClause.intent,
        keywords: mainClause.keywords,
        extracted_at: mainClause.extracted_at,
        clause_ref: mainClause.clause_ref,
        sub_ref: mainClause.sub_ref,
        full_ref: mainClause.full_ref || mainClause.clause_number,
        requirement_uid: mainClause.requirement_uid
      },
      children: children.map(row => ({
        id: row.id,
        clause_number: row.clause_number || row.full_ref,
        clause_title: row.clause_title,
        requirement_text: row.requirement_text,
        confidence: row.confidence,
        requirement_type: row.requirement_type,
        intent: row.intent,
        keywords: row.keywords,
        extracted_at: row.extracted_at,
        clause_ref: row.clause_ref,
        sub_ref: row.sub_ref,
        full_ref: row.full_ref || row.clause_number,
        requirement_uid: row.requirement_uid
      })),
      verbatim: mainClause.requirement_text,
      title: mainClause.clause_title,
      hasChildren: children.length > 0,
      childCount: children.length
    };
  }

  /**
   * Full-text search on requirement text
   */
  async search(standardId, keywords) {
    const query_obj = await query(
      `SELECT clause_number, clause_title, requirement_text, confidence,
              requirement_type, intent, keywords,
              clause_ref, sub_ref, full_ref, requirement_uid
       FROM compliance_requirements
       WHERE standard_id = $1 AND (
         requirement_text ILIKE $2 OR
         clause_title ILIKE $2 OR
         clause_number ILIKE $2 OR
         full_ref ILIKE $2
       )
       ORDER BY full_ref NULLS FIRST, clause_number ASC
       LIMIT 50`,
      [standardId, `%${keywords}%`]
    );
    return query_obj.rows;
  }

  /**
   * Get all clauses for a standard (with optional filtering)
   */
  async getAll(standardId, options = {}) {
    const { minConfidence, requirementType, limit = 1000 } = options;
    
    let queryText = `
      SELECT id, clause_number, clause_title, requirement_text, confidence,
             requirement_type, intent, keywords, extracted_at,
             clause_ref, sub_ref, full_ref, requirement_uid
      FROM compliance_requirements
      WHERE standard_id = $1
    `;
    const params = [standardId];
    let paramIndex = 2;

    if (minConfidence !== undefined) {
      queryText += ` AND confidence >= $${paramIndex}`;
      params.push(minConfidence);
      paramIndex++;
    }

    if (requirementType) {
      queryText += ` AND requirement_type = $${paramIndex}`;
      params.push(requirementType);
      paramIndex++;
    }

    queryText += ` ORDER BY full_ref NULLS FIRST, clause_number ASC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Get clause hierarchy (parent with all descendants)
   */
  async getHierarchy(standardId, clauseNumber) {
    const normalized = clauseNumber.trim();
    
    // Get parent clause
    const parent = await this.getByNumber(standardId, normalized);
    if (!parent) {
      return null;
    }

    // Get all descendants (any clause that starts with the parent number, including sub-refs)
    const descendantPattern = `${normalized}.`;
    const descendantsResult = await query(
      `SELECT id, clause_number, clause_title, requirement_text, confidence,
              requirement_type, intent, keywords,
              clause_ref, sub_ref, full_ref, requirement_uid
       FROM compliance_requirements
       WHERE standard_id = $1 AND (clause_number LIKE $2 OR full_ref LIKE $2)
       ORDER BY full_ref NULLS FIRST, clause_number ASC`,
      [standardId, descendantPattern + '%']
    );

    return {
      parent: parent.clause,
      children: parent.children,
      allDescendants: descendantsResult.rows,
      totalDescendants: descendantsResult.rows.length
    };
  }
}

