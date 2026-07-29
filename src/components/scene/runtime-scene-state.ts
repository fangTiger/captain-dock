export type RuntimeScenePhase = 'static' | 'booting' | 'ready' | 'paused' | 'failed' | 'disposed'
export type RuntimeSceneMode = 'static' | 'enhanced'
export type RuntimeSceneActivePhase = 'booting' | 'ready'
export type RuntimeSceneFrameloop = 'always' | 'demand' | 'never'

export type RuntimeSceneState = {
  phase: RuntimeScenePhase
  activePhase: RuntimeSceneActivePhase | null
  documentVisible: boolean
  hostVisible: boolean
  hasFirstFrame: boolean
  settled: boolean
  failureReportPending: boolean
  failureReported: boolean
  failureReason: string | null
}

export type RuntimeSceneEvent =
  | {
      type: 'first-frame' | 'scene-settled' | 'context-lost' | 'dispose'
    }
  | {
      type: 'document-visibility' | 'host-visibility'
      visible: boolean
    }
  | {
      type: 'init-failure'
      reason?: string
    }

export function createRuntimeSceneState(mode: RuntimeSceneMode): RuntimeSceneState {
  const enhanced = mode === 'enhanced'

  return {
    phase: enhanced ? 'booting' : 'static',
    activePhase: enhanced ? 'booting' : null,
    documentVisible: true,
    hostVisible: true,
    hasFirstFrame: false,
    settled: false,
    failureReportPending: false,
    failureReported: false,
    failureReason: null,
  }
}

export function getRuntimeSceneFrameloop(state: RuntimeSceneState): RuntimeSceneFrameloop {
  switch (state.phase) {
    case 'booting':
      return 'always'
    case 'ready':
      return state.settled ? 'demand' : 'always'
    case 'static':
    case 'paused':
    case 'failed':
    case 'disposed':
      return 'never'
  }
}

function isActivePhase(phase: RuntimeScenePhase): phase is RuntimeSceneActivePhase {
  return phase === 'booting' || phase === 'ready'
}

function updateVisibility(
  state: RuntimeSceneState,
  visibility: Pick<RuntimeSceneState, 'documentVisible' | 'hostVisible'>,
): RuntimeSceneState {
  const nextState = {
    ...state,
    ...visibility,
  }

  if (!nextState.documentVisible || !nextState.hostVisible) {
    return {
      ...nextState,
      phase: 'paused',
      activePhase: isActivePhase(state.phase) ? state.phase : state.activePhase,
    }
  }

  if (state.phase === 'paused') {
    return {
      ...nextState,
      phase: state.activePhase ?? 'booting',
    }
  }

  return nextState
}

function failRuntimeScene(state: RuntimeSceneState, reason: string): RuntimeSceneState {
  return {
    ...state,
    phase: 'failed',
    activePhase: null,
    failureReportPending: true,
    failureReported: false,
    failureReason: reason,
  }
}

function disposeRuntimeScene(state: RuntimeSceneState): RuntimeSceneState {
  return {
    ...state,
    phase: 'disposed',
    activePhase: null,
    failureReportPending: false,
  }
}

export function reduceRuntimeSceneState(
  state: RuntimeSceneState,
  event: RuntimeSceneEvent,
): RuntimeSceneState {
  if (state.phase === 'disposed') {
    return state
  }

  if (event.type === 'dispose') {
    return disposeRuntimeScene(state)
  }

  if (state.phase === 'static' || state.phase === 'failed') {
    return state
  }

  switch (event.type) {
    case 'first-frame':
      if (state.phase !== 'booting') {
        return state
      }

      return {
        ...state,
        phase: 'ready',
        activePhase: 'ready',
        hasFirstFrame: true,
      }
    case 'scene-settled':
      if (state.phase !== 'ready' || !state.hasFirstFrame) {
        return state
      }

      return {
        ...state,
        settled: true,
      }
    case 'document-visibility':
      return updateVisibility(state, {
        documentVisible: event.visible,
        hostVisible: state.hostVisible,
      })
    case 'host-visibility':
      return updateVisibility(state, {
        documentVisible: state.documentVisible,
        hostVisible: event.visible,
      })
    case 'init-failure':
      return failRuntimeScene(state, event.reason ?? 'init-failure')
    case 'context-lost':
      return failRuntimeScene(state, 'context-lost')
  }
}

export function acknowledgeRuntimeSceneFailure(state: RuntimeSceneState): RuntimeSceneState {
  if (state.phase !== 'failed' || !state.failureReportPending) {
    return state
  }

  return {
    ...state,
    failureReportPending: false,
    failureReported: true,
  }
}
