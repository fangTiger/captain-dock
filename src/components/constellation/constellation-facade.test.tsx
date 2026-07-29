import { cleanup, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'

import HomePage from '../../app/(immersive)/page'
import { ecosystems, projects } from '../../content/catalog'

function installReducedMotion(reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: reducedMotion,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })),
  })
}

beforeEach(() => {
  installReducedMotion(false)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ConstellationFacade', () => {
  it('wires the home route to one CAPTAIN DOCK door without project copy or the old stage', () => {
    const { container } = render(<HomePage />)
    const main = container.querySelector('main#main-content')
    const facade = container.querySelector('[data-constellation-facade]')
    const door = container.querySelector('[data-constellation-door]')

    expect(main).not.toBeNull()
    expect(facade).not.toBeNull()
    expect(container.querySelector('[data-instrument-stage="home"]')).toBeNull()
    expect(
      screen.getByRole('heading', { level: 1, name: 'CAPTAIN DOCK' }),
    ).toBeInTheDocument()
    expect(door).toHaveTextContent("A universe of things I've built.")
    expect(main?.querySelector('script[type="application/ld+json"]')).not.toBeNull()

    for (const project of projects) {
      expect(door).not.toHaveTextContent(project.name)
      expect(door).not.toHaveTextContent(project.tagline)
      expect(door).not.toHaveTextContent(project.statement)
    }
  })

  it('keeps four project and two ecosystem hrefs in semantic and noscript fallbacks', () => {
    const { container } = render(<HomePage />)
    const navigation = container.querySelector(
      'nav[aria-label="Constellation project and ecosystem links"]',
    )
    const links = navigation?.querySelectorAll('a') ?? []
    const markup = renderToStaticMarkup(<HomePage />)

    expect(navigation).not.toBeNull()
    expect(links).toHaveLength(6)
    expect(markup).toContain('<noscript>')

    for (const project of projects) {
      const href = `/${project.ecosystem}/${project.slug}`

      expect(navigation?.querySelector(`a[href="${href}"]`)).not.toBeNull()
      expect(markup).toContain(`href="${href}"`)
    }

    for (const ecosystem of ecosystems) {
      const href = `/${ecosystem.slug}`

      expect(navigation?.querySelector(`a[href="${href}"]`)).not.toBeNull()
      expect(markup).toContain(`href="${href}"`)
    }
  })

  it('settles wordmark and cursor without starting RAF under reduced motion', () => {
    cleanup()
    vi.restoreAllMocks()
    installReducedMotion(true)
    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)

    const { container } = render(<HomePage />)
    const facade = container.querySelector('[data-constellation-facade]')
    const cursor = container.querySelector('[data-constellation-cursor]')

    expect(facade).toHaveAttribute('data-motion', 'static')
    expect(cursor).not.toBeNull()
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})
