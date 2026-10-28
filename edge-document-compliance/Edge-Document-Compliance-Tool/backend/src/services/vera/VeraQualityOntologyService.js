/**
 * Vera Quality Ontology Service
 *
 * Provides structured access to Quality concepts, tools, documents, processes, roles,
 * and their relationships. This gives Vera a "mental map" of Quality domain knowledge.
 */
import { queryEdcatAI } from '../../config/databases.js';
/**
 * Get a concept by name
 */
export async function getConceptByName(name) {
    try {
        const result = await queryEdcatAI(`
      SELECT 
        id,
        name,
        category,
        description,
        aliases,
        domain_tags,
        standard_codes,
        examples
      FROM edcat.quality_concepts
      WHERE LOWER(name) = LOWER($1)
         OR $1 = ANY(SELECT jsonb_array_elements_text(aliases))
      LIMIT 1
    `, [name]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            category: row.category,
            description: row.description,
            aliases: Array.isArray(row.aliases) ? row.aliases : JSON.parse(row.aliases || '[]'),
            domainTags: Array.isArray(row.domain_tags) ? row.domain_tags : JSON.parse(row.domain_tags || '[]'),
            standardCodes: Array.isArray(row.standard_codes) ? row.standard_codes : JSON.parse(row.standard_codes || '[]'),
            examples: Array.isArray(row.examples) ? row.examples : JSON.parse(row.examples || '[]')
        };
    }
    catch (error) {
        console.error('[VeraOntology] Error getting concept:', error.message);
        return null;
    }
}
/**
 * Find related concepts
 */
export async function findRelatedConcepts(conceptName, relationType) {
    try {
        // First get the concept
        const concept = await getConceptByName(conceptName);
        if (!concept) {
            return [];
        }
        let query = `
      SELECT 
        r.id,
        r.relation_type,
        r.metadata,
        s.id as source_id,
        s.name as source_name,
        s.category as source_category,
        s.description as source_description,
        t.id as target_id,
        t.name as target_name,
        t.category as target_category,
        t.description as target_description
      FROM edcat.quality_concept_relations r
      JOIN edcat.quality_concepts s ON r.source_concept_id = s.id
      JOIN edcat.quality_concepts t ON r.target_concept_id = t.id
      WHERE r.source_concept_id = $1
    `;
        const params = [concept.id];
        if (relationType) {
            query += ` AND r.relation_type = $2`;
            params.push(relationType);
        }
        const result = await queryEdcatAI(query, params);
        return result.rows.map(row => ({
            id: row.id,
            sourceConcept: {
                id: row.source_id,
                name: row.source_name,
                category: row.source_category,
                description: row.source_description,
                aliases: [],
                domainTags: [],
                standardCodes: []
            },
            targetConcept: {
                id: row.target_id,
                name: row.target_name,
                category: row.target_category,
                description: row.target_description,
                aliases: [],
                domainTags: [],
                standardCodes: []
            },
            relationType: row.relation_type,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
        }));
    }
    catch (error) {
        console.error('[VeraOntology] Error finding related concepts:', error.message);
        return [];
    }
}
/**
 * Search concepts by keyword
 */
export async function searchConcepts(keyword, category) {
    try {
        let query = `
      SELECT 
        id,
        name,
        category,
        description,
        aliases,
        domain_tags,
        standard_codes,
        examples
      FROM edcat.quality_concepts
      WHERE LOWER(name) LIKE LOWER($1)
         OR LOWER(description) LIKE LOWER($1)
         OR $1 = ANY(SELECT jsonb_array_elements_text(aliases))
    `;
        const params = [`%${keyword}%`];
        if (category) {
            query += ` AND category = $2`;
            params.push(category);
        }
        query += ` ORDER BY name LIMIT 20`;
        const result = await queryEdcatAI(query, params);
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
            description: row.description,
            aliases: Array.isArray(row.aliases) ? row.aliases : JSON.parse(row.aliases || '[]'),
            domainTags: Array.isArray(row.domain_tags) ? row.domain_tags : JSON.parse(row.domain_tags || '[]'),
            standardCodes: Array.isArray(row.standard_codes) ? row.standard_codes : JSON.parse(row.standard_codes || '[]'),
            examples: Array.isArray(row.examples) ? row.examples : JSON.parse(row.examples || '[]')
        }));
    }
    catch (error) {
        console.error('[VeraOntology] Error searching concepts:', error.message);
        return [];
    }
}
/**
 * Get concepts by category
 */
export async function getConceptsByCategory(category) {
    try {
        const result = await queryEdcatAI(`
      SELECT 
        id,
        name,
        category,
        description,
        aliases,
        domain_tags,
        standard_codes,
        examples
      FROM edcat.quality_concepts
      WHERE category = $1
      ORDER BY name
    `, [category]);
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
            description: row.description,
            aliases: Array.isArray(row.aliases) ? row.aliases : JSON.parse(row.aliases || '[]'),
            domainTags: Array.isArray(row.domain_tags) ? row.domain_tags : JSON.parse(row.domain_tags || '[]'),
            standardCodes: Array.isArray(row.standard_codes) ? row.standard_codes : JSON.parse(row.standard_codes || '[]'),
            examples: Array.isArray(row.examples) ? row.examples : JSON.parse(row.examples || '[]')
        }));
    }
    catch (error) {
        console.error('[VeraOntology] Error getting concepts by category:', error.message);
        return [];
    }
}
/**
 * Build ontology context for LLM prompts
 */
export async function buildOntologyContext(conceptNames) {
    try {
        const concepts = [];
        const relations = [];
        // Get all concepts
        for (const name of conceptNames) {
            const concept = await getConceptByName(name);
            if (concept) {
                concepts.push(concept);
                const related = await findRelatedConcepts(name);
                relations.push(...related);
            }
        }
        if (concepts.length === 0) {
            return '';
        }
        // Build context string
        let context = '**Quality Concepts:**\n';
        for (const concept of concepts) {
            context += `- **${concept.name}** (${concept.category}): ${concept.description}\n`;
            if (concept.aliases.length > 0) {
                context += `  Aliases: ${concept.aliases.join(', ')}\n`;
            }
        }
        if (relations.length > 0) {
            context += '\n**Relationships:**\n';
            for (const relation of relations) {
                context += `- ${relation.sourceConcept.name} ${relation.relationType} ${relation.targetConcept.name}\n`;
                if (relation.metadata?.description) {
                    context += `  (${relation.metadata.description})\n`;
                }
            }
        }
        return context;
    }
    catch (error) {
        console.error('[VeraOntology] Error building context:', error.message);
        return '';
    }
}
//# sourceMappingURL=VeraQualityOntologyService.js.map