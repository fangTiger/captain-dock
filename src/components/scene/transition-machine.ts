import type { ImmersiveSceneId } from './scene-types'

export const CINEMATIC_HANDOFF_DEPART_MS = 120
export const CINEMATIC_HANDOFF_TOTAL_MS = 600
export const SCENE_TRANSITION_DEPART_MS = 180
export const SCENE_TRANSITION_ARRIVE_MS = 360
export const SCENE_TRANSITION_TOTAL_MAX_MS = 700

export type SceneTransitionPhase = 'idle' | 'departing' | 'swapping' | 'arriving'
export type SceneTransitionNavigationType = 'link' | 'history'

export type SceneTransitionState = {
  phase: SceneTransitionPhase
  scene: ImmersiveSceneId
  previousScene: ImmersiveSceneId | null
  targetScene: ImmersiveSceneId
  token: number
}

export type SceneTransitionEvent =
  | {
      type: 'navigate'
      scene: ImmersiveSceneId
      reducedMotion?: boolean
      navigationType?: SceneTransitionNavigationType
    }
  | {
      type: 'departed' | 'swapped' | 'arrived'
      token: number
    }

export function createSceneTransitionState(scene: ImmersiveSceneId): SceneTransitionState {
  return {
    phase: 'idle',
    scene,
    previousScene: null,
    targetScene: scene,
    token: 0,
  }
}

function beginNavigation(
  state: SceneTransitionState,
  scene: ImmersiveSceneId,
  reducedMotion: boolean,
): SceneTransitionState {
  if (scene === state.targetScene) {
    return state
  }

  const token = state.token + 1

  if (scene === state.scene) {
    return {
      phase: 'idle',
      scene,
      previousScene: null,
      targetScene: scene,
      token,
    }
  }

  if (reducedMotion) {
    return {
      phase: 'idle',
      scene,
      previousScene: null,
      targetScene: scene,
      token,
    }
  }

  return {
    phase: 'departing',
    scene: state.scene,
    previousScene: state.scene,
    targetScene: scene,
    token,
  }
}

function hasCurrentToken(state: SceneTransitionState, token: number) {
  return state.token === token
}

export function reduceSceneTransition(
  state: SceneTransitionState,
  event: SceneTransitionEvent,
): SceneTransitionState {
  switch (event.type) {
    case 'navigate':
      return beginNavigation(state, event.scene, Boolean(event.reducedMotion))
    case 'departed':
      if (state.phase !== 'departing' || !hasCurrentToken(state, event.token)) {
        return state
      }

      return {
        ...state,
        phase: 'swapping',
      }
    case 'swapped':
      if (state.phase !== 'swapping' || !hasCurrentToken(state, event.token)) {
        return state
      }

      return {
        ...state,
        phase: 'arriving',
        scene: state.targetScene,
      }
    case 'arrived':
      if (state.phase !== 'arriving' || !hasCurrentToken(state, event.token)) {
        return state
      }

      return {
        phase: 'idle',
        scene: state.targetScene,
        previousScene: null,
        targetScene: state.targetScene,
        token: state.token,
      }
  }
}
