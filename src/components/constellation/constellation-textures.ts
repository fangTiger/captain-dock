import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  RGBAFormat,
  UnsignedByteType,
} from 'three'

// 节点精灵贴图在运行时生成，不占网络体积（见 2026-07-30 首页星场重设计 5.1）。
//
// 两张贴图都是白色 RGB + 计算出的 alpha 遮罩，颜色由材质的 instanceColor 着色，
// 因此同一张图可同时服务 arc 冷蓝与 rialo 琥珀两种节点。

const GLOW_SIZE = 64
const STREAK_WIDTH = 256
const STREAK_HEIGHT = 32
const NEBULA_SIZE = 128

function createMaskTexture(
  width: number,
  height: number,
  alphaAt: (u: number, v: number) => number,
) {
  const data = new Uint8Array(width * height * 4)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      // 映射到以中心为原点的 [-1, 1] 区间，+0.5 取像素中心避免半像素偏移
      const u = ((x + 0.5) / width) * 2 - 1
      const v = ((y + 0.5) / height) * 2 - 1
      const alpha = Math.max(0, Math.min(1, alphaAt(u, v)))

      data[offset] = 255
      data[offset + 1] = 255
      data[offset + 2] = 255
      data[offset + 3] = Math.round(alpha * 255)
    }
  }

  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType)

  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.needsUpdate = true

  return texture
}

// 径向衰减辉光：陡峭的 (1 − r)^5 主体负责"边缘完全融进背景"，
// 叠加一个很紧的高斯核提供热白色星核。
// 该曲线对齐用户选定方案 C 的示意（r=0.17 时约 0.4、r=0.34 时约 0.13、r>0.7 归零）。
function glowAlpha(u: number, v: number) {
  const r = Math.hypot(u, v)

  if (r >= 1) {
    return 0
  }

  const halo = Math.pow(1 - r, 5)
  const core = Math.exp(-(r * r) / (2 * 0.035 * 0.035))

  return halo + 0.85 * core
}

// 镜头星芒：横向长、纵向极窄的一道光条。
// 横向用 (1 − |u|)^2.2 收敛到两端，纵向用窄高斯保证是"一条线"而非"一个椭圆"。
function streakAlpha(u: number, v: number) {
  const horizontal = Math.pow(Math.max(0, 1 - Math.abs(u)), 2.2)
  const vertical = Math.exp(-(v * v) / (2 * 0.16 * 0.16))

  return horizontal * vertical
}

// 星云：比节点辉光柔和得多的大范围衰减。指数取 2.5 让中心也不出现硬核，
// 整体只作为极淡的氛围底噪，实际透明度由材质 opacity 压到 0.06~0.09。
function nebulaAlpha(u: number, v: number) {
  const r = Math.hypot(u, v)

  if (r >= 1) {
    return 0
  }

  return Math.pow(1 - r, 2.5)
}

let glowTexture: DataTexture | null = null
let streakTexture: DataTexture | null = null
let nebulaTexture: DataTexture | null = null

// 惰性单例：贴图与场景实例无关，避免场景重挂载时反复生成与上传。
export function getNodeGlowTexture() {
  glowTexture ??= createMaskTexture(GLOW_SIZE, GLOW_SIZE, glowAlpha)

  return glowTexture
}

export function getNodeStreakTexture() {
  streakTexture ??= createMaskTexture(STREAK_WIDTH, STREAK_HEIGHT, streakAlpha)

  return streakTexture
}

export function getNebulaTexture() {
  nebulaTexture ??= createMaskTexture(NEBULA_SIZE, NEBULA_SIZE, nebulaAlpha)

  return nebulaTexture
}

// 仅供测试使用，避免用例之间互相污染单例。
export function resetNodeTexturesForTest() {
  glowTexture?.dispose()
  streakTexture?.dispose()
  nebulaTexture?.dispose()
  glowTexture = null
  streakTexture = null
  nebulaTexture = null
}

export const NODE_TEXTURE_SHAPES = {
  glow: { width: GLOW_SIZE, height: GLOW_SIZE },
  streak: { width: STREAK_WIDTH, height: STREAK_HEIGHT },
  nebula: { width: NEBULA_SIZE, height: NEBULA_SIZE },
} as const

export const nodeTextureAlphaForTest = {
  glow: glowAlpha,
  streak: streakAlpha,
  nebula: nebulaAlpha,
} as const
