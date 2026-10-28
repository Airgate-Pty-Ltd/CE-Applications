/**
 * Response Template Seeds for Vera
 * 
 * Seeds response templates for consistent, professional communication.
 * Templates include placeholders for dynamic content insertion.
 */

import { queryEdcatAI } from '../../src/config/databases.js';

interface ResponseTemplateSeed {
  template_name: string;
  template_category: string;
  template_text: string;
  template_variants?: string[];
  use_case: string;
  applicable_phase?: string;
  expert_version?: string;
  novice_version?: string;
}

const RESPONSE_TEMPLATES: ResponseTemplateSeed[] = [
  // Gap Explanation Templates
  {
    template_name: 'gap_explanation_missing_concept',
    template_category: 'gap_explanation',
    template_text: 'I\'ve identified a gap in your coverage of {{clause}} ({{standard}}). The requirement addresses {{concept}}, but I don\'t see evidence that this concept is addressed in your procedures. This matters because {{why_it_matters}}. To close this gap, consider {{recommendation}}.',
    use_case: 'gap_analysis_result',
    expert_version: 'Gap in {{clause}}: missing {{concept}} coverage. Risk: {{risk_level}}. Recommendation: {{recommendation}}.',
    novice_version: 'I found that clause {{clause}} requires something called "{{concept}}" but I don\'t see this addressed in your procedures. This is important because {{why_it_matters}}. You might want to {{recommendation}}.'
  },
  {
    template_name: 'gap_explanation_missing_records',
    template_category: 'gap_explanation',
    template_text: 'Clause {{clause}} requires maintaining records of {{record_type}}, but I cannot find procedures or evidence that these records are being maintained. Records are essential for {{purpose}}. I recommend establishing procedures for {{action}}.',
    use_case: 'gap_analysis_result',
    expert_version: '{{clause}} gap: missing records for {{record_type}}. Establish record control procedures.',
    novice_version: 'The standard says you need to keep records about {{record_type}}, but I don\'t see how you\'re doing this. You should create procedures to make sure these records are kept.'
  },
  {
    template_name: 'gap_explanation_poor_coverage',
    template_category: 'gap_explanation',
    template_text: 'While you have procedures that touch on {{clause}}, the coverage appears incomplete. Specifically, {{missing_aspect}} is not adequately addressed. This could lead to {{consequence}}. To strengthen coverage, consider {{recommendation}}.',
    use_case: 'gap_analysis_result',
    expert_version: '{{clause}} partial coverage - missing {{missing_aspect}}. Enhance procedures to address {{recommendation}}.',
    novice_version: 'You have some procedures related to {{clause}}, but they don\'t fully cover everything required. Specifically, you\'re missing {{missing_aspect}}. You might want to add procedures for this.'
  },
  {
    template_name: 'gap_explanation_weak_evidence',
    template_category: 'gap_explanation',
    template_text: 'I found procedures that may address {{clause}}, but the evidence is not clear. The procedures mention {{mention}} but don\'t explicitly demonstrate compliance with {{requirement_aspect}}. Clarifying or enhancing the procedures to explicitly address {{requirement_aspect}} would strengthen your compliance position.',
    use_case: 'gap_analysis_result',
    expert_version: '{{clause}} procedures exist but lack explicit {{requirement_aspect}} coverage. Enhance procedures to demonstrate compliance.',
    novice_version: 'I found some procedures that might cover {{clause}}, but it\'s not completely clear. Your procedures mention {{mention}} but don\'t clearly show how you meet {{requirement_aspect}}. You might want to make this clearer in your procedures.'
  },
  {
    template_name: 'gap_explanation_critical_risk',
    template_category: 'gap_explanation',
    template_text: 'I\'ve identified a critical gap in {{clause}} ({{standard}}). This requirement is fundamental to {{purpose}} and non-compliance poses significant {{risk_type}} risks. The gap involves {{gap_description}}. I strongly recommend prioritizing this for immediate attention. Typical implementation includes {{typical_approach}}.',
    use_case: 'gap_analysis_result',
    expert_version: 'CRITICAL: {{clause}} gap - {{gap_description}}. High {{risk_type}} risk. Priority remediation required.',
    novice_version: 'This is important: I found a gap in {{clause}} that needs attention right away. The gap is about {{gap_description}}, and it\'s important because {{why_it_matters}}. You should prioritize fixing this.'
  },
  
  // Analysis Start Templates
  {
    template_name: 'analysis_start_intro',
    template_category: 'analysis_start',
    template_text: 'I\'m analyzing your procedures against {{standard}}. This will help identify any gaps between your current practices and the standard\'s requirements. I\'ll examine {{aspect_count}} key aspects and provide you with a structured gap analysis report.',
    use_case: 'analysis_initiation',
    expert_version: 'Beginning {{standard}} gap analysis. Analyzing {{aspect_count}} requirement areas.',
    novice_version: 'I\'m starting to compare your procedures with {{standard}} to see what you have and what might be missing. I\'ll check {{aspect_count}} important areas and give you a report.'
  },
  {
    template_name: 'analysis_start_with_context',
    template_category: 'analysis_start',
    template_text: 'Thank you for providing your procedures. I\'m now analyzing them against {{standard}} requirements. Based on what I see, I\'ll be focusing on areas including {{key_areas}}. This analysis typically takes a few minutes, and I\'ll provide you with findings organized by requirement area.',
    use_case: 'analysis_initiation',
    expert_version: 'Analyzing procedures against {{standard}}. Focus areas: {{key_areas}}.',
    novice_version: 'Thanks for sharing your procedures. I\'m now checking them against {{standard}}. I\'ll look at things like {{key_areas}} and let you know what I find.'
  },
  
  // Analysis Complete Templates
  {
    template_name: 'analysis_complete_summary',
    template_category: 'analysis_complete',
    template_text: 'Analysis complete. I\'ve reviewed your procedures against {{standard}} and identified {{gap_count}} gaps, {{covered_count}} requirements that appear covered, and {{ambiguous_count}} areas that may need clarification. The overall coverage is approximately {{coverage_percentage}}%. I\'ve prepared a detailed report with recommendations.',
    use_case: 'analysis_completion',
    expert_version: 'Analysis complete: {{gap_count}} gaps, {{covered_count}} covered, {{coverage_percentage}}% coverage.',
    novice_version: 'I\'ve finished analyzing your procedures. I found {{gap_count}} areas that need attention and {{covered_count}} areas that look good. Overall, you\'re covering about {{coverage_percentage}}% of what\'s required. I\'ve prepared a detailed report for you.'
  },
  {
    template_name: 'analysis_complete_with_priorities',
    template_category: 'analysis_complete',
    template_text: 'Analysis complete. Key findings: {{critical_gaps}} critical gaps requiring immediate attention, {{major_gaps}} major gaps, and {{minor_gaps}} minor gaps. I recommend prioritizing the critical gaps as they pose the highest compliance risk. The full report includes detailed findings and remediation recommendations for each gap.',
    use_case: 'analysis_completion',
    expert_version: 'Complete: {{critical_gaps}} critical, {{major_gaps}} major, {{minor_gaps}} minor gaps. Prioritize critical.',
    novice_version: 'I\'ve finished the analysis. I found {{critical_gaps}} critical issues that need immediate attention, {{major_gaps}} major issues, and {{minor_gaps}} smaller issues. I recommend fixing the critical ones first.'
  },
  
  // Audit Preparation Templates
  {
    template_name: 'audit_prep_executive_summary',
    template_category: 'audit_preparation',
    template_text: 'Based on my analysis, here\'s an executive summary for your upcoming {{audit_type}} audit: {{critical_risks}} critical risk areas require attention before the audit. These include {{top_risks}}. I recommend focusing corrective action on these areas to strengthen your audit position. Additionally, ensure {{key_preparation_items}} are ready and accessible.',
    use_case: 'audit_preparation',
    expert_version: 'Audit prep: {{critical_risks}} critical areas. Focus: {{top_risks}}. Ensure {{key_preparation_items}} ready.',
    novice_version: 'Here\'s what you should know before your audit: There are {{critical_risks}} important areas that need attention. These are {{top_risks}}. Make sure you fix these and have {{key_preparation_items}} ready.'
  },
  {
    template_name: 'audit_prep_evidence_readiness',
    template_category: 'audit_preparation',
    template_text: 'For your audit, ensure you have ready access to: (1) Records demonstrating compliance with {{key_requirements}}, (2) Evidence of management review and actions taken, (3) Records of internal audits and corrective actions, and (4) Training and competence records. These are areas auditors commonly examine.',
    use_case: 'audit_preparation',
    expert_version: 'Audit prep: Ensure evidence ready for {{key_requirements}}, management review, internal audits, training records.',
    novice_version: 'Before your audit, make sure you can show: records proving you meet {{key_requirements}}, management review records, internal audit records, and training records. Auditors will likely ask to see these.'
  },
  
  // Confidence Disclaimer Templates
  {
    template_name: 'confidence_disclaimer_moderate',
    template_category: 'confidence_disclaimer',
    template_text: 'My confidence in this assessment is {{confidence}}% because {{reason}}. This is based on the documentation provided. To increase confidence, I would need {{additional_info}}. Should I ask clarifying questions about {{clarification_topics}}?',
    use_case: 'uncertainty_communication',
    expert_version: 'Confidence: {{confidence}}% - {{reason}}. Additional info needed: {{additional_info}}.',
    novice_version: 'I\'m about {{confidence}}% sure about this assessment because {{reason}}. To be more certain, I\'d need {{additional_info}}. Would it help if I ask you some questions about {{clarification_topics}}?'
  },
  {
    template_name: 'confidence_disclaimer_low',
    template_category: 'confidence_disclaimer',
    template_text: 'My confidence in this assessment is lower ({{confidence}}%) because {{reason}}. This area needs clarification before I can provide a definitive assessment. Could you help me understand {{clarification_questions}}?',
    use_case: 'uncertainty_communication',
    expert_version: 'Low confidence ({{confidence}}%): {{reason}}. Needs clarification on {{clarification_questions}}.',
    novice_version: 'I\'m not very certain about this ({{confidence}}% sure) because {{reason}}. I need to understand better. Can you help me with {{clarification_questions}}?'
  }
];

/**
 * Seed response templates into vera_response_templates
 */
export async function seedResponseTemplates(queryEdcatAI: Function): Promise<void> {
  console.log('[seedResponseTemplates] Starting response template seeding...');
  let inserted = 0;
  let skipped = 0;

  for (const template of RESPONSE_TEMPLATES) {
    try {
      // Check if template already exists
      const existing = await queryEdcatAI(
        `SELECT template_id FROM edcat.vera_response_templates 
         WHERE template_name = $1`,
        [template.template_name]
      );

      if (existing.rows && existing.rows.length > 0) {
        console.log(`[seedResponseTemplates] Skipping existing template: ${template.template_name}`);
        skipped++;
        continue;
      }

      // Insert new template
      await queryEdcatAI(
        `INSERT INTO edcat.vera_response_templates (
          template_name,
          template_category,
          template_text,
          template_variants,
          use_case,
          applicable_phase,
          tone,
          detail_level,
          formality_level,
          expert_version,
          novice_version,
          active,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'professional', 3, 'professional', $7, $8, TRUE, NOW())`,
        [
          template.template_name,
          template.template_category,
          template.template_text,
          JSON.stringify(template.template_variants || []),
          template.use_case,
          template.applicable_phase || null,
          template.expert_version || null,
          template.novice_version || null
        ]
      );

      console.log(`[seedResponseTemplates] ✅ Inserted template: ${template.template_name}`);
      inserted++;
    } catch (error: any) {
      console.error(`[seedResponseTemplates] ❌ Error seeding template ${template.template_name}:`, error.message);
    }
  }

  console.log(`[seedResponseTemplates] ✅ Complete: ${inserted} inserted, ${skipped} skipped`);
}

