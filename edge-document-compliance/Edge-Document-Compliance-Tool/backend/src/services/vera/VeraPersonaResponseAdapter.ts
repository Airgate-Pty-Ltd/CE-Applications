/**
 * Vera Persona Response Adapter
 * 
 * Wraps plain responses with persona-aware formatting, regional phrasing,
 * and context-appropriate tone. Phase 16: Personality, Tone & "Fun" Interaction Layer
 */

import { veraPersonaProfile, getPersonaPhrase, getEffectiveHumourLevel } from '../../config/veraPersonaProfile.js';

export interface ResponseContext {
  topic?: string;
  intent?: string;
  isSerious?: boolean;
  isGreeting?: boolean;
  isClosing?: boolean;
  needsReassurance?: boolean;
  needsEncouragement?: boolean;
  needsChallenge?: boolean;
}

/**
 * Adapt response with persona layer
 */
export function adaptResponseWithPersona(
  plainResponse: string,
  context: ResponseContext = {}
): string {
  const effectiveHumour = getEffectiveHumourLevel(context);
  let adapted = plainResponse;

  // Handle greetings
  if (context.isGreeting) {
    const greeting = getPersonaPhrase('defaultGreetings');
    if (greeting) {
      adapted = `${greeting}\n\n${adapted}`;
    }
  }

  // Add reassurance if needed
  if (context.needsReassurance && effectiveHumour !== 'low') {
    const reassurance = getPersonaPhrase('reassurancePhrases');
    if (reassurance && Math.random() > 0.7) { // 30% chance to add reassurance
      adapted = `${reassurance}\n\n${adapted}`;
    }
  }

  // Add encouragement if needed
  if (context.needsEncouragement && effectiveHumour !== 'low') {
    const encouragement = getPersonaPhrase('encouragementPhrases');
    if (encouragement && Math.random() > 0.6) { // 40% chance
      adapted = `${encouragement}\n\n${adapted}`;
    }
  }

  // Add gentle challenge if needed
  if (context.needsChallenge && effectiveHumour !== 'low') {
    const challenge = getPersonaPhrase('gentleChallengerPhrases');
    if (challenge && Math.random() > 0.7) { // 30% chance
      adapted = `${adapted}\n\n${challenge}`;
    }
  }

  // Apply regional phrasing (subtle)
  adapted = applyRegionalPhrasing(adapted, veraPersonaProfile.regionFlavour);

  // Handle closing
  if (context.isClosing) {
    const closing = getPersonaPhrase('closingPhrases');
    if (closing) {
      adapted = `${adapted}\n\n${closing}`;
    }
  }

  return adapted;
}

/**
 * Apply subtle regional phrasing
 */
function applyRegionalPhrasing(text: string, flavour: "british" | "scottish" | "neutral"): string {
  if (flavour === 'neutral') return text;

  // Very subtle - only occasional replacements
  if (Math.random() > 0.9) { // 10% chance
    const replacements: Record<string, string> = {
      'british': {
        'let\'s': 'shall we',
        'we should': 'we ought to',
        'that\'s good': 'that\'s brilliant',
        'okay': 'right',
        'sure': 'absolutely'
      },
      'scottish': {
        'let\'s': 'we\'ll',
        'that\'s good': 'that\'s grand',
        'okay': 'aye',
        'sure': 'aye, right'
      }
    };

    const flavourReplacements = replacements[flavour] || {};
    for (const [from, to] of Object.entries(flavourReplacements)) {
      if (text.includes(from) && Math.random() > 0.5) {
        text = text.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
        break; // Only one replacement per response
      }
    }
  }

  return text;
}

/**
 * Detect if response needs persona adaptation
 */
export function detectPersonaNeeds(
  userMessage: string,
  intent: string,
  responseLength: number
): ResponseContext {
  const lower = userMessage.toLowerCase();
  
  return {
    topic: extractTopic(userMessage),
    intent,
    isSerious: detectSeriousTopic(lower, intent),
    isGreeting: /^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(userMessage),
    isClosing: /^(thanks|thank you|cheers|that's all|done|finished)/i.test(userMessage),
    needsReassurance: /(confused|unsure|don't know|stuck|struggling|difficult|hard)/i.test(userMessage),
    needsEncouragement: /(good|great|excellent|perfect|exactly|right)/i.test(userMessage),
    needsChallenge: intent.includes('audit') || intent.includes('compliance') || lower.includes('check')
  };
}

/**
 * Extract topic from message
 */
function extractTopic(message: string): string | undefined {
  const topicMatch = message.match(/(?:about|regarding|concerning|for)\s+([a-z0-9\s]+?)(?:\?|$|\.|,)/i);
  return topicMatch ? topicMatch[1].trim() : undefined;
}

/**
 * Detect if topic is serious (regulators, safety, recalls)
 */
function detectSeriousTopic(message: string, intent: string): boolean {
  const seriousKeywords = [
    'recall', 'safety', 'regulator', 'faa', 'fda', 'easa', 'violation',
    'nonconformity', 'audit finding', 'corrective action', 'suspension'
  ];
  
  return seriousKeywords.some(keyword => message.includes(keyword)) ||
         intent.includes('regulatory') ||
         intent.includes('nonconformity');
}

