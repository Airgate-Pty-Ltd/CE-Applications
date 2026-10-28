import type { Request, Response } from 'express';
import type { Client } from 'pg';
import { callLLM } from '../llm/callLLM'; // adapt to your stack

/**
 * Example Vera chat handler that:
 * 1) uses the conversation middleware (_vera_conversation)
 * 2) uses your existing Vera system prompt (system.follow.rules)
 * 3) allows conversational replies even when no standards are parsed
 */
export function createVeraChatHandler(pg: Client) {
  return async function veraChatHandler(req: Request, res: Response) {
    const { tenant_id, session_id, message, standard_code, revision } = req.body || {};
    if (!tenant_id || !session_id || !message) {
      return res.status(400).json({ error: 'tenant_id, session_id, and message are required' });
    }

    const conv = (req as any)._vera_conversation;
    if (!conv) return res.status(500).json({ error: 'Vera conversation middleware not configured' });

    const { persona, intent, canned, previous } = conv;

    // load Vera system prompt (from previous pack)
    const sysRow = await pg.query(
      "select content from ai_prompt where tenant_id=$1 and persona_code='vera' and kind='system' and name='system.follow.rules'",
      [tenant_id]
    );
    const systemPrompt = sysRow.rows[0]?.content || 'You are Vera, a compliance assistant.';

    // If we have a canned conversational answer and no need for deep compliance work,
    // we can short-circuit and reply immediately.
    if (canned && !['compliance_question','procedure_request'].includes(intent)) {
      // update conversation state
      await pg.query(`
        INSERT INTO ai_conversation_state (tenant_id, session_id, persona_code, last_intent, context, last_topic)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (tenant_id, session_id, persona_code)
        DO UPDATE SET last_intent=EXCLUDED.last_intent, context=EXCLUDED.context, last_topic=EXCLUDED.last_topic, updated_at=now()
      `,[tenant_id, session_id, persona.persona_code, intent, previous?.context || {}, message]);

      return res.json({
        text: canned,
        mode: 'conversational',
        intent
      });
    }

    // Otherwise, we construct a richer prompt and call the LLM
    const contextSummary = previous?.context?.summary || previous?.last_topic || '';
    const personaHeader = `Persona tone: ${persona.tone}. The user prefers technically detailed, audit-ready explanations.`;

    const finalSystem = [
      systemPrompt.trim(),
      '',
      personaHeader,
      contextSummary ? `Previous topic summary: ${contextSummary}` : ''
    ].filter(Boolean).join('\n\n');

    const messages = [
      { role: 'system', content: finalSystem },
      { role: 'user', content: message }
    ];

    // Optionally, you can add a tool call here that fetches clauses/snippets before the LLM call
    // if (intent === 'compliance_question' && standard_code && revision) { ... }

    const llmResp = await callLLM({
      tenant_id,
      persona_code: persona.persona_code,
      messages,
      // include any retrieval context you already have wired in
    });

    const replyText = llmResp.text || llmResp.choices?.[0]?.message?.content || '';

    // Update conversation state with a lightweight summary; you can improve this
    const newContext = {
      summary: `Last topic: ${message.slice(0, 200)}`,
      last_reply: replyText.slice(0, 500)
    };

    await pg.query(`
      INSERT INTO ai_conversation_state (tenant_id, session_id, persona_code, last_intent, context, last_topic)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (tenant_id, session_id, persona_code)
      DO UPDATE SET last_intent=EXCLUDED.last_intent, context=EXCLUDED.context, last_topic=EXCLUDED.last_topic, updated_at=now()
    `,[tenant_id, session_id, persona.persona_code, intent, newContext, message]);

    return res.json({
      text: replyText,
      mode: 'llm',
      intent
    });
  };
}
