import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'

import { CapabilityGate, type CapabilityGateRenderProps } from './capability-gate.client'
import { SceneErrorBoundary } from './scene-error-boundary.client'
import { StaticUniverseFallback } from './static-universe-fallback'

type MockMediaQueryList = MediaQueryList & {
  dispatch: (matches: boolean) => void
  listenerCount: () => number
}

type BrowserMockOptions = {
  width: number
  reducedMotion?: boolean
  saveData?: boolean
  webgl2?: boolean
}

const originalCreateElement = document.createElement.bind(document)
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

function createMediaQueryList(initialMatches: boolean): MockMediaQueryList {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const legacyListeners = new Set<(event: MediaQueryListEvent) => void>()
  let matches = initialMatches

  return {
    get matches() {
      return matches
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
      if (listener) {
        listeners.add(listener as (event: MediaQueryListEvent) => void)
      }
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
      if (listener) {
        listeners.delete(listener as (event: MediaQueryListEvent) => void)
      }
    },
    addListener: (listener) => {
      if (listener) {
        legacyListeners.add(listener)
      }
    },
    removeListener: (listener) => {
      if (listener) {
        legacyListeners.delete(listener)
      }
    },
    dispatchEvent: () => true,
    dispatch(nextMatches: boolean) {
      matches = nextMatches
      const event = { matches, media: '(prefers-reduced-motion: reduce)' } as MediaQueryListEvent

      for (const listener of listeners) {
        listener(event)
      }

      for (const listener of legacyListeners) {
        listener(event)
      }
    },
    listenerCount: () => listeners.size + legacyListeners.size,
  }
}

function installBrowserMocks(options: BrowserMockOptions) {
  const mediaQueryList = createMediaQueryList(Boolean(options.reducedMotion))
  const connectionListeners = new Set<EventListenerOrEventListenerObject>()
  const loseContext = vi.fn()
  const getContext = vi.fn((contextId: string) =>
    options.webgl2 && contextId === 'webgl2'
      ? {
          getExtension: vi.fn((extension: string) =>
            extension === 'WEBGL_lose_context' ? { loseContext } : null,
          ),
        }
      : null,
  )
  const createElement = vi.spyOn(document, 'createElement')

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: options.width,
  })

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => mediaQueryList),
  })

  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: {
      saveData: Boolean(options.saveData),
      addEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject | null) => {
        if (listener) {
          connectionListeners.add(listener)
        }
      }),
      removeEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject | null) => {
        if (listener) {
          connectionListeners.delete(listener)
        }
      }),
    },
  })

  createElement.mockImplementation((tagName: string, optionsArg?: ElementCreationOptions) => {
    if (tagName.toLowerCase() !== 'canvas') {
      return originalCreateElement(tagName, optionsArg)
    }

    return {
      getContext,
    } as unknown as HTMLElement
  })

  return {
    createElement,
    getContext,
    loseContext,
    mediaQueryList,
    setWidth(width: number) {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
      })
    },
    dispatchConnectionChange() {
      const event = new Event('change')

      for (const listener of connectionListeners) {
        if (typeof listener === 'function') {
          listener(event)
        } else {
          listener.handleEvent(event)
        }
      }
    },
    canvasProbeCount() {
      return createElement.mock.calls.filter(([tagName]) => tagName.toLowerCase() === 'canvas')
        .length
    },
  }
}

function EnhancedProbe({ quality, reportReady, reportFailure, degrade }: CapabilityGateRenderProps) {
  return (
    <section aria-label="Enhanced universe" data-testid="enhanced-universe">
      <span data-testid="enhanced-quality">{quality}</span>
      <button type="button" onClick={reportReady}>
        ready
      </button>
      <button type="button" onClick={() => reportFailure(new Error('scene failed'))}>
        fail
      </button>
      <button type="button" onClick={degrade}>
        degrade
      </button>
    </section>
  )
}

function renderGate(userPreference: 'auto' | 'high' | 'medium' | 'low' | 'static' = 'auto') {
  return render(
    <CapabilityGate
      fallback={<div data-testid="scene-fallback">Static scene</div>}
      userPreference={userPreference}
      renderEnhanced={(props) => <EnhancedProbe {...props} />}
    />,
  )
}

function renderHomeGate() {
  return render(
    <CapabilityGate
      fallback={<StaticUniverseFallback scene="home" />}
      renderEnhanced={(props) => <EnhancedProbe {...props} />}
    />,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('StaticUniverseFallback', () => {
  it('renders a static home constellation with two ecosystem clusters, four unnamed nodes, and no links or canvas', () => {
    const { container } = render(<StaticUniverseFallback scene="home" />)
    const figure = screen.getByRole('img', { name: /deep-space project constellation/i })
    const svg = container.querySelector('svg')

    expect(figure).toHaveAttribute('data-static-scene', 'home')
    expect(within(figure).getByText(/two ecosystem clusters/i)).toBeInTheDocument()
    expect(container.querySelectorAll('[data-constellation-cluster]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-constellation-node]')).toHaveLength(4)
    expect(container.querySelector('svg text')).toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
  })

  it('uses the effective target only as a decorative static highlight', () => {
    const { container } = render(
      <StaticUniverseFallback
        scene="home"
        target={{ kind: 'project', project: 'hadron' }}
      />,
    )
    const figure = screen.getByRole('img', { name: /deep-space project constellation/i })
    const activeNode = container.querySelector('[data-constellation-node="hadron"]')

    expect(figure).toHaveAttribute('data-static-target', 'project:hadron')
    expect(activeNode).toHaveAttribute('data-active', 'true')
    expect(activeNode?.closest('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('[aria-live]')).toBeNull()
    expect(container.querySelector('[aria-current]')).toBeNull()
    expect(container.querySelector('[aria-pressed]')).toBeNull()
  })

  it('renders an Arc orbital circuit with ledger, market, and probability signals', () => {
    const { container } = render(<StaticUniverseFallback scene="arc" />)
    const figure = screen.getByRole('img', { name: /arc orbital circuit/i })

    expect(figure).toHaveAttribute('data-static-scene', 'arc')
    expect(container.querySelector('[data-arc-signal="ledger"]')).not.toBeNull()
    expect(container.querySelector('[data-arc-signal="market"]')).not.toBeNull()
    expect(container.querySelector('[data-arc-signal="probability"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-orbit-ring]')).toHaveLength(3)
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
  })

  it('renders a Rialo reactive radar with routes and five readable nodes', () => {
    const { container } = render(<StaticUniverseFallback scene="rialo" />)
    const figure = screen.getByRole('img', { name: /rialo reactive radar/i })

    expect(figure).toHaveAttribute('data-static-scene', 'rialo')
    expect(container.querySelectorAll('[data-rialo-route]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-rialo-node]')).toHaveLength(5)
    expect(within(figure).getAllByText(/observe/i).length).toBeGreaterThan(0)
    expect(within(figure).getAllByText(/explain/i).length).toBeGreaterThan(0)
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('a')).toBeNull()
  })

  it('anchors active Rialo circle selectors to the existing local node classes', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/scene/static-universe-fallback.module.css'),
      'utf8',
    )

    expect.soft(css).not.toMatch(
      /\[data-rialo-node\]\[data-active=['"]true['"]\]\s*>\s*circle/,
    )
    expect.soft(css).toMatch(
      /\[data-rialo-node\]\[data-active=['"]true['"]\]\s*>\s*\.nodePrimary/,
    )
    expect.soft(css).toMatch(
      /\[data-rialo-node\]\[data-active=['"]true['"]\]\s*>\s*\.nodeSecondary/,
    )
  })

  it('disables fallback transitions under reduced motion without removing the active filter highlight', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/scene/static-universe-fallback.module.css'),
      'utf8',
    )

    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.figure,\s*\.figure \*\s*\{[\s\S]*?transition-property:\s*none\s*!important;/,
    )
    expect(css).toContain(
      'filter: drop-shadow(0 0 10px color-mix(in srgb, var(--scene-accent-b) 54%, transparent));',
    )
  })

  it('fails fast for runtime scene values outside the strict union', () => {
    expect(() =>
      render(<StaticUniverseFallback scene={'unknown' as Parameters<typeof StaticUniverseFallback>[0]['scene']} />),
    ).toThrow('Unknown static universe scene: unknown')
  })
})

describe('CapabilityGate', () => {
  it('server-renders only the fallback without browser access or enhanced content', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      get: () => {
        throw new Error('window should not be read during render')
      },
    })
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      get: () => {
        throw new Error('document should not be read during render')
      },
    })
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      get: () => {
        throw new Error('navigator should not be read during render')
      },
    })

    try {
      const html = renderToString(
        <CapabilityGate
          fallback={<div data-testid="ssr-fallback">SSR fallback</div>}
          renderEnhanced={() => <div>Enhanced content</div>}
        />,
      )

      expect(html).toContain('SSR fallback')
      expect(html).not.toContain('Enhanced content')
    } finally {
      if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, 'window', originalWindowDescriptor)
      }

      if (originalDocumentDescriptor) {
        Object.defineProperty(globalThis, 'document', originalDocumentDescriptor)
      }

      if (originalNavigatorDescriptor) {
        Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor)
      }
    }
  })

  it('short-circuits reduced motion and saveData to static without probing WebGL', async () => {
    const reducedMocks = installBrowserMocks({
      width: 1440,
      reducedMotion: true,
      saveData: false,
      webgl2: true,
    })

    renderGate()

    await waitFor(() => expect(reducedMocks.mediaQueryList.listenerCount()).toBe(1))
    expect(screen.getByTestId('scene-fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('enhanced-universe')).not.toBeInTheDocument()
    expect(reducedMocks.canvasProbeCount()).toBe(0)

    cleanup()
    vi.restoreAllMocks()

    const saveDataMocks = installBrowserMocks({
      width: 1440,
      reducedMotion: false,
      saveData: true,
      webgl2: true,
    })

    renderGate()

    await waitFor(() => expect(saveDataMocks.mediaQueryList.listenerCount()).toBe(1))
    expect(screen.getByTestId('scene-fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('enhanced-universe')).not.toBeInTheDocument()
    expect(saveDataMocks.canvasProbeCount()).toBe(0)
  })

  it('keeps the home constellation static under reduced motion without probing WebGL', async () => {
    const mocks = installBrowserMocks({
      width: 1440,
      reducedMotion: true,
      saveData: false,
      webgl2: true,
    })

    renderHomeGate()

    await waitFor(() => expect(mocks.mediaQueryList.listenerCount()).toBe(1))
    expect(
      screen.getByRole('img', { name: /deep-space project constellation/i }),
    ).toHaveAttribute('data-static-scene', 'home')
    expect(screen.queryByTestId('enhanced-universe')).not.toBeInTheDocument()
    expect(mocks.canvasProbeCount()).toBe(0)
  })

  it('probes WebGL2 once off-DOM, releases the temporary context, and chooses quality by width with user caps', async () => {
    const desktopMocks = installBrowserMocks({ width: 1440, webgl2: true })

    renderGate()

    expect(screen.getByTestId('scene-fallback')).toBeInTheDocument()
    await screen.findByTestId('enhanced-universe')
    expect(screen.getByTestId('enhanced-quality')).toHaveTextContent('high')
    expect(screen.getByTestId('scene-fallback')).toBeInTheDocument()
    expect(desktopMocks.canvasProbeCount()).toBe(1)
    expect(desktopMocks.getContext).toHaveBeenCalledOnce()
    expect(desktopMocks.getContext).toHaveBeenCalledWith('webgl2')
    expect(desktopMocks.loseContext).toHaveBeenCalledOnce()
    expect(document.querySelector('canvas')).toBeNull()

    cleanup()
    vi.restoreAllMocks()

    installBrowserMocks({ width: 375, webgl2: true })
    renderGate()
    await screen.findByTestId('enhanced-universe')
    expect(screen.getByTestId('enhanced-quality')).toHaveTextContent('medium')

    cleanup()
    vi.restoreAllMocks()

    installBrowserMocks({ width: 1440, webgl2: true })
    renderGate('medium')
    await screen.findByTestId('enhanced-universe')
    expect(screen.getByTestId('enhanced-quality')).toHaveTextContent('medium')

    cleanup()
    vi.restoreAllMocks()

    installBrowserMocks({ width: 1440, webgl2: true })
    renderGate('low')
    await screen.findByTestId('enhanced-universe')
    expect(screen.getByTestId('enhanced-quality')).toHaveTextContent('low')
  })

  it('fails closed after one unavailable WebGL2 probe without mounting enhanced content', async () => {
    const mocks = installBrowserMocks({ width: 1440, webgl2: false })

    renderGate()

    await waitFor(() => expect(mocks.canvasProbeCount()).toBe(1))
    expect(mocks.getContext).toHaveBeenCalledOnce()
    expect(mocks.getContext).toHaveBeenCalledWith('webgl2')
    expect(mocks.loseContext).not.toHaveBeenCalled()
    expect(screen.getByTestId('scene-fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('enhanced-universe')).not.toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('uses the static home constellation when WebGL2 is unavailable', async () => {
    const mocks = installBrowserMocks({ width: 1440, webgl2: false })

    renderHomeGate()

    await waitFor(() => expect(mocks.canvasProbeCount()).toBe(1))
    expect(
      screen.getByRole('img', { name: /deep-space project constellation/i }),
    ).toHaveAttribute('data-static-scene', 'home')
    expect(screen.queryByTestId('enhanced-universe')).not.toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('reuses one probe across StrictMode replay and capability updates, but probes again after a real remount', async () => {
    const mocks = installBrowserMocks({ width: 1440, webgl2: true })
    const renderStrictGate = () =>
      render(
        <StrictMode>
          <CapabilityGate
            fallback={<div data-testid="scene-fallback">Static scene</div>}
            renderEnhanced={(props) => <EnhancedProbe {...props} />}
          />
        </StrictMode>,
      )
    const firstMount = renderStrictGate()

    await screen.findByTestId('enhanced-universe')
    expect(mocks.canvasProbeCount()).toBe(1)
    expect(mocks.loseContext).toHaveBeenCalledOnce()

    mocks.setWidth(960)
    window.dispatchEvent(new Event('resize'))
    mocks.mediaQueryList.dispatch(false)
    mocks.dispatchConnectionChange()

    await waitFor(() => expect(screen.getByTestId('enhanced-quality')).toHaveTextContent('medium'))
    expect(mocks.canvasProbeCount()).toBe(1)
    expect(mocks.getContext).toHaveBeenCalledOnce()
    expect(mocks.loseContext).toHaveBeenCalledOnce()

    firstMount.unmount()
    renderStrictGate()

    await screen.findByTestId('enhanced-universe')
    expect(mocks.canvasProbeCount()).toBe(2)
    expect(mocks.getContext).toHaveBeenCalledTimes(2)
    expect(mocks.loseContext).toHaveBeenCalledTimes(2)
  })

  it('keeps fallback visible until reportReady, allows runtime degradation, and restores static on failure', async () => {
    const user = userEvent.setup()

    installBrowserMocks({ width: 1440, webgl2: true })
    renderGate()

    await screen.findByTestId('enhanced-universe')
    expect(screen.getByTestId('scene-fallback')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ready' }))
    expect(screen.queryByTestId('scene-fallback')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'degrade' }))
    expect(screen.getByTestId('enhanced-quality')).toHaveTextContent('medium')

    await user.click(screen.getByRole('button', { name: 'fail' }))
    expect(screen.getByTestId('scene-fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('enhanced-universe')).not.toBeInTheDocument()
  })

  it('only keeps or lowers quality after capability and resize updates, and cleans listeners on unmount', async () => {
    const resizeAdd = vi.spyOn(window, 'addEventListener')
    const resizeRemove = vi.spyOn(window, 'removeEventListener')
    const mocks = installBrowserMocks({ width: 375, reducedMotion: false, webgl2: true })
    const { unmount } = renderGate()

    await screen.findByTestId('enhanced-universe')
    expect(screen.getByTestId('enhanced-quality')).toHaveTextContent('medium')
    expect(mocks.mediaQueryList.listenerCount()).toBe(1)

    mocks.setWidth(1440)
    window.dispatchEvent(new Event('resize'))
    await waitFor(() => expect(screen.getByTestId('enhanced-quality')).toHaveTextContent('medium'))

    mocks.mediaQueryList.dispatch(true)
    await waitFor(() => {
      expect(screen.getByTestId('scene-fallback')).toBeInTheDocument()
      expect(screen.queryByTestId('enhanced-universe')).not.toBeInTheDocument()
    })

    unmount()

    expect(resizeAdd).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(resizeRemove).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(mocks.mediaQueryList.listenerCount()).toBe(0)
  })
})

describe('SceneErrorBoundary', () => {
  it('catches child render errors, calls callbacks, and renders the supplied fallback', () => {
    const knownError = new Error('render boom')
    const originalConsoleError = console.error
    const consoleError = vi.spyOn(console, 'error').mockImplementation((...args) => {
      const text = args.map(String).join(' ')

      if (text.includes('render boom')) {
        return
      }

      originalConsoleError(...args)
    })
    const onError = vi.fn()
    const onFailure = vi.fn()
    const ThrowingChild = () => {
      throw knownError
    }

    render(
      <SceneErrorBoundary
        fallback={<div data-testid="boundary-fallback">Static fallback after error</div>}
        onError={onError}
        onFailure={onFailure}
      >
        <ThrowingChild />
      </SceneErrorBoundary>,
    )

    expect(screen.getByTestId('boundary-fallback')).toBeInTheDocument()
    expect(onError).toHaveBeenCalledWith(knownError, expect.objectContaining({ componentStack: expect.any(String) }))
    expect(onFailure).toHaveBeenCalledWith(knownError)
    expect(consoleError).toHaveBeenCalled()
  })
})
