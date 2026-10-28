/**
 * VeraAnswerPlanner
 *
 * Given intent, entities, and evidence, build:
 *  - a reasoning summary
 *  - a prioritized evidence list
 *  - an LLM-ready prompt
 */

function truncate(text, max) {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

class VeraAnswerPlanner {
  /**
   * @param {Object} params
   * @param {string} params.intent
   * @param {Object} params.entities
   * @param {Object} params.evidence
   * @param {string} params.message
   * @returns {{
   *   intent: string,
   *   entities: Object,
   *   reasoningNotes: string,
   *   evidenceSummary: string,
   *   llmPrompt: string
   * }}
   */
  static buildPlan({ intent, entities, evidence, message }) {
    const { standardClauses, queryResponses, learnedDocs, websiteSnippets, semanticMemory } = evidence;

    const lines = [];

    lines.push(`User message: ${message}`);
    lines.push(`Detected intent: ${intent}`);
    if (entities && Object.keys(entities).length > 0) {
      lines.push(`Entities: ${JSON.stringify(entities)}`);
    }

    if (standardClauses && standardClauses.length > 0) {
      lines.push(`\nRelevant standard clauses:`);
      for (const c of standardClauses.slice(0, 5)) {
        const clauseLabel = c.full_ref || c.clause_number || c.clause_ref || 'Unknown';
        const clauseTitle = c.clause_title || '';
        const requirementText = c.requirement_text || '';
        lines.push(`- [${c.standard_code || ''} ${clauseLabel}] ${clauseTitle} :: ${truncate(requirementText, 220)}`);
      }
    }

    if (queryResponses && queryResponses.length > 0) {
      lines.push(`\nRelevant Q&A entries from Vera's bank:`);
      for (const q of queryResponses.slice(0, 5)) {
        const question = q.question_pattern || q.question || '';
        const answer = q.response_text || '';
        lines.push(`- Q: ${truncate(question, 180)} | A: ${truncate(answer, 220)}`);
      }
    }

    if (learnedDocs && learnedDocs.length > 0) {
      lines.push(`\nRelevant learned document excerpts:`);
      for (const d of learnedDocs.slice(0, 3)) {
        const sourceType = d.source_type || 'Document';
        const sourceName = d.source_name || 'Unknown';
        const excerpt = d.content || d.excerpt || '';
        lines.push(`- [${sourceType}] ${sourceName} :: ${truncate(excerpt, 220)}`);
      }
    }

    if (websiteSnippets && websiteSnippets.length > 0) {
      lines.push(`\nRelevant regulatory/website snippets:`);
      for (const w of websiteSnippets.slice(0, 3)) {
        const authority = w.authority || w.url || 'Unknown';
        const snippet = w.snippet || w.cleaned_text || '';
        lines.push(`- [${authority}] ${truncate(snippet, 220)}`);
      }
    }

    if (semanticMemory && semanticMemory.length > 0) {
      lines.push(`\nRelevant semantic memory hits:`);
      for (const s of semanticMemory.slice(0, 3)) {
        const text = s.text || s.snippet || s.contentSnippet || '';
        lines.push(`- ${truncate(text, 220)}`);
      }
    }

    const evidenceSummary = lines.join('\n');

    const personaHeader = [
      'You are Vera, an advanced Quality and Regulatory AI assistant.',
      'Background: British/Scottish tone, aerospace and medical device CQE & Lead Auditor.',
      'You specialize in AS9100, AS9110, AS9120, ISO 9001, ISO 13485, IATF 16949, Six Sigma, Lean, KPIs, Cost of Quality, and global quality culture.',
      'Respond with clear, technically accurate, implementation-minded guidance. Avoid filler. Do not say "I can help with". Answer directly.',
      '',
      'You are given:',
      '- The user message',
      '- Detected intent and entities',
      '- Extracted evidence from standards, Vera\'s query-response bank, learned documents, websites, and semantic memory.',
      '',
      'Your job:',
      '1. Interpret the user\'s question and intent.',
      '2. Use the evidence to construct a correct, implementation-ready answer.',
      '3. If evidence is weak, say what is missing and give best-practice guidance.',
      '4. Propose next steps or follow-up questions where useful.',
      ''
    ].join('\n');

    const llmPrompt = [
      personaHeader,
      '--- CONTEXT & EVIDENCE ---',
      evidenceSummary,
      '',
      '--- TASK ---',
      `User question: ${message}`,
      `Detected intent: ${intent}`,
      `Entities: ${JSON.stringify(entities)}`,
      '',
      'Now provide the best possible answer in your own words.'
    ].join('\n');

    return {
      intent,
      entities,
      reasoningNotes: `Built answer plan for intent "${intent}" with available evidence.`,
      evidenceSummary,
      llmPrompt
    };
  }
}

export default VeraAnswerPlanner;

