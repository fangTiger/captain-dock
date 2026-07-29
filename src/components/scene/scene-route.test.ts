import type { ImmersiveSceneId } from './scene-types'

import { getImmersiveSceneForPathname } from './scene-route'

describe('getImmersiveSceneForPathname', () => {
  it('maps only exact immersive route pathnames to scene ids', () => {
    const expected: ReadonlyArray<[unknown, ImmersiveSceneId]> = [
      ['/', 'home'],
      ['/arc', 'arc'],
      ['/rialo', 'rialo'],
    ]

    for (const [pathname, scene] of expected) {
      expect(getImmersiveSceneForPathname(pathname)).toBe(scene)
    }
  })

  it('fails closed for non-immersive, detail, normalized-looking, and malformed pathnames', () => {
    const invalidInputs: readonly unknown[] = [
      '/about',
      '/arc/signal-ledger',
      '/arc/hadron',
      '/arc/arcpredict',
      '/rialo/rialo-captain',
      '/unknown',
      '/arc/',
      '/rialo/',
      '/arc?from=home',
      '/rialo#loop',
      '',
      ' ',
      null,
      undefined,
      0,
      false,
      { pathname: '/arc' },
      {
        toString() {
          throw new Error('route parser must not coerce objects')
        },
      },
    ]

    for (const input of invalidInputs) {
      expect(() => getImmersiveSceneForPathname(input)).not.toThrow()
      expect(getImmersiveSceneForPathname(input)).toBeNull()
    }
  })
})
