/**
 * Vera Quality Reasoning Service
 * 
 * Provides deep, conversational quality engineering knowledge
 * (CQE, Six Sigma, Lean, KPIs, Culture, Agile+QMS)
 * Uses structured knowledge base to build layered explanations
 */

import { queryEdcatAI } from '../../config/databases.js';
import { runVera } from '../../vera/veraEngine.js';

class VeraQualityReasoningService {
  /**
   * Normalize text for matching
   * @param {string} text
   * @returns {string}
   */
  static _normalize(text = '') {
    return text.toLowerCase().trim();
  }

  /**
   * Find relevant quality topic from message
   * @param {string} message
   * @returns {Promise<Object|null>}
   */
  static async _findRelevantTopic(message) {
    const m = this._normalize(message);

    // CRITICAL: Separate CQE from Six Sigma/DMAIC to prevent conflated responses
    // CQE-specific mappings (certification, exam, body of knowledge)
    const cqeMappings = [
      { topic_code: 'CQE_OVERVIEW', keywords: ['cqe', 'certified quality engineer', 'quality engineer exam', 'what is a cqe', 'define cqe', 'cqe certification', 'asq cqe', 'cqe exam'] },
      { topic_code: 'CQE_STATISTICS', keywords: ['cqe statistics', 'statistical methods', 'spc', 'control chart', 'process capability'] },
      { topic_code: 'CQE_MANAGEMENT', keywords: ['cqe management', 'deming', 'juran', 'crosby', 'quality leadership'] }
    ];
    
    // Six Sigma/DMAIC-specific mappings (methodology, phases, tools)
    const sixSigmaMappings = [
      { topic_code: 'SIX_SIGMA_OVERVIEW', keywords: ['six sigma', 'sigma level', 'black belt', 'green belt', 'what is six sigma'] },
      { topic_code: 'DMAIC_METHOD', keywords: ['dmaic', 'define measure analyze improve control', 'what is dmaic', 'explain dmaic', 'dmaic phases', 'walk me through dmaic', 'dmaic methodology'] },
      { topic_code: 'DFSS_METHOD', keywords: ['dfss', 'design for six sigma', 'dmadv'] }
    ];
    
    // QMS Documentation / Annex A mappings (high priority for structure/numbering questions)
    const qmsDocMappings = [
      { topic_code: 'QMS_DOCUMENTATION_STRUCTURE', keywords: ['annex a', 'document structure', 'clause structure', 'document numbering', 'numbering system', 'qms structure', 'procedure numbering', 'document numbering system', 'do procedures have to follow', 'does as9100 require', 'is numbering required'] }
    ];
    
    // Other quality mappings
    const otherMappings = [
      { topic_code: 'LEAN_OVERVIEW', keywords: ['lean manufacturing', 'lean thinking', 'what is lean', 'lean production'] },
      { topic_code: 'LEAN_WASTES', keywords: ['seven wastes', '8 wastes', 'lean wastes', 'muda', 'timwood'] },
      { topic_code: 'LEAN_FLOW', keywords: ['lean flow', 'pull system', 'kanban', 'value stream'] },
      { topic_code: 'KPIS_OVERVIEW', keywords: ['kpi', 'metric', 'key performance indicator', 'quality kpi', 'quality metrics'] },
      { topic_code: 'COST_OF_QUALITY', keywords: ['cost of quality', 'coq', 'prevention', 'appraisal', 'failure cost', 'what is cost of quality'] },
      { topic_code: 'QUALITY_CULTURE_GLOBAL', keywords: ['quality culture', 'behavior', 'global organization', 'organizational culture'] },
      { topic_code: 'AGILE_QMS_COEXIST', keywords: ['agile', 'scrum', 'qms', 'procedure', 'agile and qms', 'agile qms', 'how can agile and qms'] }
    ];

    // CRITICAL: Check CQE first (before Six Sigma) to prevent DMAIC responses for CQE questions
    // Improved CQE detection - check for CQE mentions in any form
    const hasCQE = /cqe|certified\s+quality\s+engineer/i.test(message);
    const hasSixSigma = /six\s+sigma|dmaic|define\s+measure\s+analyze\s+improve\s+control/i.test(message);
    const isCQEQuestion = hasCQE && !hasSixSigma; // CQE question if it mentions CQE but NOT Six Sigma
    
    // Check if message explicitly asks about DMAIC/Six Sigma phases
    const isDMAICQuestion = hasSixSigma && !hasCQE; // Six Sigma question if it mentions Six Sigma but NOT CQE
    
    // Priority 1: CQE-specific questions (STRICT - must match CQE keywords)
    if (isCQEQuestion) {
      console.log('[VeraQualityReasoning] Detected CQE question, routing to CQE topic');
      for (const map of cqeMappings) {
        if (map.keywords.some(kw => m.includes(kw))) {
          const res = await queryEdcatAI(
            `SELECT id, topic_code, title, summary
             FROM edcat.vera_quality_topics
             WHERE topic_code = $1 AND is_active = TRUE`,
            [map.topic_code]
          );
          if (res.rows.length > 0) {
            console.log(`[VeraQualityReasoning] Found CQE topic: ${map.topic_code}`);
            return res.rows[0];
          }
        }
      }
      // If CQE topic not found in DB, still return null to prevent fallthrough to Six Sigma
      console.log('[VeraQualityReasoning] CQE question detected but topic not found in DB');
      return null; // Don't fall through to Six Sigma
    }
    
    // Priority 2: Six Sigma/DMAIC-specific questions (ONLY if NOT a CQE question)
    if (isDMAICQuestion && !isCQEQuestion) {
      console.log('[VeraQualityReasoning] Detected Six Sigma/DMAIC question, routing to Six Sigma topic');
      for (const map of sixSigmaMappings) {
        if (map.keywords.some(kw => m.includes(kw))) {
          const res = await queryEdcatAI(
            `SELECT id, topic_code, title, summary
             FROM edcat.vera_quality_topics
             WHERE topic_code = $1 AND is_active = TRUE`,
            [map.topic_code]
          );
          if (res.rows.length > 0) {
            console.log(`[VeraQualityReasoning] Found Six Sigma topic: ${map.topic_code}`);
            return res.rows[0];
          }
        }
      }
    }
    
    // Priority 2.5: QMS Documentation / Annex A questions (before other mappings)
    for (const map of qmsDocMappings) {
      if (map.keywords.some(kw => m.includes(kw))) {
        const res = await queryEdcatAI(
          `SELECT id, topic_code, title, summary
           FROM edcat.vera_quality_topics
           WHERE topic_code = $1 AND is_active = TRUE`,
          [map.topic_code]
        );
        if (res.rows.length > 0) return res.rows[0];
      }
    }
    
    // Priority 3: Try other mappings (but EXCLUDE CQE and Six Sigma to prevent cross-contamination)
    // Only try other quality topics (Lean, KPIs, etc.) if we haven't already identified CQE or Six Sigma
    if (!isCQEQuestion && !isDMAICQuestion) {
      for (const map of [...qmsDocMappings, ...otherMappings]) {
        if (map.keywords.some(kw => m.includes(kw))) {
          const res = await queryEdcatAI(
            `SELECT id, topic_code, title, summary
             FROM edcat.vera_quality_topics
             WHERE topic_code = $1 AND is_active = TRUE`,
            [map.topic_code]
          );
          if (res.rows.length > 0) return res.rows[0];
        }
      }
    }

    // Fallback: basic fuzzy match on title/summary
    const res = await queryEdcatAI(
      `SELECT id, topic_code, title, summary
       FROM edcat.vera_quality_topics
       WHERE is_active = TRUE`
    );
    const all = res.rows || [];
    const term = m;

    let best = null;
    let bestScore = 0;
    for (const row of all) {
      const hay = `${row.title} ${row.summary}`.toLowerCase();
      let score = 0;
      if (hay.includes('six sigma') && term.includes('six sigma')) score += 3;
      if (hay.includes('dmaic') && term.includes('dmaic')) score += 3;
      if (hay.includes('lean') && term.includes('lean')) score += 3;
      if (hay.includes('cost of quality') && term.includes('quality')) score += 2;
      if (hay.includes('culture') && term.includes('culture')) score += 2;
      if (hay.includes('agile') && term.includes('agile')) score += 2;
      if (hay.includes('cqe') && term.includes('cqe')) score += 3;
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
    return best;
  }

  /**
   * Fetch knowledge snippets and Q&A for a topic
   * @param {string} topicId
   * @returns {Promise<Object>}
   */
  static async _fetchKnowledge(topicId) {
    const [snipRes, qaRes] = await Promise.all([
      queryEdcatAI(
        `SELECT snippet_type, level, content, weight
         FROM edcat.vera_quality_snippets
         WHERE topic_id = $1
         ORDER BY level, snippet_type`,
        [topicId]
      ),
      queryEdcatAI(
        `SELECT question_pattern, answer_core, answer_layered, tags
         FROM edcat.vera_quality_qa
         WHERE topic_id = $1`,
        [topicId]
      )
    ]);

    return {
      snippets: snipRes.rows || [],
      qa: qaRes.rows || []
    };
  }

  /**
   * Match Q&A entry to message
   * @param {Array} qaList
   * @param {string} message
   * @returns {Object|null}
   */
  static _matchQA(qaList, message) {
    const m = this._normalize(message);
    let best = null;
    let bestScore = 0;
    for (const qa of qaList) {
      const pattern = qa.question_pattern.toLowerCase();
      let score = 0;
      if (m === pattern) score = 3;
      else if (m.includes(pattern) || pattern.includes(m)) score = 2;
      else if (m.split(' ').some(w => pattern.includes(w))) score = 1;
      if (score > bestScore) {
        bestScore = score;
        best = qa;
      }
    }
    return best;
  }

  /**
   * Build structured prompt for LLM
   * @param {Object} params
   * @returns {Object}
   */
  static _buildStructuredPrompt({ message, topic, knowledge }) {
    const { snippets, qa } = knowledge;

    const definitions = snippets.filter(s => s.snippet_type === 'definition');
    const principles = snippets.filter(s => s.snippet_type === 'principles');
    const examples = snippets.filter(s => s.snippet_type === 'example');
    const tooling = snippets.filter(s => s.snippet_type === 'tooling');

    let kbText = '';
    kbText += `Topic: ${topic.title}\nSummary: ${topic.summary}\n\n`;

    if (definitions.length) {
      kbText += 'Key Definitions:\n';
      for (const d of definitions) {
        kbText += `- ${d.content}\n`;
      }
      kbText += '\n';
    }

    if (principles.length) {
      kbText += 'Core Principles:\n';
      for (const p of principles) {
        kbText += `- ${p.content}\n`;
      }
      kbText += '\n';
    }

    if (tooling.length) {
      kbText += 'Tools & Methods:\n';
      for (const t of tooling) {
        kbText += `- ${t.content}\n`;
      }
      kbText += '\n';
    }

    if (examples.length) {
      kbText += 'Examples:\n';
      for (const ex of examples) {
        kbText += `- ${ex.content}\n`;
      }
      kbText += '\n';
    }

    const qaMatch = this._matchQA(qa, message);

    return {
      systemPrompt: `You are Vera, a British/Scottish-flavoured Quality Engineer, Six Sigma Black Belt, and global quality leader.

You are assisting a senior quality leader with quality engineering questions.

When answering technical questions about quality engineering, CQE topics, Six Sigma, Lean, KPIs, cost of quality, SPC, capability, FMEA, APQP, PPAP, or quality culture:

1) Start with a crisp definition or direct answer (1–2 sentences).

2) Expand with 2–4 short paragraphs explaining why it matters and how it works in practice.

3) Provide at least one concrete example from manufacturing, repair, or engineering.

4) End with exactly ONE short follow-up question that helps move the conversation forward.

You MAY use your own general quality / Six Sigma / Lean knowledge, in addition to the knowledge base content provided.

You MUST NOT fabricate or reinterpret specific regulatory clause numbers (e.g., AS9100 8.7, 21.137(e)) if you are not given those clauses explicitly.

Use a professional tone with occasional subtle British/Scottish turns of phrase, but never at the expense of clarity.

Do NOT respond with greetings only when the user clearly asks a technical question.

Do NOT mention the database, tables, or technical implementation details. Just answer like a thoughtful quality expert.`,

      knowledgeText: kbText,
      qaMatch
    };
  }

  /**
   * Answer quality question using knowledge base
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  static async answerQualityQuestion({ tenantId, userId, message, context = {} }) {
    try {
      const topic = await this._findRelevantTopic(message);
      
      // CRITICAL: If CQE was detected but topic not found, still answer as CQE (don't fall through to Six Sigma)
      const hasCQE = /cqe|certified\s+quality\s+engineer/i.test(message);
      const hasSixSigma = /six\s+sigma|dmaic/i.test(message);
      
      if (!topic && hasCQE && !hasSixSigma) {
        console.log('[VeraQualityReasoning] CQE question detected but topic not in DB, using general CQE knowledge');
        // Use general CQE knowledge prompt
        const systemPrompt = `You are Vera, a British/Scottish-flavoured Certified Quality Engineer (CQE) and quality leader.

You are assisting a senior quality leader with questions about the Certified Quality Engineer (CQE) certification.

CQE (Certified Quality Engineer) is a professional certification offered by ASQ (American Society for Quality). It demonstrates expertise in quality engineering principles including:
- Management and leadership
- Quality systems
- Product and process design and development
- Product and process control
- Continuous improvement
- Quantitative methods and tools (statistics, SPC, process capability)
- Risk management
- Reliability engineering
- Metrology and measurement systems
- Supplier quality management
- Quality auditing

To get certified as a CQE, you typically need:
- Education and/or work experience requirements (varies by ASQ)
- Pass the CQE exam (multiple choice, covers the CQE body of knowledge)
- Maintain certification through continuing education

Answer clearly and professionally. Use a professional tone with occasional subtle British/Scottish turns of phrase, but never at the expense of clarity.

Do NOT confuse CQE with Six Sigma. CQE is a certification, Six Sigma is a methodology.`;

        const userPrompt = `User question: ${message}

Answer this question about CQE (Certified Quality Engineer) certification using your knowledge of quality engineering and professional certifications.`;

        const llmResponse = await runVera(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          {
            tenantId,
            userId,
            mode: 'reasoning'
          }
        );

        const answer = llmResponse.answer || llmResponse.content || '';
        
        return {
          answer: answer.trim(),
          usedQualityPath: true,
          topic: 'CQE_OVERVIEW' // Mark as CQE even though not in DB
        };
      }
      
      if (!topic) {
        // For quality domain, never use "teach me" - use general LLM knowledge instead
        // Build a prompt that allows general quality knowledge
        const systemPrompt = `You are Vera, a British/Scottish-flavoured Quality Engineer, Six Sigma Black Belt, and global quality leader.

You are assisting a senior quality leader with quality engineering questions.

When answering technical questions about quality engineering, CQE topics, Six Sigma, Lean, KPIs, cost of quality, SPC, capability, FMEA, APQP, PPAP, or quality culture:

1) Start with a crisp definition or direct answer (1–2 sentences).

2) Expand with 2–4 short paragraphs explaining why it matters and how it works in practice.

3) Provide at least one concrete example from manufacturing, repair, or engineering.

4) End with exactly ONE short follow-up question that helps move the conversation forward.

You MAY use your own general quality / Six Sigma / Lean knowledge.

Use a professional tone with occasional subtle British/Scottish turns of phrase, but never at the expense of clarity.

Do NOT respond with greetings only when the user clearly asks a technical question.`;

        const userPrompt = `User question: ${message}

Answer this quality engineering question using your general knowledge of quality engineering, Six Sigma, Lean, CQE body of knowledge, KPIs, and quality culture.`;

        const llmResponse = await runVera(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          {
            tenantId,
            userId,
            mode: 'reasoning'
          }
        );

        const answer = llmResponse.answer || llmResponse.content || '';
        
        return {
          answer: answer.trim(),
          usedQualityPath: true, // Still using quality path, just with general knowledge
          topic: null
        };
      }

      const knowledge = await this._fetchKnowledge(topic.id);
      const { systemPrompt, knowledgeText, qaMatch } = this._buildStructuredPrompt({
        message,
        topic,
        knowledge
      });

      const userPromptParts = [];
      userPromptParts.push(`User question: ${message}`);
      
      if (qaMatch) {
        userPromptParts.push(`\nRelevant core answer: ${qaMatch.answer_core}`);
        if (qaMatch.answer_layered) {
          userPromptParts.push(`\nExpanded teaching answer: ${qaMatch.answer_layered}`);
        }
      }

      userPromptParts.push(`\nUse the knowledge text below as your reference.
Do NOT mention the database or tables. Just answer like a thoughtful quality expert.
After explaining, ask exactly one short follow-up question to keep the conversation going.`);

      const fullPrompt = `${systemPrompt}\n\n==== QUALITY KNOWLEDGE BASE ====\n${knowledgeText}\n===============================\n\n${userPromptParts.join('\n')}`;

      // Call LLM using runVera
      const llmResponse = await runVera(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fullPrompt }
        ],
        {
          tenantId,
          userId,
          mode: 'reasoning'
        }
      );

      const answer = llmResponse.answer || llmResponse.content || '';

      return {
        answer: answer.trim(),
        usedQualityPath: true,
        topic: topic.topic_code
      };
    } catch (error) {
      console.error('[VeraQualityReasoningService] Error answering quality question:', error.message);
      return {
        answer: "I encountered an error while accessing my quality knowledge base. Could you try rephrasing your question?",
        usedQualityPath: false
      };
    }
  }
}

export default VeraQualityReasoningService;

