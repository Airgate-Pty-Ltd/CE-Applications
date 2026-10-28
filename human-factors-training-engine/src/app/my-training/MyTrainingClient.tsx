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

interface AtomView {
  id: string;
  title: string;
  objective: string;
  format: string;
  duration: number | null;
  content: string | null;
  completed: boolean;
}
interface AssignmentView {
  assignmentId: string;
  interventionTitle: string;
  status: string;
  dueDate: string | null;
  atoms: AtomView[];
  readyForAssessment: boolean;
  assessmentConfigurationMissing: boolean;
  assessment: {
    id: string;
    passingScore: number;
    maxAttempts: number;
    attemptsUsed: number;
    questions: Array<{
      questionId: string;
      questionText: string;
      questionType: string;
      options: string[];
      points: number;
    }>;
  } | null;
  certificate: {
    certificateCode: string;
    issuedAt: string;
    revokedAt: string | null;
  } | null;
}
interface DripDueItem {
  assignmentId: string;
  atomId: string;
  atomTitle: string;
  cadence: string;
}

export default function MyTrainingClient() {
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [dripDue, setDripDue] = useState<DripDueItem[]>([]);
  const [openAtom, setOpenAtom] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [assessmentResponses, setAssessmentResponses] = useState<Record<string, Record<string, string>>>({});

  const load = async () => {
    const res = await fetch('/api/my-training', { credentials: 'include' });
    if (res.ok) setAssignments((await res.json()).assignments);
    const dripRes = await fetch('/api/my-training/drip-due', { credentials: 'include' });
    if (dripRes.ok) setDripDue((await dripRes.json()).due);
  };

  useEffect(() => {
    load();
  }, []);

  const deliverDrip = async (assignmentId: string, atomId: string) => {
    const res = await fetch('/api/my-training/drip-deliver', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, atomId }),
    });
    if (res.ok) {
      setMessage('Shift-brief refresher delivered and logged.');
      load();
    }
  };

  const completeAtom = async (assignmentId: string, atomId: string) => {
    const res = await fetch('/api/my-training/complete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, atomId }),
    });
    if (res.ok) {
      setOpenAtom(null);
      load();
    }
  };

  const submitAssessment = async (assignment: AssignmentView) => {
    if (!assignment.assessment) return;
    const answers = assessmentResponses[assignment.assignmentId] || {};
    if (assignment.assessment.questions.some((question) => !answers[question.questionId])) {
      setMessage('Answer every assessment question before submitting.');
      return;
    }
    const res = await fetch('/api/my-training/submit-assessment', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId: assignment.assignmentId,
        responses: assignment.assessment.questions.map((question) => ({
          questionId: question.questionId,
          answer: answers[question.questionId],
        })),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.passed
        ? `Assessment passed at ${data.score}%. Controlled certificate ${data.certificateCode} issued.`
        : `Assessment score ${data.score}% did not meet the threshold. ${data.attemptsRemaining} attempt(s) remain.`);
      setAssessmentResponses({ ...assessmentResponses, [assignment.assignmentId]: {} });
      load();
    } else {
      setMessage(data.error || 'Assessment submission failed.');
    }
  };

  return (
    <div>
      <h1>My Training</h1>
      {message && (
        <div role="status" className="card" style={{ borderColor: '#10b981', color: '#10b981' }}>
          {message}
        </div>
      )}

      {dripDue.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--signal)' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Due for Refresh (Shift Brief)</h2>
          {dripDue.map((d) => (
            <div key={`${d.assignmentId}-${d.atomId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <span>{d.atomTitle} <span style={{ fontSize: '0.75rem', color: 'var(--t2)' }}>({d.cadence})</span></span>
              <button onClick={() => deliverDrip(d.assignmentId, d.atomId)} style={{ fontSize: '0.8rem' }}>Mark Delivered</button>
            </div>
          ))}
        </div>
      )}

      {assignments.length === 0 ? (
        <p style={{ color: 'var(--t2)' }}>No training assigned yet.</p>
      ) : (
        assignments.map((a) => (
          <div key={a.assignmentId} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>{a.interventionTitle}</h2>
              <span className={`badge ${a.status === 'PASSED' ? 'success' : 'warning'}`}>{a.status}</span>
            </div>
            {a.dueDate && <p style={{ fontSize: '0.85rem', color: 'var(--t2)' }}>Due {new Date(a.dueDate).toLocaleDateString()}</p>}
            {a.certificate && (
              <p style={{ fontSize: '0.85rem', color: a.certificate.revokedAt ? '#ef4444' : '#10b981' }}>
                Certificate {a.certificate.certificateCode} · issued {new Date(a.certificate.issuedAt).toLocaleDateString()}{a.certificate.revokedAt ? ' · REVOKED' : ''}
              </p>
            )}

            <ol style={{ marginLeft: '1.25rem' }}>
              {a.atoms.map((atom) => (
                <li key={atom.id} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      {atom.title} <span style={{ fontSize: '0.75rem', color: 'var(--t2)' }}>({atom.format}, {atom.duration} min)</span>
                    </span>
                    {atom.completed ? (
                      <span style={{ color: '#10b981', fontSize: '0.85rem' }}>✓ Complete</span>
                    ) : (
                      <button onClick={() => setOpenAtom(openAtom === atom.id ? null : atom.id)} style={{ fontSize: '0.8rem' }}>
                        {openAtom === atom.id ? 'Close' : 'Open'}
                      </button>
                    )}
                  </div>
                  {openAtom === atom.id && !atom.completed && (
                    <div style={{ marginTop: '0.5rem', background: 'var(--void)', padding: '0.75rem', borderRadius: '4px' }}>
                      <p style={{ fontSize: '0.85rem' }}>Objective: {atom.objective}</p>
                      <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{atom.content || '(no content authored)'}</p>
                      <button onClick={() => completeAtom(a.assignmentId, atom.id)} style={{ marginTop: '0.5rem' }}>
                        Mark Complete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>

            {a.readyForAssessment && a.status !== 'PASSED' && (
              <div style={{ marginTop: '1rem', background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '4px' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  All atoms complete — assessment requires {a.assessment?.passingScore}% to pass. Attempt {(a.assessment?.attemptsUsed || 0) + 1} of {a.assessment?.maxAttempts}.
                </p>
                {a.assessment?.questions.map((question, questionIndex) => (
                  <fieldset key={question.questionId} style={{ border: '1px solid var(--border)', marginBottom: '0.75rem', padding: '0.75rem' }}>
                    <legend>{questionIndex + 1}. {question.questionText}</legend>
                    {question.options.map((option) => (
                      <label key={option} style={{ display: 'block', marginTop: '0.35rem' }}>
                        <input
                          type="radio"
                          name={`${a.assignmentId}-${question.questionId}`}
                          value={option}
                          checked={assessmentResponses[a.assignmentId]?.[question.questionId] === option}
                          onChange={() => setAssessmentResponses({
                            ...assessmentResponses,
                            [a.assignmentId]: {
                              ...(assessmentResponses[a.assignmentId] || {}),
                              [question.questionId]: option,
                            },
                          })}
                        />{' '}{option}
                      </label>
                    ))}
                  </fieldset>
                ))}
                <button
                  onClick={() => submitAssessment(a)}
                  disabled={!a.assessment || a.assessment.attemptsUsed >= a.assessment.maxAttempts}
                >
                  Submit Assessment
                </button>
              </div>
            )}
            {a.assessmentConfigurationMissing && (
              <div className="card" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                This legacy assignment has no frozen assessment and cannot be passed. Ask training administration to recompile and reassign it.
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
