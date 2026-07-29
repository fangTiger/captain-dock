'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type Group, type InstancedMesh } from 'three'

import { createEllipsePoints, createInstanceMatrices, getScenePrimitiveProfile } from '../scene-primitives'
import type { ProgrammaticSceneProps } from '../scene-router.client'
import {
  useFiniteSceneMorphGroup,
  type SpatialSceneMorphProfile,
} from '../finite-scene-morph'
import type { RialoStepSignal } from '../scene-types'

type RadarNode = {
  step: RialoStepSignal
  position: readonly [number, number, number]
  shape: 'circle' | 'square' | 'diamond' | 'triangle' | 'pentagon'
}

const radarNodes = [
  {
    step: 'observe',
    position: [-1.86, -0.58, 0.16],
    shape: 'circle',
  },
  {
    step: 'cover',
    position: [-0.9, 0.38, 0.16],
    shape: 'square',
  },
  {
    step: 'trigger',
    position: [0.08, -0.08, 0.16],
    shape: 'diamond',
  },
  {
    step: 'settle',
    position: [0.92, 0.52, 0.16],
    shape: 'triangle',
  },
  {
    step: 'explain',
    position: [1.88, -0.42, 0.16],
    shape: 'pentagon',
  },
] as const satisfies readonly RadarNode[]

const defaultRialoMorphProfile: SpatialSceneMorphProfile = {
  impact: 0,
  positionX: 0,
  positionY: 0,
  rotationZ: 0,
  scaleX: 1,
  scaleY: 1,
}

export function getRialoSceneMorphProfile(
  target: ProgrammaticSceneProps['target'],
): SpatialSceneMorphProfile {
  if (target?.kind !== 'rialo-step') {
    return defaultRialoMorphProfile
  }

  switch (target.step) {
    case 'observe':
      return { impact: 0, positionX: 0.18, positionY: 0.1, rotationZ: -0.05, scaleX: 1, scaleY: 1 }
    case 'cover':
      return { impact: 0, positionX: -0.06, positionY: -0.16, rotationZ: 0.14, scaleX: 1.1, scaleY: 0.9 }
    case 'trigger':
      return { impact: 1, positionX: -0.04, positionY: 0, rotationZ: -0.12, scaleX: 1.1, scaleY: 1.1 }
    case 'settle':
      return { impact: 0, positionX: -0.12, positionY: -0.1, rotationZ: 0.05, scaleX: 0.98, scaleY: 1.04 }
    case 'explain':
      return { impact: 0, positionX: -0.2, positionY: 0.08, rotationZ: 0.1, scaleX: 0.95, scaleY: 1.02 }
  }
}

function withVariantOpacity(opacity: number, variant: ProgrammaticSceneProps['variant']) {
  return variant === 'outgoing' ? opacity * 0.36 : opacity
}

function isWideRialoTarget(target: ProgrammaticSceneProps['target']) {
  return (
    (target?.kind === 'ecosystem' && target.ecosystem === 'rialo') ||
    (target?.kind === 'project' && target.project === 'rialo-captain')
  )
}

function getStepOpacity(
  step: RialoStepSignal,
  target: ProgrammaticSceneProps['target'],
  variant: ProgrammaticSceneProps['variant'],
) {
  if (isWideRialoTarget(target)) {
    return withVariantOpacity(0.88, variant)
  }

  if (target?.kind === 'rialo-step') {
    return withVariantOpacity(target.step === step ? 0.95 : 0.46, variant)
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

function createRoutePath() {
  const positions = new Float32Array(radarNodes.length * 3)

  radarNodes.forEach((node, index) => {
    const offset = index * 3

    positions[offset] = node.position[0]
    positions[offset + 1] = node.position[1]
    positions[offset + 2] = node.position[2] - 0.02
  })

  return positions
}

function createRouteSegments() {
  return new Float32Array([
    -2.18, -0.95, 0.1,
    -1.32, -0.08, 0.1,
    -1.32, -0.08, 0.1,
    -0.12, -0.2, 0.1,
    -0.12, -0.2, 0.1,
    0.68, 0.36, 0.1,
    0.68, 0.36, 0.1,
    1.46, 0.08, 0.1,
    1.46, 0.08, 0.1,
    2.16, -0.72, 0.1,
  ])
}

function createRegularShape(
  sides: number,
  radius: number,
  center: readonly [number, number, number],
  rotation = 0,
) {
  const positions = new Float32Array((sides + 1) * 3)

  for (let index = 0; index <= sides; index += 1) {
    const angle = rotation + (Math.PI * 2 * index) / sides
    const offset = index * 3

    positions[offset] = center[0] + Math.cos(angle) * radius
    positions[offset + 1] = center[1] + Math.sin(angle) * radius
    positions[offset + 2] = center[2]
  }

  return positions
}

function createNodeShape(node: RadarNode, quality: ProgrammaticSceneProps['quality']) {
  switch (node.shape) {
    case 'circle':
      return createRegularShape(quality === 'low' ? 8 : 18, 0.18, node.position)
    case 'square':
      return createRegularShape(4, 0.2, node.position, Math.PI / 4)
    case 'diamond':
      return createRegularShape(4, 0.22, node.position)
    case 'triangle':
      return createRegularShape(3, 0.22, node.position, Math.PI / 2)
    case 'pentagon':
      return createRegularShape(5, 0.2, node.position, -Math.PI / 2)
  }
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

function createColoredNodeSegments(
  nodeShapes: readonly { node: RadarNode; points: Float32Array }[],
  colors: ProgrammaticSceneProps['colors'],
  target: ProgrammaticSceneProps['target'],
) {
  const segments = nodeShapes.map(({ points }) => createSegmentedPolyline(points))
  const totalLength = segments.reduce((total, segment) => total + segment.length, 0)
  const positions = new Float32Array(totalLength)
  const colorValues = new Float32Array(totalLength)
  let cursor = 0

  nodeShapes.forEach(({ node }, index) => {
    const segment = segments[index]
    const color = new Color(colors.projects['rialo-captain']).multiplyScalar(
      getStepOpacity(node.step, target, 'current'),
    )

    positions.set(segment, cursor)

    for (let colorCursor = cursor; colorCursor < cursor + segment.length; colorCursor += 3) {
      color.toArray(colorValues, colorCursor)
    }

    cursor += segment.length
  })

  return {
    colors: colorValues,
    positions,
  }
}

function RiskCorridors({
  colors,
  target,
  variant,
}: Pick<ProgrammaticSceneProps, 'colors' | 'target' | 'variant'>) {
  const meshRef = useRef<InstancedMesh>(null)
  const opacity = isWideRialoTarget(target) ? 0.24 : 0.18
  const matrices = useMemo(
    () =>
      createInstanceMatrices([
        {
          position: [-1.36, -0.08, 0.02],
          rotationZ: 0.72,
          scale: [1.28, 0.24, 1],
        },
        {
          position: [0.82, 0.16, 0.02],
          rotationZ: -0.52,
          scale: [1.34, 0.22, 1],
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
      <meshBasicMaterial color={colors.risk} depthWrite={false} opacity={withVariantOpacity(opacity, variant)} transparent />
    </instancedMesh>
  )
}

export default function RialoReactiveField({
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
  const morphProfile = getRialoSceneMorphProfile(target)
  useFiniteSceneMorphGroup(sceneRef, {
    durationMs: morphDurationMs,
    morphMode,
    motionEnabled,
    profile: morphProfile,
    quality,
    reducedMotion,
    requestFrame,
  })
  const rings = useMemo(
    () => [
      createEllipsePoints({
        radiusX: 0.92,
        radiusY: 0.92,
        samples: profile.radarSamples,
        closed: true,
        z: -0.05,
      }),
      createEllipsePoints({
        radiusX: 1.72,
        radiusY: 1.72,
        samples: profile.radarSamples,
        closed: true,
        z: -0.08,
      }),
      createEllipsePoints({
        radiusX: 2.58,
        radiusY: 2.58,
        samples: profile.radarSamples,
        closed: true,
        z: -0.12,
      }),
    ],
    [profile.radarSamples],
  )
  const routePath = useMemo(() => createRoutePath(), [])
  const routeSegments = useMemo(() => createRouteSegments(), [])
  const nodeShapes = useMemo(
    () =>
      radarNodes.map((node) => ({
        node,
        points: createNodeShape(node, quality),
      })),
    [quality],
  )
  const ringSegments = useMemo(() => combineSegmentedPolylines(rings), [rings])
  const nodeSegments = useMemo(
    () => createColoredNodeSegments(nodeShapes, colors, target),
    [colors, nodeShapes, target],
  )

  return (
    <group name="rialo-reactive-field" ref={sceneRef}>
      <LineSegmentsPath
        color={colors.ecosystems.rialo}
        opacity={withVariantOpacity(0.34, variant)}
        points={ringSegments}
      />
      {profile.transparentPlanes > 0 ? <RiskCorridors colors={colors} target={target} variant={variant} /> : null}
      <LinePath
        color={colors.projects['rialo-captain']}
        opacity={isWideRialoTarget(target) ? withVariantOpacity(0.9, variant) : withVariantOpacity(0.68, variant)}
        points={routePath}
      />
      <LineSegmentsPath
        color={colors.ecosystems.rialo}
        opacity={withVariantOpacity(0.48, variant)}
        points={routeSegments}
      />
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute args={[nodeSegments.positions, 3]} attach="attributes-position" />
          <bufferAttribute args={[nodeSegments.colors, 3]} attach="attributes-color" />
        </bufferGeometry>
        <lineBasicMaterial depthWrite={false} opacity={withVariantOpacity(0.86, variant)} transparent vertexColors />
      </lineSegments>
    </group>
  )
}
