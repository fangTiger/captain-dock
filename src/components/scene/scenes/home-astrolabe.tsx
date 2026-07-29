'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type Group, type InstancedMesh } from 'three'

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

type Beacon = {
  project: ProjectSlug
  position: readonly [number, number, number]
  rotationZ: number
  scale: readonly [number, number, number]
}

const defaultHomeMorphProfile: SpatialSceneMorphProfile = {
  positionX: 0,
  positionY: 0,
  rotationZ: 0,
  scaleX: 1,
  scaleY: 1,
}

export function getHomeSceneMorphProfile(
  target: ProgrammaticSceneProps['target'],
): SpatialSceneMorphProfile {
  if (target?.kind === 'ecosystem') {
    return target.ecosystem === 'arc'
      ? { positionX: -0.12, positionY: 0.08, rotationZ: -0.05, scaleX: 1.04, scaleY: 1.02 }
      : { positionX: 0.14, positionY: -0.1, rotationZ: 0.07, scaleX: 1.03, scaleY: 1.05 }
  }

  if (target?.kind !== 'project') {
    return defaultHomeMorphProfile
  }

  switch (target.project) {
    case 'signal-ledger':
      return { positionX: 0.28, positionY: -0.08, rotationZ: -0.08, scaleX: 1.1, scaleY: 1.06 }
    case 'hadron':
      return { positionX: 0.08, positionY: -0.18, rotationZ: 0.12, scaleX: 1.08, scaleY: 1.1 }
    case 'arcpredict':
      return { positionX: -0.2, positionY: -0.08, rotationZ: -0.12, scaleX: 1.07, scaleY: 1.04 }
    case 'rialo-captain':
      return { positionX: -0.24, positionY: 0.16, rotationZ: 0.1, scaleX: 1.06, scaleY: 1.1 }
  }
}

const beacons = [
  {
    project: 'signal-ledger',
    position: [-1.85, 0.54, 0.08],
    rotationZ: 0,
    scale: [0.16, 0.32, 1],
  },
  {
    project: 'hadron',
    position: [-0.48, 1.04, 0.1],
    rotationZ: Math.PI / 4,
    scale: [0.22, 0.22, 1],
  },
  {
    project: 'arcpredict',
    position: [1.28, 0.64, 0.1],
    rotationZ: -0.18,
    scale: [0.32, 0.14, 1],
  },
  {
    project: 'rialo-captain',
    position: [1.72, -0.9, 0.1],
    rotationZ: 0.32,
    scale: [0.18, 0.34, 1],
  },
] as const satisfies readonly Beacon[]

function withVariantOpacity(opacity: number, variant: ProgrammaticSceneProps['variant']) {
  return variant === 'outgoing' ? opacity * 0.38 : opacity
}

function getEcosystemOpacity(
  ecosystem: 'arc' | 'rialo',
  target: ProgrammaticSceneProps['target'],
  variant: ProgrammaticSceneProps['variant'],
) {
  const emphasized = target?.kind === 'ecosystem' && target.ecosystem === ecosystem

  return withVariantOpacity(emphasized ? 0.92 : 0.62, variant)
}

function getProjectBrightness(project: ProjectSlug, target: ProgrammaticSceneProps['target']) {
  const emphasized = target?.kind === 'project' && target.project === project
  const dimmed = target?.kind === 'project' && target.project !== project

  if (emphasized) {
    return 1.22
  }

  return dimmed ? 0.68 : 0.92
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

function SignalTicks({ quality, variant }: Pick<ProgrammaticSceneProps, 'quality' | 'variant'>) {
  const profile = getScenePrimitiveProfile(quality)
  const count = Math.max(4, Math.floor(profile.tickInstances / 4))
  const meshRef = useRef<InstancedMesh>(null)
  const matrices = useMemo(
    () =>
      createInstanceMatrices(
        Array.from({ length: count }, (_, index) => {
          const angle = (Math.PI * 2 * index) / count
          const radius = 0.52 + (index % 3) * 0.045

          return {
            position: [Math.cos(angle) * radius, Math.sin(angle) * radius, 0.16],
            rotationZ: angle,
            scale: [0.02, 0.1, 1],
          } as const
        }),
      ),
    [count],
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
    <instancedMesh args={[undefined, undefined, count]} ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#d8eef2"
        depthWrite={false}
        opacity={withVariantOpacity(0.34, variant)}
        transparent
      />
    </instancedMesh>
  )
}

function ProjectBeacons({
  colors,
  target,
  variant,
}: {
  colors: ProgrammaticSceneProps['colors']
  target: ProgrammaticSceneProps['target']
  variant: ProgrammaticSceneProps['variant']
}) {
  const meshRef = useRef<InstancedMesh>(null)
  const matrices = useMemo(
    () =>
      createInstanceMatrices(
        beacons.map((beacon) => ({
          position: beacon.position,
          rotationZ: beacon.rotationZ,
          scale: beacon.scale,
        })),
      ),
    [],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current

    if (!mesh) {
      return
    }

    mesh.instanceMatrix.array.set(matrices)

    beacons.forEach((beacon, index) => {
      const color = new Color(colors.projects[beacon.project]).multiplyScalar(
        getProjectBrightness(beacon.project, target),
      )

      mesh.setColorAt(index, color)
    })

    mesh.instanceMatrix.needsUpdate = true

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [colors.projects, matrices, target])

  return (
    <instancedMesh args={[undefined, undefined, beacons.length]} ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        depthWrite={false}
        opacity={withVariantOpacity(0.82, variant)}
        transparent
        vertexColors
      />
    </instancedMesh>
  )
}

export default function HomeAstrolabe({
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
  const morphProfile = getHomeSceneMorphProfile(target)
  useFiniteSceneMorphGroup(sceneRef, {
    durationMs: morphDurationMs,
    morphMode,
    motionEnabled,
    profile: morphProfile,
    quality,
    reducedMotion,
    requestFrame,
  })
  const arcOrbit = useMemo(
    () =>
      createEllipsePoints({
        radiusX: 2.62,
        radiusY: 1.1,
        samples: profile.curveSamples,
        closed: true,
        z: 0,
      }),
    [profile.curveSamples],
  )
  const rialoRadarArc = useMemo(
    () =>
      createArcPoints({
        radiusX: 2.95,
        radiusY: 1.72,
        startAngle: -0.2,
        endAngle: Math.PI * 1.14,
        samples: profile.radarSamples,
        z: -0.04,
      }),
    [profile.radarSamples],
  )

  return (
    <group name="home-astrolabe" ref={sceneRef}>
      <LinePath
        color={colors.ecosystems.arc}
        opacity={getEcosystemOpacity('arc', target, variant)}
        points={arcOrbit}
      />
      <LinePath
        color={colors.ecosystems.rialo}
        opacity={getEcosystemOpacity('rialo', target, variant)}
        points={rialoRadarArc}
      />
      <mesh position={[0, -0.02, 0.12]} scale={[0.56, 0.36, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={colors.panel}
          depthWrite={false}
          opacity={withVariantOpacity(0.4, variant)}
          transparent
        />
      </mesh>
      <SignalTicks quality={quality} variant={variant} />
      <ProjectBeacons colors={colors} target={target} variant={variant} />
    </group>
  )
}
