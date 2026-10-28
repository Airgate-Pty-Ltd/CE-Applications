/**
 * Standards & Regulatory GAP Analysis Engine
 * Uses the Compliance Knowledge Pack to perform intelligent gap analysis
 * between standards, regulations, and customer requirements
 */

import {
  loadKnowledgePack,
  extractLearningBlocks,
  extractDocumentRelationships,
  extractClauseMappings,
  extractAuditEvidenceStructures,
  extractStandardsMetadata
} from './knowledgePackLoader.js';

import { getEmbeddingService } from './embeddingService.js';

class GapAnalysisEngine {
  constructor() {
    this.knowledgePack = null;
    this.learningBlocks = [];
    this.documentRelationships = [];
    this.clauseMappings = {};
    this.auditEvidenceStructures = {};
    this.standardsMetadata = [];
    this.embeddingService = null;
    this.initialized = false;
  }

  /**
   * Initialize the engine with knowledge pack data
   * @param {string} knowledgePackPath - Path to knowledge pack JSON (optional)
   */
  async initialize(knowledgePackPath = null) {
    if (this.initialized) {
      console.log('GAP Analysis Engine already initialized');
      return;
    }

    try {
      // Load knowledge pack
      this.knowledgePack = loadKnowledgePack(knowledgePackPath);
      
      // Extract structured data
      this.learningBlocks = extractLearningBlocks(this.knowledgePack);
      this.documentRelationships = extractDocumentRelationships(this.knowledgePack);
      this.clauseMappings = extractClauseMappings(this.knowledgePack);
      this.auditEvidenceStructures = extractAuditEvidenceStructures(this.knowledgePack);
      this.standardsMetadata = extractStandardsMetadata(this.knowledgePack);

      // Initialize embedding service
      this.embeddingService = getEmbeddingService();
      
      // Build vocabulary for TF-IDF embeddings
      if (this.learningBlocks.length > 0) {
        this.embeddingService.buildVocabulary(this.learningBlocks);
        
        // Generate embeddings for all learning blocks
        console.log('Generating embeddings for learning blocks...');
        for (const block of this.learningBlocks) {
          block.embedding = await this.embeddingService.embedLearningBlock(block);
        }
        console.log(`✓ Generated embeddings for ${this.learningBlocks.length} learning blocks`);
      }

      this.initialized = true;
      console.log('✓ GAP Analysis Engine initialized successfully');
      console.log(`   Learning Blocks: ${this.learningBlocks.length}`);
      console.log(`   Document Relationships: ${this.documentRelationships.length}`);
      console.log(`   Standards: ${this.standardsMetadata.length}`);
    } catch (error) {
      console.error('Error initializing GAP Analysis Engine:', error.message);
      throw error;
    }
  }

  /**
   * Find related clauses between standards
   * @param {string} sourceStandard - Source standard code
   * @param {string} targetStandard - Target standard code
   * @returns {Array} Array of clause mappings
   */
  findClauseMappings(sourceStandard, targetStandard) {
    const key = `${sourceStandard}->${targetStandard}`;
    return this.clauseMappings[key] || [];
  }

  /**
   * Find document relationships
   * @param {string} standardCode - Standard code to find relationships for
   * @returns {Array} Array of related documents
   */
  findDocumentRelationships(standardCode) {
    return this.documentRelationships.filter(rel => 
      rel.source_standard === standardCode || rel.target_standard === standardCode
    );
  }

  /**
   * Find similar requirements using semantic search
   * @param {string} requirementText - Requirement text to search for
   * @param {string} standardCode - Optional standard code to filter by
   * @param {number} topK - Number of results to return
   * @returns {Promise<Array>} Array of similar learning blocks
   */
  async findSimilarRequirements(requirementText, standardCode = null, topK = 5) {
    if (!this.initialized) {
      await this.initialize();
    }

    let blocksToSearch = this.learningBlocks;
    if (standardCode) {
      blocksToSearch = blocksToSearch.filter(block => block.standard_code === standardCode);
    }

    const similar = await this.embeddingService.findSimilar(
      requirementText,
      blocksToSearch,
      topK
    );

    return similar.map(result => ({
      ...result.block,
      similarity_score: result.similarity
    }));
  }

  /**
   * Perform gap analysis between two standards
   * @param {string} sourceStandard - Source standard code
   * @param {string} targetStandard - Target standard code
   * @returns {Promise<Object>} Gap analysis result
   */
  async analyzeGap(sourceStandard, targetStandard) {
    if (!this.initialized) {
      await this.initialize();
    }

    const sourceBlocks = this.learningBlocks.filter(b => b.standard_code === sourceStandard);
    const targetBlocks = this.learningBlocks.filter(b => b.standard_code === targetStandard);
    
    const gaps = [];
    const covered = [];
    const mappings = this.findClauseMappings(sourceStandard, targetStandard);

    // For each source requirement, find if there's a corresponding target requirement
    for (const sourceBlock of sourceBlocks) {
      const similar = await this.embeddingService.findSimilar(
        sourceBlock.requirement_text,
        targetBlocks,
        1
      );

      if (similar.length > 0 && similar[0].similarity > 0.7) {
        covered.push({
          source_clause: sourceBlock.clause_number,
          target_clause: similar[0].block.clause_number,
          similarity: similar[0].similarity,
          source_requirement: sourceBlock.requirement_text,
          target_requirement: similar[0].block.requirement_text
        });
      } else {
        gaps.push({
          source_clause: sourceBlock.clause_number,
          source_requirement: sourceBlock.requirement_text,
          gap_type: 'missing_in_target',
          severity: this.assessGapSeverity(sourceBlock)
        });
      }
    }

    // Find requirements in target that don't exist in source
    for (const targetBlock of targetBlocks) {
      const similar = await this.embeddingService.findSimilar(
        targetBlock.requirement_text,
        sourceBlocks,
        1
      );

      if (similar.length === 0 || similar[0].similarity < 0.7) {
        gaps.push({
          target_clause: targetBlock.clause_number,
          target_requirement: targetBlock.requirement_text,
          gap_type: 'missing_in_source',
          severity: this.assessGapSeverity(targetBlock)
        });
      }
    }

    return {
      source_standard: sourceStandard,
      target_standard: targetStandard,
      total_source_requirements: sourceBlocks.length,
      total_target_requirements: targetBlocks.length,
      covered_requirements: covered.length,
      gaps_found: gaps.length,
      coverage_percentage: sourceBlocks.length > 0 
        ? Math.round((covered.length / sourceBlocks.length) * 100) 
        : 0,
      gaps: gaps,
      mappings: mappings,
      relationships: this.findDocumentRelationships(sourceStandard)
    };
  }

  /**
   * Assess gap severity based on requirement type and keywords
   * @param {Object} learningBlock - Learning block
   * @returns {string} Severity level (high, medium, low)
   */
  assessGapSeverity(learningBlock) {
    const mandatoryKeywords = ['shall', 'must', 'required', 'mandatory', 'prohibited'];
    const advisoryKeywords = ['should', 'may', 'recommend', 'consider'];

    const text = (learningBlock.requirement_text || '').toLowerCase();
    const hasMandatory = mandatoryKeywords.some(kw => text.includes(kw));
    const hasAdvisory = advisoryKeywords.some(kw => text.includes(kw));

    if (hasMandatory) {
      return 'high';
    } else if (hasAdvisory) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get audit evidence requirements for a clause
   * @param {string} standardCode - Standard code
   * @param {string} clauseNumber - Clause number
   * @returns {Array} Array of audit evidence requirements
   */
  getAuditEvidence(standardCode, clauseNumber) {
    const key = `${standardCode}-${clauseNumber}`;
    return this.auditEvidenceStructures[key] || [];
  }

  /**
   * Get standard metadata
   * @param {string} standardCode - Standard code
   * @returns {Object} Standard metadata
   */
  getStandardMetadata(standardCode) {
    return this.standardsMetadata.find(std => std.code === standardCode) || null;
  }

  /**
   * Get all learning blocks for a standard
   * @param {string} standardCode - Standard code
   * @returns {Array} Array of learning blocks
   */
  getLearningBlocksForStandard(standardCode) {
    return this.learningBlocks.filter(block => block.standard_code === standardCode);
  }

  /**
   * Search learning blocks by keyword or text
   * @param {string} query - Search query
   * @param {Object} filters - Optional filters (standardCode, requirementType, etc.)
   * @returns {Promise<Array>} Array of matching learning blocks
   */
  async searchLearningBlocks(query, filters = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    let blocks = this.learningBlocks;

    // Apply filters
    if (filters.standardCode) {
      blocks = blocks.filter(b => b.standard_code === filters.standardCode);
    }
    if (filters.requirementType) {
      blocks = blocks.filter(b => b.requirement_type === filters.requirementType);
    }
    if (filters.clauseNumber) {
      blocks = blocks.filter(b => b.clause_number === filters.clauseNumber);
    }

    // Use semantic search if query provided
    if (query && query.trim().length > 0) {
      const similar = await this.embeddingService.findSimilar(query, blocks, filters.topK || 10);
      return similar.map(result => ({
        ...result.block,
        similarity_score: result.similarity
      }));
    }

    return blocks;
  }
}

// Export singleton instance
let gapAnalysisEngineInstance = null;

export function getGapAnalysisEngine() {
  if (!gapAnalysisEngineInstance) {
    gapAnalysisEngineInstance = new GapAnalysisEngine();
  }
  return gapAnalysisEngineInstance;
}

export default GapAnalysisEngine;

