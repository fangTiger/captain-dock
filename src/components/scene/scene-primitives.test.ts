import {
  createArcPoints,
  createEllipsePoints,
  createInstanceMatrices,
  estimateSceneBudget,
  getScenePrimitiveProfile,
} from './scene-primitives'
import type { ImmersiveSceneId } from './scene-types'

const scenes: readonly ImmersiveSceneId[] = ['home', 'arc', 'rialo']

describe('scene primitive profiles', () => {
  it('locks sample and instance counts by quality', () => {
    expect(getScenePrimitiveProfile('high')).toMatchObject({
      curveSamples: 96,
      radarSamples: 72,
      pointInstances: 96,
      tickInstances: 64,
    })
    expect(getScenePrimitiveProfile('medium')).toMatchObject({
      curveSamples: 64,
      radarSamples: 48,
      pointInstances: 48,
      tickInstances: 40,
    })
    expect(getScenePrimitiveProfile('low')).toMatchObject({
      curveSamples: 32,
      radarSamples: 24,
      pointInstances: 0,
      tickInstances: 20,
    })
  })

  it('keeps conservative draw call and triangle estimates below Task 8B targets', () => {
    for (const scene of scenes) {
      expect(estimateSceneBudget(scene, 'high')).toEqual(
        expect.objectContaining({
          maxDrawCalls: expect.any(Number),
          maxTriangles: expect.any(Number),
        }),
      )
      expect(estimateSceneBudget(scene, 'high').maxDrawCalls).toBeLessThanOrEqual(24)
      expect(estimateSceneBudget(scene, 'high').maxTriangles).toBeLessThanOrEqual(5000)
      expect(estimateSceneBudget(scene, 'medium').maxDrawCalls).toBeLessThanOrEqual(18)
      expect(estimateSceneBudget(scene, 'medium').maxTriangles).toBeLessThanOrEqual(3000)
      expect(estimateSceneBudget(scene, 'low').maxDrawCalls).toBeLessThanOrEqual(8)
      expect(estimateSceneBudget(scene, 'low').maxTriangles).toBeLessThanOrEqual(1000)
    }
  })

  it('creates closed ellipse and open arc vertices with deterministic endpoints', () => {
    const ellipse = createEllipsePoints({
      radiusX: 2,
      radiusY: 1,
      samples: 4,
      closed: true,
    })
    const arc = createArcPoints({
      radiusX: 4,
      radiusY: 2,
      startAngle: 0,
      endAngle: Math.PI / 2,
      samples: 2,
      z: -1,
    })

    expect(Array.from(ellipse)).toHaveLength(15)
    expect(Array.from(ellipse.slice(0, 3))).toEqual([2, 0, 0])
    expect(Array.from(ellipse.slice(-3))).toEqual([2, 0, 0])
    expect(Array.from(arc)).toHaveLength(9)
    expect(Array.from(arc.slice(0, 3))).toEqual([4, 0, -1])
    expect(arc[6]).toBeCloseTo(0)
    expect(arc[7]).toBeCloseTo(2)
    expect(arc[8]).toBe(-1)
  })

  it('creates open ellipse vertices without repeating the first endpoint', () => {
    const ellipse = createEllipsePoints({
      radiusX: 2,
      radiusY: 1,
      samples: 4,
      z: 0.5,
    })

    expect(Array.from(ellipse)).toHaveLength(12)
    expect(Array.from(ellipse.slice(0, 3))).toEqual([2, 0, 0.5])
    expect(ellipse[9]).toBeCloseTo(0)
    expect(ellipse[10]).toBeCloseTo(-1)
    expect(ellipse[11]).toBe(0.5)
    expect(Array.from(ellipse.slice(-3))).not.toEqual(Array.from(ellipse.slice(0, 3)))
  })

  it('creates column-major instance matrices with translation and scale slots locked', () => {
    const matrices = createInstanceMatrices([
      {
        position: [1, 2, 3],
        rotationZ: 0,
        scale: [2, 3, 4],
      },
      {
        position: [-4, -5, -6],
        rotationZ: Math.PI / 2,
        scale: [1, 1, 1],
      },
    ])

    expect(Array.from(matrices)).toHaveLength(32)
    expect(Array.from(matrices.slice(0, 16))).toEqual([
      2, 0, 0, 0,
      0, 3, 0, 0,
      0, 0, 4, 0,
      1, 2, 3, 1,
    ])
    expect(matrices[28]).toBe(-4)
    expect(matrices[29]).toBe(-5)
    expect(matrices[30]).toBe(-6)
  })

  it('fails fast for invalid quality, scene, samples, radii, and placements', () => {
    expect(() => getScenePrimitiveProfile('static')).toThrow(/quality/i)
    expect(() => estimateSceneBudget('about' as ImmersiveSceneId, 'low')).toThrow(/scene/i)
    expect(() => createEllipsePoints({ radiusX: 1, radiusY: 1, samples: 2 })).toThrow(/samples/i)
    expect(() => createArcPoints({ radiusX: 0, radiusY: 1, samples: 8 })).toThrow(/radius/i)
    expect(() =>
      createInstanceMatrices([
        {
          position: [Number.NaN, 0, 0],
          rotationZ: 0,
          scale: [1, 1, 1],
        },
      ]),
    ).toThrow(/finite/i)
  })
})
