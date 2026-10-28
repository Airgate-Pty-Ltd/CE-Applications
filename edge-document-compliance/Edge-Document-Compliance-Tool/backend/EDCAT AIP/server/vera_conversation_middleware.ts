import type { Request, Response, NextFunction } from 'express';
import type { Client } from 'pg';
import fs from 'fs';
import path from 'path';

type IntentName =
  | 'greeting'
  | 'capability_query'
  | 'casual_chat'
  | 'compliance_question'
  | 'procedure_request'
  | 'system_help'
  | 'unknown';

interface IntentRouter {
  version: string;
  persona_code: string;
  intents: Record<string, { keywords: string[]; priority: number }>;
  defaults: { unknown_intent: IntentName };
  canned_responses: Record<string, string>;
}

interface PersonaProfile {
  persona_code: string;
  tone: string;
  style: {
    formality: string;
    verbosity: string;
    uses_emojis: boolean;
    emoji_palette: string[];
    allow_small_talk: boolean;
  };
  greeting_variants: string[];
  fallback_phrase: string;
  persona_memory: { likes: string[]; dislikes: string[] };
  small_talk_templates: {
    how_are_you: string;
    encouragement: string;
  };
}

export function createVeraConversationMiddleware(pg: Client, seedDir = './edcat_vera_conversational_extension') {
  const routerPath = path.join(seedDir, 'seed', 'vera_intent_router.json');
  const personaPath = path.join(seedDir, 'seed', 'vera_persona_profile.json');

  const router: IntentRouter = JSON.parse(fs.readFileSync(routerPath, 'utf-8'));
  const personaSeed: PersonaProfile = JSON.parse(fs.readFileSync(personaPath, 'utf-8'));

  function detectIntent(message: string): IntentName {
    const text = message.toLowerCase();
    let bestIntent: IntentName = router.defaults.unknown_intent as IntentName;
    let bestScore = 0;

    for (const [name, cfg] of Object.entries(router.intents)) {
      let score = 0;
      for (const kw of cfg.keywords) {
        if (text.includes(kw.toLowerCase())) score += 1;
      }
      score = score * cfg.priority;
      if (score > bestScore) {
        bestScore = score;
        bestIntent = name as IntentName;
      }
    }
    return bestIntent;
  }

  function chooseGreetingVariant(profile: PersonaProfile, name?: string | null) {
    const variants = profile.greeting_variants;
    if (!variants || variants.length === 0) return 'Good day.';
    const idx = Math.floor(Math.random() * variants.length);
    let chosen = variants[idx];
    const now = new Date();
    const hour = now.getHours();
    const tod = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    chosen = chosen.replace('{timeOfDay}', tod);
    if (name && name.trim().length > 0) {
      chosen = chosen.replace('{name}', name);
      chosen = chosen.replace('{commaName}', `, ${name}`);
    } else {
      chosen = chosen.replace('{name}', 'there');
      chosen = chosen.replace('{commaName}', '');
    }
    return chosen;
  }

  function smallTalkLine(profile: PersonaProfile): string {
    return profile.small_talk_templates?.how_are_you ||
      "I’m operating within normal parameters. How is your day going?";
  }

  return async function veraConversation(req: Request, res: Response, next: NextFunction) {
    const { tenant_id, session_id, message, user_name } = req.body || {};
    if (!tenant_id || !session_id || !message) {
      return res.status(400).json({ error: 'tenant_id, session_id, and message are required' });
    }

    // load any tenant-specific persona override, else fall back to seed
    let persona = personaSeed;
    try {
      const row = await pg.query(
        'select profile from ai_persona_profile where tenant_id=$1 and persona_code=$2',
        [tenant_id, personaSeed.persona_code]
      );
      if (row.rows[0]?.profile) {
        persona = { ...personaSeed, ...row.rows[0].profile };
      }
    } catch (e) {
      // if this fails, we silently fall back to seed
    }

    // fetch conversation state
    let contextRow = null;
    try {
      const r = await pg.query(
        'select last_intent, context, last_topic from ai_conversation_state where tenant_id=$1 and session_id=$2 and persona_code=$3',
        [tenant_id, session_id, personaSeed.persona_code]
      );
      contextRow = r.rows[0] || null;
    } catch (err) {
      // ignore; state is optional
    }

    const intent = detectIntent(message);

    // pre-compose canned conversational responses; the chat handler can either use them
    // directly (for simple small talk) or blend them into the LLM prompt.
    let canned: string | null = null;
    if (intent === 'greeting') {
      const line = chooseGreetingVariant(persona, user_name);
      canned = router.canned_responses.greeting.replace('{greetingLine}', line);
    } else if (intent === 'capability_query') {
      canned = router.canned_responses.capability_query;
    } else if (intent === 'casual_chat') {
      const line = smallTalkLine(persona);
      canned = router.canned_responses.casual_chat.replace('{smallTalkLine}', line);
    } else if (intent === 'system_help') {
      canned = router.canned_responses.system_help;
    }

    // attach to request so the chat handler can use it
    (req as any)._vera_conversation = {
      persona,
      intent,
      canned,
      previous: contextRow || undefined
    };

    next();
  };
}
