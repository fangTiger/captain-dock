'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { parseSceneTarget, serializeSceneTarget } from './scene-target'
import {
  SCENE_PROJECT_ECOSYSTEMS,
  type ImmersiveSceneId,
  type SceneTarget,
  type SceneTargetPreviewSource,
  type SceneTargetValue,
} from './scene-types'

type SceneTargetControllerProps = Readonly<{
  children: ReactNode
  scene: ImmersiveSceneId
}>

type SceneTargetBoundaryProps = SceneTargetControllerProps

type PreviewState = Readonly<{
  focusTarget: SceneTarget | null
  latestSource: SceneTargetPreviewSource | null
  pointerTarget: SceneTarget | null
}>

type ControllerState = PreviewState & Readonly<{
  announcementTarget: SceneTarget | null
  commitRevision: number
  committedTarget: SceneTarget
  motionMode: 'commit' | 'preview'
  scene: ImmersiveSceneId
}>

type SceneTargetControllerValue = Readonly<{
  announcementTarget: SceneTarget | null
  clearPreviewTarget: (source: SceneTargetPreviewSource) => void
  commitRevision: number
  commitTarget: (input: unknown) => void
  committedTarget: SceneTarget
  effectiveTarget: SceneTarget
  motionMode: 'commit' | 'preview'
  previewTarget: SceneTarget | null
  scene: ImmersiveSceneId
  setPreviewTarget: (input: unknown, source: SceneTargetPreviewSource) => void
}>

const SceneTargetContext = createContext<SceneTargetControllerValue | null>(null)

function getRouteDefaultTarget(scene: ImmersiveSceneId): SceneTarget {
  switch (scene) {
    case 'home':
    case 'arc':
      return { kind: 'project', project: 'signal-ledger' }
    case 'rialo':
      return { kind: 'rialo-step', step: 'observe' }
  }
}

function createControllerState(scene: ImmersiveSceneId): ControllerState {
  return {
    announcementTarget: null,
    commitRevision: 0,
    committedTarget: getRouteDefaultTarget(scene),
    focusTarget: null,
    latestSource: null,
    motionMode: 'commit',
    pointerTarget: null,
    scene,
  }
}

function normalizeTarget(input: unknown): SceneTarget | null {
  if (typeof input === 'string') {
    return parseSceneTarget(input)
  }

  if (!input || typeof input !== 'object') {
    return null
  }

  try {
    return parseSceneTarget(serializeSceneTarget(input as SceneTarget))
  } catch {
    return null
  }
}

function isTargetAllowed(scene: ImmersiveSceneId, target: SceneTarget) {
  if (scene === 'home') {
    return target.kind === 'ecosystem' || target.kind === 'project'
  }

  if (target.kind === 'ecosystem') {
    return target.ecosystem === scene
  }

  if (target.kind === 'rialo-step') {
    return scene === 'rialo'
  }

  return SCENE_PROJECT_ECOSYSTEMS[target.project] === scene
}

function targetsEqual(left: SceneTarget, right: SceneTarget) {
  return serializeSceneTarget(left) === serializeSceneTarget(right)
}

function getPreviewTarget(state: PreviewState): SceneTarget | null {
  if (state.latestSource === 'focus') {
    return state.focusTarget ?? state.pointerTarget
  }

  if (state.latestSource === 'pointer') {
    return state.pointerTarget ?? state.focusTarget
  }

  return state.focusTarget ?? state.pointerTarget
}

function updatePreviewState(
  state: ControllerState,
  source: SceneTargetPreviewSource,
  target: SceneTarget | null,
): ControllerState {
  const currentSourceTarget = source === 'focus' ? state.focusTarget : state.pointerTarget

  if (target === null && currentSourceTarget === null) {
    return state
  }

  const otherSource: SceneTargetPreviewSource = source === 'focus' ? 'pointer' : 'focus'
  const focusTarget = source === 'focus' ? target : state.focusTarget
  const pointerTarget = source === 'pointer' ? target : state.pointerTarget
  const fallbackTarget = source === 'focus' ? pointerTarget : focusTarget
  let latestSource = state.latestSource

  if (target) {
    latestSource = source
  } else if (latestSource === source) {
    latestSource = fallbackTarget ? otherSource : null
  }

  return {
    ...state,
    focusTarget,
    latestSource,
    motionMode: 'preview',
    pointerTarget,
  }
}

function getScopedState(state: ControllerState, scene: ImmersiveSceneId) {
  return state.scene === scene ? state : createControllerState(scene)
}

export function SceneTargetController({ children, scene }: SceneTargetControllerProps) {
  const [state, setState] = useState<ControllerState>(() => createControllerState(scene))
  const scopedState = getScopedState(state, scene)
  const activePreviewTarget = getPreviewTarget(scopedState)
  const previewTarget =
    activePreviewTarget && !targetsEqual(activePreviewTarget, scopedState.committedTarget)
      ? activePreviewTarget
      : null
  const effectiveTarget =
    activePreviewTarget ?? scopedState.committedTarget ?? getRouteDefaultTarget(scene)

  if (state.scene !== scene) {
    setState(createControllerState(scene))
  }

  const setPreviewTarget = useCallback(
    (input: unknown, source: SceneTargetPreviewSource) => {
      setState((current) => {
        const scoped = getScopedState(current, scene)
        const parsedTarget = normalizeTarget(input)
        const allowedTarget = parsedTarget && isTargetAllowed(scene, parsedTarget) ? parsedTarget : null

        if (allowedTarget && targetsEqual(allowedTarget, scoped.committedTarget)) {
          const activePreviewTarget = getPreviewTarget(scoped)
          const hasVisualPreview = Boolean(
            activePreviewTarget && !targetsEqual(activePreviewTarget, scoped.committedTarget),
          )

          if (!hasVisualPreview) {
            return scoped
          }
        }

        return updatePreviewState(scoped, source, allowedTarget)
      })
    },
    [scene],
  )

  const clearPreviewTarget = useCallback(
    (source: SceneTargetPreviewSource) => {
      setState((current) => updatePreviewState(getScopedState(current, scene), source, null))
    },
    [scene],
  )

  const commitTarget = useCallback(
    (input: unknown) => {
      setState((current) => {
        const scoped = getScopedState(current, scene)
        const target = normalizeTarget(input)

        if (!target || !isTargetAllowed(scene, target)) {
          return scoped
        }

        const isSameCommittedTarget = targetsEqual(scoped.committedTarget, target)
        const hasPreview = Boolean(scoped.focusTarget || scoped.pointerTarget)
        const activePreviewTarget = getPreviewTarget(scoped)
        const hasVisualPreview = Boolean(
          activePreviewTarget && !targetsEqual(activePreviewTarget, scoped.committedTarget),
        )

        if (isSameCommittedTarget && !hasVisualPreview) {
          return hasPreview
            ? {
                ...scoped,
                focusTarget: null,
                latestSource: null,
                motionMode: 'commit',
                pointerTarget: null,
              }
            : scoped
        }

        return {
          ...scoped,
          announcementTarget: isSameCommittedTarget ? scoped.announcementTarget : target,
          commitRevision: scoped.commitRevision + 1,
          committedTarget: isSameCommittedTarget ? scoped.committedTarget : target,
          focusTarget: null,
          latestSource: null,
          motionMode: 'commit',
          pointerTarget: null,
        }
      })
    },
    [scene],
  )

  const value = useMemo<SceneTargetControllerValue>(
    () => ({
      announcementTarget: scopedState.announcementTarget,
      clearPreviewTarget,
      commitRevision: scopedState.commitRevision,
      commitTarget,
      committedTarget: scopedState.committedTarget,
      effectiveTarget,
      motionMode: scopedState.motionMode,
      previewTarget,
      scene,
      setPreviewTarget,
    }),
    [
      clearPreviewTarget,
      scopedState.commitRevision,
      commitTarget,
      effectiveTarget,
      scopedState.motionMode,
      previewTarget,
      scene,
      scopedState.announcementTarget,
      scopedState.committedTarget,
      setPreviewTarget,
    ],
  )

  return <SceneTargetContext value={value}>{children}</SceneTargetContext>
}

export function useSceneTargetController() {
  const controller = useContext(SceneTargetContext)

  if (!controller) {
    throw new Error('useSceneTargetController must be used within SceneTargetController')
  }

  return controller
}

export function SceneTargetBoundary({ children, scene }: SceneTargetBoundaryProps) {
  const controller = useContext(SceneTargetContext)

  if (controller) {
    return children
  }

  return <SceneTargetController scene={scene}>{children}</SceneTargetController>
}

export type { SceneTargetControllerValue, SceneTargetValue }
