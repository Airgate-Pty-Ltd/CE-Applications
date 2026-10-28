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
  order: number;
  completed: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  version: string;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessmentId, setAssessmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch course');
        }

        const data = await response.json();
        setCourse(data.course);
        setLessons(data.lessons);
        setAssessmentId(data.assessmentId || '');
        setCompletedCount(data.lessons.filter((l: Lesson) => l.completed).length);
      } catch (err) {
        setError('Failed to load course');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, router]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading course...</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error || 'Course not found'}</div>
        <Link href="/dashboard" style={styles.backLink}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>{course.title}</h1>
            <p style={styles.description}>{course.description}</p>
          </div>
          <Link href="/dashboard" style={styles.backButton}>
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Progress Section */}
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <h3>Course Progress</h3>
            <span style={styles.progressText}>
              {completedCount} of {lessons.length} lessons completed
            </span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressBarFill, width: `${progressPercent}%` }} />
          </div>
          <p style={styles.progressPercent}>{progressPercent}% Complete</p>
        </div>

        {/* Lessons List */}
        <div style={styles.lessonsSection}>
          <h3 style={styles.sectionTitle}>Lessons</h3>
          <div style={styles.lessonsList}>
            {lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                href={`/lessons/${lesson.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={styles.lessonCard}>
                  <div style={styles.lessonNumber}>
                    <span style={styles.lessonIndex}>{index + 1}</span>
                    {lesson.completed && <span style={styles.checkmark}>✓</span>}
                  </div>
                  <div style={styles.lessonContent}>
                    <h4 style={styles.lessonTitle}>{lesson.title}</h4>
                    <p style={styles.lessonStatus}>
                      {lesson.completed ? 'Completed' : 'Not started'}
                    </p>
                  </div>
                  <span style={styles.arrowIcon}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Assessment Notice */}
        {progressPercent === 100 && (
          <div style={styles.assessmentReady}>
            <h3>✓ Ready for Assessment</h3>
            <p>All lessons completed! You can now take the course assessment.</p>
            {assessmentId ? (
              <Link href={`/assessments/${assessmentId}`} style={styles.assessmentButton}>
                Take Assessment
              </Link>
            ) : (
              <button disabled style={{ ...styles.assessmentButton, opacity: 0.5 }}>
                No Assessment Available
              </button>
            )}
          </div>
        )}
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
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    gap: '2rem',
  },

  title: {
    fontSize: '1.75rem',
    color: 'var(--t1)',
    marginBottom: '0.5rem',
  },

  description: {
    color: 'var(--t2)',
    fontSize: '0.95rem',
  },

  backButton: {
    color: 'var(--signal)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    whiteSpace: 'nowrap' as const,
  },

  main: {
    flex: 1,
    maxWidth: '1200px',
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

  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },

  progressText: {
    color: 'var(--t2)',
    fontSize: '0.9rem',
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

  progressPercent: {
    color: 'var(--signal)',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },

  lessonsSection: {
    marginBottom: '2rem',
  },

  sectionTitle: {
    fontSize: '1.25rem',
    marginBottom: '1rem',
    color: 'var(--t1)',
  },

  lessonsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },

  lessonCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  lessonNumber: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '40px',
  },

  lessonIndex: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'var(--signal)',
  },

  checkmark: {
    color: '#10b981',
    fontSize: '1.2rem',
  },

  lessonContent: {
    flex: 1,
  },

  lessonTitle: {
    fontSize: '1rem',
    color: 'var(--t1)',
    margin: '0 0 0.25rem 0',
  },

  lessonStatus: {
    fontSize: '0.85rem',
    color: 'var(--t2)',
    margin: 0,
  },

  arrowIcon: {
    color: 'var(--t3)',
    fontSize: '1.2rem',
  },

  assessmentReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    padding: '1.5rem',
    textAlign: 'center' as const,
  },

  assessmentButton: {
    display: 'inline-block',
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    textDecoration: 'none',
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
