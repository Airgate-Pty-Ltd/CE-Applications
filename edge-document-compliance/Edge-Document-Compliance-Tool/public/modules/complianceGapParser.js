/**
 * COMPLIANCE GAP PARSER - v2
 * Extracts requirements from documents with confidence scoring
 * Works with pre-extracted text
 */

/**
 * Main Parser Class
 */
export class ComplianceGapParser {
  constructor(options = {}) {
    this.options = {
      minConfidence: options.minConfidence || 0.55,
      maxResults: options.maxResults || 500,
      ...options
    };
    
    this.requirements = [];
    this.metadata = {
      documentType: null,
      totalRequirementsFound: 0,
      averageConfidence: 0,
      clauseOrderCorrect: true,
      extractedAt: null,
      modelVersion: '1.0.0',
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0
    };
  }

  /**
   * Parse extracted text (for when text is already extracted)
   */
  parseText(text, filename, documentType, standardCode) {
    console.log(`\n🔍 PARSER: Starting parse of "${filename}"`);
    console.log(`   Text length: ${text.length} characters`);
    
    try {
      // Auto-detect document type if not provided
      if (!documentType) {
        documentType = this.detectDocumentType(text, filename, standardCode);
      }

      this.metadata.documentType = documentType;
      console.log(`✅ Document type detected: ${documentType}`);

      // Extract requirements based on type
      this.requirements = [];
      
      switch(documentType) {
        case 'STANDARD':
          this.requirements = this.extractStandardRequirements(text, standardCode);
          break;
        case 'REGULATION':
          this.requirements = this.extractRegulationRequirements(text, standardCode);
          break;
        case 'CUSTOMER':
          this.requirements = this.extractCustomerRequirements(text, standardCode);
          break;
        default:
          throw new Error(`Unknown document type: ${documentType}`);
      }

      console.log(`✅ Raw extraction: ${this.requirements.length} requirements found`);

      // Validate and sort
      this.validateAndSort(documentType);

      // Calculate metadata
      this.metadata.totalRequirementsFound = this.requirements.length;
      this.metadata.averageConfidence = this.calculateAverageConfidence();
      this.metadata.extractedAt = new Date().toISOString();

      // Count confidence levels
      this.metadata.highConfidence = this.requirements.filter(r => r.confidence > 0.80).length;
      this.metadata.mediumConfidence = this.requirements.filter(r => r.confidence >= 0.65 && r.confidence <= 0.80).length;
      this.metadata.lowConfidence = this.requirements.filter(r => r.confidence < 0.65).length;

      console.log(`\n✅ PARSER COMPLETE`);
      console.log(`   Total: ${this.metadata.totalRequirementsFound}`);
      console.log(`   High confidence: ${this.metadata.highConfidence} (>0.80)`);
      console.log(`   Medium confidence: ${this.metadata.mediumConfidence} (0.65-0.80)`);
      console.log(`   Low confidence: ${this.metadata.lowConfidence} (<0.65)`);
      console.log(`   Average confidence: ${(this.metadata.averageConfidence * 100).toFixed(1)}%`);
      console.log(`   Clause order correct: ${this.metadata.clauseOrderCorrect ? '✅ Yes' : '❌ No'}`);

      return {
        success: true,
        requirements: this.requirements,
        metadata: this.metadata
      };

    } catch (error) {
      console.error(`❌ Parser error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect document type from content and filename
   */
  detectDocumentType(text, filename, standardCode) {
    const textLower = text.toLowerCase();
    const filenameLower = filename.toLowerCase();

    // Check for Standards (ISO, AS, IATF)
    const standardPatterns = [
      /iso\s*9001/i,
      /as\s*9100/i,
      /iatf\s*16949/i,
      /iso\s*13485/i,
      /quality\s+management\s+system/i,
      /clause\s+[0-9]+\.[0-9]+/i,
    ];

    if (standardPatterns.some(p => p.test(textLower) || p.test(filenameLower))) {
      return 'STANDARD';
    }

    // Check for Regulations (FAA, CASA, EASA)
    const regulationPatterns = [
      /part\s*21/i,
      /part\s*145/i,
      /cfr\s*\d+/i,
      /casa\s*part/i,
      /faa/i,
      /easa\s*145/i,
      /section\s+\d+\.\d+/i,
      /regulatory/i,
    ];

    if (regulationPatterns.some(p => p.test(textLower) || p.test(filenameLower))) {
      return 'REGULATION';
    }

    // Check for Customer Requirements (Boeing, Airbus, etc.)
    const customerPatterns = [
      /supplier\s+quality/i,
      /quality\s+requirements/i,
      /purchase\s+order/i,
      /SQ[-\s]?\d{2,4}/i,
      /boeing|airbus|lockheed|raytheon|northrop|gulfstream/i,
      /customer\s+specification/i,
    ];

    if (customerPatterns.some(p => p.test(textLower) || p.test(filenameLower))) {
      return 'CUSTOMER';
    }

    // Default to STANDARD
    return 'STANDARD';
  }

  /**
   * Extract requirements from Standards
   */
  extractStandardRequirements(text, standardCode) {
    const requirements = [];
    const lines = text.split('\n');

    let currentClause = null;
    let clauseContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Match clause headers: 4.1, 8.5.3, etc.
      const clauseMatch = line.match(/^([\d.]+)\s+([A-Za-z][^:]*?)(?:\s*:|$)/);
      
      if (clauseMatch) {
        // Process previous clause
        if (currentClause && clauseContent.length > 0) {
          this.processStandardClause(requirements, currentClause, clauseContent);
        }

        currentClause = {
          number: clauseMatch[1],
          title: clauseMatch[2].trim()
        };
        clauseContent = [];
        continue;
      }

      // Collect requirement lines
      if (currentClause && this.isRequirementSentence(line)) {
        clauseContent.push(line);
      }
    }

    // Process final clause
    if (currentClause && clauseContent.length > 0) {
      this.processStandardClause(requirements, currentClause, clauseContent);
    }

    return requirements;
  }

  /**
   * Process a single standard clause
   */
  processStandardClause(requirements, clause, content) {
    const fullText = content.join(' ').substring(0, 2000);

    // Split by sentence terminators
    const sentences = fullText
      .split(/[.;]\s+/)
      .filter(s => s.length > 20 && this.isRequirementSentence(s))
      .slice(0, 8); // Max 8 requirements per clause

    if (sentences.length > 0) {
      sentences.forEach(sentence => {
        const req = this.buildRequirement(
          clause.number,
          sentence.trim(),
          clause.title,
          'STANDARD'
        );
        requirements.push(req);
      });
    } else {
      // Use whole clause as single requirement
      const req = this.buildRequirement(
        clause.number,
        fullText.substring(0, 500),
        clause.title,
        'STANDARD'
      );
      requirements.push(req);
    }
  }

  /**
   * Extract requirements from Regulations
   */
  extractRegulationRequirements(text, standardCode) {
    const requirements = [];
    const lines = text.split('\n');

    let currentSection = null;
    let sectionContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Match section headers: 21.139, 145.143, etc.
      const sectionMatch = line.match(/(?:§\s+)?(?:part\s+)?(\d+)[.\s]+(\d+)(?:\s|\.|\(|$)/i);
      
      if (sectionMatch) {
        // Process previous section
        if (currentSection && sectionContent.length > 0) {
          this.processRegulationSection(requirements, currentSection, sectionContent);
        }

        currentSection = {
          number: `${sectionMatch[1]}.${sectionMatch[2]}`,
          title: line.substring(sectionMatch[0].length).trim()
        };
        sectionContent = [];
        continue;
      }

      // Collect section content
      if (currentSection && this.isRequirementSentence(line)) {
        sectionContent.push(line);
      }
    }

    // Process final section
    if (currentSection && sectionContent.length > 0) {
      this.processRegulationSection(requirements, currentSection, sectionContent);
    }

    return requirements;
  }

  /**
   * Process a regulation section
   */
  processRegulationSection(requirements, section, content) {
    const fullText = content.join(' ').substring(0, 2000);

    // Look for subsections (a), (b), (1), (2)
    const subsections = fullText.match(/\([a-z0-9]+\)\s+([^()]{30,}?)(?=\([a-z0-9]+\)|$)/gi);

    if (subsections && subsections.length > 0) {
      subsections.slice(0, 5).forEach(sub => {
        const text = sub.replace(/^\([^)]+\)\s+/, '').trim();
        if (this.isRequirementSentence(text)) {
          const req = this.buildRequirement(
            section.number,
            text,
            section.title,
            'REGULATION'
          );
          requirements.push(req);
        }
      });
    } else {
      // Single requirement for the section
      const req = this.buildRequirement(
        section.number,
        fullText.substring(0, 500),
        section.title,
        'REGULATION'
      );
      requirements.push(req);
    }
  }

  /**
   * Extract requirements from Customer documents
   */
  extractCustomerRequirements(text, standardCode) {
    const requirements = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 20) continue;

      // Match requirement patterns: SQ-001, SQ001, A-1501, etc.
      const reqMatch = trimmed.match(/^([A-Z]+[-\s]?\d{2,4})\s*[:.\s]\s*(.+?)$/i);

      if (reqMatch) {
        const ref = reqMatch[1].replace(/\s+/g, '');
        const text = reqMatch[2].substring(0, 500);

        const req = this.buildRequirement(
          ref,
          text,
          text.substring(0, 80),
          'CUSTOMER'
        );
        requirements.push(req);
      }
    }

    return requirements;
  }

  /**
   * Check if a line is a requirement sentence
   */
  isRequirementSentence(text) {
    if (!text || text.length < 15 || text.length > 3000) return false;

    // Must have an action verb or "shall"
    const hasAction = /\b(shall|must|will|should|is|are|require|manage|control|ensure|maintain|verify|document|record|establish|implement|assess|evaluate|provide|define|create|develop|review|monitor)\b/i.test(text);

    // Exclude common non-requirements
    const excluded = /^(note|example|figure|table|see|this|the organization|appendix|annex|source|author|page|version|revision)/i;

    return hasAction && !excluded.test(text);
  }

  /**
   * Build a requirement object with confidence score
   */
  buildRequirement(clauseNumber, text, title, type) {
    let confidence = 0.60; // Base

    // Keyword boost
    if (/\b(shall|must)\b/i.test(text)) {
      confidence += 0.20; // Strong mandatory
    } else if (/\b(will|should)\b/i.test(text)) {
      confidence += 0.10;
    }

    // Clause format boost
    if (/^\d+(\.\d+)*$/.test(clauseNumber) || /^[A-Z]+\d+/.test(clauseNumber)) {
      confidence += 0.08;
    }

    // Context keywords boost
    const contextKeywords = ['process', 'procedure', 'policy', 'control', 'manage', 'monitor', 'document', 'record', 'maintain', 'ensure', 'verify', 'audit'];
    if (contextKeywords.some(kw => text.toLowerCase().includes(kw))) {
      confidence += 0.05;
    }

    // Title context boost
    if (title && title.length > 8) {
      confidence += 0.03;
    }

    // Penalty for non-requirement patterns
    if (/^(note:|see|figure|table)/i.test(text)) {
      confidence -= 0.15;
    }

    // Cap between 0.55 and 0.95
    confidence = Math.min(0.95, Math.max(0.55, confidence));

    return {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clauseNumber,
      clauseTitle: title || 'No title',
      text: text.trim().substring(0, 1000),
      type,
      confidence: Math.round(confidence * 100) / 100,
      keywords: this.extractKeywords(text),
      mandatory: /\b(shall|must)\b/i.test(text),
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const keywords = new Set();

    // Mandatory keywords
    if (/\bshall\b/i.test(text)) keywords.add('shall');
    if (/\bmust\b/i.test(text)) keywords.add('must');

    // Action keywords
    const actionKeywords = [
      'process', 'procedure', 'policy', 'control', 'manage', 'monitor',
      'document', 'record', 'maintain', 'ensure', 'verify', 'audit',
      'define', 'establish', 'implement', 'review', 'assess'
    ];

    for (const keyword of actionKeywords) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(text)) {
        keywords.add(keyword);
      }
    }

    return Array.from(keywords);
  }

  /**
   * Validate and sort requirements
   */
  validateAndSort(documentType) {
    // Remove duplicates
    const seen = new Set();
    this.requirements = this.requirements.filter(req => {
      const key = `${req.clauseNumber}:${req.text.substring(0, 50)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort based on type
    if (documentType === 'STANDARD' || documentType === 'REGULATION') {
      this.requirements.sort((a, b) => this.compareNumbers(a.clauseNumber, b.clauseNumber));
    } else {
      // Customer - alphanumeric
      this.requirements.sort((a, b) => a.clauseNumber.localeCompare(b.clauseNumber, undefined, { numeric: true }));
    }

    // Verify order
    this.metadata.clauseOrderCorrect = this.verifyOrder();
  }

  /**
   * Compare numbers in clause format
   */
  compareNumbers(a, b) {
    const aParts = a.split(/[.,\-]/).map(p => {
      const n = parseInt(p, 10);
      return isNaN(n) ? p : n;
    });

    const bParts = b.split(/[.,\-]/).map(p => {
      const n = parseInt(p, 10);
      return isNaN(n) ? p : n;
    });

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const ap = aParts[i] ?? 0;
      const bp = bParts[i] ?? 0;
      
      if (typeof ap === 'number' && typeof bp === 'number') {
        if (ap !== bp) return ap - bp;
      } else {
        const aStr = String(ap);
        const bStr = String(bp);
        if (aStr !== bStr) return aStr.localeCompare(bStr);
      }
    }

    return 0;
  }

  /**
   * Verify sort order is correct
   */
  verifyOrder() {
    if (this.requirements.length < 2) return true;

    for (let i = 1; i < Math.min(this.requirements.length, 20); i++) {
      const prev = this.requirements[i - 1].clauseNumber;
      const curr = this.requirements[i].clauseNumber;

      if (this.compareNumbers(prev, curr) > 0) {
        console.warn(`⚠️  Order issue: ${prev} comes before ${curr}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate average confidence
   */
  calculateAverageConfidence() {
    if (this.requirements.length === 0) return 0;
    
    const sum = this.requirements.reduce((acc, req) => acc + req.confidence, 0);
    return Math.round((sum / this.requirements.length) * 100) / 100;
  }
}

export default ComplianceGapParser;

