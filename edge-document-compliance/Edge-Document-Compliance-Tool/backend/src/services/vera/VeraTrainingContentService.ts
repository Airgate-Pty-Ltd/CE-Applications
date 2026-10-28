/**
 * Vera Training Content Service
 * 
 * Generates training outlines, slide-level talking points, and exam questions
 * tied to clauses and learning objectives.
 * 
 * Phase 20: Training & Exam Content Generator
 */

import { queryEdcatAI, queryPostgres } from '../../config/databases.js';
import { buildContext } from './VeraContextOrchestrator.js';
import { callVeraLLM, isLLMConfigured } from './VeraLLMBridge.js';
import { v4 as uuidv4 } from 'uuid';

export interface TrainingModule {
  title: string;
  learningObjectives: string[];
  keyTopics: string[];
  duration: string;
  talkingPoints: string[];
  assessmentMethods: string[];
}

export interface TrainingOutline {
  title: string;
  audience: string;
  modules: TrainingModule[];
  totalDuration: string;
}

export interface ExamQuestion {
  id?: string;
  questionStem: string;
  questionType: 'multiple_choice' | 'scenario' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'intro' | 'intermediate' | 'advanced';
  standardCode?: string;
  clauseRef?: string;
  learningObjective?: string;
  domain?: string;
}

/**
 * Generate training outline
 */
export async function generateTrainingOutline(
  topic: string,
  standards: string[],
  audience: "operators" | "engineers" | "auditors" | "managers",
  tenantId: string = '00000000-0000-0000-0000-000000000000'
): Promise<TrainingOutline> {
  try {
    console.log(`[VeraTraining] Generating training outline for: ${topic}`);

    // Build context
    const context = await buildContext({
      tenantId,
      userMessage: `Generate training outline for ${topic}`,
      intent: 'training_outline_request'
    });

    if (isLLMConfigured()) {
      const systemPrompt = `You are a training specialist creating a comprehensive training outline.

Topic: ${topic}
Standards: ${standards.join(', ')}
Audience: ${audience}

Create a structured training outline with:
1. Title
2. Modules (each with title, learning objectives, key topics, duration, talking points, assessment methods)
3. Total duration

Format as JSON:
{
  "title": "Training Title",
  "audience": "${audience}",
  "modules": [
    {
      "title": "Module Title",
      "learningObjectives": ["objective1", "objective2"],
      "keyTopics": ["topic1", "topic2"],
      "duration": "2 hours",
      "talkingPoints": ["point1", "point2"],
      "assessmentMethods": ["method1", "method2"]
    }
  ],
  "totalDuration": "8 hours"
}`;

      const llmResponse = await callVeraLLM({
        systemPrompt,
        contextBlocks: [
          {
            label: 'Requirements',
            text: context.standardClauses?.map((c: any) => `${c.clauseNumber}: ${c.requirementText}`).join('\n\n') || 'No requirements found'
          }
        ],
        userMessage: `Generate training outline for ${topic}`,
        intent: 'training_outline_request',
        tenantId
      });

      if (llmResponse?.answer) {
        let jsonText = llmResponse.answer;
        const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
        return JSON.parse(jsonText.trim());
      }
    }

    // Fallback
    return {
      title: `Training: ${topic}`,
      audience,
      modules: [
        {
          title: `Introduction to ${topic}`,
          learningObjectives: [`Understand ${topic} requirements`, `Apply ${topic} in practice`],
          keyTopics: [topic],
          duration: '2 hours',
          talkingPoints: [`Overview of ${topic}`, `Key requirements`, `Practical examples`],
          assessmentMethods: ['Quiz', 'Practical exercise']
        }
      ],
      totalDuration: '2 hours'
    };

  } catch (error: any) {
    console.error('[VeraTraining] Error generating outline:', error.message);
    throw error;
  }
}

/**
 * Generate exam questions
 */
export async function generateExamQuestions(
  topic: string,
  standards: string[],
  difficulty: "intro" | "intermediate" | "advanced",
  questionCount: number,
  tenantId: string = '00000000-0000-0000-0000-000000000000'
): Promise<ExamQuestion[]> {
  try {
    console.log(`[VeraTraining] Generating ${questionCount} ${difficulty} questions for: ${topic}`);

    const questions: ExamQuestion[] = [];

    // Build context
    const context = await buildContext({
      tenantId,
      userMessage: `Generate exam questions for ${topic}`,
      intent: 'exam_question_request'
    });

    if (isLLMConfigured()) {
      const systemPrompt = `You are a training specialist creating exam questions.

Topic: ${topic}
Standards: ${standards.join(', ')}
Difficulty: ${difficulty}
Question Count: ${questionCount}

Generate a mix of question types:
- Multiple choice (60%)
- Scenario-based (30%)
- True/False (10%)

For each question, provide:
- question_stem
- question_type
- options (for multiple choice)
- correct_answer
- explanation
- difficulty
- learning_objective

Format as JSON array:
[
  {
    "questionStem": "Question text",
    "questionType": "multiple_choice",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "Why A is correct",
    "difficulty": "${difficulty}",
    "learningObjective": "What this tests"
  }
]`;

      const llmResponse = await callVeraLLM({
        systemPrompt,
        contextBlocks: [
          {
            label: 'Requirements',
            text: context.standardClauses?.map((c: any) => `${c.clauseNumber}: ${c.requirementText}`).join('\n\n') || 'No requirements found'
          }
        ],
        userMessage: `Generate ${questionCount} ${difficulty} exam questions for ${topic}`,
        intent: 'exam_question_request',
        tenantId
      });

      if (llmResponse?.answer) {
        let jsonText = llmResponse.answer;
        const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }

        const parsedQuestions = JSON.parse(jsonText.trim());
        
        for (const q of parsedQuestions) {
          const question: ExamQuestion = {
            questionStem: q.questionStem || q.question_stem || '',
            questionType: q.questionType || q.question_type || 'multiple_choice',
            options: q.options || [],
            correctAnswer: q.correctAnswer || q.correct_answer || '',
            explanation: q.explanation || '',
            difficulty: q.difficulty || difficulty,
            standardCode: standards[0],
            learningObjective: q.learningObjective || q.learning_objective || '',
            domain: detectDomain(topic)
          };

          // Save to database
          await saveQuestion(question, tenantId);
          questions.push(question);
        }
      }
    }

    // Fallback: Generate simple questions
    if (questions.length === 0) {
      for (let i = 0; i < questionCount; i++) {
        const question: ExamQuestion = {
          questionStem: `What is a key requirement of ${topic}?`,
          questionType: 'multiple_choice',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A',
          explanation: `This question tests understanding of ${topic} requirements.`,
          difficulty,
          standardCode: standards[0],
          learningObjective: `Understand ${topic}`,
          domain: detectDomain(topic)
        };
        await saveQuestion(question, tenantId);
        questions.push(question);
      }
    }

    return questions;

  } catch (error: any) {
    console.error('[VeraTraining] Error generating questions:', error.message);
    return [];
  }
}

/**
 * Save question to database
 */
async function saveQuestion(question: ExamQuestion, tenantId: string): Promise<void> {
  try {
    await queryEdcatAI(`
      INSERT INTO edcat.vera_training_questions
      (id, tenant_id, question_type, difficulty, question_stem, options, correct_answer,
       explanation, standard_code, clause_ref, learning_objective, domain, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (id) DO NOTHING
    `, [
      question.id || uuidv4(),
      tenantId,
      question.questionType,
      question.difficulty,
      question.questionStem,
      JSON.stringify(question.options || []),
      question.correctAnswer,
      question.explanation,
      question.standardCode || null,
      question.clauseRef || null,
      question.learningObjective || null,
      question.domain || null
    ]);

  } catch (error: any) {
    console.error('[VeraTraining] Error saving question:', error.message);
    // Non-fatal
  }
}

/**
 * Detect domain from topic
 */
function detectDomain(topic: string): string | undefined {
  const lower = topic.toLowerCase();
  if (lower.match(/\b(as91|faa|easa|aerospace)\b/)) return 'aerospace';
  if (lower.match(/\b(13485|mdsap|fda|medical)\b/)) return 'medical_device';
  if (lower.match(/\b(iatf|automotive)\b/)) return 'automotive';
  return undefined;
}

