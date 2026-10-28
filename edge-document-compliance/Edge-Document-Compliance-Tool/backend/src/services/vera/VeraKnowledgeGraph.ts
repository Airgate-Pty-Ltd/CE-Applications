/**
 * Vera Knowledge Graph Service
 * 
 * Manages relationships between standards, clauses, and requirements.
 * Enables cross-standard reasoning and relationship queries.
 * 
 * 100% internal - no external LLM calls.
 */

import { queryEdcatAI } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';
import { VeraCacheService } from './VeraCacheService.js';

export interface KnowledgeRelationship {
  id: string;
  sourceType: 'standard' | 'clause' | 'requirement';
  sourceId?: string;
  sourceCode: string;
  targetType: 'standard' | 'clause' | 'requirement';
  targetId?: string;
  targetCode: string;
  relationshipType: 'similar_to' | 'derived_from' | 'supersedes' | 'references' | 'conflicts_with' | 'related_to' | 'maps_to';
  confidence: number;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class VeraKnowledgeGraph {
  /**
   * Get related standards for a given standard
   */
  static async getRelatedStandards(
    standardCode: string,
    minConfidence: number = 0.7
  ): Promise<KnowledgeRelationship[]> {
    const cacheKey = `kg:related:${standardCode}:${minConfidence}`;
    
    return VeraCacheService.getOrSet(cacheKey, async () => {
      try {
        const result = await queryEdcatAI(
          `SELECT * FROM edcat.knowledge_relationships
           WHERE source_code = $1
             AND source_type = 'standard'
             AND target_type = 'standard'
             AND confidence >= $2
           ORDER BY confidence DESC, relationship_type`,
          [standardCode, minConfidence]
        );

        return this.mapRowsToRelationships(result.rows);
      } catch (error: any) {
        console.error('[VeraKnowledgeGraph] Error getting related standards:', error.message);
        return [];
      }
    }, 10 * 60 * 1000); // 10 minute cache
  }

  /**
   * Get related clauses for a standard/clause
   */
  static async getRelatedClauses(
    standardCode: string,
    clauseRef: string,
    minConfidence: number = 0.7
  ): Promise<KnowledgeRelationship[]> {
    const clauseCode = `${standardCode}:${clauseRef}`;
    const cacheKey = `kg:clauses:${clauseCode}:${minConfidence}`;
    
    return VeraCacheService.getOrSet(cacheKey, async () => {
      try {
        const result = await queryEdcatAI(
          `SELECT * FROM edcat.knowledge_relationships
           WHERE (source_code = $1 OR source_code LIKE $2)
             AND source_type = 'clause'
             AND target_type = 'clause'
             AND confidence >= $3
           ORDER BY confidence DESC`,
          [clauseCode, `${standardCode}:%`, minConfidence]
        );

        return this.mapRowsToRelationships(result.rows);
      } catch (error: any) {
        console.error('[VeraKnowledgeGraph] Error getting related clauses:', error.message);
        return [];
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Add a relationship
   */
  static async addRelationship(params: {
    sourceCode: string;
    targetCode: string;
    sourceType: 'standard' | 'clause' | 'requirement';
    targetType: 'standard' | 'clause' | 'requirement';
    relationshipType: KnowledgeRelationship['relationshipType'];
    confidence?: number;
    metadata?: any;
    sourceId?: string;
    targetId?: string;
  }): Promise<string> {
    const {
      sourceCode,
      targetCode,
      sourceType,
      targetType,
      relationshipType,
      confidence = 0.8,
      metadata = {},
      sourceId,
      targetId
    } = params;

    const relationshipId = uuidv4();

    try {
      await queryEdcatAI(
        `INSERT INTO edcat.knowledge_relationships
         (id, source_type, source_id, source_code, target_type, target_id, target_code,
          relationship_type, confidence, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT (source_code, target_code, relationship_type)
         DO UPDATE SET
           confidence = GREATEST(knowledge_relationships.confidence, EXCLUDED.confidence),
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
        [
          relationshipId,
          sourceType,
          sourceId || null,
          sourceCode,
          targetType,
          targetId || null,
          targetCode,
          relationshipType,
          confidence,
          JSON.stringify(metadata)
        ]
      );

      // Invalidate cache
      VeraCacheService.invalidatePattern(`kg:.*${sourceCode}.*`);
      VeraCacheService.invalidatePattern(`kg:.*${targetCode}.*`);

      return relationshipId;
    } catch (error: any) {
      console.error('[VeraKnowledgeGraph] Error adding relationship:', error.message);
      return relationshipId;
    }
  }

  /**
   * Seed initial relationships (known truths)
   */
  static async seedInitialRelationships(): Promise<void> {
    const relationships = [
      // AS9100 series relationships
      { source: 'AS9100D', target: 'ISO9001_2015', type: 'derived_from' as const, confidence: 0.95 },
      { source: 'AS9110C', target: 'AS9100D', type: 'derived_from' as const, confidence: 0.9 },
      { source: 'AS9120B', target: 'AS9100D', type: 'derived_from' as const, confidence: 0.9 },
      { source: 'AS9100D', target: 'ISO9001_2015', type: 'similar_to' as const, confidence: 0.9 },
      
      // ISO relationships
      { source: 'ISO13485_2016', target: 'ISO9001_2015', type: 'derived_from' as const, confidence: 0.85 },
      { source: 'ISO14971_2019', target: 'ISO13485_2016', type: 'references' as const, confidence: 0.8 },
      
      // Regulatory relationships
      { source: 'FAA_PART21_137', target: 'AS9100D', type: 'related_to' as const, confidence: 0.75 },
      { source: 'CASA_CASRS_VOL01', target: 'AS9100D', type: 'related_to' as const, confidence: 0.75 },
      { source: 'EASA_1321_2014', target: 'AS9100D', type: 'related_to' as const, confidence: 0.75 },
      
      // Clause mappings (AS9100D 8.7 similar to ISO 9001 8.7)
      { source: 'AS9100D:8.7', target: 'ISO9001_2015:8.7', type: 'maps_to' as const, confidence: 0.85 },
      { source: 'AS9100D:8.5', target: 'ISO9001_2015:8.5', type: 'maps_to' as const, confidence: 0.85 },
      { source: 'AS9100D:7.5', target: 'ISO9001_2015:7.5', type: 'maps_to' as const, confidence: 0.85 },
      
      // FAA 21.137 clause mappings
      { source: 'FAA_PART21_137:21.137(a)', target: 'AS9100D:7.1', type: 'related_to' as const, confidence: 0.7 },
      { source: 'FAA_PART21_137:21.137(m)', target: 'AS9100D:8.2', type: 'related_to' as const, confidence: 0.7 },
    ];

    for (const rel of relationships) {
      try {
        await this.addRelationship({
          sourceCode: rel.source,
          targetCode: rel.target,
          sourceType: rel.source.includes(':') ? 'clause' : 'standard',
          targetType: rel.target.includes(':') ? 'clause' : 'standard',
          relationshipType: rel.type,
          confidence: rel.confidence,
          metadata: { seeded: true, source: 'initial_seed' }
        });
      } catch (error: any) {
        console.warn(`[VeraKnowledgeGraph] Could not seed relationship ${rel.source} -> ${rel.target}:`, error.message);
      }
    }

    console.log('[VeraKnowledgeGraph] ✓ Seeded initial relationships');
  }

  /**
   * Find all relationships for a code (both as source and target)
   */
  static async findAllRelationships(code: string): Promise<{
    asSource: KnowledgeRelationship[];
    asTarget: KnowledgeRelationship[];
  }> {
    try {
      const [sourceResult, targetResult] = await Promise.all([
        queryEdcatAI(
          `SELECT * FROM edcat.knowledge_relationships
           WHERE source_code = $1
           ORDER BY confidence DESC`,
          [code]
        ),
        queryEdcatAI(
          `SELECT * FROM edcat.knowledge_relationships
           WHERE target_code = $1
           ORDER BY confidence DESC`,
          [code]
        )
      ]);

      return {
        asSource: this.mapRowsToRelationships(sourceResult.rows),
        asTarget: this.mapRowsToRelationships(targetResult.rows)
      };
    } catch (error: any) {
      console.error('[VeraKnowledgeGraph] Error finding relationships:', error.message);
      return { asSource: [], asTarget: [] };
    }
  }

  /**
   * Map database rows to Relationship objects
   */
  private static mapRowsToRelationships(rows: any[]): KnowledgeRelationship[] {
    return rows.map((r: any) => ({
      id: r.id,
      sourceType: r.source_type,
      sourceId: r.source_id,
      sourceCode: r.source_code,
      targetType: r.target_type,
      targetId: r.target_id,
      targetCode: r.target_code,
      relationshipType: r.relationship_type,
      confidence: parseFloat(r.confidence) || 0.8,
      metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : {},
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  /**
   * Infer relationships from document content (heuristic)
   */
  static async inferRelationshipsFromContent(
    standardCode: string,
    content: string
  ): Promise<void> {
    // Look for mentions of other standards
    const standardPatterns = [
      /\b(AS9100[A-Z]?)\b/gi,
      /\b(AS9110[A-Z]?)\b/gi,
      /\b(AS9120[A-Z]?)\b/gi,
      /\b(ISO\s*9001)\b/gi,
      /\b(ISO\s*13485)\b/gi,
      /\b(FAA\s*Part\s*21)\b/gi,
      /\b(CASA\s*CASRS)\b/gi,
      /\b(EASA)\b/gi
    ];

    const mentionedStandards = new Set<string>();
    for (const pattern of standardPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].toUpperCase() !== standardCode.toUpperCase()) {
          mentionedStandards.add(match[1].toUpperCase().replace(/\s+/g, '_'));
        }
      }
    }

    // Create "references" relationships
    for (const mentioned of mentionedStandards) {
      await this.addRelationship({
        sourceCode: standardCode,
        targetCode: mentioned,
        sourceType: 'standard',
        targetType: 'standard',
        relationshipType: 'references',
        confidence: 0.7,
        metadata: { inferred: true, source: 'content_analysis' }
      });
    }
  }
}

