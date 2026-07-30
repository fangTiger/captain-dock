'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  AddEquation,
  Color,
  CustomBlending,
  OneFactor,
  SrcAlphaFactor,
  ZeroFactor,
  type InstancedMesh,
  type Texture,
} from 'three'

import type { ProgrammaticSceneProps } from '../scene/scene-router.client'
import { createInstanceMatrices } from '../scene/scene-primitives'
import {
  CONSTELLATION_NODES,
  CONSTELLATION_PALETTE,
  createConstellationLinePositions,
  createConstellationStarPositions,
  createConstellationWebPositions,
} from './constellation-model'
import { getNodeGlowTexture, getNodeStreakTexture } from './constellation-textures'

// 星场对页面只做「加光」，不遮挡其背后的背景。
//
// three.js 的 AdditiveBlending 用 gl.blendFunc(SRC_ALPHA, ONE)，该设置同时
// 作用于 alpha 通道（A = src.a² + dst.a），会持续累积画布 alpha。渲染器以
// alpha: true 创建，浏览器按 result = canvasRGB + pageBG × (1 − a) 合成，
// 累积的 alpha 会按比例削弱 globals.css 中页面自身的径向渐变。
//
// 改为 CustomBlending：RGB 保持加法，alpha 恒取 dst（A = 0 × src.a + 1 × dst.a），
// 画布 alpha 始终为 0，合成退化为纯加法。
//
// 注：实测该削弱幅度有限（峰值 alpha ≈ 0.38、中位 ≈ 0.06），并非节点观感问题
// 的主因——主因是此前 vertexColors 缺陷把节点颜色归零（见 faccdf0）。此处属
// 正确性改进，代价为零。
const ADDITIVE_KEEP_DST_ALPHA = {
  blending: CustomBlending,
  blendEquation: AddEquation,
  blendSrc: SrcAlphaFactor,
  blendDst: OneFactor,
  blendEquationAlpha: AddEquation,
  blendSrcAlpha: ZeroFactor,
  blendDstAlpha: OneFactor,
} as const

type ConstellationFieldProps = Pick<
  ProgrammaticSceneProps,
  'quality' | 'target' | 'variant'
>

type NodeSpriteLayerProps = Readonly<{
  opacity: number
  // 每个实例的平面尺寸；星芒层用非等比缩放拉成一道细长光条。
  scale: (brightness: number) => readonly [number, number]
  target: ProgrammaticSceneProps['target']
  texture: Texture
}>

// 辉光为正方形；星芒横向拉长、纵向压扁，长度随亮度增长——
// 悬停目标节点时不只是变亮，星芒会横向"拉开"，指向性更强。
const NODE_GLOW_SIZE = 1
const NODE_STREAK_LENGTH = 2.7
const NODE_STREAK_THICKNESS = 0.34

// 亮度只通过 instanceColor 表达，辉光尺寸保持恒定，避免与颜色重复计一次。
const glowScale = () => [NODE_GLOW_SIZE, NODE_GLOW_SIZE] as const
const streakScale = (brightness: number) =>
  [NODE_STREAK_LENGTH * brightness, NODE_STREAK_THICKNESS] as const

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
  scale: NodeSpriteLayerProps['scale'],
  target: ProgrammaticSceneProps['target'],
) {
  const matrices = useMemo(
    () =>
      createInstanceMatrices(
        CONSTELLATION_NODES.map((node) => {
          const [scaleX, scaleY] = scale(getNodeBrightness(node.project, target))

          return {
            position: node.position,
            rotationZ: 0,
            scale: [scaleX, scaleY, 1],
          }
        }),
      ),
    [scale, target],
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

function NodeSpriteLayer({ opacity, scale, target, texture }: NodeSpriteLayerProps) {
  const meshRef = useRef<InstancedMesh>(null)

  useInstanceLayer(meshRef, scale, target)

  return (
    <instancedMesh args={[undefined, undefined, CONSTELLATION_NODES.length]} ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      {/* 逐实例颜色由 setColorAt 写入 instanceColor，three.js 会自动启用
          USE_INSTANCING_COLOR；此处不能开 vertexColors，否则着色器会去读
          planeGeometry 上并不存在的 color 属性（默认值为全零）并把节点乘成纯黑。 */}
      <meshBasicMaterial
        {...ADDITIVE_KEEP_DST_ALPHA}
        map={texture}
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
          {...ADDITIVE_KEEP_DST_ALPHA}
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
          {...ADDITIVE_KEEP_DST_ALPHA}
          color={CONSTELLATION_PALETTE.arc}
          depthWrite={false}
          opacity={withVariantOpacity(0.22, variant)}
          transparent
        />
      </lineSegments>
      {/* 星芒画在辉光之下，让热白星核压在光条中央。 */}
      <NodeSpriteLayer
        opacity={withVariantOpacity(0.72, variant)}
        scale={streakScale}
        target={target}
        texture={getNodeStreakTexture()}
      />
      <NodeSpriteLayer
        opacity={withVariantOpacity(1, variant)}
        scale={glowScale}
        target={target}
        texture={getNodeGlowTexture()}
      />
    </group>
  )
}
