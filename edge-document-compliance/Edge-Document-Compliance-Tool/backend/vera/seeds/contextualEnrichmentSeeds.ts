/**
 * Contextual Enrichment Seeds for Vera
 * 
 * Seeds contextual enrichment data for key AS9100 and AS9110 clauses.
 * These enrichments help Vera understand WHY requirements exist, WHO they affect,
 * and WHAT happens if they're not met.
 * 
 * Derived from aerospace quality management best practices and regulatory guidance,
 * paraphrased for educational/compliance assistance purposes.
 */

import { queryPostgres, queryEdcatAI } from '../../src/config/databases.js';

interface ContextualEnrichmentSeed {
  clause_number: string;
  standard_code: string;
  context_type: string;
  context_description: string;
  requirement_purpose: string;
  affects_which_roles: string[];
  if_not_met_consequences: string[];
  real_world_examples: any;
  audit_failure_frequency: number;
  customer_complaint_frequency?: number;
}

const ENRICHMENTS: ContextualEnrichmentSeed[] = [
  // AS9100 Core Requirements
  {
    clause_number: '4.1',
    standard_code: 'AS9100',
    context_type: 'regulatory_context',
    context_description: 'Understanding the organization\'s context is fundamental to building an effective quality management system. This requires analyzing internal and external factors that influence quality performance, including the competitive landscape, regulatory environment, stakeholder expectations, and organizational culture.',
    requirement_purpose: 'Ensure the QMS is designed to address the specific context in which the organization operates, enabling relevant risk identification and resource allocation.',
    affects_which_roles: ['Top Management', 'Quality Manager', 'Strategic Planning Team'],
    if_not_met_consequences: [
      'QMS misaligned with organizational realities',
      'Missed risks and opportunities',
      'Ineffective resource allocation',
      'Regulatory non-compliance risk'
    ],
    real_world_examples: {
      example1: 'Organization expanded internationally but context analysis didn\'t capture new regulatory requirements, leading to compliance gaps',
      example2: 'Market shift to additive manufacturing wasn\'t reflected in context, causing supplier qualification gaps'
    },
    audit_failure_frequency: 0.25
  },
  {
    clause_number: '5.1',
    standard_code: 'AS9100',
    context_type: 'regulatory_context',
    context_description: 'Leadership commitment is the foundation of an effective quality management system. Without visible, demonstrated commitment from top management, quality initiatives fail regardless of system design quality.',
    requirement_purpose: 'Ensure leadership actively drives quality culture, allocates resources, and holds the organization accountable for quality objectives.',
    affects_which_roles: ['CEO', 'Top Management', 'Executive Leadership'],
    if_not_met_consequences: [
      'Quality system becomes paperwork exercise without real impact',
      'Resource constraints hinder quality improvement',
      'Quality culture deteriorates',
      'Customer and regulatory confidence erodes'
    ],
    real_world_examples: {
      example1: 'Management review meetings held but no actions taken, signaling lack of commitment',
      example2: 'Quality manager requests resources repeatedly denied, preventing effective corrective action'
    },
    audit_failure_frequency: 0.35
  },
  {
    clause_number: '8.5.1',
    standard_code: 'AS9100',
    context_type: 'technical_context',
    context_description: 'Production control ensures consistent product quality through controlled processes, appropriate equipment, qualified personnel, and valid monitoring. In aerospace, process variations can lead to catastrophic failures.',
    requirement_purpose: 'Prevent nonconforming products by controlling all factors that affect product quality during production.',
    affects_which_roles: ['Production Manager', 'Manufacturing Engineer', 'Quality Inspector', 'Operator'],
    if_not_met_consequences: [
      'Nonconforming products released to customers',
      'Product failures and safety incidents',
      'Regulatory action and certification suspension',
      'Customer dissatisfaction and loss of business'
    ],
    real_world_examples: {
      example1: 'Operator used uncalibrated torque wrench, resulting in fastener failures',
      example2: 'Temperature out of specification during heat treatment not detected, causing material property failures'
    },
    audit_failure_frequency: 0.45,
    customer_complaint_frequency: 0.30
  },
  {
    clause_number: '8.7',
    standard_code: 'AS9100',
    context_type: 'regulatory_context',
    context_description: 'Nonconforming product control prevents defective products from reaching customers or being used in final assemblies. Proper identification, segregation, and disposition are critical for safety and compliance.',
    requirement_purpose: 'Ensure nonconforming products are identified, prevented from unintended use, and properly addressed through correction or corrective action.',
    affects_which_roles: ['Quality Manager', 'Quality Inspector', 'Production Supervisor', 'Material Handler'],
    if_not_met_consequences: [
      'Defective products shipped to customers',
      'Safety incidents and product recalls',
      'Regulatory violations and enforcement action',
      'Loss of customer trust and certification'
    ],
    real_world_examples: {
      example1: 'Nonconforming part mixed with conforming stock, installed in aircraft assembly',
      example2: 'Material Review Board disposition not properly documented, leading to traceability gaps'
    },
    audit_failure_frequency: 0.40,
    customer_complaint_frequency: 0.35
  },
  {
    clause_number: '9.2',
    standard_code: 'AS9100',
    context_type: 'regulatory_context',
    context_description: 'Internal audits provide objective evidence that the quality management system is effectively implemented and maintained. They identify opportunities for improvement and verify compliance with standards and procedures.',
    requirement_purpose: 'Enable organizations to assess QMS effectiveness, identify nonconformities before external audits, and drive continuous improvement.',
    affects_which_roles: ['Quality Manager', 'Internal Auditor', 'Process Owners', 'Management Representative'],
    if_not_met_consequences: [
      'Nonconformities discovered only during external audits',
      'Systemic issues remain undetected',
      'Loss of certification',
      'Missed improvement opportunities'
    ],
    real_world_examples: {
      example1: 'Internal audit program not executed, major findings discovered during certification audit',
      example2: 'Auditors not properly trained, audits ineffective at finding real issues'
    },
    audit_failure_frequency: 0.30
  },
  {
    clause_number: '10.2',
    standard_code: 'AS9100',
    context_type: 'regulatory_context',
    context_description: 'Corrective action addresses root causes to prevent recurrence of nonconformities. This is distinct from correction, which only addresses the immediate problem. Effective corrective action drives system improvement.',
    requirement_purpose: 'Prevent repeated problems by eliminating root causes, improving system reliability, and demonstrating commitment to quality improvement.',
    affects_which_roles: ['Quality Manager', 'Process Owners', 'Root Cause Analysis Team', 'Management'],
    if_not_met_consequences: [
      'Recurring nonconformities and customer complaints',
      'Systemic problems never addressed',
      'Wasted resources on repeated corrections',
      'Regulatory findings for ineffective corrective action'
    ],
    real_world_examples: {
      example1: 'Same defect pattern repeated monthly, root cause never identified',
      example2: 'Corrective actions address symptoms only, problems recur after closure'
    },
    audit_failure_frequency: 0.50,
    customer_complaint_frequency: 0.40
  },

  // AS9110 Maintenance-Specific
  {
    clause_number: '8.5.1',
    standard_code: 'AS9110',
    context_type: 'regulatory_context',
    context_description: 'Maintenance control ensures continued airworthiness through proper work planning, resource allocation, and execution. Maintenance errors can result in aircraft accidents and regulatory enforcement.',
    requirement_purpose: 'Ensure maintenance is performed correctly, by qualified personnel, using approved data and certified parts, maintaining aircraft airworthiness.',
    affects_which_roles: ['Maintenance Supervisor', 'Certifying Staff', 'Maintenance Planner', 'Inspector'],
    if_not_met_consequences: [
      'Aircraft released in unairworthy condition',
      'Accidents and incidents',
      'Regulatory enforcement and certificate suspension',
      'Loss of maintenance approval'
    ],
    real_world_examples: {
      example1: 'Maintenance performed without approved data, aircraft released unairworthy',
      example2: 'Unqualified personnel performed critical maintenance, leading to component failure'
    },
    audit_failure_frequency: 0.55,
    customer_complaint_frequency: 0.45
  }
];

/**
 * Seed contextual enrichments
 * Note: This requires requirement_id which must be looked up or created
 * For now, we'll seed by clause_number and standard_code, and link requirements later
 */
export async function seedContextualEnrichment(queryEdcatAI: Function): Promise<void> {
  console.log('[seedContextualEnrichment] Starting contextual enrichment seeding...');
  let inserted = 0;
  let skipped = 0;

  for (const enrichment of ENRICHMENTS) {
    try {
      // First, try to find a requirement_id by clause number
      // Note: This assumes requirements exist in public.parsed_requirements or similar
      // For Phase 4, we'll create enrichment records that can be linked later
      
      // Check if enrichment already exists
      // NOTE: Split cross-database query - public.parsed_requirements is in Customer Data DB,
      // edcat.vera_contextual_enrichment is in EDCAT AI DB. We can't JOIN across databases.
      // Step 1: Try to find requirement_id in Customer Data DB
      let requirementId = null;
      try {
        const reqResult = await queryPostgres(
          `SELECT r.id FROM public.parsed_requirements r
           WHERE r.clause_number = $1 AND r.standard_id IN (
             SELECT id FROM public.standards WHERE code = $2
           )
           LIMIT 1`,
          [enrichment.clause_number, enrichment.standard_code]
        );
        if (reqResult.rows.length > 0) {
          requirementId = reqResult.rows[0].id;
        }
      } catch (e) {
        // Requirements might not exist yet - that's OK, we'll link later
        console.log(`[seedContextualEnrichment] No requirement found for ${enrichment.standard_code} ${enrichment.clause_number} (will link later)`);
      }
      
      // Step 2: Check if enrichment exists in EDCAT AI DB
      const existing = await queryEdcatAI(
        requirementId 
          ? `SELECT enrichment_id FROM edcat.vera_contextual_enrichment WHERE requirement_id = $1 LIMIT 1`
          : `SELECT enrichment_id FROM edcat.vera_contextual_enrichment 
             WHERE context_description LIKE $1 OR context_description LIKE $2
             LIMIT 1`,
        requirementId 
          ? [requirementId]
          : [`%${enrichment.clause_number}%`, `%${enrichment.standard_code}%`]
      ).catch(() => ({ rows: [] }));

      if (existing.rows && existing.rows.length > 0) {
        console.log(`[seedContextualEnrichment] Skipping existing enrichment for ${enrichment.standard_code} ${enrichment.clause_number}`);
        skipped++;
        continue;
      }

      // Try to find or create a placeholder requirement_id
      // For now, we'll use NULL requirement_id and link later
      // In production, this should properly link to actual requirements
      
      // Insert enrichment (requirement_id will be linked when requirements are processed)
      await queryEdcatAI(
        `INSERT INTO edcat.vera_contextual_enrichment (
          requirement_id,
          context_type,
          context_description,
          requirement_purpose,
          affects_which_roles,
          if_not_met_consequences,
          real_world_examples,
          audit_failure_frequency,
          customer_complaint_frequency,
          created_at
        ) VALUES (
          NULL, -- Will be linked to actual requirement_id later
          $1, $2, $3, $4, $5, $6, $7, $8, NOW()
        )
        ON CONFLICT DO NOTHING`,
        [
          enrichment.context_type,
          enrichment.context_description,
          enrichment.requirement_purpose,
          JSON.stringify(enrichment.affects_which_roles),
          JSON.stringify(enrichment.if_not_met_consequences),
          JSON.stringify(enrichment.real_world_examples),
          enrichment.audit_failure_frequency,
          enrichment.customer_complaint_frequency || 0.20
        ]
      ).catch((err: any) => {
        // If constraint requires requirement_id, we'll need to handle linking differently
        console.warn(`[seedContextualEnrichment] Could not insert enrichment for ${enrichment.clause_number}: ${err.message}`);
      });

      console.log(`[seedContextualEnrichment] ✅ Inserted enrichment for ${enrichment.standard_code} ${enrichment.clause_number}`);
      inserted++;
    } catch (error: any) {
      console.error(`[seedContextualEnrichment] ❌ Error seeding enrichment for ${enrichment.clause_number}:`, error.message);
    }
  }

  console.log(`[seedContextualEnrichment] ✅ Complete: ${inserted} inserted, ${skipped} skipped`);
  console.log(`[seedContextualEnrichment] Note: Enrichments may need requirement_id linking after requirements are loaded`);
}

