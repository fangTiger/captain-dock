'use client'

import {
  Canvas,
  addAfterEffect,
  useFrame,
  type EventManager,
  type GLProps,
  type RootStore,
} from '@react-three/fiber'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { WebGLRenderer } from 'three'

import { CameraRig } from './camera-rig'
import type { EnhancedSceneQuality } from './capability-gate.client'
import {
  SCENE_MORPH_DURATION_MS,
  SCENE_PREVIEW_MORPH_DURATION_MS,
} from './finite-scene-morph'
import {
  createRuntimeSceneState,
  getRuntimeSceneFrameloop,
  reduceRuntimeSceneState,
  type RuntimeSceneState,
  type RuntimeSceneFrameloop,
} from './runtime-scene-state'
import { sampleRuntimeQuality, type RuntimeQualityState } from './quality'
import { SceneRouter, type SceneCompilePayload } from './scene-router.client'
import { serializeSceneTarget } from './scene-target'
import type { ImmersiveSceneId, SceneTarget } from './scene-types'
import { SharedUniverse } from './shared-universe'
import {
  createSceneTransitionState,
  reduceSceneTransition,
  SCENE_TRANSITION_ARRIVE_MS,
  SCENE_TRANSITION_DEPART_MS,
  type SceneTransitionState,
} from './transition-machine'
import styles from './universe-shell.module.css'

export const CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 = 'CAPTAIN_DOCK_UNIVERSE_CANVAS_V1'

export type UniverseRuntimeSnapshot = Readonly<{
  frameloop: RuntimeSceneFrameloop
  generation: number
  morphPhase: 'idle' | 'morphing'
  morphProgress: number
  quality: EnhancedSceneQuality
  renderState: 'active' | 'demand' | 'paused'
  scene: ImmersiveSceneId
  settled: boolean
}>

type UniverseCanvasProps = {
  scene: ImmersiveSceneId
  quality: EnhancedSceneQuality
  morphMode?: 'commit' | 'preview'
  morphRevision?: number
  preview?: boolean
  target: SceneTarget | null
  reportReady: () => void
  reportFailure: (error?: unknown) => void
  reportRuntime?: (snapshot: UniverseRuntimeSnapshot) => void
  runtimeGeneration?: number
  degrade: () => void
}

type RootStateLike = {
  gl: WebGLRenderer
  invalidate: () => void
  setFrameloop: (frameloop: RuntimeSceneFrameloop) => void
}

type UniverseDebugSnapshot = Readonly<{
  calls: number
  triangles: number
  textures: number
  programs: number
  dpr: number
  frameCount: number
  frameloop: RuntimeSceneFrameloop
  quality: EnhancedSceneQuality
  transitionScene: ImmersiveSceneId
  targetScene: ImmersiveSceneId
  transitionPhase: SceneTransitionState['phase']
  transitionToken: number
  runtimePhase: RuntimeSceneState['phase']
  settled: boolean
  documentVisible: boolean
  hostVisible: boolean
}>

type WindowWithUniverseDebug = Window &
  typeof globalThis & {
    __CAPTAIN_DOCK_UNIVERSE_DEBUG__?: UniverseDebugSnapshot
  }

const rendererOptions = {
  alpha: true,
  antialias: false,
  depth: true,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'high-performance' as const,
}

const createDisabledCanvasEvents = (() => ({
  enabled: false,
  priority: 1,
  connect() {},
  disconnect() {},
  update() {},
})) satisfies (store: RootStore) => EventManager<HTMLElement>

const lowFpsSampleInitialState: RuntimeQualityState = {
  quality: 'high',
  consecutiveLowFpsWindows: 0,
}

function getDprForQuality(quality: EnhancedSceneQuality) {
  switch (quality) {
    case 'high':
      return [1, 1.5] as [number, number]
    case 'medium':
      return [1, 1.25] as [number, number]
    case 'low':
      return 1
  }
}

function capLoopForQuality(quality: EnhancedSceneQuality, loop: RuntimeSceneFrameloop): RuntimeSceneFrameloop {
  if (quality === 'low' && loop === 'always') {
    return 'demand'
  }

  return loop
}

function configureRealCanvas(canvas: HTMLCanvasElement) {
  canvas.setAttribute('aria-hidden', 'true')
  canvas.setAttribute('data-universe-canvas', 'true')
  canvas.tabIndex = -1
  canvas.style.display = 'block'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'
  canvas.style.width = '100%'
}

function getDocumentVisible() {
  return document.visibilityState !== 'hidden'
}

function getReducedMotionPreference() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function clearUniverseDebug() {
  delete (window as WindowWithUniverseDebug).__CAPTAIN_DOCK_UNIVERSE_DEBUG__
}

function publishUniverseDebug({
  frameloop,
  quality,
  rootState,
  runtimeState,
  transition,
}: {
  frameloop: RuntimeSceneFrameloop
  quality: EnhancedSceneQuality
  rootState: RootStateLike
  runtimeState: RuntimeSceneState
  transition: SceneTransitionState
}) {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  const { info } = rootState.gl

  ;(window as WindowWithUniverseDebug).__CAPTAIN_DOCK_UNIVERSE_DEBUG__ = Object.freeze({
    calls: info.render.calls,
    documentVisible: runtimeState.documentVisible,
    dpr: rootState.gl.getPixelRatio(),
    frameCount: info.render.frame,
    frameloop,
    hostVisible: runtimeState.hostVisible,
    programs: info.programs?.length ?? 0,
    quality,
    runtimePhase: runtimeState.phase,
    settled: runtimeState.settled,
    targetScene: transition.targetScene,
    textures: info.memory.textures,
    transitionPhase: transition.phase,
    transitionScene: transition.scene,
    transitionToken: transition.token,
    triangles: info.render.triangles,
  } satisfies UniverseDebugSnapshot)
}

function getSceneTargetKey(target: SceneTarget | null) {
  return target ? serializeSceneTarget(target) : ''
}

function getSceneCompileKey(
  runtimeGeneration: number,
  scene: ImmersiveSceneId,
  quality: EnhancedSceneQuality,
) {
  return `${runtimeGeneration}:${scene}:${quality}`
}

function RuntimeFrameController({
  onFrame,
}: {
  onFrame: (state: RootStateLike, delta: number) => void
}) {
  useFrame((state, delta) => {
    onFrame(state as RootStateLike, delta)
  })

  return null
}

export function UniverseCanvas({
  degrade,
  morphMode,
  morphRevision = 0,
  preview = false,
  quality,
  reportFailure,
  reportReady,
  reportRuntime,
  runtimeGeneration = 0,
  scene,
  target,
}: UniverseCanvasProps) {
  const effectiveMorphMode = morphMode ?? (preview ? 'preview' : 'commit')
  const spatialMorphMode = preview ? 'preview' : 'commit'
  const hostRef = useRef<HTMLDivElement | null>(null)
  const rootStateRef = useRef<RootStateLike | null>(null)
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const removeContextLossRef = useRef<(() => void) | null>(null)
  const removeAfterEffectRef = useRef<(() => void) | null>(null)
  const postRenderRafRef = useRef<number | null>(null)
  const disposedRef = useRef(false)
  const qualityRef = useRef(quality)
  const reportFailureRef = useRef(reportFailure)
  const reportReadyRef = useRef(reportReady)
  const reportRuntimeRef = useRef(reportRuntime)
  const degradeRef = useRef(degrade)
  const failureReportedRef = useRef(false)
  const actualFrameloopRef = useRef<RuntimeSceneFrameloop>('never')
  const lastTargetKeyRef = useRef(getSceneTargetKey(target))
  const lastMorphIdentityRef = useRef(
    `${runtimeGeneration}:${effectiveMorphMode}:${morphRevision}:${getSceneTargetKey(target)}`,
  )
  const lastMorphGenerationRef = useRef(runtimeGeneration)
  const currentFrameloopRef = useRef<RuntimeSceneFrameloop>('always')
  const runtimeGenerationRef = useRef(runtimeGeneration)
  const sceneRef = useRef(scene)
  const morphFrameRef = useRef<number | null>(null)
  const morphTerminalTimerRef = useRef<number | null>(null)
  const morphTokenRef = useRef(0)
  const morphStateRef = useRef<{
    phase: UniverseRuntimeSnapshot['morphPhase']
    progress: number
  }>({
    phase: 'idle',
    progress: 1,
  })
  const readyArmRef = useRef<{
    frame: number
    token: number
    scene: ImmersiveSceneId
  } | null>(null)
  const readyReportedKeyRef = useRef<string | null>(null)
  const scheduledReadyKeyRef = useRef<string | null>(null)
  const fpsAccumulatorRef = useRef<{
    elapsed: number
    frames: number
    state: RuntimeQualityState
  }>({
    elapsed: 0,
    frames: 0,
    state: {
      ...lowFpsSampleInitialState,
      quality,
    },
  })
  const [runtimeState, dispatchRuntime] = useReducer(
    reduceRuntimeSceneState,
    'enhanced',
    createRuntimeSceneState,
  )
  const runtimeStateRef = useRef(runtimeState)
  const [transition, dispatchTransition] = useReducer(
    reduceSceneTransition,
    scene,
    createSceneTransitionState,
  )
  const [compiledSceneKey, setCompiledSceneKey] = useState<string | null>(null)
  const transitionRef = useRef(transition)
  const logicalFrameloop = capLoopForQuality(quality, getRuntimeSceneFrameloop(runtimeState))
  const sceneCompileKey = getSceneCompileKey(runtimeGeneration, transition.scene, quality)
  const actualFrameloop: RuntimeSceneFrameloop =
    compiledSceneKey === sceneCompileKey ? logicalFrameloop : 'never'
  const motionEnabled = logicalFrameloop !== 'never'
  const reducedMotion = useMemo(() => getReducedMotionPreference(), [])
  const morphDurationMs = effectiveMorphMode === 'preview'
    ? SCENE_PREVIEW_MORPH_DURATION_MS
    : SCENE_MORPH_DURATION_MS
  const dpr = getDprForQuality(quality)
  const targetKey = getSceneTargetKey(target)
  const morphIdentity = `${runtimeGeneration}:${effectiveMorphMode}:${morphRevision}:${targetKey}`
  const publishCurrentDebug = useCallback((rootState = rootStateRef.current, nextFrameloop = currentFrameloopRef.current) => {
    if (!rootState) {
      return
    }

    publishUniverseDebug({
      frameloop: nextFrameloop,
      quality: qualityRef.current,
      rootState,
      runtimeState: runtimeStateRef.current,
      transition: transitionRef.current,
    })
  }, [])
  const reportCurrentRuntime = useCallback(
    (morphState = morphStateRef.current) => {
      const currentRuntime = runtimeStateRef.current
      const currentFrameloop = currentFrameloopRef.current
      const renderState: UniverseRuntimeSnapshot['renderState'] =
        currentFrameloop === 'never'
          ? 'paused'
          : currentFrameloop === 'demand'
            ? 'demand'
            : 'active'

      reportRuntimeRef.current?.({
        frameloop: currentFrameloop,
        generation: runtimeGenerationRef.current,
        morphPhase: morphState.phase,
        morphProgress: morphState.progress,
        quality: qualityRef.current,
        renderState,
        scene: sceneRef.current,
        settled: currentRuntime.settled && morphState.phase === 'idle',
      })
    },
    [],
  )
  const cancelMorphTimeline = useCallback((settle: boolean) => {
    morphTokenRef.current += 1

    if (morphFrameRef.current !== null) {
      window.cancelAnimationFrame(morphFrameRef.current)
      morphFrameRef.current = null
    }
    if (morphTerminalTimerRef.current !== null) {
      window.clearTimeout(morphTerminalTimerRef.current)
      morphTerminalTimerRef.current = null
    }

    if (settle) {
      morphStateRef.current = {
        phase: 'idle',
        progress: 1,
      }
      reportCurrentRuntime()
    }
  }, [reportCurrentRuntime])
  const beginMorphTimeline = useCallback((durationMs: number) => {
    cancelMorphTimeline(false)

    if (
      qualityRef.current === 'low' ||
      reducedMotion ||
      currentFrameloopRef.current === 'never'
    ) {
      morphStateRef.current = {
        phase: 'idle',
        progress: 1,
      }
      reportCurrentRuntime()
      return
    }

    const token = morphTokenRef.current
    const generation = runtimeGenerationRef.current
    const morphScene = sceneRef.current
    const startedAt = performance.now()
    const updateProgress = (now: number) => {
      if (
        token !== morphTokenRef.current ||
        generation !== runtimeGenerationRef.current ||
        morphScene !== sceneRef.current
      ) {
        return
      }

      const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs))

      if (progress >= 1) {
        morphFrameRef.current = null
        morphStateRef.current = {
          phase: 'idle',
          progress: 1,
        }
        reportCurrentRuntime()
        return
      }

      morphStateRef.current = {
        phase: 'morphing',
        progress,
      }
      reportCurrentRuntime()
      morphFrameRef.current = window.requestAnimationFrame(updateProgress)
    }

    morphStateRef.current = {
      phase: 'morphing',
      progress: 0,
    }
    reportCurrentRuntime()
    morphFrameRef.current = window.requestAnimationFrame(updateProgress)
    morphTerminalTimerRef.current = window.setTimeout(() => {
      if (
        token !== morphTokenRef.current ||
        generation !== runtimeGenerationRef.current ||
        morphScene !== sceneRef.current
      ) {
        return
      }

      if (morphFrameRef.current !== null) {
        window.cancelAnimationFrame(morphFrameRef.current)
        morphFrameRef.current = null
      }
      morphTerminalTimerRef.current = null
      morphStateRef.current = {
        phase: 'idle',
        progress: 1,
      }
      reportCurrentRuntime()
    }, durationMs)
  }, [cancelMorphTimeline, reducedMotion, reportCurrentRuntime])

  useEffect(() => {
    qualityRef.current = quality
    reportCurrentRuntime()
  }, [quality, reportCurrentRuntime])

  useEffect(() => {
    reportFailureRef.current = reportFailure
    reportReadyRef.current = reportReady
    degradeRef.current = degrade
  }, [degrade, reportFailure, reportReady])

  useEffect(() => {
    reportRuntimeRef.current = reportRuntime
    runtimeGenerationRef.current = runtimeGeneration
    sceneRef.current = scene
    reportCurrentRuntime()
  }, [
    reportRuntime,
    reportCurrentRuntime,
    runtimeGeneration,
    scene,
  ])

  useEffect(() => {
    currentFrameloopRef.current = logicalFrameloop
    publishCurrentDebug(undefined, logicalFrameloop)
    reportCurrentRuntime()
  }, [logicalFrameloop, publishCurrentDebug, reportCurrentRuntime])

  useEffect(() => {
    runtimeStateRef.current = runtimeState
    publishCurrentDebug()
    reportCurrentRuntime()
  }, [publishCurrentDebug, reportCurrentRuntime, runtimeState])

  useEffect(() => {
    transitionRef.current = transition
    publishCurrentDebug()
  }, [publishCurrentDebug, transition])

  useEffect(() => {
    if (lastTargetKeyRef.current === targetKey) {
      return
    }

    lastTargetKeyRef.current = targetKey

    const rootState = rootStateRef.current

    if (!rootState || actualFrameloopRef.current === 'never') {
      return
    }

    rootState.invalidate()
  }, [targetKey])

  useEffect(() => {
    if (lastMorphGenerationRef.current !== runtimeGeneration) {
      lastMorphGenerationRef.current = runtimeGeneration
      lastMorphIdentityRef.current = morphIdentity
      cancelMorphTimeline(true)
      return
    }

    if (lastMorphIdentityRef.current === morphIdentity) {
      return
    }

    lastMorphIdentityRef.current = morphIdentity
    beginMorphTimeline(morphDurationMs)
  }, [
    beginMorphTimeline,
    cancelMorphTimeline,
    morphDurationMs,
    morphIdentity,
    runtimeGeneration,
  ])

  useEffect(() => {
    if (logicalFrameloop === 'never' || quality === 'low') {
      cancelMorphTimeline(true)
    }
  }, [cancelMorphTimeline, logicalFrameloop, quality])

  useEffect(() => {
    if (quality === 'low' && fpsAccumulatorRef.current.state.quality !== 'low') {
      fpsAccumulatorRef.current.state = {
        quality: 'low',
        consecutiveLowFpsWindows: 0,
      }
    }
    publishCurrentDebug()
  }, [publishCurrentDebug, quality])

  const failOnce = useCallback((eventType: 'context-lost' | 'init-failure', error?: unknown) => {
    if (failureReportedRef.current || disposedRef.current) {
      return
    }

    failureReportedRef.current = true
    dispatchRuntime(eventType === 'context-lost' ? { type: 'context-lost' } : { type: 'init-failure' })
    reportFailureRef.current(error)
  }, [])

  const isCurrentSceneCompilePayload = useCallback((payload: SceneCompilePayload) => {
    if (disposedRef.current) {
      return false
    }

    return (
      payload.compileKey === sceneCompileKey &&
      payload.scene === transition.scene &&
      payload.token === transition.token
    )
  }, [sceneCompileKey, transition.scene, transition.token])

  const onSceneCompiled = useCallback((payload: SceneCompilePayload) => {
    if (!isCurrentSceneCompilePayload(payload)) {
      return
    }

    setCompiledSceneKey((currentKey) =>
      currentKey === payload.compileKey ? currentKey : payload.compileKey,
    )
  }, [isCurrentSceneCompilePayload])

  const onSceneCompileError = useCallback((payload: SceneCompilePayload, error: unknown) => {
    if (!isCurrentSceneCompilePayload(payload)) {
      return
    }

    failOnce('init-failure', error)
  }, [failOnce, isCurrentSceneCompilePayload])

  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    removeContextLossRef.current?.()
    removeContextLossRef.current = null
    canvasElementRef.current = canvas

    if (canvas) {
      configureRealCanvas(canvas)

      const handleContextLost = (event: Event) => {
        if (event.cancelable) {
          event.preventDefault()
        }

        failOnce('context-lost', event)
      }

      canvas.addEventListener('webglcontextlost', handleContextLost)
      removeContextLossRef.current = () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost)
      }
    }
  }, [failOnce])

  const glFactory = useCallback(
    (parameters: { canvas?: unknown }) => {
      try {
        const canvas = parameters.canvas as HTMLCanvasElement | undefined

        if (canvas instanceof HTMLCanvasElement) {
          configureRealCanvas(canvas)
        }

        const renderer = new WebGLRenderer({
          ...rendererOptions,
          canvas,
        })

        renderer.debug.checkShaderErrors = process.env.NODE_ENV !== 'production'

        if (renderer.domElement instanceof HTMLCanvasElement) {
          configureRealCanvas(renderer.domElement)
        }

        return renderer
      } catch (error) {
        failOnce('init-failure', error)
        throw error
      }
    },
    [failOnce],
  )

  const cancelPostRenderConfirmation = useCallback(() => {
    if (postRenderRafRef.current !== null) {
      window.cancelAnimationFrame(postRenderRafRef.current)
    }

    postRenderRafRef.current = null
    scheduledReadyKeyRef.current = null
  }, [])

  const reportAfterRenderedFrame = useCallback(() => {
    const currentRootState = rootStateRef.current

    if (!currentRootState || disposedRef.current) {
      return
    }

    const readyArm = readyArmRef.current

    if (readyArm) {
      const readyKey = `${readyArm.token}:${readyArm.scene}`

      if (
        readyReportedKeyRef.current !== readyKey &&
        currentRootState.gl.info.render.frame > readyArm.frame
      ) {
        readyReportedKeyRef.current = readyKey
        dispatchRuntime({ type: 'first-frame' })
        cancelPostRenderConfirmation()
        reportReadyRef.current()
      }
    }

    publishCurrentDebug(currentRootState)
  }, [cancelPostRenderConfirmation, publishCurrentDebug])

  const schedulePostRenderConfirmation = useCallback(() => {
    const readyArm = readyArmRef.current

    if (!readyArm) {
      return
    }

    const readyKey = `${readyArm.token}:${readyArm.scene}`

    if (readyReportedKeyRef.current === readyKey || scheduledReadyKeyRef.current === readyKey) {
      return
    }

    scheduledReadyKeyRef.current = readyKey
    postRenderRafRef.current = window.requestAnimationFrame(() => {
      postRenderRafRef.current = null
      scheduledReadyKeyRef.current = null
      reportAfterRenderedFrame()
    })
  }, [reportAfterRenderedFrame])

  useEffect(() => {
    dispatchTransition({ type: 'navigate', reducedMotion, scene })
    readyArmRef.current = null
    cancelPostRenderConfirmation()
  }, [cancelPostRenderConfirmation, reducedMotion, scene])

  const onCreated = useCallback(
    (state: RootStateLike) => {
      disposedRef.current = false
      rootStateRef.current = state
      configureRealCanvas(state.gl.domElement)
      actualFrameloopRef.current = actualFrameloop
      removeAfterEffectRef.current?.()
      removeAfterEffectRef.current = addAfterEffect(reportAfterRenderedFrame)
      publishCurrentDebug(state, logicalFrameloop)
    },
    [actualFrameloop, logicalFrameloop, publishCurrentDebug, reportAfterRenderedFrame],
  )

  const onSceneReady = useCallback((readyScene: ImmersiveSceneId, readyToken: number) => {
    const rootState = rootStateRef.current
    const currentTransition = transitionRef.current

    if (!rootState || readyScene !== currentTransition.scene || readyToken !== currentTransition.token) {
      return
    }

    readyArmRef.current = {
      frame: rootState.gl.info.render.frame,
      token: readyToken,
      scene: readyScene,
    }

    if (actualFrameloopRef.current !== 'never') {
      rootState.invalidate()
    }

    schedulePostRenderConfirmation()
  }, [schedulePostRenderConfirmation])

  const onRuntimeFrame = useCallback((frameState: RootStateLike, delta: number) => {
    const accumulator = fpsAccumulatorRef.current

    accumulator.elapsed += delta
    accumulator.frames += 1

    if (accumulator.elapsed < 1) {
      return
    }

    const fps = accumulator.frames / accumulator.elapsed
    const previousQuality = accumulator.state.quality
    const nextState = sampleRuntimeQuality(accumulator.state, fps)

    accumulator.elapsed = 0
    accumulator.frames = 0
    accumulator.state = nextState

    if (nextState.quality !== previousQuality) {
      degradeRef.current()
    }
  }, [])

  const requestSceneFrame = useCallback(() => {
    if (actualFrameloopRef.current !== 'never') {
      rootStateRef.current?.invalidate()
    }
  }, [])

  useEffect(() => {
    const token = transition.token
    let timer: ReturnType<typeof setTimeout> | undefined

    if (transition.phase === 'departing') {
      timer = setTimeout(() => {
        dispatchTransition({ type: 'departed', token })
        dispatchTransition({ type: 'swapped', token })
      }, SCENE_TRANSITION_DEPART_MS)
    }

    if (transition.phase === 'arriving') {
      timer = setTimeout(() => {
        dispatchTransition({ type: 'arrived', token })
      }, quality === 'medium' ? 260 : SCENE_TRANSITION_ARRIVE_MS)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [quality, transition.phase, transition.token])

  useLayoutEffect(() => {
    actualFrameloopRef.current = actualFrameloop
  }, [actualFrameloop])

  useEffect(() => {
    const host = hostRef.current

    if (!host || typeof IntersectionObserver !== 'function') {
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      if (disposedRef.current) {
        return
      }

      const entry = entries[0]

      dispatchRuntime({
        type: 'host-visibility',
        visible: Boolean(entry?.isIntersecting),
      })
    })

    observer.observe(host)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (disposedRef.current) {
        return
      }

      dispatchRuntime({
        type: 'document-visibility',
        visible: getDocumentVisible(),
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    handleVisibilityChange()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!runtimeState.hasFirstFrame || runtimeState.settled || runtimeState.phase !== 'ready') {
      return undefined
    }

    if (quality === 'low') {
      dispatchRuntime({ type: 'scene-settled' })

      return undefined
    }

    const timer = setTimeout(
      () => dispatchRuntime({ type: 'scene-settled' }),
      quality === 'high' ? 400 : 260,
    )

    return () => {
      clearTimeout(timer)
    }
  }, [quality, runtimeState.hasFirstFrame, runtimeState.phase, runtimeState.settled])

  useEffect(() => {
    disposedRef.current = false

    if (rootStateRef.current && !removeAfterEffectRef.current) {
      removeAfterEffectRef.current = addAfterEffect(reportAfterRenderedFrame)
    }

    return () => {
      runtimeStateRef.current = reduceRuntimeSceneState(runtimeStateRef.current, { type: 'dispose' })
      disposedRef.current = true
      removeContextLossRef.current?.()
      removeContextLossRef.current = null
      removeAfterEffectRef.current?.()
      removeAfterEffectRef.current = null
      cancelMorphTimeline(false)
      cancelPostRenderConfirmation()
      clearUniverseDebug()
    }
  }, [cancelMorphTimeline, cancelPostRenderConfirmation, reportAfterRenderedFrame])

  const canvasStyle = useMemo<CSSProperties>(
    () => ({
      height: '100%',
      inset: 0,
      pointerEvents: 'none',
      position: 'absolute',
      width: '100%',
    }),
    [],
  )

  return (
    <div
      aria-hidden="true"
      className={styles.canvasHost}
      data-testid="universe-canvas-host"
      ref={hostRef}
      style={{ pointerEvents: 'none' }}
      tabIndex={-1}
    >
      <Canvas
        aria-hidden="true"
        className={styles.canvasSurface}
        dpr={dpr}
        events={createDisabledCanvasEvents}
        frameloop={actualFrameloop}
        gl={glFactory as GLProps}
        onCreated={onCreated}
        ref={canvasRef}
        style={canvasStyle}
        tabIndex={-1}
      >
        <RuntimeFrameController onFrame={onRuntimeFrame} />
        <SharedUniverse quality={quality} scene={transition.scene} />
        <CameraRig
          morphDurationMs={morphDurationMs}
          morphMode={spatialMorphMode}
          motionEnabled={motionEnabled}
          quality={quality}
          reducedMotion={reducedMotion}
          scene={transition.scene}
          target={target}
        />
        <SceneRouter
          compileKey={sceneCompileKey}
          morphDurationMs={morphDurationMs}
          morphMode={spatialMorphMode}
          motionEnabled={motionEnabled}
          onSceneCompileError={onSceneCompileError}
          onSceneCompiled={onSceneCompiled}
          onSceneReady={onSceneReady}
          quality={quality}
          reducedMotion={reducedMotion}
          requestFrame={requestSceneFrame}
          target={target}
          transition={transition}
        />
      </Canvas>
    </div>
  )
}
