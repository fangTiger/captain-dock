import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import EcosystemPage from '../../app/(immersive)/[ecosystem]/page'
import { projects } from '../../content/catalog'

const arcProjects = projects.filter((project) => project.ecosystem === 'arc')
const domainLabels = ['Research', 'Exchange', 'Forecast'] as const
const projectStatements = {
  'signal-ledger': 'Every autonomous action leaves a receipt worth trusting.',
  hadron: 'Issue the asset. Watch the market find its price.',
  arcpredict: 'Uncertainty becomes a market before it becomes a decision.',
  'rialo-captain': 'Disruption becomes evidence, settlement, and a clear next move.',
} as const satisfies Record<(typeof projects)[number]['slug'], string>

function readBalancedBlock(source: string, header: string) {
  const headerIndex = source.lastIndexOf(header)

  expect(headerIndex, `${header} 应存在。`).toBeGreaterThanOrEqual(0)

  const openingBrace = source.indexOf('{', headerIndex)
  let depth = 1
  let cursor = openingBrace + 1

  while (cursor < source.length && depth > 0) {
    if (source[cursor] === '{') {
      depth += 1
    } else if (source[cursor] === '}') {
      depth -= 1
    }
    cursor += 1
  }

  expect(depth, `${header} 的花括号必须平衡。`).toBe(0)

  return source.slice(openingBrace + 1, cursor - 1)
}

function readLastRule(source: string, selector: string) {
  return readBalancedBlock(source, `${selector} {`)
}

async function renderArcPage() {
  return render(
    await EcosystemPage({
      params: Promise.resolve({ ecosystem: 'arc' }),
    }),
  )
}

describe('ArcInstrumentStage', () => {
  function expectedAnnouncement(project: (typeof arcProjects)[number]) {
    return `${project.name}: ${projectStatements[project.slug]}`
  }

  function expectCommittedProject(
    main: HTMLElement,
    stage: HTMLElement,
    project: (typeof arcProjects)[number],
    selectors: readonly HTMLElement[],
  ) {
    const activePanel = within(stage).getByRole('region', { name: 'Active project' })
    const statement = activePanel.querySelector('[data-active-project-statement]')
    const primary = within(activePanel).getByRole('link', {
      name: new RegExp(`Open ${project.name} case file`, 'i'),
    })

    expect(stage).toHaveAttribute('data-active-project', project.slug)
    expect(stage).toHaveAttribute('data-committed-target', `project:${project.slug}`)
    expect(stage).toHaveAttribute('data-effective-target', `project:${project.slug}`)
    expect(within(activePanel).getAllByRole('heading', { level: 2, name: project.name })).toHaveLength(1)
    expect(statement).toHaveTextContent(projectStatements[project.slug])
    expect(within(activePanel).getAllByRole('link')).toHaveLength(1)
    expect(primary).toHaveTextContent(/^Open case file$/)
    expect(primary).toHaveAttribute('href', `/arc/${project.slug}`)
    expect(primary).toHaveAttribute('data-control-role', 'primary')
    expect(stage.querySelectorAll('[data-control-role="primary"]')).toHaveLength(1)
    expect(main.querySelectorAll(`a[href="/arc/${project.slug}"]`)).toHaveLength(1)

    for (const [index, candidate] of arcProjects.entries()) {
      expect(selectors[index]).toHaveAttribute(
        'aria-pressed',
        candidate.slug === project.slug ? 'true' : 'false',
      )
      if (candidate.slug === project.slug) {
        expect(selectors[index]).toHaveAttribute('aria-current', 'true')
      } else {
        expect(selectors[index]).not.toHaveAttribute('aria-current')
        expect(main.querySelectorAll(`a[href="/arc/${candidate.slug}"]`)).toHaveLength(0)
      }
    }

    const liveRegions = stage.querySelectorAll('[aria-live]')

    expect(liveRegions).toHaveLength(1)
    expect(liveRegions[0]).toHaveAttribute('data-arc-live')
    expect(liveRegions[0]).toHaveAttribute('aria-live', 'polite')
    expect(liveRegions[0]?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      expectedAnnouncement(project),
    )
  }

  it('switches one observation instrument across the three catalog-backed Arc projects', async () => {
    const user = userEvent.setup()
    const { container } = await renderArcPage()
    const main = container.querySelector('main#main-content')
    const stage = container.querySelector('[data-instrument-stage="arc"]')

    expect(main).not.toBeNull()
    expect(stage).not.toBeNull()

    const selectors = within(stage as HTMLElement).getAllByRole('button')

    expect(
      within(stage as HTMLElement).getAllByRole('group', { name: 'Arc observation modes' }),
    ).toHaveLength(1)
    expect(within(stage as HTMLElement).getAllByRole('region', { name: 'Active project' })).toHaveLength(1)
    expect(stage).not.toHaveTextContent('Arc / 03 systems')
    expect(selectors).toHaveLength(3)
    expect(stage?.querySelector('[data-stage-scene] > [data-active-project]')).toHaveStyle({
      '--node-accent': arcProjects[0].theme.accent,
    })

    for (const [index, project] of arcProjects.entries()) {
      const selector = within(stage as HTMLElement).getByRole('button', {
        name: new RegExp(`${String(index + 1).padStart(2, '0')}.*${domainLabels[index]}`, 'i'),
      })

      expect(selector).toHaveAttribute('data-control-role', 'stage')
      expect(selector).toHaveAttribute('data-scene-target', `project:${project.slug}`)
      expect(selector).toHaveAttribute('aria-pressed', index === 0 ? 'true' : 'false')
      expect(selector).toHaveAccessibleName(
        `${String(index + 1).padStart(2, '0')} ${domainLabels[index]} — ${project.name}`,
      )
      expect(selector).toHaveTextContent(
        new RegExp(`^${String(index + 1).padStart(2, '0')}\\s*${domainLabels[index]}$`),
      )
      if (index === 0) {
        expect(selector).toHaveAttribute('aria-current', 'true')
      } else {
        expect(selector).not.toHaveAttribute('aria-current')
      }
    }

    expectCommittedProject(main as HTMLElement, stage as HTMLElement, arcProjects[0], selectors)

    const hadronSelector = within(stage as HTMLElement).getByRole('button', {
      name: /02.*Exchange/i,
    })

    await user.click(hadronSelector)

    expectCommittedProject(main as HTMLElement, stage as HTMLElement, arcProjects[1], selectors)

    await user.keyboard('{ArrowRight}')
    expect(selectors[2]).toHaveFocus()
    expectCommittedProject(main as HTMLElement, stage as HTMLElement, arcProjects[1], selectors)

    await user.keyboard('{Enter}')
    expectCommittedProject(main as HTMLElement, stage as HTMLElement, arcProjects[2], selectors)
    expect(container.querySelectorAll('main > section')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1, name: 'Arc' })).toHaveLength(1)
  })

  it('joins machine and readout on one open datum without card rails or repeated selector borders', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const recoveryStart = css.indexOf(
      '/* Art direction recovery：Arc 的机器和 readout 共用同一开放基准与光场。 */',
    )
    const recoveryMobileStart = css.indexOf('@media (max-width: 700px)', recoveryStart)
    const desktopCss = css.slice(0, recoveryMobileStart)
    const sceneRule = readLastRule(desktopCss, '.arc .scene')
    const readoutSlotRule = readLastRule(desktopCss, '.arc .readout')
    const stageFieldRule = readLastRule(desktopCss, '.arc::after')
    const readoutRule = readLastRule(desktopCss, '.arcReadout')
    const headingRule = readLastRule(desktopCss, '.arcReadout h2')
    const wordmarkRule = readLastRule(desktopCss, '.arc .ecosystemTitle')
    const selectorRule = readLastRule(desktopCss, '.arcSelector')
    const activeTickRule = readLastRule(
      desktopCss,
      ".arcSelector[aria-pressed='true']::before",
    )

    expect(sceneRule).toContain('grid-column: 1 / 10;')
    expect(readoutSlotRule).toContain('grid-column: 7 / 13;')
    expect(stageFieldRule).toMatch(/radial-gradient\(circle at 58% 52%/)
    expect(readoutRule).toContain('background: transparent;')
    expect(readoutRule).toContain('border: 0;')
    expect(readoutRule).not.toMatch(/border-inline-start:/)
    expect(headingRule).toContain('white-space: nowrap;')
    expect(headingRule).toContain('overflow-wrap: normal;')
    expect(headingRule).toContain('word-break: normal;')
    expect(headingRule).toContain('font-size: 4rem;')
    expect(wordmarkRule).toContain('font-size: 0.72rem;')
    expect(wordmarkRule).toContain('font-family: var(--font-mono);')
    expect(wordmarkRule).toContain('letter-spacing: 0.12em;')
    expect(selectorRule).toContain('background: transparent;')
    expect(selectorRule).toContain('border: 0;')
    expect(selectorRule).not.toMatch(/border-block-start:/)
    expect(activeTickRule).toContain('inline-size: 2.5rem;')
    expect(activeTickRule).toContain('background: var(--stage-accent);')
  })

  it('preserves the approved mobile right anchor and fits the project name without word fragmentation', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const mobile = readBalancedBlock(css, '@media (max-width: 700px)')
    const machineRule =
      Array.from(css.matchAll(/\.arcMachine\s*\{([^}]+)\}/g), (match) => match[1]).find(
        (rule) => rule.includes('inline-size: 35rem;'),
      ) ?? ''
    const headingRule = readLastRule(mobile, '.arcReadout h2')
    const readoutRule = readLastRule(mobile, '.arcReadout')

    expect(machineRule).toContain('inline-size: 35rem;')
    expect(machineRule).toContain('justify-self: start;')
    expect(machineRule).toContain('margin-inline-start: calc(100% - 35rem);')
    expect(machineRule).toContain(
      'transform: translate3d(min(0px, calc(10.5rem - 50vw + var(--page-gutter))), 0, 0);',
    )
    expect(headingRule).toContain('font-size: 2rem;')
    expect(headingRule).toContain('white-space: nowrap;')
    expect(readoutRule).toContain('box-sizing: border-box;')
    expect(readoutRule).toContain('inline-size: 100%;')
    expect(readoutRule).toContain('max-inline-size: 100%;')
    expect(readoutRule).toContain('min-inline-size: 0;')
  })

  it('uses fixed rem readout sizes across intermediate widths while preserving one-line project names', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const compact = readBalancedBlock(
      css,
      '@media (min-width: 701px) and (max-width: 900px)',
    )
    const intermediate = readBalancedBlock(
      css,
      '@media (min-width: 901px) and (max-width: 1279px)',
    )
    const wide = readBalancedBlock(css, '@media (min-width: 1280px)')

    expect(readLastRule(compact, '.arcReadout h2')).toContain('font-size: 2.3rem;')
    expect(readLastRule(intermediate, '.arcReadout h2')).toContain('font-size: 3rem;')
    expect(readLastRule(wide, '.arcReadout h2')).toContain('font-size: 4rem;')
    expect(readLastRule(css, '.arcReadout h2')).toContain('white-space: nowrap;')
    expect(css).not.toMatch(/font-size:\s*[^;]*(?:vw|cqw|cqi)/)
  })

  it('keeps the Arc mass and signal-path morph perceptible for the full scene duration', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const massRule = css.match(/\.arcMass\s*\{([^}]+)\}/)?.[1] ?? ''
    const signalPathRule = css.match(/\.arcSignalPath\s*\{([^}]+)\}/)?.[1] ?? ''
    const enhancedMassTransition = css.match(
      /@media \(prefers-reduced-motion: no-preference\) and \(min-width: 769px\)[\s\S]*?\.arcMass\s*\{([^}]+)\}/,
    )?.[1] ?? ''
    const ambientMotion = readBalancedBlock(
      css,
      '@media (prefers-reduced-motion: no-preference) and (min-width: 769px)',
    )
    const enhancedSignalPathTransition =
      Array.from(
        ambientMotion.matchAll(/\.arcSignalPath\s*\{([^}]+)\}/g),
        (match) => match[1],
      ).find((rule) => rule.includes('transition:')) ?? ''
    const reducedMotionRule = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.stage \*::after\s*\{([^}]+)\}/,
    )?.[1] ?? ''

    expect(massRule).not.toContain('var(--duration-interaction)')
    expect(enhancedMassTransition).toMatch(
      /block-size var\(--duration-scene-morph\) var\(--ease-in-out\)/,
    )
    expect(enhancedMassTransition).toMatch(
      /inline-size var\(--duration-scene-morph\) var\(--ease-in-out\)/,
    )
    expect(enhancedMassTransition).toMatch(
      /transform var\(--duration-scene-morph\) var\(--ease-in-out\)/,
    )
    expect(signalPathRule).not.toContain('var(--duration-interaction)')
    expect(enhancedSignalPathTransition).toMatch(
      /block-size var\(--duration-scene-morph\) var\(--ease-in-out\)/,
    )
    expect(enhancedSignalPathTransition).toMatch(
      /inline-size var\(--duration-scene-morph\) var\(--ease-in-out\)/,
    )
    expect(enhancedSignalPathTransition).toMatch(
      /transform var\(--duration-scene-morph\) var\(--ease-in-out\)/,
    )
    expect(reducedMotionRule).toContain('transition: none !important;')
  })

  it('gates ambient motion to settled desktop High or Medium demand state and keeps the owner loop restrained', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const ambientMotion = readBalancedBlock(
      css,
      '@media (prefers-reduced-motion: no-preference) and (min-width: 769px)',
    )
    const arcLoop = readBalancedBlock(css, '@keyframes arc-machine-breathe')
    const signalLoop = readBalancedBlock(css, '@keyframes arc-signal-pulse')
    const signalRule =
      Array.from(
        css.matchAll(/^\.arcSignalPath\s*\{([^}]+)\}/gm),
        (match) => match[1],
      ).at(-1) ?? ''
    const exchangeRule = readLastRule(
      css,
      ".arcMachine[data-arc-form='exchange'] .arcSignalPath",
    )
    const forecastRule = readLastRule(
      css,
      ".arcMachine[data-arc-form='forecast'] .arcSignalPath",
    )

    for (const quality of ['high', 'medium']) {
      expect(ambientMotion).toContain(`data-universe-quality='${quality}'`)
    }
    expect(ambientMotion).toContain("data-universe-ready='true'")
    expect(ambientMotion).toContain("data-universe-render-state='demand'")
    expect(ambientMotion).toContain("data-universe-morph-phase='idle'")
    expect(ambientMotion).toContain("data-cinematic-entry='settled'")
    expect(ambientMotion).toContain(
      'animation: arc-machine-breathe 9.2s ease-in-out infinite;',
    )
    expect(ambientMotion).toContain(
      'animation: arc-signal-pulse 9.2s ease-in-out infinite;',
    )
    expect(ambientMotion).not.toMatch(/\.arcHalo\s*\{[\s\S]*?animation:/)
    expect(ambientMotion).not.toMatch(/data-universe-quality='(?:low|static)'/)
    expect(ambientMotion).not.toMatch(/data-universe-render-state='(?:always|never)'/)
    expect(ambientMotion).not.toMatch(/filter:|box-shadow:/)
    expect(arcLoop).toMatch(/translate3d\(-8px,\s*5px,\s*0\)\s*rotate\(-3deg\)/)
    expect(arcLoop).toMatch(/translate3d\(8px,\s*-6px,\s*0\)\s*rotate\(4deg\)/)
    expect(signalRule).toContain('--arc-signal-base-transform: rotate(-4deg);')
    expect(signalRule).toContain('transform: var(--arc-signal-base-transform);')
    expect(exchangeRule).toContain(
      '--arc-signal-base-transform: translate3d(-12%, 12%, 0) rotate(8deg);',
    )
    expect(forecastRule).toContain(
      '--arc-signal-base-transform: rotate(43deg);',
    )
    expect(signalLoop).toMatch(
      /var\(--arc-signal-base-transform\)\s+translate3d\(-14px,\s*0,\s*0\)\s+scaleX\(0\.9\)/,
    )
    expect(signalLoop).toMatch(
      /var\(--arc-signal-base-transform\)\s+translate3d\(14px,\s*0,\s*0\)\s+scaleX\(1\.08\)/,
    )
    expect(signalLoop).not.toMatch(/filter:|box-shadow:/)
  })

  it('keeps the Arc field stage-bounded and separates raised masses from quieter secondary geometry', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const fieldRule = readLastRule(css, '.arc::after')
    const massRule = readLastRule(css, '.arcMass')
    const haloRule = readLastRule(css, '.arcHalo')

    expect(fieldRule).toContain(
      'radial-gradient(ellipse at 58% 52%, var(--ecosystem-glow), transparent 74%, transparent 100%)',
    )
    expect(fieldRule).toContain('inset-block-start: -7.5rem;')
    expect(fieldRule).not.toMatch(/\binset-inline(?:-start|-end)?\s*:/)
    expect(fieldRule).not.toMatch(/rgba\(\s*5\s*,\s*6\s*,\s*8\s*,/)
    expect(fieldRule).toContain('z-index: 1;')
    expect(fieldRule).not.toMatch(/\boverflow(?:-[\w-]+)?\s*:|clip(?:-path)?\s*:|mask(?:-image)?\s*:/)
    expect(massRule).toMatch(/#343e4b[\s\S]*#121923/)
    expect(massRule).toMatch(/inset 1px 0 color-mix\(in srgb, var\(--node-accent\), transparent 48%\)/)
    expect(haloRule).toContain('opacity: 0.36;')
    expect(haloRule).not.toMatch(/animation:/)
  })
})
