/**
 * Vera Prompt Builder
 * 
 * Builds structured prompts with Vera's persona and answer format.
 * Converts VeraContext into system prompts and context blocks for the LLM.
 */

import { VeraContext } from './VeraContextOrchestrator.js';
import { VeraLLMContextBlock } from './VeraLLMBridge.js';

export interface VeraPromptBuildResult {
  systemPrompt: string;
  contextBlocks: VeraLLMContextBlock[];
}

/**
 * Build Vera's system prompt with persona and answer structure
 */
function buildSystemPrompt(intent: string | null, userRole?: string): string {
  const persona = `You are Vera, a seasoned lead auditor with deep expertise across multiple compliance standards:
- Aerospace: AS9100D, AS6500
- Quality Management: ISO 9001, IATF 16949
- Medical Devices: ISO 13485, FDA 21 CFR Part 11
- Aviation: FAA Part 21, EASA Part 145, CASA CASRs, UK CAA
- Information Security: ISO 27001
- Occupational Health: ISO 45001

You have a British/Scottish professional tone—direct, practical, and never condescending. You speak in plain English with short paragraphs.`;

  const communicationRules = `Communication Rules:
1. Use plain English, short paragraphs
2. Be direct and practical
3. Never condescend or oversimplify
4. Cite specific clauses and standards when relevant
5. Provide actionable guidance, not just theory`;

  const answerStructure = `For compliance questions, structure your answers as:
1. **Requirement Summary**: Brief overview of what the standard/clause requires
2. **Clause/Regulation Detail**: Specific text with references (e.g., "AS9100D Clause 8.7 requires...")
3. **Objective Evidence Examples**: What auditors typically look for (records, procedures, demonstrations)
4. **Common Pitfalls / Typical Audit Findings**: What often goes wrong
5. **Recommended Next Steps**: Practical actions the user should take`;

  const roleAdaptation = userRole ? getRoleSpecificGuidance(userRole) : '';

  return `${persona}

${communicationRules}

${answerStructure}

${roleAdaptation}

**Critical**: Use ONLY facts from the provided context blocks. Do not invent clauses, regulations, or requirements that are not explicitly provided in the context. If information is missing, say so clearly rather than guessing.`;
}

/**
 * Get role-specific guidance for answer depth
 */
function getRoleSpecificGuidance(userRole: string): string {
  const role = userRole.toLowerCase();
  
  if (role.includes('quality_manager') || role.includes('qms')) {
    return `User Role: Quality Manager
- Add strategic implications and risk assessment
- Discuss cross-standard relationships
- Provide implementation roadmaps
- Highlight organizational impact`;
  }
  
  if (role.includes('auditor') || role.includes('lead_auditor')) {
    return `User Role: Auditor
- Provide detailed clause-by-clause analysis
- Emphasize objective evidence requirements
- Include common non-conformities
- Reference audit checklists and verification methods`;
  }
  
  if (role.includes('engineer') || role.includes('technical')) {
    return `User Role: Engineer
- Focus on practical implementation
- Provide step-by-step procedures
- Include technical specifications
- Show how to integrate with existing processes`;
  }
  
  return '';
}

/**
 * Build context blocks from VeraContext
 */
function buildContextBlocks(context: VeraContext): VeraLLMContextBlock[] {
  const blocks: VeraLLMContextBlock[] = [];

  // 1. Standard Clauses
  if (context.standardClauses.length > 0) {
    const clausesText = context.standardClauses
      .map(c => `${c.standardCode} Clause ${c.clauseNumber}:\n${c.requirementText}`)
      .join('\n\n---\n\n');
    
    blocks.push({
      label: 'Relevant Standard Clauses',
      text: clausesText,
    });
  }

  // 2. Regulatory Sections
  if (context.regulatorySections.length > 0) {
    const regsText = context.regulatorySections
      .map(r => `${r.standardCode} Section ${r.sectionRef}:\n${r.sectionText}`)
      .join('\n\n---\n\n');
    
    blocks.push({
      label: 'Regulatory Sections',
      text: regsText,
    });
  }

  // 3. Term Definitions
  if (context.terms.length > 0) {
    const termsText = context.terms
      .map(t => `${t.term}${t.acronym ? ` (${t.acronym})` : ''}: ${t.definition}${t.sourceStandard ? ` [Source: ${t.sourceStandard}]` : ''}`)
      .join('\n\n');
    
    blocks.push({
      label: 'Term Definitions',
      text: termsText,
    });
  }

  // 4. Approved Examples
  const approvedExamples = context.examples.filter(e => e.isApproved);
  if (approvedExamples.length > 0) {
    const examplesText = approvedExamples
      .map(e => `**${e.title}** (${e.standardCode || 'General'}):\n${e.content}`)
      .join('\n\n---\n\n');
    
    blocks.push({
      label: 'Approved Examples',
      text: examplesText,
    });
  }

  // 5. Bad Examples / Pitfalls
  const badExamples = context.examples.filter(e => !e.isApproved);
  if (badExamples.length > 0) {
    const pitfallsText = badExamples
      .map(e => `**${e.title}** (${e.standardCode || 'General'}):\n${e.content}`)
      .join('\n\n---\n\n');
    
    blocks.push({
      label: 'Common Pitfalls / Bad Examples',
      text: pitfallsText,
    });
  }

  // 6. Gap Hints
  if (context.gapHints.length > 0) {
    const hintsText = context.gapHints
      .map(h => `${h.standardCode || 'General'}${h.clauseNumber ? ` Clause ${h.clauseNumber}` : ''}: ${h.hint}`)
      .join('\n\n');
    
    blocks.push({
      label: 'Gap Analysis Hints',
      text: hintsText,
    });
  }

  // 7. Q&A Snippets (if high confidence)
  const highConfidenceQA = context.qaSnippets.filter(qa => qa.confidence >= 0.7);
  if (highConfidenceQA.length > 0) {
    const qaText = highConfidenceQA
      .map(qa => `Q: ${qa.question}\nA: ${qa.response}`)
      .join('\n\n---\n\n');
    
    blocks.push({
      label: 'Relevant Q&A Entries',
      text: qaText,
    });
  }

  // 8. Recent Conversation (if available)
  if (context.conversationHistory.length > 0) {
    const historyText = context.conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Vera'}: ${msg.message}`)
      .join('\n\n');
    
    blocks.push({
      label: 'Recent Conversation',
      text: historyText,
    });
  }

  return blocks;
}

/**
 * Build complete prompt for Vera LLM
 */
export function buildVeraPrompt(params: {
  intent: string | null;
  userMessage: string;
  userRole?: string;
  context: VeraContext;
}): VeraPromptBuildResult {
  const { intent, userMessage, userRole, context } = params;

  const systemPrompt = buildSystemPrompt(intent, userRole);
  const contextBlocks = buildContextBlocks(context);

  return {
    systemPrompt,
    contextBlocks,
  };
}

