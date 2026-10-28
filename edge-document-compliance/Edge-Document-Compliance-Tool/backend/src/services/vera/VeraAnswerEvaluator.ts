/**
 * Vera Answer Evaluator
 * 
 * Enables Vera to critique her own answers, identify weaknesses,
 * and feed that into the learning loop for continuous improvement.
 */

import { callVeraLLM, isLLMConfigured } from './VeraLLMBridge.js';

export interface AnswerEvaluationInput {
  userQuestion: string;
  answer: string;
  contextSummary?: string;  // optional short description of what was used
  intent?: string;
  confidence?: number;
}

export interface AnswerEvaluationResult {
  score: number;            // 0–1
  issues: string[];         // bullet list of problems
  suggestions: string[];    // how the answer could be improved
  strengths?: string[];    // what the answer did well
}

/**
 * Evaluate answer quality using LLM
 */
export async function evaluateAnswerQuality(
  input: AnswerEvaluationInput
): Promise<AnswerEvaluationResult | null> {
  try {
    const { userQuestion, answer, contextSummary, intent, confidence } = input;

    // Check if LLM is configured
    if (!isLLMConfigured()) {
      console.warn('[VeraEvaluator] LLM not configured - skipping self-evaluation');
      return null;
    }

    // Build evaluation prompt
    const systemPrompt = `You are an internal auditor reviewing this answer for completeness, correctness, and usefulness.

Your task:
1. Score the answer between 0 and 1 (where 1 is perfect)
2. Identify specific issues or weaknesses
3. Suggest concrete improvements
4. Note what the answer did well (if anything)

Evaluation criteria:
- Completeness: Does it fully address the question?
- Correctness: Is the information accurate?
- Clarity: Is it well-structured and easy to understand?
- Actionability: Does it provide practical guidance?
- Evidence: Does it cite sources or standards appropriately?
- Depth: Is the level of detail appropriate for the question?

Respond in JSON format:
{
  "score": 0.0-1.0,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "strengths": ["strength 1", "strength 2"]
}`;

    const contextBlocks = [
      {
        label: 'User Question',
        text: userQuestion
      },
      {
        label: 'Vera\'s Answer',
        text: answer
      }
    ];

    if (contextSummary) {
      contextBlocks.push({
        label: 'Context Used',
        text: contextSummary
      });
    }

    if (intent) {
      contextBlocks.push({
        label: 'Detected Intent',
        text: intent
      });
    }

    if (confidence !== undefined) {
      contextBlocks.push({
        label: 'Confidence Score',
        text: `Vera's confidence: ${confidence.toFixed(2)}`
      });
    }

    // Call LLM for evaluation
    const llmResponse = await callVeraLLM({
      systemPrompt,
      contextBlocks,
      userMessage: `Evaluate this answer quality. User question: "${userQuestion}"`,
      intent: 'self_evaluation',
      tenantId: '00000000-0000-0000-0000-000000000000'
    });

    if (!llmResponse || !llmResponse.answer) {
      return null;
    }

    // Parse JSON response
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      let jsonText = llmResponse.answer;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const evaluation = JSON.parse(jsonText.trim());

      // Validate and normalize
      const result: AnswerEvaluationResult = {
        score: Math.max(0, Math.min(1, parseFloat(evaluation.score) || 0.5)),
        issues: Array.isArray(evaluation.issues) ? evaluation.issues : [],
        suggestions: Array.isArray(evaluation.suggestions) ? evaluation.suggestions : [],
        strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : []
      };

      console.log(`[VeraEvaluator] Answer scored: ${result.score.toFixed(2)} (${result.issues.length} issues, ${result.suggestions.length} suggestions)`);

      return result;

    } catch (parseError: any) {
      console.warn('[VeraEvaluator] Failed to parse evaluation JSON:', parseError.message);
      // Fallback: extract score from text
      const scoreMatch = llmResponse.answer.match(/score[:\s]+([0-9.]+)/i);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.5;

      return {
        score: Math.max(0, Math.min(1, score)),
        issues: ['Could not parse detailed evaluation'],
        suggestions: ['Review answer manually']
      };
    }

  } catch (error: any) {
    console.error('[VeraEvaluator] Error evaluating answer:', error.message);
    return null;
  }
}

/**
 * Refine answer based on evaluation feedback
 */
export async function refineAnswer(
  originalAnswer: string,
  evaluation: AnswerEvaluationResult,
  userQuestion: string
): Promise<string | null> {
  try {
    if (!isLLMConfigured()) {
      return null;
    }

    const systemPrompt = `You are Vera, a compliance specialist. Improve this answer based on the evaluator's feedback.

Original question: "${userQuestion}"

Issues identified:
${evaluation.issues.map(i => `- ${i}`).join('\n')}

Suggestions for improvement:
${evaluation.suggestions.map(s => `- ${s}`).join('\n')}

Generate an improved version of the answer that addresses these issues while maintaining accuracy and Vera's professional tone.`;

    const contextBlocks = [
      {
        label: 'Original Answer',
        text: originalAnswer
      }
    ];

    const llmResponse = await callVeraLLM({
      systemPrompt,
      contextBlocks,
      userMessage: `Improve this answer: "${originalAnswer.substring(0, 200)}..."`,
      intent: 'answer_refinement',
      tenantId: '00000000-0000-0000-0000-000000000000'
    });

    if (llmResponse && llmResponse.answer) {
      return llmResponse.answer;
    }

    return null;

  } catch (error: any) {
    console.error('[VeraEvaluator] Error refining answer:', error.message);
    return null;
  }
}

