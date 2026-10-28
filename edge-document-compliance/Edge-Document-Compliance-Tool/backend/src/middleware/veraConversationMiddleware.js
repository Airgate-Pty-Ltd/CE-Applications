/**
 * Vera Conversation Middleware
 * Detects intent, loads persona, and prepares conversational responses
 * JavaScript version for integration with existing chat route
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryEdcatAI } from '../config/databases.js';
import { getVeraGreetingEngine } from '../services/veraGreetingEngine.js';
import VeraUserProfileService from '../services/vera/VeraUserProfileService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load seed files - try multiple possible paths
function findSeedFile(filename) {
  const possiblePaths = [
    path.join(__dirname, '../../EDCAT AIP/seed', filename),
    path.join(__dirname, '../../../EDCAT AIP/seed', filename),
    path.join(process.cwd(), 'backend/EDCAT AIP/seed', filename),
    path.join(process.cwd(), 'EDCAT AIP/seed', filename),
    path.join('/app/backend/EDCAT AIP/seed', filename), // Railway path
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

const routerPath = findSeedFile('vera_intent_router.json');
const personaPath = findSeedFile('vera_persona_profile.json');

let router = null;
let personaSeed = null;

// Load seed files on module load
try {
  if (routerPath && personaPath) {
    router = JSON.parse(fs.readFileSync(routerPath, 'utf-8'));
    personaSeed = JSON.parse(fs.readFileSync(personaPath, 'utf-8'));
    console.log('[vera-conversation] ✓ Loaded persona and intent router from seed files');
  } else {
    throw new Error(`Seed files not found. Router: ${routerPath || 'not found'}, Persona: ${personaPath || 'not found'}`);
  }
} catch (error) {
  console.error('[vera-conversation] ⚠️  Could not load seed files:', error.message);
  console.error('[vera-conversation]    Falling back to minimal defaults');
  // Minimal defaults
  router = {
    intents: {
      greeting: { keywords: ['hi', 'hello', 'good morning', 'good afternoon'], priority: 10 },
      capability_query: { keywords: ['what can you do', 'features', 'capabilities'], priority: 9 },
      casual_chat: { keywords: ['how are you', 'thank you', 'thanks'], priority: 5 },
      compliance_question: { keywords: ['clause', 'requirement', 'as9100', 'iso 9001'], priority: 8 },
      procedure_request: { keywords: ['write a procedure', 'draft procedure'], priority: 7 },
      system_help: { keywords: ['parse', 'standard list'], priority: 6 }
    },
    defaults: { unknown_intent: 'compliance_question' },
    canned_responses: {
      greeting: '👋 {greetingLine}',
      capability_query: 'I can chat with you about your work, explain requirements, help you plan audits, generate GAP views, and draft procedures.',
      casual_chat: '{smallTalkLine}',
      system_help: 'Here\'s what I can do: list parsed standards, parse new ones, run GAP checks, and help draft documents.'
    }
  };
  personaSeed = {
    persona_code: 'vera',
    tone: 'professional, calm, technically precise',
    greeting_variants: ['Good {timeOfDay}, I\'m Vera. What would you like to work on?'],
    small_talk_templates: {
      how_are_you: 'I\'m functioning optimally, thank you for asking.'
    }
  };
}

/**
 * NEW: Check if this response would repeat recent conversation
 * Prevent: "You uploaded ISO9001... [5 messages later] You uploaded ISO9001..."
 */
function detectRepetition(currentResponse, conversationHistory) {
  if (!conversationHistory || conversationHistory.length < 2) {
    return false; // Can't repeat if no history
  }

  // Check last 5 messages for similar content
  const recentMessages = conversationHistory.slice(-5);
  const recentTopics = recentMessages
    .filter(msg => msg.role === 'assistant' || msg.message_role === 'assistant')
    .map(msg => extractTopics(msg.message || msg.message_content || ''));

  const currentTopics = extractTopics(currentResponse);

  // If current response covers same topics, flag it
  const overlap = recentTopics.some(recent => 
    recent.some(topic => currentTopics.includes(topic))
  );

  return overlap;
}

/**
 * HELPER: Extract main topics from a message
 */
function extractTopics(message) {
  if (!message) return [];
  const topics = [];
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('uploaded') || lowerMsg.includes('upload')) topics.push('file_upload');
  if (lowerMsg.includes('standard') || lowerMsg.includes('requirement')) topics.push('standard_content');
  if (lowerMsg.includes('gap')) topics.push('gap_analysis');
  if (lowerMsg.includes('procedure')) topics.push('procedure_content');
  if (lowerMsg.includes('clause') || lowerMsg.match(/\d+\.\d+/)) topics.push('clause_query');
  if (lowerMsg.includes('parse') || lowerMsg.includes('parsing')) topics.push('parsing');
  if (lowerMsg.includes('as9100') || lowerMsg.includes('iso 9001') || lowerMsg.includes('iso9001')) topics.push('as9100');
  if (lowerMsg.includes('iso 13485') || lowerMsg.includes('iso13485')) topics.push('iso13485');
  if (lowerMsg.includes('faa') || lowerMsg.includes('easa') || lowerMsg.includes('casa')) topics.push('regulatory');
  
  return topics;
}

/**
 * Detect intent from message
 */
function detectIntent(message) {
  const text = message.toLowerCase();
  let bestIntent = router.defaults.unknown_intent || 'compliance_question';
  let bestScore = 0;

  // CRITICAL: Check for technical questions FIRST (before any other classification)
  // This prevents "ok, vera, define 6 sigma" from being classified as greeting/casual_chat
  const technicalQuestionPatterns = [
    /\b(what is|what's|what are|define|explain|describe|how does|how do|tell me about|what do you know about)\b/i,
    /\b(six sigma|dmaic|dfss|cqe|certified quality engineer|lean|5s|kanban|value stream|muda|wastes)\b/i,
    /\b(kpi|key performance indicator|cost of quality|coq|spc|statistical process control|fmea|apqp|ppap)\b/i,
    /\b(process capability|cpk|ppk|msa|gage r&r|gr&r|reliability|weibull|metrology)\b/i,
    /\b(as9100|iso 9001|iso9001|iso 13485|iso13485|iatf 16949|faa|easa|part 21|part 145)\b/i
  ];
  
  const isTechnicalQuestion = technicalQuestionPatterns.some(pattern => pattern.test(message));
  if (isTechnicalQuestion) {
    // Return technical_question intent to prevent greeting/casual_chat hijack
    return 'technical_question';
  }

  // Check for "tell me about yourself" / "who are you" queries FIRST (highest priority)
  // This must come BEFORE capability_query to avoid misclassification
  if (text.includes('tell me about yourself') || text.includes('tell me about you') ||
      text.includes('who are you') || text.includes('what are you') ||
      text.includes('what is vera') || text.includes('who is vera') ||
      text.includes('i want to learn about') || text.includes('learn about vera') ||
      text.includes('what is your background') || text.includes('your background') ||
      text.includes('tell me about vera') || text.includes('who or what is vera') ||
      (text.includes('about yourself') && !text.includes('clause')) ||
      (text.includes('about you') && !text.includes('clause') && !text.includes('capability'))) {
    return 'self_introduction';
  }

  // Check for capability queries - must come AFTER self_introduction
  // "what are your capabilities" should NOT match "capa" or "what is"
  if (text.includes('your capabilities') || text.includes('your capability') ||
      (text.includes('what are your') && (text.includes('capabilities') || text.includes('capability'))) ||
      (text.includes('what can you') && !text.includes('capa') && !text.includes('tell me') && !text.includes('about')) ||
      (text.includes('capabilities') && !text.includes('capa') && !text.includes('corrective') && 
       (text.includes('what') || text.includes('your')))) {
    return 'capability_query';
  }
  
  // Check for "how to" / "how do" questions - route to appropriate handler
  if ((text.includes('how to') || text.includes('how do') || text.includes('how can')) &&
      (text.includes('perform') || text.includes('do') || text.includes('run') || text.includes('conduct'))) {
    if (text.includes('gap') || text.includes('gap analysis')) {
      return 'gap_analysis_request';
    }
    if (text.includes('capa') || text.includes('corrective action')) {
      return 'capa_request';
    }
    if (text.includes('audit')) {
      return 'audit_prep_request';
    }
  }

  // Check for standard explanation requests FIRST (before other "what is" checks)
  // "teach me about AS9100", "explain ISO 9001", "what is AS9100D"
  if ((text.includes('teach me about') || text.includes('explain') || text.includes('tell me about') || 
       text.includes('what is') || text.includes("what's") || text.includes('learn about')) &&
      /(as\d+|iso\s*\d+|iatf\s*\d+|faa\s*part\s*\d+|easa|iso\s*13485|iso\s*9001)/i.test(text)) {
    return 'standard_explanation';
  }

  // Check for company/organization introduction - NEW INTENT
  // Patterns: "let me tell you about [company]", "our company", "our organization", "conform-edge", etc.
  if (text.includes('let me tell you') || text.includes('let me introduce') ||
      text.includes('our company') || text.includes('our organization') ||
      text.includes('our business') || text.includes('our consultancy') ||
      text.includes('conform-edge') || text.includes('conform edge') ||
      (text.includes('founded by') || text.includes('created by')) ||
      (text.includes('partner') && (text.includes('australia') || text.includes('sales') || text.includes('finance'))) ||
      (text.includes('thousands of documents') && text.includes('clients'))) {
    return 'company_introduction';
  }

  // Check for "what is X" / "explain X" questions (highest priority for educational queries)
  // BUT exclude "what are your capabilities" - that's a capability query
  if (!text.includes('your capabilities') && !text.includes('your capability') &&
      (text.includes('what is') || text.includes("what's") || text.includes('what are') || 
       text.includes('explain') || text.includes('define')) && 
      (text.includes('gap') || text.includes('gap analysis') || 
       text.includes('compliance') || text.includes('requirement') ||
       text.includes('standard') || text.includes('audit') ||
       (text.includes('capa') && !text.includes('capability')) || text.includes('nonconformity'))) {
    // Route to appropriate handler based on topic
    if (text.includes('gap')) {
      return 'gap_analysis_request';
    }
    if ((text.includes('capa') || text.includes('corrective action')) && !text.includes('capability')) {
      return 'capa_request';
    }
    if (text.includes('audit')) {
      return 'audit_prep_request';
    }
    // Default to gap analysis if it's a general "what is" question
    return 'gap_analysis_request';
  }

  // This check is now moved above capability_query check

  // Check for greeting first (highest priority) - greetings often come at the start
  if (router.intents.greeting) {
    const greetingScore = router.intents.greeting.keywords.reduce((score, kw) => {
      if (text.includes(kw.toLowerCase())) return score + 1;
      return score;
    }, 0) * router.intents.greeting.priority;
    
    // If message starts with greeting keywords, prioritize greeting
    const startsWithGreeting = router.intents.greeting.keywords.some(kw => 
      text.trim().startsWith(kw.toLowerCase())
    );
    if (startsWithGreeting && greetingScore > 0) {
      return 'greeting';
    }
  }

  for (const [name, cfg] of Object.entries(router.intents)) {
    let score = 0;
    for (const kw of cfg.keywords) {
      if (text.includes(kw.toLowerCase())) score += 1;
    }
    score = score * cfg.priority;
    if (score > bestScore) {
      bestScore = score;
      bestIntent = name;
    }
  }
  return bestIntent;
}

/**
 * Choose greeting variant based on time of day and name
 */
function chooseGreetingVariant(profile, name) {
  const variants = profile.greeting_variants || ['Good day.'];
  if (!variants || variants.length === 0) return 'Good day.';
  const idx = Math.floor(Math.random() * variants.length);
  let chosen = variants[idx];
  const now = new Date();
  const hour = now.getHours();
  const tod = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  chosen = chosen.replace(/{timeOfDay}/g, tod);
  if (name && name.trim().length > 0) {
    chosen = chosen.replace(/{name}/g, name);
    chosen = chosen.replace(/{commaName}/g, `, ${name}`);
  } else {
    chosen = chosen.replace(/{name}/g, 'there');
    chosen = chosen.replace(/{commaName}/g, '');
  }
  return chosen;
}

/**
 * Get small talk line
 */
function smallTalkLine(profile) {
  return profile.small_talk_templates?.how_are_you || 
    "I'm operating within normal parameters. How is your day going?";
}

/**
 * Create Vera conversation middleware
 */
export function createVeraConversationMiddleware() {
  return async function veraConversationMiddleware(req, res, next) {
    try {
      const { tenant_id, session_id, message, user_name } = req.body || {};
      
      // Default tenant ID if not provided
      const DEFAULT_TENANT_ID = tenant_id || '00000000-0000-0000-0000-000000000000';
      const DEFAULT_SESSION_ID = session_id || '00000000-0000-0000-0000-000000000000';

      // Load persona from database (with fallback to seed)
      let persona = personaSeed;
      try {
        const personaResult = await queryEdcatAI(
          `SELECT profile FROM edcat.ai_persona_profile WHERE tenant_id = $1 AND persona_code = $2`,
          [DEFAULT_TENANT_ID, 'vera']
        );
        if (personaResult.rows.length > 0 && personaResult.rows[0].profile) {
          persona = { ...personaSeed, ...personaResult.rows[0].profile };
          console.log('[vera-conversation] ✓ Loaded persona from database');
        }
      } catch (e) {
        // Silently fall back to seed
        console.log('[vera-conversation] Using seed persona (DB lookup failed or table missing)');
      }

      // Fetch conversation state
      let contextRow = null;
      try {
        const stateResult = await queryEdcatAI(
          `SELECT last_intent, context, last_topic FROM edcat.ai_conversation_state 
           WHERE tenant_id = $1 AND session_id = $2 AND persona_code = $3`,
          [DEFAULT_TENANT_ID, DEFAULT_SESSION_ID, 'vera']
        );
        contextRow = stateResult.rows[0] || null;
      } catch (e) {
        // Ignore - state is optional
      }

      // NEW: Check for file uploads without context
      const documentIds = Array.isArray(req.body.documentIds) ? req.body.documentIds : (req.body.documentIds ? [req.body.documentIds] : []);
      const filesArray = Array.isArray(req.body.files) ? req.body.files : (req.body.files ? [req.body.files] : []);
      const multerFiles = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files)) : [];
      
      const hasFileUpload = documentIds.length > 0 || filesArray.length > 0 || multerFiles.length > 0;
      
      // Detect intent (with special handling for uploads)
      let intent = detectIntent(message);
      
      // NEW: If files are uploaded but no clear intent, set upload intent
      if (hasFileUpload && (!message || message.trim().length === 0) && intent === 'compliance_question') {
        intent = 'document_upload_no_context';
      } else if (hasFileUpload && (!message || message.trim().length < 10)) {
        // Very short or empty message with files = upload without context
        intent = 'document_upload_no_context';
      }
      
      console.log(`[vera-conversation] Detected intent: ${intent}${hasFileUpload ? ' (with file upload)' : ''}`);
      if (hasFileUpload) {
        console.log(`[vera-conversation] Upload detected: ${documentIds.length} documentIds, ${filesArray.length} files, ${multerFiles.length} multer files`);
      }
      
      // Attach upload info to request
      if (hasFileUpload) {
        req._vera_upload = {
          documentIds: documentIds,
          files: filesArray.length > 0 ? filesArray : multerFiles,
          hasUpload: true
        };
      }

      // Use new greeting engine for greetings
      const greetingEngine = getVeraGreetingEngine();
      let canned = null;
      
      // CRITICAL: Check for technical questions BEFORE generating greeting
      // Import technical question detector
      let isTechnical = false;
      try {
        const { looksLikeTechnicalQuestion } = await import('../services/vera/VeraIntentService.js');
        isTechnical = looksLikeTechnicalQuestion(message);
      } catch (e) {
        // Fallback: simple check
        const lower = message.toLowerCase();
        isTechnical = /\b(what is|what's|define|explain|describe|how does|how do|tell me about)\b/i.test(lower) ||
                      /\b(six sigma|dmaic|cqe|lean|kpi|cost of quality|spc|fmea)\b/i.test(lower);
      }
      
      // Check if message is greeting-like using the new engine
      const isGreeting = greetingEngine.isGreetingLike(message);
      
      // CRITICAL: Only generate greeting if:
      // 1. Intent is explicitly greeting (not technical_question or casual_chat with technical content)
      // 2. It's NOT a technical question
      // 3. It's genuinely smalltalk (not "ok, vera, define X")
      const shouldGenerateGreeting = (intent === 'greeting' || (intent === 'casual_chat' && isGreeting)) && 
                                      !isTechnical && 
                                      intent !== 'technical_question' &&
                                      !message.toLowerCase().match(/\b(define|what is|what's|explain|describe)\b/i);
      
      if (shouldGenerateGreeting) {
        // Use the new greeting engine for natural greetings
        const greetingText = greetingEngine.buildGreeting(message, {
          user_name: user_name || null,
          previous_topic: contextRow?.last_topic || null,
          user_tone_hint: null // Could be inferred from message
        });
        canned = greetingText;
        
        // Attach greeting info to request for the chat route to use
        req._vera_greeting = {
          isGreeting: true,
          text: greetingText
        };
      } else if (intent === 'capability_query') {
        // Use conversational engine for richer capability responses
        canned = null; // Will be handled by conversational engine
      } else if (intent === 'casual_chat') {
        // Check if this is a follow-up to a previous casual chat
        const lowerMsg = message.toLowerCase();
        const isFollowUp = contextRow?.last_intent === 'casual_chat' && 
          (lowerMsg.includes('wonderful') || lowerMsg.includes('great') || 
           lowerMsg.includes('good') || lowerMsg.includes('nice') || 
           lowerMsg.includes('thanks') || lowerMsg.includes('thank you') ||
           lowerMsg.includes('okay') || lowerMsg.includes('ok') ||
           lowerMsg.includes('sure') || lowerMsg.includes('yeah') ||
           lowerMsg.includes('right') || lowerMsg.includes('exactly') ||
           lowerMsg.includes('i see') || lowerMsg.includes('got it'));
        
        if (isFollowUp) {
          // Short, natural follow-up responses
          const followUps = [
            "Happy to help! What would you like to work on today?",
            "Great! Is there anything specific you'd like to tackle?",
            "Perfect! Ready to dive into your compliance work?",
            "Excellent! What can I help you with?",
            "Sounds good! What's on your agenda today?"
          ];
          canned = followUps[Math.floor(Math.random() * followUps.length)];
        } else {
          const line = smallTalkLine(persona);
          canned = router.canned_responses.casual_chat.replace('{smallTalkLine}', line);
        }
      } else if (intent === 'system_help') {
        // Use conversational engine for richer system help
        canned = null; // Will be handled by conversational engine
      }

      // NEW: Extract user identity and get/create user profile
      const authUser = req.user || req.authUser || null;
      const userExternalId = authUser?.id || authUser?.email || req.body?.user_id || req.body?.user_email || 'anonymous';
      const displayName = authUser?.name || user_name || authUser?.displayName || null;
      const defaultRole = VeraUserProfileService.determineDefaultRoleFromAuth(authUser);

      let userProfile;
      try {
        userProfile = await VeraUserProfileService.getOrCreateUserProfile({
          tenantId: DEFAULT_TENANT_ID,
          userExternalId,
          displayName,
          defaultRole
        });
      } catch (profileError) {
        console.warn('[vera-conversation] Could not load user profile:', profileError.message);
        userProfile = VeraUserProfileService.getAnonymousProfile(DEFAULT_TENANT_ID);
      }

      // Attach to request
      req._vera_conversation = {
        persona,
        intent,
        canned,
        previous: contextRow || undefined,
        tenant_id: DEFAULT_TENANT_ID,
        session_id: DEFAULT_SESSION_ID,
        userProfile  // NEW: Attach user profile
      };

      // Also attach to veraContext for chat.js route
      req.veraContext = {
        tenantId: DEFAULT_TENANT_ID,
        sessionId: DEFAULT_SESSION_ID,
        userProfile
      };

      // Debug logging
      if (process.env.DEBUG_VERA) {
        console.log('[vera-conversation] Debug:', {
          intent,
          hasCanned: !!canned,
          hasPersona: !!persona,
          hasPrevious: !!contextRow
        });
      }

      next();
    } catch (error) {
      console.error('[vera-conversation] Middleware error:', error);
      console.error('[vera-conversation] Stack:', error.stack);
      // Continue without conversation context but log the issue
      req._vera_conversation = {
        intent: 'compliance_question',
        tenant_id: DEFAULT_TENANT_ID,
        session_id: DEFAULT_SESSION_ID
      };
      next();
    }
  };
}

/**
 * Update conversation state
 */
export async function updateConversationState(tenantId, sessionId, intent, context, lastTopic) {
  try {
    await queryEdcatAI(
      `INSERT INTO edcat.ai_conversation_state (tenant_id, session_id, persona_code, last_intent, context, last_topic)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, session_id, persona_code)
       DO UPDATE SET last_intent = EXCLUDED.last_intent, 
                     context = EXCLUDED.context, 
                     last_topic = EXCLUDED.last_topic, 
                     updated_at = now()`,
      [tenantId, sessionId, 'vera', intent, JSON.stringify(context || {}), lastTopic]
    );
  } catch (error) {
    console.error('[vera-conversation] Error updating state:', error.message);
    // Non-fatal
  }
}

// Export conversation memory functions
export { detectRepetition, extractTopics };

