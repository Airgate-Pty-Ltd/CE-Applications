/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RevisionProposal {
  id: string;
  status: string;
  title: string;
  createdAt: string;
}

interface Lesson {
  id: string;
  title: string;
  summary: string;
  narrative: string | null;
  lessonType: string;
  status: string;
  sourceClassification: string;
  externalSourceRef: string | null;
  themes: string;
  submittedBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  revisionProposals: RevisionProposal[];
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  EVIDENCE_NEEDED: 'Evidence Needed',
  APPROVED_LEARNING_INTERVENTION_REQUIRED: 'Approved — Training Required',
  APPROVED_NO_TRAINING_REQUIRED: 'Approved — No Training',
  REJECTED: 'Rejected',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
  SUPERSEDED: 'Superseded',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SUBMITTED: '#3b82f6',
  UNDER_REVIEW: '#f59e0b',
  EVIDENCE_NEEDED: '#ef4444',
  APPROVED_LEARNING_INTERVENTION_REQUIRED: '#22c55e',
  APPROVED_NO_TRAINING_REQUIRED: '#a3e635',
  REJECTED: '#dc2626',
};

const SOURCE_LABELS: Record<string, string> = {
  INTERNAL_UNVALIDATED: 'Internal – Unvalidated',
  VALIDATED_INTERNAL_LESSON: 'Internal – Validated',
  APPROVED_HUMAN_FACTORS_LESSON: 'Approved HF Lesson',
  CONFIRMED_INDUSTRY_FINDING: 'Confirmed Industry Finding',
};

interface TransitionDef {
  label: string;
  next: string;
  style: 'primary' | 'warning' | 'danger' | 'secondary';
  confirm?: string;
  requiresReason?: boolean;
}

const TRANSITIONS: Record<string, TransitionDef[]> = {
  DRAFT: [
    { label: 'Submit for Review', next: 'SUBMITTED', style: 'primary' },
  ],
  SUBMITTED: [
    { label: 'Start Review', next: 'UNDER_REVIEW', style: 'primary' },
    { label: 'Return to Draft', next: 'DRAFT', style: 'secondary' },
  ],
  UNDER_REVIEW: [
    { label: 'Approve — Training Required', next: 'APPROVED_LEARNING_INTERVENTION_REQUIRED', style: 'primary' },
    { label: 'Approve — No Training Needed', next: 'APPROVED_NO_TRAINING_REQUIRED', style: 'warning' },
    { label: 'Request Evidence', next: 'EVIDENCE_NEEDED', style: 'secondary' },
    { label: 'Reject', next: 'REJECTED', style: 'danger', requiresReason: true },
  ],
  EVIDENCE_NEEDED: [
    { label: 'Resume Review', next: 'UNDER_REVIEW', style: 'primary' },
    { label: 'Reject', next: 'REJECTED', style: 'danger', requiresReason: true },
  ],
};

const EDITABLE_STATUSES = new Set(['DRAFT', 'EVIDENCE_NEEDED']);

export default function LessonDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Lesson>>({});
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/lessons-learned/${id}`);
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setLesson(data.lesson);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit() {
    if (!lesson) return;
    setForm({
      title: lesson.title,
      summary: lesson.summary,
      narrative: lesson.narrative ?? '',
      lessonType: lesson.lessonType,
      sourceClassification: lesson.sourceClassification,
      externalSourceRef: lesson.externalSourceRef ?? '',
      themes: lesson.themes,
    });
    setEditing(true);
    setError('');
  }

  async function saveEdit() {
    if (!lesson) return;
    setSaving(true);
    setError('');
    try {
      const themes = typeof form.themes === 'string'
        ? form.themes.split(',').map((t) => t.trim()).filter(Boolean)
        : JSON.parse(lesson.themes) as string[];
      const res = await fetch(`/api/lessons-learned/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, themes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed'); return; }
      setLesson(data.lesson);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function transition(next: string, reason?: string) {
    if (!lesson) return;
    setTransitioning(true);
    setError('');
    try {
      const res = await fetch(`/api/lessons-learned/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, ...(reason ? { rejectionReason: reason } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Transition failed'); return; }
      setLesson(data.lesson);
      setShowRejectDialog(false);
      setRejectionReason('');
    } finally {
      setTransitioning(false);
    }
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--t2)' }}>Loading…</div>;
  if (!lesson) return <div style={{ padding: 32, color: 'var(--t2)' }}>Lesson not found.</div>;

  const isEditable = EDITABLE_STATUSES.has(lesson.status) && !editing;
  const transitions = TRANSITIONS[lesson.status] ?? [];
  const themes = JSON.parse(lesson.themes) as string[];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 800 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
        <Link href="/lessons-learned" style={{ color: 'var(--signal)', textDecoration: 'none' }}>Lessons Learned</Link>
        {' / '}
        <span>{lesson.title}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: (STATUS_COLORS[lesson.status] ?? '#6b7280') + '22',
              color: STATUS_COLORS[lesson.status] ?? '#6b7280',
              border: `1px solid ${STATUS_COLORS[lesson.status] ?? '#6b7280'}44`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[lesson.status] ?? '#6b7280', display: 'inline-block' }} />
              {STATUS_LABELS[lesson.status] ?? lesson.status}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: lesson.lessonType === 'NEGATIVE' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
              color: lesson.lessonType === 'NEGATIVE' ? '#ef4444' : '#22c55e',
            }}>
              {lesson.lessonType}
            </span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 0', color: 'var(--t1)' }}>{lesson.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {isEditable && (
            <button onClick={startEdit}
              style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t1)', cursor: 'pointer', fontSize: 13 }}>
              Edit
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 6, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Content — edit or view */}
      {editing ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--t1)' }}>Edit Lesson</h3>
          <EField label="Title">
            <input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </EField>
          <EField label="Summary">
            <textarea value={form.summary ?? ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3} />
          </EField>
          <EField label="Narrative">
            <textarea value={form.narrative ?? ''} onChange={(e) => setForm({ ...form, narrative: e.target.value })} rows={5} />
          </EField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <EField label="Lesson Type">
              <select value={form.lessonType ?? 'NEGATIVE'} onChange={(e) => setForm({ ...form, lessonType: e.target.value })}>
                <option value="NEGATIVE">Negative</option>
                <option value="POSITIVE">Positive</option>
              </select>
            </EField>
            <EField label="Source Classification">
              <select value={form.sourceClassification ?? ''} onChange={(e) => setForm({ ...form, sourceClassification: e.target.value })}>
                <option value="INTERNAL_UNVALIDATED">Internal – Unvalidated</option>
                <option value="VALIDATED_INTERNAL_LESSON">Internal – Validated</option>
                <option value="APPROVED_HUMAN_FACTORS_LESSON">Approved HF Lesson</option>
                <option value="CONFIRMED_INDUSTRY_FINDING">Confirmed Industry Finding</option>
              </select>
            </EField>
          </div>
          <EField label="External Source Reference">
            <input value={form.externalSourceRef ?? ''} onChange={(e) => setForm({ ...form, externalSourceRef: e.target.value })} />
          </EField>
          <EField label="Themes (comma-separated)">
            <input
              value={typeof form.themes === 'string' ? form.themes : (JSON.parse(lesson.themes) as string[]).join(', ')}
              onChange={(e) => setForm({ ...form, themes: e.target.value })}
            />
          </EField>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={() => setEditing(false)} style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t1)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={saveEdit} disabled={saving}
              style={{ padding: '7px 16px', borderRadius: 6, background: 'var(--signal)', color: '#fff', border: 'none', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <Section label="Summary">{lesson.summary}</Section>
          {lesson.narrative && <Section label="Narrative">{lesson.narrative}</Section>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Section label="Source Classification">{SOURCE_LABELS[lesson.sourceClassification] ?? lesson.sourceClassification}</Section>
            {lesson.externalSourceRef && <Section label="External Reference"><a href={lesson.externalSourceRef} target="_blank" rel="noreferrer" style={{ color: 'var(--signal)', wordBreak: 'break-all' }}>{lesson.externalSourceRef}</a></Section>}
          </div>
          {themes.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Themes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {themes.map((t) => <span key={t} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t2)' }}>{t}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit trail */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Audit Trail</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          <AuditRow label="Created" value={new Date(lesson.createdAt).toLocaleString()} />
          {lesson.submittedBy && <AuditRow label="Submitted by" value={`${lesson.submittedBy} — ${new Date(lesson.submittedAt!).toLocaleString()}`} />}
          {lesson.reviewedBy && <AuditRow label="Reviewed by" value={`${lesson.reviewedBy} — ${new Date(lesson.reviewedAt!).toLocaleString()}`} />}
          {lesson.approvedBy && <AuditRow label="Approved by" value={`${lesson.approvedBy} — ${new Date(lesson.approvedAt!).toLocaleString()}`} />}
          {lesson.rejectionReason && <AuditRow label="Rejection reason" value={lesson.rejectionReason} />}
        </div>
      </div>

      {/* Linked proposal */}
      {lesson.revisionProposals.length > 0 && (
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 6 }}>M-AI Revision Proposal</div>
          {lesson.revisionProposals.map((p) => (
            <div key={p.id} style={{ fontSize: 13, color: 'var(--t1)' }}>
              <strong>{p.title}</strong>
              <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--t2)' }}>{p.status}</span>
              <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--t2)' }}>{new Date(p.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          <p style={{ fontSize: 12, color: 'var(--t2)', margin: '6px 0 0' }}>
            Review this proposal in the <Link href="/intelligence" style={{ color: 'var(--signal)' }}>Intelligence Workspace</Link>.
          </p>
        </div>
      )}

      {/* Status transitions */}
      {transitions.length > 0 && !editing && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 12 }}>Actions</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {transitions.map((t) => (
              t.requiresReason ? (
                <button key={t.next}
                  onClick={() => setShowRejectDialog(true)}
                  disabled={transitioning}
                  style={btnStyle(t.style, transitioning)}>
                  {t.label}
                </button>
              ) : (
                <button key={t.next}
                  onClick={() => transition(t.next)}
                  disabled={transitioning}
                  style={btnStyle(t.style, transitioning)}>
                  {transitioning ? '…' : t.label}
                </button>
              )
            ))}
          </div>
        </div>
      )}

      {/* Rejection dialog */}
      {showRejectDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 24, width: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 14px', color: 'var(--t1)' }}>Reject Lesson</h3>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--t2)', marginBottom: 6 }}>Reason</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Provide a reason for rejection…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--t1)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setShowRejectDialog(false)}
                style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t1)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => transition('REJECTED', rejectionReason)} disabled={transitioning}
                style={{ padding: '7px 16px', borderRadius: 6, background: '#dc2626', color: '#fff', border: 'none', fontWeight: 600, cursor: transitioning ? 'not-allowed' : 'pointer' }}>
                {transitioning ? '…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(variant: string, disabled: boolean): React.CSSProperties {
  const base: React.CSSProperties = { padding: '8px 18px', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, border: 'none' };
  if (variant === 'primary') return { ...base, background: 'var(--signal)', color: '#fff' };
  if (variant === 'warning') return { ...base, background: '#f59e0b', color: '#fff' };
  if (variant === 'danger') return { ...base, background: '#dc2626', color: '#fff' };
  return { ...base, background: 'transparent', color: 'var(--t1)', border: '1px solid var(--border)' };
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--t1)', whiteSpace: 'pre-wrap' }}>{children}</div>
    </div>
  );
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: 'var(--t2)', marginRight: 6 }}>{label}:</span>
      <span style={{ color: 'var(--t1)' }}>{value}</span>
    </div>
  );
}

function EField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 5 }}>{label}</label>
      <style>{`
        .ef-form input, .ef-form textarea, .ef-form select {
          width: 100%; box-sizing: border-box; padding: 8px 10px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--bg); color: var(--t1); font-size: 14px;
          font-family: inherit; resize: vertical;
        }
      `}</style>
      <div className="ef-form">{children}</div>
    </div>
  );
}
