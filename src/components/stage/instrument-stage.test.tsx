import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, render } from '@testing-library/react'

import { ecosystems, projects } from '../../content/catalog'
import { HomeInstrumentStage } from './home-instrument-stage'
import { InstrumentStage } from './instrument-stage'

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

function collectInfiniteRules(source: string) {
  return Array.from(source.matchAll(/([^{}]+)\{([^{}]*\banimation\s*:[^{}]*\binfinite\b[^{}]*)\}/g), (match) => ({
    body: match[2],
    selectors: match[1]
      .split(',')
      .map((selector) => selector.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  }))
}

function collectRulesWithDeclaration(source: string, declaration: string) {
  return Array.from(source.matchAll(/([^{}]+)\{([^{}]+)\}/g), (match) => ({
    body: match[2],
    selectors: match[1]
      .split(',')
      .map((selector) => selector.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  })).filter((rule) => rule.body.includes(declaration))
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

describe('InstrumentStage contract', () => {
  it('groups one protagonist, one active readout, one primary action, and the compact index without legacy slots', () => {
    const { container } = render(
      <HomeInstrumentStage ecosystems={ecosystems} projects={projects} />,
    )
    const stage = container.querySelector('[data-instrument-stage="home"]')

    expect(stage).not.toBeNull()
    expect(stage?.querySelector('[data-stage-title]')).not.toBeNull()
    expect(stage?.querySelector('[data-stage-scene]')).not.toBeNull()
    expect(stage?.querySelector('[data-stage-index]')).not.toBeNull()
    expect(stage?.querySelectorAll('[data-stage-protagonist]')).toHaveLength(1)
    expect(stage?.querySelectorAll('[data-active-project]')).toHaveLength(1)
    expect(stage?.querySelectorAll('[data-control-role="primary"]')).toHaveLength(1)
    expect(stage?.querySelector('[data-stage-footer]')).toBeNull()
    expect(stage?.textContent).not.toMatch(/00\s*30\s*60\s*90/)
    expect(stage?.textContent).not.toMatch(/Scroll for the complete project directory/i)
  })

  it('keeps the semantic stage owner while removing the closed visual container', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const stageRule = css.match(/\.stage\s*\{([^}]+)\}/)?.[1] ?? ''
    const insetRule = css.match(/\.stage::before\s*\{([^}]+)\}/)?.[1] ?? ''
    const projectNodeRule = css.match(/\.projectNode\s*\{([^}]+)\}/)?.[1] ?? ''

    expect(stageRule).toContain('background: transparent;')
    expect(stageRule).toContain('border: 0;')
    expect(insetRule).not.toMatch(/(?:^|\s)border\s*:/)
    expect(insetRule).not.toMatch(/border-inline(?:-start|-end)?\s*:/)
    expect(projectNodeRule).toContain('background: transparent;')
    expect(projectNodeRule).toContain('border: 0;')
    expect(projectNodeRule).toMatch(/border-inline-start:/)
    expect(css).toMatch(
      /@media \(max-width: 560px\)[\s\S]*?\.stage::before\s*\{[\s\S]*?display:\s*none;/,
    )
  })

  it('keeps the Home and Arc light fields stage-bounded without a dark rectangular board', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const darkBoard =
      /rgba\(\s*(?:[0-9]|1[0-2])\s*,\s*(?:[0-9]|1[0-2])\s*,\s*(?:[0-9]|1[0-2])\s*,\s*(?:0\.[1-9]\d*|1(?:\.0+)?)\s*\)/

    for (const selector of ['.home::after', '.arc::after']) {
      const fieldRule = readLastRule(css, selector)

      expect(fieldRule).toContain('inset-block-start: -7.5rem;')
      expect(fieldRule).not.toMatch(/\binset-inline(?:-start|-end)?\s*:/)
      expect(fieldRule).toMatch(/radial-gradient\([\s\S]*?transparent 100%\)/)
      expect(fieldRule).not.toMatch(darkBoard)
      expect(fieldRule).not.toMatch(/rgba\(\s*5\s*,\s*6\s*,\s*8\s*,/)
      expect(fieldRule).not.toMatch(/\boverflow(?:-[\w-]+)?\s*:|clip(?:-path)?\s*:|mask(?:-image)?\s*:/)
    }
  })

  it('bounds the Home machine bleed by the available page gutter', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const homeMachineRule =
      Array.from(css.matchAll(/\.homeMachine\s*\{([^}]+)\}/g), (match) => match[1]).find(
        (rule) => rule.includes('inline-size: min(68vw, 64rem);'),
      ) ?? ''

    expect(homeMachineRule).toContain(
      'margin-inline-end: max(clamp(-9rem, -5vw, -2rem), calc(var(--page-gutter) * -1));',
    )
    expect(homeMachineRule).not.toContain('margin-inline-end: clamp(-9rem, -5vw, -2rem);')
  })

  it('keeps the mobile Home stage visibly overflow-safe without clipping its canvas', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const mobileHomeRule =
      Array.from(css.matchAll(/\.home\s*\{([^}]+)\}/g), (match) => match[1]).find(
        (rule) => rule.includes('grid-template-columns: minmax(0, 1fr);'),
      ) ?? ''

    expect(mobileHomeRule).toContain('overflow: visible;')
    expect(mobileHomeRule).not.toMatch(/\boverflow\s*:\s*(?:hidden|clip)\s*;/)
  })

  it('bounds the mobile Home machine bleed while preserving its composition', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const homeSceneRule =
      Array.from(css.matchAll(/\.home \.scene\s*\{([^}]+)\}/g), (match) => match[1]).find(
        (rule) => rule.includes('grid-column: 3 / 13;'),
      ) ?? ''
    const mobileHomeMachineRule =
      Array.from(css.matchAll(/\.homeMachine\s*\{([^}]+)\}/g), (match) => match[1]).find(
        (rule) => rule.includes('inline-size: 33rem;'),
      ) ?? ''

    expect(homeSceneRule).toContain('justify-items: end;')
    expect(mobileHomeMachineRule).toContain('inline-size: 33rem;')
    expect(mobileHomeMachineRule).toContain(
      'margin-inline-end: max(-13rem, calc(var(--page-gutter) * -1));',
    )
    expect(mobileHomeMachineRule).not.toContain('margin-inline-end: -13rem;')
    expect(mobileHomeMachineRule).toContain('transform: translate3d(0, 2%, 0);')
  })

  it('anchors the oversized mobile Arc machine from the container width with non-positive viewport compensation', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const mobileArcMachineRule =
      Array.from(css.matchAll(/\.arcMachine\s*\{([^}]+)\}/g), (match) => match[1]).find(
        (rule) => rule.includes('inline-size: 35rem;'),
      ) ?? ''

    expect(mobileArcMachineRule).toContain('inline-size: 35rem;')
    expect(mobileArcMachineRule).toContain('justify-self: start;')
    expect(mobileArcMachineRule).toContain('margin-inline-start: calc(100% - 35rem);')
    expect(mobileArcMachineRule).not.toContain('justify-self: end;')
    expect(mobileArcMachineRule).toContain(
      'transform: translate3d(min(0px, calc(10.5rem - 50vw + var(--page-gutter))), 0, 0);',
    )
    expect(mobileArcMachineRule).not.toContain('translate3d(-7rem, 0, 0)')
    expect(mobileArcMachineRule).not.toContain('transform: none')
  })

  it('publishes a finite 1200ms entry progression and settles reduced motion without leaking animation work', async () => {
    vi.useFakeTimers()
    const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame')
    const { container, unmount } = render(
      <InstrumentStage
        entryMotion="animate"
        index={<span>Index</span>}
        scene={<span>Scene</span>}
        title={<h1>Animated stage</h1>}
        variant="home"
      />,
    )
    const stage = container.querySelector('[data-instrument-stage="home"]')

    expect(stage).toHaveAttribute('data-cinematic-entry', 'entering')
    expect(stage).toHaveAttribute('data-cinematic-entry-progress', '0')

    act(() => {
      vi.advanceTimersByTime(600)
    })

    const midpoint = Number(stage?.getAttribute('data-cinematic-entry-progress'))

    expect(midpoint).toBeGreaterThan(0)
    expect(midpoint).toBeLessThan(1)
    expect(stage).toHaveAttribute('data-cinematic-entry', 'entering')

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(stage).toHaveAttribute('data-cinematic-entry', 'settled')
    expect(stage).toHaveAttribute('data-cinematic-entry-progress', '1')

    unmount()
    cancelAnimationFrame.mockClear()

    const pending = render(
      <InstrumentStage
        entryMotion="animate"
        index={<span>Index</span>}
        scene={<span>Scene</span>}
        title={<h1>Pending stage</h1>}
        variant="home"
      />,
    )

    pending.unmount()
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1)

    const reduced = render(
      <InstrumentStage
        entryMotion="reduced"
        index={<span>Index</span>}
        scene={<span>Scene</span>}
        title={<h1>Reduced stage</h1>}
        variant="home"
      />,
    )
    const reducedStage = reduced.container.querySelector('[data-instrument-stage="home"]')

    expect(reducedStage).toHaveAttribute('data-cinematic-entry', 'settled')
    expect(reducedStage).toHaveAttribute('data-cinematic-entry-progress', '1')
    reduced.unmount()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    const hidden = render(
      <InstrumentStage
        entryMotion="animate"
        index={<span>Index</span>}
        scene={<span>Scene</span>}
        title={<h1>Hidden stage</h1>}
        variant="home"
      />,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(hidden.container.querySelector('[data-instrument-stage="home"]')).toHaveAttribute(
      'data-cinematic-entry',
      'settled',
    )
    expect(hidden.container.querySelector('[data-instrument-stage="home"]')).toHaveAttribute(
      'data-cinematic-entry-progress',
      '1',
    )
    hidden.unmount()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    const css = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const settledRule =
      css.match(
        /\.stage\[data-cinematic-entry=['"]settled['"]\][^{]*\{([^}]+)\}/,
      )?.[1] ?? ''

    expect(settledRule).toContain('animation: none;')
    expect(settledRule).toContain('opacity: 1;')
    expect(settledRule).toContain('transform: none;')
    vi.useRealTimers()
  })

  it('binds ambient motion to rendered protagonists without restarting Home morph loops', () => {
    const stageCss = readFileSync(
      join(process.cwd(), 'src/components/stage/instrument-stage.module.css'),
      'utf8',
    )
    const rialoCss = readFileSync(
      join(process.cwd(), 'src/components/rialo/rialo-reactive-loop.module.css'),
      'utf8',
    )
    const renderedOwners = [
      readFileSync(
        join(process.cwd(), 'src/components/stage/home-instrument-stage.tsx'),
        'utf8',
      ),
      readFileSync(
        join(process.cwd(), 'src/components/stage/arc-instrument-stage.client.tsx'),
        'utf8',
      ),
      readFileSync(
        join(process.cwd(), 'src/components/rialo/rialo-reactive-loop.tsx'),
        'utf8',
      ),
    ].join('\n')
    const ambientHeader =
      '@media (prefers-reduced-motion: no-preference) and (min-width: 769px)'
    const ambientSources = [
      readBalancedBlock(stageCss, ambientHeader),
      readBalancedBlock(rialoCss, ambientHeader),
    ]
    const infiniteRules = ambientSources.flatMap(collectInfiniteRules)
    const stageAmbient = ambientSources[0]
    const rialoAmbient = ambientSources[1]
    const morphPauseRules = collectRulesWithDeclaration(
      stageAmbient,
      'animation-play-state: paused;',
    )
    const rialoIdleRunningRules = collectRulesWithDeclaration(
      rialoAmbient,
      'animation-play-state: running;',
    )
    const homeAnimationNames = {
      homeMachine: 'animation: home-monument-breathe 8.4s ease-in-out infinite;',
      monumentBeacon: 'animation: home-beacon-orbit 8.8s ease-in-out infinite;',
    } as const
    const homeOwners = Object.keys(homeAnimationNames) as Array<keyof typeof homeAnimationNames>
    const mainOwners = ['homeMachine', 'arcMachine', 'corridorPlane:first-child'] as const
    const auxiliaryOwners = ['monumentBeacon', 'arcSignalPath', 'radarRoute'] as const
    const idleGatedOwners = [
      'homeMachine',
      'arcMachine',
      'monumentBeacon',
      'arcSignalPath',
    ] as const
    const rialoOwners = ['corridorPlane:first-child', 'radarRoute'] as const

    expect(infiniteRules).toHaveLength(6)

    for (const owner of [...mainOwners, ...auxiliaryOwners]) {
      const ownerClass = owner.split(':')[0]

      expect(renderedOwners).toContain(`styles.${ownerClass}`)

      const ownerRules = infiniteRules.filter((rule) =>
        rule.selectors.some((selector) => new RegExp(`\\.${owner}$`).test(selector)),
      )
      const ownerSelectors = ownerRules.flatMap((rule) => rule.selectors)

      expect(ownerRules, `${owner} 应且只应拥有一个环境循环声明。`).toHaveLength(1)
      expect(ownerRules[0]?.body, `${owner} 应从可观察中段相位启动。`).toMatch(
        /animation-delay:\s*-\d+(?:\.\d+)?s;/,
      )
      expect(ownerSelectors.some((selector) => selector.includes("[data-universe-quality='high']")))
        .toBe(true)
      expect(
        ownerSelectors.some((selector) => selector.includes("[data-universe-quality='medium']")),
      ).toBe(true)

      for (const selector of ownerSelectors.filter((candidate) =>
        new RegExp(`\\.${owner}$`).test(candidate),
      )) {
        expect(selector).toContain("[data-universe-ready='true']")
        expect(selector).toContain("[data-universe-render-state='demand']")
        expect(selector).toMatch(/\.(?:stage|field)\[data-cinematic-entry='settled'\]/)
        expect(selector).not.toMatch(/::(?:before|after)$/)

        if (idleGatedOwners.includes(owner as (typeof idleGatedOwners)[number])) {
          expect(selector).toContain("[data-universe-morph-phase='idle']")
        } else {
          expect(selector).not.toContain('data-universe-morph-phase')
        }
      }
    }

    for (const owner of rialoOwners) {
      const stableRule = infiniteRules.find((rule) =>
        rule.selectors.some((selector) => new RegExp(`\\.${owner}$`).test(selector)),
      )
      const idleRules = rialoIdleRunningRules.filter((rule) =>
        rule.selectors.some((selector) => new RegExp(`\\.${owner}$`).test(selector)),
      )
      const idleSelectors =
        idleRules[0]?.selectors.filter((selector) => new RegExp(`\\.${owner}$`).test(selector)) ?? []
      const stablePlayStates = Array.from(
        stableRule?.body.matchAll(/animation-play-state\s*:\s*([^;]+);/g) ?? [],
        (match) => match[1].trim(),
      )

      expect(stablePlayStates, `${owner} 的稳定声明必须且只能以 paused 为最终状态。`).toEqual([
        'paused',
      ])
      expect(stablePlayStates.join(' '), `${owner} 的稳定声明不得同时包含 running。`).not.toMatch(
        /\brunning\b/,
      )
      expect(idleRules, `${owner} 只应由一条 idle 规则恢复运行。`).toHaveLength(1)
      expect(idleRules[0]?.body.trim().replace(/\s+/g, ' ')).toBe(
        'animation-play-state: running;',
      )
      expect(idleSelectors).toHaveLength(2)
      expect(idleSelectors.some((selector) => selector.includes("[data-universe-quality='high']")))
        .toBe(true)
      expect(
        idleSelectors.some((selector) => selector.includes("[data-universe-quality='medium']")),
      ).toBe(true)

      for (const selector of idleSelectors) {
        expect(selector).toContain("[data-universe-ready='true']")
        expect(selector).toContain("[data-universe-render-state='demand']")
        expect(selector).toContain("[data-universe-morph-phase='idle']")
        expect(selector).toMatch(/\.field\[data-cinematic-entry='settled'\]/)
        expect(selector).not.toMatch(/::(?:before|after)$/)
      }
    }

    for (const owner of homeOwners) {
      const ambientRule = infiniteRules.find((rule) =>
        rule.selectors.some((selector) => new RegExp(`\\.${owner}$`).test(selector)),
      )
      const pauseRule = morphPauseRules.find((rule) =>
        rule.selectors.some((selector) => new RegExp(`\\.${owner}$`).test(selector)),
      )
      const pauseSelectors =
        pauseRule?.selectors.filter((selector) => new RegExp(`\\.${owner}$`).test(selector)) ?? []

      expect(ambientRule?.body).toContain(homeAnimationNames[owner])
      expect(ambientRule?.body).toContain('animation-play-state: running;')
      expect(pauseRule?.body.trim().replace(/\s+/g, ' ')).toBe('animation-play-state: paused;')
      expect(pauseSelectors.some((selector) => selector.includes("[data-universe-quality='high']")))
        .toBe(true)
      expect(
        pauseSelectors.some((selector) => selector.includes("[data-universe-quality='medium']")),
      ).toBe(true)
      for (const selector of pauseSelectors) {
        expect(selector).toContain("[data-universe-ready='true']")
        expect(selector).toContain("[data-universe-render-state='demand']")
        expect(selector).toContain("[data-universe-morph-phase='morphing']")
        expect(selector).toMatch(/\.stage\[data-cinematic-entry='settled'\]/)
        expect(selector).not.toMatch(/::(?:before|after)$/)
      }
    }

    for (const owner of mainOwners) {
      const animation = infiniteRules.find((rule) =>
        rule.selectors.some((selector) => new RegExp(`\\.${owner}$`).test(selector)),
      )?.body
      const duration = Number.parseFloat(animation?.match(/animation\s*:[^;]*\s(\d+(?:\.\d+)?)s\b/)?.[1] ?? '')

      expect(duration, `${owner} 主循环必须在 7–10 秒内。`).toBeGreaterThanOrEqual(7)
      expect(duration, `${owner} 主循环必须在 7–10 秒内。`).toBeLessThanOrEqual(10)
    }

    expect(ambientSources.join('\n')).not.toMatch(/\.arcCore\b/)
    expect(ambientSources.join('\n')).not.toMatch(/\.radarSweep\b/)
    expect(ambientSources.join('\n')).not.toMatch(/\.arcHalo\b/)

    const homeBeaconLoop = readBalancedBlock(stageCss, '@keyframes home-beacon-orbit')
    const arcSignalLoop = readBalancedBlock(stageCss, '@keyframes arc-signal-pulse')

    expect(homeBeaconLoop).toMatch(/translate3d\(-14px,\s*5px,\s*0\)/)
    expect(homeBeaconLoop).toMatch(/translate3d\(14px,\s*-7px,\s*0\)/)
    expect(homeBeaconLoop).not.toMatch(/scale\(/)
    expect(arcSignalLoop).toContain('var(--arc-signal-base-transform)')
    expect(arcSignalLoop).toMatch(/translate3d\(-14px,\s*0,\s*0\)\s+scaleX\(0\.9\)/)
    expect(arcSignalLoop).toMatch(/translate3d\(14px,\s*0,\s*0\)\s+scaleX\(1\.08\)/)
  })

  it('caps the immersive main-to-footer rhythm without shrinking viewport-bound stages', () => {
    const pageCss = readFileSync(
      join(process.cwd(), 'src/styles/universe-pages.module.css'),
      'utf8',
    )
    const immersiveMain = readBalancedBlock(
      pageCss,
      ':global(#main-content).homePage,\n:global(#main-content).ecosystemPage',
    )
    // 共享块只负责定位与宽度，不绑定高度
    expect(immersiveMain).not.toMatch(/(?:block-size|min-block-size|max-block-size)\s*:/)
    // 生态页仍需 main 与 footer 之间的呼吸；首页零滚动且不渲染 footer，故该节奏不适用于它
    expect(pageCss).toContain('padding-block-end: clamp(20px, 2vw, 40px);')
    // 首页门面高度由 body flex 链分配，不得再硬编码 header 高度——
    // 5rem 只在桌面接近真值（实测 73px），移动端 header 换行后是 134px，
    // 硬编码会让文档比视口高出 54px。
    expect(pageCss).not.toContain('calc(100svh - 5rem)')
    expect(pageCss).toContain('grid-template-rows: minmax(0, 1fr) auto;')
  })
})
