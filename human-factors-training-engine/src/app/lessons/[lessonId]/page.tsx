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

interface Lesson {
  id: string;
  title: string;
  content: string; // Markdown
  completed: boolean;
  courseId: string;
  courseName: string;
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await fetch(`/api/lessons/${lessonId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch lesson');
        }

        const data = await response.json();
        setLesson(data.lesson);
        setCompleted(data.lesson.completed);
      } catch (err) {
        setError('Failed to load lesson');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId, router]);

  const handleMarkComplete = async () => {
    if (completed || !lesson) return;

    setIsCompleting(true);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to mark lesson complete');
      }

      setCompleted(true);
    } catch (err) {
      alert('Failed to mark lesson complete');
      console.error('Error:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading lesson...</div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error || 'Lesson not found'}</div>
        <Link href="/dashboard" style={styles.backLink}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <p style={styles.breadcrumb}>
              <Link href="/dashboard" style={styles.breadcrumbLink}>
                Dashboard
              </Link>
              {' > '}
              <Link href={`/courses/${lesson.courseId}`} style={styles.breadcrumbLink}>
                {lesson.courseName}
              </Link>
              {' > '}
              <span>{lesson.title}</span>
            </p>
            <h1 style={styles.title}>{lesson.title}</h1>
          </div>
          {completed && <span style={styles.completedBadge}>✓ Completed</span>}
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.content}>
          {/* Lesson Content (Markdown rendered as HTML) */}
          <div style={styles.lessonContent}>
            {lesson.content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return (
                  <h2 key={i} style={styles.h2}>
                    {line.slice(2)}
                  </h2>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h3 key={i} style={styles.h3}>
                    {line.slice(3)}
                  </h3>
                );
              }
              if (line.startsWith('- ')) {
                return (
                  <li key={i} style={styles.li}>
                    {line.slice(2)}
                  </li>
                );
              }
              if (line.trim() === '') {
                return <br key={i} />;
              }
              return (
                <p key={i} style={styles.paragraph}>
                  {line}
                </p>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            {!completed && (
              <button
                onClick={handleMarkComplete}
                disabled={isCompleting}
                style={styles.completeButton}
              >
                {isCompleting ? 'Marking Complete...' : '✓ Mark as Complete'}
              </button>
            )}
            <Link href={`/courses/${lesson.courseId}`} style={styles.backButton}>
              Back to Course
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
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  breadcrumb: {
    color: 'var(--t2)',
    fontSize: '0.85rem',
    marginBottom: '0.5rem',
  },

  breadcrumbLink: {
    color: 'var(--signal)',
    textDecoration: 'none',
  },

  title: {
    fontSize: '1.75rem',
    color: 'var(--t1)',
  },

  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    padding: '0.5rem 1rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '500',
  },

  main: {
    flex: 1,
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
    padding: '2rem 1rem',
  },

  content: {
    display: 'flex',
    flexDirection: 'column' as const,
  },

  lessonContent: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '2rem',
    marginBottom: '2rem',
    lineHeight: '1.8',
    fontSize: '1rem',
  },

  h2: {
    fontSize: '1.5rem',
    marginTop: '1.5rem',
    marginBottom: '0.75rem',
    color: 'var(--t1)',
  },

  h3: {
    fontSize: '1.25rem',
    marginTop: '1rem',
    marginBottom: '0.5rem',
    color: 'var(--t1)',
  },

  paragraph: {
    color: 'var(--t1)',
    marginBottom: '1rem',
  },

  li: {
    color: 'var(--t1)',
    marginLeft: '1.5rem',
    marginBottom: '0.5rem',
  },

  actionButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },

  completeButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
  },

  backButton: {
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

  backLink: {
    color: 'var(--signal)',
    textDecoration: 'none',
  },

  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    padding: '1rem',
    borderRadius: '4px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    marginBottom: '1rem',
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
