import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'

import HomePage from '../../app/(immersive)/page'
import EcosystemPage from '../../app/(immersive)/[ecosystem]/page'

async function renderRialoPage() {
  return render(
    await EcosystemPage({
      params: Promise.resolve({ ecosystem: 'rialo' }),
    }),
  )
}

describe('RialoInstrumentStage', () => {
  it('makes the five-stage loop the route instrument without a duplicate project index', async () => {
    const { container } = await renderRialoPage()
    const main = container.querySelector('main')
    const stage = container.querySelector('[data-instrument-stage="rialo"]')
    const projectIndex = container.querySelector('#project-index')

    expect(main).not.toBeNull()
    expect(stage).not.toBeNull()
    expect(projectIndex).toBeNull()
    expect(within(stage as HTMLElement).getAllByRole('button')).toHaveLength(5)
    expect(within(stage as HTMLElement).getByRole('heading', { level: 1, name: 'Rialo' })).toBeInTheDocument()
  })

  it('runs every committed signal through one finite 780ms active-to-settled progression', async () => {
    vi.useFakeTimers()
    const { container } = await renderRialoPage()
    const stage = container.querySelector('[data-instrument-stage="rialo"]')
    const signals = ['observe', 'cover', 'trigger', 'settle', 'explain'] as const

    for (const signal of signals) {
      fireEvent.click(
        within(stage as HTMLElement).getByRole('button', {
          name: new RegExp(signal, 'i'),
        }),
      )

      expect(stage).toHaveAttribute('data-rialo-event', signal)
      expect(stage).toHaveAttribute('data-rialo-event-phase', 'active')
      expect(stage).toHaveAttribute('data-rialo-event-progress', '0')

      act(() => {
        vi.advanceTimersByTime(390)
      })

      const midpoint = Number(stage?.getAttribute('data-rialo-event-progress'))

      expect(midpoint).toBeGreaterThan(0)
      expect(midpoint).toBeLessThan(1)
      expect(stage).toHaveAttribute('data-rialo-event-phase', 'active')

      act(() => {
        vi.advanceTimersByTime(390)
      })

      expect(stage).toHaveAttribute('data-rialo-event', signal)
      expect(stage).toHaveAttribute('data-rialo-event-phase', 'settled')
      expect(stage).toHaveAttribute('data-rialo-event-progress', '1')
    }

    fireEvent.click(
      within(stage as HTMLElement).getByRole('button', {
        name: /cover/i,
      }),
    )
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(stage).toHaveAttribute('data-rialo-event', 'cover')
    expect(stage).toHaveAttribute('data-rialo-event-phase', 'settled')
    expect(stage).toHaveAttribute('data-rialo-event-progress', '1')
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })

    const css = readFileSync(
      join(process.cwd(), 'src/components/rialo/rialo-reactive-loop.module.css'),
      'utf8',
    )

    expect(css).not.toContain('1180ms')
    expect(css).toMatch(/animation:\s*trigger-node-jump 780ms/)
    cleanup()
    vi.useRealTimers()
  })

  it('gives both corridor planes distinct finite endpoints across every committed signal', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/rialo/rialo-reactive-loop.module.css'),
      'utf8',
    )
    const signals = ['observe', 'cover', 'trigger', 'settle', 'explain'] as const
    const primaryEndpoints = signals.map(
      (signal) =>
        css.match(
          new RegExp(
            `\\.radar\\[data-rialo-active-signal='${signal}'\\] \\.corridorPlane\\s*\\{([^}]+)\\}`,
          ),
        )?.[1] ?? '',
    )
    const secondaryEndpoints = signals.map(
      (signal) =>
        css.match(
          new RegExp(
            `\\.radar\\[data-rialo-active-signal='${signal}'\\] \\.corridorPlane:nth-child\\(2\\)\\s*\\{([^}]+)\\}`,
          ),
        )?.[1] ?? '',
    )
    const enhancedTransition = css.match(
      /@media \(prefers-reduced-motion: no-preference\) and \(min-width: 769px\)[\s\S]*?\.corridorPlane\s*\{([^}]+)\}/,
    )?.[1] ?? ''
    const reducedMotionRule = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.field \*::after\s*\{([^}]+)\}/,
    )?.[1] ?? ''

    for (const endpoint of [...primaryEndpoints, ...secondaryEndpoints]) {
      expect(endpoint).toMatch(/transform:/)
    }
    expect(new Set(primaryEndpoints)).toHaveProperty('size', signals.length)
    expect(new Set(secondaryEndpoints)).toHaveProperty('size', signals.length)
    expect(enhancedTransition).toMatch(
      /transform var\(--duration-scene-morph\) var\(--ease-in-out\)/,
    )
    expect(css).toMatch(/animation:\s*trigger-node-jump 780ms/)
    expect(css).toMatch(
      /\.radar\[data-rialo-active-signal='trigger'\]\[data-rialo-event-phase='active'\] \.radarNode\[data-radar-node='trigger'\]/,
    )
    expect(reducedMotionRule).toContain('transition: none !important;')
  })

  it('compresses route identity copy without hiding or changing the required headings', async () => {
    const home = render(<HomePage />)

    expect(home.container.querySelectorAll('[data-testid="home-headline-line"]')).toHaveLength(0)
    expect(screen.queryByText('Two ecosystems · four live products')).not.toBeInTheDocument()
    home.unmount()

    const arc = render(
      await EcosystemPage({
        params: Promise.resolve({ ecosystem: 'arc' }),
      }),
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Arc' })).toBeVisible()
    expect(screen.queryByText('One chain. Three ways to read value.')).not.toBeInTheDocument()
    arc.unmount()

    await renderRialoPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Rialo' })).toBeVisible()
    expect(screen.queryByText('The sky changes. The policy reacts.')).not.toBeInTheDocument()
  })
})
