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

interface Atom {
  id: string;
  title: string;
  objective: string;
  format: string;
  status: string;
  classification: string;
  content: string | null;
  assessmentQuestionCount: number;
}
interface Evidence {
  id: string;
  title: string;
  classification: string;
  source: string;
  description: string | null;
}
interface InterventionGroup {
  interventionId: string;
  interventionTitle: string;
  eventId: string;
  status: string;
  sourceEvidence: Evidence[];
  atoms: Atom[];
}
interface Learner {
  id: string;
  name: string;
  email: string;
}

export default function ContentAuthoringClient() {
  const [groups, setGroups] = useState<InterventionGroup[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  const [atomForm, setAtomForm] = useState<Record<string, {
    title: string;
    objective: string;
    format: string;
    content: string;
    assessmentQuestion?: string;
    correctAnswer?: string;
    distractors?: string;
    assessmentExplanation?: string;
  }>>({});
  const [aiDraft, setAiDraft] = useState<Record<string, { aiDraft?: string; sourceSpans: string[]; canUseAi: boolean; reason?: string }>>({});
  const [assignLearner, setAssignLearner] = useState<Record<string, string>>({});

  const load = async () => {
    const [groupsRes, learnersRes] = await Promise.all([
      fetch('/api/atoms', { credentials: 'include' }),
      fetch('/api/users?role=learner', { credentials: 'include' }),
    ]);
    if (groupsRes.ok) setGroups((await groupsRes.json()).interventions);
    if (learnersRes.ok) setLearners((await learnersRes.json()).users);
  };

  useEffect(() => {
    load();
  }, []);

  const showMessage = (text: string, kind: 'success' | 'error') => {
    setMessage({ text, kind });
    setTimeout(() => setMessage(null), 6000);
  };

  const getAiDraft = async (interventionId: string, evidenceId: string) => {
    const f = atomForm[interventionId] || { title: '', objective: '', format: 'micro_lesson', content: '' };
    const res = await fetch('/api/atoms/propose', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidenceId, theme: 'fatigue', objective: f.objective || 'Address the linked incident' }),
    });
    const data = await res.json();
    if (res.ok) setAiDraft({ ...aiDraft, [interventionId]: data });
  };

  const applyDraft = (interventionId: string) => {
    const draft = aiDraft[interventionId];
    if (!draft?.aiDraft) return;
    setAtomForm({
      ...atomForm,
      [interventionId]: { ...(atomForm[interventionId] || { title: '', objective: '', format: 'micro_lesson' }), content: draft.aiDraft },
    });
  };

  const createAtom = async (interventionId: string, evidenceIds: string[]) => {
    const f = atomForm[interventionId];
    if (!f?.title || !f?.objective || !f.assessmentQuestion || !f.correctAnswer || !f.distractors) {
      showMessage('Title, objective, assessment question, correct answer, and distractors are required', 'error');
      return;
    }
    const res = await fetch('/api/atoms', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interventionId,
        title: f.title,
        objective: f.objective,
        format: f.format,
        content: f.content,
        sourceEvidenceIds: evidenceIds,
        assessmentQuestion: f.assessmentQuestion,
        correctAnswer: f.correctAnswer,
        distractors: f.distractors.split(',').map((value) => value.trim()).filter(Boolean),
        assessmentExplanation: f.assessmentExplanation,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(`Atom created (classification inherited: ${data.classification})`, 'success');
      setAtomForm({ ...atomForm, [interventionId]: { title: '', objective: '', format: 'micro_lesson', content: '', assessmentQuestion: '', correctAnswer: '', distractors: '', assessmentExplanation: '' } });
      setAiDraft({ ...aiDraft, [interventionId]: { sourceSpans: [], canUseAi: false } });
      load();
    } else {
      showMessage(data.error || 'Atom creation failed', 'error');
    }
  };

  const approveAtom = async (atomId: string) => {
    const res = await fetch(`/api/atoms/${atomId}/approve`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      showMessage('Atom approved — ready to compile', 'success');
      load();
    } else {
      showMessage((await res.json()).error || 'Approval failed', 'error');
    }
  };

  const compileAndAssign = async (interventionId: string) => {
    const learnerId = assignLearner[interventionId];
    if (!learnerId) {
      showMessage('Select a learner first', 'error');
      return;
    }
    const res = await fetch('/api/atoms/compile-and-assign', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interventionId, learnerId }),
    });
    const data = await res.json();
    if (res.ok && data.queued) {
      showMessage(data.reason || 'Assignment queued for Training Burden Budget disposition — see Burden Budget.', 'error');
    } else if (res.ok) {
      showMessage(`Compiled and assigned — manifest hash ${data.outputHash.slice(0, 16)}...`, 'success');
      load();
    } else {
      showMessage(data.error || 'Compile/assign failed', 'error');
    }
  };

  return (
    <div>
      <h1>Content Authoring &amp; Approval</h1>
      <p style={{ color: 'var(--t2)' }}>AI-assisted drafts render beside the real source text for review — never auto-approved.</p>

      {message && (
        <div role="status" className="card" style={{ borderColor: message.kind === 'success' ? '#10b981' : '#ef4444', color: message.kind === 'success' ? '#10b981' : '#ef4444' }}>
          {message.text}
        </div>
      )}

      {groups.length === 0 ? (
        <p style={{ color: 'var(--t2)' }}>No interventions ready for content authoring yet — complete an appropriateness review on the Intake screen first.</p>
      ) : (
        groups.map((g) => (
          <div key={g.interventionId} className="card">
            <h2>{g.interventionTitle} <span className="badge" style={{ backgroundColor: 'rgba(14,165,233,0.15)', color: 'var(--signal)' }}>{g.status}</span></h2>

            <h3 style={{ fontSize: '1rem' }}>Approved Content</h3>
            {g.atoms.length === 0 ? (
              <p style={{ color: 'var(--t2)', fontSize: '0.9rem' }}>No atoms yet.</p>
            ) : (
              g.atoms.map((a) => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span>
                    {a.title} <span style={{ fontSize: '0.75rem', color: 'var(--t2)' }}>({a.classification}; {a.assessmentQuestionCount} assessment question{a.assessmentQuestionCount === 1 ? '' : 's'})</span>
                  </span>
                  {a.status === 'DRAFT' ? (
                    <button onClick={() => approveAtom(a.id)} style={{ fontSize: '0.8rem' }}>Approve</button>
                  ) : (
                    <span className="badge success">{a.status}</span>
                  )}
                </div>
              ))
            )}

            <div style={{ marginTop: '1rem', background: 'var(--void)', padding: '0.75rem', borderRadius: '4px' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Author New Atom</p>
              <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr' }}>
                <input
                  placeholder="Title"
                  value={atomForm[g.interventionId]?.title || ''}
                  onChange={(e) => setAtomForm({ ...atomForm, [g.interventionId]: { ...(atomForm[g.interventionId] || { objective: '', format: 'micro_lesson', content: '' }), title: e.target.value } })}
                />
                <input
                  placeholder="Objective"
                  value={atomForm[g.interventionId]?.objective || ''}
                  onChange={(e) => setAtomForm({ ...atomForm, [g.interventionId]: { ...(atomForm[g.interventionId] || { title: '', format: 'micro_lesson', content: '' }), objective: e.target.value } })}
                />
                <select
                  value={atomForm[g.interventionId]?.format || 'micro_lesson'}
                  onChange={(e) => setAtomForm({ ...atomForm, [g.interventionId]: { ...(atomForm[g.interventionId] || { title: '', objective: '', content: '' }), format: e.target.value } })}
                >
                  {['micro_lesson', 'case_study', 'card', 'question_cluster'].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                {g.sourceEvidence[0] && (
                  <button type="button" onClick={() => getAiDraft(g.interventionId, g.sourceEvidence[0].id)}>
                    Get AI Draft (from source)
                  </button>
                )}
              </div>

              {aiDraft[g.interventionId] && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--t2)' }}>SOURCE (real evidence text)</p>
                    <div style={{ background: 'var(--surface)', padding: '0.5rem', fontSize: '0.8rem', border: '1px solid var(--border)' }}>
                      {aiDraft[g.interventionId].sourceSpans.join(' ') || '(no spans extracted)'}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--t2)' }}>AI DRAFT {aiDraft[g.interventionId].canUseAi ? '' : '(unavailable — no-AI fallback)'}</p>
                    <div style={{ background: 'var(--surface)', padding: '0.5rem', fontSize: '0.8rem', border: '1px solid var(--border)' }}>
                      {aiDraft[g.interventionId].aiDraft || aiDraft[g.interventionId].reason}
                    </div>
                    {aiDraft[g.interventionId].aiDraft && (
                      <button type="button" onClick={() => applyDraft(g.interventionId)} style={{ marginTop: '0.4rem', fontSize: '0.75rem' }}>
                        Use this draft →
                      </button>
                    )}
                  </div>
                </div>
              )}

              <textarea
                placeholder="Content (manual authoring, or edited AI draft)"
                value={atomForm[g.interventionId]?.content || ''}
                onChange={(e) => setAtomForm({ ...atomForm, [g.interventionId]: { ...(atomForm[g.interventionId] || { title: '', objective: '', format: 'micro_lesson' }), content: e.target.value } })}
                rows={2}
                style={{ width: '100%', marginTop: '0.5rem' }}
              />
              <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '1fr 1fr', marginTop: '0.5rem' }}>
                <input
                  required
                  placeholder="Assessment question"
                  value={atomForm[g.interventionId]?.assessmentQuestion || ''}
                  onChange={(e) => setAtomForm({ ...atomForm, [g.interventionId]: { ...(atomForm[g.interventionId] || { title: '', objective: '', format: 'micro_lesson', content: '' }), assessmentQuestion: e.target.value } })}
                />
                <input
                  required
                  placeholder="Correct answer"
                  value={atomForm[g.interventionId]?.correctAnswer || ''}
                  onChange={(e) => setAtomForm({ ...atomForm, [g.interventionId]: { ...(atomForm[g.interventionId] || { title: '', objective: '', format: 'micro_lesson', content: '' }), correctAnswer: e.target.value } })}
                />
                <input
                  required
                  placeholder="Incorrect answers (comma-separated)"
                  value={atomForm[g.interventionId]?.distractors || ''}
                  onChange={(e) => setAtomForm({ ...atomForm, [g.interventionId]: { ...(atomForm[g.interventionId] || { title: '', objective: '', format: 'micro_lesson', content: '' }), distractors: e.target.value } })}
                />
                <input
                  placeholder="Answer explanation (shown after submission)"
                  value={atomForm[g.interventionId]?.assessmentExplanation || ''}
                  onChange={(e) => setAtomForm({ ...atomForm, [g.interventionId]: { ...(atomForm[g.interventionId] || { title: '', objective: '', format: 'micro_lesson', content: '' }), assessmentExplanation: e.target.value } })}
                />
              </div>
              <button onClick={() => createAtom(g.interventionId, g.sourceEvidence.map((e) => e.id))} style={{ marginTop: '0.5rem' }}>
                Create Atom (DRAFT)
              </button>
            </div>

            {g.atoms.length > 0 && g.atoms.every((a) => a.status === 'APPROVED') && (
              <div style={{ marginTop: '1rem' }}>
                <select value={assignLearner[g.interventionId] || ''} onChange={(e) => setAssignLearner({ ...assignLearner, [g.interventionId]: e.target.value })}>
                  <option value="">Select learner…</option>
                  {learners.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <button onClick={() => compileAndAssign(g.interventionId)} style={{ marginLeft: '0.5rem' }}>
                  Compile &amp; Assign
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
