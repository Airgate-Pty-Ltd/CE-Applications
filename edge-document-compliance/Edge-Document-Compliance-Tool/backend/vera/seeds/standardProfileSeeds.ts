/**
 * Standard Profile Seeds for Vera
 * 
 * Seeds standard profiles with Vera's understanding of each standard's intent, scope, and characteristics.
 * Derived from industry knowledge and regulatory guidance, paraphrased for educational purposes.
 */

import { queryEdcatAI } from '../../src/config/databases.js';

interface StandardProfileSeed {
  standard_code: string;
  standard_full_name: string;
  vera_knowledge_summary: string;
  strategic_intent: string;
  section_count: number;
  clause_count: number;
  typical_implementations: any;
  typical_gaps: string[];
  related_standards: any;
  industry_variations?: any;
}

const STANDARD_PROFILES: StandardProfileSeed[] = [
  {
    standard_code: 'AS9100',
    standard_full_name: 'AS9100D - Quality Management Systems - Requirements for Aviation, Space, and Defense Organizations',
    vera_knowledge_summary: 'AS9100D builds upon ISO 9001:2015 with additional aerospace-specific requirements. It emphasizes risk-based thinking, configuration management, product safety, and supply chain control. The standard addresses the unique challenges of aerospace manufacturing including long product lifecycles, high reliability requirements, and regulatory oversight from authorities like FAA, EASA, and defense agencies.',
    strategic_intent: 'Ensure aerospace products and services meet customer and regulatory requirements through robust quality management systems that prevent defects, ensure traceability, and maintain airworthiness throughout product lifecycles.',
    section_count: 10,
    clause_count: 350,
    typical_implementations: {
      config_management: 'Formal configuration control boards, engineering change orders, and configuration identification systems',
      risk_management: 'Failure mode and effects analysis (FMEA), hazard analysis, and risk registers',
      supplier_control: 'Approved supplier lists, source inspection, and supplier development programs',
      special_processes: 'Validation and qualification of welding, heat treatment, and non-destructive testing processes'
    },
    typical_gaps: [
      'Weak risk-based thinking - treating risk management as checkbox exercise',
      'Configuration management not fully implemented or not consistently applied',
      'Supplier control lacks rigor - relying on certification without performance monitoring',
      'Special process validation incomplete or personnel qualifications not maintained',
      'FOD prevention programs not effectively implemented across all manufacturing areas',
      'Management review focuses on metrics without driving improvement actions'
    ],
    related_standards: {
      'based_on': 'ISO 9001:2015',
      'complements': ['AS9110', 'AS9120'],
      'aligned_with': ['14 CFR 21', '14 CFR 145', 'EASA Part 21', 'EASA Part 145']
    },
    industry_variations: {
      'OEM': 'Emphasizes design control and configuration management',
      'Supplier': 'Focuses on production control and customer-specific requirements',
      'Maintenance': 'Overlaps with AS9110 for repair and overhaul operations'
    }
  },
  {
    standard_code: 'AS9110',
    standard_full_name: 'AS9110C - Quality Management Systems - Requirements for Aviation, Space, and Defense Maintenance Organizations',
    vera_knowledge_summary: 'AS9110C is specifically designed for maintenance, repair, and overhaul (MRO) organizations. It extends AS9100 with maintenance-specific requirements including maintenance planning, continued airworthiness, release to service, and defect reporting. The standard ensures maintenance organizations maintain aircraft in airworthy condition throughout their operational life.',
    strategic_intent: 'Ensure maintenance organizations maintain aircraft airworthiness through proper planning, execution, documentation, and release processes that comply with regulatory requirements and manufacturer specifications.',
    section_count: 10,
    clause_count: 380,
    typical_implementations: {
      maintenance_planning: 'Work order systems, resource planning, and maintenance program development',
      continued_airworthiness: 'Airworthiness directive tracking, service bulletin compliance, and airworthiness review',
      release_to_service: 'Authorized release certificates (Form 1, 8130-3), inspector qualification, and certification processes',
      defect_reporting: 'Service difficulty reports to authorities and defect feedback to manufacturers'
    },
    typical_gaps: [
      'Maintenance planning lacks detail - work orders missing parts, tooling, or certification requirements',
      'Release to service not properly authorized - unqualified personnel signing certificates',
      'Continued airworthiness tracking incomplete - AD/SB compliance not systematically managed',
      'Maintenance records incomplete or not properly linked to aircraft/component history',
      'Defect reporting not timely or not submitted to appropriate authorities',
      'Personnel qualification and training records not maintained or not current'
    ],
    related_standards: {
      'extends': 'AS9100',
      'regulatory': ['14 CFR 145', 'EASA Part 145', '14 CFR 21.137'],
      'complements': ['AS9120']
    },
    industry_variations: {
      'Line_Maintenance': 'Focus on turnaround time and operational constraints',
      'Heavy_Maintenance': 'Emphasizes long-term planning and major component overhaul',
      'Component_Repair': 'Concentrates on workshop processes and component certification'
    }
  },
  {
    standard_code: 'ISO9001',
    standard_full_name: 'ISO 9001:2015 - Quality Management Systems - Requirements',
    vera_knowledge_summary: 'ISO 9001:2015 is the internationally recognized standard for quality management systems. It emphasizes customer focus, leadership, engagement of people, process approach, improvement, evidence-based decision making, and relationship management. The standard applies to organizations of all sizes and industries seeking to demonstrate ability to consistently provide products and services that meet customer and regulatory requirements.',
    strategic_intent: 'Provide a framework for organizations to establish, implement, maintain, and continuously improve quality management systems that enhance customer satisfaction and organizational performance.',
    section_count: 10,
    clause_count: 280,
    typical_implementations: {
      process_approach: 'Process maps, process ownership, and process performance indicators',
      risk_management: 'Risk registers, SWOT analysis, and opportunity identification',
      customer_focus: 'Customer requirement review, satisfaction measurement, and complaint handling',
      continuous_improvement: 'Management review, corrective action, and quality objectives'
    },
    typical_gaps: [
      'Context of organization not properly analyzed - missing external/internal factors',
      'Risk-based thinking not integrated into processes - treated as separate activity',
      'Process approach not fully implemented - procedures exist but interactions not understood',
      'Management review ineffective - metrics reviewed but actions not driven',
      'Customer satisfaction not systematically measured or acted upon'
    ],
    related_standards: {
      'foundation_for': ['AS9100', 'IATF 16949', 'ISO 13485'],
      'compatible_with': ['ISO 14001', 'ISO 45001']
    }
  },
  {
    standard_code: '14CFR21',
    standard_full_name: '14 CFR Part 21 - Certification Procedures for Products and Articles',
    vera_knowledge_summary: 'FAA Part 21 establishes requirements for certification of aircraft, engines, propellers, and articles. It defines processes for type certification, production certification, and airworthiness certification. The standard ensures products meet airworthiness standards and are manufactured in compliance with approved designs.',
    strategic_intent: 'Ensure aircraft and components meet airworthiness standards through rigorous design approval, production oversight, and certification processes that protect public safety.',
    section_count: 7,
    clause_count: 150,
    typical_implementations: {
      type_certification: 'Design approval processes, compliance demonstration, and type certificate issuance',
      production_certification: 'Production approval holders (PAH), quality systems, and conformity inspections',
      airworthiness_certification: 'Standard airworthiness certificates, export airworthiness approvals, and special certificates'
    },
    typical_gaps: [
      'Design data not properly controlled or not current',
      'Production processes deviate from approved design without proper change approval',
      'Conformity inspections incomplete or not properly documented',
      'Airworthiness certificates issued incorrectly or without proper authorization',
      'Export airworthiness approvals not properly processed'
    ],
    related_standards: {
      'regulatory_framework': ['14 CFR 21.137', '14 CFR 21.165', '14 CFR 43', '14 CFR 145'],
      'complements': ['AS9100', 'AS9110']
    }
  },
  {
    standard_code: 'ISO13485',
    standard_full_name: 'ISO 13485:2016 - Medical Devices - Quality Management Systems - Requirements for Regulatory Purposes',
    vera_knowledge_summary: 'ISO 13485 is specifically designed for medical device manufacturers and related organizations. It emphasizes design control, risk management, regulatory compliance, and post-market surveillance. The standard ensures medical devices are safe and effective throughout their lifecycle.',
    strategic_intent: 'Ensure medical device organizations establish quality management systems that comply with regulatory requirements and consistently produce safe, effective medical devices.',
    section_count: 8,
    clause_count: 320,
    typical_implementations: {
      design_control: 'Design planning, verification, validation, and design change control',
      risk_management: 'Hazard analysis, risk assessment, and risk control measures',
      regulatory_compliance: 'Regulatory submissions, device registration, and regulatory communication',
      post_market_surveillance: 'Complaint handling, adverse event reporting, and post-market studies'
    },
    typical_gaps: [
      'Design control not fully implemented - validation incomplete or design changes not controlled',
      'Risk management not integrated throughout product lifecycle',
      'Regulatory compliance reactive rather than proactive',
      'Post-market surveillance inadequate - complaints and adverse events not systematically handled'
    ],
    related_standards: {
      'based_on': 'ISO 9001',
      'regulatory_alignment': ['FDA QSR', 'EU MDR', 'MDSAP'],
      'complements': ['ISO 14971', 'IEC 62304']
    }
  },
  {
    standard_code: 'IATF16949',
    standard_full_name: 'IATF 16949:2016 - Quality Management System for Automotive Organizations',
    vera_knowledge_summary: 'IATF 16949 extends ISO 9001 with automotive-specific requirements. It emphasizes customer-specific requirements, advanced product quality planning (APQP), production part approval process (PPAP), and supplier development. The standard addresses the automotive industry\'s need for defect prevention, reduction of variation, and supply chain management.',
    strategic_intent: 'Ensure automotive organizations implement quality management systems that prevent defects, reduce variation, and continuously improve to meet automotive industry customer requirements.',
    section_count: 10,
    clause_count: 400,
    typical_implementations: {
      apqp: 'Advanced product quality planning, design FMEA, process FMEA, and control plans',
      ppap: 'Production part approval process, capability studies, and customer approval',
      supplier_development: 'Supplier quality management, supplier audits, and supplier development programs',
      customer_specifics: 'Customer requirement management, customer portals, and customer-specific procedures'
    },
    typical_gaps: [
      'Customer-specific requirements not systematically identified or addressed',
      'APQP processes incomplete or not properly followed',
      'PPAP submissions not approved before production start',
      'Supplier management reactive - issues discovered during production rather than prevented',
      'Statistical process control not effectively implemented'
    ],
    related_standards: {
      'extends': 'ISO 9001:2015',
      'customer_standards': ['VDA 6.3', 'AIAG Core Tools'],
      'complements': ['ISO/TS 16949']
    }
  }
];

/**
 * Seed standard profiles into vera_standard_profiles
 */
export async function seedStandardProfiles(queryEdcatAI: Function): Promise<void> {
  console.log('[seedStandardProfiles] Starting standard profile seeding...');
  let inserted = 0;
  let skipped = 0;

  for (const profile of STANDARD_PROFILES) {
    try {
      // Check if profile already exists
      const existing = await queryEdcatAI(
        `SELECT profile_id FROM edcat.vera_standard_profiles 
         WHERE standard_code = $1`,
        [profile.standard_code]
      );

      if (existing.rows && existing.rows.length > 0) {
        console.log(`[seedStandardProfiles] Skipping existing profile: ${profile.standard_code}`);
        skipped++;
        continue;
      }

      // Insert new profile
      await queryEdcatAI(
        `INSERT INTO edcat.vera_standard_profiles (
          standard_code,
          standard_full_name,
          vera_knowledge_summary,
          strategic_intent,
          section_count,
          clause_count,
          typical_implementations,
          typical_gaps,
          related_standards,
          industry_variations,
          vera_expertise_level,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0.85, NOW())`,
        [
          profile.standard_code,
          profile.standard_full_name,
          profile.vera_knowledge_summary,
          profile.strategic_intent,
          profile.section_count,
          profile.clause_count,
          JSON.stringify(profile.typical_implementations),
          JSON.stringify(profile.typical_gaps),
          JSON.stringify(profile.related_standards),
          JSON.stringify(profile.industry_variations || {}),
        ]
      );

      console.log(`[seedStandardProfiles] ✅ Inserted profile: ${profile.standard_code}`);
      inserted++;
    } catch (error: any) {
      console.error(`[seedStandardProfiles] ❌ Error seeding profile ${profile.standard_code}:`, error.message);
    }
  }

  console.log(`[seedStandardProfiles] ✅ Complete: ${inserted} inserted, ${skipped} skipped`);
}

