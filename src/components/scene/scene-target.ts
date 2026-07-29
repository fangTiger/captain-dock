import type { EcosystemSlug, ProjectSlug } from '../../content/types'
import type {
  EcosystemSceneTarget,
  EcosystemSceneTargetValue,
  ProjectSceneTarget,
  ProjectSceneTargetValue,
  RialoStepSceneTarget,
  RialoStepSceneTargetValue,
  RialoStepSignal,
  SceneTarget,
  SceneTargetValue,
} from './scene-types'

const ECOSYSTEM_TARGETS = {
  arc: true,
  rialo: true,
} as const satisfies Record<EcosystemSlug, true>

const PROJECT_TARGETS = {
  'signal-ledger': true,
  hadron: true,
  arcpredict: true,
  'rialo-captain': true,
} as const satisfies Record<ProjectSlug, true>

const RIALO_STEP_TARGETS = {
  observe: true,
  cover: true,
  trigger: true,
  settle: true,
  explain: true,
} as const satisfies Record<RialoStepSignal, true>

function hasStringKey<T extends Record<string, unknown>>(
  record: T,
  key: string,
): key is Extract<keyof T, string> {
  return Object.hasOwn(record, key)
}

function parseEcosystemTarget(value: string): EcosystemSceneTarget | null {
  if (!hasStringKey(ECOSYSTEM_TARGETS, value)) {
    return null
  }

  return {
    kind: 'ecosystem',
    ecosystem: value,
  }
}

function parseProjectTarget(value: string): ProjectSceneTarget | null {
  if (!hasStringKey(PROJECT_TARGETS, value)) {
    return null
  }

  return {
    kind: 'project',
    project: value,
  }
}

function parseRialoStepTarget(value: string): RialoStepSceneTarget | null {
  if (!hasStringKey(RIALO_STEP_TARGETS, value)) {
    return null
  }

  return {
    kind: 'rialo-step',
    step: value,
  }
}

export function parseSceneTarget(input: unknown): SceneTarget | null {
  if (typeof input !== 'string') {
    return null
  }

  const parts = input.split(':')

  if (parts.length !== 2) {
    return null
  }

  const [prefix, value] = parts

  if (!prefix || !value) {
    return null
  }

  switch (prefix) {
    case 'ecosystem':
      return parseEcosystemTarget(value)
    case 'project':
      return parseProjectTarget(value)
    case 'rialo-step':
      return parseRialoStepTarget(value)
    default:
      return null
  }
}

function assertNever(_target: never): never {
  throw new Error('Unknown scene target kind')
}

export function serializeSceneTarget(target: SceneTarget): SceneTargetValue {
  switch (target.kind) {
    case 'ecosystem':
      return `ecosystem:${target.ecosystem}` satisfies EcosystemSceneTargetValue
    case 'project':
      return `project:${target.project}` satisfies ProjectSceneTargetValue
    case 'rialo-step':
      return `rialo-step:${target.step}` satisfies RialoStepSceneTargetValue
    default:
      return assertNever(target)
  }
}
