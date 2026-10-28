/**
 * Compliance Knowledge Pack Loader
 * Loads and processes the Conform-Edge Compliance Knowledge Pack JSON dataset
 * for AI learning context and GAP Analysis Engine
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load the Compliance Knowledge Pack JSON dataset
 * @param {string} filePath - Path to the JSON file (optional, will search common locations)
 * @returns {Object} Parsed knowledge pack data
 */
export function loadKnowledgePack(filePath = null) {
  const searchPaths = [
    filePath,
    path.join(__dirname, '../../../data/Conform-Edge_Compliance_Knowledge_Pack.json'),
    path.join(__dirname, '../../../data/compliance-knowledge-pack.json'),
    path.join(__dirname, '../../data/Conform-Edge_Compliance_Knowledge_Pack.json'),
    path.join(__dirname, '../../data/compliance-knowledge-pack.json'),
    path.join(process.cwd(), 'data/Conform-Edge_Compliance_Knowledge_Pack.json'),
    path.join(process.cwd(), 'data/compliance-knowledge-pack.json'),
  ].filter(Boolean);

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(searchPath, 'utf8'));
        console.log(`✓ Loaded Compliance Knowledge Pack from: ${searchPath}`);
        console.log(`   Standards: ${data.standards?.length || 0}`);
        console.log(`   Learning Blocks: ${data.learning_blocks?.length || 0}`);
        console.log(`   Document Relationships: ${data.document_relationships?.length || 0}`);
        return data;
      } catch (error) {
        console.error(`Error loading knowledge pack from ${searchPath}:`, error.message);
        throw error;
      }
    }
  }

  throw new Error(`Compliance Knowledge Pack not found. Searched: ${searchPaths.join(', ')}`);
}

/**
 * Extract learning blocks from knowledge pack
 * @param {Object} knowledgePack - The loaded knowledge pack
 * @returns {Array} Array of learning blocks
 */
export function extractLearningBlocks(knowledgePack) {
  if (!knowledgePack || !knowledgePack.learning_blocks) {
    return [];
  }

  return knowledgePack.learning_blocks.map(block => ({
    id: block.id || `block-${Date.now()}-${Math.random()}`,
    standard_code: block.standard_code,
    clause_number: block.clause_number,
    requirement_text: block.requirement_text,
    keywords: block.keywords || [],
    requirement_type: block.requirement_type,
    context: block.context || {},
    relationships: block.relationships || [],
    audit_evidence: block.audit_evidence || [],
    metadata: block.metadata || {}
  }));
}

/**
 * Extract document relationships from knowledge pack
 * @param {Object} knowledgePack - The loaded knowledge pack
 * @returns {Array} Array of document relationships
 */
export function extractDocumentRelationships(knowledgePack) {
  if (!knowledgePack || !knowledgePack.document_relationships) {
    return [];
  }

  return knowledgePack.document_relationships.map(rel => ({
    source_standard: rel.source_standard,
    target_standard: rel.target_standard,
    relationship_type: rel.relationship_type,
    clause_mappings: rel.clause_mappings || [],
    description: rel.description,
    metadata: rel.metadata || {}
  }));
}

/**
 * Extract clause mappings from knowledge pack
 * @param {Object} knowledgePack - The loaded knowledge pack
 * @returns {Object} Map of standard codes to clause mappings
 */
export function extractClauseMappings(knowledgePack) {
  const mappings = {};

  if (knowledgePack?.document_relationships) {
    knowledgePack.document_relationships.forEach(rel => {
      if (rel.clause_mappings && rel.clause_mappings.length > 0) {
        const key = `${rel.source_standard}->${rel.target_standard}`;
        mappings[key] = rel.clause_mappings;
      }
    });
  }

  return mappings;
}

/**
 * Extract audit evidence structure from learning blocks
 * @param {Object} knowledgePack - The loaded knowledge pack
 * @returns {Array} Array of audit evidence structures
 */
export function extractAuditEvidenceStructures(knowledgePack) {
  const evidenceMap = {};

  if (knowledgePack?.learning_blocks) {
    knowledgePack.learning_blocks.forEach(block => {
      if (block.audit_evidence && block.audit_evidence.length > 0) {
        const key = `${block.standard_code}-${block.clause_number}`;
        evidenceMap[key] = block.audit_evidence;
      }
    });
  }

  return evidenceMap;
}

/**
 * Get standards metadata from knowledge pack
 * @param {Object} knowledgePack - The loaded knowledge pack
 * @returns {Array} Array of standards metadata
 */
export function extractStandardsMetadata(knowledgePack) {
  if (!knowledgePack || !knowledgePack.standards) {
    return [];
  }

  return knowledgePack.standards.map(std => ({
    code: std.code,
    name: std.name,
    version: std.version,
    description: std.description,
    category: std.category,
    industry: std.industry || [],
    metadata: std.metadata || {}
  }));
}

/**
 * Validate knowledge pack structure
 * @param {Object} knowledgePack - The knowledge pack to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateKnowledgePack(knowledgePack) {
  const errors = [];

  if (!knowledgePack) {
    errors.push('Knowledge pack is null or undefined');
    return { isValid: false, errors };
  }

  if (!Array.isArray(knowledgePack.learning_blocks)) {
    errors.push('learning_blocks must be an array');
  }

  if (!Array.isArray(knowledgePack.document_relationships)) {
    errors.push('document_relationships must be an array');
  }

  if (!Array.isArray(knowledgePack.standards)) {
    errors.push('standards must be an array');
  }

  // Validate learning blocks structure
  if (Array.isArray(knowledgePack.learning_blocks)) {
    knowledgePack.learning_blocks.forEach((block, index) => {
      if (!block.standard_code) {
        errors.push(`Learning block ${index} missing standard_code`);
      }
      if (!block.requirement_text) {
        errors.push(`Learning block ${index} missing requirement_text`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default {
  loadKnowledgePack,
  extractLearningBlocks,
  extractDocumentRelationships,
  extractClauseMappings,
  extractAuditEvidenceStructures,
  extractStandardsMetadata,
  validateKnowledgePack
};

