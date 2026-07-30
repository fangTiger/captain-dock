import { afterEach, describe, expect, it } from 'vitest'

import {
  NODE_TEXTURE_SHAPES,
  getNodeGlowTexture,
  getNodeStreakTexture,
  nodeTextureAlphaForTest,
  resetNodeTexturesForTest,
} from './constellation-textures'

const { glow, streak } = nodeTextureAlphaForTest

afterEach(() => {
  resetNodeTexturesForTest()
})

describe('节点辉光贴图', () => {
  it('星核为全亮', () => {
    expect(glow(0, 0)).toBeGreaterThanOrEqual(1)
  })

  it('沿半径单调衰减', () => {
    const samples = [0, 0.1, 0.2, 0.35, 0.5, 0.7, 0.85].map((r) => glow(r, 0))

    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeLessThan(samples[index - 1])
    }
  })

  // 这是"节点不再像贴上去的硬币"的关键性质：边缘必须归零，
  // 而不是像原先的 circleGeometry 那样一刀切。
  it('边缘完全融进背景', () => {
    expect(glow(1, 0)).toBe(0)
    expect(glow(0, 1)).toBe(0)
    expect(glow(0.98, 0)).toBeLessThan(0.001)
    expect(glow(0.75, 0)).toBeLessThan(0.01)
  })

  it('各向同性', () => {
    expect(glow(0.4, 0)).toBeCloseTo(glow(0, 0.4), 10)
    expect(glow(0.3, 0.3)).toBeCloseTo(glow(-0.3, -0.3), 10)
  })
})

describe('镜头星芒贴图', () => {
  it('中心最亮', () => {
    expect(streak(0, 0)).toBeGreaterThan(streak(0.5, 0))
    expect(streak(0, 0)).toBeGreaterThan(streak(0, 0.5))
  })

  // 星芒必须是"一条线"而非"一个椭圆"：走到半幅宽时横向仍清晰可见，
  // 而纵向已基本归零（实测该处各向异性约 29 倍，且随距离继续增大）。
  it('横向衰减远慢于纵向', () => {
    expect(streak(0.5, 0)).toBeGreaterThan(0.15)
    expect(streak(0, 0.5)).toBeLessThan(0.01)
  })

  it('两端与上下边缘归零', () => {
    expect(streak(1, 0)).toBe(0)
    expect(streak(-1, 0)).toBe(0)
    expect(streak(0, 1)).toBeLessThan(0.001)
  })
})

describe('贴图资源', () => {
  it('按声明的尺寸生成 RGBA 数据，且 alpha 通道承载遮罩', () => {
    const texture = getNodeGlowTexture()
    const { width, height } = NODE_TEXTURE_SHAPES.glow

    expect(texture.image.width).toBe(width)
    expect(texture.image.height).toBe(height)
    expect(texture.image.data).toHaveLength(width * height * 4)

    // RGB 恒为白色，颜色交由 instanceColor 决定，因此同一张图可服务两种生态配色。
    const data = texture.image.data as Uint8Array
    const centerOffset = ((height / 2) * width + width / 2) * 4

    expect(data[centerOffset]).toBe(255)
    expect(data[centerOffset + 1]).toBe(255)
    expect(data[centerOffset + 2]).toBe(255)
    expect(data[centerOffset + 3]).toBe(255)
    // 角点应当完全透明
    expect(data[3]).toBe(0)
  })

  it('星芒贴图为横向长条', () => {
    const { width, height } = NODE_TEXTURE_SHAPES.streak

    expect(width).toBeGreaterThan(height * 4)
    expect(getNodeStreakTexture().image.width).toBe(width)
  })

  it('复用同一实例，避免场景重挂载时重复上传', () => {
    expect(getNodeGlowTexture()).toBe(getNodeGlowTexture())
    expect(getNodeStreakTexture()).toBe(getNodeStreakTexture())
    expect(getNodeGlowTexture()).not.toBe(getNodeStreakTexture())
  })
})
