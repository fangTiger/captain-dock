import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ecosystems, projects } from '../../content/catalog'
import type { CoreLoopStep } from '../../content/types'
import { RIALO_STEP_SIGNALS } from '../scene/scene-types'

import { RialoReactiveLoop } from './rialo-reactive-loop'

function readBalancedBlock(source: string, header: string) {
  const headerIndex = source.indexOf(header)

  expect(headerIndex, `${header} 应存在。`).toBeGreaterThanOrEqual(0)

  const openingBrace = source.indexOf('{', headerIndex + header.length)

  expect(openingBrace, `${header} 应包含声明块。`).toBeGreaterThanOrEqual(0)

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

function readRule(source: string, selector: string) {
  const header = `${selector} {`
  const headerIndex = source.indexOf(header)

  expect(headerIndex, `${selector} 应拥有独立规则。`).toBeGreaterThanOrEqual(0)

  return readBalancedBlock(source.slice(headerIndex), selector)
}

function readTopLevelRules(source: string) {
  const rules: Array<{ declarations: string; selectors: string[] }> = []
  let cursor = 0

  while (cursor < source.length) {
    const openingBrace = source.indexOf('{', cursor)

    if (openingBrace < 0) {
      break
    }

    const selectorText = source.slice(cursor, openingBrace).trim()
    let depth = 1
    let closingBrace = openingBrace + 1

    while (closingBrace < source.length && depth > 0) {
      if (source[closingBrace] === '{') {
        depth += 1
      } else if (source[closingBrace] === '}') {
        depth -= 1
      }
      closingBrace += 1
    }

    expect(depth, `${selectorText} 的花括号必须平衡。`).toBe(0)
    rules.push({
      declarations: source.slice(openingBrace + 1, closingBrace - 1),
      selectors: selectorText.split(',').map((selector) => selector.trim()),
    })
    cursor = closingBrace
  }

  return rules
}

function readRuleForSelector(
  rules: ReturnType<typeof readTopLevelRules>,
  selector: string,
) {
  const rule = rules.find((candidate) => candidate.selectors.includes(selector))

  expect(rule, `${selector} 应拥有匹配规则。`).toBeDefined()

  return rule!
}

function countClassAndAttributeSpecificity(selector: string) {
  return selector.match(/(?:\.[A-Za-z_][\w-]*|\[[^\]]+\])/g)?.length ?? 0
}

const rialoProject = projects.find((project) => project.slug === 'rialo-captain')

if (!rialoProject) {
  throw new Error('测试目录中缺少 Rialo Captain 项目。')
}

const rialoLoop = rialoProject.coreLoop
const rialoEcosystem = ecosystems.find((ecosystem) => ecosystem.slug === 'rialo')
const signals = ['Observe', 'Cover', 'Trigger', 'Settle', 'Explain'] as const

if (!rialoEcosystem) {
  throw new Error('测试目录中缺少 Rialo 生态。')
}

function renderLoop(coreLoop: readonly CoreLoopStep[] = rialoLoop) {
  return render(
    <RialoReactiveLoop coreLoop={coreLoop} ecosystem={rialoEcosystem} project={rialoProject} />,
  )
}

function getStepButton(signal: (typeof signals)[number], label: string) {
  return screen.getByRole('button', {
    name: new RegExp(`${signal}.*${label}`),
  })
}

function expectActiveReadout(stepIndex: number) {
  const step = rialoLoop[stepIndex]
  const signal = signals[stepIndex]
  const readout = screen.getByTestId('rialo-active-readout')
  const stage = document.querySelector('[data-instrument-stage="rialo"]')
  const primary = within(stage as HTMLElement).getByRole('link', {
    name: /Open Rialo Captain case file/i,
  })

  expect(within(readout).getByText(signal)).toBeInTheDocument()
  expect(within(readout).getByRole('heading', { level: 3, name: signal })).toBeInTheDocument()
  expect(within(readout).queryByText(step.description)).not.toBeInTheDocument()
  expect(primary).toHaveTextContent(/^Open case file$/)
  expect(stage).toHaveAttribute('data-committed-target', `rialo-step:${RIALO_STEP_SIGNALS[stepIndex]}`)
  expect(stage).toHaveAttribute('data-effective-target', `rialo-step:${RIALO_STEP_SIGNALS[stepIndex]}`)
  expect(primary).toHaveAttribute('data-control-role', 'primary')
  expect(primary).toHaveAttribute('href', '/rialo/rialo-captain')
  expect(stage?.querySelectorAll('[data-control-role="primary"]')).toHaveLength(1)
  expect(stage?.querySelector('[data-active-project-statement]')).toHaveTextContent(
    'Disruption becomes evidence, settlement, and a clear next move.',
  )
  expect(stage?.querySelectorAll('[data-rialo-step-description]:not([hidden])')).toHaveLength(1)
  expect(stage?.querySelectorAll('[data-rialo-step-description]')[stepIndex]).not.toHaveAttribute(
    'hidden',
  )

  for (const [index, candidate] of rialoLoop.entries()) {
    const candidateButton = getStepButton(signals[index], candidate.label)

    expect(candidateButton).toHaveAttribute('aria-pressed', index === stepIndex ? 'true' : 'false')
    if (index === stepIndex) {
      expect(candidateButton).toHaveAttribute('aria-current', 'step')
    } else {
      expect(candidateButton).not.toHaveAttribute('aria-current')
    }
  }

  const liveRegions = stage?.querySelectorAll('[aria-live]') ?? []

  expect(liveRegions).toHaveLength(1)
  expect(liveRegions[0]).toHaveAttribute('data-rialo-live')
  expect(liveRegions[0]).toHaveAttribute('aria-live', 'polite')
  expect(liveRegions[0]?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
    `${signal}: ${step.label}. ${step.description}`,
  )
}

describe('RialoReactiveLoop', () => {
  it('renders five readable stages and defaults to Observe as the active readout', () => {
    const { container } = renderLoop()

    const buttons = screen.getAllByRole('button')

    expect(container.querySelector('[data-instrument-stage="rialo"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-rialo-reactive-loop]')).toHaveLength(1)
    expect(screen.getAllByTestId('rialo-active-readout')).toHaveLength(1)
    expect(container.querySelector('[data-instrument-stage="rialo"]')).not.toHaveTextContent(
      'Rialo / reactive systems',
    )
    expect(buttons).toHaveLength(5)

    for (const [index, step] of rialoLoop.entries()) {
      const button = getStepButton(signals[index], step.label)

      expect(button).toHaveAttribute('data-scene-target', `rialo-step:${RIALO_STEP_SIGNALS[index]}`)
      expect(screen.getAllByText(signals[index])).not.toHaveLength(0)
      expect(screen.getAllByText(step.label)).not.toHaveLength(0)
      expect(button).toHaveAttribute('aria-pressed', index === 0 ? 'true' : 'false')
      expect(button).toHaveAttribute('tabindex', index === 0 ? '0' : '-1')
    }

    const stepDescriptions = container.querySelectorAll('[data-rialo-step-description]')

    expect(stepDescriptions).toHaveLength(rialoLoop.length)
    expect(container.querySelectorAll('[data-rialo-step-description]:not([hidden])')).toHaveLength(1)
    expect(stepDescriptions[0]).toHaveTextContent(rialoLoop[0].description)
    for (const description of Array.from(stepDescriptions).slice(1)) {
      expect(description).toHaveAttribute('hidden')
    }

    expect(getStepButton('Observe', rialoLoop[0].label)).toHaveAttribute('aria-current', 'step')
    expect(getStepButton('Cover', rialoLoop[1].label)).not.toHaveAttribute('aria-current')
    expect(
      container.querySelectorAll('button[data-control-role="stage"][data-scene-target]'),
    ).toHaveLength(RIALO_STEP_SIGNALS.length)
    expect(screen.getByTestId('rialo-active-readout')).not.toHaveAttribute('data-scene-target')
    expectActiveReadout(0)
  })

  it('updates readout and ARIA state when Cover is clicked', async () => {
    const user = userEvent.setup()

    renderLoop()
    await user.click(getStepButton('Cover', rialoLoop[1].label))

    expect(getStepButton('Observe', rialoLoop[0].label)).toHaveAttribute('aria-pressed', 'false')
    expect(getStepButton('Observe', rialoLoop[0].label)).not.toHaveAttribute('aria-current')
    expect(getStepButton('Cover', rialoLoop[1].label)).toHaveAttribute('aria-pressed', 'true')
    expect(getStepButton('Cover', rialoLoop[1].label)).toHaveAttribute('aria-current', 'step')
    expect(document.querySelectorAll('[data-rialo-step-description]:not([hidden])')).toHaveLength(1)
    expect(document.querySelectorAll('[data-rialo-step-description]')[1]).not.toHaveAttribute('hidden')
    expectActiveReadout(1)
  })

  it('exposes immediate finite Trigger event state without adding another primary action', async () => {
    const user = userEvent.setup()
    const { container } = renderLoop()
    const trigger = getStepButton('Trigger', rialoLoop[2].label)

    await user.click(trigger)

    const field = container.querySelector('[data-rialo-reactive-loop]')

    expect(field).toHaveAttribute('data-rialo-event', 'trigger')
    expect(field).toHaveAttribute('data-rialo-event-phase', 'active')
    expect(field).toHaveAttribute('data-committed-target', 'rialo-step:trigger')
    expect(field?.querySelectorAll('[data-control-role="primary"]')).toHaveLength(1)
    expect(within(field as HTMLElement).getByRole('link', { name: /Open Rialo Captain case file/i }))
      .toHaveAttribute('href', '/rialo/rialo-captain')
    expect(field?.querySelector('[data-rialo-live][aria-live="polite"]')).toHaveTextContent(
      `${signals[2]}: ${rialoLoop[2].label}. ${rialoLoop[2].description}`,
    )
    expect(trigger).toHaveAttribute('aria-pressed', 'true')
    expect(trigger).toHaveAttribute('aria-current', 'step')
    expect(container.querySelectorAll('[data-rialo-step-description]:not([hidden])')).toHaveLength(1)
    expect(container.querySelectorAll('[data-rialo-step-description]')[2]).not.toHaveAttribute('hidden')
    expectActiveReadout(2)
  })

  it('moves focus with ArrowRight and activates the focused step with Enter', async () => {
    const user = userEvent.setup()

    renderLoop()
    getStepButton('Observe', rialoLoop[0].label).focus()

    await user.keyboard('{ArrowRight}')
    expect(getStepButton('Cover', rialoLoop[1].label)).toHaveFocus()
    expect(getStepButton('Observe', rialoLoop[0].label)).toHaveAttribute('aria-pressed', 'true')
    expect(getStepButton('Cover', rialoLoop[1].label)).toHaveAttribute('aria-pressed', 'false')
    expectActiveReadout(0)

    await user.keyboard('{Enter}')
    expect(getStepButton('Cover', rialoLoop[1].label)).toHaveAttribute('aria-pressed', 'true')
    expectActiveReadout(1)

    await user.keyboard('{ArrowLeft}')
    expect(getStepButton('Observe', rialoLoop[0].label)).toHaveFocus()
    expect(getStepButton('Cover', rialoLoop[1].label)).toHaveAttribute('aria-pressed', 'true')
  })

  it('supports ArrowUp, ArrowDown, Home, End, and Space without selecting on focus movement', async () => {
    const user = userEvent.setup()

    renderLoop()
    getStepButton('Observe', rialoLoop[0].label).focus()

    await user.keyboard('{End}')
    expect(getStepButton('Explain', rialoLoop[4].label)).toHaveFocus()
    expect(getStepButton('Observe', rialoLoop[0].label)).toHaveAttribute('aria-pressed', 'true')

    await user.keyboard(' ')
    expect(getStepButton('Explain', rialoLoop[4].label)).toHaveAttribute('aria-pressed', 'true')
    expectActiveReadout(4)

    await user.keyboard('{Home}')
    expect(getStepButton('Observe', rialoLoop[0].label)).toHaveFocus()
    expect(getStepButton('Explain', rialoLoop[4].label)).toHaveAttribute('aria-pressed', 'true')

    await user.keyboard(' ')
    expect(getStepButton('Observe', rialoLoop[0].label)).toHaveAttribute('aria-pressed', 'true')
    expectActiveReadout(0)

    await user.keyboard('{ArrowDown}')
    expect(getStepButton('Cover', rialoLoop[1].label)).toHaveFocus()
    expect(getStepButton('Observe', rialoLoop[0].label)).toHaveAttribute('aria-pressed', 'true')

    await user.keyboard('{ArrowUp}')
    expect(getStepButton('Observe', rialoLoop[0].label)).toHaveFocus()
    expect(getStepButton('Observe', rialoLoop[0].label)).toHaveAttribute('aria-pressed', 'true')
  })

  it('fails fast when coreLoop does not contain exactly five steps', () => {
    expect(() => renderLoop(rialoLoop.slice(0, 4))).toThrow(
      'RialoReactiveLoop requires exactly five core loop steps.',
    )
  })

  it('owns every cross-module stage slot with stronger specificity and encodes the desktop and 390px terminal geometry', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/rialo/rialo-reactive-loop.module.css'),
      'utf8',
    )
    const sharedIndexSelector = '.stage:has(.readout) .index'
    const slotSelectors = {
      title: '[data-rialo-reactive-loop].field.field > [data-stage-title]',
      scene: '[data-rialo-reactive-loop].field.field > [data-stage-scene]',
      readout: '[data-rialo-reactive-loop].field.field > [data-stage-readout]',
      index: '[data-rialo-reactive-loop].field.field > [data-stage-index]',
    } as const
    const fieldRule = readRule(css, '.field.field')
    const titleRule = readRule(css, slotSelectors.title)
    const sceneRule = readRule(css, slotSelectors.scene)
    const readoutSlotRule = readRule(css, slotSelectors.readout)
    const indexRule = readRule(css, slotSelectors.index)
    const titleContentRule = readRule(css, '.field > [data-stage-title] > *')
    const readoutRule = readRule(css, '.readout')
    const compact = readBalancedBlock(
      css,
      '@media (max-width: 1279px) and (min-width: 561px)',
    )
    const compactReadoutRule = readRule(compact, '.readout')
    const mobile = readBalancedBlock(css, '@media (max-width: 700px)')
    const mobileRadarRule = readRule(mobile, '.radar')
    const mobileRadarFieldRule = readRule(mobile, '.radar::before')
    const mobileFieldRule = readRule(mobile, '.field.field')
    const mobileTitleRule = readRule(mobile, '.field .ecosystemTitle')
    const mobileTitleFontSizeRem = Number(
      mobileTitleRule.match(/font-size:\s*([\d.]+)rem;/)?.[1] ?? Number.NaN,
    )
    const mobileTitleLineHeight = Number(
      mobileTitleRule.match(/line-height:\s*([\d.]+);/)?.[1] ?? Number.NaN,
    )
    const sharedIndexSpecificity = countClassAndAttributeSpecificity(sharedIndexSelector)

    expect(fieldRule).toContain(
      'grid-template-columns: minmax(0, 2fr) minmax(28ch, 1fr);',
    )
    expect(fieldRule).toContain('max-block-size: calc(100svh - 5rem);')
    expect(fieldRule).toContain('overflow: visible;')
    expect(titleRule).toContain('grid-column: 2;')
    expect(sceneRule).toContain('grid-column: 1;')
    expect(readoutSlotRule).toContain('grid-column: 2;')
    expect(indexRule).toContain('grid-column: 1 / -1;')
    expect(titleContentRule).toContain('overflow-wrap: normal;')
    expect(titleContentRule).toContain('word-break: normal;')
    expect(readoutRule).toContain('max-inline-size: 36ch;')
    expect(readoutRule).toContain('min-inline-size: 28ch;')
    expect(compactReadoutRule).toContain('inline-size: 100%;')
    expect(compactReadoutRule).toContain('max-inline-size: 100%;')
    expect(compactReadoutRule).toContain('min-inline-size: 0;')
    expect(css).not.toMatch(/\.field\s+\.title\s*\{/)
    expect(css).not.toMatch(/\.field\s+\.scene\s*\{/)
    expect(css).not.toMatch(/\.field\s+\.index\s*,/)
    expect(sharedIndexSpecificity).toBe(3)

    for (const selector of Object.values(slotSelectors)) {
      expect(selector).toContain('[data-rialo-reactive-loop]')
      expect(countClassAndAttributeSpecificity(selector)).toBeGreaterThan(sharedIndexSpecificity)
      expect(readRule(css, selector)).not.toContain('!important')
    }
    expect(countClassAndAttributeSpecificity(slotSelectors.index)).toBeGreaterThan(
      sharedIndexSpecificity,
    )

    for (const [slot, order] of [
      ['title', 1],
      ['scene', 2],
      ['readout', 3],
      ['index', 4],
    ] as const) {
      const rule = readRule(mobile, slotSelectors[slot])

      expect(rule).toContain('grid-column: 1;')
      expect(rule).toContain('grid-row: auto;')
      expect(rule).toContain(`order: ${order};`)
    }

    expect(mobileRadarRule).toContain('inline-size: 100%;')
    expect(mobileRadarRule).toContain('max-inline-size: 100%;')
    expect(mobileRadarRule).toContain('margin-inline: 0;')
    expect(mobileRadarRule).toContain('overflow: visible;')
    expect(mobileRadarFieldRule).toContain('inset: 0;')
    expect(mobileFieldRule).toContain('gap: 0;')
    expect(mobileFieldRule).toMatch(
      /linear-gradient\(180deg,\s*transparent 0,\s*rgba\(138, 232, 116, 0\.28\)/,
    )
    expect(mobileFieldRule).toMatch(/radial-gradient\(circle at 24% 38%/)
    expect(mobileTitleFontSizeRem).toBe(3)
    expect(mobileTitleLineHeight).toBeGreaterThan(1)
    expect(mobileTitleFontSizeRem * 16 * mobileTitleLineHeight).toBeGreaterThanOrEqual(51)
    expect(mobileTitleRule).not.toMatch(/(?:^|\n)\s*(?:block-size|max-block-size)\s*:/)
    expect(mobile).not.toMatch(/margin-inline(?:-start|-end)?\s*:\s*-/)
  })

  it('uses one active datum instead of a readout rail and five repeated task borders', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/rialo/rialo-reactive-loop.module.css'),
      'utf8',
    )
    const readoutRule = css.match(/\.readout\s*\{([^}]+)\}/)?.[1] ?? ''
    const buttonRule = css.match(/\.stageButton\s*\{([^}]+)\}/)?.[1] ?? ''
    const interactionRule = readRule(
      css,
      '.stageButton:hover,\n.stageButton:focus-visible,\n.stage[data-active="true"] .stageButton',
    )
    const activeRule = readRule(css, ".stage[data-active='true'] .stageButton::before")
    const focusRule = readRule(css, '.stageButton:focus-visible')

    expect(readoutRule).toContain('background: transparent;')
    expect(readoutRule).toContain('border: 0;')
    expect(readoutRule).not.toMatch(/border-inline-start:/)
    expect(buttonRule).toContain('background: transparent;')
    expect(buttonRule).toContain('border: 0;')
    expect(buttonRule).toContain(
      'color var(--duration-interaction) var(--ease-out)',
    )
    expect(buttonRule).not.toMatch(/border-block-start:/)
    expect(interactionRule).toContain('color: var(--color-rialo-radar);')
    expect(interactionRule).not.toMatch(/transform:/)
    expect(css).not.toContain('transform: translateX(0.2rem);')
    expect(activeRule).toContain('block-size: 1px;')
    expect(activeRule).toContain('background: var(--color-rialo-radar);')
    expect(focusRule).toContain('outline: 2px solid var(--color-rialo-radar);')
  })

  it('decouples stable corridor ambient channels from the committed transform lifecycle', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/rialo/rialo-reactive-loop.module.css'),
      'utf8',
    )
    const ambientMotion = readBalancedBlock(
      css,
      '@media (prefers-reduced-motion: no-preference) and (min-width: 769px)',
    )
    const ambientRules = readTopLevelRules(ambientMotion)
    const corridorLoop = readBalancedBlock(css, '@keyframes rialo-corridor-breathe')
    const routeLoop = readBalancedBlock(css, '@keyframes rialo-route-advance')
    const reducedMotion = readBalancedBlock(css, '@media (prefers-reduced-motion: reduce)')
    const reducedRules = readTopLevelRules(reducedMotion)
    const lifecyclePrefix = (quality: 'high' | 'medium', idle = false) =>
      `:global([data-universe-ready='true'][data-universe-quality='${quality}'][data-universe-render-state='demand']${idle ? "[data-universe-morph-phase='idle']" : ''}) .field[data-cinematic-entry='settled']`
    const stableCorridorSelectors = (['high', 'medium'] as const).map(
      (quality) => `${lifecyclePrefix(quality)} .corridorPlane:first-child`,
    )
    const stableRouteSelectors = (['high', 'medium'] as const).map(
      (quality) => `${lifecyclePrefix(quality)} .radarRoute`,
    )
    const idleOwnerSelectors = (['high', 'medium'] as const).flatMap((quality) => [
      `${lifecyclePrefix(quality, true)} .corridorPlane:first-child`,
      `${lifecyclePrefix(quality, true)} .radarRoute`,
    ])
    const corridorAnimationRules = ambientRules.filter((rule) =>
      rule.declarations.includes('animation: rialo-corridor-breathe'),
    )
    const routeAnimationRules = ambientRules.filter((rule) =>
      rule.declarations.includes('animation: rialo-route-advance'),
    )

    expect(corridorAnimationRules).toHaveLength(1)
    expect(corridorAnimationRules[0]?.selectors).toEqual(stableCorridorSelectors)
    expect(routeAnimationRules).toHaveLength(1)
    expect(routeAnimationRules[0]?.selectors).toEqual(stableRouteSelectors)
    expect(
      ambientRules.some(
        (rule) =>
          rule.selectors.some((selector) => selector.endsWith(' .radar')) &&
          rule.declarations.includes('rialo-corridor-breathe'),
      ),
    ).toBe(false)

    for (const selector of [...stableCorridorSelectors, ...stableRouteSelectors]) {
      const rule = readRuleForSelector(ambientRules, selector)

      expect(selector).not.toContain('data-universe-morph-phase')
      expect(rule.declarations).toContain('animation-delay: -4.4s;')
      expect(rule.declarations).toContain('animation-play-state: paused;')
      expect(rule.declarations).not.toMatch(/filter:|box-shadow:/)
    }

    for (const selector of idleOwnerSelectors) {
      const rule = readRuleForSelector(ambientRules, selector)

      expect(rule.declarations).toContain('animation-play-state: running;')
      expect(rule.declarations).not.toMatch(
        /animation-(?:name|duration|delay|timing-function|iteration-count)\s*:|animation\s*:/,
      )
    }

    expect(ambientMotion).not.toMatch(/data-universe-quality='(?:low|static)'/)
    expect(ambientMotion).not.toMatch(/data-universe-render-state='(?:always|never)'/)
    expect(css.match(/animation:\s*rialo-corridor-breathe\b/g)).toHaveLength(1)
    expect(css.match(/animation:\s*rialo-route-advance\b/g)).toHaveLength(1)

    const corridorOffsets = [...corridorLoop.matchAll(/translate:\s*(-?[\d.]+)px\s+(-?[\d.]+)px;/g)]
      .map((match) => ({
        x: Number(match[1]),
        y: Number(match[2]),
      }))
    const horizontalTravel =
      Math.max(...corridorOffsets.map(({ x }) => x)) -
      Math.min(...corridorOffsets.map(({ x }) => x))
    const verticalTravel =
      Math.max(...corridorOffsets.map(({ y }) => y)) -
      Math.min(...corridorOffsets.map(({ y }) => y))

    expect(corridorOffsets).toHaveLength(2)
    expect(horizontalTravel).toBeGreaterThanOrEqual(11)
    expect(horizontalTravel).toBeLessThanOrEqual(13)
    expect(verticalTravel).toBeGreaterThanOrEqual(6)
    expect(verticalTravel).toBeLessThanOrEqual(8)
    expect(corridorLoop).not.toMatch(/(?:^|\n)\s*transform\s*:/)

    const routeProperties = [...routeLoop.matchAll(/(?:^|\n)\s*([\w-]+)\s*:/g)].map(
      (match) => match[1],
    )

    expect(routeProperties.length).toBeGreaterThan(0)
    expect(new Set(routeProperties)).toEqual(new Set(['opacity']))
    expect(routeLoop).not.toMatch(/(?:transform|translate|rotate|scale)\s*:/)

    const reducedCorridorRule = readRuleForSelector(reducedRules, '.corridorPlane:first-child')
    const reducedRouteRule = readRuleForSelector(reducedRules, '.radarRoute')

    expect(reducedCorridorRule.declarations).toContain('animation: none !important;')
    expect(reducedRouteRule.declarations).toContain('animation: none !important;')

    const transitionSelectors = (['high', 'medium'] as const).map(
      (quality) =>
        `:global([data-universe-ready='true'][data-universe-quality='${quality}'][data-universe-render-state='demand']) .corridorPlane`,
    )

    for (const selector of transitionSelectors) {
      expect(readRuleForSelector(ambientRules, selector).declarations).toContain(
        'transition: transform var(--duration-scene-morph) var(--ease-in-out);',
      )
    }

    for (const signal of RIALO_STEP_SIGNALS) {
      expect(
        readRule(css, `.radar[data-rialo-active-signal='${signal}'] .corridorPlane`),
      ).toMatch(/transform:\s*[^;]+;/)
    }
  })

  it('keeps five 44px accessible stages while visually compressing only inactive titles at 420px', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/rialo/rialo-reactive-loop.module.css'),
      'utf8',
    )
    const mobileDensity = readBalancedBlock(css, '@media (max-width: 420px)')
    const inactiveTitle = readRule(
      mobileDensity,
      ".stage:not([data-active='true']) .stageTitle",
    )
    const activeTitle = readRule(mobileDensity, ".stage[data-active='true'] .stageTitle")
    const button = readRule(css, '.stageButton')

    expect(button).toContain('min-block-size: var(--control-min);')
    expect(inactiveTitle).toContain('block-size: 1px;')
    expect(inactiveTitle).toContain('clip-path: inset(50%);')
    expect(inactiveTitle).toContain('inline-size: 1px;')
    expect(inactiveTitle).toContain('overflow: hidden;')
    expect(inactiveTitle).toContain('position: absolute;')
    expect(inactiveTitle).not.toMatch(/display:\s*none|visibility:\s*hidden/)
    expect(activeTitle).toContain('position: static;')
    expect(activeTitle).toContain('clip-path: none;')
    expect(mobileDensity).not.toMatch(
      /\.stage:not\(\[data-active='true'\]\)\s+\.stageSignal\s*\{[^}]*display:\s*none/,
    )
  })
})
