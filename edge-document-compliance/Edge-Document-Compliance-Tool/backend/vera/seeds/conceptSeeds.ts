/**
 * Concept Seeds for Vera Knowledge Graph
 * 
 * Seeds core quality management and aerospace concepts into vera_knowledge_graph_concepts.
 * 
 * These seeds are derived from industry best practices and authoritative sources,
 * paraphrased and summarized for educational/compliance assistance purposes.
 * 
 * PURPOSE:
 * - Populates Vera's concept knowledge base
 * - Enables concept-driven reasoning in gap analysis
 * - Links requirements to underlying concepts
 * 
 * EXTENSION POINTS:
 * - Add new concepts by extending the CONCEPTS array
 * - Update concept relationships in vera_concept_relationships after seeding
 * - Link concepts to requirements via requirement_ids field
 */

import { queryEdcatAI } from '../../src/config/databases.js';

interface ConceptSeed {
  concept_name: string;
  concept_description: string;
  is_universal_concept: boolean;
  appears_in_standards: string[];
  importance_score: number;
  complexity_score: number;
  implementation_examples: string[];
  common_misconceptions: string[];
}

const CONCEPTS: ConceptSeed[] = [
  // Quality Management Fundamentals
  {
    concept_name: 'context_of_the_organization',
    concept_description: 'Understanding the internal and external factors that affect an organization\'s ability to achieve quality objectives. This includes the business environment, stakeholder needs, legal and regulatory requirements, and organizational culture. Organizations must determine what affects their quality performance and how these factors interact.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'IATF16949'],
    importance_score: 0.95,
    complexity_score: 0.70,
    implementation_examples: [
      'Documented analysis of market conditions and customer expectations',
      'Risk register addressing external factors like supply chain disruptions',
      'Stakeholder mapping identifying regulatory bodies and certification requirements'
    ],
    common_misconceptions: [
      'Only external factors matter - internal culture is equally important',
      'This is a one-time exercise - context changes and must be monitored',
      'Generic templates can replace organization-specific analysis'
    ]
  },
  {
    concept_name: 'management_commitment',
    concept_description: 'Demonstrable leadership engagement in establishing, maintaining, and continuously improving the quality management system. Leadership must provide resources, establish policies, ensure roles are defined, and promote a culture of quality throughout the organization.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110', 'IATF16949'],
    importance_score: 0.98,
    complexity_score: 0.65,
    implementation_examples: [
      'Regular management review meetings with documented actions',
      'Leadership participation in internal audits and corrective action reviews',
      'Visible commitment through resource allocation and policy communication'
    ],
    common_misconceptions: [
      'Delegating to quality manager is sufficient - leadership must be actively involved',
      'Policies alone demonstrate commitment - actions and behaviors matter more',
      'Commitment is only needed during certification audits'
    ]
  },
  {
    concept_name: 'risk_based_thinking',
    concept_description: 'Systematic approach to identifying, analyzing, and addressing risks and opportunities that could affect quality objectives and conformity. This involves considering potential problems before they occur and taking preventive action rather than only reacting to issues.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110', 'ISO13485'],
    importance_score: 0.96,
    complexity_score: 0.75,
    implementation_examples: [
      'Risk registers for key processes and product realization activities',
      'Failure mode and effects analysis (FMEA) for critical processes',
      'Opportunity assessments during management reviews'
    ],
    common_misconceptions: [
      'Risk management is optional - it\'s integral to the standard',
      'All risks must be documented in detail - focus on significant risks',
      'Risk-based thinking replaces preventive action - it enhances it'
    ]
  },
  {
    concept_name: 'process_approach',
    concept_description: 'Managing activities and related resources as processes that transform inputs into outputs. Processes should be defined, monitored, measured, and improved. Understanding how processes interact helps organizations achieve intended results more effectively.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110', 'IATF16949'],
    importance_score: 0.94,
    complexity_score: 0.70,
    implementation_examples: [
      'Process maps showing interactions between design, production, and delivery',
      'Process performance indicators and monitoring mechanisms',
      'Cross-functional process teams with defined responsibilities'
    ],
    common_misconceptions: [
      'Every activity must be mapped in detail - focus on key processes',
      'Processes are only about procedures - culture and behaviors matter',
      'Once mapped, processes don\'t need monitoring or improvement'
    ]
  },

  // Operational & Product-Related Concepts
  {
    concept_name: 'configuration_management',
    concept_description: 'Systematic process for establishing and maintaining consistency of a product\'s performance, functional and physical attributes with its requirements, design, and operational information throughout its life. Critical in aerospace for tracking changes, ensuring traceability, and maintaining product integrity.',
    is_universal_concept: false,
    appears_in_standards: ['AS9100', 'AS9110'],
    importance_score: 0.97,
    complexity_score: 0.80,
    implementation_examples: [
      'Change control boards for product and process modifications',
      'Configuration identification, control, status accounting, and audits',
      'Linkage between design documents, production records, and service history'
    ],
    common_misconceptions: [
      'Configuration management is only for design - it applies throughout product life',
      'Informal change control is acceptable - formal processes are required',
      'Configuration is only needed for complex products - applies to all aerospace products'
    ]
  },
  {
    concept_name: 'product_safety',
    concept_description: 'Ensuring products do not pose unacceptable risks to health, safety, or property. In aerospace, this requires rigorous design analysis, hazard identification, safety assessments, and controls throughout the product lifecycle to prevent safety incidents.',
    is_universal_concept: false,
    appears_in_standards: ['AS9100', 'AS9110', '14CFR21'],
    importance_score: 0.99,
    complexity_score: 0.85,
    implementation_examples: [
      'Safety risk assessments during design and manufacturing',
      'Critical item identification and special controls',
      'Safety incident reporting and corrective action processes'
    ],
    common_misconceptions: [
      'Product safety is only a design responsibility - all functions contribute',
      'If a product meets specifications, it\'s automatically safe - safety is explicit',
      'Safety is only important during production - maintenance and service matter too'
    ]
  },
  {
    concept_name: 'foreign_object_damage_control',
    concept_description: 'Preventing foreign objects and debris from entering, being left in, or damaging aerospace products. FOD prevention requires clean working environments, tool control, and employee awareness to prevent contamination that could cause product failure or safety incidents.',
    is_universal_concept: false,
    appears_in_standards: ['AS9100', 'AS9110'],
    importance_score: 0.95,
    complexity_score: 0.70,
    implementation_examples: [
      'FOD prevention programs with clean room protocols',
      'Tool accountability systems and shadow boards',
      'Regular FOD audits and employee training'
    ],
    common_misconceptions: [
      'FOD control is only for assembly areas - applies to all manufacturing',
      'Visual inspection is sufficient - systematic controls are required',
      'FOD prevention is optional - it\'s a fundamental requirement'
    ]
  },
  {
    concept_name: 'traceability',
    concept_description: 'Ability to trace the history, application, or location of an item or activity through recorded identification. In aerospace, this enables tracking components, materials, and processes from receipt through delivery and service to support recalls, investigations, and regulatory compliance.',
    is_universal_concept: false,
    appears_in_standards: ['AS9100', 'AS9110', '14CFR21'],
    importance_score: 0.96,
    complexity_score: 0.75,
    implementation_examples: [
      'Material and component lot tracking through production',
      'Serial number or batch identification on products and records',
      'Linkage between receiving inspection, production, and shipping records'
    ],
    common_misconceptions: [
      'Traceability is only for critical items - broader application often required',
      'Electronic systems are mandatory - paper systems can work if properly maintained',
      'Traceability ends at delivery - service records extend it'
    ]
  },
  {
    concept_name: 'special_processes',
    concept_description: 'Processes where the resulting output cannot be fully verified by subsequent monitoring or measurement, so deficiencies become apparent only after the product is in use or the service has been delivered. Examples include welding, heat treating, and non-destructive testing where personnel competence and process validation are critical.',
    is_universal_concept: false,
    appears_in_standards: ['AS9100', 'AS9110', 'IATF16949'],
    importance_score: 0.94,
    complexity_score: 0.80,
    implementation_examples: [
      'Process validation records demonstrating process capability',
      'Qualification and periodic re-qualification of personnel',
      'Process parameter monitoring and control records'
    ],
    common_misconceptions: [
      'Any process requiring skill is special - only unverifiable outputs qualify',
      'Final inspection replaces validation - special processes require upfront validation',
      'Once validated, processes don\'t need ongoing monitoring'
    ]
  },
  {
    concept_name: 'inspection_and_test',
    concept_description: 'Activities to verify product conformity and detect nonconformities. This includes receiving inspection, in-process inspection, final inspection, and testing. Inspection and test results provide evidence of conformity and feed into decision-making about product release.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110', 'IATF16949'],
    importance_score: 0.93,
    complexity_score: 0.65,
    implementation_examples: [
      'Receiving inspection procedures and acceptance criteria',
      'In-process inspection checkpoints and sampling plans',
      'Final inspection records and release authorization'
    ],
    common_misconceptions: [
      'Inspection replaces good process control - prevention is primary',
      'All characteristics must be inspected - risk-based approaches are acceptable',
      'Inspection results don\'t need retention - records are required'
    ]
  },
  {
    concept_name: 'nonconformity_and_correction',
    concept_description: 'Non-fulfillment of a requirement, and the immediate action taken to eliminate a detected nonconformity. Corrections address the immediate issue but don\'t necessarily address the root cause. This is distinct from corrective action, which seeks to prevent recurrence.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110'],
    importance_score: 0.92,
    complexity_score: 0.60,
    implementation_examples: [
      'Nonconforming material segregation and identification',
      'Correction actions such as rework, repair, or rejection',
      'Documentation of nonconformities and corrections taken'
    ],
    common_misconceptions: [
      'All nonconformities require corrective action - corrections may be sufficient',
      'Nonconformities can be ignored if minor - all must be addressed',
      'Correction replaces the need for corrective action - both serve different purposes'
    ]
  },
  {
    concept_name: 'corrective_action',
    concept_description: 'Action to eliminate the cause of a nonconformity and to prevent recurrence. This requires root cause analysis, evaluation of the need for action, implementation of action, and review of effectiveness. Critical for preventing repeated problems and improving system performance.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110', 'ISO13485'],
    importance_score: 0.96,
    complexity_score: 0.75,
    implementation_examples: [
      'Root cause analysis using tools like 5 Why, fishbone diagrams, or FMEA',
      'Corrective action plans with responsibilities and timelines',
      'Effectiveness reviews to verify actions prevented recurrence'
    ],
    common_misconceptions: [
      'Corrective action is only needed for major issues - systematic approach applies to all',
      'Immediate fixes are sufficient - root cause analysis is required',
      'Once implemented, effectiveness review is optional - it\'s mandatory'
    ]
  },

  // Support & Oversight Concepts
  {
    concept_name: 'internal_audit',
    concept_description: 'Systematic, independent process for obtaining evidence and evaluating it objectively to determine the extent to which quality management system requirements are fulfilled. Internal audits identify opportunities for improvement and verify system effectiveness.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110', 'IATF16949'],
    importance_score: 0.94,
    complexity_score: 0.70,
    implementation_examples: [
      'Annual audit programs covering all processes and standards',
      'Competent, objective auditors with appropriate training',
      'Audit reports, nonconformities, and follow-up verification'
    ],
    common_misconceptions: [
      'Auditors must be external - internal auditors are required and acceptable',
      'Audits are inspections - they evaluate process effectiveness, not just compliance',
      'Finding no issues means audits are unnecessary - audits should find improvement opportunities'
    ]
  },
  {
    concept_name: 'supplier_evaluation_and_monitoring',
    concept_description: 'Process for selecting, evaluating, and monitoring suppliers to ensure they provide products and services that meet requirements. This includes initial qualification, ongoing performance monitoring, and actions when suppliers don\'t meet expectations.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110', 'IATF16949'],
    importance_score: 0.93,
    complexity_score: 0.75,
    implementation_examples: [
      'Supplier qualification criteria and evaluation processes',
      'Performance monitoring through delivery, quality, and service metrics',
      'Supplier audits, development programs, and corrective action'
    ],
    common_misconceptions: [
      'Once qualified, suppliers don\'t need monitoring - ongoing evaluation is required',
      'Supplier certification is sufficient - performance monitoring is still needed',
      'All suppliers require the same level of control - risk-based approaches are appropriate'
    ]
  },
  {
    concept_name: 'competence_and_training',
    concept_description: 'Ensuring personnel performing work affecting product quality are competent based on education, training, or experience. Organizations must determine required competencies, provide training, evaluate effectiveness, and retain records.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110', 'IATF16949'],
    importance_score: 0.92,
    complexity_score: 0.65,
    implementation_examples: [
      'Competency matrices defining required skills for positions',
      'Training plans, delivery, and effectiveness evaluation',
      'Records of qualifications, certifications, and continuing education'
    ],
    common_misconceptions: [
      'Training records are optional - documentation is required',
      'One-time training is sufficient - ongoing competence maintenance is needed',
      'Experience alone demonstrates competence - evaluation and records are required'
    ]
  },
  {
    concept_name: 'document_control',
    concept_description: 'Processes to ensure documents are approved, current, accessible, and protected from unintended use. This includes control of external documents, version control, distribution management, and obsolete document handling.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110', 'IATF16949'],
    importance_score: 0.91,
    complexity_score: 0.60,
    implementation_examples: [
      'Document approval and revision control procedures',
      'Controlled distribution lists and access controls',
      'Obsolete document identification and removal'
    ],
    common_misconceptions: [
      'Electronic systems are required - paper systems can work if properly controlled',
      'All documents need control - focus on documents affecting quality',
      'Version control is optional - current revision must be identifiable'
    ]
  },

  // Maintenance-Specific (AS9110)
  {
    concept_name: 'maintenance_planning',
    concept_description: 'Systematic process for determining maintenance requirements, scheduling resources, and coordinating activities to ensure continued airworthiness. This includes maintenance program development, work order planning, and resource allocation.',
    is_universal_concept: false,
    appears_in_standards: ['AS9110'],
    importance_score: 0.96,
    complexity_score: 0.80,
    implementation_examples: [
      'Maintenance program development based on manufacturer and regulatory requirements',
      'Work order planning with parts, labor, and tooling identification',
      'Scheduling systems ensuring qualified personnel and certified parts availability'
    ],
    common_misconceptions: [
      'Planning is only scheduling - it includes technical and resource planning',
      'Reactive maintenance is acceptable - proactive planning is required',
      'Planning is separate from execution - they must be coordinated'
    ]
  },
  {
    concept_name: 'continued_airworthiness',
    concept_description: 'Ensuring aircraft remain in a condition for safe operation throughout their operational life. This requires proper maintenance, modifications, repairs, and compliance with airworthiness directives and service bulletins.',
    is_universal_concept: false,
    appears_in_standards: ['AS9110', '14CFR21', '14CFR145'],
    importance_score: 0.98,
    complexity_score: 0.85,
    implementation_examples: [
      'Airworthiness directive and service bulletin tracking and compliance',
      'Maintenance record keeping demonstrating continued airworthiness',
      'Configuration management ensuring modifications are documented and approved'
    ],
    common_misconceptions: [
      'Continued airworthiness is only during maintenance - it\'s a continuous requirement',
      'Original configuration must be maintained - approved modifications are acceptable',
      'Record keeping is optional - comprehensive records are mandatory'
    ]
  },
  {
    concept_name: 'release_to_service',
    concept_description: 'Certification that maintenance has been completed in accordance with approved data and the aircraft or component is approved for return to service. This requires authorized release certification by qualified personnel.',
    is_universal_concept: false,
    appears_in_standards: ['AS9110', '14CFR145'],
    importance_score: 0.97,
    complexity_score: 0.75,
    implementation_examples: [
      'Authorized release certificates (EASA Form 1, FAA 8130-3, etc.)',
      'Qualified inspector or certifying staff sign-off',
      'Documentation of work performed and parts installed'
    ],
    common_misconceptions: [
      'Any technician can release - only authorized personnel',
      'Release is automatic after maintenance - explicit certification is required',
      'Electronic signatures aren\'t acceptable - check regulatory requirements'
    ]
  },
  {
    concept_name: 'defect_reporting_and_feedback',
    concept_description: 'Systematic process for reporting defects, discrepancies, and service difficulties to manufacturers, regulators, and customers. This enables safety improvements and supports continued airworthiness programs.',
    is_universal_concept: false,
    appears_in_standards: ['AS9110', '14CFR21', '14CFR145'],
    importance_score: 0.94,
    complexity_score: 0.70,
    implementation_examples: [
      'Service difficulty reports to regulatory authorities',
      'Defect reporting to manufacturers and parts suppliers',
      'Customer notification processes for significant findings'
    ],
    common_misconceptions: [
      'Only major defects need reporting - regulatory requirements may be broader',
      'Internal reporting is sufficient - external reporting may be required',
      'Defect reporting is optional - it\'s often a regulatory requirement'
    ]
  },

  // Additional Critical Concepts
  {
    concept_name: 'design_and_development',
    concept_description: 'Systematic process for transforming requirements into specifications, designs, and ultimately products. In aerospace, this requires rigorous validation, verification, risk management, and configuration control throughout the design lifecycle.',
    is_universal_concept: false,
    appears_in_standards: ['AS9100', '14CFR21'],
    importance_score: 0.95,
    complexity_score: 0.85,
    implementation_examples: [
      'Design and development planning with stages and reviews',
      'Design verification and validation activities',
      'Design change control and configuration management'
    ],
    common_misconceptions: [
      'Design verification and validation are the same - verification checks design meets requirements, validation checks it meets user needs',
      'Design changes don\'t need control - all changes must be controlled',
      'Design review is optional - structured reviews are required'
    ]
  },
  {
    concept_name: 'monitoring_and_measurement',
    concept_description: 'Systematic collection and analysis of data to determine process performance and product conformity. This includes what to monitor, how to measure, when to measure, and what to do with results.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110'],
    importance_score: 0.91,
    complexity_score: 0.70,
    implementation_examples: [
      'Key performance indicators for critical processes',
      'Measurement system analysis and calibration',
      'Data analysis and trend identification for improvement'
    ],
    common_misconceptions: [
      'Measuring everything is best - focus on critical characteristics',
      'Measurement equipment doesn\'t need calibration - it must be calibrated or verified',
      'Data collection is sufficient - analysis and action are required'
    ]
  },
  {
    concept_name: 'preventive_action',
    concept_description: 'Action to eliminate the cause of a potential nonconformity or other potential undesirable situation. While similar to corrective action, preventive action addresses potential problems before they occur, often identified through risk assessment or trend analysis.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001'],
    importance_score: 0.88,
    complexity_score: 0.70,
    implementation_examples: [
      'Risk assessments identifying potential failures',
      'Trend analysis revealing potential problems',
      'Preventive action plans to address identified risks'
    ],
    common_misconceptions: [
      'Preventive action is the same as corrective action - they address different situations',
      'If nothing has gone wrong, preventive action isn\'t needed - proactive approach is valuable',
      'All risks need preventive action - prioritize significant risks'
    ]
  },
  {
    concept_name: 'customer_satisfaction',
    concept_description: 'Understanding and meeting customer requirements and expectations to achieve customer satisfaction. This involves determining customer needs, measuring satisfaction, and using feedback for improvement.',
    is_universal_concept: true,
    appears_in_standards: ['AS9100', 'ISO9001', 'AS9110'],
    importance_score: 0.90,
    complexity_score: 0.60,
    implementation_examples: [
      'Customer requirement review and acceptance processes',
      'Customer satisfaction surveys and feedback collection',
      'Analysis of customer feedback and complaint handling'
    ],
    common_misconceptions: [
      'Meeting specifications ensures satisfaction - customer expectations may be broader',
      'Customer feedback is optional - systematic collection and analysis are required',
      'Satisfaction measurement is only during audits - continuous monitoring is better'
    ]
  }
];

/**
 * Seed concepts into vera_knowledge_graph_concepts table
 * 
 * @param queryEdcatAI - Database query function for edcat schema
 * @returns Promise resolving when seeding is complete
 */
export async function seedConcepts(queryEdcatAI: Function): Promise<void> {
  console.log('[seedConcepts] Starting concept seeding...');
  let inserted = 0;
  let skipped = 0;

  for (const concept of CONCEPTS) {
    try {
      // Check if concept already exists
      const existing = await queryEdcatAI(
        `SELECT concept_id FROM edcat.vera_knowledge_graph_concepts 
         WHERE concept_name = $1`,
        [concept.concept_name]
      );

      if (existing.rows && existing.rows.length > 0) {
        console.log(`[seedConcepts] Skipping existing concept: ${concept.concept_name}`);
        skipped++;
        continue;
      }

      // Insert new concept
      await queryEdcatAI(
        `INSERT INTO edcat.vera_knowledge_graph_concepts (
          concept_name,
          concept_description,
          is_universal_concept,
          appears_in_standards,
          importance_score,
          complexity_score,
          implementation_examples,
          common_misconceptions,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          concept.concept_name,
          concept.concept_description,
          concept.is_universal_concept,
          JSON.stringify(concept.appears_in_standards),
          concept.importance_score,
          concept.complexity_score,
          JSON.stringify(concept.implementation_examples),
          JSON.stringify(concept.common_misconceptions)
        ]
      );

      console.log(`[seedConcepts] ✅ Inserted concept: ${concept.concept_name}`);
      inserted++;
    } catch (error: any) {
      console.error(`[seedConcepts] ❌ Error seeding concept ${concept.concept_name}:`, error.message);
      // Continue with next concept
    }
  }

  console.log(`[seedConcepts] ✅ Complete: ${inserted} inserted, ${skipped} skipped`);
}

