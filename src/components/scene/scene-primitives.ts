import type { SceneQuality } from './quality'
import type { ImmersiveSceneId } from './scene-types'

export type EnhancedSceneQuality = Exclude<SceneQuality, 'static'>

export type ScenePrimitiveProfile = {
  curveSamples: number
  radarSamples: number
  pointInstances: number
  tickInstances: number
  transparentPlanes: number
}

export type SceneBudgetEstimate = {
  maxDrawCalls: number
  maxTriangles: number
}

export type SceneCompositionEntry = {
  scene: ImmersiveSceneId
}

export type EllipsePointOptions = {
  radiusX: number
  radiusY: number
  samples: number
  closed?: boolean
  z?: number
}

export type ArcPointOptions = {
  radiusX: number
  radiusY: number
  startAngle?: number
  endAngle?: number
  samples: number
  z?: number
}

export type InstancePlacement = {
  position: readonly [number, number, number]
  rotationZ: number
  scale: readonly [number, number, number]
}

const primitiveProfiles = {
  high: {
    curveSamples: 96,
    radarSamples: 72,
    pointInstances: 96,
    tickInstances: 64,
    transparentPlanes: 3,
  },
  medium: {
    curveSamples: 64,
    radarSamples: 48,
    pointInstances: 48,
    tickInstances: 40,
    transparentPlanes: 2,
  },
  low: {
    curveSamples: 32,
    radarSamples: 24,
    pointInstances: 0,
    tickInstances: 20,
    transparentPlanes: 0,
  },
} as const satisfies Record<EnhancedSceneQuality, ScenePrimitiveProfile>

const sceneBudgetEstimates = {
  home: {
    high: {
      maxDrawCalls: 7,
      maxTriangles: 760,
    },
    medium: {
      maxDrawCalls: 7,
      maxTriangles: 520,
    },
    low: {
      maxDrawCalls: 6,
      maxTriangles: 360,
    },
  },
  arc: {
    high: {
      maxDrawCalls: 10,
      maxTriangles: 940,
    },
    medium: {
      maxDrawCalls: 10,
      maxTriangles: 700,
    },
    low: {
      maxDrawCalls: 8,
      maxTriangles: 460,
    },
  },
  rialo: {
    high: {
      maxDrawCalls: 8,
      maxTriangles: 820,
    },
    medium: {
      maxDrawCalls: 8,
      maxTriangles: 580,
    },
    low: {
      maxDrawCalls: 6,
      maxTriangles: 380,
    },
  },
} as const satisfies Record<ImmersiveSceneId, Record<EnhancedSceneQuality, SceneBudgetEstimate>>

const sharedUniverseBudgetEstimates = {
  high: {
    maxDrawCalls: 3,
    maxTriangles: 340,
  },
  medium: {
    maxDrawCalls: 3,
    maxTriangles: 240,
  },
  low: {
    maxDrawCalls: 2,
    maxTriangles: 160,
  },
} as const satisfies Record<EnhancedSceneQuality, SceneBudgetEstimate>

const sceneOnlyBudgetEstimates = {
  // 首页星场：points + lineSegments + 星芒精灵 + 辉光精灵 = 4。
  // ClusterAuras 已随节点精灵化移除（原为 2 个 draw call）。
  home: {
    high: {
      maxDrawCalls: 4,
      maxTriangles: 420,
    },
    medium: {
      maxDrawCalls: 4,
      maxTriangles: 280,
    },
    low: {
      maxDrawCalls: 4,
      maxTriangles: 200,
    },
  },
  arc: {
    high: {
      maxDrawCalls: 7,
      maxTriangles: 600,
    },
    medium: {
      maxDrawCalls: 7,
      maxTriangles: 460,
    },
    low: {
      maxDrawCalls: 6,
      maxTriangles: 300,
    },
  },
  rialo: {
    high: {
      maxDrawCalls: 5,
      maxTriangles: 480,
    },
    medium: {
      maxDrawCalls: 5,
      maxTriangles: 340,
    },
    low: {
      maxDrawCalls: 4,
      maxTriangles: 220,
    },
  },
} as const satisfies Record<ImmersiveSceneId, Record<EnhancedSceneQuality, SceneBudgetEstimate>>

function hasStringKey<T extends Record<string, unknown>>(
  record: T,
  key: string,
): key is Extract<keyof T, string> {
  return Object.hasOwn(record, key)
}

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`)
  }
}

function assertPositiveNumber(value: number, label: string) {
  assertFiniteNumber(value, label)

  if (value <= 0) {
    throw new Error(`${label} radius or scale must be positive`)
  }
}

function assertIntegerSamples(samples: number, minimum: number) {
  if (!Number.isInteger(samples) || samples < minimum) {
    throw new Error(`samples must be an integer greater than or equal to ${minimum}`)
  }
}

function assertVectorFinite(vector: readonly [number, number, number], label: string) {
  for (const value of vector) {
    assertFiniteNumber(value, label)
  }
}

function normalizeZero(value: number) {
  return Object.is(value, -0) ? 0 : value
}

function normalizeQuality(quality: SceneQuality): EnhancedSceneQuality {
  if (!hasStringKey(primitiveProfiles, quality)) {
    throw new Error(`Unsupported scene primitive quality: ${quality}`)
  }

  return quality
}

function normalizeScene(scene: ImmersiveSceneId): ImmersiveSceneId {
  if (!hasStringKey(sceneBudgetEstimates, scene)) {
    throw new Error(`Unsupported scene primitive scene: ${String(scene)}`)
  }

  return scene
}

export function getScenePrimitiveProfile(quality: SceneQuality): ScenePrimitiveProfile {
  return primitiveProfiles[normalizeQuality(quality)]
}

export function estimateSceneBudget(
  scene: ImmersiveSceneId,
  quality: SceneQuality,
): SceneBudgetEstimate {
  return sceneBudgetEstimates[normalizeScene(scene)][normalizeQuality(quality)]
}

export function estimateSharedUniverseBudget(quality: SceneQuality): SceneBudgetEstimate {
  return sharedUniverseBudgetEstimates[normalizeQuality(quality)]
}

export function estimateSceneTransitionBudget(
  quality: SceneQuality,
  entries: readonly SceneCompositionEntry[],
): SceneBudgetEstimate {
  const normalizedQuality = normalizeQuality(quality)
  const sharedBudget = estimateSharedUniverseBudget(normalizedQuality)

  return entries.reduce<SceneBudgetEstimate>(
    (budget, entry) => {
      const sceneBudget = sceneOnlyBudgetEstimates[normalizeScene(entry.scene)][normalizedQuality]

      return {
        maxDrawCalls: budget.maxDrawCalls + sceneBudget.maxDrawCalls,
        maxTriangles: budget.maxTriangles + sceneBudget.maxTriangles,
      }
    },
    {
      maxDrawCalls: sharedBudget.maxDrawCalls,
      maxTriangles: sharedBudget.maxTriangles,
    },
  )
}

export function createEllipsePoints({
  radiusX,
  radiusY,
  samples,
  closed = false,
  z = 0,
}: EllipsePointOptions): Float32Array {
  assertPositiveNumber(radiusX, 'radiusX')
  assertPositiveNumber(radiusY, 'radiusY')
  assertFiniteNumber(z, 'z')
  assertIntegerSamples(samples, 3)

  const pointCount = closed ? samples + 1 : samples
  const positions = new Float32Array(pointCount * 3)
  const denominator = samples

  for (let index = 0; index < pointCount; index += 1) {
    const offset = index * 3

    if (closed && index === samples) {
      positions[offset] = radiusX
      positions[offset + 1] = 0
      positions[offset + 2] = z
      continue
    }

    const angle = (Math.PI * 2 * index) / denominator

    positions[offset] = Math.cos(angle) * radiusX
    positions[offset + 1] = Math.sin(angle) * radiusY
    positions[offset + 2] = z
  }

  return positions
}

export function createArcPoints({
  radiusX,
  radiusY,
  startAngle = 0,
  endAngle = Math.PI * 2,
  samples,
  z = 0,
}: ArcPointOptions): Float32Array {
  assertPositiveNumber(radiusX, 'radiusX')
  assertPositiveNumber(radiusY, 'radiusY')
  assertFiniteNumber(startAngle, 'startAngle')
  assertFiniteNumber(endAngle, 'endAngle')
  assertFiniteNumber(z, 'z')
  assertIntegerSamples(samples, 2)

  const positions = new Float32Array((samples + 1) * 3)
  const angleSpan = endAngle - startAngle

  for (let index = 0; index <= samples; index += 1) {
    const angle = startAngle + (angleSpan * index) / samples
    const offset = index * 3

    positions[offset] = Math.cos(angle) * radiusX
    positions[offset + 1] = Math.sin(angle) * radiusY
    positions[offset + 2] = z
  }

  return positions
}

export function createInstanceMatrices(placements: readonly InstancePlacement[]): Float32Array {
  const matrices = new Float32Array(placements.length * 16)

  placements.forEach((placement, index) => {
    assertVectorFinite(placement.position, 'position')
    assertFiniteNumber(placement.rotationZ, 'rotationZ')

    for (const value of placement.scale) {
      assertPositiveNumber(value, 'scale')
    }

    const [scaleX, scaleY, scaleZ] = placement.scale
    const [x, y, z] = placement.position
    const cos = Math.cos(placement.rotationZ)
    const sin = Math.sin(placement.rotationZ)
    const offset = index * 16

    matrices[offset] = normalizeZero(cos * scaleX)
    matrices[offset + 1] = normalizeZero(sin * scaleX)
    matrices[offset + 2] = 0
    matrices[offset + 3] = 0
    matrices[offset + 4] = normalizeZero(-sin * scaleY)
    matrices[offset + 5] = normalizeZero(cos * scaleY)
    matrices[offset + 6] = 0
    matrices[offset + 7] = 0
    matrices[offset + 8] = 0
    matrices[offset + 9] = 0
    matrices[offset + 10] = scaleZ
    matrices[offset + 11] = 0
    matrices[offset + 12] = x
    matrices[offset + 13] = y
    matrices[offset + 14] = z
    matrices[offset + 15] = 1
  })

  return matrices
}
