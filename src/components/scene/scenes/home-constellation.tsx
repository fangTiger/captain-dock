'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Matrix4, type Group, type InstancedMesh } from 'three'

import {
  ConstellationField,
  type StarLayerUniforms,
} from '../../constellation/constellation-field.client'
import {
  CONSTELLATION_STARFIELD_LERP,
  getConstellationPointerTarget,
  interpolateConstellationValue,
  useConstellationPointerTracking,
} from '../../constellation/constellation-motion.client'
import {
  NEBULA_CLOUDS,
  getNebulaOffset,
} from '../../constellation/constellation-nebula'
import {
  useFiniteSceneMorphGroup,
  type SpatialSceneMorphProfile,
} from '../finite-scene-morph'
import type { ProgrammaticSceneProps } from '../scene-router.client'

// 指针视差的世界单位行程；逐层再乘以各自的 parallax 系数。
const POINTER_TRAVEL_X = 0.42
const POINTER_TRAVEL_Y = 0.26

// 相机缓推：周期 2π/0.05 ≈ 125 秒，摆幅 0.35 世界单位。
const DOLLY_FREQUENCY = 0.05
const DOLLY_AMPLITUDE = 0.35

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
  const starUniformsRef = useRef<readonly StarLayerUniforms[] | null>(null)
  const dollyRef = useRef<Group>(null)
  const nebulaRef = useRef<InstancedMesh | null>(null)
  // 复用同一个 Matrix4，避免每帧为 3 个云团反复分配
  const nebulaMatrix = useRef(new Matrix4())
  const elapsedRef = useRef(0)
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

  // 星场的纵深不再靠整体旋转，而是由三层不同速率的漂移与指针视差产生。
  // 此处只负责把时间与指针写进各层 uniform，环绕与闪烁都在顶点着色器内完成。
  useFrame((state, delta) => {
    const uniforms = starUniformsRef.current

    if (!uniforms || !motionActive) {
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

    // 夹住 delta，避免标签页切回时累积出一次大跳变
    elapsedRef.current += Math.min(Math.max(delta, 0), 0.05)

    // three 的 sizeAttenuation 用画布高度的一半作为比例基准
    const scale = state.size.height * 0.5

    for (const layer of uniforms) {
      layer.uTime.value = elapsedRef.current
      layer.uScale.value = scale
      layer.uPointer.value.set(
        pointerRef.current.x * POINTER_TRAVEL_X,
        -pointerRef.current.y * POINTER_TRAVEL_Y,
      )
    }

    // 星云沿各自的利萨如路径缓慢漂移；仅 3 个实例，逐帧写矩阵的开销可忽略。
    const nebula = nebulaRef.current

    if (nebula) {
      const matrix = nebulaMatrix.current

      NEBULA_CLOUDS.forEach((cloud, index) => {
        const [offsetX, offsetY] = getNebulaOffset(cloud, elapsedRef.current)

        matrix.makeScale(cloud.scale[0], cloud.scale[1], 1)
        matrix.setPosition(
          cloud.position[0] + offsetX,
          cloud.position[1] + offsetY,
          cloud.position[2],
        )
        nebula.setMatrixAt(index, matrix)
      })

      nebula.instanceMatrix.needsUpdate = true
    }

    // 相机缓推：极慢的正弦呼吸，周期约 125 秒。
    // 刻意不用循环缩放——循环到头复位会产生可见跳变，正弦则永不复位。
    //
    // 必须作用在独立的一层 group 上：sceneRef 由 useFiniteSceneMorphGroup 接管，
    // 其 applySpatialChannels 会整体写 position.set(x, y, impact * 0.18)，
    // 在同一个 group 上写 z 会被形变逐帧覆盖。group 不产生 draw call。
    const dolly = dollyRef.current

    if (dolly && quality !== 'low') {
      dolly.position.z = Math.sin(elapsedRef.current * DOLLY_FREQUENCY) * DOLLY_AMPLITUDE
    }

    requestFrame()
  })

  return (
    <group name="home-constellation" ref={sceneRef}>
      <group ref={dollyRef}>
        <ConstellationField
          nebulaRef={nebulaRef}
          quality={quality}
          starUniformsRef={starUniformsRef}
          target={target}
          variant={variant}
        />
      </group>
    </group>
  )
}
