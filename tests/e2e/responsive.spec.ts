import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { projects } from '../../src/content/catalog'

type RouteGroup = 'case-file' | 'content' | 'immersive'

type ResponsiveRoute = Readonly<{
  group: RouteGroup
  heading: string
  path: string
}>

const viewports = [
  { width: 320, height: 900 },
  { width: 375, height: 900 },
  { width: 390, height: 900 },
  { width: 767, height: 1024 },
  { width: 768, height: 1024 },
  { width: 1440, height: 960 },
  { width: 1920, height: 1080 },
] as const

const routes = [
  { group: 'immersive', heading: 'A UNIVERSE OF THINGS I’VE BUILT.', path: '/' },
  { group: 'immersive', heading: 'Arc', path: '/arc' },
  { group: 'immersive', heading: 'Rialo', path: '/rialo' },
  ...projects.map((project) => ({
    group: 'case-file' as const,
    heading: project.name,
    path: `/${project.ecosystem}/${project.slug}`,
  })),
  { group: 'content', heading: 'About', path: '/about' },
  { group: 'content', heading: 'Project not found', path: '/not-real' },
] as const satisfies readonly ResponsiveRoute[]

const expectedRouteCount = 9
const epsilon = 1
const reflowProxyWidth = 320
const compactCinematicStageWidths = [320, 390, 560, 700] as const
const instrumentStageWidths = [701, 767, 768, 900, 901, 992, 1024, 1025, 1200, 1279, 1280, 1440, 1920] as const
const stageHorizontalCapacitySelectors = {
  arc: [
    '[data-stage-title]',
    '[data-stage-title] > *',
    '[data-stage-readout]',
    '[data-stage-readout] > *',
    '[data-stage-index]',
    '[data-stage-index] > *',
  ],
  home: [
    '[data-stage-readout]',
    '[data-stage-readout] > *',
    '[data-stage-index]',
    '[data-stage-index] > *',
  ],
} as const
const stageVerticalCapacitySelectors = {
  arc: [
    '[data-stage-title]',
    '[data-stage-readout]',
    '[data-stage-index]',
  ],
  home: [
    '[data-stage-readout]',
    '[data-stage-index]',
  ],
} as const
const instrumentStageRoutes = [
  {
    path: '/',
    variant: 'home',
  },
  {
    path: '/arc',
    variant: 'arc',
  },
  {
    path: '/rialo',
    variant: 'rialo',
  },
] as const
const sharedInstrumentStageRoutes = instrumentStageRoutes.filter(
  (route): route is (typeof instrumentStageRoutes)[0] | (typeof instrumentStageRoutes)[1] =>
    route.variant !== 'rialo',
)

test.use({ reducedMotion: 'reduce' } as Parameters<typeof test.use>[0])

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

function routeLabel<TRoute extends Readonly<{ path: string }>>(route: TRoute, viewportWidth: number) {
  return `${route.path} @ ${viewportWidth}px`
}

function rotatedViewportOrder(route: ResponsiveRoute) {
  const routeIndex = routes.findIndex((item) => item.path === route.path)

  if (routeIndex < 0) {
    throw new Error(`未知响应式路由：${route.path}`)
  }

  const coldIndex = routeIndex % viewports.length

  return [viewports[coldIndex], ...viewports.filter((_, index) => index !== coldIndex)]
}

async function waitForStableLayout(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

async function waitForViewportUnitLayout(page: Page, viewportWidth: number) {
  await waitForStableLayout(page)

  const expectedGutter = Math.min(64, Math.max(16, viewportWidth * 0.04))

  await expect
    .poll(
      () =>
        page.evaluate(
          ({ expectedGutter, viewportWidth }) => {
            const main = document.querySelector('main#main-content')

            if (!(main instanceof HTMLElement)) {
              return false
            }

            const mainStyle = window.getComputedStyle(main)
            const paddingLeft = Number.parseFloat(mainStyle.paddingLeft)
            const paddingRight = Number.parseFloat(mainStyle.paddingRight)

            return (
              document.documentElement.clientWidth === viewportWidth &&
              Math.abs(paddingLeft - expectedGutter) <= 0.1 &&
              Math.abs(paddingRight - expectedGutter) <= 0.1
            )
          },
          { expectedGutter, viewportWidth },
        ),
      {
        message: `等待 ${viewportWidth}px 对应的 --page-gutter 与 main padding 稳定`,
      },
    )
    .toBe(true)
}

async function expectDocumentDoesNotOverflow(page: Page, label: string) {
  const widths = await page.evaluate(() => ({
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }))

  expect(widths.documentScrollWidth, `${label} document scrollWidth`).toBeLessThanOrEqual(
    widths.documentClientWidth + epsilon,
  )
  expect(widths.bodyScrollWidth, `${label} body scrollWidth`).toBeLessThanOrEqual(
    widths.documentClientWidth + epsilon,
  )
}

async function expectSemanticBoxesFit(page: Page, label: string) {
  const issues = await page.evaluate((allowedOverflow) => {
    const cssEscape = (value: string) => {
      if (window.CSS?.escape) {
        return window.CSS.escape(value)
      }

      return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&')
    }
    const cssPath = (element: Element) => {
      const parts: string[] = []
      let current: Element | null = element

      while (current && current !== document.body) {
        const tag = current.tagName.toLowerCase()
        const id = current.id ? `#${cssEscape(current.id)}` : ''
        const classes =
          current instanceof HTMLElement && current.className
            ? String(current.className)
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 3)
                .map((className) => `.${cssEscape(className)}`)
                .join('')
            : ''

        parts.unshift(`${tag}${id}${classes}`)
        current = current.parentElement
      }

      return parts.join(' > ')
    }
    const textFor = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
    const isSvgPrimitive = (element: Element) =>
      element instanceof SVGElement &&
      element.ownerSVGElement !== null &&
      element !== element.ownerSVGElement
    const visible = (element: Element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      const isVisuallyHidden =
        element instanceof HTMLElement &&
        (element.classList.contains('visually-hidden') ||
          (rect.width <= 1 &&
            rect.height <= 1 &&
            (style.clip !== 'auto' || style.clipPath !== 'none' || style.position === 'absolute')))

      return (
        !isVisuallyHidden &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      )
    }
    const isSemantic = (element: Element) => {
      const tag = element.tagName.toLowerCase()

      return (
        /^(a|button|input|select|textarea|summary|h[1-6]|p|li|article|section|main|nav|header|footer|aside|figure|figcaption|img|svg|ol|ul|dl|dt|dd)$/.test(
          tag,
        ) || element.hasAttribute('role')
      )
    }
    const markedScrollerFor = (element: Element) => {
      const marker = element.closest('[data-allow-horizontal-scroll="true"]')

      if (!(marker instanceof HTMLElement)) {
        return null
      }

      const style = window.getComputedStyle(marker)
      const isActualScroller = style.overflowX === 'auto' || style.overflowX === 'scroll'

      return isActualScroller ? marker : null
    }
    const nearestClipAncestor = (element: Element) => {
      let ancestor = element.parentElement

      while (ancestor) {
        const overflowX = window.getComputedStyle(ancestor).overflowX

        if (overflowX === 'clip' || overflowX === 'hidden') {
          return ancestor
        }

        ancestor = ancestor.parentElement
      }

      return null
    }
    const reportRect = (rect: DOMRect) => ({
      bottom: Math.round(rect.bottom * 10) / 10,
      left: Math.round(rect.left * 10) / 10,
      right: Math.round(rect.right * 10) / 10,
      top: Math.round(rect.top * 10) / 10,
      width: Math.round(rect.width * 10) / 10,
    })
    const viewportWidth = document.documentElement.clientWidth
    const problems: Array<Record<string, unknown>> = []

    for (const element of Array.from(document.body.querySelectorAll('*'))) {
      if (element instanceof HTMLCanvasElement || isSvgPrimitive(element) || !visible(element)) {
        continue
      }

      const ariaHiddenRoot = element.closest('[aria-hidden="true"]')

      if (ariaHiddenRoot && ariaHiddenRoot !== element) {
        continue
      }

      const rect = element.getBoundingClientRect()
      const path = cssPath(element)
      const text = textFor(element)
      const markedScroller = markedScrollerFor(element)
      const allowsNegativeDecorativeOverflow = element.matches(
        '[data-instrument-stage="arc"] [data-stage-scene] > [aria-hidden="true"][data-cinematic-spatial][data-arc-form]',
      )

      if (
        (!allowsNegativeDecorativeOverflow && rect.left < -allowedOverflow) ||
        rect.right > viewportWidth + allowedOverflow
      ) {
        problems.push({
          allowsNegativeDecorativeOverflow,
          path,
          reason: 'viewport overflow',
          rect: reportRect(rect),
          text,
          viewportWidth,
        })
        continue
      }

      const clipAncestor = nearestClipAncestor(element)

      if (clipAncestor && clipAncestor !== element) {
        const clipRect = clipAncestor.getBoundingClientRect()

        if (rect.left < clipRect.left - allowedOverflow || rect.right > clipRect.right + allowedOverflow) {
          problems.push({
            clipAncestor: cssPath(clipAncestor),
            path,
            reason: 'clipped by overflow-x ancestor',
            rect: reportRect(rect),
            text,
          })
          continue
        }
      }

      if (markedScroller && markedScroller !== element) {
        continue
      }

      if (element instanceof HTMLElement && (isSemantic(element) || text.length > 0)) {
        const style = window.getComputedStyle(element)
        const canScrollSelf =
          element.getAttribute('data-allow-horizontal-scroll') === 'true' &&
          (style.overflowX === 'auto' || style.overflowX === 'scroll')

        if (!canScrollSelf && element.scrollWidth > element.clientWidth + allowedOverflow) {
          problems.push({
            clientWidth: element.clientWidth,
            path,
            reason: 'self horizontal scroll',
            scrollWidth: element.scrollWidth,
            text,
          })
        }
      }
    }

    return problems
  }, epsilon)

  expect(issues, `${label} visible semantic clipping/overflow`).toEqual([])
}

async function expectMobileHeaderAndStickyRules(page: Page, label: string) {
  const positions = await page.evaluate(() => {
    const header = document.querySelector('.site-header')

    if (!header) {
      throw new Error('缺少 .site-header。')
    }

    const stickyInMain = Array.from(document.querySelectorAll('main#main-content *'))
      .filter((element) => {
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()

        return style.position === 'sticky' && rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden'
      })
      .map((element) => ({
        path: element.tagName.toLowerCase(),
        text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? '',
      }))

    return {
      headerPosition: window.getComputedStyle(header).position,
      stickyInMain,
    }
  })

  expect(positions.headerPosition, `${label} mobile header position`).toBe('static')
  expect(positions.stickyInMain, `${label} main sticky elements`).toEqual([])
}

async function expectVerticalOrder(
  page: Page,
  selector: string,
  expectedCount: number,
  label: string,
  sameLeft = false,
) {
  const owners = page.locator(selector)

  await expect(owners, `${label} exact owner count`).toHaveCount(expectedCount)

  const issues = await owners.evaluateAll(
    (elements, options) => {
      const visibleRects = elements
        .map((element, index) => {
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element)

          return {
            bottom: rect.bottom,
            index,
            left: rect.left,
            text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? '',
            top: rect.top,
            visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
          }
        })
        .filter((item) => item.visible)
      const problems: Array<Record<string, unknown>> = []
      const firstLeft = visibleRects[0]?.left ?? 0

      for (let index = 1; index < visibleRects.length; index += 1) {
        const previous = visibleRects[index - 1]
        const current = visibleRects[index]

        if (current.top < previous.bottom - options.epsilon) {
          problems.push({
            current,
            previous,
            reason: 'not vertically stacked',
          })
        }

        if (options.sameLeft && Math.abs(current.left - firstLeft) > options.epsilon) {
          problems.push({
            current,
            firstLeft,
            reason: 'left edge changed',
          })
        }
      }

      return problems
    },
    { epsilon, sameLeft },
  )

  expect(issues, `${label} vertical order for ${selector}`).toEqual([])
}

async function expectMobileOwnersAreStacked(page: Page, route: ResponsiveRoute, label: string) {
  if (route.group === 'case-file') {
    const project = projects.find(
      (candidate) => `/${candidate.ecosystem}/${candidate.slug}` === route.path,
    )

    if (!project) {
      throw new Error(`缺少 ${route.path} 的详情响应式契约。`)
    }

    await expectVerticalOrder(
      page,
      '[data-project-hero-copy] > *',
      4,
      `${label} detail hero`,
    )
    await expectVerticalOrder(
      page,
      'ol[aria-label="Project mechanism"] > li',
      project.coreLoop.length,
      `${label} project mechanism`,
      true,
    )
    return
  }

  if (route.path === '/about') {
    await expectVerticalOrder(
      page,
      'main#main-content > header > div > *',
      4,
      `${label} about hero`,
    )
    await expectVerticalOrder(
      page,
      'section[aria-labelledby="about-boundaries-heading"] article',
      3,
      `${label} about notes`,
    )
  }
}

async function expectMajorTargetsMeetTouchSize(page: Page, route: ResponsiveRoute, label: string) {
  const sharedTargets = [
    { count: 1, selector: '.site-brand' },
    { count: 4, selector: '.site-nav__link' },
    { count: 4, selector: '.site-footer a' },
  ] as const
  const caseProject =
    route.group === 'case-file'
      ? projects.find((project) => `/${project.ecosystem}/${project.slug}` === route.path)
      : undefined

  if (route.group === 'case-file' && !caseProject) {
    throw new Error(`缺少 ${route.path} 的详情触控契约。`)
  }

  const routeTargets =
    route.path === '/'
      ? [
          {
            count: 4,
            selector: '[data-instrument-stage="home"] [aria-label="Project reel"] button',
          },
          {
            count: 2,
            selector:
              '[data-instrument-stage="home"] nav[aria-label="Ecosystem stage index"] a',
          },
          {
            count: 1,
            selector: '[data-instrument-stage="home"] [data-control-role="primary"]',
          },
        ]
      : route.path === '/arc'
        ? [
            {
              count: 3,
              selector:
                '[data-instrument-stage="arc"] [aria-label="Arc observation modes"] button',
            },
            {
              count: 1,
              selector: '[data-instrument-stage="arc"] [data-control-role="primary"]',
            },
          ]
        : route.path === '/rialo'
          ? [
              {
                count: 5,
                selector:
                  '[data-instrument-stage="rialo"] [aria-label="Rialo Captain core loop"] button',
              },
              {
                count: 1,
                selector: '[data-instrument-stage="rialo"] [data-control-role="primary"]',
              },
            ]
          : route.group === 'case-file'
            ? [
                {
                  count: 1,
                  selector: 'main#main-content [data-control-role="primary"]',
                },
                {
                  count: 2,
                  selector: 'main#main-content nav[aria-label="Project navigation"] a',
                },
                {
                  count:
                    2 +
                    (caseProject?.coreLoop.length ?? 0) +
                    (caseProject?.evidence.length ?? 0) +
                    (caseProject?.gallery.length ?? 0),
                  selector: 'main#main-content details > summary',
                },
              ]
            : route.path === '/about'
              ? [
                  {
                    count: 2,
                    selector: 'nav[aria-label="About recovery routes"] a',
                  },
                ]
              : [
                  {
                    count: 2,
                    selector: 'nav[aria-label="404 recovery routes"] a',
                  },
                ]

  const targetContracts = [...sharedTargets, ...routeTargets]

  for (const target of targetContracts) {
    await expect(page.locator(target.selector), `${label} ${target.selector}`).toHaveCount(
      target.count,
    )
  }

  const selectors = targetContracts.map((target) => target.selector)
  const targets = page.locator(selectors.join(', '))
  const expectedTargetCount = targetContracts.reduce((count, target) => count + target.count, 0)

  await expect(targets, `${label} complete touch target inventory`).toHaveCount(expectedTargetCount)

  const issues = await targets.evaluateAll((elements) =>
    elements
      .map((element) => {
        const control = element as HTMLElement
        const rect = control.getBoundingClientRect()
        const style = window.getComputedStyle(control)

        return {
          disabled: control.matches(':disabled, [aria-disabled="true"]'),
          display: style.display,
          height: rect.height,
          text: control.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          visibility: style.visibility,
          width: rect.width,
        }
      })
      .filter((item) => item.display !== 'none' && item.visibility !== 'hidden' && !item.disabled)
      .filter((item) => item.width < 43.5 || item.height < 43.5),
  )

  expect(issues, `${label} 320px / 400% reflow proxy touch targets`).toEqual([])

  for (const target of await targets.all()) {
    if (!(await target.isVisible())) {
      continue
    }

    await target.focus()
    await expect(target, `${label} keyboard-focusable touch target`).toBeFocused()
  }
}

async function expectRouteContentVisible(page: Page, route: ResponsiveRoute) {
  const main = page.locator('main#main-content')
  const heading = main.locator('h1')

  await expect(main).toHaveCount(1)
  await expect(heading).toHaveCount(1)

  if (route.group === 'case-file') {
    await expect(heading).toBeVisible()

    const normalizedHeading = (await heading.textContent())
      ?.replace(/\s+/g, ' ')
      .replace(/\s*\/\s*/g, '/')
      .trim()

    expect(normalizedHeading, `${route.path} normalized visible h1`).toBe(route.heading)
  } else {
    await expect(main.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
  }

  if (route.path === '/') {
    const stage = main.locator('[data-instrument-stage="home"]')
    const ecosystemLinks = stage
      .getByRole('navigation', { name: 'Ecosystem stage index' })
      .getByRole('link')

    await expect(stage).toHaveCount(1)
    await expect(ecosystemLinks).toHaveCount(2)
    await expect(ecosystemLinks.filter({ hasText: 'Arc' })).toHaveCount(1)
    await expect(stage.getByRole('link', { name: 'Open SIGNAL/LEDGER case file' })).toHaveCount(1)
    await expect(ecosystemLinks.filter({ hasText: 'Arc' })).toBeVisible()
    await expect(stage.getByRole('link', { name: 'Open SIGNAL/LEDGER case file' })).toBeVisible()
  } else if (route.path === '/arc') {
    const stage = main.locator('[data-instrument-stage="arc"]')
    const primary = stage.getByRole('link', { name: 'Open SIGNAL/LEDGER case file' })

    await expect(stage).toHaveCount(1)
    await expect(primary).toHaveCount(1)
    await expect(primary).toBeVisible()
  } else if (route.path === '/rialo') {
    const stage = main.locator('[data-instrument-stage="rialo"]')
    const controls = stage
      .getByRole('list', { name: 'Rialo Captain core loop' })
      .getByRole('button')

    await expect(stage).toHaveCount(1)
    await expect(controls).toHaveCount(5)
    await expect(controls.first()).toHaveAccessibleName(/Observe.*Observe flight/)
    await expect(controls.first()).toBeVisible()
  } else if (route.group === 'case-file') {
    const liveLink = main.getByRole('link', { name: /Launch live site/i })
    const projectNavigation = main.getByRole('navigation', { name: 'Project navigation' })

    await expect(liveLink).toHaveCount(1)
    await expect(projectNavigation).toHaveCount(1)
    await expect(liveLink).toBeVisible()
    await expect(projectNavigation).toBeVisible()
  } else if (route.path === '/about') {
    const returnLink = main.getByRole('link', { name: 'Return to Captain Dock' })

    await expect(returnLink).toHaveCount(1)
    await expect(returnLink).toBeVisible()
  } else if (route.path === '/not-real') {
    const recoveryRoutes = main.getByRole('navigation', { name: '404 recovery routes' })

    await expect(recoveryRoutes).toHaveCount(1)
    await expect(recoveryRoutes).toBeVisible()
  }
}

async function expectBorderlessInstrumentStage(
  page: Page,
  route: Readonly<{ path: string; variant: 'arc' | 'home' | 'rialo' }>,
  viewportWidth: number,
) {
  const stage = page.locator(`[data-instrument-stage="${route.variant}"]`)

  await expect(stage, `${route.path} exact Instrument Stage`).toHaveCount(1)

  const surface = await stage.evaluate(
    (stage, width) => {
      const style = getComputedStyle(stage)
      const datum = getComputedStyle(stage, '::before')

      return {
        backgroundColor: style.backgroundColor,
        borderBottomWidth: style.borderBottomWidth,
        borderLeftWidth: style.borderLeftWidth,
        borderRightWidth: style.borderRightWidth,
        borderTopWidth: style.borderTopWidth,
        datumBorderBottomWidth: datum.borderBottomWidth,
        datumBorderLeftWidth: datum.borderLeftWidth,
        datumBorderRightWidth: datum.borderRightWidth,
        datumBorderTopWidth: datum.borderTopWidth,
        datumDisplay: datum.display,
        expectsMobileDatumHidden: width <= 560,
      }
    },
    viewportWidth,
  )

  expect.soft(surface, `${route.path} @ ${viewportWidth}px borderless stage`).toMatchObject({
    backgroundColor: 'rgba(0, 0, 0, 0)',
    borderBottomWidth: '0px',
    borderLeftWidth: '0px',
    borderRightWidth: '0px',
    borderTopWidth: '0px',
    datumBorderBottomWidth: '0px',
    datumBorderLeftWidth: '0px',
    datumBorderRightWidth: '0px',
    datumBorderTopWidth: '0px',
  })

  if (surface.expectsMobileDatumHidden) {
    expect.soft(surface.datumDisplay, `${route.path} @ ${viewportWidth}px mobile datum`).toBe('none')
  } else {
    expect.soft(surface.datumDisplay, `${route.path} @ ${viewportWidth}px desktop datum`).not.toBe('none')
  }
}

async function checkResponsiveSample(page: Page, route: ResponsiveRoute, viewportWidth: number) {
  const label = routeLabel(route, viewportWidth)

  await waitForStableLayout(page)
  await expectRouteContentVisible(page, route)
  await expectDocumentDoesNotOverflow(page, label)
  await expectSemanticBoxesFit(page, label)

  if (route.group === 'immersive') {
    const instrumentRoute = instrumentStageRoutes.find((item) => item.path === route.path)

    if (!instrumentRoute) {
      throw new Error(`缺少 ${route.path} Instrument Stage 响应式契约。`)
    }

    await expectBorderlessInstrumentStage(page, instrumentRoute, viewportWidth)
  }

  if (viewportWidth < 768) {
    await expectMobileHeaderAndStickyRules(page, label)
  }

  if (route.group !== 'immersive' && viewportWidth < 768) {
    await expectMobileOwnersAreStacked(page, route, label)
  }

  if (viewportWidth === reflowProxyWidth) {
    await expectMajorTargetsMeetTouchSize(page, route, label)
  }
}

async function runResponsiveRoute(page: Page, route: ResponsiveRoute) {
  const viewportOrder = rotatedViewportOrder(route)
  const firstViewport = viewportOrder[0]
  const response = await page.goto(route.path)

  if (route.path === '/not-real') {
    expect(response?.status(), `${route.path} response`).toBe(404)
  } else {
    expect(response?.ok(), `${route.path} response`).toBe(true)
  }

  await checkResponsiveSample(page, route, firstViewport.width)

  for (const viewport of viewportOrder.slice(1)) {
    await page.setViewportSize(viewport)
    await checkResponsiveSample(page, route, viewport.width)
  }
}

test('Home and Arc compact stages keep their distinct scene geometry', async ({ page }) => {
  for (const route of sharedInstrumentStageRoutes) {
    for (const viewportWidth of compactCinematicStageWidths) {
      const label = routeLabel(route, viewportWidth)

      await page.setViewportSize({ width: viewportWidth, height: 1200 })

      const response = await page.goto(route.path)

      expect(response?.ok(), `${label} response`).toBe(true)
      await waitForViewportUnitLayout(page, viewportWidth)

      const stage = page.locator(`[data-instrument-stage="${route.variant}"]`)
      const scene = stage.locator(':scope > [data-stage-scene]')
      const protagonist = scene.locator(
        `:scope > [aria-hidden="true"][data-cinematic-spatial]${
          route.variant === 'arc' ? '[data-arc-form]' : ''
        }`,
      )
      const title = stage.locator(':scope > [data-stage-title]')
      const readout = stage.locator(':scope > [data-stage-readout]')
      const index = stage.locator(':scope > [data-stage-index]')
      const controls =
        route.variant === 'home'
          ? stage.getByRole('group', { name: 'Project reel' }).getByRole('button')
          : stage.getByRole('group', { name: 'Arc observation modes' }).getByRole('button')

      await expect(stage, `${label} stage`).toHaveCount(1)
      await expect(scene, `${label} scene`).toHaveCount(1)
      await expect(protagonist, `${label} decorative machine`).toHaveCount(1)
      await expect(title, `${label} title slot`).toHaveCount(1)
      await expect(readout, `${label} readout slot`).toHaveCount(1)
      await expect(index, `${label} index slot`).toHaveCount(1)
      await expect(controls, `${label} scene controls`).toHaveCount(route.variant === 'home' ? 4 : 3)

      const geometry = await stage.evaluate(
        (stageElement, { variant, viewportWidth }) => {
          const scene = stageElement.querySelector<HTMLElement>(
            ':scope > [data-stage-scene]',
          )
          const protagonist = scene?.querySelector<HTMLElement>(
            `:scope > [aria-hidden="true"][data-cinematic-spatial]${
              variant === 'arc' ? '[data-arc-form]' : ''
            }`,
          )
          const title = stageElement.querySelector<HTMLElement>(
            ':scope > [data-stage-title]',
          )
          const readout = stageElement.querySelector<HTMLElement>(
            ':scope > [data-stage-readout]',
          )
          const index = stageElement.querySelector<HTMLElement>(
            ':scope > [data-stage-index]',
          )
          const controlSelector =
            variant === 'home'
              ? '[aria-label="Project reel"] button'
              : '[aria-label="Arc observation modes"] button'
          const controls = Array.from(
            stageElement.querySelectorAll<HTMLElement>(controlSelector),
          )

          if (!scene || !protagonist || !title || !readout || !index) {
            throw new Error(`缺少 ${variant} compact stage 几何 owner。`)
          }

          const rect = (element: Element) => element.getBoundingClientRect()
          const intersects = (first: DOMRect, second: DOMRect) =>
            Math.min(first.right, second.right) - Math.max(first.left, second.left) > 1 &&
            Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 1
          const sceneRect = rect(scene)
          const protagonistRect = rect(protagonist)
          const protagonistStyle = window.getComputedStyle(protagonist)
          const stageStyle = window.getComputedStyle(stageElement)
          const accentFieldStyle = window.getComputedStyle(stageElement, '::after')
          const transformX = new DOMMatrixReadOnly(protagonistStyle.transform).m41
          const slotEntries = [
            ['title', title],
            ['readout', readout],
            ['index', index],
          ] as const
          const slotOverlapIssues = slotEntries.flatMap(([firstName, first], firstIndex) =>
            slotEntries.slice(firstIndex + 1).flatMap(([secondName, second]) =>
              intersects(rect(first), rect(second)) ? [`${firstName}/${secondName}`] : [],
            ),
          )
          const controlIssues = controls.flatMap((control) => {
            const controlRect = rect(control)
            const style = window.getComputedStyle(control)

            return controlRect.width < 43.5 ||
              controlRect.height < 43.5 ||
              controlRect.left < -1 ||
              controlRect.right > viewportWidth + 1 ||
              style.display === 'none' ||
              style.visibility === 'hidden'
              ? [
                  {
                    height: controlRect.height,
                    left: controlRect.left,
                    right: controlRect.right,
                    text: (control.textContent ?? '').replace(/\s+/g, ' ').trim(),
                    width: controlRect.width,
                  },
                ]
              : []
          })

          return {
            accentField: {
              backgroundImage: accentFieldStyle.backgroundImage,
              content: accentFieldStyle.content,
              display: accentFieldStyle.display,
              insetInlineEnd: accentFieldStyle.insetInlineEnd,
              insetInlineStart: accentFieldStyle.insetInlineStart,
            },
            arcRightAnchorDelta:
              variant === 'arc'
                ? protagonistRect.right - transformX - sceneRect.right
                : null,
            controlIssues,
            documentWidths: {
              bodyScrollWidth: document.body.scrollWidth,
              documentClientWidth: document.documentElement.clientWidth,
              documentScrollWidth: document.documentElement.scrollWidth,
            },
            homeContained:
              variant === 'home'
                ? protagonistRect.left >= sceneRect.left - 1 &&
                  protagonistRect.right <= sceneRect.right + 1
                : null,
            oversizedArcMachine:
              variant === 'arc' && viewportWidth <= 560
                ? protagonistRect.width > sceneRect.width
                : null,
            protagonistMargins: {
              left: Number.parseFloat(protagonistStyle.marginLeft),
              right: Number.parseFloat(protagonistStyle.marginRight),
            },
            protagonistRight: protagonistRect.right,
            slotOverlapIssues,
            stageClientWidth: stageElement.clientWidth,
            stageClipsOverflow:
              stageStyle.overflowX === 'hidden' ||
              stageStyle.overflowX === 'clip' ||
              stageStyle.overflowY === 'hidden' ||
              stageStyle.overflowY === 'clip',
            stageScrollWidth: stageElement.scrollWidth,
            transformX,
          }
        },
        { variant: route.variant, viewportWidth },
      )

      expect.soft(
        geometry.documentWidths.documentScrollWidth,
        `${label} document positive overflow`,
      ).toBeLessThanOrEqual(geometry.documentWidths.documentClientWidth + epsilon)
      expect.soft(
        geometry.documentWidths.bodyScrollWidth,
        `${label} body positive overflow`,
      ).toBeLessThanOrEqual(geometry.documentWidths.documentClientWidth + epsilon)
      expect.soft(geometry.stageScrollWidth, `${label} stage internal scrollWidth`).toBeLessThanOrEqual(
        geometry.stageClientWidth + epsilon,
      )
      expect.soft(geometry.stageClipsOverflow, `${label} stage remains overflow-visible`).toBe(false)
      expect.soft(geometry.accentField.content, `${label} accent field content`).not.toBe('none')
      expect.soft(geometry.accentField.display, `${label} accent field display`).not.toBe('none')
      expect.soft(geometry.accentField.backgroundImage, `${label} radial accent field`).toContain(
        'radial-gradient',
      )
      expect.soft(geometry.accentField.insetInlineStart, `${label} accent field inline start`).toBe(
        '0px',
      )
      expect.soft(geometry.accentField.insetInlineEnd, `${label} accent field inline end`).toBe(
        '0px',
      )
      expect.soft(
        geometry.protagonistRight,
        `${label} machine positive overflow`,
      ).toBeLessThanOrEqual(viewportWidth + epsilon)
      expect.soft(geometry.slotOverlapIssues, `${label} title/readout/index overlap`).toEqual([])
      expect.soft(geometry.controlIssues, `${label} complete 44px control inventory`).toEqual([])

      if (route.variant === 'home') {
        expect.soft(geometry.homeContained, `${label} Home machine stays in scene`).toBe(true)
        expect.soft(
          geometry.protagonistMargins.left,
          `${label} Home machine left margin`,
        ).toBeGreaterThanOrEqual(0)
        expect.soft(
          geometry.protagonistMargins.right,
          `${label} Home machine right margin`,
        ).toBeGreaterThanOrEqual(0)
      } else {
        expect.soft(geometry.transformX, `${label} Arc machine only shifts left`).toBeLessThanOrEqual(0)
        expect.soft(geometry.arcRightAnchorDelta, `${label} Arc machine right anchor`).toBeCloseTo(0, 0)

        if (viewportWidth <= 560) {
          expect.soft(geometry.oversizedArcMachine, `${label} Arc machine stays oversized`).toBe(true)
        }
      }
    }
  }
})

test('Home and Arc Stage geometry keeps applicable responsive capacity gates', async ({ page }) => {
  for (const route of sharedInstrumentStageRoutes) {
    await page.setViewportSize({ width: instrumentStageWidths[0], height: 1200 })

    const response = await page.goto(route.path)

    expect(response?.ok(), `${route.path} response`).toBe(true)

    for (const viewportWidth of instrumentStageWidths) {
      const label = routeLabel(route, viewportWidth)

      await page.setViewportSize({ width: viewportWidth, height: 1200 })
      await waitForViewportUnitLayout(page, viewportWidth)
      await expectBorderlessInstrumentStage(page, route, viewportWidth)
      await expectDocumentDoesNotOverflow(page, label)

      const stage = page.locator(`[data-instrument-stage="${route.variant}"]`)

      await expect(stage.locator(':scope > [data-stage-title]'), `${label} title slot`).toHaveCount(1)
      await expect(stage.locator(':scope > [data-stage-scene]'), `${label} scene slot`).toHaveCount(1)
      await expect(stage.locator(':scope > [data-stage-readout]'), `${label} readout slot`).toHaveCount(1)
      await expect(stage.locator(':scope > [data-stage-index]'), `${label} index slot`).toHaveCount(1)
      await expect(stage.locator(':scope > [data-stage-footer]'), `${label} footer slot`).toHaveCount(0)

      const geometry = await page.evaluate(
        ({ horizontalCapacitySelectors, variant, verticalCapacitySelectors, viewportWidth }) => {
          const main = document.querySelector('main#main-content')
          const stage = document.querySelector(`[data-instrument-stage="${variant}"]`)

          if (!(main instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
            throw new Error(`缺少 ${variant} Instrument Stage 或 main#main-content。`)
          }

          const mainRect = main.getBoundingClientRect()
          const mainStyle = window.getComputedStyle(main)
          const stageRect = stage.getBoundingClientRect()
          const stageStyle = window.getComputedStyle(stage)
          const accentFieldStyle = window.getComputedStyle(stage, '::after')
          const scene = stage.querySelector<HTMLElement>(':scope > [data-stage-scene]')

          if (!scene) {
            throw new Error(`缺少 ${variant} Instrument Stage scene。`)
          }

          const sceneStyle = window.getComputedStyle(scene)
          const paddingLeft = Number.parseFloat(mainStyle.paddingLeft)
          const paddingRight = Number.parseFloat(mainStyle.paddingRight)
          const horizontalOverflow = horizontalCapacitySelectors.flatMap((selector) =>
            Array.from(stage.querySelectorAll<HTMLElement>(selector))
              .filter((element) => element.scrollWidth > element.clientWidth + 1)
              .map((element) => ({
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
                selector,
                text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
              })),
          )
          const verticalOverflow = verticalCapacitySelectors.flatMap((selector) =>
            Array.from(stage.querySelectorAll<HTMLElement>(selector))
              .filter((element) => element.scrollHeight > element.clientHeight + 4)
              .map((element) => ({
                clientHeight: element.clientHeight,
                scrollHeight: element.scrollHeight,
                selector,
                text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
              })),
          )
          const lowerSectionOverflow = Array.from(
            main.querySelectorAll<HTMLElement>(':scope > section:not([data-instrument-stage])'),
          )
            .filter((section) => section.scrollWidth > section.clientWidth + 1)
            .map((section) => ({
              clientWidth: section.clientWidth,
              id: section.id,
              scrollWidth: section.scrollWidth,
            }))
          const compactGeometry = [561, 600, 640].includes(viewportWidth) && variant === 'arc'
            ? (() => {
                const railSelector = '[aria-label="Arc observation modes"]'
                const readoutSelector = '[data-stage-readout] > [data-active-project]'
                const rail = stage.querySelector<HTMLElement>(railSelector)
                const readoutOwner = stage.querySelector<HTMLElement>(readoutSelector)
                const primaryCta = stage.querySelector<HTMLElement>('[data-control-role="primary"]')

                if (!(rail instanceof HTMLElement) || !(readoutOwner instanceof HTMLElement)) {
                  throw new Error(`缺少 ${variant} compact readout 或 mode rail。`)
                }

                if (!(primaryCta instanceof HTMLElement)) {
                  throw new Error(`缺少 ${variant} compact primary CTA。`)
                }

                const isVisible = (element: HTMLElement) => {
                  const rect = element.getBoundingClientRect()
                  const style = window.getComputedStyle(element)

                  return (
                    rect.width > 0 &&
                    rect.height > 0 &&
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.visibility !== 'collapse'
                  )
                }
                const intersection = (first: DOMRect, second: DOMRect) => {
                  const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left))
                  const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top))

                  return {
                    area: width * height,
                    height,
                    width,
                  }
                }
                const railRect = rail.getBoundingClientRect()
                const readoutRailIntersection = intersection(readoutOwner.getBoundingClientRect(), railRect)
                const decorativeMachineLabel =
                  stage.querySelector<HTMLElement>('[data-stage-scene] p[aria-hidden="true"]')
                const decorativeRailIntersections =
                  decorativeMachineLabel && isVisible(decorativeMachineLabel)
                    ? [intersection(decorativeMachineLabel.getBoundingClientRect(), railRect)].filter(
                        (item) => item.area > 0,
                      )
                    : []
                const controls = Array.from(rail.querySelectorAll<HTMLButtonElement>('button'))
                const visibleControls = controls.filter(isVisible)
                const controlSizeIssues = visibleControls
                  .map((control) => {
                    const rect = control.getBoundingClientRect()

                    return {
                      height: rect.height,
                      text: (control.textContent ?? '').replace(/\s+/g, ' ').trim(),
                      width: rect.width,
                    }
                  })
                  .filter((item) => item.width < 43.5 || item.height < 43.5)
                const ctaRect = primaryCta.getBoundingClientRect()
                const ctaControlIntersections = visibleControls
                  .map((control) => ({
                    control: (control.textContent ?? '').replace(/\s+/g, ' ').trim(),
                    ...intersection(ctaRect, control.getBoundingClientRect()),
                  }))
                  .filter((item) => item.area > 0)
                const headlineLineWraps = Array.from(
                  stage.querySelectorAll<HTMLElement>('[data-stage-title] h1 + p > span'),
                )
                  .map((line) => {
                    const rect = line.getBoundingClientRect()
                    const lineHeight = Number.parseFloat(window.getComputedStyle(line).lineHeight)

                    return {
                      height: rect.height,
                      lineHeight,
                      text: (line.textContent ?? '').trim(),
                    }
                  })
                  .filter((item) => item.height > item.lineHeight + 1)
                return {
                  controlCount: controls.length,
                  controlSizeIssues,
                  ctaControlIntersections,
                  decorativeRailIntersections,
                  headlineLineWraps,
                  readoutRailIntersections:
                    readoutRailIntersection.width > 1 && readoutRailIntersection.height > 1
                      ? [readoutRailIntersection]
                      : [],
                  visibleControlCount: visibleControls.length,
                }
              })()
            : null

          return {
            accentField: {
              backgroundImage: accentFieldStyle.backgroundImage,
              content: accentFieldStyle.content,
              display: accentFieldStyle.display,
              insetInlineEnd: accentFieldStyle.insetInlineEnd,
              insetInlineStart: accentFieldStyle.insetInlineStart,
            },
            compactGeometry,
            horizontalOverflow,
            lowerSectionOverflow,
            mainClientWidth: main.clientWidth,
            mainClipsOverflow:
              mainStyle.overflowX === 'hidden' ||
              mainStyle.overflowX === 'clip' ||
              mainStyle.overflowY === 'hidden' ||
              mainStyle.overflowY === 'clip',
            mainContentLeft: mainRect.left + paddingLeft,
            mainContentRight: mainRect.right - paddingRight,
            mainContentWidth: main.clientWidth - paddingLeft - paddingRight,
            mainScrollWidth: main.scrollWidth,
            stageClientWidth: stage.clientWidth,
            stageClipsOverflow:
              stageStyle.overflowX === 'hidden' ||
              stageStyle.overflowX === 'clip' ||
              stageStyle.overflowY === 'hidden' ||
              stageStyle.overflowY === 'clip',
            stageDisplay: stageStyle.display,
            stageHeight: stageRect.height,
            stageLeft: stageRect.left,
            stageRight: stageRect.right,
            stageScrollWidth: stage.scrollWidth,
            stageWidth: stageRect.width,
            sceneClipsOverflow:
              sceneStyle.overflowX === 'hidden' ||
              sceneStyle.overflowX === 'clip' ||
              sceneStyle.overflowY === 'hidden' ||
              sceneStyle.overflowY === 'clip',
            verticalOverflow,
          }
        },
        {
          horizontalCapacitySelectors: [...stageHorizontalCapacitySelectors[route.variant]],
          variant: route.variant,
          verticalCapacitySelectors: [...stageVerticalCapacitySelectors[route.variant]],
          viewportWidth,
        },
      )

      expect.soft(geometry.mainScrollWidth, `${label} main scrollWidth`).toBeLessThanOrEqual(
        geometry.mainClientWidth + epsilon,
      )
      expect.soft(geometry.stageScrollWidth, `${label} stage internal scrollWidth`).toBeLessThanOrEqual(
        geometry.stageClientWidth + epsilon,
      )
      expect.soft(geometry.mainClipsOverflow, `${label} main remains overflow-visible`).toBe(false)
      expect.soft(geometry.stageClipsOverflow, `${label} stage remains overflow-visible`).toBe(false)
      expect.soft(geometry.accentField.content, `${label} accent field content`).not.toBe('none')
      expect.soft(geometry.accentField.display, `${label} accent field display`).not.toBe('none')
      expect.soft(geometry.accentField.backgroundImage, `${label} radial accent field`).toContain(
        'radial-gradient',
      )
      expect.soft(geometry.accentField.insetInlineStart, `${label} accent field inline start`).toBe(
        '0px',
      )
      expect.soft(geometry.accentField.insetInlineEnd, `${label} accent field inline end`).toBe(
        '0px',
      )
      expect.soft(geometry.stageLeft, `${label} stage left edge`).toBeGreaterThanOrEqual(
        geometry.mainContentLeft - epsilon,
      )
      expect.soft(geometry.stageRight, `${label} stage right edge`).toBeLessThanOrEqual(
        geometry.mainContentRight + epsilon,
      )
      expect.soft(geometry.stageDisplay, `${label} stage desktop layout`).toBe('grid')
      expect.soft(geometry.stageWidth, `${label} stage fills main content width`).toBeCloseTo(
        geometry.mainContentWidth,
        0,
      )
      expect.soft(geometry.horizontalOverflow, `${label} stage horizontal capacity`).toEqual([])
      expect.soft(geometry.verticalOverflow, `${label} stage vertical capacity`).toEqual([])
      expect.soft(geometry.lowerSectionOverflow, `${label} lower section self overflow`).toEqual([])
      expect.soft(geometry.sceneClipsOverflow, `${label} scene remains overflow-visible`).toBe(false)

      if (geometry.compactGeometry) {
        expect.soft(
          geometry.compactGeometry.readoutRailIntersections,
          `${label} readout and mode rail do not overlap`,
        ).toEqual([])
        expect.soft(
          geometry.compactGeometry.decorativeRailIntersections,
          `${label} decorative machine label and mode rail do not overlap`,
        ).toEqual([])
        expect.soft(
          geometry.compactGeometry.ctaControlIntersections,
          `${label} primary CTA and mode controls do not overlap`,
        ).toEqual([])
        expect.soft(
          geometry.compactGeometry.headlineLineWraps,
          `${label} headline design lines stay on one rendered line`,
        ).toEqual([])
        expect.soft(geometry.compactGeometry.controlCount, `${label} mode control count`).toBe(3)
        expect.soft(geometry.compactGeometry.visibleControlCount, `${label} visible mode controls`).toBe(3)
        expect.soft(
          geometry.compactGeometry.controlSizeIssues,
          `${label} compact mode controls retain 44px targets`,
        ).toEqual([])
      }
    }
  }

  await page.setViewportSize({ width: 561, height: 1200 })

  const arcResponse = await page.goto('/arc')

  expect(arcResponse?.ok(), '/arc response for observation state capacity').toBe(true)
  await waitForViewportUnitLayout(page, 561)

  const observationModes = page.getByRole('group', { name: 'Arc observation modes' }).getByRole('button')

  await expect(observationModes).toHaveCount(3)

  for (let index = 0; index < 3; index += 1) {
    const observationMode = observationModes.nth(index)
    const sceneTarget = await observationMode.getAttribute('data-scene-target')
    const expectedProject = sceneTarget?.replace('project:', '')

    await observationMode.click()
    await expect(observationMode).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-stage-scene] > [data-active-project]')).toHaveAttribute(
      'data-active-project',
      expectedProject ?? '',
    )
    await expect(page.locator('[data-stage-readout] > [data-active-project]')).toHaveAttribute(
      'data-active-project',
      expectedProject ?? '',
    )
    await waitForViewportUnitLayout(page, 561)

    const stateCapacity = await page.evaluate(() => {
      const selectors = [
        '[data-stage-scene]',
        '[data-stage-scene] > *',
        '[data-stage-readout]',
        '[data-stage-readout] > *',
        '[data-stage-readout] [data-control-role="primary"]',
      ]

      return selectors.flatMap((selector) =>
        Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter(
            (element) =>
              element.scrollWidth > element.clientWidth + 1 ||
              element.scrollHeight > element.clientHeight + 4,
          )
          .map((element) => ({
            clientHeight: element.clientHeight,
            clientWidth: element.clientWidth,
            scrollHeight: element.scrollHeight,
            scrollWidth: element.scrollWidth,
            selector,
            text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
          })),
      )
    })

    expect.soft(stateCapacity, `/arc @ 561px observation mode ${index + 1} machine/readout/CTA capacity`).toEqual([])
  }

  await page.setViewportSize({ width: 1920, height: 1200 })

  const reverseResizeResponse = await page.goto('/arc')

  expect(reverseResizeResponse?.ok(), '/arc reverse resize response').toBe(true)
  await waitForViewportUnitLayout(page, 1920)
  await page.setViewportSize({ width: 561, height: 1200 })
  await waitForViewportUnitLayout(page, 561)

  const reverseResizeGeometry = await page.evaluate(() => {
    const main = document.querySelector('main#main-content')
    const stage = document.querySelector('[data-instrument-stage="arc"]')

    if (!(main instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
      throw new Error('缺少 Arc Instrument Stage 或 main#main-content。')
    }

    const mainRect = main.getBoundingClientRect()
    const mainStyle = window.getComputedStyle(main)
    const paddingLeft = Number.parseFloat(mainStyle.paddingLeft)
    const paddingRight = Number.parseFloat(mainStyle.paddingRight)
    const stageRect = stage.getBoundingClientRect()

    return {
      mainContentLeft: mainRect.left + paddingLeft,
      mainContentRight: mainRect.right - paddingRight,
      paddingLeft,
      paddingRight,
      stageLeft: stageRect.left,
      stageRight: stageRect.right,
    }
  })

  expect.soft(reverseResizeGeometry.paddingLeft, '/arc 1920 → 561 left gutter').toBeCloseTo(22.44, 1)
  expect.soft(reverseResizeGeometry.paddingRight, '/arc 1920 → 561 right gutter').toBeCloseTo(22.44, 1)
  expect.soft(reverseResizeGeometry.stageLeft, '/arc 1920 → 561 stage left fill').toBeCloseTo(
    reverseResizeGeometry.mainContentLeft,
    0,
  )
  expect.soft(reverseResizeGeometry.stageRight, '/arc 1920 → 561 stage right fill').toBeCloseTo(
    reverseResizeGeometry.mainContentRight,
    0,
  )

  for (const viewportWidth of [1440, 1920] as const) {
    for (const path of ['/about', '/arc/signal-ledger'] as const) {
      await page.setViewportSize({ width: viewportWidth, height: 1200 })

      const response = await page.goto(path)
      const mainWidth = await page.locator('main#main-content').evaluate((main) => main.getBoundingClientRect().width)

      expect(response?.ok(), `${path} response`).toBe(true)
      expect.soft(mainWidth, `${routeLabel({ group: 'content', heading: '', path }, viewportWidth)} main width`).toBeCloseTo(
        1180,
        0,
      )
    }
  }
})

test('Rialo desktop owns a 60–70% scene and an independent readable event rail', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })

  const response = await page.goto('/rialo')

  expect(response?.ok(), '/rialo desktop geometry response').toBe(true)
  await waitForViewportUnitLayout(page, 1440)

  const stage = page.locator('[data-instrument-stage="rialo"]')
  const titleSlot = stage.locator(':scope > [data-stage-title]')
  const sceneSlot = stage.locator(':scope > [data-stage-scene]')
  const readoutSlot = stage.locator(':scope > [data-stage-readout]')
  const indexSlot = stage.locator(':scope > [data-stage-index]')
  const title = titleSlot.getByRole('heading', { level: 1, name: 'Rialo' })
  const radar = sceneSlot.locator('[data-cinematic-spatial]')
  const readout = readoutSlot.locator('[data-rialo-readout]')
  const timeline = indexSlot.getByRole('list', { name: 'Rialo Captain core loop' })
  const controls = timeline.getByRole('button')
  const activeDescription = timeline.locator('[data-rialo-step-description]:visible')
  const primaryCta = readout.locator('[data-control-role="primary"]')
  const rialoProject = projects.find((project) => project.slug === 'rialo-captain')

  if (!rialoProject) {
    throw new Error('缺少 Rialo Captain 项目。')
  }

  await expect(stage).toHaveCount(1)
  await expect(titleSlot).toHaveCount(1)
  await expect(sceneSlot).toHaveCount(1)
  await expect(readoutSlot).toHaveCount(1)
  await expect(indexSlot).toHaveCount(1)
  await expect(title).toHaveCount(1)
  await expect(radar).toHaveCount(1)
  await expect(readout).toHaveCount(1)
  await expect(timeline).toHaveCount(1)
  await expect(timeline.locator(':scope > [data-rialo-step]')).toHaveCount(5)
  await expect(controls).toHaveCount(5)
  await expect(activeDescription).toHaveCount(1)
  await expect(primaryCta).toHaveCount(1)
  await expect(title).toBeVisible()
  await expect(radar).toBeVisible()
  await expect(readout).toBeVisible()
  await expect(activeDescription).toBeVisible()
  await expect(primaryCta).toBeVisible()
  for (const [index, step] of rialoProject.coreLoop.entries()) {
    await expect(controls.nth(index)).toHaveAccessibleName(
      new RegExp(`${['Observe', 'Cover', 'Trigger', 'Settle', 'Explain'][index]}.*${step.label}`),
    )
  }

  const geometry = await stage.evaluate((stageElement) => {
    const stage = stageElement as HTMLElement
    const titleSlot = stage.querySelector<HTMLElement>(':scope > [data-stage-title]')
    const sceneSlot = stage.querySelector<HTMLElement>(':scope > [data-stage-scene]')
    const readoutSlot = stage.querySelector<HTMLElement>(':scope > [data-stage-readout]')
    const indexSlot = stage.querySelector<HTMLElement>(':scope > [data-stage-index]')
    const title = titleSlot?.querySelector<HTMLElement>('h1')
    const radar = sceneSlot?.querySelector<HTMLElement>('[data-cinematic-spatial]')
    const readout = readoutSlot?.querySelector<HTMLElement>('[data-rialo-readout]')
    const timeline = indexSlot?.querySelector<HTMLElement>(
      '[aria-label="Rialo Captain core loop"]',
    )
    const activeDescription = timeline?.querySelector<HTMLElement>(
      '[data-rialo-step-description]:not([hidden])',
    )
    const primaryCta = readout?.querySelector<HTMLElement>('[data-control-role="primary"]')
    const controls = timeline
      ? Array.from(timeline.querySelectorAll<HTMLButtonElement>('button'))
      : []

    if (
      !titleSlot ||
      !sceneSlot ||
      !readoutSlot ||
      !indexSlot ||
      !title ||
      !radar ||
      !readout ||
      !timeline ||
      !activeDescription ||
      !primaryCta
    ) {
      throw new Error('缺少 Rialo 桌面真实几何 owner。')
    }

    const rect = (element: Element) => element.getBoundingClientRect()
    const stageRect = rect(stage)
    const titleSlotRect = rect(titleSlot)
    const sceneRect = rect(sceneSlot)
    const readoutSlotRect = rect(readoutSlot)
    const indexRect = rect(indexSlot)
    const titleRect = rect(title)
    const radarRect = rect(radar)
    const readoutRect = rect(readout)
    const activeDescriptionRect = rect(activeDescription)
    const primaryCtaRect = rect(primaryCta)
    const intersectionArea = (first: DOMRect, second: DOMRect) =>
      Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left)) *
      Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top))
    const readoutStyle = window.getComputedStyle(readout)
    const zeroProbe = document.createElement('span')

    zeroProbe.textContent = '0'.repeat(100)
    zeroProbe.style.display = 'inline-block'
    zeroProbe.style.fontFamily = readoutStyle.fontFamily
    zeroProbe.style.fontSize = readoutStyle.fontSize
    zeroProbe.style.fontStretch = readoutStyle.fontStretch
    zeroProbe.style.fontStyle = readoutStyle.fontStyle
    zeroProbe.style.fontVariant = readoutStyle.fontVariant
    zeroProbe.style.fontWeight = readoutStyle.fontWeight
    zeroProbe.style.letterSpacing = '0'
    zeroProbe.style.pointerEvents = 'none'
    zeroProbe.style.position = 'fixed'
    zeroProbe.style.visibility = 'hidden'
    zeroProbe.style.whiteSpace = 'pre'
    document.body.append(zeroProbe)

    const zeroGlyphWidth = zeroProbe.getBoundingClientRect().width / 100

    zeroProbe.remove()

    const titleRange = document.createRange()

    titleRange.selectNodeContents(title)

    const titleLineRects = Array.from(titleRange.getClientRects()).filter(
      (line) => line.width > 0 && line.height > 0,
    )
    const visibleControls = controls.filter((control) => {
      const controlRect = rect(control)
      const style = window.getComputedStyle(control)

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        controlRect.width > 0 &&
        controlRect.height > 0
      )
    })
    const controlContainmentIssues = visibleControls.flatMap((control) => {
      const controlRect = rect(control)

      return controlRect.left < indexRect.left - 1 || controlRect.right > indexRect.right + 1
        ? [
            {
              bottom: controlRect.bottom,
              left: controlRect.left,
              right: controlRect.right,
              text: (control.textContent ?? '').replace(/\s+/g, ' ').trim(),
              top: controlRect.top,
            },
          ]
        : []
    })

    return {
      activeDescriptionInsideIndex:
        activeDescriptionRect.left >= indexRect.left - 1 &&
        activeDescriptionRect.right <= indexRect.right + 1 &&
        activeDescriptionRect.top >= indexRect.top - 1 &&
        activeDescriptionRect.bottom <= indexRect.bottom + 1,
      controlSizeIssues: visibleControls
        .map((control) => {
          const controlRect = rect(control)

          return {
            height: controlRect.height,
            text: (control.textContent ?? '').replace(/\s+/g, ' ').trim(),
            width: controlRect.width,
          }
        })
        .filter((control) => control.width < 43.5 || control.height < 43.5),
      controlContainmentIssues,
      slotOverlapAreas: {
        readoutIndex: intersectionArea(readoutSlotRect, indexRect),
        sceneIndex: intersectionArea(sceneRect, indexRect),
        sceneReadout: intersectionArea(sceneRect, readoutSlotRect),
        titleIndex: intersectionArea(titleSlotRect, indexRect),
        titleReadout: intersectionArea(titleSlotRect, readoutSlotRect),
        titleScene: intersectionArea(titleSlotRect, sceneRect),
      },
      primaryCtaInsideReadout:
        primaryCtaRect.left >= readoutRect.left - 1 &&
        primaryCtaRect.right <= readoutRect.right + 1 &&
        primaryCtaRect.top >= readoutRect.top - 1 &&
        primaryCtaRect.bottom <= readoutRect.bottom + 1,
      radarInsideScene:
        radarRect.left >= sceneRect.left - 1 &&
        radarRect.right <= sceneRect.right + 1 &&
        radarRect.top >= sceneRect.top - 1 &&
        radarRect.bottom <= sceneRect.bottom + 1,
      readoutInlineCh:
        zeroGlyphWidth > 0
          ? Number.parseFloat(readoutStyle.inlineSize) / zeroGlyphWidth
          : Number.NaN,
      readoutInlineSize: Number.parseFloat(readoutStyle.inlineSize),
      readoutRectWidth: readoutRect.width,
      sceneRatio: sceneRect.width / stageRect.width,
      stageHeight: stageRect.height,
      stageHorizontalMargins: {
        left: Number.parseFloat(window.getComputedStyle(stage).marginLeft),
        right: Number.parseFloat(window.getComputedStyle(stage).marginRight),
      },
      titleCapacity:
        title.scrollWidth <= title.clientWidth + 1 &&
        titleRect.left >= titleSlotRect.left - 1 &&
        titleRect.right <= titleSlotRect.right + 1,
      titleLineCount: titleLineRects.length,
      titleText: (title.textContent ?? '').trim(),
      visibleControlCount: visibleControls.length,
      zeroGlyphWidth,
    }
  })

  expect.soft(geometry.stageHeight, 'Rialo desktop stage height').toBeLessThanOrEqual(1000 + epsilon)
  expect.soft(geometry.sceneRatio, 'Rialo desktop scene/stage width ratio').toBeGreaterThanOrEqual(0.6)
  expect.soft(geometry.sceneRatio, 'Rialo desktop scene/stage width ratio').toBeLessThanOrEqual(0.7)
  expect.soft(geometry.zeroGlyphWidth, 'Rialo readout actual-font zero glyph width').toBeGreaterThan(0)
  expect.soft(Number.isFinite(geometry.readoutInlineCh), 'Rialo readout ch conversion').toBe(true)
  expect.soft(geometry.readoutInlineCh, 'Rialo desktop readout inline size').toBeGreaterThanOrEqual(28)
  expect.soft(geometry.readoutInlineCh, 'Rialo desktop readout inline size').toBeLessThanOrEqual(36.1)
  expect.soft(geometry.readoutRectWidth, 'Rialo readout rendered/computed inline size').toBeCloseTo(
    geometry.readoutInlineSize,
    0,
  )
  expect.soft(geometry.titleText, 'Rialo desktop whole-word title').toBe('Rialo')
  expect.soft(geometry.titleLineCount, 'Rialo desktop title line boxes').toBe(1)
  expect.soft(geometry.titleCapacity, 'Rialo desktop title is not clipped').toBe(true)
  expect.soft(geometry.slotOverlapAreas, 'Rialo desktop independent non-overlapping slots').toEqual({
    readoutIndex: 0,
    sceneIndex: 0,
    sceneReadout: 0,
    titleIndex: 0,
    titleReadout: 0,
    titleScene: 0,
  })
  expect.soft(geometry.radarInsideScene, 'Rialo desktop radar is contained by scene').toBe(true)
  expect.soft(geometry.activeDescriptionInsideIndex, 'Rialo active description stays in index').toBe(true)
  expect.soft(geometry.primaryCtaInsideReadout, 'Rialo primary CTA stays in readout').toBe(true)
  expect.soft(geometry.visibleControlCount, 'Rialo desktop visible stage controls').toBe(5)
  expect.soft(geometry.controlSizeIssues, 'Rialo desktop 44px stage controls').toEqual([])
  expect.soft(geometry.controlContainmentIssues, 'Rialo desktop controls stay within index width').toEqual([])
  expect.soft(geometry.stageHorizontalMargins.left, 'Rialo desktop stage left margin').toBeGreaterThanOrEqual(0)
  expect.soft(geometry.stageHorizontalMargins.right, 'Rialo desktop stage right margin').toBeGreaterThanOrEqual(0)
  await expectDocumentDoesNotOverflow(page, '/rialo @ 1440×1000')
})

test('Rialo 390×844 is a real title → scene → readout → index column', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })

  const response = await page.goto('/rialo')

  expect(response?.ok(), '/rialo mobile geometry response').toBe(true)
  await waitForViewportUnitLayout(page, 390)

  const stage = page.locator('[data-instrument-stage="rialo"]')
  const titleSlot = stage.locator(':scope > [data-stage-title]')
  const sceneSlot = stage.locator(':scope > [data-stage-scene]')
  const readoutSlot = stage.locator(':scope > [data-stage-readout]')
  const indexSlot = stage.locator(':scope > [data-stage-index]')
  const title = titleSlot.getByRole('heading', { level: 1, name: 'Rialo' })
  const radar = sceneSlot.locator('[data-cinematic-spatial]')
  const readout = readoutSlot.locator('[data-rialo-readout]')
  const timeline = indexSlot.getByRole('list', { name: 'Rialo Captain core loop' })
  const items = timeline.locator(':scope > [data-rialo-step]')
  const controls = timeline.getByRole('button')
  const activeDescription = timeline.locator('[data-rialo-step-description]:visible')
  const primaryCta = readout.locator('[data-control-role="primary"]')

  await expect(stage).toHaveCount(1)
  await expect(titleSlot).toHaveCount(1)
  await expect(sceneSlot).toHaveCount(1)
  await expect(readoutSlot).toHaveCount(1)
  await expect(indexSlot).toHaveCount(1)
  await expect(title).toHaveCount(1)
  await expect(radar).toHaveCount(1)
  await expect(readout).toHaveCount(1)
  await expect(timeline).toHaveCount(1)
  await expect(items).toHaveCount(5)
  await expect(controls).toHaveCount(5)
  await expect(activeDescription).toHaveCount(1)
  await expect(primaryCta).toHaveCount(1)
  await expect(title).toBeVisible()
  await expect(radar).toBeVisible()
  await expect(readout).toBeVisible()
  await expect(activeDescription).toBeVisible()
  await expect(primaryCta).toBeVisible()

  const geometry = await stage.evaluate((stageElement) => {
    const stage = stageElement as HTMLElement
    const titleSlot = stage.querySelector<HTMLElement>(':scope > [data-stage-title]')
    const sceneSlot = stage.querySelector<HTMLElement>(':scope > [data-stage-scene]')
    const readoutSlot = stage.querySelector<HTMLElement>(':scope > [data-stage-readout]')
    const indexSlot = stage.querySelector<HTMLElement>(':scope > [data-stage-index]')
    const title = titleSlot?.querySelector<HTMLElement>('h1')
    const radar = sceneSlot?.querySelector<HTMLElement>('[data-cinematic-spatial]')
    const readout = readoutSlot?.querySelector<HTMLElement>('[data-rialo-readout]')
    const timeline = indexSlot?.querySelector<HTMLElement>(
      '[aria-label="Rialo Captain core loop"]',
    )
    const items = timeline
      ? Array.from(timeline.querySelectorAll<HTMLElement>(':scope > [data-rialo-step]'))
      : []
    const controls = timeline
      ? Array.from(timeline.querySelectorAll<HTMLButtonElement>('button'))
      : []
    const activeDescription = timeline?.querySelector<HTMLElement>(
      '[data-rialo-step-description]:not([hidden])',
    )
    const primaryCta = readout?.querySelector<HTMLElement>('[data-control-role="primary"]')

    if (
      !titleSlot ||
      !sceneSlot ||
      !readoutSlot ||
      !indexSlot ||
      !title ||
      !radar ||
      !readout ||
      !timeline ||
      !activeDescription ||
      !primaryCta
    ) {
      throw new Error('缺少 Rialo 390px 真实几何 owner。')
    }

    const rect = (element: Element) => element.getBoundingClientRect()
    const stageRect = rect(stage)
    const slotRects = [titleSlot, sceneSlot, readoutSlot, indexSlot].map((slot) => rect(slot))
    const titleRect = rect(title)
    const sceneRect = rect(sceneSlot)
    const radarRect = rect(radar)
    const itemRects = items.map((item) => rect(item))
    const importantElements = [title, ...controls, activeDescription, primaryCta]
    const viewportWidth = document.documentElement.clientWidth
    const titleRange = document.createRange()

    titleRange.selectNodeContents(title)

    const titleLineRects = Array.from(titleRange.getClientRects()).filter(
      (line) => line.width > 0 && line.height > 0,
    )
    const orderIssues = slotRects.slice(1).flatMap((current, index) => {
      const previous = slotRects[index]

      return current.top < previous.bottom - 1
        ? [
            {
              currentTop: current.top,
              previousBottom: previous.bottom,
              slot: index + 1,
            },
          ]
        : []
    })
    const slotGaps = slotRects.slice(1).map((current, index) => current.top - slotRects[index].bottom)
    const itemOrderIssues = itemRects.slice(1).flatMap((current, index) => {
      const previous = itemRects[index]

      return current.top < previous.bottom - 1
        ? [
            {
              currentTop: current.top,
              previousBottom: previous.bottom,
              step: index + 2,
            },
          ]
        : []
    })
    const controlSizeIssues = controls.flatMap((control) => {
      const controlRect = rect(control)
      const style = window.getComputedStyle(control)
      const visible =
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        controlRect.width > 0 &&
        controlRect.height > 0

      return !visible || controlRect.width < 43.5 || controlRect.height < 43.5
        ? [
            {
              height: controlRect.height,
              text: (control.textContent ?? '').replace(/\s+/g, ' ').trim(),
              visible,
              width: controlRect.width,
            },
          ]
        : []
    })
    const indexRect = rect(indexSlot)
    const controlContainmentIssues = controls.flatMap((control) => {
      const controlRect = rect(control)

      return controlRect.left < indexRect.left - 1 || controlRect.right > indexRect.right + 1
        ? [
            {
              bottom: controlRect.bottom,
              left: controlRect.left,
              right: controlRect.right,
              text: (control.textContent ?? '').replace(/\s+/g, ' ').trim(),
              top: controlRect.top,
            },
          ]
        : []
    })
    const clippingIssues = importantElements.flatMap((element) => {
      const elementRect = rect(element)
      const issues: Array<Record<string, unknown>> = []

      if (elementRect.left < -1 || elementRect.right > viewportWidth + 1) {
        issues.push({
          left: elementRect.left,
          reason: 'outside real viewport rect',
          right: elementRect.right,
          text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
          viewportWidth,
        })
      }

      if (
        element.scrollWidth > element.clientWidth + 1 ||
        element.scrollHeight > element.clientHeight + 1
      ) {
        issues.push({
          clientHeight: element.clientHeight,
          clientWidth: element.clientWidth,
          reason: 'self clipping',
          scrollHeight: element.scrollHeight,
          scrollWidth: element.scrollWidth,
          text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        })
      }

      let ancestor = element.parentElement

      while (ancestor) {
        const style = window.getComputedStyle(ancestor)
        const ancestorRect = rect(ancestor)
        const clipsX = style.overflowX === 'hidden' || style.overflowX === 'clip'
        const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip'

        if (
          (clipsX &&
            (elementRect.left < ancestorRect.left - 1 ||
              elementRect.right > ancestorRect.right + 1)) ||
          (clipsY &&
            (elementRect.top < ancestorRect.top - 1 ||
              elementRect.bottom > ancestorRect.bottom + 1))
        ) {
          issues.push({
            ancestor: ancestor.tagName.toLowerCase(),
            reason: 'clipped by ancestor rect',
            text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
          })
          break
        }

        ancestor = ancestor.parentElement
      }

      return issues
    })
    const stageStyle = window.getComputedStyle(stage)
    const radarStyle = window.getComputedStyle(radar)
    const titleDensity = items.map((item) => {
      const stageTitle = item.querySelector<HTMLElement>(
        'button > span:nth-of-type(2) > span:nth-of-type(2)',
      )

      if (!stageTitle) {
        throw new Error('缺少 Rialo stage title owner。')
      }

      const style = window.getComputedStyle(stageTitle)
      const titleRect = rect(stageTitle)

      return {
        active: item.getAttribute('data-active') === 'true',
        compact:
          style.clipPath !== 'none' &&
          titleRect.width <= 1.5 &&
          titleRect.height <= 1.5,
        text: (stageTitle.textContent ?? '').trim(),
      }
    })

    return {
      clippingIssues,
      controlContainmentIssues,
      controlSizeIssues,
      documentWidths: {
        bodyScrollWidth: document.body.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
      },
      itemOrderIssues,
      orderIssues,
      radarInsideScene:
        radarRect.left >= sceneRect.left - 1 &&
        radarRect.right <= sceneRect.right + 1 &&
        radarRect.top >= sceneRect.top - 1 &&
        radarRect.bottom <= sceneRect.bottom + 1,
      radarMargins: {
        left: Number.parseFloat(radarStyle.marginLeft),
        right: Number.parseFloat(radarStyle.marginRight),
      },
      slotGaps,
      slotsInsideStage: slotRects.map((slotRect) => ({
        horizontal:
          slotRect.left >= stageRect.left - 1 && slotRect.right <= stageRect.right + 1,
        positive: slotRect.width > 0 && slotRect.height > 0,
      })),
      stageMargins: {
        left: Number.parseFloat(stageStyle.marginLeft),
        right: Number.parseFloat(stageStyle.marginRight),
      },
      titleCapacity:
        title.scrollWidth <= title.clientWidth + 1 &&
        titleRect.left >= slotRects[0].left - 1 &&
        titleRect.right <= slotRects[0].right + 1,
      titleLineCount: titleLineRects.length,
      titleText: (title.textContent ?? '').trim(),
      titleDensity,
    }
  })

  expect.soft(geometry.orderIssues, 'Rialo mobile slot order/overlap').toEqual([])
  expect.soft(
    geometry.slotGaps.every((gap) => gap >= -1 && gap <= 32),
    'Rialo mobile adjacent slot gaps stay deliberate',
  ).toBe(true)
  expect.soft(geometry.slotsInsideStage, 'Rialo mobile slot rects stay in stage').toEqual([
    { horizontal: true, positive: true },
    { horizontal: true, positive: true },
    { horizontal: true, positive: true },
    { horizontal: true, positive: true },
  ])
  expect.soft(geometry.titleText, 'Rialo mobile whole-word title').toBe('Rialo')
  expect.soft(geometry.titleLineCount, 'Rialo mobile title line boxes').toBe(1)
  expect.soft(geometry.titleCapacity, 'Rialo mobile title is not clipped').toBe(true)
  expect.soft(geometry.radarInsideScene, 'Rialo mobile radar is contained by scene').toBe(true)
  expect.soft(geometry.itemOrderIssues, 'Rialo five steps remain adjacent and ordered').toEqual([])
  expect.soft(geometry.controlSizeIssues, 'Rialo five visible 44px stage controls').toEqual([])
  expect.soft(geometry.controlContainmentIssues, 'Rialo five controls stay within index width').toEqual([])
  expect.soft(
    geometry.titleDensity.filter((title) => title.active && !title.compact),
    'Rialo active long title remains visible',
  ).toHaveLength(1)
  expect.soft(
    geometry.titleDensity.filter((title) => !title.active && title.compact),
    'Rialo inactive long titles are visually compact',
  ).toHaveLength(4)
  expect.soft(geometry.clippingIssues, 'Rialo title/steps/description/CTA real rect clipping').toEqual([])
  expect.soft(geometry.stageMargins.left, 'Rialo mobile stage left margin').toBeGreaterThanOrEqual(0)
  expect.soft(geometry.stageMargins.right, 'Rialo mobile stage right margin').toBeGreaterThanOrEqual(0)
  expect.soft(geometry.radarMargins.left, 'Rialo mobile radar left margin').toBeGreaterThanOrEqual(0)
  expect.soft(geometry.radarMargins.right, 'Rialo mobile radar right margin').toBeGreaterThanOrEqual(0)
  expect.soft(
    geometry.documentWidths.documentScrollWidth,
    'Rialo mobile document scrollWidth',
  ).toBeLessThanOrEqual(geometry.documentWidths.documentClientWidth + epsilon)
  expect.soft(
    geometry.documentWidths.bodyScrollWidth,
    'Rialo mobile body scrollWidth',
  ).toBeLessThanOrEqual(geometry.documentWidths.documentClientWidth + epsilon)
})

test('desktop immersive stages meet the footer within 0–48px without shrinking the stage', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })

  for (const route of instrumentStageRoutes) {
    const response = await page.goto(route.path)

    expect(response?.ok(), `${route.path} stage/footer response`).toBe(true)
    await waitForViewportUnitLayout(page, 1440)

    const geometry = await page.evaluate((variant) => {
      const stage = document.querySelector<HTMLElement>(
        `[data-instrument-stage="${variant}"]`,
      )
      const footer = document.querySelector<HTMLElement>('.site-footer')

      if (!stage || !footer) {
        throw new Error(`缺少 ${variant} stage 或 site footer。`)
      }

      const stageRect = stage.getBoundingClientRect()
      const footerRect = footer.getBoundingClientRect()

      return {
        gap: footerRect.top - stageRect.bottom,
        stageHeight: stageRect.height,
      }
    }, route.variant)

    expect(geometry.gap, `${route.path} stage→footer gap`).toBeGreaterThanOrEqual(0)
    expect(geometry.gap, `${route.path} stage→footer gap`).toBeLessThanOrEqual(48)
    expect(geometry.stageHeight, `${route.path} viewport-bound stage remains substantial`).toBeGreaterThan(
      600,
    )
  }
})

test('opened project disclosures preserve mobile reflow and whole words', async ({ page }) => {
  for (const viewportWidth of compactCinematicStageWidths) {
    for (const project of projects) {
      const path = `/${project.ecosystem}/${project.slug}`
      const label = routeLabel({ path }, viewportWidth)
      const expectedDisclosureCount =
        2 + project.coreLoop.length + project.evidence.length + project.gallery.length

      await page.setViewportSize({ width: viewportWidth, height: 1200 })

      const response = await page.goto(path)

      expect(response?.ok(), `${label} response`).toBe(true)
      await waitForViewportUnitLayout(page, viewportWidth)

      const caseFile = page.locator(`article[aria-label="${project.name} case file"]`)
      const disclosures = caseFile.locator('details')
      const summaries = disclosures.locator(':scope > summary')

      await expect(caseFile, `${label} case file`).toHaveCount(1)
      await expect(disclosures, `${label} disclosure inventory`).toHaveCount(
        expectedDisclosureCount,
      )
      await expect(summaries, `${label} disclosure summaries`).toHaveCount(
        expectedDisclosureCount,
      )

      for (let index = 0; index < expectedDisclosureCount; index += 1) {
        await summaries.nth(index).click()
        await expect(
          disclosures.nth(index),
          `${label} disclosure ${index + 1}`,
        ).toHaveAttribute('open', '')
      }

      await waitForStableLayout(page)
      await expectDocumentDoesNotOverflow(page, `${label} opened disclosures`)
      await expectSemanticBoxesFit(page, `${label} opened disclosures`)

      const expandedText = await caseFile.evaluate((article) => {
        const owners = Array.from(
          article.querySelectorAll<HTMLElement>(
            'details[open] :is(summary, h3, p, li, dt, dd, figcaption)',
          ),
        ).filter((element) => {
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element)

          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden'
          )
        })
        const overflowIssues = owners.flatMap((owner) =>
          owner.scrollWidth > owner.clientWidth + 1
            ? [
                {
                  clientWidth: owner.clientWidth,
                  scrollWidth: owner.scrollWidth,
                  text: (owner.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
                },
              ]
            : [],
        )
        const wordBreakIssues = owners.flatMap((owner) => {
          const style = window.getComputedStyle(owner)

          return style.wordBreak === 'break-all' || style.overflowWrap === 'anywhere'
            ? [
                {
                  overflowWrap: style.overflowWrap,
                  text: (owner.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
                  wordBreak: style.wordBreak,
                },
              ]
            : []
        })
        const fragmentedWords: string[] = []

        for (const owner of owners) {
          const walker = document.createTreeWalker(owner, NodeFilter.SHOW_TEXT)
          let textNode = walker.nextNode()

          while (textNode) {
            const text = textNode.textContent ?? ''

            for (const match of text.matchAll(/[A-Za-z0-9]+(?:[./_][A-Za-z0-9]+)*/g)) {
              const word = match[0]

              if (word.length < 2 || match.index === undefined) {
                continue
              }

              const range = document.createRange()

              range.setStart(textNode, match.index)
              range.setEnd(textNode, match.index + word.length)

              const lineRects = Array.from(range.getClientRects()).filter(
                (rect) => rect.width > 0 && rect.height > 0,
              )

              if (lineRects.length > 1) {
                fragmentedWords.push(word)
              }
            }

            textNode = walker.nextNode()
          }
        }

        return {
          fragmentedWords,
          overflowIssues,
          ownerCount: owners.length,
          wordBreakIssues,
        }
      })

      expect.soft(expandedText.ownerCount, `${label} expanded text owner count`).toBeGreaterThan(0)
      expect.soft(expandedText.overflowIssues, `${label} expanded text overflow`).toEqual([])
      expect.soft(expandedText.wordBreakIssues, `${label} break-all prohibition`).toEqual([])
      expect.soft(expandedText.fragmentedWords, `${label} whole-word rendering`).toEqual([])
    }
  }
})

const shardLabels = {
  'case-file': 'case files',
  content: 'content and error',
  immersive: 'immersive',
} as const satisfies Record<RouteGroup, string>

expect(routes).toHaveLength(expectedRouteCount)

for (const group of ['immersive', 'case-file', 'content'] as const satisfies readonly RouteGroup[]) {
  test(`${shardLabels[group]} routes meet responsive geometry`, async ({ page }) => {
    const shardRoutes = routes.filter((route) => route.group === group)

    for (const route of shardRoutes) {
      await page.setViewportSize(rotatedViewportOrder(route)[0])
      await runResponsiveRoute(page, route)
    }
  })
}
