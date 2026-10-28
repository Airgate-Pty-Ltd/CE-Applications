/**
 * Vera Terminology Service
 * Loads and provides access to manufacturing industry terminology, definitions, and acronyms
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryEdcatAI } from '../../config/databases.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraTerminologyService {
  constructor() {
    this.terminology = [];
    this.termIndex = new Map(); // term -> definition object
    this.acronymIndex = new Map(); // acronym -> term
    this.categoryIndex = new Map(); // category -> [terms]
    this.industryIndex = new Map(); // industry -> [terms]
    this.tagIndex = new Map(); // tag -> [terms]
    this.loaded = false;
  }

  /**
   * Load terminology from file system
   */
  loadFromFile() {
    try {
      const possiblePaths = [
        path.join(__dirname, '../../../EDCAT AIP/seed/vera_manufacturing_terminology.json'),
        path.join(__dirname, '../../../../EDCAT AIP/seed/vera_manufacturing_terminology.json'),
        path.join(process.cwd(), 'backend/EDCAT AIP/seed/vera_manufacturing_terminology.json'),
        path.join(process.cwd(), 'EDCAT AIP/seed/vera_manufacturing_terminology.json'),
        path.join('/app/backend/EDCAT AIP/seed/vera_manufacturing_terminology.json') // Railway
      ];

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          this.terminology = JSON.parse(raw);
          this.buildIndexes();
          this.loaded = true;
          console.log(`[VeraTerminologyService] ✓ Loaded ${this.terminology.length} terms from file`);
          return true;
        }
      }

      console.warn('[VeraTerminologyService] Terminology file not found');
      return false;
    } catch (error) {
      console.error('[VeraTerminologyService] Error loading terminology:', error.message);
      return false;
    }
  }

  /**
   * Load terminology from database (edcat.terms_and_definitions table)
   */
  async loadFromDatabase() {
    try {
      // First try the new terms_and_definitions table
      const termsResult = await queryEdcatAI(
        `SELECT 
          term, acronym, definition, short_definition,
          category, subcategory, source_standard, source_document,
          is_acronym, is_standard_term, related_terms, synonyms
         FROM edcat.terms_and_definitions
         WHERE tenant_id = $1
         ORDER BY term ASC`,
        [DEFAULT_TENANT_ID]
      );

      if (termsResult.rows.length > 0) {
        // Convert database rows to terminology format
        this.terminology = termsResult.rows.map(row => ({
          term: row.term,
          acronym: row.acronym,
          definition: row.definition,
          short_definition: row.short_definition,
          category: row.category,
          subcategory: row.subcategory,
          source_standard: row.source_standard,
          source_document: row.source_document,
          is_acronym: row.is_acronym || false,
          is_standard_term: row.is_standard_term || false,
          synonyms: row.synonyms || [],
          related_terms: row.related_terms || []
        }));
        this.buildIndexes();
        this.loaded = true;
        console.log(`[VeraTerminologyService] ✓ Loaded ${this.terminology.length} terms from edcat.terms_and_definitions`);
        return true;
      }

      // Fallback to old ai_policy table if terms_and_definitions is empty
      const policyResult = await queryEdcatAI(
        `SELECT config FROM edcat.ai_policy 
         WHERE tenant_id = $1 AND name = 'vera.manufacturing.terminology'`,
        [DEFAULT_TENANT_ID]
      );

      if (policyResult.rows.length > 0) {
        this.terminology = policyResult.rows[0].config.terms || [];
        this.buildIndexes();
        this.loaded = true;
        console.log(`[VeraTerminologyService] ✓ Loaded ${this.terminology.length} terms from ai_policy`);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('[VeraTerminologyService] Could not load from database:', error.message);
      return false;
    }
  }

  /**
   * Build search indexes for fast lookup
   */
  buildIndexes() {
    this.termIndex.clear();
    this.acronymIndex.clear();
    this.categoryIndex.clear();
    this.industryIndex.clear();
    this.tagIndex.clear();

    for (const term of this.terminology) {
      // Index by term name (case-insensitive)
      const termKey = term.term.toLowerCase();
      this.termIndex.set(termKey, term);

      // Index by acronym
      if (term.acronym) {
        const acronymKey = term.acronym.toUpperCase();
        if (!this.acronymIndex.has(acronymKey)) {
          this.acronymIndex.set(acronymKey, []);
        }
        this.acronymIndex.get(acronymKey).push(term);
      }

      // Index by category
      if (term.category) {
        const categoryKey = term.category.toLowerCase();
        if (!this.categoryIndex.has(categoryKey)) {
          this.categoryIndex.set(categoryKey, []);
        }
        this.categoryIndex.get(categoryKey).push(term);
      }

      // Index by industry
      if (term.industry) {
        const industries = Array.isArray(term.industry) ? term.industry : [term.industry];
        for (const industry of industries) {
          const industryKey = industry.toLowerCase();
          if (!this.industryIndex.has(industryKey)) {
            this.industryIndex.set(industryKey, []);
          }
          this.industryIndex.get(industryKey).push(term);
        }
      }

      // Index by tags
      if (term.tags) {
        const tags = typeof term.tags === 'string' ? term.tags.split(',').map(t => t.trim()) : term.tags;
        for (const tag of tags) {
          const tagKey = tag.toLowerCase();
          if (!this.tagIndex.has(tagKey)) {
            this.tagIndex.set(tagKey, []);
          }
          this.tagIndex.get(tagKey).push(term);
        }
      }
    }

    console.log(`[VeraTerminologyService] ✓ Built indexes: ${this.termIndex.size} terms, ${this.acronymIndex.size} acronyms`);
  }

  /**
   * Initialize - try database first, fall back to file
   */
  async initialize() {
    if (this.loaded) return;

    const dbLoaded = await this.loadFromDatabase();
    if (!dbLoaded) {
      this.loadFromFile();
    }
  }

  /**
   * Look up a term by name with context awareness
   * @param {string} termName - The term to look up
   * @param {Object} context - Context object with industry, standardCode, etc.
   * @returns {Object|null} - The most relevant term definition
   */
  lookupTerm(termName, context = {}) {
    if (!this.loaded) {
      this.loadFromFile();
    }

    const key = termName.toLowerCase();
    const term = this.termIndex.get(key);
    
    if (!term) {
      return null;
    }

    // If no context provided, return first match
    if (!context.industry && !context.standardCode) {
      return term;
    }

    // Context-aware selection: prefer industry/standard matches
    // For now, return the term (database lookup will handle context)
    return term;
  }

  /**
   * Look up a term by name (legacy method - calls context-aware version)
   */
  lookupTermLegacy(termName) {
    return this.lookupTerm(termName);
  }

  /**
   * Look up terms by acronym
   */
  lookupAcronym(acronym) {
    if (!this.loaded) {
      this.loadFromFile();
    }

    const key = acronym.toUpperCase();
    return this.acronymIndex.get(key) || [];
  }

  /**
   * Search terms by keyword (searches term name, definition, synonyms, tags)
   */
  searchTerms(keyword) {
    if (!this.loaded) {
      this.loadFromFile();
    }

    const keywordLower = keyword.toLowerCase();
    const results = [];

    for (const term of this.terminology) {
      let score = 0;

      // Exact term match (highest score)
      if (term.term.toLowerCase() === keywordLower) {
        score = 100;
      } else if (term.term.toLowerCase().includes(keywordLower)) {
        score = 80;
      }

      // Acronym match
      if (term.acronym && term.acronym.toUpperCase() === keyword.toUpperCase()) {
        score = Math.max(score, 90);
      }

      // Definition match
      if (term.definition && term.definition.toLowerCase().includes(keywordLower)) {
        score = Math.max(score, 50);
      }

      // Synonym match
      if (term.synonyms) {
        const synonyms = typeof term.synonyms === 'string' 
          ? term.synonyms.split(',').map(s => s.trim().toLowerCase())
          : term.synonyms.map(s => s.toLowerCase());
        if (synonyms.some(s => s.includes(keywordLower))) {
          score = Math.max(score, 70);
        }
      }

      // Tag match
      if (term.tags) {
        const tags = typeof term.tags === 'string' 
          ? term.tags.split(',').map(t => t.trim().toLowerCase())
          : term.tags.map(t => t.toLowerCase());
        if (tags.some(t => t.includes(keywordLower))) {
          score = Math.max(score, 40);
        }
      }

      if (score > 0) {
        results.push({ term, score });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results.map(r => r.term);
  }

  /**
   * Get terms by category
   */
  getTermsByCategory(category) {
    if (!this.loaded) {
      this.loadFromFile();
    }

    const key = category.toLowerCase();
    return this.categoryIndex.get(key) || [];
  }

  /**
   * Get terms by industry
   */
  getTermsByIndustry(industry) {
    if (!this.loaded) {
      this.loadFromFile();
    }

    const key = industry.toLowerCase();
    return this.industryIndex.get(key) || [];
  }

  /**
   * Get terms by tag
   */
  getTermsByTag(tag) {
    if (!this.loaded) {
      this.loadFromFile();
    }

    const key = tag.toLowerCase();
    return this.tagIndex.get(key) || [];
  }

  /**
   * Expand acronym in text
   */
  expandAcronym(acronym) {
    const terms = this.lookupAcronym(acronym);
    if (terms.length > 0) {
      return terms[0]; // Return first match
    }
    return null;
  }

  /**
   * Enhance text with terminology definitions
   */
  enhanceTextWithDefinitions(text, maxDefinitions = 3) {
    if (!this.loaded) {
      this.loadFromFile();
    }

    // Extract potential terms and acronyms from text
    const words = text.split(/\s+/);
    const definitions = [];
    const usedTerms = new Set();

    for (const word of words) {
      // Remove punctuation
      const cleanWord = word.replace(/[.,!?;:()\[\]{}'"]/g, '');

      // Check if it's an acronym (all caps, 2-10 chars)
      if (/^[A-Z]{2,10}$/.test(cleanWord)) {
        const acronymTerm = this.expandAcronym(cleanWord);
        if (acronymTerm && !usedTerms.has(acronymTerm.term)) {
          definitions.push(acronymTerm);
          usedTerms.add(acronymTerm.term);
          if (definitions.length >= maxDefinitions) break;
        }
      }

      // Check if it's a known term
      const term = this.lookupTerm(cleanWord);
      if (term && !usedTerms.has(term.term)) {
        definitions.push(term);
        usedTerms.add(term.term);
        if (definitions.length >= maxDefinitions) break;
      }
    }

    return definitions;
  }

  /**
   * Get all categories
   */
  getAllCategories() {
    if (!this.loaded) {
      this.loadFromFile();
    }

    const categories = new Set();
    for (const term of this.terminology) {
      if (term.category) {
        categories.add(term.category);
      }
    }
    return Array.from(categories).sort();
  }

  /**
   * Get all industries
   */
  getAllIndustries() {
    if (!this.loaded) {
      this.loadFromFile();
    }

    const industries = new Set();
    for (const term of this.terminology) {
      if (term.industry) {
        const industryList = Array.isArray(term.industry) ? term.industry : [term.industry];
        for (const industry of industryList) {
          industries.add(industry);
        }
      }
    }
    return Array.from(industries).sort();
  }

  /**
   * Get term count
   */
  getTermCount() {
    return this.terminology.length;
  }
}

// Export singleton instance
const veraTerminologyService = new VeraTerminologyService();

// Auto-initialize on import
veraTerminologyService.initialize().catch(err => {
  console.warn('[VeraTerminologyService] Auto-initialization failed:', err.message);
});

export default veraTerminologyService;

