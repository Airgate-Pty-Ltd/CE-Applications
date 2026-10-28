/**
 * Vera Knowledge Graph Navigator
 * 
 * Navigates relationships between requirements, standards, and procedures
 * Uses edcat.requirement_relationships table for graph traversal
 * 
 * 100% internal - no external LLM calls.
 */

import { queryEdcatAI, queryPostgres } from '../../config/databases.js';
import { VeraCacheService } from './VeraCacheService.js';

export interface RequirementRelationship {
  id: string;
  sourceRequirementId?: string;
  targetRequirementId?: string;
  sourceType: 'requirement' | 'standard' | 'procedure' | 'clause';
  targetType: 'requirement' | 'standard' | 'procedure' | 'clause';
  relationshipType: 'depends_on' | 'complements' | 'conflicts' | 'implies' | 'references' | 'implements';
  strength: number;
  reasoning?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface NavigationPath {
  steps: RequirementRelationship[];
  totalStrength: number;
  pathLength: number;
}

export class VeraKnowledgeGraphNavigator {
  /**
   * Find all relationships for a requirement
   */
  static async getRelationships(
    requirementId: string,
    relationshipType?: RequirementRelationship['relationshipType']
  ): Promise<RequirementRelationship[]> {
    const cacheKey = `kg:nav:rels:${requirementId}:${relationshipType || 'all'}`;
    
    return VeraCacheService.getOrSet(cacheKey, async () => {
      try {
        let query = `
          SELECT * FROM edcat.requirement_relationships
          WHERE source_requirement_id = $1 OR target_requirement_id = $1
        `;
        const params: any[] = [requirementId];
        
        if (relationshipType) {
          query += ` AND relationship_type = $2`;
          params.push(relationshipType);
        }
        
        query += ` ORDER BY strength DESC, relationship_type`;
        
        const result = await queryEdcatAI(query, params);
        
        return result.rows.map(row => this.mapRowToRelationship(row));
      } catch (error: any) {
        console.error('[VeraKnowledgeGraphNavigator] Error getting relationships:', error.message);
        return [];
      }
    }, 10 * 60 * 1000); // 10 minute cache
  }

  /**
   * Find navigation path between two requirements
   */
  static async findPath(
    sourceId: string,
    targetId: string,
    maxDepth: number = 3
  ): Promise<NavigationPath | null> {
    const cacheKey = `kg:nav:path:${sourceId}:${targetId}:${maxDepth}`;
    
    return VeraCacheService.getOrSet(cacheKey, async () => {
      try {
        // Use recursive CTE to find paths
        const result = await queryEdcatAI(
          `WITH RECURSIVE path_search AS (
            -- Start with direct relationships
            SELECT 
              id, source_requirement_id, target_requirement_id,
              source_type, target_type, relationship_type, strength,
              reasoning, metadata, created_at, updated_at,
              ARRAY[source_requirement_id, target_requirement_id] as path,
              1 as depth,
              strength as total_strength
            FROM edcat.requirement_relationships
            WHERE source_requirement_id = $1 OR target_requirement_id = $1
            
            UNION ALL
            
            -- Recursively find connected relationships
            SELECT 
              r.id, r.source_requirement_id, r.target_requirement_id,
              r.source_type, r.target_type, r.relationship_type, r.strength,
              r.reasoning, r.metadata, r.created_at, r.updated_at,
              ps.path || CASE 
                WHEN r.source_requirement_id = ANY(ps.path) THEN r.target_requirement_id
                ELSE r.source_requirement_id
              END,
              ps.depth + 1,
              ps.total_strength * r.strength
            FROM edcat.requirement_relationships r
            JOIN path_search ps ON (
              r.source_requirement_id = ANY(ps.path) OR
              r.target_requirement_id = ANY(ps.path)
            )
            WHERE ps.depth < $2
              AND NOT (CASE 
                WHEN r.source_requirement_id = ANY(ps.path) THEN r.target_requirement_id
                ELSE r.source_requirement_id
              END = ANY(ps.path))
          )
          SELECT * FROM path_search
          WHERE $3 = ANY(path)
          ORDER BY depth ASC, total_strength DESC
          LIMIT 1`,
          [sourceId, maxDepth, targetId]
        );
        
        if (result.rows.length === 0) {
          return null;
        }
        
        const pathRow = result.rows[0];
        const pathIds = pathRow.path;
        
        // Reconstruct the full path
        const steps: RequirementRelationship[] = [];
        for (let i = 0; i < pathIds.length - 1; i++) {
          const relResult = await queryEdcatAI(
            `SELECT * FROM edcat.requirement_relationships
             WHERE (source_requirement_id = $1 AND target_requirement_id = $2)
                OR (source_requirement_id = $2 AND target_requirement_id = $1)
             ORDER BY strength DESC
             LIMIT 1`,
            [pathIds[i], pathIds[i + 1]]
          );
          
          if (relResult.rows.length > 0) {
            steps.push(this.mapRowToRelationship(relResult.rows[0]));
          }
        }
        
        return {
          steps,
          totalStrength: parseFloat(pathRow.total_strength),
          pathLength: pathRow.depth
        };
      } catch (error: any) {
        console.error('[VeraKnowledgeGraphNavigator] Error finding path:', error.message);
        return null;
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Get all requirements that depend on a given requirement
   */
  static async getDependents(requirementId: string): Promise<RequirementRelationship[]> {
    return this.getRelationships(requirementId, 'depends_on');
  }

  /**
   * Get all requirements that a given requirement depends on
   */
  static async getDependencies(requirementId: string): Promise<RequirementRelationship[]> {
    try {
      const result = await queryEdcatAI(
        `SELECT * FROM edcat.requirement_relationships
         WHERE target_requirement_id = $1
           AND relationship_type = 'depends_on'
         ORDER BY strength DESC`,
        [requirementId]
      );
      
      return result.rows.map(row => this.mapRowToRelationship(row));
    } catch (error: any) {
      console.error('[VeraKnowledgeGraphNavigator] Error getting dependencies:', error.message);
      return [];
    }
  }

  /**
   * Get conflicting requirements
   */
  static async getConflicts(requirementId: string): Promise<RequirementRelationship[]> {
    return this.getRelationships(requirementId, 'conflicts');
  }

  /**
   * Get complementary requirements
   */
  static async getComplements(requirementId: string): Promise<RequirementRelationship[]> {
    return this.getRelationships(requirementId, 'complements');
  }

  /**
   * Add a relationship
   */
  static async addRelationship(relationship: Omit<RequirementRelationship, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.requirement_relationships
         (source_requirement_id, target_requirement_id, source_type, target_type,
          relationship_type, strength, reasoning, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (source_requirement_id, target_requirement_id, relationship_type)
         DO UPDATE SET
           strength = EXCLUDED.strength,
           reasoning = EXCLUDED.reasoning,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()
         RETURNING id`,
        [
          relationship.sourceRequirementId || null,
          relationship.targetRequirementId || null,
          relationship.sourceType,
          relationship.targetType,
          relationship.relationshipType,
          relationship.strength,
          relationship.reasoning || null,
          JSON.stringify(relationship.metadata || {})
        ]
      );
      
      if (result.rows.length > 0) {
        // Clear cache
        VeraCacheService.clearPattern('kg:nav:*');
        return result.rows[0].id;
      }
      
      return null;
    } catch (error: any) {
      console.error('[VeraKnowledgeGraphNavigator] Error adding relationship:', error.message);
      return null;
    }
  }

  /**
   * Map database row to Relationship object
   */
  private static mapRowToRelationship(row: any): RequirementRelationship {
    return {
      id: row.id,
      sourceRequirementId: row.source_requirement_id,
      targetRequirementId: row.target_requirement_id,
      sourceType: row.source_type,
      targetType: row.target_type,
      relationshipType: row.relationship_type,
      strength: parseFloat(row.strength),
      reasoning: row.reasoning,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

