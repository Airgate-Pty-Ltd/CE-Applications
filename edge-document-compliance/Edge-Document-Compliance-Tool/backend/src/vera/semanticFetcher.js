/**
 * Semantic Fetcher (RAG Engine)
 * Retrieves relevant context from embeddings, knowledge graph, and standard profiles
 */
// @ts-ignore - JavaScript module without types
import { queryEdcatAI } from '../config/databases.js';
// Import VeraVectorEngine - will be loaded dynamically
// @ts-ignore - JavaScript module without types
let VeraVectorEngine = null;
async function loadVeraVectorEngine() {
    if (VeraVectorEngine)
        return VeraVectorEngine;
    try {
        // @ts-ignore - JavaScript module without types
        const module = await import('../services/vera/VeraVectorEngine.js');
        VeraVectorEngine = module.default || module;
        return VeraVectorEngine;
    }
    catch (error) {
        console.warn('[SemanticFetcher] Could not import VeraVectorEngine:', error);
        return null;
    }
}
/**
 * Generate embedding for query text
 */
async function generateQueryEmbedding(query) {
    try {
        // Note: Embeddings are optional - Vera can work without them
        // Check for VERA_MODEL_ENDPOINT (provider-agnostic) or skip embeddings
        if (!process.env.VERA_MODEL_ENDPOINT) {
            return null;
        }
        const engine = await loadVeraVectorEngine();
        if (!engine)
            return null;
        const embedding = await engine.generateEmbedding(query);
        return embedding;
    }
    catch (error) {
        console.error('[SemanticFetcher] Error generating query embedding:', error);
        return null;
    }
}
/**
 * Find similar requirements using vector similarity
 */
async function findSimilarRequirements(queryEmbedding, limit = 5) {
    try {
        // Use pgvector cosine similarity if available
        const result = await queryEdcatAI(`SELECT 
        re.requirement_id::text as id,
        re.requirement_text as text,
        pr.clause_number,
        s.code as standard_code,
        1 - (re.embedding <=> $1::vector) as similarity
      FROM edcat.requirement_embeddings re
      JOIN public.parsed_requirements pr ON pr.id::text = re.requirement_id::text
      JOIN public.standards s ON s.id = pr.standard_id
      WHERE re.embedding IS NOT NULL
      ORDER BY re.embedding <=> $1::vector
      LIMIT $2`, [JSON.stringify(queryEmbedding), limit]);
        return result.rows.map((row) => ({
            id: row.id,
            text: row.text,
            clauseNumber: row.clause_number || '',
            standardCode: row.standard_code || '',
            similarity: parseFloat(row.similarity) || 0
        }));
    }
    catch (error) {
        // Fallback to keyword search if vector search fails
        console.warn('[SemanticFetcher] Vector search failed, using keyword fallback:', error);
        return [];
    }
}
/**
 * Find similar procedures using vector similarity
 */
async function findSimilarProcedures(queryEmbedding, limit = 5) {
    try {
        const result = await queryEdcatAI(`SELECT 
        pe.procedure_id::text as id,
        pe.procedure_text as text,
        cd.file_name as document_name,
        1 - (pe.embedding <=> $1::vector) as similarity
      FROM edcat.procedure_embeddings pe
      JOIN public.customer_documents cd ON cd.id::text = pe.procedure_id::text
      WHERE pe.embedding IS NOT NULL
      ORDER BY pe.embedding <=> $1::vector
      LIMIT $2`, [JSON.stringify(queryEmbedding), limit]);
        return result.rows.map((row) => ({
            id: row.id,
            text: row.text,
            documentName: row.document_name || '',
            similarity: parseFloat(row.similarity) || 0
        }));
    }
    catch (error) {
        console.warn('[SemanticFetcher] Procedure vector search failed:', error);
        return [];
    }
}
/**
 * Fetch knowledge graph concepts related to query
 */
async function fetchKnowledgeGraphConcepts(query, limit = 5) {
    try {
        const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const keywordPattern = keywords.map(k => `%${k}%`).join('|');
        const result = await queryEdcatAI(`SELECT 
        concept_name,
        concept_description as description,
        related_concepts
      FROM edcat.vera_knowledge_graph_concepts
      WHERE concept_name ILIKE ANY(ARRAY[${keywords.map(() => '?').join(',')}])
         OR concept_description ILIKE ANY(ARRAY[${keywords.map(() => '?').join(',')}])
      ORDER BY 
        CASE WHEN concept_name ILIKE ANY(ARRAY[${keywords.map(() => '?').join(',')}]) THEN 1 ELSE 2 END,
        importance_score DESC NULLS LAST
      LIMIT $1`, [...keywords.map(k => `%${k}%`), ...keywords.map(k => `%${k}%`), ...keywords.map(k => `%${k}%`), limit]);
        return result.rows.map((row) => ({
            conceptName: row.concept_name,
            description: row.concept_description || '',
            relatedConcepts: Array.isArray(row.related_concepts)
                ? row.related_concepts
                : (row.related_concepts ? [row.related_concepts] : [])
        }));
    }
    catch (error) {
        console.warn('[SemanticFetcher] Knowledge graph query failed:', error);
        return [];
    }
}
/**
 * Fetch standard profiles related to query
 */
async function fetchStandardProfiles(query, limit = 3) {
    try {
        const result = await queryEdcatAI(`SELECT 
        standard_code,
        vera_knowledge_summary as summary,
        core_concepts
      FROM edcat.vera_standard_profiles
      WHERE standard_code ILIKE $1
         OR vera_knowledge_summary ILIKE $2
      ORDER BY created_at DESC
      LIMIT $3`, [`%${query}%`, `%${query}%`, limit]);
        return result.rows.map((row) => ({
            standardCode: row.standard_code || '',
            summary: row.summary || '',
            keyConcepts: Array.isArray(row.core_concepts) ? row.core_concepts : []
        }));
    }
    catch (error) {
        console.warn('[SemanticFetcher] Standard profile query failed:', error);
        return [];
    }
}
/**
 * Fetch reasoning chains related to query
 */
async function fetchReasoningChains(query, limit = 3) {
    try {
        const result = await queryEdcatAI(`SELECT 
        chain_id,
        reasoning_steps as reasoning,
        confidence_score as confidence
      FROM edcat.vera_requirement_reasoning_chains
      WHERE reasoning_steps ILIKE $1
      ORDER BY confidence_score DESC, created_at DESC
      LIMIT $2`, [`%${query}%`, limit]);
        return result.rows.map((row) => ({
            chainId: row.chain_id || '',
            reasoning: row.reasoning || '',
            confidence: parseFloat(row.confidence) || 0
        }));
    }
    catch (error) {
        console.warn('[SemanticFetcher] Reasoning chain query failed:', error);
        return [];
    }
}
/**
 * Main semantic fetch function
 * Combines all sources into a unified context
 */
export async function fetchSemanticContext(query, options = {}) {
    const { maxRequirements = 5, maxProcedures = 3, maxConcepts = 5, maxProfiles = 3, maxChains = 2 } = options;
    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);
    // Fetch from all sources in parallel
    const [requirements, procedures, concepts, profiles, chains] = await Promise.all([
        queryEmbedding
            ? findSimilarRequirements(queryEmbedding, maxRequirements)
            : Promise.resolve([]),
        queryEmbedding
            ? findSimilarProcedures(queryEmbedding, maxProcedures)
            : Promise.resolve([]),
        fetchKnowledgeGraphConcepts(query, maxConcepts),
        fetchStandardProfiles(query, maxProfiles),
        fetchReasoningChains(query, maxChains)
    ]);
    return {
        requirements,
        procedures,
        concepts,
        standardProfiles: profiles,
        reasoningChains: chains
    };
}
/**
 * Format semantic context for response generation
 */
export function formatSemanticContext(context) {
    let formatted = '';
    if (context.requirements.length > 0) {
        formatted += '## Relevant Requirements:\n';
        context.requirements.forEach((req, idx) => {
            formatted += `${idx + 1}. [${req.standardCode} ${req.clauseNumber}] ${req.text.substring(0, 200)}...\n`;
        });
        formatted += '\n';
    }
    if (context.procedures.length > 0) {
        formatted += '## Related Procedures:\n';
        context.procedures.forEach((proc, idx) => {
            formatted += `${idx + 1}. [${proc.documentName}] ${proc.text.substring(0, 200)}...\n`;
        });
        formatted += '\n';
    }
    if (context.concepts.length > 0) {
        formatted += '## Key Concepts:\n';
        context.concepts.forEach((concept, idx) => {
            formatted += `${idx + 1}. **${concept.conceptName}**: ${concept.description}\n`;
        });
        formatted += '\n';
    }
    if (context.standardProfiles.length > 0) {
        formatted += '## Standard Context:\n';
        context.standardProfiles.forEach((profile, idx) => {
            formatted += `${idx + 1}. **${profile.standardCode}**: ${profile.summary}\n`;
        });
        formatted += '\n';
    }
    return formatted;
}
export default { fetchSemanticContext, formatSemanticContext };
//# sourceMappingURL=semanticFetcher.js.map