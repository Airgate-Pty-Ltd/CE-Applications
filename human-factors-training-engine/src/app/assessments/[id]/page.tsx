'use client';

/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AssessmentQuestion from '@/components/AssessmentQuestion';

interface Question {
  id: string;
  questionText: string;
  questionType: 'multiChoice' | 'shortAnswer' | 'scenario';
  options: Array<{ text: string; isCorrect?: boolean }>;
  points: number;
}

interface Assessment {
  id: string;
  title: string;
  passingScore: number;
  timeLimit?: number;
  questionCount: number;
}

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for answers: { [questionId]: answer }
  const [answers, setAnswers] = useState<{ [key: string]: string | string[] }>({});

  // Fetch assessment and start attempt
  useEffect(() => {
    const startAssessment = async () => {
      try {
        const response = await fetch(`/api/assessments/${assessmentId}/start`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          if (response.status === 403) {
            setError('Complete all lessons before taking this assessment');
            return;
          }
          throw new Error('Failed to start assessment');
        }

        const data = await response.json();
        setAssessment(data.assessment);
        setQuestions(data.questions);
        setAttemptId(data.attemptId);

        // Initialize answers object
        const initialAnswers: { [key: string]: string | string[] } = {};
        data.questions.forEach((q: Question) => {
          initialAnswers[q.id] = '';
        });
        setAnswers(initialAnswers);
      } catch (err) {
        setError('Failed to load assessment');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    startAssessment();
  }, [assessmentId, router]);

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    // Validate all questions answered
    const unanswered = questions.filter((q) => {
      const answer = answers[q.id];
      return answer === '' || (Array.isArray(answer) && answer.length === 0);
    });

    if (unanswered.length > 0) {
      alert(
        `Please answer all ${unanswered.length} unanswered question(s) before submitting.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          responses: questions.map((q) => ({
            questionId: q.id,
            answer: answers[q.id],
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit assessment');
      }

      const data = await response.json();
      router.push(`/assessments/${attemptId}/results`);
    } catch (err) {
      alert('Failed to submit assessment');
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading assessment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error}</p>
          <Link href="/dashboard" style={styles.backLink}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!assessment || !questions.length) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <p style={styles.errorText}>Assessment not found</p>
          <Link href="/dashboard" style={styles.backLink}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const answeredCount = Object.values(answers).filter(
    (a) => a !== '' && (Array.isArray(a) ? a.length > 0 : true),
  ).length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>{assessment.title}</h1>
          <div style={styles.headerMeta}>
            <span style={styles.metaItem}>
              {answeredCount} of {questions.length} answered
            </span>
            {assessment.timeLimit && (
              <span style={styles.metaItem}>Time limit: {assessment.timeLimit} min</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Progress Bar */}
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${(answeredCount / questions.length) * 100}%`,
              }}
            />
          </div>
          <p style={styles.progressText}>
            {answeredCount}/{questions.length} questions answered
          </p>
        </div>

        {/* Questions */}
        <div style={styles.questionsContainer}>
          {questions.map((question, index) => (
            <AssessmentQuestion
              key={question.id}
              id={question.id}
              number={index + 1}
              questionText={question.questionText}
              questionType={question.questionType}
              options={question.options}
              points={question.points}
              answer={answers[question.id]}
              onChange={handleAnswerChange}
            />
          ))}
        </div>

        {/* Submit Section */}
        <div style={styles.submitSection}>
          <div style={styles.infoBox}>
            <p style={styles.infoText}>
              Passing score: <strong>{assessment.passingScore}%</strong>
            </p>
            <p style={styles.infoText}>
              Total points: <strong>{totalPoints}</strong>
            </p>
          </div>

          <div style={styles.actionButtons}>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || answeredCount < questions.length}
              style={{
                ...styles.submitButton,
                opacity: isSubmitting || answeredCount < questions.length ? 0.5 : 1,
              }}
            >
              {isSubmitting ? 'Submitting...' : '✓ Submit Assessment'}
            </button>
            <Link href="/dashboard" style={styles.cancelButton}>
              Cancel
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2026 Conform-Edge Quality Consulting | Phase 1 MVP</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
    backgroundColor: 'var(--void)',
  },

  header: {
    backgroundColor: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    padding: '1.5rem',
  },

  headerContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
  },

  title: {
    fontSize: '1.75rem',
    color: 'var(--t1)',
    margin: '0 0 1rem 0',
  },

  headerMeta: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap' as const,
  },

  metaItem: {
    color: 'var(--t2)',
    fontSize: '0.9rem',
  },

  main: {
    flex: 1,
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
    padding: '2rem 1rem',
  },

  progressSection: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },

  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: 'var(--border)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--signal)',
    transition: 'width 0.3s ease',
  },

  progressText: {
    color: 'var(--t2)',
    fontSize: '0.9rem',
    margin: 0,
  },

  questionsContainer: {
    marginBottom: '2rem',
  },

  submitSection: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.5rem',
  },

  infoBox: {
    backgroundColor: 'var(--void)',
    padding: '1rem',
    borderRadius: '6px',
    marginBottom: '1.5rem',
  },

  infoText: {
    color: 'var(--t1)',
    fontSize: '0.95rem',
    margin: '0.5rem 0',
  },

  actionButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },

  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
  } as React.CSSProperties,

  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    color: 'var(--signal)',
    border: '1px solid var(--signal)',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
  },

  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '2rem',
    margin: '2rem 1rem',
    textAlign: 'center' as const,
  },

  errorText: {
    color: '#ef4444',
    fontSize: '1rem',
    marginBottom: '1rem',
  },

  backLink: {
    color: 'var(--signal)',
    textDecoration: 'none',
  },

  loading: {
    padding: '2rem',
    textAlign: 'center' as const,
    color: 'var(--t2)',
  },

  footer: {
    borderTop: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    padding: '1.5rem',
    textAlign: 'center' as const,
    color: 'var(--t3)',
    fontSize: '0.85rem',
  },
};
