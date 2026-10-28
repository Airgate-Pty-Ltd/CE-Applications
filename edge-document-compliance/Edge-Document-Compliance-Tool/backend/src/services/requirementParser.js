/**
 * Advanced Requirement Parser Service
 * Learns to extract requirements from compliance documents with high accuracy
 * 
 * Features:
 * - Pattern recognition for requirement statements
 * - Validation & completeness checking
 * - User feedback & correction tracking
 * - Learning engine that improves over time
 * - Accuracy metrics & confidence scoring
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== PARSING KNOWLEDGE BASE =====

/**
 * Patterns to look for in compliance documents
 * These are learned patterns that improve over time
 */
const PARSING_RULES = {
  mandatory_keywords: [
    'shall', 'must', 'will', 'required', 'mandatory',
    'shall not', 'must not', 'prohibited', 'is required',
    'the organization shall', 'the company must'
  ],
  
  advisory_keywords: [
    'should', 'may', 'recommend', 'consider', 'encouraged',
    'can', 'capable of'
  ],
  
  requirement_patterns: [
    // ISO patterns: "4.1", "4.1.1", "Section 4.1"
    /^[\s]*[\d]+\.[\d]+(?:\.[\d]+)*[\s]*[-:]?[\s]*/gm,
    
    // Numbered list patterns: "a)", "1)", "(a)"
    /^[\s]*(?:\()?[a-z\d]+(?:\))?[\s]*[-:]?[\s]*/gm,
    
    // Title/header patterns for sections
    /^[\s]*[A-Z][A-Z\s]+[\s]*$/gm,
  ],
  
  context_keywords: {
    responsibility: ['responsible', 'responsibility', 'accountable', 'owner', 'shall be responsible'],
    process: ['process', 'procedure', 'workflow', 'sequence', 'steps', 'method'],
    resource: ['resource', 'personnel', 'equipment', 'tool', 'material', 'staff'],
    control: ['control', 'manage', 'monitor', 'track', 'review', 'audit'],
    documentation: ['document', 'record', 'file', 'log', 'maintain', 'archive'],
    communication: ['communicate', 'inform', 'notify', 'report', 'escalate']
  }
};

// ===== LEARNING DATABASE =====
const LEARNING_DB = {
  parsing_events: [],      // Every parsing event
  corrections: [],         // User corrections
  accuracy_metrics: {},    // Accuracy per standard
  learned_patterns: {},    // Patterns learned from corrections
  model_versions: []       // Version history
};

const LEARNING_FILE = path.join(__dirname, '../../parser-learning.json');

// Load learning data
function loadLearningData() {
  if (fs.existsSync(LEARNING_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf8'));
      Object.assign(LEARNING_DB, data);
      console.log(`✓ Loaded learning data with ${LEARNING_DB.corrections.length} corrections`);
    } catch (e) {
      console.error('Error loading learning data:', e.message);
    }
  }
}

function saveLearningData() {
  try {
    fs.writeFileSync(LEARNING_FILE, JSON.stringify(LEARNING_DB, null, 2));
  } catch (e) {
    console.error('Error saving learning data:', e.message);
  }
}

loadLearningData();

// ===== REQUIREMENT EXTRACTION ENGINE =====

export class RequirementExtractor {
  constructor(standardCode, version = '1.0.0') {
    this.standardCode = standardCode;
    this.version = version;
    this.requirements = [];
    this.metadata = {
      extractedAt: new Date(),
      totalRequirements: 0,
      confidence: 0,
      validationStatus: 'pending'
    };
  }

  /**
   * Extract requirements from text
   */
  extractRequirements(text) {
    const lines = text.split('\n');
    const extracted = [];
    
    let currentSection = null;
    let currentClause = null;
    let currentClauseTitle = null; // Track clause titles
    let requirementBuffer = [];
    let lastRequirementLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || line.length < 5) {
        // Empty line breaks requirement continuation
        if (requirementBuffer.length > 0 && i - lastRequirementLineIndex > 1) {
          this.finalizeRequirement(extracted, currentSection, currentClause, requirementBuffer);
          requirementBuffer = [];
        }
        continue;
      }

      // ===== FILTER OUT NON-REQUIREMENT PATTERNS =====
      if (this.isNonRequirementLine(line)) {
        // Non-requirement line breaks continuation
        if (requirementBuffer.length > 0) {
          this.finalizeRequirement(extracted, currentSection, currentClause, requirementBuffer);
          requirementBuffer = [];
        }
        continue;
      }

      // ===== SECTION DETECTION =====
      if (this.isSectionHeader(line)) {
        // Save previous requirement if exists
        if (requirementBuffer.length > 0) {
          this.finalizeRequirement(extracted, currentSection, currentClause, requirementBuffer);
          requirementBuffer = [];
        }
        currentSection = line;
        continue;
      }

      // ===== CLAUSE/SUBSECTION DETECTION =====
      const clauseMatch = this.extractClauseNumber(line);
      if (clauseMatch) {
        // Save previous requirement
        if (requirementBuffer.length > 0) {
          this.finalizeRequirement(extracted, currentSection, currentClause, currentClauseTitle, requirementBuffer);
          requirementBuffer = [];
        }
        currentClause = clauseMatch.number;
        
        // Extract clause title (text after clause number)
        const remainder = line.substring(clauseMatch.end).trim();
        
        // Check if remainder looks like a title (not a requirement)
        if (remainder && !this.isRequirementLine(remainder) && remainder.length > 0) {
          // This is likely a clause title/header
          currentClauseTitle = remainder;
          // Look ahead for the actual requirement text
          let foundRequirement = false;
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j].trim();
            if (nextLine && this.isRequirementLine(nextLine)) {
              requirementBuffer.push(nextLine);
              lastRequirementLineIndex = j;
              foundRequirement = true;
              i = j; // Skip ahead
              break;
            }
          }
          if (!foundRequirement) {
            currentClauseTitle = null; // No requirement found, reset title
          }
        } else if (remainder && this.isRequirementLine(remainder)) {
          // Clause number followed directly by requirement
          requirementBuffer.push(remainder);
          lastRequirementLineIndex = i;
          currentClauseTitle = null; // No separate title
        } else {
          currentClauseTitle = null;
        }
        continue;
      }

      // ===== REQUIREMENT TEXT DETECTION =====
      if (this.isRequirementLine(line)) {
        // Check if previous requirement is incomplete (ends with colon, "include:", "shall:", etc.)
        if (requirementBuffer.length > 0) {
          const lastLine = requirementBuffer[requirementBuffer.length - 1];
          const isIncomplete = this.isIncompleteRequirement(lastLine);
          
          if (isIncomplete) {
            // Previous requirement is incomplete, continue reading
            requirementBuffer.push(line);
            lastRequirementLineIndex = i;
          } else {
            // Previous requirement is complete, save it
            this.finalizeRequirement(extracted, currentSection, currentClause, currentClauseTitle, requirementBuffer);
            requirementBuffer = [line];
            lastRequirementLineIndex = i;
          }
        } else {
          requirementBuffer.push(line);
          lastRequirementLineIndex = i;
        }
      } else if (requirementBuffer.length > 0) {
        // Continuation of previous requirement
        const lastLine = requirementBuffer[requirementBuffer.length - 1];
        const isIncomplete = this.isIncompleteRequirement(lastLine);
        
        // Continue reading if:
        // 1. Requirement is incomplete (ends with colon/list indicator)
        // 2. OR it's within 5 lines and looks like continuation (increased from 2)
        // 3. OR it's a list item (bullet, number, letter)
        const isListItem = this.isListItem(line);
        const isContinuation = this.isContinuationLine(line);
        const withinRange = i - lastRequirementLineIndex <= 5; // Increased from 2
        
        if (isIncomplete || (withinRange && (isContinuation || isListItem))) {
          requirementBuffer.push(line);
          lastRequirementLineIndex = i;
        } else {
          // Too far or doesn't look like continuation - finalize previous
          this.finalizeRequirement(extracted, currentSection, currentClause, currentClauseTitle, requirementBuffer);
          requirementBuffer = [];
        }
      }
    }

    // Save last requirement
    if (requirementBuffer.length > 0) {
      this.finalizeRequirement(extracted, currentSection, currentClause, currentClauseTitle, requirementBuffer);
    }

    // Post-process: filter out low-quality requirements
    const filtered = this.filterRequirements(extracted);

    this.requirements = filtered;
    this.calculateMetadata();
    return filtered;
  }

  /**
   * Finalize and add a requirement if it meets quality criteria
   */
  finalizeRequirement(extracted, section, clause, clauseTitle, buffer) {
    const text = buffer.join(' ').trim();
    
    // Minimum quality checks
    if (text.length < 20) return; // Too short
    if (text.length > 500) return; // Too long (likely multiple requirements or example)
    
    // Must contain at least one mandatory keyword or strong context
    const lower = text.toLowerCase();
    const hasMandatory = PARSING_RULES.mandatory_keywords.some(kw => lower.includes(kw));
    const contextCount = Object.values(PARSING_RULES.context_keywords)
      .flat()
      .filter(kw => lower.includes(kw)).length;
    
    if (!hasMandatory && contextCount < 2) return; // Not strong enough
    
    const requirement = this.createRequirement(section, clause, clauseTitle, text);
    
    // Only add if confidence is reasonable
    if (requirement.confidence >= 0.5) {
      extracted.push(requirement);
    }
  }

  /**
   * Check if a requirement line is incomplete (needs continuation)
   * Examples: "These shall include:", "The organization shall:", ends with colon
   */
  isIncompleteRequirement(line) {
    if (!line) return false;
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    
    // Ends with colon - likely incomplete
    if (trimmed.endsWith(':')) {
      return true;
    }
    
    // Contains incomplete patterns
    const incompletePatterns = [
      /these shall include/i,
      /shall include/i,
      /shall be/i,
      /shall have/i,
      /shall provide/i,
      /shall ensure/i,
      /shall establish/i,
      /shall maintain/i,
      /shall implement/i,
      /shall document/i,
      /shall retain/i,
      /shall review/i,
      /shall conduct/i,
      /shall determine/i,
      /shall identify/i,
      /shall evaluate/i,
      /shall monitor/i,
      /shall measure/i,
      /shall analyze/i,
      /shall plan/i,
      /shall address/i,
      /shall consider/i,
      /shall take into account/i,
      /shall take into consideration/i
    ];
    
    // Check if line ends with an incomplete pattern (before colon)
    for (const pattern of incompletePatterns) {
      if (pattern.test(trimmed) && trimmed.endsWith(':')) {
        return true;
      }
    }
    
    // If line is very short and ends with colon, it's likely incomplete
    if (trimmed.length < 80 && trimmed.endsWith(':')) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if line is a list item (bullet point, numbered, lettered)
   */
  isListItem(line) {
    if (!line) return false;
    const trimmed = line.trim();
    
    // Bullet points
    if (/^[•\-\*]\s/.test(trimmed)) {
      return true;
    }
    
    // Numbered list: "1.", "1)", "(1)", "a.", "a)", "(a)"
    if (/^[\d]+[\.\)]\s/.test(trimmed) || 
        /^\([\d]+\)\s/.test(trimmed) ||
        /^[a-z][\.\)]\s/.test(trimmed) ||
        /^\([a-z]\)\s/.test(trimmed)) {
      return true;
    }
    
    // Lowercase letter followed by period or parenthesis
    if (/^[a-z]\)\s/.test(trimmed) || /^[a-z]\.\s/.test(trimmed)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if line is a continuation of a requirement (not a new requirement)
   */
  isContinuationLine(line) {
    const lower = line.toLowerCase();
    
    // Continuation lines typically:
    // - Don't start with clause numbers
    // - Don't start with capital letters (unless proper nouns)
    // - Don't contain new requirement keywords at the start
    // - Are shorter or part of a list
    
    // If it starts with a clause number pattern, it's not continuation
    if (/^[\d]+(?:\.[\d]+)*\s/.test(line)) {
      return false;
    }
    
    // If it starts with a mandatory keyword, it's a new requirement
    const startsWithMandatory = PARSING_RULES.mandatory_keywords.some(kw => 
      lower.startsWith(kw) || lower.match(new RegExp(`^[^a-z]*${kw}\\s`))
    );
    if (startsWithMandatory) {
      return false;
    }
    
    // If it's a very short line (likely a list item continuation)
    if (line.length < 50) {
      return true;
    }
    
    // If it starts with lowercase or is clearly continuation
    if (/^[a-z]/.test(line) || /^[•\-\*]/.test(line)) {
      return true;
    }
    
    // If it's a list item, it's continuation
    if (this.isListItem(line)) {
      return true;
    }
    
    // Otherwise, be conservative - don't treat as continuation
    return false;
  }

  /**
   * Check if line should be excluded (non-requirement patterns)
   */
  isNonRequirementLine(line) {
    const lower = line.toLowerCase();
    
    // CRITICAL: Filter table of contents - lines with more than 5 periods are TOC entries
    const dotCount = (line.match(/\./g) || []).length;
    if (dotCount > 5) {
      return true; // Table of contents entry
    }
    
    // Exclude patterns that are clearly not requirements:
    const excludePatterns = [
      /^note\s*[:)]/i,
      /^example\s*[:)]/i,
      /^see\s+/i,
      /^refer\s+to/i,
      /^figure\s+\d+/i,
      /^table\s+\d+/i,
      /^annex\s+[a-z]/i,
      /^appendix\s+[a-z]/i,
      /^page\s+\d+/i,
      /^©\s*\d{4}/i,
      /^all\s+rights\s+reserved/i,
      /^confidential/i,
      /^proprietary/i,
      /^footnote/i,
      /^endnote/i,
      /^bibliography/i,
      /^references?/i,
      /^acknowledg/i,
      /^abstract/i,
      /^summary/i,
      /^contents?/i,
      /^table\s+of\s+contents/i,
      /^\d+\s*$/, // Just a number
      /^[a-z]\)\s*$/, // Just a letter
      /^[\s\-\*•]+$/, // Just bullets/dashes
    ];
    
    if (excludePatterns.some(pattern => pattern.test(line))) {
      return true;
    }
    
    // Exclude very short lines that are likely headers or formatting
    if (line.length < 10 && !lower.includes('shall') && !lower.includes('must')) {
      return true;
    }
    
    // Exclude lines that are mostly numbers/symbols
    const alphanumericRatio = (line.match(/[a-zA-Z]/g) || []).length / line.length;
    if (alphanumericRatio < 0.3) {
      return true;
    }
    
    return false;
  }

  /**
   * Filter requirements to remove duplicates and low-quality entries
   */
  filterRequirements(requirements) {
    const filtered = [];
    const seenTexts = new Set();
    
    for (const req of requirements) {
      // Normalize text for duplicate detection
      const normalized = req.text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100); // Use first 100 chars for comparison
      
      // Skip duplicates
      if (seenTexts.has(normalized)) {
        continue;
      }
      seenTexts.add(normalized);
      
      // Skip if too short or too long
      if (req.text.length < 20 || req.text.length > 500) {
        continue;
      }
      
      // Skip if confidence is too low
      if (req.confidence < 0.5) {
        continue;
      }
      
      // Skip if it's clearly not a requirement (examples, notes, etc.)
      const lower = req.text.toLowerCase();
      if (lower.startsWith('note:') || 
          lower.startsWith('example:') ||
          lower.startsWith('see ') ||
          lower.match(/^figure\s+\d+/)) {
        continue;
      }
      
      filtered.push(req);
    }
    
    return filtered;
  }

  /**
   * Check if line is a section header
   */
  isSectionHeader(line) {
    // ALL CAPS, multiple words, no mandatory keywords
    if (line === line.toUpperCase() && line.split(' ').length >= 2) {
      const hasMandatory = PARSING_RULES.mandatory_keywords.some(kw => 
        line.toLowerCase().includes(kw)
      );
      return !hasMandatory;
    }
    return false;
  }

  /**
   * Extract clause number (e.g., "4.1", "4.1.1")
   */
  extractClauseNumber(line) {
    // Match patterns like: 4.1, 4.1.1, 4.1.1.1, etc.
    const match = line.match(/^([\d]+(?:\.[\d]+)*)\s*[-:]?\s*/);
    if (match) {
      return {
        number: match[1],
        end: match[0].length
      };
    }
    return null;
  }

  /**
   * Check if line contains a requirement
   * Made more strict to reduce false positives
   */
  isRequirementLine(line) {
    const lower = line.toLowerCase();
    
    // Minimum length check
    if (line.length < 15) return false;
    
    // Must contain at least one mandatory keyword
    const hasMandatory = PARSING_RULES.mandatory_keywords.some(kw => 
      lower.includes(kw)
    );
    
    if (!hasMandatory) {
      // Without mandatory keyword, need strong context indicators
      const contextCount = Object.values(PARSING_RULES.context_keywords)
        .flat()
        .filter(kw => lower.includes(kw)).length;
      
      // Require at least 3 context keywords (increased from 2)
      if (contextCount < 3) return false;
      
      // Also check that it's not just a list of keywords
      const wordCount = line.split(/\s+/).length;
      if (wordCount < 8) return false; // Must be a substantial sentence
    }

    // Exclude if it's clearly a header or formatting
    if (line === line.toUpperCase() && line.split(' ').length < 4) {
      return false;
    }
    
    // Exclude if it starts with common non-requirement patterns
    if (lower.match(/^(note|example|see|refer|figure|table|annex|appendix|page|©|confidential|proprietary|footnote|endnote|bibliography|references?|acknowledg|abstract|summary|contents?|table\s+of\s+contents)/)) {
      return false;
    }

    return true;
  }

  /**
   * Create requirement object with confidence scoring
   */
  createRequirement(section, clause, clauseTitle, text) {
    const lower = text.toLowerCase();
    
    // Confidence calculation
    let confidence = 0.5; // Base confidence
    
    // +0.2 for mandatory keyword
    if (PARSING_RULES.mandatory_keywords.some(kw => lower.includes(kw))) {
      confidence += 0.2;
    }
    
    // +0.15 for context keywords
    const contextMatches = Object.values(PARSING_RULES.context_keywords)
      .flat()
      .filter(kw => lower.includes(kw)).length;
    confidence += Math.min(contextMatches * 0.05, 0.15);
    
    // +0.1 for length (more complete statements are usually requirements)
    if (text.length > 80) confidence += 0.1;
    
    // Cap at 1.0
    confidence = Math.min(confidence, 0.95);

    // Check learned patterns for this standard
    if (LEARNING_DB.learned_patterns[this.standardCode]) {
      const pattern = LEARNING_DB.learned_patterns[this.standardCode];
      if (this.matchesLearnedPattern(text, pattern)) {
        confidence += 0.1; // Boost for matching learned pattern
        confidence = Math.min(confidence, 0.99);
      }
    }

    return {
      clause: clause || null,
      clauseTitle: clauseTitle || null,
      text: text.substring(0, 1000), // Truncate very long text
      keyword: this.extractPrimaryKeyword(text),
      confidence: Math.round(confidence * 100) / 100,
      mandatory: lower.includes('shall') || lower.includes('must')
    };
  }

  /**
   * Check if text matches learned pattern
   */
  matchesLearnedPattern(text, pattern) {
    // Simple pattern matching - can be enhanced
    if (pattern.keywords) {
      return pattern.keywords.some(kw => text.toLowerCase().includes(kw));
    }
    return false;
  }

  /**
   * Extract primary keyword from requirement
   */
  extractPrimaryKeyword(text) {
    const lower = text.toLowerCase();
    
    // Find first context keyword
    for (const [category, terms] of Object.entries(PARSING_RULES.context_keywords)) {
      for (const term of terms) {
        if (lower.includes(term)) {
          return term;
        }
      }
    }
    
    // Fallback: find first significant word after "shall/must"
    const mandatoryMatch = text.match(/(?:shall|must|will)\s+(\w+)/i);
    if (mandatoryMatch) {
      return mandatoryMatch[1].toLowerCase();
    }
    
    return null;
  }

  /**
   * Validate extraction completeness
   */
  validateCompleteness() {
    const validation = {
      totalExtracted: this.requirements.length,
      highConfidence: this.requirements.filter(r => r.confidence > 0.75).length,
      mediumConfidence: this.requirements.filter(r => r.confidence >= 0.60 && r.confidence <= 0.75).length,
      lowConfidence: this.requirements.filter(r => r.confidence < 0.60).length,
      mandatoryCount: this.requirements.filter(r => r.mandatory).length,
      issues: this.identifyIssues()
    };
    
    this.metadata.validationStatus = validation.lowConfidence === 0 ? 'complete' : 'needs-review';
    return validation;
  }

  /**
   * Identify potential extraction issues
   */
  identifyIssues() {
    const issues = [];
    
    if (this.requirements.length === 0) {
      issues.push({
        severity: 'critical',
        message: 'No requirements extracted. Document may be wrong format or parser needs tuning.'
      });
    }
    
    if (this.requirements.length > 500) {
      issues.push({
        severity: 'warning',
        message: `${this.requirements.length} requirements found. May include non-requirement text.`
      });
    }
    
    const lowConfidence = this.requirements.filter(r => r.confidence < 0.60);
    if (lowConfidence.length > 0) {
      issues.push({
        severity: 'warning',
        message: `${lowConfidence.length} requirements have low confidence (<60%). Manual review recommended.`
      });
    }
    
    return issues;
  }

  /**
   * Calculate overall metadata
   */
  calculateMetadata() {
    this.metadata.totalRequirements = this.requirements.length;
    this.metadata.confidence = this.requirements.length > 0
      ? Math.round(
          this.requirements.reduce((sum, r) => sum + r.confidence, 0) / 
          this.requirements.length * 100
        ) / 100
      : 0;
  }

  /**
   * Record parsing event for learning
   */
  recordParsingEvent(documentLength) {
    LEARNING_DB.parsing_events.push({
      id: uuidv4(),
      standardCode: this.standardCode,
      documentLength,
      requirementsExtracted: this.requirements.length,
      avgConfidence: this.metadata.confidence,
      timestamp: new Date(),
      extractorVersion: this.version
    });
    saveLearningData();
  }
}

/**
 * Parse document file and extract requirements using advanced parser
 * Enhanced with GAP Analysis Engine integration for improved accuracy
 */
export async function parseDocumentWithAdvancedParser(filePath, fileExt, standardCode) {
  try {
    let text = '';
    
    if (fileExt === 'pdf') {
      // Try to parse PDF
      try {
        const pdfParse = await import('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse.default(dataBuffer);
        text = data.text;
        console.log(`✓ Extracted ${text.length} characters from PDF`);
      } catch (pdfError) {
        console.log(`⚠️  pdf-parse not available, trying to read PDF as text:`, pdfError.message);
        text = fs.readFileSync(filePath, 'utf-8');
        console.log(`✓ Read ${text.length} characters as text`);
      }
    } else if (fileExt === 'docx' || fileExt === 'doc') {
      // Try to parse Word document
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
        console.log(`✓ Extracted ${text.length} characters from Word document`);
      } catch (mammothError) {
        console.log(`⚠️  mammoth not available, reading as text:`, mammothError.message);
        text = fs.readFileSync(filePath, 'utf-8');
        console.log(`✓ Read ${text.length} characters as text`);
      }
    } else {
      // Try to read as text
      text = fs.readFileSync(filePath, 'utf-8');
      console.log(`✓ Read ${text.length} characters as text`);
    }
    
    if (!text || text.length < 100) {
      throw new Error(`Extracted text is too short (${text.length} characters). File may be corrupted or unreadable.`);
    }
    
    // Use advanced parser
    const extractor = new RequirementExtractor(standardCode, '1.0.0');
    let requirements = extractor.extractRequirements(text);
    
    // Enhance with GAP Analysis Engine if available
    try {
      const { getGapAnalysisEngine } = await import('./gapAnalysisEngine.js');
      const engine = getGapAnalysisEngine();
      
      // Try to initialize engine (may fail if knowledge pack not loaded)
      if (!engine.initialized) {
        try {
          await engine.initialize();
        } catch (initError) {
          console.log(`⚠️  GAP Analysis Engine not available: ${initError.message}`);
          console.log(`   Continuing with standard parsing...`);
        }
      }
      
      // If engine is initialized, enhance requirements with knowledge pack
      if (engine.initialized) {
        console.log(`🔍 Enhancing requirements with knowledge pack...`);
        let enhancedCount = 0;
        
        for (const req of requirements) {
          try {
            // Find similar requirements from knowledge pack
            const similar = await engine.findSimilarRequirements(
              req.text,
              standardCode,
              1
            );
            
            if (similar.length > 0 && similar[0].similarity_score > 0.7) {
              const similarReq = similar[0];
              
              // Enhance confidence based on similarity
              req.confidence = Math.min(0.95, req.confidence + (similarReq.similarity_score * 0.1));
              
              // Suggest clause number if missing
              if (!req.clauseNumber && similarReq.clause_number) {
                req.clauseNumber = similarReq.clause_number;
                req.clauseNumberSource = 'knowledge_pack';
              }
              
              // Add keywords from knowledge pack
              if (similarReq.keywords && similarReq.keywords.length > 0) {
                req.keywords = [...new Set([...(req.keywords || []), ...similarReq.keywords])];
              }
              
              // Add requirement type if missing
              if (!req.type && similarReq.requirement_type) {
                req.type = similarReq.requirement_type;
              }
              
              enhancedCount++;
            }
          } catch (enhanceError) {
            // Continue with other requirements if one fails
            console.log(`   ⚠️  Error enhancing requirement: ${enhanceError.message}`);
          }
        }
        
        console.log(`✓ Enhanced ${enhancedCount}/${requirements.length} requirements with knowledge pack`);
      }
    } catch (engineError) {
      // Engine not available, continue with standard parsing
      console.log(`⚠️  GAP Analysis Engine not available: ${engineError.message}`);
    }
    
    const validation = extractor.validateCompleteness();
    
    // Record parsing event
    extractor.recordParsingEvent(text.length);
    
    console.log(`✓ Advanced parser extracted ${requirements.length} requirements`);
    console.log(`   High confidence: ${validation.highConfidence}`);
    console.log(`   Medium confidence: ${validation.mediumConfidence}`);
    console.log(`   Low confidence: ${validation.lowConfidence}`);
    console.log(`   Average confidence: ${(extractor.metadata.confidence * 100).toFixed(1)}%`);
    
    if (validation.issues.length > 0) {
      console.log(`   Issues:`, validation.issues.map(i => i.message).join('; '));
    }
    
    return requirements;
    
  } catch (error) {
    console.error(`❌ Error parsing document with advanced parser:`, error);
    throw error;
  }
}

export { LEARNING_DB, saveLearningData, loadLearningData };

