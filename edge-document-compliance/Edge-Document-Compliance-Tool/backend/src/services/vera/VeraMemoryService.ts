/**
 * Vera Memory Service
 * 
 * Enhanced memory and retrieval system for Vera.
 * Stores and retrieves:
 * - Conversation context
 * - Learned facts and corrections
 * - User preferences
 * - Standard-specific knowledge
 * - Cross-session memory
 * 
 * All data stored in EDCAT AI database - 100% internal.
 */

import { queryEdcatAI, queryPostgres } from '../../config/databases.js';
import { v4 as uuidv4 } from 'uuid';
import { VeraCacheService, CacheKeys } from './VeraCacheService.js';
import { veraEngineHealth } from './VeraEngineHealthService.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface MemoryEntry {
  id: string;
  tenantId: string;
  sessionId?: string;
  userId?: string;
  key: string;
  value: any;
  category: 'fact' | 'preference' | 'correction' | 'context' | 'standard_knowledge';
  standardCode?: string;
  topic?: string;
  confidence: number;
  source: string; // 'user', 'conversation', 'ingestion', 'system'
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  metadata?: any;
}

export interface ConversationContext {
  sessionId: string;
  tenantId: string;
  userId: string;
  recentMessages: Array<{
    role: 'user' | 'assistant';
    message: string;
    intent?: string;
    topic?: string;
    timestamp: Date;
  }>;
  activeTopics: string[];
  activeStandards: string[];
  userPreferences: Record<string, any>;
  learnedFacts: Array<{
    key: string;
    value: any;
    confidence: number;
  }>;
}

// ============================================================================
// Main Service
// ============================================================================

export class VeraMemoryService {
  /**
   * Store a memory entry
   */
  static async storeMemory(params: {
    tenantId: string;
    sessionId?: string;
    userId?: string;
    key: string;
    value: any;
    category: MemoryEntry['category'];
    standardCode?: string;
    topic?: string;
    confidence?: number;
    source?: string;
    metadata?: any;
  }): Promise<string> {
    const {
      tenantId,
      sessionId,
      userId,
      key,
      value,
      category,
      standardCode,
      topic,
      confidence = 0.8,
      source = 'conversation',
      metadata
    } = params;

    const memoryId = uuidv4();

    try {
      // Store in edcat.vera_memory table (create if doesn't exist)
      await queryEdcatAI(
        `INSERT INTO edcat.vera_memory 
         (id, tenant_id, session_id, user_id, memory_key, memory_value, category, 
          standard_code, topic, confidence, source, metadata, created_at, last_accessed, access_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), 1)
         ON CONFLICT (tenant_id, memory_key, category, COALESCE(standard_code, ''::text))
         DO UPDATE SET
           memory_value = EXCLUDED.memory_value,
           confidence = GREATEST(vera_memory.confidence, EXCLUDED.confidence),
           last_accessed = NOW(),
           access_count = vera_memory.access_count + 1,
           metadata = EXCLUDED.metadata`,
        [
          memoryId,
          tenantId,
          sessionId || null,
          userId || null,
          key,
          JSON.stringify(value),
          category,
          standardCode || null,
          topic || null,
          confidence,
          source,
          JSON.stringify(metadata || {})
        ]
      );

      // Invalidate relevant cache
      if (standardCode) {
        VeraCacheService.invalidatePattern(`.*${standardCode}.*`);
      }
      if (category === 'fact' || category === 'correction') {
        VeraCacheService.invalidatePattern(`memory:.*`);
      }

      return memoryId;
    } catch (error: any) {
      // If table doesn't exist, create it and retry
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        await this.ensureMemoryTable();
        return this.storeMemory(params); // Retry
      }
      console.error('[VeraMemoryService] Error storing memory:', error.message);
      return memoryId; // Return ID even if storage failed
    }
  }

  /**
   * Retrieve memory entries
   */
  static async retrieveMemory(params: {
    tenantId: string;
    key?: string;
    category?: MemoryEntry['category'];
    standardCode?: string;
    topic?: string;
    limit?: number;
  }): Promise<MemoryEntry[]> {
    const {
      tenantId,
      key,
      category,
      standardCode,
      topic,
      limit = 10
    } = params;

    const cacheKey = `memory:${tenantId}:${key || 'all'}:${category || 'all'}:${standardCode || 'all'}`;
    
    return VeraCacheService.getOrSet(cacheKey, async () => {
      try {
        let query = `
          SELECT 
            id, tenant_id, session_id, user_id, memory_key, memory_value, category,
            standard_code, topic, confidence, source, metadata, created_at, 
            last_accessed, access_count
          FROM edcat.vera_memory
          WHERE tenant_id = $1
        `;
        const params: any[] = [tenantId];
        let paramIndex = 2;

        if (key) {
          query += ` AND memory_key = $${paramIndex}`;
          params.push(key);
          paramIndex++;
        }

        if (category) {
          query += ` AND category = $${paramIndex}`;
          params.push(category);
          paramIndex++;
        }

        if (standardCode) {
          query += ` AND (standard_code = $${paramIndex} OR standard_code IS NULL)`;
          params.push(standardCode);
          paramIndex++;
        }

        if (topic) {
          query += ` AND (topic ILIKE $${paramIndex} OR topic IS NULL)`;
          params.push(`%${topic}%`);
          paramIndex++;
        }

        query += ` ORDER BY confidence DESC, last_accessed DESC, access_count DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await queryEdcatAI(query, params);

        // Update last_accessed for retrieved entries
        if (result.rows.length > 0) {
          const ids = result.rows.map((r: any) => r.id);
          await queryEdcatAI(
            `UPDATE edcat.vera_memory 
             SET last_accessed = NOW(), access_count = access_count + 1
             WHERE id = ANY($1)`,
            [ids]
          ).catch(() => {}); // Non-fatal
        }

        return result.rows.map((r: any) => ({
          id: r.id,
          tenantId: r.tenant_id,
          sessionId: r.session_id,
          userId: r.user_id,
          key: r.memory_key,
          value: typeof r.memory_value === 'string' ? JSON.parse(r.memory_value) : r.memory_value,
          category: r.category,
          standardCode: r.standard_code,
          topic: r.topic,
          confidence: parseFloat(r.confidence) || 0.5,
          source: r.source,
          createdAt: r.created_at,
          lastAccessed: r.last_accessed,
          accessCount: parseInt(r.access_count) || 0,
          metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : {}
        }));
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          await this.ensureMemoryTable();
          return []; // Return empty on first call
        }
        console.error('[VeraMemoryService] Error retrieving memory:', error.message);
        return [];
      }
    }, 2 * 60 * 1000); // 2 minute cache
  }

  /**
   * Get conversation context for a session
   */
  static async getConversationContext(params: {
    tenantId: string;
    sessionId: string;
    userId: string;
    messageLimit?: number;
  }): Promise<ConversationContext> {
    const { tenantId, sessionId, userId, messageLimit = 10 } = params;
    const cacheKey = CacheKeys.conversationHistory(sessionId, messageLimit);

    return VeraCacheService.getOrSet(cacheKey, async () => {
      try {
        // Get recent conversation history - handle missing columns gracefully
        const historyResult = await queryEdcatAI(
          `SELECT 
             COALESCE(role, 'assistant') as role, 
             COALESCE(message_text, message, '') as message_text, 
             intent, 
             metadata, 
             created_at
           FROM edcat.ai_conversation_history
           WHERE tenant_id = $1 AND session_id = $2
           ORDER BY created_at DESC
           LIMIT $3`,
          [tenantId, sessionId, messageLimit]
        ).catch((err: any) => {
          console.error('[VeraMemoryService] Error getting conversation context:', err.message);
          const message = err?.message || String(err);
          const isSchema = /column .* does not exist/i.test(message);
          veraEngineHealth.recordIssue(
            isSchema ? 'DB_SCHEMA_MISMATCH' : 'CONVERSATION_MEMORY_ERROR',
            'Error retrieving conversation context from database. ' +
              'This means I may not remember previous messages correctly.',
            isSchema ? 'error' : 'warning',
            { rawError: message, source: 'VeraMemoryService' }
          );
          return { rows: [] };
        });

        const recentMessages = historyResult.rows.map((r: any) => ({
          role: r.role,
          message: r.message_text,
          intent: r.intent,
          topic: r.metadata?.topic,
          timestamp: r.created_at
        })).reverse(); // Reverse to get chronological order

        // Extract active topics and standards
        const activeTopics = new Set<string>();
        const activeStandards = new Set<string>();

        for (const msg of recentMessages) {
          if (msg.topic) activeTopics.add(msg.topic);
          if (msg.metadata?.standardCode) activeStandards.add(msg.metadata.standardCode);
        }

        // Get user preferences
        const preferences = await this.retrieveMemory({
          tenantId,
          category: 'preference',
          limit: 20
        });

        const userPreferences: Record<string, any> = {};
        for (const pref of preferences) {
          userPreferences[pref.key] = pref.value;
        }

        // Get learned facts relevant to this conversation
        const learnedFacts = await this.retrieveMemory({
          tenantId,
          category: 'fact',
          limit: 10
        });

        return {
          sessionId,
          tenantId,
          userId,
          recentMessages,
          activeTopics: Array.from(activeTopics),
          activeStandards: Array.from(activeStandards),
          userPreferences,
          learnedFacts: learnedFacts.map(f => ({
            key: f.key,
            value: f.value,
            confidence: f.confidence
          }))
        };
      } catch (error: any) {
        console.error('[VeraMemoryService] Error getting conversation context:', error.message);
        const message = error?.message || String(error);
        const isSchema = /column .* does not exist/i.test(message);
        veraEngineHealth.recordIssue(
          isSchema ? 'DB_SCHEMA_MISMATCH' : 'CONVERSATION_MEMORY_ERROR',
          'Error retrieving conversation context from database. ' +
            'This means I may not remember previous messages correctly.',
          isSchema ? 'error' : 'warning',
          { rawError: message, source: 'VeraMemoryService' }
        );
        return {
          sessionId,
          tenantId,
          userId,
          recentMessages: [],
          activeTopics: [],
          activeStandards: [],
          userPreferences: {},
          learnedFacts: []
        };
      }
    }, 1 * 60 * 1000); // 1 minute cache
  }

  /**
   * Store a learned fact or correction
   */
  static async learnFact(params: {
    tenantId: string;
    key: string;
    value: any;
    standardCode?: string;
    topic?: string;
    confidence?: number;
    source?: string;
  }): Promise<string> {
    return this.storeMemory({
      ...params,
      category: 'fact',
      source: params.source || 'conversation'
    });
  }

  /**
   * Store a user correction
   */
  static async storeCorrection(params: {
    tenantId: string;
    sessionId: string;
    userId: string;
    originalAnswer: string;
    correctedAnswer: string;
    question: string;
    intent?: string;
    topic?: string;
    standardCode?: string;
  }): Promise<string> {
    const {
      tenantId,
      sessionId,
      userId,
      originalAnswer,
      correctedAnswer,
      question,
      intent,
      topic,
      standardCode
    } = params;

    // Store as both correction and fact
    const correctionId = await this.storeMemory({
      tenantId,
      sessionId,
      userId,
      key: `correction:${question.substring(0, 50)}`,
      value: {
        question,
        originalAnswer,
        correctedAnswer,
        intent,
        topic
      },
      category: 'correction',
      standardCode,
      topic,
      confidence: 0.9,
      source: 'user'
    });

    // Also store the corrected answer as a fact
    await this.learnFact({
      tenantId,
      key: `fact:${question.substring(0, 50)}`,
      value: correctedAnswer,
      standardCode,
      topic,
      confidence: 0.9,
      source: 'user_correction'
    });

    return correctionId;
  }

  /**
   * Search memories by text similarity
   */
  static async searchMemories(params: {
    tenantId: string;
    query: string;
    category?: MemoryEntry['category'];
    limit?: number;
  }): Promise<MemoryEntry[]> {
    const { tenantId, query, category, limit = 5 } = params;

    try {
      const searchQuery = `
        SELECT 
          id, tenant_id, session_id, user_id, memory_key, memory_value, category,
          standard_code, topic, confidence, source, metadata, created_at, 
          last_accessed, access_count
        FROM edcat.vera_memory
        WHERE tenant_id = $1
          AND (
            memory_key ILIKE $2
            OR memory_value::text ILIKE $2
            OR topic ILIKE $2
          )
          ${category ? `AND category = $3` : ''}
        ORDER BY 
          CASE 
            WHEN memory_key ILIKE $2 THEN 1
            WHEN topic ILIKE $2 THEN 2
            ELSE 3
          END,
          confidence DESC,
          last_accessed DESC
        LIMIT ${category ? '$4' : '$3'}
      `;

      const paramsList: any[] = [tenantId, `%${query}%`];
      if (category) {
        paramsList.push(category);
      }
      paramsList.push(limit);

      const result = await queryEdcatAI(searchQuery, paramsList);

      return result.rows.map((r: any) => ({
        id: r.id,
        tenantId: r.tenant_id,
        sessionId: r.session_id,
        userId: r.user_id,
        key: r.memory_key,
        value: typeof r.memory_value === 'string' ? JSON.parse(r.memory_value) : r.memory_value,
        category: r.category,
        standardCode: r.standard_code,
        topic: r.topic,
        confidence: parseFloat(r.confidence) || 0.5,
        source: r.source,
        createdAt: r.created_at,
        lastAccessed: r.last_accessed,
        accessCount: parseInt(r.access_count) || 0,
        metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : {}
      }));
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        await this.ensureMemoryTable();
        return [];
      }
      console.error('[VeraMemoryService] Error searching memories:', error.message);
      return [];
    }
  }

  /**
   * Ensure memory table exists
   */
  private static async ensureMemoryTable(): Promise<void> {
    try {
      await queryEdcatAI(`
        CREATE TABLE IF NOT EXISTS edcat.vera_memory (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          session_id TEXT,
          user_id TEXT,
          memory_key TEXT NOT NULL,
          memory_value JSONB NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('fact', 'preference', 'correction', 'context', 'standard_knowledge')),
          standard_code TEXT,
          topic TEXT,
          confidence FLOAT DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
          source TEXT DEFAULT 'conversation',
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_accessed TIMESTAMPTZ DEFAULT NOW(),
          access_count INTEGER DEFAULT 1
        );
        
        -- Create unique index that handles NULL standard_code
        CREATE UNIQUE INDEX IF NOT EXISTS idx_vera_memory_unique 
        ON edcat.vera_memory(tenant_id, memory_key, category, COALESCE(standard_code, ''::text));

        CREATE INDEX IF NOT EXISTS idx_vera_memory_tenant ON edcat.vera_memory(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_vera_memory_key ON edcat.vera_memory(memory_key);
        CREATE INDEX IF NOT EXISTS idx_vera_memory_category ON edcat.vera_memory(category);
        CREATE INDEX IF NOT EXISTS idx_vera_memory_standard ON edcat.vera_memory(standard_code);
        CREATE INDEX IF NOT EXISTS idx_vera_memory_topic ON edcat.vera_memory(topic);
        CREATE INDEX IF NOT EXISTS idx_vera_memory_accessed ON edcat.vera_memory(last_accessed DESC);
      `);
      console.log('[VeraMemoryService] ✓ Memory table ensured');
    } catch (error: any) {
      console.error('[VeraMemoryService] Error ensuring memory table:', error.message);
    }
  }
}

