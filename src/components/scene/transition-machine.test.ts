import {
  CINEMATIC_HANDOFF_DEPART_MS,
  CINEMATIC_HANDOFF_TOTAL_MS,
  SCENE_TRANSITION_ARRIVE_MS,
  SCENE_TRANSITION_DEPART_MS,
  SCENE_TRANSITION_TOTAL_MAX_MS,
  createSceneTransitionState,
  reduceSceneTransition,
} from './transition-machine'

describe('scene transition timing budget', () => {
  it('keeps depart, arrive, and total budgets under the approved navigation limits', () => {
    expect(SCENE_TRANSITION_DEPART_MS).toBeLessThanOrEqual(180)
    expect(SCENE_TRANSITION_ARRIVE_MS).toBeGreaterThanOrEqual(360)
    expect(SCENE_TRANSITION_ARRIVE_MS).toBeLessThanOrEqual(420)
    expect(SCENE_TRANSITION_DEPART_MS + SCENE_TRANSITION_ARRIVE_MS).toBeLessThanOrEqual(
      SCENE_TRANSITION_TOTAL_MAX_MS,
    )
    expect(CINEMATIC_HANDOFF_DEPART_MS).toBeLessThanOrEqual(120)
    expect(
      CINEMATIC_HANDOFF_DEPART_MS +
        SCENE_TRANSITION_DEPART_MS +
        SCENE_TRANSITION_ARRIVE_MS,
    ).toBeLessThanOrEqual(SCENE_TRANSITION_TOTAL_MAX_MS)
    expect(SCENE_TRANSITION_TOTAL_MAX_MS).toBeLessThanOrEqual(700)
  })

  it('reserves at least 100ms of scheduler headroom inside the public route budget', () => {
    expect(CINEMATIC_HANDOFF_TOTAL_MS).toBe(600)
    expect(CINEMATIC_HANDOFF_TOTAL_MS).toBeGreaterThanOrEqual(500)
    expect(SCENE_TRANSITION_TOTAL_MAX_MS - CINEMATIC_HANDOFF_TOTAL_MS).toBeGreaterThanOrEqual(100)
  })
})

describe('reduceSceneTransition', () => {
  it('runs the normal scene change sequence from idle to departing, swapping, arriving, and idle', () => {
    const initial = createSceneTransitionState('home')
    const departing = reduceSceneTransition(initial, { type: 'navigate', scene: 'arc' })
    const swapping = reduceSceneTransition(departing, {
      type: 'departed',
      token: departing.token,
    })
    const arriving = reduceSceneTransition(swapping, {
      type: 'swapped',
      token: swapping.token,
    })
    const idle = reduceSceneTransition(arriving, {
      type: 'arrived',
      token: arriving.token,
    })

    expect(departing).toMatchObject({
      phase: 'departing',
      scene: 'home',
      previousScene: 'home',
      targetScene: 'arc',
      token: 1,
    })
    expect(swapping.phase).toBe('swapping')
    expect(swapping.scene).toBe('home')
    expect(arriving).toMatchObject({
      phase: 'arriving',
      scene: 'arc',
      previousScene: 'home',
      targetScene: 'arc',
      token: 1,
    })
    expect(idle).toEqual({
      phase: 'idle',
      scene: 'arc',
      previousScene: null,
      targetScene: 'arc',
      token: 1,
    })
  })

  it('issues a monotonic token for rapid second navigation and ignores old completion events unchanged', () => {
    const initial = createSceneTransitionState('home')
    const first = reduceSceneTransition(initial, { type: 'navigate', scene: 'arc' })
    const second = reduceSceneTransition(first, { type: 'navigate', scene: 'rialo' })
    const ignoredOldDepart = reduceSceneTransition(second, {
      type: 'departed',
      token: first.token,
    })
    const ignoredOldArrival = reduceSceneTransition(second, {
      type: 'arrived',
      token: first.token,
    })

    expect(first.token).toBe(1)
    expect(second).toMatchObject({
      phase: 'departing',
      scene: 'home',
      targetScene: 'rialo',
      token: 2,
    })
    expect(ignoredOldDepart).toBe(second)
    expect(ignoredOldArrival).toBe(second)
  })

  it('resolves reduced-motion navigation directly to the new idle scene while invalidating old tokens', () => {
    const initial = createSceneTransitionState('home')
    const first = reduceSceneTransition(initial, { type: 'navigate', scene: 'arc' })
    const reduced = reduceSceneTransition(first, {
      type: 'navigate',
      scene: 'rialo',
      reducedMotion: true,
    })
    const ignoredOldCompletion = reduceSceneTransition(reduced, {
      type: 'departed',
      token: first.token,
    })

    expect(reduced).toEqual({
      phase: 'idle',
      scene: 'rialo',
      previousScene: null,
      targetScene: 'rialo',
      token: 2,
    })
    expect(ignoredOldCompletion).toBe(reduced)
  })

  it('does not restart animation for same-scene navigation or duplicate target navigation', () => {
    const idle = createSceneTransitionState('arc')
    const sameIdle = reduceSceneTransition(idle, { type: 'navigate', scene: 'arc' })
    const departing = reduceSceneTransition(createSceneTransitionState('home'), {
      type: 'navigate',
      scene: 'arc',
    })
    const duplicateTarget = reduceSceneTransition(departing, { type: 'navigate', scene: 'arc' })

    expect(sameIdle).toBe(idle)
    expect(duplicateTarget).toBe(departing)
  })

  it('cancels an in-flight target immediately when navigation returns to the currently rendered scene', () => {
    const initial = createSceneTransitionState('home')
    const toArc = reduceSceneTransition(initial, { type: 'navigate', scene: 'arc' })
    const backHome = reduceSceneTransition(toArc, {
      type: 'navigate',
      scene: 'home',
      navigationType: 'history',
    })
    const oldDeparted = reduceSceneTransition(backHome, {
      type: 'departed',
      token: toArc.token,
    })
    const oldSwapped = reduceSceneTransition(backHome, {
      type: 'swapped',
      token: toArc.token,
    })
    const oldArrived = reduceSceneTransition(backHome, {
      type: 'arrived',
      token: toArc.token,
    })
    const newDeparted = reduceSceneTransition(backHome, {
      type: 'departed',
      token: backHome.token,
    })
    const newSwapped = reduceSceneTransition(backHome, {
      type: 'swapped',
      token: backHome.token,
    })
    const newArrived = reduceSceneTransition(backHome, {
      type: 'arrived',
      token: backHome.token,
    })

    expect(backHome).toEqual({
      phase: 'idle',
      scene: 'home',
      previousScene: null,
      targetScene: 'home',
      token: 2,
    })
    expect(oldDeparted).toBe(backHome)
    expect(oldSwapped).toBe(backHome)
    expect(oldArrived).toBe(backHome)
    expect(newDeparted).toBe(backHome)
    expect(newSwapped).toBe(backHome)
    expect(newArrived).toBe(backHome)
  })

  it('treats back and forward as ordinary scene input without browser-specific side effects', () => {
    const initial = createSceneTransitionState('rialo')
    const backNavigation = reduceSceneTransition(initial, {
      type: 'navigate',
      scene: 'arc',
      navigationType: 'history',
    })

    expect(backNavigation).toMatchObject({
      phase: 'departing',
      scene: 'rialo',
      targetScene: 'arc',
      token: 1,
    })
  })
})
