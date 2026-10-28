/**
 * Vera Middleware
 * Injects Vera's follow rules into the chat flow and enforces guardrails
 * Based on server/chat_middleware.ts from EDCAT AIP package
 */

import { queryEdcatAI } from '../database/connection.js';

/**
 * Vera middleware factory
 * @param {Object} opts - Options object
 * @param {Object} opts.retrievalAdapter - Retrieval adapter for fetching snippets
 * @param {Object} opts.validators - Validators for post-processing
 * @returns {Function} Express middleware function
 */
export function veraMiddleware(opts = {}) {
  const { retrievalAdapter, validators } = opts;

  return async function(req, res, next) {
    try {
      const { tenant_id, persona_code = 'vera', message, standard_code, revision } = req.body || {};
      const DEFAULT_TENANT_ID = tenant_id || '00000000-0000-0000-0000-000000000000';

      if (!message) {
        return res.status(400).json({ error: 'message is required' });
      }

      // Load Vera rules & system prompt
      const rulesResult = await queryEdcatAI(
        `SELECT config FROM edcat.ai_policy WHERE tenant_id = $1 AND name = 'vera.follow.rules'`,
        [DEFAULT_TENANT_ID]
      );
      
      const sysPromptResult = await queryEdcatAI(
        `SELECT content FROM edcat.ai_prompt 
         WHERE tenant_id = $1 AND persona_code = 'vera' AND kind = 'system' AND name = 'system.follow.rules'`,
        [DEFAULT_TENANT_ID]
      );

      if (!rulesResult.rows.length || !sysPromptResult.rows.length) {
        // Only log warning in development, not in production (less noise)
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[veraMiddleware] Vera rules or system prompt missing - continuing without enforcement');
        }
        // Don't fail, just continue without rules
        req.body._vera = {
          system: null,
          rules: null,
          hasRules: false
        };
        return next();
      }

      const rules = rulesResult.rows[0].config;
      const systemPrompt = sysPromptResult.rows[0].content;

      // If a standard is selected, ensure blueprint exists
      if (standard_code && revision) {
        const stdResult = await queryEdcatAI(
          `SELECT id FROM edcat.ai_standard WHERE tenant_id = $1 AND code = $2 AND revision = $3`,
          [DEFAULT_TENANT_ID, standard_code, revision]
        );
        
        if (!stdResult.rows.length) {
          return res.status(400).json({ 
            error: 'Standard blueprint not registered',
            hint: { standard_code, revision },
            message: `Standard ${standard_code} ${revision} blueprint not found. Please run the seed script to load blueprints.`
          });
        }
      }

      // Attach Vera context to request
      req.body._vera = {
        system: systemPrompt,
        rules: rules,
        hasRules: true,
        tenant_id: DEFAULT_TENANT_ID,
        persona_code: persona_code
      };

      // If retrieval-first is enabled, prefetch snippets for clause questions
      if (rules.policies?.retrieval_first && retrievalAdapter) {
        const lowerMessage = message.toLowerCase();
        const clauseMatch = lowerMessage.match(/(?:what|show|tell|explain|describe).*(?:clause|section|requirement)?\s*([\d]+\.[\d]+(?:\.[\d]+)*)/);
        
        if (clauseMatch && standard_code && revision) {
          const clauseId = clauseMatch[1];
          try {
            // Pre-fetch snippets for this clause
            req.body._vera.retrievalRequested = {
              standard_code,
              revision,
              clause_id: clauseId
            };
          } catch (err) {
            console.error('[veraMiddleware] Error prefetching snippets:', err);
          }
        }
      }

      next();
    } catch (error) {
      console.error('[veraMiddleware] Error:', error);
      console.error('[veraMiddleware] Stack:', error.stack);
      return res.status(500).json({ 
        error: 'Middleware error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
}

export default veraMiddleware;

