/**
 * Load Vera Q&A Response Bank
 * Populates vera_query_response_bank with responses so Vera can answer questions
 */

import { queryEdcatAI } from '../config/databases.js';

const QNA_RESPONSES = [
  {
    pattern: 'what is quality',
    response: 'Quality is the degree to which a product or service meets customer requirements and regulatory standards. In a compliance context, quality means systematic adherence to defined processes, documentation, and procedures that demonstrate conformance to standards like ISO 9001, AS9100D, or FDA regulations.',
    confidence: 0.95
  },
  {
    pattern: 'define quality',
    response: 'Quality is the degree to which a product or service meets customer requirements and regulatory standards. In a compliance context, quality means systematic adherence to defined processes, documentation, and procedures that demonstrate conformance to standards like ISO 9001, AS9100D, or FDA regulations.',
    confidence: 0.95
  },
  {
    pattern: 'what is ISO 9001',
    response: 'ISO 9001:2015 is the most widely recognized international standard for Quality Management Systems (QMS). It specifies requirements for organizations to demonstrate their ability to consistently provide products and services that meet customer and regulatory requirements. Key clauses cover: Leadership, Planning, Support, Operations, Performance evaluation, and Improvement. AS9100D and ISO 13485 are built on ISO 9001 as a foundation.',
    confidence: 0.96
  },
  {
    pattern: 'what is AS9100',
    response: 'AS9100D is the aerospace quality management standard that adds aerospace-specific requirements ON TOP OF ISO 9001. It includes additional requirements for: Foreign Object Debris (FOD) prevention, Product Safety, Counterfeit parts prevention, and Configuration Management. Any aerospace company must meet both ISO 9001 AND AS9100D requirements.',
    confidence: 0.97
  },
  {
    pattern: 'what is gap analysis',
    response: 'Gap Analysis is a systematic comparison between an organization\'s current state (documented procedures and practices) and a desired or required state (compliance standard requirements). Gap analysis identifies: 1) What requirements are COVERED (procedures match requirements), 2) What requirements are NOT COVERED (gaps that must be remediated), 3) What requirements are PARTIALLY COVERED (ambiguous, need clarification). Result is a gap report showing compliance percentage and improvement priorities.',
    confidence: 0.93
  },
  {
    pattern: 'what is compliance',
    response: 'Compliance is the state of meeting all requirements specified in applicable standards, regulations, and customer contracts. In quality context, compliance means demonstrating through documentation and evidence that processes and products conform to specified requirements (ISO 9001, AS9100D, FDA, FAA, etc.).',
    confidence: 0.94
  },
  {
    pattern: 'what is an audit',
    response: 'An audit is a systematic examination of documentation, records, and practices to determine whether an organization conforms to specified requirements (standards, regulations, procedures). Audits can be: 1) Internal (conducted by own staff), 2) Second-party (conducted by customer), 3) Third-party (conducted by certification body). Audits identify non-conformances (failures to meet requirements) and opportunities for improvement.',
    confidence: 0.92
  },
  {
    pattern: 'what is corrective action',
    response: 'Corrective Action is a process to address root causes of non-conformances (gaps, failures, or problems). Corrective actions include: 1) Identifying root cause (why did it fail?), 2) Implementing fix (procedure change, training, process modification), 3) Verifying effectiveness (ensuring the fix works), 4) Preventing recurrence (ensuring it never happens again). Documented corrective actions demonstrate continuous improvement.',
    confidence: 0.90
  },
  {
    pattern: 'what is a procedure',
    response: 'A procedure is a documented description of HOW an organization performs a specific process or activity. Procedures describe: 1) What the process is, 2) Who is responsible, 3) When it happens, 4) How it\'s done, 5) What records are required. Procedures are the foundation of compliance - they show auditors that activities are systematic and repeatable, not ad-hoc.',
    confidence: 0.91
  },
  {
    pattern: 'who are you',
    response: 'I\'m Vera, your Virtual Expert in Requirements and Assessments. I\'m a specialized AI system built specifically for compliance and quality management. I help organizations understand standards like ISO 9001, AS9100D, FDA, FAA, and others. I can analyze compliance gaps, draft procedures, answer questions about requirements, and provide guidance based on compliance expertise.',
    confidence: 0.98
  },
  {
    pattern: 'what can you do',
    response: 'I can: 1) Answer questions about compliance standards and requirements, 2) Analyze your documents for compliance gaps, 3) Generate procedure templates, 4) Compare different standards, 5) Explain regulatory requirements, 6) Help with audit preparation, 7) Provide remediation guidance. I\'m designed specifically for quality management and compliance - not general AI chat.',
    confidence: 0.97
  },
  {
    pattern: 'hello',
    response: 'Hello! I\'m Vera, your compliance and quality management AI. I\'m here to help you understand standards, analyze compliance gaps, and provide guidance on quality requirements. What would you like to know?',
    confidence: 0.95
  }
];

async function loadQnaBank() {
  try {
    console.log('[QNA Loader] Starting Q&A bank population...');
    
    let loaded = 0;
    let errors = 0;
    
    for (const qa of QNA_RESPONSES) {
      try {
        // First, delete any existing entry with this pattern
        await queryEdcatAI(
          'DELETE FROM edcat.vera_query_response_bank WHERE user_query_pattern = $1',
          [qa.pattern]
        ).catch(() => {}); // Ignore errors if table doesn't exist or no rows
        
        // Then insert new entry
        await queryEdcatAI(
          'INSERT INTO edcat.vera_query_response_bank (user_query_pattern, response_text, confidence_score, created_at) VALUES ($1, $2, $3, NOW())',
          [qa.pattern, qa.response, qa.confidence]
        );
        
        loaded++;
        console.log(`  ✓ Loaded: "${qa.pattern}"`);
      } catch (err) {
        console.error(`  ✗ Error loading "${qa.pattern}": ${err.message}`);
        errors++;
      }
    }
    
    // Verify
    const result = await queryEdcatAI(
      'SELECT COUNT(*) as total, COUNT(response_text) as with_text FROM edcat.vera_query_response_bank'
    );
    
    console.log(`\n[QNA Loader] Complete:`);
    console.log(`  Loaded: ${loaded}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Total in DB: ${result.rows[0].total}`);
    console.log(`  With responses: ${result.rows[0].with_text}`);
    
    process.exit(0);
  } catch (error) {
    console.error('[QNA Loader] Fatal error:', error);
    process.exit(1);
  }
}

loadQnaBank();
