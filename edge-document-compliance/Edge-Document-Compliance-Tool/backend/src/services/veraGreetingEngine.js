/**
 * Vera Greeting Engine
 * Provides natural, context-aware greetings for Vera
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadJson(baseDir, file) {
  const possiblePaths = [
    path.join(__dirname, '../../EDCAT AIP/persona', file),
    path.join(__dirname, '../../../EDCAT AIP/persona', file),
    path.join(process.cwd(), 'backend/EDCAT AIP/persona', file),
    path.join(process.cwd(), 'EDCAT AIP/persona', file),
    path.join('/app/backend/EDCAT AIP/persona', file) // Railway path
  ];
  
  // Only add baseDir path if baseDir is provided and is a string
  if (baseDir && typeof baseDir === 'string') {
    possiblePaths.push(path.join(baseDir, 'persona', file));
  }

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  }
  
  throw new Error(`Could not find ${file} in any expected location`);
}

export class VeraGreetingEngine {
  constructor(baseDir = null) {
    try {
      this.persona = loadJson(baseDir, 'vera_persona_greetings.json');
      this.behavior = loadJson(baseDir, 'vera_greeting_behavior.json');
      console.log('[VeraGreetingEngine] ✓ Loaded greeting persona and behavior');
    } catch (error) {
      console.error('[VeraGreetingEngine] ⚠️  Could not load greeting files:', error.message);
      // Fallback to minimal defaults
      this.persona = {
        greetings: {
          generic: ['Hello. What would you like to work on?'],
          time_of_day: {
            morning: ['Good morning. How can I help?'],
            afternoon: ['Good afternoon. What can I do for you?'],
            evening: ['Good evening. How can I assist?']
          },
          how_are_you: ["I'm doing well, thank you. How can I help?"],
          name_addressed: ['Hi {name}. What can I help with?'],
          reconnect: ['Welcome back. What would you like to work on?'],
          empathy: ['Hello. How can I help you today?'],
          light_humor: ['Hello. Ready to work?']
        },
        fallback_greeting: 'Hello. What would you like to work on?'
      };
      this.behavior = {
        greeting_triggers: {
          pure_greeting: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'],
          how_are_you: ['how are you', "how's your day", 'how are you doing']
        },
        selection_rules: {
          prefer_time_of_day: true,
          prefer_name_when_available: true,
          allow_empathy_when_stressed: true,
          allow_humor_probability: 0.15
        },
        emotional_cues: {
          stressed: ['overwhelmed', 'too much', 'tired', 'frustrated'],
          rushed: ['quickly', 'in a hurry', 'no time', 'fast'],
          positive: ['great', 'good', 'nice', 'excellent']
        }
      };
    }
  }

  getTimeOfDay(now = new Date()) {
    const h = now.getHours();
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
  }

  pickRandom(arr) {
    if (!arr || arr.length === 0) return null;
    const idx = Math.floor(Math.random() * arr.length);
    return arr[idx];
  }

  containsAny(text, list) {
    const lower = text.toLowerCase();
    return list.some(entry => lower.includes(entry.toLowerCase()));
  }

  inferToneFromMessage(message) {
    const lower = message.toLowerCase();
    const cues = this.behavior.emotional_cues;
    
    if (cues.stressed.some(w => lower.includes(w))) return 'stressed';
    if (cues.rushed.some(w => lower.includes(w))) return 'rushed';
    if (cues.positive.some(w => lower.includes(w))) return 'positive';
    return 'neutral';
  }

  isGreetingLike(message) {
    const lower = message.toLowerCase();
    if (this.containsAny(lower, this.behavior.greeting_triggers.pure_greeting)) return true;
    if (this.containsAny(lower, this.behavior.greeting_triggers.how_are_you)) return true;
    return false;
  }

  buildGreeting(message, ctx = {}) {
    const now = new Date();
    const timeOfDay = this.getTimeOfDay(now);
    const tone = ctx.user_tone_hint || this.inferToneFromMessage(message);
    const lower = message.toLowerCase();

    const { greetings, fallback_greeting, style } = this.persona;
    const rules = this.behavior.selection_rules;

    // 1) If user asked "how are you", answer that explicitly
    if (this.containsAny(lower, this.behavior.greeting_triggers.how_are_you)) {
      const base = this.pickRandom(greetings.how_are_you) || fallback_greeting;
      return base;
    }

    // 2) If there's a previous topic and it's meaningful, use reconnect greeting
    if (ctx.previous_topic && ctx.previous_topic.trim().length > 10 && 
        !ctx.previous_topic.includes('Last topic:')) {
      const reconnect = this.pickRandom(greetings.reconnect) || fallback_greeting;
      return reconnect;
    }

    // 3) If user sounds stressed and empathy is allowed
    if (tone === 'stressed' && rules.allow_empathy_when_stressed) {
      const base = this.pickRandom(greetings.empathy) || fallback_greeting;
      return base;
    }

    // 4) Name-addressed greeting
    if (rules.prefer_name_when_available && ctx.user_name) {
      const template = this.pickRandom(greetings.name_addressed) || '{name}, hi.';
      return template.replace(/{name}/g, ctx.user_name);
    }

    // 5) Time-of-day greeting
    if (rules.prefer_time_of_day) {
      const list = greetings.time_of_day[timeOfDay] || greetings.generic;
      const base = this.pickRandom(list) || fallback_greeting;
      return base;
    }

    // 6) Generic greeting
    let base = this.pickRandom(greetings.generic) || fallback_greeting;

    // 7) Light humor occasionally if allowed
    const humorThreshold = (style?.humor_threshold ?? rules.allow_humor_probability) || 0.15;
    if (Math.random() < humorThreshold && greetings.light_humor && greetings.light_humor.length > 0) {
      base = this.pickRandom(greetings.light_humor) || base;
    }

    return base;
  }
}

// Singleton instance
let engineInstance = null;

export function getVeraGreetingEngine() {
  if (!engineInstance) {
    engineInstance = new VeraGreetingEngine();
  }
  return engineInstance;
}

export default VeraGreetingEngine;

