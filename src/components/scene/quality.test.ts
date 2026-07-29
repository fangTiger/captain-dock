import {
  createRuntimeQualityState,
  degradeQuality,
  sampleRuntimeQuality,
  selectQuality,
  type CapabilityInput,
  type SceneQuality,
} from './quality'

const capableDesktop: CapabilityInput = {
  width: 1440,
  reducedMotion: false,
  saveData: false,
  webgl2: true,
  userPreference: 'auto',
}

function input(overrides: Partial<CapabilityInput>): CapabilityInput {
  return {
    ...capableDesktop,
    ...overrides,
  }
}

function sampleSequence(initialQuality: SceneQuality, fpsWindows: readonly number[]) {
  return fpsWindows.reduce(
    (state, fps) => sampleRuntimeQuality(state, fps),
    createRuntimeQualityState(initialQuality),
  )
}

describe('selectQuality', () => {
  it('fails safe to static when motion, data, WebGL2, or width cannot support enhancement', () => {
    expect(selectQuality(input({ reducedMotion: true }))).toBe('static')
    expect(selectQuality(input({ saveData: true }))).toBe('static')
    expect(selectQuality(input({ webgl2: false }))).toBe('static')
    expect(selectQuality(input({ width: 0 }))).toBe('static')
    expect(selectQuality(input({ width: -1 }))).toBe('static')
    expect(selectQuality(input({ width: Number.NaN }))).toBe('static')
    expect(selectQuality(input({ width: Number.POSITIVE_INFINITY }))).toBe('static')
  })

  it('selects high for desktop width and medium for mobile or small width', () => {
    expect(selectQuality(input({ width: 1440 }))).toBe('high')
    expect(selectQuality(input({ width: 1024 }))).toBe('high')
    expect(selectQuality(input({ width: 375 }))).toBe('medium')
    expect(selectQuality(input({ width: 768 }))).toBe('medium')
  })

  it('treats user preference as a safety cap without bypassing hard static gates', () => {
    expect(selectQuality(input({ width: 1440, userPreference: 'static' }))).toBe('static')
    expect(selectQuality(input({ width: 1440, userPreference: 'low' }))).toBe('low')
    expect(selectQuality(input({ width: 1440, userPreference: 'medium' }))).toBe('medium')
    expect(selectQuality(input({ width: 1440, userPreference: 'high' }))).toBe('high')
    expect(selectQuality(input({ width: 375, userPreference: 'high' }))).toBe('medium')
    expect(selectQuality(input({ width: 375, userPreference: 'low' }))).toBe('low')
    expect(selectQuality(input({ reducedMotion: true, userPreference: 'high' }))).toBe('static')
    expect(selectQuality(input({ saveData: true, userPreference: 'high' }))).toBe('static')
    expect(selectQuality(input({ webgl2: false, userPreference: 'high' }))).toBe('static')
  })
})

describe('degradeQuality', () => {
  it('degrades one step at a time and leaves static unchanged', () => {
    expect(degradeQuality('high')).toBe('medium')
    expect(degradeQuality('medium')).toBe('low')
    expect(degradeQuality('low')).toBe('static')
    expect(degradeQuality('static')).toBe('static')
  })
})

describe('sampleRuntimeQuality', () => {
  it('requires two consecutive low FPS windows below 24 before high or medium degrades once', () => {
    expect(sampleSequence('high', [23]).quality).toBe('high')
    expect(sampleSequence('high', [23, 23]).quality).toBe('medium')
    expect(sampleSequence('medium', [23]).quality).toBe('medium')
    expect(sampleSequence('medium', [23, 23]).quality).toBe('low')
  })

  it('resets the low-performance counter when a stable window occurs between low FPS windows', () => {
    const state = sampleSequence('high', [23, 30, 23])

    expect(state.quality).toBe('high')
    expect(state.consecutiveLowFpsWindows).toBe(1)
  })

  it('uses a stricter threshold before low enters static', () => {
    expect(sampleSequence('low', [17]).quality).toBe('low')
    expect(sampleSequence('low', [17, 17]).quality).toBe('static')
    expect(sampleSequence('low', [19, 19, 19]).quality).toBe('low')
  })

  it('never auto-upgrades after later high FPS windows and never degrades by more than one step per sample', () => {
    const degradedOnce = sampleSequence('high', [10, 10])
    const afterRecovery = [120, 120, 120].reduce(
      (state, fps) => sampleRuntimeQuality(state, fps),
      degradedOnce,
    )
    const oneSampleOnly = sampleRuntimeQuality(createRuntimeQualityState('high'), 0)

    expect(degradedOnce.quality).toBe('medium')
    expect(afterRecovery.quality).toBe('medium')
    expect(afterRecovery.consecutiveLowFpsWindows).toBe(0)
    expect(oneSampleOnly.quality).toBe('high')
    expect(oneSampleOnly.consecutiveLowFpsWindows).toBe(1)
  })

  it('treats non-finite and negative FPS as low performance rather than an upgrade signal', () => {
    expect(sampleSequence('medium', [Number.NaN, Number.POSITIVE_INFINITY]).quality).toBe('low')
    expect(sampleSequence('medium', [-1, -1]).quality).toBe('low')
  })

  it('keeps static idempotent during runtime sampling', () => {
    const state = sampleSequence('static', [0, 0, 120])

    expect(state.quality).toBe('static')
    expect(state.consecutiveLowFpsWindows).toBe(0)
  })
})
