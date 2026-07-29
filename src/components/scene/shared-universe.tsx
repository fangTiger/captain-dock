'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import type { InstancedMesh } from 'three'

import { createInstanceMatrices, getScenePrimitiveProfile, type EnhancedSceneQuality } from './scene-primitives'

type SharedUniverseProps = {
  quality: EnhancedSceneQuality
}

type SharedUniverseRootProps = SharedUniverseProps & {
  // 当前场景；home（深空星座门面）自带完整视觉，跳过共享网格/校准环。
  scene?: string
}

function createRegistrationGrid(size: number, divisions: number, z: number) {
  const lineCount = (divisions + 1) * 2
  const positions = new Float32Array(lineCount * 2 * 3)
  const step = (size * 2) / divisions
  let cursor = 0

  for (let index = 0; index <= divisions; index += 1) {
    const value = -size + step * index

    positions[cursor] = -size
    positions[cursor + 1] = value
    positions[cursor + 2] = z
    positions[cursor + 3] = size
    positions[cursor + 4] = value
    positions[cursor + 5] = z
    cursor += 6

    positions[cursor] = value
    positions[cursor + 1] = -size
    positions[cursor + 2] = z
    positions[cursor + 3] = value
    positions[cursor + 4] = size
    positions[cursor + 5] = z
    cursor += 6
  }

  return positions
}

function createCalibrationMatrices(count: number) {
  return createInstanceMatrices(
    Array.from({ length: count }, (_, index) => {
      const angle = (Math.PI * 2 * index) / count
      const radius = index % 2 === 0 ? 3.38 : 3.18

      return {
        position: [Math.cos(angle) * radius, Math.sin(angle) * radius, -0.18],
        rotationZ: angle,
        scale: [0.018, index % 4 === 0 ? 0.18 : 0.1, 1],
      } as const
    }),
  )
}

function createSparsePointField(count: number) {
  const positions = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963229728653
    const radius = 0.65 + ((index % 17) / 17) * 2.7
    const offset = index * 3

    positions[offset] = Math.cos(angle) * radius
    positions[offset + 1] = Math.sin(angle) * radius * 0.78
    positions[offset + 2] = -0.42 - (index % 5) * 0.035
  }

  return positions
}

function CalibrationTicks({ quality }: SharedUniverseProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const profile = getScenePrimitiveProfile(quality)
  const matrices = useMemo(() => createCalibrationMatrices(profile.tickInstances), [profile.tickInstances])

  useLayoutEffect(() => {
    const mesh = meshRef.current

    if (!mesh) {
      return
    }

    mesh.instanceMatrix.array.set(matrices)
    mesh.instanceMatrix.needsUpdate = true
  }, [matrices])

  return (
    <instancedMesh args={[undefined, undefined, profile.tickInstances]} ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#d5e7ef" depthWrite={false} opacity={0.32} transparent />
    </instancedMesh>
  )
}

function SparsePoints({ quality }: SharedUniverseProps) {
  const profile = getScenePrimitiveProfile(quality)
  const positions = useMemo(() => createSparsePointField(profile.pointInstances), [profile.pointInstances])

  if (profile.pointInstances === 0) {
    return null
  }

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
      </bufferGeometry>
      <pointsMaterial color="#b8c9d1" depthWrite={false} opacity={0.36} size={0.018} transparent />
    </points>
  )
}

export function SharedUniverse({ quality, scene }: SharedUniverseRootProps) {
  const gridPositions = useMemo(() => createRegistrationGrid(3.6, quality === 'low' ? 6 : 10, -0.5), [quality])

  // home 门面自带密集星场，不叠加共享的蓝图网格与校准刻度环。
  if (scene === 'home') {
    return null
  }

  return (
    <group>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute args={[gridPositions, 3]} attach="attributes-position" />
        </bufferGeometry>
        <lineBasicMaterial color="#5f7480" depthWrite={false} opacity={0.16} transparent />
      </lineSegments>
      <CalibrationTicks quality={quality} />
      <SparsePoints quality={quality} />
    </group>
  )
}
