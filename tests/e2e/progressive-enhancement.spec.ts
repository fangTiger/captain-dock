import { expect, test } from '@playwright/test'
import type { Browser, BrowserContext, Locator, Page } from '@playwright/test'

import {
  expectUniverseResourcesAtBaseline,
  installUniverseResourceProbe,
  readUniverseResourceSnapshot,
  restoreUniverseDocumentVisibility,
  setUniverseDocumentVisibility,
} from './support/universe-resource-probe'

const immersiveRoutes = ['/', '/arc', '/rialo'] as const
const externalProductionServer = process.env.CAPTAIN_DOCK_EXTERNAL_PRODUCTION === '1'
const cinematicHandoffStorageKey = 'captain-dock:cinematic-handoff'
const sceneTerminalWindowMs = 720
const coldRoutes = [
  '/about',
  '/arc/signal-ledger',
  '/arc/hadron',
  '/arc/arcpredict',
  '/rialo/rialo-captain',
  '/not-real',
  '/arc/not-exists',
] as const

async function waitForUniverseReady(page: Page) {
  await expect(page.locator('[data-universe-shell][data-universe-ready="true"]')).toHaveCount(1)
  await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(1)
}

async function expectPublicUniverseRoute(
  page: Page,
  scene: 'home' | 'arc' | 'rialo',
) {
  const shell = page.locator('[data-universe-shell]')

  await expect(shell).toHaveAttribute('data-universe-scene', scene)
  await expect(shell).toHaveAttribute('data-universe-ready', 'true')
  await expect(shell).toHaveAttribute('data-universe-render-state', /^(active|demand)$/)
}

async function waitForPublicSettledDemand(
  page: Page,
  scene: 'home' | 'arc' | 'rialo',
) {
  const shell = page.locator('[data-universe-shell]')

  await expect(shell).toHaveAttribute('data-universe-scene', scene)
  await expect(shell).toHaveAttribute('data-universe-ready', 'true')
  await expect(shell).toHaveAttribute('data-universe-frameloop', 'demand')
  await expect(shell).toHaveAttribute('data-universe-render-state', 'demand')
  await expect(shell).toHaveAttribute('data-universe-settled', 'true')
  await expect(shell).toHaveAttribute('data-universe-morph-phase', 'idle')
}

async function expectProductionDebugAbsent(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.prototype.hasOwnProperty.call(window, '__CAPTAIN_DOCK_UNIVERSE_DEBUG__'),
      ),
    )
    .toBe(false)
}

async function expectCinematicTerminalState(page: Page) {
  await expect(page.locator('[data-cinematic-carrier-direction]')).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(
        (storageKey) => window.sessionStorage.getItem(storageKey),
        cinematicHandoffStorageKey,
      ),
    )
    .toBeNull()
}

async function establishSceneOutsideViewport(page: Page) {
  const sceneLayer = page.locator('[data-universe-scene-layer]')

  await page.setViewportSize({ width: 1280, height: 320 })
  await page.locator('footer.site-footer').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }))
  await expect
    .poll(async () => {
      const box = await sceneLayer.boundingBox()

      return box ? box.y + box.height : Number.POSITIVE_INFINITY
    })
    .toBeLessThanOrEqual(0)

  const box = await sceneLayer.boundingBox()

  if (!box) {
    throw new Error('Universe scene layer geometry is missing.')
  }

  expect(box.y + box.height).toBeLessThanOrEqual(0)
}

async function expectNoPendingAnimationFrames(page: Page) {
  await expect
    .poll(async () => (await readUniverseResourceSnapshot(page)).pendingAnimationFrameCount)
    .toBe(0)
  await page.waitForTimeout(120)
  expect((await readUniverseResourceSnapshot(page)).pendingAnimationFrameCount).toBe(0)
}

async function expectUniverseTarget(page: Page, target: string) {
  await expect(page.locator('[data-universe-shell]')).toHaveAttribute('data-universe-target', target)
}

async function closestSceneTarget(locator: Locator) {
  return locator.evaluate((node) => node.closest('[data-scene-target]')?.getAttribute('data-scene-target') ?? null)
}

type StaticContextProbeOptions = {
  saveData?: boolean
  webgl2Unavailable?: boolean
}

async function installDeterministicProgressiveProbe(
  context: BrowserContext,
  { saveData = false, webgl2Unavailable = false }: StaticContextProbeOptions = {},
) {
  await context.addInitScript(
    ({ saveData: shouldSaveData, webgl2Unavailable: shouldDisableWebGL2 }) => {
      if (shouldSaveData) {
        Object.defineProperty(navigator, 'connection', {
          configurable: true,
          value: {
            saveData: true,
            addEventListener() {},
            removeEventListener() {},
          },
        })
      }

      const originalGetContext = HTMLCanvasElement.prototype.getContext

      Object.defineProperty(window, '__captainDockWebGL2ProbeCount', {
        configurable: true,
        value: 0,
        writable: true,
      })

      HTMLCanvasElement.prototype.getContext = function getContext(
        this: HTMLCanvasElement,
        contextId: string,
        ...args: unknown[]
      ) {
        if (contextId === 'webgl2') {
          window.__captainDockWebGL2ProbeCount += 1

          if (shouldDisableWebGL2) {
            return null
          }
        }

        return originalGetContext.call(this, contextId, ...args as [])
      } as typeof HTMLCanvasElement.prototype.getContext
    },
    { saveData, webgl2Unavailable },
  )
}

async function expectProbeCount(page: Page, expected: number) {
  await expect.poll(() => page.evaluate(() => window.__captainDockWebGL2ProbeCount)).toBe(expected)
}

async function expectStaticFallbackIsMechanicalBackdrop(
  page: Page,
  scene: 'home' | 'arc' | 'rialo',
) {
  const fallback = page.locator(`[data-static-scene="${scene}"]`)
  const sceneLayer = page.locator('[data-universe-scene-layer]')
  const caption = fallback.locator('figcaption')
  const plate = fallback.locator('svg')

  await expect(fallback).toHaveCount(1)
  await expect(fallback).toHaveAttribute('role', 'img')
  await expect(fallback).toHaveAttribute('aria-label', /.+/)
  await expect(caption).toHaveCount(1)
  await expect(plate).toHaveCount(1)
  await expect(plate).toHaveAttribute('aria-hidden', 'true')
  await expect(plate).toHaveAttribute('focusable', 'false')

  const [fallbackBox, sceneLayerBox, plateBox] = await Promise.all([
    fallback.boundingBox(),
    sceneLayer.boundingBox(),
    plate.boundingBox(),
  ])

  if (!fallbackBox || !sceneLayerBox || !plateBox) {
    throw new Error(`Static ${scene} fallback geometry is missing.`)
  }

  const expectMatchingEdges = (
    subject: NonNullable<typeof fallbackBox>,
    reference: NonNullable<typeof fallbackBox>,
  ) => {
    expect.soft(Math.abs(subject.x - reference.x)).toBeLessThanOrEqual(1)
    expect.soft(Math.abs(subject.y - reference.y)).toBeLessThanOrEqual(1)
    expect.soft(
      Math.abs(subject.x + subject.width - (reference.x + reference.width)),
    ).toBeLessThanOrEqual(1)
    expect.soft(
      Math.abs(subject.y + subject.height - (reference.y + reference.height)),
    ).toBeLessThanOrEqual(1)
  }

  expectMatchingEdges(fallbackBox, sceneLayerBox)
  expectMatchingEdges(plateBox, fallbackBox)

  const surface = await fallback.evaluate((element) => {
    const style = getComputedStyle(element)

    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderBottomWidth: style.borderBottomWidth,
      borderLeftWidth: style.borderLeftWidth,
      borderRightWidth: style.borderRightWidth,
      borderTopWidth: style.borderTopWidth,
      boxShadow: style.boxShadow,
      maxWidth: style.maxWidth,
      opacity: Number(style.opacity),
      pointerEvents: style.pointerEvents,
    }
  })

  expect.soft(surface).toMatchObject({
    backgroundColor: 'rgba(0, 0, 0, 0)',
    backgroundImage: 'none',
    borderBottomWidth: '0px',
    borderLeftWidth: '0px',
    borderRightWidth: '0px',
    borderTopWidth: '0px',
    boxShadow: 'none',
    maxWidth: 'none',
    pointerEvents: 'none',
  })
  expect.soft(surface.opacity).toBeGreaterThan(0)
  expect.soft(surface.opacity).toBeLessThanOrEqual(0.2)

  expect((await caption.textContent())?.trim().length).toBeGreaterThan(0)
  await expect.soft(caption).toHaveCSS('display', 'none')
}

async function expectNoContinuousInstrumentAnimations(page: Page, label: string) {
  const continuousAnimations = await page.locator('[data-universe-content]').evaluate((content) =>
    content
      .getAnimations({ subtree: true })
      .filter((animation) => {
        const timing = animation.effect?.getComputedTiming()

        return (
          timing?.iterations === Number.POSITIVE_INFINITY &&
          animation.playState !== 'finished' &&
          animation.playState !== 'idle'
        )
      })
      .map((animation) => ({
        playState: animation.playState,
      })),
  )

  expect(continuousAnimations, `${label} continuous instrument animations`).toEqual([])
}

async function newStaticContext(
  browser: Browser,
  baseURL: string | undefined,
  options: Parameters<Browser['newContext']>[0],
  probeOptions?: StaticContextProbeOptions,
) {
  const context = await browser.newContext({
    baseURL,
    viewport: {
      width: 1440,
      height: 960,
    },
    ...options,
  })

  await installDeterministicProgressiveProbe(context, probeOptions)

  const page = await context.newPage()
  return { context, page }
}

async function closeContext(context: BrowserContext) {
  await context.close()
}

type RuntimeFailureCollector = {
  expectNoFailures: () => void
}

type UniverseDebugSnapshot = {
  calls: number
  documentVisible: boolean
  dpr: number
  frameCount: number
  frameloop: string
  hostVisible: boolean
  programs: number
  quality: 'high' | 'medium' | 'low'
  runtimePhase: string
  settled: boolean
  targetScene: 'home' | 'arc' | 'rialo'
  textures: number
  transitionPhase: string
  transitionScene: 'home' | 'arc' | 'rialo'
  transitionToken: number
  triangles: number
}

function attachRuntimeFailureCollector(page: Page): RuntimeFailureCollector {
  const failures: string[] = []

  page.on('pageerror', (error) => {
    failures.push(`pageerror: ${error.message}`)
  })
  page.on('console', (message) => {
    if (message.type() === 'error') {
      failures.push(`console error: ${message.text()}`)
    }
  })
  page.on('requestfailed', (request) => {
    failures.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failures.push(`response ${response.status()}: ${response.url()}`)
    }
  })

  return {
    expectNoFailures() {
      expect(failures).toEqual([])
    },
  }
}

async function readUniverseDebug(page: Page) {
  return page.evaluate(() => window.__CAPTAIN_DOCK_UNIVERSE_DEBUG__ ?? null)
}

async function requireUniverseDebug(page: Page) {
  const debug = await readUniverseDebug(page)

  if (!debug) {
    throw new Error('Universe debug snapshot is missing.')
  }

  return debug
}

async function expectDebugSubset(
  page: Page,
  expected: Partial<UniverseDebugSnapshot>,
  timeout = 1500,
) {
  await expect
    .poll(async () => {
      const debug = await readUniverseDebug(page)

      if (!debug) {
        return null
      }

      return Object.fromEntries(
        Object.keys(expected).map((key) => [
          key,
          debug[key as keyof UniverseDebugSnapshot],
        ]),
      )
    }, { timeout })
    .toEqual(expected)
}

async function frameDeltaAcrossAnimationFrames(page: Page, frameSamples = 6) {
  return page.evaluate(async (samples) => {
    const readFrameCount = () => window.__CAPTAIN_DOCK_UNIVERSE_DEBUG__?.frameCount ?? null
    const first = readFrameCount()

    for (let index = 0; index < samples; index += 1) {
      await new Promise((resolve) => {
        window.requestAnimationFrame(resolve)
      })
    }

    const last = readFrameCount()

    return first === null || last === null ? null : last - first
  }, frameSamples)
}

async function expectFramesStable(page: Page) {
  await expect.poll(async () => frameDeltaAcrossAnimationFrames(page), { timeout: 1500 }).toBe(0)
}

async function waitForSettledDemand(page: Page) {
  await expectDebugSubset(page, {
    frameloop: 'demand',
    runtimePhase: 'ready',
    settled: true,
  }, 2000)
}

async function expectPersistentCanvas(page: Page, firstCanvas: NonNullable<Awaited<ReturnType<Locator['elementHandle']>>>) {
  await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(1)
  expect(
    await firstCanvas.evaluate((node) => node.isSameNode(document.querySelector('canvas[data-universe-canvas]'))),
  ).toBe(true)
}

async function observeCommittedUniverseTarget(page: Page, targetScene: UniverseDebugSnapshot['targetScene']) {
  await expectDebugSubset(page, { targetScene }, 1500)
  const debug = await requireUniverseDebug(page)

  expect(debug.targetScene).toBe(targetScene)

  return debug.transitionToken
}

async function collectScriptRequestsForRoute(
  browser: Browser,
  baseURL: string | undefined,
  route: string,
  contextOptions: Parameters<Browser['newContext']>[0] = {},
  probeOptions?: StaticContextProbeOptions,
) {
  const { context, page } = await newStaticContext(browser, baseURL, contextOptions, probeOptions)
  const failures = attachRuntimeFailureCollector(page)
  const scriptRequests = new Set<string>()

  page.on('request', (request) => {
    if (request.resourceType() === 'script') {
      scriptRequests.add(request.url())
    }
  })

  try {
    await page.goto(route)

    if (route === '/' || route === '/arc' || route === '/rialo') {
      await expect(page.locator('[data-static-scene]')).toHaveCount(1)
      await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
    } else {
      await expect(page.locator('[data-universe-shell]')).toHaveCount(0)
    }

    await page.waitForLoadState('networkidle')
    failures.expectNoFailures()

    return scriptRequests
  } finally {
    await closeContext(context)
  }
}

declare global {
  interface Window {
    __captainDockWebGL2ProbeCount: number
    __CAPTAIN_DOCK_UNIVERSE_DEBUG__?: UniverseDebugSnapshot
  }
}

test('enhanced immersive routes mount exactly one canvas', async ({ page }) => {
  for (const route of immersiveRoutes) {
    await page.goto(route)
    await waitForUniverseReady(page)
    await expect(page.locator('[data-static-scene]')).toHaveCount(0)
  }
})

test('real Link navigation keeps the same canvas DOM node across immersive routes', async ({ page }) => {
  await page.goto('/')
  await waitForUniverseReady(page)

  const firstCanvas = await page.locator('canvas[data-universe-canvas]').elementHandle()

  if (!firstCanvas) {
    throw new Error('Initial universe canvas is missing.')
  }

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Arc' }).click()
  await expect(page).toHaveURL(/\/arc$/)
  await waitForUniverseReady(page)
  expect(await firstCanvas.evaluate((node) => node.isSameNode(document.querySelector('canvas[data-universe-canvas]')))).toBe(
    true,
  )

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Rialo' }).click()
  await expect(page).toHaveURL(/\/rialo$/)
  await waitForUniverseReady(page)
  expect(await firstCanvas.evaluate((node) => node.isSameNode(document.querySelector('canvas[data-universe-canvas]')))).toBe(
    true,
  )
})

test('home DOM markers drive the shell target without changing the canvas identity', async ({ page }) => {
  await page.goto('/')
  await waitForUniverseReady(page)
  await expectUniverseTarget(page, 'project:signal-ledger')

  const firstCanvas = await page.locator('canvas[data-universe-canvas]').elementHandle()
  const stage = page.locator('[data-instrument-stage="home"]')
  const ecosystemIndex = stage.getByRole('navigation', {
    name: 'Ecosystem stage index',
  })
  const projectReel = stage.getByRole('group', { name: 'Project reel' })
  const activePanel = stage.getByRole('region', { name: 'Active project' })
  const arc = ecosystemIndex.getByRole('link', { name: /Arc$/i })
  const rialo = ecosystemIndex.getByRole('link', { name: /Rialo$/i })
  const signalSelector = projectReel.getByRole('button', {
    name: /SIGNAL\/LEDGER/i,
  })
  const signalCase = activePanel.getByRole('link', {
    name: 'Open SIGNAL/LEDGER case file',
  })

  if (!firstCanvas) {
    throw new Error('Initial universe canvas is missing.')
  }

  await expect(ecosystemIndex).toHaveCount(1)
  await expect(projectReel).toHaveCount(1)
  await expect(activePanel.getByRole('link')).toHaveCount(1)
  await expect(arc).toHaveAttribute('data-scene-target', 'ecosystem:arc')
  await expect(rialo).toHaveAttribute('data-scene-target', 'ecosystem:rialo')
  await expect(signalSelector).toHaveAttribute('data-scene-target', 'project:signal-ledger')
  await expect(signalCase).toHaveAttribute('data-scene-target', 'project:signal-ledger')
  expect(await closestSceneTarget(signalCase)).toBe('project:signal-ledger')

  await arc.hover()
  await expectUniverseTarget(page, 'ecosystem:arc')

  await rialo.focus()
  await expectUniverseTarget(page, 'ecosystem:rialo')

  await signalSelector.hover()
  await expectUniverseTarget(page, 'project:signal-ledger')

  await signalCase.focus()
  await expectUniverseTarget(page, 'project:signal-ledger')

  expect(await firstCanvas.evaluate((node) => node.isSameNode(document.querySelector('canvas[data-universe-canvas]')))).toBe(
    true,
  )
})

test('focus and pointer targets switch atomically and fall back to the other active modality', async ({ page }) => {
  await page.goto('/')
  await waitForUniverseReady(page)

  const stage = page.locator('[data-instrument-stage="home"]')
  const ecosystemIndex = stage.getByRole('navigation', {
    name: 'Ecosystem stage index',
  })
  const projectReel = stage.getByRole('group', { name: 'Project reel' })
  const activePanel = stage.getByRole('region', { name: 'Active project' })
  const arc = ecosystemIndex.getByRole('link', { name: /Arc$/i })
  const rialo = ecosystemIndex.getByRole('link', { name: /Rialo$/i })
  const hadronSelector = projectReel.getByRole('button', { name: /HADRON/i })
  const signalCase = activePanel.getByRole('link', {
    name: 'Open SIGNAL/LEDGER case file',
  })
  const pointerClearSurface = page.getByRole('contentinfo')

  await expect(activePanel.getByRole('link')).toHaveCount(1)
  await expect(signalCase).toHaveAttribute('data-scene-target', 'project:signal-ledger')
  await expect(hadronSelector).toHaveAttribute('data-scene-target', 'project:hadron')
  await expect(pointerClearSurface.locator('[data-scene-target]')).toHaveCount(0)

  await arc.focus()
  await expectUniverseTarget(page, 'ecosystem:arc')

  await hadronSelector.hover()
  await expectUniverseTarget(page, 'project:hadron')

  await pointerClearSurface.hover()
  await expectUniverseTarget(page, 'ecosystem:arc')

  await signalCase.focus()
  await expectUniverseTarget(page, 'project:signal-ledger')

  await rialo.hover()
  await expectUniverseTarget(page, 'ecosystem:rialo')

  await pointerClearSurface.hover()
  await expectUniverseTarget(page, 'project:signal-ledger')
})

test('Rialo roving focus drives scene target separately from active readout state', async ({ page }) => {
  await page.goto('/rialo')
  await waitForUniverseReady(page)

  const observe = page.getByRole('button', { name: /Observe.*Observe flight/ })
  const cover = page.getByRole('button', { name: /Cover.*Purchase cover/ })
  const stage = page.locator('[data-instrument-stage="rialo"]')
  const activeDescription = stage.locator(
    '[data-rialo-step-description]:not([hidden])',
  )
  const readout = page.getByTestId('rialo-active-readout')
  const readoutSignal = readout.getByRole('heading', { level: 3 })
  const activeJudgment = readout.locator('[data-active-project-statement]')
  const firstCanvas = await page.locator('canvas[data-universe-canvas]').elementHandle()

  if (!firstCanvas) {
    throw new Error('Initial universe canvas is missing.')
  }

  await expect(observe).toHaveAttribute('data-scene-target', 'rialo-step:observe')
  await expect(cover).toHaveAttribute('data-scene-target', 'rialo-step:cover')
  await expect(observe).toHaveAttribute('aria-describedby', 'rialo-step-1-description')
  await expect(cover).toHaveAttribute('aria-describedby', 'rialo-step-2-description')
  await expect(stage.locator('[data-rialo-step-description]')).toHaveCount(5)
  await expect(activeJudgment).toHaveText(
    'Disruption becomes evidence, settlement, and a clear next move.',
  )

  await observe.focus()
  await expectUniverseTarget(page, 'rialo-step:observe')
  await expect(observe).toHaveAttribute('aria-pressed', 'true')
  await expect(observe).toHaveAttribute('aria-current', 'step')
  await expect(stage).toHaveAttribute('data-committed-target', 'rialo-step:observe')
  await expect(stage).toHaveAttribute('data-effective-target', 'rialo-step:observe')
  await expect(activeDescription).toHaveCount(1)
  await expect(activeDescription).toHaveAttribute('id', 'rialo-step-1-description')
  await expect(activeDescription).toHaveText(
    'The user begins with flight risk, timing, and status cues to assess whether protection is relevant.',
  )
  await expect(readoutSignal).toHaveText('Observe')

  await page.keyboard.press('ArrowRight')
  await expect(cover).toBeFocused()
  await expectUniverseTarget(page, 'rialo-step:cover')
  await expect(observe).toHaveAttribute('aria-pressed', 'true')
  await expect(observe).toHaveAttribute('aria-current', 'step')
  await expect(cover).toHaveAttribute('aria-pressed', 'false')
  await expect(cover).not.toHaveAttribute('aria-current')
  await expect(stage).toHaveAttribute('data-committed-target', 'rialo-step:observe')
  await expect(stage).toHaveAttribute('data-effective-target', 'rialo-step:cover')
  await expect(activeDescription).toHaveCount(1)
  await expect(activeDescription).toHaveAttribute('id', 'rialo-step-1-description')
  await expect(readoutSignal).toHaveText('Observe')
  await expect(activeJudgment).toHaveText(
    'Disruption becomes evidence, settlement, and a clear next move.',
  )

  await page.keyboard.press('Enter')
  await expect(observe).toHaveAttribute('aria-pressed', 'false')
  await expect(observe).not.toHaveAttribute('aria-current')
  await expect(cover).toHaveAttribute('aria-pressed', 'true')
  await expect(cover).toHaveAttribute('aria-current', 'step')
  await expect(stage).toHaveAttribute('data-committed-target', 'rialo-step:cover')
  await expect(stage).toHaveAttribute('data-effective-target', 'rialo-step:cover')
  await expect(activeDescription).toHaveCount(1)
  await expect(activeDescription).toHaveAttribute('id', 'rialo-step-2-description')
  await expect(activeDescription).toHaveText(
    'The purchase step shows the protection scope, trigger conditions, and demo amount.',
  )
  await expect(readoutSignal).toHaveText('Cover')
  await expect(activeJudgment).toHaveText(
    'Disruption becomes evidence, settlement, and a clear next move.',
  )
  expect(await firstCanvas.evaluate((node) => node.isSameNode(document.querySelector('canvas[data-universe-canvas]')))).toBe(
    true,
  )
})

const ambientMotionRoutes = [
  {
    control: '[data-instrument-stage="home"] [aria-label="Project reel"] button',
    mainOwner: '[data-home-monument]',
    mainOwnerPosition: 'scope',
    route: '/',
    spatialScope: '[data-home-monument]',
    stage: 'home',
  },
  {
    control: '[aria-label="Arc observation modes"] button',
    mainOwner: '[data-cinematic-spatial][data-arc-form]',
    mainOwnerPosition: 'scope',
    route: '/arc',
    spatialScope: '[data-cinematic-spatial][data-arc-form]',
    stage: 'arc',
  },
  {
    control: '[aria-label="Rialo Captain core loop"] button',
    mainOwner:
      '[data-cinematic-spatial][data-rialo-active-signal] > span:first-child',
    mainOwnerPosition: 'direct-first-span',
    route: '/rialo',
    spatialScope: '[data-cinematic-spatial][data-rialo-active-signal]',
    stage: 'rialo',
  },
] as const

async function readProtagonistAnimations(
  page: Page,
  spatialScopeSelector: string,
  mainOwnerSelector: string,
) {
  return page.evaluate(({ mainOwnerSelector, spatialScopeSelector }) => {
    const spatialScopes = document.querySelectorAll(spatialScopeSelector)
    const mainOwners = document.querySelectorAll(mainOwnerSelector)
    const spatialScope = spatialScopes.length === 1 ? spatialScopes[0] : null
    const mainOwner = mainOwners.length === 1 ? mainOwners[0] : null

    if (!(spatialScope instanceof Element) || !(mainOwner instanceof Element)) {
      return {
        all: [],
        mainDirect: [],
        mainOwnerCount: mainOwners.length,
        mainOwnerIsDirectFirstSpan: false,
        mainOwnerIsSpatialScope: false,
        mainOwnerIsWithinSpatialScope: false,
        spatialScopeCount: spatialScopes.length,
      }
    }

    const isInfinite = (animation: Animation) =>
      animation.effect?.getComputedTiming().iterations === Number.POSITIVE_INFINITY
    const describe = (animation: Animation) => {
      const effect = animation.effect
      const timing = effect?.getComputedTiming()
      const keyframes = effect instanceof KeyframeEffect ? effect.getKeyframes() : []
      const metadataKeys = new Set([
        'composite',
        'computedOffset',
        'easing',
        'offset',
      ])
      const properties = [
        ...new Set(
          keyframes.flatMap((keyframe) =>
            Object.keys(keyframe).filter((key) => !metadataKeys.has(key)),
          ),
        ),
      ].sort()
      const target = effect instanceof KeyframeEffect ? effect.target : null

      return {
        delayMs:
          effect instanceof KeyframeEffect ? Number(effect.getTiming().delay) : Number.NaN,
        durationMs: Number(timing?.duration),
        name:
          'animationName' in animation
            ? String(animation.animationName)
            : animation.id,
        properties,
        targetIsMainOwner: target instanceof Element && target === mainOwner,
        targetIsWithinSpatialScope:
          target instanceof Element &&
          (target === spatialScope || spatialScope.contains(target)),
      }
    }
    const mainDirect = mainOwner.getAnimations().filter(isInfinite).map(describe)
    const all = spatialScope
      .getAnimations({ subtree: true })
      .filter(isInfinite)
      .map(describe)

    return {
      all,
      mainDirect,
      mainOwnerCount: mainOwners.length,
      mainOwnerIsDirectFirstSpan:
        mainOwner.parentElement === spatialScope &&
        spatialScope.firstElementChild === mainOwner &&
        mainOwner.localName === 'span',
      mainOwnerIsSpatialScope: mainOwner === spatialScope,
      mainOwnerIsWithinSpatialScope:
        mainOwner === spatialScope || spatialScope.contains(mainOwner),
      spatialScopeCount: spatialScopes.length,
    }
  }, { mainOwnerSelector, spatialScopeSelector })
}

test('real protagonists own one gated 7–10s transform/opacity loop while Canvas stays demand', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 })

  for (const contract of ambientMotionRoutes) {
    await page.goto(contract.route)
    await waitForUniverseReady(page)

    const shell = page.locator('[data-universe-shell]')
    const stage = page.locator(`[data-instrument-stage="${contract.stage}"]`)
    const spatialScope = page.locator(contract.spatialScope)
    const mainOwner = page.locator(contract.mainOwner)
    const control = page.locator(contract.control).first()

    await expect(spatialScope).toHaveCount(1)
    await expect(mainOwner).toHaveCount(1)
    await expect(spatialScope).toHaveAttribute('data-cinematic-spatial', /^(?:|true)$/)
    await expect(stage).toHaveAttribute('data-cinematic-entry', 'settled')
    await expect(shell).toHaveAttribute('data-universe-ready', 'true')
    await expect(shell).toHaveAttribute('data-universe-render-state', 'demand')
    await expect(shell).toHaveAttribute('data-universe-morph-phase', 'idle')
    await expect(shell).toHaveAttribute('data-universe-frameloop', 'demand')
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(1)

    for (const quality of ['high', 'medium'] as const) {
      await shell.evaluate((element, nextQuality) => {
        element.setAttribute('data-universe-quality', nextQuality)
      }, quality)
      await expect(shell).toHaveAttribute('data-universe-quality', quality)
      await expect
        .poll(
          async () =>
            (
              await readProtagonistAnimations(
                page,
                contract.spatialScope,
                contract.mainOwner,
              )
            ).mainDirect.length,
        )
        .toBe(1)

      const animations = await readProtagonistAnimations(
        page,
        contract.spatialScope,
        contract.mainOwner,
      )

      expect(animations.spatialScopeCount).toBe(1)
      expect(animations.mainOwnerCount).toBe(1)
      expect(animations.mainOwnerIsWithinSpatialScope).toBe(true)
      expect(
        contract.mainOwnerPosition === 'scope'
          ? animations.mainOwnerIsSpatialScope
          : animations.mainOwnerIsDirectFirstSpan,
      ).toBe(true)
      expect(
        animations.mainDirect,
        `${contract.stage} ${quality} 必须恰有一个 protagonist 主循环。`,
      ).toHaveLength(1)
      expect(
        animations.all.length,
        `${contract.stage} ${quality} 最多只能增加一个辅助循环。`,
      ).toBeLessThanOrEqual(2)
      expect(animations.all.length).toBeGreaterThanOrEqual(1)

      for (const animation of animations.all) {
        expect(animation.durationMs).toBeGreaterThanOrEqual(7000)
        expect(animation.durationMs).toBeLessThanOrEqual(10000)
        expect(animation.delayMs).toBeLessThan(0)
        expect(animation.targetIsWithinSpatialScope).toBe(true)
        expect(animation.properties.length).toBeGreaterThan(0)
        expect(
          animation.properties.every((property) =>
            ['opacity', 'transform', 'translate'].includes(property),
          ),
          `${contract.stage} ${animation.name} 只能动画 transform/opacity/translate。`,
        ).toBe(true)
      }
      expect(
        animations.all.filter((animation) => animation.targetIsMainOwner),
        `${contract.stage} ${quality} scope 内必须恰有一个 main owner 主循环。`,
      ).toHaveLength(1)
      expect(animations.mainDirect[0].targetIsMainOwner).toBe(true)
      await expect(shell).toHaveAttribute('data-universe-frameloop', 'demand')
    }

    const feedbackDurations = await control.evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(',')
        .map((duration) => Number.parseFloat(duration.trim()) * 1000),
    )

    expect(feedbackDurations.length).toBeGreaterThan(0)
    expect(feedbackDurations.some((duration) => duration > 0)).toBe(true)
    expect(feedbackDurations.every((duration) => duration <= 220)).toBe(true)

    await shell.evaluate((element) => {
      element.setAttribute('data-universe-quality', 'low')
    })
    await expect
      .poll(
        async () =>
          (
            await readProtagonistAnimations(
              page,
              contract.spatialScope,
              contract.mainOwner,
            )
          ).all.length,
      )
      .toBe(0)
    await expect(shell).toHaveAttribute('data-universe-frameloop', 'demand')
  }
})

test('mobile normal motion keeps all real protagonists static and Canvas on demand', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })

  for (const contract of ambientMotionRoutes) {
    await page.goto(contract.route)
    await waitForUniverseReady(page)
    await expect(page.locator(contract.spatialScope)).toHaveCount(1)
    await expect(page.locator(contract.mainOwner)).toHaveCount(1)
    await expect
      .poll(
        async () =>
          (
            await readProtagonistAnimations(
              page,
              contract.spatialScope,
              contract.mainOwner,
            )
          ).all.length,
      )
      .toBe(0)
    await expect(page.locator('[data-universe-shell]')).toHaveAttribute(
      'data-universe-frameloop',
      'demand',
    )
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(1)
  }
})

test('cold non-immersive and unknown routes never mount the universe canvas', async ({ page }) => {
  for (const route of coldRoutes) {
    await page.goto(route)
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
    await expect(page.locator('[data-universe-shell]')).toHaveCount(0)
  }
})

test('reduced motion and saveData stay static without probing WebGL', async ({ browser, baseURL }) => {
  const reduced = await newStaticContext(browser, baseURL, {
    reducedMotion: 'reduce',
  })

  try {
    await reduced.page.goto('/')
    await expect(reduced.page.locator('[data-static-scene="home"]')).toHaveCount(1)
    await expectStaticFallbackIsMechanicalBackdrop(reduced.page, 'home')
    await expect(reduced.page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
    await expectProbeCount(reduced.page, 0)
    await expectNoContinuousInstrumentAnimations(reduced.page, 'reduced motion')
  } finally {
    await closeContext(reduced.context)
  }

  const saveData = await newStaticContext(browser, baseURL, {}, { saveData: true })

  try {
    await saveData.page.goto('/arc')
    await expect(saveData.page.locator('[data-static-scene="arc"]')).toHaveCount(1)
    await expectStaticFallbackIsMechanicalBackdrop(saveData.page, 'arc')
    await expect(saveData.page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
    await expectProbeCount(saveData.page, 0)
    await expectNoContinuousInstrumentAnimations(saveData.page, 'saveData')
  } finally {
    await closeContext(saveData.context)
  }
})

test('WebGL2 unavailable probes once, keeps the off-DOM probe out of page canvas count, and falls back static', async ({
  browser,
  baseURL,
}) => {
  const { context, page } = await newStaticContext(browser, baseURL, {}, { webgl2Unavailable: true })

  try {
    await page.goto('/rialo')
    await expect(page.locator('[data-static-scene="rialo"]')).toHaveCount(1)
    await expectStaticFallbackIsMechanicalBackdrop(page, 'rialo')
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
    await expectProbeCount(page, 1)
    await expectNoContinuousInstrumentAnimations(page, 'WebGL2 unavailable')
  } finally {
    await closeContext(context)
  }
})

test('fallback stays until the first real frame, canvas stays out of tab order, and wheel scroll remains DOM-native', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('[data-static-scene="home"]')).toHaveCount(1)
  await waitForUniverseReady(page)
  await expect(page.locator('[data-static-scene="home"]')).toHaveCount(0)

  await page.locator('body').evaluate((body) => {
    ;(body as HTMLElement).focus()
  })

  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.tagName.toLowerCase())).not.toBe('canvas')
  }

  const hostBox = await page.locator('[data-universe-scene-layer]').boundingBox()

  if (!hostBox) {
    throw new Error('Universe scene host is missing.')
  }

  const beforeScroll = await page.evaluate(() => window.scrollY)
  await page.mouse.move(hostBox.x + hostBox.width / 2, hostBox.y + hostBox.height / 2)
  await page.mouse.wheel(0, 420)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(beforeScroll)
})

test('immersive scene layer has no horizontal overflow and does not extend into the footer', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 900 },
    { width: 375, height: 900 },
    { width: 1440, height: 960 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await waitForUniverseReady(page)

    const hasOverflow = await page.evaluate(() => {
      const documentWidth = document.documentElement.scrollWidth
      const viewportWidth = document.documentElement.clientWidth
      const bodyWidth = document.body.scrollWidth

      return documentWidth > viewportWidth || bodyWidth > viewportWidth
    })
    const sceneBox = await page.locator('[data-universe-scene-layer]').boundingBox()
    const footerBox = await page.locator('footer.site-footer').boundingBox()

    if (!sceneBox || !footerBox) {
      throw new Error('Scene layer or footer box is missing.')
    }

    expect(hasOverflow, `horizontal overflow at ${viewport.width}`).toBe(false)
    expect(sceneBox.y + sceneBox.height).toBeLessThanOrEqual(footerBox.y + 1)
  }
})

test('rapid Header Link and history navigation leaves the persistent canvas on the latest settled scene', async ({ page }) => {
  test.skip(externalProductionServer, 'Development debug contract; production uses the black-box equivalent.')

  const failures = attachRuntimeFailureCollector(page)

  await page.goto('/')
  await waitForUniverseReady(page)

  const firstCanvas = await page.locator('canvas[data-universe-canvas]').elementHandle()
  const initialDebug = await requireUniverseDebug(page)
  const observedTokens = [initialDebug.transitionToken]

  if (!firstCanvas) {
    throw new Error('Initial universe canvas is missing.')
  }

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Arc' }).click()
  await expect(page).toHaveURL(/\/arc$/)
  observedTokens.push(await observeCommittedUniverseTarget(page, 'arc'))
  await expectPersistentCanvas(page, firstCanvas)

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Rialo' }).click()
  await expect(page).toHaveURL(/\/rialo$/)
  observedTokens.push(await observeCommittedUniverseTarget(page, 'rialo'))
  await expectPersistentCanvas(page, firstCanvas)

  await page.getByRole('link', { name: 'Captain Dock home' }).click()
  await expect(page).toHaveURL(/\/$/)
  observedTokens.push(await observeCommittedUniverseTarget(page, 'home'))
  await expectPersistentCanvas(page, firstCanvas)

  await page.goBack()
  await expect(page).toHaveURL(/\/rialo$/)
  observedTokens.push(await observeCommittedUniverseTarget(page, 'rialo'))
  await expectPersistentCanvas(page, firstCanvas)

  await page.goForward()
  await expect(page).toHaveURL(/\/$/)
  observedTokens.push(await observeCommittedUniverseTarget(page, 'home'))
  await expectPersistentCanvas(page, firstCanvas)

  await expectDebugSubset(page, {
    targetScene: 'home',
    transitionPhase: 'idle',
    transitionScene: 'home',
  }, 2000)

  const finalDebug = await requireUniverseDebug(page)
  const finalToken = finalDebug.transitionToken

  expect(finalToken).toBeGreaterThan(initialDebug.transitionToken)
  expect(finalToken).toBe(observedTokens.at(-1))
  expect(finalToken).toBe(Math.max(...observedTokens))
  await expectPersistentCanvas(page, firstCanvas)

  const staleTimerCheck = await page.evaluate(async (token) => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 720)
    })

    return window.__CAPTAIN_DOCK_UNIVERSE_DEBUG__?.transitionToken === token &&
      window.__CAPTAIN_DOCK_UNIVERSE_DEBUG__?.transitionPhase === 'idle' &&
      window.__CAPTAIN_DOCK_UNIVERSE_DEBUG__?.transitionScene === 'home' &&
      window.__CAPTAIN_DOCK_UNIVERSE_DEBUG__?.targetScene === 'home'
  }, finalToken)

  expect(staleTimerCheck).toBe(true)
  failures.expectNoFailures()
})

test('production navigation settles the latest public scene on one canvas without debug or handoff residue', async ({
  page,
}) => {
  test.skip(!externalProductionServer, 'Production black-box contract.')

  const failures = attachRuntimeFailureCollector(page)

  await page.goto('/')
  await waitForUniverseReady(page)
  await expectPublicUniverseRoute(page, 'home')
  await expectProductionDebugAbsent(page)

  const firstCanvas = await page.locator('canvas[data-universe-canvas]').elementHandle()

  if (!firstCanvas) {
    throw new Error('Initial universe canvas is missing.')
  }

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Arc' }).click()
  await expect(page).toHaveURL(/\/arc$/)
  await expectPublicUniverseRoute(page, 'arc')
  await expectPersistentCanvas(page, firstCanvas)

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Rialo' }).click()
  await expect(page).toHaveURL(/\/rialo$/)
  await expectPublicUniverseRoute(page, 'rialo')
  await expectPersistentCanvas(page, firstCanvas)

  await page.getByRole('link', { name: 'Captain Dock home' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expectPublicUniverseRoute(page, 'home')
  await expectPersistentCanvas(page, firstCanvas)

  await page.goBack()
  await expect(page).toHaveURL(/\/rialo$/)
  await expectPublicUniverseRoute(page, 'rialo')
  await expectPersistentCanvas(page, firstCanvas)

  await page.goForward()
  await expect(page).toHaveURL(/\/$/)
  await expectPublicUniverseRoute(page, 'home')
  await expectPersistentCanvas(page, firstCanvas)

  await page.waitForTimeout(sceneTerminalWindowMs)
  await expect(page).toHaveURL(/\/$/)
  await waitForPublicSettledDemand(page, 'home')
  await expectPersistentCanvas(page, firstCanvas)
  await expectCinematicTerminalState(page)
  await expectProductionDebugAbsent(page)
  failures.expectNoFailures()
})

test('context loss prevents both native events and keeps the immersive session in static fallback without retrying WebGL', async ({
  page,
}) => {
  await installUniverseResourceProbe(page.context())
  const failures = attachRuntimeFailureCollector(page)

  await page.goto('/')
  await waitForUniverseReady(page)
  const beforeLoss = await readUniverseResourceSnapshot(page)

  expect(beforeLoss.activeUniverseContextCount).toBeGreaterThan(0)
  expect(beforeLoss.universeContextCreateCount).toBeGreaterThan(0)

  const prevention = await page.locator('canvas[data-universe-canvas]').evaluate((canvas) => {
    const first = new Event('webglcontextlost', { cancelable: true })
    const second = new Event('webglcontextlost', { cancelable: true })

    canvas.dispatchEvent(first)
    canvas.dispatchEvent(second)

    return {
      first: first.defaultPrevented,
      second: second.defaultPrevented,
    }
  })

  expect(prevention).toEqual({ first: true, second: true })
  await expect(page.locator('[data-static-scene="home"]')).toHaveCount(1)
  await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
  await expect.poll(async () => (await readUniverseResourceSnapshot(page)).activeUniverseContextCount, {
    timeout: 1500,
  }).toBe(0)

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Arc' }).click()
  await expect(page).toHaveURL(/\/arc$/)
  await expect(page.locator('[data-static-scene="arc"]')).toHaveCount(1)
  await page.setViewportSize({ width: 960, height: 820 })
  await setUniverseDocumentVisibility(page, 'hidden')
  await restoreUniverseDocumentVisibility(page)

  await expect.poll(async () => page.locator('canvas[data-universe-canvas]').count(), { timeout: 1500 }).toBe(0)
  await expect
    .poll(async () => {
      const snapshot = await readUniverseResourceSnapshot(page)

      return {
        activeUniverseContextCount: snapshot.activeUniverseContextCount,
        universeContextCreateCount: snapshot.universeContextCreateCount,
      }
    }, { timeout: 1500 })
    .toEqual({
      activeUniverseContextCount: 0,
      universeContextCreateCount: beforeLoss.universeContextCreateCount,
    })
  failures.expectNoFailures()
})

test('settled, offscreen, and hidden states stop frames and resume with only the needed invalidation', async ({ page }) => {
  test.skip(externalProductionServer, 'Development frame contract; production uses the black-box equivalent.')

  await installUniverseResourceProbe(page.context())
  const failures = attachRuntimeFailureCollector(page)

  await page.goto('/')
  await waitForUniverseReady(page)
  await waitForSettledDemand(page)
  await expectFramesStable(page)

  await establishSceneOutsideViewport(page)
  await expectDebugSubset(page, {
    frameloop: 'never',
    hostVisible: false,
    runtimePhase: 'paused',
  })
  const offscreenFrame = (await requireUniverseDebug(page)).frameCount
  await expectFramesStable(page)
  await expectNoContinuousInstrumentAnimations(page, 'offscreen')

  await page.evaluate(() => window.scrollTo({ top: 0 }))
  await expectDebugSubset(page, {
    frameloop: 'demand',
    hostVisible: true,
    runtimePhase: 'ready',
    settled: true,
  })
  await expect.poll(async () => (await requireUniverseDebug(page)).frameCount, { timeout: 1500 }).toBeGreaterThan(
    offscreenFrame,
  )
  await expectFramesStable(page)

  await setUniverseDocumentVisibility(page, 'hidden')
  await expectDebugSubset(page, {
    documentVisible: false,
    frameloop: 'never',
    runtimePhase: 'paused',
  })
  const hiddenFrame = (await requireUniverseDebug(page)).frameCount
  await expectFramesStable(page)
  await expectNoContinuousInstrumentAnimations(page, 'hidden')

  await restoreUniverseDocumentVisibility(page)
  await expectDebugSubset(page, {
    documentVisible: true,
    frameloop: 'demand',
    runtimePhase: 'ready',
    settled: true,
  })
  await expect.poll(async () => (await requireUniverseDebug(page)).frameCount, { timeout: 1500 }).toBeGreaterThan(
    hiddenFrame,
  )
  await expectFramesStable(page)
  failures.expectNoFailures()
})

test('production public lifecycle pauses offscreen and hidden scenes and resumes without debug', async ({
  page,
}) => {
  test.skip(!externalProductionServer, 'Production black-box contract.')

  await installUniverseResourceProbe(page.context())
  const failures = attachRuntimeFailureCollector(page)
  const shell = page.locator('[data-universe-shell]')

  await page.goto('/')
  await waitForUniverseReady(page)
  await waitForPublicSettledDemand(page, 'home')
  await expectProductionDebugAbsent(page)

  await establishSceneOutsideViewport(page)
  await expect(shell).toHaveAttribute('data-universe-ready', 'true')
  await expect(shell).toHaveAttribute('data-universe-frameloop', 'never')
  await expect(shell).toHaveAttribute('data-universe-render-state', 'paused')
  await expect(shell).toHaveAttribute('data-universe-settled', 'true')
  await expectNoPendingAnimationFrames(page)
  await expectNoContinuousInstrumentAnimations(page, 'production offscreen')

  await page.evaluate(() => window.scrollTo({ top: 0 }))
  await waitForPublicSettledDemand(page, 'home')

  await setUniverseDocumentVisibility(page, 'hidden')
  await expect(shell).toHaveAttribute('data-universe-ready', 'true')
  await expect(shell).toHaveAttribute('data-universe-frameloop', 'never')
  await expect(shell).toHaveAttribute('data-universe-render-state', 'paused')
  await expect(shell).toHaveAttribute('data-universe-settled', 'true')
  await expectNoPendingAnimationFrames(page)
  await expectNoContinuousInstrumentAnimations(page, 'production hidden')

  await restoreUniverseDocumentVisibility(page)
  await waitForPublicSettledDemand(page, 'home')
  await expectProductionDebugAbsent(page)
  failures.expectNoFailures()
})

test('three About to Home cycles release universe listeners, observers, RAF, and connected WebGL context to baseline', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: {
      width: 1440,
      height: 960,
    },
  })

  await installUniverseResourceProbe(context)
  const page = await context.newPage()
  const failures = attachRuntimeFailureCollector(page)

  try {
    await page.goto('/about')
    await expect(page.locator('[data-universe-shell]')).toHaveCount(0)
    await expect(page.locator('[data-universe-content]')).toHaveCount(0)
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
    await expect.poll(async () => (await readUniverseResourceSnapshot(page)).pendingAnimationFrameCount).toBe(0)
    const coldBaseline = await readUniverseResourceSnapshot(page)

    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Home' }).click()
    await expect(page).toHaveURL(/\/$/)
    await waitForUniverseReady(page)
    const coldMounted = await readUniverseResourceSnapshot(page)

    expect(coldMounted.realmToken).toBe(coldBaseline.realmToken)
    expect(coldMounted.listenerCount).toBeGreaterThan(coldBaseline.listenerCount)
    expect(coldMounted.intersectionObserverCount).toBeGreaterThan(coldBaseline.intersectionObserverCount)
    expect(coldMounted.activeUniverseContextCount).toBeGreaterThan(coldBaseline.activeUniverseContextCount)
    expect(coldMounted.universeContextCreateCount).toBeGreaterThan(coldBaseline.universeContextCreateCount)

    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'About' }).click()
    await expect(page).toHaveURL(/\/about$/)
    await expect(page.locator('[data-universe-shell]')).toHaveCount(0)
    await expect(page.locator('[data-universe-content]')).toHaveCount(0)
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
    await expect.poll(async () => (await readUniverseResourceSnapshot(page)).pendingAnimationFrameCount).toBe(0)
    await expect
      .poll(async () => (await readUniverseResourceSnapshot(page)).activeUniverseContextCount, { timeout: 1500 })
      .toBe(coldBaseline.activeUniverseContextCount)
    const warmedBaseline = await readUniverseResourceSnapshot(page)

    expect(warmedBaseline.realmToken).toBe(coldBaseline.realmToken)
    expect(warmedBaseline.activeUniverseContextCount).toBe(coldBaseline.activeUniverseContextCount)
    expect(warmedBaseline.intersectionObserverCount).toBe(coldBaseline.intersectionObserverCount)
    expect(warmedBaseline.pendingAnimationFrameCount).toBe(coldBaseline.pendingAnimationFrameCount)
    expect(warmedBaseline.listenerCount).toBeGreaterThanOrEqual(coldBaseline.listenerCount)

    for (let round = 0; round < 3; round += 1) {
      await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Home' }).click()
      await expect(page).toHaveURL(/\/$/)
      await waitForUniverseReady(page)
      const mounted = await readUniverseResourceSnapshot(page)

      expect(mounted.realmToken).toBe(warmedBaseline.realmToken)
      expect(mounted.listenerCount).toBeGreaterThan(warmedBaseline.listenerCount)
      expect(mounted.intersectionObserverCount).toBeGreaterThan(warmedBaseline.intersectionObserverCount)
      expect(mounted.activeUniverseContextCount).toBeGreaterThan(warmedBaseline.activeUniverseContextCount)
      expect(mounted.universeContextCreateCount).toBeGreaterThan(warmedBaseline.universeContextCreateCount)

      await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'About' }).click()
      await expect(page).toHaveURL(/\/about$/)
      await expect(page.locator('[data-universe-shell]')).toHaveCount(0)
      await expect(page.locator('[data-universe-content]')).toHaveCount(0)
      await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
      await expectUniverseResourcesAtBaseline(page, warmedBaseline)
    }

    failures.expectNoFailures()
  } finally {
    await closeContext(context)
  }
})

test('cold and static contexts do not request the enhanced-only sentinel scripts discovered from an enhanced route', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: {
      width: 1440,
      height: 960,
    },
  })
  const page = await context.newPage()
  const failures = attachRuntimeFailureCollector(page)
  const sentinelScripts = new Set<string>()

  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script' || response.status() >= 400) {
      return
    }

    const body = await response.text().catch(() => '')

    if (body.includes('CAPTAIN_DOCK_UNIVERSE_CANVAS_V1')) {
      sentinelScripts.add(response.url())
    }
  })

  try {
    await page.goto('/')
    await waitForUniverseReady(page)
    await page.waitForLoadState('networkidle')
    await expect.poll(() => sentinelScripts.size, { timeout: 3000 }).toBeGreaterThan(0)
    failures.expectNoFailures()
  } finally {
    await closeContext(context)
  }

  const coldRoutesWithoutEnhancedScripts = [
    '/about',
    '/arc/signal-ledger',
    '/arc/hadron',
    '/arc/arcpredict',
    '/rialo/rialo-captain',
  ] as const
  const staticContexts = [
    await collectScriptRequestsForRoute(browser, baseURL, '/', { reducedMotion: 'reduce' }),
    await collectScriptRequestsForRoute(browser, baseURL, '/arc', {}, { saveData: true }),
    await collectScriptRequestsForRoute(
      browser,
      baseURL,
      '/rialo',
      {},
      { webgl2Unavailable: true },
    ),
  ]

  for (const route of coldRoutesWithoutEnhancedScripts) {
    staticContexts.push(await collectScriptRequestsForRoute(browser, baseURL, route))
  }

  for (const requests of staticContexts) {
    expect([...requests].filter((url) => sentinelScripts.has(url))).toEqual([])
  }
})

test('development debug budgets stay within High and Medium runtime ceilings', async ({ browser, baseURL, page }) => {
  test.skip(externalProductionServer, 'Development GPU metrics contract; production black-box gates run above.')

  const highFailures = attachRuntimeFailureCollector(page)

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  await waitForUniverseReady(page)

  const high = await requireUniverseDebug(page)

  expect(high.quality).toBe('high')
  expect(high.dpr).toBeLessThanOrEqual(1.5)
  expect(high.calls).toBeLessThanOrEqual(70)
  expect(high.triangles).toBeLessThanOrEqual(120000)
  highFailures.expectNoFailures()

  const context = await browser.newContext({
    baseURL,
    viewport: {
      width: 375,
      height: 900,
    },
  })
  const mediumPage = await context.newPage()
  const mediumFailures = attachRuntimeFailureCollector(mediumPage)

  try {
    await mediumPage.goto('/arc')
    await waitForUniverseReady(mediumPage)

    const medium = await requireUniverseDebug(mediumPage)

    expect(medium.quality).toBe('medium')
    expect(medium.dpr).toBeLessThanOrEqual(1.25)
    expect(medium.calls).toBeLessThanOrEqual(40)
    expect(medium.triangles).toBeLessThanOrEqual(50000)
    mediumFailures.expectNoFailures()
  } finally {
    await closeContext(context)
  }
})
