/**
 * ============================================================================
 * DYNAMIC STANDARDS INGESTION ENGINE
 * ============================================================================
 * © 2025 Conform-Edge Quality Consulting. All rights reserved.
 * CEQC-OQCQMS Proprietary Standards Ingestion & Parsing Service
 *
 * This engine enables the bounded AI to LEARN from new standards documents
 * without code changes. It:
 *
 * 1. INGESTS standard documents (PDF, DOC, HTML, TXT, regulatory JSON)
 * 2. EXTRACTS clause structure and requirement text
 * 3. GENERATES GAP profiles dynamically
 * 4. STORES in database (not hardcoded objects)
 * 5. SCALES to 100+ standards, 60+ regulators
 *
 * This solves the "hardcoded corpus" problem by making standards injectable
 * and learnable at runtime.
 *
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Extract raw text from various document formats
 */
export class ClauseExtractor {
  static async extractText(filePath, format) {
    switch (format.toLowerCase()) {
      case 'pdf':
        return this.extractFromPDF(filePath);
      case 'docx':
        return this.extractFromDOCX(filePath);
      case 'txt':
        return this.extractFromTXT(filePath);
      case 'html':
        return this.extractFromHTML(filePath);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  static async extractFromPDF(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);
    return pdfData.text;
  }

  static async extractFromDOCX(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  static async extractFromTXT(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  static async extractFromHTML(filePath) {
    const html = fs.readFileSync(filePath, 'utf-8');
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detect and normalize clauses in text
   * Returns: Array of parsed clauses with normalized IDs
   */
  static detectClauses(text) {
    const clauses = [];
    const lines = text.split('\n');
    
    // Patterns for different clause formats
    const isoASPattern = /^(\d+(?:\.\d+)*[a-z]?)\s+(.+?)$/gm; // 4.1, 8.5.1.2.c
    const cfrPattern = /^(?:§\s*)?(\d+)\.(\d+)((?:\([a-z0-9]+\))*)\s+(.+?)$/gm; // 21.137(a)
    const nistPattern = /^([A-Z]{2})-(\d+)\s+(.+?)$/gm; // AC-3, CM-2
    const sectionPattern = /^(Section|Clause|Part|Article|Subpart|Control)\s+(.+?)$/i;
    
    let currentSection = '';
    let currentContext = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Track section context
      if (sectionPattern.test(line)) {
        currentSection = line;
        currentContext = line;
      }

      // Try to match ISO/AS format
      let match = isoASPattern.exec(line);
      if (match) {
        const clauseId = match[1].toLowerCase();
        const title = match[2];
        const requirement = this.extractRequirementText(lines, i);
        clauses.push({
          clause_id: clauseId,
          section_label: match[0],
          source_format: 'iso_as',
          title,
          requirement_text: requirement,
          requirement_keywords: this.extractKeywords(requirement),
          requirement_strength: this.inferStrength(requirement),
          page_number: undefined,
          section_context: currentSection
        });
        continue;
      }

      // Try to match CFR format
      match = cfrPattern.exec(line);
      if (match) {
        const part = match[1];
        const section = match[2];
        const subsections = match[3] || '';
        const title = match[4];
        
        // Normalize: 21.137(a)(2) → 21.137.a.2
        const normalized = subsections
          ? `${part}.${section}.${subsections
              .match(/\([a-z0-9]+\)/g)
              ?.map((s) => s.slice(1, -1))
              .join('.')}`
          : `${part}.${section}`;

        const requirement = this.extractRequirementText(lines, i);
        clauses.push({
          clause_id: normalized,
          section_label: match[0],
          source_format: 'cfr',
          title,
          requirement_text: requirement,
          requirement_keywords: this.extractKeywords(requirement),
          requirement_strength: this.inferStrength(requirement),
          page_number: undefined,
          section_context: currentSection
        });
        continue;
      }

      // Try to match customer requirement patterns (Boeing, Airbus, etc.)
      // Patterns: "REQ-001", "ASR-2023-001", "Boeing-REQ-123", "Section 3.2.1"
      const customerReqPattern = /^(?:REQ|ASR|SOR|SR|REQ-|Section\s+)?(\d+(?:\.\d+)*(?:-\d+)?)\s*(?:[-:]?\s*)?(.+?)$/i;
      match = customerReqPattern.exec(line);
      if (match && !isoASPattern.test(line) && !cfrPattern.test(line)) {
        const reqId = match[1];
        const title = match[2];
        const requirement = this.extractRequirementText(lines, i);
        clauses.push({
          clause_id: `REQ-${reqId}`,
          section_label: match[0],
          source_format: 'custom',
          title,
          requirement_text: requirement,
          requirement_keywords: this.extractKeywords(requirement),
          requirement_strength: this.inferStrength(requirement),
          page_number: undefined,
          section_context: currentSection
        });
      }

      // Try to match NIST format
      match = nistPattern.exec(line);
      if (match) {
        const control = `${match[1]}-${match[2]}`;
        const title = match[3];
        const requirement = this.extractRequirementText(lines, i);
        clauses.push({
          clause_id: control,
          section_label: match[0],
          source_format: 'nist',
          title,
          requirement_text: requirement,
          requirement_keywords: this.extractKeywords(requirement),
          requirement_strength: this.inferStrength(requirement),
          page_number: undefined,
          section_context: currentSection
        });
      }
    }

    return clauses;
  }

  /**
   * Extract requirement text from a clause (could span multiple lines)
   */
  static extractRequirementText(lines, startIndex) {
    const requirement = [];
    let i = startIndex;
    
    while (i < lines.length && requirement.length < 10) {
      const line = lines[++i]?.trim();
      if (!line) break;
      if (/^(\d+\.|[A-Z]+-\d+|\(.\))/.test(line)) break;
      requirement.push(line);
    }
    
    return requirement.join(' ').substring(0, 500);
  }

  /**
   * Extract requirement keywords from text
   */
  static extractKeywords(text) {
    const keywords = [];
    const keywordPatterns = {
      mandatory: /\b(shall|must|will|is required to|must ensure|shall ensure)\b/gi,
      recommended: /\b(should|recommend|is recommended)\b/gi,
      permitted: /\b(may|can|is permitted|is allowed)\b/gi,
      responsibility: /\b(shall be responsible for|is responsible for|shall ensure|must maintain)\b/gi
    };

    for (const [category, pattern] of Object.entries(keywordPatterns)) {
      const matches = text.match(pattern);
      if (matches) {
        keywords.push(...matches.map((m) => m.toLowerCase()));
      }
    }

    return [...new Set(keywords)];
  }

  /**
   * Infer requirement strength from text
   */
  static inferStrength(text) {
    const lowerText = text.toLowerCase();
    if (/\b(shall|must|is required)\b/.test(lowerText)) {
      return 'MANDATORY';
    }
    if (/\b(should|recommend|ought)\b/.test(lowerText)) {
      return 'RECOMMENDED';
    }
    if (/\b(may|can|is permitted|is allowed)\b/.test(lowerText)) {
      return 'PERMITTED';
    }
    return 'INFORMATIONAL';
  }
}

// ============================================================================
// DYNAMIC GAP PROFILE GENERATOR
// ============================================================================

export class DynamicGAPProfileGenerator {
  /**
   * Generate GAP profiles from parsed clauses
   */
  static generateProfiles(clauses, standardCode, confidenceThreshold = 0.6) {
    return clauses.map((clause) => ({
      gap_profile_id: `${standardCode.toLowerCase()}::${clause.clause_id}`,
      standard_code: standardCode,
      clause_id: clause.clause_id,
      title: clause.title || `Clause ${clause.clause_id}`,
      source_requirement: clause.requirement_text,
      interpretation: this.generateInterpretation(clause),
      expected_evidence: this.generateExpectedEvidence(clause),
      expected_documents: this.generateExpectedDocuments(clause, standardCode),
      audit_questions: this.generateAuditQuestions(clause),
      common_pitfalls: this.generateCommonPitfalls(clause),
      risk_level: this.assessRiskLevel(clause),
      confidence_score: this.calculateConfidence(clause),
      generated_at: new Date(),
      manually_reviewed: false
    }));
  }

  static generateInterpretation(clause) {
    const keywords = clause.requirement_keywords.join(', ');
    const strength = clause.requirement_strength;
    let interpretation = `This is a ${strength.toLowerCase()} requirement.`;
    if (clause.section_context) {
      interpretation += ` (From: ${clause.section_context})`;
    }
    interpretation += `\n\nRequirement Keywords: ${keywords}`;
    interpretation += `\n\nFull Text: ${clause.requirement_text}`;
    return interpretation;
  }

  static generateExpectedEvidence(clause) {
    const evidence = [];
    const keywordLower = clause.requirement_keywords.map((k) => k.toLowerCase());
    
    if (keywordLower.some((k) => k.includes('maintain'))) {
      evidence.push('Documented procedures showing regular maintenance activity');
      evidence.push('Records of maintenance tasks performed with dates and signatures');
    }
    if (keywordLower.some((k) => k.includes('establish'))) {
      evidence.push('Documented process or procedure showing establishment');
      evidence.push('Records of implementation and communication');
    }
    if (keywordLower.some((k) => k.includes('review'))) {
      evidence.push('Evidence of review activity (meeting minutes, sign-off records)');
      evidence.push('Periodic review schedule with results documented');
    }
    if (keywordLower.some((k) => k.includes('responsible'))) {
      evidence.push('Organizational chart showing assigned responsibility');
      evidence.push('Job descriptions or RACI matrix');
    }
    if (keywordLower.some((k) => k.includes('ensure'))) {
      evidence.push('Control procedures showing how compliance is ensured');
      evidence.push('Verification/validation records');
    }
    
    if (evidence.length === 0) {
      evidence.push('Documented procedure or policy addressing this requirement');
      evidence.push('Records demonstrating compliance or implementation');
    }
    
    return evidence;
  }

  static generateExpectedDocuments(clause, standardCode) {
    const docs = [];
    
    // Customer requirements specific documents
    if (standardCode.includes('Boeing') || standardCode.includes('Airbus') || standardCode.includes('Embraer') || 
        standardCode.includes('ASR') || standardCode.includes('SOR') || standardCode.includes('Customer')) {
      docs.push('Customer Requirements Matrix', 'Compliance Statement', 'Evidence Package', 'Test Reports');
    }
    
    if (standardCode.includes('AS9100') || standardCode.includes('FAA')) {
      docs.push('Quality Manual', 'Quality Plan', 'Procedure', 'Work Instruction');
    }
    if (standardCode.includes('ISO13485') || standardCode.includes('IEC62304')) {
      docs.push('Quality Manual', 'Risk Management Report', 'Design History File');
    }
    if (standardCode.includes('NIST') || standardCode.includes('ISO27001')) {
      docs.push('Security Plan', 'Control Assessment Report', 'Risk Register');
    }
    
    const keywordLower = clause.requirement_keywords.map((k) => k.toLowerCase());
    if (keywordLower.some((k) => k.includes('document'))) {
      docs.push('Documented Information Register', 'Record Control Procedure');
    }
    if (keywordLower.some((k) => k.includes('training'))) {
      docs.push('Training Matrix', 'Training Records', 'Competency Assessment');
    }
    if (keywordLower.some((k) => k.includes('audit'))) {
      docs.push('Audit Procedure', 'Audit Reports', 'Audit Schedule');
    }
    
    return [...new Set(docs)];
  }

  static generateAuditQuestions(clause) {
    const questions = [];
    const keywordLower = clause.requirement_keywords.map((k) => k.toLowerCase());
    
    if (keywordLower.some((k) => k.includes('establish'))) {
      questions.push('How was this requirement established?');
      questions.push('Who is responsible for maintaining it?');
    }
    if (keywordLower.some((k) => k.includes('maintain'))) {
      questions.push('How is this requirement maintained?');
      questions.push('What records demonstrate ongoing maintenance?');
      questions.push('How often is this reviewed?');
    }
    if (keywordLower.some((k) => k.includes('ensure'))) {
      questions.push('How is compliance ensured?');
      questions.push('What controls are in place?');
      questions.push('How is effectiveness verified?');
    }
    if (keywordLower.some((k) => k.includes('review'))) {
      questions.push('When was this last reviewed?');
      questions.push('Who reviewed it?');
      questions.push('What was the outcome?');
    }
    
    if (questions.length === 0) {
      questions.push(`How is this requirement (${clause.clause_id}) implemented?`);
      questions.push('Can you provide evidence of compliance?');
      questions.push('How is this requirement communicated and understood?');
    }
    
    return questions;
  }

  static generateCommonPitfalls(clause) {
    const pitfalls = [
      'No documented procedure or policy',
      'Requirement not communicated to stakeholders',
      'No evidence of implementation',
      'Inconsistent interpretation or application'
    ];
    
    const keywordLower = clause.requirement_keywords.map((k) => k.toLowerCase());
    if (keywordLower.some((k) => k.includes('maintain'))) {
      pitfalls.push('Maintenance tasks not documented or recorded');
      pitfalls.push('No evidence of periodic review');
    }
    if (keywordLower.some((k) => k.includes('review'))) {
      pitfalls.push('Reviews performed but not documented');
      pitfalls.push('Review findings not acted upon');
    }
    if (keywordLower.some((k) => k.includes('responsible'))) {
      pitfalls.push('Responsibility not clearly assigned or understood');
      pitfalls.push('No accountability for non-compliance');
    }
    
    return pitfalls;
  }

  static assessRiskLevel(clause) {
    if (clause.requirement_strength === 'MANDATORY') {
      return 'High';
    }
    
    const riskKeywords = ['safety', 'compliance', 'security', 'critical', 'essential', 'integrity'];
    const keywordLower = clause.requirement_keywords.map((k) => k.toLowerCase());
    if (riskKeywords.some((rk) => keywordLower.some((k) => k.includes(rk)))) {
      return 'High';
    }
    if (clause.requirement_strength === 'RECOMMENDED') {
      return 'Medium';
    }
    return 'Low';
  }

  static calculateConfidence(clause) {
    let confidence = 50;
    
    if (clause.requirement_keywords.some((k) => ['shall', 'must', 'required'].includes(k.toLowerCase()))) {
      confidence += 30;
    }
    if (clause.title && clause.title.length > 5) {
      confidence += 10;
    }
    if (clause.source_format === 'unknown') {
      confidence -= 20;
    }
    if (['iso_as', 'cfr', 'nist'].includes(clause.source_format)) {
      confidence += 10;
    }
    
    return Math.min(100, Math.max(0, confidence));
  }
}

// ============================================================================
// STANDARDS DOCUMENT PROCESSOR
// ============================================================================

export class StandardsDocumentProcessor {
  /**
   * Process a new standards document end-to-end
   */
  static async processStandardDocument(
    filePath,
    standardCode,
    standardName,
    sourceType = 'standard',
    regulatorId = null
  ) {
    const fileFormat = path.extname(filePath).slice(1).toLowerCase();
    
    try {
      // Step 1: Extract text from document
      console.log(`[${standardCode}] Extracting text from ${fileFormat.toUpperCase()}...`);
      const text = await ClauseExtractor.extractText(filePath, fileFormat);
      console.log(`[${standardCode}] Extracted ${text.length} characters`);

      // Step 2: Detect and normalize clauses
      console.log(`[${standardCode}] Detecting clauses...`);
      const clauses = ClauseExtractor.detectClauses(text);
      console.log(`[${standardCode}] Found ${clauses.length} clauses`);

      // Step 3: Generate GAP profiles
      console.log(`[${standardCode}] Generating GAP profiles...`);
      const profiles = DynamicGAPProfileGenerator.generateProfiles(clauses, standardCode);
      console.log(`[${standardCode}] Generated ${profiles.length} profiles`);

      // Step 4: Calculate file hash
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      const fileHash = hashSum.digest('hex');

      return {
        document: {
          standard_code: standardCode,
          standard_name: standardName,
          source_type: sourceType,
          regulator_id: regulatorId,
          file_path: filePath,
          file_hash: fileHash,
          total_clauses: clauses.length,
          ingestion_method: 'manual_upload',
          ingestion_confidence: 100
        },
        clauses,
        profiles
      };
    } catch (error) {
      console.error(`[${standardCode}] ❌ Processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store processed standard in database
   */
  static async storeStandard(standardData, clauses, profiles) {
    const { getClient } = await import('../database/connection.js');
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Insert standard
      const standardResult = await client.query(
        `INSERT INTO standards (id, name, code, version, source_type, description, is_active, 
         sector, regulator_id, file_path, file_hash, total_clauses, ingestion_method, 
         ingestion_confidence, ingested_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
         RETURNING id`,
        [
          uuidv4(),
          standardData.standard_name,
          standardData.standard_code,
          standardData.version || null,
          standardData.source_type,
          standardData.description || null,
          true,
          standardData.sector || null,
          standardData.regulator_id || null,
          standardData.file_path || null,
          standardData.file_hash || null,
          standardData.total_clauses || 0,
          standardData.ingestion_method || 'manual_upload',
          standardData.ingestion_confidence || 100
        ]
      );

      const standardId = standardResult.rows[0].id;

      // Insert clauses
      for (const clause of clauses) {
        await client.query(
          `INSERT INTO clauses (id, standard_id, clause_ref, title, requirement_text, 
           is_mandatory, category, clause_format, requirement_strength, requirement_keywords,
           extraction_confidence, section_label, full_context)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (standard_id, clause_ref) DO UPDATE SET
           title = EXCLUDED.title,
           requirement_text = EXCLUDED.requirement_text,
           updated_at = NOW()`,
          [
            uuidv4(),
            standardId,
            clause.clause_id,
            clause.title || null,
            clause.requirement_text,
            clause.requirement_strength === 'MANDATORY',
            clause.section_context || null,
            clause.source_format || null,
            clause.requirement_strength || null,
            clause.requirement_keywords || [],
            clause.extraction_confidence || 0.8,
            clause.section_label || null,
            clause.requirement_text
          ]
        );
      }

      // Get clause IDs for profiles
      const clauseIdsResult = await client.query(
        `SELECT id, clause_ref FROM clauses WHERE standard_id = $1`,
        [standardId]
      );
      const clauseIdMap = new Map(clauseIdsResult.rows.map(r => [r.clause_ref, r.id]));

      // Insert GAP profiles
      for (const profile of profiles) {
        const clauseId = clauseIdMap.get(profile.clause_id);
        if (!clauseId) continue;

        await client.query(
          `INSERT INTO gap_profiles (id, clause_id, interpretation, expected_evidence, 
           expected_documents, audit_questions, common_pitfalls, risk_level, profile_code,
           generation_method, generation_confidence, generated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           ON CONFLICT (clause_id, version_label) DO UPDATE SET
           interpretation = EXCLUDED.interpretation,
           expected_evidence = EXCLUDED.expected_evidence,
           updated_at = NOW()`,
          [
            uuidv4(),
            clauseId,
            profile.interpretation,
            profile.expected_evidence || [],
            profile.expected_documents || [],
            profile.audit_questions || [],
            profile.common_pitfalls || [],
            profile.risk_level || 'Medium',
            profile.gap_profile_id,
            'auto_generated',
            profile.confidence_score / 100 || 0.6
          ]
        );
      }

      await client.query('COMMIT');
      
      return {
        standardId,
        clausesInserted: clauses.length,
        profilesInserted: profiles.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default {
  ClauseExtractor,
  DynamicGAPProfileGenerator,
  StandardsDocumentProcessor
};

