'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'

import {
  SCENE_PREVIEW_ENDPOINT_RATIO,
  type SceneMorphInteractionMode,
} from './finite-scene-morph'
import type { EnhancedSceneQuality } from './scene-primitives'
import type { ImmersiveSceneId, SceneTarget } from './scene-types'

type CameraRigProps = {
  morphDurationMs: number
  morphMode?: SceneMorphInteractionMode
  motionEnabled: boolean
  scene: ImmersiveSceneId
  quality: EnhancedSceneQuality
  reducedMotion: boolean
  target: SceneTarget | null
}

type CameraPreset = {
  position: readonly [number, number, number]
  target: readonly [number, number, number]
  fov: number
}

const sceneOffsets = {
  home: {
    x: 0,
    y: 0,
    z: 8.2,
  },
  arc: {
    x: 0.28,
    y: 0.04,
    z: 7.7,
  },
  rialo: {
    x: -0.18,
    y: 0.02,
    z: 8,
  },
} as const satisfies Record<ImmersiveSceneId, { x: number; y: number; z: number }>

function getTargetOffset(target: SceneTarget | null) {
  if (target?.kind === 'project') {
    switch (target.project) {
      case 'signal-ledger':
        return { x: 0.14, y: 0.04, z: -0.12 }
      case 'hadron':
        return { x: 0, y: -0.08, z: -0.18 }
      case 'arcpredict':
        return { x: -0.14, y: 0.03, z: -0.1 }
      case 'rialo-captain':
        return { x: -0.1, y: -0.04, z: -0.14 }
    }
  }

  if (target?.kind === 'rialo-step') {
    return target.step === 'trigger'
      ? { x: -0.08, y: -0.03, z: -0.28 }
      : { x: 0, y: 0.02, z: -0.08 }
  }

  return { x: 0, y: 0, z: 0 }
}

function createPreset(
  scene: ImmersiveSceneId,
  quality: EnhancedSceneQuality,
  width: number,
  target: SceneTarget | null,
): CameraPreset {
  const offset = sceneOffsets[scene]
  const targetOffset = getTargetOffset(target)
  const compact = width < 760
  const low = quality === 'low'

  if (compact) {
    return {
      position: [targetOffset.x * 0.4, -1.18 + targetOffset.y, (low ? 9.15 : 8.75) + targetOffset.z],
      target: [targetOffset.x * 0.2, -1.02 + targetOffset.y * 0.4, 0],
      fov: 45,
    }
  }

  return {
    position: [
      offset.x + targetOffset.x,
      offset.y + (low ? -0.08 : 0.08) + targetOffset.y,
      offset.z + (low ? 0.55 : 0) + targetOffset.z,
    ],
    target: [offset.x * 0.36 + targetOffset.x * 0.24, -0.08 + targetOffset.y * 0.35, 0],
    fov: 42,
  }
}

function interpolateCameraPreset(
  from: CameraPreset,
  target: CameraPreset,
  progress: number,
): CameraPreset {
  const interpolate = (fromValue: number, targetValue: number) =>
    fromValue + (targetValue - fromValue) * progress

  return {
    position: [
      interpolate(from.position[0], target.position[0]),
      interpolate(from.position[1], target.position[1]),
      interpolate(from.position[2], target.position[2]),
    ],
    target: [
      interpolate(from.target[0], target.target[0]),
      interpolate(from.target[1], target.target[1]),
      interpolate(from.target[2], target.target[2]),
    ],
    fov: interpolate(from.fov, target.fov),
  }
}

function resolveCameraPreset(
  scene: ImmersiveSceneId,
  quality: EnhancedSceneQuality,
  width: number,
  target: SceneTarget | null,
  morphMode: SceneMorphInteractionMode,
) {
  const committedPreset = createPreset(scene, quality, width, target)

  if (morphMode === 'commit' || target === null) {
    return committedPreset
  }

  return interpolateCameraPreset(
    createPreset(scene, quality, width, null),
    committedPreset,
    SCENE_PREVIEW_ENDPOINT_RATIO,
  )
}

function configurePerspectiveCamera(camera: PerspectiveCamera, preset: CameraPreset, aspect: number) {
  camera.fov = preset.fov
  camera.near = 0.1
  camera.far = 40
  camera.aspect = aspect
  camera.updateProjectionMatrix()
}

export function CameraRig({
  morphDurationMs,
  morphMode = 'commit',
  motionEnabled,
  scene,
  quality,
  reducedMotion,
  target,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)
  const size = useThree((state) => state.size)
  const currentTarget = useRef(new Vector3())
  const desiredPosition = useRef(new Vector3())
  const desiredTarget = useRef(new Vector3())
  const settlingRef = useRef(true)
  const preset = useMemo(
    () => resolveCameraPreset(scene, quality, size.width, target, morphMode),
    [morphMode, quality, scene, size.width, target],
  )
  const aspect = size.height > 0 ? size.width / size.height : 1
  const positionStep = morphDurationMs <= 260 ? 0.34 : 0.14
  const targetStep = morphDurationMs <= 260 ? 0.4 : 0.18

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) {
      return
    }

    configurePerspectiveCamera(camera, preset, aspect)
    desiredPosition.current.set(...preset.position)
    desiredTarget.current.set(...preset.target)
    const immediate = quality === 'low' || reducedMotion || !motionEnabled

    if (immediate) {
      camera.position.copy(desiredPosition.current)
      currentTarget.current.copy(desiredTarget.current)
      camera.lookAt(currentTarget.current)
      settlingRef.current = false
    } else {
      settlingRef.current = true
    }
    invalidate()
  }, [aspect, camera, invalidate, motionEnabled, preset, quality, reducedMotion])

  useFrame(() => {
    if (!(camera instanceof PerspectiveCamera) || !motionEnabled || !settlingRef.current) {
      return
    }

    camera.position.lerp(desiredPosition.current, positionStep)
    currentTarget.current.lerp(desiredTarget.current, targetStep)
    camera.lookAt(currentTarget.current)

    const positionSettled = camera.position.distanceToSquared(desiredPosition.current) < 0.0004
    const targetSettled = currentTarget.current.distanceToSquared(desiredTarget.current) < 0.0004

    if (positionSettled && targetSettled) {
      camera.position.copy(desiredPosition.current)
      currentTarget.current.copy(desiredTarget.current)
      camera.lookAt(currentTarget.current)
      settlingRef.current = false
    } else {
      invalidate()
    }
  })

  return null
}
