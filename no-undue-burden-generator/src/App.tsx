import { useEffect, useState } from 'react'
import { useAppState } from './state/useAppState.ts'
import { IntakeForm } from './ui/IntakeForm.tsx'
import { ProfileForm } from './ui/ProfileForm.tsx'
import { ReviewPanel, StatusBanner } from './ui/ReviewPanel.tsx'
import { TestDashboard } from './dev/TestDashboard.tsx'
import { PRODUCT_NAME, TEST_DASHBOARD_ENABLED } from './config.ts'

/**
 * Application shell.
 *
 * Hash routing rather than history routing, deliberately: the same build has to
 * work from a static host, from a service worker cache with no server to rewrite
 * paths, and from the Tauri desktop wrapper loading over a file-like protocol.
 * A history router would 404 on refresh in two of those three.
 */

type Route = 'plan' | 'review' | 'profile' | 'dashboard'

const ROUTES: { id: Route; hash: string; label: string }[] = [
  { id: 'plan', hash: '#/plan', label: 'Project plan' },
  { id: 'review', hash: '#/review', label: 'Review & generate' },
  { id: 'profile', hash: '#/profile', label: 'Organization profile' },
  { id: 'dashboard', hash: '#/dev/test-dashboard', label: 'Test dashboard' },
]

function routeFromHash(hash: string): Route {
  if (hash.startsWith('#/dev/test-dashboard')) return 'dashboard'
  if (hash.startsWith('#/review')) return 'review'
  if (hash.startsWith('#/profile')) return 'profile'
  return 'plan'
}

export function App() {
  const state = useAppState()
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const visible = ROUTES.filter((r) => r.id !== 'dashboard' || TEST_DASHBOARD_ENABLED)
  const active = route === 'dashboard' && !TEST_DASHBOARD_ENABLED ? 'plan' : route

  if (!state.loaded) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <h1 className="text-base font-semibold">{PRODUCT_NAME}</h1>
          <p className="mt-0.5 text-xs text-slate-600">
            PAH Project Initiation Plans under FAA AC 21-55 · everything stays in this browser
          </p>
          <nav className="mt-4 flex flex-wrap gap-1">
            {visible.map((r) => (
              <a
                key={r.id}
                href={r.hash}
                className={`rounded px-3 py-1.5 text-sm ${
                  active === r.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {r.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {active !== 'dashboard' && (
          <div className="mb-8">
            <StatusBanner state={state} />
          </div>
        )}

        {active === 'plan' && <IntakeForm state={state} />}
        {active === 'review' && <ReviewPanel state={state} />}
        {active === 'profile' && <ProfileForm state={state} />}
        {active === 'dashboard' && TEST_DASHBOARD_ENABLED && <TestDashboard state={state} />}
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-4xl px-6 py-6 text-xs text-slate-500">
          <p>
            This software prepares draft documentation for submission to the FAA. It does not provide
            regulatory, legal or airworthiness advice, and makes no representation as to whether any document
            it produces will be accepted. The FAA managing office makes that determination.
          </p>
          <p className="mt-2">© 2026 Conform-Edge Quality Consulting LLC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
