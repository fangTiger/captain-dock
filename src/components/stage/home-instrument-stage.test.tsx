import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import AboutPage from '../../app/(content)/about/page'
import { ecosystems, projects } from '../../content/catalog'
import { HomeInstrumentStage } from './home-instrument-stage'

const projectStatements = {
  'signal-ledger': 'Every autonomous action leaves a receipt worth trusting.',
  hadron: 'Issue the asset. Watch the market find its price.',
  arcpredict: 'Uncertainty becomes a market before it becomes a decision.',
  'rialo-captain': 'Disruption becomes evidence, settlement, and a clear next move.',
} as const satisfies Record<(typeof projects)[number]['slug'], string>

function renderHomeInstrumentStage() {
  return render(
    <main id="main-content">
      <HomeInstrumentStage ecosystems={ecosystems} projects={projects} />
    </main>,
  )
}

function readLastRule(source: string, selector: string) {
  const header = `${selector} {`
  const headerIndex = source.lastIndexOf(header)

  expect(headerIndex, `${selector} 应拥有最终覆盖规则。`).toBeGreaterThanOrEqual(0)

  const openingBrace = source.indexOf('{', headerIndex + selector.length)
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

  expect(depth, `${selector} 的花括号必须平衡。`).toBe(0)

  return source.slice(openingBrace + 1, cursor - 1)
}

function findRuleWithDeclaration(
  source: string,
  selectorNeedles: string[],
  declarationNeedle: string,
) {
  const match = Array.from(source.matchAll(/([^{}]+)\{([^{}]+)\}/g)).find(
    ([, selector, rule]) =>
      selectorNeedles.every((needle) => selector.includes(needle)) &&
      rule.includes(declarationNeedle),
  )

  return {
    rule: match?.[2] ?? '',
    selector: match?.[1] ?? '',
  }
}

function compactRule(rule: string) {
  return rule.trim().replace(/\s+/g, ' ')
}

describe('HomeInstrumentStage', () => {
  function expectedAnnouncement(project: (typeof projects)[number]) {
    return `${project.name}: ${projectStatements[project.slug]}`
  }

  function expectCommittedProject(
    main: HTMLElement,
    stage: HTMLElement,
    project: (typeof projects)[number],
    projectIndex: HTMLElement,
  ) {
    const activePanel = within(stage).getByRole('region', { name: 'Active project' })
    const statement = activePanel.querySelector('[data-active-project-statement]')?.textContent ?? ''
    const activeSelector = within(projectIndex).getByRole('button', {
      name: new RegExp(project.name, 'i'),
    })
    const primary = within(activePanel).getByRole('link', {
      name: new RegExp(`Open ${project.name} case file`, 'i'),
    })
    const visibleTitle = stage.querySelector('[data-stage-title] h1')

    expect(stage).toHaveAttribute('data-active-project', project.slug)
    expect(stage).toHaveAttribute('data-committed-target', `project:${project.slug}`)
    expect(stage).toHaveAttribute('data-effective-target', `project:${project.slug}`)
    expect(visibleTitle).toHaveTextContent(project.name)
    expect(visibleTitle).toHaveAttribute('aria-label', 'A UNIVERSE OF THINGS I’VE BUILT.')
    expect(visibleTitle?.querySelectorAll('wbr')).toHaveLength(
      project.name.includes('/') ? 1 : 0,
    )
    expect(within(activePanel).queryAllByRole('heading')).toHaveLength(0)
    expect(statement).toBe(projectStatements[project.slug])
    expect(within(activePanel).getAllByRole('link')).toHaveLength(1)
    expect(primary).toHaveTextContent(/^Open case file$/)
    expect(primary).toHaveAttribute('href', `/${project.ecosystem}/${project.slug}`)
    expect(primary).toHaveAttribute('data-control-role', 'primary')
    expect(stage.querySelectorAll('[data-control-role="primary"]')).toHaveLength(1)
    expect(main.querySelectorAll(`a[href="/${project.ecosystem}/${project.slug}"]`)).toHaveLength(1)
    expect(activeSelector).toHaveAttribute('aria-pressed', 'true')
    expect(activeSelector).toHaveAttribute('aria-current', 'true')

    for (const inactiveProject of projects.filter((item) => item.slug !== project.slug)) {
      const inactiveSelector = within(projectIndex).getByRole('button', {
        name: new RegExp(inactiveProject.name, 'i'),
      })

      expect(inactiveSelector).toHaveAttribute('aria-pressed', 'false')
      expect(inactiveSelector).not.toHaveAttribute('aria-current')
      expect(
        main.querySelectorAll(
          `a[href="/${inactiveProject.ecosystem}/${inactiveProject.slug}"]`,
        ),
      ).toHaveLength(0)
    }

    const liveRegions = stage.querySelectorAll('[aria-live]')

    expect(liveRegions).toHaveLength(1)
    expect(liveRegions[0]).toHaveAttribute('data-project-reel-live')
    expect(liveRegions[0]).toHaveAttribute('aria-live', 'polite')
    expect(liveRegions[0]?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      expectedAnnouncement(project),
    )
  }

  it('synchronizes default, pointer, and keyboard commits across the complete Home reel semantics', async () => {
    const user = userEvent.setup()
    const { container } = renderHomeInstrumentStage()
    const main = container.querySelector('main#main-content')
    const stage = container.querySelector('[data-instrument-stage="home"]')

    expect(main).not.toBeNull()
    expect(stage).not.toBeNull()

    const projectIndex = within(stage as HTMLElement).getByRole('group', {
      name: 'Project reel',
    })
    const projectSelectors = within(projectIndex).getAllByRole('button')

    expect.soft(projectIndex).toHaveAttribute('id', 'project-index')
    expect.soft((main as HTMLElement).querySelectorAll('#project-index')).toHaveLength(1)
    expect.soft((main as HTMLElement).querySelector('#project-index')).toBe(projectIndex)
    expect(within(stage as HTMLElement).getAllByRole('group', { name: 'Project reel' })).toHaveLength(1)
    expect(within(stage as HTMLElement).getAllByRole('region', { name: 'Active project' })).toHaveLength(1)
    expect(stage).not.toHaveTextContent('Captain Dock')
    expect(projectSelectors).toHaveLength(projects.length)
    for (const [index, project] of projects.entries()) {
      const selector = within(projectIndex).getByRole('button', {
        name: new RegExp(project.name, 'i'),
      })

      expect(selector).toHaveAttribute('data-scene-target', `project:${project.slug}`)
      expect(selector).toHaveAttribute('aria-pressed', index === 0 ? 'true' : 'false')
    }

    const ecosystemIndex = within(stage as HTMLElement).getByRole('navigation', {
      name: 'Ecosystem stage index',
    })

    for (const ecosystem of ecosystems) {
      const link = within(ecosystemIndex).getByRole('link', {
        name: new RegExp(`${ecosystem.index}.*${ecosystem.name}`, 'i'),
      })

      expect(link).toHaveAttribute('href', `/${ecosystem.slug}`)
      expect(link).toHaveAttribute('data-scene-target', `ecosystem:${ecosystem.slug}`)
    }

    expectCommittedProject(main as HTMLElement, stage as HTMLElement, projects[0], projectIndex)

    await user.click(within(projectIndex).getByRole('button', { name: /HADRON/i }))
    expectCommittedProject(main as HTMLElement, stage as HTMLElement, projects[1], projectIndex)

    const arcPredictSelector = within(projectIndex).getByRole('button', { name: /ArcPredict/i })

    await user.keyboard('{ArrowRight}')
    expect(arcPredictSelector).toHaveFocus()
    await user.keyboard('{Enter}')
    expectCommittedProject(main as HTMLElement, stage as HTMLElement, projects[2], projectIndex)

    const rialoSelector = within(projectIndex).getByRole('button', { name: /Rialo Captain/i })

    await user.keyboard('{ArrowRight}')
    expect(rialoSelector).toHaveFocus()
    await user.keyboard(' ')
    expectCommittedProject(main as HTMLElement, stage as HTMLElement, projects[3], projectIndex)

    expect(container.querySelectorAll('main > section')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('lets effective previews drive only visual project channels until a single committed update', () => {
    const { container } = renderHomeInstrumentStage()
    const stage = container.querySelector<HTMLElement>('[data-instrument-stage="home"]')

    expect(stage).not.toBeNull()

    const projectIndex = within(stage as HTMLElement).getByRole('group', {
      name: 'Project reel',
    })
    const machine = stage?.querySelector('[data-home-monument]')
    const initialProject = projects[0]
    const hadron = projects[1]
    const arcPredict = projects[2]
    const initialStatement = stage?.querySelector('[data-active-project-statement]')?.textContent
    const initialPrimary = within(stage as HTMLElement).getByRole('link', {
      name: `Open ${initialProject.name} case file`,
    })
    const initialLive = stage?.querySelector('[data-project-reel-live]')?.textContent

    expect(stage).toHaveAttribute('data-active-project', initialProject.slug)
    expect(stage).toHaveAttribute('data-visual-project', initialProject.slug)
    expect(stage).toHaveAttribute('data-scene-motion', 'commit')
    expect(machine).toHaveAttribute('data-project-shape', initialProject.slug)
    expect(stage?.style.getPropertyValue('--stage-accent')).toBe(initialProject.theme.accent)

    const hadronSelector = within(projectIndex).getByRole('button', { name: /HADRON/i })

    fireEvent.pointerEnter(hadronSelector)

    expect(stage).toHaveAttribute('data-active-project', initialProject.slug)
    expect(stage).toHaveAttribute('data-visual-project', hadron.slug)
    expect(stage).toHaveAttribute('data-scene-motion', 'preview')
    expect(machine).toHaveAttribute('data-project-shape', hadron.slug)
    expect(stage?.style.getPropertyValue('--stage-accent')).toBe(hadron.theme.accent)
    expect(stage?.querySelector('[data-active-project-statement]')?.textContent).toBe(
      initialStatement,
    )
    expect(initialPrimary).toHaveAttribute(
      'href',
      `/${initialProject.ecosystem}/${initialProject.slug}`,
    )
    expect(initialPrimary).toHaveAttribute(
      'aria-label',
      `Open ${initialProject.name} case file`,
    )
    expect(hadronSelector).toHaveAttribute('aria-pressed', 'false')
    expect(stage?.querySelector('[data-project-reel-live]')?.textContent).toBe(initialLive)

    fireEvent.pointerLeave(hadronSelector)

    expect(stage).toHaveAttribute('data-active-project', initialProject.slug)
    expect(stage).toHaveAttribute('data-visual-project', initialProject.slug)
    expect(machine).toHaveAttribute('data-project-shape', initialProject.slug)

    const arcPredictSelector = within(projectIndex).getByRole('button', {
      name: /ArcPredict/i,
    })

    fireEvent.focus(arcPredictSelector)

    expect(stage).toHaveAttribute('data-active-project', initialProject.slug)
    expect(stage).toHaveAttribute('data-visual-project', arcPredict.slug)
    expect(stage).toHaveAttribute('data-scene-motion', 'preview')
    expect(machine).toHaveAttribute('data-project-shape', arcPredict.slug)
    expect(stage?.querySelector('[data-active-project-statement]')?.textContent).toBe(
      initialStatement,
    )
    expect(arcPredictSelector).toHaveAttribute('aria-pressed', 'false')
    expect(stage?.querySelector('[data-project-reel-live]')?.textContent).toBe(initialLive)

    fireEvent.keyDown(arcPredictSelector, { key: 'Enter' })

    expect(stage).toHaveAttribute('data-active-project', arcPredict.slug)
    expect(stage).toHaveAttribute('data-visual-project', arcPredict.slug)
    expect(stage).toHaveAttribute('data-scene-motion', 'commit')
    expect(machine).toHaveAttribute('data-project-shape', arcPredict.slug)
    expect(stage?.style.getPropertyValue('--stage-accent')).toBe(arcPredict.theme.accent)
    expect(stage?.querySelector('[data-active-project-statement]')).toHaveTextContent(
      projectStatements[arcPredict.slug],
    )
    expect(
      within(stage as HTMLElement).getByRole('link', {
        name: `Open ${arcPredict.name} case file`,
      }),
    ).toHaveAttribute('href', `/${arcPredict.ecosystem}/${arcPredict.slug}`)
    expect(arcPredictSelector).toHaveAttribute('aria-pressed', 'true')
    expect(arcPredictSelector).toHaveAttribute('aria-current', 'true')
    expect(stage?.querySelectorAll('[aria-live][data-project-reel-live]')).toHaveLength(1)
    expect(stage?.querySelector('[data-project-reel-live]')).toHaveTextContent(
      expectedAnnouncement(arcPredict),
    )

    fireEvent.pointerEnter(arcPredictSelector)

    expect(stage).toHaveAttribute('data-visual-project', arcPredict.slug)
    expect(stage).toHaveAttribute('data-scene-motion', 'commit')
  })

  it('keeps About on the same flat editorial rail without inventing contact details', () => {
    const { container } = render(<AboutPage />)
    const main = container.querySelector('[data-about-layout="editorial-rail"]')

    expect(main).not.toBeNull()
    expect(main?.querySelectorAll('[data-about-boundary]')).toHaveLength(3)
    expect(main?.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(main?.querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('keeps the mobile monument dominant while compressing copy and preserving six normal-flow index targets', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const mobileMachine =
      Array.from(css.matchAll(/\.homeMachine\s*\{([^}]+)\}/g), (match) => match[1]).find(
        (rule) => rule.includes('inline-size: calc(100% - 1.25rem);'),
      ) ?? ''
    const mobileStatement = readLastRule(css, '.activeProjectStatement')
    const mobilePrimary = readLastRule(css, '.homePrimaryLink')
    const mobileProjectReel = readLastRule(css, '.projectReel')
    const mobileProjectNode = readLastRule(css, '.projectNode')
    const ecosystemLink = readLastRule(css, '.ecosystemStageLink')
    const mobileHeadline =
      Array.from(
        css.matchAll(/\.home \.homeHeadline\s*\{([^}]+)\}/g),
        (match) => match[1],
      ).find((rule) => rule.includes('font-size: 2.6rem;')) ?? ''
    const mobileShell = readLastRule(css, '.homeMachine::before')
    const mobileOrbit = readLastRule(css, '.homeMachine::after')

    expect(mobileMachine).toContain('inline-size: calc(100% - 1.25rem);')
    expect(mobileMachine).toContain('max-inline-size: 31.75rem;')
    expect(mobileMachine).toContain('margin-inline: auto;')
    expect(mobileMachine).toContain('overflow: visible;')
    expect(mobileMachine).not.toMatch(/margin-inline(?:-start|-end)?\s*:\s*-/)
    expect(mobileShell).toContain('inset: 17% 15% 11% 20%;')
    expect(mobileOrbit).toContain('inset: 32% 9% 20% 11%;')
    expect(mobileHeadline).toContain('font-size: 2.6rem;')
    expect(mobileHeadline).toContain('overflow-wrap: normal;')
    expect(mobileHeadline).toContain('word-break: normal;')

    expect(mobileStatement).toContain('font-size: 0.9rem;')
    expect(mobileStatement).toContain('line-height: 1.45;')
    expect(mobileStatement).toContain('max-inline-size: 34ch;')
    expect(mobileStatement).not.toMatch(/line-clamp|overflow:\s*hidden/)

    expect(mobilePrimary).toContain('inline-size: fit-content;')
    expect(mobileProjectReel).toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr));',
    )
    expect(mobileProjectNode).toContain('min-block-size: var(--control-min);')
    expect(ecosystemLink).toContain('min-block-size: var(--control-min);')
  })

  it('uses a fixed compact headline at 701–768px without clipping its own stage geometry', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const compactTablet = readLastRule(
      css,
      '@media (min-width: 701px) and (max-width: 768px)',
    )
    const headlineRule = readLastRule(compactTablet, '.home .homeHeadline')
    const machineRule = readLastRule(compactTablet, '.homeMachine')

    expect(headlineRule).toContain('font-size: 1.7rem;')
    expect(headlineRule).toContain('max-inline-size: 100%;')
    expect(headlineRule).toContain('overflow-wrap: normal;')
    expect(headlineRule).toContain('word-break: normal;')
    expect(headlineRule).not.toMatch(/overflow:\s*(?:hidden|clip)|clip-path:/)
    expect(machineRule).toContain('margin-inline-end: 0;')
    expect(machineRule).not.toMatch(/inline-size:|overflow:\s*(?:hidden|clip)|clip-path:/)
  })

  it('keeps the desktop monument inside the seamless scene without clipping or shrinking it', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const desktop = readLastRule(css, '@media (min-width: 769px)')
    const machineRule = readLastRule(desktop, '.homeMachine')

    expect(machineRule).toContain('margin-inline-end: 0;')
    expect(machineRule).not.toMatch(/inline-size:|overflow:\s*(?:hidden|clip)|clip-path:/)
  })

  it('allocates Home desktop ambient animations only while idle and pauses them during morphs', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const normalMotionDesktop = readLastRule(
      css,
      '@media (prefers-reduced-motion: no-preference) and (min-width: 769px)',
    )
    const reducedMotion = readLastRule(css, '@media (prefers-reduced-motion: reduce)')
    const homeMachineAmbient = findRuleWithDeclaration(
      normalMotionDesktop,
      ['.homeMachine'],
      'animation: home-monument-breathe 8.4s ease-in-out infinite;',
    )
    const monumentBeaconAmbient = findRuleWithDeclaration(
      normalMotionDesktop,
      ['.monumentBeacon'],
      'animation: home-beacon-orbit 8.8s ease-in-out infinite;',
    )
    const homeMachineMorphPause = findRuleWithDeclaration(
      normalMotionDesktop,
      ["[data-universe-morph-phase='morphing']", '.homeMachine'],
      'animation-play-state: paused;',
    )
    const monumentBeaconMorphPause = findRuleWithDeclaration(
      normalMotionDesktop,
      ["[data-universe-morph-phase='morphing']", '.monumentBeacon'],
      'animation-play-state: paused;',
    )

    for (const selector of [homeMachineAmbient.selector, monumentBeaconAmbient.selector]) {
      expect.soft(selector).toContain("[data-universe-quality='high']")
      expect.soft(selector).toContain("[data-universe-quality='medium']")
      expect.soft(selector).toContain("[data-universe-render-state='demand']")
      expect.soft(selector).toContain("[data-universe-morph-phase='idle']")
    }

    expect.soft(homeMachineAmbient.rule).toContain('animation-play-state: running;')
    expect.soft(monumentBeaconAmbient.rule).toContain('animation-play-state: running;')
    expect.soft(homeMachineAmbient.rule).toContain('animation-delay: -4.2s;')
    expect.soft(monumentBeaconAmbient.rule).toContain('animation-delay: -4.4s;')
    expect.soft(compactRule(homeMachineMorphPause.rule)).toBe('animation-play-state: paused;')
    expect.soft(compactRule(monumentBeaconMorphPause.rule)).toBe('animation-play-state: paused;')
    expect.soft(homeMachineMorphPause.rule).not.toMatch(/\banimation(?:-name)?\s*:/)
    expect.soft(monumentBeaconMorphPause.rule).not.toMatch(/\banimation(?:-name)?\s*:/)
    expect.soft(reducedMotion).toContain('.homeMachine')
    expect.soft(reducedMotion).toContain('.monumentBeacon')
    expect.soft(reducedMotion).toContain('animation: none !important;')
  })

  it('uses the committed Hadron target planes with expanded mid-morph spacing', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const hadronPlaneOne = readLastRule(
      css,
      ".homeMachine[data-project-shape='hadron'] .monumentPlane:nth-child(1)",
    )
    const hadronPlaneTwo = readLastRule(
      css,
      ".homeMachine[data-project-shape='hadron'] .monumentPlane:nth-child(2)",
    )

    expect(hadronPlaneOne).toContain(
      'transform: translate3d(-22%, 17%, 0) skewY(-2deg) rotate(-17deg) scaleY(0.74);',
    )
    expect(hadronPlaneTwo).toContain(
      'transform: translate3d(27%, -14%, 0) skewY(4deg) rotate(18deg) scaleX(1.2);',
    )
  })

  it('defines distinct four-project mass, transform-only horizon, and accent endpoints with 220/780ms visual timing', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const previewTiming = readLastRule(css, ".home[data-scene-motion='preview']")
    const commitTiming = readLastRule(css, ".home[data-scene-motion='commit']")
    const fieldRule = readLastRule(css, '.home::after')
    const outlineRule =
      Array.from(
        css.matchAll(/\.homeMachine::before\s*\{([^}]+)\}/g),
        (match) => match[1],
      ).find((rule) =>
        rule.includes('transform var(--home-visual-duration) var(--ease-in-out)'),
      ) ?? ''
    const horizonRule = readLastRule(css, '.monumentHorizon')
    const endpoints = projects.map((project) => ({
      machine: readLastRule(
        css,
        `.homeMachine[data-project-shape='${project.slug}']::before`,
      ),
      stage: readLastRule(css, `.home[data-visual-project='${project.slug}']`),
    }))

    expect(previewTiming).toContain('--home-visual-duration: 220ms;')
    expect(commitTiming).toContain('--home-visual-duration: 780ms;')
    expect(fieldRule).toContain('opacity: var(--home-field-opacity);')
    expect(fieldRule).toContain(
      'opacity var(--home-visual-duration) var(--ease-in-out)',
    )
    expect(outlineRule).toContain(
      'transform var(--home-visual-duration) var(--ease-in-out)',
    )
    expect(horizonRule).toContain('inline-size: 84%;')
    expect(horizonRule).toContain(
      'transform: translate3d(var(--home-horizon-shift), 0, 0) rotate(var(--home-horizon-angle)) scaleX(var(--home-horizon-scale));',
    )
    expect(horizonRule).toContain(
      'transform var(--home-visual-duration) var(--ease-in-out)',
    )
    expect(horizonRule).not.toMatch(
      /inline-size\s+var\(--home-visual-duration\)/,
    )

    for (const endpoint of endpoints) {
      expect(endpoint.machine).toMatch(/\btransform:/)
      expect(endpoint.stage).toMatch(/--home-field-opacity:\s*[\d.]+;/)
      expect(endpoint.stage).toMatch(/--home-horizon-angle:\s*-?[\d.]+deg;/)
      expect(endpoint.stage).toMatch(/--home-horizon-scale:\s*[\d.]+;/)
      expect(endpoint.stage).toMatch(/--home-horizon-shift:\s*-?[\d.]+px;/)
    }

    expect(new Set(endpoints.map((endpoint) => compactRule(endpoint.machine))).size).toBe(
      projects.length,
    )
    expect(new Set(endpoints.map((endpoint) => compactRule(endpoint.stage))).size).toBe(
      projects.length,
    )
    expect(
      new Set(
        endpoints.map(
          (endpoint) =>
            endpoint.stage.match(/--home-horizon-scale:\s*([\d.]+);/)?.[1],
        ),
      ).size,
    ).toBe(projects.length)
  })

  it('keeps the Home field stage-bounded, raises monument midtones, and gives the beacon one directional orbit', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const desktopScene = readLastRule(css, '.home .scene')
    const fieldRule = readLastRule(css, '.home::after')
    const shellRule =
      Array.from(
        css.matchAll(/\.homeMachine::before\s*\{([^}]+)\}/g),
        (match) => match[1],
      ).find((rule) => rule.includes('#252d38')) ?? ''
    const planeMotionRule =
      Array.from(css.matchAll(/\.monumentPlane\s*\{([^}]+)\}/g), (match) => match[1]).find(
        (rule) => rule.includes('transition:'),
      ) ?? ''
    const planeRule = readLastRule(css, '.monumentPlane')
    const beaconLoop = readLastRule(css, '@keyframes home-beacon-orbit')

    expect(desktopScene).toContain('padding-inline-end: 2rem;')
    expect(desktopScene).not.toMatch(/overflow:\s*(?:hidden|clip)|clip-path:/)
    expect(fieldRule).toContain(
      'radial-gradient(ellipse at 66% 48%, var(--stage-accent-soft), transparent 72%, transparent 100%)',
    )
    expect(fieldRule).toContain(
      'linear-gradient(110deg, transparent 0%, rgba(241, 234, 220, 0.018) 42%, transparent 100%)',
    )
    expect(fieldRule).toContain('inset-block-start: -7.5rem;')
    expect(fieldRule).not.toMatch(/\binset-inline(?:-start|-end)?\s*:/)
    expect(fieldRule).not.toMatch(/rgba\(\s*5\s*,\s*6\s*,\s*8\s*,/)
    expect(fieldRule).toContain('z-index: 1;')
    expect(fieldRule).not.toMatch(/\boverflow(?:-[\w-]+)?\s*:|clip(?:-path)?\s*:|mask(?:-image)?\s*:/)

    expect(shellRule).toMatch(/#252d38[\s\S]*#111721/)
    expect(shellRule).toMatch(/inset 2px 0 color-mix\(in srgb, var\(--stage-accent\)/)
    expect(planeMotionRule).toContain(
      'transform var(--home-visual-duration) var(--ease-in-out)',
    )
    expect(planeMotionRule).not.toMatch(/\binline-size\b/)
    expect(planeMotionRule).not.toMatch(
      /transform\s+var\(--duration-interaction\)/,
    )
    expect(planeRule).toMatch(/#303946[\s\S]*#111821/)
    expect(planeRule).toMatch(/inset 1px 0 color-mix\(in srgb, var\(--stage-accent\)/)

    expect(css).toContain('animation: home-beacon-orbit 8.8s ease-in-out infinite;')
    expect(beaconLoop).toMatch(/opacity:\s*0\.46;[\s\S]*translate3d\(-14px,\s*5px,\s*0\)/)
    expect(beaconLoop).toMatch(/opacity:\s*1;[\s\S]*translate3d\(14px,\s*-7px,\s*0\)/)
    expect(beaconLoop).not.toMatch(/scale\(|filter:|box-shadow:/)
  })
})
