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
import Link from 'next/link';

interface LessonSummary {
  id: string;
  title: string;
  summary: string;
  lessonType: string;
  status: string;
  sourceClassification: string;
  themes: string;
  createdAt: string;
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
  PUBLISHED: '#10b981',
  ARCHIVED: '#6b7280',
  SUPERSEDED: '#9ca3af',
};

const BLANK_FORM = {
  title: '',
  summary: '',
  narrative: '',
  lessonType: 'NEGATIVE',
  sourceClassification: 'INTERNAL_UNVALIDATED',
  externalSourceRef: '',
  themes: '',
};

export default function LessonsLearnedClient() {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  async function load() {
    setLoading(true);
    const qs = filterStatus ? `?status=${filterStatus}` : '';
    const res = await fetch(`/api/lessons-learned${qs}`);
    const data = await res.json();
    setLessons(data.lessons ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const themes = form.themes.split(',').map((t) => t.trim()).filter(Boolean);
      const res = await fetch('/api/lessons-learned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, themes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setShowCreate(false);
      setForm(BLANK_FORM);
      load();
    } finally {
      setSaving(false);
    }
  }

  const grouped = Object.entries(
    lessons.reduce<Record<string, LessonSummary[]>>((acc, l) => {
      (acc[l.status] ??= []).push(l);
      return acc;
    }, {})
  ).sort(([a], [b]) => {
    const order = ['DRAFT','SUBMITTED','UNDER_REVIEW','EVIDENCE_NEEDED','APPROVED_LEARNING_INTERVENTION_REQUIRED','APPROVED_NO_TRAINING_REQUIRED','REJECTED','PUBLISHED','ARCHIVED','SUPERSEDED'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--t1)' }}>Lessons Learned</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--t2)', fontSize: 14 }}>
            Author, review, and approve human-factors lessons for the intelligence pipeline.
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--t1)', fontSize: 13 }}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(true)}
            style={{ padding: '7px 16px', background: 'var(--signal)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
          >
            + New Lesson
          </button>
        </div>
      </div>

      {loading && <p style={{ color: 'var(--t2)' }}>Loading…</p>}

      {!loading && lessons.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', border: '1px dashed var(--border)', borderRadius: 8 }}>
          No lessons found. Create the first one.
        </div>
      )}

      {!loading && grouped.map(([status, items]) => (
        <div key={status} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] ?? '#6b7280' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {STATUS_LABELS[status] ?? status} ({items.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((l) => (
              <Link key={l.id} href={`/lessons-learned/${l.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '14px 18px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: l.lessonType === 'NEGATIVE' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                      color: l.lessonType === 'NEGATIVE' ? '#ef4444' : '#22c55e',
                      flexShrink: 0,
                      marginTop: 2,
                    }}>
                      {l.lessonType}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--t1)', fontSize: 15 }}>{l.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 3, lineClamp: 2 }}>{l.summary}</div>
                      {l.themes && l.themes !== '[]' && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(JSON.parse(l.themes) as string[]).map((t) => (
                            <span key={t} style={{ padding: '1px 7px', borderRadius: 4, fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--t2)' }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--t3)', flexShrink: 0 }}>
                      {new Date(l.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--t1)' }}>New Lesson Learned</h2>
            <form onSubmit={handleCreate}>
              <Field label="Title *">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Concise lesson title" />
              </Field>
              <Field label="Summary *">
                <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} required rows={3} placeholder="What happened and what was learned?" />
              </Field>
              <Field label="Narrative">
                <textarea value={form.narrative} onChange={(e) => setForm({ ...form, narrative: e.target.value })} rows={4} placeholder="Detailed account (optional)" />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Lesson Type">
                  <select value={form.lessonType} onChange={(e) => setForm({ ...form, lessonType: e.target.value })}>
                    <option value="NEGATIVE">Negative (something went wrong)</option>
                    <option value="POSITIVE">Positive (best practice)</option>
                  </select>
                </Field>
                <Field label="Source Classification">
                  <select value={form.sourceClassification} onChange={(e) => setForm({ ...form, sourceClassification: e.target.value })}>
                    <option value="INTERNAL_UNVALIDATED">Internal – Unvalidated</option>
                    <option value="VALIDATED_INTERNAL_LESSON">Internal – Validated</option>
                    <option value="APPROVED_HUMAN_FACTORS_LESSON">Approved HF Lesson</option>
                    <option value="CONFIRMED_INDUSTRY_FINDING">Confirmed Industry Finding</option>
                  </select>
                </Field>
              </div>
              <Field label="External Source Reference">
                <input value={form.externalSourceRef} onChange={(e) => setForm({ ...form, externalSourceRef: e.target.value })} placeholder="URL or citation (required for industry findings)" />
              </Field>
              <Field label="Themes (comma-separated)">
                <input value={form.themes} onChange={(e) => setForm({ ...form, themes: e.target.value })} placeholder="e.g. fatigue, shift_handover, procedural_compliance" />
              </Field>
              {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '8px 0' }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={() => { setShowCreate(false); setForm(BLANK_FORM); setError(''); }}
                  style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t1)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '8px 18px', borderRadius: 6, background: 'var(--signal)', color: '#fff', border: 'none', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving…' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 5 }}>{label}</label>
      <style>{`
        .ll-form input, .ll-form textarea, .ll-form select {
          width: 100%; box-sizing: border-box; padding: 8px 10px;
          border: 1px solid var(--border); border-radius: 6px;
          background: var(--bg); color: var(--t1); font-size: 14px;
          font-family: inherit; resize: vertical;
        }
      `}</style>
      <div className="ll-form">{children}</div>
    </div>
  );
}
