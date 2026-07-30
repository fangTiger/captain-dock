'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type InstancedMesh } from 'three'

import type { ProgrammaticSceneProps } from '../scene/scene-router.client'
import { createInstanceMatrices } from '../scene/scene-primitives'
import {
  CONSTELLATION_NODES,
  CONSTELLATION_PALETTE,
  createConstellationLinePositions,
  createConstellationStarPositions,
  createConstellationWebPositions,
  getConstellationNodesForEcosystem,
} from './constellation-model'

type ConstellationFieldProps = Pick<
  ProgrammaticSceneProps,
  'quality' | 'target' | 'variant'
>

type InstanceLayerProps = Readonly<{
  opacity: number
  scale: number
  target: ProgrammaticSceneProps['target']
}>

function withVariantOpacity(
  opacity: number,
  variant: ProgrammaticSceneProps['variant'],
) {
  return variant === 'outgoing' ? opacity * 0.32 : opacity
}

function getNodeBrightness(
  project: (typeof CONSTELLATION_NODES)[number]['project'],
  target: ProgrammaticSceneProps['target'],
) {
  if (target?.kind !== 'project') {
    return 1
  }

  return target.project === project ? 1.24 : 0.72
}

function useInstanceLayer(
  meshRef: React.RefObject<InstancedMesh | null>,
  scale: number,
  target: ProgrammaticSceneProps['target'],
) {
  const matrices = useMemo(
    () =>
      createInstanceMatrices(
        CONSTELLATION_NODES.map((node) => ({
          position: node.position,
          rotationZ: 0,
          scale: [scale, scale, 1],
        })),
      ),
    [scale],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current

    if (!mesh) {
      return
    }

    mesh.instanceMatrix.array.set(matrices)

    CONSTELLATION_NODES.forEach((node, index) => {
      const color = new Color(CONSTELLATION_PALETTE[node.ecosystem]).multiplyScalar(
        getNodeBrightness(node.project, target),
      )

      mesh.setColorAt(index, color)
    })

    mesh.instanceMatrix.needsUpdate = true

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [matrices, meshRef, target])
}

function NodeLayer({ opacity, scale, target }: InstanceLayerProps) {
  const meshRef = useRef<InstancedMesh>(null)

  useInstanceLayer(meshRef, scale, target)

  return (
    <instancedMesh args={[undefined, undefined, CONSTELLATION_NODES.length]} ref={meshRef}>
      <circleGeometry args={[1, 24]} />
      {/* 逐实例颜色由 setColorAt 写入 instanceColor，three.js 会自动启用
          USE_INSTANCING_COLOR；此处不能开 vertexColors，否则着色器会去读
          circleGeometry 上并不存在的 color 属性（默认值为全零）并把节点乘成纯黑。 */}
      <meshBasicMaterial
        blending={AdditiveBlending}
        color={CONSTELLATION_PALETTE.neutral}
        depthWrite={false}
        opacity={opacity}
        transparent
      />
    </instancedMesh>
  )
}

function ClusterAuras({ opacity }: Readonly<{ opacity: number }>) {
  const meshRef = useRef<InstancedMesh>(null)
  const clusters = useMemo(
    () =>
      (['arc', 'rialo'] as const).map((ecosystem) => {
        const nodes = getConstellationNodesForEcosystem(ecosystem)
        const center = nodes.reduce<[number, number, number]>(
          (sum, node) => [
            sum[0] + node.position[0] / nodes.length,
            sum[1] + node.position[1] / nodes.length,
            sum[2] + node.position[2] / nodes.length,
          ],
          [0, 0, 0] as [number, number, number],
        )

        return {
          ecosystem,
          position: center,
        }
      }),
    [],
  )
  const matrices = useMemo(
    () =>
      createInstanceMatrices(
        clusters.map((cluster) => ({
          position: [cluster.position[0], cluster.position[1], -0.12],
          rotationZ: 0,
          scale: cluster.ecosystem === 'arc' ? [1.28, 0.82, 1] : [0.72, 0.72, 1],
        })),
      ),
    [clusters],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current

    if (!mesh) {
      return
    }

    mesh.instanceMatrix.array.set(matrices)
    clusters.forEach((cluster, index) => {
      mesh.setColorAt(index, new Color(CONSTELLATION_PALETTE[cluster.ecosystem]))
    })
    mesh.instanceMatrix.needsUpdate = true

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [clusters, matrices])

  return (
    <instancedMesh args={[undefined, undefined, clusters.length]} ref={meshRef}>
      <circleGeometry args={[1, 20]} />
      <meshBasicMaterial
        color={CONSTELLATION_PALETTE.neutral}
        depthWrite={false}
        opacity={opacity}
        transparent
      />
    </instancedMesh>
  )
}

export function ConstellationField({
  quality,
  target,
  variant,
}: ConstellationFieldProps) {
  const stars = useMemo(() => createConstellationStarPositions(quality), [quality])
  // 节点连线 + 邻近星网合并进同一条 lineSegments（保持 5 draw calls）。
  const lines = useMemo(() => {
    const edges = createConstellationLinePositions()
    const web = createConstellationWebPositions(stars)
    const merged = new Float32Array(edges.length + web.length)
    merged.set(edges, 0)
    merged.set(web, edges.length)
    return merged
  }, [stars])

  return (
    <group
      name={`constellation-palette-${CONSTELLATION_PALETTE.arc}-${CONSTELLATION_PALETTE.rialo}`}
    >
      <points>
        <bufferGeometry>
          <bufferAttribute args={[stars, 3]} attach="attributes-position" />
        </bufferGeometry>
        <pointsMaterial
          blending={AdditiveBlending}
          color={CONSTELLATION_PALETTE.neutral}
          depthWrite={false}
          opacity={withVariantOpacity(quality === 'low' ? 0.75 : 0.9, variant)}
          size={quality === 'high' ? 0.032 : 0.04}
          sizeAttenuation
          transparent
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute args={[lines, 3]} attach="attributes-position" />
        </bufferGeometry>
        <lineBasicMaterial
          blending={AdditiveBlending}
          color={CONSTELLATION_PALETTE.arc}
          depthWrite={false}
          opacity={withVariantOpacity(0.22, variant)}
          transparent
        />
      </lineSegments>
      <ClusterAuras opacity={withVariantOpacity(0.05, variant)} />
      <NodeLayer
        opacity={withVariantOpacity(0.5, variant)}
        scale={0.34}
        target={target}
      />
      <NodeLayer
        opacity={withVariantOpacity(1, variant)}
        scale={0.12}
        target={target}
      />
    </group>
  )
}
