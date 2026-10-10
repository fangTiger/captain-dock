import { expect, test } from '@playwright/test'
import type { Locator, Page, TestInfo } from '@playwright/test'
import { createHash } from 'node:crypto'

import {
  CINEMATIC_MAXIMUM_LATENESS_MS,
  createCinematicScreencastSelector,
  planCinematicScreencastCollection,
  requireCinematicEnhancedQuality,
  requireCinematicHomeOpeningStartupSequence,
  requireCinematicPageSpatialSignature,
  type CinematicScreencastSelection,
  type CinematicBrowserFacts,
  type SelectedCinematicEventBoundaryFrame,
  type SelectedCinematicEventFactsAnchor,
  type CinematicScreencastPayload,
  type SelectedCinematicScreencastFrame,
} from '../../src/test-support/cinematic-screencast-selector'

test.use({ channel: 'chromium' })

const morphTerminalMs = 950
const entryTerminalMs = 1500
const maximumCaptureLatenessMs = CINEMATIC_MAXIMUM_LATENESS_MS
const screencastWarmupTimeoutMs = 3000
const mobileProjectEntries = [
  { name: 'SIGNAL/LEDGER', route: '/arc/signal-ledger', target: 'project:signal-ledger' },
  { name: 'HADRON', route: '/arc/hadron', target: 'project:hadron' },
  { name: 'ArcPredict', route: '/arc/arcpredict', target: 'project:arcpredict' },
  { name: 'Rialo Captain', route: '/rialo/rialo-captain', target: 'project:rialo-captain' },
] as const
const mobileEcosystemEntries = [
  { name: 'Arc', route: '/arc' },
  { name: 'Rialo', route: '/rialo' },
] as const

type MotionEvent = Readonly<{
  absoluteTime: number
  attribute: string
  path: string
  token: string | null
  value: string
}>

type SpatialSignature = Readonly<{
  bins: number[]
  centroidX: number
  centroidY: number
  edgeCount: number
}>

type FrameFacts = Readonly<{
  activeProject: string | null
  canvasCount: number
  canvasRect: Readonly<{ height: number; width: number; x: number; y: number }> | null
  carrierAreaRatio: number | null
  carrierCount: number
  carrierDirection: string | null
  carrierHostPointerEventsNone: boolean | null
  carrierHostPositionFixed: boolean | null
  carrierHostTransparent: boolean | null
  carrierMassX: number | null
  carrierPartsCount: number
  carrierProgress: string | null
  carrierRootCoversViewport: boolean | null
  carrierRootRect: Readonly<{
    bottom: number
    height: number
    left: number
    right: number
    top: number
    width: number
    x: number
    y: number
  }> | null
  carrierSignalX: number | null
  carrierTarget: string | null
  carrierToken: string | null
  carrierTrackX: number | null
  caseArrival: string | null
  caseArrivalProgress: string | null
  entryPhase: string | null
  entryProgress: string | null
  frameloop: string | null
  morphPhase: string | null
  morphProgress: string | null
  navigationPhase: string | null
  navigationProgress: string | null
  navigationToken: string | null
  path: string
  quality: string | null
  ready: string | null
  renderState: string | null
  rialoEvent: string | null
  rialoEventPhase: string | null
  rialoEventProgress: string | null
  scene: string | null
  settled: string | null
  stageOwner: string | null
  target: string | null
}>

type CapturedFrame = Readonly<{
  artifactName: string
  captureOffsetMs: number | null
  captureFinishedAt: number
  captureStartedAt: number
  facts: FrameFacts
  factsBefore: FrameFacts | null
  imageScale: number
  latenessMs: number | null
  pageSignature: SpatialSignature
  plannedCheckpointMs: number | null
  pngSha256: string
  screencast: ScreencastFrameEvidence | null
  signature: SpatialSignature | null
}>

type RawCapturedFrame = Readonly<{
  artifactName: string
  captureOffsetMs: number | null
  captureFinishedAt: number
  captureStartedAt: number
  facts: FrameFacts
  factsBefore: FrameFacts | null
  imageScale: number
  latenessMs: number | null
  pagePng: Buffer
  plannedCheckpointMs: number | null
  screencast: ScreencastFrameEvidence | null
}>

type ScreencastFrameEvidence = Readonly<{
  factsCapturedAtMs: number
  factsFrameAbsoluteSkewMs: number
  factsFrameSignedSkewMs: number
  factsVersion: number
  frameSwapAtMs: number
  metadataScrollOffsetX: number
  metadataScrollOffsetY: number
  metadataTimestampSeconds: number
  origin: string
  pngSha256: string
  selectionKind: 'fixed-checkpoint'
  sessionId: number
  timeOriginMs: number
  visualViewport: Readonly<{
    height: number
    pageX: number
    pageY: number
    scale: number
    width: number
  }>
}>

type CapturedEventBoundary = Readonly<{
  artifactName: string
  captureOffsetMs: number
  captureFinishedAt: number
  captureStartedAt: number
  imageScale: 0.5
  latenessMs: null
  pageSignature: SpatialSignature
  plannedCheckpointMs: null
  pngSha256: string
  screencast: Readonly<{
    frameSwapAtMs: number
    metadataTimestampSeconds: number
    pngSha256: string
    previousFrameSwapAtMs: number | null
    selectionKind: 'event-boundary'
    sessionId: number
    viewport: Readonly<{
      deviceHeight: number
      deviceWidth: number
      pageScaleFactor: number
      scrollOffsetX: number
      scrollOffsetY: number
    }>
  }>
}>

type CapturedEventFactsAnchor =
  SelectedCinematicEventFactsAnchor<FrameFacts>

type StableControlViewport = Readonly<{
  scrollX: number
  scrollY: number
  visualViewport: Readonly<{
    height: number
    pageX: number
    pageY: number
    scale: number
    width: number
  }>
}>

function collectRuntimeFailures(page: Page) {
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
    failures.push(
      `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`,
    )
  })

  return failures
}

async function installMotionEventRecorder(page: Page) {
  await page.addInitScript(() => {
    const storageKey = '__captain_dock_motion_events'
    const observedAttributes = [
      'data-cinematic-entry',
      'data-universe-morph-phase',
      'data-universe-render-state',
      'data-cinematic-navigation-phase',
      'data-case-arrival',
      'data-active-project',
      'data-rialo-event',
      'data-rialo-event-phase',
      'data-cinematic-navigation-token',
    ]
    const readPersistedEvents = () => {
      try {
        return JSON.parse(sessionStorage.getItem(storageKey) ?? '[]') as MotionEvent[]
      } catch {
        return [] as MotionEvent[]
      }
    }
    const motionWindow = window as Window & {
      __CAPTAIN_DOCK_MOTION_EVENTS__?: MotionEvent[]
    }
    const events = readPersistedEvents()
    const persist = () => {
      sessionStorage.setItem(storageKey, JSON.stringify(events.slice(-240)))
    }
    const record = (element: Element, attribute: string) => {
      const value = element.getAttribute(attribute)

      if (value === null) {
        return
      }

      const event = {
        absoluteTime: performance.timeOrigin + performance.now(),
        attribute,
        path: location.pathname,
        token:
          element.getAttribute('data-cinematic-navigation-token') ??
          element.closest('[data-cinematic-navigation-token]')?.getAttribute(
            'data-cinematic-navigation-token',
          ) ??
          document
            .querySelector('[data-cinematic-navigation-token]')
            ?.getAttribute('data-cinematic-navigation-token') ??
          null,
        value,
      }
      const previous = events.at(-1)

      if (
        previous?.attribute === event.attribute &&
        previous.path === event.path &&
        previous.token === event.token &&
        previous.value === event.value
      ) {
        return
      }

      events.push(event)
      persist()
    }
    const scan = (node: Node) => {
      if (!(node instanceof Element)) {
        return
      }

      for (const attribute of observedAttributes) {
        if (node.hasAttribute(attribute)) {
          record(node, attribute)
        }
        for (const descendant of node.querySelectorAll(`[${attribute}]`)) {
          record(descendant, attribute)
        }
      }
    }
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          record(mutation.target, mutation.attributeName ?? '')
        }
        for (const node of mutation.addedNodes) {
          scan(node)
        }
      }
    })

    motionWindow.__CAPTAIN_DOCK_MOTION_EVENTS__ = events
    observer.observe(document, {
      attributeFilter: observedAttributes,
      attributes: true,
      childList: true,
      subtree: true,
    })
  })
}

function readHandoffDuration(
  events: readonly MotionEvent[],
  endAttribute: string,
  endValue: string,
  afterAbsoluteTime: number,
) {
  const start = events.find(
    (event) =>
      event.absoluteTime >= afterAbsoluteTime &&
      event.attribute === 'data-cinematic-navigation-phase' &&
      event.value === 'departing',
  )
  const end = start
    ? events.find(
        (event) =>
          event.absoluteTime >= start.absoluteTime &&
          event.attribute === endAttribute &&
          event.value === endValue &&
          event.token !== null &&
          event.token === start.token,
      )
    : undefined

  return start && end
    ? {
        duration: end.absoluteTime - start.absoluteTime,
        endToken: end.token,
        startToken: start.token,
      }
    : null
}

async function readMotionEvents(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window & {
          __CAPTAIN_DOCK_MOTION_EVENTS__?: MotionEvent[]
        }
      ).__CAPTAIN_DOCK_MOTION_EVENTS__ ?? [],
  )
}

async function waitForMotionEvent(
  page: Page,
  eventCursor: number,
  attribute: string,
  value: string,
  label: string,
) {
  await expect
    .poll(
      async () =>
        (await readMotionEvents(page))
          .slice(eventCursor)
          .findIndex((event) => event.attribute === attribute && event.value === value),
      {
        message: `${label} 必须由 MutationObserver 记录真实浏览器事件锚。`,
        timeout: 5000,
      },
    )
    .toBeGreaterThanOrEqual(0)

  const event = (await readMotionEvents(page))
    .slice(eventCursor)
    .find((candidate) => candidate.attribute === attribute && candidate.value === value)

  expect(event, `${label} 必须保留对应 MutationEvent。`).toBeDefined()

  return event as MotionEvent
}

function readDurationBetween(
  events: readonly MotionEvent[],
  attribute: string,
  startValue: string,
  endValue: string,
  afterAbsoluteTime = 0,
) {
  const start = events.find(
    (event) =>
      event.absoluteTime >= afterAbsoluteTime &&
      event.attribute === attribute &&
      event.value === startValue,
  )
  const end = start
    ? events.find(
        (event) =>
          event.absoluteTime >= start.absoluteTime &&
          event.attribute === attribute &&
          event.value === endValue,
      )
    : undefined

  return start && end ? end.absoluteTime - start.absoluteTime : null
}

function expectDurationWithin(
  duration: number | null,
  minimum: number,
  maximum: number,
  label: string,
) {
  expect(duration, `${label} 必须由浏览器 performance.now 事件计算。`).not.toBeNull()
  expect(duration ?? -1).toBeGreaterThanOrEqual(minimum)
  expect(duration ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(maximum)
}

async function readBrowserTime(page: Page) {
  return page.evaluate(() => performance.timeOrigin + performance.now())
}

async function stabilizeControlViewport(
  control: Locator,
  label: string,
): Promise<StableControlViewport> {
  await expect(control, `${label} 控件必须唯一存在后才能稳定 viewport。`).toHaveCount(1)
  await control.scrollIntoViewIfNeeded()

  return control.evaluate(async (element) => {
    const readSnapshot = () => {
      const visualViewport = window.visualViewport

      if (!visualViewport) {
        throw new Error('浏览器缺少 visualViewport，无法证明控件滚动稳定。')
      }

      const rect = element.getBoundingClientRect()

      return {
        controlLeft: rect.left,
        controlTop: rect.top,
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
        return {
          scrollX: current.scrollX,
          scrollY: current.scrollY,
          visualViewport: current.visualViewport,
        }
      }
      previous = current
    }

    throw new Error('控件 scroll/visual viewport 在 60 个 rAF 内未连续稳定两帧。')
  })
}

async function readFrameFacts(page: Page): Promise<FrameFacts> {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-universe-shell]')
    const stage = document.querySelector('[data-instrument-stage]')
    const caseArrival = document.querySelector('[data-case-arrival]')
    const canvasElements = document.querySelectorAll('canvas[data-universe-canvas]')
    const canvas = canvasElements.length === 1 ? canvasElements[0] : null
    const canvasBox = canvas?.getBoundingClientRect()
    const carriers = document.querySelectorAll<HTMLElement>(
      '[data-cinematic-handoff-signal]',
    )
    const carrier = carriers.length === 1 ? carriers[0] : null
    const carrierStyle = carrier ? getComputedStyle(carrier) : null
    const carrierBox = carrier?.getBoundingClientRect()
    const carrierTrack = carrier?.querySelector<HTMLElement>(
      '[data-cinematic-carrier-track]',
    )
    const carrierMass = carrier?.querySelector<HTMLElement>(
      '[data-cinematic-carrier-mass]',
    )
    const carrierSignal = carrier?.querySelector<HTMLElement>(
      '[data-cinematic-carrier-signal]',
    )
    const carrierParts = [carrierTrack, carrierMass, carrierSignal].filter(
      (part): part is HTMLElement => part !== null && part !== undefined,
    )
    const viewportArea = window.innerWidth * window.innerHeight
    const carrierRootRect = carrierBox
      ? {
          bottom: carrierBox.bottom,
          height: carrierBox.height,
          left: carrierBox.left,
          right: carrierBox.right,
          top: carrierBox.top,
          width: carrierBox.width,
          x: carrierBox.x,
          y: carrierBox.y,
        }
      : null
    const carrierArea = carrierParts.reduce((total, part) => {
      const rect = part.getBoundingClientRect()

      return total + Math.max(0, rect.width) * Math.max(0, rect.height)
    }, 0)

    return {
      activeProject: stage?.getAttribute('data-active-project') ?? null,
      canvasCount: canvasElements.length,
      canvasRect: canvasBox
        ? {
            height: canvasBox.height,
            width: canvasBox.width,
            x: canvasBox.x,
            y: canvasBox.y,
          }
        : null,
      carrierAreaRatio:
        carrier && viewportArea > 0 ? carrierArea / viewportArea : null,
      carrierCount: carriers.length,
      carrierDirection:
        carrier?.getAttribute('data-cinematic-carrier-direction') ?? null,
      carrierHostPointerEventsNone: carrierStyle
        ? carrierStyle.pointerEvents === 'none'
        : null,
      carrierHostPositionFixed: carrierStyle
        ? carrierStyle.position === 'fixed'
        : null,
      carrierHostTransparent: carrierStyle
        ? (carrierStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ||
            carrierStyle.backgroundColor === 'transparent') &&
          carrierStyle.backgroundImage === 'none'
        : null,
      carrierMassX: carrierMass?.getBoundingClientRect().x ?? null,
      carrierPartsCount: carrierParts.length,
      carrierProgress:
        carrier?.getAttribute('data-cinematic-handoff-progress') ?? null,
      carrierRootCoversViewport: carrierRootRect
        ? Math.abs(carrierRootRect.left) <= 1 &&
          Math.abs(carrierRootRect.top) <= 1 &&
          Math.abs(carrierRootRect.right - window.innerWidth) <= 1 &&
          Math.abs(carrierRootRect.bottom - window.innerHeight) <= 1
        : null,
      carrierRootRect,
      carrierSignalX: carrierSignal?.getBoundingClientRect().x ?? null,
      carrierTarget:
        carrier?.getAttribute('data-cinematic-handoff-target') ?? null,
      carrierToken:
        carrier?.getAttribute('data-cinematic-handoff-token') ?? null,
      carrierTrackX: carrierTrack?.getBoundingClientRect().x ?? null,
      caseArrival: caseArrival?.getAttribute('data-case-arrival') ?? null,
      caseArrivalProgress: caseArrival?.getAttribute('data-case-arrival-progress') ?? null,
      entryPhase: stage?.getAttribute('data-cinematic-entry') ?? null,
      entryProgress: stage?.getAttribute('data-cinematic-entry-progress') ?? null,
      frameloop: shell?.getAttribute('data-universe-frameloop') ?? null,
      morphPhase: shell?.getAttribute('data-universe-morph-phase') ?? null,
      morphProgress: shell?.getAttribute('data-universe-morph-progress') ?? null,
      navigationPhase:
        document
          .querySelector('[data-cinematic-navigation-phase]')
          ?.getAttribute('data-cinematic-navigation-phase') ?? null,
      navigationProgress:
        document
          .querySelector('[data-cinematic-navigation-progress]')
          ?.getAttribute('data-cinematic-navigation-progress') ?? null,
      navigationToken:
        document
          .querySelector('[data-cinematic-navigation-token]')
          ?.getAttribute('data-cinematic-navigation-token') ?? null,
      path: location.pathname,
      quality: shell?.getAttribute('data-universe-quality') ?? null,
      ready: shell?.getAttribute('data-universe-ready') ?? null,
      renderState: shell?.getAttribute('data-universe-render-state') ?? null,
      rialoEvent: stage?.getAttribute('data-rialo-event') ?? null,
      rialoEventPhase: stage?.getAttribute('data-rialo-event-phase') ?? null,
      rialoEventProgress: stage?.getAttribute('data-rialo-event-progress') ?? null,
      scene: shell?.getAttribute('data-universe-scene') ?? null,
      settled: shell?.getAttribute('data-universe-settled') ?? null,
      stageOwner: stage?.getAttribute('data-instrument-stage') ?? null,
      target: shell?.getAttribute('data-universe-target') ?? null,
    }
  })
}

type BrowserFactsRecorderRuntime = Readonly<{
  cleanup: () => void
  order: number
  recorderId: string
  sample: () => void
  timeline: CinematicBrowserFacts<FrameFacts>[]
}>

function installBrowserFactsRecorder({
  order,
  recorderId,
}: Readonly<{
  order: number
  recorderId: string
}>) {
  const runtimeWindow = window as Window & {
    __CAPTAIN_DOCK_SCREENCAST_FACTS__?: BrowserFactsRecorderRuntime
  }
  const current = runtimeWindow.__CAPTAIN_DOCK_SCREENCAST_FACTS__

  if (current && current.order > order) {
    return
  }
  current?.cleanup()

  const storageKey = `__captain_dock_screencast_facts_${recorderId}`
  const closedKey = `${storageKey}_closed`

  try {
    if (sessionStorage.getItem(closedKey) === 'true') {
      return
    }
  } catch {
    // about:blank 等无 storage origin 的文档继续内存采样；导航后重新建立同源时间线。
  }

  let timeline: CinematicBrowserFacts<FrameFacts>[] = []

  try {
    const stored = sessionStorage.getItem(storageKey)

    if (stored) {
      timeline = JSON.parse(stored) as CinematicBrowserFacts<FrameFacts>[]
    }
  } catch {
    timeline = []
  }

  let version = timeline.at(-1)?.version ?? 0
  let animationFrame = 0
  let active = true
  const persist = () => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(timeline.slice(-360)))
    } catch {
      // 最终由 Node 侧 facts/overflow 门禁 fail-closed；浏览器采样热路径不抛异常。
    }
  }
  const sample = () => {
    if (!active) {
      return
    }

    const visualViewport = window.visualViewport

    if (!visualViewport) {
      return
    }

    const capturedAtMs = performance.timeOrigin + performance.now()
    const previous = timeline.at(-1)

    if (previous && capturedAtMs <= previous.capturedAtMs) {
      return
    }

    const shell = document.querySelector('[data-universe-shell]')
    const stage = document.querySelector('[data-instrument-stage]')
    const caseArrival = document.querySelector('[data-case-arrival]')
    const canvasElements = document.querySelectorAll('canvas[data-universe-canvas]')
    const canvas = canvasElements.length === 1 ? canvasElements[0] : null
    const canvasBox = canvas?.getBoundingClientRect()
    const carriers = document.querySelectorAll<HTMLElement>(
      '[data-cinematic-handoff-signal]',
    )
    const carrier = carriers.length === 1 ? carriers[0] : null
    const carrierStyle = carrier ? getComputedStyle(carrier) : null
    const carrierBox = carrier?.getBoundingClientRect()
    const carrierTrack = carrier?.querySelector<HTMLElement>(
      '[data-cinematic-carrier-track]',
    )
    const carrierMass = carrier?.querySelector<HTMLElement>(
      '[data-cinematic-carrier-mass]',
    )
    const carrierSignal = carrier?.querySelector<HTMLElement>(
      '[data-cinematic-carrier-signal]',
    )
    const carrierParts = [carrierTrack, carrierMass, carrierSignal].filter(
      (part): part is HTMLElement => part !== null && part !== undefined,
    )
    const viewportArea = window.innerWidth * window.innerHeight
    const carrierRootRect = carrierBox
      ? {
          bottom: carrierBox.bottom,
          height: carrierBox.height,
          left: carrierBox.left,
          right: carrierBox.right,
          top: carrierBox.top,
          width: carrierBox.width,
          x: carrierBox.x,
          y: carrierBox.y,
        }
      : null
    const carrierArea = carrierParts.reduce((total, part) => {
      const rect = part.getBoundingClientRect()

      return total + Math.max(0, rect.width) * Math.max(0, rect.height)
    }, 0)

    version += 1
    timeline.push({
      capturedAtMs,
      facts: {
        activeProject: stage?.getAttribute('data-active-project') ?? null,
        canvasCount: canvasElements.length,
        canvasRect: canvasBox
          ? {
              height: canvasBox.height,
              width: canvasBox.width,
              x: canvasBox.x,
              y: canvasBox.y,
          }
        : null,
        carrierAreaRatio:
          carrier && viewportArea > 0 ? carrierArea / viewportArea : null,
        carrierCount: carriers.length,
        carrierDirection:
          carrier?.getAttribute('data-cinematic-carrier-direction') ?? null,
        carrierHostPointerEventsNone: carrierStyle
          ? carrierStyle.pointerEvents === 'none'
          : null,
        carrierHostPositionFixed: carrierStyle
          ? carrierStyle.position === 'fixed'
          : null,
        carrierHostTransparent: carrierStyle
          ? (carrierStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ||
              carrierStyle.backgroundColor === 'transparent') &&
            carrierStyle.backgroundImage === 'none'
          : null,
        carrierMassX: carrierMass?.getBoundingClientRect().x ?? null,
        carrierPartsCount: carrierParts.length,
        carrierProgress:
          carrier?.getAttribute('data-cinematic-handoff-progress') ?? null,
        carrierRootCoversViewport: carrierRootRect
          ? Math.abs(carrierRootRect.left) <= 1 &&
            Math.abs(carrierRootRect.top) <= 1 &&
            Math.abs(carrierRootRect.right - window.innerWidth) <= 1 &&
            Math.abs(carrierRootRect.bottom - window.innerHeight) <= 1
          : null,
        carrierRootRect,
        carrierSignalX: carrierSignal?.getBoundingClientRect().x ?? null,
        carrierTarget:
          carrier?.getAttribute('data-cinematic-handoff-target') ?? null,
        carrierToken:
          carrier?.getAttribute('data-cinematic-handoff-token') ?? null,
        carrierTrackX: carrierTrack?.getBoundingClientRect().x ?? null,
        caseArrival: caseArrival?.getAttribute('data-case-arrival') ?? null,
        caseArrivalProgress:
          caseArrival?.getAttribute('data-case-arrival-progress') ?? null,
        entryPhase: stage?.getAttribute('data-cinematic-entry') ?? null,
        entryProgress: stage?.getAttribute('data-cinematic-entry-progress') ?? null,
        frameloop: shell?.getAttribute('data-universe-frameloop') ?? null,
        morphPhase: shell?.getAttribute('data-universe-morph-phase') ?? null,
        morphProgress: shell?.getAttribute('data-universe-morph-progress') ?? null,
        navigationPhase:
          document
            .querySelector('[data-cinematic-navigation-phase]')
            ?.getAttribute('data-cinematic-navigation-phase') ?? null,
        navigationProgress:
          document
            .querySelector('[data-cinematic-navigation-progress]')
            ?.getAttribute('data-cinematic-navigation-progress') ?? null,
        navigationToken:
          document
            .querySelector('[data-cinematic-navigation-token]')
            ?.getAttribute('data-cinematic-navigation-token') ?? null,
        path: location.pathname,
        quality: shell?.getAttribute('data-universe-quality') ?? null,
        ready: shell?.getAttribute('data-universe-ready') ?? null,
        renderState: shell?.getAttribute('data-universe-render-state') ?? null,
        rialoEvent: stage?.getAttribute('data-rialo-event') ?? null,
        rialoEventPhase: stage?.getAttribute('data-rialo-event-phase') ?? null,
        rialoEventProgress:
          stage?.getAttribute('data-rialo-event-progress') ?? null,
        scene: shell?.getAttribute('data-universe-scene') ?? null,
        settled: shell?.getAttribute('data-universe-settled') ?? null,
        stageOwner: stage?.getAttribute('data-instrument-stage') ?? null,
        target: shell?.getAttribute('data-universe-target') ?? null,
      },
      origin: location.origin,
      timeOriginMs: performance.timeOrigin,
      version,
      visualViewport: {
        height: visualViewport.height,
        pageX: visualViewport.pageLeft,
        pageY: visualViewport.pageTop,
        scale: visualViewport.scale,
        width: visualViewport.width,
      },
    })
    if (timeline.length > 360) {
      timeline.splice(0, timeline.length - 360)
    }
    if (version % 12 === 0) {
      persist()
    }
  }
  const observer = new MutationObserver(sample)
  const onViewportChange = () => sample()
  const onPageHide = () => persist()
  const sampleAnimationFrame = () => {
    sample()
    animationFrame = requestAnimationFrame(sampleAnimationFrame)
  }
  const cleanup = () => {
    if (!active) {
      return
    }

    sample()
    active = false
    observer.disconnect()
    cancelAnimationFrame(animationFrame)
    window.removeEventListener('resize', onViewportChange)
    window.removeEventListener('scroll', onViewportChange, true)
    window.removeEventListener('pagehide', onPageHide)
    window.visualViewport?.removeEventListener('resize', onViewportChange)
    window.visualViewport?.removeEventListener('scroll', onViewportChange)
    persist()
  }

  observer.observe(document, {
    attributeFilter: [
      'data-active-project',
      'data-case-arrival',
      'data-case-arrival-progress',
      'data-cinematic-entry',
      'data-cinematic-entry-progress',
      'data-cinematic-navigation-phase',
      'data-cinematic-navigation-progress',
      'data-cinematic-navigation-token',
      'data-instrument-stage',
      'data-rialo-event',
      'data-rialo-event-phase',
      'data-rialo-event-progress',
      'data-universe-frameloop',
      'data-universe-morph-phase',
      'data-universe-morph-progress',
      'data-universe-quality',
      'data-universe-ready',
      'data-universe-render-state',
      'data-universe-scene',
      'data-universe-settled',
      'data-universe-target',
    ],
    attributes: true,
    childList: true,
    subtree: true,
  })
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('pagehide', onPageHide)
  window.visualViewport?.addEventListener('resize', onViewportChange)
  window.visualViewport?.addEventListener('scroll', onViewportChange)
  runtimeWindow.__CAPTAIN_DOCK_SCREENCAST_FACTS__ = {
    cleanup,
    order,
    recorderId,
    sample,
    timeline,
  }
  sample()
  animationFrame = requestAnimationFrame(sampleAnimationFrame)
}

async function stopAndReadBrowserFactsRecorder(page: Page, recorderId: string) {
  return page.evaluate((expectedRecorderId) => {
    const runtimeWindow = window as Window & {
      __CAPTAIN_DOCK_SCREENCAST_FACTS__?: BrowserFactsRecorderRuntime
    }
    const runtime = runtimeWindow.__CAPTAIN_DOCK_SCREENCAST_FACTS__

    if (!runtime || runtime.recorderId !== expectedRecorderId) {
      throw new Error('当前页面缺少匹配的 screencast browser facts recorder。')
    }

    runtime.sample()
    runtime.cleanup()
    try {
      sessionStorage.setItem(
        `__captain_dock_screencast_facts_${expectedRecorderId}_closed`,
        'true',
      )
    } catch {
      // Node 侧仍会消费当前内存 timeline；关闭标记只用于阻止后续导航重启旧 recorder。
    }

    return runtime.timeline
  }, recorderId)
}

async function waitForCinematicScreencastCollection(
  page: Page,
  eventStartedAtMs: number,
  checkpoints: readonly number[],
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const plan = planCinematicScreencastCollection({
      browserNowMs: await readBrowserTime(page),
      checkpoints,
      eventStartedAtMs,
    })

    if (plan.waitMs === 0) {
      return
    }

    await page.waitForTimeout(plan.waitMs)
  }

  const remaining = planCinematicScreencastCollection({
    browserNowMs: await readBrowserTime(page),
    checkpoints,
    eventStartedAtMs,
  }).waitMs

  if (remaining > 0) {
    throw new Error(
      `Screencast collection timer 未到达最后 checkpoint 窗口，仍差 ${remaining}ms。`,
    )
  }
}

type ArmedCinematicScreencast = Readonly<{
  capture: (
    triggerAndReadEventStart: () => Promise<number>,
    checkpoints: readonly number[],
    includeEventBoundary?: boolean,
  ) => Promise<CinematicScreencastSelection<FrameFacts>>
  close: () => Promise<void>
}>

let screencastRecorderOrder = 0

async function armCinematicScreencast(
  page: Page,
  label: string,
): Promise<ArmedCinematicScreencast> {
  const viewport = page.viewportSize()

  if (
    !viewport ||
    !Number.isSafeInteger(viewport.width) ||
    !Number.isSafeInteger(viewport.height) ||
    viewport.width !== 1440 ||
    viewport.height !== 1000
  ) {
    throw new Error(`${label} screencast 必须绑定批准的 1440×1000 viewport。`)
  }

  screencastRecorderOrder += 1
  const order = screencastRecorderOrder
  const recorderId = `${label.replace(/[^a-z0-9-]+/gi, '-')}-${order}`

  await page.addInitScript(installBrowserFactsRecorder, {
    order,
    recorderId,
  })
  await page.evaluate(installBrowserFactsRecorder, {
    order,
    recorderId,
  })

  const selector = createCinematicScreencastSelector<FrameFacts>({
    expectedImageScale: 0.5,
    expectedViewport: viewport,
    maxEncodedBytes: 192 * 1024 * 1024,
    maxFrames: 240,
  })
  const session = await page.context().newCDPSession(page)
  let captureUsed = false
  let closePromise: Promise<void> | null = null
  let factsStopped = false
  let started = false
  let stopSent = false
  const onFrame = (payload: CinematicScreencastPayload) => {
    selector.record(payload, (sessionId) =>
      session
        .send('Page.screencastFrameAck', { sessionId })
        .then(() => undefined),
    )
  }
  const onSessionClose = () => {
    selector.markSessionClosed()
  }

  session.on('Page.screencastFrame', onFrame)
  session.on('close', onSessionClose)

  const close = () => {
    closePromise ??= (async () => {
      let closeFailure: Error | null = null

      selector.beginStopping()

      if (started && !stopSent) {
        stopSent = true
        try {
          await session.send('Page.stopScreencast')
        } catch (error) {
          closeFailure = error instanceof Error ? error : new Error(String(error))
        }
      }
      if (!factsStopped) {
        factsStopped = true
        try {
          await stopAndReadBrowserFactsRecorder(page, recorderId)
        } catch (error) {
          closeFailure ??= error instanceof Error ? error : new Error(String(error))
        }
      }

      session.off('Page.screencastFrame', onFrame)
      session.off('close', onSessionClose)
      selector.close()
      try {
        await session.detach()
      } catch (error) {
        closeFailure ??= error instanceof Error ? error : new Error(String(error))
      }
      if (closeFailure) {
        throw closeFailure
      }
    })()

    return closePromise
  }

  try {
    await session.send('Page.startScreencast', {
      everyNthFrame: 1,
      format: 'png',
      maxHeight: 500,
      maxWidth: 720,
    })
    started = true

    let warmupTimeout: ReturnType<typeof setTimeout> | undefined

    try {
      await Promise.race([
        selector.waitForWarmup(),
        new Promise<never>((_resolve, reject) => {
          warmupTimeout = setTimeout(() => {
            reject(new Error(`${label} screencast 在 trigger 前未完成 ACK warmup。`))
          }, screencastWarmupTimeoutMs)
        }),
      ])
    } finally {
      if (warmupTimeout) {
        clearTimeout(warmupTimeout)
      }
    }
  } catch (error) {
    await close()
    throw error
  }

  return {
    capture: async (
      triggerAndReadEventStart,
      checkpoints,
      includeEventBoundary = false,
    ) => {
      if (captureUsed) {
        throw new Error(`${label} screencast recorder 只能服务一个 event。`)
      }
      captureUsed = true

      try {
        const eventStartedAt = await triggerAndReadEventStart()

        selector.bindEventStart(eventStartedAt)
        await waitForCinematicScreencastCollection(
          page,
          eventStartedAt,
          checkpoints,
        )
        selector.beginStopping()
        stopSent = true
        await session.send('Page.stopScreencast')
        const factsTimeline = await stopAndReadBrowserFactsRecorder(page, recorderId)

        factsStopped = true
        return await selector.finalize({
          checkpoints,
          decodePng: (data) => Buffer.from(data, 'base64'),
          factsTimeline,
          includeEventBoundary,
        })
      } finally {
        await close()
      }
    },
    close,
  }
}

async function analyzeAttachedPng(
  page: Page,
  pngBase64: string,
  crop: FrameFacts['canvasRect'],
): Promise<SpatialSignature> {
  return page.evaluate(async ({ cropRect, source }) => {
    const image = new Image()
    const loaded = new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => reject(new Error('Canvas PNG 无法载入原生分析器。')), {
        once: true,
      })
    })

    image.src = `data:image/png;base64,${source}`
    await loaded

    const size = 96
    const binCount = 12
    const analysisCanvas = document.createElement('canvas')
    const context = analysisCanvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      throw new Error('浏览器未提供原生 2D Canvas 分析上下文。')
    }

    analysisCanvas.width = size
    analysisCanvas.height = size
    if (cropRect) {
      const sourceX = Math.max(0, cropRect.x)
      const sourceY = Math.max(0, cropRect.y)
      const sourceWidth = Math.min(image.width - sourceX, cropRect.width)
      const sourceHeight = Math.min(image.height - sourceY, cropRect.height)

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        size,
        size,
      )
    } else {
      context.drawImage(image, 0, 0, size, size)
    }

    const pixels = context.getImageData(0, 0, size, size).data
    const luminance = (x: number, y: number) => {
      const offset = (y * size + x) * 4

      return pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722
    }
    const bins = Array.from({ length: binCount * binCount }, () => 0)
    let centroidX = 0
    let centroidY = 0
    let edgeCount = 0

    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const horizontal = Math.abs(luminance(x + 1, y) - luminance(x - 1, y))
        const vertical = Math.abs(luminance(x, y + 1) - luminance(x, y - 1))
        const isEdge = horizontal + vertical >= 26

        if (!isEdge) {
          continue
        }

        const binX = Math.min(binCount - 1, Math.floor((x / size) * binCount))
        const binY = Math.min(binCount - 1, Math.floor((y / size) * binCount))

        bins[binY * binCount + binX] += 1
        centroidX += x
        centroidY += y
        edgeCount += 1
      }
    }

    if (edgeCount > 0) {
      for (let index = 0; index < bins.length; index += 1) {
        bins[index] /= edgeCount
      }
      centroidX /= edgeCount * size
      centroidY /= edgeCount * size
    }

    return {
      bins,
      centroidX,
      centroidY,
      edgeCount,
    }
  }, { cropRect: crop, source: pngBase64 })
}

function expectFrameImageScale(
  frame: Pick<RawCapturedFrame, 'imageScale' | 'plannedCheckpointMs' | 'screencast'>,
  label: string,
) {
  expect(Number.isFinite(frame.imageScale), `${label} 必须记录有限的 PNG 空间缩放比例。`).toBe(
    true,
  )
  expect(
    [0.5, 1],
    `${label} 只能使用全分辨率或经批准的 0.5 倍定时证据。`,
  ).toContain(frame.imageScale)

  if (frame.plannedCheckpointMs !== null || frame.screencast !== null) {
    expect(frame.imageScale, `${label} CDP 证据帧必须使用 0.5 倍 PNG。`).toBe(0.5)
    return
  }

  expect(frame.imageScale, `${label} 非定时帧必须使用全分辨率 PNG。`).toBe(1)
}

async function captureRawFrame(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<RawCapturedFrame> {
  const factsBefore = await readFrameFacts(page)
  const captureStartedAt = await readBrowserTime(page)
  const artifactName = `cinematic-${name}`
  const artifactPath = testInfo.outputPath(`${artifactName}.png`)
  const pagePng = await page.screenshot({
    animations: 'allow',
    fullPage: false,
    path: artifactPath,
    scale: 'css',
  })
  const facts = await readFrameFacts(page)
  const captureFinishedAt = await readBrowserTime(page)

  const rawFrame = {
    artifactName,
    captureFinishedAt,
    captureOffsetMs: null,
    captureStartedAt,
    facts,
    factsBefore,
    imageScale: 1,
    latenessMs: null,
    pagePng,
    plannedCheckpointMs: null,
    screencast: null,
  }

  expectFrameImageScale(rawFrame, `${artifactName} 原始截图`)

  return rawFrame
}

async function finalizeCapturedFrame(
  page: Page,
  testInfo: TestInfo,
  rawFrame: RawCapturedFrame,
): Promise<CapturedFrame> {
  await testInfo.attach(rawFrame.artifactName, {
    body: rawFrame.pagePng,
    contentType: 'image/png',
  })

  const pngBase64 = rawFrame.pagePng.toString('base64')
  const pageSignature = await analyzeAttachedPng(page, pngBase64, null)
  const scaledCanvasRect = rawFrame.facts.canvasRect
    ? {
        height: rawFrame.facts.canvasRect.height * rawFrame.imageScale,
        width: rawFrame.facts.canvasRect.width * rawFrame.imageScale,
        x: rawFrame.facts.canvasRect.x * rawFrame.imageScale,
        y: rawFrame.facts.canvasRect.y * rawFrame.imageScale,
      }
    : null
  const signature =
    rawFrame.facts.canvasCount === 1 && scaledCanvasRect
      ? await analyzeAttachedPng(page, pngBase64, scaledCanvasRect)
      : null

  const frame = {
    artifactName: rawFrame.artifactName,
    captureFinishedAt: rawFrame.captureFinishedAt,
    captureOffsetMs: rawFrame.captureOffsetMs,
    captureStartedAt: rawFrame.captureStartedAt,
    facts: rawFrame.facts,
    factsBefore: rawFrame.factsBefore,
    imageScale: rawFrame.imageScale,
    latenessMs: rawFrame.latenessMs,
    pageSignature,
    plannedCheckpointMs: rawFrame.plannedCheckpointMs,
    pngSha256: createHash('sha256').update(rawFrame.pagePng).digest('hex'),
    screencast: rawFrame.screencast,
    signature,
  }

  if (frame.screencast) {
    expect(
      frame.pngSha256,
      `${rawFrame.artifactName} 必须复用 selector 校验过的同一 raw PNG Buffer。`,
    ).toBe(frame.screencast.pngSha256)
  }
  expectCaptureInvariants(frame, `${rawFrame.artifactName} 截图区间`)
  expectAttachedFrame(frame, `${rawFrame.artifactName} 自动附件绑定`)

  return frame
}

async function captureFrame(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<CapturedFrame> {
  return finalizeCapturedFrame(page, testInfo, await captureRawFrame(page, testInfo, name))
}

function requireSpatialSignature(frame: CapturedFrame, label: string) {
  expect(frame.signature, `${label} 必须包含唯一增强 Canvas 的空间签名。`).not.toBeNull()

  return frame.signature as SpatialSignature
}

function requirePageSpatialSignature(
  frame:
    | Pick<CapturedFrame, 'facts' | 'pageSignature'>
    | Pick<CapturedEventBoundary, 'pageSignature'>,
  label: string,
) {
  const facts = 'facts' in frame ? frame.facts : null

  return requireCinematicPageSpatialSignature(
    frame.pageSignature,
    facts
      ? {
          handoffVeilVisible: facts.carrierCount === 1,
          navigationPhase: facts.navigationPhase,
          navigationProgress: facts.navigationProgress,
          navigationToken: facts.navigationToken,
          routeHandoffSurfaceVisible: false,
        }
      : null,
    label,
  )
}

function spatialDistance(left: SpatialSignature, right: SpatialSignature) {
  const distributionDistance =
    left.bins.reduce((total, value, index) => total + Math.abs(value - right.bins[index]), 0) / 2
  const centroidDistance = Math.hypot(
    left.centroidX - right.centroidX,
    left.centroidY - right.centroidY,
  )

  return distributionDistance + centroidDistance
}

type ProgressKey =
  | 'carrierProgress'
  | 'caseArrivalProgress'
  | 'entryProgress'
  | 'morphProgress'
  | 'navigationProgress'
  | 'rialoEventProgress'

const progressKeys: readonly ProgressKey[] = [
  'carrierProgress',
  'caseArrivalProgress',
  'entryProgress',
  'morphProgress',
  'navigationProgress',
  'rialoEventProgress',
]

function readIntervalProgress(
  facts: FrameFacts,
  key: ProgressKey,
  label: string,
) {
  const rawValue = facts[key]

  if (rawValue === null) {
    return null
  }

  const value = Number(rawValue)

  expect(rawValue, `${label} 的 ${key} 必须是合法区间进度。`).toMatch(
    /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/,
  )
  expect(Number.isFinite(value), `${label} 的 ${key} 必须是有限数值。`).toBe(true)
  expect(value, `${label} 的 ${key} 不得小于 0。`).toBeGreaterThanOrEqual(0)
  expect(value, `${label} 的 ${key} 不得大于 1。`).toBeLessThanOrEqual(1)

  return value
}

function expectCaptureInvariants(frame: CapturedFrame, label: string) {
  const pointFacts = frame.factsBefore
    ? ([
        ['截图前', frame.factsBefore],
        ['截图后', frame.facts],
      ] as const)
    : ([['截图时刻', frame.facts]] as const)

  for (const [moment, facts] of pointFacts) {
    expect(facts.canvasCount, `${label} ${moment} 最多只能存在一个增强 Canvas。`).toBeLessThanOrEqual(
      1,
    )
    expect(facts.canvasCount, `${label} ${moment} 的 Canvas 计数不得为负。`).toBeGreaterThanOrEqual(
      0,
    )
    if (facts.canvasCount === 1) {
      expect(
        facts.canvasRect,
        `${label} ${moment} 的唯一 Canvas 必须绑定可见布局矩形。`,
      ).not.toBeNull()
    } else {
      expect(facts.canvasRect, `${label} ${moment} 无 Canvas 时不得伪造布局矩形。`).toBeNull()
    }
  }

  if (
    frame.factsBefore !== null &&
    frame.factsBefore.navigationToken !== null &&
    frame.facts.navigationToken !== null
  ) {
    expect(
      frame.facts.navigationToken,
      `${label} 截图期间不得替换正在进行的 navigation token。`,
    ).toBe(frame.factsBefore.navigationToken)
  }

  if (frame.factsBefore === null) {
    return
  }

  for (const key of progressKeys) {
    const before = readIntervalProgress(frame.factsBefore, key, `${label} 截图前`)
    const after = readIntervalProgress(frame.facts, key, `${label} 截图后`)
    const beforeOwner = frame.factsBefore.stageOwner
    const afterOwner = frame.facts.stageOwner

    if (key === 'entryProgress') {
      if (before !== null) {
        expect(beforeOwner, `${label} 截图前的 entryProgress 必须有明确 stage owner。`).not.toBeNull()
      }
      if (after !== null) {
        expect(afterOwner, `${label} 截图后的 entryProgress 必须有明确 stage owner。`).not.toBeNull()
      }
    }

    if (before !== null && after !== null) {
      if (
        key === 'entryProgress' &&
        beforeOwner !== null &&
        afterOwner !== null &&
        beforeOwner !== afterOwner
      ) {
        continue
      }
      expect(
        after + 0.001,
        `${label} 的 ${key} 在截图事实区间内必须单调。`,
      ).toBeGreaterThanOrEqual(before)
    }
  }
}

function toRawScreencastFrames(
  prefix: string,
  selectedFrames: readonly SelectedCinematicScreencastFrame<FrameFacts>[],
) {
  return selectedFrames.map((selected): RawCapturedFrame => {
    const metadataTimestampSeconds = selected.metadata.timestamp

    if (metadataTimestampSeconds === undefined) {
      throw new Error(`${prefix} selected screencast frame 缺少 CDP timestamp。`)
    }

    return {
      artifactName: `cinematic-${prefix}-planned-${String(
        selected.plannedCheckpointMs,
      ).padStart(4, '0')}-actual-${String(
        Math.round(selected.actualOffsetMs),
      ).padStart(4, '0')}`,
      captureFinishedAt: selected.frameSwapAtMs,
      captureOffsetMs: selected.actualOffsetMs,
      captureStartedAt: selected.frameSwapAtMs,
      facts: selected.facts,
      factsBefore: null,
      imageScale: 0.5,
      latenessMs: selected.latenessMs,
      pagePng: selected.png,
      plannedCheckpointMs: selected.plannedCheckpointMs,
      screencast: {
        factsCapturedAtMs: selected.factsCapturedAtMs,
        factsFrameAbsoluteSkewMs: selected.factsFrameAbsoluteSkewMs,
        factsFrameSignedSkewMs: selected.factsFrameSignedSkewMs,
        factsVersion: selected.factsVersion,
        frameSwapAtMs: selected.frameSwapAtMs,
        metadataScrollOffsetX: selected.metadata.scrollOffsetX,
        metadataScrollOffsetY: selected.metadata.scrollOffsetY,
        metadataTimestampSeconds,
        origin: selected.origin,
        pngSha256: selected.pngSha256,
        selectionKind: selected.selectionKind,
        sessionId: selected.sessionId,
        timeOriginMs: selected.timeOriginMs,
        visualViewport: selected.visualViewport,
      },
    }
  })
}

async function finalizeCapturedFrames(
  page: Page,
  testInfo: TestInfo,
  rawFrames: readonly RawCapturedFrame[],
) {
  const frames: CapturedFrame[] = []

  for (const rawFrame of rawFrames) {
    frames.push(
      await finalizeCapturedFrame(page, testInfo, rawFrame),
    )
  }

  return frames
}

async function finalizeCapturedEventBoundary(
  page: Page,
  testInfo: TestInfo,
  prefix: string,
  selected: SelectedCinematicEventBoundaryFrame,
): Promise<CapturedEventBoundary> {
  const metadataTimestampSeconds = selected.metadata.timestamp

  if (metadataTimestampSeconds === undefined) {
    throw new Error(`${prefix} event boundary 缺少 CDP timestamp。`)
  }

  const artifactName = `cinematic-${prefix}-event-boundary-actual-${String(
    Math.round(selected.actualOffsetMs),
  ).padStart(4, '0')}`

  await testInfo.attach(artifactName, {
    body: selected.png,
    contentType: 'image/png',
  })

  const pngSha256 = createHash('sha256').update(selected.png).digest('hex')
  const frame: CapturedEventBoundary = {
    artifactName,
    captureFinishedAt: selected.frameSwapAtMs,
    captureOffsetMs: selected.actualOffsetMs,
    captureStartedAt: selected.frameSwapAtMs,
    imageScale: 0.5,
    latenessMs: null,
    pageSignature: await analyzeAttachedPng(
      page,
      selected.png.toString('base64'),
      null,
    ),
    plannedCheckpointMs: null,
    pngSha256,
    screencast: {
      frameSwapAtMs: selected.frameSwapAtMs,
      metadataTimestampSeconds,
      pngSha256: selected.pngSha256,
      previousFrameSwapAtMs: selected.previousFrameSwapAtMs,
      selectionKind: 'event-boundary',
      sessionId: selected.sessionId,
      viewport: {
        deviceHeight: selected.metadata.deviceHeight,
        deviceWidth: selected.metadata.deviceWidth,
        pageScaleFactor: selected.metadata.pageScaleFactor,
        scrollOffsetX: selected.metadata.scrollOffsetX,
        scrollOffsetY: selected.metadata.scrollOffsetY,
      },
    },
  }

  expect(frame.pngSha256, `${prefix} event boundary 必须复用 selector 校验过的 raw PNG。`).toBe(
    selected.pngSha256,
  )
  expect(frame.captureStartedAt).toBe(frame.captureFinishedAt)
  expect(frame.latenessMs).toBeNull()
  expect(frame.plannedCheckpointMs).toBeNull()
  expect(frame.imageScale).toBe(0.5)
  requirePageSpatialSignature(frame, `${prefix} event boundary`)

  return frame
}

function expectThreeLayerEventEvidence(
  boundary: CapturedEventBoundary,
  anchor: CapturedEventFactsAnchor,
  fixedFrames: readonly CapturedFrame[],
  label: string,
) {
  const eventStartedAtMs =
    anchor.capturedAtMs - anchor.eventSignedSkewMs

  expect(anchor.selectionKind).toBe('event-facts-anchor')
  expect(anchor.eventAbsoluteSkewMs).toBe(
    Math.abs(anchor.eventSignedSkewMs),
  )
  expect(anchor.eventAbsoluteSkewMs, `${label} event facts anchor 不得超过 50ms。`).toBeLessThanOrEqual(
    50,
  )
  expect(anchor.anchorToBoundarySignedSkewMs).toBeCloseTo(
    anchor.capturedAtMs - boundary.screencast.frameSwapAtMs,
    5,
  )
  expect(boundary.screencast.frameSwapAtMs).toBeGreaterThanOrEqual(
    eventStartedAtMs,
  )
  expect(boundary.captureOffsetMs).toBeCloseTo(
    boundary.screencast.frameSwapAtMs - eventStartedAtMs,
    5,
  )
  if (boundary.screencast.previousFrameSwapAtMs !== null) {
    expect(
      boundary.screencast.previousFrameSwapAtMs,
      `${label} event boundary predecessor 必须真实位于 event 之前。`,
    ).toBeLessThan(eventStartedAtMs)
  }
  expect(anchor.visualViewport).toEqual({
    height: boundary.screencast.viewport.deviceHeight,
    pageX: boundary.screencast.viewport.scrollOffsetX,
    pageY: boundary.screencast.viewport.scrollOffsetY,
    scale: boundary.screencast.viewport.pageScaleFactor,
    width: boundary.screencast.viewport.deviceWidth,
  })

  for (const [index, frame] of fixedFrames.entries()) {
    expect(
      frame.screencast?.origin,
      `${label} fixed 样本 ${index + 1} 必须与 event facts anchor 同 origin。`,
    ).toBe(anchor.origin)
    expect(
      frame.screencast?.timeOriginMs,
      `${label} fixed 样本 ${index + 1} 必须与 event facts anchor 同 timeOrigin。`,
    ).toBe(anchor.timeOriginMs)
  }
}

async function captureScreencastSequence(
  page: Page,
  testInfo: TestInfo,
  prefix: string,
  recorder: ArmedCinematicScreencast,
  triggerAndReadEventStart: () => Promise<number>,
  checkpoints: readonly number[],
  includeEventBoundary: boolean,
) {
  const selection = await recorder.capture(
    triggerAndReadEventStart,
    checkpoints,
    includeEventBoundary,
  )
  const frames = await finalizeCapturedFrames(
    page,
    testInfo,
    toRawScreencastFrames(prefix, selection.checkpointFrames),
  )
  const eventBoundary = selection.eventBoundary
    ? await finalizeCapturedEventBoundary(
        page,
        testInfo,
        prefix,
        selection.eventBoundary,
      )
    : null

  await testInfo.attach(`cinematic-${prefix}-sequence-manifest`, {
    body: Buffer.from(
      JSON.stringify(
        {
          eventBoundary: selection.eventBoundary
            ? {
                actualOffsetMs: selection.eventBoundary.actualOffsetMs,
                anchorToBoundarySignedSkewMs: null,
                evidenceKind: 'event-boundary',
                eventAbsoluteSkewMs: null,
                eventSignedSkewMs: null,
                facts: null,
                factsBefore: null,
                factsCapturedAtMs: null,
                factsFrameAbsoluteSkewMs: null,
                factsFrameSignedSkewMs: null,
                factsVersion: null,
                latenessMs: null,
                origin: null,
                plannedCheckpointMs: null,
                pngSha256: selection.eventBoundary.pngSha256,
                previousFrameSwapAtMs:
                  selection.eventBoundary.previousFrameSwapAtMs,
                sessionId: selection.eventBoundary.sessionId,
                timestamp: {
                  frameSwapAtEpochMs:
                    selection.eventBoundary.frameSwapAtMs,
                  metadataSecondsSinceEpoch:
                    selection.eventBoundary.metadata.timestamp,
                },
                timeOriginMs: null,
                viewport: {
                  deviceHeight:
                    selection.eventBoundary.metadata.deviceHeight,
                  deviceWidth:
                    selection.eventBoundary.metadata.deviceWidth,
                  pageScaleFactor:
                    selection.eventBoundary.metadata.pageScaleFactor,
                  scrollOffsetX:
                    selection.eventBoundary.metadata.scrollOffsetX,
                  scrollOffsetY:
                    selection.eventBoundary.metadata.scrollOffsetY,
                  visual: null,
                },
              }
            : null,
          eventFactsAnchor: selection.eventFactsAnchor
            ? {
                actualOffsetMs: null,
                anchorToBoundarySignedSkewMs:
                  selection.eventFactsAnchor
                    .anchorToBoundarySignedSkewMs,
                capturedAtMs:
                  selection.eventFactsAnchor.capturedAtMs,
                eventAbsoluteSkewMs:
                  selection.eventFactsAnchor.eventAbsoluteSkewMs,
                eventSignedSkewMs:
                  selection.eventFactsAnchor.eventSignedSkewMs,
                evidenceKind: 'event-facts-anchor',
                facts: selection.eventFactsAnchor.facts,
                factsBefore: null,
                factsFrameAbsoluteSkewMs: null,
                factsFrameSignedSkewMs: null,
                latenessMs: null,
                origin: selection.eventFactsAnchor.origin,
                plannedCheckpointMs: null,
                pngSha256: null,
                sessionId: null,
                timeOriginMs:
                  selection.eventFactsAnchor.timeOriginMs,
                timestamp: {
                  frameSwapAtEpochMs: null,
                  metadataSecondsSinceEpoch: null,
                },
                version: selection.eventFactsAnchor.version,
                viewport: {
                  deviceHeight: null,
                  deviceWidth: null,
                  pageScaleFactor: null,
                  scrollOffsetX: null,
                  scrollOffsetY: null,
                  visual:
                    selection.eventFactsAnchor.visualViewport,
                },
              }
            : null,
          fixedCheckpoints: selection.checkpointFrames.map(
            (frame, index) => ({
              actualOffsetMs: frame.actualOffsetMs,
              evidenceKind: 'fixed-checkpoint',
              facts: frame.facts,
              factsBefore: null,
              factsCapturedAtMs: frame.factsCapturedAtMs,
              factsFrameAbsoluteSkewMs:
                frame.factsFrameAbsoluteSkewMs,
              factsFrameSignedSkewMs:
                frame.factsFrameSignedSkewMs,
              factsVersion: frame.factsVersion,
              latenessMs: frame.latenessMs,
              plannedCheckpointMs: frame.plannedCheckpointMs,
              pngSha256: frame.pngSha256,
              sequenceStep: index + 1,
              sessionId: frame.sessionId,
              timestamp: {
                frameSwapAtEpochMs: frame.frameSwapAtMs,
                metadataSecondsSinceEpoch: frame.metadata.timestamp,
              },
              viewport: {
                deviceHeight: frame.metadata.deviceHeight,
                deviceWidth: frame.metadata.deviceWidth,
                pageScaleFactor: frame.metadata.pageScaleFactor,
                scrollOffsetX: frame.metadata.scrollOffsetX,
                scrollOffsetY: frame.metadata.scrollOffsetY,
                visual: frame.visualViewport,
              },
            }),
          ),
          schemaVersion: 3,
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  })

  return {
    eventBoundary,
    eventFactsAnchor: selection.eventFactsAnchor,
    samples: frames,
  }
}

async function captureTimedSequence(
  page: Page,
  testInfo: TestInfo,
  prefix: string,
  recorder: ArmedCinematicScreencast,
  triggerAndReadEventStart: () => Promise<number>,
  checkpoints: readonly number[],
) {
  const sequence = await captureScreencastSequence(
    page,
    testInfo,
    prefix,
    recorder,
    triggerAndReadEventStart,
    checkpoints,
    false,
  )

  expect(sequence.eventBoundary, `${prefix} fixed sequence 不得伪造 event boundary。`).toBeNull()
  expect(sequence.eventFactsAnchor, `${prefix} fixed sequence 不得伪造 event facts anchor。`).toBeNull()

  return sequence.samples
}

function expectAttachedFrame(frame: CapturedFrame, label: string) {
  expect(frame.artifactName, `${label} 必须声明附件名。`).toMatch(/^cinematic-/)
  expect(frame.pngSha256, `${label} 必须绑定附件 PNG 的 SHA-256。`).toMatch(/^[a-f0-9]{64}$/)
  expectFrameImageScale(frame, label)
  expect(frame.captureFinishedAt, `${label} 截图完成时间必须晚于开始时间。`).toBeGreaterThanOrEqual(
    frame.captureStartedAt,
  )

  if (frame.plannedCheckpointMs === null) {
    expect(frame.captureOffsetMs, `${label} 非定时帧不得伪造实际 offset。`).toBeNull()
    expect(frame.latenessMs, `${label} 非定时帧不得伪造 lateness。`).toBeNull()
    expect(frame.screencast, `${label} 非定时帧不得伪造 screencast metadata。`).toBeNull()
  } else {
    expect(frame.screencast?.selectionKind).toBe('fixed-checkpoint')
    expect(frame.captureOffsetMs, `${label} 定时帧必须记录实际 capture offset。`).not.toBeNull()
    expect(frame.latenessMs, `${label} 定时帧必须记录 lateness。`).not.toBeNull()
    expect(frame.screencast, `${label} 定时帧必须绑定 screencast metadata。`).not.toBeNull()
    expect(frame.latenessMs ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(0)
    expect(frame.latenessMs ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
      maximumCaptureLatenessMs,
    )
    expect(frame.latenessMs).toBeCloseTo(
      (frame.captureOffsetMs as number) - frame.plannedCheckpointMs,
      5,
    )
    expect(
      frame.screencast?.factsFrameAbsoluteSkewMs ?? Number.POSITIVE_INFINITY,
      `${label} facts-frame absolute skew 不得超过 50ms。`,
    ).toBeLessThanOrEqual(50)
    expect(frame.screencast?.factsFrameAbsoluteSkewMs).toBeCloseTo(
      Math.abs(frame.screencast?.factsFrameSignedSkewMs ?? Number.NaN),
      5,
    )
  }

  requirePageSpatialSignature(frame, label)

  if (frame.facts.canvasCount === 1) {
    requireSpatialSignature(frame, label)
  } else {
    expect(frame.signature, `${label} 无 Canvas 时不得伪造 Canvas 空间签名。`).toBeNull()
  }
}

function expectStrictFixedCheckpointPath(
  frames: readonly CapturedFrame[],
  label: string,
) {
  let previousActualOffsetMs = Number.NEGATIVE_INFINITY
  let previousFactsCapturedAtMs = Number.NEGATIVE_INFINITY
  let previousFactsVersion = 0

  for (const [index, frame] of frames.entries()) {
    const sampleLabel = `${label} fixed 样本 ${index + 1}`
    const actualOffsetMs =
      frame.captureOffsetMs ?? Number.NEGATIVE_INFINITY
    const factsCapturedAtMs =
      frame.screencast?.factsCapturedAtMs ?? Number.NEGATIVE_INFINITY
    const factsVersion =
      frame.screencast?.factsVersion ?? Number.NEGATIVE_INFINITY

    expect(
      actualOffsetMs,
      `${sampleLabel} actualOffset 必须严格递增且不得复用 raw frame。`,
    ).toBeGreaterThan(previousActualOffsetMs)
    expect(
      frame.latenessMs ?? Number.POSITIVE_INFINITY,
      `${sampleLabel} checkpoint lateness 不得超过 50ms。`,
    ).toBeLessThanOrEqual(maximumCaptureLatenessMs)
    expect(
      frame.screencast?.factsFrameAbsoluteSkewMs ??
        Number.POSITIVE_INFINITY,
      `${sampleLabel} facts-frame absolute skew 不得超过 50ms。`,
    ).toBeLessThanOrEqual(50)
    expect(
      factsCapturedAtMs,
      `${sampleLabel} facts capturedAt 必须 nondecreasing。`,
    ).toBeGreaterThanOrEqual(previousFactsCapturedAtMs)
    expect(
      factsVersion,
      `${sampleLabel} facts version 必须 nondecreasing。`,
    ).toBeGreaterThanOrEqual(previousFactsVersion)

    previousActualOffsetMs = actualOffsetMs
    previousFactsCapturedAtMs = factsCapturedAtMs
    previousFactsVersion = factsVersion
  }
}

function readProgress(frame: CapturedFrame, key: ProgressKey, label: string) {
  const rawValue = frame.facts[key]
  const value = rawValue === null ? Number.NaN : Number(rawValue)

  expect(rawValue ?? '', `${label} 的 ${key} 必须是显式截图时刻进度。`).toMatch(
    /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/,
  )
  expect(Number.isFinite(value), `${label} 的 ${key} 必须是截图时刻的有限数值。`).toBe(true)
  expect(value, `${label} 的 ${key} 不得小于 0。`).toBeGreaterThanOrEqual(0)
  expect(value, `${label} 的 ${key} 不得大于 1。`).toBeLessThanOrEqual(1)

  return value
}

function expectStableMorphCaptureGeometry(
  start: CapturedFrame,
  samples: readonly CapturedFrame[],
  stableViewport: StableControlViewport,
  label: string,
) {
  expect(start.facts.canvasRect, `${label} 起点必须绑定唯一 Canvas 几何。`).not.toBeNull()

  for (const [index, frame] of samples.entries()) {
    expect(
      frame.facts.canvasRect,
      `${label} 样本 ${index + 1} 的 Canvas 几何不得因 click scroll 跳变。`,
    ).toEqual(start.facts.canvasRect)
    expect(
      frame.screencast?.visualViewport,
      `${label} 样本 ${index + 1} 必须保持滚动稳定后的 visual viewport。`,
    ).toEqual(stableViewport.visualViewport)
    expect(frame.screencast?.visualViewport.pageX).toBe(stableViewport.scrollX)
    expect(frame.screencast?.visualViewport.pageY).toBe(stableViewport.scrollY)
  }
}

function expectHomeOpeningStartupTransition(
  frames: readonly CapturedFrame[],
) {
  requireCinematicHomeOpeningStartupSequence(
    frames.map((frame) => frame.facts),
    'Home opening sequence',
  )
}

function isCapturedEventBoundary(
  frame: CapturedEventBoundary | CapturedFrame,
): frame is CapturedEventBoundary {
  return frame.screencast?.selectionKind === 'event-boundary'
}

function expectContinuousProgress(
  start: CapturedEventBoundary | CapturedFrame,
  samples: readonly CapturedFrame[],
  progressKey: ProgressKey,
  label: string,
  options: Readonly<{
    ambientDistance: number
    surface?: 'canvas' | 'page'
  }>,
) {
  expect(samples.length, `${label} 必须提供足够多的附件采样点。`).toBeGreaterThanOrEqual(7)
  if (isCapturedEventBoundary(start)) {
    expect(options.surface, `${label} raw event boundary 只允许作为整页空间起点。`).toBe(
      'page',
    )
    requirePageSpatialSignature(start, `${label} raw event boundary 起点`)
  } else {
    expectAttachedFrame(start, `${label} 起点`)
  }
  samples.forEach((frame, index) => expectAttachedFrame(frame, `${label} 样本 ${index + 1}`))

  const progress = samples.map((frame, index) =>
    readProgress(frame, progressKey, `${label} 样本 ${index + 1}`),
  )
  const roundedProgress = new Set(progress.map((value) => value.toFixed(3)))
  const intermediateProgress = progress.filter((value) => value > 0.001 && value < 0.999)

  for (let index = 1; index < progress.length; index += 1) {
    expect(
      progress[index] + 0.001,
      `${label} 的截图时刻进度必须单调，不得用离散回跳冒充连续动画。`,
    ).toBeGreaterThanOrEqual(progress[index - 1])
  }
  expect(roundedProgress.size, `${label} 至少需要五个不同的截图时刻进度。`).toBeGreaterThanOrEqual(
    5,
  )
  expect(
    intermediateProgress.length,
    `${label} 至少需要四个非端点的截图时刻进度。`,
  ).toBeGreaterThanOrEqual(4)
  expect(progress.at(-1), `${label} 末帧进度必须到达 1。`).toBeGreaterThanOrEqual(0.999)

  const signatureFor = (
    frame: CapturedEventBoundary | CapturedFrame,
    frameLabel: string,
  ) => {
    if (options.surface === 'page') {
      return requirePageSpatialSignature(frame, frameLabel)
    }
    if (isCapturedEventBoundary(frame)) {
      throw new Error(`${frameLabel} raw event boundary 不得伪造 Canvas crop signature。`)
    }

    return requireSpatialSignature(frame, frameLabel)
  }
  const origin = signatureFor(start, `${label} 起点`)
  const signatures = samples.map((frame, index) =>
    signatureFor(frame, `${label} 样本 ${index + 1}`),
  )
  const sequence = [origin, ...signatures]
  const stepDistances = sequence
    .slice(1)
    .map((signature, index) => spatialDistance(sequence[index], signature))
  const minimumMaterialStep = Math.max(0.006, options.ambientDistance * 1.5)
  const materialSteps = stepDistances.filter((distance) => distance > minimumMaterialStep)
  const finalDistance = spatialDistance(origin, signatures.at(-1) as SpatialSignature)

  expect(
    materialSteps.length,
    `${label} 至少四个相邻附件必须超过环境漂移，拒绝两次离散跳变。`,
  ).toBeGreaterThanOrEqual(4)
  expect(
    finalDistance,
    `${label} 末帧必须与起点显著不同，环境微动不能冒充目标 morph。`,
  ).toBeGreaterThan(Math.max(0.075, options.ambientDistance * 3))

  return Math.max(
    ...signatures.map((signature) => spatialDistance(origin, signature)),
  )
}

function expectCarrierSpine(
  samples: readonly CapturedFrame[],
  label: string,
  expectedTarget: string,
  expectedDirection: string,
) {
  const checkpoints = [120, 300, 480] as const
  const measured = checkpoints.map((checkpoint) => {
    const frame = samples.find(
      (candidate) => candidate.plannedCheckpointMs === checkpoint,
    )

    expect(frame, `${label} 必须包含 ${checkpoint}ms carrier 量测。`).toBeDefined()

    return frame as CapturedFrame
  })
  let token: string | null = null
  let previousProgress = -1
  let previousTrackX = Number.NEGATIVE_INFINITY
  let previousMassX = Number.NEGATIVE_INFINITY
  let previousSignalX = Number.NEGATIVE_INFINITY

  for (const [index, frame] of measured.entries()) {
    const checkpoint = checkpoints[index]
    const facts = frame.facts
    const progress = Number(facts.carrierProgress)
    const areaRatio = facts.carrierAreaRatio ?? Number.NaN
    const trackX = facts.carrierTrackX ?? Number.NaN
    const massX = facts.carrierMassX ?? Number.NaN
    const signalX = facts.carrierSignalX ?? Number.NaN

    expect(facts.carrierCount, `${label} ${checkpoint}ms 必须恰好有一个 carrier。`).toBe(1)
    expect(facts.carrierPartsCount, `${label} ${checkpoint}ms 必须量测三个真实部件。`).toBe(3)
    expect(facts.carrierHostTransparent, `${label} carrier host 必须透明。`).toBe(true)
    expect(facts.carrierHostPositionFixed, `${label} carrier root 必须 fixed。`).toBe(true)
    expect(
      facts.carrierHostPointerEventsNone,
      `${label} carrier root 不得截获 pointer events。`,
    ).toBe(true)
    expect(
      facts.carrierRootCoversViewport,
      `${label} carrier root 必须以 1px 容差覆盖 viewport。`,
    ).toBe(true)
    expect(facts.carrierTarget, `${label} carrier target 必须连续。`).toBe(expectedTarget)
    expect(facts.carrierDirection, `${label} carrier 方向必须接续 source scene。`).toBe(
      expectedDirection,
    )
    expect(facts.carrierToken, `${label} carrier token 必须存在。`).toMatch(/^\d+$/)
    expect(facts.carrierToken, `${label} carrier 与 bridge 必须共用 token。`).toBe(
      facts.navigationToken,
    )
    expect(Number.isFinite(progress), `${label} ${checkpoint}ms progress 必须有限。`).toBe(
      true,
    )
    expect(progress, `${label} ${checkpoint}ms progress 不得回退。`).toBeGreaterThan(
      previousProgress,
    )
    expect(Number.isFinite(areaRatio), `${label} ${checkpoint}ms 面积比例必须有限。`).toBe(
      true,
    )
    expect(areaRatio, `${label} ${checkpoint}ms 三部件总面积不得超过视口 35%。`).toBeLessThanOrEqual(
      0.35,
    )
    expect(trackX, `${label} ${checkpoint}ms track X 必须单调前进。`).toBeGreaterThan(
      previousTrackX,
    )
    expect(massX, `${label} ${checkpoint}ms mass X 必须单调前进。`).toBeGreaterThan(
      previousMassX,
    )
    expect(signalX, `${label} ${checkpoint}ms signal X 必须单调前进。`).toBeGreaterThan(
      previousSignalX,
    )

    if (token === null) {
      token = facts.carrierToken
    } else {
      expect(facts.carrierToken, `${label} 不得在途中替换 carrier token。`).toBe(token)
    }
    previousProgress = progress
    previousTrackX = trackX
    previousMassX = massX
    previousSignalX = signalX
  }

  const terminal = samples.at(-1)

  expect(terminal?.facts.carrierCount, `${label} terminal 必须清理 carrier。`).toBe(0)
  expect(terminal?.facts.carrierPartsCount, `${label} terminal 不得残留 carrier 部件。`).toBe(0)
}

function annotateManualVisualGate(testInfo: TestInfo) {
  testInfo.annotations.push({
    type: 'manual-visual-gate',
    description: 'Architecture 必须查看 start/mid/end 原图后才能接受电影化视觉。',
  })
}

async function prewarmHomeOpening(page: Page) {
  await page.goto('/')
  await expect(page.locator('[data-universe-shell]')).toHaveAttribute(
    'data-universe-ready',
    'true',
  )
  await expect(page.locator('[data-universe-shell]')).toHaveAttribute(
    'data-universe-frameloop',
    'demand',
  )
  await expect(page.locator('[data-universe-shell]')).toHaveAttribute(
    'data-universe-settled',
    'true',
  )
  await expect(page.locator('[data-instrument-stage="home"]')).toHaveAttribute(
    'data-cinematic-entry',
    'settled',
  )
  await page.goto('/arc/signal-ledger')
}

async function readHomeMobileTerminalState(page: Page, motion: 'normal' | 'reduced') {
  const stage = page.locator('[data-instrument-stage="home"]')
  const activePanel = stage.getByRole('region', { name: 'Active project' })
  const primary = activePanel.getByRole('link', {
    name: 'Open SIGNAL/LEDGER case file',
  })
  const visibleProjectName = stage.locator(
    ':scope > [data-stage-title] h1 > span[aria-hidden="true"]',
  )

  await expect(stage).toHaveAttribute('data-cinematic-entry', 'settled')
  await expect(stage).toHaveAttribute('data-active-project', 'signal-ledger')
  await expect(stage).toHaveAttribute('data-committed-target', 'project:signal-ledger')
  await expect(stage).toHaveAttribute('data-effective-target', 'project:signal-ledger')
  await expect(activePanel.getByRole('heading')).toHaveCount(0)
  await expect(visibleProjectName).toHaveCount(1)
  await expect(visibleProjectName).toBeVisible()
  await expect(visibleProjectName).toHaveText('SIGNAL/LEDGER')
  await expect(activePanel.locator('[data-active-project-statement]')).toHaveText(
    'Every autonomous action leaves a receipt worth trusting.',
  )
  await expect(stage.locator('[data-control-role="primary"]')).toHaveCount(1)
  await expect(primary).toHaveAttribute('data-control-role', 'primary')
  await expect(primary).toHaveAttribute('href', '/arc/signal-ledger')
  const liveRegions = stage.locator('[aria-live]')
  const live = stage.locator('[aria-live][data-project-reel-live]')

  await expect(liveRegions).toHaveCount(1)
  await expect(live).toHaveAttribute('aria-live', 'polite')
  await expect(live).toHaveText(
    'SIGNAL/LEDGER: Every autonomous action leaves a receipt worth trusting.',
  )

  const projectIndex = stage.getByRole('group', { name: 'Project reel' })

  await expect(projectIndex).toHaveCount(1)
  const projectEntries: Array<{ name: string; route: string }> = []
  for (const entry of mobileProjectEntries) {
    const semanticEntry = projectIndex
      .getByRole('button', { name: new RegExp(entry.name, 'i') })
      .or(projectIndex.getByRole('link', { name: new RegExp(entry.name, 'i') }))

    await expect(semanticEntry).toHaveCount(1)
    await expect(semanticEntry).toBeVisible()
    const facts = await semanticEntry.evaluate((element) => ({
      href: element instanceof HTMLAnchorElement ? element.getAttribute('href') : null,
      target: element.getAttribute('data-scene-target'),
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    }))

    expect(facts.text).toContain(entry.name)
    if (facts.href === null) {
      expect(facts.target).toBe(entry.target)
    } else {
      expect(facts.href).toBe(entry.route)
    }
    projectEntries.push({ name: entry.name, route: entry.route })
  }

  const ecosystemEntries: Array<{ name: string; route: string }> = []
  for (const entry of mobileEcosystemEntries) {
    const semanticEntry = page
      .getByRole('navigation', { name: 'Ecosystem stage index' })
      .getByRole('link', { name: new RegExp(entry.name, 'i') })

    await expect(semanticEntry).toHaveCount(1)
    await expect(semanticEntry).toHaveAttribute('href', entry.route)
    ecosystemEntries.push({ name: entry.name, route: entry.route })
  }

  if (motion === 'reduced') {
    await expect(page.locator('[data-static-scene="home"]')).toHaveCount(1)
    await expect(page.locator('canvas[data-universe-canvas]')).toHaveCount(0)
    const runningAnimations = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === 'running').length,
    )

    expect(runningAnimations).toBe(0)
  }

  return {
    activeProject: await stage.getAttribute('data-active-project'),
    committedTarget: await stage.getAttribute('data-committed-target'),
    ecosystemEntries,
    effectiveTarget: await stage.getAttribute('data-effective-target'),
    heading: (await visibleProjectName.innerText()).trim(),
    live: (await live.innerText()).replace(/\s+/g, ' ').trim(),
    primaryHref: await primary.getAttribute('href'),
    primaryText: (await primary.innerText()).trim(),
    projectEntries,
    statement: (await activePanel.locator('[data-active-project-statement]').innerText()).trim(),
  }
}

test('Home opening records a 1000–1400ms spatial establishment from browser event time', async ({
  page,
}, testInfo) => {
  annotateManualVisualGate(testInfo)
  const runtimeFailures = collectRuntimeFailures(page)

  await page.setViewportSize({ width: 1440, height: 1000 })
  await prewarmHomeOpening(page)
  await installMotionEventRecorder(page)
  const openingRecorder = await armCinematicScreencast(page, 'home-opening')
  let entryStartedAt = Number.NaN
  const openingSequence = await captureScreencastSequence(
    page,
    testInfo,
    'home-opening',
    openingRecorder,
    async () => {
      await page.goto('/')
      entryStartedAt = (
        await waitForMotionEvent(
          page,
          0,
          'data-cinematic-entry',
          'entering',
          'Home opening entering',
        )
      ).absoluteTime

      return entryStartedAt
    },
    [160, 340, 520, 700, 880, 1060, 1240, 1500],
    true,
  )
  expect(
    openingSequence.eventBoundary,
    'Home opening 必须保留 earliest-post-event boundary 证据。',
  ).not.toBeNull()
  expect(
    openingSequence.eventFactsAnchor,
    'Home opening 必须保留独立的真实 event facts anchor。',
  ).not.toBeNull()
  const start = openingSequence.eventBoundary as CapturedEventBoundary
  const eventFactsAnchor =
    openingSequence.eventFactsAnchor as CapturedEventFactsAnchor
  const samples = openingSequence.samples
  expect(samples, 'Home opening 必须保留全部八个 fixed checkpoint 证据帧。').toHaveLength(8)
  expectStrictFixedCheckpointPath(samples, 'Home opening')
  const settled = samples.at(-1) as CapturedFrame
  const events = await readMotionEvents(page)
  const duration = readDurationBetween(
    events,
    'data-cinematic-entry',
    'entering',
    'settled',
    entryStartedAt,
  )

  expectDurationWithin(duration, 1000, 1400, 'Home opening')
  expect(
    eventFactsAnchor.capturedAtMs - eventFactsAnchor.eventSignedSkewMs,
    'Home opening event facts anchor 必须绑定真实 entering event absoluteTime。',
  ).toBe(entryStartedAt)
  expect(eventFactsAnchor.facts).toMatchObject({
    entryPhase: 'entering',
    path: '/',
    scene: 'home',
    stageOwner: 'home',
  })
  expectThreeLayerEventEvidence(
    start,
    eventFactsAnchor,
    samples,
    'Home opening',
  )
  expectContinuousProgress(start, samples, 'entryProgress', 'Home opening', {
    ambientDistance: 0,
    surface: 'page',
  })
  expectHomeOpeningStartupTransition(samples)
  expect(samples.some((frame) => frame.facts.entryPhase === 'entering')).toBe(true)
  requireCinematicEnhancedQuality(
    settled.facts.quality,
    'Home opening terminal',
  )
  expect(settled.facts).toMatchObject({
    canvasCount: 1,
    entryPhase: 'settled',
    entryProgress: '1',
    frameloop: 'demand',
    path: '/',
    ready: 'true',
    renderState: 'demand',
    scene: 'home',
    settled: 'true',
  })
  expect(runtimeFailures).toEqual([])
})

test('Home and Arc commits record 650–900ms finite non-color spatial morphs', async ({
  page,
}, testInfo) => {
  annotateManualVisualGate(testInfo)
  const runtimeFailures = collectRuntimeFailures(page)

  await installMotionEventRecorder(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await page.waitForTimeout(entryTerminalMs)

  const homeStage = page.locator('[data-instrument-stage="home"]')
  const hadron = homeStage.getByRole('button', { name: /HADRON/i })
  const homeStableViewport = await stabilizeControlViewport(
    hadron,
    'Home HADRON morph',
  )
  const homeAmbient = await captureFrame(page, testInfo, 'home-morph-ambient')

  await page.waitForTimeout(120)
  const homeStart = await captureFrame(page, testInfo, 'home-morph-start')
  const homeAmbientDistance = spatialDistance(
    requireSpatialSignature(homeAmbient, 'Home 环境对照'),
    requireSpatialSignature(homeStart, 'Home morph 起点'),
  )
  const homeEventCursor = (await readMotionEvents(page)).length
  const homeRecorder = await armCinematicScreencast(page, 'home-morph')
  let homeEventStart = Number.NaN

  const homeSamples = await captureTimedSequence(
    page,
    testInfo,
    'home-morph',
    homeRecorder,
    async () => {
      await expect(hadron).toHaveCount(1)
      await hadron.click()
      homeEventStart = (
        await waitForMotionEvent(
          page,
          homeEventCursor,
          'data-universe-morph-phase',
          'morphing',
          'Home project morph',
        )
      ).absoluteTime

      return homeEventStart
    },
    [100, 220, 340, 460, 580, 720, 920],
  )
  const homeSettled = homeSamples.at(-1) as CapturedFrame
  const homeDuration = readDurationBetween(
    await readMotionEvents(page),
    'data-universe-morph-phase',
    'morphing',
    'idle',
    homeEventStart,
  )

  await page.goto('/arc')
  await page.waitForTimeout(entryTerminalMs)
  const arcStage = page.locator('[data-instrument-stage="arc"]')
  const forecast = arcStage.getByRole('button', { name: /03.*Forecast/i })
  const arcStableViewport = await stabilizeControlViewport(
    forecast,
    'Arc Forecast morph',
  )
  const arcAmbient = await captureFrame(page, testInfo, 'arc-morph-ambient')

  await page.waitForTimeout(120)
  const arcStart = await captureFrame(page, testInfo, 'arc-morph-start')
  const arcAmbientDistance = spatialDistance(
    requireSpatialSignature(arcAmbient, 'Arc 环境对照'),
    requireSpatialSignature(arcStart, 'Arc morph 起点'),
  )
  const arcEventCursor = (await readMotionEvents(page)).length
  const arcRecorder = await armCinematicScreencast(page, 'arc-morph')
  let arcEventStart = Number.NaN

  const arcSamples = await captureTimedSequence(
    page,
    testInfo,
    'arc-morph',
    arcRecorder,
    async () => {
      await expect(forecast).toHaveCount(1)
      await forecast.click()
      arcEventStart = (
        await waitForMotionEvent(
          page,
          arcEventCursor,
          'data-universe-morph-phase',
          'morphing',
          'Arc project morph',
        )
      ).absoluteTime

      return arcEventStart
    },
    [100, 220, 340, 460, 580, 720, 920],
  )
  const arcSettled = arcSamples.at(-1) as CapturedFrame
  const arcDuration = readDurationBetween(
    await readMotionEvents(page),
    'data-universe-morph-phase',
    'morphing',
    'idle',
    arcEventStart,
  )

  expectDurationWithin(homeDuration, 650, 900, 'Home SIGNAL/LEDGER → HADRON morph')
  expectDurationWithin(arcDuration, 650, 900, 'Arc Research → Forecast morph')
  expectContinuousProgress(homeStart, homeSamples, 'morphProgress', 'Home project morph', {
    ambientDistance: homeAmbientDistance,
  })
  expectContinuousProgress(arcStart, arcSamples, 'morphProgress', 'Arc project morph', {
    ambientDistance: arcAmbientDistance,
  })
  expectStableMorphCaptureGeometry(
    homeStart,
    homeSamples,
    homeStableViewport,
    'Home project morph',
  )
  expectStableMorphCaptureGeometry(
    arcStart,
    arcSamples,
    arcStableViewport,
    'Arc project morph',
  )
  requireCinematicEnhancedQuality(
    homeSettled.facts.quality,
    'Home project morph terminal',
  )
  requireCinematicEnhancedQuality(
    arcSettled.facts.quality,
    'Arc project morph terminal',
  )
  expect(homeSettled.facts).toMatchObject({
    activeProject: 'hadron',
    frameloop: 'demand',
    morphPhase: 'idle',
    morphProgress: '1',
    ready: 'true',
    renderState: 'demand',
    scene: 'home',
    settled: 'true',
  })
  expect(arcSettled.facts).toMatchObject({
    activeProject: 'arcpredict',
    frameloop: 'demand',
    morphPhase: 'idle',
    morphProgress: '1',
    ready: 'true',
    renderState: 'demand',
    scene: 'arc',
    settled: 'true',
  })
  expect(runtimeFailures).toEqual([])
})

test('Rialo Trigger is spatially stronger than an ordinary step and settles finitely', async ({
  page,
}, testInfo) => {
  annotateManualVisualGate(testInfo)
  const runtimeFailures = collectRuntimeFailures(page)

  await installMotionEventRecorder(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/rialo')
  await page.waitForTimeout(entryTerminalMs)

  const stage = page.locator('[data-instrument-stage="rialo"]')
  const observe = stage.getByRole('button', { name: /Observe/i })
  const cover = stage.getByRole('button', { name: /Cover/i })
  const trigger = stage.getByRole('button', { name: /Trigger/i })
  const settle = stage.getByRole('button', { name: /Settle/i })
  const ordinaryStableViewport = await stabilizeControlViewport(
    cover,
    'Rialo Cover morph',
  )
  const ordinaryAmbient = await captureFrame(page, testInfo, 'rialo-cover-ambient')

  await page.waitForTimeout(120)
  const ordinaryStart = await captureFrame(page, testInfo, 'rialo-cover-start')
  const ordinaryAmbientDistance = spatialDistance(
    requireSpatialSignature(ordinaryAmbient, 'Rialo Cover 环境对照'),
    requireSpatialSignature(ordinaryStart, 'Rialo Cover 起点'),
  )
  const ordinaryEventCursor = (await readMotionEvents(page)).length
  const ordinaryRecorder = await armCinematicScreencast(page, 'rialo-cover')
  let ordinaryEventStart = Number.NaN

  const ordinarySamples = await captureTimedSequence(
    page,
    testInfo,
    'rialo-cover',
    ordinaryRecorder,
    async () => {
      await cover.click()
      ordinaryEventStart = (
        await waitForMotionEvent(
          page,
          ordinaryEventCursor,
          'data-rialo-event-phase',
          'active',
          'Rialo Cover morph',
        )
      ).absoluteTime

      return ordinaryEventStart
    },
    [100, 220, 340, 460, 580, 720, 920],
  )
  const ordinarySettled = ordinarySamples.at(-1) as CapturedFrame
  const ordinaryDuration = readDurationBetween(
    await readMotionEvents(page),
    'data-rialo-event-phase',
    'active',
    'settled',
    ordinaryEventStart,
  )

  await observe.click()
  await page.waitForTimeout(morphTerminalMs)
  const triggerStableViewport = await stabilizeControlViewport(
    trigger,
    'Rialo Trigger morph',
  )
  const triggerAmbient = await captureFrame(page, testInfo, 'rialo-trigger-ambient')

  await page.waitForTimeout(120)
  const triggerStart = await captureFrame(page, testInfo, 'rialo-trigger-start')
  const triggerAmbientDistance = spatialDistance(
    requireSpatialSignature(triggerAmbient, 'Rialo Trigger 环境对照'),
    requireSpatialSignature(triggerStart, 'Rialo Trigger 起点'),
  )
  const triggerEventCursor = (await readMotionEvents(page)).length
  const triggerRecorder = await armCinematicScreencast(page, 'rialo-trigger')
  let triggerEventStart = Number.NaN

  const triggerSamples = await captureTimedSequence(
    page,
    testInfo,
    'rialo-trigger',
    triggerRecorder,
    async () => {
      await trigger.click()
      triggerEventStart = (
        await waitForMotionEvent(
          page,
          triggerEventCursor,
          'data-rialo-event-phase',
          'active',
          'Rialo Trigger morph',
        )
      ).absoluteTime

      return triggerEventStart
    },
    [100, 220, 340, 460, 580, 720, 920],
  )
  const triggerSettled = triggerSamples.at(-1) as CapturedFrame
  const triggerDuration = readDurationBetween(
    await readMotionEvents(page),
    'data-rialo-event-phase',
    'active',
    'settled',
    triggerEventStart,
  )
  const ordinaryStrength = expectContinuousProgress(
    ordinaryStart,
    ordinarySamples,
    'rialoEventProgress',
    'Rialo Cover morph',
    { ambientDistance: ordinaryAmbientDistance },
  )
  const triggerStrength = expectContinuousProgress(
    triggerStart,
    triggerSamples,
    'rialoEventProgress',
    'Rialo Trigger morph',
    { ambientDistance: triggerAmbientDistance },
  )
  expectStableMorphCaptureGeometry(
    ordinaryStart,
    ordinarySamples,
    ordinaryStableViewport,
    'Rialo Cover morph',
  )
  expectStableMorphCaptureGeometry(
    triggerStart,
    triggerSamples,
    triggerStableViewport,
    'Rialo Trigger morph',
  )

  await settle.click()
  await page.waitForTimeout(morphTerminalMs)
  const settleEnd = await captureFrame(page, testInfo, 'rialo-settle-end')

  expectDurationWithin(ordinaryDuration, 650, 900, 'Rialo Cover morph')
  expectDurationWithin(triggerDuration, 650, 900, 'Rialo Trigger morph')
  expect(ordinarySettled.facts).toMatchObject({
    frameloop: 'demand',
    renderState: 'demand',
    rialoEvent: 'cover',
    rialoEventPhase: 'settled',
    rialoEventProgress: '1',
    settled: 'true',
  })
  expect(triggerSettled.facts).toMatchObject({
    frameloop: 'demand',
    renderState: 'demand',
    rialoEvent: 'trigger',
    rialoEventPhase: 'settled',
    rialoEventProgress: '1',
    settled: 'true',
  })
  expect(triggerStrength).toBeGreaterThan(ordinaryStrength * 1.25)
  expectAttachedFrame(settleEnd, 'Rialo Settle 末帧')
  expect(settleEnd.facts).toMatchObject({
    frameloop: 'demand',
    renderState: 'demand',
    rialoEvent: 'settle',
    rialoEventPhase: 'settled',
    rialoEventProgress: '1',
    scene: 'rialo',
    settled: 'true',
  })
  expect(runtimeFailures).toEqual([])
})

test('real Home links preserve one ≤700ms Canvas handoff to Arc and a Canvas-free detail arrival', async ({
  page,
}, testInfo) => {
  annotateManualVisualGate(testInfo)
  const runtimeFailures = collectRuntimeFailures(page)

  await installMotionEventRecorder(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await page.waitForTimeout(entryTerminalMs)

  const canvas = page.locator('canvas[data-universe-canvas]')
  const originalCanvas = await canvas.elementHandle()
  const arcLink = page
    .getByRole('navigation', { name: 'Ecosystem stage index' })
    .getByRole('link', { name: /Arc/i })
  const arcStableViewport = await stabilizeControlViewport(
    arcLink,
    'Home → Arc route handoff',
  )
  const arcAmbient = await captureFrame(page, testInfo, 'handoff-home-to-arc-ambient')

  await page.waitForTimeout(120)
  const arcStart = await captureFrame(page, testInfo, 'handoff-home-to-arc-start')
  const arcAmbientDistance = spatialDistance(
    requireSpatialSignature(arcAmbient, 'Home → Arc 环境对照'),
    requireSpatialSignature(arcStart, 'Home → Arc 起点'),
  )
  const arcEventCursor = (await readMotionEvents(page)).length
  const arcRecorder = await armCinematicScreencast(
    page,
    'handoff-home-to-arc',
  )
  let arcEventStart = Number.NaN

  const arcSamples = await captureTimedSequence(
    page,
    testInfo,
    'handoff-home-to-arc',
    arcRecorder,
    async () => {
      await expect(arcLink).toHaveCount(1)
      await arcLink.click({ noWaitAfter: true })
      arcEventStart = (
        await waitForMotionEvent(
          page,
          arcEventCursor,
          'data-cinematic-navigation-phase',
          'departing',
          'Home → Arc route handoff',
        )
      ).absoluteTime

      return arcEventStart
    },
    [80, 120, 220, 300, 390, 480, 570, 720],
  )
  const arcEnd = arcSamples.at(-1) as CapturedFrame
  const arcHandoff = readHandoffDuration(
    await readMotionEvents(page),
    'data-cinematic-navigation-phase',
    'idle',
    arcEventStart,
  )
  let canvasPersisted = false

  if (originalCanvas !== null) {
    try {
      canvasPersisted = await page.evaluate(
        (element) => element === document.querySelector('canvas[data-universe-canvas]'),
        originalCanvas,
      )
    } catch {
      canvasPersisted = false
    }
  }

  expectContinuousProgress(
    arcStart,
    arcSamples,
    'navigationProgress',
    'Home → Arc route handoff',
    { ambientDistance: arcAmbientDistance },
  )
  expectCarrierSpine(
    arcSamples,
    'Home → Arc route handoff',
    'ecosystem:arc',
    'home-beacon',
  )
  for (const [index, frame] of arcSamples.entries()) {
    const metadataScrollY =
      frame.screencast?.metadataScrollOffsetY ??
      Number.NaN
    const factsScrollY =
      frame.screencast?.visualViewport.pageY ??
      Number.NaN

    expect(
      [arcStableViewport.scrollY, 0],
      `Home → Arc fixed 样本 ${index + 1} 的 metadata scrollY 只能处于稳定基线或路由终点。`,
    ).toContain(metadataScrollY)
    expect(
      factsScrollY,
      `Home → Arc fixed 样本 ${index + 1} 的 facts scrollY 必须 exact match metadata。`,
    ).toBe(metadataScrollY)
  }
  expect(
    arcEnd.screencast?.metadataScrollOffsetY,
    'Home → Arc route fixed sequence 末帧必须精确回到 scrollY=0。',
  ).toBe(0)
  expect(canvasPersisted).toBe(true)
  requireCinematicEnhancedQuality(
    arcEnd.facts.quality,
    'Home → Arc route handoff terminal',
  )
  expect(arcEnd.facts).toMatchObject({
    canvasCount: 1,
    frameloop: 'demand',
    navigationPhase: 'idle',
    navigationProgress: '1',
    path: '/arc',
    ready: 'true',
    renderState: 'demand',
    scene: 'arc',
    settled: 'true',
  })
  expect(arcHandoff?.startToken).toBeTruthy()
  expect(arcHandoff?.endToken).toBe(arcHandoff?.startToken)
  expectDurationWithin(arcHandoff?.duration ?? null, 500, 700, 'Home → Arc total route handoff')

  await page.goto('/')
  await page.waitForTimeout(entryTerminalMs)
  const detailLink = page
    .locator('[data-instrument-stage="home"]')
    .getByRole('region', { name: 'Active project' })
    .getByRole('link', { name: /Open SIGNAL\/LEDGER case file/i })
  const detailAmbient = await captureFrame(page, testInfo, 'handoff-home-to-detail-ambient')

  await page.waitForTimeout(120)
  const detailStart = await captureFrame(page, testInfo, 'handoff-home-to-detail-start')
  const detailAmbientDistance = spatialDistance(
    requirePageSpatialSignature(detailAmbient, 'Home → detail 环境对照'),
    requirePageSpatialSignature(detailStart, 'Home → detail 起点'),
  )
  const detailEventCursor = (await readMotionEvents(page)).length
  const detailRecorder = await armCinematicScreencast(
    page,
    'handoff-home-to-detail',
  )
  let detailEventStart = Number.NaN

  const detailSamples = await captureTimedSequence(
    page,
    testInfo,
    'handoff-home-to-detail',
    detailRecorder,
    async () => {
      await expect(detailLink).toHaveCount(1)
      await detailLink.click({ noWaitAfter: true })
      detailEventStart = (
        await waitForMotionEvent(
          page,
          detailEventCursor,
          'data-cinematic-navigation-phase',
          'departing',
          'Home → detail route handoff',
        )
      ).absoluteTime

      return detailEventStart
    },
    [80, 120, 220, 300, 390, 480, 570, 720],
  )
  const detailEnd = detailSamples.at(-1) as CapturedFrame
  const detailHandoff = readHandoffDuration(
    await readMotionEvents(page),
    'data-case-arrival',
    'settled',
    detailEventStart,
  )

  expectContinuousProgress(
    detailStart,
    detailSamples,
    'navigationProgress',
    'Home → detail route handoff',
    {
      ambientDistance: detailAmbientDistance,
      surface: 'page',
    },
  )
  expectCarrierSpine(
    detailSamples,
    'Home → detail route handoff',
    'project:signal-ledger',
    'home-beacon',
  )
  expect(detailEnd.signature).toBeNull()
  expect(detailEnd.facts).toMatchObject({
    canvasCount: 0,
    caseArrival: 'settled',
    caseArrivalProgress: '1',
    navigationPhase: 'idle',
    navigationProgress: '1',
    path: '/arc/signal-ledger',
  })
  expect(detailHandoff?.startToken).toBeTruthy()
  expect(detailHandoff?.endToken).toBe(detailHandoff?.startToken)
  expectDurationWithin(
    detailHandoff?.duration ?? null,
    500,
    700,
    'Home → detail departing-to-settled total handoff',
  )
  expect(runtimeFailures).toEqual([])
})

test('390px normal motion and reduced motion expose equivalent complete terminal content', async ({
  browser,
  baseURL,
}, testInfo) => {
  annotateManualVisualGate(testInfo)
  const normalContext = await browser.newContext({
    baseURL,
    reducedMotion: 'no-preference',
    viewport: { height: 844, width: 390 },
  })
  const reducedContext = await browser.newContext({
    baseURL,
    reducedMotion: 'reduce',
    viewport: { height: 844, width: 390 },
  })

  try {
    const normalPage = await normalContext.newPage()
    const reducedPage = await reducedContext.newPage()
    const normalRuntimeFailures = collectRuntimeFailures(normalPage)
    const reducedRuntimeFailures = collectRuntimeFailures(reducedPage)

    await normalPage.goto('/')
    await normalPage.waitForTimeout(entryTerminalMs)
    const normalFrame = await captureFrame(normalPage, testInfo, 'home-mobile-normal-terminal')

    await reducedPage.goto('/')
    const reducedWaitStartedAt = await readBrowserTime(reducedPage)

    await reducedPage.waitForTimeout(180)
    const reducedFrame = await captureFrame(
      reducedPage,
      testInfo,
      'home-mobile-reduced-terminal',
    )
    const normalState = await readHomeMobileTerminalState(normalPage, 'normal')
    const reducedState = await readHomeMobileTerminalState(reducedPage, 'reduced')

    expectAttachedFrame(normalFrame, 'Home mobile normal terminal')
    expectAttachedFrame(reducedFrame, 'Home mobile reduced terminal')
    expect(
      reducedFrame.captureStartedAt - reducedWaitStartedAt,
      'reduced-motion 必须在 240ms 内完成 opacity terminal 后截图。',
    ).toBeLessThanOrEqual(240)
    expect(normalFrame.facts).toMatchObject({
      canvasCount: 1,
      entryPhase: 'settled',
      frameloop: 'demand',
      quality: 'medium',
      ready: 'true',
      renderState: 'demand',
      scene: 'home',
      settled: 'true',
    })
    expect(reducedFrame.facts).toMatchObject({
      canvasCount: 0,
      carrierCount: 0,
      entryPhase: 'settled',
      path: '/',
    })
    expect(normalState).toEqual(reducedState)
    expect(normalState.projectEntries).toHaveLength(4)
    expect(normalState.ecosystemEntries).toHaveLength(2)

    const reducedArcLink = reducedPage
      .getByRole('navigation', { name: 'Ecosystem stage index' })
      .getByRole('link', { name: /Arc/i })

    await reducedArcLink.click({ noWaitAfter: true })
    await expect(reducedPage.locator('[data-cinematic-handoff-signal]')).toHaveCount(0)
    expect(normalRuntimeFailures).toEqual([])
    expect(reducedRuntimeFailures).toEqual([])
  } finally {
    await normalContext.close()
    await reducedContext.close()
  }
})
