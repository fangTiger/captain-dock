import { act, cleanup, render } from '@testing-library/react'
import { createElement, useMemo } from 'react'
import { Group } from 'three'

import {
  SCENE_MORPH_DURATION_MS,
  SCENE_PREVIEW_MORPH_DURATION_MS,
  advanceFiniteSceneMorph,
  createFiniteSceneMorph,
  interpolateFiniteSceneValue,
  redirectFiniteSceneMorph,
  useFiniteSceneMorphGroup,
  type SpatialSceneMorphProfile,
} from './finite-scene-morph'

const neutralProfile: SpatialSceneMorphProfile = {
  impact: 0,
  positionX: 0,
  positionY: 0,
  rotationZ: 0,
  scaleX: 1,
  scaleY: 1,
}

const committedProfile: SpatialSceneMorphProfile = {
  impact: 0,
  positionX: 1,
  positionY: -0.5,
  rotationZ: 0.4,
  scaleX: 1.2,
  scaleY: 0.8,
}

type MorphGroupProbeProps = Readonly<{
  durationMs: number
  group: Group
  morphMode: 'commit' | 'preview'
  motionEnabled: boolean
  profile: SpatialSceneMorphProfile
  requestFrame: () => void
}>

function MorphGroupProbe({
  durationMs,
  group,
  morphMode,
  motionEnabled,
  profile,
  requestFrame,
}: MorphGroupProbeProps) {
  const groupRef = useMemo(() => ({ current: group }), [group])

  useFiniteSceneMorphGroup(groupRef, {
    durationMs,
    morphMode,
    motionEnabled,
    profile,
    quality: 'high',
    reducedMotion: false,
    requestFrame,
  })

  return null
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('finite scene morph interpolation', () => {
  it('samples the start, midpoint, and terminal value without overshoot', () => {
    expect(interpolateFiniteSceneValue(2, 10, 0)).toBe(2)
    expect(interpolateFiniteSceneValue(2, 10, 0.5)).toBe(6)
    expect(interpolateFiniteSceneValue(2, 10, 1)).toBe(10)
    expect(interpolateFiniteSceneValue(2, 10, 2)).toBe(10)
  })

  it('uses the approved finite 650–900ms timing window', () => {
    expect(SCENE_MORPH_DURATION_MS).toBeGreaterThanOrEqual(650)
    expect(SCENE_MORPH_DURATION_MS).toBeLessThanOrEqual(900)
    expect(SCENE_PREVIEW_MORPH_DURATION_MS).toBeGreaterThanOrEqual(180)
    expect(SCENE_PREVIEW_MORPH_DURATION_MS).toBeLessThanOrEqual(260)
  })
})

describe('finite scene morph lifecycle', () => {
  it('finishes at the exact target and stops requesting frames', () => {
    const initial = createFiniteSceneMorph(0)
    const redirected = redirectFiniteSceneMorph(initial, {
      target: 1,
      token: 1,
    })
    const midpoint = advanceFiniteSceneMorph(redirected, SCENE_MORPH_DURATION_MS / 2)
    const terminal = advanceFiniteSceneMorph(
      midpoint.state,
      SCENE_MORPH_DURATION_MS / 2,
    )
    const afterTerminal = advanceFiniteSceneMorph(terminal.state, 120)

    expect(midpoint.state.current).toBeCloseTo(0.5)
    expect(midpoint.requestFrame).toBe(true)
    expect(terminal.state).toMatchObject({
      current: 1,
      status: 'complete',
      target: 1,
      token: 1,
    })
    expect(terminal.requestFrame).toBe(false)
    expect(afterTerminal.state).toBe(terminal.state)
    expect(afterTerminal.requestFrame).toBe(false)
  })

  it('redirects a newer token from the current visual value and ignores stale tokens', () => {
    const running = redirectFiniteSceneMorph(createFiniteSceneMorph(0), {
      target: 1,
      token: 4,
    })
    const visible = advanceFiniteSceneMorph(running, SCENE_MORPH_DURATION_MS / 4).state
    const stale = redirectFiniteSceneMorph(visible, {
      target: 0.8,
      token: 3,
    })
    const redirected = redirectFiniteSceneMorph(visible, {
      target: -1,
      token: 5,
    })

    expect(stale).toBe(visible)
    expect(redirected).toMatchObject({
      current: visible.current,
      from: visible.current,
      status: 'running',
      target: -1,
      token: 5,
    })
  })

  it.each(['low', 'reduced', 'static'] as const)(
    'resolves %s mode directly to the terminal state',
    (mode) => {
      const terminal = redirectFiniteSceneMorph(createFiniteSceneMorph(0.25), {
        mode,
        target: 1,
        token: 1,
      })

      expect(terminal).toMatchObject({
        current: 1,
        status: 'complete',
        target: 1,
      })
      expect(advanceFiniteSceneMorph(terminal, 16).requestFrame).toBe(false)
    },
  )

  it('resolves a hidden morph to its exact terminal value without requesting another frame', () => {
    const running = redirectFiniteSceneMorph(createFiniteSceneMorph(0), {
      target: 1,
      token: 1,
    })
    const terminal = advanceFiniteSceneMorph(running, 16, {
      disposed: false,
      visible: false,
    })

    expect(terminal.state).toMatchObject({
      current: 1,
      status: 'complete',
      target: 1,
    })
    expect(terminal.requestFrame).toBe(false)
  })

  it('stops immediately when disposed', () => {
    const running = redirectFiniteSceneMorph(createFiniteSceneMorph(0), {
      target: 1,
      token: 1,
    })
    const stopped = advanceFiniteSceneMorph(running, 16, {
      disposed: true,
      visible: true,
    })

    expect(stopped.state.status).toBe('stopped')
    expect(stopped.requestFrame).toBe(false)
  })
})

describe('finite scene morph group endpoints', () => {
  it('keeps a real spatial remainder from a completed preview into the committed 780ms morph', () => {
    vi.useFakeTimers()
    const group = new Group()
    const requestFrame = vi.fn()
    const { rerender } = render(
      createElement(MorphGroupProbe, {
        durationMs: SCENE_MORPH_DURATION_MS,
        group,
        morphMode: 'commit',
        motionEnabled: true,
        profile: neutralProfile,
        requestFrame,
      }),
    )

    rerender(
      createElement(MorphGroupProbe, {
        durationMs: SCENE_PREVIEW_MORPH_DURATION_MS,
        group,
        morphMode: 'preview',
        motionEnabled: true,
        profile: committedProfile,
        requestFrame,
      }),
    )
    act(() => {
      vi.advanceTimersByTime(SCENE_PREVIEW_MORPH_DURATION_MS + 32)
    })

    const previewEndpoint = group.position.x

    expect(previewEndpoint).toBeGreaterThan(0)
    expect(previewEndpoint).toBeLessThan(committedProfile.positionX)

    rerender(
      createElement(MorphGroupProbe, {
        durationMs: SCENE_MORPH_DURATION_MS,
        group,
        morphMode: 'commit',
        motionEnabled: true,
        profile: committedProfile,
        requestFrame,
      }),
    )
    act(() => {
      vi.advanceTimersByTime(160)
    })

    expect(group.position.x).toBeGreaterThan(previewEndpoint)
    expect(group.position.x).toBeLessThan(committedProfile.positionX)

    act(() => {
      vi.advanceTimersByTime(SCENE_MORPH_DURATION_MS)
    })

    expect(group.position.x).toBeCloseTo(committedProfile.positionX)
    expect(group.position.y).toBeCloseTo(committedProfile.positionY)
    expect(group.rotation.z).toBeCloseTo(committedProfile.rotationZ)
    expect(group.scale.x).toBeCloseTo(committedProfile.scaleX)
    expect(group.scale.y).toBeCloseTo(committedProfile.scaleY)
  })

  it('applies the exact active profile when hidden and does not resume an intermediate group', () => {
    vi.useFakeTimers()
    const group = new Group()
    const requestFrame = vi.fn()
    const { rerender } = render(
      createElement(MorphGroupProbe, {
        durationMs: SCENE_MORPH_DURATION_MS,
        group,
        morphMode: 'commit',
        motionEnabled: true,
        profile: neutralProfile,
        requestFrame,
      }),
    )

    rerender(
      createElement(MorphGroupProbe, {
        durationMs: SCENE_MORPH_DURATION_MS,
        group,
        morphMode: 'commit',
        motionEnabled: true,
        profile: committedProfile,
        requestFrame,
      }),
    )
    act(() => {
      vi.advanceTimersByTime(180)
    })
    expect(group.position.x).toBeGreaterThan(0)
    expect(group.position.x).toBeLessThan(committedProfile.positionX)

    rerender(
      createElement(MorphGroupProbe, {
        durationMs: SCENE_MORPH_DURATION_MS,
        group,
        morphMode: 'commit',
        motionEnabled: false,
        profile: committedProfile,
        requestFrame,
      }),
    )

    expect(group.position.x).toBeCloseTo(committedProfile.positionX)
    expect(group.position.y).toBeCloseTo(committedProfile.positionY)
    expect(group.rotation.z).toBeCloseTo(committedProfile.rotationZ)
    expect(group.scale.x).toBeCloseTo(committedProfile.scaleX)
    expect(group.scale.y).toBeCloseTo(committedProfile.scaleY)

    rerender(
      createElement(MorphGroupProbe, {
        durationMs: SCENE_MORPH_DURATION_MS,
        group,
        morphMode: 'commit',
        motionEnabled: true,
        profile: committedProfile,
        requestFrame,
      }),
    )
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(group.position.x).toBeCloseTo(committedProfile.positionX)
    expect(group.rotation.z).toBeCloseTo(committedProfile.rotationZ)
  })
})
