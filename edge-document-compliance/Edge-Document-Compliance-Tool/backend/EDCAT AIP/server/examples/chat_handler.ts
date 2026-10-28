import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Reference chat handler for EDCAT AI.
 * Responsibilities:
 * 1) Load persona, prompts, policies, templates, validators, router for tenant.
 * 2) Run retrieval (RAG) to supply authoritative snippets (page/line anchored).
 * 3) Route to model (cloud GPT‑Lite vs on‑prem student) per routing rules.
 * 4) Post‑validate (citations, style) and repair/fail‑closed if needed.
 * 5) Persist full audit log.
 */

export async function chatHandler(req: Request, res: Response) {
  const { tenant_id, session_id, persona_code, message, tools_hint = [], secure_mode = false, context_overrides = [] } = req.body || {};
  if (!tenant_id || !session_id || !persona_code || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 1) Load configuration from DB (pseudo-code)
  const persona = await db.getPersona(tenant_id, persona_code);
  const systemPrompt = await db.getPrompt(tenant_id, persona_code, 'system', 'system.core');
  const toolPolicies = await db.getPolicy(tenant_id, 'tool_policies');
  const retrievalTpl = await db.getTemplate(tenant_id, 'retrieval.clause.qa');
  const router = await db.getRouter(tenant_id, 'default-routing');
  const validators = await db.getValidators(tenant_id);

  // 2) Retrieval
  const snippets = await retrievalAdapter.retrieve({
    tenant_id,
    query: message,
    overrides: context_overrides
  }); // should return [{doc_id, page, line_start, line_end, text, sha256}]

  if (!snippets || snippets.length === 0) {
    const refusal = await db.getPrompt(tenant_id, persona_code, 'refusal', 'refusal.no-context');
    await db.logChat({
      tenant_id, session_id, persona_code,
      request: { text: message, tools_allowed: toolPolicies?.tools?.map(t=>t.name) || [] },
      retrieved: [],
      model_used: 'none',
      router_trace: { decision: 'refuse_no_context' },
      response: { text: refusal?.content || 'No authoritative context available.' },
      validators: [{ name: 'citations.required', pass: false }],
      success: false
    });
    return res.status(200).json({ text: refusal?.content || 'No authoritative context available.', citations: [], model_used: 'none', router_trace: { decision: 'refuse_no_context' }, validators: [] });
  }

  // 3) Routing
  const engine = routingEngine.select(router, { secure_mode, tenant_id, persona_code, message });
  const citationsBlock = 'Sources: ' + snippets.map(s => `[Source: ${s.doc_id} p${s.page} L${s.line_start}–L${s.line_end}]`).join(' ');
  const prompt = buildPrompt(systemPrompt.content, retrievalTpl.template.prompt, { user_query: message, snippets, citations: citationsBlock });

  // 4) Inference
  const raw = await llm.invoke(engine, prompt, { temperature: engine.temperature, seed: engine.seed, max_tokens: engine.max_tokens });

  // 5) Validation
  const results = await validateAll(validators, raw.text);
  let finalText = raw.text;
  if (results.some(r => !r.pass)) {
    // Attempt one repair pass using repair prompt
    const repairPrompt = await db.getPrompt(tenant_id, persona_code, 'repair', 'repair.citation-missing');
    const repaired = await llm.invoke(engine, repairPrompt.content + '\n\n' + prompt, { temperature: engine.temperature, seed: engine.seed, max_tokens: engine.max_tokens });
    const repairedResults = await validateAll(validators, repaired.text);
    if (repairedResults.some(r => !r.pass)) {
      await db.logChat({
        tenant_id, session_id, persona_code,
        request: { text: message },
        retrieved: snippets.map(s => ({ doc_id: s.doc_id, page: s.page, line_start: s.line_start, line_end: s.line_end, hash: s.sha256 })),
        model_used: engine.model,
        router_trace: engine,
        response: { text: repaired.text },
        validators: repairedResults,
        success: false
      });
      return res.status(200).json({ text: 'I could not produce a fully‑cited answer from the provided context.', citations: [], model_used: engine.model, router_trace: engine, validators: repairedResults });
    } else {
      finalText = repaired.text;
    }
  }

  // Extract citations that match pattern for client display (simple regex example)
  const citationRegex = /\[Source: ([^\]]+) p(\d+) L(\d+)–L(\d+)\]/g;
  const citations = [];
  let m;
  while ((m = citationRegex.exec(finalText)) !== null) {
    citations.push({ doc_id: m[1], page: Number(m[2]), line_start: Number(m[3]), line_end: Number(m[4]) });
  }

  await db.logChat({
    tenant_id, session_id, persona_code,
    request: { text: message, tools_allowed: toolPolicies?.tools?.map(t=>t.name) || [] },
    retrieved: snippets.map(s => ({ doc_id: s.doc_id, page: s.page, line_start: s.line_start, line_end: s.line_end, hash: s.sha256 })),
    model_used: engine.model,
    router_trace: engine,
    response: { text: finalText, citations },
    validators: results,
    success: true
  });

  return res.status(200).json({ text: finalText, citations, model_used: engine.model, router_trace: engine, validators: results });
}

// Helpers (placeholders)
const db = {
  getPersona: async (tenant_id: string, code: string) => ({}),
  getPrompt: async (tenant_id: string, persona_code: string, kind: string, name: string) => ({ content: '' }),
  getPolicy: async (tenant_id: string, name: string) => ({}),
  getTemplate: async (tenant_id: string, name: string) => ({ template: { prompt: '' } }),
  getRouter: async (tenant_id: string, name: string) => ({}),
  getValidators: async (tenant_id: string) => ([]),
  logChat: async (row: any) => {}
};

const retrievalAdapter = {
  retrieve: async (args: any) => ([])
};

const routingEngine = {
  select: (router: any, context: any) => ({
    provider: 'cloud',
    model: 'gpt-light-4k',
    temperature: 0.2,
    seed: 42,
    max_tokens: 1200,
    decision: 'gpt-lite.default'
  })
};

function buildPrompt(systemContent: string, userTpl: string, vars: any) {
  const snippetsText = (vars.snippets || []).map((s: any) => `• ${s.doc_id} p${s.page} L${s.line_start}–L${s.line_end}: ${s.text}`).join('\n');
  const p = userTpl
    .replace('{user_query}', vars.user_query || '')
    .replace('{snippets}', snippetsText)
    .replace('{citations_block}', vars.citations || '');
  return systemContent + '\n\n' + p;
}

async function validateAll(validators: any[], text: string) {
  const out = [];
  for (const v of validators) {
    if (v.type === 'regex') {
      const re = new RegExp(v.pattern, 'g');
      out.push({ name: v.name, pass: re.test(text) });
    } else if (v.type === 'negative_phrases') {
      const hit = (v.phrases || []).some((ph: string) => text.toLowerCase().includes(ph.toLowerCase()));
      out.push({ name: v.name, pass: !hit });
    } else {
      out.push({ name: v.name, pass: true });
    }
  }
  return out;
}
