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

interface AttemptResult {
  id: string;
  score: number;
  passed: boolean;
  assessment?: {
    title: string;
    passingScore: number;
  };
  course?: {
    title: string;
  };
}

export default function AssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.id as string;

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/assessments/attempts/${attemptId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch results');
        }

        const data = await response.json();
        setResult(data.attempt);

        // If passed, fetch certificate
        if (data.attempt.passed && data.attempt.certificate) {
          setCertificateUrl(`/certificates/${data.attempt.certificate.id}`);
        }
      } catch (err) {
        setError('Failed to load assessment results');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [attemptId, router]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading results...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error || 'Results not found'}</p>
          <Link href="/dashboard" style={styles.backLink}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const scorePercentage = Math.round(result.score);
  const gap = Math.max(0, result.assessment?.passingScore || 80 - result.score);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Assessment Results</h1>
          <p style={styles.subtitle}>{result.assessment?.title}</p>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Score Card */}
        <div
          style={{
            ...styles.scoreCard,
            borderLeft: result.passed
              ? '4px solid #10b981'
              : '4px solid #ef4444',
          }}
        >
          <div style={styles.scoreDisplay}>
            <div style={styles.scoreNumber}>{scorePercentage}%</div>
            <div style={styles.scoreLabel}>
              {result.passed ? '✓ PASSED' : '✗ FAILED'}
            </div>
          </div>

          <div style={styles.scoreDetails}>
            <div style={styles.scoreDetail}>
              <span style={styles.scoreDetailLabel}>Passing Score:</span>
              <span style={styles.scoreDetailValue}>
                {result.assessment?.passingScore}%
              </span>
            </div>

            {!result.passed && gap > 0 && (
              <div style={styles.scoreDetail}>
                <span style={styles.scoreDetailLabel}>Points Needed:</span>
                <span style={styles.scoreDetailValue}>{gap.toFixed(1)}%</span>
              </div>
            )}

            <div style={styles.scoreDetail}>
              <span style={styles.scoreDetailLabel}>Assessment:</span>
              <span style={styles.scoreDetailValue}>
                {result.assessment?.title}
              </span>
            </div>
          </div>
        </div>

        {/* Results Message */}
        {result.passed ? (
          <div style={styles.successBox}>
            <h2 style={styles.successTitle}>🎉 Congratulations!</h2>
            <p style={styles.successMessage}>
              You have successfully completed this course assessment.
            </p>
            <p style={styles.successMessage}>
              Your certificate of completion has been generated and is ready for download.
            </p>

            {certificateUrl && (
              <Link href={certificateUrl} style={styles.certificateLink}>
                Download Certificate
              </Link>
            )}
          </div>
        ) : (
          <div style={styles.failBox}>
            <h2 style={styles.failTitle}>Assessment Not Passed</h2>
            <p style={styles.failMessage}>
              You scored {scorePercentage}% but needed {result.assessment?.passingScore}% to pass.
            </p>
            <p style={styles.failMessage}>
              Review the course materials and try again.
            </p>
            <button
              onClick={() => router.back()}
              style={styles.retryButton}
            >
              Review and Retry
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div style={styles.actionButtons}>
          <Link href="/dashboard" style={styles.dashboardButton}>
            Back to Dashboard
          </Link>
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
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  },

  title: {
    fontSize: '1.75rem',
    color: 'var(--t1)',
    margin: '0 0 0.5rem 0',
  },

  subtitle: {
    color: 'var(--t2)',
    fontSize: '0.95rem',
    margin: 0,
  },

  main: {
    flex: 1,
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
    padding: '2rem 1rem',
  },

  scoreCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '2rem',
    marginBottom: '2rem',
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap' as const,
  },

  scoreDisplay: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '150px',
  },

  scoreNumber: {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    color: 'var(--signal)',
    lineHeight: 1,
  },

  scoreLabel: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginTop: '0.5rem',
    color: 'var(--t1)',
  },

  scoreDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    gap: '0.75rem',
  },

  scoreDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--border)',
  },

  scoreDetailLabel: {
    color: 'var(--t2)',
    fontSize: '0.9rem',
  },

  scoreDetailValue: {
    color: 'var(--t1)',
    fontWeight: '500',
    fontSize: '0.95rem',
  },

  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    padding: '2rem',
    marginBottom: '2rem',
    textAlign: 'center' as const,
  },

  successTitle: {
    color: '#10b981',
    fontSize: '1.5rem',
    margin: '0 0 1rem 0',
  },

  successMessage: {
    color: 'var(--t1)',
    fontSize: '1rem',
    lineHeight: '1.6',
    marginBottom: '0.75rem',
  },

  certificateLink: {
    display: 'inline-block',
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '4px',
    fontWeight: '500',
  },

  failBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '2rem',
    marginBottom: '2rem',
    textAlign: 'center' as const,
  },

  failTitle: {
    color: '#ef4444',
    fontSize: '1.5rem',
    margin: '0 0 1rem 0',
  },

  failMessage: {
    color: 'var(--t1)',
    fontSize: '1rem',
    lineHeight: '1.6',
    marginBottom: '0.75rem',
  },

  retryButton: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--signal)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '1rem',
  } as React.CSSProperties,

  actionButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },

  dashboardButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--surface)',
    color: 'var(--signal)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '500',
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
