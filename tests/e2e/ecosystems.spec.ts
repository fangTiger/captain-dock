import { expect, test } from '@playwright/test'
import type { Browser, BrowserContext, Locator, Page } from '@playwright/test'

import { ecosystems, projects } from '../../src/content/catalog'

const exactProjectStatements: Readonly<Record<string, string>> = {
  arcpredict: 'Uncertainty becomes a market before it becomes a decision.',
  hadron: 'Issue the asset. Watch the market find its price.',
  'rialo-captain': 'Disruption becomes evidence, settlement, and a clear next move.',
  'signal-ledger': 'Every autonomous action leaves a receipt worth trusting.',
}
const arcModeLabels = ['Research', 'Exchange', 'Forecast'] as const
const rialoSignals = ['Observe', 'Cover', 'Trigger', 'Settle', 'Explain'] as const

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth
    const viewportWidth = document.documentElement.clientWidth
    const bodyWidth = document.body.scrollWidth

    return documentWidth > viewportWidth || bodyWidth > viewportWidth
  })

  expect(hasOverflow).toBe(false)
}

async function expectKeyboardCanReach(page: Page, label: string, target: Locator) {
  await expect(target, `${label} 必须先存在，键盘遍历才有意义。`).toHaveCount(1)

  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press('Tab')

    if (await target.evaluate((element) => element === document.activeElement)) {
      return
    }
  }

  throw new Error(`键盘无法到达 ${label}。`)
}

async function visibleEnglishWordCount(root: Locator) {
  return root.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const isActuallyVisible = (candidate: HTMLElement) => {
      if (
        typeof candidate.checkVisibility === 'function' &&
        !candidate.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
          contentVisibilityAuto: true,
        })
      ) {
        return false
      }

      let opacity = 1
      let current: HTMLElement | null = candidate

      while (current) {
        const style = getComputedStyle(current)

        if (
          current.hidden ||
          current.inert ||
          current.getAttribute('aria-hidden') === 'true' ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.visibility === 'collapse'
        ) {
          return false
        }

        opacity *= Number(style.opacity)
        current = current.parentElement
      }

      return opacity > 0.001
    }
    let count = 0
    let node = walker.nextNode()

    while (node) {
      const parent = node.parentElement

      if (parent && !parent.closest('[hidden], [aria-hidden="true"], noscript')) {
        if (isActuallyVisible(parent)) {
          const matcher = /[A-Za-z]+(?:[/-][A-Za-z]+)*/g
          const text = node.textContent ?? ''
          let match = matcher.exec(text)

          while (match) {
            const range = document.createRange()
            range.setStart(node, match.index)
            range.setEnd(node, match.index + match[0].length)
            const isVisibleWord = Array.from(range.getClientRects()).some(
              (rect) =>
                rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom > 0 &&
                rect.right > 0 &&
                rect.top < viewportHeight &&
                rect.left < viewportWidth,
            )

            if (isVisibleWord) {
              count += 1
            }

            range.detach()
            match = matcher.exec(text)
          }
        }
      }

      node = walker.nextNode()
    }

    return count
  })
}

function getRialoProject() {
  const project = projects.find((item) => item.slug === 'rialo-captain')

  if (!project) {
    throw new Error('测试目录中缺少 Rialo Captain 项目。')
  }

  return project
}

async function expectRialoLoopContentVisible(page: Page) {
  const loop = page.locator('[data-rialo-reactive-loop]')
  const stepList = loop.getByRole('list', { name: 'Rialo Captain core loop' })
  const stepControls = stepList.getByRole('button')

  await expect(loop).toHaveCount(1)
  await expect(stepList).toHaveCount(1)
  await expect(stepControls).toHaveCount(rialoSignals.length)

  for (const signal of rialoSignals) {
    const stepControl = stepList.getByRole('button', {
      name: new RegExp(`\\b${signal}\\b`),
    })

    await expect(stepControl).toHaveCount(1)
    await expect(stepControl).toBeVisible()
  }

  await expect(loop.locator('[data-rialo-step]')).toHaveCount(rialoSignals.length)
  await expect(loop.locator('[data-rialo-step-description]')).toHaveCount(rialoSignals.length)
  await expect(loop.locator('[data-rialo-step-description]:visible')).toHaveCount(1)
  await expect(loop.getByTestId('rialo-active-readout')).toHaveCount(1)
}

async function expectRialoReadout(
  page: Page,
  committedIndex: number,
  effectiveIndex = committedIndex,
) {
  const rialoProject = getRialoProject()
  const signal = rialoSignals[committedIndex]
  const effectiveSignal = rialoSignals[effectiveIndex]
  const step = rialoProject.coreLoop[committedIndex]
  const readout = page.getByTestId('rialo-active-readout')
  const main = page.locator('main#main-content')
  const stage = page.locator('[data-instrument-stage="rialo"]')
  const stageIndex = stage.locator('[data-stage-index]')
  const activeItem = stageIndex.locator('[data-rialo-step][data-active="true"]')
  const activeButton = activeItem.getByRole('button', {
    name: new RegExp(`${signal}.*${step.label}`),
  })
  const activeDescription = activeItem.locator('[data-rialo-step-description]')

  await expect(readout).toHaveCount(1)
  await expect(readout.getByRole('heading', { level: 3, name: signal })).toHaveCount(1)
  await expect(readout.getByRole('heading', { level: 3, name: signal })).toBeVisible()
  await expect(readout.getByText(step.label, { exact: true })).toHaveCount(0)
  await expect(readout.getByText(step.description, { exact: true })).toHaveCount(0)
  await expect(stageIndex).toHaveCount(1)
  await expect(activeItem).toHaveCount(1)
  await expect(activeButton).toHaveCount(1)
  await expect(activeButton).toBeVisible()
  await expect(activeItem.getByText(step.label, { exact: true })).toHaveCount(1)
  await expect(activeItem.getByText(step.label, { exact: true })).toBeVisible()
  await expect(activeDescription).toHaveCount(1)
  await expect(activeDescription).toBeVisible()
  await expect(activeDescription).toHaveText(step.description)
  await expect(stage).toHaveAttribute('data-committed-target', `rialo-step:${signal.toLowerCase()}`)
  await expect(stage).toHaveAttribute(
    'data-effective-target',
    `rialo-step:${effectiveSignal.toLowerCase()}`,
  )
  await expect(activeButton).toHaveAttribute('aria-pressed', 'true')
  await expect(activeButton).toHaveAttribute('aria-current', 'step')
  await expect(stage.locator('[data-rialo-step]')).toHaveCount(rialoProject.coreLoop.length)
  await expect(stage.locator('[data-rialo-step-description]')).toHaveCount(
    rialoProject.coreLoop.length,
  )
  await expect(stage.locator('[data-rialo-step-description]:visible')).toHaveCount(1)
  await expect(stage.locator('[data-control-role="primary"]')).toHaveCount(1)
  const primary = stage.getByRole('link', { name: 'Open Rialo Captain case file' })

  await expect(primary).toHaveCount(1)
  await expect(primary).toHaveAttribute('data-control-role', 'primary')
  await expect(primary).toHaveAttribute('href', '/rialo/rialo-captain')
  await expect(primary).toHaveText('Open case file')
  const projectJudgment = stage.locator('[data-active-project-statement]')

  await expect(projectJudgment).toHaveCount(1)
  await expect(projectJudgment).toBeVisible()
  await expect(projectJudgment).toHaveText(exactProjectStatements['rialo-captain'])

  for (const [index, candidateStep] of rialoProject.coreLoop.entries()) {
    const candidate = stage.getByRole('button', {
      name: new RegExp(`${rialoSignals[index]}.*${candidateStep.label}`),
    })

    await expect(candidate).toHaveAttribute(
      'aria-pressed',
      index === committedIndex ? 'true' : 'false',
    )
    if (index === committedIndex) {
      await expect(candidate).toHaveAttribute('aria-current', 'step')
    } else {
      await expect(candidate).not.toHaveAttribute('aria-current')
    }
  }

  const liveRegions = stage.locator('[aria-live]')
  const live = stage.locator('[aria-live][data-rialo-live]')

  await expect(liveRegions).toHaveCount(1)
  await expect(live).toHaveAttribute('aria-live', 'polite')
  await expect(live).toHaveText(`${signal}: ${step.label}. ${step.description}`)
  await expect(main.locator('a[href="/rialo/rialo-captain"]')).toHaveCount(1)
  await expect(stage.getByTestId('rialo-active-readout')).toHaveCount(1)
}

async function expectArcProject(
  main: Locator,
  stage: Locator,
  project: (typeof projects)[number],
) {
  const arcProjects = projects.filter((candidate) => candidate.ecosystem === 'arc')
  const activeSelector = stage.locator(
    `button[data-scene-target="project:${project.slug}"]`,
  )
  const primary = stage.getByRole('link', { name: `Open ${project.name} case file` })
  const expectedStatement = exactProjectStatements[project.slug]

  await expect(stage).toHaveAttribute('data-active-project', project.slug)
  await expect(stage).toHaveAttribute('data-committed-target', `project:${project.slug}`)
  await expect(stage).toHaveAttribute('data-effective-target', `project:${project.slug}`)
  await expect(stage.getByRole('heading', { level: 2, name: project.name })).toHaveCount(1)
  await expect(stage.locator('[data-active-project-statement]')).toHaveText(expectedStatement)
  await expect(stage.locator('[data-control-role="primary"]')).toHaveCount(1)
  await expect(primary).toHaveAttribute('data-control-role', 'primary')
  await expect(primary).toHaveAttribute('href', `/arc/${project.slug}`)
  await expect(main.locator(`a[href="/arc/${project.slug}"]`)).toHaveCount(1)
  await expect(activeSelector).toHaveAttribute('aria-pressed', 'true')
  await expect(activeSelector).toHaveAttribute('aria-current', 'true')

  for (const inactiveProject of arcProjects.filter((candidate) => candidate.slug !== project.slug)) {
    const inactiveSelector = stage.locator(
      `button[data-scene-target="project:${inactiveProject.slug}"]`,
    )

    await expect(inactiveSelector).toHaveAttribute('aria-pressed', 'false')
    await expect(inactiveSelector).not.toHaveAttribute('aria-current')
    await expect(main.locator(`a[href="/arc/${inactiveProject.slug}"]`)).toHaveCount(0)
  }

  const liveRegions = stage.locator('[aria-live]')
  const live = stage.locator('[aria-live][data-arc-live]')

  await expect(liveRegions).toHaveCount(1)
  await expect(live).toHaveAttribute('aria-live', 'polite')
  await expect(live).toHaveText(`${project.name}: ${expectedStatement}`)
}

async function openRialoInContext(
  browser: Browser,
  baseURL: string | undefined,
  options: Parameters<Browser['newContext']>[0],
) {
  const context = await browser.newContext({
    baseURL,
    ...options,
  })
  const page = await context.newPage()

  await page.goto('/rialo')

  return { context, page }
}

async function openRouteWithoutJavaScript(browser: Browser, baseURL: string | undefined, route: string) {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: {
      width: 375,
      height: 900,
    },
  })
  const page = await context.newPage()

  await page.goto(route)

  return { context, page }
}

async function closeContext(context: BrowserContext) {
  await context.close()
}

async function stabilizeReducedMotionViewport(control: Locator) {
  await expect(control).toHaveCount(1)
  await control.scrollIntoViewIfNeeded()

  return control.evaluate(async (element) => {
    const readSnapshot = () => {
      const visualViewport = window.visualViewport

      if (!visualViewport) {
        throw new Error('浏览器缺少 visualViewport，无法证明 reduced-motion viewport 稳定。')
      }

      const rect = element.getBoundingClientRect()

      return {
        control: {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        },
        viewport: {
          documentTop: document.documentElement.getBoundingClientRect().top,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          visualViewport: {
            height: visualViewport.height,
            pageX: visualViewport.pageLeft,
            pageY: visualViewport.pageTop,
            scale: visualViewport.scale,
            width: visualViewport.width,
          },
        },
      }
    }
    const waitForAnimationFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    let previous = readSnapshot()
    let stableAnimationFrames = 0

    for (let attempt = 0; attempt < 60; attempt += 1) {
      await waitForAnimationFrame()
      const current = readSnapshot()

      if (JSON.stringify(current) === JSON.stringify(previous)) {
        stableAnimationFrames += 1
      } else {
        stableAnimationFrames = 0
      }

      if (stableAnimationFrames >= 2) {
        return current.viewport
      }

      previous = current
    }

    throw new Error(
      'Cover 控件及 scroll/visualViewport 在 60 个 rAF 内未连续稳定两帧。',
    )
  })
}

async function readReducedMotionState(page: Page) {
  return page.evaluate(() => {
    const visualViewport = window.visualViewport

    if (!visualViewport) {
      throw new Error('浏览器缺少 visualViewport，无法读取 reduced-motion viewport。')
    }

    const viewport = {
      documentTop: document.documentElement.getBoundingClientRect().top,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      visualViewport: {
        height: visualViewport.height,
        pageX: visualViewport.pageLeft,
        pageY: visualViewport.pageTop,
        scale: visualViewport.scale,
        width: visualViewport.width,
      },
    }
    const spatial = Array.from(document.querySelectorAll('[data-cinematic-spatial]')).map(
      (element) => {
        const style = getComputedStyle(element)
        const box = element.getBoundingClientRect()
        const durations = style.transitionDuration.split(',').map((duration) => {
          const value = Number.parseFloat(duration)

          return duration.trim().endsWith('ms') ? value : value * 1000
        })
        const properties = style.transitionProperty.split(',').map((property) => property.trim())
        const transitions = properties
          .map((property, index) => ({
            duration: durations[index % durations.length] ?? 0,
            property,
          }))
          .filter(({ property }) => property !== 'none')

        return {
          animationIterationCount: style.animationIterationCount,
          left: box.left,
          top: box.top,
          transform: style.transform,
          transitions,
        }
      },
    )
    const animations = document.getAnimations().map((animation) => {
      const effect = animation.effect
      const timing = effect?.getComputedTiming()
      const frameProperties =
        effect instanceof KeyframeEffect
          ? effect.getKeyframes().flatMap((frame) => Object.keys(frame))
          : []
      const target = effect instanceof KeyframeEffect ? effect.target : null
      const animationName =
        animation instanceof CSSAnimation
          ? animation.animationName
          : animation instanceof CSSTransition
            ? `transition:${animation.transitionProperty}`
            : animation.id

      return {
        animationName,
        duration: typeof timing?.duration === 'number' ? timing.duration : Number.POSITIVE_INFINITY,
        endTime: typeof timing?.endTime === 'number' ? timing.endTime : Number.POSITIVE_INFINITY,
        frameProperties,
        id: animation.id,
        iterations: effect?.getComputedTiming().iterations ?? 0,
        key: [
          animationName,
          target instanceof Element ? target.tagName + target.className : 'no-target',
          animation.startTime,
        ].join('|'),
        playState: animation.playState,
      }
    })

    return { animations, spatial, viewport }
  })
}

for (const ecosystem of ecosystems) {
  const expectedProjects = projects.filter((project) => project.ecosystem === ecosystem.slug)
  const otherProjects = projects.filter((project) => project.ecosystem !== ecosystem.slug)

  test(`${ecosystem.name} renders one cinematic stage without a duplicate project index or route explanation`, async ({
    page,
  }) => {
    await page.goto(`/${ecosystem.slug}`)

    const main = page.locator('main#main-content')
    const hero = main.locator(`[data-ecosystem-hero][data-ecosystem-theme="${ecosystem.slug}"]`)

    await expect(page.locator('h1')).toHaveCount(1)
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(ecosystem.name)
    await expect(hero).toHaveCount(1)
    await expect(main.locator(':scope > section')).toHaveCount(1)
    await expect(hero).toHaveAttribute('style', /--ecosystem-accent:/)
    await expect(main.getByRole('article')).toHaveCount(0)
    await expect(hero.locator('[data-control-role="primary"]')).toHaveCount(1)
    await expect(hero.locator('[data-control-role="primary"]')).toHaveAttribute(
      'href',
      `/${expectedProjects[0].ecosystem}/${expectedProjects[0].slug}`,
    )
    await expect(hero.locator('[data-control-role="primary"]')).toHaveAttribute(
      'aria-label',
      `Open ${expectedProjects[0].name} case file`,
    )
    await expect(hero.locator('[data-control-role="primary"]')).toHaveText('Open case file')
    const projectJudgment = hero.locator('[data-active-project-statement]')

    await expect(projectJudgment).toHaveCount(1)
    await expect(projectJudgment).toBeVisible()
    await expect(projectJudgment).toHaveText(exactProjectStatements[expectedProjects[0].slug])
    expect(await main.innerText()).not.toMatch(/[\u3400-\u9fff]/)

    for (const project of otherProjects) {
      await expect(main.locator(`a[href="/${project.ecosystem}/${project.slug}"]`)).toHaveCount(0)
      await expect(main.locator(`a[href="${project.liveUrl}"]`)).toHaveCount(0)
    }

    await expect(page.locator('iframe')).toHaveCount(0)
  })

  test(`${ecosystem.name} cinematic controls do not overflow or shrink below 44px`, async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 900 },
      { width: 1440, height: 960 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto(`/${ecosystem.slug}`)

      const stage = page.locator(`[data-instrument-stage="${ecosystem.slug}"]`)
      const controls = stage.locator('[data-stage-index] button')
      const boxes = await controls.evaluateAll((buttons) =>
        buttons.map((button) => {
          const box = button.getBoundingClientRect()

          return { height: box.height, width: box.width }
        }),
      )

      await expectNoHorizontalOverflow(page)
      expect(boxes.length).toBe(ecosystem.slug === 'arc' ? 3 : 5)
      expect(boxes.every((box) => box.height >= 44 && box.width >= 44)).toBe(true)
    }
  })
}

test('Rialo renders the five-stage reactive flight field and Arc does not mount it', async ({ page }) => {
  const rialoProject = getRialoProject()

  await page.goto('/rialo')
  await expectRialoLoopContentVisible(page)
  await expectRialoReadout(page, 0)
  await expect(
    page.getByRole('button', { name: new RegExp(`Observe.*${rialoProject.coreLoop[0].label}`) }),
  ).toHaveAttribute('aria-current', 'step')

  await page.goto('/arc')
  await expect(page.locator('[data-instrument-stage="arc"]')).toHaveCount(1)
  await expect(page.locator('[data-rialo-reactive-loop]')).toHaveCount(0)
  await expect(page.getByText('Observe')).toHaveCount(0)
})

test('Arc uses three stage selectors to switch one catalog-backed observation instrument', async ({ page }) => {
  const arcProjects = projects.filter((project) => project.ecosystem === 'arc')

  await page.goto('/arc')

  const stage = page.locator('[data-instrument-stage="arc"]')
  const main = page.locator('main#main-content')
  const selectors = stage.getByRole('group', { name: 'Arc observation modes' }).getByRole('button')

  await expect(stage).toHaveCount(1)
  await expect(selectors).toHaveCount(3)
  await expect(stage.getByRole('group', { name: 'Arc observation modes' })).toHaveCount(1)
  await expect(stage.getByRole('region', { name: 'Active project' })).toHaveCount(1)

  for (const [index, project] of arcProjects.entries()) {
    const selector = selectors.nth(index)

    await expect(selector).toHaveAttribute('data-control-role', 'stage')
    await expect(selector).toHaveAttribute('data-scene-target', `project:${project.slug}`)
    await expect(selector).toHaveAttribute('aria-pressed', index === 0 ? 'true' : 'false')
    await expect(selector.locator('strong')).toHaveCount(1)
    await expect(selector.locator('strong')).toHaveText(arcModeLabels[index])
    await expect(selector).toHaveAccessibleName(
      `${String(index + 1).padStart(2, '0')} ${arcModeLabels[index]} — ${project.name}`,
    )
  }

  await expectArcProject(main, stage, arcProjects[0])
  await expectKeyboardCanReach(page, 'Arc Research selector', selectors.nth(0))
  await page.keyboard.press('ArrowRight')
  await expect(selectors.nth(1)).toBeFocused()
  await expect(selectors.nth(0)).toHaveAttribute('aria-pressed', 'true')
  await expect(selectors.nth(1)).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('Enter')
  await expectArcProject(main, stage, arcProjects[1])

  await page.keyboard.press('ArrowRight')
  await expect(selectors.nth(2)).toBeFocused()
  await page.keyboard.press('Space')
  await expectArcProject(main, stage, arcProjects[2])
})

test('Rialo reactive loop supports click and manual keyboard activation', async ({ page }) => {
  const rialoProject = getRialoProject()

  await page.goto('/rialo')

  await expect(page.locator('#project-index')).toHaveCount(0)

  const observe = page.getByRole('button', { name: new RegExp(`Observe.*${rialoProject.coreLoop[0].label}`) })
  const cover = page.getByRole('button', { name: new RegExp(`Cover.*${rialoProject.coreLoop[1].label}`) })

  await cover.click()
  await expect(page.locator('[data-instrument-stage="rialo"]')).toHaveAttribute('data-rialo-event', 'cover')
  await expect(cover).toHaveAttribute('aria-pressed', 'true')
  await expectRialoReadout(page, 1)
  const title = page.getByRole('heading', { level: 1, name: 'Rialo' })

  await expect(title).toBeVisible()
  expect(
    await title.evaluate((element) => element.closest('[data-scene-target]') === null),
  ).toBe(true)
  await title.hover()
  await expectRialoReadout(page, 1)
  await cover.press('ArrowRight')
  const trigger = page.getByRole('button', { name: new RegExp(`Trigger.*${rialoProject.coreLoop[2].label}`) })

  await expect(trigger).toBeFocused()
  await expect(cover).toHaveAttribute('aria-pressed', 'true')
  await expectRialoReadout(page, 1, 2)

  await page.keyboard.press('Enter')
  await expect(page.locator('[data-instrument-stage="rialo"]')).toHaveAttribute('data-rialo-event', 'trigger')
  await expect(trigger).toHaveAttribute('aria-pressed', 'true')
  await expectRialoReadout(page, 2)

  await page.keyboard.press('Home')
  await expect(observe).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Space')
  await expect(observe).toHaveAttribute('aria-pressed', 'true')
  await expectRialoReadout(page, 0)
})

test('Arc and Rialo keep one visible judgment and stay below structured copy budgets', async ({
  page,
}) => {
  for (const route of ['/arc', '/rialo'] as const) {
    for (const viewport of [
      { width: 1440, height: 1000, maximum: 90 },
      { width: 390, height: 844, maximum: 45 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto(route)
      const main = page.locator('main#main-content')
      const stage = main.locator(`[data-instrument-stage="${route.slice(1)}"]`)
      const projectJudgment = stage.locator('[data-active-project-statement]')

      await expect(stage).toHaveCount(1)
      await expect(stage).toHaveAttribute('data-cinematic-entry', 'settled')
      await expect(projectJudgment).toHaveCount(1)
      await expect(projectJudgment).toBeVisible()
      await expect(stage.locator('[data-control-role="primary"]')).toHaveCount(1)
      await expect(stage.locator('[data-control-role="primary"]')).toHaveText('Open case file')
      expect(await main.innerText()).not.toMatch(/[\u3400-\u9fff]/)

      const visibleWords = await visibleEnglishWordCount(main)

      expect(visibleWords).toBeLessThanOrEqual(viewport.maximum)
    }
  }
})

test('Rialo reactive loop remains readable without JavaScript', async ({ browser, baseURL }) => {
  const rialoProject = getRialoProject()
  const { context, page } = await openRouteWithoutJavaScript(browser, baseURL, '/rialo')

  try {
    const noScriptRail = page.locator('noscript')
    const projectLink = noScriptRail.locator(`a[href="/rialo/${rialoProject.slug}"]`)
    const signalLegend = noScriptRail.locator(':scope > div > p')
    const staticSteps = noScriptRail.locator(':scope > div > ol > li')

    await expect(noScriptRail).toHaveCount(1)
    await expect(projectLink).toHaveCount(1)
    await expect(projectLink).toBeVisible()
    await expect(signalLegend).toHaveCount(1)
    await expect(signalLegend).toBeVisible()
    await expect(signalLegend).toHaveText(rialoSignals.join(' · '))
    await expect(staticSteps).toHaveCount(rialoSignals.length)
    for (const [index, step] of rialoProject.coreLoop.entries()) {
      const staticStep = staticSteps.nth(index)

      await expect(staticStep).toBeVisible()
      await expect(staticStep.locator(':scope > strong')).toHaveText(rialoSignals[index])
      await expect(staticStep).toContainText(step.label)
      await expect(staticStep).toContainText(step.description)
    }
    await expect(page.locator('[data-static-scene="rialo"]')).toHaveCount(1)
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
  } finally {
    await closeContext(context)
  }
})

test('Arc remains readable with the matching static fallback without JavaScript', async ({ browser, baseURL }) => {
  const { context, page } = await openRouteWithoutJavaScript(browser, baseURL, '/arc')

  try {
    const main = page.locator('main#main-content')
    const arcProjects = projects.filter((project) => project.ecosystem === 'arc')
    const noScriptNavigation = page.getByRole('navigation', { name: 'Arc project links' })

    await expect(main.getByRole('heading', { level: 1, name: 'Arc' })).toBeVisible()
    await expect(noScriptNavigation).toHaveCount(1)
    for (const project of arcProjects) {
      const projectLink = noScriptNavigation.locator(`a[href="/arc/${project.slug}"]`)

      await expect(projectLink).toHaveCount(1)
      await expect(projectLink).toBeVisible()
    }
    await expect(page.locator('[data-static-scene="arc"]')).toHaveCount(1)
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
    await expect(page.locator('iframe')).toHaveCount(0)
  } finally {
    await closeContext(context)
  }
})

test('Rialo reactive loop supports real touch activation on mobile', async ({ browser, baseURL }) => {
  const rialoProject = getRialoProject()
  const { context, page } = await openRialoInContext(browser, baseURL, {
    hasTouch: true,
    isMobile: true,
    viewport: {
      width: 375,
      height: 900,
    },
  })

  try {
    await page.getByRole('button', { name: new RegExp(`Cover.*${rialoProject.coreLoop[1].label}`) }).tap()
    await expectRialoReadout(page, 1)
  } finally {
    await closeContext(context)
  }
})

test('Rialo reduced motion reaches the complete terminal state without spatial or continuous motion', async ({
  browser,
  baseURL,
}) => {
  const rialoProject = getRialoProject()
  const { context, page } = await openRialoInContext(browser, baseURL, {
    reducedMotion: 'reduce',
    viewport: {
      width: 1440,
      height: 960,
    },
  })

  try {
    const cover = page.getByRole('button', { name: new RegExp(`Cover.*${rialoProject.coreLoop[1].label}`) })
    const stage = page.locator('[data-instrument-stage="rialo"]')

    await expect(stage).toHaveAttribute('data-cinematic-entry', 'settled')
    const stableViewport = await stabilizeReducedMotionViewport(cover)
    const baseline = await readReducedMotionState(page)
    const baselineAnimationKeys = new Set(baseline.animations.map((animation) => animation.key))

    expect(baseline.viewport).toEqual(stableViewport)
    await cover.click()
    const instant = await readReducedMotionState(page)
    expect(instant.viewport).toEqual(baseline.viewport)
    await expectRialoReadout(page, 1)
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)

    const spatialElements = page.locator('[data-cinematic-spatial]')
    await expect(spatialElements).not.toHaveCount(0)

    for (const state of instant.spatial) {
      expect(state.animationIterationCount).not.toContain('infinite')
      for (const transition of state.transitions) {
        expect(transition.duration).toBeLessThanOrEqual(240)
        if (
          ['all', 'transform', 'translate', 'rotate', 'scale', 'left', 'right', 'top', 'bottom'].includes(
            transition.property,
          )
        ) {
          expect(transition.duration).toBe(0)
        } else if (transition.duration > 0) {
          expect(transition.property).toBe('opacity')
        }
      }
    }

    const keyframeMetadata = new Set(['composite', 'computedOffset', 'easing', 'offset'])
    const newAnimations = instant.animations.filter(
      (animation) => !baselineAnimationKeys.has(animation.key),
    )

    for (const animation of [...baseline.animations, ...newAnimations]) {
      const animatedProperties = [
        ...new Set(animation.frameProperties.filter((property) => !keyframeMetadata.has(property))),
      ]

      expect(animation.iterations).not.toBe(Infinity)
      expect(animatedProperties).toEqual(['opacity'])
      expect(animation.duration).toBeLessThanOrEqual(240)
      expect(animation.endTime).toBeLessThanOrEqual(240)
    }

    expect(
      instant.spatial.map(({ left, top, transform }) => ({ left, top, transform })),
    ).toEqual(baseline.spatial.map(({ left, top, transform }) => ({ left, top, transform })))

    await page.waitForTimeout(300)

    const terminal = await readReducedMotionState(page)

    expect(terminal.viewport).toEqual(baseline.viewport)
    expect(
      terminal.spatial.map(({ left, top, transform }) => ({ left, top, transform })),
    ).toEqual(baseline.spatial.map(({ left, top, transform }) => ({ left, top, transform })))
    expect(terminal.animations.filter((animation) => animation.playState === 'running')).toEqual([])
  } finally {
    await closeContext(context)
  }
})

test('Rialo reactive loop has no overflow, clipping, or undersized controls at 320, 375, and 1440', async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 900 },
    { width: 375, height: 900 },
    { width: 1440, height: 960 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/rialo')

    const loop = page.locator('[data-rialo-reactive-loop]')
    const clippedElements = await loop
      .locator('[data-rialo-step], [data-rialo-step] button, [data-rialo-readout]')
      .evaluateAll((elements) =>
        elements
          .map((element) => {
            const htmlElement = element as HTMLElement

            return {
              clientHeight: htmlElement.clientHeight,
              clientWidth: htmlElement.clientWidth,
              scrollHeight: htmlElement.scrollHeight,
              scrollWidth: htmlElement.scrollWidth,
              text: htmlElement.innerText.replace(/\s+/g, ' ').trim(),
            }
          })
          .filter(
            (element) =>
              element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
          ),
      )
    const buttonBoxes = await loop.getByRole('button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect()

        return {
          height: box.height,
          width: box.width,
        }
      }),
    )

    await expectNoHorizontalOverflow(page)
    await expect(loop).toBeVisible()
    expect(clippedElements, `Rialo loop clipping at ${viewport.width}`).toEqual([])
    expect(buttonBoxes.every((box) => box.height >= 44 && box.width >= 44)).toBe(true)
  }
})
