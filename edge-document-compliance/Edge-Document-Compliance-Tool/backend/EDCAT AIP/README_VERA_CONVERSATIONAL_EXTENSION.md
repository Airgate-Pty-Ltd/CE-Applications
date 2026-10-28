# EDCAT – Vera Conversational Extension Pack

This pack makes Vera behave like a real onboard AI assistant instead of only responding with the basic "parse a standard" framework.

It adds:

- A **persona profile** for Vera
- An **intent router** that recognizes greetings, capability questions, casual chat, compliance questions, procedure requests, and system-help questions
- A **conversation middleware** that detects intent, loads persona & prior context, and attaches them to the request
- An **example chat handler** that:
  - Uses canned conversational answers when appropriate
  - Falls back to your existing GPT/LLM integration for deeper reasoning
  - Updates conversation state in the database so Vera can remember the session

## Files

- `schema/vera_conversation.sql`
  - `ai_persona_profile` – tenant-level persona overrides
  - `ai_conversation_state` – per-session conversational memory

- `seed/vera_persona_profile.json`
  - Default personality for Vera: tone, style, greeting variants, small-talk templates.

- `seed/vera_intent_router.json`
  - Keyword-based intent router for:
    - `greeting`
    - `capability_query`
    - `casual_chat`
    - `compliance_question`
    - `procedure_request`
    - `system_help`

- `server/vera_conversation_middleware.ts`
  - Express middleware that:
    - Loads persona (from DB override or seed)
    - Loads prior conversation state (if any)
    - Detects the current intent from the user message
    - Pre-composes optional canned responses for greetings/capability/casual/system-help
    - Attaches all this to `req._vera_conversation`

- `server/vera_chat_handler_example.ts`
  - Example chat handler that:
    - Reads `req._vera_conversation`
    - Uses canned responses for pure conversational requests
    - Otherwise builds a richer system prompt and calls your LLM (`callLLM`)
    - Saves updated conversation state

## How to wire this into EDCAT (Cursor checklist)

1. **Apply schema**  
   Run once against your EDCAT database:
   ```bash
   psql $EDCAT_DB_URL -f schema/vera_conversation.sql
   ```

2. **Seed persona and intents**  
   Either:
   - Insert them as JSON into your existing `ai_policy` / `ai_prompt` tables, **or**
   - Keep them on disk and let the middleware read them (as shown).

   Recommended (database-seeded):
   ```sql
   INSERT INTO ai_persona_profile (tenant_id, persona_code, profile)
   VALUES ('<TENANT_UUID>', 'vera', '<contents of vera_persona_profile.json>'::jsonb)
   ON CONFLICT (tenant_id, persona_code) DO UPDATE SET profile=EXCLUDED.profile;
   ```

3. **Add conversation middleware**  
   In your Express app:
   ```ts
   import { createVeraConversationMiddleware } from './server/vera_conversation_middleware';
   const veraConversation = createVeraConversationMiddleware(pg, './edcat_vera_conversational_extension');
   ```

   Then apply it before your Vera chat route:
   ```ts
   app.post('/api/ai/vera/chat', veraConversation, veraChatHandler);
   ```

4. **Swap in the example chat handler (or merge it into yours)**  
   - Replace your current Vera handler logic with `createVeraChatHandler(pg)` from `vera_chat_handler_example.ts`, or
   - Integrate the same pattern into your existing handler so that:
     - You read `req._vera_conversation`
     - You short-circuit for greetings/capability/casual/system-help
     - You call your existing LLM for more complex work with persona + state

5. **Front-end expectations**  
   Your Vera chat front-end should send at least:
   ```json
   {
     "tenant_id": "<TENANT_UUID>",
     "session_id": "<SESSION_UUID>",
     "message": "good afternoon Vera",
     "user_name": "Brian"
   }
   ```

   `standard_code` and `revision` remain optional and are mainly used when you want Vera to reason over specific parsed standards.

## Resulting behavior

- When you say: **"good afternoon Vera"**  
  She replies with a dynamic greeting drawn from her persona profile—*no more parse-standard boilerplate*.

- When you say: **"what conversational features do you have?"**  
  The intent router classifies this as `capability_query`, and Vera answers with a high-level overview of her conversational and compliance capabilities.

- When you ask: **"What does clause 8.7 require in AS9100D?"**  
  The intent router classifies this as `compliance_question`, and your handler can then:
  - Run retrieval against parsed AS9100D
  - Feed snippets + system prompt + persona into the LLM
  - Return an answer with proper citations and follow-up options.

This pack is designed to **drop directly into Cursor and your EDCAT repo**.  
You can expand the intent router, persona profile, and conversation state logic over time without breaking your existing parsing/GAP engines.
