import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Condition { id: string; severity: string; findingText: string; ruleId: string; createdAt: string }
interface CaseRow { id: string; articleName: string; status: string; approvalBasis: string | null; updatedAt: string; conditions: Condition[] }

async function loadDashboard(): Promise<CaseRow[]> {
  const { data } = await api.get('/api/cases');
  const cases: CaseRow[] = data.cases;
  return Promise.all(
    cases.map(async (c) => {
      const { data: a } = await api.get(`/api/cases/${c.id}/assessments`);
      return { ...c, conditions: a.conditions as Condition[] };
    }),
  );
}

function nextAction(c: CaseRow): string {
  const blocking = c.conditions.filter((x) => x.severity === 'blocking').length;
  const warning = c.conditions.filter((x) => x.severity === 'warning').length;
  if (blocking) return `Resolve ${blocking} blocking condition${blocking > 1 ? 's' : ''}`;
  if (!c.approvalBasis || c.approvalBasis === 'AMBIGUOUS') return 'Confirm the approval basis';
  if (warning) return `Review ${warning} warning${warning > 1 ? 's' : ''}, then draft`;
  if (c.status === 'INTAKE') return 'Upload evidence / advance to Gap Review';
  if (c.status === 'GAP_REVIEW') return 'Advance to Drafting';
  if (c.status === 'DRAFTING') return 'Generate documents';
  if (c.status === 'UNDER_REVIEW') return 'Reviewer sign-off';
  return 'Review and export';
}

export default function Dashboard() {
  const { data: cases, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: loadDashboard });

  const allBlocking = (cases ?? [])
    .flatMap((c) => c.conditions.filter((x) => x.severity === 'blocking').map((x) => ({ ...x, case: c })))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const oldest = allBlocking[0];

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted small" style={{ marginTop: -6 }}>Where every case stands, and the single most important thing to do next.</p>

      {oldest && (
        <div className="banner-block">
          <div className="label" style={{ color: 'var(--critical)' }}>What matters most right now</div>
          <div style={{ marginTop: 4 }}>
            Oldest open blocking condition — <Link to={`/cases/${oldest.case.id}`}>{oldest.case.articleName}</Link>: {oldest.findingText}
          </div>
        </div>
      )}

      {isLoading && <div className="muted">Loading…</div>}
      {cases && cases.length === 0 && <div className="panel">No cases yet. Create one from the Cases screen.</div>}

      <div className="grid-cards">
        {cases?.map((c) => {
          const blocking = c.conditions.filter((x) => x.severity === 'blocking').length;
          const warning = c.conditions.filter((x) => x.severity === 'warning').length;
          return (
            <Link key={c.id} to={`/cases/${c.id}`} className="panel" style={{ display: 'block', color: 'inherit' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{c.articleName}</strong>
                <span className={`stag signal`}>{c.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="small muted" style={{ margin: '8px 0' }}>
                Basis: {c.approvalBasis ? c.approvalBasis.replace(/_/g, ' ') : 'not confirmed'}
              </div>
              <div className="row">
                {blocking > 0 && <span className="stag blocking">{blocking} blocking</span>}
                {warning > 0 && <span className="stag warning">{warning} warning</span>}
                {blocking === 0 && warning === 0 && <span className="stag info">no open gaps</span>}
              </div>
              <div className="small" style={{ marginTop: 10, color: 'var(--signal)' }}>→ {nextAction(c)}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
