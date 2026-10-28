import { Router } from "express";
import { processUserMessage } from "../../backend/src/vera/VeraCoreEngine.js";
import { Pool } from "pg";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

router.post("/", async (req, res) => {
  try {
    const q = (req.body?.q || req.body?.message || "").trim();
    const customerId = req.body?.customerId || null;
    const sessionId = req.body?.sessionId || null;
    const conversationId = req.body?.conversationId || null;
    
    // Get tenant and user from request (adjust based on your auth middleware)
    const tenantId = (req as any).tenant?.id || (req as any).body?.tenantId || null;
    const userId = (req as any).user?.id || (req as any).body?.userId || null;

    // Use VeraCoreEngine to process the message
    const result = await processUserMessage({
      tenantId,
      userId,
      sessionId,
      message: q,
      conversationId
    });

    // Log event
    try {
      await pool.query(`insert into edcat.compliance_events(kind, scope, summary, counters)
                        values ('ask', $1, $2, $3)`,
                       [JSON.stringify({ q, customerId }), "ask processed", JSON.stringify({ skillUsed: result.meta?.skillUsed || 'unknown' })]);
    } catch (logErr) {
      // Non-fatal - continue even if logging fails
      console.warn('[ask.routes] Event logging failed:', logErr);
    }

    res.json({
      answer: result.answer,
      conversationId: result.conversationId,
      meta: result.meta || {}
    });
  } catch (e: any) {
    console.error('[ask.routes] Error:', e);
    const errorId = `ask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.status(500).json({ 
      error: {
        type: "ASK_FAILED",
        message: "Vera failed to process your question.",
        contextId: errorId,
        detail: process.env.NODE_ENV === 'development' ? (e?.message || String(e)) : undefined
      }
    });
  }
});

export default router;

