/**
 * Vera Deductive Reasoning Engine
 * Intelligently deduces user intent from broken, partial, or misspelled requests
 * Uses fuzzy matching, typo tolerance, and pattern recognition
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VeraDeductiveReasoningEngine {
  constructor() {
    this.patterns = null;
    this.standardPatterns = null;
    this.regulatoryPatterns = null;
    this.customerPatterns = null;
    this.loadTrainingData();
  }

  /**
   * Load training data from JSON files
   */
  loadTrainingData() {
    try {
      const seedDir = path.join(__dirname, '../../../EDCAT AIP/seed');
      
      // Load standard patterns (ISO, AS, IATF)
      const standardPatternsPath = path.join(seedDir, 'vera_standard_patterns.json');
      if (fs.existsSync(standardPatternsPath)) {
        this.standardPatterns = JSON.parse(fs.readFileSync(standardPatternsPath, 'utf-8'));
        console.log('[VeraDeductiveReasoning] ✓ Loaded standard patterns');
      }

      // Load regulatory patterns (FAA, EASA, CASA, etc.)
      const regulatoryPatternsPath = path.join(seedDir, 'vera_regulatory_patterns.json');
      if (fs.existsSync(regulatoryPatternsPath)) {
        this.regulatoryPatterns = JSON.parse(fs.readFileSync(regulatoryPatternsPath, 'utf-8'));
        console.log('[VeraDeductiveReasoning] ✓ Loaded regulatory patterns');
      }

      // Load customer request patterns
      const customerPatternsPath = path.join(seedDir, 'vera_customer_patterns.json');
      if (fs.existsSync(customerPatternsPath)) {
        this.customerPatterns = JSON.parse(fs.readFileSync(customerPatternsPath, 'utf-8'));
        console.log('[VeraDeductiveReasoning] ✓ Loaded customer patterns');
      }

      console.log('[VeraDeductiveReasoning] ✓ Training data loaded successfully');
    } catch (error) {
      console.error('[VeraDeductiveReasoning] ⚠️  Error loading training data:', error.message);
      // Initialize with empty patterns
      this.standardPatterns = { examples: [] };
      this.regulatoryPatterns = { examples: [] };
      this.customerPatterns = { examples: [] };
    }
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,      // deletion
            dp[i][j - 1] + 1,      // insertion
            dp[i - 1][j - 1] + 1   // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate similarity score between two strings (0-1)
   */
  similarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return 1 - (distance / maxLen);
  }

  /**
   * Normalize text for matching (remove special chars, spaces, convert to lowercase)
   */
  normalize(text) {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');
  }

  /**
   * Extract numbers from text
   */
  extractNumbers(text) {
    const matches = text.match(/\d+/g);
    return matches ? matches.map(m => m) : [];
  }

  /**
   * Extract standard prefix (ISO, AS, IATF, etc.)
   */
  extractPrefix(text) {
    const normalized = text.toLowerCase();
    const prefixes = ['iso', 'as', 'iatf', 'faa', 'easa', 'casa', 'caac', 'fda', 'cfr', 'mdsap'];
    
    for (const prefix of prefixes) {
      if (normalized.includes(prefix)) {
        return prefix;
      }
    }
    
    return null;
  }

  /**
   * Find best matching pattern from training data
   */
  findBestMatch(input, patterns, type = 'standard') {
    if (!patterns || !patterns.examples || patterns.examples.length === 0) {
      return null;
    }

    const normalizedInput = this.normalize(input);
    let bestMatch = null;
    let bestScore = 0;

    for (const example of patterns.examples) {
      const broken = this.normalize(example.broken || example.input || '');
      const correct = example.correct || example.intended || '';
      
      // Calculate similarity with broken input
      const similarityScore = this.similarity(normalizedInput, broken);
      
      // Bonus for partial matches
      let partialBonus = 0;
      if (normalizedInput.includes(broken.substring(0, 3)) || broken.includes(normalizedInput.substring(0, 3))) {
        partialBonus = 0.2;
      }
      
      const totalScore = similarityScore + partialBonus;
      
      if (totalScore > bestScore && totalScore > 0.5) {
        bestScore = totalScore;
        bestMatch = {
          broken: example.broken || example.input,
          correct: correct,
          confidence: Math.min(0.95, totalScore),
          pattern: example,
          type: type
        };
      }
    }

    return bestMatch;
  }

  /**
   * Deduce standard code from broken/partial input
   */
  deduceStandardCode(input, availableStandards = []) {
    const normalizedInput = this.normalize(input);
    const prefix = this.extractPrefix(normalizedInput);
    const numbers = this.extractNumbers(input);
    
    // Try to match against training patterns first
    let patternMatch = null;
    if (prefix === 'iso' || normalizedInput.includes('iso')) {
      patternMatch = this.findBestMatch(input, this.standardPatterns, 'standard');
    } else if (prefix === 'as' || normalizedInput.includes('as')) {
      patternMatch = this.findBestMatch(input, this.standardPatterns, 'standard');
    } else if (prefix === 'iatf' || normalizedInput.includes('iatf')) {
      patternMatch = this.findBestMatch(input, this.standardPatterns, 'standard');
    }

    if (patternMatch && patternMatch.confidence > 0.7) {
      // Try to find this standard in available standards
      const correctNormalized = this.normalize(patternMatch.correct);
      const matchedStandard = availableStandards.find(s => {
        const standardNormalized = this.normalize(s.code);
        return standardNormalized.includes(correctNormalized) || 
               correctNormalized.includes(standardNormalized);
      });

      if (matchedStandard) {
        return {
          deduced: patternMatch.correct,
          confidence: patternMatch.confidence,
          original: input,
          match: matchedStandard.code,
          reasoning: `Matched "${input}" to "${patternMatch.correct}" based on training patterns`
        };
      }
    }

    // If no pattern match, try fuzzy matching with available standards
    let bestStandard = null;
    let bestScore = 0;

    for (const standard of availableStandards) {
      const standardNormalized = this.normalize(standard.code);
      
      // Check if prefix matches
      if (prefix) {
        const standardPrefix = this.extractPrefix(standard.code);
        if (standardPrefix && standardPrefix !== prefix) {
          continue; // Skip if prefixes don't match
        }
      }

      // Check if numbers match
      if (numbers.length > 0) {
        const standardNumbers = this.extractNumbers(standard.code);
        const numberMatch = numbers.some(n => standardNumbers.includes(n));
        if (!numberMatch && standardNumbers.length > 0) {
          continue; // Skip if no number overlap
        }
      }

      // Calculate similarity
      const similarityScore = this.similarity(normalizedInput, standardNormalized);
      
      if (similarityScore > bestScore && similarityScore > 0.4) {
        bestScore = similarityScore;
        bestStandard = {
          deduced: standard.code,
          confidence: similarityScore,
          original: input,
          match: standard.code,
          reasoning: `Fuzzy matched "${input}" to "${standard.code}" (similarity: ${(similarityScore * 100).toFixed(0)}%)`
        };
      }
    }

    return bestStandard;
  }

  /**
   * Deduce clause number from broken/partial input
   */
  deduceClauseNumber(input) {
    // Try to extract clause number patterns
    const patterns = [
      /clause\s*(\d+(?:\.\d+)*)/i,
      /section\s*(\d+(?:\.\d+)*)/i,
      /(\d+\.\d+(?:\.\d+)*(?:\.\d+)*)/,  // e.g., 4.1, 4.1.1, 4.1.1.1
      /(\d+)/  // Just numbers
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const clauseNum = match[1];
        // Validate it's a reasonable clause number (1-10 for top level, then subclauses)
        if (clauseNum.match(/^\d+(\.\d+)*$/)) {
          return {
            deduced: clauseNum,
            confidence: 0.9,
            original: input,
            reasoning: `Extracted clause number "${clauseNum}" from input`
          };
        }
      }
    }

    return null;
  }

  /**
   * Main deduction method - analyzes broken request and deduces intent
   */
  deduceRequest(input, context = {}) {
    const { standards = [], documents = [] } = context;
    const results = {
      original: input,
      deduced: {
        standardCode: null,
        clauseNumber: null,
        intent: null,
        confidence: 0,
        reasoning: []
      },
      needsClarification: false,
      clarificationQuestion: null
    };

    // Step 1: Try to deduce standard code
    const standardDeduction = this.deduceStandardCode(input, standards);
    if (standardDeduction && standardDeduction.confidence > 0.5) {
      results.deduced.standardCode = standardDeduction.deduced;
      results.deduced.confidence = standardDeduction.confidence;
      results.deduced.reasoning.push(standardDeduction.reasoning);

      // If confidence is low, we need clarification
      if (standardDeduction.confidence < 0.7) {
        results.needsClarification = true;
        results.clarificationQuestion = `Did you mean "${standardDeduction.deduced}"?`;
      }
    }

    // Step 2: Try to deduce clause number
    const clauseDeduction = this.deduceClauseNumber(input);
    if (clauseDeduction) {
      results.deduced.clauseNumber = clauseDeduction.deduced;
      results.deduced.reasoning.push(clauseDeduction.reasoning);
      // Update overall confidence (clause extraction is usually reliable)
      results.deduced.confidence = Math.min(0.95, results.deduced.confidence + 0.2);
    }

    // Step 3: Determine intent
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('requirement') || lowerInput.includes('extract') || lowerInput.includes('show')) {
      results.deduced.intent = 'extract_requirements';
    } else if (lowerInput.includes('gap') || lowerInput.includes('missing') || lowerInput.includes('nonconform')) {
      results.deduced.intent = 'gap_analysis';
    } else if (lowerInput.includes('procedure') || lowerInput.includes('draft') || lowerInput.includes('create')) {
      results.deduced.intent = 'create_procedure';
    } else if (lowerInput.includes('clause') || lowerInput.includes('section')) {
      results.deduced.intent = 'query_clause';
    } else {
      results.deduced.intent = 'general_query';
    }

    // Step 4: Determine if clarification is needed
    if (results.deduced.confidence < 0.6 || 
        (results.deduced.standardCode && standardDeduction && standardDeduction.confidence < 0.7)) {
      results.needsClarification = true;
      
      // Generate smart clarification question
      if (results.deduced.standardCode && results.deduced.clauseNumber) {
        results.clarificationQuestion = `I think you're asking about **${results.deduced.standardCode} clause ${results.deduced.clauseNumber}**. Is that correct?`;
      } else if (results.deduced.standardCode) {
        results.clarificationQuestion = `I think you're asking about **${results.deduced.standardCode}**. Which clause would you like to know about?`;
      } else if (results.deduced.clauseNumber) {
        const availableStandards = standards.length > 0 
          ? standards.slice(0, 3).map(s => s.code).join(', ')
          : 'a standard';
        results.clarificationQuestion = `I see you're asking about **clause ${results.deduced.clauseNumber}**, but I'm not sure which standard. Did you mean one of these: ${availableStandards}?`;
      } else {
        results.clarificationQuestion = `I'm not sure what you're looking for. Could you clarify which standard and clause you need?`;
      }
    }

    return results;
  }

  /**
   * Generate clarification question based on deduction results
   */
  generateClarification(deduction, availableStandards = []) {
    if (!deduction.needsClarification) {
      return null;
    }

    const { deduced } = deduction;

    // If we have a low-confidence standard match, ask about it
    if (deduced.standardCode && deduced.confidence < 0.8) {
      const standardMatch = availableStandards.find(s => 
        this.normalize(s.code).includes(this.normalize(deduced.standardCode))
      );

      if (standardMatch) {
        return `I think you meant **${standardMatch.code}**. Is that correct?`;
      } else {
        // Check for similar standards
        const similarStandards = availableStandards.filter(s => {
          const normalized = this.normalize(s.code);
          const searchNormalized = this.normalize(deduced.standardCode);
          return normalized.includes(searchNormalized.substring(0, 3)) || 
                 searchNormalized.includes(normalized.substring(0, 3));
        }).slice(0, 3);

        if (similarStandards.length > 0) {
          const standardList = similarStandards.map(s => s.code).join(', ');
          return `Did you mean one of these standards: ${standardList}?`;
        }
      }
    }

    return deduction.clarificationQuestion;
  }
}

// Export singleton instance
const veraDeductiveReasoningEngine = new VeraDeductiveReasoningEngine();
export default veraDeductiveReasoningEngine;

