import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/ai/extract
 * Body: { tenant_id, session_id, source_doc_id, persona_code?, scope? }
 *  - scope: { pages?: number[], clause_filters?: string[], customer?: boolean }
 */
export async function extractHandler(req: Request, res: Response) {
  const { tenant_id, session_id, source_doc_id, persona_code = 'vera', scope = {} } = req.body || {};
  if (!tenant_id || !session_id || !source_doc_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Load extraction template + validators
  const tpl = await db.getTemplate(tenant_id, scope.customer ? 'extract.customer.requirements.v1' : 'extract.requirements.v1');
  const validators = await db.getExtractionValidators(tenant_id);
  const snippets = await retrievalAdapter.retrieveDoc({ tenant_id, source_doc_id, pages: scope.pages || [] });

  if (!snippets?.length) {
    return res.status(200).json({ requirements: [], stats: { total: 0, kept: 0, dropped: 0 } });
  }

  // Build prompt
  const prompt = tpl.template.prompt.replace('{snippets}', snippets.map(s => `• ${s.doc_id} p${s.page} L${s.line_start}–L${s.line_end}: ${s.text}`).join('\n'));

  // Route to engine (reuse your routing rules)
  const engine = routingEngine.default();
  const raw = await llm.invoke(engine, prompt, { temperature: 0.1, max_tokens: 1400, seed: 42 });

  // Parse JSONL blocks from model output
  const lines = raw.text.split('\n').map(l => l.trim()).filter(Boolean);
  const jsons:any[] = [];
  for (const l of lines) {
    try { jsons.push(JSON.parse(l)); } catch (err) {}
  }

  // Validate & persist
  let kept = 0, dropped = 0;
  for (const r of jsons) {
    const pass = await validateRequirement(validators, r);
    if (!pass) { dropped++; continue; }
    await db.insertRequirement(tenant_id, source_doc_id, r);
    kept++;
  }
  return res.status(200).json({ requirements: jsons.slice(0, kept), stats: { total: jsons.length, kept, dropped } });
}

async function validateRequirement(validators:any[], r:any) {
  for (const v of validators) {
    if (v.type === 'field_presence') {
      if (!r[v.field]) return false;
    } else if (v.type === 'field_regex') {
      const re = new RegExp(v.pattern);
      if (!re.test(r[v.field] || '')) return false;
    }
  }
  return true;
}

// placeholders
const db = {
  getTemplate: async (tenant_id:string, name:string) => ({ template: { prompt: '' } }),
  getExtractionValidators: async (tenant_id:string) => ([]),
  insertRequirement: async (tenant_id:string, source_doc_id:string, r:any) => {}
};
const routingEngine = { default: () => ({ provider: 'cloud', model: 'gpt-light-4k' }) };
const llm = { invoke: async (engine:any, prompt:string, params:any) => ({ text: '' }) };
const retrievalAdapter = { retrieveDoc: async (args:any)=>([]) };
