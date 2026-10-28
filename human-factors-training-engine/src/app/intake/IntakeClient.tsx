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

interface QueueEvent {
  eventId: string;
  title: string;
  themes: string[];
  causalStatus: string;
  interventionId: string | null;
  interventionTitle: string | null;
  hasAppropriatenessReview: boolean;
}
interface QueueItem {
  evidenceId: string;
  title: string;
  source: string;
  classification: string;
  quarantineStatus: string | null;
  documentHash: string | null;
  occurredAt: string;
  themes: string[];
  events: QueueEvent[];
}
interface IngestionFileSummary {
  id: string;
  originalName: string;
  relativePath: string;
  classification: string;
  recordType: string;
  status: string;
  malwareScanStatus: string;
  evidenceId: string | null;
  createdAt: string;
}
interface IngestionFileDetail extends IngestionFileSummary {
  mediaType: string | null;
  sizeBytes: number;
  contentHash: string;
  extractedText: string;
  extractedTextTruncated: boolean;
  extractedCharacterCount: number;
  failureReason: string | null;
  source: { name: string; mode: string };
}

const NEXT_STATUS: Record<string, string[]> = {
  REPORTED: ['SUSPECTED', 'UNSUPPORTED_ASSERTION'],
  SUSPECTED: ['UNDER_INVESTIGATION', 'UNSUPPORTED_ASSERTION'],
  UNDER_INVESTIGATION: ['VERIFIED', 'ROOT_CAUSE', 'LATENT_CONDITION', 'UNSUPPORTED_ASSERTION', 'DISPUTED_CONCLUSION'],
  VERIFIED: ['ROOT_CAUSE', 'LATENT_CONDITION', 'DISPUTED_CONCLUSION'],
};

export default function IntakeClient() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const [fileClassification, setFileClassification] = useState('INTERNAL');
  const [fileRecordType, setFileRecordType] = useState<'organizational_data' | 'evidence'>('organizational_data');
  const [uploading, setUploading] = useState(false);
  const [ingestionFiles, setIngestionFiles] = useState<IngestionFileSummary[]>([]);
  const [selectedFile, setSelectedFile] = useState<IngestionFileDetail | null>(null);
  const [promotion, setPromotion] = useState({ title: '', themes: '', occurredAt: '' });
  const [promoting, setPromoting] = useState(false);

  const [form, setForm] = useState({ title: '', source: '', content: '', classification: 'INTERNAL', occurredAt: '', themes: '' });
  const [eventForms, setEventForms] = useState<Record<string, { title: string; occurredAt: string; themes: string; rolesExposed: string; sitesExposed: string }>>({});
  const [reviewForms, setReviewForms] = useState<Record<string, { title: string; competenceGap: boolean; trainingReducesRisk: boolean }>>({});

  const loadQueue = async () => {
    const res = await fetch('/api/intake/queue', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setQueue(data.items);
    }
    setLoading(false);
  };

  const loadFiles = async () => {
    const response = await fetch('/api/intake/files', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      setIngestionFiles(data.files || []);
    }
  };

  useEffect(() => {
    loadQueue();
    loadFiles();
  }, []);

  const showMessage = (text: string, kind: 'success' | 'error') => {
    setMessage({ text, kind });
    setTimeout(() => setMessage(null), 6000);
  };

  const submitIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/intake/ingest', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        themes: form.themes.split(',').map((t) => t.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(`Evidence ingested — reached quarantine status ${data.quarantineStatus} (hash ${data.documentHash.slice(0, 12)}...)`, 'success');
      setForm({ title: '', source: '', content: '', classification: 'INTERNAL', occurredAt: '', themes: '' });
      loadQueue();
    } else {
      showMessage(data.error || 'Ingestion failed', 'error');
    }
  };

  const submitFile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fileUpload) return;
    const formElement = e.currentTarget;
    setUploading(true);
    const payload = new FormData();
    payload.set('file', fileUpload);
    payload.set('relativePath', fileUpload.name);
    payload.set('classification', fileClassification);
    payload.set('recordType', fileRecordType);
    const res = await fetch('/api/intake/files', { method: 'POST', credentials: 'include', body: payload });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      showMessage(data.duplicate ? 'File already ingested; existing controlled record returned.' : `File accepted into organizational intake (${data.status}).`, 'success');
      setFileUpload(null);
      formElement.reset();
      if (data.evidenceId) loadQueue();
      loadFiles();
    } else {
      showMessage(data.failureReason || data.error || 'File ingestion failed', 'error');
    }
  };

  const reviewFile = async (fileId: string) => {
    const response = await fetch(`/api/intake/files/${encodeURIComponent(fileId)}`, { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) {
      showMessage(data.error || 'Unable to load the staged file.', 'error');
      return;
    }
    setSelectedFile(data.file);
    setPromotion({ title: data.file.originalName, themes: '', occurredAt: '' });
  };

  const promoteFile = async () => {
    if (!selectedFile) return;
    setPromoting(true);
    const response = await fetch(`/api/intake/files/${encodeURIComponent(selectedFile.id)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'promote_to_evidence',
        title: promotion.title,
        occurredAt: promotion.occurredAt || undefined,
        themes: promotion.themes.split(',').map((theme) => theme.trim()).filter(Boolean),
      }),
    });
    const data = await response.json();
    setPromoting(false);
    if (!response.ok) {
      showMessage(data.error || 'Evidence promotion failed.', 'error');
      return;
    }
    showMessage('Organizational file promoted to controlled HF evidence for human review.', 'success');
    setSelectedFile(null);
    await Promise.all([loadFiles(), loadQueue()]);
  };

  const submitEvent = async (evidenceId: string) => {
    const f = eventForms[evidenceId] || { title: '', occurredAt: '', themes: '', rolesExposed: '', sitesExposed: '' };
    const res = await fetch('/api/intake/events', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceId,
        title: f.title,
        occurredAt: f.occurredAt || new Date().toISOString(),
        themes: f.themes.split(',').map((t) => t.trim()).filter(Boolean),
        rolesExposed: f.rolesExposed.split(',').map((t) => t.trim()).filter(Boolean),
        sitesExposed: f.sitesExposed.split(',').map((t) => t.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Event extracted from evidence', 'success');
      loadQueue();
    } else {
      showMessage(data.error || 'Event creation failed', 'error');
    }
  };

  const promoteCausalStatus = async (eventId: string, toStatus: string) => {
    const res = await fetch('/api/intake/causal-status', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, toStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(`Causal status promoted to ${data.status}`, 'success');
      loadQueue();
    } else {
      showMessage(data.error || 'Promotion failed', 'error');
    }
  };

  const submitAppropriatenessReview = async (eventId: string) => {
    const f = reviewForms[eventId] || { title: '', competenceGap: false, trainingReducesRisk: false };
    const res = await fetch('/api/intake/appropriateness-review', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        interventionTitle: f.title,
        competenceGapIdentified: f.competenceGap,
        trainingReducesRisk: f.trainingReducesRisk,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('Intervention + appropriateness review created — ready for Content Authoring', 'success');
      loadQueue();
    } else {
      showMessage(data.error || 'Review submission failed', 'error');
    }
  };

  return (
    <div>
      <h1>Source Intake &amp; Review</h1>
      <p style={{ color: 'var(--t2)' }}>Ingest → classify → causal status → appropriateness review.</p>

      {message && (
        <div
          role="status"
          className="card"
          style={{ borderColor: message.kind === 'success' ? '#10b981' : '#ef4444', color: message.kind === 'success' ? '#10b981' : '#ef4444' }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={submitFile} className="card" aria-label="Upload organizational data file">
        <h2>Upload Training Department File</h2>
        <p style={{ color: 'var(--t2)', fontSize: '0.9rem' }}>
          Controlled web intake for TXT, Markdown, CSV, JSON, PDF, DOCX, and XLSX. Files are scanned, signature-checked, extracted, hashed, deduplicated, and staged before use.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '2fr 1fr 1fr' }}>
          <label>
            File
            <input required type="file" accept=".txt,.md,.markdown,.csv,.json,.pdf,.docx,.xlsx" onChange={(e) => setFileUpload(e.target.files?.[0] || null)} style={{ width: '100%' }} />
          </label>
          <label>
            Classification
            <select value={fileClassification} onChange={(e) => setFileClassification(e.target.value)} style={{ width: '100%' }}>
              {['PUBLIC', 'INTERNAL', 'SYSTEM_PROPRIETARY', 'ANNEX_QUALITY_IP', 'CUSTOMER_CONFIDENTIAL', 'EXPORT_CONTROLLED', 'BURRANA_PRIVATE'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Intake purpose
            <select value={fileRecordType} onChange={(e) => setFileRecordType(e.target.value as 'organizational_data' | 'evidence')} style={{ width: '100%' }}>
              <option value="organizational_data">Organizational data</option>
              <option value="evidence">HF evidence</option>
            </select>
          </label>
        </div>
        <button type="submit" disabled={!fileUpload || uploading} style={{ marginTop: '0.75rem' }}>
          {uploading ? 'Scanning and ingesting…' : 'Upload File'}
        </button>
      </form>

      <section className="card" aria-label="Staged organizational files">
        <h2>Staged Organizational Files</h2>
        <p style={{ color: 'var(--t2)', fontSize: '0.9rem' }}>
          Review extracted content before deciding whether it is relevant HF evidence. Staging alone never creates training.
        </p>
        {ingestionFiles.length === 0 ? <p>No files have been staged.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={{ textAlign: 'left' }}>File</th><th style={{ textAlign: 'left' }}>Status</th><th style={{ textAlign: 'left' }}>Purpose</th><th style={{ textAlign: 'left' }}>Received</th><th /></tr></thead>
              <tbody>{ingestionFiles.map((file) => (
                <tr key={file.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 0' }}>{file.originalName}<br /><small style={{ color: 'var(--t3)' }}>{file.relativePath}</small></td>
                  <td>{file.status}</td>
                  <td>{file.evidenceId ? 'HF evidence' : file.recordType.replace('_', ' ')}</td>
                  <td>{new Date(file.createdAt).toLocaleString()}</td>
                  <td><button type="button" onClick={() => reviewFile(file.id)}>Review</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {selectedFile && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>{selectedFile.originalName}</h3>
              <button type="button" onClick={() => setSelectedFile(null)}>Close</button>
            </div>
            <p style={{ color: 'var(--t2)' }}>
              {selectedFile.source.name} · {selectedFile.classification} · {selectedFile.mediaType || 'unknown type'} · {selectedFile.sizeBytes.toLocaleString()} bytes · SHA-256 {selectedFile.contentHash.slice(0, 16)}…
            </p>
            {selectedFile.failureReason && <p role="alert" style={{ color: '#ef4444' }}>{selectedFile.failureReason}</p>}
            <pre style={{ maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap', background: 'var(--void)', padding: '0.75rem', border: '1px solid var(--border)' }}>
              {selectedFile.extractedText || '(No extracted text available.)'}
            </pre>
            {selectedFile.extractedTextTruncated && <p style={{ color: 'var(--t2)' }}>Preview limited to 100,000 of {selectedFile.extractedCharacterCount.toLocaleString()} characters.</p>}
            {!selectedFile.evidenceId && selectedFile.status === 'ACCEPTED' && selectedFile.extractedText && (
              <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: '2fr 1fr' }}>
                <label>Evidence title<input required value={promotion.title} onChange={(event) => setPromotion({ ...promotion, title: event.target.value })} style={{ width: '100%' }} /></label>
                <label>Occurrence date<input type="date" value={promotion.occurredAt} onChange={(event) => setPromotion({ ...promotion, occurredAt: event.target.value })} style={{ width: '100%' }} /></label>
                <label style={{ gridColumn: '1 / -1' }}>Themes (comma-separated)<input value={promotion.themes} onChange={(event) => setPromotion({ ...promotion, themes: event.target.value })} style={{ width: '100%' }} /></label>
                <button type="button" disabled={promoting || !promotion.title.trim()} onClick={promoteFile} style={{ justifySelf: 'start' }}>
                  {promoting ? 'Promoting…' : 'Promote to Controlled HF Evidence'}
                </button>
              </div>
            )}
            {selectedFile.evidenceId && <p><strong>Already linked to evidence:</strong> {selectedFile.evidenceId}</p>}
          </div>
        )}
      </section>

      <form onSubmit={submitIngest} className="card" aria-label="Ingest new evidence">
        <h2>Ingest New Evidence</h2>
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
          <label>
            Title
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%' }} />
          </label>
          <label>
            Source citation
            <input required value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="NCR-2026-0042" style={{ width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Content (full text)
            <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} style={{ width: '100%' }} />
          </label>
          <label>
            Classification
            <select value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} style={{ width: '100%' }}>
              {['PUBLIC', 'INTERNAL', 'SYSTEM_PROPRIETARY', 'ANNEX_QUALITY_IP', 'CUSTOMER_CONFIDENTIAL', 'EXPORT_CONTROLLED', 'BURRANA_PRIVATE'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Occurred at
            <input required type="date" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} style={{ width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Themes (comma-separated)
            <input value={form.themes} onChange={(e) => setForm({ ...form, themes: e.target.value })} placeholder="fatigue, procedural_compliance" style={{ width: '100%' }} />
          </label>
        </div>
        <button type="submit" style={{ marginTop: '0.75rem' }}>Ingest Evidence</button>
      </form>

      <h2>Review Queue</h2>
      {loading ? (
        <p>Loading…</p>
      ) : queue.length === 0 ? (
        <p style={{ color: 'var(--t2)' }}>No evidence ingested yet.</p>
      ) : (
        queue.map((item) => (
          <div key={item.evidenceId} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{item.title}</strong>
              <span className={`badge ${item.quarantineStatus === 'ACCEPTED' ? 'success' : 'warning'}`}>{item.quarantineStatus}</span>
            </div>
            <p style={{ color: 'var(--t2)', fontSize: '0.85rem' }}>
              {item.classification} · {item.source} · hash {item.documentHash?.slice(0, 12)}…
            </p>

            {item.events.length === 0 ? (
              <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                <input
                  placeholder="Event title (e.g. Missed inspection step due to fatigue)"
                  value={eventForms[item.evidenceId]?.title || ''}
                  onChange={(e) =>
                    setEventForms({
                      ...eventForms,
                      [item.evidenceId]: {
                        title: e.target.value,
                        occurredAt: item.occurredAt,
                        themes: eventForms[item.evidenceId]?.themes ?? item.themes.join(', '),
                        rolesExposed: eventForms[item.evidenceId]?.rolesExposed || '',
                        sitesExposed: eventForms[item.evidenceId]?.sitesExposed || '',
                      },
                    })
                  }
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem' }}>
                    Themes
                    <input
                      placeholder="fatigue, procedural_compliance"
                      value={eventForms[item.evidenceId]?.themes ?? item.themes.join(', ')}
                      onChange={(e) =>
                        setEventForms({
                          ...eventForms,
                          [item.evidenceId]: { ...(eventForms[item.evidenceId] || { title: '', occurredAt: item.occurredAt, rolesExposed: '', sitesExposed: '' }), themes: e.target.value },
                        })
                      }
                      style={{ width: '100%' }}
                    />
                  </label>
                  <label style={{ fontSize: '0.8rem' }}>
                    Roles exposed
                    <input
                      placeholder="night_shift_mechanic"
                      value={eventForms[item.evidenceId]?.rolesExposed || ''}
                      onChange={(e) =>
                        setEventForms({
                          ...eventForms,
                          [item.evidenceId]: { ...(eventForms[item.evidenceId] || { title: '', occurredAt: item.occurredAt, themes: item.themes.join(', '), sitesExposed: '' }), rolesExposed: e.target.value },
                        })
                      }
                      style={{ width: '100%' }}
                    />
                  </label>
                  <label style={{ fontSize: '0.8rem' }}>
                    Sites exposed
                    <input
                      placeholder="brisbane"
                      value={eventForms[item.evidenceId]?.sitesExposed || ''}
                      onChange={(e) =>
                        setEventForms({
                          ...eventForms,
                          [item.evidenceId]: { ...(eventForms[item.evidenceId] || { title: '', occurredAt: item.occurredAt, themes: item.themes.join(', '), rolesExposed: '' }), sitesExposed: e.target.value },
                        })
                      }
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>
                <button onClick={() => submitEvent(item.evidenceId)} style={{ justifySelf: 'start' }}>Extract Event</button>
              </div>
            ) : (
              item.events.map((event) => (
                <div key={event.eventId} style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{event.title}</span>
                    <span className="badge" style={{ backgroundColor: 'rgba(14,165,233,0.15)', color: 'var(--signal)' }}>{event.causalStatus}</span>
                  </div>

                  {NEXT_STATUS[event.causalStatus] && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {NEXT_STATUS[event.causalStatus].map((next) => (
                        <button key={next} onClick={() => promoteCausalStatus(event.eventId, next)} style={{ marginRight: '0.5rem', fontSize: '0.8rem' }}>
                          Promote → {next}
                        </button>
                      ))}
                    </div>
                  )}

                  {event.causalStatus === 'VERIFIED' && !event.hasAppropriatenessReview && (
                    <div style={{ marginTop: '0.5rem', background: 'var(--void)', padding: '0.75rem', borderRadius: '4px' }}>
                      <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Appropriateness Review (unblocks intervention design):</p>
                      <input
                        placeholder="Intervention title"
                        value={reviewForms[event.eventId]?.title || ''}
                        onChange={(e) =>
                          setReviewForms({ ...reviewForms, [event.eventId]: { ...(reviewForms[event.eventId] || { competenceGap: false, trainingReducesRisk: false }), title: e.target.value } })
                        }
                        style={{ width: '100%', marginBottom: '0.5rem' }}
                      />
                      <label style={{ display: 'block', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={reviewForms[event.eventId]?.competenceGap || false}
                          onChange={(e) =>
                            setReviewForms({ ...reviewForms, [event.eventId]: { ...(reviewForms[event.eventId] || { title: '', trainingReducesRisk: false }), competenceGap: e.target.checked } })
                          }
                        />{' '}
                        Competence gap identified
                      </label>
                      <label style={{ display: 'block', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={reviewForms[event.eventId]?.trainingReducesRisk || false}
                          onChange={(e) =>
                            setReviewForms({ ...reviewForms, [event.eventId]: { ...(reviewForms[event.eventId] || { title: '', competenceGap: false }), trainingReducesRisk: e.target.checked } })
                          }
                        />{' '}
                        Training reduces risk
                      </label>
                      <button onClick={() => submitAppropriatenessReview(event.eventId)} style={{ marginTop: '0.5rem' }}>
                        Submit Review &amp; Create Intervention
                      </button>
                    </div>
                  )}

                  {event.interventionId && (
                    <p style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.5rem' }}>
                      ✓ Intervention &quot;{event.interventionTitle}&quot; ready — continue in Content Authoring.
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        ))
      )}
    </div>
  );
}
