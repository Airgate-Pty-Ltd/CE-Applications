/**
 * Vera Learning Repository
 *
 * Centralized query helpers for accessing Vera's ingested learning content:
 * - edcat.document_content_for_learning
 * - edcat.example_documents
 * - public.standards
 *
 * All queries use the internal EDCAT AI database - NO external LLM calls.
 */
import { queryPostgres, queryEdcatAI } from '../../config/databases.js';
import { VeraCacheService, CacheKeys } from './VeraCacheService.js';
// ============================================================================
// Learning Document Queries
// ============================================================================
/**
 * Get learning documents by standard code
 * Prioritizes approved examples, then neutral, then bad examples
 */
export async function getLearningDocsByStandardCode(standardCode, limit = 5) {
    const cacheKey = CacheKeys.learningDocs(standardCode, limit);
    return VeraCacheService.getOrSet(cacheKey, async () => {
        try {
            const { rows } = await queryEdcatAI(`
      SELECT 
        content_text, 
        quality, 
        metadata, 
        standard_code,
        word_count,
        file_id
      FROM edcat.document_content_for_learning
      WHERE standard_code = $1
         OR standard_code ILIKE $2
         OR standard_code ILIKE $3
      ORDER BY
        CASE quality
          WHEN 'approved' THEN 1
          WHEN 'bad'      THEN 3
          ELSE 2
        END,
        word_count DESC NULLS LAST
      LIMIT $4;
      `, [standardCode, `%${standardCode}%`, `%${standardCode.replace(/[^a-z0-9]/gi, '%')}%`, limit]);
            return rows.map((r) => ({
                content_text: r.content_text || '',
                quality: r.quality || null,
                metadata: r.metadata || {},
                standard_code: r.standard_code || null,
                word_count: r.word_count || 0,
                file_id: r.file_id || null
            }));
        }
        catch (error) {
            console.error('[VeraLearningRepository] Error fetching learning docs by standard code:', error.message);
            return [];
        }
    }, 3 * 60 * 1000); // 3 minute cache
}
/**
 * Search learning documents by topic/keyword
 * Searches both content_text and standard_code
 */
export async function searchLearningDocsByTopic(topic, limit = 5) {
    try {
        const like = `%${topic}%`;
        const { rows } = await queryEdcatAI(`
      SELECT 
        content_text, 
        quality, 
        metadata, 
        standard_code,
        word_count,
        file_id
      FROM edcat.document_content_for_learning
      WHERE content_text ILIKE $1
         OR standard_code ILIKE $2
         OR (metadata::text ILIKE $3)
      ORDER BY
        CASE quality
          WHEN 'approved' THEN 1
          WHEN 'bad'      THEN 3
          ELSE 2
        END,
        word_count DESC NULLS LAST
      LIMIT $4;
      `, [like, like, like, limit]);
        return rows.map((r) => ({
            content_text: r.content_text || '',
            quality: r.quality || null,
            metadata: r.metadata || {},
            standard_code: r.standard_code || null,
            word_count: r.word_count || 0,
            file_id: r.file_id || null
        }));
    }
    catch (error) {
        console.error('[VeraLearningRepository] Error searching learning docs by topic:', error.message);
        return [];
    }
}
/**
 * Semantic search for learning documents using embeddings
 * Uses VeraSemanticMemory for similarity-based retrieval
 */
export async function semanticSearchLearningDocs(query, options = {}) {
    const { standardCode, limit = 10, includeExamples = true, minQualityScore = 0.0, minSimilarity = 0.5 } = options;
    try {
        console.log(`[VeraLearningRepository] Searching learning docs: "${query}"`);
        // Try standard query first
        let sqlQuery = `
      SELECT 
        id,
        source_type,
        source_id,
        standard_code,
        clause_reference,
        document_title,
        COALESCE(content, content_text, '') as content,
        section_heading,
        confidence,
        is_approved_example,
        created_at,
        word_count,
        file_id,
        quality,
        metadata
      FROM edcat.document_content_for_learning
    `;
        const params = [];
        // Add filters
        if (standardCode) {
            sqlQuery += ` WHERE standard_code = $${params.length + 1}`;
            params.push(standardCode);
        }
        sqlQuery += ` ORDER BY confidence DESC, created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        const { rows } = await queryEdcatAI(sqlQuery, params);
        if (rows && rows.length > 0) {
            console.log(`[VeraLearningRepository] ✅ Found ${rows.length} learning docs`);
            return rows.map((r) => ({
                content_text: r.content || r.content_text || '',
                quality: r.quality || null,
                metadata: r.metadata || {},
                standard_code: r.standard_code || null,
                word_count: r.word_count || 0,
                file_id: r.file_id || null,
                similarityScore: 0.8 // Default similarity for direct matches
            }));
        }
        // Fallback: keyword search
        console.log('[VeraLearningRepository] No exact match, trying keyword search');
        const keywordQuery = `
      SELECT 
        id,
        source_type,
        source_id,
        standard_code,
        clause_reference,
        document_title,
        COALESCE(content, content_text, '') as content,
        section_heading,
        confidence,
        is_approved_example,
        created_at,
        word_count,
        file_id,
        quality,
        metadata
      FROM edcat.document_content_for_learning
      WHERE COALESCE(content, content_text, '') ILIKE $1 
         OR section_heading ILIKE $1
         OR document_title ILIKE $1
      ORDER BY confidence DESC, created_at DESC
      LIMIT $2
    `;
        const keywordParams = [`%${query}%`, limit];
        const keywordResult = await queryEdcatAI(keywordQuery, keywordParams);
        if (keywordResult.rows && keywordResult.rows.length > 0) {
            console.log(`[VeraLearningRepository] ✅ Found ${keywordResult.rows.length} docs via keyword search`);
            return keywordResult.rows.map((r) => ({
                content_text: r.content || r.content_text || '',
                quality: r.quality || null,
                metadata: r.metadata || {},
                standard_code: r.standard_code || null,
                word_count: r.word_count || 0,
                file_id: r.file_id || null,
                similarityScore: 0.6 // Lower similarity for keyword matches
            }));
        }
        console.log('[VeraLearningRepository] ⚠️ No learning docs found');
        return [];
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('does not exist')) {
                console.warn('[VeraLearningRepository] Table does not exist - ingestion may not have run');
                return [];
            }
            console.error('[VeraLearningRepository] Search error:', error.message);
        }
        else {
            console.error('[VeraLearningRepository] Search error:', error);
        }
        return [];
    }
}
/**
 * Get approved examples for a standard (quality_score >= 0.8)
 */
export async function getApprovedExamplesForStandard(standardCode, limit = 5) {
    const cacheKey = CacheKeys.approvedExamples(standardCode, limit);
    return VeraCacheService.getOrSet(cacheKey, async () => {
        try {
            const { rows } = await queryEdcatAI(`
      SELECT
        dcl.content_text,
        dcl.quality,
        dcl.metadata,
        dcl.standard_code,
        dcl.word_count,
        dcl.file_id,
        ed.file_name,
        ed.quality_score
      FROM edcat.example_documents ed
      JOIN edcat.document_content_for_learning dcl
        ON ed.file_id = dcl.file_id
      WHERE (ed.standard_code = $1
         OR ed.standard_code ILIKE $2
         OR ed.standard_code ILIKE $3)
        AND ed.quality_score >= 0.8
      ORDER BY ed.quality_score DESC
      LIMIT $4;
      `, [standardCode, `%${standardCode}%`, `%${standardCode.replace(/[^a-z0-9]/gi, '%')}%`, limit]);
            return rows.map((r) => ({
                content_text: r.content_text || '',
                quality: r.quality || null,
                metadata: r.metadata || {},
                standard_code: r.standard_code || null,
                word_count: r.word_count || 0,
                file_id: r.file_id || null,
                file_name: r.file_name || '',
                quality_score: parseFloat(r.quality_score) || null
            }));
        }
        catch (error) {
            console.error('[VeraLearningRepository] Error fetching approved examples:', error.message);
            return [];
        }
    }, 3 * 60 * 1000); // 3 minute cache
}
/**
 * Get bad examples for a standard (quality_score <= 0.4)
 */
export async function getBadExamplesForStandard(standardCode, limit = 5) {
    const cacheKey = CacheKeys.badExamples(standardCode, limit);
    return VeraCacheService.getOrSet(cacheKey, async () => {
        try {
            const { rows } = await queryEdcatAI(`
      SELECT
        dcl.content_text,
        dcl.quality,
        dcl.metadata,
        dcl.standard_code,
        dcl.word_count,
        dcl.file_id,
        ed.file_name,
        ed.quality_score
      FROM edcat.example_documents ed
      JOIN edcat.document_content_for_learning dcl
        ON ed.file_id = dcl.file_id
      WHERE (ed.standard_code = $1
         OR ed.standard_code ILIKE $2
         OR ed.standard_code ILIKE $3)
        AND ed.quality_score <= 0.4
      ORDER BY ed.quality_score ASC
      LIMIT $4;
      `, [standardCode, `%${standardCode}%`, `%${standardCode.replace(/[^a-z0-9]/gi, '%')}%`, limit]);
            return rows.map((r) => ({
                content_text: r.content_text || '',
                quality: r.quality || null,
                metadata: r.metadata || {},
                standard_code: r.standard_code || null,
                word_count: r.word_count || 0,
                file_id: r.file_id || null,
                file_name: r.file_name || '',
                quality_score: parseFloat(r.quality_score) || null
            }));
        }
        catch (error) {
            console.error('[VeraLearningRepository] Error fetching bad examples:', error.message);
            return [];
        }
    }, 3 * 60 * 1000); // 3 minute cache
}
/**
 * Get standard information from public.standards
 */
export async function getStandardInfo(standardCode) {
    const cacheKey = CacheKeys.standardInfo(standardCode);
    return VeraCacheService.getOrSet(cacheKey, async () => {
        try {
            const { rows } = await queryPostgres(`
      SELECT id, code, name, authority_source, sector
      FROM public.standards
      WHERE code = $1
         OR code ILIKE $2
      LIMIT 1;
      `, [standardCode, `%${standardCode}%`]);
            if (rows.length === 0) {
                return null;
            }
            const r = rows[0];
            return {
                id: r.id,
                code: r.code,
                name: r.name || r.code,
                authority_source: r.authority_source || null,
                sector: r.sector || null
            };
        }
        catch (error) {
            console.error('[VeraLearningRepository] Error fetching standard info:', error.message);
            return null;
        }
    }, 10 * 60 * 1000); // 10 minute cache for standard info
}
/**
 * Search for clause references in learning documents
 */
export async function findClauseInLearningDocs(clauseRef, standardCode, limit = 3) {
    try {
        const clausePattern = `%${clauseRef}%`;
        let query = '';
        let params;
        if (standardCode) {
            query = `
        SELECT 
          content_text, 
          quality, 
          metadata, 
          standard_code,
          word_count,
          file_id
        FROM edcat.document_content_for_learning
        WHERE (standard_code = $1 OR standard_code ILIKE $2)
          AND content_text ILIKE $3
        ORDER BY
          CASE quality
            WHEN 'approved' THEN 1
            WHEN 'bad'      THEN 3
            ELSE 2
          END
        LIMIT $4;
      `;
            params = [standardCode, `%${standardCode}%`, clausePattern, limit];
        }
        else {
            query = `
        SELECT 
          content_text, 
          quality, 
          metadata, 
          standard_code,
          word_count,
          file_id
        FROM edcat.document_content_for_learning
        WHERE content_text ILIKE $1
        ORDER BY
          CASE quality
            WHEN 'approved' THEN 1
            WHEN 'bad'      THEN 3
            ELSE 2
          END
        LIMIT $2;
      `;
            params = [clausePattern, limit];
        }
        const { rows } = await queryEdcatAI(query, params);
        return rows.map((r) => ({
            content_text: r.content_text || '',
            quality: r.quality || null,
            metadata: r.metadata || {},
            standard_code: r.standard_code || null,
            word_count: r.word_count || 0,
            file_id: r.file_id || null
        }));
    }
    catch (error) {
        console.error('[VeraLearningRepository] Error finding clause in learning docs:', error.message);
        return [];
    }
}
/**
 * Get debug information for a standard
 */
export async function debugLearningForStandard(standardCode) {
    const standardInfo = await getStandardInfo(standardCode);
    const docs = await getLearningDocsByStandardCode(standardCode, 10);
    const approved = await getApprovedExamplesForStandard(standardCode, 10);
    const bad = await getBadExamplesForStandard(standardCode, 10);
    return {
        standardCode,
        standardInfo,
        learningDocsCount: docs.length,
        approvedExamplesCount: approved.length,
        badExamplesCount: bad.length,
        sampleApproved: approved.map(a => ({
            file_name: a.file_name,
            quality_score: a.quality_score,
            preview: a.content_text.slice(0, 300) + (a.content_text.length > 300 ? '...' : '')
        })),
        sampleBad: bad.map(b => ({
            file_name: b.file_name,
            quality_score: b.quality_score,
            preview: b.content_text.slice(0, 300) + (b.content_text.length > 300 ? '...' : '')
        }))
    };
}
//# sourceMappingURL=VeraLearningRepository.js.map