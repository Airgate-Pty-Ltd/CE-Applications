/**
 * Vera Intent Handlers
 * Specialized handlers for different intent types
 * Enforces: Intent → Database Lookup → Reasoning → Personality
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import { getStandardClause, findStandardByCode } from './VeraClauseLookupService.js';
import VeraQueryResponseService from './VeraQueryResponseService.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Handle clause lookup intent (e.g., "What is 8.7?")
 * @param {Object} params
 * @returns {Promise<Object>} Structured response with clause data
 */
export async function handleClauseLookup({ message, standardContext, tenantId, diagnostic = false }) {
  // Extract clause number from message
  const clauseMatch = message.match(/\b(\d+\.\d+(?:\.\d+)?)\b/);
  if (!clauseMatch) {
    return {
      found: false,
      error: 'no_clause_in_message',
      message: 'No clause number found in your question. Please specify a clause (e.g., "8.7", "8.5.1").'
    };
  }

  const clauseQuery = clauseMatch[1];
  let standardId = standardContext?.standard_id;

  // If no standard ID provided, try to infer from message or use first available
  if (!standardId) {
    // Try to find standard code in message
    const standardCodeMatch = message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5})\b/i);
    if (standardCodeMatch) {
      const standardCode = standardCodeMatch[0].replace(/\s+/g, '').toUpperCase();
      const standard = await findStandardByCode(standardCode);
      if (standard) {
        standardId = standard.id;
        if (diagnostic) console.log(`[VeraIntentHandlers] Found standard ${standardCode} from message`);
      }
    }

    // If still no standard, get the most common one (AS9100 or ISO9001)
    if (!standardId) {
      const defaultResult = await queryPostgres(
        `SELECT id FROM public.standards 
         WHERE code IN ('AS9100D', 'AS9100', 'ISO9001', 'ISO 9001')
         ORDER BY CASE code WHEN 'AS9100D' THEN 1 WHEN 'AS9100' THEN 2 WHEN 'ISO9001' THEN 3 ELSE 4 END
         LIMIT 1`
      );
      if (defaultResult.rows.length > 0) {
        standardId = defaultResult.rows[0].id;
        if (diagnostic) console.log(`[VeraIntentHandlers] Using default standard`);
      }
    }
  }

  if (!standardId) {
    return {
      found: false,
      error: 'no_standard',
      message: 'I need to know which standard you\'re asking about. Please specify (e.g., "What is 8.7 in AS9100?").'
    };
  }

  // Use clause lookup service
  const clauseResult = await getStandardClause(standardId, clauseQuery, { tenantId, diagnostic });

  if (!clauseResult || !clauseResult.found) {
    return {
      found: false,
      error: clauseResult?.error || 'clause_not_found',
      message: clauseResult?.message || `Clause ${clauseQuery} not found.`,
      standard: clauseResult?.standard
    };
  }

  // Build structured response
  let answer = `**${clauseResult.clause.clauseTitle || `Clause ${clauseResult.clause.clauseNumber}`}**\n\n`;
  answer += clauseResult.clause.requirementText;

  if (clauseResult.children && clauseResult.children.length > 0) {
    answer += `\n\n**Sub-clauses:**\n`;
    for (const child of clauseResult.children.slice(0, 5)) { // Limit to 5 children
      answer += `\n- **${child.clauseNumber || child.fullRef}**: ${child.requirementText.substring(0, 150)}${child.requirementText.length > 150 ? '...' : ''}`;
    }
    if (clauseResult.children.length > 5) {
      answer += `\n\n*...and ${clauseResult.children.length - 5} more sub-clauses.*`;
    }
  }

  answer += `\n\n[Source: ${clauseResult.standard.code || clauseResult.standard.name} ${clauseResult.clause.clauseNumber}]`;

  return {
    found: true,
    answer,
    clause: clauseResult.clause,
    children: clauseResult.children,
    standard: clauseResult.standard,
    metadata: {
      clauseNumber: clauseResult.clause.clauseNumber,
      confidence: clauseResult.clause.confidence,
      requirementType: clauseResult.clause.requirementType
    }
  };
}

/**
 * Handle standard definition intent (e.g., "What is AS9100?")
 * @param {Object} params
 * @returns {Promise<Object>} Structured response with standard info
 */
export async function handleStandardDefinition({ message, tenantId, diagnostic = false }) {
  // Extract standard code from message
  const standardMatch = message.match(/\b(AS\d{4}[A-Z]?|ISO\s*\d{4,5}|IATF\s*\d{4,5}|FAA\s*Part\s*\d+|EASA|ISO\s*13485|ISO\s*9001)\b/i);
  if (!standardMatch) {
    return {
      found: false,
      error: 'no_standard_in_message',
      message: 'No standard code found in your question. Please specify (e.g., "What is AS9100?").'
    };
  }

  const standardCode = standardMatch[0].replace(/\s+/g, '').toUpperCase();
  const standard = await findStandardByCode(standardCode);

  if (!standard) {
    return {
      found: false,
      error: 'standard_not_found',
      message: `Standard ${standardCode} not found in database. Please upload and parse it first.`
    };
  }

  // Get standard info and parsed requirements count
  const reqCountResult = await queryPostgres(
    `SELECT COUNT(*) as count 
     FROM public.parsed_requirements 
     WHERE standard_id = $1 AND is_in_scope = true`,
    [standard.id]
  );
  const reqCount = parseInt(reqCountResult.rows[0]?.count || 0);

  let answer = `**${standard.name || standard.code}**\n\n`;
  
  // Add standard description from Q&A bank if available
  const qnaMatch = await VeraQueryResponseService.findBestMatch({
    tenantId,
    message: `what is ${standardCode}`,
    intent: 'standard_definition'
  });

  if (qnaMatch && qnaMatch.response_text) {
    answer += qnaMatch.response_text.replace(/{standard}/g, standardCode);
  } else {
    // Generic description
    if (standardCode.startsWith('AS')) {
      answer += `${standardCode} is an aerospace quality management standard published by SAE International. `;
    } else if (standardCode.startsWith('ISO')) {
      answer += `${standardCode} is an international standard published by ISO. `;
    } else if (standardCode.startsWith('IATF')) {
      answer += `${standardCode} is an automotive quality management standard. `;
    } else if (standardCode.includes('FAA') || standardCode.includes('Part')) {
      answer += `${standardCode} is a Federal Aviation Administration regulation. `;
    } else {
      answer += `${standardCode} is a regulatory standard. `;
    }
  }

  answer += `\n\n**Status:** `;
  if (reqCount > 0) {
    answer += `Parsed with ${reqCount} requirements extracted.`;
  } else {
    answer += `Not yet parsed. Upload and parse the standard to enable clause-level queries.`;
  }

  answer += `\n\n[Source: ${standard.code}]`;

  return {
    found: true,
    answer,
    standard: {
      id: standard.id,
      code: standard.code,
      name: standard.name
    },
    parsedRequirementsCount: reqCount,
    metadata: {
      standardCode: standard.code,
      isParsed: reqCount > 0
    }
  };
}

/**
 * Handle industry terminology intent (e.g., "Define CQE", "What is DMAIC")
 * @param {Object} params
 * @returns {Promise<Object>} Structured response from Q&A bank
 */
export async function handleIndustryTerminology({ message, tenantId, diagnostic = false }) {
  // Query Q&A bank for terminology
  const qnaMatch = await VeraQueryResponseService.findBestMatch({
    tenantId,
    message,
    intent: 'industry_terminology'
  });

  if (qnaMatch && qnaMatch.response_template) {
    return {
      found: true,
      answer: qnaMatch.response_text,
      source: 'qna_bank',
      metadata: {
        category: qnaMatch.category,
        confidence: qnaMatch.confidence_score
      }
    };
  }

  return {
    found: false,
    error: 'terminology_not_found',
    message: 'I do not yet have this in my knowledge base. Would you like to teach me about it?'
  };
}

/**
 * Handle general knowledge intent (e.g., "What is a CQE", "What do you know about DMAIC")
 * @param {Object} params
 * @returns {Promise<Object>} Structured response from Q&A bank or knowledge items
 */
export async function handleGeneralKnowledge({ message, tenantId, diagnostic = false }) {
  // First try Q&A bank
  const qnaMatch = await VeraQueryResponseService.findBestMatch({
    tenantId,
    message,
    intent: 'meta_ai_query'
  });

  if (qnaMatch && qnaMatch.response_template) {
    return {
      found: true,
      answer: qnaMatch.response_text,
      source: 'qna_bank',
      metadata: {
        category: qnaMatch.category,
        confidence: qnaMatch.confidence_score
      }
    };
  }

  // Try knowledge items table if it exists
  try {
    const knowledgeResult = await queryEdcatAI(
      `SELECT id, title, content, category
       FROM edcat.knowledge_items
       WHERE content ILIKE $1 OR title ILIKE $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [`%${message.substring(0, 50)}%`]
    );

    if (knowledgeResult.rows.length > 0) {
      const item = knowledgeResult.rows[0];
      return {
        found: true,
        answer: item.content,
        source: 'knowledge_items',
        metadata: {
          category: item.category,
          title: item.title
        }
      };
    }
  } catch (e) {
    // knowledge_items table may not exist, that's okay
    if (diagnostic) console.log('[VeraIntentHandlers] knowledge_items table not available');
  }

  return {
    found: false,
    error: 'knowledge_not_found',
    message: 'I do not yet have this in my knowledge base. Would you like to teach me about it?'
  };
}

/**
 * Handle regulatory mapping intent (e.g., "FAA 21.137", "Part 21.137")
 * @param {Object} params
 * @returns {Promise<Object>} Structured response with regulatory mapping
 */
export async function handleRegulatoryMapping({ message, tenantId, diagnostic = false }) {
  // Extract regulatory authority and part/clause
  const regulatoryMatch = message.match(/\b(FAA|EASA|CASA|Part)\s*(\d+\.\d+|\d+)\b/i);
  if (!regulatoryMatch) {
    return {
      found: false,
      error: 'no_regulatory_reference',
      message: 'No regulatory reference found. Please specify (e.g., "FAA 21.137", "Part 21.137").'
    };
  }

  const authority = regulatoryMatch[1].toUpperCase();
  const partClause = regulatoryMatch[2];

  // Search for regulatory mappings
  try {
    const mappingResult = await queryPostgres(
      `SELECT pr.id, pr.standard_id, pr.clause_ref, pr.clause_number, pr.requirement_text,
              s.code, s.name
       FROM public.parsed_requirements pr
       JOIN public.standards s ON s.id = pr.standard_id
       WHERE pr.requirement_text ILIKE $1
          OR pr.clause_title ILIKE $1
          OR pr.metadata::text ILIKE $1
       LIMIT 5`,
      [`%${authority}%${partClause}%`]
    );

    if (mappingResult.rows.length > 0) {
      let answer = `**${authority} ${partClause}**\n\n`;
      answer += `Found ${mappingResult.rows.length} related requirement(s):\n\n`;

      for (const row of mappingResult.rows) {
        answer += `- **${row.code} ${row.clause_number || row.clause_ref}**: ${row.requirement_text.substring(0, 200)}${row.requirement_text.length > 200 ? '...' : ''}\n\n`;
      }

      return {
        found: true,
        answer,
        mappings: mappingResult.rows,
        metadata: {
          authority,
          partClause,
          matchCount: mappingResult.rows.length
        }
      };
    }
  } catch (e) {
    if (diagnostic) console.error('[VeraIntentHandlers] Error querying regulatory mapping:', e);
  }

  return {
    found: false,
    error: 'regulatory_mapping_not_found',
    message: `I don't have a mapping for ${authority} ${partClause} in my database. Please upload the regulatory document and parse it.`
  };
}

export default {
  handleClauseLookup,
  handleStandardDefinition,
  handleIndustryTerminology,
  handleGeneralKnowledge,
  handleRegulatoryMapping
};

