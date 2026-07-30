import { describe, expect, it } from 'vitest'

import {
  NEBULA_CLOUDS,
  NEBULA_OPACITY,
  getNebulaCloudsForQuality,
  getNebulaOffset,
} from './constellation-nebula'

describe('星云云团配置', () => {
  it('位于星点与节点之后', () => {
    for (const cloud of NEBULA_CLOUDS) {
      expect(cloud.position[2]).toBeLessThan(-1)
    }
  })

  it('尺寸远大于节点辉光，才能形成大范围氛围而非第二组亮点', () => {
    for (const cloud of NEBULA_CLOUDS) {
      expect(cloud.scale[0]).toBeGreaterThan(4)
      expect(cloud.scale[1]).toBeGreaterThan(3)
    }
  })

  it('透明度极低，只作氛围底噪', () => {
    expect(NEBULA_OPACITY).toBeGreaterThan(0)
    expect(NEBULA_OPACITY).toBeLessThan(0.12)
  })

  it('各云团初相互不相同，避免同步摆动', () => {
    expect(new Set(NEBULA_CLOUDS.map((cloud) => cloud.phase)).size).toBe(NEBULA_CLOUDS.length)
  })
})

describe('利萨如漂移', () => {
  it('位移始终不超出声明的摆幅', () => {
    for (const cloud of NEBULA_CLOUDS) {
      for (let time = 0; time < 600; time += 3.7) {
        const [x, y] = getNebulaOffset(cloud, time)

        expect(Math.abs(x)).toBeLessThanOrEqual(cloud.amplitude[0] + 1e-9)
        expect(Math.abs(y)).toBeLessThanOrEqual(cloud.amplitude[1] + 1e-9)
      }
    }
  })

  // 关键性质：路径永不复位。循环缩放式的实现会在循环到头时"跳"一下，
  // 正弦摆动则处处连续——这正是设计上不用循环缩放的理由。
  it('连续无跳变', () => {
    for (const cloud of NEBULA_CLOUDS) {
      let previous = getNebulaOffset(cloud, 0)

      for (let time = 0.05; time < 400; time += 0.05) {
        const current = getNebulaOffset(cloud, time)

        expect(Math.abs(current[0] - previous[0])).toBeLessThan(0.01)
        expect(Math.abs(current[1] - previous[1])).toBeLessThan(0.01)
        previous = current
      }
    }
  })

  it('两轴频率不同，路径不退化为直线', () => {
    for (const cloud of NEBULA_CLOUDS) {
      expect(cloud.frequency[0]).not.toBe(cloud.frequency[1])
    }
  })
})

describe('按画质分档', () => {
  // medium 关闭星云不是因为填充率，而是 draw call 余量：其转场峰值上限仅 18，
  // 保三层视差比保星云重要。
  it('仅 high 档启用', () => {
    expect(getNebulaCloudsForQuality('high')).toHaveLength(NEBULA_CLOUDS.length)
    expect(getNebulaCloudsForQuality('medium')).toHaveLength(0)
    expect(getNebulaCloudsForQuality('low')).toHaveLength(0)
  })
})
