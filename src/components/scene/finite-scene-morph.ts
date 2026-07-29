import { useEffect, useRef, type RefObject } from 'react'
import type { Group } from 'three'

export const SCENE_MORPH_DURATION_MS = 780
export const SCENE_PREVIEW_MORPH_DURATION_MS = 220
export const SCENE_PREVIEW_ENDPOINT_RATIO = 0.58

export type FiniteSceneMorphMode = 'enhanced' | 'low' | 'reduced' | 'static'
export type FiniteSceneMorphStatus = 'complete' | 'running' | 'stopped'
export type SceneMorphInteractionMode = 'commit' | 'preview'

export type FiniteSceneMorphState = Readonly<{
  current: number
  durationMs: number
  elapsedMs: number
  from: number
  status: FiniteSceneMorphStatus
  target: number
  token: number
}>

type RedirectFiniteSceneMorphOptions = Readonly<{
  durationMs?: number
  mode?: FiniteSceneMorphMode
  target: number
  token: number
}>

type FiniteSceneMorphLifecycle = Readonly<{
  disposed?: boolean
  visible?: boolean
}>

export type FiniteSceneMorphFrame = Readonly<{
  requestFrame: boolean
  state: FiniteSceneMorphState
}>

export type SpatialSceneMorphProfile = Readonly<{
  impact?: number
  positionX: number
  positionY: number
  rotationZ: number
  scaleX: number
  scaleY: number
}>

type SpatialSceneMorphOptions = Readonly<{
  durationMs: number
  morphMode?: SceneMorphInteractionMode
  motionEnabled: boolean
  profile: SpatialSceneMorphProfile
  quality: 'high' | 'medium' | 'low'
  reducedMotion: boolean
  requestFrame: () => void
}>

type SpatialSceneMorphChannels = {
  impact: FiniteSceneMorphState
  positionX: FiniteSceneMorphState
  positionY: FiniteSceneMorphState
  rotationZ: FiniteSceneMorphState
  scaleX: FiniteSceneMorphState
  scaleY: FiniteSceneMorphState
}

function clampUnit(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function easeFiniteSceneProgress(progress: number) {
  const clamped = clampUnit(progress)

  return clamped * clamped * (3 - 2 * clamped)
}

export function interpolateFiniteSceneValue(from: number, target: number, progress: number) {
  const eased = easeFiniteSceneProgress(progress)

  return from + (target - from) * eased
}

export function createFiniteSceneMorph(value: number): FiniteSceneMorphState {
  return {
    current: value,
    durationMs: SCENE_MORPH_DURATION_MS,
    elapsedMs: SCENE_MORPH_DURATION_MS,
    from: value,
    status: 'complete',
    target: value,
    token: 0,
  }
}

export function redirectFiniteSceneMorph(
  state: FiniteSceneMorphState,
  {
    durationMs = SCENE_MORPH_DURATION_MS,
    mode = 'enhanced',
    target,
    token,
  }: RedirectFiniteSceneMorphOptions,
): FiniteSceneMorphState {
  if (token <= state.token) {
    return state
  }

  if (mode !== 'enhanced' || target === state.current) {
    return {
      current: target,
      durationMs,
      elapsedMs: durationMs,
      from: target,
      status: 'complete',
      target,
      token,
    }
  }

  return {
    current: state.current,
    durationMs,
    elapsedMs: 0,
    from: state.current,
    status: 'running',
    target,
    token,
  }
}

export function advanceFiniteSceneMorph(
  state: FiniteSceneMorphState,
  deltaMs: number,
  { disposed = false, visible = true }: FiniteSceneMorphLifecycle = {},
): FiniteSceneMorphFrame {
  if (state.status !== 'running') {
    return {
      requestFrame: false,
      state,
    }
  }

  if (disposed) {
    return {
      requestFrame: false,
      state: {
        ...state,
        status: 'stopped',
      },
    }
  }

  if (!visible) {
    return {
      requestFrame: false,
      state: {
        ...state,
        current: state.target,
        elapsedMs: state.durationMs,
        from: state.target,
        status: 'complete',
      },
    }
  }

  const elapsedMs = Math.min(state.elapsedMs + Math.max(deltaMs, 0), state.durationMs)
  const complete = elapsedMs >= state.durationMs
  const current = complete
    ? state.target
    : interpolateFiniteSceneValue(state.from, state.target, elapsedMs / state.durationMs)

  return {
    requestFrame: !complete,
    state: {
      ...state,
      current,
      elapsedMs,
      status: complete ? 'complete' : 'running',
    },
  }
}

function createSpatialChannels(profile: SpatialSceneMorphProfile): SpatialSceneMorphChannels {
  return {
    impact: createFiniteSceneMorph(profile.impact ?? 0),
    positionX: createFiniteSceneMorph(profile.positionX),
    positionY: createFiniteSceneMorph(profile.positionY),
    rotationZ: createFiniteSceneMorph(profile.rotationZ),
    scaleX: createFiniteSceneMorph(profile.scaleX),
    scaleY: createFiniteSceneMorph(profile.scaleY),
  }
}

export function resolveSpatialSceneMorphProfile(
  profile: SpatialSceneMorphProfile,
  morphMode: SceneMorphInteractionMode,
): SpatialSceneMorphProfile {
  if (morphMode === 'commit') {
    return profile
  }

  return {
    impact: (profile.impact ?? 0) * SCENE_PREVIEW_ENDPOINT_RATIO,
    positionX: profile.positionX * SCENE_PREVIEW_ENDPOINT_RATIO,
    positionY: profile.positionY * SCENE_PREVIEW_ENDPOINT_RATIO,
    rotationZ: profile.rotationZ * SCENE_PREVIEW_ENDPOINT_RATIO,
    scaleX: 1 + (profile.scaleX - 1) * SCENE_PREVIEW_ENDPOINT_RATIO,
    scaleY: 1 + (profile.scaleY - 1) * SCENE_PREVIEW_ENDPOINT_RATIO,
  }
}

function applySpatialChannels(group: Group, channels: SpatialSceneMorphChannels) {
  const impact = channels.impact.current

  group.position.set(
    channels.positionX.current,
    channels.positionY.current,
    impact * 0.18,
  )
  group.rotation.z = channels.rotationZ.current
  group.scale.set(
    channels.scaleX.current * (1 + impact * 0.1),
    channels.scaleY.current * (1 + impact * 0.1),
    1,
  )
}

export function useFiniteSceneMorphGroup(
  groupRef: RefObject<Group | null>,
  {
    motionEnabled,
    durationMs,
    morphMode = 'commit',
    profile,
    quality,
    reducedMotion,
    requestFrame,
  }: SpatialSceneMorphOptions,
) {
  const tokenRef = useRef(0)
  const disposedRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const channelsRef = useRef(
    createSpatialChannels(resolveSpatialSceneMorphProfile(profile, morphMode)),
  )
  const {
    impact = 0,
    positionX,
    positionY,
    rotationZ,
    scaleX,
    scaleY,
  } = profile

  useEffect(() => {
    disposedRef.current = false

    return () => {
      disposedRef.current = true

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const channels = channelsRef.current
    const resolvedProfile = resolveSpatialSceneMorphProfile({
      impact,
      positionX,
      positionY,
      rotationZ,
      scaleX,
      scaleY,
    }, morphMode)
    const targets = {
      impact: resolvedProfile.impact ?? 0,
      positionX: resolvedProfile.positionX,
      positionY: resolvedProfile.positionY,
      rotationZ: resolvedProfile.rotationZ,
      scaleX: resolvedProfile.scaleX,
      scaleY: resolvedProfile.scaleY,
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (!motionEnabled) {
      tokenRef.current += 1
      const token = tokenRef.current

      for (const key of Object.keys(channels) as Array<keyof SpatialSceneMorphChannels>) {
        channels[key] = redirectFiniteSceneMorph(channels[key], {
          durationMs,
          mode: 'static',
          target: targets[key],
          token,
        })
      }
      if (groupRef.current) {
        applySpatialChannels(groupRef.current, channels)
      }
      return
    }

    tokenRef.current += 1
    const token = tokenRef.current
    const mode: FiniteSceneMorphMode =
      quality === 'low' ? 'low' : reducedMotion ? 'reduced' : 'enhanced'
    for (const key of Object.keys(channels) as Array<keyof SpatialSceneMorphChannels>) {
      channels[key] = redirectFiniteSceneMorph(channels[key], {
        durationMs,
        mode,
        target: targets[key],
        token,
      })
    }

    if (groupRef.current) {
      applySpatialChannels(groupRef.current, channels)
    }
    requestFrame()

    if (Object.values(channels).every((channel) => channel.status !== 'running')) {
      return
    }

    let previousTimestamp: number | null = null
    const tick = (timestamp: number) => {
      if (disposedRef.current || !motionEnabled) {
        animationFrameRef.current = null
        return
      }

      const deltaMs =
        previousTimestamp === null ? 0 : Math.max(timestamp - previousTimestamp, 0)
      previousTimestamp = timestamp
      let shouldContinue = false

      for (const key of Object.keys(channels) as Array<keyof SpatialSceneMorphChannels>) {
        const frame = advanceFiniteSceneMorph(channels[key], deltaMs, {
          disposed: disposedRef.current,
          visible: motionEnabled,
        })

        channels[key] = frame.state
        shouldContinue ||= frame.requestFrame
      }

      if (groupRef.current) {
        applySpatialChannels(groupRef.current, channels)
      }
      requestFrame()

      if (shouldContinue) {
        animationFrameRef.current = window.requestAnimationFrame(tick)
      } else {
        animationFrameRef.current = null
      }
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [
    groupRef,
    durationMs,
    morphMode,
    motionEnabled,
    impact,
    positionX,
    positionY,
    rotationZ,
    scaleX,
    scaleY,
    quality,
    reducedMotion,
    requestFrame,
  ])
}
