export type SceneQuality = 'high' | 'medium' | 'low' | 'static'
export type UserQualityPreference = 'auto' | SceneQuality

export type CapabilityInput = {
  width: number
  reducedMotion: boolean
  saveData: boolean
  webgl2: boolean
  userPreference?: UserQualityPreference
}

export type RuntimeQualityState = {
  quality: SceneQuality
  consecutiveLowFpsWindows: number
}

const qualityRank: Record<SceneQuality, number> = {
  static: 0,
  low: 1,
  medium: 2,
  high: 3,
}

export function compareQuality(left: SceneQuality, right: SceneQuality) {
  return qualityRank[left] - qualityRank[right]
}

export function clampQualityToCeiling(
  quality: SceneQuality,
  userPreference: UserQualityPreference = 'auto',
): SceneQuality {
  if (userPreference === 'auto' || userPreference === 'high') {
    return quality
  }

  if (userPreference === 'medium' || userPreference === 'low' || userPreference === 'static') {
    return compareQuality(quality, userPreference) > 0 ? userPreference : quality
  }

  return 'static'
}

export function selectQuality(input: CapabilityInput): SceneQuality {
  if (
    input.reducedMotion ||
    input.saveData ||
    !input.webgl2 ||
    !Number.isFinite(input.width) ||
    input.width <= 0
  ) {
    return 'static'
  }

  const baseQuality: SceneQuality = input.width >= 1024 ? 'high' : 'medium'

  return clampQualityToCeiling(baseQuality, input.userPreference)
}

export function degradeQuality(quality: SceneQuality): SceneQuality {
  switch (quality) {
    case 'high':
      return 'medium'
    case 'medium':
      return 'low'
    case 'low':
      return 'static'
    case 'static':
      return 'static'
  }
}

export function createRuntimeQualityState(quality: SceneQuality): RuntimeQualityState {
  return {
    quality,
    consecutiveLowFpsWindows: 0,
  }
}

export function sampleRuntimeQuality(state: RuntimeQualityState, fps: number): RuntimeQualityState {
  if (state.quality === 'static') {
    return createRuntimeQualityState('static')
  }

  const threshold = state.quality === 'low' ? 18 : 24
  const lowPerformance = !Number.isFinite(fps) || fps < threshold

  if (!lowPerformance) {
    return {
      quality: state.quality,
      consecutiveLowFpsWindows: 0,
    }
  }

  const consecutiveLowFpsWindows = state.consecutiveLowFpsWindows + 1

  if (consecutiveLowFpsWindows < 2) {
    return {
      quality: state.quality,
      consecutiveLowFpsWindows,
    }
  }

  return {
    quality: degradeQuality(state.quality),
    consecutiveLowFpsWindows: 0,
  }
}
