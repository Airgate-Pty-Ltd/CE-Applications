import {
  DefensibilityPanel,
  DeterminismPanel,
  EligibilityInspectorPanel,
  EvidencePackagePanel,
  ImmutabilityPanel,
  InterruptionSimulatorPanel,
  OpinionAuditPanel,
  RecordingFailurePanel,
  RoleMatrixPanel,
  RosterVersioningPanel,
  ScenarioRunnerPanel,
  ScrubAuditPanel,
} from './panels.tsx'
import { ThemeToggle } from '../ui/theme/ThemeToggle.tsx'

/**
 * The test dashboard — a deliverable, not a debug page.
 *
 * Development and staging only. `__TEST_DASHBOARD_ENABLED__` is compiled to
 * false for production builds, the route is not registered, and CI asserts the
 * string does not appear in the production bundle.
 *
 * Each panel states what it proves. If a panel cannot say that in a sentence it
 * is not earning its place on the page.
 */

const PANELS = [
  { id: 1, title: 'Scenario runner', Component: ScenarioRunnerPanel },
  { id: 2, title: 'Eligibility gate inspector', Component: EligibilityInspectorPanel },
  { id: 3, title: 'Role capability matrix', Component: RoleMatrixPanel },
  { id: 4, title: 'Determinism check', Component: DeterminismPanel },
  { id: 5, title: 'Immutability check', Component: ImmutabilityPanel },
  { id: 6, title: 'Interruption simulator', Component: InterruptionSimulatorPanel },
  { id: 7, title: 'Recording-failure test', Component: RecordingFailurePanel },
  { id: 8, title: 'Defensibility scorer', Component: DefensibilityPanel },
  { id: 9, title: 'Evidence package preview', Component: EvidencePackagePanel },
  { id: 10, title: 'Roster versioning test', Component: RosterVersioningPanel },
  { id: 11, title: 'Clean-room scrub audit', Component: ScrubAuditPanel },
  { id: 12, title: 'Opinion-language audit', Component: OpinionAuditPanel },
]

export function TestDashboard(): JSX.Element {
  return (
    <div className="mx-auto max-w-[1400px] p-4">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-lg font-semibold text-content-primary">Test dashboard</h1>
          <ThemeToggle />
        </div>
        <p className="mt-1 max-w-3xl text-sm text-content-muted">
          Twelve panels, each stating what it proves. Everything here runs the real engine against fictional data —
          there is no mock of a determination anywhere on this page. Development and staging only; the route is absent
          from production builds and CI fails if the string reaches the bundle.
        </p>
      </header>

      <nav className="panel mb-4 flex flex-wrap gap-x-4 gap-y-1 p-3 text-xs">
        {PANELS.map((panel) => (
          <a key={panel.id} href={`#panel-${panel.id}`} className="text-content-muted hover:text-content-primary">
            <span className="font-mono text-content-ghost">{String(panel.id).padStart(2, '0')}</span> {panel.title}
          </a>
        ))}
      </nav>

      <div className="space-y-4">
        {PANELS.map(({ id, Component }) => (
          <Component key={id} />
        ))}
      </div>
    </div>
  )
}
