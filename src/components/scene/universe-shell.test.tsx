import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

import type { CapabilityGateRenderProps } from './capability-gate.client'
import { useSceneTargetController } from './scene-target-controller.client'

const shellMocks = vi.hoisted(() => {
  const enhancedProps: CapabilityGateRenderProps = {
    quality: 'medium',
    reportReady: vi.fn(),
    reportFailure: vi.fn(),
    degrade: vi.fn(),
  }

  return {
    pathname: '/',
    gateMode: 'static' as 'static' | 'enhanced',
    dynamicCalls: [] as Array<{ loader: () => Promise<unknown>; options: Record<string, unknown> }>,
    dynamicLoaderCalls: 0,
    dynamicProps: [] as Array<Record<string, unknown>>,
    gateCalls: [] as Array<Record<string, unknown>>,
    routerPush: vi.fn(),
    enhancedProps,
  }
})

vi.mock('next/navigation', () => ({
  usePathname: () => shellMocks.pathname,
  useRouter: () => ({ push: shellMocks.routerPush }),
}))

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>, options: Record<string, unknown>) => {
    shellMocks.dynamicCalls.push({ loader, options })

    return function DynamicCanvasStub(props: Record<string, unknown>) {
      shellMocks.dynamicProps.push(props)

      return (
        <div data-scene={String(props.scene)} data-testid="dynamic-canvas-stub">
          dynamic canvas
        </div>
      )
    }
  },
}))

vi.mock('./capability-gate.client', () => ({
  CapabilityGate: ({
    fallback,
    renderEnhanced,
  }: {
    fallback: ReactNode
    renderEnhanced: (props: CapabilityGateRenderProps) => ReactNode
  }) => {
    shellMocks.gateCalls.push({ fallback, renderEnhanced })

    return (
      <div data-testid="capability-gate">
        {fallback}
        {shellMocks.gateMode === 'enhanced' ? renderEnhanced(shellMocks.enhancedProps) : null}
      </div>
    )
  },
}))

import { UniverseShell } from './universe-shell.client'

function renderShell(children: ReactNode = <main data-testid="page-child">Page</main>) {
  return render(<UniverseShell>{children}</UniverseShell>)
}

function latestDynamicProps() {
  const props = shellMocks.dynamicProps.at(-1)

  if (!props) {
    throw new Error('dynamic canvas props missing')
  }

  return props
}

function getUniverseShell() {
  const shell = document.querySelector('[data-universe-shell]')

  if (!(shell instanceof HTMLElement)) {
    throw new Error('universe shell missing')
  }

  return shell
}

type NativeRootListenerCall = {
  listener: unknown
  target: unknown
  type: string
}

function getNativeRootListenerCalls(spy: ReturnType<typeof vi.spyOn>) {
  return (spy.mock.calls as unknown[][])
    .map((call: unknown[], index: number): NativeRootListenerCall => ({
      listener: call[1],
      target: spy.mock.contexts[index],
      type: String(call[0]),
    }))
    .filter(
      (call: NativeRootListenerCall) =>
        call.target instanceof HTMLElement && call.target.hasAttribute('data-universe-content'),
    )
}

function getNativeRootRemovedListenerCalls(spy: ReturnType<typeof vi.spyOn>) {
  return (spy.mock.calls as unknown[][])
    .map((call: unknown[], index: number): NativeRootListenerCall => ({
      listener: call[1],
      target: spy.mock.contexts[index],
      type: String(call[0]),
    }))
    .filter(
      (call: NativeRootListenerCall) =>
        call.target instanceof HTMLElement && call.target.hasAttribute('data-universe-content'),
    )
}

function renderTargetShell() {
  shellMocks.pathname = '/'
  shellMocks.gateMode = 'enhanced'

  return renderShell(
    <main data-testid="page-child">
      <button data-scene-target="ecosystem:arc" type="button">
        Arc ecosystem marker
      </button>
      <button data-scene-target="ecosystem:rialo" type="button">
        Rialo ecosystem marker
      </button>
      <article data-scene-target="project:signal-ledger">
        <button type="button">Signal case file</button>
        <a href="https://arc-signal-ledger.vercel.app/">Signal live site</a>
      </article>
      <button data-scene-target="rialo-step:cover" type="button">
        Cover step marker
      </button>
      <button data-scene-target="project:not-real" type="button">
        Invalid marker
      </button>
      <button type="button">Plain control</button>
    </main>,
  )
}

function CommitTargetProbe() {
  const { commitTarget, committedTarget } = useSceneTargetController()

  return (
    <main data-testid="page-child">
      <p data-testid="committed-project">
        {committedTarget.kind === 'project' ? committedTarget.project : committedTarget.kind}
      </p>
      <button onClick={() => commitTarget('project:hadron')} type="button">
        Commit HADRON
      </button>
    </main>
  )
}

beforeEach(() => {
  shellMocks.pathname = '/'
  shellMocks.gateMode = 'static'
  shellMocks.dynamicProps.length = 0
  shellMocks.gateCalls.length = 0
  shellMocks.routerPush.mockReset()
  shellMocks.enhancedProps.reportReady = vi.fn()
  shellMocks.enhancedProps.reportFailure = vi.fn()
  shellMocks.enhancedProps.degrade = vi.fn()
})

afterEach(() => {
  cleanup()
})

describe('UniverseShell', () => {
  it('defines the heavy canvas loader once with ssr disabled without executing the loader', () => {
    expect(shellMocks.dynamicCalls).toHaveLength(1)
    expect(shellMocks.dynamicCalls[0].options).toEqual({ ssr: false })
    expect(shellMocks.dynamicLoaderCalls).toBe(0)
  })

  it('fails closed for unknown, about, and detail routes without gate, host, fallback, or canvas stub', () => {
    for (const pathname of ['/about', '/arc/signal-ledger', '/rialo/rialo-captain', '/unknown', '/arc/not-exists']) {
      cleanup()
      shellMocks.pathname = pathname
      shellMocks.gateCalls.length = 0
      shellMocks.dynamicProps.length = 0

      renderShell()

      expect(screen.getByTestId('page-child')).toBeInTheDocument()
      expect(screen.queryByTestId('capability-gate')).not.toBeInTheDocument()
      expect(screen.queryByTestId('dynamic-canvas-stub')).not.toBeInTheDocument()
      expect(document.querySelector('[data-universe-shell]')).toBeNull()
      expect(shellMocks.gateCalls).toHaveLength(0)
      expect(shellMocks.dynamicProps).toHaveLength(0)
    }
  })

  it('renders the matching static fallback inside the shell while static capability is selected', () => {
    shellMocks.pathname = '/arc'
    shellMocks.gateMode = 'static'

    renderShell()

    expect(document.querySelector('[data-universe-shell]')).not.toBeNull()
    expect(document.querySelector('[data-cinematic-navigation]')).toHaveAttribute(
      'data-cinematic-navigation-phase',
      'idle',
    )
    expect(screen.getByTestId('page-child')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /arc orbital circuit/i })).toHaveAttribute('data-static-scene', 'arc')
    expect(screen.queryByTestId('dynamic-canvas-stub')).not.toBeInTheDocument()
  })

  it('passes only enhanced gate callbacks and the selected scene into the dynamic canvas', () => {
    shellMocks.pathname = '/rialo'
    shellMocks.gateMode = 'enhanced'

    renderShell()

    expect(screen.getByTestId('dynamic-canvas-stub')).toHaveAttribute('data-scene', 'rialo')
    expect(shellMocks.dynamicProps).toHaveLength(1)
    expect(shellMocks.dynamicProps[0]).toMatchObject({
      preview: false,
      scene: 'rialo',
      quality: 'medium',
      target: { kind: 'rialo-step', step: 'observe' },
      degrade: expect.any(Function),
      reportFailure: expect.any(Function),
      reportReady: expect.any(Function),
    })
  })

  it('delegates only four native target events from the content root and cleans them up', () => {
    const addListener = vi.spyOn(Element.prototype, 'addEventListener')
    const removeListener = vi.spyOn(Element.prototype, 'removeEventListener')
    const { unmount } = renderTargetShell()

    const rootListenerCalls = getNativeRootListenerCalls(addListener)

    expect(rootListenerCalls.map((call) => call.type).sort()).toEqual([
      'focusin',
      'focusout',
      'pointerout',
      'pointerover',
    ])

    unmount()

    const removedRootListeners = getNativeRootRemovedListenerCalls(removeListener)

    expect(removedRootListeners).toHaveLength(4)
    expect(removedRootListeners.map((call) => call.type).sort()).toEqual([
      'focusin',
      'focusout',
      'pointerout',
      'pointerover',
    ])
    for (const installed of rootListenerCalls) {
      expect(removedRootListeners).toContainEqual(
        expect.objectContaining({
          type: installed.type,
          listener: installed.listener,
          target: installed.target,
        }),
      )
    }
  })

  it('parses DOM markers into canonical targets and lets the latest active modality win', () => {
    renderTargetShell()
    const shell = getUniverseShell()
    const arc = screen.getByRole('button', { name: 'Arc ecosystem marker' })
    const detailLink = screen.getByRole('button', { name: 'Signal case file' })
    const plain = screen.getByRole('button', { name: 'Plain control' })

    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')
    expect(shell).toHaveAttribute('data-universe-committed-target', 'project:signal-ledger')
    expect(shell).toHaveAttribute('data-universe-preview-target', '')
    expect(latestDynamicProps().target).toEqual({ kind: 'project', project: 'signal-ledger' })

    fireEvent.focusIn(arc)
    expect(shell).toHaveAttribute('data-universe-target', 'ecosystem:arc')
    expect(latestDynamicProps().target).toEqual({ kind: 'ecosystem', ecosystem: 'arc' })
    expect(latestDynamicProps().preview).toBe(true)

    fireEvent.pointerOver(detailLink)
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')
    expect(latestDynamicProps().target).toEqual({ kind: 'project', project: 'signal-ledger' })

    fireEvent.pointerOut(detailLink, { relatedTarget: plain })
    expect(shell).toHaveAttribute('data-universe-target', 'ecosystem:arc')
    expect(latestDynamicProps().target).toEqual({ kind: 'ecosystem', ecosystem: 'arc' })
    expect(latestDynamicProps().preview).toBe(true)

    fireEvent.pointerOver(detailLink)
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')
    fireEvent.focusIn(screen.getByRole('button', { name: 'Cover step marker' }))
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')
    expect(latestDynamicProps().target).toEqual({ kind: 'project', project: 'signal-ledger' })

    fireEvent.focusOut(screen.getByRole('button', { name: 'Cover step marker' }), { relatedTarget: plain })
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')
    expect(latestDynamicProps().target).toEqual({ kind: 'project', project: 'signal-ledger' })

    fireEvent.pointerOut(detailLink, { relatedTarget: plain })
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')
    expect(latestDynamicProps().target).toEqual({ kind: 'project', project: 'signal-ledger' })
    expect(latestDynamicProps().preview).toBe(false)
  })

  it('keeps target continuity while moving within the same marker or directly into another marker', () => {
    renderTargetShell()
    const shell = getUniverseShell()
    const detailLink = screen.getByRole('button', { name: 'Signal case file' })
    const liveLink = screen.getByRole('link', { name: 'Signal live site' })
    const rialo = screen.getByRole('button', { name: 'Rialo ecosystem marker' })

    fireEvent.focusIn(detailLink)
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')

    fireEvent.focusOut(detailLink, { relatedTarget: liveLink })
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')
    expect(latestDynamicProps().target).toEqual({ kind: 'project', project: 'signal-ledger' })

    fireEvent.focusIn(liveLink)
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')

    fireEvent.pointerOver(detailLink)
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')

    fireEvent.pointerOut(detailLink, { relatedTarget: rialo })
    expect(shell).toHaveAttribute('data-universe-target', 'ecosystem:rialo')
    expect(latestDynamicProps().target).toEqual({ kind: 'ecosystem', ecosystem: 'rialo' })
  })

  it('fails closed for invalid marker strings and clears stale targets on scene changes in the same render', () => {
    const { rerender } = renderTargetShell()
    const shell = getUniverseShell()

    fireEvent.focusIn(screen.getByRole('button', { name: 'Arc ecosystem marker' }))
    expect(shell).toHaveAttribute('data-universe-target', 'ecosystem:arc')

    fireEvent.focusIn(screen.getByRole('button', { name: 'Invalid marker' }))
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')
    expect(latestDynamicProps().target).toEqual({ kind: 'project', project: 'signal-ledger' })

    fireEvent.focusIn(screen.getByRole('button', { name: 'Arc ecosystem marker' }))
    expect(shell).toHaveAttribute('data-universe-target', 'ecosystem:arc')

    shellMocks.pathname = '/rialo'
    rerender(
      <UniverseShell>
        <main data-testid="page-child">Rialo route</main>
      </UniverseShell>,
    )

    expect(getUniverseShell()).toHaveAttribute('data-universe-target', 'rialo-step:observe')
    expect(getUniverseShell()).toHaveAttribute('data-universe-committed-target', 'rialo-step:observe')
    expect(latestDynamicProps().target).toEqual({ kind: 'rialo-step', step: 'observe' })
  })

  it('provides an explicit React commit protocol to descendants and forwards only the effective target', () => {
    shellMocks.pathname = '/'
    shellMocks.gateMode = 'enhanced'

    renderShell(<CommitTargetProbe />)
    const shell = getUniverseShell()

    expect(screen.getByTestId('committed-project')).toHaveTextContent('signal-ledger')
    expect(shell).toHaveAttribute('data-universe-target', 'project:signal-ledger')

    fireEvent.click(screen.getByRole('button', { name: 'Commit HADRON' }))

    expect(screen.getByTestId('committed-project')).toHaveTextContent('hadron')
    expect(shell).toHaveAttribute('data-universe-committed-target', 'project:hadron')
    expect(shell).toHaveAttribute('data-universe-target', 'project:hadron')
    expect(latestDynamicProps().target).toEqual({ kind: 'project', project: 'hadron' })
  })

  it('wraps gate callbacks to expose truthful ready state while preserving the original gate callbacks', () => {
    shellMocks.pathname = '/'
    shellMocks.gateMode = 'enhanced'

    renderShell()

    const shell = document.querySelector('[data-universe-shell]')
    const props = shellMocks.dynamicProps[0]

    expect(shell).toHaveAttribute('data-universe-ready', 'false')
    expect(shell).toHaveAttribute('data-universe-scene', 'home')

    act(() => {
      ;(props.reportReady as () => void)()
    })

    expect(shellMocks.enhancedProps.reportReady).toHaveBeenCalledTimes(1)
    expect(shell).toHaveAttribute('data-universe-ready', 'true')

    act(() => {
      ;(props.degrade as () => void)()
    })
    expect(shellMocks.enhancedProps.degrade).toHaveBeenCalledTimes(1)

    act(() => {
      ;(props.reportFailure as (error?: unknown) => void)(new Error('canvas failed'))
    })

    expect(shellMocks.enhancedProps.reportFailure).toHaveBeenCalledTimes(1)
    expect(shell).toHaveAttribute('data-universe-ready', 'false')
  })

  it('projects the explicit Canvas runtime callback onto factual shell attributes', () => {
    shellMocks.pathname = '/'
    shellMocks.gateMode = 'enhanced'

    renderShell()

    const shell = getUniverseShell()
    const dynamicProps = latestDynamicProps()
    const reportRuntime = dynamicProps.reportRuntime as
      | ((snapshot: Record<string, unknown>) => void)
      | undefined
    const generation = dynamicProps.runtimeGeneration

    expect(reportRuntime).toBeTypeOf('function')

    act(() => {
      reportRuntime?.({
        frameloop: 'demand',
        generation,
        morphPhase: 'morphing',
        morphProgress: 0.42,
        quality: 'high',
        renderState: 'active',
        scene: 'home',
        settled: false,
      })
    })

    expect(shell).toHaveAttribute('data-universe-frameloop', 'demand')
    expect(shell).toHaveAttribute('data-universe-quality', 'high')
    expect(shell).toHaveAttribute('data-universe-render-state', 'active')
    expect(shell).toHaveAttribute('data-universe-settled', 'false')
    expect(shell).toHaveAttribute('data-universe-morph-phase', 'morphing')
    expect(shell).toHaveAttribute('data-universe-morph-progress', '0.42')

    act(() => {
      reportRuntime?.({
        frameloop: 'demand',
        generation,
        morphPhase: 'idle',
        morphProgress: 1,
        quality: 'high',
        renderState: 'demand',
        scene: 'home',
        settled: true,
      })
    })

    expect(shell).toHaveAttribute('data-universe-render-state', 'demand')
    expect(shell).toHaveAttribute('data-universe-settled', 'true')
    expect(shell).toHaveAttribute('data-universe-morph-phase', 'idle')
    expect(shell).toHaveAttribute('data-universe-morph-progress', '1')

    act(() => {
      reportRuntime?.({
        frameloop: 'always',
        generation: Number(generation) - 1,
        morphPhase: 'morphing',
        morphProgress: 0.1,
        quality: 'medium',
        renderState: 'active',
        scene: 'home',
        settled: false,
      })
    })

    expect(shell).toHaveAttribute('data-universe-quality', 'high')
    expect(shell).toHaveAttribute('data-universe-morph-phase', 'idle')
  })

  it('keeps the canvas node identity stable across the three immersive routes', () => {
    shellMocks.pathname = '/'
    shellMocks.gateMode = 'enhanced'
    const { rerender } = render(<UniverseShell><main data-testid="page-child">Home</main></UniverseShell>)
    const firstCanvasNode = screen.getByTestId('dynamic-canvas-stub')

    shellMocks.pathname = '/arc'
    rerender(<UniverseShell><main data-testid="page-child">Arc</main></UniverseShell>)
    expect(screen.getByTestId('dynamic-canvas-stub')).toBe(firstCanvasNode)
    expect(firstCanvasNode).toHaveAttribute('data-scene', 'arc')

    shellMocks.pathname = '/rialo'
    rerender(<UniverseShell><main data-testid="page-child">Rialo</main></UniverseShell>)
    expect(screen.getByTestId('dynamic-canvas-stub')).toBe(firstCanvasNode)
    expect(firstCanvasNode).toHaveAttribute('data-scene', 'rialo')
  })
})
