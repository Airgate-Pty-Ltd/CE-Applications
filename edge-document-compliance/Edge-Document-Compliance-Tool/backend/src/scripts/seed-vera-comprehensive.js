/**
 * Comprehensive Vera Seed Script
 * Seeds all Vera-related tables with initial data
 */

import { queryEdcatAI, queryPostgres } from '../config/databases.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Load JSON seed file
 */
function loadSeedFile(filename) {
  const filePath = path.join(__dirname, '../../EDCAT AIP/seed', filename);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`[seed-vera] Could not load ${filename}:`, error.message);
    return null;
  }
}

/**
 * Seed ai_persona_profile
 */
async function seedPersonaProfile() {
  console.log('[seed-vera] Seeding ai_persona_profile...');
  
  const profileData = loadSeedFile('vera_persona_profile.json');
  if (!profileData) {
    console.log('[seed-vera] ⚠️  No persona profile data found, skipping');
    return;
  }

  try {
    await queryEdcatAI(
      `INSERT INTO ai_persona_profile 
       (tenant_id, persona_code, profile, created_at, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW(), NOW())
       ON CONFLICT (tenant_id, persona_code) 
       DO UPDATE SET profile = EXCLUDED.profile, updated_at = NOW()`,
      [
        DEFAULT_TENANT_ID,
        profileData.persona_code || 'vera',
        JSON.stringify(profileData)
      ]
    );
    console.log('[seed-vera] ✅ Seeded ai_persona_profile');
  } catch (error) {
    console.error('[seed-vera] ❌ Error seeding ai_persona_profile:', error.message);
  }
}

/**
 * Seed vera_response_templates
 */
async function seedResponseTemplates() {
  console.log('[seed-vera] Seeding vera_response_templates...');

  const templates = [
    {
      template_type: 'greeting',
      template_name: 'morning_greeting',
      template_text: 'Good morning! I\'m Vera, your compliance assistant. What would you like to work on today?',
      priority: 10
    },
    {
      template_type: 'greeting',
      template_name: 'afternoon_greeting',
      template_text: 'Good afternoon! Ready to tackle some compliance work?',
      priority: 10
    },
    {
      template_type: 'greeting',
      template_name: 'evening_greeting',
      template_text: 'Good evening! I\'m here to help with your compliance questions.',
      priority: 10
    },
    {
      template_type: 'greeting',
      template_name: 'returning_user',
      template_text: 'Welcome back! Should we pick up where we left off?',
      priority: 9
    },
    {
      template_type: 'casual_chat',
      template_name: 'how_are_you',
      template_text: 'I\'m doing well, thank you for asking! Ready to help with compliance work.',
      priority: 8
    },
    {
      template_type: 'casual_chat',
      template_name: 'thanks',
      template_text: 'You\'re welcome! Happy to help.',
      priority: 7
    },
    {
      template_type: 'parsing_complete',
      template_name: 'parsing_success',
      template_text: 'I\'ve successfully parsed {standardName}: {requirementCount} requirements extracted. What would you like to analyze?',
      priority: 9
    },
    {
      template_type: 'clarification',
      template_name: 'need_more_info',
      template_text: 'To provide the best answer, could you tell me which standard and clause you\'re referring to?',
      priority: 8
    },
    {
      template_type: 'error',
      template_name: 'parsing_failed',
      template_text: 'I encountered an issue while parsing. Let me try a different approach.',
      priority: 5
    }
  ];

  for (const template of templates) {
    try {
      // Check if template already exists
      const existing = await queryEdcatAI(
        `SELECT template_id FROM vera_response_templates WHERE template_name = $1 LIMIT 1`,
        [template.template_name]
      );
      
      if (existing.rows.length > 0) {
        // Update existing template
        await queryEdcatAI(
          `UPDATE vera_response_templates 
           SET template_text = $1, template_category = $2, use_case = $3, applicable_phase = $4, updated_at = NOW()
           WHERE template_name = $5`,
          [
            template.template_text,
            template.template_type, // Map template_type to template_category
            template.template_type, // Use template_type as use_case
            template.template_type === 'greeting' ? 'greeting' : 'general', // Phase based on type
            template.template_name
          ]
        );
      } else {
        // Insert new template
        await queryEdcatAI(
          `INSERT INTO vera_response_templates 
           (template_name, template_category, template_text, use_case, applicable_phase, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [
            template.template_name,
            template.template_type, // Map template_type to template_category
            template.template_text,
            template.template_type, // Use template_type as use_case
            template.template_type === 'greeting' ? 'greeting' : 'general' // Phase based on type
          ]
        );
      }
    } catch (error) {
      console.error(`[seed-vera] Error seeding template ${template.template_name}:`, error.message);
    }
  }

  console.log('[seed-vera] ✅ Seeded vera_response_templates');
}

/**
 * Seed regulatory_websites
 */
async function seedRegulatoryWebsites() {
  console.log('[seed-vera] Seeding regulatory_websites...');

  const websites = [
    {
      regulator: 'FAA',
      country: 'USA',
      website_url: 'https://www.faa.gov',
      primary_regulation_portal: 'https://www.faa.gov/regulations_policies',
      description: 'Federal Aviation Administration'
    },
    {
      regulator: 'EASA',
      country: 'EU',
      website_url: 'https://www.easa.europa.eu',
      primary_regulation_portal: 'https://www.easa.europa.eu/regulations',
      description: 'European Union Aviation Safety Agency'
    },
    {
      regulator: 'CASA',
      country: 'Australia',
      website_url: 'https://www.casa.gov.au',
      primary_regulation_portal: 'https://www.casa.gov.au/rules-and-regulations',
      description: 'Civil Aviation Safety Authority'
    },
    {
      regulator: 'CAAC',
      country: 'China',
      website_url: 'https://www.caac.gov.cn',
      primary_regulation_portal: 'https://www.caac.gov.cn/en/',
      description: 'Civil Aviation Administration of China'
    },
    {
      regulator: 'Transport Canada',
      country: 'Canada',
      website_url: 'https://tc.canada.ca',
      primary_regulation_portal: 'https://tc.canada.ca/en/aviation',
      description: 'Transport Canada Civil Aviation'
    },
    {
      regulator: 'UK CAA',
      country: 'UK',
      website_url: 'https://www.caa.co.uk',
      primary_regulation_portal: 'https://www.caa.co.uk/regulations',
      description: 'UK Civil Aviation Authority'
    },
    {
      regulator: 'FDA',
      country: 'USA',
      website_url: 'https://www.fda.gov',
      primary_regulation_portal: 'https://www.fda.gov/regulatory-information',
      description: 'Food and Drug Administration'
    },
    {
      regulator: 'ISO',
      country: 'International',
      website_url: 'https://www.iso.org',
      primary_regulation_portal: 'https://www.iso.org/standards.html',
      description: 'International Organization for Standardization'
    }
  ];

  for (const website of websites) {
    try {
      // Check if website already exists by URL and tenant_id
      const existing = await queryPostgres(
        `SELECT id FROM public.regulatory_websites 
         WHERE url = $1 AND (tenant_id = $2 OR (tenant_id IS NULL AND $2 IS NULL))
         LIMIT 1`,
        [website.website_url, DEFAULT_TENANT_ID]
      );
      
      if (existing.rows.length > 0) {
        // Update existing website
        await queryPostgres(
          `UPDATE public.regulatory_websites 
           SET agency = $1, regulatory_body = $2, name = $3, is_active = $4
           WHERE url = $5 AND (tenant_id = $6 OR (tenant_id IS NULL AND $6 IS NULL))`,
          [
            website.regulator, // Map regulator to agency
            website.regulator, // Also use as regulatory_body
            website.description || website.regulator, // Use description as name
            true, // is_active
            website.website_url, // url for WHERE clause
            DEFAULT_TENANT_ID
          ]
        );
      } else {
        // Insert new website (created_at will default to NOW())
        await queryPostgres(
          `INSERT INTO public.regulatory_websites 
           (agency, regulatory_body, url, name, is_active, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            website.regulator, // Map regulator to agency
            website.regulator, // Also use as regulatory_body
            website.website_url, // Map website_url to url
            website.description || website.regulator, // Use description as name
            true, // is_active
            DEFAULT_TENANT_ID // tenant_id for unique constraint
          ]
        );
      }
    } catch (error) {
      console.error(`[seed-vera] Error seeding regulatory website ${website.regulator}:`, error.message);
    }
  }

  console.log('[seed-vera] ✅ Seeded regulatory_websites');
}

/**
 * Seed vera_model_versions
 */
async function seedModelVersions() {
  console.log('[seed-vera] Seeding vera_model_versions...');

  try {
    await queryEdcatAI(
      `INSERT INTO vera_model_versions 
       (version_number, baseline_accuracy, baseline_precision, baseline_recall,
        improvement_delta, created_at, status, deployed_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW())
       ON CONFLICT (version_number) DO NOTHING`,
      [
        '1.0.0',
        0.80,
        0.80,
        0.80,
        0.00,
        'deployed' // status instead of approved boolean
      ]
    );
    console.log('[seed-vera] ✅ Seeded vera_model_versions');
  } catch (error) {
    console.error('[seed-vera] ❌ Error seeding vera_model_versions:', error.message);
  }
}

/**
 * Seed Vera Query-Response Bank
 */
async function seedQueryResponseBank() {
  try {
    console.log('[seed-vera] Seeding vera_query_response_bank...');
    
    const seedQueryResponseBank = (await import('./seed-vera-query-response-bank.js')).default;
    await seedQueryResponseBank();
    
    console.log('[seed-vera] ✅ Seeded vera_query_response_bank');
  } catch (error) {
    console.error('[seed-vera] ❌ Error seeding vera_query_response_bank:', error.message);
  }
}

/**
 * Seed Vera Dynamic Greetings
 */
async function seedVeraDynamicGreetings() {
  console.log('[seed-vera] Seeding vera_greetings & vera_greeting_components...');

  try {
    // Only seed if table is mostly empty
    const existing = await queryEdcatAI(
      `SELECT COUNT(*) AS count FROM edcat.vera_greetings`
    );
    const count = parseInt(existing.rows[0]?.count || '0', 10);
    if (count > 50) {
      console.log('[seed-vera] vera_greetings already populated, skipping.');
      return;
    }

    // Full greetings: UK / Scottish flavour
    const greetings = [
      // UK/Scotland - Friendly - Any time
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Good morning, love. How's your audit world treating you today?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Afternoon! Ready to wrestle a few findings into submission?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Evening! Let's sort out your compliance chaos, shall we?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Right then, what compliance challenge are we tackling today?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Hello there! How's your quality world looking?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Good day! Ready to dive into some compliance work?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Afternoon! What's on your compliance agenda today?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Evening! Shall we make some progress on your quality systems?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Morning! Let's get your compliance sorted, aye?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Hello! I'm here to help make your audit life easier." },
      
      // UK/Scotland - Friendly - Morning
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'morning', text: "Good morning! Grab your tea or coffee—let's sort your quality chaos." },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'morning', text: "Morning! Ready to tackle some compliance work with a fresh perspective?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'morning', text: "Good morning! What compliance challenge shall we start with?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'morning', text: "Morning! Let's make today productive for your quality systems." },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'morning', text: "Good morning! I'm ready when you are to dive into your compliance work." },
      
      // UK/Scotland - Friendly - Afternoon
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'afternoon', text: "Good afternoon! How's your day going? Ready for some compliance work?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'afternoon', text: "Afternoon! What would you like to focus on today?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'afternoon', text: "Good afternoon! Let's make some progress on your quality systems." },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'afternoon', text: "Afternoon! Ready to tackle a few compliance challenges?" },
      
      // UK/Scotland - Friendly - Evening
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'evening', text: "Good evening! Still working on compliance? I'm here to help." },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'evening', text: "Evening! What can I help you with before you wrap up?" },
      { culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'evening', text: "Good evening! Let's finish strong with your quality work." },
      
      // UK/Scotland - Professional - Any time
      { culture_tag: 'uk_scotland', tone: 'professional', time_of_day: 'any', text: "Good day. I'm ready when you are to dive into your compliance work." },
      { culture_tag: 'uk_scotland', tone: 'professional', time_of_day: 'any', text: "Hello. How may I assist with your quality and compliance requirements today?" },
      { culture_tag: 'uk_scotland', tone: 'professional', time_of_day: 'any', text: "Good day. What compliance topic would you like to explore?" },
      { culture_tag: 'uk_scotland', tone: 'professional', time_of_day: 'any', text: "Hello. I'm here to support your quality management objectives." },
      { culture_tag: 'uk_scotland', tone: 'professional', time_of_day: 'any', text: "Good day. Ready to work on your compliance systems?" },
      
      // UK/Scotland - Casual - Any time
      { culture_tag: 'uk_scotland', tone: 'casual', time_of_day: 'any', text: "Hey there! What's on your compliance agenda?" },
      { culture_tag: 'uk_scotland', tone: 'casual', time_of_day: 'any', text: "Hi! Ready to sort out some quality stuff?" },
      { culture_tag: 'uk_scotland', tone: 'casual', time_of_day: 'any', text: "Hey! What compliance challenge are we tackling?" },
      { culture_tag: 'uk_scotland', tone: 'casual', time_of_day: 'any', text: "Hi there! Let's make this compliance work as painless as possible." },
      
      // Neutral - Friendly - Any time
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hello! I'm here and ready to support your quality and compliance work." },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hi! How can I help with your compliance needs today?" },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hello! What would you like to work on today?" },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hi there! Ready to dive into your quality management work?" },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hello! I'm ready to help with your compliance questions." },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hi! What compliance topic can I assist with?" },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hello! Let's make progress on your quality systems today." },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hi there! How can I support your compliance work?" },
      
      // Neutral - Professional - Any time
      { culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "Good day. I'm ready to assist with your quality and compliance requirements." },
      { culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "Hello. How may I help with your compliance objectives today?" },
      { culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "Good day. What compliance topic would you like to explore?" },
      { culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "Hello. I'm here to support your quality management needs." },
      { culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "Good day. Ready to work on your compliance systems?" },
      
      // Neutral - Friendly - Morning
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'morning', text: "Good morning! Ready to start your compliance work?" },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'morning', text: "Morning! What compliance challenge shall we tackle first?" },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'morning', text: "Good morning! I'm here to help with your quality systems." },
      
      // Neutral - Friendly - Afternoon
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'afternoon', text: "Good afternoon! How can I assist with your compliance work?" },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'afternoon', text: "Afternoon! What would you like to focus on?" },
      
      // Neutral - Friendly - Evening
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'evening', text: "Good evening! Still working on compliance? I'm here to help." },
      { culture_tag: 'neutral', tone: 'friendly', time_of_day: 'evening', text: "Evening! What can I help you with?" },
    ];

    // Insert greetings
    for (const g of greetings) {
      await queryEdcatAI(
        `INSERT INTO edcat.vera_greetings (culture_tag, tone, time_of_day, text, weight)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT DO NOTHING`,
        [g.culture_tag, g.tone, g.time_of_day, g.text]
      );
    }

    // Greeting components
    const components = [
      // PREFIXES - UK/Scotland
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'morning', text: "Good morning" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'afternoon', text: "Good afternoon" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'evening', text: "Good evening" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Hello" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Hi there" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Hey" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Right then" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Well then" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'casual', time_of_day: 'any', text: "Hey there" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'casual', time_of_day: 'any', text: "Hi" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'professional', time_of_day: 'any', text: "Good day" },
      { component_type: 'prefix', culture_tag: 'uk_scotland', tone: 'professional', time_of_day: 'any', text: "Hello" },
      
      // PREFIXES - Neutral
      { component_type: 'prefix', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'morning', text: "Good morning" },
      { component_type: 'prefix', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'afternoon', text: "Good afternoon" },
      { component_type: 'prefix', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'evening', text: "Good evening" },
      { component_type: 'prefix', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hello" },
      { component_type: 'prefix', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hi" },
      { component_type: 'prefix', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Hi there" },
      { component_type: 'prefix', culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "Good day" },
      { component_type: 'prefix', culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "Hello" },
      
      // CORES - UK/Scotland
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "how's your audit world today?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "shall we tame a few findings together?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "what compliance challenge are we tackling?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "ready to wrestle a few findings into submission?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "how's your quality world looking?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "what's on your compliance agenda?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "ready to dive into some compliance work?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "shall we make some progress on your quality systems?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "let's sort your quality chaos, shall we?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "I'm here to help make your audit life easier." },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'casual', time_of_day: 'any', text: "what's on your compliance agenda?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'casual', time_of_day: 'any', text: "ready to sort out some quality stuff?" },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'professional', time_of_day: 'any', text: "I'm ready when you are to dive into your compliance work." },
      { component_type: 'core', culture_tag: 'uk_scotland', tone: 'professional', time_of_day: 'any', text: "how may I assist with your quality and compliance requirements today?" },
      
      // CORES - Neutral
      { component_type: 'core', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "I'm here and ready to support your quality and compliance work." },
      { component_type: 'core', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "how can I help with your compliance needs today?" },
      { component_type: 'core', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "what would you like to work on today?" },
      { component_type: 'core', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "ready to dive into your quality management work?" },
      { component_type: 'core', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "I'm ready to help with your compliance questions." },
      { component_type: 'core', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "what compliance topic can I assist with?" },
      { component_type: 'core', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "let's make progress on your quality systems today." },
      { component_type: 'core', culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "I'm ready to assist with your quality and compliance requirements." },
      { component_type: 'core', culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "how may I help with your compliance objectives today?" },
      
      // SUFFIXES - UK/Scotland
      { component_type: 'suffix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Let's make this as painless as possible, aye?" },
      { component_type: 'suffix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Right then, what shall we tackle first?" },
      { component_type: 'suffix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "What would you like to focus on?" },
      { component_type: 'suffix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "Tell me what you'd like to work on." },
      { component_type: 'suffix', culture_tag: 'uk_scotland', tone: 'friendly', time_of_day: 'any', text: "What can I help you with today?" },
      { component_type: 'suffix', culture_tag: 'uk_scotland', tone: 'casual', time_of_day: 'any', text: "What shall we tackle?" },
      { component_type: 'suffix', culture_tag: 'uk_scotland', tone: 'professional', time_of_day: 'any', text: "What compliance topic would you like to explore?" },
      
      // SUFFIXES - Neutral
      { component_type: 'suffix', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "Tell me what you'd like to focus on first." },
      { component_type: 'suffix', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "What would you like to work on?" },
      { component_type: 'suffix', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "How can I help you today?" },
      { component_type: 'suffix', culture_tag: 'neutral', tone: 'friendly', time_of_day: 'any', text: "What can I assist with?" },
      { component_type: 'suffix', culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "What compliance topic would you like to explore?" },
      { component_type: 'suffix', culture_tag: 'neutral', tone: 'professional', time_of_day: 'any', text: "How may I assist you?" },
    ];

    // Insert components
    for (const c of components) {
      await queryEdcatAI(
        `INSERT INTO edcat.vera_greeting_components
         (component_type, culture_tag, tone, time_of_day, text, weight)
       VALUES ($1, $2, $3, $4, $5, 1)
       ON CONFLICT DO NOTHING`,
        [c.component_type, c.culture_tag, c.tone, c.time_of_day, c.text]
      );
    }

    console.log('[seed-vera] ✅ vera_greetings & vera_greeting_components seeded.');
  } catch (error) {
    console.error('[seed-vera] ❌ Error seeding dynamic greetings:', error.message);
  }
}

/**
 * Seed Vera Quality Knowledge Base
 */
async function seedVeraQualityKnowledge() {
  console.log('[seed-vera] Seeding Vera Quality Knowledge Base...');

  try {
    const existing = await queryEdcatAI(
      `SELECT COUNT(*) AS count FROM edcat.vera_quality_topics`
    );
    const count = parseInt(existing.rows[0]?.count || '0', 10);
    if (count > 10) {
      console.log('[seed-vera] Quality topics already seeded, skipping.');
      return;
    }

    // --- Seed topics ---
    const topics = [
      {
        topic_code: 'CQE_OVERVIEW',
        category: 'CQE',
        title: 'Certified Quality Engineer Overview',
        summary: 'The Certified Quality Engineer (CQE) is a quality professional who understands product and process evaluation, quality systems, statistical methods, problem solving, and continuous improvement across the full product lifecycle.'
      },
      {
        topic_code: 'CQE_STATISTICS',
        category: 'CQE',
        title: 'CQE – Statistical Methods',
        summary: 'Statistical methods in the CQE body of knowledge include descriptive statistics, probability distributions, hypothesis testing, regression, ANOVA, and process capability analysis.'
      },
      {
        topic_code: 'CQE_MANAGEMENT',
        category: 'CQE',
        title: 'CQE – Management & Leadership',
        summary: 'CQE management knowledge includes quality philosophies (Deming, Juran, Crosby), leadership principles, change management, and organizational behavior in quality contexts.'
      },
      {
        topic_code: 'SIX_SIGMA_OVERVIEW',
        category: 'Six Sigma',
        title: 'Six Sigma Overview',
        summary: 'Six Sigma is a data-driven methodology aimed at reducing variation and defects by using structured problem solving (DMAIC) and statistical tools to improve process performance.'
      },
      {
        topic_code: 'DMAIC_METHOD',
        category: 'Six Sigma',
        title: 'DMAIC Methodology',
        summary: 'DMAIC stands for Define, Measure, Analyze, Improve, and Control. It is the core Six Sigma framework for improving existing processes in a structured, data-driven way.'
      },
      {
        topic_code: 'DFSS_METHOD',
        category: 'Six Sigma',
        title: 'DFSS (Design for Six Sigma)',
        summary: 'DFSS is used for designing new processes or products to meet Six Sigma performance levels from the start, using tools like DMADV (Define, Measure, Analyze, Design, Verify).'
      },
      {
        topic_code: 'LEAN_OVERVIEW',
        category: 'Lean',
        title: 'Lean Manufacturing Overview',
        summary: 'Lean manufacturing focuses on maximizing value to the customer by eliminating waste, improving flow, and continuously improving processes.'
      },
      {
        topic_code: 'LEAN_WASTES',
        category: 'Lean',
        title: 'The Seven (or Eight) Wastes',
        summary: 'Common Lean wastes include defects, overproduction, waiting, non-utilized talent, transportation, inventory, motion, and extra processing.'
      },
      {
        topic_code: 'LEAN_FLOW',
        category: 'Lean',
        title: 'Lean Flow & Pull Systems',
        summary: 'Lean emphasizes continuous flow of value and pull systems where production is triggered by customer demand rather than forecasts.'
      },
      {
        topic_code: 'KPIS_OVERVIEW',
        category: 'KPIs',
        title: 'Quality KPIs and Metrics',
        summary: 'Quality KPIs transform quality performance into measurable indicators such as on-time delivery, defect rates, scrap, rework, right-first-time, and customer complaint rates.'
      },
      {
        topic_code: 'COST_OF_QUALITY',
        category: 'KPIs',
        title: 'Cost of Quality',
        summary: 'Cost of Quality (CoQ) groups costs into prevention, appraisal, internal failure, and external failure, helping organizations understand the cost impact of poor quality and the value of prevention.'
      },
      {
        topic_code: 'QUALITY_CULTURE_GLOBAL',
        category: 'Culture',
        title: 'Quality Culture in a Global Organization',
        summary: 'A strong quality culture is built on clear expectations, leadership behavior, psychological safety, data-driven decisions, and consistent reinforcement across all sites and cultures.'
      },
      {
        topic_code: 'AGILE_QMS_COEXIST',
        category: 'Agile_QMS',
        title: 'Where Agile and QMS Can Coexist',
        summary: 'Agile and QMS can coexist when procedures define compliance expectations and guardrails, while teams retain flexibility in how they plan, iterate, and deliver within those guardrails.'
      }
    ];

    const topicIdByCode = {};

    for (const t of topics) {
      const res = await queryEdcatAI(
        `INSERT INTO edcat.vera_quality_topics (topic_code, category, title, summary)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (topic_code) DO UPDATE SET
           category = EXCLUDED.category,
           title = EXCLUDED.title,
           summary = EXCLUDED.summary
         RETURNING id, topic_code`,
        [t.topic_code, t.category, t.title, t.summary]
      );
      const row = res.rows[0];
      topicIdByCode[row.topic_code] = row.id;
    }

    // --- Seed snippets ---
    const snippets = [
      // CQE Overview
      {
        topic_code: 'CQE_OVERVIEW',
        snippet_type: 'definition',
        level: 'core',
        content: 'A Certified Quality Engineer is expected to understand and apply quality engineering principles across product and process design, process control, improvement projects, and quality systems.'
      },
      {
        topic_code: 'CQE_OVERVIEW',
        snippet_type: 'principles',
        level: 'core',
        content: 'CQEs are expected to bridge engineering and quality, translating customer needs into requirements, working with cross-functional teams, and using data to make decisions.'
      },
      {
        topic_code: 'CQE_OVERVIEW',
        snippet_type: 'example',
        level: 'core',
        content: 'A CQE might work on a new product launch, ensuring that design controls are in place, that process capability is validated, that suppliers are qualified, and that the quality system supports the product lifecycle.'
      },
      // CQE Statistics
      {
        topic_code: 'CQE_STATISTICS',
        snippet_type: 'principles',
        level: 'core',
        content: 'Statistics in quality engineering is less about theory and more about making decisions with incomplete data, quantifying variation, and understanding whether a change is real or just noise.'
      },
      {
        topic_code: 'CQE_STATISTICS',
        snippet_type: 'tooling',
        level: 'core',
        content: 'Key statistical tools for CQEs include control charts (X-bar, R, p, np, c, u charts), process capability indices (Cp, Cpk, Pp, Ppk), hypothesis testing (t-tests, ANOVA), and regression analysis.'
      },
      // CQE Management
      {
        topic_code: 'CQE_MANAGEMENT',
        snippet_type: 'principles',
        level: 'core',
        content: 'Quality leadership requires understanding Deming\'s 14 Points, Juran\'s Quality Trilogy (planning, control, improvement), and Crosby\'s Zero Defects philosophy, then applying the right approach for the situation.'
      },
      // Six Sigma Overview
      {
        topic_code: 'SIX_SIGMA_OVERVIEW',
        snippet_type: 'definition',
        level: 'core',
        content: 'Six Sigma aims to reduce process variation and defects by using structured problem solving, data, and statistical tools to achieve stable and capable processes.'
      },
      {
        topic_code: 'SIX_SIGMA_OVERVIEW',
        snippet_type: 'principles',
        level: 'core',
        content: 'Six Sigma projects must have a clear business case, measurable benefits, and a champion. The methodology emphasizes data-driven decisions over opinions and gut feelings.'
      },
      // DMAIC
      {
        topic_code: 'DMAIC_METHOD',
        snippet_type: 'principles',
        level: 'core',
        content: 'DMAIC requires discipline: in Define you clarify the problem and scope; in Measure you validate the measurement system and baseline; in Analyze you identify true root causes; in Improve you test and implement solutions; and in Control you put mechanisms in place so the gains don\'t erode.'
      },
      {
        topic_code: 'DMAIC_METHOD',
        snippet_type: 'example',
        level: 'core',
        content: 'A DMAIC project might start with "Define: reduce customer complaints about late deliveries by 50% in 6 months." Then Measure would establish baseline on-time delivery rate, Analyze would identify root causes (e.g., supplier delays, production bottlenecks), Improve would implement solutions (e.g., supplier scorecards, kanban systems), and Control would create dashboards and standard work to sustain the improvement.'
      },
      // DFSS
      {
        topic_code: 'DFSS_METHOD',
        snippet_type: 'definition',
        level: 'core',
        content: 'Design for Six Sigma (DFSS) is used when designing new processes or products to achieve Six Sigma performance from the start, rather than improving an existing process.'
      },
      // Lean Overview
      {
        topic_code: 'LEAN_OVERVIEW',
        snippet_type: 'principles',
        level: 'core',
        content: 'Lean focuses on flow, pull, and value: making work move smoothly, only producing what is needed when it is needed, and constantly asking whether an activity truly adds value from the customer\'s viewpoint.'
      },
      {
        topic_code: 'LEAN_OVERVIEW',
        snippet_type: 'tooling',
        level: 'core',
        content: 'Key Lean tools include 5S (sort, set in order, shine, standardize, sustain), Kanban (visual pull systems), value stream mapping, and mistake-proofing (poka-yoke).'
      },
      // Lean Wastes
      {
        topic_code: 'LEAN_WASTES',
        snippet_type: 'definition',
        level: 'core',
        content: 'The classic Lean wastes include defects, overproduction, waiting, non-utilized talent, transportation, inventory, motion, and extra processing. Many organizations also add an eighth waste: underused people or ideas.'
      },
      {
        topic_code: 'LEAN_WASTES',
        snippet_type: 'example',
        level: 'core',
        content: 'Examples: Defects (rework, scrap), Overproduction (making more than needed), Waiting (idle time between steps), Non-utilized talent (not using people\'s full capabilities), Transportation (unnecessary movement of materials), Inventory (excess stock), Motion (unnecessary movement of people), Extra processing (doing more than the customer values).'
      },
      // Lean Flow
      {
        topic_code: 'LEAN_FLOW',
        snippet_type: 'principles',
        level: 'core',
        content: 'Flow means work moves continuously without stops, queues, or handoffs. Pull means production is triggered by actual customer demand, not forecasts. Together, they reduce lead time and inventory.'
      },
      // KPIs Overview
      {
        topic_code: 'KPIS_OVERVIEW',
        snippet_type: 'principles',
        level: 'core',
        content: 'Good quality KPIs are few, balanced, and actionable. They should align with business goals, be clearly defined, and drive the right behavior rather than gaming the numbers.'
      },
      {
        topic_code: 'KPIS_OVERVIEW',
        snippet_type: 'tooling',
        level: 'core',
        content: 'Common quality KPIs include: First Pass Yield (FPY), Defects Per Million Opportunities (DPMO), On-Time Delivery (OTD), Scrap Rate, Rework Rate, Customer Complaint Rate, and Corrective Action Cycle Time.'
      },
      // Cost of Quality
      {
        topic_code: 'COST_OF_QUALITY',
        snippet_type: 'definition',
        level: 'core',
        content: 'Cost of Quality breaks down quality-related costs into prevention, appraisal, internal failure, and external failure. The goal is to shift spend toward prevention and reduce failure costs over time.'
      },
      {
        topic_code: 'COST_OF_QUALITY',
        snippet_type: 'principles',
        level: 'core',
        content: 'Prevention costs (training, design reviews, mistake-proofing) are investments. Appraisal costs (inspection, testing) are necessary but should be minimized. Failure costs (scrap, rework, complaints, recalls) are pure waste and should be driven toward zero.'
      },
      {
        topic_code: 'COST_OF_QUALITY',
        snippet_type: 'example',
        level: 'core',
        content: 'A company spending 5% on prevention, 10% on appraisal, 20% on internal failure, and 15% on external failure has a total CoQ of 50% of revenue. By investing more in prevention (e.g., better design, training, supplier qualification), they can reduce failure costs significantly.'
      },
      // Quality Culture
      {
        topic_code: 'QUALITY_CULTURE_GLOBAL',
        snippet_type: 'principles',
        level: 'core',
        content: 'Quality culture shows up in day-to-day decisions: whether people raise issues early, whether leaders respond constructively, and whether data is used to learn or to blame.'
      },
      {
        topic_code: 'QUALITY_CULTURE_GLOBAL',
        snippet_type: 'principles',
        level: 'deep',
        content: 'In a global organization, quality culture must account for different communication styles, decision-making norms, and risk tolerance across cultures. What works in one region may need adaptation in another, but core principles (safety, compliance, continuous improvement) must be consistent.'
      },
      // Agile + QMS
      {
        topic_code: 'AGILE_QMS_COEXIST',
        snippet_type: 'principles',
        level: 'core',
        content: 'A QMS can support Agile by defining the non-negotiables (compliance, safety, traceability) while explicitly allowing teams to choose their own planning and delivery practices within those boundaries.'
      },
      {
        topic_code: 'AGILE_QMS_COEXIST',
        snippet_type: 'example',
        level: 'core',
        content: 'Example procedure wording: "Teams shall maintain traceability from requirements to test results. Teams may use Jira, Confluence, or other tools of their choice. Teams shall document design decisions that affect safety or compliance. Teams may use sprint reviews, design reviews, or other formats that fit their cadence."'
      }
    ];

    for (const s of snippets) {
      const topicId = topicIdByCode[s.topic_code];
      if (!topicId) continue;

      await queryEdcatAI(
        `INSERT INTO edcat.vera_quality_snippets
         (topic_id, snippet_type, level, content, weight)
       VALUES ($1, $2, $3, $4, 1)
       ON CONFLICT DO NOTHING`,
        [topicId, s.snippet_type, s.level, s.content]
      );
    }

    // --- Seed QA patterns ---
    const qaEntries = [
      {
        topic_code: 'CQE_OVERVIEW',
        question_pattern: 'what is a cqe',
        answer_core: 'A Certified Quality Engineer (CQE) is a quality professional certified by ASQ who understands product and process evaluation, quality systems, statistical methods, problem solving, and continuous improvement across the full product lifecycle.',
        answer_layered: 'A Certified Quality Engineer (CQE) is someone who has demonstrated expertise across the entire ASQ CQE body of knowledge. This includes management and leadership (quality philosophies, change management), quality systems (ISO 9001, AS9100, design controls), product and process design (APQP, FMEA, design reviews), product and process control (SPC, MSA, control plans), continuous improvement (Six Sigma, Lean, problem-solving methods), quantitative methods (statistics, regression, DOE), and risk management. CQEs typically work in manufacturing, aerospace, medical devices, automotive, or other regulated industries, bridging the gap between engineering and quality assurance.',
        tags: ['definition', 'cqe', 'intro']
      },
      {
        topic_code: 'SIX_SIGMA_OVERVIEW',
        question_pattern: 'what is six sigma',
        answer_core: 'Six Sigma is a structured, data-driven methodology for improving processes by reducing variation and defects, using tools like DMAIC and statistical analysis.',
        answer_layered: 'Six Sigma is both a philosophy and a toolkit. Philosophically, it pushes organizations to make decisions based on data, not opinion. Practically, it provides a structured roadmap (DMAIC) and a set of tools for defining problems, understanding current performance, identifying root causes, and sustaining improvements. A Six Sigma project is expected to have a clear business case, a defined problem statement, measurable benefits, and control mechanisms so that the gains are not lost after the project ends. The name "Six Sigma" refers to a statistical target: processes operating at Six Sigma produce only 3.4 defects per million opportunities.',
        tags: ['definition', 'six_sigma', 'intro']
      },
      {
        topic_code: 'DMAIC_METHOD',
        question_pattern: 'what is dmaic',
        answer_core: 'DMAIC stands for Define, Measure, Analyze, Improve, and Control. It is the standard Six Sigma framework for improving existing processes.',
        answer_layered: 'DMAIC is the backbone of most Six Sigma projects. In Define, you clarify the business problem, scope, stakeholders, and goals. In Measure, you verify the measurement system and establish a reliable baseline of current performance. In Analyze, you use statistical and analytical tools to identify true root causes rather than symptoms. In Improve, you design and test solutions, often using experiments or pilots. In Control, you implement monitoring, standard work, and control plans so that performance does not drift back to the old state. Skipping or rushing any of these phases usually leads to weak or unsustainable improvements.',
        tags: ['definition', 'six_sigma', 'dmaic']
      },
      {
        topic_code: 'DMAIC_METHOD',
        question_pattern: 'explain dmaic',
        answer_core: 'DMAIC is a five-phase structured problem-solving methodology: Define the problem, Measure current performance, Analyze root causes, Improve with solutions, and Control to sustain gains.',
        answer_layered: 'DMAIC provides a disciplined approach to process improvement. Define phase establishes the project charter, problem statement, goals, and scope. Measure phase validates the measurement system (MSA), collects baseline data, and quantifies current performance. Analyze phase uses tools like Pareto charts, fishbone diagrams, hypothesis testing, and regression to identify true root causes. Improve phase designs, tests, and implements solutions, often using Design of Experiments (DOE) to optimize. Control phase creates control plans, standard work, and monitoring systems to ensure improvements are sustained. Each phase has specific deliverables and gates that must be met before proceeding.',
        tags: ['definition', 'six_sigma', 'dmaic', 'explain']
      },
      {
        topic_code: 'LEAN_OVERVIEW',
        question_pattern: 'what is lean',
        answer_core: 'Lean manufacturing focuses on maximizing value to the customer by eliminating waste, improving flow, and continuously improving processes.',
        answer_layered: 'Lean is a philosophy and set of tools aimed at creating more value with less waste. It originated in the Toyota Production System and emphasizes flow (smooth, continuous movement of work), pull (producing only what is needed when it is needed), and value (from the customer\'s perspective). Lean identifies seven or eight types of waste: defects, overproduction, waiting, non-utilized talent, transportation, inventory, motion, and extra processing. The goal is to systematically eliminate these wastes while maintaining or improving quality and delivery performance.',
        tags: ['definition', 'lean', 'intro']
      },
      {
        topic_code: 'LEAN_WASTES',
        question_pattern: 'what are the seven wastes',
        answer_core: 'The seven Lean wastes are: defects, overproduction, waiting, non-utilized talent, transportation, inventory, motion, and extra processing.',
        answer_layered: 'The classic seven wastes (often called TIMWOOD: Transportation, Inventory, Motion, Waiting, Overproduction, Overprocessing, Defects) plus an eighth waste (Non-utilized talent) form the foundation of Lean thinking. Defects create rework and scrap. Overproduction builds inventory and hides problems. Waiting creates idle time and delays. Non-utilized talent means not using people\'s full capabilities. Transportation moves materials unnecessarily. Inventory ties up capital and hides problems. Motion is unnecessary movement of people. Extra processing does more than the customer values. Identifying and eliminating these wastes systematically improves flow, reduces cost, and improves quality.',
        tags: ['definition', 'lean', 'wastes']
      },
      {
        topic_code: 'KPIS_OVERVIEW',
        question_pattern: 'what are quality kpis',
        answer_core: 'Quality KPIs are measurable indicators of quality performance, such as First Pass Yield, Defect Rate, On-Time Delivery, Scrap Rate, and Customer Complaint Rate.',
        answer_layered: 'Quality KPIs transform quality performance into numbers that can be tracked, analyzed, and improved. Good KPIs are few (focus on what matters), balanced (leading and lagging indicators), and actionable (drive behavior change). Common quality KPIs include: First Pass Yield (FPY) - percentage of units that pass all tests the first time; Defects Per Million Opportunities (DPMO) - normalized defect rate; On-Time Delivery (OTD) - percentage delivered on or before promised date; Scrap Rate - percentage of material that cannot be reworked; Rework Rate - percentage requiring rework; Customer Complaint Rate - complaints per unit shipped; and Corrective Action Cycle Time - time from issue identification to closure. These KPIs should align with business goals and be reviewed regularly.',
        tags: ['definition', 'kpi', 'metrics']
      },
      {
        topic_code: 'COST_OF_QUALITY',
        question_pattern: 'what is cost of quality',
        answer_core: 'Cost of Quality is a framework that groups quality-related costs into prevention, appraisal, internal failure, and external failure, helping organizations understand and optimize their total quality cost.',
        answer_layered: 'Cost of Quality (CoQ) is not the cost of "doing quality"; it is the cost of not having robust quality. Prevention costs include training, process design, mistake-proofing, and preventive maintenance. Appraisal costs include inspections, tests, and audits. Internal failure costs appear when defects are found before the customer sees them, such as scrap, rework, and troubleshooting. External failure costs arise when defects reach the customer, including complaints, returns, warranty work, recalls, and lost business. As a quality leader, the goal is to invest more in prevention so that failure costs shrink, improving both customer satisfaction and profitability.',
        tags: ['definition', 'kpi', 'cost_of_quality']
      },
      {
        topic_code: 'COST_OF_QUALITY',
        question_pattern: 'explain cost of quality',
        answer_core: 'Cost of Quality categorizes all quality-related expenses into four buckets: prevention (investing in quality upfront), appraisal (checking for defects), internal failure (defects caught internally), and external failure (defects reaching customers).',
        answer_layered: 'Cost of Quality helps organizations understand where their quality dollars are going and how to optimize them. Prevention costs are investments: training, design reviews, mistake-proofing, supplier qualification, preventive maintenance. Appraisal costs are necessary but should be minimized: inspections, tests, audits, calibration. Internal failure costs are pure waste: scrap, rework, troubleshooting, downtime. External failure costs are the most expensive: customer complaints, returns, warranty, recalls, lost business, reputation damage. The ideal state is high prevention spending (20-30% of CoQ) and low failure costs (under 10% of CoQ). Many organizations find they\'re spending 50%+ on failure costs, which indicates a need for more prevention investment.',
        tags: ['definition', 'kpi', 'cost_of_quality', 'explain']
      },
      {
        topic_code: 'QUALITY_CULTURE_GLOBAL',
        question_pattern: 'what is quality culture',
        answer_core: 'Quality culture is the shared beliefs, behaviors, and practices that prioritize quality, continuous improvement, and doing the right thing even when no one is watching.',
        answer_layered: 'Quality culture shows up in day-to-day decisions: whether people raise issues early, whether leaders respond constructively, and whether data is used to learn or to blame. In a global organization, quality culture must account for different communication styles, decision-making norms, and risk tolerance across cultures. What works in one region may need adaptation in another, but core principles (safety, compliance, continuous improvement) must be consistent. Key elements include: leadership behavior (walking the talk), psychological safety (people can speak up without fear), clear expectations (what good looks like), reinforcement (recognition and consequences), and data-driven decisions (using facts, not opinions).',
        tags: ['definition', 'culture', 'global']
      },
      {
        topic_code: 'AGILE_QMS_COEXIST',
        question_pattern: 'how can agile and qms coexist',
        answer_core: 'Agile and QMS can coexist when procedures define compliance expectations and guardrails, while teams retain flexibility in how they plan, iterate, and deliver within those guardrails.',
        answer_layered: 'The key is to separate "what" (compliance requirements) from "how" (team practices). A QMS procedure might state: "Teams shall maintain traceability from requirements to test results. Teams may use Jira, Confluence, or other tools of their choice." Or: "Teams shall document design decisions that affect safety or compliance. Teams may use sprint reviews, design reviews, or other formats that fit their cadence." The QMS defines the non-negotiables (compliance, safety, traceability, documentation), while explicitly allowing teams to choose their own planning, delivery, and collaboration practices. This enables agility while maintaining compliance. Regular audits should verify compliance, not dictate team structure.',
        tags: ['definition', 'agile', 'qms', 'coexistence']
      },
      {
        topic_code: 'AGILE_QMS_COEXIST',
        question_pattern: 'agile and qms',
        answer_core: 'Agile and QMS can work together when the QMS focuses on compliance requirements and outcomes, while Agile teams choose their own processes and tools to meet those requirements.',
        answer_layered: 'The conflict between Agile and QMS often comes from QMS procedures that prescribe specific processes (e.g., "all design reviews must follow this 10-step checklist") rather than defining outcomes (e.g., "design reviews must verify compliance with requirements and identify risks"). Agile teams need flexibility in how they work, but they still need to meet compliance requirements. The solution is to write QMS procedures that define the "what" (compliance expectations) and allow the "how" (team practices). For example, a procedure might require traceability but allow teams to use Jira, Confluence, or other tools. It might require documentation but allow teams to use sprint reviews, wikis, or other formats. This enables agility while maintaining compliance.',
        tags: ['definition', 'agile', 'qms']
      }
    ];

    for (const q of qaEntries) {
      const topicId = topicIdByCode[q.topic_code];
      if (!topicId) continue;

      await queryEdcatAI(
        `INSERT INTO edcat.vera_quality_qa
         (topic_id, question_pattern, answer_core, answer_layered, tags)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
        [topicId, q.question_pattern, q.answer_core, q.answer_layered, q.tags]
      );
    }

    console.log('[seed-vera] ✅ Vera Quality Knowledge Base seeded.');
  } catch (error) {
    console.error('[seed-vera] ❌ Error seeding quality knowledge:', error.message);
  }
}

/**
 * Main seed function
 */
async function seedAll() {
  console.log('\n🌱 Starting comprehensive Vera seed...\n');

  try {
    await seedPersonaProfile();
    await seedResponseTemplates();
    await seedRegulatoryWebsites();
    await seedModelVersions();
    await seedQueryResponseBank(); // NEW: Seed Q&A bank
    await seedVeraDynamicGreetings(); // NEW: Seed dynamic greetings
    await seedVeraQualityKnowledge(); // NEW: Seed quality knowledge

    console.log('\n✅ Comprehensive Vera seed completed!\n');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAll();
}

export { seedAll, seedPersonaProfile, seedResponseTemplates, seedRegulatoryWebsites, seedModelVersions, seedVeraDynamicGreetings, seedVeraQualityKnowledge };

