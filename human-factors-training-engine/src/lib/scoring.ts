/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * Assessment Scoring Logic
 * Calculates scores and determines pass/fail status
 */

export interface QuestionResponse {
  questionId: string;
  answer: string | string[]; // single answer or array for multiple selection
}

export interface Question {
  id: string;
  points: number;
  correctAnswer: string | string[];
  questionType: string;
}

/**
 * Calculate assessment score
 * @param responses User responses to questions
 * @param questions Question data with correct answers
 * @returns Score as percentage (0-100)
 */
export function calculateScore(responses: QuestionResponse[], questions: Question[]): number {
  if (!responses || responses.length === 0) return 0;

  let pointsEarned = 0;
  let totalPoints = 0;

  // Create lookup map for questions
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // Score each response
  for (const response of responses) {
    const question = questionMap.get(response.questionId);
    if (!question) continue;

    totalPoints += question.points;

    // Check if answer is correct
    if (isAnswerCorrect(response.answer, question.correctAnswer, question.questionType)) {
      pointsEarned += question.points;
    }
  }

  // Return percentage (0-100)
  if (totalPoints === 0) return 0;
  return Math.round((pointsEarned / totalPoints) * 100);
}

/**
 * Determine if answer is correct
 * Handles different question types (multiChoice, scenario, shortAnswer)
 */
function isAnswerCorrect(
  answer: string | string[],
  correctAnswer: string | string[],
  questionType: string,
): boolean {
  // For multiple choice and scenario: exact match
  if (questionType === 'multiChoice' || questionType === 'scenario') {
    return answer === correctAnswer;
  }

  // For short answer: case-insensitive, trim whitespace
  if (questionType === 'shortAnswer') {
    const normalizedAnswer = String(answer).toLowerCase().trim();
    const normalizedCorrect = String(correctAnswer).toLowerCase().trim();
    return normalizedAnswer === normalizedCorrect;
  }

  return false;
}

/**
 * Determine if score is passing
 * @param score Score as percentage (0-100)
 * @param passingThreshold Passing threshold (default 80)
 * @returns true if score >= threshold
 */
export function determinePassed(score: number, passingThreshold: number = 80): boolean {
  return score >= passingThreshold;
}

/**
 * Get score breakdown (for display)
 */
export function getScoreBreakdown(
  score: number,
  totalPoints: number,
  passingThreshold: number = 80,
) {
  const pointsEarned = Math.round((score / 100) * totalPoints);
  const pointsNeeded = Math.round((passingThreshold / 100) * totalPoints);

  return {
    score,
    totalPoints,
    pointsEarned,
    pointsNeeded,
    passingThreshold,
    passed: determinePassed(score, passingThreshold),
    gap: Math.max(0, pointsNeeded - pointsEarned),
  };
}

/**
 * Validate assessment attempt
 * Checks that all questions were answered
 */
export function validateAttempt(responses: QuestionResponse[], totalQuestions: number): {
  valid: boolean;
  missingCount: number;
  message: string;
} {
  if (responses.length !== totalQuestions) {
    return {
      valid: false,
      missingCount: totalQuestions - responses.length,
      message: `You must answer all ${totalQuestions} questions before submitting.`,
    };
  }

  return {
    valid: true,
    missingCount: 0,
    message: 'Assessment ready to submit.',
  };
}
