import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { projects } from '../../../content/catalog'
import type { Project, ProjectTheme } from '../../../content/types'

import { ProjectSignature } from './project-signature'

const signatureGrammars = {
  ledger: 'scan-ledger',
  market: 'order-book',
  probability: 'probability-arc',
  flight: 'flight-route',
} satisfies Record<ProjectTheme['motif'], string>

describe('ProjectSignature', () => {
  it.each(projects)('renders the $theme.motif signature from catalog coreLoop data', (project) => {
    const { container } = render(<ProjectSignature project={project} />)

    const signature = screen.getByRole('region', { name: 'System signature' })
    const heading = within(signature).getByRole('heading', { level: 2, name: 'System signature' })

    expect(heading).toHaveAttribute('id', `${project.slug}-signature-heading`)
    expect(signature).toHaveAttribute('data-signature-motif', project.theme.motif)
    expect(signature).toHaveAttribute('data-signature-grammar', signatureGrammars[project.theme.motif])
    expect(within(signature).getByText(project.name)).toBeVisible()
    expect(within(signature).getByText('Process diagram / not live data')).toBeVisible()

    expect(within(signature).queryByRole('list')).not.toBeInTheDocument()
    expect(within(signature).queryByRole('listitem')).not.toBeInTheDocument()
    expect(signature.querySelector('svg')).not.toBeNull()
    expect(signature.querySelectorAll('svg path').length).toBeGreaterThan(1)
    expect(signature.querySelector('[data-signature-motion]')).not.toBeNull()

    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })

  it('keeps a unique non-color grammar for every catalog motif', () => {
    const rendered = projects.map((project) => {
      const { container } = render(<ProjectSignature project={project} />)

      return within(container).getByRole('region', { name: 'System signature' }).getAttribute('data-signature-grammar')
    })

    expect(new Set(rendered)).toEqual(
      new Set(['scan-ledger', 'order-book', 'probability-arc', 'flight-route']),
    )
  })

  it('states the settlement boundary for the probability signature', () => {
    const project = projects.find((item) => item.theme.motif === 'probability')

    if (!project) {
      throw new Error('测试目录缺少 probability 项目。')
    }

    render(<ProjectSignature project={project} />)

    expect(screen.getByRole('region', { name: 'System signature' })).toHaveTextContent(
      'AI does not participate in final settlement',
    )
  })

  it('fails fast when an unknown motif is forced at runtime', () => {
    const project = {
      ...projects[0],
      theme: {
        ...projects[0].theme,
        motif: 'unknown',
      },
    } as unknown as Project

    expect(() => render(<ProjectSignature project={project} />)).toThrow(/Unknown project signature motif/)
  })

  it('keeps only internal instrument geometry and one bounded low-amplitude pulse', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/project/signature/project-signature.module.css'),
      'utf8',
    )
    const signatureRule = css.match(/\.signature\s*\{([^}]+)\}/)?.[1] ?? ''
    const headerRule = css.match(/\.header\s*\{([^}]+)\}/)?.[1] ?? ''
    const titleRule = css.match(/\.title\s*\{([^}]+)\}/)?.[1] ?? ''
    const diagramRule = css.match(/\.diagram\s*\{\s*align-items:\s*stretch;([^}]+)\}/)?.[1] ?? ''
    const motionRule = css.match(/\.motionTrace\s*\{([^}]+)\}/)?.[1] ?? ''
    const traceRules = ['scanTrace', 'matchTrace', 'arcTrace', 'routeTrace'].map(
      (className) => css.match(new RegExp(`\\.${className}\\s*\\{([^}]+)\\}`))?.[1] ?? '',
    )
    const keyframes = css.slice(
      css.indexOf('@keyframes signature-pulse'),
      css.indexOf('@media (prefers-reduced-motion: reduce)'),
    )
    const keyframeProperties = Array.from(
      keyframes.matchAll(/^\s*([\w-]+):/gm),
      (match) => match[1],
    )

    expect(signatureRule).toContain('background: transparent;')
    expect(signatureRule).toContain('border: 0;')
    expect(signatureRule).not.toMatch(/border-inline(?:-start|-end)?\s*:/)
    expect(css).not.toMatch(/\.signature::before\s*\{/)
    expect(headerRule).not.toMatch(/border-block(?:-start|-end)?\s*:/)
    expect(headerRule).not.toMatch(/background\s*:/)
    expect(titleRule).toContain('font-family: var(--font-mono);')
    expect(titleRule).toMatch(/font-size:\s*0\.[1-9]\d*rem/)
    expect(diagramRule).toContain('background: transparent;')
    expect(diagramRule).toContain('border: 0;')
    expect(diagramRule).not.toMatch(/border-block(?:-start|-end)?\s*:/)
    expect(motionRule).not.toMatch(/inset:\s*0/)
    expect(motionRule).not.toMatch(/linear-gradient/)
    expect(motionRule).toMatch(/block-size:\s*(?:0?\.[1-9]\d*|[1-9]\d*)rem/)
    expect(motionRule).toMatch(/inline-size:\s*(?:0?\.[1-9]\d*|[1-9]\d*)rem/)
    expect(css.match(/@keyframes signature-[\w-]+/g)).toHaveLength(1)
    expect(css).toMatch(/animation:\s*signature-pulse 8s [^;]+;/)
    expect(css).not.toMatch(/(?:^|[;\s])filter\s*:/)
    expect(keyframes).not.toMatch(/scale\(/)
    expect(keyframes.match(/translate3d\(/g)?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(new Set(keyframeProperties)).toEqual(new Set(['opacity', 'transform']))
    for (const traceRule of traceRules) {
      expect(traceRule).toContain('--trace-mid-x:')
      expect(traceRule).toContain('--trace-mid-y:')
      expect(traceRule).toContain('--trace-end-x:')
      expect(traceRule).toContain('--trace-end-y:')
    }
    expect(css).toMatch(/\.gridLine\s*\{[^}]*stroke:/)
    expect(css).toMatch(/\.signalLine\s*\{[^}]*stroke:/)
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^]*?\.motionTrace[^}]*animation:\s*none/,
    )
  })
})
