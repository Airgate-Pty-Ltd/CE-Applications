import type { Request, Response, NextFunction } from 'express';

/** Injects Vera's follow rules into the chat flow and enforces guardrails. */
export function veraMiddleware(opts:{ pg:any, retrievalAdapter:any, validators:any }) {
  const { pg, retrievalAdapter, validators } = opts;
  return async function(req: Request, res: Response, next: NextFunction) {
    const { tenant_id, persona_code='vera', message, standard_code, revision } = req.body || {};
    if (!tenant_id || !message) return res.status(400).json({ error: 'tenant_id and message are required' });

    // Load Vera rules & system prompt
    const rules = await pg.oneOrNone('select content from ai_policy where tenant_id=$1 and name=$2',[tenant_id,'vera.follow.rules']);
    const sys = await pg.oneOrNone(`select content from ai_prompt where tenant_id=$1 and persona_code='vera' and kind='system' and name='system.follow.rules'`,[tenant_id]);
    if (!rules || !sys) return res.status(500).json({ error: 'Vera rules or system prompt missing' });

    // If a standard is selected, ensure blueprint exists
    if (standard_code && revision) {
      const std = await pg.oneOrNone('select id from ai_standard where tenant_id=$1 and code=$2 and revision=$3',[tenant_id, standard_code, revision]);
      if (!std) return res.status(400).json({ error: 'Standard blueprint not registered', hint: { standard_code, revision } });
    }

    // Retrieval-first: prefetch snippets when user asks about a clause
    req.body._vera = { system: sys.content, rules: rules.content };
    next();
  }
}
