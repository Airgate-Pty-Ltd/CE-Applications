// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App.tsx'

/**
 * UI smoke tests.
 *
 * A green engine suite does not prove the application runs. These mount the
 * real App — real state, real engine, real routing — and drive it the way a user
 * would, so that a rendering crash or a broken adaptive rule fails the build
 * rather than being discovered by Mike.
 *
 * IndexedDB does not exist in jsdom. `storageAvailable()` returns false and
 * state stays in memory, which is exactly the fallback path the guard was
 * written for — so these tests also cover it.
 */

beforeEach(() => {
  window.location.hash = ''
})

afterEach(cleanup)

async function ready() {
  await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument())
}

/**
 * Wait for the dashboard's .docx rendering to finish.
 *
 * Three panels share one async render of the document. Unmounting while it is
 * still in flight leaves JSZip working against a torn-down jsdom global, which
 * surfaces as an uncaught exception attributed to whichever test happened to
 * finish first. Waiting is correct rather than a workaround: the panels are not
 * meaningfully rendered until it completes.
 */
async function documentRendered() {
  await waitFor(() => expect(screen.queryAllByText('Rendering…')).toHaveLength(0), { timeout: 10_000 })
}

describe('application shell', () => {
  it('mounts and shows the intake by default', async () => {
    render(<App />)
    await ready()
    expect(screen.getByRole('heading', { name: 'No Undue Burden Generator' })).toBeInTheDocument()
    expect(screen.getByText('Section 1 — Project Information')).toBeInTheDocument()
  })

  it('starts BLOCKED on an empty plan, with the reason shown', async () => {
    render(<App />)
    await ready()
    expect(screen.getAllByText('BLOCKED').length).toBeGreaterThan(0)
    expect(screen.getByText(/blocking gaps prevent generation/)).toBeInTheDocument()
  })

  it('carries the regulatory disclaimer in the footer', async () => {
    render(<App />)
    await ready()
    expect(
      screen.getByText(/The FAA managing office makes that determination\./),
    ).toBeInTheDocument()
  })

  it('exposes the test dashboard in a dev build', async () => {
    render(<App />)
    await ready()
    expect(screen.getByRole('link', { name: 'Test dashboard' })).toBeInTheDocument()
  })
})

describe('the intake is adaptive, not a long static form', () => {
  it('hides Sections 3 to 5 until the risk determination routes to a full plan', async () => {
    render(<App />)
    await ready()

    expect(screen.queryByText(/Section 3 — PAH Control/)).not.toBeInTheDocument()
    expect(screen.getByText('Sections 3 to 5 are not shown.')).toBeInTheDocument()
  })

  it('hides the critical-characteristics field until CPL or high-risk is Yes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await ready()

    expect(screen.queryByText('3. Describe the critical characteristics')).not.toBeInTheDocument()

    const cpl = screen
      .getByText('1. Are the products, articles, or processes listed on the CPL?')
      .closest('div')!
    await user.click(within(cpl).getByRole('button', { name: 'Yes' }))

    expect(screen.getByText('3. Describe the critical characteristics')).toBeInTheDocument()
  })

  it('reveals Sections 3 to 5 once a full project plan is routed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await ready()

    const cpl = screen
      .getByText('1. Are the products, articles, or processes listed on the CPL?')
      .closest('div')!
    await user.click(within(cpl).getByRole('button', { name: 'Yes' }))

    await waitFor(() =>
      expect(screen.getByText(/Section 3 — PAH Control/)).toBeInTheDocument(),
    )
    expect(screen.getByText('Full project plan required — Sections 1 to 5')).toBeInTheDocument()
  })

  it('reveals the un-inspectable characteristics field only when the answer is No', async () => {
    const user = userEvent.setup()
    render(<App />)
    await ready()

    expect(
      screen.queryByText('5. Identify the characteristics that cannot be inspected once received'),
    ).not.toBeInTheDocument()

    const inspectable = screen
      .getByText('4. Are the products or articles fully inspectable upon receipt?')
      .closest('div')!
    await user.click(within(inspectable).getByRole('button', { name: 'No' }))

    expect(
      screen.getByText('5. Identify the characteristics that cannot be inspected once received'),
    ).toBeInTheDocument()
  })

  it('warns live when a narrative is too thin to be what the AC asks for', async () => {
    const user = userEvent.setup()
    render(<App />)
    await ready()

    const box = screen
      .getByText('6. Facility manufacturing capabilities and experience')
      .closest('div')!
    await user.type(within(box).getByRole('textbox'), 'Per our QMS.')

    expect(screen.getByText(/likely too thin/)).toBeInTheDocument()
  })
})

describe('the test dashboard', () => {
  it('loads a scenario end to end and the engine agrees with its expectation', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/dev/test-dashboard'
    render(<App />)
    await ready()

    expect(screen.getByRole('heading', { name: 'Test dashboard' })).toBeInTheDocument()

    const card = screen
      .getByText('CPL-listed article routes to a full project plan')
      .closest('div')!.parentElement!
    await user.click(within(card).getByRole('button', { name: 'Load' }))

    await waitFor(() => expect(screen.getByText('MATCH')).toBeInTheDocument())
    await documentRendered()
  })

  it('runs the determinism check and passes', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/dev/test-dashboard'
    render(<App />)
    await ready()

    await user.click(screen.getByRole('button', { name: 'Run 100 times' }))
    expect(
      screen.getByText('All 100 runs produced byte-identical determination output.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('PASS').length).toBeGreaterThan(0)
    await documentRendered()
  })

  it('states what every panel proves', async () => {
    window.location.hash = '#/dev/test-dashboard'
    render(<App />)
    await ready()
    // Eight panels plus the expectation cross-check.
    expect(screen.getAllByText('Proves:').length).toBeGreaterThanOrEqual(8)
    await documentRendered()
  })

  it('reports the scrub audit clean on fixture data', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/dev/test-dashboard'
    render(<App />)
    await ready()

    const card = screen
      .getByText('A low-risk inspectable article may need only an initial notification')
      .closest('div')!.parentElement!
    await user.click(within(card).getByRole('button', { name: 'Load' }))

    await waitFor(() => expect(screen.getByText('CLEAN')).toBeInTheDocument())
    await documentRendered()
  })
})

describe('review and generate', () => {
  it('disables the plan download while a blocking gap remains', async () => {
    window.location.hash = '#/review'
    render(<App />)
    await ready()

    expect(screen.getByRole('button', { name: /Download Project Initiation Plan/ })).toBeDisabled()
    // The gap report stays available: the user who cannot generate is the one
    // who most needs to know why.
    expect(screen.getByRole('button', { name: /Download Gap Report/ })).toBeEnabled()
  })

  it('lists blocking gaps with a remedy for each', async () => {
    window.location.hash = '#/review'
    render(<App />)
    await ready()

    // One per required profile field, so there is deliberately more than one.
    expect(screen.getAllByText('The applicant cannot be identified').length).toBeGreaterThan(0)
    expect(screen.getAllByText('What to do:').length).toBeGreaterThan(0)
  })
})

describe('organization profile', () => {
  it('ships every field empty', async () => {
    window.location.hash = '#/profile'
    render(<App />)
    await ready()

    // A populated default would be somebody's real data, and a plausible wrong
    // default ships to the FAA silently where a blank becomes a CONFIRM token.
    for (const box of screen.getAllByRole('textbox')) {
      expect((box as HTMLInputElement).value).toBe('')
    }
  })
})
