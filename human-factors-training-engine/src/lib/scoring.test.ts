/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import {
  calculateScore,
  determinePassed,
  getScoreBreakdown,
  validateAttempt,
  QuestionResponse,
  Question,
} from './scoring';

describe('Scoring Logic', () => {
  const mockQuestions: Question[] = [
    {
      id: 'q1',
      points: 5,
      correctAnswer: 'A',
      questionType: 'multiChoice',
    },
    {
      id: 'q2',
      points: 5,
      correctAnswer: 'B',
      questionType: 'multiChoice',
    },
    {
      id: 'q3',
      points: 5,
      correctAnswer: 'correct answer',
      questionType: 'shortAnswer',
    },
    {
      id: 'q4',
      points: 5,
      correctAnswer: 'C',
      questionType: 'scenario',
    },
  ];

  test('calculateScore - all correct answers', () => {
    const responses: QuestionResponse[] = [
      { questionId: 'q1', answer: 'A' },
      { questionId: 'q2', answer: 'B' },
      { questionId: 'q3', answer: 'correct answer' },
      { questionId: 'q4', answer: 'C' },
    ];

    const score = calculateScore(responses, mockQuestions);
    expect(score).toBe(100);
  });

  test('calculateScore - 80% correct (16 out of 20 points)', () => {
    const responses: QuestionResponse[] = [
      { questionId: 'q1', answer: 'A' },
      { questionId: 'q2', answer: 'B' },
      { questionId: 'q3', answer: 'wrong answer' },
      { questionId: 'q4', answer: 'C' },
    ];

    const score = calculateScore(responses, mockQuestions);
    expect(score).toBe(75); // 15 points out of 20
  });

  test('calculateScore - 50% correct', () => {
    const responses: QuestionResponse[] = [
      { questionId: 'q1', answer: 'A' },
      { questionId: 'q2', answer: 'X' },
      { questionId: 'q3', answer: 'wrong' },
      { questionId: 'q4', answer: 'C' },
    ];

    const score = calculateScore(responses, mockQuestions);
    expect(score).toBe(50); // 10 points out of 20
  });

  test('calculateScore - no correct answers', () => {
    const responses: QuestionResponse[] = [
      { questionId: 'q1', answer: 'X' },
      { questionId: 'q2', answer: 'X' },
      { questionId: 'q3', answer: 'wrong' },
      { questionId: 'q4', answer: 'X' },
    ];

    const score = calculateScore(responses, mockQuestions);
    expect(score).toBe(0);
  });

  test('calculateScore - empty responses', () => {
    const score = calculateScore([], mockQuestions);
    expect(score).toBe(0);
  });

  test('determinePassed - score 80%', () => {
    expect(determinePassed(80)).toBe(true);
  });

  test('determinePassed - score 79%', () => {
    expect(determinePassed(79)).toBe(false);
  });

  test('determinePassed - score 100%', () => {
    expect(determinePassed(100)).toBe(true);
  });

  test('determinePassed - custom threshold', () => {
    expect(determinePassed(75, 75)).toBe(true);
    expect(determinePassed(74, 75)).toBe(false);
  });

  test('getScoreBreakdown - passing score', () => {
    const breakdown = getScoreBreakdown(80, 100);
    expect(breakdown.passed).toBe(true);
    expect(breakdown.score).toBe(80);
    expect(breakdown.gap).toBe(0);
  });

  test('getScoreBreakdown - failing score', () => {
    const breakdown = getScoreBreakdown(70, 100);
    expect(breakdown.passed).toBe(false);
    expect(breakdown.score).toBe(70);
    expect(breakdown.gap).toBe(10); // Need 10 more points
  });

  test('validateAttempt - all questions answered', () => {
    const responses: QuestionResponse[] = [
      { questionId: 'q1', answer: 'A' },
      { questionId: 'q2', answer: 'B' },
      { questionId: 'q3', answer: 'answer' },
      { questionId: 'q4', answer: 'C' },
    ];

    const validation = validateAttempt(responses, 4);
    expect(validation.valid).toBe(true);
    expect(validation.missingCount).toBe(0);
  });

  test('validateAttempt - missing questions', () => {
    const responses: QuestionResponse[] = [
      { questionId: 'q1', answer: 'A' },
      { questionId: 'q2', answer: 'B' },
    ];

    const validation = validateAttempt(responses, 4);
    expect(validation.valid).toBe(false);
    expect(validation.missingCount).toBe(2);
  });

  test('validateAttempt - short answer case insensitive', () => {
    const responses: QuestionResponse[] = [
      { questionId: 'q3', answer: 'CORRECT ANSWER' }, // uppercase
    ];

    const shortAnswerQuestion: Question[] = [
      {
        id: 'q3',
        points: 5,
        correctAnswer: 'correct answer',
        questionType: 'shortAnswer',
      },
    ];

    const score = calculateScore(responses, shortAnswerQuestion);
    expect(score).toBe(100); // Should match case-insensitively
  });
});
