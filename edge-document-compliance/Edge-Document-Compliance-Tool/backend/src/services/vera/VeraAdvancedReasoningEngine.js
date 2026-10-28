/**
 * Vera Advanced Reasoning Engine
 * Multi-step deductive reasoning with context chaining, semantic matching,
 * learning from corrections, and self-validation
 */

import veraDeductiveReasoningEngine from './VeraDeductiveReasoningEngine.js';
import { queryEdcatAI } from '../../config/databases.js';
import { getEmbeddingService } from '../embeddingService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VeraAdvancedReasoningEngine {
  constructor() {
    this.reasoningChain = [];
    this.learnedCorrections = new Map();
    this.contextMemory = [];
    this.confidenceHistory = [];
    this.embeddingService = null;
    this.initializeEmbeddingService();
    this.loadLearnedCorrections();
  }

  /**
   * Initialize embedding service for semantic similarity
   */
  async initializeEmbeddingService() {
    try {
      this.embeddingService = getEmbeddingService();
      console.log('[VeraAdvancedReasoning] ✓ Embedding service initialized');
    } catch (error) {
      console.warn('[VeraAdvancedReasoning] Could not initialize embedding service:', error.message);
    }
  }

  /**
   * Load learned corrections from database
   */
  async loadLearnedCorrections() {
    try {
      const corrections = await queryEdcatAI(`
        SELECT 
          broken_input,
          corrected_output,
          confidence_before,
          confidence_after,
          user_feedback,
          usage_count
        FROM edcat.vera_learned_corrections
        WHERE active = true
        ORDER BY usage_count DESC, (confidence_after - confidence_before) DESC
        LIMIT 1000
      `);

      for (const correction of corrections.rows) {
        const key = this.normalize(correction.broken_input);
        this.learnedCorrections.set(key, {
          broken: correction.broken_input,
          correct: correction.corrected_output,
          confidenceBefore: parseFloat(correction.confidence_before) || 0.5,
          confidenceAfter: parseFloat(correction.confidence_after) || 0.9,
          feedback: correction.user_feedback,
          usageCount: parseInt(correction.usage_count) || 1,
          improvement: parseFloat(correction.confidence_after) - parseFloat(correction.confidence_before)
        });
      }

      if (this.learnedCorrections.size > 0) {
        console.log(`[VeraAdvancedReasoning] ✓ Loaded ${this.learnedCorrections.size} learned corrections`);
      }
    } catch (error) {
      // Table may not exist yet (migrations run after module load)
      // This is expected on first startup - silently continue
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        // Table doesn't exist yet - migrations will create it
        // Don't log as warning, just continue silently
        return;
      }
      // Only log if it's a different error
      console.warn('[VeraAdvancedReasoning] Could not load corrections:', error.message);
    }
  }

  /**
   * Save a learned correction to database
   */
  async saveCorrection(broken, correct, confidenceBefore, confidenceAfter, userFeedback = null) {
    try {
      await queryEdcatAI(`
        INSERT INTO edcat.vera_learned_corrections 
        (broken_input, corrected_output, confidence_before, confidence_after, user_feedback, usage_count, active)
        VALUES ($1, $2, $3, $4, $5, 1, true)
        ON CONFLICT (broken_input, corrected_output) 
        DO UPDATE SET
          usage_count = vera_learned_corrections.usage_count + 1,
          confidence_after = GREATEST(vera_learned_corrections.confidence_after, $4),
          last_used_at = NOW()
      `, [broken, correct, confidenceBefore, confidenceAfter, userFeedback]);

      // Update in-memory cache
      const key = this.normalize(broken);
      this.learnedCorrections.set(key, {
        broken,
        correct,
        confidenceBefore,
        confidenceAfter,
        feedback: userFeedback,
        usageCount: (this.learnedCorrections.get(key)?.usageCount || 0) + 1,
        improvement: confidenceAfter - confidenceBefore
      });
    } catch (error) {
      // Table might not exist yet, that's okay
      console.log('[VeraAdvancedReasoning] Could not save correction (table may not exist):', error.message);
    }
  }

  /**
   * Normalize text for matching
   */
  normalize(text) {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');
  }

  /**
   * Detect if input is a regulatory request
   */
  detectRegulatoryRequest(input) {
    const lowerInput = input.toLowerCase();
    
    // Check for regulatory body patterns
    const regulatoryPatterns = [
      /(?:^|\s)(faa|easa|casa|caac|fda|cfr)(?:\s+part\s+(\d+))?/i,
      /(?:^|\s)part\s+(\d+)(?:\s+(?:faa|easa|casa|caac|fda))?/i,
      /21\s*cfr/i
    ];

    for (const pattern of regulatoryPatterns) {
      const match = input.match(pattern);
      if (match) {
        const regulator = match[1]?.toLowerCase() || (match[0].includes('cfr') ? 'fda' : null);
        const partNumber = match[2] || match[1];
        
        if (regulator || partNumber) {
          let regulatoryCode = null;
          let regulatoryName = null;
          
          if (regulator === 'faa' && partNumber) {
            regulatoryCode = `FAA-PART-${partNumber}`;
            regulatoryName = `FAA Part ${partNumber}`;
          } else if (regulator === 'easa' && partNumber) {
            regulatoryCode = `EASA-PART-${partNumber}`;
            regulatoryName = `EASA Part ${partNumber}`;
          } else if (regulator === 'casa' && partNumber) {
            regulatoryCode = `CASA-PART-${partNumber}`;
            regulatoryName = `CASA Part ${partNumber}`;
          } else if (regulator === 'caac' && partNumber) {
            regulatoryCode = `CAAC-PART-${partNumber}`;
            regulatoryName = `CAAC Part ${partNumber}`;
          } else if (regulator === 'fda' || lowerInput.includes('cfr')) {
            const cfrMatch = input.match(/21\s*cfr(?:\s+part\s+(\d+))?/i);
            if (cfrMatch) {
              const cfrPart = cfrMatch[1] || '820';
              regulatoryCode = `21-CFR-PART-${cfrPart}`;
              regulatoryName = `21 CFR Part ${cfrPart}`;
            }
          }
          
          if (regulatoryCode) {
            return {
              isRegulatory: true,
              regulatoryCode,
              regulatoryName,
              confidence: 0.9,
              partNumber
            };
          }
        }
      }
    }

    return { isRegulatory: false };
  }

  /**
   * Detect if input is a customer request pattern (overview, general info)
   */
  detectCustomerRequest(input) {
    const lowerInput = input.toLowerCase();
    
    const customerPatterns = [
      { pattern: /(?:tell|what|can you|show).*(?:about|requirements?|info|information)/i, intent: 'overview', weight: 0.9 },
      { pattern: /(?:what|tell).*(?:are|is).*(?:requirements?|clauses?)/i, intent: 'overview', weight: 0.85 },
      { pattern: /(?:explain|describe).*(?:standard|regulation)/i, intent: 'overview', weight: 0.8 },
      { pattern: /(?:overview|summary|general).*(?:of|about)/i, intent: 'overview', weight: 0.9 }
    ];

    for (const customerPattern of customerPatterns) {
      if (customerPattern.pattern.test(input)) {
        return {
          isCustomerRequest: true,
          intent: customerPattern.intent,
          confidence: customerPattern.weight
        };
      }
    }

    return { isCustomerRequest: false };
  }

  /**
   * Multi-step reasoning: Chain multiple deductions together
   */
  async multiStepReasoning(input, context, maxSteps = 3) {
    const reasoningChain = [];
    let currentInput = input;
    let currentContext = { ...context };
    let overallConfidence = 0;
    const hypotheses = [];
    let requestType = 'standard'; // 'standard', 'regulatory', 'customer'

    // STEP 0: Detect request type FIRST (before clause extraction)
    const regulatoryDetection = this.detectRegulatoryRequest(input);
    const customerDetection = this.detectCustomerRequest(input);
    
    if (regulatoryDetection.isRegulatory) {
      requestType = 'regulatory';
      hypotheses.push({
        standardCode: regulatoryDetection.regulatoryCode,
        regulatoryName: regulatoryDetection.regulatoryName,
        confidence: regulatoryDetection.confidence,
        source: 'regulatory_pattern',
        reasoning: `Detected regulatory request: ${regulatoryDetection.regulatoryName}`,
        requestType: 'regulatory'
      });
      overallConfidence = regulatoryDetection.confidence;
    } else if (customerDetection.isCustomerRequest) {
      requestType = 'customer';
      // Extract standard from customer request
      const standardMatch = input.match(/(?:iso|as|iatf)[\s\-+]*(\d{4,5})|(faa|easa|casa|caac)/i);
      if (standardMatch) {
        const number = standardMatch[1];
        const regulator = standardMatch[2]?.toLowerCase();
        
        if (number) {
          const prefixMatch = input.match(/(iso|as|iatf)/i);
          const prefix = prefixMatch ? prefixMatch[1].toLowerCase() : 'iso';
          const standardCode = `${prefix.toUpperCase()}${number}`;
          
          hypotheses.push({
            standardCode,
            confidence: customerDetection.confidence * 0.8,
            source: 'customer_request_pattern',
            reasoning: `Customer overview request for ${standardCode}`,
            requestType: 'customer',
            intent: customerDetection.intent
          });
          overallConfidence = customerDetection.confidence * 0.8;
        } else if (regulator) {
          const regulatoryCode = `${regulator.toUpperCase()}`;
          hypotheses.push({
            standardCode: regulatoryCode,
            confidence: customerDetection.confidence * 0.8,
            source: 'customer_request_pattern',
            reasoning: `Customer overview request for ${regulator.toUpperCase()}`,
            requestType: 'customer',
            intent: customerDetection.intent
          });
          overallConfidence = customerDetection.confidence * 0.8;
        }
      }
    }

    for (let step = 0; step < maxSteps; step++) {
      // Step 1: Check learned corrections first (highest priority)
      const normalizedInput = this.normalize(currentInput);
      const learnedCorrection = this.learnedCorrections.get(normalizedInput);
      
      if (learnedCorrection && learnedCorrection.usageCount > 2) {
        reasoningChain.push({
          step: step + 1,
          type: 'learned_correction',
          input: currentInput,
          output: learnedCorrection.correct,
          confidence: learnedCorrection.confidenceAfter,
          reasoning: `Matched learned correction (used ${learnedCorrection.usageCount} times)`,
          source: 'memory'
        });

        hypotheses.push({
          standardCode: learnedCorrection.correct,
          confidence: learnedCorrection.confidenceAfter,
          source: 'learned_correction',
          reasoning: reasoningChain[reasoningChain.length - 1].reasoning,
          requestType
        });

        overallConfidence = Math.max(overallConfidence, learnedCorrection.confidenceAfter);
        currentInput = learnedCorrection.correct;
        continue;
      }

      // Step 2: Use regulatory/customer pattern matching if not already detected
      if (requestType === 'regulatory' && !regulatoryDetection.isRegulatory) {
        const regPatterns = veraDeductiveReasoningEngine.regulatoryPatterns;
        if (regPatterns && regPatterns.examples) {
          const regMatch = veraDeductiveReasoningEngine.findBestMatch(currentInput, regPatterns, 'regulatory');
          if (regMatch && regMatch.confidence > 0.6) {
            hypotheses.push({
              standardCode: regMatch.correct,
              confidence: regMatch.confidence,
              source: 'regulatory_pattern_matching',
              reasoning: regMatch.pattern?.note || 'Matched regulatory pattern',
              requestType: 'regulatory'
            });
            overallConfidence = Math.max(overallConfidence, regMatch.confidence);
          }
        }
      }

      if (requestType === 'customer' && !customerDetection.isCustomerRequest) {
        const customerPatterns = veraDeductiveReasoningEngine.customerPatterns;
        if (customerPatterns && customerPatterns.examples) {
          const custMatch = veraDeductiveReasoningEngine.findBestMatch(currentInput, customerPatterns, 'customer');
          if (custMatch && custMatch.confidence > 0.6) {
            hypotheses.push({
              standardCode: custMatch.correct,
              confidence: custMatch.confidence,
              source: 'customer_pattern_matching',
              reasoning: custMatch.pattern?.note || 'Matched customer request pattern',
              requestType: 'customer',
              intent: custMatch.pattern?.intent || 'overview'
            });
            overallConfidence = Math.max(overallConfidence, custMatch.confidence);
          }
        }
      }

      // Step 3: Use regulatory pattern matching if regulatory request
      if (requestType === 'regulatory' && !regulatoryDetection.isRegulatory) {
        const regPatterns = veraDeductiveReasoningEngine.regulatoryPatterns;
        if (regPatterns && regPatterns.examples) {
          const regMatch = veraDeductiveReasoningEngine.findBestMatch(currentInput, regPatterns, 'regulatory');
          if (regMatch && regMatch.confidence > 0.6) {
            hypotheses.push({
              standardCode: regMatch.correct,
              confidence: regMatch.confidence,
              source: 'regulatory_pattern_matching',
              reasoning: regMatch.pattern?.note || 'Matched regulatory pattern',
              requestType: 'regulatory'
            });
            overallConfidence = Math.max(overallConfidence, regMatch.confidence);
          }
        }
      }

      // Step 4: Use customer pattern matching if customer request
      if (requestType === 'customer' && !customerDetection.isCustomerRequest) {
        const customerPatterns = veraDeductiveReasoningEngine.customerPatterns;
        if (customerPatterns && customerPatterns.examples) {
          const custMatch = veraDeductiveReasoningEngine.findBestMatch(currentInput, customerPatterns, 'customer');
          if (custMatch && custMatch.confidence > 0.6) {
            hypotheses.push({
              standardCode: custMatch.correct,
              confidence: custMatch.confidence,
              source: 'customer_pattern_matching',
              reasoning: custMatch.pattern?.note || 'Matched customer request pattern',
              requestType: 'customer',
              intent: custMatch.pattern?.intent || 'overview'
            });
            overallConfidence = Math.max(overallConfidence, custMatch.confidence);
          }
        }
      }

      // Step 5: Use base deductive reasoning (only if not regulatory/customer)
      if (requestType === 'standard') {
        const deduction = veraDeductiveReasoningEngine.deduceRequest(currentInput, currentContext);
      
        reasoningChain.push({
          step: step + 1,
          type: 'deductive_reasoning',
          input: currentInput,
          output: deduction.deduced.standardCode || deduction.deduced.clauseNumber,
          confidence: deduction.deduced.confidence,
          reasoning: deduction.deduced.reasoning.join('; ') || 'Pattern matching',
          source: 'pattern_matching'
        });

        if (deduction.deduced.standardCode) {
          hypotheses.push({
            standardCode: deduction.deduced.standardCode,
            confidence: deduction.deduced.confidence,
            source: 'pattern_matching',
            reasoning: deduction.deduced.reasoning.join('; '),
            requestType
          });
          overallConfidence = Math.max(overallConfidence, deduction.deduced.confidence);
        }
      }

      // Step 3: If confidence is high enough, stop
      if (overallConfidence > 0.8) {
        break;
      }

      // Step 4: Try semantic similarity matching
      if (this.embeddingService && currentContext.standards && currentContext.standards.length > 0) {
        try {
          const semanticMatch = await this.findSemanticMatch(currentInput, currentContext.standards);
          if (semanticMatch && semanticMatch.confidence > 0.6) {
            reasoningChain.push({
              step: step + 1,
              type: 'semantic_similarity',
              input: currentInput,
              output: semanticMatch.standardCode,
              confidence: semanticMatch.confidence,
              reasoning: `Semantic similarity match: "${semanticMatch.standardCode}" (${(semanticMatch.confidence * 100).toFixed(0)}% similar)`,
              source: 'embedding_similarity'
            });

            hypotheses.push({
              standardCode: semanticMatch.standardCode,
              confidence: semanticMatch.confidence,
              source: 'semantic_similarity',
              reasoning: `Semantically similar to "${semanticMatch.standardCode}"`
            });

            overallConfidence = Math.max(overallConfidence, semanticMatch.confidence);
          }
        } catch (error) {
          console.warn('[VeraAdvancedReasoning] Semantic matching failed:', error.message);
        }
      }

      // Step 5: Try context-based refinement
      if (this.contextMemory.length > 0) {
        const contextMatch = this.findContextMatch(currentInput, this.contextMemory);
        if (contextMatch && contextMatch.confidence > 0.6) {
          reasoningChain.push({
            step: step + 1,
            type: 'context_memory',
            input: currentInput,
            output: contextMatch.standardCode,
            confidence: contextMatch.confidence,
            reasoning: `Matched previous conversation context: "${contextMatch.previousInput}"`,
            source: 'conversation_history'
          });

          hypotheses.push({
            standardCode: contextMatch.standardCode,
            confidence: contextMatch.confidence,
            source: 'context_memory',
            reasoning: `From previous conversation: "${contextMatch.previousInput}"`
          });

          overallConfidence = Math.max(overallConfidence, contextMatch.confidence);
        }
      }

      // If we've made progress, continue; otherwise stop
      if (step > 0 && overallConfidence <= 0.3) {
        break;
      }
    }

    // Rank hypotheses by confidence
    hypotheses.sort((a, b) => b.confidence - a.confidence);

    return {
      originalInput: input,
      finalOutput: hypotheses[0]?.standardCode || null,
      confidence: overallConfidence,
      reasoningChain,
      hypotheses: hypotheses.slice(0, 3), // Top 3 hypotheses
      needsClarification: overallConfidence < 0.7,
      clarificationQuestion: this.generateAdvancedClarification(hypotheses, context),
      requestType, // 'standard', 'regulatory', 'customer'
      regulatoryInfo: regulatoryDetection.isRegulatory ? regulatoryDetection : null,
      customerInfo: customerDetection.isCustomerRequest ? customerDetection : null
    };
  }

  /**
   * Find match in conversation context
   */
  findContextMatch(input, contextMemory) {
    const normalizedInput = this.normalize(input);
    
    for (const memory of contextMemory.slice(-10).reverse()) {
      if (memory.standardCode) {
        const normalizedMemory = this.normalize(memory.standardCode);
        const similarity = this.calculateSimilarity(normalizedInput, normalizedMemory);
        
        if (similarity > 0.6) {
          return {
            standardCode: memory.standardCode,
            confidence: similarity * 0.9, // Slightly lower than direct match
            previousInput: memory.originalInput,
            timestamp: memory.timestamp
          };
        }
      }
    }

    return null;
  }

  /**
   * Find semantic match using embeddings
   */
  async findSemanticMatch(input, standards) {
    if (!this.embeddingService || !standards || standards.length === 0) {
      return null;
    }

    try {
      // Create embeddings for input and all standards
      const inputEmbedding = await this.embeddingService.embed(input);
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const standard of standards) {
        const standardText = `${standard.code} ${standard.name || ''}`;
        const standardEmbedding = await this.embeddingService.embed(standardText);
        const similarity = this.embeddingService.cosineSimilarity(inputEmbedding, standardEmbedding);

        if (similarity > bestSimilarity && similarity > 0.5) {
          bestSimilarity = similarity;
          bestMatch = {
            standardCode: standard.code,
            confidence: similarity,
            standardName: standard.name
          };
        }
      }

      return bestMatch;
    } catch (error) {
      console.warn('[VeraAdvancedReasoning] Semantic matching error:', error.message);
      return null;
    }
  }

  /**
   * Calculate similarity between two strings
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    
    // Simple character overlap
    const set1 = new Set(str1);
    const set2 = new Set(str2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Generate advanced clarification with multiple hypotheses
   */
  generateAdvancedClarification(hypotheses, context) {
    if (hypotheses.length === 0) {
      return null;
    }

    const { standards = [] } = context;
    const parsedStandards = standards.filter(s => s.requirements_count > 0);

    if (hypotheses.length === 1) {
      const hyp = hypotheses[0];
      if (hyp.confidence > 0.5 && hyp.confidence < 0.8) {
        return `I think you're asking about **${hyp.standardCode}** (${(hyp.confidence * 100).toFixed(0)}% confident). Is that correct?`;
      }
    }

    // Multiple hypotheses - present ranked options
    let response = `I found a few possible matches. Could you confirm which one you meant?\n\n`;
    
    for (let i = 0; i < Math.min(hypotheses.length, 3); i++) {
      const hyp = hypotheses[i];
      const standard = parsedStandards.find(s => 
        this.normalize(s.code).includes(this.normalize(hyp.standardCode)) ||
        this.normalize(hyp.standardCode).includes(this.normalize(s.code))
      );

      response += `${i + 1}. **${hyp.standardCode}** (${(hyp.confidence * 100).toFixed(0)}% confidence)\n`;
      if (hyp.reasoning) {
        response += `   _${hyp.reasoning}_\n`;
      }
      if (standard) {
        response += `   ✓ Available in database\n`;
      }
      response += `\n`;
    }

    response += `Or tell me if you meant something else.`;

    return response;
  }

  /**
   * Self-validate a deduction by checking against multiple signals
   */
  async selfValidate(deduction, context) {
    const validationSignals = {
      patternMatch: deduction.deduced.confidence,
      learnedCorrection: 0,
      contextMatch: 0,
      semanticSimilarity: 0,
      standardExists: false
    };

    // Check learned corrections
    const normalized = this.normalize(deduction.original);
    const learned = this.learnedCorrections.get(normalized);
    if (learned && learned.correct === deduction.deduced.standardCode) {
      validationSignals.learnedCorrection = learned.confidenceAfter;
    }

    // Check context memory
    const contextMatch = this.findContextMatch(deduction.original, this.contextMemory);
    if (contextMatch && contextMatch.standardCode === deduction.deduced.standardCode) {
      validationSignals.contextMatch = contextMatch.confidence;
    }

      // Check if standard exists in database
      const { standards = [] } = context;
      const standardExists = standards.some(s => {
        const normalizedStandard = this.normalize(s.code);
        const normalizedDeduced = this.normalize(deduction.deduced.standardCode);
        return normalizedStandard.includes(normalizedDeduced) || 
               normalizedDeduced.includes(normalizedStandard);
      });
      validationSignals.standardExists = standardExists;

      // Add semantic similarity check if available
      if (this.embeddingService && standards.length > 0) {
        try {
          const semanticMatch = await this.findSemanticMatch(deduction.original, standards);
          if (semanticMatch && semanticMatch.standardCode === deduction.deduced.standardCode) {
            validationSignals.semanticSimilarity = semanticMatch.confidence;
          }
        } catch (error) {
          // Ignore semantic matching errors in validation
        }
      }

    // Calculate weighted validation score
    const validationScore = (
      validationSignals.patternMatch * 0.25 +
      validationSignals.learnedCorrection * 0.25 +
      validationSignals.contextMatch * 0.15 +
      (validationSignals.semanticSimilarity || 0) * 0.20 +
      (validationSignals.standardExists ? 0.15 : 0)
    );

    return {
      isValid: validationScore > 0.6,
      validationScore,
      signals: validationSignals,
      adjustedConfidence: Math.min(0.95, validationScore)
    };
  }

  /**
   * Add to context memory
   */
  addToContextMemory(input, deducedStandard, confidence) {
    this.contextMemory.push({
      originalInput: input,
      standardCode: deducedStandard,
      confidence,
      timestamp: new Date().toISOString()
    });

    // Keep only last 20 items
    if (this.contextMemory.length > 20) {
      this.contextMemory.shift();
    }
  }

  /**
   * Calibrate confidence based on historical performance
   */
  calibrateConfidence(rawConfidence, input) {
    // Track confidence history for calibration
    this.confidenceHistory.push({
      confidence: rawConfidence,
      input: this.normalize(input),
      timestamp: Date.now()
    });

    // Keep only last 100
    if (this.confidenceHistory.length > 100) {
      this.confidenceHistory.shift();
    }

    // If we have learned corrections for similar inputs, boost confidence
    const normalized = this.normalize(input);
    for (const [key, correction] of this.learnedCorrections.entries()) {
      const similarity = this.calculateSimilarity(normalized, key);
      if (similarity > 0.7) {
        // Boost confidence based on learned correction success
        return Math.min(0.95, rawConfidence + (correction.improvement * 0.3));
      }
    }

    return rawConfidence;
  }

  /**
   * Intent disambiguation: Rank multiple possible interpretations
   */
  disambiguateIntent(input, context) {
    const interpretations = [];

    // Try different intent patterns
    const intentPatterns = [
      { pattern: /(?:what|tell|explain|show).*(?:clause|requirement|section)/i, intent: 'query_clause', weight: 0.8 },
      { pattern: /(?:extract|list|show|get).*(?:requirement|table)/i, intent: 'extract_requirements', weight: 0.9 },
      { pattern: /(?:gap|missing|nonconform|compliance)/i, intent: 'gap_analysis', weight: 0.85 },
      { pattern: /(?:draft|create|write|generate).*(?:procedure|document)/i, intent: 'create_procedure', weight: 0.8 },
      { pattern: /(?:compare|match|analyze)/i, intent: 'comparison', weight: 0.7 }
    ];

    for (const intentPattern of intentPatterns) {
      if (intentPattern.pattern.test(input)) {
        interpretations.push({
          intent: intentPattern.intent,
          confidence: intentPattern.weight,
          reasoning: `Matched intent pattern: ${intentPattern.intent}`
        });
      }
    }

    // If no pattern matched, infer from context
    if (interpretations.length === 0) {
      if (context.previousIntent) {
        interpretations.push({
          intent: context.previousIntent,
          confidence: 0.6,
          reasoning: `Inferred from previous conversation context`
        });
      } else {
        interpretations.push({
          intent: 'general_query',
          confidence: 0.5,
          reasoning: `Default intent (no specific pattern matched)`
        });
      }
    }

    // Sort by confidence
    interpretations.sort((a, b) => b.confidence - a.confidence);

    return interpretations;
  }

  /**
   * Main advanced reasoning method
   */
  async reason(input, context = {}, options = {}) {
    const {
      useMultiStep = true,
      useSelfValidation = true,
      useContextMemory = true,
      maxSteps = 3
    } = options;

    // Step 1: Multi-step reasoning
    let reasoningResult;
    if (useMultiStep) {
      reasoningResult = await this.multiStepReasoning(input, context, maxSteps);
    } else {
      reasoningResult = veraDeductiveReasoningEngine.deduceRequest(input, context);
    }

    // Step 2: Intent disambiguation
    const intentInterpretations = this.disambiguateIntent(input, context);
    reasoningResult.intent = intentInterpretations[0]?.intent || 'general_query';
    reasoningResult.intentConfidence = intentInterpretations[0]?.confidence || 0.5;
    reasoningResult.alternativeIntents = intentInterpretations.slice(1, 3);

    // Step 3: Self-validation
    if (useSelfValidation && reasoningResult.finalOutput) {
      const validation = await this.selfValidate({
        original: input,
        deduced: {
          standardCode: reasoningResult.finalOutput,
          confidence: reasoningResult.confidence
        }
      }, context);

      reasoningResult.validation = validation;
      reasoningResult.confidence = validation.adjustedConfidence;
      reasoningResult.isValid = validation.isValid;
    }

    // Step 4: Confidence calibration
    reasoningResult.confidence = this.calibrateConfidence(
      reasoningResult.confidence || 0.5,
      input
    );

    // Step 5: Add to context memory
    if (useContextMemory && reasoningResult.finalOutput) {
      this.addToContextMemory(input, reasoningResult.finalOutput, reasoningResult.confidence);
    }

    // Step 6: Generate advanced clarification if needed
    if (reasoningResult.confidence < 0.7 || reasoningResult.needsClarification) {
      reasoningResult.clarificationQuestion = this.generateAdvancedClarification(
        reasoningResult.hypotheses || [],
        context
      );
    }

    return reasoningResult;
  }

  /**
   * Learn from user correction
   */
  async learnFromCorrection(originalInput, userCorrection, originalConfidence) {
    const newConfidence = 0.9; // High confidence after user confirms
    
    await this.saveCorrection(
      originalInput,
      userCorrection,
      originalConfidence,
      newConfidence,
      'user_confirmed'
    );

    // Update context memory
    this.addToContextMemory(originalInput, userCorrection, newConfidence);

    console.log(`[VeraAdvancedReasoning] ✓ Learned correction: "${originalInput}" → "${userCorrection}"`);
  }

  /**
   * Get reasoning explanation for user
   */
  explainReasoning(reasoningResult) {
    if (!reasoningResult.reasoningChain || reasoningResult.reasoningChain.length === 0) {
      return null;
    }

    let explanation = `**How I figured this out:**\n\n`;
    
    for (const step of reasoningResult.reasoningChain) {
      explanation += `${step.step}. ${step.reasoning} (${(step.confidence * 100).toFixed(0)}% confidence)\n`;
    }

    if (reasoningResult.validation) {
      explanation += `\n**Validation:**\n`;
      explanation += `• Pattern match: ${(reasoningResult.validation.signals.patternMatch * 100).toFixed(0)}%\n`;
      if (reasoningResult.validation.signals.learnedCorrection > 0) {
        explanation += `• Learned from past corrections: ${(reasoningResult.validation.signals.learnedCorrection * 100).toFixed(0)}%\n`;
      }
      if (reasoningResult.validation.signals.contextMatch > 0) {
        explanation += `• Context memory match: ${(reasoningResult.validation.signals.contextMatch * 100).toFixed(0)}%\n`;
      }
      if (reasoningResult.validation.signals.semanticSimilarity > 0) {
        explanation += `• Semantic similarity: ${(reasoningResult.validation.signals.semanticSimilarity * 100).toFixed(0)}%\n`;
      }
      explanation += `• Standard exists in database: ${reasoningResult.validation.signals.standardExists ? 'Yes' : 'No'}\n`;
    }

    return explanation;
  }
}

// Export singleton instance
const veraAdvancedReasoningEngine = new VeraAdvancedReasoningEngine();
export default veraAdvancedReasoningEngine;

