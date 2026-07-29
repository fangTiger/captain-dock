import { act, cleanup, render, screen } from '@testing-library/react'
import { StrictMode, type ComponentProps, type ReactNode } from 'react'
import type { Mock } from 'vitest'

import type * as RuntimeSceneStateModule from './runtime-scene-state'
import {
  SCENE_MORPH_DURATION_MS,
  SCENE_PREVIEW_MORPH_DURATION_MS,
} from './finite-scene-morph'
import type { UniverseCanvas as UniverseCanvasComponent } from './universe-canvas.client'

type CanvasProps = ComponentProps<typeof UniverseCanvasComponent>
type RuntimeSceneFrameloop = RuntimeSceneStateModule.RuntimeSceneFrameloop
type FrameCallback = (state: MockRootState, delta: number) => void
type AfterEffect = () => void

type SceneCompilePayload = {
  compileKey: string
  scene: CanvasProps['scene']
  token: number
}

type MockRootState = {
  gl: MockRenderer
  invalidate: Mock<() => void>
  setFrameloop: Mock<(value: RuntimeSceneFrameloop) => void>
  get: () => MockRootState
}

type MockRenderer = {
  debug: {
    checkShaderErrors: boolean
  }
  domElement: HTMLCanvasElement
  info: {
    render: {
      calls: number
      triangles: number
      frame: number
    }
    memory: {
      textures: number
    }
    programs?: unknown[]
  }
  getPixelRatio: () => number
  setPixelRatio: (value: number) => void
}

type ComponentCall = {
  name: 'CameraRig' | 'SceneRouter' | 'SharedUniverse'
  props: Record<string, unknown>
}

type MockCanvasProps = {
  children?: ReactNode
  onCreated?: (state: MockRootState) => void
  gl?: (attributes: { canvas: HTMLCanvasElement }) => MockRenderer
  style?: React.CSSProperties
  tabIndex?: number
  'aria-hidden'?: boolean | 'true' | 'false'
  [key: string]: unknown
}

type UniverseDebugSnapshot = {
  calls: number
  triangles: number
  textures: number
  programs: number
  dpr: number
  frameCount: number
  frameloop: string
  quality: CanvasProps['quality']
  transitionScene: CanvasProps['scene']
  targetScene: CanvasProps['scene']
  transitionPhase: string
  transitionToken: number
  runtimePhase: string
  settled: boolean
  documentVisible: boolean
  hostVisible: boolean
}

type WindowWithUniverseDebug = Window &
  typeof globalThis & {
    __CAPTAIN_DOCK_UNIVERSE_DEBUG__?: UniverseDebugSnapshot
  }

const canvasMocks = vi.hoisted(() => ({
  frameCallbacks: new Set<FrameCallback>(),
  afterEffects: new Set<AfterEffect>(),
  canvasProps: null as null | Record<string, unknown>,
  componentCalls: [] as ComponentCall[],
  rootState: null as null | MockRootState,
  rendererOptions: [] as Array<Record<string, unknown>>,
  failRenderer: false,
  skipRendererCreation: false,
  lastGlError: null as null | unknown,
  observerInstances: [] as MockIntersectionObserver[],
  sceneRouterMounts: [] as number[],
  sceneRouterUnmounts: [] as number[],
  nextSceneRouterInstanceId: 1,
  runtimeEvents: [] as Array<{ type: string; [key: string]: unknown }>,
  r3fEventManagers: [] as Array<{ disconnect: ReturnType<typeof vi.fn> }>,
  rendererLifecycleOwners: [] as Array<{
    dispose: ReturnType<typeof vi.fn>
    forceContextLoss: ReturnType<typeof vi.fn>
  }>,
  propSyncFrameloopChanges: [] as string[],
  propSyncInvalidates: [] as string[],
  sceneRouterLayoutCompile: null as null | ((props: Record<string, unknown>) => void),
}))

class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  observed = new Set<Element>()
  disconnected = false

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    canvasMocks.observerInstances.push(this)
  }

  observe = (element: Element) => {
    this.observed.add(element)
  }

  unobserve = (element: Element) => {
    this.observed.delete(element)
  }

  disconnect = () => {
    this.disconnected = true
    this.observed.clear()
  }

  emit(isIntersecting: boolean) {
    this.callback(
      [
        {
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          target: this.observed.values().next().value ?? document.body,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    )
  }
}

vi.mock('@react-three/fiber', async () => {
  const React = await import('react')

  const MockCanvas = React.forwardRef<
    HTMLCanvasElement,
    MockCanvasProps
  >(function MockCanvas({ children, onCreated, ...props }, forwardedRef) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const createdRef = React.useRef(false)
    const appliedFrameloopRef = React.useRef(props.frameloop)

    canvasMocks.canvasProps = props
    React.useImperativeHandle(forwardedRef, () => canvasRef.current as HTMLCanvasElement, [])

    React.useEffect(() => {
      if (!canvasRef.current || createdRef.current) {
        return undefined
      }

      if (canvasMocks.skipRendererCreation) {
        return undefined
      }

      try {
        const glFactory = props.gl as (attributes: { canvas: HTMLCanvasElement }) => MockRenderer
        const gl = glFactory({ canvas: canvasRef.current })
        const eventManager = {
          disconnect: vi.fn(),
        }
        const rootState: MockRootState = {
          gl,
          invalidate: vi.fn<() => void>(),
          setFrameloop: vi.fn<(value: RuntimeSceneFrameloop) => void>(),
          get: () => rootState,
        }

        const createRoot = onCreated as MockCanvasProps['onCreated']

        canvasMocks.r3fEventManagers.push(eventManager)
        createdRef.current = true
        canvasMocks.rootState = rootState
        appliedFrameloopRef.current = props.frameloop
        createRoot?.(Object.assign(rootState, { events: eventManager }))
      } catch (error) {
        canvasMocks.lastGlError = error
      }

      return undefined
    }, [onCreated, props.frameloop, props.gl])

    React.useEffect(() => {
      if (!createdRef.current || !canvasMocks.rootState || appliedFrameloopRef.current === props.frameloop) {
        return
      }

      const nextFrameloop = props.frameloop as RuntimeSceneFrameloop

      appliedFrameloopRef.current = props.frameloop
      canvasMocks.propSyncFrameloopChanges.push(nextFrameloop)
      canvasMocks.rootState.setFrameloop(nextFrameloop)

      if (nextFrameloop !== 'never') {
        canvasMocks.propSyncInvalidates.push(nextFrameloop)
        canvasMocks.rootState.invalidate()
      }
    }, [props.frameloop])

    return (
      <div
        aria-hidden={props['aria-hidden'] as boolean}
        data-testid="r3f-outer-wrapper"
        style={props.style as React.CSSProperties}
        tabIndex={props.tabIndex as number}
      >
        <canvas ref={canvasRef}>{children as ReactNode}</canvas>
      </div>
    )
  })

  return {
    Canvas: MockCanvas,
    useFrame(callback: FrameCallback) {
      React.useEffect(() => {
        canvasMocks.frameCallbacks.add(callback)

        return () => {
          canvasMocks.frameCallbacks.delete(callback)
        }
      }, [callback])
    },
    addAfterEffect(callback: AfterEffect) {
      canvasMocks.afterEffects.add(callback)

      return () => {
        canvasMocks.afterEffects.delete(callback)
      }
    },
  }
})

vi.mock('three', () => ({
  WebGLRenderer: vi.fn(function WebGLRenderer(options: Record<string, unknown>) {
    canvasMocks.rendererOptions.push(options)

    if (canvasMocks.failRenderer) {
      throw new Error('renderer init failed')
    }

    const rendererLifecycleOwner = {
      dispose: vi.fn(),
      forceContextLoss: vi.fn(),
    }

    canvasMocks.rendererLifecycleOwners.push(rendererLifecycleOwner)

    return {
      debug: {
        checkShaderErrors: true,
      },
      domElement: options.canvas as HTMLCanvasElement,
      info: {
        render: {
          calls: 7,
          triangles: 900,
          frame: 0,
        },
        memory: {
          textures: 2,
        },
        programs: ['program-a', 'program-b'],
      },
      getPixelRatio: () => 1.25,
      setPixelRatio: vi.fn(),
      ...rendererLifecycleOwner,
    } as MockRenderer
  }),
}))

vi.mock('./camera-rig', () => ({
  CameraRig: (props: Record<string, unknown>) => {
    canvasMocks.componentCalls.push({ name: 'CameraRig', props })

    return null
  },
}))

vi.mock('./scene-router.client', async () => {
  const React = await import('react')

  return {
    SceneRouter: (props: Record<string, unknown>) => {
      const instanceIdRef = React.useRef<number | null>(null)

      if (instanceIdRef.current === null) {
        instanceIdRef.current = canvasMocks.nextSceneRouterInstanceId
        canvasMocks.nextSceneRouterInstanceId += 1
      }

      const propsWithInstance = {
        ...props,
        __instanceId: instanceIdRef.current,
      }

      canvasMocks.componentCalls.push({
        name: 'SceneRouter',
        props: propsWithInstance,
      })

      React.useLayoutEffect(() => {
        canvasMocks.sceneRouterLayoutCompile?.(propsWithInstance)
      })

      React.useEffect(() => {
        const instanceId = instanceIdRef.current as number

        return () => {
          canvasMocks.sceneRouterUnmounts.push(instanceId)
        }
      }, [])

      React.useEffect(() => {
        canvasMocks.sceneRouterMounts.push(instanceIdRef.current as number)
      }, [])

      return null
    },
  }
})

vi.mock('./shared-universe', () => ({
  SharedUniverse: (props: Record<string, unknown>) => {
    canvasMocks.componentCalls.push({ name: 'SharedUniverse', props })

    return null
  },
}))

vi.mock('./runtime-scene-state', async (importOriginal) => {
  const actual = await importOriginal<typeof RuntimeSceneStateModule>()

  return {
    ...actual,
    reduceRuntimeSceneState(
      state: Parameters<typeof actual.reduceRuntimeSceneState>[0],
      event: Parameters<typeof actual.reduceRuntimeSceneState>[1],
    ) {
      canvasMocks.runtimeEvents.push(event)

      return actual.reduceRuntimeSceneState(state, event)
    },
  }
})

import { UniverseCanvas } from './universe-canvas.client'

function renderCanvas(overrides: Partial<CanvasProps> = {}) {
  return render(
    <UniverseCanvas
      degrade={vi.fn()}
      quality="high"
      reportFailure={vi.fn()}
      reportReady={vi.fn()}
      scene="home"
      target={null}
      {...overrides}
    />,
  )
}

const signalTarget = {
  kind: 'project',
  project: 'signal-ledger',
} as const satisfies NonNullable<CanvasProps['target']>

const sameSignalTarget = {
  kind: 'project',
  project: 'signal-ledger',
} as const satisfies NonNullable<CanvasProps['target']>

const arcTarget = {
  kind: 'ecosystem',
  ecosystem: 'arc',
} as const satisfies NonNullable<CanvasProps['target']>

function resetCanvasMocks() {
  canvasMocks.frameCallbacks.clear()
  canvasMocks.afterEffects.clear()
  canvasMocks.canvasProps = null
  canvasMocks.componentCalls.length = 0
  canvasMocks.rootState = null
  canvasMocks.rendererOptions.length = 0
  canvasMocks.failRenderer = false
  canvasMocks.skipRendererCreation = false
  canvasMocks.lastGlError = null
  canvasMocks.observerInstances.length = 0
  canvasMocks.sceneRouterMounts.length = 0
  canvasMocks.sceneRouterUnmounts.length = 0
  canvasMocks.nextSceneRouterInstanceId = 1
  canvasMocks.runtimeEvents.length = 0
  canvasMocks.r3fEventManagers.length = 0
  canvasMocks.rendererLifecycleOwners.length = 0
  canvasMocks.propSyncFrameloopChanges.length = 0
  canvasMocks.propSyncInvalidates.length = 0
  canvasMocks.sceneRouterLayoutCompile = null
  delete (window as WindowWithUniverseDebug).__CAPTAIN_DOCK_UNIVERSE_DEBUG__
}

function mockReducedMotionPreference(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: matches && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })
}

async function advanceFrame(delta = 1 / 60) {
  await act(async () => {
    if (!canvasMocks.rootState) {
      throw new Error('R3F root state missing')
    }

    for (const callback of Array.from(canvasMocks.frameCallbacks)) {
      callback(canvasMocks.rootState, delta)
    }

    canvasMocks.rootState.gl.info.render.frame += 1

    for (const callback of Array.from(canvasMocks.afterEffects)) {
      callback()
    }
  })
}

async function advanceFrameWithoutAfterEffects(delta = 1 / 60) {
  await act(async () => {
    if (!canvasMocks.rootState) {
      throw new Error('R3F root state missing')
    }

    for (const callback of Array.from(canvasMocks.frameCallbacks)) {
      callback(canvasMocks.rootState, delta)
    }

    canvasMocks.rootState.gl.info.render.frame += 1
  })
}

async function advanceLowFpsWindow() {
  for (let index = 0; index < 9; index += 1) {
    await advanceFrame(0.12)
  }
}

function getHostCanvas(host: HTMLElement) {
  const canvas = host.querySelector('canvas')

  if (!canvas) {
    throw new Error('canvas missing')
  }

  return canvas
}

function getLatestSceneRouterProps() {
  const call = canvasMocks.componentCalls.filter((entry) => entry.name === 'SceneRouter').at(-1)

  if (!call) {
    throw new Error('SceneRouter was not rendered')
  }

  return call.props
}

function getLatestCameraRigProps() {
  const call = canvasMocks.componentCalls.filter((entry) => entry.name === 'CameraRig').at(-1)

  if (!call) {
    throw new Error('CameraRig was not rendered')
  }

  return call.props
}

function getSceneRouterInstanceId() {
  const instanceId = getLatestSceneRouterProps().__instanceId

  if (typeof instanceId !== 'number') {
    throw new Error('SceneRouter instance id missing')
  }

  return instanceId
}

async function triggerCurrentSceneReady(scene?: CanvasProps['scene'], token?: number) {
  await act(async () => {
    const props = getLatestSceneRouterProps()
    const transition = props.transition as { scene: CanvasProps['scene']; token: number }
    const onSceneReady = props.onSceneReady as
      | ((readyScene: CanvasProps['scene'], readyToken: number) => void)
      | undefined

    if (!onSceneReady) {
      throw new Error('SceneRouter ready callback missing')
    }

    onSceneReady(scene ?? transition.scene, token ?? transition.token)
  })
}

function getCurrentSceneCompilePayload(overrides: Partial<SceneCompilePayload> = {}) {
  const props = getLatestSceneRouterProps()
  const transition = props.transition as { scene: CanvasProps['scene']; token: number }
  const compileKey = props.compileKey

  if (typeof compileKey !== 'string') {
    throw new Error('Scene compile key missing')
  }

  return {
    compileKey,
    scene: transition.scene,
    token: transition.token,
    ...overrides,
  } satisfies SceneCompilePayload
}

async function triggerCurrentSceneCompiled(overrides: Partial<SceneCompilePayload> = {}) {
  const props = getLatestSceneRouterProps()
  const onSceneCompiled = props.onSceneCompiled as ((payload: SceneCompilePayload) => void) | undefined

  if (!onSceneCompiled) {
    throw new Error('Scene compile callback missing')
  }

  await act(async () => {
    onSceneCompiled(getCurrentSceneCompilePayload(overrides))
  })
}

async function triggerCurrentSceneCompileError(
  error: unknown,
  overrides: Partial<SceneCompilePayload> = {},
) {
  const props = getLatestSceneRouterProps()
  const onSceneCompileError = props.onSceneCompileError as
    | ((payload: SceneCompilePayload, error: unknown) => void)
    | undefined

  if (!onSceneCompileError) {
    throw new Error('Scene compile error callback missing')
  }

  await act(async () => {
    onSceneCompileError(getCurrentSceneCompilePayload(overrides), error)
  })
}

beforeEach(() => {
  resetCanvasMocks()
  vi.useRealTimers()
  mockReducedMotionPreference(false)
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  })
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: MockIntersectionObserver,
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('UniverseCanvas', () => {
  it('uses stable R3F props, WebGL options, DPR values, and does not report ready from onCreated', async () => {
    const reportReady = vi.fn()
    const reportRuntime = vi.fn()
    const { rerender } = renderCanvas({ reportReady, reportRuntime, quality: 'high' })

    await screen.findByTestId('universe-canvas-host')
    expect(reportReady).toHaveBeenCalledTimes(0)
    expect(canvasMocks.canvasProps).toMatchObject({
      dpr: [1, 1.5],
      frameloop: 'never',
    })
    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        frameloop: 'always',
        renderState: 'active',
      }),
    )
    expect(canvasMocks.canvasProps).not.toHaveProperty('eventSource')
    expect(canvasMocks.canvasProps?.events).toBeTypeOf('function')
    expect(canvasMocks.rendererOptions).toHaveLength(1)
    expect(canvasMocks.rendererOptions[0]).toMatchObject({
      alpha: true,
      antialias: false,
      depth: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      stencil: false,
    })

    const glFactory = canvasMocks.canvasProps?.gl
    const events = canvasMocks.canvasProps?.events

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="medium"
        reportFailure={vi.fn()}
        reportReady={reportReady}
        reportRuntime={reportRuntime}
        scene="arc"
        target={null}
      />,
    )
    expect(canvasMocks.canvasProps).toMatchObject({
      dpr: [1, 1.25],
      frameloop: 'never',
    })
    expect(canvasMocks.canvasProps?.gl).toBe(glFactory)
    expect(canvasMocks.canvasProps?.events).toBe(events)

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="low"
        reportFailure={vi.fn()}
        reportReady={reportReady}
        reportRuntime={reportRuntime}
        scene="rialo"
        target={null}
      />,
    )
    expect(canvasMocks.canvasProps).toMatchObject({
      dpr: 1,
      frameloop: 'never',
    })
    expect(canvasMocks.canvasProps?.gl).toBe(glFactory)
    expect(canvasMocks.canvasProps?.events).toBe(events)
    expect(canvasMocks.rendererOptions).toHaveLength(1)
  })

  it('subscribes the after-effect during Canvas creation without requesting a precompile frame', async () => {
    renderCanvas()
    await screen.findByTestId('universe-canvas-host')

    expect(canvasMocks.afterEffects.size).toBe(1)
    expect(canvasMocks.rootState?.invalidate).toHaveBeenCalledTimes(0)
  })

  it('restores the actual frameloop after scene compile, invalidates once, and still waits for a real ready frame', async () => {
    const reportReady = vi.fn()

    renderCanvas({ reportReady, quality: 'high' })
    await screen.findByTestId('universe-canvas-host')
    vi.useFakeTimers()

    const rootState = canvasMocks.rootState

    if (!rootState) {
      throw new Error('R3F root state missing')
    }

    expect(canvasMocks.canvasProps).toMatchObject({ frameloop: 'never' })
    expect(rootState.invalidate).toHaveBeenCalledTimes(0)

    await triggerCurrentSceneCompiled()

    expect(canvasMocks.propSyncFrameloopChanges).toEqual(['always'])
    expect(rootState.setFrameloop).toHaveBeenCalledTimes(canvasMocks.propSyncFrameloopChanges.length)
    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('always')
    expect(canvasMocks.propSyncInvalidates).toEqual(['always'])
    expect(rootState.invalidate).toHaveBeenCalledTimes(canvasMocks.propSyncInvalidates.length)
    expect(canvasMocks.canvasProps).toMatchObject({ frameloop: 'always' })
    expect(reportReady).toHaveBeenCalledTimes(0)

    await triggerCurrentSceneReady()
    await act(async () => {
      vi.advanceTimersByTime(32)
    })
    expect(reportReady).toHaveBeenCalledTimes(0)

    await advanceFrame()

    expect(reportReady).toHaveBeenCalledTimes(1)
  })

  it('still compiles low-quality reduced-motion scenes before restoring demand rendering', async () => {
    mockReducedMotionPreference(true)

    renderCanvas({ quality: 'low' })
    await screen.findByTestId('universe-canvas-host')

    const rootState = canvasMocks.rootState

    if (!rootState) {
      throw new Error('R3F root state missing')
    }

    expect(getLatestSceneRouterProps()).toMatchObject({
      compileKey: '0:home:low',
      reducedMotion: true,
    })
    expect(canvasMocks.canvasProps).toMatchObject({
      frameloop: 'never',
    })

    await triggerCurrentSceneCompiled()

    expect(canvasMocks.propSyncFrameloopChanges).toEqual(['demand'])
    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('demand')
    expect(rootState.setFrameloop).toHaveBeenCalledTimes(canvasMocks.propSyncFrameloopChanges.length)
    expect(canvasMocks.propSyncInvalidates).toEqual(['demand'])
    expect(rootState.invalidate).toHaveBeenCalledTimes(canvasMocks.propSyncInvalidates.length)
    expect(canvasMocks.canvasProps).toMatchObject({
      frameloop: 'demand',
    })
  })

  it('marks the host, R3F wrapper, and real canvas non-interactive without test-side canvas prop forwarding', async () => {
    renderCanvas()
    const host = await screen.findByTestId('universe-canvas-host')
    const wrapper = screen.getByTestId('r3f-outer-wrapper')
    const canvas = getHostCanvas(host)

    expect(host).toHaveAttribute('aria-hidden', 'true')
    expect(host).toHaveAttribute('tabindex', '-1')
    expect(host).toHaveStyle({ pointerEvents: 'none' })
    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
    expect(wrapper).toHaveAttribute('tabindex', '-1')
    expect(wrapper).toHaveStyle({ pointerEvents: 'none' })
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(canvas).toHaveAttribute('data-universe-canvas')
    expect(canvas).toHaveAttribute('tabindex', '-1')
    expect(canvas).toHaveStyle({
      display: 'block',
      height: '100%',
      pointerEvents: 'none',
      width: '100%',
    })
  })

  it('mounts only the reviewed scene graph owners with Task8A transition state and a null target', async () => {
    renderCanvas({ quality: 'medium', scene: 'arc' })
    await screen.findByTestId('universe-canvas-host')

    expect([...new Set(canvasMocks.componentCalls.map((entry) => entry.name))].sort()).toEqual([
      'CameraRig',
      'SceneRouter',
      'SharedUniverse',
    ])
    expect(canvasMocks.componentCalls.find((entry) => entry.name === 'SharedUniverse')?.props).toMatchObject({
      quality: 'medium',
    })
    expect(canvasMocks.componentCalls.find((entry) => entry.name === 'CameraRig')?.props).toMatchObject({
      motionEnabled: true,
      quality: 'medium',
      scene: 'arc',
      target: null,
    })
    expect(getLatestSceneRouterProps()).toMatchObject({
      morphDurationMs: SCENE_MORPH_DURATION_MS,
      motionEnabled: true,
      quality: 'medium',
      reducedMotion: false,
      target: null,
      transition: expect.objectContaining({
        scene: 'arc',
      }),
    })
  })

  it('uses the short morph budget for preview-only target changes', async () => {
    const { rerender } = renderCanvas({ quality: 'high', scene: 'home', target: null })

    await screen.findByTestId('universe-canvas-host')
    expect(getLatestSceneRouterProps()).toMatchObject({
      morphDurationMs: SCENE_MORPH_DURATION_MS,
      target: null,
    })

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        preview
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="home"
        target={signalTarget}
      />,
    )

    expect(getLatestSceneRouterProps()).toMatchObject({
      morphDurationMs: SCENE_PREVIEW_MORPH_DURATION_MS,
      target: signalTarget,
    })
  })

  it('reports continuous committed and preview morph progress and returns to an idle terminal snapshot', async () => {
    vi.useFakeTimers()
    const reportRuntime = vi.fn()
    const { rerender } = renderCanvas({
      reportRuntime,
    } as Partial<CanvasProps>)

    await act(async () => {})

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        morphMode="commit"
        morphRevision={1}
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        reportRuntime={reportRuntime}
        scene="home"
        target={signalTarget}
      />,
    )

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        frameloop: 'always',
        morphPhase: 'morphing',
        morphProgress: 0,
        quality: 'high',
        settled: false,
      }),
    )
    expect(getLatestCameraRigProps()).toMatchObject({ morphMode: 'commit' })
    expect(getLatestSceneRouterProps()).toMatchObject({ morphMode: 'commit' })

    await act(async () => {
      vi.advanceTimersByTime(SCENE_MORPH_DURATION_MS / 2)
    })

    const committedMidpoint = reportRuntime.mock.calls.at(-1)?.[0] as {
      morphProgress: number
    }

    expect(committedMidpoint.morphProgress).toBeGreaterThan(0)
    expect(committedMidpoint.morphProgress).toBeLessThan(1)

    await act(async () => {
      vi.advanceTimersByTime(SCENE_MORPH_DURATION_MS / 2)
    })

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        morphPhase: 'idle',
        morphProgress: 1,
      }),
    )

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        morphMode="preview"
        preview
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        reportRuntime={reportRuntime}
        scene="home"
        target={arcTarget}
      />,
    )

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        morphPhase: 'morphing',
        morphProgress: 0,
      }),
    )
    expect(getLatestCameraRigProps()).toMatchObject({ morphMode: 'preview' })
    expect(getLatestSceneRouterProps()).toMatchObject({ morphMode: 'preview' })

    await act(async () => {
      vi.advanceTimersByTime(SCENE_PREVIEW_MORPH_DURATION_MS / 2)
    })
    expect(
      (reportRuntime.mock.calls.at(-1)?.[0] as { morphProgress: number }).morphProgress,
    ).toBeGreaterThan(0)
    expect(
      (reportRuntime.mock.calls.at(-1)?.[0] as { morphProgress: number }).morphProgress,
    ).toBeLessThan(1)

    await act(async () => {
      vi.advanceTimersByTime(SCENE_PREVIEW_MORPH_DURATION_MS / 2)
    })
    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        morphPhase: 'idle',
        morphProgress: 1,
      }),
    )

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        morphMode="commit"
        morphRevision={2}
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        reportRuntime={reportRuntime}
        scene="home"
        target={arcTarget}
      />,
    )

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        morphPhase: 'morphing',
        morphProgress: 0,
      }),
    )
    expect(getLatestCameraRigProps()).toMatchObject({ morphMode: 'commit' })
    expect(getLatestSceneRouterProps()).toMatchObject({ morphMode: 'commit' })

    await act(async () => {
      vi.advanceTimersByTime(SCENE_MORPH_DURATION_MS)
    })

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        morphPhase: 'idle',
        morphProgress: 1,
      }),
    )

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        morphMode="preview"
        preview
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        reportRuntime={reportRuntime}
        scene="home"
        target={signalTarget}
      />,
    )

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        morphPhase: 'morphing',
        morphProgress: 0,
      }),
    )
    expect(getLatestCameraRigProps()).toMatchObject({ morphMode: 'preview' })
    expect(getLatestSceneRouterProps()).toMatchObject({ morphMode: 'preview' })

    await act(async () => {
      vi.advanceTimersByTime(SCENE_PREVIEW_MORPH_DURATION_MS)
    })

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        morphPhase: 'idle',
        morphProgress: 1,
      }),
    )

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        morphMode="preview"
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        reportRuntime={reportRuntime}
        scene="home"
        target={arcTarget}
      />,
    )

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        morphPhase: 'morphing',
        morphProgress: 0,
      }),
    )
    expect(getLatestCameraRigProps()).toMatchObject({ morphMode: 'commit' })
    expect(getLatestSceneRouterProps()).toMatchObject({ morphMode: 'commit' })

    await act(async () => {
      vi.advanceTimersByTime(SCENE_PREVIEW_MORPH_DURATION_MS)
    })

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        morphPhase: 'idle',
        morphProgress: 1,
      }),
    )
  })

  it('settles target changes immediately when quality is low and cancels morph work while hidden', async () => {
    vi.useFakeTimers()
    const reportRuntime = vi.fn()
    const { rerender } = renderCanvas({
      quality: 'low',
      reportRuntime,
    } as Partial<CanvasProps>)

    await act(async () => {})

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="low"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        reportRuntime={reportRuntime}
        scene="home"
        target={signalTarget}
      />,
    )

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        frameloop: 'demand',
        morphPhase: 'idle',
        morphProgress: 1,
      }),
    )

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(reportRuntime).toHaveBeenLastCalledWith(
      expect.objectContaining({
        frameloop: 'never',
        morphPhase: 'idle',
        morphProgress: 1,
        renderState: 'paused',
      }),
    )
    expect(getLatestCameraRigProps()).toMatchObject({
      morphMode: 'commit',
      motionEnabled: false,
    })
    expect(getLatestSceneRouterProps()).toMatchObject({
      morphMode: 'commit',
      motionEnabled: false,
    })
  })

  it('waits for the current lazy scene callback before confirming readiness after a rendered frame', async () => {
    const reportReady = vi.fn()

    renderCanvas({ reportReady })
    await screen.findByTestId('universe-canvas-host')
    vi.useFakeTimers()
    await triggerCurrentSceneCompiled()

    await advanceFrame()
    await advanceFrame()
    await act(async () => {
      vi.advanceTimersByTime(32)
    })

    expect(reportReady).toHaveBeenCalledTimes(0)

    await triggerCurrentSceneReady()
    await act(async () => {
      vi.advanceTimersByTime(32)
    })
    expect(reportReady).toHaveBeenCalledTimes(0)

    await advanceFrame()
    await advanceFrame()

    expect(reportReady).toHaveBeenCalledTimes(1)
  })

  it('ignores stale ready callbacks that do not match the current transition token', async () => {
    const reportReady = vi.fn()

    renderCanvas({ reportReady })
    await screen.findByTestId('universe-canvas-host')
    await triggerCurrentSceneCompiled()

    const transition = getLatestSceneRouterProps().transition as { token: number }

    await triggerCurrentSceneReady('home', transition.token - 1)
    await advanceFrame()
    expect(reportReady).toHaveBeenCalledTimes(0)

    await triggerCurrentSceneReady('home', transition.token)
    await advanceFrame()
    expect(reportReady).toHaveBeenCalledTimes(1)
  })

  it('falls back to the next animation frame if the global after-effect misses a rendered frame', async () => {
    const reportReady = vi.fn()

    renderCanvas({ reportReady })
    await screen.findByTestId('universe-canvas-host')
    vi.useFakeTimers()
    await triggerCurrentSceneCompiled()

    await triggerCurrentSceneReady()
    await advanceFrameWithoutAfterEffects()
    expect(reportReady).toHaveBeenCalledTimes(0)

    await act(async () => {
      vi.advanceTimersByTime(16)
    })

    expect(reportReady).toHaveBeenCalledTimes(1)
  })

  it('resets disposal state after StrictMode effect replay before reporting ready', async () => {
    const reportReady = vi.fn()

    render(
      <StrictMode>
        <UniverseCanvas
          degrade={vi.fn()}
          quality="high"
          reportFailure={vi.fn()}
          reportReady={reportReady}
          scene="home"
          target={null}
        />
      </StrictMode>,
    )
    await screen.findByTestId('universe-canvas-host')
    await triggerCurrentSceneCompiled()

    await triggerCurrentSceneReady()
    await advanceFrame()
    await advanceFrame()

    expect(reportReady).toHaveBeenCalledTimes(1)
  })

  it('keeps the same real canvas and SceneRouter component instance across scene transitions', async () => {
    vi.useFakeTimers()
    const { rerender } = renderCanvas({ scene: 'home' })
    const host = screen.getByTestId('universe-canvas-host')
    const canvas = getHostCanvas(host)
    const routerInstanceId = getSceneRouterInstanceId()

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="arc"
        target={null}
      />,
    )
    expect(getHostCanvas(host)).toBe(canvas)
    expect(getLatestSceneRouterProps().transition).toMatchObject({
      phase: 'departing',
      scene: 'home',
      targetScene: 'arc',
    })

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="rialo"
        target={null}
      />,
    )
    const transition = getLatestSceneRouterProps().transition as { token: number }
    const currentToken = transition.token

    await act(async () => {
      vi.advanceTimersByTime(180)
    })
    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    expect(getHostCanvas(host)).toBe(canvas)
    expect(getSceneRouterInstanceId()).toBe(routerInstanceId)
    expect(getLatestSceneRouterProps().transition).toMatchObject({
      phase: 'idle',
      scene: 'rialo',
      targetScene: 'rialo',
      token: currentToken,
    })
    expect(canvasMocks.sceneRouterUnmounts).not.toContain(routerInstanceId)
  })

  it('invalidates exactly once per canonical target-only change without recreating router or transition identity', async () => {
    const { rerender } = renderCanvas({ quality: 'low', scene: 'home', target: null })
    const host = await screen.findByTestId('universe-canvas-host')
    const canvas = getHostCanvas(host)
    const rootState = canvasMocks.rootState

    if (!rootState) {
      throw new Error('R3F root state missing')
    }

    await triggerCurrentSceneCompiled()

    const routerInstanceId = getSceneRouterInstanceId()
    const transitionToken = (getLatestSceneRouterProps().transition as { token: number }).token
    const compileKey = getLatestSceneRouterProps().compileKey
    const initialInvalidates = rootState.invalidate.mock.calls.length

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="low"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="home"
        target={signalTarget}
      />,
    )
    expect(rootState.invalidate).toHaveBeenCalledTimes(initialInvalidates + 1)
    expect(getHostCanvas(host)).toBe(canvas)
    expect(getSceneRouterInstanceId()).toBe(routerInstanceId)
    expect(getLatestSceneRouterProps()).toMatchObject({
      compileKey,
      target: signalTarget,
      transition: expect.objectContaining({
        token: transitionToken,
        scene: 'home',
      }),
    })

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="low"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="home"
        target={sameSignalTarget}
      />,
    )
    expect(rootState.invalidate).toHaveBeenCalledTimes(initialInvalidates + 1)
    expect(getSceneRouterInstanceId()).toBe(routerInstanceId)
    expect(getLatestSceneRouterProps().compileKey).toBe(compileKey)

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="low"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="home"
        target={arcTarget}
      />,
    )
    expect(rootState.invalidate).toHaveBeenCalledTimes(initialInvalidates + 2)
    expect(getSceneRouterInstanceId()).toBe(routerInstanceId)
    expect(getLatestSceneRouterProps().compileKey).toBe(compileKey)
    expect((getLatestSceneRouterProps().transition as { token: number }).token).toBe(transitionToken)

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="low"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="home"
        target={null}
      />,
    )
    expect(rootState.invalidate).toHaveBeenCalledTimes(initialInvalidates + 3)
    expect(getSceneRouterInstanceId()).toBe(routerInstanceId)
    expect(getLatestSceneRouterProps().compileKey).toBe(compileKey)
    expect((getLatestSceneRouterProps().transition as { token: number }).token).toBe(transitionToken)

    const invalidatesAfterTargetChanges = rootState.invalidate.mock.calls.length

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        morphRevision={1}
        quality="low"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="home"
        target={null}
      />,
    )
    expect(rootState.invalidate).toHaveBeenCalledTimes(invalidatesAfterTargetChanges)
    expect(getSceneRouterInstanceId()).toBe(routerInstanceId)
    expect(getLatestSceneRouterProps().compileKey).toBe(compileKey)
    expect((getLatestSceneRouterProps().transition as { token: number }).token).toBe(transitionToken)
  })

  it('keeps a compiled departing scene rendering and closes the gate only when the arriving scene is committed', async () => {
    const { rerender } = renderCanvas({ quality: 'high', scene: 'home', target: null })
    await screen.findByTestId('universe-canvas-host')
    vi.useFakeTimers()
    const rootState = canvasMocks.rootState

    if (!rootState) {
      throw new Error('R3F root state missing')
    }

    await triggerCurrentSceneCompiled()
    const homeCompileKey = getLatestSceneRouterProps().compileKey
    const invalidatesAfterHomeCompile = rootState.invalidate.mock.calls.length
    const setCallsAfterHomeCompile = rootState.setFrameloop.mock.calls.length

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="arc"
        target={null}
      />,
    )
    await act(async () => {})

    expect(getLatestSceneRouterProps()).toMatchObject({
      compileKey: homeCompileKey,
      transition: expect.objectContaining({
        phase: 'departing',
        scene: 'home',
        targetScene: 'arc',
      }),
    })
    expect(canvasMocks.canvasProps).toMatchObject({ frameloop: 'always' })
    expect(rootState.setFrameloop).toHaveBeenCalledTimes(setCallsAfterHomeCompile)
    expect(rootState.invalidate).toHaveBeenCalledTimes(invalidatesAfterHomeCompile)

    await act(async () => {
      vi.advanceTimersByTime(180)
    })

    expect(getLatestSceneRouterProps()).toMatchObject({
      compileKey: '0:arc:high',
      transition: expect.objectContaining({
        phase: 'arriving',
        scene: 'arc',
      }),
    })
    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('never')
    expect(canvasMocks.canvasProps).toMatchObject({ frameloop: 'never' })

    await triggerCurrentSceneCompiled()

    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('always')
    expect(rootState.setFrameloop).toHaveBeenCalledTimes(canvasMocks.propSyncFrameloopChanges.length)
    expect(rootState.invalidate).toHaveBeenCalledTimes(
      invalidatesAfterHomeCompile + canvasMocks.propSyncInvalidates.slice(1).length,
    )
    expect(rootState.invalidate).toHaveBeenCalledTimes(invalidatesAfterHomeCompile + 1)
  })

  it('ignores stale compile callbacks from rapid navigation without unlocking or reporting failure', async () => {
    mockReducedMotionPreference(true)

    const reportFailure = vi.fn()
    const { rerender } = renderCanvas({ quality: 'high', reportFailure, scene: 'home' })
    await screen.findByTestId('universe-canvas-host')
    const stalePayload = getCurrentSceneCompilePayload()
    const rootState = canvasMocks.rootState

    if (!rootState) {
      throw new Error('R3F root state missing')
    }

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="high"
        reportFailure={reportFailure}
        reportReady={vi.fn()}
        scene="arc"
        target={null}
      />,
    )
    await act(async () => {})

    expect(getLatestSceneRouterProps()).toMatchObject({
      compileKey: '0:arc:high',
      transition: expect.objectContaining({
        scene: 'arc',
        token: stalePayload.token + 1,
      }),
    })

    await triggerCurrentSceneCompiled(stalePayload)
    await triggerCurrentSceneCompileError(new Error('stale compile rejected'), stalePayload)

    expect(rootState.setFrameloop).not.toHaveBeenCalledWith('always')
    expect(rootState.invalidate).toHaveBeenCalledTimes(0)
    expect(reportFailure).toHaveBeenCalledTimes(0)
  })

  it('accepts synchronous compile payloads from the current render during quality and generation rerenders', async () => {
    const { rerender } = renderCanvas({ quality: 'high', runtimeGeneration: 0, scene: 'home' })
    await screen.findByTestId('universe-canvas-host')
    const rootState = canvasMocks.rootState

    if (!rootState) {
      throw new Error('R3F root state missing')
    }

    await triggerCurrentSceneCompiled()
    expect(canvasMocks.canvasProps).toMatchObject({ frameloop: 'always' })

    canvasMocks.sceneRouterLayoutCompile = (props) => {
      const transition = props.transition as { scene: CanvasProps['scene']; token: number }
      const onSceneCompiled = props.onSceneCompiled as
        | ((payload: SceneCompilePayload) => void)
        | undefined

      if (!onSceneCompiled || typeof props.compileKey !== 'string') {
        throw new Error('Scene compile callback missing')
      }

      onSceneCompiled({
        compileKey: props.compileKey,
        scene: transition.scene,
        token: transition.token,
      })
    }

    const callsBeforeQuality = canvasMocks.propSyncFrameloopChanges.length

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="medium"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        runtimeGeneration={0}
        scene="home"
        target={null}
      />,
    )
    await act(async () => {})

    expect(canvasMocks.propSyncFrameloopChanges.slice(callsBeforeQuality)).toEqual([
      'never',
      'always',
    ])
    expect(canvasMocks.canvasProps).toMatchObject({ frameloop: 'always' })
    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('always')

    const callsBeforeGeneration = canvasMocks.propSyncFrameloopChanges.length

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="medium"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        runtimeGeneration={1}
        scene="home"
        target={null}
      />,
    )
    await act(async () => {})

    expect(canvasMocks.propSyncFrameloopChanges.slice(callsBeforeGeneration)).toEqual([
      'never',
      'always',
    ])
    expect(canvasMocks.canvasProps).toMatchObject({ frameloop: 'always' })
    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('always')
  })

  it('reports only the current compile failure and ignores compile callbacks after unmount', async () => {
    const reportFailure = vi.fn()
    const { unmount } = renderCanvas({ reportFailure })
    await screen.findByTestId('universe-canvas-host')
    const rootState = canvasMocks.rootState
    const currentPayload = getCurrentSceneCompilePayload()
    const compileError = new Error('current compile rejected')

    if (!rootState) {
      throw new Error('R3F root state missing')
    }

    await triggerCurrentSceneCompileError(compileError)
    await triggerCurrentSceneCompileError(new Error('duplicate compile rejected'))

    expect(canvasMocks.runtimeEvents).toContainEqual({ type: 'init-failure' })
    expect(reportFailure).toHaveBeenCalledTimes(1)

    unmount()

    const props = getLatestSceneRouterProps()
    const onSceneCompiled = props.onSceneCompiled as (payload: SceneCompilePayload) => void
    const onSceneCompileError = props.onSceneCompileError as (
      payload: SceneCompilePayload,
      error: unknown,
    ) => void

    await act(async () => {
      onSceneCompiled(currentPayload)
      onSceneCompileError(currentPayload, new Error('disposed compile rejected'))
    })

    expect(rootState.setFrameloop).not.toHaveBeenCalledWith('always')
    expect(reportFailure).toHaveBeenCalledTimes(1)
  })

  it('stores the latest target while frameloop is never and draws it through the existing resume invalidate', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    const { rerender } = renderCanvas({ quality: 'low', scene: 'home', target: null })
    await screen.findByTestId('universe-canvas-host')

    const rootState = canvasMocks.rootState

    if (!rootState) {
      throw new Error('R3F root state missing')
    }

    await triggerCurrentSceneCompiled()

    const invalidatesWhileHidden = rootState.invalidate.mock.calls.length

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="low"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="home"
        target={signalTarget}
      />,
    )

    expect(getLatestSceneRouterProps().target).toBe(signalTarget)
    expect(rootState.invalidate).toHaveBeenCalledTimes(invalidatesWhileHidden)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('demand')
    expect(rootState.invalidate).toHaveBeenCalledTimes(invalidatesWhileHidden + 1)
    expect(getLatestSceneRouterProps().target).toBe(signalTarget)
  })

  it('prevents two cancelable contextlost events but reports failure only once', async () => {
    const reportFailure = vi.fn()

    renderCanvas({ reportFailure })
    const host = await screen.findByTestId('universe-canvas-host')
    const canvas = getHostCanvas(host)
    const first = new Event('webglcontextlost', { cancelable: true })
    const second = new Event('webglcontextlost', { cancelable: true })

    await act(async () => {
      canvas.dispatchEvent(first)
      canvas.dispatchEvent(second)
    })

    expect(first.defaultPrevented).toBe(true)
    expect(second.defaultPrevented).toBe(true)
    expect(reportFailure).toHaveBeenCalledTimes(1)
  })

  it('keeps lifecycle subscriptions active during quality-only rerenders while publishing the latest quality', async () => {
    const reportFailure = vi.fn()
    const removeListener = vi.spyOn(HTMLCanvasElement.prototype, 'removeEventListener')
    const { rerender } = renderCanvas({ quality: 'high', reportFailure })
    const host = await screen.findByTestId('universe-canvas-host')
    const canvas = getHostCanvas(host)

    await advanceFrame()

    const countDisposeEvents = () => canvasMocks.runtimeEvents.filter((event) => event.type === 'dispose').length
    const countContextListenerRemovals = () =>
      removeListener.mock.calls.filter(([type]) => type === 'webglcontextlost').length

    const initialDisposeEvents = countDisposeEvents()
    const initialContextListenerRemovals = countContextListenerRemovals()
    const initialAfterEffectCount = canvasMocks.afterEffects.size

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="medium"
        reportFailure={reportFailure}
        reportReady={vi.fn()}
        scene="home"
        target={null}
      />,
    )

    expect(countDisposeEvents()).toBe(initialDisposeEvents)
    expect(countContextListenerRemovals()).toBe(initialContextListenerRemovals)
    expect(canvasMocks.afterEffects.size).toBe(initialAfterEffectCount)
    expect((window as WindowWithUniverseDebug).__CAPTAIN_DOCK_UNIVERSE_DEBUG__).toMatchObject({
      quality: 'medium',
    })

    const first = new Event('webglcontextlost', { cancelable: true })
    const second = new Event('webglcontextlost', { cancelable: true })

    await act(async () => {
      canvas.dispatchEvent(first)
      canvas.dispatchEvent(second)
    })

    expect(first.defaultPrevented).toBe(true)
    expect(second.defaultPrevented).toBe(true)
    expect(reportFailure).toHaveBeenCalledTimes(1)
  })

  it('leaves renderer ownership with R3F during quality rerenders, StrictMode replay, and React unmount', async () => {
    const addListener = vi.spyOn(HTMLCanvasElement.prototype, 'addEventListener')
    const removeListener = vi.spyOn(HTMLCanvasElement.prototype, 'removeEventListener')
    const documentAddListener = vi.spyOn(document, 'addEventListener')
    const documentRemoveListener = vi.spyOn(document, 'removeEventListener')
    const { rerender, unmount } = renderCanvas({ quality: 'high' })
    await screen.findByTestId('universe-canvas-host')
    const rendererLifecycleOwner = canvasMocks.rendererLifecycleOwners[0]
    const eventManager = canvasMocks.r3fEventManagers[0]

    const observer = canvasMocks.observerInstances[0]
    const contextListener = addListener.mock.calls.find(([type]) => type === 'webglcontextlost')?.[1]
    const visibilityListener = documentAddListener.mock.calls.find(([type]) => type === 'visibilitychange')?.[1]
    const afterEffectCount = canvasMocks.afterEffects.size

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="medium"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="home"
        target={null}
      />,
    )

    const afterQualityChange = {
      disconnect: eventManager.disconnect.mock.calls.length,
      dispose: rendererLifecycleOwner.dispose.mock.calls.length,
      forceContextLoss: rendererLifecycleOwner.forceContextLoss.mock.calls.length,
    }

    unmount()

    const afterUnmount = {
      disconnect: eventManager.disconnect.mock.calls.length,
      dispose: rendererLifecycleOwner.dispose.mock.calls.length,
      forceContextLoss: rendererLifecycleOwner.forceContextLoss.mock.calls.length,
    }
    const appOwnedCleanup = {
      afterEffectsRemoved: canvasMocks.afterEffects.size < afterEffectCount,
      contextListenerRemoved: removeListener.mock.calls.some(
        ([type, listener]) => type === 'webglcontextlost' && listener === contextListener,
      ),
      observerDisconnected: observer.disconnected,
      visibilityListenerRemoved: documentRemoveListener.mock.calls.some(
        ([type, listener]) => type === 'visibilitychange' && listener === visibilityListener,
      ),
    }

    cleanup()
    resetCanvasMocks()
    vi.clearAllMocks()

    render(
      <StrictMode>
        <UniverseCanvas
          degrade={vi.fn()}
          quality="high"
          reportFailure={vi.fn()}
          reportReady={vi.fn()}
          scene="home"
          target={null}
        />
      </StrictMode>,
    )
    await screen.findByTestId('universe-canvas-host')

    const strictRendererLifecycleOwner = canvasMocks.rendererLifecycleOwners[0]
    const strictEventManager = canvasMocks.r3fEventManagers[0]

    const afterStrictModeReplay = {
      disconnect: strictEventManager.disconnect.mock.calls.length,
      dispose: strictRendererLifecycleOwner.dispose.mock.calls.length,
      forceContextLoss: strictRendererLifecycleOwner.forceContextLoss.mock.calls.length,
    }

    expect(appOwnedCleanup).toEqual({
      afterEffectsRemoved: true,
      contextListenerRemoved: true,
      observerDisconnected: true,
      visibilityListenerRemoved: true,
    })
    expect({
      afterQualityChange,
      afterStrictModeReplay,
      afterUnmount,
    }).toEqual({
      afterQualityChange: {
        disconnect: 0,
        dispose: 0,
        forceContextLoss: 0,
      },
      afterStrictModeReplay: {
        disconnect: 0,
        dispose: 0,
        forceContextLoss: 0,
      },
      afterUnmount: {
        disconnect: 0,
        dispose: 0,
        forceContextLoss: 0,
      },
    })
  })

  it('cleans canvas listeners, observers, after-effects, and timers before stale events can fire', async () => {
    vi.useFakeTimers()
    const reportFailure = vi.fn()
    const addListener = vi.spyOn(HTMLCanvasElement.prototype, 'addEventListener')
    const removeListener = vi.spyOn(HTMLCanvasElement.prototype, 'removeEventListener')
    const { rerender, unmount } = renderCanvas({ reportFailure })
    const host = screen.getByTestId('universe-canvas-host')
    const canvas = getHostCanvas(host)

    await advanceFrame()
    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="high"
        reportFailure={reportFailure}
        reportReady={vi.fn()}
        scene="arc"
        target={null}
      />,
    )
    const afterEffectCount = canvasMocks.afterEffects.size
    const observer = canvasMocks.observerInstances[0]
    const contextListener = addListener.mock.calls.find(([type]) => type === 'webglcontextlost')?.[1]

    await triggerCurrentSceneReady()
    unmount()

    const staleContextLoss = new Event('webglcontextlost', { cancelable: true })
    canvas.dispatchEvent(staleContextLoss)
    observer.emit(false)

    expect(reportFailure).toHaveBeenCalledTimes(0)
    expect(removeListener).toHaveBeenCalledWith('webglcontextlost', contextListener)
    expect(observer.disconnected).toBe(true)
    expect(canvasMocks.afterEffects.size).toBeLessThan(afterEffectCount)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('consumes the Task8A dispose event during cleanup and ignores stale lifecycle callbacks', async () => {
    const degrade = vi.fn()
    const reportFailure = vi.fn()
    const reportReady = vi.fn()
    const { unmount } = renderCanvas({ degrade, reportFailure, reportReady })
    const host = await screen.findByTestId('universe-canvas-host')
    vi.useFakeTimers()
    const canvas = getHostCanvas(host)
    const observer = canvasMocks.observerInstances[0]
    const staleFrameCallbacks = Array.from(canvasMocks.frameCallbacks)
    const staleAfterEffects = Array.from(canvasMocks.afterEffects)

    await triggerCurrentSceneReady()
    unmount()

    const staleContextLoss = new Event('webglcontextlost', { cancelable: true })
    await act(async () => {
      canvas.dispatchEvent(staleContextLoss)
      observer.emit(false)

      if (!canvasMocks.rootState) {
        throw new Error('R3F root state missing')
      }

      for (const callback of staleFrameCallbacks) {
        callback(canvasMocks.rootState, 1)
      }

      canvasMocks.rootState.gl.info.render.frame += 1

      for (const callback of staleAfterEffects) {
        callback()
      }

      vi.advanceTimersByTime(1000)
    })

    expect(canvasMocks.runtimeEvents).toContainEqual({ type: 'dispose' })
    expect(reportReady).toHaveBeenCalledTimes(0)
    expect(reportFailure).toHaveBeenCalledTimes(0)
    expect(degrade).toHaveBeenCalledTimes(0)
    expect(canvasMocks.rootState?.setFrameloop).not.toHaveBeenCalledWith('always')
  })

  it('synchronizes an initially hidden document before background rendering can continue', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    renderCanvas({ quality: 'low' })
    await screen.findByTestId('universe-canvas-host')

    const rootState = canvasMocks.rootState

    if (!rootState) {
      throw new Error('R3F root state missing')
    }

    expect(canvasMocks.canvasProps).toMatchObject({ frameloop: 'never' })
    expect(rootState.invalidate).toHaveBeenCalledTimes(0)

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(rootState.setFrameloop).not.toHaveBeenCalled()

    await triggerCurrentSceneCompiled()

    expect(rootState.setFrameloop).not.toHaveBeenCalledWith('demand')
    expect(rootState.invalidate).toHaveBeenCalledTimes(0)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(rootState.setFrameloop).toHaveBeenCalledTimes(1)
    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('demand')
    expect(rootState.setFrameloop).toHaveBeenCalledTimes(canvasMocks.propSyncFrameloopChanges.length)
    expect(canvasMocks.propSyncFrameloopChanges).toEqual(['demand'])
    expect(canvasMocks.propSyncInvalidates).toEqual(['demand'])
    expect(rootState.invalidate).toHaveBeenCalledTimes(canvasMocks.propSyncInvalidates.length)
  })

  it('pauses offscreen or hidden scenes with never and resumes by restoring the active loop before invalidating', async () => {
    const documentAddListener = vi.spyOn(document, 'addEventListener')
    const documentRemoveListener = vi.spyOn(document, 'removeEventListener')
    const { unmount } = renderCanvas({ quality: 'low' })
    await screen.findByTestId('universe-canvas-host')
    await triggerCurrentSceneCompiled()
    await triggerCurrentSceneReady()
    await advanceFrame()

    const observer = canvasMocks.observerInstances[0]
    const rootState = canvasMocks.rootState

    if (!rootState) {
      throw new Error('R3F root state missing')
    }

    await act(async () => {
      observer.emit(false)
    })
    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('never')
    expect(rootState.invalidate).toHaveBeenCalledTimes(2)

    await act(async () => {
      observer.emit(true)
    })
    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('demand')
    expect(rootState.invalidate).toHaveBeenCalledTimes(3)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('never')
    expect(rootState.invalidate).toHaveBeenCalledTimes(3)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(rootState.setFrameloop).toHaveBeenLastCalledWith('demand')
    expect(rootState.invalidate).toHaveBeenCalledTimes(4)

    const visibilityListener = documentAddListener.mock.calls.find(([type]) => type === 'visibilitychange')?.[1]
    unmount()
    expect(documentRemoveListener).toHaveBeenCalledWith('visibilitychange', visibilityListener)
  })

  it('bridges WebGLRenderer construction failures before throwing from the gl factory', async () => {
    const reportFailure = vi.fn()
    canvasMocks.skipRendererCreation = true

    renderCanvas({ reportFailure })
    await screen.findByTestId('universe-canvas-host')

    canvasMocks.failRenderer = true
    const glFactory = canvasMocks.canvasProps?.gl as (attributes: { canvas: HTMLCanvasElement }) => MockRenderer

    expect(() => glFactory({ canvas: document.createElement('canvas') })).toThrow('renderer init failed')
    expect(reportFailure).toHaveBeenCalledTimes(1)
  })

  it('disables shader diagnostics on the production WebGL renderer after construction', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    renderCanvas({ quality: 'high' })
    await screen.findByTestId('universe-canvas-host')

    expect(canvasMocks.rootState?.gl.debug.checkShaderErrors).toBe(false)
  })

  it('keeps shader diagnostics enabled outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test')

    renderCanvas({ quality: 'high' })
    await screen.findByTestId('universe-canvas-host')

    expect(canvasMocks.rootState?.gl.debug.checkShaderErrors).toBe(true)
  })

  it('degrades runtime quality only after two consecutive low FPS windows', async () => {
    const degrade = vi.fn()

    renderCanvas({ degrade, quality: 'medium' })
    await screen.findByTestId('universe-canvas-host')

    await advanceLowFpsWindow()
    expect(degrade).toHaveBeenCalledTimes(0)

    await advanceLowFpsWindow()
    expect(degrade).toHaveBeenCalledTimes(1)
  })

  it('publishes a frozen primitive development debug snapshot from the latest renderer and clears it on unmount', async () => {
    const { unmount } = renderCanvas({ quality: 'high' })
    await screen.findByTestId('universe-canvas-host')
    await advanceFrame()

    const snapshot = (window as WindowWithUniverseDebug).__CAPTAIN_DOCK_UNIVERSE_DEBUG__

    expect(snapshot).toMatchObject({
      calls: 7,
      documentVisible: true,
      dpr: 1.25,
      frameCount: 1,
      frameloop: 'always',
      hostVisible: true,
      programs: 2,
      quality: 'high',
      runtimePhase: 'booting',
      settled: false,
      textures: 2,
      targetScene: 'home',
      transitionPhase: 'idle',
      transitionScene: 'home',
      transitionToken: 0,
      triangles: 900,
    })
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(
      Object.values(snapshot ?? {}).every(
        (value) =>
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          value === null,
      ),
    ).toBe(true)

    unmount()

    expect((window as WindowWithUniverseDebug).__CAPTAIN_DOCK_UNIVERSE_DEBUG__).toBeUndefined()
  })

  it('publishes paused runtime and never frameloop debug state synchronously without waiting for another frame', async () => {
    const { unmount } = renderCanvas({ quality: 'low' })
    await screen.findByTestId('universe-canvas-host')
    await advanceFrame()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect((window as WindowWithUniverseDebug).__CAPTAIN_DOCK_UNIVERSE_DEBUG__).toMatchObject({
      documentVisible: false,
      frameloop: 'never',
      hostVisible: true,
      quality: 'low',
      runtimePhase: 'paused',
      transitionPhase: 'idle',
    })

    unmount()
  })

  it('publishes the newest transition token through rapid navigation timers without waiting for a frame', async () => {
    const { rerender } = renderCanvas({ scene: 'home', quality: 'high' })
    await screen.findByTestId('universe-canvas-host')
    await advanceFrame()
    vi.useFakeTimers()

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="arc"
        target={null}
      />,
    )
    const firstToken = (getLatestSceneRouterProps().transition as { token: number }).token

    rerender(
      <UniverseCanvas
        degrade={vi.fn()}
        quality="high"
        reportFailure={vi.fn()}
        reportReady={vi.fn()}
        scene="rialo"
        target={null}
      />,
    )
    const latestToken = (getLatestSceneRouterProps().transition as { token: number }).token

    expect(latestToken).toBeGreaterThan(firstToken)
    expect((window as WindowWithUniverseDebug).__CAPTAIN_DOCK_UNIVERSE_DEBUG__).toMatchObject({
      targetScene: 'rialo',
      transitionPhase: 'departing',
      transitionScene: 'home',
      transitionToken: latestToken,
    })

    await act(async () => {
      vi.advanceTimersByTime(180)
    })
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    await act(async () => {
      vi.advanceTimersByTime(120)
    })

    expect((window as WindowWithUniverseDebug).__CAPTAIN_DOCK_UNIVERSE_DEBUG__).toMatchObject({
      targetScene: 'rialo',
      transitionPhase: 'idle',
      transitionScene: 'rialo',
      transitionToken: latestToken,
    })
  })

  it('does not expose the development debug snapshot in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { unmount } = renderCanvas({ quality: 'high' })
    await screen.findByTestId('universe-canvas-host')
    await advanceFrame()

    expect((window as WindowWithUniverseDebug).__CAPTAIN_DOCK_UNIVERSE_DEBUG__).toBeUndefined()

    unmount()
  })
})
