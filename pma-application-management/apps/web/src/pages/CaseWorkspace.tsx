import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import Modal from '../components/Modal';

const BASES = ['STC_IDENTICALITY', 'TC_LICENSED', 'IDENTICALITY_NO_LICENSE', 'TEST_AND_COMPUTATION', 'AMBIGUOUS'];
const STATUSES = ['INTAKE', 'GAP_REVIEW', 'DRAFTING', 'UNDER_REVIEW', 'READY_FOR_SIGNATURE', 'EXPORTED', 'ARCHIVED'];
const DOC_TYPES = [
  { t: 'APPLICATION_LETTER', label: 'Application Letter' },
  { t: 'PMA_SUPPLEMENT', label: 'PMA Supplement' },
  { t: 'SUBMISSION_CHECKLIST', label: 'Submission Checklist' },
  { t: 'MANAGEMENT_REVIEW_PACK', label: 'Management Review Pack' },
];
const TEXT_FIELDS: { key: string; label: string }[] = [
  { key: 'applicant_legal_name', label: 'Applicant legal name' },
  { key: 'manufacturing_address', label: 'Manufacturing address' },
  { key: 'faa_submission_office', label: 'FAA submission office' },
  { key: 'qms_manual_number', label: 'QMS manual number' },
  { key: 'qms_manual_revision', label: 'QMS manual revision' },
  { key: 'qms_manual_date', label: 'QMS manual date' },
  { key: 'signatory_name', label: 'Signatory name' },
  { key: 'signatory_title', label: 'Signatory title' },
  { key: 'marking_scheme_ref', label: 'Marking scheme reference' },
  { key: 'stc_number', label: 'STC number' },
  { key: 'tc_number', label: 'TC number' },
  { key: 'tc_holder', label: 'TC holder' },
];

export default function CaseWorkspace() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [charterOpen, setCharterOpen] = useState(false);
  const [msg, setMsg] = useState('');

  const caseQ = useQuery({ queryKey: ['case', id], queryFn: async () => (await api.get(`/api/cases/${id}`)).data });
  const condQ = useQuery({ queryKey: ['cond', id], queryFn: async () => (await api.get(`/api/cases/${id}/assessments`)).data.conditions });
  const docsQ = useQuery({ queryKey: ['docs', id], queryFn: async () => (await api.get(`/api/cases/${id}/documents`)).data.documents });

  const c = caseQ.data;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['case', id] }); qc.invalidateQueries({ queryKey: ['cond', id] }); };

  async function confirmBasis(basis: string) {
    await api.post(`/api/cases/${id}/basis`, { approvalBasis: basis });
    refresh();
  }
  async function setStatus(status: string) {
    setMsg('');
    try { await api.post(`/api/cases/${id}/status`, { status }); refresh(); }
    catch (e: any) { setMsg(e.response?.data?.reason || e.response?.data?.error || 'blocked'); }
  }
  async function respond(aid: string, response: string) {
    await api.post(`/api/assessments/${aid}/respond`, { response });
    qc.invalidateQueries({ queryKey: ['cond', id] });
  }
  async function generate(t: string) {
    setMsg('');
    try { await api.post(`/api/cases/${id}/generate`, { type: t }); qc.invalidateQueries({ queryKey: ['docs', id] }); }
    catch (e: any) { setMsg(e.response?.data?.reason || 'generation blocked'); }
  }
  async function download(docId: string, type: string) {
    const res = await api.get(`/api/documents/${docId}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = `${type}.docx`; a.click(); URL.revokeObjectURL(url);
  }

  if (!c) return <div className="muted">Loading…</div>;
  const conditions = condQ.data ?? [];

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>{c.articleName}</h1>
        <span className="stag signal">{c.status.replace(/_/g, ' ')}</span>
      </div>
      <div className="mai-badge" style={{ marginBottom: 14 }}>
        ● M-AI active — advisory only. Human authority controls all decisions.
        <span style={{ marginLeft: 8, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCharterOpen(true)}>What can this assistant do?</span>
      </div>

      <div className="tabs">
        {['overview', 'intake', 'conditions', 'documents', 'precedents'].map((t) => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}{t === 'conditions' && conditions.length ? ` (${conditions.length})` : ''}
          </div>
        ))}
      </div>

      {msg && <div className="banner-block">{msg}</div>}

      {tab === 'overview' && <Overview c={c} onBasis={confirmBasis} onStatus={setStatus} />}
      {tab === 'intake' && <Intake id={id!} onDone={refresh} />}
      {tab === 'conditions' && <Conditions conditions={conditions} onRespond={respond} />}
      {tab === 'documents' && <Documents docs={docsQ.data ?? []} onGenerate={generate} onDownload={download} />}
      {tab === 'precedents' && <Precedents id={id!} />}

      {charterOpen && <CharterModal onClose={() => setCharterOpen(false)} />}
    </div>
  );
}

function Overview({ c, onBasis, onStatus }: any) {
  return (
    <div className="panel">
      <div className="label">Approval basis (human decision)</div>
      <div className="row" style={{ margin: '8px 0 16px' }}>
        <select className="minp" style={{ maxWidth: 280, marginBottom: 0 }} defaultValue={c.approvalBasis || ''} onChange={(e) => e.target.value && onBasis(e.target.value)}>
          <option value="">— confirm basis —</option>
          {BASES.map((b) => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}
        </select>
        {c.approvalBasis && <span className="stag info">{c.approvalBasis.replace(/_/g, ' ')}</span>}
      </div>
      <div className="label">Advance status (gate-enforced)</div>
      <div className="row" style={{ marginTop: 8 }}>
        {STATUSES.map((s) => <button key={s} className="btn btn-ghost" onClick={() => onStatus(s)}>{s.replace(/_/g, ' ')}</button>)}
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>A case cannot leave Gap Review with an open blocking condition; moving out of Drafting requires a Reviewer.</p>
    </div>
  );
}

function Intake({ id, onDone }: { id: string; onDone: () => void }) {
  const [type, setType] = useState('STC');
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  async function upload() {
    if (!file) return;
    const fd = new FormData(); fd.append('type', type); fd.append('file', file);
    const { data } = await api.post(`/api/cases/${id}/evidence`, fd);
    setNote(`Extracted ${data.extracted.length} field(s) deterministically.`);
    onDone();
  }
  async function saveFields() {
    const payload = Object.entries(fields).filter(([, v]) => v.trim() !== '').map(([k, v]) => ({ fieldKey: k, value: v }));
    if (!payload.length) return;
    await api.post(`/api/cases/${id}/fields`, { fields: payload });
    setNote(`Saved ${payload.length} field(s) as CONFIRMED (preparer-transcribed).`);
    setFields({});
    onDone();
  }

  return (
    <>
      <div className="panel">
        <div className="label">Upload source document (deterministic extraction — no LLM)</div>
        <div className="row" style={{ marginTop: 10 }}>
          <select className="minp" style={{ maxWidth: 220, marginBottom: 0 }} value={type} onChange={(e) => setType(e.target.value)}>
            {['STC', 'ASSIST_LETTER', 'TC_HOLDER_LETTER', 'MASTER_DRAWING_LIST', 'DRAWING', 'TEST_REPORT', 'QMS_MANUAL_EXCERPT', 'OTHER'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button className="btn btn-primary" onClick={upload} disabled={!file}>Upload & extract</button>
        </div>
      </div>
      <div className="panel">
        <div className="label">Guided transcription — record fields off the document in front of you</div>
        <div className="grid-cards" style={{ marginTop: 12 }}>
          {TEXT_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mfi">{f.label}</label>
              <input className="minp" value={fields[f.key] ?? ''} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={saveFields}>Save transcribed fields</button>
      </div>
      {note && <div className="panel small">{note}</div>}
    </>
  );
}

function Conditions({ conditions, onRespond }: any) {
  if (!conditions.length) return <div className="panel muted">No open System-Detected Conditions.</div>;
  return (
    <div>
      {conditions.map((c: any) => (
        <div key={c.id} className={`cond ${c.severity}`}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className={`stag ${c.severity}`}>{c.severity}</span>
            <span className="small muted">data confidence: {c.dataConfidence}</span>
          </div>
          <div className="cond-find">{c.findingText}</div>
          {c.resolutionHint && <div className="cond-hint">→ {c.resolutionHint}</div>}
          <div className="cond-refs">{c.ruleId} r{c.ruleRevision} · {c.clauseRefs.join(' · ')}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-ghost" onClick={() => onRespond(c.id, 'confirm')}>Confirm</button>
            <button className="btn btn-cancel" onClick={() => onRespond(c.id, 'dismiss_incorrect')}>Dismiss — incorrect</button>
            <button className="btn btn-cancel" onClick={() => onRespond(c.id, 'dismiss_not_applicable')}>Dismiss — N/A</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Documents({ docs, onGenerate, onDownload }: any) {
  return (
    <>
      <div className="panel">
        <div className="label">Generate drafts (a blocking condition blocks generation)</div>
        <div className="row" style={{ marginTop: 10 }}>
          {DOC_TYPES.map((d) => <button key={d.t} className="btn btn-primary" onClick={() => onGenerate(d.t)}>{d.label}</button>)}
        </div>
        <p className="watermark-note" style={{ marginTop: 12 }}>Every draft is watermarked “Draft for internal review only — not for FAA submission.”</p>
      </div>
      <div className="panel" style={{ padding: 0 }}>
        <table className="grid">
          <thead><tr><th>Type</th><th>Version</th><th>Submission status</th><th>Snapshot</th><th></th></tr></thead>
          <tbody>
            {docs.map((d: any) => (
              <tr key={d.id}>
                <td>{d.type.replace(/_/g, ' ')}</td>
                <td>v{d.version}</td>
                <td><span className={`stag ${d.submissionStatus}`}>{d.submissionStatus.replace(/_/g, ' ')}</span></td>
                <td className="muted small">{d.dataSnapshotHash.slice(0, 12)}…</td>
                <td><button className="btn btn-ghost" onClick={() => onDownload(d.id, d.type)}>Download</button></td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={5} className="muted">No documents generated yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Precedents({ id }: { id: string }) {
  const { data } = useQuery({ queryKey: ['prec', id], queryFn: async () => (await api.get(`/api/cases/${id}/precedents`)).data.precedents });
  return (
    <div className="panel">
      <div className="label">Precedent suggestions (read-only — nothing is auto-copied)</div>
      {data?.length ? data.map((p: any) => (
        <div key={p.id} className="cond"><strong>{p.articleName}</strong> <span className="stag info">{p.approvalBasis.replace(/_/g, ' ')}</span>{p.summary && <div className="small muted">{p.summary}</div>}</div>
      )) : <div className="muted small" style={{ marginTop: 8 }}>No matching precedents in your library yet.</div>}
    </div>
  );
}

function CharterModal({ onClose }: { onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['charter'], queryFn: async () => (await api.get('/api/mai/export')).data });
  const charter = data?.charters?.[0]?.charter ?? 'Loading…';
  return (
    <Modal title="Authority Charter — pma-application-assessment" onClose={onClose}>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.74rem', lineHeight: 1.5, color: 'var(--t2)' }}>{charter}</pre>
    </Modal>
  );
}
