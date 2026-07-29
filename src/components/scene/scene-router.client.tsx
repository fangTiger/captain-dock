'use client'

import { lazy, Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

import type { EcosystemSlug, ProjectSlug } from '../../content/types'
import type { SceneMorphInteractionMode } from './finite-scene-morph'
import type { EnhancedSceneQuality } from './scene-primitives'
import {
  SCENE_ECOSYSTEM_ACCENTS,
  SCENE_PROJECT_ACCENTS,
  SCENE_PROJECT_ECOSYSTEMS,
  type ImmersiveSceneId,
  type SceneTarget,
} from './scene-types'
import type { SceneTransitionState } from './transition-machine'

const HomeAstrolabe = lazy(() => import('./scenes/home-constellation'))
const ArcOrbitalCircuit = lazy(() => import('./scenes/arc-orbital-circuit'))
const RialoReactiveField = lazy(() => import('./scenes/rialo-reactive-field'))

export type ProgrammaticScenePalette = {
  ecosystems: Record<EcosystemSlug, string>
  projects: Record<ProjectSlug, string>
  neutral: string
  grid: string
  panel: string
  risk: string
}

export type ProgrammaticSceneProps = {
  colors: ProgrammaticScenePalette
  morphDurationMs: number
  morphMode?: SceneMorphInteractionMode
  motionEnabled: boolean
  quality: EnhancedSceneQuality
  reducedMotion: boolean
  requestFrame: () => void
  target: SceneTarget | null
  variant: 'current' | 'outgoing'
}

export type SceneCompilePayload = Readonly<{
  compileKey: string
  scene: ImmersiveSceneId
  token: number
}>

type SceneRouterProps = {
  compileKey?: string
  morphDurationMs: number
  morphMode?: SceneMorphInteractionMode
  motionEnabled: boolean
  quality: EnhancedSceneQuality
  reducedMotion: boolean
  requestFrame: () => void
  target: SceneTarget | null
  transition: SceneTransitionState
  onSceneCompileError?: (payload: SceneCompilePayload, error: unknown) => void
  onSceneCompiled?: (payload: SceneCompilePayload) => void
  onSceneReady?: (scene: ImmersiveSceneId, token: number) => void
}

type SceneEntry = {
  scene: ImmersiveSceneId
  variant: ProgrammaticSceneProps['variant']
  ready: boolean
  renderKey: ImmersiveSceneId
}

const sceneComponents = {
  home: HomeAstrolabe,
  arc: ArcOrbitalCircuit,
  rialo: RialoReactiveField,
} as const

function createScenePalette(): ProgrammaticScenePalette {
  return {
    ecosystems: SCENE_ECOSYSTEM_ACCENTS,
    projects: SCENE_PROJECT_ACCENTS,
    neutral: '#d8eef2',
    grid: '#5f7480',
    panel: '#d6dee5',
    risk: '#fb7185',
  }
}

function getProjectEcosystem(project: ProjectSlug): EcosystemSlug | null {
  return SCENE_PROJECT_ECOSYSTEMS[project] ?? null
}

export function filterSceneTargetForScene(scene: ImmersiveSceneId, target: SceneTarget | null): SceneTarget | null {
  if (!target) {
    return null
  }

  if (scene === 'home') {
    return target.kind === 'rialo-step' ? null : target
  }

  if (target.kind === 'ecosystem') {
    return target.ecosystem === scene ? target : null
  }

  if (target.kind === 'project') {
    return getProjectEcosystem(target.project) === scene ? target : null
  }

  if (scene === 'rialo' && target.kind === 'rialo-step') {
    return target
  }

  return null
}

export function getVisibleSceneEntriesForQuality(
  quality: EnhancedSceneQuality,
  transition: SceneTransitionState,
): readonly SceneEntry[] {
  if (
    quality !== 'low' &&
    transition.phase === 'arriving' &&
    transition.previousScene &&
    transition.previousScene !== transition.scene
  ) {
    return [
      {
        scene: transition.previousScene,
        variant: 'outgoing',
        ready: false,
        renderKey: transition.previousScene,
      },
      {
        scene: transition.scene,
        variant: 'current',
        ready: true,
        renderKey: transition.scene,
      },
    ]
  }

  return [
    {
      scene: transition.scene,
      variant: 'current',
      ready: transition.phase !== 'departing' && transition.phase !== 'swapping',
      renderKey: transition.scene,
    },
  ]
}

function SceneReadyProbe({
  scene,
  token,
  readyKey,
  onSceneReady,
}: {
  scene: ImmersiveSceneId
  token: number
  readyKey: string
  onSceneReady?: (scene: ImmersiveSceneId, token: number) => void
}) {
  const reportedKeyRef = useRef<string | null>(null)

  useFrame(() => {
    if (reportedKeyRef.current === readyKey) {
      return
    }

    reportedKeyRef.current = readyKey
    onSceneReady?.(scene, token)
  })

  return null
}

function SceneCompileProbe({
  compileKey,
  onSceneCompileError,
  onSceneCompiled,
  scene,
  token,
}: {
  compileKey: string
  onSceneCompileError: (payload: SceneCompilePayload, error: unknown) => void
  onSceneCompiled: (payload: SceneCompilePayload) => void
  scene: ImmersiveSceneId
  token: number
}) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const rootScene = useThree((state) => state.scene)

  useLayoutEffect(() => {
    let active = true
    const payload = {
      compileKey,
      scene,
      token,
    } satisfies SceneCompilePayload

    try {
      if (!gl.extensions.has('KHR_parallel_shader_compile')) {
        onSceneCompiled(payload)

        return () => {
          active = false
        }
      }

      const compilePromise = gl.compileAsync(rootScene, camera)

      void Promise.resolve(compilePromise).then(
        () => {
          if (active) {
            onSceneCompiled(payload)
          }
        },
        (error: unknown) => {
          if (active) {
            onSceneCompileError(payload, error)
          }
        },
      )
    } catch (error) {
      onSceneCompileError(payload, error)
    }

    return () => {
      active = false
    }
  }, [camera, compileKey, gl, onSceneCompileError, onSceneCompiled, rootScene, scene, token])

  return null
}

function SceneHost({
  colors,
  compileKey,
  entry,
  morphDurationMs,
  morphMode,
  onSceneCompileError,
  onSceneCompiled,
  onSceneReady,
  motionEnabled,
  quality,
  readyKey,
  readyToken,
  reducedMotion,
  requestFrame,
  target,
}: {
  colors: ProgrammaticScenePalette
  compileKey?: string
  entry: SceneEntry
  morphDurationMs: number
  morphMode: SceneMorphInteractionMode
  onSceneCompileError?: (payload: SceneCompilePayload, error: unknown) => void
  onSceneCompiled?: (payload: SceneCompilePayload) => void
  onSceneReady?: (scene: ImmersiveSceneId, token: number) => void
  motionEnabled: boolean
  quality: EnhancedSceneQuality
  readyKey: string
  readyToken: number
  reducedMotion: boolean
  requestFrame: () => void
  target: SceneTarget | null
}) {
  const Scene = sceneComponents[entry.scene]

  return (
    <Suspense fallback={null}>
      <Scene
        colors={colors}
        morphDurationMs={morphDurationMs}
        morphMode={morphMode}
        motionEnabled={motionEnabled}
        quality={quality}
        reducedMotion={reducedMotion}
        requestFrame={requestFrame}
        target={filterSceneTargetForScene(entry.scene, target)}
        variant={entry.variant}
      />
      {entry.ready && compileKey && onSceneCompiled && onSceneCompileError ? (
        <SceneCompileProbe
          key={`${compileKey}:${entry.scene}`}
          compileKey={compileKey}
          onSceneCompileError={onSceneCompileError}
          onSceneCompiled={onSceneCompiled}
          scene={entry.scene}
          token={readyToken}
        />
      ) : null}
      {entry.ready ? (
        <SceneReadyProbe
          key={`${readyKey}:${entry.scene}`}
          onSceneReady={onSceneReady}
          readyKey={`${readyKey}:${entry.scene}`}
          scene={entry.scene}
          token={readyToken}
        />
      ) : null}
    </Suspense>
  )
}

export function SceneRouter({
  compileKey,
  morphDurationMs,
  morphMode = 'commit',
  motionEnabled,
  onSceneCompileError,
  onSceneCompiled,
  quality,
  reducedMotion,
  requestFrame,
  target,
  transition,
  onSceneReady,
}: SceneRouterProps) {
  const colors = useMemo(() => createScenePalette(), [])
  const entries = getVisibleSceneEntriesForQuality(quality, transition)
  const readyKey = `${transition.token}:${transition.scene}`

  return (
    <group name={`scene-router-${transition.scene}`}>
      {entries.map((entry) => (
        <SceneHost
          colors={colors}
          compileKey={compileKey}
          entry={entry}
          key={entry.renderKey}
          morphDurationMs={morphDurationMs}
          morphMode={morphMode}
          motionEnabled={motionEnabled}
          onSceneCompileError={onSceneCompileError}
          onSceneCompiled={onSceneCompiled}
          onSceneReady={onSceneReady}
          quality={quality}
          readyKey={readyKey}
          readyToken={transition.token}
          reducedMotion={reducedMotion}
          requestFrame={requestFrame}
          target={target}
        />
      ))}
    </group>
  )
}
