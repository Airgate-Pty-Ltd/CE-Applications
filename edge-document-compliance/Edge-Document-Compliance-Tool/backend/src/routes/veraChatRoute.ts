/**
 * Vera Chat API Route
 * Self-contained internal reasoning - NO external LLM dependencies
 * 
 * POST /api/vera/chat
 * Body: { message: string, sessionId?: string, userId?: string, debugMode?: boolean }
 */

import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import { generateVeraResponse, type VeraRequest, type VeraResponse } from '../services/vera/VeraCoreEngine.js';
import { assertExternalLLMsDisabled } from '../services/vera/ExternalLLMGuard.js';

const router = express.Router();

/**
 * POST /api/vera/chat
 * Body:
 * {
 *   "message": string (required),
 *   "sessionId"?: string,
 *   "userId"?: string,
 *   "debugMode"?: boolean
 * }
 * 
 * Returns VeraResponse JSON directly
 */
router.post(
  '/chat',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure external LLMs are disabled
      assertExternalLLMsDisabled();

      const { message, sessionId, userId, debugMode } = req.body ?? {};
      const tenantId = (req as any).tenant?.id ?? (req as any).body?.tenantId ?? req.headers['x-tenant-id'];

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ 
          error: 'Missing "message" string in request body.',
          mode: 'error'
        });
      }

      // Resolve tenantId (use default if not provided)
      const effectiveTenantId = tenantId || '00000000-0000-0000-0000-000000000000';

      // Call VeraCoreEngine
      const veraRequest: VeraRequest = {
        message,
        sessionId: sessionId || (req as any).sessionId,
        userId: userId || (req as any).user?.id,
        tenantId: effectiveTenantId,
        debugMode: debugMode || false
      };

      const response: VeraResponse = await generateVeraResponse(veraRequest);

      // Return VeraResponse JSON directly
      return res.json(response);

    } catch (err: any) {
      console.error('[VeraChatRoute] Vera chat error:', err);
      const errorId = `vera-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Return error response in VeraResponse format
      return res.status(500).json({
        answer: 'I encountered an error while processing your question. Could you try rephrasing it?',
        mode: 'error',
        metadata: {
          errorId,
          error: process.env.NODE_ENV === 'development' ? err.message : 'Internal error'
        }
      } as VeraResponse);
    }
  }
);

export default router;

