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

// 分层视差需要比原先单层更高的密度才撑得起纵深：星点拆到三层后，
// 每层各自只占总数的一半、约三分之一与不到五分之一。
// 点图元极廉价——三层合计仍只占 3 个 draw call，2~3 像素的点填充率可忽略。
export const CONSTELLATION_STAR_COUNTS = {
  high: 900,
  medium: 540,
  low: 220,
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
