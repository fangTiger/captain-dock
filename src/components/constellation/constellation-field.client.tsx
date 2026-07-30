'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  Vector2,
  type InstancedMesh,
  type Texture,
} from 'three'

import type { ProgrammaticSceneProps } from '../scene/scene-router.client'
import { createInstanceMatrices } from '../scene/scene-primitives'
import {
  CONSTELLATION_NODES,
  CONSTELLATION_PALETTE,
  createConstellationLinePositions,
} from './constellation-model'
import {
  getNebulaTexture,
  getNodeGlowTexture,
  getNodeStreakTexture,
} from './constellation-textures'
import {
  NEBULA_OPACITY,
  getNebulaCloudsForQuality,
} from './constellation-nebula'
import {
  STARFIELD_BOUNDS,
  STAR_LAYER_FRAGMENT_SHADER,
  STAR_LAYER_VERTEX_SHADER,
  getStarLayersForQuality,
} from './constellation-starfield'

// 星场统一使用标准 AdditiveBlending。
//
// ⚠️ 不要改成「RGB 加法 + alpha 恒取 dst」的 CustomBlending。曾经这么做过
// （bc4785e），动机是：AdditiveBlending 的 gl.blendFunc(SRC_ALPHA, ONE) 同时
// 作用于 alpha 通道（A = src.a² + dst.a），会累积画布 alpha，而渲染器以
// alpha: true 创建、浏览器按 result = canvasRGB + pageBG × (1 − a) 合成，
// 于是画布会轻微遮挡 globals.css 里页面自身的径向渐变。
//
// 但 blendSrcAlpha: ZeroFactor / blendDstAlpha: OneFactor 会让画布 alpha 恒为
// 0 而 RGB 大于 0，这在预乘 alpha 的定义下是非法数据。Chrome/Metal 容忍它，
// WebKit 严格按预乘语义把 RGB 钳到 alpha —— 结果整片星场在 Safari 里彻底消失
// （实测 WebKit 合成后最大亮度 58、亮像素 0%，而 Chrome 为 255、1.2%；
// canvas 挂载、ready=true、7 个 draw call 全部正常，问题只在合成阶段）。
//
// 而它换来的收益微乎其微：实测 alpha 累积峰值仅 0.38、中位 0.06，且节点当初
// 之所以像"贴上去的硬币"，主因是 vertexColors 缺陷把颜色归零（faccdf0），
// 与 alpha 无关。负收益交换，已回退。
const ADDITIVE_LIGHT = {
  blending: AdditiveBlending,
} as const

// 星层 uniform 由本组件创建、经 ref 交给 HomeConstellation 的 useFrame 驱动。
//
// 这样 ConstellationField 保持为纯 JSX 组装、不含 useFrame，因而可以被
// renderToStaticMarkup 直接渲染——draw call 预算测试正是依赖这一点
// （arc / rialo 两个场景同样不含 useFrame，唯独 HomeConstellation 含有，
// 所以测试对首页渲染的是本组件而非场景组件）。
export type StarLayerUniforms = Readonly<{
  uTime: { value: number }
  uPointer: { value: Vector2 }
  uDrift: { value: number }
  uParallax: { value: number }
  uSize: { value: number }
  uScale: { value: number }
  uBounds: { value: Vector2 }
  uColor: { value: Color }
  uOpacity: { value: number }
}>

type ConstellationFieldProps = Pick<
  ProgrammaticSceneProps,
  'quality' | 'target' | 'variant'
> & {
  starUniformsRef?: React.MutableRefObject<readonly StarLayerUniforms[] | null>
  // 星云只有 3 个实例，矩阵由驱动方逐帧写入即可，无需为它单独写实例化着色器。
  nebulaRef?: React.RefObject<InstancedMesh | null>
}

function NebulaLayer({
  meshRef,
  quality,
  variant,
}: Readonly<{
  meshRef: ConstellationFieldProps['nebulaRef']
  quality: ProgrammaticSceneProps['quality']
  variant: ProgrammaticSceneProps['variant']
}>) {
  const localRef = useRef<InstancedMesh>(null)
  const clouds = useMemo(() => getNebulaCloudsForQuality(quality), [quality])
  const matrices = useMemo(
    () =>
      createInstanceMatrices(
        clouds.map((cloud) => ({
          position: cloud.position,
          rotationZ: 0,
          scale: [cloud.scale[0], cloud.scale[1], 1],
        })),
      ),
    [clouds],
  )

  useLayoutEffect(() => {
    const mesh = localRef.current

    if (!mesh || clouds.length === 0) {
      return
    }

    mesh.instanceMatrix.array.set(matrices)
    clouds.forEach((cloud, index) => {
      mesh.setColorAt(index, new Color(cloud.color))
    })
    mesh.instanceMatrix.needsUpdate = true

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  }, [clouds, matrices])

  useLayoutEffect(() => {
    if (!meshRef) {
      return undefined
    }

    meshRef.current = localRef.current

    return () => {
      meshRef.current = null
    }
  }, [clouds, meshRef])

  if (clouds.length === 0) {
    return null
  }

  return (
    <instancedMesh args={[undefined, undefined, clouds.length]} ref={localRef}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        {...ADDITIVE_LIGHT}
        map={getNebulaTexture()}
        color={CONSTELLATION_PALETTE.neutral}
        depthWrite={false}
        opacity={withVariantOpacity(NEBULA_OPACITY, variant)}
        transparent
      />
    </instancedMesh>
  )
}

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
        {...ADDITIVE_LIGHT}
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
  nebulaRef,
  quality,
  starUniformsRef,
  target,
  variant,
}: ConstellationFieldProps) {
  const starLayers = useMemo(() => getStarLayersForQuality(quality), [quality])
  // 连线只来自 CONSTELLATION_EDGES，即四个作品之间的真实星座关系。
  // 原先还会把彼此靠近的随机星点两两相连，那是 particles.js 式的点线网，
  // 廉价联想极强，已随本次重设计移除。
  const lines = useMemo(() => createConstellationLinePositions(), [])
  const starUniforms = useMemo(
    () =>
      starLayers.map((layer) => ({
        uTime: { value: 0 },
        uPointer: { value: new Vector2() },
        uDrift: { value: layer.drift },
        uParallax: { value: layer.parallax },
        uSize: { value: layer.size },
        // 与 three 的 sizeAttenuation 一致，取画布高度的一半；
        // 真实值由驱动方每帧写入，这里只给一个合理初值避免首帧尺寸突变。
        uScale: { value: 450 },
        uBounds: { value: new Vector2(STARFIELD_BOUNDS.x, STARFIELD_BOUNDS.y) },
        uColor: { value: new Color(CONSTELLATION_PALETTE.neutral) },
        uOpacity: { value: withVariantOpacity(layer.opacity, variant) },
      })),
    [starLayers, variant],
  )

  useLayoutEffect(() => {
    if (!starUniformsRef) {
      return undefined
    }

    starUniformsRef.current = starUniforms

    return () => {
      starUniformsRef.current = null
    }
  }, [starUniforms, starUniformsRef])

  return (
    <group
      name={`constellation-palette-${CONSTELLATION_PALETTE.arc}-${CONSTELLATION_PALETTE.rialo}`}
    >
      <NebulaLayer meshRef={nebulaRef} quality={quality} variant={variant} />
      {starLayers.map((layer, index) => (
        <points key={layer.id}>
          <bufferGeometry>
            <bufferAttribute args={[layer.attributes.positions, 3]} attach="attributes-position" />
            <bufferAttribute args={[layer.attributes.phases, 1]} attach="attributes-aPhase" />
            <bufferAttribute args={[layer.attributes.rates, 1]} attach="attributes-aRate" />
          </bufferGeometry>
          <shaderMaterial
            {...ADDITIVE_LIGHT}
            depthWrite={false}
            fragmentShader={STAR_LAYER_FRAGMENT_SHADER}
            transparent
            uniforms={starUniforms[index]}
            vertexShader={STAR_LAYER_VERTEX_SHADER}
          />
        </points>
      ))}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute args={[lines, 3]} attach="attributes-position" />
        </bufferGeometry>
        <lineBasicMaterial
          {...ADDITIVE_LIGHT}
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
