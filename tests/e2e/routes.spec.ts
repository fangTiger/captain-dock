import { expect, test } from '@playwright/test'
import type { Page, Response } from '@playwright/test'

import {
  classifyProductionResponse,
  type ProductionResponseFacts,
  type ProductionResponsePolicy,
} from './support/runtime-response-classifier'

const publicRoutes = [
  { path: '/', heading: 'A UNIVERSE OF THINGS I’VE BUILT.' },
  { path: '/arc', heading: 'Arc' },
  { path: '/arc/signal-ledger', heading: 'SIGNAL/LEDGER' },
  { path: '/arc/hadron', heading: 'HADRON' },
  { path: '/arc/arcpredict', heading: 'ArcPredict' },
  { path: '/rialo', heading: 'Rialo' },
  { path: '/rialo/rialo-captain', heading: 'Rialo Captain' },
  { path: '/about', heading: 'About' },
] as const

function exactHeadingAccessibleName(heading: string) {
  const escapedSegments = heading
    .split('/')
    .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  return new RegExp(`^${escapedSegments.join('\\s*/\\s*')}$`)
}

function isNextDevRuntimeNoise(value: string) {
  return value.includes('/_next/webpack-hmr') || value.includes('WebSocket connection')
}

function collectProductionResponseFacts(
  page: Page,
  response: Response,
): ProductionResponseFacts {
  const request = response.request()
  const url = response.url()
  let parsedUrl: URL | undefined

  try {
    parsedUrl = new URL(url)
  } catch {
    parsedUrl = undefined
  }

  return {
    isMainFrameNavigation:
      request.isNavigationRequest() && request.frame() === page.mainFrame(),
    parsedUrl,
    requestHeaders: request.headers(),
    resourceType: request.resourceType(),
    responseHeaders: response.headers(),
    status: response.status(),
    url,
  }
}

function collectUnexpectedRuntimeErrors(
  page: Page,
  options: ProductionResponsePolicy,
): string[] {
  const errors: string[] = []

  page.on('pageerror', (error) => {
    errors.push(error.message)
  })

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return
    }

    const text = message.text()
    const isAllowedDocument404Console =
      options.allowDocument404 && text.includes('Failed to load resource') && text.includes('status of 404')

    if (!isAllowedDocument404Console && !isNextDevRuntimeNoise(text)) {
      errors.push(text)
    }
  })

  page.on('response', (response) => {
    const url = response.url()

    if (isNextDevRuntimeNoise(url)) {
      return
    }

    const facts = collectProductionResponseFacts(page, response)
    const classification = classifyProductionResponse(facts, options)

    if (classification.error) {
      errors.push(classification.error)
    }
  })

  page.on('requestfailed', (request) => {
    const url = request.url()

    if (isNextDevRuntimeNoise(url)) {
      return
    }

    errors.push(`${request.resourceType()} request failed ${url}: ${request.failure()?.errorText ?? 'unknown'}`)
  })

  return errors
}

for (const route of publicRoutes) {
  test(`${route.path} returns a readable static page`, async ({ page, baseURL }) => {
    const runtimeErrors = collectUnexpectedRuntimeErrors(page, { baseURL })
    const response = await page.goto(route.path)
    const h1 = page.locator('h1')

    expect(response?.ok()).toBe(true)
    await expect(page.locator('main#main-content')).toHaveCount(1)
    await expect(h1).toHaveCount(1)
    await expect(h1).toBeVisible()
    await expect(h1).toHaveAccessibleName(exactHeadingAccessibleName(route.heading))
    expect(runtimeErrors).toEqual([])
  })
}

test('unknown project under a known ecosystem returns the portfolio 404', async ({ page, baseURL }) => {
  const expectedUnknownPath = '/arc/not-exists'
  const runtimeErrors = collectUnexpectedRuntimeErrors(page, {
    allowDocument404: true,
    baseURL,
    expectedUnknownPath,
  })
  const response = await page.goto(expectedUnknownPath)

  expect(response?.status()).toBe(404)
  await expect(page.locator('main#main-content')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Project not found')
  await expect(page.getByRole('link', { name: /return to project universe/i })).toHaveAttribute('href', '/')
  await expect(page.getByRole('link', { name: /browse arc projects/i })).toHaveAttribute('href', '/arc')
  expect(runtimeErrors).toEqual([])
})

test('unknown root route returns the portfolio 404', async ({ page, baseURL }) => {
  const expectedUnknownPath = '/not-real'
  const runtimeErrors = collectUnexpectedRuntimeErrors(page, {
    allowDocument404: true,
    baseURL,
    expectedUnknownPath,
  })
  const response = await page.goto(expectedUnknownPath)

  expect(response?.status()).toBe(404)
  await expect(page.locator('main#main-content')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Project not found')
  await expect(page.getByRole('link', { name: /return to project universe/i })).toHaveAttribute('href', '/')
  expect(runtimeErrors).toEqual([])
})

test('runtime error collection captures missing image subresources on successful pages', async ({ page, baseURL }) => {
  const runtimeErrors = collectUnexpectedRuntimeErrors(page, { baseURL })

  await page.goto('/')
  await page.evaluate(() => {
    const image = document.createElement('img')
    image.alt = '受控缺失图片'
    image.src = '/__resource-gate-regression-missing.webp'
    document.body.append(image)
  })
  await page.waitForLoadState('networkidle')

  expect(runtimeErrors.some((error) => error.includes('/__resource-gate-regression-missing.webp'))).toBe(true)
})
