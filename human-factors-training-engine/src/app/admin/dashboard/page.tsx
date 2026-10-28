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

interface Summary {
  totalEnrollments: number;
  completedEnrollments: number;
  completionPercent: number;
  averageScore: number;
  passedAssessments: number;
  totalAssessmentAttempts: number;
  overdueCount: number;
}

interface CourseStats {
  courseTitle: string;
  totalLearners: number;
  completedLearners: number;
  completionPercent: number;
}

interface LearnerStats {
  learnerName: string;
  learnerEmail: string;
  enrolledCourses: number;
  completedCourses: number;
  progressPercent: number;
  avgScore: number;
  passedAssessments: number;
}

interface OverdueEnrollment {
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  dueDate: string;
  progressPercent: number;
}

export default function AdminDashboard() {
  const router = useRouter();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [learnerStats, setLearnerStats] = useState<LearnerStats[]>([]);
  const [overdueEnrollments, setOverdueEnrollments] = useState<OverdueEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/admin/reports', {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          if (response.status === 403) {
            setError('Admin access required');
            return;
          }
          throw new Error('Failed to fetch reports');
        }

        const data = await response.json();
        setSummary(data.summary);
        setCourseStats(data.courseStats);
        setLearnerStats(data.learnerStats);
        setOverdueEnrollments(data.overdueEnrollments);
      } catch (err) {
        setError('Failed to load admin dashboard');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [router]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading admin dashboard...</div>
      </div>
    );
  }

  const handleSendOverdueReminders = async () => {
    setSendingReminders(true);
    try {
      const response = await fetch('/api/admin/notifications/send-overdue', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to send reminders');
      }

      const data = await response.json();
      alert(`Sent ${data.remindersSent} overdue reminders`);
    } catch (err) {
      alert('Failed to send reminders');
      console.error('Error:', err);
    } finally {
      setSendingReminders(false);
    }
  };

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

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <div style={styles.headerActions}>
            <button
              onClick={() => window.location.href = '/api/admin/reports/export'}
              style={styles.exportButton}
            >
              📥 Export Report
            </button>
            <Link href="/admin/enrollments" style={styles.actionLink}>
              Manage Enrollments
            </Link>
            <Link href="/admin/connectors" style={styles.actionLink}>
              Folder Connectors
            </Link>
            <Link href="/dashboard" style={styles.backButton}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Summary Cards */}
        {summary && (
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.cardValue}>{summary.totalEnrollments}</div>
              <div style={styles.cardLabel}>Total Enrollments</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.cardValue}>{summary.completionPercent}%</div>
              <div style={styles.cardLabel}>Completion Rate</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.cardValue}>{summary.averageScore}%</div>
              <div style={styles.cardLabel}>Average Score</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={{ ...styles.cardValue, color: summary.overdueCount > 0 ? '#ef4444' : '#10b981' }}>
                {summary.overdueCount}
              </div>
              <div style={styles.cardLabel}>Overdue Learners</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <div style={styles.tabs}>
            <button
              onClick={() => setActiveTab('courses')}
              style={{
                ...styles.tab,
                borderBottomColor: activeTab === 'courses' ? 'var(--signal)' : 'transparent',
                color: activeTab === 'courses' ? 'var(--signal)' : 'var(--t2)',
              }}
            >
              Course Stats
            </button>
            <button
              onClick={() => setActiveTab('learners')}
              style={{
                ...styles.tab,
                borderBottomColor: activeTab === 'learners' ? 'var(--signal)' : 'transparent',
                color: activeTab === 'learners' ? 'var(--signal)' : 'var(--t2)',
              }}
            >
              Learner Stats
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              style={{
                ...styles.tab,
                borderBottomColor: activeTab === 'overdue' ? 'var(--signal)' : 'transparent',
                color: activeTab === 'overdue' ? 'var(--signal)' : 'var(--t2)',
              }}
            >
              Overdue ({overdueEnrollments.length})
            </button>
          </div>
        </div>

        {/* Course Stats Table */}
        {activeTab === 'courses' && (
          <div style={styles.tableCard}>
            <h3 style={styles.tableTitle}>Course Completion Stats</h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Course Title</th>
                    <th style={styles.tableHeader}>Total Learners</th>
                    <th style={styles.tableHeader}>Completed</th>
                    <th style={styles.tableHeader}>Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {courseStats.map((course, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.tableCell}>{course.courseTitle}</td>
                      <td style={styles.tableCell}>{course.totalLearners}</td>
                      <td style={styles.tableCell}>{course.completedLearners}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.progressSmall}>
                          <div
                            style={{
                              ...styles.progressBarSmall,
                              width: `${course.completionPercent}%`,
                            }}
                          />
                        </div>
                        {course.completionPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Learner Stats Table */}
        {activeTab === 'learners' && (
          <div style={styles.tableCard}>
            <h3 style={styles.tableTitle}>Learner Progress Stats</h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Learner Name</th>
                    <th style={styles.tableHeader}>Email</th>
                    <th style={styles.tableHeader}>Enrolled</th>
                    <th style={styles.tableHeader}>Completed</th>
                    <th style={styles.tableHeader}>Progress</th>
                    <th style={styles.tableHeader}>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {learnerStats.map((learner, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.tableCell}>{learner.learnerName}</td>
                      <td style={styles.tableCell}>{learner.learnerEmail}</td>
                      <td style={styles.tableCell}>{learner.enrolledCourses}</td>
                      <td style={styles.tableCell}>{learner.completedCourses}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.progressSmall}>
                          <div
                            style={{
                              ...styles.progressBarSmall,
                              width: `${learner.progressPercent}%`,
                            }}
                          />
                        </div>
                        {learner.progressPercent}%
                      </td>
                      <td style={styles.tableCell}>{learner.avgScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Overdue Enrollments */}
        {activeTab === 'overdue' && (
          <div style={styles.tableCard}>
            <div style={styles.tableHeader2}>
              <h3 style={styles.tableTitle}>Overdue Enrollments</h3>
              {overdueEnrollments.length > 0 && (
                <button
                  onClick={handleSendOverdueReminders}
                  disabled={sendingReminders}
                  style={styles.remindButton}
                >
                  {sendingReminders ? '⟳ Sending...' : '📧 Send Reminders'}
                </button>
              )}
            </div>
            {overdueEnrollments.length === 0 ? (
              <p style={styles.noData}>No overdue enrollments</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>Learner Name</th>
                      <th style={styles.tableHeader}>Email</th>
                      <th style={styles.tableHeader}>Course</th>
                      <th style={styles.tableHeader}>Due Date</th>
                      <th style={styles.tableHeader}>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueEnrollments.map((enrollment, idx) => (
                      <tr key={idx} style={{ ...styles.tableRow, backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                        <td style={styles.tableCell}>{enrollment.learnerName}</td>
                        <td style={styles.tableCell}>{enrollment.learnerEmail}</td>
                        <td style={styles.tableCell}>{enrollment.courseTitle}</td>
                        <td style={styles.tableCell}>
                          {new Date(enrollment.dueDate).toLocaleDateString()}
                        </td>
                        <td style={styles.tableCell}>{enrollment.progressPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2026 Conform-Edge Quality Consulting | Admin Dashboard</p>
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
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: '1.75rem',
    color: 'var(--t1)',
    margin: 0,
  },

  headerActions: {
    display: 'flex',
    gap: '1rem',
  },

  actionLink: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--signal)',
    color: 'white',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.95rem',
  },

  exportButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.95rem',
  } as React.CSSProperties,

  backButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    color: 'var(--signal)',
    border: '1px solid var(--signal)',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '0.95rem',
  },

  main: {
    flex: 1,
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
    padding: '2rem 1rem',
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },

  summaryCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.5rem',
    textAlign: 'center' as const,
  },

  cardValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'var(--signal)',
    margin: '0 0 0.5rem 0',
  },

  cardLabel: {
    fontSize: '0.9rem',
    color: 'var(--t2)',
  },

  tabsContainer: {
    marginBottom: '2rem',
  },

  tabs: {
    display: 'flex',
    gap: '0',
    borderBottom: '1px solid var(--border)',
  },

  tab: {
    padding: '1rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--t2)',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'color 0.2s ease',
  } as React.CSSProperties,

  tableCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.5rem',
  },

  tableHeader2: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },

  tableTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'var(--t1)',
    margin: 0,
  },

  remindButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.9rem',
  } as React.CSSProperties,

  tableWrapper: {
    overflowX: 'auto' as const,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },

  tableHeaderRow: {
    backgroundColor: 'var(--void)',
  },

  tableHeader: {
    padding: '0.75rem',
    textAlign: 'left' as const,
    fontWeight: 'bold',
    color: 'var(--t1)',
    fontSize: '0.9rem',
    borderBottom: '1px solid var(--border)',
  },

  tableRow: {
    borderBottom: '1px solid var(--border)',
  } as React.CSSProperties,

  tableCell: {
    padding: '0.75rem',
    color: 'var(--t1)',
    fontSize: '0.9rem',
  },

  progressSmall: {
    width: '80px',
    height: '6px',
    backgroundColor: 'var(--border)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '0.25rem',
  },

  progressBarSmall: {
    height: '100%',
    backgroundColor: 'var(--signal)',
    transition: 'width 0.3s ease',
  },

  noData: {
    color: 'var(--t2)',
    textAlign: 'center' as const,
    padding: '2rem',
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
