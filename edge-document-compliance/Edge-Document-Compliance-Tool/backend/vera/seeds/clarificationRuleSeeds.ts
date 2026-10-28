/**
 * Clarification Rule Seeds for Vera
 * 
 * Seeds rules that determine when and how Vera asks clarifying questions.
 * Derived from common AS9100 audit scenarios and gap analysis patterns.
 */

import { queryEdcatAI } from '../../src/config/databases.js';

interface ClarificationRuleSeed {
  rule_name: string;
  rule_description: string;
  trigger_type: string;
  trigger_condition: string;
  trigger_value: number;
  clarification_template: string;
  question_type: string;
  answer_options: string[];
  learning_outcome: string;
  max_clarifications_per_analysis: number;
  max_clarifications_per_conversation: number;
  applicable_to_standards: string[];
}

const CLARIFICATION_RULES: ClarificationRuleSeed[] = [
  {
    rule_name: 'missing_records',
    rule_description: 'Triggered when a requirement specifies records but none are found in procedures',
    trigger_type: 'missing_records',
    trigger_condition: 'requirement_mentions_records AND no_record_evidence_found',
    trigger_value: 0.60,
    clarification_template: 'I see that [REQUIREMENT] requires maintaining records, but I don\'t see evidence of record-keeping procedures in your documentation. Do you maintain records for [SPECIFIC_RECORD_TYPE], and if so, where are they typically stored?',
    question_type: 'open_ended',
    answer_options: [],
    learning_outcome: 'procedure_to_requirement',
    max_clarifications_per_analysis: 5,
    max_clarifications_per_conversation: 8,
    applicable_to_standards: ['AS9100', 'AS9110', 'ISO9001']
  },
  {
    rule_name: 'missing_responsibility',
    rule_description: 'Triggered when procedure exists but responsible role/person not clearly defined',
    trigger_type: 'missing_responsibility',
    trigger_condition: 'procedure_exists AND responsibility_unclear',
    trigger_value: 0.65,
    clarification_template: 'I found your procedure for [PROCESS], but I\'m not certain who is responsible for [SPECIFIC_ACTION]. Could you clarify which role or position handles this?',
    question_type: 'open_ended',
    answer_options: [],
    learning_outcome: 'context_understanding',
    max_clarifications_per_analysis: 6,
    max_clarifications_per_conversation: 10,
    applicable_to_standards: ['AS9100', 'AS9110', 'ISO9001']
  },
  {
    rule_name: 'missing_criteria',
    rule_description: 'Triggered when procedure mentions evaluation/approval but criteria not specified',
    trigger_type: 'missing_criteria',
    trigger_condition: 'procedure_mentions_evaluation AND criteria_not_specified',
    trigger_value: 0.70,
    clarification_template: 'Your procedure mentions [EVALUATION_TYPE], but the specific criteria for approval or rejection aren\'t clear to me. What criteria do you use to determine whether [ITEM] meets requirements?',
    question_type: 'open_ended',
    answer_options: [],
    learning_outcome: 'requirement_interpretation',
    max_clarifications_per_analysis: 4,
    max_clarifications_per_conversation: 8,
    applicable_to_standards: ['AS9100', 'ISO9001']
  },
  {
    rule_name: 'ambiguous_ownership',
    rule_description: 'Triggered when multiple procedures might address the same requirement',
    trigger_type: 'ambiguous_mapping',
    trigger_condition: 'multiple_procedures_match AND overlap_unclear',
    trigger_value: 0.55,
    clarification_template: 'I found that both [PROCEDURE_A] and [PROCEDURE_B] might address [REQUIREMENT]. Which procedure primarily handles this requirement, or do they work together?',
    question_type: 'multiple_choice',
    answer_options: ['Procedure A primarily', 'Procedure B primarily', 'They work together', 'Different aspects of requirement'],
    learning_outcome: 'keyword_mapping',
    max_clarifications_per_analysis: 8,
    max_clarifications_per_conversation: 12,
    applicable_to_standards: ['AS9100', 'AS9110']
  },
  {
    rule_name: 'semantic_uncertainty',
    rule_description: 'Triggered when procedure text is similar but not clearly matching requirement intent',
    trigger_type: 'semantic_uncertainty',
    trigger_condition: 'text_similarity_medium AND intent_match_unclear',
    trigger_value: 0.68,
    clarification_template: 'I see language in [PROCEDURE] that seems related to [REQUIREMENT], but I want to confirm: does your procedure specifically address [KEY_ASPECT_OF_REQUIREMENT]?',
    question_type: 'yes_no',
    answer_options: ['Yes', 'No', 'Partially'],
    learning_outcome: 'requirement_interpretation',
    max_clarifications_per_analysis: 6,
    max_clarifications_per_conversation: 10,
    applicable_to_standards: ['AS9100', 'ISO9001']
  },
  {
    rule_name: 'conflicting_information',
    rule_description: 'Triggered when multiple sources provide contradictory information',
    trigger_type: 'ambiguous_mapping',
    trigger_condition: 'conflicting_statements_detected',
    trigger_value: 0.50,
    clarification_template: 'I noticed that [SOURCE_A] says [STATEMENT_A], but [SOURCE_B] indicates [STATEMENT_B]. Which is the current, correct approach?',
    question_type: 'open_ended',
    answer_options: [],
    learning_outcome: 'context_understanding',
    max_clarifications_per_analysis: 3,
    max_clarifications_per_conversation: 5,
    applicable_to_standards: ['AS9100', 'AS9110']
  },
  {
    rule_name: 'special_process_validation',
    rule_description: 'Triggered when special process mentioned but validation evidence unclear',
    trigger_type: 'missing_criteria',
    trigger_condition: 'special_process_mentioned AND validation_unclear',
    trigger_value: 0.72,
    clarification_template: 'I see [SPECIAL_PROCESS] in your procedures. Could you confirm that this process has been validated to demonstrate it consistently produces conforming outputs? Do you have validation records?',
    question_type: 'yes_no',
    answer_options: ['Yes, validated with records', 'Yes, but records need updating', 'Not yet validated'],
    learning_outcome: 'requirement_interpretation',
    max_clarifications_per_analysis: 5,
    max_clarifications_per_conversation: 8,
    applicable_to_standards: ['AS9100', 'AS9110']
  },
  {
    rule_name: 'supplier_control_depth',
    rule_description: 'Triggered when supplier management mentioned but control methods unclear',
    trigger_type: 'missing_criteria',
    trigger_condition: 'supplier_mentioned AND control_methods_unclear',
    trigger_value: 0.65,
    clarification_template: 'Your procedures mention supplier management, but I\'m not certain about the specific control methods you use. Do you perform supplier audits, source inspection, or other verification activities?',
    question_type: 'multiple_choice',
    answer_options: ['Supplier audits', 'Source inspection', 'Certification only', 'Multiple methods'],
    learning_outcome: 'keyword_mapping',
    max_clarifications_per_analysis: 4,
    max_clarifications_per_conversation: 6,
    applicable_to_standards: ['AS9100']
  },
  {
    rule_name: 'configuration_change_control',
    rule_description: 'Triggered when configuration management mentioned but change control process unclear',
    trigger_type: 'missing_responsibility',
    trigger_condition: 'configuration_mentioned AND change_control_unclear',
    trigger_value: 0.70,
    clarification_template: 'I see configuration management in your procedures. Who is authorized to approve configuration changes, and what is the process for change approval?',
    question_type: 'open_ended',
    answer_options: [],
    learning_outcome: 'context_understanding',
    max_clarifications_per_analysis: 5,
    max_clarifications_per_conversation: 8,
    applicable_to_standards: ['AS9100', 'AS9110']
  },
  {
    rule_name: 'corrective_action_root_cause',
    rule_description: 'Triggered when corrective action mentioned but root cause analysis method unclear',
    trigger_type: 'missing_criteria',
    trigger_condition: 'corrective_action_mentioned AND root_cause_method_unclear',
    trigger_value: 0.68,
    clarification_template: 'Your procedures mention corrective action. What method do you typically use for root cause analysis - 5 Why, fishbone diagram, FMEA, or another approach?',
    question_type: 'multiple_choice',
    answer_options: ['5 Why analysis', 'Fishbone diagram', 'FMEA', 'Other method'],
    learning_outcome: 'requirement_interpretation',
    max_clarifications_per_analysis: 4,
    max_clarifications_per_conversation: 6,
    applicable_to_standards: ['AS9100', 'ISO9001']
  },
  {
    rule_name: 'maintenance_release_authority',
    rule_description: 'Triggered when maintenance release mentioned but certifying staff qualification unclear',
    trigger_type: 'missing_responsibility',
    trigger_condition: 'maintenance_release_mentioned AND authority_unclear',
    trigger_value: 0.75,
    clarification_template: 'I see procedures for maintenance release. Who is authorized to sign release certificates - are they qualified certifying staff, and is their authorization current?',
    question_type: 'yes_no',
    answer_options: ['Yes, qualified and current', 'Yes, but needs verification', 'Not sure'],
    learning_outcome: 'procedure_to_requirement',
    max_clarifications_per_analysis: 3,
    max_clarifications_per_conversation: 5,
    applicable_to_standards: ['AS9110']
  },
  {
    rule_name: 'risk_assessment_frequency',
    rule_description: 'Triggered when risk management mentioned but assessment frequency unclear',
    trigger_type: 'missing_criteria',
    trigger_condition: 'risk_management_mentioned AND frequency_unclear',
    trigger_value: 0.65,
    clarification_template: 'I see risk management procedures. How often do you review and update your risk assessments - annually, at management review, or when significant changes occur?',
    question_type: 'multiple_choice',
    answer_options: ['Annually', 'At management review', 'When changes occur', 'Continuous'],
    learning_outcome: 'requirement_interpretation',
    max_clarifications_per_analysis: 3,
    max_clarifications_per_conversation: 5,
    applicable_to_standards: ['AS9100', 'ISO9001']
  },
  {
    rule_name: 'training_effectiveness_evaluation',
    rule_description: 'Triggered when training mentioned but effectiveness evaluation method unclear',
    trigger_type: 'missing_criteria',
    trigger_condition: 'training_mentioned AND effectiveness_evaluation_unclear',
    trigger_value: 0.68,
    clarification_template: 'Your procedures mention training. How do you evaluate whether training was effective - through testing, observation, performance reviews, or other methods?',
    question_type: 'multiple_choice',
    answer_options: ['Testing or exams', 'Observation', 'Performance review', 'Multiple methods'],
    learning_outcome: 'keyword_mapping',
    max_clarifications_per_analysis: 4,
    max_clarifications_per_conversation: 6,
    applicable_to_standards: ['AS9100', 'ISO9001']
  },
  {
    rule_name: 'document_control_obsolete_handling',
    rule_description: 'Triggered when document control mentioned but obsolete document handling unclear',
    trigger_type: 'missing_records',
    trigger_condition: 'document_control_mentioned AND obsolete_handling_unclear',
    trigger_value: 0.62,
    clarification_template: 'I see document control procedures. How do you ensure obsolete documents are removed from use and that only current revisions are available to personnel?',
    question_type: 'open_ended',
    answer_options: [],
    learning_outcome: 'requirement_interpretation',
    max_clarifications_per_analysis: 3,
    max_clarifications_per_conversation: 5,
    applicable_to_standards: ['AS9100', 'ISO9001']
  },
  {
    rule_name: 'internal_audit_findings_closure',
    rule_description: 'Triggered when internal audit mentioned but finding closure verification unclear',
    trigger_type: 'missing_records',
    trigger_condition: 'internal_audit_mentioned AND closure_verification_unclear',
    trigger_value: 0.70,
    clarification_template: 'Your procedures mention internal audits. When audit findings are identified, how do you verify that corrective actions were effective and findings are closed?',
    question_type: 'open_ended',
    answer_options: [],
    learning_outcome: 'procedure_to_requirement',
    max_clarifications_per_analysis: 4,
    max_clarifications_per_conversation: 6,
    applicable_to_standards: ['AS9100', 'ISO9001']
  }
];

/**
 * Seed clarification rules into vera_clarification_rules
 */
export async function seedClarificationRules(queryEdcatAI: Function): Promise<void> {
  console.log('[seedClarificationRules] Starting clarification rule seeding...');
  let inserted = 0;
  let skipped = 0;

  for (const rule of CLARIFICATION_RULES) {
    try {
      // Check if rule already exists
      const existing = await queryEdcatAI(
        `SELECT rule_id FROM edcat.vera_clarification_rules 
         WHERE rule_name = $1`,
        [rule.rule_name]
      );

      if (existing.rows && existing.rows.length > 0) {
        console.log(`[seedClarificationRules] Skipping existing rule: ${rule.rule_name}`);
        skipped++;
        continue;
      }

      // Insert new rule
      await queryEdcatAI(
        `INSERT INTO edcat.vera_clarification_rules (
          rule_name,
          rule_description,
          trigger_type,
          trigger_condition,
          trigger_value,
          clarification_template,
          question_type,
          answer_options,
          learning_outcome,
          max_clarifications_per_analysis,
          max_clarifications_per_conversation,
          applicable_to_standards,
          applicable_to_experts,
          applicable_to_novices,
          priority,
          active,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, TRUE, 50, TRUE, NOW())`,
        [
          rule.rule_name,
          rule.rule_description,
          rule.trigger_type,
          rule.trigger_condition,
          rule.trigger_value,
          rule.clarification_template,
          rule.question_type,
          JSON.stringify(rule.answer_options),
          rule.learning_outcome,
          rule.max_clarifications_per_analysis,
          rule.max_clarifications_per_conversation,
          JSON.stringify(rule.applicable_to_standards)
        ]
      );

      console.log(`[seedClarificationRules] ✅ Inserted rule: ${rule.rule_name}`);
      inserted++;
    } catch (error: any) {
      console.error(`[seedClarificationRules] ❌ Error seeding rule ${rule.rule_name}:`, error.message);
    }
  }

  console.log(`[seedClarificationRules] ✅ Complete: ${inserted} inserted, ${skipped} skipped`);
}

