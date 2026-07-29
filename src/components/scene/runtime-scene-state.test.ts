import {
  acknowledgeRuntimeSceneFailure,
  createRuntimeSceneState,
  getRuntimeSceneFrameloop,
  reduceRuntimeSceneState,
} from './runtime-scene-state'

function readySettledState() {
  const booting = createRuntimeSceneState('enhanced')
  const ready = reduceRuntimeSceneState(booting, { type: 'first-frame' })

  return reduceRuntimeSceneState(ready, { type: 'scene-settled' })
}

describe('runtime scene lifecycle', () => {
  it('starts enhanced scenes in booting, cannot become ready before first frame, then settles to demand rendering', () => {
    const booting = createRuntimeSceneState('enhanced')
    const prematureSettled = reduceRuntimeSceneState(booting, { type: 'scene-settled' })
    const ready = reduceRuntimeSceneState(booting, { type: 'first-frame' })
    const settled = reduceRuntimeSceneState(ready, { type: 'scene-settled' })

    expect(booting.phase).toBe('booting')
    expect(booting.hasFirstFrame).toBe(false)
    expect(getRuntimeSceneFrameloop(booting)).toBe('always')
    expect(prematureSettled.phase).toBe('booting')
    expect(ready.phase).toBe('ready')
    expect(ready.hasFirstFrame).toBe(true)
    expect(getRuntimeSceneFrameloop(ready)).toBe('always')
    expect(settled.phase).toBe('ready')
    expect(settled.settled).toBe(true)
    expect(getRuntimeSceneFrameloop(settled)).toBe('demand')
  })

  it('pauses to never when document or host is hidden and restores only to the previous active phase', () => {
    const settled = readySettledState()
    const documentHidden = reduceRuntimeSceneState(settled, {
      type: 'document-visibility',
      visible: false,
    })
    const bothHidden = reduceRuntimeSceneState(documentHidden, {
      type: 'host-visibility',
      visible: false,
    })
    const documentVisibleAgain = reduceRuntimeSceneState(bothHidden, {
      type: 'document-visibility',
      visible: true,
    })
    const fullyVisibleAgain = reduceRuntimeSceneState(documentVisibleAgain, {
      type: 'host-visibility',
      visible: true,
    })

    expect(documentHidden.phase).toBe('paused')
    expect(documentHidden.activePhase).toBe('ready')
    expect(getRuntimeSceneFrameloop(documentHidden)).toBe('never')
    expect(documentVisibleAgain.phase).toBe('paused')
    expect(fullyVisibleAgain.phase).toBe('ready')
    expect(fullyVisibleAgain.settled).toBe(true)
    expect(getRuntimeSceneFrameloop(fullyVisibleAgain)).toBe('demand')
  })

  it('restores a booting scene as booting rather than auto-upgrading after visibility returns', () => {
    const booting = createRuntimeSceneState('enhanced')
    const paused = reduceRuntimeSceneState(booting, { type: 'host-visibility', visible: false })
    const restored = reduceRuntimeSceneState(paused, { type: 'host-visibility', visible: true })

    expect(paused.phase).toBe('paused')
    expect(paused.activePhase).toBe('booting')
    expect(restored.phase).toBe('booting')
    expect(restored.hasFirstFrame).toBe(false)
    expect(getRuntimeSceneFrameloop(restored)).toBe('always')
  })

  it('enters failed/never once for init failure or context loss and requires explicit acknowledgement for reporting', () => {
    const settled = readySettledState()
    const failed = reduceRuntimeSceneState(settled, {
      type: 'init-failure',
      reason: 'init failed',
    })
    const repeatedFailure = reduceRuntimeSceneState(failed, { type: 'context-lost' })
    const acknowledged = acknowledgeRuntimeSceneFailure(failed)
    const afterAcknowledgedFailure = reduceRuntimeSceneState(acknowledged, {
      type: 'init-failure',
      reason: 'still failed',
    })
    const attemptedReady = reduceRuntimeSceneState(acknowledged, { type: 'first-frame' })

    expect(failed.phase).toBe('failed')
    expect(failed.failureReportPending).toBe(true)
    expect(failed.failureReported).toBe(false)
    expect(getRuntimeSceneFrameloop(failed)).toBe('never')
    expect(repeatedFailure).toBe(failed)
    expect(acknowledged.failureReportPending).toBe(false)
    expect(acknowledged.failureReported).toBe(true)
    expect(afterAcknowledgedFailure).toBe(acknowledged)
    expect(attemptedReady).toBe(acknowledged)
  })

  it('disposes permanently and prevents later lifecycle events from reviving the scene', () => {
    const settled = readySettledState()
    const disposed = reduceRuntimeSceneState(settled, { type: 'dispose' })
    const attemptedRevival = reduceRuntimeSceneState(disposed, { type: 'first-frame' })
    const attemptedVisibility = reduceRuntimeSceneState(disposed, {
      type: 'document-visibility',
      visible: true,
    })
    const attemptedFailure = reduceRuntimeSceneState(disposed, {
      type: 'init-failure',
      reason: 'late failure',
    })

    expect(disposed.phase).toBe('disposed')
    expect(getRuntimeSceneFrameloop(disposed)).toBe('never')
    expect(attemptedRevival).toBe(disposed)
    expect(attemptedVisibility).toBe(disposed)
    expect(attemptedFailure).toBe(disposed)
  })

  it('keeps static scenes static under lifecycle events and never derives an enhanced frameloop', () => {
    const staticState = createRuntimeSceneState('static')
    const afterFrame = reduceRuntimeSceneState(staticState, { type: 'first-frame' })
    const afterVisibility = reduceRuntimeSceneState(staticState, {
      type: 'document-visibility',
      visible: false,
    })
    const afterSettled = reduceRuntimeSceneState(staticState, { type: 'scene-settled' })

    expect(staticState.phase).toBe('static')
    expect(getRuntimeSceneFrameloop(staticState)).toBe('never')
    expect(afterFrame).toBe(staticState)
    expect(afterVisibility).toBe(staticState)
    expect(afterSettled).toBe(staticState)
    expect('canvasKey' in staticState).toBe(false)
  })
})
