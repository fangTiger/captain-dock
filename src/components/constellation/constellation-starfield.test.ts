import { describe, expect, it } from 'vitest'

import { CONSTELLATION_STAR_COUNTS } from './constellation-model'
import {
  STARFIELD_BOUNDS,
  STAR_LAYERS,
  STAR_LAYER_FRAGMENT_SHADER,
  STAR_LAYER_VERTEX_SHADER,
  createStarLayerAttributes,
  getStarLayersForQuality,
} from './constellation-starfield'

describe('星层配置', () => {
  // 纵深感的来源：越近的层漂移越快、跟指针越紧。若这个单调关系被破坏，
  // 三层就会重新退化成"一块平板"，也就是这次重设计要解决的问题。
  it('由远及近，漂移速率与指针视差系数单调递增', () => {
    for (let index = 1; index < STAR_LAYERS.length; index += 1) {
      expect(STAR_LAYERS[index].drift).toBeGreaterThan(STAR_LAYERS[index - 1].drift)
      expect(STAR_LAYERS[index].parallax).toBeGreaterThan(STAR_LAYERS[index - 1].parallax)
      expect(STAR_LAYERS[index].size).toBeGreaterThan(STAR_LAYERS[index - 1].size)
      expect(STAR_LAYERS[index].opacity).toBeGreaterThan(STAR_LAYERS[index - 1].opacity)
    }
  })

  it('越远的层星点越多', () => {
    for (let index = 1; index < STAR_LAYERS.length; index += 1) {
      expect(STAR_LAYERS[index].share).toBeLessThan(STAR_LAYERS[index - 1].share)
    }
  })

  it('各层随机种子互不相同，避免三层图案重合', () => {
    expect(new Set(STAR_LAYERS.map((layer) => layer.seed)).size).toBe(STAR_LAYERS.length)
  })
})

describe('星层属性生成', () => {
  it('确定性：同一 count 与 seed 必然得到同一结果', () => {
    const first = createStarLayerAttributes(64, 0x1234)
    const second = createStarLayerAttributes(64, 0x1234)

    expect(first.positions).toEqual(second.positions)
    expect(first.phases).toEqual(second.phases)
    expect(first.rates).toEqual(second.rates)
  })

  it('不同种子得到不同图案', () => {
    const a = createStarLayerAttributes(64, 0x1234)
    const b = createStarLayerAttributes(64, 0x5678)

    expect(a.positions).not.toEqual(b.positions)
  })

  it('位置全部有限且落在星场范围内', () => {
    const { positions } = createStarLayerAttributes(256, 0xabcdef)

    expect(positions).toHaveLength(256 * 3)

    for (let offset = 0; offset < positions.length; offset += 3) {
      expect(Number.isFinite(positions[offset])).toBe(true)
      expect(Math.abs(positions[offset])).toBeLessThanOrEqual(STARFIELD_BOUNDS.x / 2)
      expect(Math.abs(positions[offset + 1])).toBeLessThanOrEqual(STARFIELD_BOUNDS.y / 2)
    }
  })

  // 闪烁频率下限不为零，否则会出现完全不闪的"死星"。
  it('逐星相位铺满整周，频率恒为正', () => {
    const { phases, rates } = createStarLayerAttributes(512, 0x99)

    expect(Math.min(...phases)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...phases)).toBeLessThanOrEqual(Math.PI * 2)
    expect(Math.max(...phases)).toBeGreaterThan(Math.PI)
    expect(Math.min(...rates)).toBeGreaterThan(0)
  })
})

describe('按画质分档', () => {
  it('high 与 medium 保留三层视差', () => {
    expect(getStarLayersForQuality('high')).toHaveLength(3)
    expect(getStarLayersForQuality('medium')).toHaveLength(3)
  })

  // low 档优先保帧率，只留最近一层；分层视差是高低档之间最先被牺牲的一项。
  it('low 只保留最近一层', () => {
    const layers = getStarLayersForQuality('low')

    expect(layers).toHaveLength(1)
    expect(layers[0].id).toBe('near')
  })

  it('各档星点总数与声明的预算相符', () => {
    for (const quality of ['high', 'medium', 'low'] as const) {
      const layers = getStarLayersForQuality(quality)
      const total = layers.reduce<number>((sum, layer) => sum + layer.count, 0)

      // 逐层取整会带来少量偏差，允许 ±层数 的误差
      expect(Math.abs(total - CONSTELLATION_STAR_COUNTS[quality])).toBeLessThanOrEqual(layers.length)
      for (const layer of layers) {
        expect(layer.attributes.positions).toHaveLength(layer.count * 3)
        expect(layer.attributes.phases).toHaveLength(layer.count)
      }
    }
  })
})

describe('着色器', () => {
  // 环绕漂移必须在顶点着色器内用 mod 完成，否则要么逐帧回写 CPU 缓冲，
  // 要么星点漂出视野后不再回来。
  it('顶点着色器以 mod 实现无缝环绕', () => {
    expect(STAR_LAYER_VERTEX_SHADER).toContain('mod(')
    expect(STAR_LAYER_VERTEX_SHADER).toContain('uBounds')
  })

  it('闪烁使用逐星相位与频率属性', () => {
    expect(STAR_LAYER_VERTEX_SHADER).toContain('attribute float aPhase')
    expect(STAR_LAYER_VERTEX_SHADER).toContain('attribute float aRate')
    expect(STAR_LAYER_VERTEX_SHADER).toContain('sin(uTime * aRate + aPhase)')
  })

  it('片元着色器把方形点裁成圆形', () => {
    expect(STAR_LAYER_FRAGMENT_SHADER).toContain('gl_PointCoord')
    expect(STAR_LAYER_FRAGMENT_SHADER).toContain('smoothstep')
  })
})
