import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

import { projects } from '../../src/content/catalog'

const rialoSignals = ['Observe', 'Cover', 'Trigger', 'Settle', 'Explain'] as const

test.use({ reducedMotion: 'reduce' } as Parameters<typeof test.use>[0])

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

function signalProject() {
  const project = projects.find((item) => item.slug === 'signal-ledger')

  if (!project) {
    throw new Error('测试目录缺少 SIGNAL/LEDGER 项目。')
  }

  return project
}

function rialoProject() {
  const project = projects.find((item) => item.slug === 'rialo-captain')

  if (!project) {
    throw new Error('测试目录缺少 Rialo Captain 项目。')
  }

  return project
}

async function expectFocusRing(locator: Locator, label: string) {
  const focusStyles = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element)
    const outlineWidth = Number.parseFloat(style.outlineWidth)
    const outlineVisible =
      style.outlineStyle !== 'none' &&
      outlineWidth >= 2 &&
      style.outlineColor !== 'transparent' &&
      !style.outlineColor.endsWith(', 0)')
    const focusShadow = style.boxShadow !== 'none'

    return {
      boxShadow: style.boxShadow,
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineVisible,
      outlineWidth,
      passes: outlineVisible || focusShadow,
    }
  })

  expect(focusStyles.passes, `${label} focus ring ${JSON.stringify(focusStyles)}`).toBe(true)
}

async function tabUntilFocused(page: Page, target: Locator, label: string, options: Readonly<{ reverse?: boolean }> = {}) {
  for (let index = 0; index < 48; index += 1) {
    await page.keyboard.press(options.reverse ? 'Shift+Tab' : 'Tab')

    if (await target.evaluate((element) => element === document.activeElement)) {
      return
    }
  }

  throw new Error(`键盘无法到达 ${label}。`)
}

async function expectMainIsActive(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        activeId: document.activeElement?.id ?? '',
        activeTag: document.activeElement?.tagName.toLowerCase() ?? '',
      })),
    )
    .toEqual({ activeId: 'main-content', activeTag: 'main' })
}

async function expectRialoState(page: Page, stepIndex: number) {
  const project = rialoProject()
  const signal = rialoSignals[stepIndex]
  const step = project.coreLoop[stepIndex]
  const stage = page.locator('[data-instrument-stage="rialo"]')
  const readout = page.getByTestId('rialo-active-readout')
  const stageIndex = stage.locator('[data-stage-index]')
  const activeItem = stageIndex.locator('[data-rialo-step][data-active="true"]')
  const activeButton = activeItem.getByRole('button', {
    name: new RegExp(`${signal}.*${step.label}`),
  })
  const activeDescription = activeItem.locator('[data-rialo-step-description]')

  await expect(stage).toHaveCount(1)
  await expect(readout).toHaveCount(1)
  await expect(readout.getByRole('heading', { level: 3, name: signal })).toHaveCount(1)
  await expect(readout.getByRole('heading', { level: 3, name: signal })).toBeVisible()
  await expect(stageIndex).toHaveCount(1)
  await expect(activeItem).toHaveCount(1)
  await expect(activeButton).toHaveCount(1)
  await expect(activeButton).toBeVisible()
  await expect(activeButton).toHaveAttribute('aria-pressed', 'true')
  await expect(activeButton).toHaveAttribute('aria-current', 'step')
  await expect(activeItem.getByText(step.label, { exact: true })).toHaveCount(1)
  await expect(activeItem.getByText(step.label, { exact: true })).toBeVisible()
  await expect(activeDescription).toHaveCount(1)
  await expect(activeDescription).toBeVisible()
  await expect(activeDescription).toHaveText(step.description)
  await expect(stage.locator('[data-rialo-step-description]:visible')).toHaveCount(1)
}

test('/rialo skip link focuses main and Shift+Tab can return through header navigation', async ({ page }) => {
  await page.goto('/rialo')

  const skipLink = page.locator('.skip-link')
  const main = page.locator('main#main-content')
  const primaryNav = page.getByRole('navigation', { name: 'Primary navigation' })
  const arcLink = primaryNav.getByRole('link', { name: 'Arc' })
  const rialoLink = primaryNav.getByRole('link', { name: 'Rialo' })

  await page.keyboard.press('Tab')
  await expect(skipLink).toBeFocused()
  await expect(skipLink).toBeVisible()
  await expectFocusRing(skipLink, 'skip link')

  await page.keyboard.press('Enter')
  await expectMainIsActive(page)
  await expect(main).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(rialoLink).toBeFocused()
  await expectFocusRing(rialoLink, 'Rialo header link')

  await page.keyboard.press('Shift+Tab')
  await expect(arcLink).toBeFocused()
  await expectFocusRing(arcLink, 'Arc header link')

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/arc$/)
})

test('/ keyboard path reaches primary navigation and an internal project CTA before navigating', async ({ page }) => {
  await page.goto('/')

  const primaryNav = page.getByRole('navigation', { name: 'Primary navigation' })
  const rialoNav = primaryNav.getByRole('link', { name: 'Rialo' })
  const projectCta = page.getByRole('link', { name: 'Open SIGNAL/LEDGER case file' })

  await tabUntilFocused(page, primaryNav.getByRole('link', { name: 'Arc' }), 'Arc primary navigation')
  await expectFocusRing(primaryNav.getByRole('link', { name: 'Arc' }), 'Arc primary navigation')

  await tabUntilFocused(page, projectCta, 'SIGNAL/LEDGER case CTA')
  await expectFocusRing(projectCta, 'SIGNAL/LEDGER case CTA')

  await tabUntilFocused(page, rialoNav, 'Rialo primary navigation by Shift+Tab', { reverse: true })
  await expectFocusRing(rialoNav, 'Rialo primary navigation')

  await tabUntilFocused(page, projectCta, 'SIGNAL/LEDGER case CTA after reverse path')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/arc\/signal-ledger$/)
})

test('/rialo roving focus separates focus movement from active readout until activation', async ({ page }) => {
  const project = rialoProject()

  await page.goto('/rialo')

  const observe = page.getByRole('button', { name: new RegExp(`Observe.*${project.coreLoop[0].label}`) })
  const cover = page.getByRole('button', { name: new RegExp(`Cover.*${project.coreLoop[1].label}`) })
  const trigger = page.getByRole('button', { name: new RegExp(`Trigger.*${project.coreLoop[2].label}`) })

  await tabUntilFocused(page, observe, 'Observe step')
  await expect(observe).toBeFocused()
  await expectFocusRing(observe, 'Observe step')
  await expect(observe).toHaveAttribute('aria-pressed', 'true')
  await expectRialoState(page, 0)

  await page.keyboard.press('ArrowRight')
  await expect(cover).toBeFocused()
  await expectFocusRing(cover, 'Cover step')
  await expect(observe).toHaveAttribute('aria-pressed', 'true')
  await expect(cover).toHaveAttribute('aria-pressed', 'false')
  await expectRialoState(page, 0)

  await page.keyboard.press('Enter')
  await expect(cover).toHaveAttribute('aria-pressed', 'true')
  await expectRialoState(page, 1)

  await page.keyboard.press('ArrowRight')
  await expect(trigger).toBeFocused()
  await expectFocusRing(trigger, 'Trigger step')
  await page.keyboard.press('Space')
  await expect(trigger).toHaveAttribute('aria-pressed', 'true')
  await expectRialoState(page, 2)
})

test('project detail keyboard opens the primary external live CTA through a local popup intercept', async ({
  context,
  page,
}) => {
  const project = signalProject()
  const route = `/${project.ecosystem}/${project.slug}`

  await context.route(project.liveUrl, async (routeRequest) => {
    await routeRequest.fulfill({
      body: '<!doctype html><title>Intercepted SIGNAL/LEDGER</title><main>Intercepted live work</main>',
      contentType: 'text/html',
      status: 200,
    })
  })

  await page.goto(route)

  const liveCta = page.getByRole('link', {
    name: /Launch live site.*opens an external site/i,
  })

  await tabUntilFocused(page, liveCta, `${project.name} live CTA`)
  await expectFocusRing(liveCta, `${project.name} live CTA`)
  await expect(liveCta).toHaveAttribute('href', project.liveUrl)
  await expect(liveCta).toHaveAttribute('target', '_blank')
  await expect(liveCta).toHaveAttribute('rel', /noopener/)
  await expect(liveCta).toHaveAttribute('rel', /noreferrer/)

  const popupPromise = page.waitForEvent('popup')

  await page.keyboard.press('Enter')

  const popup = await popupPromise

  await expect(popup.locator('main')).toHaveText('Intercepted live work')
  expect(popup.url()).toBe(project.liveUrl)
  await popup.close()
})
