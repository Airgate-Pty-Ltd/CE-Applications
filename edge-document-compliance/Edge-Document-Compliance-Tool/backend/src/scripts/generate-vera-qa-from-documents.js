/**
 * Generate Vera Q&A Bank from Existing Documents
 * 
 * Extracts thousands of Q&A pairs from:
 * - Compliance requirements (public.parsed_requirements)
 * - Terms and definitions (edcat.terms_and_definitions)
 * - Customer procedures (public.customer_procedures or customer_data.procedures)
 * - Standards (public.standards)
 * 
 * Generates patterns like:
 * Q: "What is [Term]?"
 * Q: "What are the requirements for [Clause]?"
 * Q: "How do I implement [Procedure]?"
 */

import { queryEdcatAI, queryPostgres } from '../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

class VeraQAGenerator {
  constructor() {
    this.generatedCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;
  }

  /**
   * Generate all Q&A entries from all sources
   */
  async generateAllQA() {
    console.log('\n🌱 Starting Vera Q&A Generation from Documents...\n');

    try {
      // STEP 1: Generate from terms and definitions
      await this.generateFromTerms();

      // STEP 2: Generate from compliance requirements
      await this.generateFromRequirements();

      // STEP 3: Generate from customer procedures
      await this.generateFromProcedures();

      // STEP 4: Generate from standards
      await this.generateFromStandards();

      // STEP 5: Generate cross-standard comparisons
      await this.generateCrossStandardComparisons();

      console.log('\n✅ Q&A Generation Complete');
      console.log(`   Generated: ${this.generatedCount}`);
      console.log(`   Skipped: ${this.skippedCount}`);
      console.log(`   Errors: ${this.errorCount}`);
      console.log(`   Total: ${this.generatedCount + this.skippedCount}\n`);

    } catch (error) {
      console.error('❌ Error in Q&A generation:', error);
      throw error;
    }
  }

  /**
   * Generate Q&A from terms and definitions
   */
  async generateFromTerms() {
    console.log('📚 Generating Q&A from Terms and Definitions...');

    try {
      const result = await queryEdcatAI(
        `SELECT id, term, acronym, definition, category, source_standard
         FROM edcat.terms_and_definitions
         WHERE definition IS NOT NULL AND definition != ''
         LIMIT 1000`
      );

      console.log(`   Found ${result.rows.length} terms to process...`);

      for (const row of result.rows) {
        // Q&A Pattern 1: "What is [Term]?"
        await this.createQAEntry({
          questionPatterns: [
            `what is ${row.term}`,
            `what is a ${row.term}`,
            `define ${row.term}`,
            `explain ${row.term}`,
            `${row.term} definition`
          ],
          responseTemplate: `${row.term}${row.acronym ? ` (${row.acronym})` : ''} is ${row.definition}`,
          category: 'terminology',
          context: row.source_standard || row.category || 'general',
          confidence: 0.9
        });

        // Q&A Pattern 2: Acronym definitions
        if (row.acronym && row.acronym.length < 15) {
          await this.createQAEntry({
            questionPatterns: [
              `what does ${row.acronym} mean`,
              `what is ${row.acronym}`,
              `${row.acronym} definition`,
              `what is the acronym ${row.acronym}`
            ],
            responseTemplate: `${row.acronym} stands for ${row.term}. ${row.definition}`,
            category: 'terminology',
            context: row.source_standard || row.category || 'general',
            confidence: 0.85
          });
        }
      }

      console.log(`   ✅ Generated Q&A from ${result.rows.length} terms\n`);

    } catch (error) {
      console.error('   ❌ Error generating from terms:', error.message);
      this.errorCount++;
    }
  }

  /**
   * Generate Q&A from compliance requirements
   */
  async generateFromRequirements() {
    console.log('📋 Generating Q&A from Compliance Requirements...');

    try {
      // Query from Postgres (public.parsed_requirements)
      const result = await queryPostgres(
        `SELECT 
          pr.id, 
          pr.clause_number, 
          pr.requirement_text,
          s.code as standard_code,
          s.name as standard_name
         FROM public.parsed_requirements pr
         LEFT JOIN public.standards s ON pr.standard_id = s.standard_id
         WHERE pr.requirement_text IS NOT NULL 
         AND pr.requirement_text != ''
         AND LENGTH(pr.requirement_text) > 20
         LIMIT 2500`
      );

      console.log(`   Found ${result.rows.length} requirements to process...`);

      let batchCount = 0;
      for (const row of result.rows) {
        if (!row.standard_code) continue;

        // Q&A Pattern 1: "What does [Standard] clause [Num] require?"
        await this.createQAEntry({
          questionPatterns: [
            `what does ${row.standard_code} clause ${row.clause_number} require`,
            `${row.standard_code} ${row.clause_number} requirements`,
            `what is ${row.standard_code} clause ${row.clause_number}`,
            `explain clause ${row.clause_number} in ${row.standard_code}`
          ],
          responseTemplate: `${row.standard_code} Clause ${row.clause_number} requires: ${row.requirement_text.substring(0, 500)}`,
          category: 'compliance',
          context: row.standard_name || row.standard_code,
          confidence: 0.88
        });

        // Q&A Pattern 2: Extract key topics from requirement text
        const keyTopics = this.extractKeyTopics(row.requirement_text);
        if (keyTopics.length > 0) {
          const topic = keyTopics[0];
          await this.createQAEntry({
            questionPatterns: [
              `${row.standard_code} ${topic}`,
              `${topic} in ${row.standard_code}`,
              `how to implement ${topic}`,
              `requirements for ${topic}`
            ],
            responseTemplate: `${topic} (${row.standard_code} ${row.clause_number}): ${row.requirement_text.substring(0, 400)}`,
            category: 'compliance',
            context: row.standard_name || row.standard_code,
            confidence: 0.86
          });
        }

        batchCount++;
        if (batchCount % 500 === 0) {
          console.log(`   Processing... ${batchCount}/${result.rows.length}`);
        }
      }

      console.log(`   ✅ Generated Q&A from ${result.rows.length} requirements\n`);

    } catch (error) {
      console.error('   ❌ Error generating from requirements:', error.message);
      this.errorCount++;
    }
  }

  /**
   * Generate Q&A from customer procedures
   */
  async generateFromProcedures() {
    console.log('📄 Generating Q&A from Customer Procedures...');

    try {
      // Try public.customer_procedures first
      let result;
      try {
        result = await queryPostgres(
          `SELECT 
            id,
            procedure_text,
            document_id
           FROM public.customer_procedures
           WHERE procedure_text IS NOT NULL 
           AND procedure_text != ''
           AND LENGTH(procedure_text) > 50
           LIMIT 500`
        );
      } catch (err) {
        // Try customer_data.procedures
        try {
          result = await queryPostgres(
            `SELECT 
              procedure_id as id,
              procedure_text,
              document_id
             FROM customer_data.procedures
             WHERE procedure_text IS NOT NULL 
             AND procedure_text != ''
             AND LENGTH(procedure_text) > 50
             LIMIT 500`
          );
        } catch (err2) {
          console.log('   ⚠️  No procedures table found, skipping...');
          return;
        }
      }

      console.log(`   Found ${result.rows.length} procedures to process...`);

      for (const row of result.rows) {
        const procedureTitle = this.extractProcedureTitle(row.procedure_text);
        
        if (!procedureTitle) continue;

        // Q&A Pattern 1: "What is the [Procedure]?"
        await this.createQAEntry({
          questionPatterns: [
            `what is ${procedureTitle}`,
            `describe ${procedureTitle}`,
            `procedure for ${procedureTitle}`,
            `steps for ${procedureTitle}`,
            `how to ${procedureTitle}`
          ],
          responseTemplate: `${procedureTitle}: ${row.procedure_text.substring(0, 500)}`,
          category: 'procedure',
          context: 'customer_procedures',
          confidence: 0.84
        });
      }

      console.log(`   ✅ Generated Q&A from ${result.rows.length} procedures\n`);

    } catch (error) {
      console.error('   ❌ Error generating from procedures:', error.message);
      this.errorCount++;
    }
  }

  /**
   * Generate Q&A from standards
   */
  async generateFromStandards() {
    console.log('📖 Generating Q&A from Standards...');

    try {
      const result = await queryPostgres(
        `SELECT 
          standard_id,
          code,
          name,
          sector
         FROM public.standards
         WHERE code IS NOT NULL
         LIMIT 100`
      );

      console.log(`   Found ${result.rows.length} standards to process...`);

      for (const row of result.rows) {
        await this.createQAEntry({
          questionPatterns: [
            `what is ${row.code}`,
            `explain ${row.code}`,
            `${row.code} standard`,
            `tell me about ${row.code}`
          ],
          responseTemplate: `${row.code} (${row.name})${row.sector ? ` is a ${row.sector} standard` : ' is a compliance standard'}. It defines requirements for quality management and compliance.`,
          category: 'standards',
          context: row.sector || 'general',
          confidence: 0.82
        });
      }

      console.log(`   ✅ Generated Q&A from ${result.rows.length} standards\n`);

    } catch (error) {
      console.error('   ❌ Error generating from standards:', error.message);
      this.errorCount++;
    }
  }

  /**
   * Generate cross-standard comparison Q&A
   */
  async generateCrossStandardComparisons() {
    console.log('🔄 Generating Cross-Standard Comparisons...');

    try {
      const result = await queryPostgres(
        `SELECT DISTINCT code, name FROM public.standards 
         WHERE code IN ('ISO9001', 'AS9100D', 'ISO13485', 'IATF16949', 'ISO27001', 'ISO45001')
         LIMIT 10`
      );

      const standards = result.rows;

      if (standards.length < 2) {
        console.log('   ⚠️  Not enough standards for comparisons, skipping...');
        return;
      }

      // Generate pairwise comparisons
      for (let i = 0; i < standards.length; i++) {
        for (let j = i + 1; j < standards.length; j++) {
          const s1 = standards[i];
          const s2 = standards[j];

          await this.createQAEntry({
            questionPatterns: [
              `compare ${s1.code} and ${s2.code}`,
              `difference between ${s1.code} and ${s2.code}`,
              `${s1.code} vs ${s2.code}`,
              `how is ${s1.code} different from ${s2.code}`
            ],
            responseTemplate: `${s1.code} (${s1.name}) and ${s2.code} (${s2.name}) are related but distinct standards. Both cover quality management, but have different scope and requirements. Would you like detailed requirements for either standard?`,
            category: 'comparison',
            context: 'cross-standard',
            confidence: 0.80
          });
        }
      }

      console.log(`   ✅ Generated cross-standard comparisons\n`);

    } catch (error) {
      console.error('   ❌ Error generating comparisons:', error.message);
      this.errorCount++;
    }
  }

  /**
   * Create a single Q&A entry with multiple question patterns
   */
  async createQAEntry({ questionPatterns, responseTemplate, category, context, confidence }) {
    try {
      if (!questionPatterns || questionPatterns.length === 0) return;
      if (!responseTemplate || responseTemplate.length < 10) return;

      const questionText = questionPatterns[0];
      const representativeExamples = questionPatterns.slice(1, 4).join(' | ');

      // Check if entry already exists
      const existing = await queryEdcatAI(
        `SELECT id FROM edcat.vera_query_response_bank
         WHERE (user_query_pattern ILIKE $1 OR question_text ILIKE $1)
         AND persona_code = 'vera'
         LIMIT 1`,
        [questionText]
      );

      if (existing.rows.length > 0) {
        this.skippedCount++;
        return;
      }

      // Create new entry
      const id = uuidv4();

      // Check what columns exist
      const columnCheck = await queryEdcatAI(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'edcat' 
        AND table_name = 'vera_query_response_bank'
        AND column_name IN ('response_text', 'answer', 'response_template', 'user_query_pattern', 'question_text')
      `).catch(() => ({ rows: [] }));

      const availableColumns = columnCheck.rows.map(r => r.column_name);
      const hasUserQueryPattern = availableColumns.includes('user_query_pattern');
      const hasQuestionText = availableColumns.includes('question_text');
      const hasResponseText = availableColumns.includes('response_text');
      const hasAnswer = availableColumns.includes('answer');
      const hasTemplate = availableColumns.includes('response_template');

      // Build insert query based on available columns
      const insertColumns = ['id', 'tenant_id', 'persona_code', 'category', 'confidence_score', 'created_at'];
      const insertValues = [id, DEFAULT_TENANT_ID, 'vera', category, confidence, 'NOW()'];
      const placeholders = ['$1', '$2', '$3', '$4', '$5', 'NOW()'];

      let paramIndex = 6;

      if (hasUserQueryPattern) {
        insertColumns.push('user_query_pattern');
        insertValues.push(questionText);
        placeholders.push(`$${paramIndex++}`);
      }

      if (hasQuestionText) {
        insertColumns.push('question_text');
        insertValues.push(questionText);
        placeholders.push(`$${paramIndex++}`);
      }

      if (hasResponseText) {
        insertColumns.push('response_text');
        insertValues.push(responseTemplate);
        placeholders.push(`$${paramIndex++}`);
      }

      if (hasAnswer) {
        insertColumns.push('answer');
        insertValues.push(responseTemplate);
        placeholders.push(`$${paramIndex++}`);
      }

      if (hasTemplate) {
        insertColumns.push('response_template');
        insertValues.push(responseTemplate);
        placeholders.push(`$${paramIndex++}`);
      }

      if (availableColumns.includes('representative_examples')) {
        insertColumns.push('representative_examples');
        insertValues.push(representativeExamples);
        placeholders.push(`$${paramIndex++}`);
      }

      if (availableColumns.includes('learning_notes')) {
        insertColumns.push('learning_notes');
        insertValues.push(`Auto-generated from ${context}`);
        placeholders.push(`$${paramIndex++}`);
      }

      const insertQuery = `
        INSERT INTO edcat.vera_query_response_bank (${insertColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
        ON CONFLICT DO NOTHING
      `;

      await queryEdcatAI(insertQuery, insertValues.filter((v, i) => placeholders[i] !== 'NOW()'));

      this.generatedCount++;

      if (this.generatedCount % 100 === 0) {
        console.log(`   Progress: ${this.generatedCount} entries generated...`);
      }

    } catch (error) {
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        console.error(`   Error creating Q&A entry: ${error.message}`);
        this.errorCount++;
      } else {
        this.skippedCount++;
      }
    }
  }

  /**
   * Extract key topics from requirement text
   */
  extractKeyTopics(text) {
    const topics = [];
    const commonTopics = [
      'document control', 'change management', 'risk management', 'quality control',
      'design and development', 'purchasing', 'production', 'monitoring', 'measurement',
      'corrective action', 'preventive action', 'management review', 'internal audit',
      'training', 'competence', 'infrastructure', 'environment', 'calibration'
    ];

    const lowerText = text.toLowerCase();
    commonTopics.forEach(topic => {
      if (lowerText.includes(topic)) {
        topics.push(topic);
      }
    });

    return topics;
  }

  /**
   * Extract procedure title from procedure text
   */
  extractProcedureTitle(text) {
    // Try to find title in first few lines
    const lines = text.split('\n').slice(0, 5);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 100 && !trimmed.includes('.')) {
        return trimmed;
      }
    }
    // Fallback: use first sentence
    const firstSentence = text.split('.')[0];
    if (firstSentence.length > 10 && firstSentence.length < 100) {
      return firstSentence.trim();
    }
    return null;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  const generator = new VeraQAGenerator();
  generator.generateAllQA().then(() => {
    console.log('\n✅ Script complete\n');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
}

export default VeraQAGenerator;

