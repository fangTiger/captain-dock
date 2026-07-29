'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { CapabilityGate, type CapabilityGateRenderProps } from './capability-gate.client'
import { CinematicNavigationBridge } from './cinematic-navigation-bridge.client'
import { getImmersiveSceneForPathname } from './scene-route'
import {
  SceneTargetController,
  useSceneTargetController,
} from './scene-target-controller.client'
import { serializeSceneTarget } from './scene-target'
import type { ImmersiveSceneId, SceneTargetPreviewSource } from './scene-types'
import { StaticUniverseFallback } from './static-universe-fallback'
import type { UniverseRuntimeSnapshot } from './universe-canvas.client'
import styles from './universe-shell.module.css'

const DynamicUniverseCanvas = dynamic(
  () => import('./universe-canvas.client').then((module) => module.UniverseCanvas),
  { ssr: false },
)

type UniverseShellProps = Readonly<{
  children: ReactNode
}>

const sceneTargetSelector = '[data-scene-target]'

function getSceneTargetFromEventTarget(root: HTMLElement, eventTarget: EventTarget | null) {
  if (!(eventTarget instanceof Element)) {
    return null
  }

  const marker = eventTarget.closest(sceneTargetSelector)

  if (!marker || !root.contains(marker)) {
    return null
  }

  return marker.getAttribute('data-scene-target')
}

type ImmersiveUniverseShellProps = Readonly<{
  children: ReactNode
  scene: ImmersiveSceneId
}>

type RuntimeGenerationState = Readonly<{
  generation: number
  scene: ImmersiveSceneId
}>

const staticRuntimeSnapshot = {
  frameloop: 'static',
  morphPhase: 'idle',
  morphProgress: 1,
  quality: 'static',
  renderState: 'static',
  settled: true,
} as const

function runtimeSnapshotsEqual(
  left: UniverseRuntimeSnapshot | undefined,
  right: UniverseRuntimeSnapshot,
) {
  return (
    left?.frameloop === right.frameloop &&
    left.generation === right.generation &&
    left.morphPhase === right.morphPhase &&
    left.morphProgress === right.morphProgress &&
    left.quality === right.quality &&
    left.renderState === right.renderState &&
    left.scene === right.scene &&
    left.settled === right.settled
  )
}

function ImmersiveUniverseShell({ children, scene }: ImmersiveUniverseShellProps) {
  const contentRootRef = useRef<HTMLDivElement | null>(null)
  const [runtimeGenerationState, setRuntimeGenerationState] = useState<RuntimeGenerationState>({
    generation: 1,
    scene,
  })
  const scopedRuntimeGeneration =
    runtimeGenerationState.scene === scene
      ? runtimeGenerationState
      : {
          generation: runtimeGenerationState.generation + 1,
          scene,
        }

  if (runtimeGenerationState.scene !== scene) {
    setRuntimeGenerationState(scopedRuntimeGeneration)
  }

  const runtimeGeneration = scopedRuntimeGeneration.generation
  const {
    clearPreviewTarget,
    commitRevision,
    committedTarget,
    effectiveTarget,
    motionMode,
    previewTarget,
    setPreviewTarget,
  } = useSceneTargetController()
  const [readyState, setReadyState] = useState<{
    scene: ImmersiveSceneId | null
    ready: boolean
  }>({
    scene: null,
    ready: false,
  })
  const [runtimeSnapshots, setRuntimeSnapshots] = useState<
    Readonly<Record<string, UniverseRuntimeSnapshot>>
  >({})

  const ready = Boolean(scene && readyState.scene === scene && readyState.ready)
  const runtimeSnapshotKey = `${scene}:${runtimeGeneration}`
  const currentRuntime = runtimeSnapshots[runtimeSnapshotKey] ?? staticRuntimeSnapshot
  const serializedCommittedTarget = serializeSceneTarget(committedTarget)
  const serializedPreviewTarget = previewTarget ? serializeSceneTarget(previewTarget) : ''
  const serializedTarget = serializeSceneTarget(effectiveTarget)
  const reportRuntime = useCallback((snapshot: UniverseRuntimeSnapshot) => {
    const snapshotKey = `${snapshot.scene}:${snapshot.generation}`

    setRuntimeSnapshots((current) =>
      runtimeSnapshotsEqual(current[snapshotKey], snapshot)
        ? current
        : {
            ...current,
            [snapshotKey]: snapshot,
          },
    )
  }, [])

  useEffect(() => {
    const root = contentRootRef.current

    if (!root) {
      return undefined
    }

    const updateFromEventTarget = (
      source: SceneTargetPreviewSource,
      eventTarget: EventTarget | null,
    ) => {
      const nextTarget = getSceneTargetFromEventTarget(root, eventTarget)

      if (nextTarget) {
        setPreviewTarget(nextTarget, source)
      } else {
        clearPreviewTarget(source)
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      updateFromEventTarget('focus', event.target)
    }
    const handleFocusOut = (event: FocusEvent) => {
      updateFromEventTarget('focus', event.relatedTarget)
    }
    const handlePointerOver = (event: PointerEvent) => {
      updateFromEventTarget('pointer', event.target)
    }
    const handlePointerOut = (event: PointerEvent) => {
      updateFromEventTarget('pointer', event.relatedTarget)
    }

    root.addEventListener('focusin', handleFocusIn)
    root.addEventListener('focusout', handleFocusOut)
    root.addEventListener('pointerover', handlePointerOver)
    root.addEventListener('pointerout', handlePointerOut)

    return () => {
      root.removeEventListener('focusin', handleFocusIn)
      root.removeEventListener('focusout', handleFocusOut)
      root.removeEventListener('pointerover', handlePointerOver)
      root.removeEventListener('pointerout', handlePointerOut)
    }
  }, [clearPreviewTarget, setPreviewTarget])

  const renderEnhanced = useCallback(
    ({ degrade, quality, reportFailure, reportReady }: CapabilityGateRenderProps) => {
      if (!scene) {
        return null
      }

      const wrappedReportReady = () => {
        setReadyState({ scene, ready: true })
        reportReady()
      }
      const wrappedReportFailure = (error?: unknown) => {
        setReadyState({ scene, ready: false })
        reportFailure(error)
      }

      return (
        <DynamicUniverseCanvas
          degrade={degrade}
          morphMode={motionMode}
          morphRevision={commitRevision}
          preview={Boolean(previewTarget)}
          quality={quality}
          reportFailure={wrappedReportFailure}
          reportReady={wrappedReportReady}
          reportRuntime={reportRuntime}
          runtimeGeneration={runtimeGeneration}
          scene={scene}
          target={effectiveTarget}
        />
      )
    },
    [
      commitRevision,
      effectiveTarget,
      motionMode,
      previewTarget,
      reportRuntime,
      runtimeGeneration,
      scene,
      setReadyState,
    ],
  )

  return (
    <div
      className={styles.shell}
      data-universe-committed-target={serializedCommittedTarget}
      data-universe-frameloop={currentRuntime.frameloop}
      data-universe-morph-phase={currentRuntime.morphPhase}
      data-universe-morph-progress={String(currentRuntime.morphProgress)}
      data-universe-preview-target={serializedPreviewTarget}
      data-universe-quality={currentRuntime.quality}
      data-universe-render-state={currentRuntime.renderState}
      data-universe-target={serializedTarget}
      data-universe-ready={ready ? 'true' : 'false'}
      data-universe-scene={scene}
      data-universe-settled={String(currentRuntime.settled)}
      data-universe-shell
    >
      <div
        className={styles.sceneLayer}
        data-universe-scene-layer
        style={{ pointerEvents: 'none' }}
        tabIndex={-1}
      >
        <CapabilityGate
          fallback={
            <StaticUniverseFallback
              className={styles.fallback}
              scene={scene}
              target={effectiveTarget}
            />
          }
          renderEnhanced={renderEnhanced}
        />
      </div>
      <CinematicNavigationBridge
        className={styles.contentLayer}
        rootRef={contentRootRef}
        scene={scene}
      >
        {children}
      </CinematicNavigationBridge>
    </div>
  )
}

export function UniverseShell({ children }: UniverseShellProps) {
  const pathname = usePathname()
  const scene = getImmersiveSceneForPathname(pathname)

  if (!scene) {
    return <>{children}</>
  }

  return (
    <SceneTargetController scene={scene}>
      <ImmersiveUniverseShell scene={scene}>{children}</ImmersiveUniverseShell>
    </SceneTargetController>
  )
}
