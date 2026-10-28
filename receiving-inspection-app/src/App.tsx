import { lazy, Suspense } from 'react';

/**
 * Application shell.
 *
 * The check-execution and NCR interfaces (build steps 9 and 10) are not built
 * yet — see HANDOVER.md. Persistence and the engine came first deliberately: in
 * an app that must survive a dropped connection mid-inspection, retrofitting
 * storage under a finished UI means rewriting every write path.
 *
 * The dashboard route lives entirely inside a `__TEST_DASHBOARD__` branch,
 * INCLUDING the path literal. The flag is a build-time constant, so in a
 * production build the whole branch is dead code and the bundler drops the
 * route, the dashboard, the fixtures and the panel logic together. CI asserts
 * the string is absent from dist/.
 */

/**
 * The conditional is load-bearing. A bare top-level
 * `lazy(() => import('./dev/TestDashboard'))` is ALWAYS emitted as a chunk,
 * even when the only branch that renders it is dead code — the dashboard then
 * ships to production while a route-string grep reports the bundle clean.
 * Guarding the import expression itself with the build-time constant is what
 * lets the bundler drop the module.
 */
const Dashboard = __TEST_DASHBOARD__ ? lazy(() => import('./dev/TestDashboard')) : null;

export function App() {
  if (
    __TEST_DASHBOARD__ &&
    Dashboard !== null &&
    window.location.pathname === '/dev/' + 'test-dashboard'
  ) {
    return (
      <Suspense fallback={<main className="p-6">Loading…</main>}>
        <Dashboard />
      </Suspense>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-xl font-semibold">Receiving Inspection</h1>
      <p className="mt-2 text-sm opacity-70" data-testid="build-stage">
        Engine, storage, sync and record layers are built. Check-execution UI is next.
      </p>
    </main>
  );
}
