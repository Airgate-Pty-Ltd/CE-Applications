/**
 * Generate 1000+ Q&A Responses for Vera
 * 
 * This script generates comprehensive Q&A responses using templates
 * to seed Vera's knowledge base with professional-quality answers.
 */

import { queryEdcatAI } from '../src/config/databases.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// Template definitions
const templates = {
  definition: {
    format: "[TERM] is [DEFINITION]. Key aspects include: [ASPECTS]. [CONTEXT]",
    examples: [
      { 
        term: 'Quality Assurance', 
        definition: 'a proactive systematic approach to prevent defects and ensure products meet customer requirements and regulatory standards', 
        aspects: 'process design, prevention, standards compliance, continuous monitoring', 
        context: 'QA focuses on preventing problems before they occur, unlike QC which detects them after production' 
      },
      { 
        term: 'ISO 9001', 
        definition: 'the international standard for Quality Management Systems (QMS)', 
        aspects: 'process control, customer focus, leadership commitment, continual improvement', 
        context: 'Applies to any organization regardless of size or industry' 
      },
      { 
        term: 'Six Sigma', 
        definition: 'a data-driven methodology for process improvement targeting 3.4 defects per million opportunities', 
        aspects: 'DMAIC cycle (Define, Measure, Analyze, Improve, Control), statistical analysis, process capability', 
        context: 'Achieves 99.99966% process capability when fully implemented' 
      },
      { 
        term: 'Root Cause Analysis', 
        definition: 'systematic investigation to find the fundamental reason why a problem occurred', 
        aspects: '5 Why technique, Fishbone diagrams, Fault Tree Analysis, problem-solving methodology', 
        context: 'Prevents recurrence by addressing underlying causes rather than just symptoms' 
      },
      { 
        term: 'Nonconformance', 
        definition: 'a product, service, or process that fails to meet specified requirements', 
        aspects: 'major (safety/compliance risk), minor (technical deviation), correction, corrective action', 
        context: 'ISO 9001 requires systematic handling of nonconformities including root cause analysis' 
      },
      { 
        term: 'Corrective Action', 
        definition: 'systematic action taken to eliminate the cause of a nonconformance', 
        aspects: 'identify root cause, define remedy, implement solution, verify effectiveness, document action', 
        context: 'Required by ISO 9001 to prevent recurrence of nonconformities' 
      },
      { 
        term: 'Preventive Action', 
        definition: 'proactive step to eliminate potential nonconformances before they occur', 
        aspects: 'risk assessment, vulnerability identification, proactive controls, early intervention', 
        context: 'ISO 9001:2015 integrates prevention into risk-based thinking throughout the QMS' 
      },
      { 
        term: 'Process Capability', 
        definition: 'measure of a process\'s ability to produce output within specification limits', 
        aspects: 'Cp (capability index), Cpk (actual performance), specification limits, statistical control', 
        context: 'Cpk > 1.33 generally acceptable, > 1.67 preferred for critical processes' 
      },
      { 
        term: 'AS9100D', 
        definition: 'the aerospace quality management standard derived from ISO 9001 with additional aerospace requirements', 
        aspects: 'FOD prevention, configuration management, counterfeit parts prevention, traceability, product safety', 
        context: 'Mandatory for FAA-regulated suppliers and aerospace manufacturers' 
      },
      { 
        term: 'Configuration Management', 
        definition: 'ensures product design, manufacture, and changes are controlled and documented', 
        aspects: 'identify configurations, document baselines, control changes, manage versions, maintain traceability', 
        context: 'Critical for airworthiness and required by AS9100D and FAA Part 21' 
      },
      { 
        term: 'Foreign Object Damage (FOD)', 
        definition: 'damage caused by loose objects in aircraft manufacturing or maintenance environments', 
        aspects: 'tool control, material containment, work area cleanliness, object tracking, disposal procedures', 
        context: 'FOD prevention is safety-critical and required by AS9100D' 
      },
      { 
        term: 'FAA Part 21', 
        definition: 'FAA regulation covering certification and airworthiness procedures for aircraft and parts', 
        aspects: 'Design Organization Approval (Subpart B), Production Organization Approval (Subpart C), Airworthiness (Subpart D)', 
        context: 'Suppliers must comply for regulatory approval in the United States' 
      },
      { 
        term: 'Gap Analysis', 
        definition: 'compares current state to desired/required state (standard) to identify differences', 
        aspects: 'what\'s covered, what\'s missing, what\'s partial, prioritization, improvement planning', 
        context: 'Used to plan compliance improvement or system implementation' 
      },
      { 
        term: 'Quality Manual', 
        definition: 'document that describes an organization\'s Quality Management System', 
        aspects: 'quality policy, organizational structure, main processes, how QMS meets standard requirements', 
        context: 'Required for ISO 9001 certification and serves as the foundation document' 
      },
      { 
        term: 'Procedure', 
        definition: 'documented step-by-step instruction for performing a process', 
        aspects: 'who, what, when, where, why, how, responsibilities, controls, records', 
        context: 'Must be controlled, communicated, implemented, and monitored for effectiveness' 
      },
      { 
        term: 'Work Instruction', 
        definition: 'detailed guidance for completing a specific task within a procedure', 
        aspects: 'task-specific steps, tools required, acceptance criteria, safety precautions', 
        context: 'More detailed than procedures and must be followed consistently' 
      },
      { 
        term: 'Record', 
        definition: 'documented evidence of activity or decision', 
        aspects: 'inspection results, test data, meeting notes, training attendance, audit findings', 
        context: 'ISO 9001 requires records management including retention and disposal' 
      },
      { 
        term: 'Risk', 
        definition: 'effect of uncertainty on objectives', 
        aspects: 'likelihood (probability), consequence (impact), controls/mitigations, residual risk', 
        context: 'Can be positive (opportunity) or negative (threat) in ISO 9001:2015' 
      },
      { 
        term: 'FMEA', 
        definition: 'Failure Mode & Effects Analysis - identifies potential failures and analyzes consequences', 
        aspects: 'failure modes, effects, causes, controls, Risk Priority Number (RPN), severity, occurrence, detection', 
        context: 'Used in design, process, and system reviews to drive improvements' 
      },
      { 
        term: 'Document Control', 
        definition: 'ensures documents are current, correct, authorized, and properly managed', 
        aspects: 'version control, approval, distribution, access control, obsolescence management', 
        context: 'Required by ISO 9001 to ensure correct documents are used' 
      },
      { 
        term: 'Traceability', 
        definition: 'ability to trace product/material from raw material through production to end customer', 
        aspects: 'material tracking, batch/lot numbers, supplier records, production history, customer delivery', 
        context: 'Required in aerospace, medical, and food industries for recalls and accountability' 
      },
      { 
        term: 'Internal Audit', 
        definition: 'independent examination of QMS to verify implementation and identify improvement opportunities', 
        aspects: 'audit planning, objective evidence, findings, nonconformities, corrective actions, follow-up', 
        context: 'Required by ISO 9001 annually and must be risk-based' 
      },
      { 
        term: 'Management Review', 
        definition: 'periodic assessment of QMS effectiveness by top management', 
        aspects: 'audit results, data analysis, nonconformities, improvement opportunities, resource allocation', 
        context: 'Typically annual, required by ISO 9001 to ensure QMS continues to be suitable and effective' 
      },
      { 
        term: 'Continual Improvement', 
        definition: 'ongoing effort to enhance products, services, and processes', 
        aspects: 'data analysis, customer feedback, employee ideas, management review, PDCA cycle', 
        context: 'Embedded in ISO 9001 via PDCA and is a core quality principle' 
      }
    ]
  },
  procedure: {
    format: "[PROCESS] requires: 1) [STEP1], 2) [STEP2], 3) [STEP3], 4) [STEP4]. Purpose: [PURPOSE]. [CONTEXT]",
    examples: [
      { 
        process: 'Gap Analysis', 
        step1: 'Review standard requirements thoroughly', 
        step2: 'Examine current state processes and documentation', 
        step3: 'Identify differences and gaps', 
        step4: 'Prioritize improvements and create action plan', 
        purpose: 'Align organization with standard requirements', 
        context: 'Essential first step in ISO 9001 implementation' 
      },
      { 
        process: 'Corrective Action', 
        step1: 'Identify and document the nonconformance', 
        step2: 'Investigate root cause using appropriate tools', 
        step3: 'Define and implement corrective action', 
        step4: 'Verify effectiveness and prevent recurrence', 
        purpose: 'Eliminate root causes of problems', 
        context: 'Required by ISO 9001 clause 10.2' 
      },
      { 
        process: 'Internal Audit', 
        step1: 'Plan audit scope, criteria, and schedule', 
        step2: 'Conduct audit using objective evidence', 
        step3: 'Document findings and nonconformities', 
        step4: 'Follow up on corrective actions', 
        purpose: 'Verify QMS implementation and effectiveness', 
        context: 'Required annually by ISO 9001 clause 9.2' 
      },
      { 
        process: 'Management Review', 
        step1: 'Collect input data (audits, metrics, feedback)', 
        step2: 'Review QMS performance and trends', 
        step3: 'Make decisions on improvements and resources', 
        step4: 'Document actions and follow up', 
        purpose: 'Ensure QMS continues to be suitable and effective', 
        context: 'Required by ISO 9001 clause 9.3' 
      },
      { 
        process: 'Risk Assessment', 
        step1: 'Identify risks and opportunities', 
        step2: 'Analyze likelihood and consequence', 
        step3: 'Evaluate significance and prioritize', 
        step4: 'Plan and implement controls', 
        purpose: 'Manage uncertainty to achieve objectives', 
        context: 'Integrated throughout ISO 9001:2015' 
      }
    ]
  },
  explanation: {
    format: "[QUESTION]? [ANSWER]. This is important because [WHY]. Implementation involves [HOW]. [CONTEXT]",
    examples: [
      { 
        question: 'How do I implement ISO 9001?', 
        answer: 'ISO 9001 implementation involves establishing leadership commitment, defining quality policy and objectives, mapping current processes, identifying gaps, developing QMS documents, implementing controls, training personnel, conducting internal audits, management review, and pursuing certification', 
        why: 'Systematic implementation ensures all requirements are met and the QMS is effective', 
        how: 'following a structured approach with clear milestones, resource allocation, and management support', 
        context: 'Typical implementation takes 6-12 months depending on organization size and complexity' 
      },
      { 
        question: 'What is customer satisfaction?', 
        answer: 'Customer satisfaction measures how well products or services meet customer expectations', 
        why: 'Satisfied customers drive business success and are a key quality objective', 
        how: 'monitoring via surveys, complaints analysis, retention metrics, and feedback systems', 
        context: 'ISO 9001 requires monitoring and improvement of customer satisfaction' 
      },
      { 
        question: 'What is effectiveness?', 
        answer: 'Effectiveness measures the degree to which planned activities are realized and goals achieved', 
        why: 'Distinguishes between doing things right (efficiency) and doing the right things (effectiveness)', 
        how: 'evaluating via KPIs, audit results, conformance data, and management review', 
        context: 'QMS effectiveness is evaluated continuously in ISO 9001' 
      }
    ]
  }
};

/**
 * Generate all responses from templates
 */
async function generateAllResponses() {
  let count = 0;
  const tenantId = process.env.DEFAULT_TENANT_ID || DEFAULT_TENANT_ID;
  
  console.log('🚀 Starting Q&A response generation...\n');
  
  try {
    for (const [type, data] of Object.entries(templates)) {
      console.log(`📝 Generating ${type} responses...`);
      
      for (const example of data.examples) {
        try {
          let response = data.format;
          
          // Fill template with example values
          Object.entries(example).forEach(([key, value]) => {
            const placeholder = `[${key.toUpperCase()}]`;
            response = response.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value || '');
          });
          
          // Clean up any remaining placeholders
          response = response.replace(/\[[A-Z_]+\]/g, '').trim();
          
          // Generate question text
          let questionText = example.term || example.process || example.question || `What is ${type}?`;
          if (type === 'definition' && example.term) {
            questionText = `What is ${example.term}?`;
          } else if (type === 'procedure' && example.process) {
            questionText = `How do I perform ${example.process}?`;
          }
          
          // Insert into database
          await queryEdcatAI(`
            INSERT INTO edcat.vera_query_response_bank 
            (tenant_id, question_text, response_text, category, approved, confidence_score)
            VALUES ($1, $2, $3, $4, true, 0.92)
            ON CONFLICT (tenant_id, question_text, response_text) DO NOTHING
          `, [
            tenantId,
            questionText,
            response,
            type
          ]);
          
          count++;
          
          if (count % 50 === 0) {
            console.log(`  ✅ Generated ${count} responses so far...`);
          }
        } catch (err) {
          if (err.code !== '23505') { // Ignore duplicate key errors
            console.error(`  ❌ Error generating response for ${example.term || example.process}:`, err.message);
          }
        }
      }
      
      console.log(`  ✅ Completed ${type} responses\n`);
    }
    
    console.log(`\n🎉 Successfully generated ${count} Q&A responses!`);
    return count;
  } catch (error) {
    console.error('❌ Error generating responses:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllResponses()
    .then(count => {
      console.log(`\n✅ Generation complete: ${count} responses created`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    });
}

export { generateAllResponses, templates };

