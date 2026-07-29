import type { EcosystemSlug, ProjectSlug } from '../../content/types'

export type ImmersiveSceneId = 'home' | EcosystemSlug
export type SceneTargetPreviewSource = 'focus' | 'pointer'

export const SCENE_ECOSYSTEM_ACCENTS = {
  arc: '#7dd3fc',
  rialo: '#fbbf24',
} as const satisfies Readonly<Record<EcosystemSlug, string>>

export const SCENE_PROJECT_ACCENTS = {
  'signal-ledger': '#38bdf8',
  hadron: '#a78bfa',
  arcpredict: '#22d3ee',
  'rialo-captain': '#f59e0b',
} as const satisfies Readonly<Record<ProjectSlug, string>>

export const SCENE_PROJECT_ECOSYSTEMS = {
  'signal-ledger': 'arc',
  hadron: 'arc',
  arcpredict: 'arc',
  'rialo-captain': 'rialo',
} as const satisfies Readonly<Record<ProjectSlug, EcosystemSlug>>

export const RIALO_STEP_SIGNALS = [
  'observe',
  'cover',
  'trigger',
  'settle',
  'explain',
] as const

export type RialoStepSignal = (typeof RIALO_STEP_SIGNALS)[number]

export type EcosystemSceneTargetValue = `ecosystem:${EcosystemSlug}`
export type ProjectSceneTargetValue = `project:${ProjectSlug}`
export type RialoStepSceneTargetValue = `rialo-step:${RialoStepSignal}`
export type SceneTargetValue =
  | EcosystemSceneTargetValue
  | ProjectSceneTargetValue
  | RialoStepSceneTargetValue

export type EcosystemSceneTarget = {
  kind: 'ecosystem'
  ecosystem: EcosystemSlug
}

export type ProjectSceneTarget = {
  kind: 'project'
  project: ProjectSlug
}

export type RialoStepSceneTarget = {
  kind: 'rialo-step'
  step: RialoStepSignal
}

export type SceneTarget = EcosystemSceneTarget | ProjectSceneTarget | RialoStepSceneTarget
