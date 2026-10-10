import { describe, expect, it } from 'vitest'

import {
  getAllPublicRoutes,
  getEcosystem,
  getNextProject,
  getProject,
  getProjectsByEcosystem,
} from './selectors'
import type { PublicRoute } from './selectors'

const validArcProjectRoute: PublicRoute = '/arc/hadron'
const validRialoProjectRoute: PublicRoute = '/rialo/rialo-captain'
// @ts-expect-error 无效：HADRON 属于 Arc，不能出现在 Rialo 路由下。
const invalidRialoProjectRoute: PublicRoute = '/rialo/hadron'
// @ts-expect-error 无效：Rialo Captain 属于 Rialo，不能出现在 Arc 路由下。
const invalidArcProjectRoute: PublicRoute = '/arc/rialo-captain'

void validArcProjectRoute
void validRialoProjectRoute
void invalidRialoProjectRoute
void invalidArcProjectRoute

describe('项目内容选择器', () => {
  it('按 slug 返回生态与项目', () => {
    expect(getEcosystem('arc')?.name).toBe('Arc')
    expect(getProject('arc', 'hadron')?.liveUrl).toBe('https://arc-hadron.vercel.app/')
    expect(getProjectsByEcosystem('rialo').map((project) => project.slug)).toEqual(['rialo-captain'])
  })

  it('未知生态或项目返回空结果', () => {
    expect(getEcosystem('not-real')).toBeUndefined()
    expect(getProject('arc', 'not-real')).toBeUndefined()
    expect(getProject('rialo', 'hadron')).toBeUndefined()
    expect(getProjectsByEcosystem('not-real')).toEqual([])
  })

  it('从同一内容目录生成七条公开路由且不发布 About', () => {
    expect(getAllPublicRoutes()).toEqual([
      '/',
      '/arc',
      '/arc/signal-ledger',
      '/arc/hadron',
      '/arc/arcpredict',
      '/rialo',
      '/rialo/rialo-captain',
    ])
  })

  it('按目录顺序稳定循环到下一个项目', () => {
    expect(getNextProject('arc', 'signal-ledger')?.slug).toBe('hadron')
    expect(getNextProject('arc', 'hadron')?.slug).toBe('arcpredict')
    expect(getNextProject('arc', 'arcpredict')?.slug).toBe('rialo-captain')
    expect(getNextProject('rialo', 'rialo-captain')?.slug).toBe('signal-ledger')
    expect(getNextProject('arc', 'not-real')).toBeUndefined()
  })
})
