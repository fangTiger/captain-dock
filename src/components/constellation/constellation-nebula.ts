import type { EnhancedSceneQuality } from '../scene/scene-primitives'

// 星云尘埃层：极淡的大范围氛围底噪，负责把星点与节点之间的空隙填出"厚度"，
// 避免整片背景是纯黑加零散亮点。
//
// 只在 high 档启用。medium 关闭并非因为它贵在填充率，而是 draw call 余量：
// medium 的转场峰值上限只有 18，保三层视差比保星云重要——视差是"刚体旋转"
// 问题的解药，星云只是氛围点缀。

export type NebulaCloud = Readonly<{
  /** 静止位置；z 压后，使其位于星点与节点之后 */
  position: readonly [number, number, number]
  /** 平面尺寸（世界单位） */
  scale: readonly [number, number]
  color: string
  /** 利萨如路径的两轴频率（弧度/秒），取无理数比避免路径闭合成规则图形 */
  frequency: readonly [number, number]
  /** 两轴摆幅（世界单位） */
  amplitude: readonly [number, number]
  /** 初相，使各云团彼此错开 */
  phase: number
}>

export const NEBULA_CLOUDS = [
  {
    position: [-2.6, 0.7, -1.6],
    scale: [7.2, 5.4],
    color: '#3f7fc4',
    frequency: [0.031, 0.023],
    amplitude: [0.42, 0.28],
    phase: 0,
  },
  {
    position: [1.9, -0.9, -1.8],
    scale: [6.4, 4.8],
    color: '#2f6d9e',
    frequency: [0.019, 0.027],
    amplitude: [0.36, 0.34],
    phase: 2.1,
  },
  // 一点琥珀，呼应 globals.css 中页面右上角本来就有的暖色径向渐变。
  {
    position: [3.4, 1.4, -2],
    scale: [5.2, 3.9],
    color: '#8a6a35',
    frequency: [0.024, 0.017],
    amplitude: [0.3, 0.22],
    phase: 4.3,
  },
] as const satisfies readonly NebulaCloud[]

export const NEBULA_OPACITY = 0.085

// 利萨如漂移：两轴以不同频率做正弦摆动，路径不闭合、不复位，
// 因此永远不会出现"跳回起点"的突变。纯函数，便于测试。
export function getNebulaOffset(cloud: NebulaCloud, time: number): readonly [number, number] {
  return [
    Math.sin(time * cloud.frequency[0] + cloud.phase) * cloud.amplitude[0],
    Math.cos(time * cloud.frequency[1] + cloud.phase) * cloud.amplitude[1],
  ]
}

export function getNebulaCloudsForQuality(
  quality: EnhancedSceneQuality,
): readonly NebulaCloud[] {
  return quality === 'high' ? NEBULA_CLOUDS : []
}
