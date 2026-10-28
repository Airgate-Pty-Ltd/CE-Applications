import { lazy, Suspense } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { InspectorCockpit } from './ui/inspector/InspectorCockpit.tsx'
import { PresenterView } from './ui/presenter/PresenterView.tsx'
import { ThemeToggle } from './ui/theme/ThemeToggle.tsx'

/**
 * Two surfaces, two layouts, two routes.
 *
 * The inspector is at a desk and needs everything at once. The presenter is
 * holding a tablet on a shop floor and needs one instruction in large type. They
 * are not the same screen with a role flag; treating them as one would have
 * produced a page that serves neither.
 */

declare const __TEST_DASHBOARD_ENABLED__: boolean

/**
 * The guard has to wrap the `lazy` call, not just the route.
 *
 * A bare `lazy(() => import(...))` at module scope leaves the dynamic import
 * statically reachable, so the bundler still emits the dashboard as a chunk —
 * unreachable by routing, but shipped. Putting the build flag around the call
 * lets dead-code elimination remove the import entirely. CI asserts no such
 * chunk exists in a production build.
 */
const TestDashboard = __TEST_DASHBOARD_ENABLED__
  ? lazy(() => import('./dev/TestDashboard.tsx').then((m) => ({ default: m.TestDashboard })))
  : null

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/inspector" element={<InspectorCockpit />} />
      <Route path="/presenter" element={<PresenterView />} />
      {/* Registered only outside production. The build flag removes the route
          and the lazy import, so the code never reaches a customer bundle. */}
      {__TEST_DASHBOARD_ENABLED__ && TestDashboard ? (
        <Route
          path="/dev/test-dashboard"
          element={
            <Suspense fallback={<p className="p-4 text-sm text-content-muted">Loading the dashboard…</p>}>
              <TestDashboard />
            </Suspense>
          }
        />
      ) : null}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Home(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold text-content-primary">Remote inspection</h1>
        <ThemeToggle />
      </div>
      <p className="mt-3 text-sm text-content-muted">
        An evidence engine for remote article inspection. It is not a video-calling tool: its purpose is to make it
        impossible to complete a session without producing the record set that shows the inspection was substantive.
      </p>
      <p className="mt-3 text-sm text-content-muted">
        This software produces records and surfaces risks. It does not determine, advise, or represent whether any
        organisation, arrangement, article, or session answers any obligation of any authority.
      </p>

      <ul className="mt-6 space-y-2 text-sm">
        <li>
          <Link className="text-signal-info hover:underline" to="/inspector">
            Inspector cockpit
          </Link>{' '}
          <span className="text-content-faint">— video, checklist, evidence log, approval position.</span>
        </li>
        <li>
          <Link className="text-signal-info hover:underline" to="/presenter">
            Presenter view
          </Link>{' '}
          <span className="text-content-faint">— camera, one instruction, one button. No determination controls exist for this role.</span>
        </li>
        {__TEST_DASHBOARD_ENABLED__ ? (
          <li>
            <Link className="text-signal-info hover:underline" to="/dev/test-dashboard">
              Test dashboard
            </Link>{' '}
            <span className="text-content-faint">— twelve panels, each stating what it proves. Not present in production builds.</span>
          </li>
        ) : null}
      </ul>

      <p className="mt-8 text-xs text-content-ghost">
        Open the inspector and the presenter in two windows: the inspector's current instruction appears on the
        presenter surface, and the presenter's problem flag comes back.
      </p>
    </div>
  )
}
