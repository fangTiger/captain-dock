'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

import { ConstellationField } from '../../constellation/constellation-field.client'
import {
  CONSTELLATION_STARFIELD_LERP,
  getConstellationPointerTarget,
  interpolateConstellationValue,
  useConstellationPointerTracking,
} from '../../constellation/constellation-motion.client'
import {
  useFiniteSceneMorphGroup,
  type SpatialSceneMorphProfile,
} from '../finite-scene-morph'
import type { ProgrammaticSceneProps } from '../scene-router.client'

const defaultHomeConstellationMorphProfile: SpatialSceneMorphProfile = {
  positionX: 0,
  positionY: 0,
  rotationZ: 0,
  scaleX: 1,
  scaleY: 1,
}

export function getHomeConstellationMorphProfile(
  target: ProgrammaticSceneProps['target'],
): SpatialSceneMorphProfile {
  if (target?.kind === 'ecosystem') {
    return target.ecosystem === 'arc'
      ? {
          positionX: 0.12,
          positionY: -0.04,
          rotationZ: -0.035,
          scaleX: 1.04,
          scaleY: 1.04,
        }
      : {
          positionX: -0.14,
          positionY: 0.06,
          rotationZ: 0.04,
          scaleX: 1.05,
          scaleY: 1.05,
        }
  }

  if (target?.kind !== 'project') {
    return defaultHomeConstellationMorphProfile
  }

  switch (target.project) {
    case 'signal-ledger':
      return {
        positionX: 0.18,
        positionY: -0.04,
        rotationZ: -0.04,
        scaleX: 1.06,
        scaleY: 1.06,
      }
    case 'hadron':
      return {
        positionX: 0.1,
        positionY: -0.12,
        rotationZ: 0.05,
        scaleX: 1.07,
        scaleY: 1.07,
      }
    case 'arcpredict':
      return {
        positionX: 0.02,
        positionY: -0.02,
        rotationZ: -0.05,
        scaleX: 1.06,
        scaleY: 1.06,
      }
    case 'rialo-captain':
      return {
        positionX: -0.2,
        positionY: 0.08,
        rotationZ: 0.06,
        scaleX: 1.08,
        scaleY: 1.08,
      }
  }
}

export default function HomeConstellation({
  morphDurationMs,
  morphMode = 'commit',
  motionEnabled,
  quality,
  reducedMotion,
  requestFrame,
  target,
  variant,
}: ProgrammaticSceneProps) {
  const sceneRef = useRef<Group>(null)
  const parallaxRef = useRef<Group>(null)
  const pointerRef = useRef({
    x: 0,
    y: 0,
  })
  const motionActive = motionEnabled && !reducedMotion && variant === 'current'

  useConstellationPointerTracking(motionActive, requestFrame)
  useFiniteSceneMorphGroup(sceneRef, {
    durationMs: morphDurationMs,
    morphMode,
    motionEnabled,
    profile: getHomeConstellationMorphProfile(target),
    quality,
    reducedMotion,
    requestFrame,
  })

  useFrame((_state, delta) => {
    const group = parallaxRef.current

    if (!group || !motionActive) {
      return
    }

    const pointerTarget = getConstellationPointerTarget()

    pointerRef.current.x = interpolateConstellationValue(
      pointerRef.current.x,
      pointerTarget.x,
      CONSTELLATION_STARFIELD_LERP,
    )
    pointerRef.current.y = interpolateConstellationValue(
      pointerRef.current.y,
      pointerTarget.y,
      CONSTELLATION_STARFIELD_LERP,
    )

    group.rotation.x = pointerRef.current.y * 0.08
    group.rotation.y = pointerRef.current.x * 0.12

    if (quality !== 'low') {
      group.rotation.z += Math.min(Math.max(delta, 0), 0.05) * 0.018
    }

    const pointerSettled =
      Math.abs(pointerTarget.x - pointerRef.current.x) < 0.001 &&
      Math.abs(pointerTarget.y - pointerRef.current.y) < 0.001

    if (quality !== 'low' || !pointerSettled) {
      requestFrame()
    }
  })

  return (
    <group name="home-constellation" ref={sceneRef}>
      <group ref={parallaxRef}>
        <ConstellationField quality={quality} target={target} variant={variant} />
      </group>
    </group>
  )
}
