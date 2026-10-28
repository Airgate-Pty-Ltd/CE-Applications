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

interface Enrollment {
  id: string;
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  status: string;
  progressPercent: number;
  dueDate?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Course {
  id: string;
  title: string;
}

export default function EnrollmentsPage() {
  const router = useRouter();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [selectedLearner, setSelectedLearner] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkResults, setBulkResults] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [enrollRes, usersRes, coursesRes] = await Promise.all([
          fetch('/api/admin/enrollments', { credentials: 'include' }),
          fetch('/api/users', { credentials: 'include' }),
          fetch('/api/courses', { credentials: 'include' }),
        ]);

        if (!enrollRes.ok || usersRes.status === 404 || coursesRes.status === 404) {
          if (enrollRes.status === 401 || usersRes.status === 401 || coursesRes.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch data');
        }

        const enrollData = await enrollRes.json();
        setEnrollments(enrollData.enrollments || []);

        // For now, use placeholder data for users and courses
        // In production, you'd fetch from actual endpoints
        setCourses([
          { id: 'c1', title: 'AQ-083' },
          { id: 'c2', title: 'AQ-086' },
          { id: 'c3', title: 'AQ-160' },
          { id: 'c4', title: 'AQ-050' },
          { id: 'c5', title: 'AQ-166' },
        ]);
      } catch (err) {
        setError('Failed to load enrollment data');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleAddEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLearner || !selectedCourse) {
      alert('Please select a learner and course');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/enrollments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId: selectedLearner,
          courseId: selectedCourse,
          dueDate: dueDate || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create enrollment');

      const data = await response.json();
      setEnrollments([...enrollments, data.enrollment]);
      setSelectedLearner('');
      setSelectedCourse('');
      setDueDate('');
      alert('Enrollment created successfully');
    } catch (err) {
      alert('Failed to create enrollment');
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvData.trim()) {
      alert('Please enter CSV data');
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const response = await fetch('/api/admin/enrollments/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData }),
      });

      if (!response.ok) throw new Error('Failed to process bulk upload');

      const data = await response.json();
      setBulkResults(data);
      setCsvData('');
    } catch (err) {
      alert('Failed to process bulk upload');
      console.error('Error:', err);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading enrollments...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Manage Enrollments</h1>
          <div style={styles.headerActions}>
            <button
              onClick={() => window.location.href = '/api/admin/enrollments/export'}
              style={styles.exportButton}
            >
              📥 Export Enrollments
            </button>
            <Link href="/admin/dashboard" style={styles.backButton}>
              Back to Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        {/* Single Enrollment Form */}
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Add Single Enrollment</h2>
          <form onSubmit={handleAddEnrollment} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Learner Email</label>
              <input
                type="email"
                placeholder="learner@example.com"
                value={selectedLearner}
                onChange={(e) => setSelectedLearner(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={styles.input}
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={styles.submitButton}
            >
              {isSubmitting ? 'Adding...' : '+ Add Enrollment'}
            </button>
          </form>
        </div>

        {/* Bulk Upload Form */}
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Bulk CSV Upload</h2>
          <p style={styles.csvHelp}>
            CSV format: email,courseTitle,dueDate (optional)
          </p>
          <form onSubmit={handleBulkUpload} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>CSV Data</label>
              <textarea
                placeholder={`email,courseTitle,dueDate\nlearner1@example.com,AQ-083,2026-08-31\nlearner2@example.com,AQ-086,2026-08-31`}
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                style={styles.textarea}
              />
            </div>

            <button
              type="submit"
              disabled={isBulkSubmitting}
              style={styles.submitButton}
            >
              {isBulkSubmitting ? 'Processing...' : '📤 Upload CSV'}
            </button>
          </form>

          {bulkResults && (
            <div style={styles.resultsBox}>
              <p style={styles.resultsTitle}>
                ✓ {bulkResults.enrollmentsCreated} enrollments created
              </p>
              {bulkResults.errors.length > 0 && (
                <div>
                  <p style={styles.errorsTitle}>Errors ({bulkResults.errors.length}):</p>
                  <ul style={styles.errorsList}>
                    {bulkResults.errors.map((err: any, idx: number) => (
                      <li key={idx}>
                        Row {err.row}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enrollments List */}
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Current Enrollments ({enrollments.length})</h2>
          {enrollments.length === 0 ? (
            <p style={styles.noData}>No enrollments yet</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Learner</th>
                    <th style={styles.tableHeader}>Email</th>
                    <th style={styles.tableHeader}>Course</th>
                    <th style={styles.tableHeader}>Status</th>
                    <th style={styles.tableHeader}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{enrollment.learnerName}</td>
                      <td style={styles.tableCell}>{enrollment.learnerEmail}</td>
                      <td style={styles.tableCell}>{enrollment.courseTitle}</td>
                      <td style={styles.tableCell}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor:
                              enrollment.status === 'completed'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : 'rgba(14, 165, 233, 0.2)',
                            color:
                              enrollment.status === 'completed' ? '#10b981' : 'var(--signal)',
                          }}
                        >
                          {enrollment.status}
                        </span>
                      </td>
                      <td style={styles.tableCell}>{enrollment.progressPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2026 Conform-Edge Quality Consulting | Admin Enrollments</p>
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
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
    padding: '2rem 1rem',
  },

  formCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },

  formTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'var(--t1)',
    margin: '0 0 1rem 0',
  },

  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
  },

  label: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'var(--t1)',
    marginBottom: '0.5rem',
  },

  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    backgroundColor: 'var(--void)',
    color: 'var(--t1)',
    fontFamily: 'inherit',
  } as React.CSSProperties,

  textarea: {
    padding: '0.75rem',
    fontSize: '0.9rem',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    backgroundColor: 'var(--void)',
    color: 'var(--t1)',
    fontFamily: 'monospace',
    minHeight: '120px',
    resize: 'vertical' as const,
  } as React.CSSProperties,

  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--signal)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '1rem',
  } as React.CSSProperties,

  csvHelp: {
    fontSize: '0.85rem',
    color: 'var(--t2)',
    marginBottom: '1rem',
  },

  resultsBox: {
    backgroundColor: 'var(--void)',
    padding: '1rem',
    borderRadius: '4px',
    marginTop: '1rem',
  },

  resultsTitle: {
    color: '#10b981',
    fontWeight: 'bold',
    margin: '0 0 0.5rem 0',
  },

  errorsTitle: {
    color: '#ef4444',
    fontWeight: 'bold',
    margin: '0.5rem 0',
  },

  errorsList: {
    color: 'var(--t1)',
    margin: '0.5rem 0 0 1rem',
  },

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

  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '500',
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
    padding: '1rem',
    marginBottom: '2rem',
  },

  errorText: {
    color: '#ef4444',
    fontSize: '0.95rem',
    margin: 0,
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
