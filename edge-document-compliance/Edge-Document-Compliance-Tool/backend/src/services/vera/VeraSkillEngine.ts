/**
 * Vera Skill Engine
 * 
 * Enables Vera to "do things" beyond just answering questions:
 * - Generate audit checklists
 * - Draft corrective action plans
 * - Create training outlines
 * - Summarize gaps
 * 
 * Skills use the RAG pipeline + LLM to generate actionable artifacts.
 */

import { buildContext } from './VeraContextOrchestrator.js';
import { buildVeraPrompt } from './VeraPromptBuilder.js';
import { callVeraLLM, isLLMConfigured } from './VeraLLMBridge.js';

export type VeraSkillName =
  | "generate_audit_questions"
  | "generate_audit_checklist"
  | "draft_procedure_outline"
  | "draft_corrective_action_plan"
  | "summarize_gaps"
  | "generate_training_outline";

export interface VeraSkillRequest {
  skill: VeraSkillName;
  tenantId?: string;
  userRole?: string;
  standardCode?: string;
  clauses?: string[];
  regulationRefs?: string[];
  userMessage?: string;
  additionalContext?: Record<string, any>;
}

export interface VeraSkillResult {
  skill: VeraSkillName;
  content: string;              // human-readable output
  metadata?: Record<string, any>;
  confidence?: number;
}

/**
 * Run a Vera skill using RAG pipeline + LLM
 */
export async function runVeraSkill(req: VeraSkillRequest): Promise<VeraSkillResult> {
  try {
    const {
      skill,
      tenantId = '00000000-0000-0000-0000-000000000000',
      userRole,
      standardCode,
      clauses = [],
      regulationRefs = [],
      userMessage = '',
      additionalContext = {}
    } = req;

    console.log(`[VeraSkill] Running skill: ${skill}`);

    // Check if LLM is configured
    if (!isLLMConfigured()) {
      return {
        skill,
        content: `I need an LLM endpoint configured to use the ${skill} skill. Please configure VERA_LLM_PROVIDER and VERA_LLM_ENDPOINT.`,
        confidence: 0
      };
    }

    // Build context using VeraContextOrchestrator
    const context = await buildContext({
      tenantId,
      userMessage: userMessage || buildSkillQuery(skill, standardCode, clauses),
      intent: skillToIntent(skill),
      userRole,
      sessionId: null
    });

    // Build specialized prompt for this skill
    const { systemPrompt, contextBlocks } = buildSkillPrompt({
      skill,
      standardCode,
      clauses,
      regulationRefs,
      context,
      userRole,
      additionalContext
    });

    // Call LLM
    const llmResponse = await callVeraLLM({
      systemPrompt,
      contextBlocks,
      userMessage: userMessage || buildSkillQuery(skill, standardCode, clauses),
      intent: skillToIntent(skill),
      tenantId,
      userRole
    });

    if (!llmResponse || !llmResponse.answer) {
      return {
        skill,
        content: `I encountered an error while generating the ${skill} output. Please try again.`,
        confidence: 0
      };
    }

    return {
      skill,
      content: llmResponse.answer,
      metadata: {
        reasoningNotes: llmResponse.reasoningNotes,
        citations: llmResponse.citations,
        contextSources: {
          standards: context.standards?.length || 0,
          clauses: context.clauses?.length || 0,
          learningDocs: context.learningDocs?.length || 0
        }
      },
      confidence: llmResponse.confidence || 0.8
    };

  } catch (error: any) {
    console.error(`[VeraSkill] Error running skill ${req.skill}:`, error.message);
    return {
      skill: req.skill,
      content: `I encountered an error while generating the ${req.skill} output: ${error.message}`,
      confidence: 0
    };
  }
}

/**
 * Build a user query for the skill based on parameters
 */
function buildSkillQuery(skill: VeraSkillName, standardCode?: string, clauses?: string[]): string {
  switch (skill) {
    case 'generate_audit_questions':
      return `Generate audit questions for ${standardCode || 'the standard'}${clauses.length > 0 ? ` clauses ${clauses.join(', ')}` : ''}`;
    case 'generate_audit_checklist':
      return `Create an audit checklist for ${standardCode || 'the standard'}${clauses.length > 0 ? ` clauses ${clauses.join(', ')}` : ''}`;
    case 'draft_corrective_action_plan':
      return `Draft a corrective action plan template for ${standardCode || 'compliance issues'}`;
    case 'generate_training_outline':
      return `Generate a training outline for ${standardCode || 'the standard'}${clauses.length > 0 ? ` clause ${clauses[0]}` : ''}`;
    case 'summarize_gaps':
      return `Summarize compliance gaps for ${standardCode || 'the standard'}`;
    case 'draft_procedure_outline':
      return `Draft a procedure outline for ${standardCode || 'the standard'}${clauses.length > 0 ? ` clause ${clauses[0]}` : ''}`;
    default:
      return `Generate ${skill} for ${standardCode || 'the standard'}`;
  }
}

/**
 * Convert skill name to intent
 */
function skillToIntent(skill: VeraSkillName): string {
  const skillIntentMap: Record<VeraSkillName, string> = {
    'generate_audit_questions': 'audit_checklist_request',
    'generate_audit_checklist': 'audit_checklist_request',
    'draft_corrective_action_plan': 'corrective_action_request',
    'generate_training_outline': 'training_outline_request',
    'summarize_gaps': 'gap_analysis_request',
    'draft_procedure_outline': 'procedure_request'
  };
  return skillIntentMap[skill] || 'general_question';
}

/**
 * Build specialized prompt for a skill
 */
function buildSkillPrompt(params: {
  skill: VeraSkillName;
  standardCode?: string;
  clauses?: string[];
  regulationRefs?: string[];
  context: any;
  userRole?: string;
  additionalContext?: Record<string, any>;
}): { systemPrompt: string; contextBlocks: any[] } {
  const { skill, standardCode, clauses, regulationRefs, context, userRole, additionalContext } = params;

  let systemPrompt = `You are Vera, a seasoned lead auditor and compliance specialist. `;
  
  // Add skill-specific instructions
  switch (skill) {
    case 'generate_audit_questions':
      systemPrompt += `Generate 15-20 strong audit questions for ${standardCode || 'the standard'}${clauses.length > 0 ? ` clauses ${clauses.join(', ')}` : ''}. 
      Group questions by sub-topic. Each question should be specific, actionable, and designed to uncover evidence of compliance or non-compliance.
      Format: Use clear headings for each group, and number each question.`;
      break;

    case 'generate_audit_checklist':
      systemPrompt += `Create a comprehensive audit checklist for ${standardCode || 'the standard'}${clauses.length > 0 ? ` clauses ${clauses.join(', ')}` : ''}.
      Include: checklist items, evidence to look for, potential nonconformities, and verification methods.
      Format: Use a clear checklist format with checkboxes, organized by clause/sub-clause.`;
      break;

    case 'draft_corrective_action_plan':
      systemPrompt += `Draft a corrective action plan (CAR) template outline for ${standardCode || 'compliance issues'}.
      Include: problem description, root cause analysis, corrective actions, preventive actions, responsible parties, due dates, and verification steps.
      Format: Use a structured template format suitable for a formal CAR document.`;
      if (additionalContext.finding) {
        systemPrompt += `\n\nSpecific finding to address: ${additionalContext.finding}`;
      }
      break;

    case 'generate_training_outline':
      systemPrompt += `Generate a training module outline for ${standardCode || 'the standard'}${clauses.length > 0 ? ` clause ${clauses[0]}` : ''}.
      Include: learning objectives, key topics, activities, assessment methods, and duration.
      Format: Use a clear training outline structure with sections and subsections.`;
      break;

    case 'summarize_gaps':
      systemPrompt += `Summarize compliance gaps for ${standardCode || 'the standard'}${clauses.length > 0 ? ` clauses ${clauses.join(', ')}` : ''}.
      Include: identified gaps, their severity, impact, and recommended remediation steps.
      Format: Use a clear summary format with gap descriptions, severity ratings, and action items.`;
      break;

    case 'draft_procedure_outline':
      systemPrompt += `Draft a procedure outline for ${standardCode || 'the standard'}${clauses.length > 0 ? ` clause ${clauses[0]}` : ''}.
      Include: purpose, scope, responsibilities, procedure steps, records, and references.
      Format: Use a standard procedure document structure.`;
      break;
  }

  systemPrompt += `\n\nMaintain your professional, direct, and practical communication style. Be specific and actionable.`;

  // Build context blocks from VeraContext
  const contextBlocks = [];

  if (context.standards && context.standards.length > 0) {
    contextBlocks.push({
      label: 'Relevant Standards',
      text: context.standards.map((s: any) => `${s.code}: ${s.name}`).join('\n')
    });
  }

  if (context.clauses && context.clauses.length > 0) {
    contextBlocks.push({
      label: 'Relevant Clauses',
      text: context.clauses.map((c: any) => `${c.clauseNumber}: ${c.requirementText}`).join('\n\n')
    });
  }

  if (context.learningDocs && context.learningDocs.length > 0) {
    contextBlocks.push({
      label: 'Learning Documents',
      text: context.learningDocs.map((d: any) => d.content || d.summary).slice(0, 3).join('\n\n---\n\n')
    });
  }

  if (context.approvedExamples && context.approvedExamples.length > 0) {
    contextBlocks.push({
      label: 'Approved Examples',
      text: context.approvedExamples.map((e: any) => `${e.title}: ${e.content}`).slice(0, 2).join('\n\n---\n\n')
    });
  }

  if (regulationRefs.length > 0) {
    contextBlocks.push({
      label: 'Regulatory References',
      text: regulationRefs.join('\n')
    });
  }

  return { systemPrompt, contextBlocks };
}

/**
 * Detect if user message is requesting a skill
 */
export function detectSkillRequest(message: string): VeraSkillName | null {
  const lower = message.toLowerCase();

  // Audit questions
  if (lower.match(/(?:generate|create|give me|provide|list).*audit.*question/i) ||
      lower.match(/audit.*question/i)) {
    return 'generate_audit_questions';
  }

  // Audit checklist
  if (lower.match(/(?:generate|create|give me|provide|make).*audit.*checklist/i) ||
      lower.match(/audit.*checklist/i)) {
    return 'generate_audit_checklist';
  }

  // Corrective action plan
  if (lower.match(/(?:draft|create|generate|write).*corrective.*action/i) ||
      lower.match(/(?:draft|create|generate|write).*car/i) ||
      lower.match(/corrective.*action.*plan/i)) {
    return 'draft_corrective_action_plan';
  }

  // Training outline
  if (lower.match(/(?:generate|create|draft|write).*training.*outline/i) ||
      lower.match(/training.*outline/i) ||
      lower.match(/training.*module/i)) {
    return 'generate_training_outline';
  }

  // Gap summary
  if (lower.match(/(?:summarize|list|identify).*gap/i) ||
      lower.match(/gap.*summary/i) ||
      lower.match(/compliance.*gap/i)) {
    return 'summarize_gaps';
  }

  // Procedure outline
  if (lower.match(/(?:draft|create|generate|write).*procedure/i) ||
      lower.match(/procedure.*outline/i) ||
      lower.match(/procedure.*template/i)) {
    return 'draft_procedure_outline';
  }

  return null;
}

