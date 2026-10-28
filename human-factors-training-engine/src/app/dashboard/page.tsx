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
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Course {
  id: string;
  title: string;
  description: string;
  progressPercent: number;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/courses', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch courses');
        }

        const data = await response.json();
        setCourses(data.courses || []);
        setUserName(data.userName || 'Learner');
      } catch (err) {
        setError('Failed to load courses');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.headerTitle}>Dashboard</h1>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.welcome}>
          <h2>Welcome back, {userName}!</h2>
          <p>Continue your Human Factors training journey.</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <div style={styles.loading}>Loading your courses...</div>
        ) : courses.length === 0 ? (
          <div style={styles.noCourses}>
            <p>No courses assigned yet. Contact your training manager.</p>
          </div>
        ) : (
          <div style={styles.courseGrid}>
            <h3 style={styles.sectionTitle}>My Courses</h3>
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`} style={{ textDecoration: 'none' }}>
                <div style={styles.courseCard}>
                  <div style={styles.courseHeader}>
                    <h4 style={styles.courseTitle}>{course.title}</h4>
                    <span
                      style={{
                        ...styles.badge,
                        ...(course.status === 'completed'
                          ? styles.badgeSuccess
                          : styles.badgeInProgress),
                      }}
                    >
                      {course.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  <p style={styles.courseDescription}>{course.description}</p>
                  <div style={styles.progressSection}>
                    <div style={styles.progressLabel}>
                      <span>Progress</span>
                      <span style={styles.progressPercent}>{course.progressPercent}%</span>
                    </div>
                    <div style={styles.progressBar}>
                      <div
                        style={{
                          ...styles.progressBarFill,
                          width: `${course.progressPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
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
    padding: '1rem',
  },

  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },

  headerTitle: {
    fontSize: '1.75rem',
    color: 'var(--t1)',
  },

  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: 'var(--signal)',
    border: '1px solid var(--signal)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },

  main: {
    flex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    padding: '2rem 1rem',
  },

  welcome: {
    marginBottom: '2rem',
  },

  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },

  loading: {
    textAlign: 'center' as const,
    padding: '2rem',
    color: 'var(--t2)',
  },

  noCourses: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '2rem',
    textAlign: 'center' as const,
  },

  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },

  sectionTitle: {
    gridColumn: '1 / -1',
    fontSize: '1.25rem',
    marginBottom: '0.5rem',
    color: 'var(--t1)',
  },

  courseCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '250px',
    display: 'flex',
    flexDirection: 'column' as const,
  },

  courseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
  },

  courseTitle: {
    fontSize: '1.1rem',
    color: 'var(--t1)',
    margin: 0,
  },

  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },

  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
  },

  badgeInProgress: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    color: 'var(--signal)',
  },

  courseDescription: {
    color: 'var(--t2)',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    flex: 1,
  },

  progressSection: {
    marginTop: 'auto',
  },

  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    marginBottom: '0.5rem',
    color: 'var(--t2)',
  },

  progressPercent: {
    fontWeight: 'bold',
    color: 'var(--signal)',
  },

  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--border)',
    borderRadius: '3px',
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--signal)',
    transition: 'width 0.3s ease',
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
