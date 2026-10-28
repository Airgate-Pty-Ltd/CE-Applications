/**
 * Compliance GAP Analyzer
 * Analyzes client documents against extracted requirements to identify compliance gaps
 */

import { query } from '../database/connection.js';
import { getEmbeddingService } from './embeddingService.js';
import { getComplianceGapFrameworkLoader } from './complianceGapFrameworkLoader.js';

class ComplianceGapAnalyzer {
  constructor() {
    this.embeddingService = null;
    this.frameworkLoader = null;
  }

  /**
   * Initialize the analyzer
   */
  async initialize() {
    if (!this.embeddingService) {
      this.embeddingService = getEmbeddingService();
    }
    if (!this.frameworkLoader) {
      this.frameworkLoader = getComplianceGapFrameworkLoader();
      await this.frameworkLoader.load();
    }
  }

  /**
   * Perform GAP analysis for a client against a standard
   * @param {string} customerId - Customer/tenant ID
   * @param {string} standardId - Standard ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} GAP analysis results
   */
  async analyzeComplianceGaps(customerId, standardId, options = {}) {
    await this.initialize();

    const {
      documentIds = null, // Specific documents to analyze, or null for all
      minConfidence = 0.7, // Minimum similarity confidence
      includePartialMatches = true,
      sector = null, // Sector code (e.g., 'aerospace', 'medical')
      regulator = null // Regulator code (e.g., 'faa', 'easa', 'iso')
    } = options;

    // Get all requirements for the standard
    const requirementsResult = await query(
      `SELECT requirement_id, clause_number, requirement_text, keyword, confidence
       FROM compliance_lib.requirements
       WHERE standard_id = $1
       ORDER BY clause_number`,
      [standardId]
    );

    const requirements = requirementsResult.rows;
    if (requirements.length === 0) {
      throw new Error(`No requirements found for standard ${standardId}`);
    }

    // Get standard metadata
    const standardResult = await query(
      `SELECT standard_id, code, name FROM compliance_lib.standards WHERE standard_id = $1`,
      [standardId]
    );
    const standard = standardResult.rows[0];

    // Get customer documents
    let documentsQuery = `
      SELECT document_id, file_name, file_path, file_type, uploaded_at
      FROM customer_data.documents
      WHERE customer_id = $1
    `;
    const queryParams = [customerId];

    if (documentIds && documentIds.length > 0) {
      documentsQuery += ` AND document_id = ANY($2)`;
      queryParams.push(documentIds);
    }

    documentsQuery += ` ORDER BY uploaded_at DESC`;

    const documentsResult = await query(documentsQuery, queryParams);
    const documents = documentsResult.rows;

    if (documents.length === 0) {
      return {
        standard: standard,
        customerId: customerId,
        totalRequirements: requirements.length,
        analyzedDocuments: 0,
        gaps: [],
        covered: [],
        partialMatches: [],
        coverage: {
          total: requirements.length,
          covered: 0,
          partiallyCovered: 0,
          notCovered: requirements.length,
          coveragePercentage: 0
        },
        message: 'No documents found for analysis'
      };
    }

    // Extract text from documents (simplified - in production, use proper parsing)
    const documentTexts = await this.extractDocumentTexts(documents);

    // Analyze each requirement against documents
    const gaps = [];
    const covered = [];
    const partialMatches = [];

    for (const requirement of requirements) {
      const analysis = await this.analyzeRequirement(
        requirement,
        documentTexts,
        minConfidence
      );

      // Apply confidence framework
      const confidenceSignal = this.frameworkLoader.getConfidenceSignal(analysis.confidence);

      if (analysis.status === 'covered') {
        covered.push({
          requirementId: requirement.requirement_id,
          clauseNumber: requirement.clause_number,
          requirementText: requirement.requirement_text,
          confidence: analysis.confidence,
          confidenceLevel: confidenceSignal.level,
          confidenceIndicator: confidenceSignal.indicator,
          veraLanguage: confidenceSignal.vera_language,
          matchedDocuments: analysis.matchedDocuments,
          matchedText: analysis.matchedText
        });
      } else if (analysis.status === 'partial' && includePartialMatches) {
        partialMatches.push({
          requirementId: requirement.requirement_id,
          clauseNumber: requirement.clause_number,
          requirementText: requirement.requirement_text,
          confidence: analysis.confidence,
          confidenceLevel: confidenceSignal.level,
          confidenceIndicator: confidenceSignal.indicator,
          veraLanguage: confidenceSignal.vera_language,
          action: confidenceSignal.action,
          userQuery: confidenceSignal.user_query,
          matchedDocuments: analysis.matchedDocuments,
          matchedText: analysis.matchedText,
          gapReason: analysis.gapReason
        });
      } else {
        // Classify gap severity using framework
        const gapObj = {
          requirementId: requirement.requirement_id,
          clauseNumber: requirement.clause_number,
          requirementText: requirement.requirement_text,
          hasEvidence: false,
          isRegulatory: requirement.requirement_text?.toLowerCase().includes('faa') || 
                       requirement.requirement_text?.toLowerCase().includes('part'),
          gapReason: 'No matching content found in client documents'
        };
        
        const severityClassification = this.frameworkLoader.classifyGapSeverity(
          gapObj,
          sector,
          regulator
        );

        gaps.push({
          ...gapObj,
          severity: severityClassification.severity,
          severityIndicator: severityClassification.indicator,
          severityDescription: severityClassification.description,
          veraResponse: severityClassification.vera_response,
          confidence: analysis.confidence,
          confidenceLevel: confidenceSignal.level,
          confidenceIndicator: confidenceSignal.indicator,
          veraLanguage: confidenceSignal.vera_language
        });
      }
    }

    // Apply sector-specific context if available
    if (sector && this.frameworkLoader) {
      const sectorContext = this.frameworkLoader.getSectorContext(sector);
      if (sectorContext) {
        // Apply sector risk multipliers to gap severity scores
        gaps.forEach(gap => {
          // Check if gap matches common pitfalls
          const matchingPitfall = sectorContext.common_pitfalls?.find(p => {
            const clauseMatch = gap.clauseNumber?.includes(p.clause.split(' ')[1] || '');
            return clauseMatch;
          });
          
          if (matchingPitfall) {
            gap.sectorTip = matchingPitfall.vera_tip;
            gap.commonGap = matchingPitfall.common_gap;
          }
        });
      }
    }

    // Calculate coverage statistics
    const coverage = {
      total: requirements.length,
      covered: covered.length,
      partiallyCovered: partialMatches.length,
      notCovered: gaps.length,
      coveragePercentage: Math.round((covered.length / requirements.length) * 100)
    };

    // Group gaps by severity for summary
    const gapSummary = {
      critical: gaps.filter(g => g.severity === 'CRITICAL').length,
      high: gaps.filter(g => g.severity === 'HIGH').length,
      medium: gaps.filter(g => g.severity === 'MEDIUM').length,
      low: gaps.filter(g => g.severity === 'LOW').length
    };

    return {
      standard: standard,
      customerId: customerId,
      totalRequirements: requirements.length,
      analyzedDocuments: documents.length,
      documents: documents.map(d => ({
        id: d.document_id,
        name: d.file_name,
        type: d.file_type
      })),
      gaps: gaps,
      gapSummary: gapSummary,
      covered: covered,
      partialMatches: partialMatches,
      coverage: coverage,
      sector: sector || null,
      regulator: regulator || null,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Analyze a single requirement against document texts
   * @param {Object} requirement - Requirement object
   * @param {Array} documentTexts - Array of {documentId, text} objects
   * @param {number} minConfidence - Minimum confidence threshold
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeRequirement(requirement, documentTexts, minConfidence = 0.7) {
    if (documentTexts.length === 0) {
      return {
        status: 'not_covered',
        confidence: 0,
        matchedDocuments: [],
        matchedText: null
      };
    }

    // Use semantic search to find similar content
    const requirementEmbedding = await this.embeddingService.embed(requirement.requirement_text);
    
    let bestMatch = null;
    let bestConfidence = 0;
    const matches = [];

    for (const docText of documentTexts) {
      // Simple text matching first (faster)
      const lowerReq = requirement.requirement_text.toLowerCase();
      const lowerDoc = docText.text.toLowerCase();

      // Check for direct keyword matches
      const keywords = requirement.keyword ? [requirement.keyword] : [];
      const mandatoryKeywords = ['shall', 'must', 'required', 'ensure', 'establish', 'maintain'];
      
      // Extract key terms from requirement
      const reqTerms = lowerReq
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(term => term.length > 4 && !mandatoryKeywords.includes(term))
        .slice(0, 5);

      let matchScore = 0;
      let matchedText = '';

      // Check if key terms appear in document
      for (const term of reqTerms) {
        if (lowerDoc.includes(term)) {
          matchScore += 0.2;
          // Extract context around the match
          const termIndex = lowerDoc.indexOf(term);
          const contextStart = Math.max(0, termIndex - 100);
          const contextEnd = Math.min(docText.text.length, termIndex + term.length + 100);
          matchedText = docText.text.substring(contextStart, contextEnd);
        }
      }

      // Check for mandatory keyword presence (indicates requirement-like content)
      const hasMandatoryKeywords = mandatoryKeywords.some(kw => lowerDoc.includes(kw));
      if (hasMandatoryKeywords) {
        matchScore += 0.3;
      }

      // Use embedding similarity if available
      try {
        const docEmbedding = await this.embeddingService.embed(docText.text.substring(0, 1000));
        const similarity = this.embeddingService.cosineSimilarity(requirementEmbedding, docEmbedding);
        matchScore = Math.max(matchScore, similarity);
      } catch (error) {
        // Fallback to text matching
        console.log(`Embedding comparison failed, using text matching: ${error.message}`);
      }

      if (matchScore > bestConfidence) {
        bestConfidence = matchScore;
        bestMatch = {
          documentId: docText.documentId,
          text: matchedText || docText.text.substring(0, 200)
        };
      }

      if (matchScore >= minConfidence) {
        matches.push({
          documentId: docText.documentId,
          confidence: matchScore,
          matchedText: matchedText || docText.text.substring(0, 200)
        });
      }
    }

    // Determine status
    let status = 'not_covered';
    if (bestConfidence >= minConfidence) {
      status = 'covered';
    } else if (bestConfidence >= minConfidence * 0.6) {
      status = 'partial';
    }

    return {
      status: status,
      confidence: bestConfidence,
      matchedDocuments: matches,
      matchedText: bestMatch ? bestMatch.text : null,
      gapReason: bestConfidence < minConfidence * 0.6 
        ? 'No matching content found' 
        : 'Partial match - may need review'
    };
  }

  /**
   * Extract text from documents
   * @param {Array} documents - Document objects from database
   * @returns {Promise<Array>} Array of {documentId, text} objects
   */
  async extractDocumentTexts(documents) {
    const fs = await import('fs');
    const path = await import('path');
    const texts = [];

    for (const doc of documents) {
      try {
        const filePath = doc.file_path;
        if (!fs.existsSync(filePath)) {
          console.log(`⚠️  Document file not found: ${filePath}`);
          continue;
        }

        const fileExt = path.extname(filePath).toLowerCase().replace('.', '');
        let text = '';

        if (fileExt === 'pdf') {
          try {
            const pdfParse = await import('pdf-parse');
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse.default(dataBuffer);
            text = data.text;
          } catch (error) {
            console.log(`⚠️  Could not parse PDF: ${error.message}`);
            continue;
          }
        } else if (fileExt === 'docx' || fileExt === 'doc') {
          try {
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value;
          } catch (error) {
            console.log(`⚠️  Could not parse Word document: ${error.message}`);
            continue;
          }
        } else {
          // Try to read as text
          text = fs.readFileSync(filePath, 'utf-8');
        }

        if (text && text.length > 50) {
          texts.push({
            documentId: doc.document_id,
            text: text
          });
        }
      } catch (error) {
        console.error(`Error extracting text from document ${doc.document_id}:`, error.message);
      }
    }

    return texts;
  }

  /**
   * Assess gap severity based on requirement characteristics
   * @param {Object} requirement - Requirement object
   * @param {string} sector - Sector code (optional)
   * @param {string} regulator - Regulator code (optional)
   * @returns {Object} Severity classification with full details
   * @deprecated Use frameworkLoader.classifyGapSeverity() instead
   */
  assessGapSeverity(requirement, sector = null, regulator = null) {
    if (this.frameworkLoader) {
      const gapObj = {
        requirementText: requirement.requirement_text,
        hasEvidence: false,
        isRegulatory: requirement.requirement_text?.toLowerCase().includes('faa') || 
                     requirement.requirement_text?.toLowerCase().includes('part')
      };
      const classification = this.frameworkLoader.classifyGapSeverity(gapObj, sector, regulator);
      return classification.severity;
    }

    // Fallback to simple keyword-based assessment
    const text = (requirement.requirement_text || '').toLowerCase();
    const highSeverityKeywords = ['shall', 'must', 'required', 'mandatory', 'prohibited', 'shall not'];
    if (highSeverityKeywords.some(kw => text.includes(kw))) {
      return 'HIGH';
    }
    const mediumSeverityKeywords = ['should', 'recommend', 'ensure', 'establish', 'maintain'];
    if (mediumSeverityKeywords.some(kw => text.includes(kw))) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Generate GAP analysis report
   * @param {Object} analysisResults - Results from analyzeComplianceGaps
   * @param {string} format - Report format ('json', 'text', 'markdown')
   * @returns {string|Object} Formatted report
   */
  generateReport(analysisResults, format = 'json') {
    if (format === 'json') {
      return analysisResults;
    }

    if (format === 'text') {
      return this.formatReportAsText(analysisResults);
    }

    if (format === 'markdown') {
      return this.formatReportAsMarkdown(analysisResults);
    }

    return analysisResults;
  }

  /**
   * Format report as plain text
   */
  formatReportAsText(results) {
    let output = `Compliance GAP Analysis Report\n`;
    output += `Standard: ${results.standard.code} - ${results.standard.name}\n`;
    output += `Customer ID: ${results.customerId}\n`;
    output += `Analyzed: ${results.analyzedAt}\n\n`;
    output += `Coverage: ${results.coverage.coveragePercentage}% (${results.coverage.covered}/${results.coverage.total} requirements covered)\n\n`;
    
    output += `=== COVERED REQUIREMENTS (${results.covered.length}) ===\n\n`;
    for (const req of results.covered) {
      output += `${req.confidenceIndicator || '🟢'} ${req.clauseNumber}: ${req.requirementText}\n`;
      output += `  ${req.veraLanguage || `Confidence: ${(req.confidence * 100).toFixed(1)}%`}\n`;
      output += `  Matched in: ${req.matchedDocuments.length} document(s)\n\n`;
    }

    output += `=== PARTIAL MATCHES (${results.partialMatches.length}) ===\n\n`;
    for (const req of results.partialMatches) {
      output += `${req.confidenceIndicator || '🟡'} ${req.clauseNumber}: ${req.requirementText}\n`;
      output += `  ${req.veraLanguage || `Confidence: ${(req.confidence * 100).toFixed(1)}%`}\n`;
      if (req.userQuery) {
        output += `  ${req.userQuery}\n`;
      }
      output += `  Gap Reason: ${req.gapReason}\n\n`;
    }

    // Group gaps by severity
    const criticalGaps = results.gaps.filter(g => g.severity === 'CRITICAL');
    const highGaps = results.gaps.filter(g => g.severity === 'HIGH');
    const mediumGaps = results.gaps.filter(g => g.severity === 'MEDIUM');
    const lowGaps = results.gaps.filter(g => g.severity === 'LOW');

    if (criticalGaps.length > 0) {
      output += `=== 🔴 CRITICAL GAPS (${criticalGaps.length}) ===\n\n`;
      for (const gap of criticalGaps) {
        output += `${gap.severityIndicator || '🔴'} ${gap.clauseNumber}: ${gap.requirementText}\n`;
        output += `  ${gap.veraResponse || gap.severityDescription}\n`;
        output += `  Gap Reason: ${gap.gapReason}\n\n`;
      }
    }

    if (highGaps.length > 0) {
      output += `=== 🟠 HIGH PRIORITY GAPS (${highGaps.length}) ===\n\n`;
      for (const gap of highGaps) {
        output += `${gap.severityIndicator || '🟠'} ${gap.clauseNumber}: ${gap.requirementText}\n`;
        output += `  ${gap.veraResponse || gap.severityDescription}\n`;
        output += `  Gap Reason: ${gap.gapReason}\n\n`;
      }
    }

    if (mediumGaps.length > 0) {
      output += `=== 🟡 MEDIUM GAPS (${mediumGaps.length}) ===\n\n`;
      for (const gap of mediumGaps) {
        output += `${gap.severityIndicator || '🟡'} ${gap.clauseNumber}: ${gap.requirementText}\n`;
        output += `  ${gap.veraResponse || gap.severityDescription}\n`;
        output += `  Gap Reason: ${gap.gapReason}\n\n`;
      }
    }

    if (lowGaps.length > 0) {
      output += `=== 🟢 LOW GAPS (${lowGaps.length}) ===\n\n`;
      for (const gap of lowGaps) {
        output += `${gap.severityIndicator || '🟢'} ${gap.clauseNumber}: ${gap.requirementText}\n`;
        output += `  ${gap.veraResponse || gap.severityDescription}\n`;
        output += `  Gap Reason: ${gap.gapReason}\n\n`;
      }
    }

    return output;
  }

  /**
   * Format report as markdown
   */
  formatReportAsMarkdown(results) {
    let output = `# Compliance GAP Analysis Report\n\n`;
    output += `**Standard:** ${results.standard.code} - ${results.standard.name}\n\n`;
    output += `**Customer ID:** ${results.customerId}\n\n`;
    output += `**Analyzed:** ${results.analyzedAt}\n\n`;
    output += `**Coverage:** ${results.coverage.coveragePercentage}% (${results.coverage.covered}/${results.coverage.total} requirements covered)\n\n`;
    
    output += `## ${results.confidenceIndicator || '🟢'} Covered Requirements (${results.covered.length})\n\n`;
    for (const req of results.covered) {
      output += `### ${req.confidenceIndicator || '🟢'} ${req.clauseNumber}\n\n`;
      output += `${req.requirementText}\n\n`;
      output += `- **${req.veraLanguage || `Confidence: ${(req.confidence * 100).toFixed(1)}%`}**\n`;
      output += `- **Matched in:** ${req.matchedDocuments.length} document(s)\n\n`;
    }

    if (results.partialMatches.length > 0) {
      output += `## ${results.partialMatches[0]?.confidenceIndicator || '🟡'} Partial Matches (${results.partialMatches.length})\n\n`;
      for (const req of results.partialMatches) {
        output += `### ${req.confidenceIndicator || '🟡'} ${req.clauseNumber}\n\n`;
        output += `${req.requirementText}\n\n`;
        output += `- **${req.veraLanguage || `Confidence: ${(req.confidence * 100).toFixed(1)}%`}**\n`;
        if (req.userQuery) {
          output += `- **Action Required:** ${req.userQuery}\n`;
        }
        output += `- **Gap Reason:** ${req.gapReason}\n\n`;
      }
    }

    // Group gaps by severity
    const criticalGaps = results.gaps.filter(g => g.severity === 'CRITICAL');
    const highGaps = results.gaps.filter(g => g.severity === 'HIGH');
    const mediumGaps = results.gaps.filter(g => g.severity === 'MEDIUM');
    const lowGaps = results.gaps.filter(g => g.severity === 'LOW');

    if (criticalGaps.length > 0) {
      output += `## 🔴 CRITICAL GAPS (${criticalGaps.length})\n\n`;
      output += `*Audit failure / regulatory finding likely*\n\n`;
      for (const gap of criticalGaps) {
        output += `### ${gap.severityIndicator || '🔴'} ${gap.clauseNumber}\n\n`;
        output += `${gap.requirementText}\n\n`;
        output += `**${gap.veraResponse || gap.severityDescription}**\n\n`;
        output += `- **Gap Reason:** ${gap.gapReason}\n\n`;
      }
    }

    if (highGaps.length > 0) {
      output += `## 🟠 HIGH PRIORITY GAPS (${highGaps.length})\n\n`;
      output += `*Audit observation / corrective action probable*\n\n`;
      for (const gap of highGaps) {
        output += `### ${gap.severityIndicator || '🟠'} ${gap.clauseNumber}\n\n`;
        output += `${gap.requirementText}\n\n`;
        output += `**${gap.veraResponse || gap.severityDescription}**\n\n`;
        output += `- **Gap Reason:** ${gap.gapReason}\n\n`;
      }
    }

    if (mediumGaps.length > 0) {
      output += `## 🟡 MEDIUM GAPS (${mediumGaps.length})\n\n`;
      output += `*Process improvement opportunity*\n\n`;
      for (const gap of mediumGaps) {
        output += `### ${gap.severityIndicator || '🟡'} ${gap.clauseNumber}\n\n`;
        output += `${gap.requirementText}\n\n`;
        output += `**${gap.veraResponse || gap.severityDescription}**\n\n`;
        output += `- **Gap Reason:** ${gap.gapReason}\n\n`;
      }
    }

    if (lowGaps.length > 0) {
      output += `## 🟢 LOW GAPS (${lowGaps.length})\n\n`;
      output += `*Documentation / formatting issue*\n\n`;
      for (const gap of lowGaps) {
        output += `### ${gap.severityIndicator || '🟢'} ${gap.clauseNumber}\n\n`;
        output += `${gap.requirementText}\n\n`;
        output += `**${gap.veraResponse || gap.severityDescription}**\n\n`;
        output += `- **Gap Reason:** ${gap.gapReason}\n\n`;
      }
    }

    return output;
  }
}

// Export singleton instance
let gapAnalyzerInstance = null;

export function getComplianceGapAnalyzer() {
  if (!gapAnalyzerInstance) {
    gapAnalyzerInstance = new ComplianceGapAnalyzer();
  }
  return gapAnalyzerInstance;
}

export default ComplianceGapAnalyzer;

