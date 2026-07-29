import type {
  EcosystemSceneTargetValue,
  ImmersiveSceneId,
  ProjectSceneTargetValue,
  RialoStepSceneTargetValue,
  SceneTarget,
  SceneTargetValue,
} from './scene-types'
import type { EcosystemSlug, ProjectSlug } from '../../content/types'

import { parseSceneTarget, serializeSceneTarget } from './scene-target'

describe('scene target types', () => {
  it('keeps scene and target values tied to catalog slug unions', () => {
    expectTypeOf<ImmersiveSceneId>().toEqualTypeOf<'home' | EcosystemSlug>()
    expectTypeOf<EcosystemSceneTargetValue>().toEqualTypeOf<`ecosystem:${EcosystemSlug}`>()
    expectTypeOf<ProjectSceneTargetValue>().toEqualTypeOf<`project:${ProjectSlug}`>()
    expectTypeOf<RialoStepSceneTargetValue>().toEqualTypeOf<
      `rialo-step:${'observe' | 'cover' | 'trigger' | 'settle' | 'explain'}`
    >()
  })
})

describe('parseSceneTarget', () => {
  it('parses only stable ecosystem, project, and Rialo step target values', () => {
    expect(parseSceneTarget('ecosystem:arc')).toEqual({
      kind: 'ecosystem',
      ecosystem: 'arc',
    })
    expect(parseSceneTarget('ecosystem:rialo')).toEqual({
      kind: 'ecosystem',
      ecosystem: 'rialo',
    })
    expect(parseSceneTarget('project:signal-ledger')).toEqual({
      kind: 'project',
      project: 'signal-ledger',
    })
    expect(parseSceneTarget('project:hadron')).toEqual({
      kind: 'project',
      project: 'hadron',
    })
    expect(parseSceneTarget('project:arcpredict')).toEqual({
      kind: 'project',
      project: 'arcpredict',
    })
    expect(parseSceneTarget('project:rialo-captain')).toEqual({
      kind: 'project',
      project: 'rialo-captain',
    })
    expect(parseSceneTarget('rialo-step:observe')).toEqual({
      kind: 'rialo-step',
      step: 'observe',
    })
    expect(parseSceneTarget('rialo-step:cover')).toEqual({
      kind: 'rialo-step',
      step: 'cover',
    })
    expect(parseSceneTarget('rialo-step:trigger')).toEqual({
      kind: 'rialo-step',
      step: 'trigger',
    })
    expect(parseSceneTarget('rialo-step:settle')).toEqual({
      kind: 'rialo-step',
      step: 'settle',
    })
    expect(parseSceneTarget('rialo-step:explain')).toEqual({
      kind: 'rialo-step',
      step: 'explain',
    })
  })

  it('fails closed for empty, malformed, case-changed, extra-colon, unknown, and non-string inputs', () => {
    const invalidInputs: readonly unknown[] = [
      undefined,
      null,
      '',
      ' ',
      'ecosystem',
      'ecosystem:',
      'ecosystem:arc:extra',
      'ecosystem:ARC',
      'ecosystem:about',
      'project',
      'project:',
      'project:arc',
      'project:signal-ledger:extra',
      'project:SIGNAL-LEDGER',
      'rialo-step',
      'rialo-step:',
      'rialo-step:observe:extra',
      'rialo-step:Observe',
      'rialo-step:refund',
      'unknown:arc',
      7,
      {
        toString() {
          return 'ecosystem:arc'
        },
      },
    ]

    for (const input of invalidInputs) {
      expect(parseSceneTarget(input)).toBeNull()
    }
  })
})

describe('serializeSceneTarget', () => {
  it('round-trips every target variant with exhaustive value types', () => {
    const targets: ReadonlyArray<[SceneTarget, SceneTargetValue]> = [
      [{ kind: 'ecosystem', ecosystem: 'arc' }, 'ecosystem:arc'],
      [{ kind: 'ecosystem', ecosystem: 'rialo' }, 'ecosystem:rialo'],
      [{ kind: 'project', project: 'signal-ledger' }, 'project:signal-ledger'],
      [{ kind: 'project', project: 'hadron' }, 'project:hadron'],
      [{ kind: 'project', project: 'arcpredict' }, 'project:arcpredict'],
      [{ kind: 'project', project: 'rialo-captain' }, 'project:rialo-captain'],
      [{ kind: 'rialo-step', step: 'observe' }, 'rialo-step:observe'],
      [{ kind: 'rialo-step', step: 'cover' }, 'rialo-step:cover'],
      [{ kind: 'rialo-step', step: 'trigger' }, 'rialo-step:trigger'],
      [{ kind: 'rialo-step', step: 'settle' }, 'rialo-step:settle'],
      [{ kind: 'rialo-step', step: 'explain' }, 'rialo-step:explain'],
    ]

    for (const [target, expectedValue] of targets) {
      const serialized: SceneTargetValue = serializeSceneTarget(target)

      expect(serialized).toBe(expectedValue)
      expect(parseSceneTarget(serialized)).toEqual(target)
    }
  })

  it('derives serialized values from discriminant fields without trusting redundant object values', () => {
    const target = {
      kind: 'ecosystem',
      ecosystem: 'arc',
      value: 'ecosystem:rialo',
    } as unknown as SceneTarget

    expect(serializeSceneTarget(target)).toBe('ecosystem:arc')
    expect(parseSceneTarget('ecosystem:arc')).not.toHaveProperty('value')
  })
})
