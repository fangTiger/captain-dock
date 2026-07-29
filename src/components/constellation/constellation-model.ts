import type { EcosystemSlug, ProjectSlug } from '../../content/types'
import type { EnhancedSceneQuality } from '../scene/scene-primitives'

export type ConstellationNode = Readonly<{
  ecosystem: EcosystemSlug
  position: readonly [number, number, number]
  project: ProjectSlug
}>

export type ConstellationEdge = Readonly<{
  from: ProjectSlug
  to: ProjectSlug
}>

export const CONSTELLATION_PALETTE = {
  arc: '#7fb0ff',
  rialo: '#e7a94b',
  neutral: '#f4f7ff',
} as const satisfies Record<EcosystemSlug | 'neutral', string>

export const CONSTELLATION_NODES = [
  {
    project: 'signal-ledger',
    ecosystem: 'arc',
    position: [-2.2, 0.38, 0.14],
  },
  {
    project: 'hadron',
    ecosystem: 'arc',
    position: [-1.35, 1.18, -0.08],
  },
  {
    project: 'arcpredict',
    ecosystem: 'arc',
    position: [-0.46, 0.18, 0.1],
  },
  {
    project: 'rialo-captain',
    ecosystem: 'rialo',
    position: [1.82, -0.46, 0.06],
  },
] as const satisfies readonly ConstellationNode[]

export const CONSTELLATION_EDGES = [
  {
    from: 'signal-ledger',
    to: 'hadron',
  },
  {
    from: 'hadron',
    to: 'arcpredict',
  },
  {
    from: 'arcpredict',
    to: 'signal-ledger',
  },
  {
    from: 'arcpredict',
    to: 'rialo-captain',
  },
] as const satisfies readonly ConstellationEdge[]

export const CONSTELLATION_STAR_COUNTS = {
  high: 340,
  medium: 210,
  low: 110,
} as const satisfies Record<EnhancedSceneQuality, number>

const nodesByProject = new Map<ProjectSlug, ConstellationNode>(
  CONSTELLATION_NODES.map((node) => [node.project, node]),
)

export function getConstellationNodesForEcosystem(ecosystem: EcosystemSlug) {
  return CONSTELLATION_NODES.filter((node) => node.ecosystem === ecosystem)
}

export function createConstellationLinePositions() {
  const positions = new Float32Array(CONSTELLATION_EDGES.length * 2 * 3)

  CONSTELLATION_EDGES.forEach((edge, edgeIndex) => {
    const from = nodesByProject.get(edge.from)
    const to = nodesByProject.get(edge.to)

    if (!from || !to) {
      throw new Error(`Constellation edge references an unknown project: ${edge.from}:${edge.to}`)
    }

    positions.set(from.position, edgeIndex * 6)
    positions.set(to.position, edgeIndex * 6 + 3)
  })

  return positions
}

function nextSeed(seed: number) {
  return (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0
}

// 生成"邻近星网"：把彼此靠近的星点用细线连起来，形成原型那种密集星座网。
// 结果与节点连线合并进同一条 lineSegments，不额外增加 draw call。
export function createConstellationWebPositions(
  stars: Float32Array,
  maxDistance = 1.02,
  maxLinksPerStar = 2,
) {
  const count = Math.floor(stars.length / 3)
  const segments: number[] = []
  const maxDistanceSq = maxDistance * maxDistance

  for (let i = 0; i < count; i += 1) {
    const ax = stars[i * 3]
    const ay = stars[i * 3 + 1]
    const az = stars[i * 3 + 2]
    let links = 0

    for (let j = i + 1; j < count && links < maxLinksPerStar; j += 1) {
      const dx = ax - stars[j * 3]
      const dy = ay - stars[j * 3 + 1]
      const dz = az - stars[j * 3 + 2]

      if (dx * dx + dy * dy + dz * dz <= maxDistanceSq) {
        segments.push(ax, ay, az, stars[j * 3], stars[j * 3 + 1], stars[j * 3 + 2])
        links += 1
      }
    }
  }

  return new Float32Array(segments)
}

export function createConstellationStarPositions(quality: EnhancedSceneQuality) {
  const count = CONSTELLATION_STAR_COUNTS[quality]
  const positions = new Float32Array(count * 3)
  let seed = quality === 'high' ? 0xc0ffee : quality === 'medium' ? 0x7fb0ff : 0xe7a94b

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3

    seed = nextSeed(seed)
    positions[offset] = (seed / 0x1_0000_0000 - 0.5) * 10.4
    seed = nextSeed(seed)
    positions[offset + 1] = (seed / 0x1_0000_0000 - 0.5) * 6.4
    seed = nextSeed(seed)
    positions[offset + 2] = seed / 0x1_0000_0000 * 3 - 2.45
  }

  return positions
}
