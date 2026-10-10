import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page, Response } from '@playwright/test'

import { ecosystems, projects } from '../../src/content/catalog'
import { getAllPublicRoutes } from '../../src/content/selectors'
import type { PublicRoute } from '../../src/content/selectors'
import { buildRobots } from '../../src/app/robots'
import {
  classifyProductionResponse,
  type ProductionResponseFacts,
  type ProductionResponsePolicy,
} from './support/runtime-response-classifier'

const siteOrigin = 'http://localhost:3000'
const siteName = 'Captain Dock'
const defaultShareImagePath = '/opengraph-image'

test.use({ reducedMotion: 'reduce' } as Parameters<typeof test.use>[0])

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

type RouteExpectation = Readonly<{
  description: string
  imagePath: string
  jsonLdKind: 'none' | 'website' | 'ecosystem' | 'project'
  route: PublicRoute
  title: string
}>

function publicRouteExpectations(): readonly RouteExpectation[] {
  return getAllPublicRoutes().map((route) => {
    if (route === '/') {
      return {
        description:
          'A readable universe of Arc and Rialo projects, connecting ecosystem indexes, case files, and live project links.',
        imagePath: defaultShareImagePath,
        jsonLdKind: 'website',
        route,
        title: siteName,
      }
    }

    const ecosystem = ecosystems.find((item) => route === `/${item.slug}`)

    if (ecosystem) {
      return {
        description: ecosystem.seo.description,
        imagePath: defaultShareImagePath,
        jsonLdKind: 'ecosystem',
        route,
        title: ecosystem.seo.title,
      }
    }

    const project = projects.find((item) => route === `/${item.ecosystem}/${item.slug}`)

    if (!project?.seo.image) {
      throw new Error(`缺少 ${route} 的项目 SEO 图片。`)
    }

    return {
      description: project.seo.description,
      imagePath: project.seo.image,
      jsonLdKind: 'project',
      route,
      title: project.seo.title,
    }
  })
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
) {
  const failures: string[] = []

  page.on('pageerror', (error) => {
    failures.push(`pageerror: ${error.message}`)
  })

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return
    }

    const text = message.text()
    const isAllowedDocument404Console =
      options.allowDocument404 && text.includes('Failed to load resource') && text.includes('status of 404')

    if (!isAllowedDocument404Console && !isNextDevRuntimeNoise(text)) {
      failures.push(`console error: ${text}`)
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
      failures.push(classification.error)
    }
  })

  page.on('requestfailed', (request) => {
    const url = request.url()

    if (isNextDevRuntimeNoise(url)) {
      return
    }

    failures.push(`${request.resourceType()} request failed ${url}: ${request.failure()?.errorText ?? 'unknown'}`)
  })

  return failures
}

async function metaContent(page: Page, selector: string) {
  const locator = page.locator(selector)

  await expect(locator).toHaveCount(1)

  return locator.getAttribute('content')
}

async function expectMeta(page: Page, selector: string, expected: string) {
  const locator = page.locator(selector)

  await expect(locator).toHaveCount(1)
  await expect(locator).toHaveAttribute('content', expected)
}

function expectSameSiteUrl(actual: string | null, expectedPath: string) {
  expect(actual).not.toBeNull()

  const actualUrl = new URL(actual ?? '')
  const expectedUrl = new URL(expectedPath, siteOrigin)

  expect(actualUrl.origin).toBe(expectedUrl.origin)
  expect(actualUrl.pathname).toBe(expectedUrl.pathname)
  expect(actualUrl.search).toBe(expectedUrl.search)
  expect(actualUrl.hash).toBe(expectedUrl.hash)
}

async function readJsonLd(page: Page) {
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()

  return scripts.map((script) => JSON.parse(script) as unknown)
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('JSON-LD 不是对象。')
  }

  return value as Record<string, unknown>
}

function asRecordArray(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error('JSON-LD 不是数组。')
  }

  return value.map(asRecord)
}

async function expectJsonLd(page: Page, expectation: RouteExpectation) {
  const jsonLd = await readJsonLd(page)

  if (expectation.jsonLdKind === 'none') {
    expect(jsonLd).toEqual([])
    return
  }

  expect(jsonLd).toHaveLength(1)

  if (expectation.jsonLdKind === 'website') {
    const schema = asRecord(jsonLd[0])

    expect(schema['@type']).toBe('WebSite')
    expect(schema.inLanguage).toBe('en')
    expect(schema.name).toBe(siteName)
    expect(schema.description).toBe(expectation.description)
    expectSameSiteUrl(String(schema.url), expectation.route)
    expect(JSON.stringify(schema)).not.toContain('Person')
    return
  }

  if (expectation.jsonLdKind === 'ecosystem') {
    const ecosystemSlug = expectation.route.slice(1)
    const expectedProjects = projects.filter((project) => project.ecosystem === ecosystemSlug)
    const schemas = asRecordArray(jsonLd[0])
    const collection = schemas.find((schema) => schema['@type'] === 'CollectionPage')
    const itemList = schemas.find((schema) => schema['@type'] === 'ItemList')

    expect(schemas).toHaveLength(2)
    expect(schemas.map((schema) => schema['@type']).sort()).toEqual(['CollectionPage', 'ItemList'])
    expect(collection).toBeTruthy()
    expect(itemList).toBeTruthy()
    expect(collection?.name).toBe(expectation.title)
    expect(collection?.inLanguage).toBe('en')
    expect(collection?.description).toBe(expectation.description)
    expectSameSiteUrl(String(collection?.url), expectation.route)
    expect(itemList?.numberOfItems).toBe(expectedProjects.length)
    expect(itemList?.inLanguage).toBe('en')
    expect(itemList?.itemListOrder).toBe('https://schema.org/ItemListOrderAscending')

    const elements = asRecordArray(itemList?.itemListElement)

    expect(elements).toHaveLength(expectedProjects.length)

    for (const [index, element] of elements.entries()) {
      const item = asRecord(element.item)
      const project = expectedProjects[index]

      expect(element.position).toBe(index + 1)
      expect(item['@type']).toBe('CreativeWork')
      expect(item.inLanguage).toBe('en')
      expect(item.name).toBe(project.name)
      expectSameSiteUrl(String(item.url), `/${project.ecosystem}/${project.slug}`)
    }

    expect(JSON.stringify(schemas)).not.toContain('Person')
    return
  }

  const project = projects.find((item) => `/${item.ecosystem}/${item.slug}` === expectation.route)

  if (!project) {
    throw new Error(`缺少 ${expectation.route} 的项目目录。`)
  }

  const schema = asRecord(jsonLd[0])

  expect(schema['@type']).toBe('CreativeWork')
  expect(schema.inLanguage).toBe('en')
  expect(schema.name).toBe(project.name)
  expect(schema.description).toBe(expectation.description)
  expectSameSiteUrl(String(schema.url), expectation.route)
  expectSameSiteUrl(String(schema.image), expectation.imagePath)
  expect(schema.sameAs).toEqual([project.liveUrl])
  expect(JSON.stringify(schema)).not.toContain('Person')
}

function parseCsp(value: string | undefined) {
  const directives = new Map<string, readonly string[]>()

  for (const directive of value?.split(';') ?? []) {
    const parts = directive.trim().split(/\s+/).filter(Boolean)

    if (parts.length > 0) {
      directives.set(parts[0], parts.slice(1))
    }
  }

  return directives
}

function expectSecurityHeaders(response: Response | null) {
  expect(response).not.toBeNull()

  const headers = response?.headers() ?? {}

  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')

  const csp = parseCsp(headers['content-security-policy'])

  expect(csp.get('object-src')).toEqual(["'none'"])
  expect(csp.get('base-uri')).toEqual(["'self'"])
  expect(csp.get('frame-ancestors')).toEqual(["'none'"])
}

function extractLocs(xml: string) {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1])
}

async function expectResource(
  request: APIRequestContext,
  path: string,
  expectedContentType: RegExp,
  expectedStatus = 200,
) {
  const response = await request.get(path)

  expect(response.status()).toBe(expectedStatus)
  expect(response.headers()['content-type']).toMatch(expectedContentType)
  expect((await response.body()).length).toBeGreaterThan(0)

  return response
}

test('public routes expose unique real metadata, JSON-LD, share assets, and security headers', async ({
  page,
  request,
  baseURL,
}) => {
  const failures = collectUnexpectedRuntimeErrors(page, { baseURL })
  const titles = new Set<string>()
  const descriptions = new Set<string>()
  const canonicals = new Set<string>()
  const ogUrls = new Set<string>()

  for (const expectation of publicRouteExpectations()) {
    const response = await page.goto(expectation.route)

    expect(response?.ok()).toBe(true)
    expectSecurityHeaders(response)
    await expect(page.locator('main#main-content')).toHaveCount(1)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect(await page.content()).not.toMatch(/\p{Script=Han}/u)

    await expect(page).toHaveTitle(expectation.title)
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
    expectSameSiteUrl(await page.locator('link[rel="canonical"]').getAttribute('href'), expectation.route)

    await expectMeta(page, 'meta[name="description"]', expectation.description)
    await expectMeta(page, 'meta[property="og:title"]', expectation.title)
    await expectMeta(page, 'meta[property="og:description"]', expectation.description)
    await expectMeta(page, 'meta[property="og:site_name"]', siteName)
    await expectMeta(page, 'meta[property="og:type"]', 'website')
    expectSameSiteUrl(await metaContent(page, 'meta[property="og:url"]'), expectation.route)
    await expectMeta(page, 'meta[property="og:image:alt"]', `${expectation.title} share image`)
    await expectMeta(page, 'meta[name="twitter:card"]', 'summary_large_image')
    await expectMeta(page, 'meta[name="twitter:title"]', expectation.title)
    await expectMeta(page, 'meta[name="twitter:description"]', expectation.description)
    await expectMeta(page, 'meta[name="twitter:image:alt"]', `${expectation.title} share image`)

    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1)
    await expect(page.locator('meta[name="twitter:image"]')).toHaveCount(1)

    const ogImage = await metaContent(page, 'meta[property="og:image"]')
    const twitterImage = await metaContent(page, 'meta[name="twitter:image"]')

    expectSameSiteUrl(ogImage, expectation.imagePath)
    expectSameSiteUrl(twitterImage, expectation.imagePath)
    expect(ogImage).not.toContain('vercel.app')
    expect(twitterImage).not.toContain('vercel.app')

    if (expectation.imagePath === defaultShareImagePath) {
      await expectMeta(page, 'meta[property="og:image:width"]', '1200')
      await expectMeta(page, 'meta[property="og:image:height"]', '630')
      await expectResource(request, defaultShareImagePath, /^image\/png\b/)
    } else {
      await expect(page.locator('meta[property="og:image:width"]')).toHaveCount(0)
      await expect(page.locator('meta[property="og:image:height"]')).toHaveCount(0)
      await expectResource(request, new URL(ogImage ?? '').pathname, /^image\/webp\b/)
    }

    await expectJsonLd(page, expectation)

    titles.add(await page.title())
    descriptions.add((await metaContent(page, 'meta[name="description"]')) ?? '')
    canonicals.add(new URL((await page.locator('link[rel="canonical"]').getAttribute('href')) ?? '').pathname)
    ogUrls.add(new URL((await metaContent(page, 'meta[property="og:url"]')) ?? '').pathname)
  }

  expect(titles.size).toBe(8)
  expect(descriptions.size).toBe(8)
  expect(canonicals.size).toBe(8)
  expect(ogUrls.size).toBe(8)
  expect(failures).toEqual([])
})

test('portfolio 404 exposes independent metadata without canonical, og:url, or JSON-LD', async ({
  page,
  baseURL,
}) => {
  const expectedUnknownPath = '/arc/not-exists'
  const failures = collectUnexpectedRuntimeErrors(page, {
    allowDocument404: true,
    baseURL,
    expectedUnknownPath,
  })
  const response = await page.goto(expectedUnknownPath)

  expect(response?.status()).toBe(404)
  expectSecurityHeaders(response)
  await expect(page).toHaveTitle('Project Not Found | Captain Dock')
  await expectMeta(
    page,
    'meta[name="description"]',
    'The requested route is not part of the public Captain Dock map.',
  )
  await expectMeta(page, 'meta[property="og:title"]', 'Project Not Found | Captain Dock')
  await expectMeta(
    page,
    'meta[property="og:description"]',
    'The requested route is not part of the public Captain Dock map.',
  )
  await expectMeta(page, 'meta[property="og:site_name"]', siteName)
  await expectMeta(page, 'meta[property="og:type"]', 'website')
  await expectMeta(page, 'meta[property="og:image:alt"]', 'Project Not Found | Captain Dock share image')
  await expectMeta(page, 'meta[property="og:image:width"]', '1200')
  await expectMeta(page, 'meta[property="og:image:height"]', '630')
  await expectMeta(page, 'meta[name="twitter:card"]', 'summary_large_image')
  await expectMeta(page, 'meta[name="twitter:title"]', 'Project Not Found | Captain Dock')
  await expectMeta(
    page,
    'meta[name="twitter:description"]',
    'The requested route is not part of the public Captain Dock map.',
  )
  await expectMeta(page, 'meta[name="twitter:image:alt"]', 'Project Not Found | Captain Dock share image')
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1)
  await expect(page.locator('meta[name="twitter:image"]')).toHaveCount(1)
  expectSameSiteUrl(await metaContent(page, 'meta[property="og:image"]'), defaultShareImagePath)
  expectSameSiteUrl(await metaContent(page, 'meta[name="twitter:image"]'), defaultShareImagePath)
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)

  const robots = (await page.locator('meta[name="robots"]').all()).map(async (locator) => locator.getAttribute('content'))
  const robotsContent = (await Promise.all(robots)).join(',').toLowerCase()

  expect(robotsContent).toContain('noindex')
  expect(robotsContent).toContain('nofollow')
  await expect(page.getByRole('heading', { level: 1, name: 'Project not found' })).toBeVisible()
  await expect(page.getByRole('link', { name: /return to project universe/i })).toHaveAttribute('href', '/')
  await expect(page.getByRole('link', { name: /browse arc projects/i })).toHaveAttribute('href', '/arc')
  expect(failures).toEqual([])
})

test('sitemap and robots publish only the seven public routes on the same origin', async ({ request }) => {
  const sitemap = await expectResource(request, '/sitemap.xml', /\b(?:application|text)\/xml\b/)
  const sitemapXml = await sitemap.text()
  const locs = extractLocs(sitemapXml)
  const routes = getAllPublicRoutes()

  expect(locs).toHaveLength(routes.length)
  expect(locs.map((loc) => new URL(loc).origin)).toEqual(routes.map(() => siteOrigin))
  expect(locs.map((loc) => new URL(loc).pathname)).toEqual(routes.map((route) => new URL(route, siteOrigin).pathname))
  expect(new Set(locs).size).toBe(locs.length)
  expect(sitemapXml).not.toMatch(/<lastmod>|<changefreq>|<priority>/)

  for (const project of projects) {
    expect(sitemapXml).not.toContain(project.liveUrl)
  }

  expect(sitemapXml).not.toContain('/not-real')
  expect(sitemapXml).not.toContain('/not-exists')
  expect(sitemapXml).not.toContain('/about')

  const robots = await expectResource(request, '/robots.txt', /^text\/plain\b/)
  const robotsText = await robots.text()

  expect((robotsText.match(/^User-Agent:\s*\*/gm) ?? [])).toHaveLength(1)
  expect(robotsText).toMatch(/^Allow:\s*\/$/m)
  expect(robotsText).not.toMatch(/^Disallow:\s*\/$/m)
  expect(robotsText).toMatch(/^Sitemap:\s*http:\/\/localhost:3000\/sitemap\.xml$/m)
})

test('robots pure builder can disallow preview indexing without mutating process env', () => {
  expect(buildRobots({ VERCEL_ENV: 'preview' })).toEqual({
    rules: {
      disallow: '/',
      userAgent: '*',
    },
    sitemap: 'http://localhost:3000/sitemap.xml',
  })
  expect(buildRobots({})).toEqual({
    rules: {
      allow: '/',
      userAgent: '*',
    },
    sitemap: 'http://localhost:3000/sitemap.xml',
  })
})

test('icon link and share images resolve locally without unsafe SVG content', async ({
  page,
  request,
  baseURL,
}) => {
  const failures = collectUnexpectedRuntimeErrors(page, { baseURL })
  const response = await page.goto('/')

  expect(response?.ok()).toBe(true)

  const iconHref = await page.locator('link[rel~="icon"]').first().getAttribute('href')

  expect(iconHref).not.toBeNull()

  const iconUrl = new URL(iconHref ?? '', page.url())

  expect(iconUrl.pathname).toBe('/icon.svg')

  const icon = await expectResource(request, `${iconUrl.pathname}${iconUrl.search}`, /^image\/svg\+xml\b/)
  const svg = await icon.text()

  expect(svg).toMatch(/<svg\b/i)
  expect(svg).not.toMatch(/<script\b/i)
  expect(svg).not.toMatch(/<image\b/i)
  expect(svg).not.toMatch(/\b(?:href|xlink:href)\s*=/i)
  expect(svg).not.toMatch(/data:/i)

  await expectResource(request, defaultShareImagePath, /^image\/png\b/)

  for (const project of projects) {
    const imagePath = project.seo.image

    if (!imagePath) {
      throw new Error(`${project.name} 缺少 SEO 图片。`)
    }

    await expectResource(request, imagePath, /^image\/webp\b/)
  }

  expect(failures).toEqual([])
})
