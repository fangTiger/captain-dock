import { describe, expect, it } from 'vitest'

import { ecosystems, projects } from './catalog'

const expectedLiveUrls = new Map([
  ['signal-ledger', 'https://arc-signal-ledger.vercel.app/'],
  ['hadron', 'https://arc-hadron.vercel.app/'],
  ['arcpredict', 'https://web-arcpredict.vercel.app/'],
  ['rialo-captain', 'https://captain-rialo.vercel.app/login'],
] as const)

const expectedTaglines = new Map([
  ['signal-ledger', 'Budgets, payments, and receipt records for agent calls.'],
  ['hadron', 'An onchain asset issuance, order book, and USDC settlement experiment.'],
  ['arcpredict', 'Prediction markets, challenge windows, and a claim path.'],
  ['rialo-captain', 'Flight-delay protection from observation and trigger to automated settlement.'],
] as const)

const expectedStatements = new Map([
  ['signal-ledger', 'Every autonomous action leaves a receipt worth trusting.'],
  ['hadron', 'Issue the asset. Watch the market find its price.'],
  ['arcpredict', 'Uncertainty becomes a market before it becomes a decision.'],
  ['rialo-captain', 'Disruption becomes evidence, settlement, and a clear next move.'],
] as const)

describe('项目内容目录', () => {
  it('收录两个生态与四个首批项目，并保持正确分组', () => {
    expect(ecosystems.map((ecosystem) => ecosystem.slug)).toEqual(['arc', 'rialo'])
    expect(projects).toHaveLength(4)
    expect(projects.filter((project) => project.ecosystem === 'arc')).toHaveLength(3)
    expect(projects.filter((project) => project.ecosystem === 'rialo')).toHaveLength(1)
  })

  it('为生态 SEO 标题统一使用 Captain Dock 品牌后缀', () => {
    for (const ecosystem of ecosystems) {
      expect(ecosystem.seo.title).toMatch(/\| Captain Dock$/)
    }
  })

  it('保持 slug 唯一、字段完整，并且不暴露本地绝对路径', () => {
    expect(new Set(projects.map((project) => project.slug)).size).toBe(4)

    for (const project of projects) {
      expect(project.name.trim()).not.toBe('')
      expect(project.tagline.trim()).not.toBe('')
      expect(project.statement).toEqual(expect.any(String))
      expect(project.statement?.trim()).not.toBe('')
      expect(project.summary.trim()).not.toBe('')
      expect(project.status.length).toBeGreaterThan(0)
      expect(project.roles.length).toBeGreaterThan(0)
      expect(project.tags.length).toBeGreaterThan(0)
      expect(project.stack.length).toBeGreaterThan(0)
      expect(project.limits.length).toBeGreaterThan(0)
      expect(project.seo.title.trim()).not.toBe('')
      expect(project.seo.description.trim()).not.toBe('')
      expect(project.coreLoop.length).toBeGreaterThanOrEqual(1)
      expect(project.coreLoop.length).toBeLessThanOrEqual(5)
      expect(project.evidence.length).toBeGreaterThanOrEqual(3)
      expect(project.gallery.length).toBeGreaterThanOrEqual(1)

      for (const step of project.coreLoop) {
        expect(step.label.trim()).not.toBe('')
        expect(step.description.trim()).not.toBe('')
      }

      for (const evidence of project.evidence) {
        expect(evidence.label.trim()).not.toBe('')
        expect(evidence.description.trim()).not.toBe('')
        expect(['DEMO', 'TESTNET', 'EXPERIMENTAL']).toContain(evidence.status)
      }

      for (const image of project.gallery) {
        expect(image.src).toMatch(/^\/projects\//)
        expect(image.alt.trim()).not.toBe('')
        expect(image.caption.trim()).not.toBe('')
      }
    }

    expect(JSON.stringify({ ecosystems, projects })).not.toContain('/Users/captain/')
  })

  it('为四个作品配置精确的 HTTPS 在线地址', () => {
    expect(projects.every((project) => project.liveUrl.startsWith('https://'))).toBe(true)

    for (const [slug, liveUrl] of expectedLiveUrls) {
      expect(projects.find((project) => project.slug === slug)?.liveUrl).toBe(liveUrl)
    }
  })

  it('为四个项目保留详情页与卡片使用的描述性副标题', () => {
    for (const [slug, tagline] of expectedTaglines) {
      const projectTagline = projects.find((project) => project.slug === slug)?.tagline

      expect(projectTagline?.trim()).not.toBe('')
      expect(projectTagline).toBe(tagline)
    }
  })

  it('为四个项目保存星座节点与首页使用的精确一句话判断语', () => {
    for (const [slug, statement] of expectedStatements) {
      const projectStatement = projects.find((project) => project.slug === slug)?.statement

      expect(projectStatement?.trim()).not.toBe('')
      expect(projectStatement).toBe(statement)
    }
  })

  it('为每个项目保存明确的闭环与边界说明', () => {
    expect(projects.find((project) => project.slug === 'signal-ledger')?.coreLoop.map((step) => step.label)).toEqual([
      'Set budget',
      'Select payment source',
      'Pay for call',
      'Generate report',
      'Record receipt',
    ])
    expect(projects.find((project) => project.slug === 'hadron')?.coreLoop.map((step) => step.label)).toEqual([
      'Issue asset',
      'Place order / bid',
      'Match trade',
      'Settle in USDC',
      'Review position / yield',
    ])
    expect(projects.find((project) => project.slug === 'arcpredict')?.coreLoop.map((step) => step.label)).toEqual([
      'Open market',
      'Place prediction',
      'Propose outcome',
      'Challenge / confirm',
      'Claim',
    ])
    expect(projects.find((project) => project.slug === 'rialo-captain')?.coreLoop.map((step) => step.label)).toEqual([
      'Observe flight',
      'Purchase cover',
      'Detect delay',
      'Settle automatically',
      'Review evidence and AI explanation',
    ])
    expect(projects.find((project) => project.slug === 'arcpredict')?.limits.join(' ')).toContain(
      'AI does not participate in final settlement',
    )
  })
})
