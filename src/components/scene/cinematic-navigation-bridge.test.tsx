import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Link from 'next/link'
import { StrictMode } from 'react'

import {
  CinematicDetailArrival,
  CinematicNavigationBridge,
} from './cinematic-navigation-bridge.client'
import {
  CINEMATIC_HANDOFF_DEPART_MS,
  CINEMATIC_HANDOFF_TOTAL_MS,
} from './transition-machine'

const navigationMocks = vi.hoisted(() => ({
  pathname: '/',
  push: vi.fn(),
  reducedMotion: false,
}))
const cinematicHandoffStorageKey = 'captain-dock:cinematic-handoff'

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ push: navigationMocks.push }),
}))

function setReducedMotion(reduced: boolean) {
  navigationMocks.reducedMotion = reduced
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: navigationMocks.reducedMotion,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

function bridgeFixture(scene: 'arc' | 'home' | 'rialo' = 'home') {
  return (
    <>
      <header>
        <Link href="/about">Global about</Link>
      </header>
      <CinematicNavigationBridge scene={scene}>
        <main>
          <Link data-scene-target="project:signal-ledger" href="/arc/signal-ledger">
            Signal case file
          </Link>
          <Link data-scene-target="ecosystem:arc" href="/arc">
            Arc route
          </Link>
          <Link data-scene-target="ecosystem:rialo" href="/rialo">
            Rialo route
          </Link>
          <Link href="/about">Content note</Link>
          <a href="https://example.com/external">External</a>
          <Link href="#local">Hash only</Link>
          <Link download href="/asset.zip">Download</Link>
          <Link href="/arc" target="_blank">New tab</Link>
        </main>
      </CinematicNavigationBridge>
    </>
  )
}

function renderBridge(scene: 'arc' | 'home' | 'rialo' = 'home') {
  return render(bridgeFixture(scene))
}

beforeEach(() => {
  vi.useFakeTimers()
  navigationMocks.pathname = '/'
  navigationMocks.push.mockReset()
  window.sessionStorage.clear()
  setReducedMotion(false)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('CinematicNavigationBridge', () => {
  it('publishes immediate departure feedback, then hands native href to the router within budget', async () => {
    renderBridge()
    const link = screen.getByRole('link', { name: 'Signal case file' })

    fireEvent.click(link, { button: 0 })

    const bridge = document.querySelector('[data-cinematic-navigation]')

    expect(link).toHaveAttribute('href', '/arc/signal-ledger')
    expect(bridge).toHaveAttribute('data-cinematic-navigation-phase', 'departing')
    expect(bridge).toHaveAttribute('data-cinematic-navigation-target', 'project:signal-ledger')
    expect(Number(bridge?.getAttribute('data-cinematic-navigation-token'))).toBeGreaterThan(0)
    expect(navigationMocks.push).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_DEPART_MS)
    })

    expect(navigationMocks.push).toHaveBeenCalledTimes(1)
    expect(navigationMocks.push).toHaveBeenCalledWith('/arc/signal-ledger')
  })

  it('cancels a stale departure when a newer ordinary click redirects the handoff', async () => {
    renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Arc route' }), { button: 0 })
    const firstToken = document
      .querySelector('[data-cinematic-navigation]')
      ?.getAttribute('data-cinematic-navigation-token')

    fireEvent.click(screen.getByRole('link', { name: 'Rialo route' }), { button: 0 })
    const bridge = document.querySelector('[data-cinematic-navigation]')

    expect(bridge?.getAttribute('data-cinematic-navigation-token')).not.toBe(firstToken)
    expect(bridge).toHaveAttribute('data-cinematic-navigation-target', 'ecosystem:rialo')
    expect(document.querySelectorAll('[data-cinematic-handoff-signal]')).toHaveLength(1)
    expect(document.querySelector('[data-cinematic-handoff-signal]')).toHaveAttribute(
      'data-cinematic-handoff-token',
      bridge?.getAttribute('data-cinematic-navigation-token'),
    )

    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_DEPART_MS)
    })

    expect(navigationMocks.push).toHaveBeenCalledTimes(1)
    expect(navigationMocks.push).toHaveBeenCalledWith('/rialo')
  })

  it('cancels a pending carrier route when native popstate takes over before the handoff', async () => {
    renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Arc route' }), { button: 0 })

    expect(document.querySelector('[data-cinematic-handoff-signal]')).not.toBeNull()
    expect(window.sessionStorage.getItem(cinematicHandoffStorageKey)).not.toBeNull()

    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })

    const bridge = document.querySelector('[data-cinematic-navigation]')

    expect(navigationMocks.push).not.toHaveBeenCalled()
    expect(bridge).toHaveAttribute('data-cinematic-navigation-phase', 'idle')
    expect(bridge).toHaveAttribute('data-cinematic-navigation-progress', '1')
    expect(document.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
    expect(window.sessionStorage.getItem(cinematicHandoffStorageKey)).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_TOTAL_MS)
    })

    expect(navigationMocks.push).not.toHaveBeenCalled()
  })

  it('cancels a pending carrier route when pathname changes before the router handoff', async () => {
    const bridgeView = renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Arc route' }), { button: 0 })

    expect(document.querySelector('[data-cinematic-handoff-signal]')).not.toBeNull()
    expect(window.sessionStorage.getItem(cinematicHandoffStorageKey)).not.toBeNull()

    navigationMocks.pathname = '/about'
    await act(async () => {
      bridgeView.rerender(bridgeFixture())
    })

    const bridge = document.querySelector('[data-cinematic-navigation]')

    expect(bridge).toHaveAttribute('data-cinematic-navigation-phase', 'idle')
    expect(bridge).toHaveAttribute('data-cinematic-navigation-progress', '1')
    expect(document.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
    expect(window.sessionStorage.getItem(cinematicHandoffStorageKey)).toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_TOTAL_MS)
    })

    expect(navigationMocks.push).not.toHaveBeenCalled()
  })

  it('renders one inert carrier actor with a measurable track, mass, and leading signal', () => {
    renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Arc route' }), { button: 0 })

    const bridge = document.querySelector('[data-cinematic-navigation]')
    const actor = document.querySelector('[data-cinematic-handoff-signal]')

    expect(document.querySelectorAll('[data-cinematic-handoff-signal]')).toHaveLength(1)
    expect(actor).toHaveAttribute('aria-hidden', 'true')
    expect(actor).not.toHaveAttribute('tabindex')
    expect(actor).toHaveAttribute(
      'data-cinematic-handoff-target',
      bridge?.getAttribute('data-cinematic-navigation-target'),
    )
    expect(actor).toHaveAttribute(
      'data-cinematic-handoff-token',
      bridge?.getAttribute('data-cinematic-navigation-token'),
    )
    expect(actor).toHaveAttribute(
      'data-cinematic-handoff-progress',
      bridge?.getAttribute('data-cinematic-navigation-progress'),
    )
    expect(actor?.querySelectorAll('[data-cinematic-carrier-track]')).toHaveLength(1)
    expect(actor?.querySelectorAll('[data-cinematic-carrier-mass]')).toHaveLength(1)
    expect(actor?.querySelectorAll('[data-cinematic-carrier-signal]')).toHaveLength(1)
  })

  it('projects monotonic carrier travel with a mid-timeline mass and transparent endpoints', async () => {
    renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Arc route' }), { button: 0 })

    const start = document.querySelector('[data-cinematic-handoff-signal]')
    const startX = Number(start?.getAttribute('data-cinematic-carrier-x'))

    expect(start).toHaveAttribute('data-cinematic-carrier-opacity', '0')
    expect(start).toHaveAttribute('data-cinematic-carrier-mass-strength', '0')

    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_TOTAL_MS / 2)
    })

    const middle = document.querySelector('[data-cinematic-handoff-signal]')
    const middleX = Number(middle?.getAttribute('data-cinematic-carrier-x'))

    expect(startX).toBeLessThan(middleX)
    expect(middle).toHaveAttribute('data-cinematic-carrier-opacity', '1')
    expect(
      Number(middle?.getAttribute('data-cinematic-carrier-mass-strength')),
    ).toBeGreaterThan(0.99)

    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_TOTAL_MS / 2)
    })

    expect(document.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
  })

  it.each([
    ['home', 'home-beacon'],
    ['arc', 'arc-signal-path'],
    ['rialo', 'rialo-route'],
  ] as const)('maps the %s source to its own carrier direction contract', (scene, direction) => {
    renderBridge(scene)

    fireEvent.click(screen.getByRole('link', { name: 'Arc route' }), { button: 0 })

    expect(document.querySelector('[data-cinematic-handoff-signal]')).toHaveAttribute(
      'data-cinematic-carrier-direction',
      direction,
    )
  })

  it('publishes one continuous 600ms progress token through departure, arrival, and idle', async () => {
    renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Arc route' }), { button: 0 })
    const bridge = document.querySelector('[data-cinematic-navigation]')
    const token = bridge?.getAttribute('data-cinematic-navigation-token')

    expect(bridge).toHaveAttribute('data-cinematic-navigation-phase', 'departing')
    expect(bridge).toHaveAttribute('data-cinematic-navigation-progress', '0')
    expect(token).toBeTruthy()

    await act(async () => {
      vi.advanceTimersByTime(599)
    })

    const finalFrame = Number(bridge?.getAttribute('data-cinematic-navigation-progress'))

    expect(finalFrame).toBeGreaterThan(0)
    expect(finalFrame).toBeLessThan(1)
    expect(bridge).toHaveAttribute('data-cinematic-navigation-phase', 'arriving')
    expect(bridge).toHaveAttribute('data-cinematic-navigation-token', token)
    expect(navigationMocks.push).toHaveBeenCalledTimes(1)
    expect(navigationMocks.push).toHaveBeenCalledWith('/arc')

    await act(async () => {
      vi.advanceTimersByTime(1)
    })

    expect(bridge).toHaveAttribute('data-cinematic-navigation-phase', 'idle')
    expect(bridge).toHaveAttribute('data-cinematic-navigation-progress', '1')
    expect(bridge).toHaveAttribute('data-cinematic-navigation-token', token)
    expect(navigationMocks.push).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
  })

  it('resumes detail arrival with the same carrier token, target, direction, and elapsed progress', async () => {
    const { unmount } = renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Signal case file' }), { button: 0 })
    const bridge = document.querySelector('[data-cinematic-navigation]')
    const token = bridge?.getAttribute('data-cinematic-navigation-token')

    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_DEPART_MS)
    })
    const sourceProgress = Number(
      bridge?.getAttribute('data-cinematic-navigation-progress'),
    )

    unmount()
    navigationMocks.pathname = '/arc/signal-ledger'
    const arrival = render(
      <CinematicDetailArrival destination="/arc/signal-ledger" motif="ledger" />,
    )

    const arrivalRoot = arrival.container.querySelector('[data-case-arrival]')
    const carrier = arrival.container.querySelector('[data-cinematic-handoff-signal]')
    const initialProgress = Number(
      arrivalRoot?.getAttribute('data-case-arrival-progress'),
    )

    expect(Number(token)).toBeGreaterThan(0)
    expect(arrivalRoot).toHaveAttribute('data-case-arrival', 'entering')
    expect(arrivalRoot).toHaveAttribute('data-cinematic-navigation-phase', 'arriving')
    expect(arrivalRoot).toHaveAttribute('data-cinematic-navigation-token', token)
    expect(initialProgress).toBeGreaterThanOrEqual(sourceProgress)
    expect(initialProgress).toBeLessThan(1)
    expect(
      arrival.container.querySelectorAll('[data-cinematic-handoff-signal]'),
    ).toHaveLength(1)
    expect(carrier).toHaveAttribute(
      'data-cinematic-handoff-destination',
      '/arc/signal-ledger',
    )
    expect(carrier).toHaveAttribute('data-cinematic-handoff-token', token)
    expect(carrier).toHaveAttribute(
      'data-cinematic-handoff-target',
      'project:signal-ledger',
    )
    expect(carrier).toHaveAttribute('data-cinematic-carrier-direction', 'home-beacon')
    expect(carrier).toHaveAttribute('data-project-motif', 'ledger')

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    const progressedArrival = Number(
      arrivalRoot?.getAttribute('data-case-arrival-progress'),
    )

    expect(arrivalRoot).toHaveAttribute('data-case-arrival', 'entering')
    expect(arrivalRoot).toHaveAttribute('data-cinematic-navigation-phase', 'arriving')
    expect(arrivalRoot).toHaveAttribute('data-cinematic-navigation-token', token)
    expect(progressedArrival).toBeGreaterThanOrEqual(initialProgress)
    expect(progressedArrival).toBeLessThan(1)
    expect(carrier).toHaveAttribute('data-cinematic-handoff-token', token)
    expect(carrier).toHaveAttribute(
      'data-cinematic-handoff-target',
      'project:signal-ledger',
    )
    expect(carrier).toHaveAttribute('data-cinematic-carrier-direction', 'home-beacon')
    expect(carrier).toHaveAttribute('data-project-motif', 'ledger')

    await act(async () => {
      vi.advanceTimersByTime(530)
    })

    expect(arrivalRoot).toHaveAttribute('data-case-arrival', 'settled')
    expect(arrivalRoot).toHaveAttribute('data-case-arrival-progress', '1')
    expect(arrivalRoot).toHaveAttribute('data-cinematic-navigation-phase', 'idle')
    expect(arrivalRoot).toHaveAttribute('data-cinematic-navigation-progress', '1')
    expect(arrivalRoot).toHaveAttribute('data-cinematic-navigation-token', token)
    expect(arrival.container.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
  })

  it('keeps the one-shot detail carrier available across a StrictMode effect replay', async () => {
    const bridge = renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Signal case file' }), { button: 0 })
    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_DEPART_MS)
    })
    bridge.unmount()
    navigationMocks.pathname = '/arc/signal-ledger'

    const arrival = render(
      <StrictMode>
        <CinematicDetailArrival destination="/arc/signal-ledger" motif="ledger" />
      </StrictMode>,
    )

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    expect(arrival.container.querySelector('[data-cinematic-handoff-signal]')).not.toBeNull()
    expect(arrival.container.querySelector('[data-case-arrival]')).toHaveAttribute(
      'data-case-arrival',
      'entering',
    )
  })

  it('settles detail arrival and clears the matching handoff when the document becomes hidden', async () => {
    const bridge = renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Signal case file' }), { button: 0 })
    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_DEPART_MS)
    })
    bridge.unmount()
    navigationMocks.pathname = '/arc/signal-ledger'

    const arrival = render(
      <CinematicDetailArrival destination="/arc/signal-ledger" motif="ledger" />,
    )

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    expect(arrival.container.querySelector('[data-cinematic-handoff-signal]')).not.toBeNull()
    expect(window.sessionStorage.getItem(cinematicHandoffStorageKey)).not.toBeNull()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    const arrivalRoot = arrival.container.querySelector('[data-case-arrival]')

    expect(arrivalRoot).toHaveAttribute('data-case-arrival', 'settled')
    expect(arrivalRoot).toHaveAttribute('data-case-arrival-progress', '1')
    expect(arrivalRoot).toHaveAttribute('data-cinematic-navigation-phase', 'idle')
    expect(arrival.container.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
    expect(window.sessionStorage.getItem(cinematicHandoffStorageKey)).toBeNull()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
  })

  it('clears a detail handoff on true unmount without replaying stale arrival', async () => {
    const bridge = renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Signal case file' }), { button: 0 })
    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_DEPART_MS)
    })
    bridge.unmount()
    navigationMocks.pathname = '/arc/signal-ledger'

    const arrival = render(
      <CinematicDetailArrival destination="/arc/signal-ledger" motif="ledger" />,
    )

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    expect(arrival.container.querySelector('[data-cinematic-handoff-signal]')).not.toBeNull()

    arrival.unmount()
    await act(async () => {})

    expect(window.sessionStorage.getItem(cinematicHandoffStorageKey)).toBeNull()

    const replay = render(
      <CinematicDetailArrival destination="/arc/signal-ledger" motif="ledger" />,
    )

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    expect(replay.container.querySelector('[data-case-arrival]')).toHaveAttribute(
      'data-case-arrival',
      'settled',
    )
    expect(replay.container.querySelector('[data-cinematic-navigation-token]')).toHaveAttribute(
      'data-cinematic-navigation-token',
      '0',
    )
    expect(replay.container.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
  })

  it('renders direct detail loads in a static settled state without replaying the veil', () => {
    navigationMocks.pathname = '/arc/signal-ledger'
    const { container } = render(
      <CinematicDetailArrival destination="/arc/signal-ledger" motif="ledger" />,
    )
    const arrival = container.querySelector('[data-case-arrival]')

    expect(arrival).toHaveAttribute('data-case-arrival', 'settled')
    expect(arrival).toHaveAttribute('data-case-arrival-progress', '1')
    expect(arrival).toHaveAttribute('data-cinematic-navigation-phase', 'idle')
    expect(arrival).toHaveAttribute('data-cinematic-navigation-progress', '1')
    expect(container.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
  })

  it('clears a consumed carrier token when the detail component receives a direct destination', async () => {
    const bridge = renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Signal case file' }), { button: 0 })
    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_DEPART_MS)
    })
    bridge.unmount()
    const arrival = render(
      <CinematicDetailArrival destination="/arc/signal-ledger" motif="ledger" />,
    )

    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_TOTAL_MS)
    })
    expect(arrival.container.querySelector('[data-case-arrival]')).not.toHaveAttribute(
      'data-cinematic-navigation-token',
      '0',
    )

    arrival.rerender(
      <CinematicDetailArrival destination="/arc/hadron" motif="market" />,
    )

    expect(arrival.container.querySelector('[data-case-arrival]')).toHaveAttribute(
      'data-cinematic-navigation-token',
      '0',
    )
    expect(arrival.container.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
  })

  it('rejects and consumes an expired detail handoff instead of replaying stale motion', async () => {
    const bridge = renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Signal case file' }), { button: 0 })
    await act(async () => {
      vi.advanceTimersByTime(CINEMATIC_HANDOFF_DEPART_MS)
    })
    bridge.unmount()
    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    const arrival = render(
      <CinematicDetailArrival destination="/arc/signal-ledger" motif="ledger" />,
    )

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    const arrivalRoot = arrival.container.querySelector('[data-case-arrival]')

    expect(arrivalRoot).toHaveAttribute('data-case-arrival', 'settled')
    expect(arrivalRoot).toHaveAttribute('data-case-arrival-progress', '1')
    expect(arrivalRoot).toHaveAttribute('data-cinematic-navigation-token', '0')
    expect(arrival.container.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
  })

  it('completes a prevented navigation and settles its timeline when the document becomes hidden', () => {
    renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Arc route' }), { button: 0 })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    const bridge = document.querySelector('[data-cinematic-navigation]')

    expect(navigationMocks.push).toHaveBeenCalledTimes(1)
    expect(navigationMocks.push).toHaveBeenCalledWith('/arc')
    expect(bridge).toHaveAttribute('data-cinematic-navigation-phase', 'idle')
    expect(bridge).toHaveAttribute('data-cinematic-navigation-progress', '1')
    expect(document.querySelector('[data-cinematic-handoff-signal]')).toBeNull()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
  })

  it('preserves modified, middle, target, download, external, and hash-only native semantics', () => {
    renderBridge()
    const arc = screen.getByRole('link', { name: 'Arc route' })

    fireEvent.click(arc, { button: 1 })
    fireEvent.click(arc, { button: 0, metaKey: true })
    fireEvent.click(arc, { button: 0, ctrlKey: true })
    fireEvent.click(arc, { button: 0, shiftKey: true })
    fireEvent.click(arc, { altKey: true, button: 0 })
    fireEvent.click(screen.getByRole('link', { name: 'New tab' }), { button: 0 })
    fireEvent.click(screen.getByRole('link', { name: 'Download' }), { button: 0 })
    fireEvent.click(screen.getByRole('link', { name: 'External' }), { button: 0 })
    fireEvent.click(screen.getByRole('link', { name: 'Hash only' }), { button: 0 })
    fireEvent.click(screen.getByRole('link', { name: 'Content note' }), { button: 0 })
    fireEvent.click(screen.getByRole('link', { name: 'Global about' }), { button: 0 })

    expect(navigationMocks.push).not.toHaveBeenCalled()
    expect(document.querySelector('[data-cinematic-navigation]')).toHaveAttribute(
      'data-cinematic-navigation-phase',
      'idle',
    )
    expect(document.querySelector('[data-cinematic-handoff-signal]')).toBeNull()
  })

  it('uses one transparent local carrier CSS contract without either legacy full-screen veil', () => {
    const shellCss = readFileSync(
      join(process.cwd(), 'src/components/scene/universe-shell.module.css'),
      'utf8',
    )
    const projectCss = readFileSync(
      join(process.cwd(), 'src/components/project/project-case-study.module.css'),
      'utf8',
    )
    const carrierCssPath = join(
      process.cwd(),
      'src/components/scene/cinematic-navigation-bridge.module.css',
    )
    const carrierCss = existsSync(carrierCssPath)
      ? readFileSync(carrierCssPath, 'utf8')
      : ''
    const bridgeSource = readFileSync(
      join(process.cwd(), 'src/components/scene/cinematic-navigation-bridge.client.tsx'),
      'utf8',
    )
    const projectSource = readFileSync(
      join(process.cwd(), 'src/components/project/project-case-study.tsx'),
      'utf8',
    )
    const changedCss = `${shellCss}\n${projectCss}\n${carrierCss}`

    expect(carrierCss).not.toBe('')
    expect(shellCss).not.toMatch(/\.contentLayer::before/)
    expect(projectCss).not.toMatch(/\.handoffVeil/)
    expect(projectCss).not.toMatch(/case-hero-enter/)
    expect(projectSource).not.toMatch(/veilClassName/)
    expect(bridgeSource).not.toMatch(/veilClassName/)
    expect(changedCss).not.toMatch(
      /(?:backdrop-filter|mix-blend-mode|\bfilter\s*:|\binfinite\b)/,
    )
    expect(carrierCss).toMatch(/\.carrierRoot\s*\{[\s\S]*?background:\s*transparent;/)
    expect(carrierCss).toMatch(/\.carrierRoot\s*\{[\s\S]*?inset:\s*0;/)
    expect(carrierCss).toMatch(/\.carrierRoot\s*\{[\s\S]*?pointer-events:\s*none;/)
    expect(carrierCss).toMatch(/\.carrierRoot\s*\{[\s\S]*?position:\s*fixed;/)
    expect(carrierCss).not.toMatch(/\banimation(?:-name)?\s*:/)
    expect(carrierCss).not.toMatch(/calc\([^;\n{}]*\*/)
    expect(carrierCss).toContain(
      'opacity: var(--cinematic-carrier-mass-opacity);',
    )
    expect(carrierCss).toContain(
      'scaleX(var(--cinematic-carrier-mass-scale))',
    )
    expect(carrierCss).toContain('[data-cinematic-carrier-direction="home-beacon"]')
    expect(carrierCss).toContain('[data-cinematic-carrier-direction="arc-signal-path"]')
    expect(carrierCss).toContain('[data-cinematic-carrier-direction="rialo-route"]')
    expect(CINEMATIC_HANDOFF_TOTAL_MS).toBe(600)
    expect(CINEMATIC_HANDOFF_DEPART_MS).toBe(120)
  })

  it('does not delay reduced motion and cancels a pending source handoff on true unmount', () => {
    setReducedMotion(true)
    const { unmount } = renderBridge()

    fireEvent.click(screen.getByRole('link', { name: 'Arc route' }), { button: 0 })

    expect(navigationMocks.push).toHaveBeenCalledWith('/arc')
    expect(document.querySelector('[data-cinematic-navigation]')).toHaveAttribute(
      'data-cinematic-navigation-phase',
      'settled',
    )
    expect(document.querySelector('[data-cinematic-handoff-signal]')).toBeNull()

    navigationMocks.push.mockReset()
    setReducedMotion(false)
    fireEvent.click(screen.getByRole('link', { name: 'Rialo route' }), { button: 0 })
    unmount()
    act(() => {
      vi.runAllTimers()
    })

    expect(navigationMocks.push).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(cinematicHandoffStorageKey)).toBeNull()
  })
})
