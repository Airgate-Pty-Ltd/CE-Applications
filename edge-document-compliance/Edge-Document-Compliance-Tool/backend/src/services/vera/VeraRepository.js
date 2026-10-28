/**
 * Vera Repository
 * Comprehensive data access layer for all Vera/AI tables
 * Provides typed, consistent access to all database tables used by Vera
 */

import { queryEdcatAI, queryPostgres } from '../../config/databases.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Error handling wrapper for repository methods
 */
function withErrorHandling(fn, methodName) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`[VeraRepository.${methodName}] Error:`, error.message);
      console.error(`[VeraRepository.${methodName}] Stack:`, error.stack);
      // Return null/empty array based on expected return type
      if (fn.name.includes('get') || fn.name.includes('find')) {
        return null;
      }
      if (fn.name.includes('list') || fn.name.includes('getAll')) {
        return [];
      }
      throw error; // Re-throw for critical operations
    }
  };
}

/**
 * Persona & Profile Management
 */
export const PersonaRepository = {
  /**
   * Get Vera's persona profile
   */
  async getVeraPersonaProfile(tenantId = DEFAULT_TENANT_ID) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.ai_persona_profile 
       WHERE tenant_id = $1 AND persona_code = 'vera' 
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get persona by code
   */
  async getPersona(personaCode, tenantId = DEFAULT_TENANT_ID) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.ai_persona 
       WHERE tenant_id = $1 AND persona_code = $2`,
      [tenantId, personaCode]
    );
    return result.rows[0] || null;
  },

  /**
   * Get response templates
   */
  async getResponseTemplates(templateType = null, tenantId = DEFAULT_TENANT_ID) {
    try {
      let query = `SELECT * FROM edcat.vera_response_templates WHERE tenant_id = $1`;
      const params = [tenantId];
      
      if (templateType) {
        query += ` AND template_type = $2`;
        params.push(templateType);
      }
      
      query += ` ORDER BY priority DESC, created_at DESC`;
      
      const result = await queryEdcatAI(query, params);
      return result.rows;
    } catch (error) {
      console.error('[PersonaRepository] Error getting response templates:', error.message);
      return [];
    }
  },

  /**
   * Get greeting templates
   */
  async getGreetingTemplates(tenantId = DEFAULT_TENANT_ID) {
    return this.getResponseTemplates('greeting', tenantId);
  }
};

/**
 * Standards & Requirements Intelligence
 */
export const StandardsRepository = {
  /**
   * Get standard by ID
   */
  async getStandard(standardId) {
    try {
      const result = await queryPostgres(
        `SELECT * FROM public.standards WHERE id = $1`,
        [standardId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('[StandardsRepository] Error getting standard:', error.message);
      return null;
    }
  },

  /**
   * Get standard by code
   */
  async getStandardByCode(code) {
    const result = await queryPostgres(
      `SELECT * FROM public.standards WHERE code = $1 ORDER BY uploaded_at DESC LIMIT 1`,
      [code]
    );
    return result.rows[0] || null;
  },

  /**
   * Get requirements for a standard
   */
  async getRequirementsForStandard(standardId, clauseNumber = null) {
    let query = `SELECT * FROM public.parsed_requirements WHERE standard_id = $1`;
    const params = [standardId];
    
    if (clauseNumber) {
      query += ` AND clause_number = $2`;
      params.push(clauseNumber);
    }
    
    query += ` ORDER BY clause_number, sub_ref NULLS LAST`;
    
    const result = await queryPostgres(query, params);
    return result.rows;
  },

  /**
   * Get requirements for a clause (including all subclauses)
   * Returns all requirements where subclause starts with clauseNumber
   */
  async getRequirementsForClause(standardId, clauseNumber) {
    const result = await queryPostgres(
      `SELECT * FROM public.parsed_requirements 
       WHERE standard_id = $1 
       AND (subclause = $2 OR subclause LIKE $3)
       ORDER BY subclause, paragraph`,
      [standardId, clauseNumber, `${clauseNumber}.%`]
    );
    return result.rows;
  },

  /**
   * Get requirement by clause reference
   */
  async getRequirementByClause(standardId, clauseRef) {
    const result = await queryPostgres(
      `SELECT * FROM public.parsed_requirements 
       WHERE standard_id = $1 AND (clause_number = $2 OR clause_ref = $2 OR full_ref = $2)
       ORDER BY confidence DESC NULLS LAST LIMIT 1`,
      [standardId, clauseRef]
    );
    return result.rows[0] || null;
  },

  /**
   * Get requirement embeddings for similarity search
   */
  async getRequirementEmbeddings(requirementId) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.requirement_embeddings WHERE requirement_id = $1`,
      [requirementId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find similar requirements using embeddings
   */
  async findSimilarRequirements(requirementId, limit = 5) {
    const embedding = await this.getRequirementEmbeddings(requirementId);
    if (!embedding || !embedding.similar_requirement_ids) {
      return [];
    }
    
    // Return top similar requirements
    const similarIds = embedding.similar_requirement_ids.slice(0, limit);
    if (similarIds.length === 0) return [];
    
    const result = await queryPostgres(
      `SELECT * FROM public.parsed_requirements WHERE id = ANY($1)`,
      [similarIds]
    );
    return result.rows;
  },

  /**
   * Get clause blueprint
   */
  async getClauseBlueprint(standardCode, clauseNumber, tenantId = DEFAULT_TENANT_ID) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.ai_clause_blueprint 
       WHERE tenant_id = $1 AND standard_code = $2 AND clause_id = $3`,
      [tenantId, standardCode, clauseNumber]
    );
    return result.rows[0] || null;
  },

  /**
   * Get crosswalk mapping between standards
   */
  async getCrosswalkMapping(sourceStandard, targetStandard, clauseNumber, tenantId = DEFAULT_TENANT_ID) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.ai_crosswalk_blueprint 
       WHERE tenant_id = $1 
       AND source_standard = $2 
       AND target_standard = $3 
       AND source_clause_id = $4`,
      [tenantId, sourceStandard, targetStandard, clauseNumber]
    );
    return result.rows;
  }
};

/**
 * Conversation Memory & Context
 */
export const ConversationRepository = {
  /**
   * Create or get conversation session
   */
  async getOrCreateSession(userId, tenantId = DEFAULT_TENANT_ID, conversationId = null) {
    try {
      // Auto-create tables if they don't exist
      await this.ensureTablesExist();
      
      if (conversationId) {
        const result = await queryEdcatAI(
          `SELECT * FROM edcat.vera_conversation_context 
           WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, userId]
        );
        if (result.rows.length > 0) {
          return result.rows[0];
        }
      }

      // Create new context
      const newContext = await queryEdcatAI(
        `INSERT INTO edcat.vera_conversation_context 
         (user_id, tenant_id, conversation_id, active_task, current_phase)
         VALUES ($1, $2, gen_random_uuid(), 'undefined', 'greeting')
         RETURNING *`,
        [userId, tenantId]
      );
      return newContext.rows[0];
    } catch (error) {
      // If table doesn't exist, try to create it and retry
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('[ConversationRepository] Tables missing, creating them...');
        await this.ensureTablesExist();
        // Retry once
        return this.getOrCreateSession(userId, tenantId, conversationId);
      }
      console.error('[ConversationRepository] Error getting/creating session:', error.message);
      throw error; // Re-throw as this is critical
    }
  },

  /**
   * Ensure conversation tables exist (auto-create if missing)
   */
  async ensureTablesExist() {
    try {
      // Create vera_conversation_context table in edcat schema
      await queryEdcatAI(`
        CREATE TABLE IF NOT EXISTS edcat.vera_conversation_context (
          context_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
          conversation_id UUID NOT NULL UNIQUE,
          active_task TEXT,
          current_phase TEXT DEFAULT 'greeting',
          conversation_topic TEXT,
          last_user_input TEXT,
          last_vera_response TEXT,
          messages_in_current_phase INT DEFAULT 0,
          confidence_level DECIMAL(3,2) DEFAULT 0.75,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Create indexes
      await queryEdcatAI(`
        CREATE INDEX IF NOT EXISTS idx_vera_conversation_context_user 
        ON edcat.vera_conversation_context(user_id, tenant_id)
      `).catch(() => {}); // Ignore if index already exists
      
      await queryEdcatAI(`
        CREATE INDEX IF NOT EXISTS idx_vera_conversation_context_conversation 
        ON edcat.vera_conversation_context(conversation_id)
      `).catch(() => {}); // Ignore if index already exists

      // Create vera_conversation_history table in edcat schema
      await queryEdcatAI(`
        CREATE TABLE IF NOT EXISTS edcat.vera_conversation_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          message_content TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // Create indexes for history
      await queryEdcatAI(`
        CREATE INDEX IF NOT EXISTS idx_vera_conversation_history_conversation 
        ON edcat.vera_conversation_history(conversation_id, created_at DESC)
      `).catch(() => {}); // Ignore if index already exists
      
      await queryEdcatAI(`
        CREATE INDEX IF NOT EXISTS idx_vera_conversation_history_role 
        ON edcat.vera_conversation_history(conversation_id, role)
      `).catch(() => {}); // Ignore if index already exists

      // Add foreign key constraint if it doesn't exist
      // CRITICAL: Ensure the referenced table exists and has the UNIQUE constraint first
      try {
        // First, ensure conversation_id has a UNIQUE constraint on vera_conversation_context
        await queryEdcatAI(`
          DO $$ 
          BEGIN
            -- Add UNIQUE constraint if it doesn't exist
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'vera_conversation_context_conversation_id_key'
              AND conrelid = 'edcat.vera_conversation_context'::regclass
            ) THEN
              ALTER TABLE edcat.vera_conversation_context
              ADD CONSTRAINT vera_conversation_context_conversation_id_key
              UNIQUE (conversation_id);
            END IF;
          END $$;
        `).catch(() => {}); // Ignore if constraint already exists
        
        // Now add the foreign key
        await queryEdcatAI(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'vera_conversation_history_conversation_id_fkey'
              AND conrelid = 'edcat.vera_conversation_history'::regclass
            ) THEN
              ALTER TABLE edcat.vera_conversation_history
              ADD CONSTRAINT vera_conversation_history_conversation_id_fkey
              FOREIGN KEY (conversation_id) 
              REFERENCES edcat.vera_conversation_context(conversation_id) 
              ON DELETE CASCADE;
            END IF;
          END $$;
        `);
      } catch (fkError) {
        // Foreign key might already exist or table might not be ready
        console.warn('[ConversationRepository] Could not add foreign key constraint:', fkError.message);
      }
    } catch (error) {
      console.error('[ConversationRepository] Error ensuring tables exist:', error.message);
      // Don't throw - let the calling function handle it
    }
  },

  /**
   * Save conversation turn
   */
  async saveConversationTurn(sessionId, role, message, metadata = {}) {
    try {
      // Ensure tables exist before saving
      await this.ensureTablesExist();
      
      // Save to vera_conversation_history
      const historyResult = await queryEdcatAI(
        `INSERT INTO edcat.vera_conversation_history 
         (conversation_id, role, message_content, metadata, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [sessionId, role, message, JSON.stringify(metadata)]
      );

      // Update conversation context
      try {
        if (role === 'user') {
          await queryEdcatAI(
            `UPDATE edcat.vera_conversation_context 
             SET last_user_input = $1, messages_in_current_phase = messages_in_current_phase + 1
             WHERE conversation_id = $2`,
            [message, sessionId]
          );
        } else if (role === 'assistant') {
          await queryEdcatAI(
            `UPDATE edcat.vera_conversation_context 
             SET last_vera_response = $1, messages_in_current_phase = messages_in_current_phase + 1
             WHERE conversation_id = $2`,
            [message, sessionId]
          );
        }
      } catch (ctxError) {
        console.warn('[ConversationRepository] Error updating context (non-fatal):', ctxError.message);
      }

      return historyResult.rows[0];
    } catch (error) {
      console.error('[ConversationRepository] Error saving conversation turn:', error.message);
      throw error; // Re-throw as this is critical
    }
  },

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId, limit = 50) {
    try {
      await this.ensureTablesExist();
      const result = await queryEdcatAI(
        `SELECT * FROM edcat.vera_conversation_history 
         WHERE conversation_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [sessionId, limit]
      );
      return result.rows.reverse(); // Return in chronological order
    } catch (error) {
      // If table doesn't exist, return empty array
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return [];
      }
      throw error;
    }
  },

  /**
   * Get conversation context
   */
  async getConversationContext(sessionId) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.vera_conversation_context WHERE conversation_id = $1`,
      [sessionId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update conversation context
   */
  async updateConversationContext(sessionId, updates) {
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    params.push(sessionId);

    const result = await queryEdcatAI(
      `UPDATE vera_conversation_context 
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE conversation_id = $${paramIndex}
       RETURNING *`,
      params
    );
    return result.rows[0];
  }
};

/**
 * Learning & Self-Improvement
 */
export const LearningRepository = {
  /**
   * Log learning event
   */
  async logLearningEvent(eventData) {
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_learning_events 
         (event_type, learned_item, confidence_before, confidence_after, 
          is_positive, value, triggering_action, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
          eventData.event_type,
          eventData.learned_item,
          eventData.confidence_before || 0.50,
          eventData.confidence_after || 0.70,
          eventData.is_positive !== false,
          eventData.value || 0.80,
          eventData.triggering_action,
          JSON.stringify(eventData.metadata || {})
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[LearningRepository] Error logging learning event:', error.message);
      return null; // Non-critical, return null on error
    }
  },

  /**
   * Record response effectiveness
   */
  async recordResponseEffectiveness(responseData) {
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_response_effectiveness 
         (conversation_id, question_type, standard_mentioned, context_used,
          user_satisfaction_rating, was_helpful, user_feedback_text, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [
          responseData.conversation_id,
          responseData.question_type,
          responseData.standard_mentioned,
          JSON.stringify(responseData.context_used || {}),
          responseData.user_satisfaction_rating,
          responseData.was_helpful,
          responseData.user_feedback_text
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[LearningRepository] Error recording response effectiveness:', error.message);
      return null; // Non-critical
    }
  },

  /**
   * Record data gap
   */
  async recordDataGap(gapData) {
    const result = await queryEdcatAI(
      `INSERT INTO edcat.vera_data_gaps 
       (gap_type, standard_mentioned, clause_mentioned, document_type,
        example_question, example_response, gap_description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        gapData.gap_type,
        gapData.standard_mentioned,
        gapData.clause_mentioned,
        gapData.document_type,
        gapData.example_question,
        gapData.example_response,
        gapData.gap_description
      ]
    );
    return result.rows[0];
  },

  /**
   * Get learning events for analysis
   */
  async getLearningEvents(filters = {}) {
    let query = `SELECT * FROM edcat.vera_learning_events WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (filters.event_type) {
      query += ` AND event_type = $${paramIndex}`;
      params.push(filters.event_type);
      paramIndex++;
    }

    if (filters.start_date) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(filters.limit || 100);

    const result = await queryEdcatAI(query, params);
    return result.rows;
  }
};

/**
 * Regulatory & Research Intelligence
 */
export const ResearchRepository = {
  /**
   * Create research request
   */
  async createResearchRequest(requestData) {
    try {
      const result = await queryEdcatAI(
        `INSERT INTO edcat.vera_research_requests 
         (user_id, tenant_id, conversation_id, request_type, request_query,
          primary_topic, countries_mentioned, industries_mentioned, standards_mentioned,
          desired_depth, status, research_started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'researching', NOW())
         RETURNING *`,
        [
          requestData.user_id,
          requestData.tenant_id || DEFAULT_TENANT_ID,
          requestData.conversation_id,
          requestData.request_type,
          requestData.request_query,
          requestData.primary_topic,
          requestData.countries_mentioned || [],
          requestData.industries_mentioned || [],
          requestData.standards_mentioned || [],
          requestData.desired_depth || 'comprehensive'
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('[ResearchRepository] Error creating research request:', error.message);
      throw error; // Re-throw as this is needed for tracking
    }
  },

  /**
   * Update research request with results
   */
  async updateResearchRequest(requestId, results) {
    const result = await queryEdcatAI(
      `UPDATE edcat.vera_research_requests 
       SET status = $1,
           research_completed_at = NOW(),
           duration_seconds = $2,
           sources_found = $3,
           authoritative_sources = $4,
           research_summary = $5,
           confidence_in_findings = $6
       WHERE request_id = $7
       RETURNING *`,
      [
        results.status || 'complete',
        results.duration_seconds,
        results.sources_found || 0,
        results.authoritative_sources || 0,
        JSON.stringify(results.summary || {}),
        results.confidence || 0.50,
        requestId
      ]
    );
    return result.rows[0];
  },

  /**
   * Get research request
   */
  async getResearchRequest(requestId) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.vera_research_requests WHERE request_id = $1`,
      [requestId]
    );
    return result.rows[0] || null;
  },

  /**
   * Save research source
   */
  async saveResearchSource(sourceData) {
    const result = await queryEdcatAI(
      `INSERT INTO edcat.vera_research_sources_web 
       (research_request_id, source_url, source_title, source_type,
        credibility_score, content_summary, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        sourceData.research_request_id,
        sourceData.source_url,
        sourceData.source_title,
        sourceData.source_type || 'web',
        sourceData.credibility_score || 0.50,
        sourceData.content_summary
      ]
    );
    return result.rows[0];
  },

  /**
   * Get regulatory lookup
   */
  async getRegulatoryLookup(regulator, reference) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.vera_regulatory_lookup 
       WHERE regulator = $1 AND reference_code = $2
       ORDER BY created_at DESC LIMIT 1`,
      [regulator, reference]
    );
    return result.rows[0] || null;
  },

  /**
   * Save regulatory lookup
   */
  async saveRegulatoryLookup(lookupData) {
    const result = await queryEdcatAI(
      `INSERT INTO edcat.vera_regulatory_lookup 
       (regulator, reference_code, regulation_title, regulation_text,
        source_url, last_verified_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (regulator, reference_code) 
       DO UPDATE SET regulation_text = EXCLUDED.regulation_text,
                     last_verified_at = NOW()
       RETURNING *`,
      [
        lookupData.regulator,
        lookupData.reference_code,
        lookupData.regulation_title,
        lookupData.regulation_text,
        lookupData.source_url
      ]
    );
    return result.rows[0];
  }
};

/**
 * Knowledge Graph Repository
 */
export const KnowledgeGraphRepository = {
  /**
   * Get concept by name
   */
  async getConcept(conceptName) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.vera_knowledge_graph_concepts WHERE concept_name = $1`,
      [conceptName]
    );
    return result.rows[0] || null;
  },

  /**
   * Get concept relationships
   */
  async getConceptRelationships(conceptId) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.vera_concept_relationships 
       WHERE concept_id_1 = $1 OR concept_id_2 = $1
       ORDER BY relationship_strength DESC NULLS LAST`,
      [conceptId]
    );
    return result.rows;
  },

  /**
   * Create or update concept
   */
  async createOrUpdateConcept(conceptData) {
    const result = await queryEdcatAI(
      `INSERT INTO edcat.vera_knowledge_graph_concepts 
       (concept_name, concept_description, is_universal_concept, appears_in_standards,
        related_concepts, requirement_ids, importance_score, complexity_score,
        implementation_examples, common_misconceptions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (concept_name) 
       DO UPDATE SET concept_description = EXCLUDED.concept_description,
                     appears_in_standards = EXCLUDED.appears_in_standards,
                     related_concepts = EXCLUDED.related_concepts,
                     last_updated = NOW()
       RETURNING *`,
      [
        conceptData.concept_name,
        conceptData.concept_description,
        conceptData.is_universal_concept || false,
        conceptData.appears_in_standards || [],
        JSON.stringify(conceptData.related_concepts || {}),
        conceptData.requirement_ids || [],
        conceptData.importance_score,
        conceptData.complexity_score,
        conceptData.implementation_examples || [],
        conceptData.common_misconceptions || []
      ]
    );
    return result.rows[0];
  },

  /**
   * Create concept relationship
   */
  async createConceptRelationship(relationshipData) {
    const result = await queryEdcatAI(
      `INSERT INTO edcat.vera_concept_relationships 
       (concept_id_1, concept_id_2, relationship_type, relationship_strength,
        relationship_reason, supporting_requirements)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        relationshipData.concept_id_1,
        relationshipData.concept_id_2,
        relationshipData.relationship_type,
        relationshipData.relationship_strength || 0.50,
        relationshipData.relationship_reason,
        JSON.stringify(relationshipData.supporting_requirements || {})
      ]
    );
    return result.rows[0];
  }
};

/**
 * Pattern Discovery Repository
 */
export const PatternDiscoveryRepository = {
  /**
   * Get pattern by name
   */
  async getPattern(patternName) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.vera_pattern_discoveries WHERE pattern_name = $1`,
      [patternName]
    );
    return result.rows[0] || null;
  },

  /**
   * Get patterns by type
   */
  async getPatternsByType(patternType, limit = 10) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.vera_pattern_discoveries 
       WHERE pattern_type = $1 
       ORDER BY significance_score DESC NULLS LAST, discovered_at DESC
       LIMIT $2`,
      [patternType, limit]
    );
    return result.rows;
  },

  /**
   * Create or update pattern
   */
  async createOrUpdatePattern(patternData) {
    const result = await queryEdcatAI(
      `INSERT INTO edcat.vera_pattern_discoveries 
       (pattern_name, pattern_description, pattern_type, appears_in_standards,
        appears_in_industries, frequency_count, significance_score, interpretation,
        vera_application, validation_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (pattern_name) 
       DO UPDATE SET pattern_description = EXCLUDED.pattern_description,
                     frequency_count = vera_pattern_discoveries.frequency_count + 1,
                     last_updated = NOW()
       RETURNING *`,
      [
        patternData.pattern_name,
        patternData.pattern_description,
        patternData.pattern_type,
        patternData.appears_in_standards || [],
        patternData.appears_in_industries || [],
        patternData.frequency_count || 1,
        patternData.significance_score || 0.50,
        patternData.interpretation,
        patternData.vera_application,
        patternData.validation_confidence || 0.50
      ]
    );
    return result.rows[0];
  },

  /**
   * Increment pattern application count
   */
  async incrementPatternApplication(patternId) {
    const result = await queryEdcatAI(
      `UPDATE edcat.vera_pattern_discoveries 
       SET times_applied = times_applied + 1
       WHERE pattern_id = $1
       RETURNING *`,
      [patternId]
    );
    return result.rows[0];
  }
};

/**
 * Reasoning Repository
 */
export const ReasoningRepository = {
  /**
   * Get reasoning chain for requirement-procedure mapping
   */
  async getReasoningChain(requirementId, procedureId) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.vera_requirement_reasoning_chains 
       WHERE requirement_id = $1 AND procedure_id = $2
       ORDER BY reasoning_confidence DESC NULLS LAST LIMIT 1`,
      [requirementId, procedureId]
    );
    return result.rows[0] || null;
  },

  /**
   * Create reasoning chain
   */
  async createReasoningChain(reasoningData) {
    const result = await queryEdcatAI(
      `INSERT INTO edcat.vera_requirement_reasoning_chains 
       (requirement_id, procedure_id, mapping_id, reasoning_type, reasoning_text,
        concepts_covered, requirements_satisfied, gaps_in_reasoning,
        reasoning_confidence, reasoning_quality_score, is_reusable_pattern)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        reasoningData.requirement_id,
        reasoningData.procedure_id,
        reasoningData.mapping_id,
        reasoningData.reasoning_type,
        reasoningData.reasoning_text,
        reasoningData.concepts_covered || [],
        JSON.stringify(reasoningData.requirements_satisfied || {}),
        reasoningData.gaps_in_reasoning || [],
        reasoningData.reasoning_confidence || 0.50,
        reasoningData.reasoning_quality_score || 0.50,
        reasoningData.is_reusable_pattern || false
      ]
    );
    return result.rows[0];
  },

  /**
   * Get reasoning chains for a requirement
   */
  async getReasoningChainsForRequirement(requirementId) {
    const result = await queryEdcatAI(
      `SELECT * FROM edcat.vera_requirement_reasoning_chains 
       WHERE requirement_id = $1
       ORDER BY reasoning_confidence DESC NULLS LAST`,
      [requirementId]
    );
    return result.rows;
  },

  /**
   * Validate reasoning chain (human validation)
   */
  async validateReasoningChain(chainId, validated, notes = null) {
    const result = await queryEdcatAI(
      `UPDATE edcat.vera_requirement_reasoning_chains 
       SET validated_by_human = $1, validated_at = NOW(), human_notes = $2
       WHERE chain_id = $3
       RETURNING *`,
      [validated, notes, chainId]
    );
    return result.rows[0];
  }
};

/**
 * Export all repositories
 */
export default {
  Persona: PersonaRepository,
  Standards: StandardsRepository,
  Conversation: ConversationRepository,
  Learning: LearningRepository,
  Research: ResearchRepository,
  KnowledgeGraph: KnowledgeGraphRepository,
  PatternDiscovery: PatternDiscoveryRepository,
  Reasoning: ReasoningRepository
};

