import type { EnhancedSceneQuality } from '../scene/scene-primitives'

import { CONSTELLATION_STAR_COUNTS } from './constellation-model'

// 深空的纵深感来自「不同深度以不同速率移动」，而不是整体旋转。
//
// 原实现把所有星点放进同一个 group，既做刚性 rotation.z、又让指针视差作用在
// 同一层上——所有深度的星点视差完全同步，这正是它读起来像"一块平板在转"的
// 直接原因。此处拆成三层，各自的漂移速率与指针视差系数不同：近层跟手、远层
// 近乎不动。

export type StarLayerId = 'far' | 'mid' | 'near'

export type StarLayerConfig = Readonly<{
  id: StarLayerId
  /** 点尺寸（世界单位，配合 sizeAttenuation） */
  size: number
  /** 基础透明度，实际还会乘以逐星闪烁系数 */
  opacity: number
  /** 漂移速率（世界单位/秒） */
  drift: number
  /** 指针视差系数 */
  parallax: number
  /** 该层占总星数的比例 */
  share: number
  /** 独立随机种子，避免三层出现相同图案 */
  seed: number
}>

// 透明度需与片元着色器里的圆形衰减、以及闪烁系数一并考虑：三者相乘才是
// 实际亮度。原设计表给的 0.30 / 0.60 / 0.90 在叠加这两项后整片星场过暗，
// 故整体上调。
export const STAR_LAYERS = [
  { id: 'far', size: 0.022, opacity: 0.45, drift: 0.006, parallax: 0.25, share: 0.5, seed: 0xc0ffee },
  { id: 'mid', size: 0.030, opacity: 0.72, drift: 0.02, parallax: 0.6, share: 0.32, seed: 0x7fb0ff },
  { id: 'near', size: 0.042, opacity: 0.95, drift: 0.044, parallax: 1, share: 0.18, seed: 0xe7a94b },
] as const satisfies readonly StarLayerConfig[]

// 星点分布范围，与相机视野匹配；顶点着色器按此做 mod 环绕。
export const STARFIELD_BOUNDS = { x: 10.4, y: 6.4 } as const

// 闪烁频率区间（弧度/秒）。下限不取 0，否则会出现完全不闪的"死星"。
const TWINKLE_RATE_MIN = 0.35
const TWINKLE_RATE_MAX = 1.9

function nextSeed(seed: number) {
  return (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0
}

export type StarLayerAttributes = Readonly<{
  positions: Float32Array
  phases: Float32Array
  rates: Float32Array
}>

// 确定性生成：同一 count/seed 必然得到同一结果，避免每次挂载图案跳变。
export function createStarLayerAttributes(count: number, seed: number): StarLayerAttributes {
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const rates = new Float32Array(count)
  let state = seed >>> 0

  const random = () => {
    state = nextSeed(state)

    return state / 0x1_0000_0000
  }

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3

    positions[offset] = (random() - 0.5) * STARFIELD_BOUNDS.x
    positions[offset + 1] = (random() - 0.5) * STARFIELD_BOUNDS.y
    positions[offset + 2] = random() * 3 - 2.45
    phases[index] = random() * Math.PI * 2
    rates[index] = TWINKLE_RATE_MIN + random() * (TWINKLE_RATE_MAX - TWINKLE_RATE_MIN)
  }

  return { positions, phases, rates }
}

export type ResolvedStarLayer = StarLayerConfig & {
  count: number
  attributes: StarLayerAttributes
}

// low 档只保留最近的一层：分层视差是"刚体旋转"的解药，但低端设备优先保帧率。
export function getStarLayersForQuality(quality: EnhancedSceneQuality): readonly ResolvedStarLayer[] {
  const total = CONSTELLATION_STAR_COUNTS[quality]
  const layers: readonly StarLayerConfig[] = quality === 'low' ? [STAR_LAYERS[2]] : STAR_LAYERS
  const shareSum = layers.reduce<number>((sum, layer) => sum + layer.share, 0)

  return layers.map((layer) => {
    const count = Math.max(1, Math.round((total * layer.share) / shareSum))

    return {
      ...layer,
      count,
      attributes: createStarLayerAttributes(count, layer.seed),
    }
  })
}

// 漂移与闪烁全部在顶点着色器完成：mod 环绕使星点一侧移出、另一侧移入，
// 无缝且零逐帧 CPU 开销；逐星 aPhase/aRate 让闪烁互不同步。
export const STAR_LAYER_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uDrift;
  uniform float uParallax;
  uniform float uSize;
  uniform float uScale;
  uniform vec2 uBounds;

  attribute float aPhase;
  attribute float aRate;

  varying float vTwinkle;

  void main() {
    vec3 transformed = position;

    // 主漂移沿 X，Y 方向给一个不成比例的小分量，避免看出规则的直线运动
    transformed.x += uTime * uDrift;
    transformed.y += uTime * uDrift * 0.36;

    // 指针视差：系数逐层不同，纵深感由此产生
    transformed.xy += uPointer * uParallax;

    // 环绕：把坐标折回 [-half, half]
    vec2 halfBounds = uBounds * 0.5;
    transformed.x = mod(transformed.x + halfBounds.x, uBounds.x) - halfBounds.x;
    transformed.y = mod(transformed.y + halfBounds.y, uBounds.y) - halfBounds.y;

    vTwinkle = 0.62 + 0.38 * sin(uTime * aRate + aPhase);

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);

    gl_Position = projectionMatrix * mvPosition;
    // 等价于 three 的 sizeAttenuation
    gl_PointSize = uSize * (uScale / -mvPosition.z);
  }
`

export const STAR_LAYER_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vTwinkle;

  void main() {
    // 圆形点：不加遮罩的话 gl_PointCoord 是方形，星点会变成小方块。
    // 注意这里要的是「实心圆 + 抗锯齿边缘」，而不是从中心就开始衰减——
    // 星点只有两三个像素，若用 smoothstep(0.25, 0.0, d) 会只剩中心一个亮点，
    // 叠加逐层透明度与闪烁后整片星场会暗到几乎看不见。
    vec2 offset = gl_PointCoord - 0.5;
    float falloff = 1.0 - smoothstep(0.16, 0.25, dot(offset, offset));

    gl_FragColor = vec4(uColor, uOpacity * vTwinkle * falloff);
  }
`
