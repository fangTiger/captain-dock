import { projects } from '../../content/catalog'
import {
  CONSTELLATION_EDGES,
  CONSTELLATION_NODES,
  CONSTELLATION_PALETTE,
  CONSTELLATION_STAR_COUNTS,
  createConstellationLinePositions,
  createConstellationStarPositions,
  getConstellationNodesForEcosystem,
} from './constellation-model'
import {
  CONSTELLATION_CURSOR_LERP,
  CONSTELLATION_STARFIELD_LERP,
  getConstellationPointerTarget,
  interpolateConstellationValue,
  recordConstellationPointer,
  resetConstellationPointer,
} from './constellation-motion.client'

describe('constellation model', () => {
  it('maps exactly four catalog projects into an Arc 3 / Rialo 1 constellation', () => {
    expect(CONSTELLATION_NODES).toHaveLength(4)
    expect(CONSTELLATION_NODES.map((node) => node.project)).toEqual(
      projects.map((project) => project.slug),
    )
    expect(getConstellationNodesForEcosystem('arc')).toHaveLength(3)
    expect(getConstellationNodesForEcosystem('rialo')).toHaveLength(1)
    expect(new Set(CONSTELLATION_NODES.map((node) => node.project)).size).toBe(4)
  })

  it('keeps the approved home palette local and every edge anchored to a node', () => {
    expect(CONSTELLATION_PALETTE).toEqual({
      arc: '#7fb0ff',
      rialo: '#e7a94b',
      neutral: '#f4f7ff',
    })

    const projectsBySlug = new Set(CONSTELLATION_NODES.map((node) => node.project))

    for (const edge of CONSTELLATION_EDGES) {
      expect(projectsBySlug.has(edge.from)).toBe(true)
      expect(projectsBySlug.has(edge.to)).toBe(true)
    }

    expect(createConstellationLinePositions()).toHaveLength(
      CONSTELLATION_EDGES.length * 2 * 3,
    )
  })

  it('creates deterministic, finite quality-scaled star positions', () => {
    expect(CONSTELLATION_STAR_COUNTS).toEqual({
      high: 340,
      medium: 210,
      low: 110,
    })

    for (const quality of ['high', 'medium', 'low'] as const) {
      const first = createConstellationStarPositions(quality)
      const second = createConstellationStarPositions(quality)

      expect(first).toHaveLength(CONSTELLATION_STAR_COUNTS[quality] * 3)
      expect(Array.from(first).every(Number.isFinite)).toBe(true)
      expect(first).toEqual(second)
    }
  })
})

describe('constellation motion', () => {
  afterEach(() => {
    resetConstellationPointer()
  })

  it('derives starfield and cursor interpolation from the approved constants', () => {
    expect(CONSTELLATION_STARFIELD_LERP).toBeCloseTo(0.28)
    expect(CONSTELLATION_CURSOR_LERP).toBeCloseTo(0.672)
    expect(interpolateConstellationValue(0, 1, CONSTELLATION_STARFIELD_LERP)).toBeCloseTo(
      0.28,
    )
  })

  it('records only a normalized pointer target for the render loop', () => {
    recordConstellationPointer(900, 0, 1200, 800)

    expect(getConstellationPointerTarget()).toEqual({
      x: 0.5,
      y: 1,
    })

    resetConstellationPointer()
    expect(getConstellationPointerTarget()).toEqual({
      x: 0,
      y: 0,
    })
  })
})
