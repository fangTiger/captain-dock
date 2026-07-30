import { projects } from '../../content/catalog'
import {
  CONSTELLATION_EDGES,
  CONSTELLATION_NODES,
  CONSTELLATION_PALETTE,
  CONSTELLATION_STAR_COUNTS,
  createConstellationLinePositions,
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

  // 星点生成已移入 constellation-starfield.ts 的分层实现，
  // 确定性与取值范围由该模块的用例覆盖，此处只锁定各画质档的总数。
  it('scales star counts per quality tier', () => {
    expect(CONSTELLATION_STAR_COUNTS).toEqual({
      high: 900,
      medium: 540,
      low: 220,
    })
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

describe('星座连线只来自作品之间的真实关系', () => {
  // 此前实现会额外把彼此靠近的随机星点两两相连（createConstellationWebPositions），
  // 即 particles.js 式点线网。该函数已移除，此处锁死"连线只来自 CONSTELLATION_EDGES"。
  it('顶点数恰好等于边数的两倍', () => {
    const positions = createConstellationLinePositions()

    expect(positions).toHaveLength(CONSTELLATION_EDGES.length * 2 * 3)
  })

  it('每个顶点都精确落在某个作品节点上', () => {
    const positions = createConstellationLinePositions()
    // 位置写入 Float32Array 后有精度损失（-2.2 → -2.200000047683716），
    // 故把期望值也用 Math.fround 降到同一精度再比较。
    const nodeKeys = new Set(
      CONSTELLATION_NODES.map((node) => node.position.map(Math.fround).join(',')),
    )

    for (let offset = 0; offset < positions.length; offset += 3) {
      const key = [positions[offset], positions[offset + 1], positions[offset + 2]].join(',')

      expect(nodeKeys).toContain(key)
    }
  })

  it('连线数量不随星点密度变化', () => {
    const lengths = (['high', 'medium', 'low'] as const).map(() => createConstellationLinePositions().length)

    expect(new Set(lengths).size).toBe(1)
  })
})
