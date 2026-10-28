/**
 * Vera Greeting Service
 * 
 * Generates dynamic, varied greetings from database-stored greetings and components.
 * Supports culture tags, tones, and time-of-day variations.
 * Only used for smalltalk - technical questions are routed to reasoning engine.
 */

import { queryEdcatAI } from '../../config/databases.js';

class VeraGreetingService {
  /**
   * Get time of day (morning, afternoon, evening)
   * @param {Date} now - Optional date object (defaults to current time)
   * @returns {string} - 'morning', 'afternoon', or 'evening'
   */
  static _getTimeOfDay(now = new Date()) {
    const hour = now.getHours(); // Use local time
    if (hour < 11) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  /**
   * Pick a random item from array using weighted randomness
   * @param {Array} rows - Array of objects with optional 'weight' property
   * @returns {Object|null} - Selected item or null if array is empty
   */
  static async _pickRandom(rows) {
    if (!rows || rows.length === 0) return null;
    if (rows.length === 1) return rows[0];

    // Weighted random based on "weight"
    const weights = rows.map(r => r.weight || 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;

    for (let i = 0; i < rows.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return rows[i];
    }

    return rows[rows.length - 1];
  }

  /**
   * Inject user name into greeting text if placeholder exists
   * @param {string} text - Greeting text
   * @param {string|null} userName - User name to inject
   * @returns {string} - Text with name injected
   */
  static _injectName(text, userName) {
    if (!userName) return text;

    // Simple placeholder logic: if {{name}} present, use that; otherwise append
    if (text.includes('{{name}}')) {
      return text.replace(/\{\{name\}\}/g, userName);
    }

    return text;
  }

  /**
   * Generate a greeting based on culture, tone, and time of day
   * @param {Object} options
   * @param {string|null} options.userName - Optional user name to inject
   * @param {string} options.cultureTag - Culture tag (default: 'uk_scotland')
   * @param {string} options.tone - Tone (default: 'friendly')
   * @param {Date} options.now - Optional date for time-of-day calculation
   * @returns {Promise<string>} - Generated greeting text
   */
  static async generateGreeting({ 
    userName = null, 
    cultureTag = 'uk_scotland', 
    tone = 'friendly',
    now = new Date()
  } = {}) {
    const timeOfDay = this._getTimeOfDay(now);

    try {
      // 1) Try full greetings first, matching time-of-day & culture
      const fullRes = await queryEdcatAI(
        `
        SELECT id, text, weight
        FROM edcat.vera_greetings
        WHERE is_active = TRUE
          AND (culture_tag = $1 OR culture_tag = 'neutral')
          AND (tone = $2 OR tone = 'friendly')
          AND (time_of_day = $3 OR time_of_day IS NULL OR time_of_day = 'any')
        ORDER BY RANDOM()
        LIMIT 20
        `,
        [cultureTag, tone, timeOfDay]
      );

      const full = await this._pickRandom(fullRes.rows);
      if (full) {
        return this._injectName(full.text, userName);
      }

      // 2) If no full greeting available, compose from components
      const [prefixRes, coreRes, suffixRes] = await Promise.all([
        queryEdcatAI(
          `SELECT * FROM edcat.vera_greeting_components
           WHERE is_active = TRUE
             AND component_type = 'prefix'
             AND (culture_tag = $1 OR culture_tag = 'neutral')
             AND (tone = $2 OR tone = 'friendly')
             AND (time_of_day = $3 OR time_of_day IS NULL OR time_of_day = 'any')
           ORDER BY RANDOM()
           LIMIT 10`,
          [cultureTag, tone, timeOfDay]
        ),
        queryEdcatAI(
          `SELECT * FROM edcat.vera_greeting_components
           WHERE is_active = TRUE
             AND component_type = 'core'
             AND (culture_tag = $1 OR culture_tag = 'neutral')
             AND (tone = $2 OR tone = 'friendly')
             AND (time_of_day = $3 OR time_of_day IS NULL OR time_of_day = 'any')
           ORDER BY RANDOM()
           LIMIT 10`,
          [cultureTag, tone, timeOfDay]
        ),
        queryEdcatAI(
          `SELECT * FROM edcat.vera_greeting_components
           WHERE is_active = TRUE
             AND component_type = 'suffix'
             AND (culture_tag = $1 OR culture_tag = 'neutral')
             AND (tone = $2 OR tone = 'friendly')
             AND (time_of_day = $3 OR time_of_day IS NULL OR time_of_day = 'any')
           ORDER BY RANDOM()
           LIMIT 10`,
          [cultureTag, tone, timeOfDay]
        )
      ]);

      const prefix = await this._pickRandom(prefixRes.rows);
      const core = await this._pickRandom(coreRes.rows);
      const suffix = await this._pickRandom(suffixRes.rows);

      const parts = [];
      if (prefix) parts.push(prefix.text);
      if (core) parts.push(core.text);
      if (suffix) parts.push(suffix.text);

      if (parts.length === 0) {
        // Absolute fallback
        return this._injectName("Hello, I'm ready to help with your quality and compliance work.", userName);
      }

      let combined = parts.join(' ');
      combined = this._injectName(combined, userName);
      return combined;
    } catch (error) {
      console.error('[VeraGreetingService] Error generating greeting:', error.message);
      // Fallback greeting
      return this._injectName("Hello! I'm ready to help with your quality and compliance work.", userName);
    }
  }
}

export default VeraGreetingService;

