import { expect, test } from '@playwright/test'
import type { Page, Response } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  classifyProductionResponse,
  type ProductionResponseClassification,
  type ProductionResponseFacts,
  type ProductionResponsePolicy,
} from './support/runtime-response-classifier'

const productionSwitch = 'CAPTAIN_DOCK_EXTERNAL_PRODUCTION'
const expectedBaseUrl = 'http://127.0.0.1:3100'
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

test.use({ channel: 'chromium' })

const immersiveRoutes = ['/', '/arc', '/rialo'] as const
const coldRoutes = [
  { path: '/about', expectedStatus: 200 },
  { path: '/arc/signal-ledger', expectedStatus: 200 },
  { path: '/arc/hadron', expectedStatus: 200 },
  { path: '/arc/arcpredict', expectedStatus: 200 },
  { path: '/rialo/rialo-captain', expectedStatus: 200 },
  { path: '/not-real-production-route', expectedStatus: 404 },
] as const
const enhancedOnlySentinels = [
  'CAPTAIN_DOCK_UNIVERSE_CANVAS_V1',
  'home-constellation',
  'arc-orbital-circuit',
  'rialo-reactive-field',
] as const
const forbiddenExternalHosts = new Set([
  'arc-signal-ledger.vercel.app',
  'arc-hadron.vercel.app',
  'web-arcpredict.vercel.app',
  'captain-rialo.vercel.app',
])

type RuntimeCollector = {
  errors: string[]
  scriptBodies: () => Promise<string[]>
  expectedUnknownRsc404Count: () => number
}

type RuntimeCollectorHarness = {
  emitResponse: (response: Response) => void
  runtime: RuntimeCollector
}

type ColdBootstrapLongTaskEntry = Readonly<{
  duration: number
  entryType: string
  name: string
  startTime: number
}>

type ColdBootstrapLongTaskSnapshot = Readonly<{
  entries: ColdBootstrapLongTaskEntry[]
  installError: string | null
  maxDuration: number
  now: number
  supported: boolean
}>

type InteractionFeedbackCase = Readonly<{
  controlSelector: string
  detailSelector: string
  expectedDetailText: string
  expectedHeading: string
  expectedPrimaryAriaLabel: string
  expectedPrimaryHref: string
  expectedPrimaryText: string
  expectedStateSelector: string
  expectedStatement: string
  headingSelector: string
  input: 'keyboard' | 'pointer'
  key?: 'Enter' | 'Space'
  label: string
  primarySelector: string
  route: (typeof immersiveRoutes)[number]
  stageSelector: string
  statementSelector: string
}>

type InteractionFeedbackResult = Readonly<{
  ariaCurrent: string | null
  ariaPressed: string | null
  baselineHeading: string
  baselinePrimaryAriaLabel: string | null
  baselinePrimaryHref: string | null
  baselinePrimaryText: string
  baselineStatement: string
  baselineStableAtInput: boolean
  detailText: string
  duration: number
  firstAnimationFrameAt: number
  headingText: string
  inputCaptureNow: number
  inputEventTime: number
  mutationAt: number
  preInputFirstAnimationFrameAt: number
  preInputSecondAnimationFrameAt: number
  primaryAriaLabel: string | null
  primaryCount: number
  primaryHref: string | null
  primaryText: string
  secondAnimationFrameAt: number
  stateMatches: boolean
  statementText: string
  structuralChanged: boolean
  targetInactiveAtInput: boolean
}>

function createFakeScriptResponse(responseUrl: string, readScriptBody: () => Promise<string>): Response {
  const request = {
    frame: () => ({}),
    headers: () => ({}),
    isNavigationRequest: () => false,
    resourceType: () => 'script',
  }

  return {
    headers: () => ({ 'content-type': 'application/javascript' }),
    request: () => request,
    status: () => 200,
    text: readScriptBody,
    url: () => responseUrl,
  } as unknown as Response
}

function createPureResponseFacts(
  responseUrl: string,
  overrides: Partial<ProductionResponseFacts> = {},
): ProductionResponseFacts {
  return {
    isMainFrameNavigation: false,
    parsedUrl: new URL(responseUrl),
    requestHeaders: {
      rsc: '1',
      'next-router-prefetch': '1',
      'next-router-segment-prefetch': '/_tree',
      'next-url': '/_not-found',
    },
    resourceType: 'fetch',
    responseHeaders: { 'content-type': 'text/x-component' },
    status: 404,
    url: responseUrl,
    ...overrides,
  }
}

function classifyWithPolicy(
  facts: ProductionResponseFacts,
  policy: ProductionResponsePolicy,
): ProductionResponseClassification {
  return classifyProductionResponse(facts, policy)
}

function createRuntimeCollectorHarness(baseURL: string, expectedUnknownPath: string): RuntimeCollectorHarness {
  const responseListeners: Array<(response: Response) => void> = []
  const page = {
    mainFrame: () => ({}),
    on: (eventName: string, listener: (response: Response) => void) => {
      if (eventName === 'response') {
        responseListeners.push(listener)
      }
      return page
    },
  } as unknown as Page
  const runtime = attachProductionRuntimeCollector(page, baseURL, {
    allowDocument404: true,
    expectedUnknownPath,
  })

  return {
    emitResponse: (response: Response) => {
      for (const listener of responseListeners) {
        listener(response)
      }
    },
    runtime,
  }
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

function attachProductionRuntimeCollector(
  page: Page,
  baseURL: string,
  options: { allowDocument404?: boolean; expectedUnknownPath?: string } = {},
): RuntimeCollector {
  const errors: string[] = []
  const scriptBodyReads: Promise<string>[] = []
  let expectedUnknownRsc404Count = 0

  page.on('pageerror', (error) => {
    errors.push(`pageerror ${error.message}`)
  })

  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text()
      if (
        options.allowDocument404 === true &&
        options.expectedUnknownPath &&
        text === 'Failed to load resource: the server responded with a status of 404 (Not Found)'
      ) {
        return
      }
      errors.push(`console ${text}`)
    }
  })

  page.on('request', (request) => {
    try {
      const url = new URL(request.url())
      if (forbiddenExternalHosts.has(url.hostname)) {
        errors.push(`external project request ${request.url()}`)
      }
    } catch {
      errors.push(`request url invalid ${request.url()}`)
    }
  })

  page.on('requestfailed', (request) => {
    errors.push(`${request.resourceType()} request failed ${request.url()}: ${request.failure()?.errorText ?? 'unknown'}`)
  })

  page.on('response', (response) => {
    const facts = collectProductionResponseFacts(page, response)
    const classification = classifyProductionResponse(facts, {
      ...options,
      baseURL,
    })

    if (classification.expectedUnknownRsc404) {
      expectedUnknownRsc404Count += 1
    }

    if (classification.error) {
      errors.push(classification.error)
    }

    if (classification.shouldReadScriptBody) {
      scriptBodyReads.push(
        response.text().catch((error: unknown) => {
          errors.push(`script body read failed ${facts.url}: ${String(error)}`)
          return ''
        }),
      )
    }
  })

  return {
    errors,
    scriptBodies: () => Promise.all(scriptBodyReads),
    expectedUnknownRsc404Count: () => expectedUnknownRsc404Count,
  }
}

async function armColdBootstrapLongTaskObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type LongTaskState = {
      entries: Array<{
        duration: number
        entryType: string
        name: string
        startTime: number
      }>
      installError: string | null
      supported: boolean
    }
    type LongTaskWindow = Window & {
      __CAPTAIN_DOCK_HOME_BOOTSTRAP_LONGTASKS__?: LongTaskState
    }

    const longTaskWindow = window as LongTaskWindow
    const supported =
      typeof PerformanceObserver !== 'undefined' &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes('longtask')
    const state: LongTaskState = {
      entries: [],
      installError: null,
      supported,
    }
    longTaskWindow.__CAPTAIN_DOCK_HOME_BOOTSTRAP_LONGTASKS__ = state

    if (!supported) {
      return
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.entries.push({
            duration: entry.duration,
            entryType: entry.entryType,
            name: entry.name,
            startTime: entry.startTime,
          })
        }
      })

      observer.observe({ buffered: true, type: 'longtask' })
    } catch (error) {
      state.installError = String(error)
    }
  })
}

async function readColdBootstrapLongTasks(page: Page): Promise<ColdBootstrapLongTaskSnapshot> {
  return page.evaluate(() => {
    type LongTaskState = {
      entries: Array<{
        duration: number
        entryType: string
        name: string
        startTime: number
      }>
      installError: string | null
      supported: boolean
    }
    type LongTaskWindow = Window & {
      __CAPTAIN_DOCK_HOME_BOOTSTRAP_LONGTASKS__?: LongTaskState
    }
    const state = (window as LongTaskWindow).__CAPTAIN_DOCK_HOME_BOOTSTRAP_LONGTASKS__
    const entries = [...(state?.entries ?? [])]

    return {
      entries,
      installError: state?.installError ?? null,
      maxDuration: entries.reduce((max, entry) => Math.max(max, entry.duration), 0),
      now: performance.now(),
      supported: state?.supported ?? false,
    }
  })
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), 'utf8')) as T
}

async function armFirstStructuralFeedback(
  page: Page,
  interaction: InteractionFeedbackCase,
): Promise<void> {
  await page.evaluate(
    async (contract) => {
      type FeedbackProbe = {
        promise: Promise<InteractionFeedbackResult>
      }
      type FeedbackSnapshot = {
        allVisible: boolean
        detailText: string
        headingText: string
        primaryAriaLabel: string | null
        primaryCount: number
        primaryHref: string | null
        primaryText: string
        statementText: string
        structuralSignature: string
      }
      const feedbackWindow = window as Window & {
        __CAPTAIN_DOCK_FEEDBACK_PROBE__?: FeedbackProbe
      }
      const control = document.querySelector<HTMLElement>(contract.controlSelector)

      if (!control) {
        throw new Error(
          `${contract.label}: missing committed-state control ${contract.controlSelector}`,
        )
      }

      const isVisible = (element: Element | null) => {
        if (!(element instanceof HTMLElement)) {
          return false
        }

        const style = getComputedStyle(element)
        const box = element.getBoundingClientRect()

        return (
          box.width > 0 &&
          box.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) > 0
        )
      }
      const readFeedback = (): FeedbackSnapshot => {
        const stage = document.querySelector(contract.stageSelector)
        const heading = document.querySelector<HTMLElement>(contract.headingSelector)
        const statement = document.querySelector<HTMLElement>(contract.statementSelector)
        const detail = document.querySelector<HTMLElement>(contract.detailSelector)
        const primaries = stage?.querySelectorAll<HTMLElement>('[data-control-role="primary"]') ?? []
        const primary = document.querySelector<HTMLAnchorElement>(contract.primarySelector)
        const structuralElements = [heading, statement, detail, primary]
        const structuralSignature = structuralElements
          .map((element) => {
            if (!element) {
              return 'missing'
            }

            const style = getComputedStyle(element)
            const box = element.getBoundingClientRect()

            return JSON.stringify({
              height: box.height,
              left: box.left,
              opacity: style.opacity,
              text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
              top: box.top,
              transform: style.transform,
              width: box.width,
            })
          })
          .join('|')

        return {
          allVisible: structuralElements.every(isVisible),
          detailText: detail?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          headingText: heading?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          primaryAriaLabel: primary?.getAttribute('aria-label') ?? null,
          primaryCount: primaries.length,
          primaryHref: primary?.getAttribute('href') ?? null,
          primaryText: primary?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          statementText: statement?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          structuralSignature,
        }
      }
      let baseline = readFeedback()

      if (!baseline.allVisible || baseline.primaryCount !== 1) {
        throw new Error(`${contract.label}: visible pre-input baseline is incomplete`)
      }
      if (
        control.getAttribute('aria-pressed') !== 'false' ||
        control.getAttribute('aria-current') !== null ||
        document.querySelector(contract.expectedStateSelector)
      ) {
        throw new Error(`${contract.label}: target must be inactive before the pre-input paint`)
      }

      const preInputFirstAnimationFrameAt = await new Promise<number>((resolve) => {
        requestAnimationFrame(() => resolve(performance.now()))
      })
      const preInputSecondAnimationFrameAt = await new Promise<number>((resolve) => {
        requestAnimationFrame(() => resolve(performance.now()))
      })
      const paintedBaseline = readFeedback()

      if (JSON.stringify(paintedBaseline) !== JSON.stringify(baseline)) {
        throw new Error(`${contract.label}: baseline changed during the required pre-input paint`)
      }
      if (
        control.getAttribute('aria-pressed') !== 'false' ||
        control.getAttribute('aria-current') !== null ||
        document.querySelector(contract.expectedStateSelector)
      ) {
        throw new Error(`${contract.label}: target activated before real input`)
      }
      baseline = paintedBaseline

      let resolveProbe: (result: InteractionFeedbackResult) => void = () => undefined
      let rejectProbe: (error: Error) => void = () => undefined
      const promise = new Promise<InteractionFeedbackResult>((resolve, reject) => {
        resolveProbe = resolve
        rejectProbe = reject
      })
      let inputStartedAt: number | null = null
      let inputTimeout = 0
      let absoluteTimeout = 0
      let finished = false
      let paintCheckPending = false
      let mutationAt = 0
      let inputCaptureNow = 0
      let inputEventTime = 0
      let baselineStableAtInput = false
      let targetInactiveAtInput = false
      const cleanup = () => {
        observer.disconnect()
        document.removeEventListener(
          contract.input === 'pointer' ? 'pointerdown' : 'keydown',
          handleInput,
          true,
        )
        window.clearTimeout(inputTimeout)
        window.clearTimeout(absoluteTimeout)
      }
      const fail = (message: string) => {
        if (finished) {
          return
        }

        finished = true
        cleanup()
        rejectProbe(new Error(message))
      }
      const schedulePaintCheck = () => {
        if (paintCheckPending || finished || inputStartedAt === null || mutationAt === 0) {
          return
        }

        paintCheckPending = true
        requestAnimationFrame(() => {
          const firstAnimationFrameAt = performance.now()

          requestAnimationFrame(() => {
            const secondAnimationFrameAt = performance.now()

            paintCheckPending = false

            if (finished || inputStartedAt === null) {
              return
            }

            const state = document.querySelector(contract.expectedStateSelector)
            const target = readFeedback()
            const targetMatches =
              Boolean(state) &&
              target.allVisible &&
              target.headingText === contract.expectedHeading &&
              target.statementText === contract.expectedStatement &&
              target.detailText === contract.expectedDetailText &&
              target.primaryCount === 1 &&
              target.primaryAriaLabel === contract.expectedPrimaryAriaLabel &&
              target.primaryText === contract.expectedPrimaryText &&
              target.primaryHref === contract.expectedPrimaryHref &&
              control.getAttribute('aria-pressed') === 'true' &&
              control.getAttribute('aria-current') !== null

            if (!targetMatches) {
              schedulePaintCheck()
              return
            }

            finished = true
            cleanup()
            resolveProbe({
              ariaCurrent: control.getAttribute('aria-current'),
              ariaPressed: control.getAttribute('aria-pressed'),
              baselineHeading: baseline.headingText,
              baselinePrimaryAriaLabel: baseline.primaryAriaLabel,
              baselinePrimaryHref: baseline.primaryHref,
              baselinePrimaryText: baseline.primaryText,
              baselineStatement: baseline.statementText,
              baselineStableAtInput,
              detailText: target.detailText,
              duration: secondAnimationFrameAt - inputStartedAt,
              firstAnimationFrameAt,
              headingText: target.headingText,
              inputCaptureNow,
              inputEventTime,
              mutationAt,
              preInputFirstAnimationFrameAt,
              preInputSecondAnimationFrameAt,
              primaryAriaLabel: target.primaryAriaLabel,
              primaryCount: target.primaryCount,
              primaryHref: target.primaryHref,
              primaryText: target.primaryText,
              secondAnimationFrameAt,
              stateMatches: control.matches(
                `${contract.controlSelector}[aria-pressed="true"]`,
              ),
              statementText: target.statementText,
              structuralChanged:
                target.structuralSignature !== baseline.structuralSignature,
              targetInactiveAtInput,
            })
          })
        })
      }
      const observer = new MutationObserver(() => {
        if (finished || inputStartedAt === null) {
          return
        }

        if (mutationAt === 0) {
          mutationAt = performance.now()
        }
        schedulePaintCheck()
      })
      const handleInput = (event: Event) => {
        const target = event.target

        if (!(target instanceof Element) || !target.closest(contract.controlSelector)) {
          return
        }

        if (
          event instanceof KeyboardEvent &&
          contract.key &&
          event.key !== contract.key &&
          event.code !== contract.key
        ) {
          return
        }

        if (inputStartedAt !== null) {
          return
        }

        const atInput = readFeedback()
        inputCaptureNow = performance.now()
        const eventTimeOnPerformanceTimeline =
          event.timeStamp > performance.timeOrigin
            ? event.timeStamp - performance.timeOrigin
            : event.timeStamp

        inputEventTime =
          Math.abs(eventTimeOnPerformanceTimeline - inputCaptureNow) <= 1000
            ? eventTimeOnPerformanceTimeline
            : inputCaptureNow
        baselineStableAtInput = JSON.stringify(atInput) === JSON.stringify(baseline)
        targetInactiveAtInput =
          control.getAttribute('aria-pressed') === 'false' &&
          control.getAttribute('aria-current') === null &&
          !document.querySelector(contract.expectedStateSelector)

        if (!baselineStableAtInput || !targetInactiveAtInput) {
          fail(`${contract.label}: baseline or inactive target changed before captured real input`)
          return
        }

        inputStartedAt = inputEventTime
        inputTimeout = window.setTimeout(
          () => fail(`${contract.label}: no painted target-specific feedback within 220ms of real input`),
          220,
        )
      }

      observer.observe(document.documentElement, {
        attributeFilter: [
          'aria-current',
          'aria-pressed',
          'data-active-project',
          'data-committed-target',
          'data-rialo-event',
          'data-rialo-event-phase',
        ],
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      })
      document.addEventListener(
        contract.input === 'pointer' ? 'pointerdown' : 'keydown',
        handleInput,
        true,
      )
      absoluteTimeout = window.setTimeout(
        () => fail(`${contract.label}: real Playwright input did not reach the armed control`),
        2000,
      )
      feedbackWindow.__CAPTAIN_DOCK_FEEDBACK_PROBE__ = { promise }
    },
    interaction,
  )
}

async function readFirstStructuralFeedback(page: Page) {
  return page.evaluate(async () => {
    const probe = (
      window as Window & {
        __CAPTAIN_DOCK_FEEDBACK_PROBE__?: {
          promise: Promise<InteractionFeedbackResult>
        }
      }
    ).__CAPTAIN_DOCK_FEEDBACK_PROBE__

    if (!probe) {
      throw new Error('首次结构反馈探针未安装。')
    }

    return probe.promise
  })
}

test.describe('production runtime response classifier', () => {
  const expectedUnknownPath = '/not-real-production-route'
  const policy = {
    allowDocument404: true,
    baseURL: expectedBaseUrl,
    expectedUnknownPath,
  } satisfies ProductionResponsePolicy

  test('allows all four same-origin unknown-route RSC 404 responses without runtime errors', () => {
    const classifications = Array.from({ length: 4 }, (_, index) =>
      classifyWithPolicy(
        createPureResponseFacts(
          `${expectedBaseUrl}${expectedUnknownPath}?_rsc=local-prefetch-${index + 1}`,
        ),
        policy,
      ),
    )

    expect(classifications.map((classification) => classification.error).filter(Boolean)).toEqual(
      [],
    )
    expect(
      classifications.filter((classification) => classification.expectedUnknownRsc404),
    ).toHaveLength(4)
  })

  test('rejects image, script, wrong-path, malformed-header, wrong-type, and cross-origin RSC lookalikes', () => {
    const validUrl = `${expectedBaseUrl}${expectedUnknownPath}?_rsc=valid`
    const cases = [
      createPureResponseFacts(validUrl, { resourceType: 'image' }),
      createPureResponseFacts(validUrl, { resourceType: 'script' }),
      createPureResponseFacts(`${expectedBaseUrl}/wrong-path?_rsc=wrong-path`),
      createPureResponseFacts(`${expectedBaseUrl}${expectedUnknownPath}`),
      createPureResponseFacts(validUrl, {
        requestHeaders: {
          'next-router-prefetch': '1',
          'next-router-segment-prefetch': '/_tree',
          'next-url': '/_not-found',
        },
      }),
      createPureResponseFacts(validUrl, {
        requestHeaders: {
          rsc: '1',
          'next-router-segment-prefetch': '/_tree',
          'next-url': '/_not-found',
        },
      }),
      createPureResponseFacts(validUrl, {
        requestHeaders: {
          rsc: '1',
          'next-router-prefetch': '1',
          'next-url': '/_not-found',
        },
      }),
      createPureResponseFacts(validUrl, {
        requestHeaders: {
          rsc: '1',
          'next-router-prefetch': '1',
          'next-router-segment-prefetch': '/_tree',
          'next-url': '/wrong-route',
        },
      }),
      createPureResponseFacts(validUrl, {
        responseHeaders: { 'content-type': 'application/json' },
      }),
      createPureResponseFacts(validUrl, {
        responseHeaders: {},
      }),
      createPureResponseFacts(
        `https://foreign.example${expectedUnknownPath}?_rsc=foreign-prefetch`,
      ),
    ]

    for (const facts of cases) {
      const classification = classifyWithPolicy(facts, policy)

      expect(classification.expectedUnknownRsc404).toBe(false)
      expect(classification.error).toBe(`${facts.resourceType} 404 ${facts.url}`)
    }
  })

  test('allows only the exact same-origin main document 404 path', () => {
    const exactUrl = `${expectedBaseUrl}${expectedUnknownPath}`
    const exactDocument = createPureResponseFacts(exactUrl, {
      isMainFrameNavigation: true,
      resourceType: 'document',
    })
    const lookalikes = [
      createPureResponseFacts(`${expectedBaseUrl}/wrong-path`, {
        isMainFrameNavigation: true,
        resourceType: 'document',
      }),
      createPureResponseFacts(`https://foreign.example${expectedUnknownPath}`, {
        isMainFrameNavigation: true,
        resourceType: 'document',
      }),
      createPureResponseFacts(exactUrl, {
        isMainFrameNavigation: false,
        resourceType: 'document',
      }),
      createPureResponseFacts(`${exactUrl}?unexpected=query`, {
        isMainFrameNavigation: true,
        resourceType: 'document',
      }),
      createPureResponseFacts(exactUrl, {
        isMainFrameNavigation: true,
        resourceType: 'image',
      }),
      createPureResponseFacts(exactUrl, {
        isMainFrameNavigation: true,
        resourceType: 'script',
      }),
    ]

    expect(classifyWithPolicy(exactDocument, policy).error).toBeUndefined()
    for (const facts of lookalikes) {
      expect(classifyWithPolicy(facts, policy).error).toBe(
        `${facts.resourceType} 404 ${facts.url}`,
      )
    }
  })

  test('fails closed when baseURL cannot provide a trusted origin', () => {
    const facts = createPureResponseFacts(
      `${expectedBaseUrl}${expectedUnknownPath}?_rsc=missing-origin`,
    )

    for (const baseURL of [undefined, 'not a valid URL']) {
      expect(
        classifyWithPolicy(facts, {
          allowDocument404: true,
          baseURL,
          expectedUnknownPath,
        }).error,
      ).toBe(`fetch 404 ${facts.url}`)
    }
  })

  test('records same-origin script body read failures as runtime errors', async () => {
    const scriptUrl = `${expectedBaseUrl}/_next/static/chunks/unreadable.js`
    const harness = createRuntimeCollectorHarness(expectedBaseUrl, expectedUnknownPath)

    harness.emitResponse(createFakeScriptResponse(scriptUrl, () => Promise.reject(new Error('blocked-body'))))
    await harness.runtime.scriptBodies()

    expect(harness.runtime.errors).toEqual([`script body read failed ${scriptUrl}: Error: blocked-body`])
  })
})

test.describe('production performance gate', () => {
  test.skip(process.env[productionSwitch] !== '1', `${productionSwitch}=1 时才运行 production 性能门禁`)

  test('production performance gate uses full Chromium new-headless channel', async ({ browserName, channel }) => {
    expect(browserName).toBe('chromium')
    expect(channel).toBe('chromium')
  })

  test('production runner and Lighthouse config contracts are installed', async ({ baseURL }) => {
    expect(process.env[productionSwitch]).toBe('1')
    expect(baseURL).toBe(expectedBaseUrl)

    const packageJson = await readJsonFile<{ scripts: Record<string, string> }>('package.json')
    expect(packageJson.scripts.lighthouse).toBe('node scripts/run-lighthouse.mjs')
    expect(packageJson.scripts['test:lighthouse']).toBe('node scripts/run-lighthouse.mjs')

    const playwrightConfig = await readFile(path.join(repoRoot, 'playwright.config.ts'), 'utf8')
    expect(playwrightConfig).toContain(productionSwitch)
    expect(playwrightConfig).toContain('webServer: externalProductionServer ? undefined :')

    const lighthouseConfig = await readJsonFile<{
      ci: {
        collect: {
          url: string[]
          numberOfRuns: number
          settings?: Record<string, unknown>
        }
        assert: { assertions: Record<string, [string, Record<string, unknown>]> }
        upload: { target: string; outputDir: string }
      }
    }>('lighthouserc.json')

    expect(lighthouseConfig.ci.collect.url).toEqual([
      `${expectedBaseUrl}/`,
      `${expectedBaseUrl}/arc/signal-ledger`,
      `${expectedBaseUrl}/about`,
    ])
    expect(lighthouseConfig.ci.collect.numberOfRuns).toBe(3)
    expect(lighthouseConfig.ci.collect.settings).not.toMatchObject({ formFactor: 'desktop' })
    expect(lighthouseConfig.ci.collect.settings?.onlyCategories).toEqual([
      'performance',
      'accessibility',
      'best-practices',
      'seo',
    ])
    expect(lighthouseConfig.ci.upload).toEqual({ target: 'filesystem', outputDir: 'reports' })

    for (const assertion of Object.values(lighthouseConfig.ci.assert.assertions)) {
      expect(assertion[1].aggregationMethod).toBe('median')
    }
  })

  test('Home cold bootstrap reaches settled demand rendering without long tasks', async ({ page, baseURL }) => {
    expect(baseURL).toBe(expectedBaseUrl)
    await armColdBootstrapLongTaskObserver(page)
    const runtime = attachProductionRuntimeCollector(page, baseURL ?? expectedBaseUrl)
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })

    expect(response?.ok()).toBe(true)
    await expect(page.locator('[data-instrument-stage="home"]')).toHaveAttribute(
      'data-cinematic-entry',
      'settled',
      { timeout: 10000 },
    )
    await expect(page.locator('[data-universe-shell]')).toHaveAttribute(
      'data-universe-ready',
      'true',
    )
    await expect(page.locator('[data-universe-shell]')).toHaveAttribute(
      'data-universe-settled',
      'true',
    )
    await expect(page.locator('[data-universe-shell]')).toHaveAttribute(
      'data-universe-frameloop',
      'demand',
    )
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(1)

    const longTasks = await readColdBootstrapLongTasks(page)
    const violations = longTasks.entries.filter((entry) => entry.duration > 50)
    const violationSummary = JSON.stringify(violations, null, 2)

    expect(longTasks.supported).toBe(true)
    expect(longTasks.installError).toBeNull()
    expect(longTasks.maxDuration, violationSummary).toBeLessThanOrEqual(50)
    expect(violations, violationSummary).toEqual([])
    expect(runtime.errors).toEqual([])
  })

  for (const interaction of [
    {
      controlSelector: '[data-instrument-stage="home"] button[data-scene-target="project:hadron"]',
      detailSelector:
        '[data-instrument-stage="home"] [data-active-project] [data-active-project-statement]',
      expectedDetailText: 'Issue the asset. Watch the market find its price.',
      expectedHeading: 'HADRON',
      expectedPrimaryAriaLabel: 'Open HADRON case file',
      expectedPrimaryHref: '/arc/hadron',
      expectedPrimaryText: 'Open case file',
      expectedStateSelector:
        '[data-instrument-stage="home"][data-active-project="hadron"][data-committed-target="project:hadron"][data-effective-target="project:hadron"]',
      expectedStatement: 'Issue the asset. Watch the market find its price.',
      headingSelector:
        '[data-instrument-stage="home"] [data-stage-title] h1 > span[aria-hidden="true"]',
      input: 'pointer',
      label: 'Home HADRON commit',
      primarySelector: '[data-instrument-stage="home"] [data-control-role="primary"]',
      route: '/',
      stageSelector: '[data-instrument-stage="home"]',
      statementSelector:
        '[data-instrument-stage="home"] [data-active-project] [data-active-project-statement]',
    },
    {
      controlSelector: '[data-instrument-stage="arc"] button[data-scene-target="project:hadron"]',
      detailSelector:
        '[data-instrument-stage="arc"] [data-active-project] [data-active-project-statement]',
      expectedDetailText: 'Issue the asset. Watch the market find its price.',
      expectedHeading: 'HADRON',
      expectedPrimaryAriaLabel: 'Open HADRON case file',
      expectedPrimaryHref: '/arc/hadron',
      expectedPrimaryText: 'Open case file',
      expectedStateSelector:
        '[data-instrument-stage="arc"][data-active-project="hadron"][data-committed-target="project:hadron"][data-effective-target="project:hadron"]',
      expectedStatement: 'Issue the asset. Watch the market find its price.',
      headingSelector: '[data-instrument-stage="arc"] [data-active-project] h2',
      input: 'keyboard',
      key: 'Enter',
      label: 'Arc HADRON commit',
      primarySelector: '[data-instrument-stage="arc"] [data-control-role="primary"]',
      route: '/arc',
      stageSelector: '[data-instrument-stage="arc"]',
      statementSelector:
        '[data-instrument-stage="arc"] [data-active-project] [data-active-project-statement]',
    },
    {
      controlSelector: '[data-instrument-stage="rialo"] button[data-scene-target="rialo-step:trigger"]',
      detailSelector:
        '[data-instrument-stage="rialo"] [data-rialo-step-description]:not([hidden])',
      expectedDetailText:
        'Flight-status changes act as trigger cues that explain how delay conditions are observed.',
      expectedHeading: 'Trigger',
      expectedPrimaryAriaLabel: 'Open Rialo Captain case file',
      expectedPrimaryHref: '/rialo/rialo-captain',
      expectedPrimaryText: 'Open case file',
      expectedStateSelector:
        '[data-instrument-stage="rialo"][data-rialo-event="trigger"][data-rialo-event-phase="active"][data-committed-target="rialo-step:trigger"][data-effective-target="rialo-step:trigger"]',
      expectedStatement: 'Disruption becomes evidence, settlement, and a clear next move.',
      headingSelector: '[data-instrument-stage="rialo"] [data-rialo-readout] h3',
      input: 'pointer',
      label: 'Rialo Trigger commit',
      primarySelector: '[data-instrument-stage="rialo"] [data-control-role="primary"]',
      route: '/rialo',
      stageSelector: '[data-instrument-stage="rialo"]',
      statementSelector: '[data-instrument-stage="rialo"] [data-active-project-statement]',
    },
  ] as const satisfies readonly InteractionFeedbackCase[]) {
    test(`${interaction.label} exposes its first structural feedback within 200ms`, async ({
      page,
      baseURL,
    }) => {
      expect(baseURL).toBe(expectedBaseUrl)
      const runtime = attachProductionRuntimeCollector(page, baseURL ?? expectedBaseUrl)
      const response = await page.goto(interaction.route, { waitUntil: 'domcontentloaded' })

      expect(response?.ok()).toBe(true)
      const control = page.locator(interaction.controlSelector)

      await expect(control).toHaveCount(1)
      await expect(control).toHaveAttribute('aria-pressed', 'false')
      await expect(page.locator(interaction.expectedStateSelector)).toHaveCount(0)
      await expect(page.locator(interaction.stageSelector)).toHaveAttribute(
        'data-cinematic-entry',
        'settled',
      )
      if (interaction.input === 'pointer') {
        await control.hover()
      } else {
        await control.scrollIntoViewIfNeeded()
        await control.focus()
      }
      await armFirstStructuralFeedback(page, interaction)

      if (interaction.input === 'pointer') {
        await control.click()
      } else {
        await page.keyboard.press(interaction.key ?? 'Enter')
      }

      const feedback = await readFirstStructuralFeedback(page)

      expect(feedback.duration).toBeGreaterThanOrEqual(0)
      expect(feedback.duration).toBeLessThanOrEqual(200)
      expect(feedback.preInputSecondAnimationFrameAt).toBeGreaterThan(
        feedback.preInputFirstAnimationFrameAt,
      )
      expect(feedback.inputCaptureNow).toBeGreaterThanOrEqual(
        feedback.preInputSecondAnimationFrameAt,
      )
      expect(Math.abs(feedback.inputCaptureNow - feedback.inputEventTime)).toBeLessThan(16)
      expect(feedback.baselineStableAtInput).toBe(true)
      expect(feedback.targetInactiveAtInput).toBe(true)
      expect(feedback.mutationAt).toBeGreaterThan(0)
      expect(feedback.firstAnimationFrameAt).toBeGreaterThanOrEqual(feedback.mutationAt)
      expect(feedback.secondAnimationFrameAt).toBeGreaterThan(feedback.firstAnimationFrameAt)
      expect(feedback.headingText).toBe(interaction.expectedHeading)
      expect(feedback.statementText).toBe(interaction.expectedStatement)
      expect(feedback.detailText).toBe(interaction.expectedDetailText)
      expect(feedback.primaryCount).toBe(1)
      expect(feedback.primaryAriaLabel).toBe(interaction.expectedPrimaryAriaLabel)
      expect(feedback.primaryText).toBe(interaction.expectedPrimaryText)
      expect(feedback.primaryHref).toBe(interaction.expectedPrimaryHref)
      expect(feedback.structuralChanged).toBe(true)
      expect({
        heading: feedback.baselineHeading,
        primaryAriaLabel: feedback.baselinePrimaryAriaLabel,
        href: feedback.baselinePrimaryHref,
        primary: feedback.baselinePrimaryText,
        statement: feedback.baselineStatement,
      }).not.toEqual({
        heading: feedback.headingText,
        primaryAriaLabel: feedback.primaryAriaLabel,
        href: feedback.primaryHref,
        primary: feedback.primaryText,
        statement: feedback.statementText,
      })
      expect(feedback.ariaPressed).toBe('true')
      expect(feedback.ariaCurrent).not.toBeNull()
      expect(feedback.stateMatches).toBe(true)
      await expect(page.locator(interaction.expectedStateSelector)).toHaveCount(1)
      expect(runtime.errors).toEqual([])
    })
  }

  for (const route of immersiveRoutes) {
    test(`production immersive route ${route} serves one universe canvas without runtime failures`, async ({ page, baseURL }) => {
      expect(baseURL).toBe(expectedBaseUrl)
      const runtime = attachProductionRuntimeCollector(page, baseURL ?? expectedBaseUrl)
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' })

      expect(response?.ok()).toBe(true)
      await expect(page.locator('[data-universe-shell]')).toHaveCount(1)
      await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(1, { timeout: 10000 })
      await page.waitForLoadState('networkidle')
      await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(1)

      const hasProductionDebugApi = await page.evaluate(() =>
        Object.prototype.hasOwnProperty.call(window, '__CAPTAIN_DOCK_UNIVERSE_DEBUG__'),
      )
      expect(hasProductionDebugApi).toBe(false)
      expect(runtime.errors).toEqual([])
    })
  }

  for (const route of coldRoutes) {
    test(`production cold route ${route.path} excludes universe canvas and enhanced scene chunks`, async ({ page, baseURL }) => {
      expect(baseURL).toBe(expectedBaseUrl)
      const runtime = attachProductionRuntimeCollector(page, baseURL ?? expectedBaseUrl, {
        allowDocument404: route.expectedStatus === 404,
        expectedUnknownPath: route.expectedStatus === 404 ? route.path : undefined,
      })
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' })

      expect(response?.status()).toBe(route.expectedStatus)
      await page.waitForLoadState('load')
      if (route.expectedStatus === 404) {
        await expect.poll(() => runtime.expectedUnknownRsc404Count(), { timeout: 10000 }).toBeGreaterThan(0)
      }
      await expect(page.locator('[data-universe-shell]')).toHaveCount(0)
      await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
      await expect(page.locator('[data-universe-shell]')).toHaveCount(0)
      await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)

      const scriptBodies = await runtime.scriptBodies()
      expect(scriptBodies.length).toBeGreaterThan(0)
      const combinedScripts = scriptBodies.join('\n')
      for (const sentinel of enhancedOnlySentinels) {
        expect(combinedScripts).not.toContain(sentinel)
      }
      if (route.expectedStatus === 404) {
        expect(runtime.expectedUnknownRsc404Count()).toBeGreaterThan(0)
      } else {
        expect(runtime.expectedUnknownRsc404Count()).toBe(0)
      }
      expect(runtime.errors).toEqual([])
    })
  }
})
