'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import type { Group, InstancedMesh } from 'three'

import {
  createArcPoints,
  createEllipsePoints,
  createInstanceMatrices,
  getScenePrimitiveProfile,
} from '../scene-primitives'
import type { ProgrammaticSceneProps } from '../scene-router.client'
import {
  useFiniteSceneMorphGroup,
  type SpatialSceneMorphProfile,
} from '../finite-scene-morph'
import type { ProjectSlug } from '../../../content/types'

const defaultArcMorphProfile: SpatialSceneMorphProfile = {
  positionX: 0,
  positionY: 0,
  rotationZ: 0,
  scaleX: 1,
  scaleY: 1,
}

export function getArcSceneMorphProfile(
  target: ProgrammaticSceneProps['target'],
): SpatialSceneMorphProfile {
  if (target?.kind !== 'project') {
    return defaultArcMorphProfile
  }

  switch (target.project) {
    case 'signal-ledger':
      return { positionX: 0.3, positionY: -0.06, rotationZ: -0.18, scaleX: 0.84, scaleY: 1.16 }
    case 'hadron':
      return { positionX: 0, positionY: 0.08, rotationZ: 0.06, scaleX: 1.16, scaleY: 0.82 }
    case 'arcpredict':
      return { positionX: -0.28, positionY: -0.02, rotationZ: 0.2, scaleX: 0.92, scaleY: 1.12 }
    case 'rialo-captain':
      return defaultArcMorphProfile
  }
}

function withVariantOpacity(opacity: number, variant: ProgrammaticSceneProps['variant']) {
  return variant === 'outgoing' ? opacity * 0.36 : opacity
}

function isProjectTarget(project: ProjectSlug, target: ProgrammaticSceneProps['target']) {
  return target?.kind === 'project' && target.project === project
}

function getSignalOpacity(
  project: ProjectSlug,
  target: ProgrammaticSceneProps['target'],
  variant: ProgrammaticSceneProps['variant'],
) {
  if (target?.kind === 'ecosystem' && target.ecosystem === 'arc') {
    return withVariantOpacity(0.9, variant)
  }

  if (target?.kind === 'project') {
    return withVariantOpacity(isProjectTarget(project, target) ? 0.95 : 0.46, variant)
  }

  return withVariantOpacity(0.72, variant)
}

function LinePath({
  color,
  opacity,
  points,
}: {
  color: string
  opacity: number
  points: Float32Array
}) {
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute args={[points, 3]} attach="attributes-position" />
      </bufferGeometry>
      <lineBasicMaterial color={color} depthWrite={false} opacity={opacity} transparent />
    </line>
  )
}

function LineSegmentsPath({
  color,
  opacity,
  points,
}: {
  color: string
  opacity: number
  points: Float32Array
}) {
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute args={[points, 3]} attach="attributes-position" />
      </bufferGeometry>
      <lineBasicMaterial color={color} depthWrite={false} opacity={opacity} transparent />
    </lineSegments>
  )
}

function createLedgerBars(count: number) {
  const positions = new Float32Array(count * 2 * 3)

  for (let index = 0; index < count; index += 1) {
    const y = -0.72 + index * 0.16
    const x = -1.92 + index * 0.05
    const offset = index * 6

    positions[offset] = x
    positions[offset + 1] = y
    positions[offset + 2] = 0.14
    positions[offset + 3] = x + 0.72
    positions[offset + 4] = y
    positions[offset + 5] = 0.14
  }

  return positions
}

function createLedgerStair(count: number) {
  const positions = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3

    positions[offset] = -1.84 + index * 0.16
    positions[offset + 1] = -0.88 + Math.floor(index / 2) * 0.2
    positions[offset + 2] = 0.18
  }

  return positions
}

function createMarketAxis() {
  return new Float32Array([
    -0.18, -0.9, 0.18,
    -0.18, 0.92, 0.18,
    -0.86, 0.02, 0.18,
    0.56, 0.02, 0.18,
    -0.64, -0.32, 0.18,
    0.34, 0.42, 0.18,
    -0.64, 0.42, 0.18,
    0.34, -0.32, 0.18,
  ])
}

function createProbabilityBranches() {
  return new Float32Array([
    1.05, -0.08, 0.18,
    1.9, 0.42, 0.18,
    1.05, -0.08, 0.18,
    1.84, -0.58, 0.18,
    1.42, 0.2, 0.18,
    2.15, 0.78, 0.18,
    1.42, -0.28, 0.18,
    2.12, -0.9, 0.18,
  ])
}

function createSegmentedPolyline(points: Float32Array) {
  const pointCount = points.length / 3
  const positions = new Float32Array(Math.max(0, pointCount - 1) * 2 * 3)
  let cursor = 0

  for (let index = 0; index < pointCount - 1; index += 1) {
    const current = index * 3
    const next = (index + 1) * 3

    positions[cursor] = points[current]
    positions[cursor + 1] = points[current + 1]
    positions[cursor + 2] = points[current + 2]
    positions[cursor + 3] = points[next]
    positions[cursor + 4] = points[next + 1]
    positions[cursor + 5] = points[next + 2]
    cursor += 6
  }

  return positions
}

function combineSegmentedPolylines(paths: readonly Float32Array[]) {
  const segments = paths.map(createSegmentedPolyline)
  const totalLength = segments.reduce((total, segment) => total + segment.length, 0)
  const positions = new Float32Array(totalLength)
  let cursor = 0

  for (const segment of segments) {
    positions.set(segment, cursor)
    cursor += segment.length
  }

  return positions
}

function OrderPlane({
  colors,
  target,
  variant,
}: Pick<ProgrammaticSceneProps, 'colors' | 'target' | 'variant'>) {
  const meshRef = useRef<InstancedMesh>(null)
  const matrices = useMemo(
    () =>
      createInstanceMatrices([
        {
          position: [-0.46, 0.26, 0.08],
          rotationZ: -0.22,
          scale: [0.52, 0.34, 1],
        },
        {
          position: [0.12, -0.28, 0.08],
          rotationZ: -0.22,
          scale: [0.52, 0.34, 1],
        },
      ]),
    [],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current

    if (!mesh) {
      return
    }

    mesh.instanceMatrix.array.set(matrices)
    mesh.instanceMatrix.needsUpdate = true
  }, [matrices])

  return (
    <instancedMesh args={[undefined, undefined, 2]} ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={colors.projects.hadron}
        depthWrite={false}
        opacity={getSignalOpacity('hadron', target, variant) * 0.24}
        transparent
      />
    </instancedMesh>
  )
}

export default function ArcOrbitalCircuit({
  colors,
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
  const profile = getScenePrimitiveProfile(quality)
  const morphProfile = getArcSceneMorphProfile(target)
  useFiniteSceneMorphGroup(sceneRef, {
    durationMs: morphDurationMs,
    morphMode,
    motionEnabled,
    profile: morphProfile,
    quality,
    reducedMotion,
    requestFrame,
  })
  const ledgerBarCount = quality === 'high' ? 7 : quality === 'medium' ? 5 : 3
  const outerLoop = useMemo(
    () =>
      createEllipsePoints({
        radiusX: 2.88,
        radiusY: 1.34,
        samples: profile.curveSamples,
        closed: true,
        z: -0.04,
      }),
    [profile.curveSamples],
  )
  const middleLoop = useMemo(
    () =>
      createEllipsePoints({
        radiusX: 2.18,
        radiusY: 0.95,
        samples: profile.curveSamples,
        closed: true,
        z: 0,
      }),
    [profile.curveSamples],
  )
  const innerLoop = useMemo(
    () =>
      createEllipsePoints({
        radiusX: 1.22,
        radiusY: 0.54,
        samples: Math.max(12, Math.floor(profile.curveSamples * 0.66)),
        closed: true,
        z: 0.04,
      }),
    [profile.curveSamples],
  )
  const orbitLoops = useMemo(
    () => combineSegmentedPolylines([outerLoop, middleLoop, innerLoop]),
    [innerLoop, middleLoop, outerLoop],
  )
  const ledgerBars = useMemo(() => createLedgerBars(ledgerBarCount), [ledgerBarCount])
  const ledgerStair = useMemo(() => createLedgerStair(ledgerBarCount + 2), [ledgerBarCount])
  const marketAxis = useMemo(() => createMarketAxis(), [])
  const probabilityArc = useMemo(
    () =>
      createArcPoints({
        radiusX: 1.36,
        radiusY: 0.76,
        startAngle: -0.64,
        endAngle: 1.12,
        samples: profile.curveSamples,
        z: 0.18,
      }),
    [profile.curveSamples],
  )
  const probabilityBranches = useMemo(() => createProbabilityBranches(), [])

  return (
    <group name="arc-orbital-circuit" ref={sceneRef}>
      <LineSegmentsPath
        color={colors.ecosystems.arc}
        opacity={withVariantOpacity(0.44, variant)}
        points={orbitLoops}
      />
      <LineSegmentsPath
        color={colors.projects['signal-ledger']}
        opacity={getSignalOpacity('signal-ledger', target, variant)}
        points={ledgerBars}
      />
      <LinePath
        color={colors.projects['signal-ledger']}
        opacity={getSignalOpacity('signal-ledger', target, variant) * 0.86}
        points={ledgerStair}
      />
      {profile.transparentPlanes > 0 ? <OrderPlane colors={colors} target={target} variant={variant} /> : null}
      <LineSegmentsPath
        color={colors.projects.hadron}
        opacity={getSignalOpacity('hadron', target, variant)}
        points={marketAxis}
      />
      <LinePath
        color={colors.projects.arcpredict}
        opacity={getSignalOpacity('arcpredict', target, variant)}
        points={probabilityArc}
      />
      <LineSegmentsPath
        color={colors.projects.arcpredict}
        opacity={getSignalOpacity('arcpredict', target, variant) * 0.9}
        points={probabilityBranches}
      />
    </group>
  )
}
