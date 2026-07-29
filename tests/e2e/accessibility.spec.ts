import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import type { AxeResults, Result } from 'axe-core'

import { getAllPublicRoutes } from '../../src/content/selectors'

const routes = [...getAllPublicRoutes(), '/not-real'] as const
const blockingImpacts = new Set(['critical', 'serious'])

test.use({ reducedMotion: 'reduce' } as Parameters<typeof test.use>[0])

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

async function waitForMainReady(page: Page) {
  await expect(page.locator('main#main-content')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveCount(1)
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

function serializeResult(route: string, axeVersion: string, result: Result) {
  return {
    axeVersion,
    help: result.help,
    helpUrl: result.helpUrl,
    id: result.id,
    impact: result.impact,
    nodes: result.nodes.map((node) => ({
      failureSummary: node.failureSummary,
      html: node.html.slice(0, 500),
      target: node.target,
    })),
    route,
    tags: result.tags,
  }
}

async function attachAxeArtifacts(testInfo: TestInfo, results: readonly AxeResults[]) {
  const violations = results.flatMap((result) =>
    result.violations.map((violation) => serializeResult(result.url, result.testEngine.version, violation)),
  )
  const incomplete = results.flatMap((result) =>
    result.incomplete.map((item) => serializeResult(result.url, result.testEngine.version, item)),
  )

  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  })
  await testInfo.attach('axe-incomplete.json', {
    body: JSON.stringify(incomplete, null, 2),
    contentType: 'application/json',
  })
}

async function overlayInventory(page: Page, route: string) {
  return page.locator('dialog,[popover],[role=dialog],[aria-modal=true]').evaluateAll((elements, currentRoute) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()

      return {
        hidden: element.hasAttribute('hidden') || window.getComputedStyle(element).display === 'none',
        html: element.outerHTML.slice(0, 300),
        rect: {
          height: rect.height,
          width: rect.width,
        },
        route: currentRoute,
      }
    }),
    route,
  )
}

test('public routes have no serious or critical axe violations and no overlays', async ({ page }, testInfo) => {
  const axeResults: AxeResults[] = []
  const overlays: Array<Awaited<ReturnType<typeof overlayInventory>>[number]> = []

  for (const route of routes) {
    const response = await page.goto(route)

    if (route === '/not-real') {
      expect(response?.status(), `${route} response`).toBe(404)
    } else {
      expect(response?.ok(), `${route} response`).toBe(true)
    }

    await waitForMainReady(page)
    axeResults.push(await new AxeBuilder({ page }).analyze())
    overlays.push(...(await overlayInventory(page, route)))
  }

  await attachAxeArtifacts(testInfo, axeResults)
  await testInfo.attach('overlay-inventory.txt', {
    body: `OverlayInventory=${overlays.length}; FocusRestore=N/A`,
    contentType: 'text/plain',
  })

  const blocking = axeResults.flatMap((result) =>
    result.violations
      .filter((violation) => violation.impact && blockingImpacts.has(violation.impact))
      .map((violation) => serializeResult(result.url, result.testEngine.version, violation)),
  )

  expect(overlays, 'OverlayInventory=0; FocusRestore=N/A').toEqual([])
  expect(blocking, 'serious/critical axe violations').toEqual([])
})
