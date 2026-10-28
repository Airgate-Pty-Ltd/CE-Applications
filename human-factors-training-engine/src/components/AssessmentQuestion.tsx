/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import React from 'react';

interface Option {
  text: string;
  isCorrect?: boolean;
}

interface AssessmentQuestionProps {
  id: string;
  number: number;
  questionText: string;
  questionType: 'multiChoice' | 'shortAnswer' | 'scenario';
  options: Option[];
  points: number;
  answer?: string | string[];
  onChange: (questionId: string, answer: string | string[]) => void;
}

export default function AssessmentQuestion({
  id,
  number,
  questionText,
  questionType,
  options,
  points,
  answer = '',
  onChange,
}: AssessmentQuestionProps) {
  const handleSingleChoice = (optionText: string) => {
    onChange(id, optionText);
  };

  const handleMultipleChoice = (optionText: string) => {
    const currentAnswers = Array.isArray(answer) ? answer : [];
    const updated = currentAnswers.includes(optionText)
      ? currentAnswers.filter((a) => a !== optionText)
      : [...currentAnswers, optionText];
    onChange(id, updated);
  };

  const handleShortAnswer = (text: string) => {
    onChange(id, text);
  };

  return (
    <div style={styles.questionContainer}>
      {/* Question Header */}
      <div style={styles.questionHeader}>
        <h3 style={styles.questionNumber}>Question {number}</h3>
        <span style={styles.points}>{points} points</span>
      </div>

      {/* Question Text */}
      <p style={styles.questionText}>{questionText}</p>

      {/* Answer Options */}
      <div style={styles.optionsContainer}>
        {questionType === 'multiChoice' && (
          <div style={styles.optionsList}>
            {options.map((option, index) => (
              <label key={index} style={styles.optionLabel}>
                <input
                  type="radio"
                  name={`question-${id}`}
                  value={option.text}
                  checked={answer === option.text}
                  onChange={(e) => handleSingleChoice(e.target.value)}
                  style={styles.radio}
                />
                <span style={styles.optionText}>{option.text}</span>
              </label>
            ))}
          </div>
        )}

        {questionType === 'scenario' && (
          <div style={styles.optionsList}>
            {options.map((option, index) => (
              <label key={index} style={styles.optionLabel}>
                <input
                  type="radio"
                  name={`question-${id}`}
                  value={option.text}
                  checked={answer === option.text}
                  onChange={(e) => handleSingleChoice(e.target.value)}
                  style={styles.radio}
                />
                <span style={styles.scenarioOption}>{option.text}</span>
              </label>
            ))}
          </div>
        )}

        {questionType === 'shortAnswer' && (
          <input
            type="text"
            placeholder="Enter your answer..."
            value={typeof answer === 'string' ? answer : ''}
            onChange={(e) => handleShortAnswer(e.target.value)}
            style={styles.shortAnswerInput}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  questionContainer: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },

  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },

  questionNumber: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'var(--t1)',
    margin: 0,
  },

  points: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: 'var(--signal)',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontWeight: '500',
  },

  questionText: {
    fontSize: '1rem',
    color: 'var(--t1)',
    marginBottom: '1.25rem',
    lineHeight: '1.6',
  },

  optionsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
  },

  optionsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },

  optionLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.75rem',
    backgroundColor: 'var(--void)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },

  radio: {
    marginTop: '0.25rem',
    cursor: 'pointer',
    accentColor: 'var(--signal)',
  },

  optionText: {
    color: 'var(--t1)',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    flex: 1,
  },

  scenarioOption: {
    color: 'var(--t1)',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    flex: 1,
    fontStyle: 'italic',
  },

  shortAnswerInput: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    backgroundColor: 'var(--void)',
    color: 'var(--t1)',
    fontFamily: 'inherit',
  } as React.CSSProperties,
};
