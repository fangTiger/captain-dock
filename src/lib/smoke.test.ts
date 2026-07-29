import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/font/local', () => ({
  default: ({ variable }: { variable?: string }) => ({
    className: '',
    variable: variable ?? '',
  }),
}))

import RootLayout from '../app/layout'

describe('工程测试骨架', () => {
  it('运行 Vitest 环境中的基础断言', () => {
    expect('Captain Dock').toContain('Captain Dock')
  })

  it('根布局提供英文跳至正文链接和语言声明', () => {
    const markup = renderToStaticMarkup(
      createElement(RootLayout, null, createElement('div', { id: 'main-content' }, '正文')),
    )

    expect(markup).toContain('href="#main-content"')
    expect(markup).toContain('Skip to main content')
    expect(markup).toMatch(
      /<html(?=[^>]*\blang="en")(?=[^>]*\bdata-scroll-behavior="smooth")[^>]*>/,
    )
    expect(markup).toContain('--font-display-local')
    expect(markup).toContain('--font-body-local')
    expect(markup).toContain('--font-mono-local')
    expect(markup).toContain('CAPTAIN DOCK')
    expect(markup).not.toContain('PU-01')
    expect(markup).not.toContain('captain-dock-logo.png')
  })
})
