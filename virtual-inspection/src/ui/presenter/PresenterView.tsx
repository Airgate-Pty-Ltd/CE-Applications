import { useMemo, useState } from 'react'
import { capabilitiesFor, determinationCapabilitiesFor } from '../../engine/roles.ts'
import type { PresenterBroadcast } from '../session/channel.ts'
import { useSessionChannel } from '../session/useSessionChannel.ts'
import { ThemeToggle } from '../theme/ThemeToggle.tsx'

/**
 * The presenter surface.
 *
 * A tablet or a phone, held in one hand, on a shop floor, under bad light. So it
 * shows almost nothing: the camera view, the current instruction in large type,
 * and a button to flag a problem.
 *
 * What it does not show is the point. The determination controls are not hidden
 * and not disabled - the presenter role holds no determination capability, so
 * there is nothing for this component to render them from. The capability list
 * is printed at the foot of the screen so anyone can see that for themselves.
 */
export function PresenterView(): JSX.Element {
  const [brief, setBrief] = useState<PresenterBroadcast | null>(null)
  const [flagged, setFlagged] = useState<string | null>(null)

  const capabilities = useMemo(() => [...capabilitiesFor('PRESENTER')], [])
  const determinationCapabilities = useMemo(() => determinationCapabilitiesFor('PRESENTER'), [])

  const post = useSessionChannel((message) => {
    if (message.kind === 'presenter-brief') setBrief(message)
  })

  const flagProblem = (): void => {
    const at = new Date().toISOString()
    post({ kind: 'presenter-flag', at, note: 'Presenter flagged a problem.' })
    setFlagged(at)
    window.setTimeout(() => setFlagged(null), 4000)
  }

  return (
    <div className="flex h-full flex-col bg-surface-base text-content-primary">
      <div className="flex items-center justify-between px-4 py-2 text-xs uppercase tracking-widest text-content-muted">
        <span>Presenter</span>
        <div className="flex items-center gap-3">
          <span>{brief ? brief.sessionState : 'waiting for the inspector'}</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Camera view. The provider adapter attaches the live stream here.
          The well stays dark in both themes - a bright surround around a video
          feed changes how the picture reads, and on this surface the picture is
          the whole job. */}
      <div className="relative flex flex-1 items-center justify-center border-y border-edge bg-surface-video">
        <p className="px-6 text-center text-sm text-slate-400">
          Camera view. The selected video provider attaches the live stream to this surface.
        </p>
        {brief?.checkNumber ? (
          <span className="absolute right-4 top-4 rounded bg-black/60 px-2 py-1 font-mono text-xs text-slate-200">
            {brief.checkNumber} / {brief.checkCount}
          </span>
        ) : null}
      </div>

      {/* One instruction, as large as the screen will allow. */}
      <div className="flex min-h-[38%] flex-col justify-center px-6 py-6">
        {brief?.instruction ? (
          <>
            <p className="mb-2 text-sm uppercase tracking-widest text-content-faint">{brief.checkTitle}</p>
            <p className="text-3xl font-semibold leading-snug sm:text-4xl">{brief.instruction}</p>
            {brief.awaitingAction ? (
              <p className="mt-4 text-lg text-signal-warn">The inspector is waiting on this.</p>
            ) : null}
          </>
        ) : (
          <p className="text-2xl text-content-faint">Wait for the inspector's first instruction.</p>
        )}
      </div>

      <div className="px-4 pb-6">
        <button
          type="button"
          onClick={flagProblem}
          className="w-full rounded-lg bg-signal-block px-4 py-5 text-2xl font-semibold text-white active:bg-signal-block/80"
        >
          Flag a problem
        </button>
        {flagged ? (
          <p className="mt-3 text-center text-base text-signal-warn">
            Flag sent to the inspector. Stop and wait for direction.
          </p>
        ) : null}
      </div>

      <footer className="border-t border-edge px-4 py-3 text-[11px] leading-relaxed text-content-faint">
        <p>
          <strong className="text-content-muted">This role can:</strong> {capabilities.join(', ').toLowerCase().replace(/_/g, ' ')}.
        </p>
        <p className="mt-1">
          <strong className="text-content-muted">Determination capabilities held by this role:</strong>{' '}
          {determinationCapabilities.length === 0
            ? 'none. Conformity is determined by the inspector alone.'
            : determinationCapabilities.join(', ')}
        </p>
      </footer>
    </div>
  )
}
