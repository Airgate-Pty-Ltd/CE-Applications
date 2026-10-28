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

interface Certificate {
  id: string;
  learnerName: string;
  courseTitle: string;
  score: number;
  passingScore: number;
  certificateCode: string;
  issuedAt: string;
  publicUrl?: string;
}

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const certificateId = params.id as string;

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const response = await fetch(`/api/certificates/info/${certificateId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch certificate');
        }

        const data = await response.json();
        setCertificate(data.certificate);
      } catch (err) {
        setError('Failed to load certificate');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [certificateId, router]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/certificates/${certificateId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download certificate');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = 'certificate.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) fileName = match[1];
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download certificate');
      console.error('Error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (certificate?.publicUrl) {
      navigator.clipboard.writeText(certificate.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading certificate...</div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error || 'Certificate not found'}</p>
          <Link href="/dashboard" style={styles.backLink}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Your Certificate</h1>
          <p style={styles.subtitle}>{certificate.courseTitle}</p>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Certificate Preview Card */}
        <div style={styles.certificateCard}>
          <div style={styles.certificateContent}>
            <div style={styles.organizationName}>CONFORM-EDGE QUALITY CONSULTING</div>
            <h2 style={styles.certificateTitle}>CERTIFICATE OF COMPLETION</h2>

            <div style={styles.certificateBody}>
              <p>This is to certify that</p>
              <h3 style={styles.learnerName}>{certificate.learnerName.toUpperCase()}</h3>
              <p style={styles.achievementText}>
                has successfully completed the course <strong>{certificate.courseTitle}</strong> with
                a score of <strong>{certificate.score}%</strong>, exceeding the required passing score
                of <strong>{certificate.passingScore}%</strong>.
              </p>
            </div>

            <div style={styles.certificateFooter}>
              <div>
                <p style={styles.issueLabel}>ISSUED BY</p>
                <p style={styles.issuerName}>Conform-Edge Quality Consulting</p>
                <p style={styles.issuerRole}>Authorized Signatory</p>
              </div>
              <div style={styles.issueDateSection}>
                <p style={styles.issueLabel}>Issued: {issuedDate}</p>
              </div>
            </div>

            <p style={styles.certificateCode}>Certificate ID: {certificate.certificateCode}</p>
          </div>
        </div>

        {/* Certificate Details */}
        <div style={styles.detailsCard}>
          <h3 style={styles.detailsTitle}>Certificate Details</h3>

          <div style={styles.detailsList}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Learner:</span>
              <span style={styles.detailValue}>{certificate.learnerName}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Course:</span>
              <span style={styles.detailValue}>{certificate.courseTitle}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Score:</span>
              <span style={styles.detailValue}>{certificate.score}%</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Passing Score:</span>
              <span style={styles.detailValue}>{certificate.passingScore}%</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Issued:</span>
              <span style={styles.detailValue}>{issuedDate}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Certificate ID:</span>
              <span style={styles.detailValue}>{certificate.certificateCode}</span>
            </div>
          </div>
        </div>

        {/* Download & Share Section */}
        <div style={styles.actionsCard}>
          <h3 style={styles.actionsTitle}>Actions</h3>

          <div style={styles.actionButtons}>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={styles.downloadButton}
            >
              {downloading ? '⟳ Downloading...' : '⬇ Download PDF'}
            </button>

            {certificate.publicUrl && (
              <>
                <button
                  onClick={handleCopyLink}
                  style={styles.shareButton}
                >
                  {copied ? '✓ Link Copied' : '🔗 Copy Share Link'}
                </button>
                <a
                  href={certificate.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.previewButton}
                >
                  👁 View Public
                </a>
              </>
            )}
          </div>

          {certificate.publicUrl && (
            <div style={styles.linkSection}>
              <p style={styles.linkLabel}>Public Shareable Link:</p>
              <code style={styles.linkCode}>{certificate.publicUrl}</code>
              <p style={styles.linkNote}>
                Share this link to let others verify your certificate of completion.
              </p>
            </div>
          )}
        </div>

        {/* Back to Dashboard */}
        <div style={styles.bottomAction}>
          <Link href="/dashboard" style={styles.dashboardLink}>
            ← Back to Dashboard
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
    maxWidth: '1000px',
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
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
    padding: '2rem 1rem',
  },

  certificateCard: {
    backgroundColor: 'var(--surface)',
    border: '2px solid var(--signal)',
    borderRadius: '8px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.1)',
  },

  certificateContent: {
    textAlign: 'center' as const,
  },

  organizationName: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: 'var(--signal)',
    letterSpacing: '0.05em',
    marginBottom: '1rem',
  },

  certificateTitle: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: 'var(--t1)',
    margin: '0 0 1.5rem 0',
    letterSpacing: '0.1em',
  },

  certificateBody: {
    margin: '2rem 0',
  },

  learnerName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'var(--signal)',
    margin: '1rem 0',
  },

  achievementText: {
    color: 'var(--t1)',
    lineHeight: '1.6',
    fontSize: '0.95rem',
  },

  certificateFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    margin: '2rem 0',
    paddingTop: '2rem',
    borderTop: '1px solid var(--border)',
  },

  issueLabel: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: 'var(--t2)',
    letterSpacing: '0.05em',
    margin: '0 0 0.5rem 0',
  },

  issuerName: {
    fontWeight: 'bold',
    color: 'var(--t1)',
    margin: '0.25rem 0',
  },

  issuerRole: {
    fontSize: '0.85rem',
    color: 'var(--t2)',
    margin: '0.25rem 0 0 0',
  },

  issueDateSection: {
    textAlign: 'right' as const,
  },

  certificateCode: {
    fontSize: '0.75rem',
    color: 'var(--t3)',
    margin: '1rem 0 0 0',
    fontFamily: 'monospace',
  },

  detailsCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },

  detailsTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'var(--t1)',
    margin: '0 0 1rem 0',
  },

  detailsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },

  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem',
    backgroundColor: 'var(--void)',
    borderRadius: '4px',
  },

  detailLabel: {
    color: 'var(--t2)',
    fontWeight: '500',
  },

  detailValue: {
    color: 'var(--t1)',
    fontWeight: 'bold',
  },

  actionsCard: {
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },

  actionsTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'var(--t1)',
    margin: '0 0 1rem 0',
  },

  actionButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
    marginBottom: '1.5rem',
  },

  downloadButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '1rem',
  } as React.CSSProperties,

  shareButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--signal)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '1rem',
  } as React.CSSProperties,

  previewButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    color: 'var(--signal)',
    border: '1px solid var(--signal)',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '1rem',
    cursor: 'pointer',
  },

  linkSection: {
    backgroundColor: 'var(--void)',
    padding: '1rem',
    borderRadius: '4px',
    marginTop: '1rem',
  },

  linkLabel: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: 'var(--t2)',
    margin: '0 0 0.5rem 0',
  },

  linkCode: {
    display: 'block',
    backgroundColor: 'var(--surface)',
    padding: '0.75rem',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '0.85rem',
    color: 'var(--t1)',
    marginBottom: '0.5rem',
    wordBreak: 'break-all' as const,
  },

  linkNote: {
    fontSize: '0.85rem',
    color: 'var(--t3)',
    margin: '0.5rem 0 0 0',
  },

  bottomAction: {
    marginTop: '2rem',
  },

  dashboardLink: {
    color: 'var(--signal)',
    textDecoration: 'none',
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
