/**
 * Vera Cross-Domain Mapping Service
 * 
 * Maps requirements across different domains (aerospace, medical_device, automotive)
 * to help users understand how similar requirements appear in different standards.
 * Phase 17: Multi-Domain Standards Pack Integration
 */

import { queryEdcatAI, queryPostgres } from '../../config/databases.js';
import { VeraClauseMatcher } from './VeraClauseMatcher.js';
import { buildContext } from './VeraContextOrchestrator.js';
import { callVeraLLM, isLLMConfigured } from './VeraLLMBridge.js';
import { v4 as uuidv4 } from 'uuid';

export interface CrossDomainMapping {
  id?: string;
  sourceStandardCode: string;
  sourceClauseRef: string;
  sourceFamily: string;
  targetStandardCode: string;
  targetClauseRef: string;
  targetFamily: string;
  similarity: number;
  rationale: string;
  mappingType: 'equivalent' | 'similar' | 'related' | 'partial';
  confidence?: number;
}

/**
 * Map a requirement across domains
 */
export async function mapRequirementAcrossDomains(
  fromStandardCode: string,
  clauseRef: string,
  targetFamily: "aerospace" | "medical_device" | "automotive"
): Promise<CrossDomainMapping[]> {
  try {
    console.log(`[VeraCrossDomain] Mapping ${fromStandardCode} ${clauseRef} to ${targetFamily}`);

    // First, check if we have cached mappings
    const cachedMappings = await getCachedMappings(fromStandardCode, clauseRef, targetFamily);
    if (cachedMappings.length > 0) {
      console.log(`[VeraCrossDomain] Found ${cachedMappings.length} cached mappings`);
      return cachedMappings;
    }

    // Get source requirement
    const sourceRequirement = await getRequirementText(fromStandardCode, clauseRef);
    if (!sourceRequirement) {
      return [];
    }

    // Get source family
    const sourceFamily = await getStandardFamily(fromStandardCode);

    // Find target standards in the target family
    const targetStandards = await getStandardsByFamily(targetFamily);
    if (targetStandards.length === 0) {
      return [];
    }

    // Use LLM to find similar requirements if available
    if (isLLMConfigured()) {
      const llmMappings = await findMappingsWithLLM(
        sourceRequirement,
        fromStandardCode,
        clauseRef,
        sourceFamily,
        targetStandards,
        targetFamily
      );

      // Cache the mappings
      for (const mapping of llmMappings) {
        await cacheMapping(mapping);
      }

      return llmMappings;
    }

    // Fallback: Use text similarity
    const similarityMappings = await findMappingsWithSimilarity(
      sourceRequirement,
      fromStandardCode,
      clauseRef,
      sourceFamily,
      targetStandards,
      targetFamily
    );

    // Cache the mappings
    for (const mapping of similarityMappings) {
      await cacheMapping(mapping);
    }

    return similarityMappings;

  } catch (error: any) {
    console.error('[VeraCrossDomain] Error mapping requirement:', error.message);
    return [];
  }
}

/**
 * Get cached mappings
 */
async function getCachedMappings(
  sourceStandardCode: string,
  sourceClauseRef: string,
  targetFamily: string
): Promise<CrossDomainMapping[]> {
  try {
    const result = await queryEdcatAI(`
      SELECT 
        id,
        source_standard_code,
        source_clause_ref,
        source_family,
        target_standard_code,
        target_clause_ref,
        target_family,
        similarity_score,
        rationale,
        mapping_type,
        confidence
      FROM edcat.cross_domain_mappings
      WHERE source_standard_code = $1
        AND source_clause_ref = $2
        AND target_family = $3
        AND similarity_score >= 0.6
      ORDER BY similarity_score DESC
      LIMIT 10
    `, [sourceStandardCode, sourceClauseRef, targetFamily]);

    return result.rows.map(row => ({
      id: row.id,
      sourceStandardCode: row.source_standard_code,
      sourceClauseRef: row.source_clause_ref,
      sourceFamily: row.source_family,
      targetStandardCode: row.target_standard_code,
      targetClauseRef: row.target_clause_ref,
      targetFamily: row.target_family,
      similarity: parseFloat(row.similarity_score || 0),
      rationale: row.rationale || '',
      mappingType: row.mapping_type || 'similar',
      confidence: parseFloat(row.confidence || 0.5)
    }));

  } catch (error: any) {
    console.error('[VeraCrossDomain] Error getting cached mappings:', error.message);
    return [];
  }
}

/**
 * Get requirement text
 */
async function getRequirementText(standardCode: string, clauseRef: string): Promise<string | null> {
  try {
    const result = await queryPostgres(`
      SELECT requirement_text
      FROM public.parsed_requirements pr
      JOIN public.standards s ON pr.standard_id = s.standard_id
      WHERE s.code = $1
        AND pr.clause_number = $2
      LIMIT 1
    `, [standardCode, clauseRef]);

    return result.rows.length > 0 ? result.rows[0].requirement_text : null;

  } catch (error: any) {
    console.error('[VeraCrossDomain] Error getting requirement text:', error.message);
    return null;
  }
}

/**
 * Get standard family
 */
async function getStandardFamily(standardCode: string): Promise<string> {
  try {
    const result = await queryPostgres(`
      SELECT family
      FROM public.standards
      WHERE code = $1
      LIMIT 1
    `, [standardCode]);

    if (result.rows.length > 0 && result.rows[0].family) {
      return result.rows[0].family;
    }

    // Infer from code
    const upper = standardCode.toUpperCase();
    if (upper.includes('AS91') || upper.includes('FAA') || upper.includes('EASA') || upper.includes('CASA')) {
      return 'aerospace';
    }
    if (upper.includes('13485') || upper.includes('MDSAP') || upper.includes('FDA') || upper.includes('MDR')) {
      return 'medical_device';
    }
    if (upper.includes('IATF') || upper.includes('16949')) {
      return 'automotive';
    }

    return 'general';

  } catch (error: any) {
    console.error('[VeraCrossDomain] Error getting standard family:', error.message);
    return 'general';
  }
}

/**
 * Get standards by family
 */
async function getStandardsByFamily(family: string): Promise<Array<{ code: string; name: string }>> {
  try {
    const result = await queryPostgres(`
      SELECT code, name
      FROM public.standards
      WHERE family = $1
        AND is_active = TRUE
      ORDER BY code
      LIMIT 20
    `, [family]);

    return result.rows.map(row => ({
      code: row.code,
      name: row.name
    }));

  } catch (error: any) {
    console.error('[VeraCrossDomain] Error getting standards by family:', error.message);
    return [];
  }
}

/**
 * Find mappings using LLM
 */
async function findMappingsWithLLM(
  sourceRequirement: string,
  sourceStandardCode: string,
  sourceClauseRef: string,
  sourceFamily: string,
  targetStandards: Array<{ code: string; name: string }>,
  targetFamily: string
): Promise<CrossDomainMapping[]> {
  try {
    const systemPrompt = `You are a compliance expert mapping requirements across different standard families.

Given a source requirement from ${sourceStandardCode} (${sourceFamily}), find the most similar or equivalent requirements in ${targetFamily} standards.

Source requirement (${sourceStandardCode} ${sourceClauseRef}):
${sourceRequirement}

Available target standards: ${targetStandards.map(s => s.code).join(', ')}

For each match, provide:
- target_standard_code
- target_clause_ref (e.g., "8.7", "7.5.1")
- similarity_score (0.0 to 1.0)
- rationale (why they are similar)
- mapping_type (equivalent, similar, related, or partial)

Return as JSON array:
[
  {
    "target_standard_code": "ISO13485",
    "target_clause_ref": "8.5.2",
    "similarity_score": 0.85,
    "rationale": "Both require corrective action processes",
    "mapping_type": "equivalent"
  }
]`;

    const llmResponse = await callVeraLLM({
      systemPrompt,
      contextBlocks: [],
      userMessage: `Find equivalent requirements in ${targetFamily} standards for: ${sourceRequirement.substring(0, 200)}...`,
      intent: 'cross_domain_mapping',
      tenantId: '00000000-0000-0000-0000-000000000000'
    });

    if (!llmResponse || !llmResponse.answer) {
      return [];
    }

    // Parse JSON response
    let jsonText = llmResponse.answer;
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const mappings = JSON.parse(jsonText.trim());

    return mappings.map((m: any) => ({
      sourceStandardCode,
      sourceClauseRef,
      sourceFamily,
      targetStandardCode: m.target_standard_code,
      targetClauseRef: m.target_clause_ref,
      targetFamily,
      similarity: parseFloat(m.similarity_score || 0),
      rationale: m.rationale || '',
      mappingType: m.mapping_type || 'similar',
      confidence: 0.8
    }));

  } catch (error: any) {
    console.error('[VeraCrossDomain] Error finding mappings with LLM:', error.message);
    return [];
  }
}

/**
 * Find mappings using text similarity (fallback)
 */
async function findMappingsWithSimilarity(
  sourceRequirement: string,
  sourceStandardCode: string,
  sourceClauseRef: string,
  sourceFamily: string,
  targetStandards: Array<{ code: string; name: string }>,
  targetFamily: string
): Promise<CrossDomainMapping[]> {
  try {
    const mappings: CrossDomainMapping[] = [];

    // Search for similar requirements in target standards
    for (const targetStandard of targetStandards) {
      const result = await queryPostgres(`
        SELECT clause_number, requirement_text
        FROM public.parsed_requirements pr
        JOIN public.standards s ON pr.standard_id = s.standard_id
        WHERE s.code = $1
          AND pr.requirement_text IS NOT NULL
        LIMIT 50
      `, [targetStandard.code]);

      for (const row of result.rows) {
        const similarity = calculateTextSimilarity(sourceRequirement, row.requirement_text);
        
        if (similarity >= 0.6) {
          mappings.push({
            sourceStandardCode,
            sourceClauseRef,
            sourceFamily,
            targetStandardCode: targetStandard.code,
            targetClauseRef: row.clause_number,
            targetFamily,
            similarity,
            rationale: `Text similarity: ${(similarity * 100).toFixed(0)}%`,
            mappingType: similarity >= 0.8 ? 'equivalent' : similarity >= 0.7 ? 'similar' : 'related',
            confidence: 0.6
          });
        }
      }
    }

    // Sort by similarity and return top 5
    return mappings
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

  } catch (error: any) {
    console.error('[VeraCrossDomain] Error finding mappings with similarity:', error.message);
    return [];
  }
}

/**
 * Calculate text similarity (simple word overlap)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Cache a mapping
 */
async function cacheMapping(mapping: CrossDomainMapping): Promise<void> {
  try {
    await queryEdcatAI(`
      INSERT INTO edcat.cross_domain_mappings
      (id, source_standard_code, source_clause_ref, source_family,
       target_standard_code, target_clause_ref, target_family,
       similarity_score, rationale, mapping_type, confidence, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (source_standard_code, source_clause_ref, target_standard_code, target_clause_ref)
      DO UPDATE SET
        similarity_score = EXCLUDED.similarity_score,
        rationale = EXCLUDED.rationale,
        mapping_type = EXCLUDED.mapping_type,
        confidence = EXCLUDED.confidence,
        updated_at = NOW()
    `, [
      mapping.id || uuidv4(),
      mapping.sourceStandardCode,
      mapping.sourceClauseRef,
      mapping.sourceFamily,
      mapping.targetStandardCode,
      mapping.targetClauseRef,
      mapping.targetFamily,
      mapping.similarity,
      mapping.rationale,
      mapping.mappingType,
      mapping.confidence || 0.5
    ]);

  } catch (error: any) {
    console.error('[VeraCrossDomain] Error caching mapping:', error.message);
    // Non-fatal
  }
}

/**
 * Detect domain from message
 */
export function detectDomainFromMessage(message: string): "aerospace" | "medical_device" | "automotive" | "general" | null {
  const lower = message.toLowerCase();

  // Aerospace indicators
  if (lower.match(/\b(as91|faa|easa|casa|uk\s*caa|aerospace|aircraft|aviation)\b/)) {
    return 'aerospace';
  }

  // Medical device indicators
  if (lower.match(/\b(13485|mdsap|mdr|ivdr|fda|medical\s*device|device\s*regulation)\b/)) {
    return 'medical_device';
  }

  // Automotive indicators
  if (lower.match(/\b(iatf|16949|automotive|ppap|apqp|automotive)\b/)) {
    return 'automotive';
  }

  // Tool-based detection
  if (lower.match(/\b(ppap|apqp|fmea)\b/)) {
    return 'automotive';
  }

  if (lower.match(/\b(mdsap|mdr|ivdr)\b/)) {
    return 'medical_device';
  }

  if (lower.match(/\b(stc|pma|faa\s*part)\b/)) {
    return 'aerospace';
  }

  return null;
}

