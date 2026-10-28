/**
 * Vera Teaching Formatter
 * 
 * Formats content into layered teaching explanations:
 * - Layer 1: Plain explanation (no jargon)
 * - Layer 2: Practical examples
 * - Layer 3: Audit lens (what auditors look for)
 * - Layer 4: Implementation tips
 * 
 * Phase 18: Deep Explanation Mode ("Teach Me Like I'm New")
 */

import { callVeraLLM, isLLMConfigured } from './VeraLLMBridge.js';
import { buildContext } from './VeraContextOrchestrator.js';
import { getConceptByName, findRelatedConcepts } from './VeraQualityOntologyService.js';

export type TeachingLevel = "basic" | "intermediate" | "advanced" | "layered";

export interface TeachingResponse {
  basic?: string;
  intermediate?: string;
  advanced?: string;
  examples?: string[];
  auditLens?: string;
  implementationTips?: string[];
  relatedConcepts?: Array<{ name: string; description: string }>;
}

/**
 * Generate teaching response for a concept
 */
export async function generateTeachingResponse(
  topic: string,
  level: TeachingLevel = "layered",
  context?: any
): Promise<TeachingResponse> {
  try {
    console.log(`[VeraTeaching] Generating ${level} explanation for: ${topic}`);

    // Check ontology first
    const concept = await getConceptByName(topic);
    const related = concept ? await findRelatedConcepts(topic) : [];

    // If LLM is available, use it for rich teaching
    if (isLLMConfigured()) {
      return await generateWithLLM(topic, level, concept, related, context);
    }

    // Fallback: Use concept definition if available
    if (concept) {
      return generateFromConcept(concept, related, level);
    }

    // Final fallback: Simple explanation
    return {
      basic: `I can help explain ${topic}, but I need more context. Could you tell me which standard or context you're working with?`,
      level: 'basic'
    };

  } catch (error: any) {
    console.error('[VeraTeaching] Error generating teaching response:', error.message);
    return {
      basic: `I encountered an error while preparing an explanation for ${topic}. Please try rephrasing your question.`
    };
  }
}

/**
 * Generate teaching response using LLM
 */
async function generateWithLLM(
  topic: string,
  level: TeachingLevel,
  concept: any,
  related: any[],
  context?: any
): Promise<TeachingResponse> {
  const systemPrompt = buildTeachingPrompt(topic, level, concept, related);
  const contextBlocks = context ? buildContextBlocks(context) : [];

  const llmResponse = await callVeraLLM({
    systemPrompt,
    contextBlocks,
    userMessage: `Explain ${topic} at ${level} level`,
    intent: 'teaching_request',
    tenantId: '00000000-0000-0000-0000-000000000000'
  });

  if (!llmResponse || !llmResponse.answer) {
    return generateFromConcept(concept, related, level);
  }

  // Parse structured response
  return parseTeachingResponse(llmResponse.answer, level);
}

/**
 * Build teaching prompt
 */
function buildTeachingPrompt(
  topic: string,
  level: TeachingLevel,
  concept: any,
  related: any[]
): string {
  let prompt = `You are Vera, a world-class lead auditor and compliance coach. Explain ${topic} in a teaching format.

`;

  if (concept) {
    prompt += `Concept definition: ${concept.description}\n\n`;
  }

  if (related.length > 0) {
    prompt += `Related concepts:\n`;
    related.forEach(r => {
      prompt += `- ${r.targetConcept.name}: ${r.targetConcept.description}\n`;
    });
    prompt += `\n`;
  }

  prompt += `Generate a ${level} explanation with the following structure:\n\n`;

  if (level === 'layered' || level === 'basic') {
    prompt += `**Layer 1 - Plain Explanation (No Jargon):**
Explain ${topic} in simple terms that someone new to quality management could understand. Avoid technical terms or define them immediately.\n\n`;
  }

  if (level === 'layered' || level === 'intermediate') {
    prompt += `**Layer 2 - Practical Examples:**
Provide 2-3 concrete examples of how ${topic} works in practice. Use real-world scenarios (e.g., "In an AS9100 shop, this typically looks like...").\n\n`;
  }

  if (level === 'layered' || level === 'advanced') {
    prompt += `**Layer 3 - Audit Lens:**
Explain what auditors look for when assessing ${topic}. What evidence do they expect? What are common findings or nonconformities?\n\n`;

    prompt += `**Layer 4 - Implementation Tips:**
Provide actionable advice on how to implement or improve ${topic} in an organization. What are the key steps? What pitfalls should be avoided?\n\n`;
  }

  prompt += `Format your response clearly with headers for each layer. Be practical, specific, and actionable.`;

  return prompt;
}

/**
 * Build context blocks for teaching
 */
function buildContextBlocks(context: any): any[] {
  const blocks = [];

  if (context.standardClauses && context.standardClauses.length > 0) {
    blocks.push({
      label: 'Relevant Requirements',
      text: context.standardClauses.map((c: any) => `${c.clauseNumber}: ${c.requirementText}`).join('\n\n')
    });
  }

  if (context.examples && context.examples.length > 0) {
    blocks.push({
      label: 'Examples',
      text: context.examples.map((e: any) => `${e.title}: ${e.content}`).join('\n\n---\n\n')
    });
  }

  return blocks;
}

/**
 * Parse teaching response from LLM output
 */
function parseTeachingResponse(answer: string, level: TeachingLevel): TeachingResponse {
  const response: TeachingResponse = {};

  // Extract layers using regex
  const basicMatch = answer.match(/\*\*Layer 1[^\*]*\*\*([\s\S]*?)(?=\*\*Layer 2|\*\*Layer 3|\*\*Layer 4|$)/i);
  if (basicMatch) {
    response.basic = basicMatch[1].trim();
  }

  const intermediateMatch = answer.match(/\*\*Layer 2[^\*]*\*\*([\s\S]*?)(?=\*\*Layer 3|\*\*Layer 4|$)/i);
  if (intermediateMatch) {
    response.intermediate = intermediateMatch[1].trim();
    // Extract examples
    const exampleMatches = intermediateMatch[1].match(/(?:example|e\.g\.|for instance)[:]\s*([^\n]+)/gi);
    if (exampleMatches) {
      response.examples = exampleMatches.map(e => e.replace(/^(example|e\.g\.|for instance)[:]\s*/i, '').trim());
    }
  }

  const auditMatch = answer.match(/\*\*Layer 3[^\*]*\*\*([\s\S]*?)(?=\*\*Layer 4|$)/i);
  if (auditMatch) {
    response.auditLens = auditMatch[1].trim();
  }

  const implementationMatch = answer.match(/\*\*Layer 4[^\*]*\*\*([\s\S]*?)$/i);
  if (implementationMatch) {
    const tipsText = implementationMatch[1].trim();
    // Extract bullet points
    response.implementationTips = tipsText
      .split(/\n/)
      .filter(line => line.trim().match(/^[-•*]\s/))
      .map(line => line.replace(/^[-•*]\s+/, '').trim())
      .filter(tip => tip.length > 10);
  }

  // If no structured parsing worked, use the whole answer
  if (!response.basic && !response.intermediate) {
    response.basic = answer;
  }

  return response;
}

/**
 * Generate from concept definition (fallback)
 */
function generateFromConcept(concept: any, related: any[], level: TeachingLevel): TeachingResponse {
  const response: TeachingResponse = {
    basic: concept.description
  };

  if (related.length > 0) {
    response.relatedConcepts = related.map(r => ({
      name: r.targetConcept.name,
      description: r.targetConcept.description
    }));
  }

  if (level === 'layered' || level === 'intermediate') {
    response.intermediate = `${concept.description}\n\nIn practice, ${concept.name} is typically implemented through documented procedures and controlled processes.`;
  }

  if (level === 'layered' || level === 'advanced') {
    response.auditLens = `Auditors typically look for evidence that ${concept.name} is properly documented, implemented, and monitored.`;
    response.implementationTips = [
      `Document your ${concept.name} process clearly`,
      `Train personnel on ${concept.name} requirements`,
      `Maintain records demonstrating ${concept.name} is being followed`
    ];
  }

  return response;
}

/**
 * Format teaching response for display
 */
export function formatTeachingResponse(response: TeachingResponse, level: TeachingLevel): string {
  let formatted = '';

  if (response.basic && (level === 'basic' || level === 'layered')) {
    formatted += `**Plain Explanation:**\n${response.basic}\n\n`;
  }

  if (response.intermediate && (level === 'intermediate' || level === 'layered')) {
    formatted += `**Practical Examples:**\n${response.intermediate}\n\n`;
    if (response.examples && response.examples.length > 0) {
      formatted += `Examples:\n`;
      response.examples.forEach(ex => {
        formatted += `- ${ex}\n`;
      });
      formatted += `\n`;
    }
  }

  if (response.auditLens && (level === 'advanced' || level === 'layered')) {
    formatted += `**Audit Lens:**\n${response.auditLens}\n\n`;
  }

  if (response.implementationTips && response.implementationTips.length > 0 && (level === 'advanced' || level === 'layered')) {
    formatted += `**Implementation Tips:**\n`;
    response.implementationTips.forEach(tip => {
      formatted += `- ${tip}\n`;
    });
    formatted += `\n`;
  }

  if (response.relatedConcepts && response.relatedConcepts.length > 0) {
    formatted += `**Related Concepts:**\n`;
    response.relatedConcepts.forEach(rc => {
      formatted += `- **${rc.name}**: ${rc.description}\n`;
    });
  }

  return formatted.trim();
}

