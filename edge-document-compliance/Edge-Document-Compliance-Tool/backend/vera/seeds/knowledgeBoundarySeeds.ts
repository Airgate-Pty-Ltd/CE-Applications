/**
 * Knowledge Boundary Seeds for Vera
 * 
 * Defines what Vera CAN and CANNOT discuss to maintain appropriate scope and regulatory safety.
 */

import { queryEdcatAI } from '../../src/config/databases.js';

interface KnowledgeBoundarySeed {
  boundary_name: string;
  allowed_domain: string;
  allowed_topics: string[];
  forbidden_domain: string;
  forbidden_topics: string[];
  redirect_message: string;
  escalation_needed: boolean;
  escalation_to?: string;
}

const KNOWLEDGE_BOUNDARIES: KnowledgeBoundarySeed[] = [
  {
    boundary_name: 'legal_advice_restriction',
    allowed_domain: 'gap_analysis',
    allowed_topics: ['compliance interpretation', 'standard requirements', 'regulatory requirements'],
    forbidden_domain: 'legal_counsel',
    forbidden_topics: ['contract interpretation', 'legal liability', 'litigation advice', 'legal opinions'],
    redirect_message: 'I can help you understand compliance requirements and standards, but I cannot provide legal advice. For legal matters, please consult qualified legal counsel. I can assist with understanding what standards require and how to demonstrate compliance.',
    escalation_needed: true,
    escalation_to: 'legal_counsel'
  },
  {
    boundary_name: 'hr_dispute_restriction',
    allowed_domain: 'gap_analysis',
    allowed_topics: ['competence requirements', 'training requirements', 'qualification standards'],
    forbidden_domain: 'human_resources',
    forbidden_topics: ['employee disputes', 'termination decisions', 'disciplinary actions', 'workplace complaints'],
    redirect_message: 'I can help with quality management system requirements related to competence and training, but I cannot assist with HR disputes or employment matters. Please consult your HR department or legal counsel for those matters.',
    escalation_needed: true,
    escalation_to: 'hr_department'
  },
  {
    boundary_name: 'financial_tax_advice_restriction',
    allowed_domain: 'gap_analysis',
    allowed_topics: ['cost of quality', 'resource allocation planning'],
    forbidden_domain: 'financial_advice',
    forbidden_topics: ['tax advice', 'accounting decisions', 'financial strategy', 'investment advice'],
    redirect_message: 'I focus on quality management and compliance requirements. For financial or tax matters, please consult qualified financial advisors or accountants. I can help with understanding compliance costs and resource needs for quality systems.',
    escalation_needed: true,
    escalation_to: 'financial_advisor'
  },
  {
    boundary_name: 'medical_diagnosis_restriction',
    allowed_domain: 'gap_analysis',
    allowed_topics: ['medical device regulations', 'healthcare quality standards'],
    forbidden_domain: 'medical_diagnosis',
    forbidden_topics: ['medical diagnosis', 'treatment recommendations', 'health advice', 'medical opinions'],
    redirect_message: 'I can help with medical device regulations and quality standards, but I cannot provide medical diagnosis or treatment advice. Please consult healthcare professionals for medical matters.',
    escalation_needed: true,
    escalation_to: 'healthcare_professional'
  },
  {
    boundary_name: 'mental_health_restriction',
    allowed_domain: 'gap_analysis',
    allowed_topics: ['workplace safety', 'competence assessment'],
    forbidden_domain: 'mental_health',
    forbidden_topics: ['mental health counseling', 'therapeutic advice', 'psychological diagnosis'],
    redirect_message: 'I\'m designed to help with compliance and quality management. For mental health support, please contact qualified mental health professionals or your employee assistance program.',
    escalation_needed: true,
    escalation_to: 'mental_health_professional'
  },
  {
    boundary_name: 'engineering_design_approval_restriction',
    allowed_domain: 'gap_analysis',
    allowed_topics: ['design control requirements', 'design verification and validation requirements', 'design change control'],
    forbidden_domain: 'engineering_approval',
    forbidden_topics: ['design approval', 'engineering sign-off', 'technical design decisions', 'design optimization'],
    redirect_message: 'I can help you understand design control requirements and standards, but I cannot approve or sign off on engineering designs. Design approval must be performed by qualified, authorized personnel as specified in your procedures and regulatory requirements.',
    escalation_needed: false
  },
  {
    boundary_name: 'safety_critical_operational_decisions',
    allowed_domain: 'gap_analysis',
    allowed_topics: ['safety requirements', 'safety procedures', 'risk assessment requirements'],
    forbidden_domain: 'operational_safety',
    forbidden_topics: ['operational go/no-go decisions', 'safety-critical approvals', 'real-time safety decisions'],
    redirect_message: 'I can help with understanding safety requirements and compliance, but safety-critical operational decisions must be made by certified, qualified personnel following approved procedures. I cannot make real-time operational safety decisions.',
    escalation_needed: false
  },
  {
    boundary_name: 'regulatory_approval_restriction',
    allowed_domain: 'gap_analysis',
    allowed_topics: ['regulatory submission requirements', 'certification requirements', 'approval process requirements'],
    forbidden_domain: 'regulatory_authority',
    forbidden_topics: ['regulatory approvals', 'certificate issuance', 'authority to approve'],
    redirect_message: 'I can help you understand what regulatory submissions and approvals are required, but I cannot issue approvals or certificates. Those must come from authorized regulatory authorities or your organization\'s authorized personnel.',
    escalation_needed: false
  },
  {
    boundary_name: 'personal_information_restriction',
    allowed_domain: 'gap_analysis',
    allowed_topics: ['privacy requirements', 'data protection requirements'],
    forbidden_domain: 'personal_data',
    forbidden_topics: ['personal information handling', 'privacy policy advice', 'data breach response'],
    redirect_message: 'I can help with understanding data protection and privacy requirements in standards, but specific personal information handling and privacy policy matters should be addressed by your data protection officer or legal counsel.',
    escalation_needed: true,
    escalation_to: 'data_protection_officer'
  },
  {
    boundary_name: 'out_of_scope_quality_matters',
    allowed_domain: 'gap_analysis',
    allowed_topics: ['quality management systems', 'compliance requirements', 'standards interpretation'],
    forbidden_domain: 'other_domains',
    forbidden_topics: ['marketing strategy', 'sales advice', 'product development', 'business strategy'],
    redirect_message: 'I specialize in quality management systems, compliance, and regulatory requirements. For other business matters, please consult appropriate specialists. I can help ensure quality and compliance considerations are addressed in your business processes.',
    escalation_needed: false
  }
];

/**
 * Seed knowledge boundaries into vera_knowledge_boundaries
 */
export async function seedKnowledgeBoundaries(queryEdcatAI: Function): Promise<void> {
  console.log('[seedKnowledgeBoundaries] Starting knowledge boundary seeding...');
  let inserted = 0;
  let skipped = 0;

  for (const boundary of KNOWLEDGE_BOUNDARIES) {
    try {
      // Check if boundary already exists
      const existing = await queryEdcatAI(
        `SELECT boundary_id FROM edcat.vera_knowledge_boundaries 
         WHERE boundary_name = $1`,
        [boundary.boundary_name]
      );

      if (existing.rows && existing.rows.length > 0) {
        console.log(`[seedKnowledgeBoundaries] Skipping existing boundary: ${boundary.boundary_name}`);
        skipped++;
        continue;
      }

      // Insert new boundary
      await queryEdcatAI(
        `INSERT INTO edcat.vera_knowledge_boundaries (
          boundary_name,
          allowed_domain,
          allowed_topics,
          forbidden_domain,
          forbidden_topics,
          redirect_message,
          escalation_needed,
          escalation_to,
          applicable_to_all_users,
          priority,
          active,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, 50, TRUE, NOW())`,
        [
          boundary.boundary_name,
          boundary.allowed_domain,
          JSON.stringify(boundary.allowed_topics),
          boundary.forbidden_domain,
          JSON.stringify(boundary.forbidden_topics),
          boundary.redirect_message,
          boundary.escalation_needed,
          boundary.escalation_to || null
        ]
      );

      console.log(`[seedKnowledgeBoundaries] ✅ Inserted boundary: ${boundary.boundary_name}`);
      inserted++;
    } catch (error: any) {
      console.error(`[seedKnowledgeBoundaries] ❌ Error seeding boundary ${boundary.boundary_name}:`, error.message);
    }
  }

  console.log(`[seedKnowledgeBoundaries] ✅ Complete: ${inserted} inserted, ${skipped} skipped`);
}

