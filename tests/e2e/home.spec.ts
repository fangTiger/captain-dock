import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'

import { projects } from '../../src/content/catalog'

const projectRoutes = projects.map((project) => `/${project.ecosystem}/${project.slug}`)
const exactProjectStatements: Readonly<Record<string, string>> = {
  arcpredict: 'Uncertainty becomes a market before it becomes a decision.',
  hadron: 'Issue the asset. Watch the market find its price.',
  'rialo-captain': 'Disruption becomes evidence, settlement, and a clear next move.',
  'signal-ledger': 'Every autonomous action leaves a receipt worth trusting.',
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth
    const viewportWidth = document.documentElement.clientWidth
    const bodyWidth = document.body.scrollWidth

    return documentWidth > viewportWidth || bodyWidth > viewportWidth
  })

  expect(hasOverflow).toBe(false)
}

async function expectKeyboardCanReach(page: Page, targetLabel: string, target: ReturnType<Page['locator']>) {
  await expect(target, `${targetLabel} 必须先存在，键盘遍历才有意义。`).toHaveCount(1)

  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press('Tab')

    const isFocused = await target.evaluate((node) => node === document.activeElement)

    if (isFocused) {
      return
    }
  }

  throw new Error(`键盘无法到达 ${targetLabel}。`)
}

async function openWithoutJavaScript(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: {
      width: 375,
      height: 900,
    },
  })
  const page = await context.newPage()

  await page.goto('/')

  return { context, page }
}

test('home keeps the project index readable without JavaScript', async ({ browser, baseURL }) => {
  const { context, page } = await openWithoutJavaScript(browser, baseURL)

  try {
    const main = page.locator('main#main-content')
    // \u7d22\u5f15\u6761\u662f\u670d\u52a1\u7aef\u6e32\u67d3\u7684\u7eaf\u94fe\u63a5\uff0c\u65e0 JS \u65f6\u5b83\u672c\u8eab\u5c31\u662f\u5bfc\u822a\u4e3b\u8def\u5f84\uff0c
    // \u4e0d\u518d\u9700\u8981 sr-only / noscript \u90a3\u5957\u5907\u7528\u94fe\u63a5
    const index = main.getByRole('navigation', { name: 'Project index' })

    await expect(page.locator('[data-static-scene="home"]')).toHaveCount(1)
    await expect(index).toHaveCount(1)

    for (const route of projectRoutes) {
      const link = index.locator(`a[href="${route}"]`)

      await expect(link).toHaveCount(1)
      await expect(link).toBeVisible()
    }

    expect(await main.innerText()).not.toMatch(/[\u3400-\u9fff]/)
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
  } finally {
    await context.close()
  }
})

test('home fits one screen with no vertical scroll and no footer', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 375, height: 900 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')

    const metrics = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }))

    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight + 1)
    // \u9875\u811a\u7684 Home/Arc/Rialo \u5728\u7ad9\u70b9 header \u91cc\u5df2\u7ecf\u6709\uff0c
    // \u5728\u4e0d\u6eda\u52a8\u7684\u95e8\u9762\u9875\u4e0a\u5b83\u53ea\u4f1a\u5236\u9020\u4e00\u6761\u901a\u5411\u7a7a\u767d\u7684\u6eda\u52a8\u6761
    await expect(page.locator('footer.site-footer')).toHaveCount(0)
  }
})

test('home index lists every project with its statement and a scene target', async ({ page }) => {
  await page.goto('/')

  const index = page.getByRole('navigation', { name: 'Project index' })

  await expect(index.locator('a')).toHaveCount(projects.length)

  for (const project of projects) {
    const entry = index.locator(`a[href="/${project.ecosystem}/${project.slug}"]`)

    await expect(entry).toHaveCount(1)
    await expect(entry).toContainText(exactProjectStatements[project.slug])
    await expect(entry).toHaveAttribute('data-scene-target', `project:${project.slug}`)
  }
})

test('home index hover drives the constellation preview target', async ({ page }) => {
  await page.goto('/')

  const shell = page.locator('[data-universe-shell]')

  await expect(shell).toHaveAttribute('data-universe-preview-target', '')
  await page.hover('a[data-scene-target="project:hadron"]')
  await expect(shell).toHaveAttribute('data-universe-preview-target', 'project:hadron')
})

test('home has no horizontal overflow at mobile and desktop widths', async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 900 },
    { width: 1440, height: 960 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expectNoHorizontalOverflow(page)
  }
})

test('home exposes skip link, navigation, ecosystem entries, project CTAs, and about by keyboard', async ({
  page,
}) => {
  await page.goto('/')

  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()

  await expectKeyboardCanReach(
    page,
    'global Arc navigation',
    page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Arc' }),
  )
  // 键盘焦点统一由索引条承担：星场是 aria-hidden 的装饰层，
  // 节点不进 Tab 顺序，避免同一导航目标出现两个 tab stop
  await expectKeyboardCanReach(
    page,
    'SIGNAL/LEDGER index entry',
    page
      .getByRole('navigation', { name: 'Project index' })
      .locator('a[href="/arc/signal-ledger"]'),
  )
})

test('about keeps unknown author details explicit and links back to the index', async ({ page }) => {
  await page.goto('/about')

  const main = page.locator('main#main-content')

  await expect(page.locator('h1')).toHaveCount(1)
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('About')
  await expect(main.getByText(/readable index of Arc and Rialo work/i)).toBeVisible()
  await expect(main.getByText(/author name is unconfirmed/i)).toBeVisible()
  await expect(main.getByText(/author background is unconfirmed/i)).toBeVisible()
  await expect(main.getByText(/contact details are unconfirmed/i)).toBeVisible()
  await expect(main.getByText(/project branches, case files, and live project entries/i)).toBeVisible()
  await expect(main.locator('a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0)
  await expect(main.getByRole('link', { name: 'Return to Captain Dock' })).toHaveAttribute('href', '/')
  await expect(main.getByRole('link', { name: 'Browse the project index' })).toHaveAttribute(
    'href',
    '/#project-index',
  )

  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  await expectKeyboardCanReach(
    page,
    'about return link',
    main.getByRole('link', { name: 'Return to Captain Dock' }),
  )
})
