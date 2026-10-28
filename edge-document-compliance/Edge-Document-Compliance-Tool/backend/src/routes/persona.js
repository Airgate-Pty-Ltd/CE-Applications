/**
 * Persona Routes
 * Handle EDCAT persona and greeting system
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * GET /api/persona/greeting
 * Get personalized greeting based on time of day
 */
router.get('/greeting', async (req, res) => {
  try {
    // Try multiple possible paths for persona.yml
    const possiblePaths = [
      path.join(__dirname, '../../server/config/persona.yml'),
      path.join(__dirname, '../../../server/config/persona.yml'),
      path.join(__dirname, '../../config/persona.yml')
    ];
    
    let cfg;
    let fileFound = false;
    
    for (const personaPath of possiblePaths) {
      try {
        if (fs.existsSync(personaPath)) {
          const fileContent = fs.readFileSync(personaPath, 'utf8');
          cfg = yaml.load(fileContent);
          fileFound = true;
          break;
        }
      } catch (err) {
        // Try next path
        continue;
      }
    }
    
    if (!fileFound) {
      // Fallback if YAML file doesn't exist
      cfg = {
        persona: {
          name: 'EDCAT',
          greetings: {
            default: [
              "Good day. Let's prepare your GAP analysis.",
              "Hello. Your library is ready—what shall we assess today?",
              "Welcome back. Select a standard and target documents to begin."
            ],
            morning: ["Good morning. Ready to dig into today's clauses?"],
            afternoon: ["Good afternoon. Your latest analyses are in the history panel."],
            evening: ["Good evening. Need a quick clause quote before close of business?"]
          },
          compliance_note: "EDCAT is bounded to your uploaded corpus and approved regulator sources.",
          show_tip_probability: 0.25,
          tips: [
            "Tip: Use Clause Lookup to quote a requirement verbatim with citation.",
            "Tip: Run 'GAP (All Modeled Clauses)' to find blind spots in one pass.",
            "Tip: Add reviewer feedback—EDCAT learns and tightens future matches."
          ]
        }
      };
    }

    const hour = new Date().getHours();
    const slot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    const persona = cfg.persona || {};
    const greetings = persona.greetings || {};
    const slotGreetings = greetings[slot] || [];
    const defaultGreetings = greetings.default || [];
    const list = [...slotGreetings, ...defaultGreetings];
    
    const text = list.length > 0 ? pick(list) : "Welcome to EDCAT Administrator.";
    
    const showTipProbability = persona.show_tip_probability || 0.25;
    const tip = Math.random() < showTipProbability ? pick(persona.tips || []) : null;

    res.json({
      name: persona.name || 'EDCAT',
      text,
      compliance_note: persona.compliance_note || 'EDCAT is bounded to your uploaded corpus and approved regulator sources.',
      tip
    });
  } catch (error) {
    console.error('Error generating greeting:', error);
    res.json({
      name: 'EDCAT',
      text: 'Welcome to EDCAT Administrator.',
      compliance_note: 'EDCAT is bounded to your uploaded corpus and approved regulator sources.',
      tip: null
    });
  }
});

export default router;

