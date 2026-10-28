/**
 * ============================================================================
 * EDCAT AI COMPLIANCE ASSISTANT
 * ============================================================================
 * © 2025 Conform-Edge Quality Consulting. All rights reserved.
 * CEQC-OQCQMS Proprietary AI Assistant Service
 */

import { query } from '../database/connection.js';

// ============================================================================
// AI ASSISTANT STATE & CONFIGURATION
// ============================================================================

const AIAssistantConfig = {
  maxConversationHistory: 50,
  clarifyingQuestionThreshold: 0.65,
  modelVersion: '1.0.0'
};

// ============================================================================
// CORE ASSISTANT CLASS
// ============================================================================

export class EDCATAIAssistant {
  constructor(config = {}) {
    this.config = { ...AIAssistantConfig, ...config };
    this.conversationHistory = [];
    this.currentSession = null;
  }

  /**
   * Initialize session for assessment
   */
  initializeSession(assessmentId, customerId, sector = [], regulators = [], standards = []) {
    this.currentSession = {
      conversationId: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assessmentId,
      customerId,
      sector,
      regulators,
      standards,
      sessionStartTime: new Date().toISOString()
    };
    this.conversationHistory = [];
    return this.currentSession.conversationId;
  }

  /**
   * Process user query
   */
  async processQuery(userQuery, metadata = {}) {
    if (!this.currentSession) {
      return { error: 'Session not initialized. Please select an assessment first.' };
    }

    const queryId = `query-${Date.now()}`;
    const userMessage = {
      id: queryId,
      role: 'user',
      content: userQuery,
      timestamp: new Date().toISOString()
    };
    this.conversationHistory.push(userMessage);

    // Extract intent
    const intent = this.extractQueryIntent(userQuery);
    
    // Build context
    const context = {
      assessmentId: this.currentSession.assessmentId,
      customerId: this.currentSession.customerId,
      sector: this.currentSession.sector,
      regulators: this.currentSession.regulators,
      standards: this.currentSession.standards
    };

    // Route to handler
    let response;
    switch (intent.type) {
      case 'requirement_search':
        response = await this.handleRequirementSearch(userQuery, context);
        break;
      case 'gap_analysis':
        response = await this.handleGAPAnalysis(userQuery, context);
        break;
      case 'clarification':
        response = await this.handleClarification(userQuery, context);
        break;
      default:
        response = await this.handleGeneralCompliance(userQuery, context);
    }

    response.queryId = queryId;
    response.sessionId = this.currentSession.conversationId;
    response.confidence = response.confidence || 0.75;

    // Add assistant message
    const assistantMessage = {
      id: `resp-${Date.now()}`,
      role: 'assistant',
      content: response.text,
      confidence: response.confidence,
      timestamp: new Date().toISOString()
    };
    this.conversationHistory.push(assistantMessage);

    // Check if clarification needed
    if (response.confidence < this.config.clarifyingQuestionThreshold) {
      response.clarifyingQuestion = this.generateClarifyingQuestion(userQuery, context);
    }

    return response;
  }

  /**
   * Extract query intent
   */
  extractQueryIntent(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.match(/gap|missing|cover|not.*cover|comply/)) {
      return { type: 'gap_analysis', confidence: 0.85 };
    }
    if (lowerQuery.match(/find|what|where|show|locate|requirement/)) {
      return { type: 'requirement_search', confidence: 0.82 };
    }
    if (lowerQuery.match(/clarif|explain|mean|understand/)) {
      return { type: 'clarification', confidence: 0.80 };
    }
    
    return { type: 'general_compliance', confidence: 0.6 };
  }

  /**
   * Handle requirement search
   */
  async handleRequirementSearch(query, context) {
    const keywords = this.extractKeywords(query);
    
    // Search standards database
    let standardsQuery = 'SELECT * FROM standards WHERE is_active = true';
    const params = [];
    
    if (context.standards && context.standards.length > 0) {
      const standardIds = context.standards.map(s => typeof s === 'object' ? s.id : s);
      standardsQuery += ` AND id = ANY($${params.length + 1})`;
      params.push(standardIds);
    }
    
    const standards = await query(standardsQuery, params);
    
    // Search clauses
    let clausesQuery = `
      SELECT c.*, s.name as standard_name, s.code as standard_code
      FROM clauses c
      JOIN standards s ON c.standard_id = s.id
      WHERE s.is_active = true
    `;
    
    if (keywords.length > 0) {
      const keywordConditions = keywords.map((kw, idx) => 
        `(c.requirement_text ILIKE $${params.length + idx + 1} OR c.title ILIKE $${params.length + idx + 1})`
      ).join(' OR ');
      clausesQuery += ` AND (${keywordConditions})`;
      keywords.forEach(kw => params.push(`%${kw}%`));
    }
    
    clausesQuery += ' LIMIT 10';
    
    const clauses = await query(clausesQuery, params);
    
    if (clauses.rows.length === 0) {
      return {
        text: 'No requirements found matching your query. Try different keywords or check your standard selection.',
        confidence: 0.4,
        sources: []
      };
    }

    let text = `Found ${clauses.rows.length} requirement(s):\n\n`;
    clauses.rows.slice(0, 5).forEach((req, idx) => {
      text += `${idx + 1}. **${req.standard_code} ${req.clause_ref}**\n`;
      text += `   ${req.requirement_text.substring(0, 150)}...\n\n`;
    });

    return {
      text,
      confidence: 0.85,
      sources: clauses.rows.map(c => ({
        id: c.id,
        standard: c.standard_code,
        clause: c.clause_ref,
        text: c.requirement_text
      }))
    };
  }

  /**
   * Handle GAP analysis query
   */
  async handleGAPAnalysis(query, context) {
    if (!context.assessmentId) {
      return {
        text: 'Please select an assessment to analyze GAPs.',
        confidence: 0.3
      };
    }

    // Get GAP analysis results
    const gapQuery = `
      SELECT * FROM gap_analysis_logs
      WHERE assessment_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const gapResult = await query(gapQuery, [context.assessmentId]);

    if (gapResult.rows.length === 0) {
      return {
        text: 'No GAP analysis found for this assessment. Please run a GAP analysis first.',
        confidence: 0.5
      };
    }

    const gapData = gapResult.rows[0];
    const results = gapData.results || [];

    const totalGaps = results.length;
    const criticalGaps = results.filter(r => r.status === 'not_covered' || r.risk_level === 'High').length;

    let text = `**GAP Analysis Summary**\n\n`;
    text += `Total GAPs: ${totalGaps} | Critical: ${criticalGaps}\n\n`;
    
    if (criticalGaps > 0) {
      text += `**Critical GAPs:**\n`;
      results.filter(r => r.risk_level === 'High').slice(0, 3).forEach((gap, idx) => {
        text += `${idx + 1}. ${gap.clause || gap.clause_ref}: ${gap.gap_reason || 'Not covered'}\n`;
      });
    }

    return {
      text,
      confidence: 0.82,
      sources: results.slice(0, 5)
    };
  }

  /**
   * Handle clarification
   */
  async handleClarification(query, context) {
    return {
      text: 'I can help clarify compliance requirements. Could you provide more details about what specific aspect you need clarification on?',
      confidence: 0.75
    };
  }

  /**
   * Handle general compliance
   */
  async handleGeneralCompliance(query, context) {
    // Search standards and clauses
    const keywords = this.extractKeywords(query);
    const searchQuery = `
      SELECT c.*, s.name as standard_name, s.code as standard_code
      FROM clauses c
      JOIN standards s ON c.standard_id = s.id
      WHERE s.is_active = true
      AND (c.requirement_text ILIKE $1 OR c.title ILIKE $1)
      LIMIT 5
    `;
    
    const searchTerm = keywords.length > 0 ? `%${keywords[0]}%` : '%';
    const results = await query(searchQuery, [searchTerm]);

    if (results.rows.length === 0) {
      return {
        text: 'I could not find specific information for your query. Please consult the relevant standard documentation or try rephrasing your question.',
        confidence: 0.4,
        sources: []
      };
    }

    let text = '';
    results.rows.slice(0, 3).forEach((c, idx) => {
      text += `${idx + 1}. **${c.standard_code}**: ${c.requirement_text.substring(0, 200)}...\n\n`;
    });

    return {
      text,
      confidence: 0.75,
      sources: results.rows.map(r => ({
        source: r.standard_code,
        excerpt: r.requirement_text
      }))
    };
  }

  /**
   * Extract keywords
   */
  extractKeywords(query) {
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
      'what', 'where', 'when', 'why', 'how', 'which', 'who', 'this', 'that'
    ]);
    
    return query.toLowerCase()
      .split(/\s+/)
      .filter(w => !stopwords.has(w) && w.length > 3);
  }

  /**
   * Generate clarifying question
   */
  generateClarifyingQuestion(query, context) {
    const standards = context.standards || [];
    const standardName = standards[0]?.code || standards[0] || 'your selected standard';
    
    if (query.toLowerCase().includes('design')) {
      return `Are you asking about design requirements in ${standardName}?`;
    }
    if (query.toLowerCase().includes('document')) {
      return `Do you need clarification on documentation requirements?`;
    }
    
    return `Should I focus on ${standardName} requirements, or are you asking about a different standard?`;
  }

  /**
   * Get conversation history
   */
  getConversationHistory() {
    return {
      messages: this.conversationHistory.slice(-20),
      sessionId: this.currentSession?.conversationId
    };
  }

  /**
   * End session
   */
  endSession() {
    const summary = {
      conversationId: this.currentSession?.conversationId,
      messageCount: this.conversationHistory.length,
      endTime: new Date().toISOString()
    };
    this.currentSession = null;
    this.conversationHistory = [];
    return summary;
  }
}

