import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import {
  cdpTimestampSecondsToEpochMilliseconds,
  createCinematicScreencastSelector,
  planCinematicScreencastCollection,
  requireCinematicEnhancedQuality,
  requireCinematicHomeOpeningStartupSequence,
  requireCinematicPageSpatialSignature,
  type CinematicBrowserFacts,
  type CinematicScreencastPayload,
} from './cinematic-screencast-selector'

const eventStartedAtMs = 1_800_000_000_000
const screencastSessionId = 73
const expectedViewport = {
  height: 1000,
  width: 1440,
}

type TestFacts = Readonly<{
  progress: string
}>

function makePng(width = 720, height = 500) {
  const png = Buffer.alloc(33)

  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png, 0)
  png.writeUInt32BE(13, 8)
  png.write('IHDR', 12, 4, 'ascii')
  png.writeUInt32BE(width, 16)
  png.writeUInt32BE(height, 20)

  return png
}

function makePayload(
  offsetMs: number,
  overrides: Partial<CinematicScreencastPayload> = {},
): CinematicScreencastPayload {
  return {
    data: makePng().toString('base64'),
    metadata: {
      deviceHeight: expectedViewport.height,
      deviceWidth: expectedViewport.width,
      offsetTop: 0,
      pageScaleFactor: 1,
      scrollOffsetX: 0,
      scrollOffsetY: 0,
      timestamp: (eventStartedAtMs + offsetMs) / 1000,
    },
    sessionId: screencastSessionId,
    ...overrides,
  }
}

function makeDistinctPayload(offsetMs: number, marker: number) {
  const png = Buffer.concat([makePng(), Buffer.from([marker])])

  return {
    payload: makePayload(offsetMs, {
      data: png.toString('base64'),
    }),
    png,
  }
}

function nextRepresentableNumber(value: number) {
  const bytes = new ArrayBuffer(8)
  const view = new DataView(bytes)

  view.setFloat64(0, value, false)
  let high = view.getUint32(0, false)
  let low = view.getUint32(4, false)

  if (low === 0xffffffff) {
    high += 1
    low = 0
  } else {
    low += 1
  }
  view.setUint32(0, high, false)
  view.setUint32(4, low, false)

  return view.getFloat64(0, false)
}

function makeFacts(
  offsetMs: number,
  overrides: Partial<CinematicBrowserFacts<TestFacts>> = {},
): CinematicBrowserFacts<TestFacts> {
  return {
    capturedAtMs: eventStartedAtMs + offsetMs,
    facts: {
      progress: String(Math.min(1, Math.max(0, offsetMs / 1000))),
    },
    origin: 'http://127.0.0.1:3100',
    timeOriginMs: eventStartedAtMs - 5000,
    version: offsetMs + 1,
    visualViewport: {
      height: expectedViewport.height,
      pageX: 0,
      pageY: 0,
      scale: 1,
      width: expectedViewport.width,
    },
    ...overrides,
  }
}

function createSelector(
  overrides: Partial<{
    maxEncodedBytes: number
    maxFrames: number
  }> = {},
) {
  return createCinematicScreencastSelector<TestFacts>({
    expectedImageScale: 0.5,
    expectedViewport,
    maxEncodedBytes: overrides.maxEncodedBytes ?? 4096,
    maxFrames: overrides.maxFrames ?? 24,
  })
}

function readCinematicMotionSource() {
  return readFileSync('tests/e2e/cinematic-motion.spec.ts', 'utf8')
}

function readHomeOpeningTestSource() {
  const source = readCinematicMotionSource()
  const start = source.indexOf(
    "test('Home opening records a 1000–1400ms spatial establishment from browser event time'",
  )
  const end = source.indexOf("test('Home and Arc commits record", start)

  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)

  return source.slice(start, end)
}

const staticOpeningFacts = {
  canvasCount: 0,
  frameloop: 'static',
  path: '/',
  quality: 'static',
  ready: 'false',
  renderState: 'static',
  scene: 'home',
  settled: 'true',
} as const

const bootingOpeningFacts = {
  canvasCount: 1,
  frameloop: 'always',
  path: '/',
  quality: 'high',
  ready: 'false',
  renderState: 'active',
  scene: 'home',
  settled: 'false',
} as const

const readyOpeningFacts = {
  ...bootingOpeningFacts,
  ready: 'true',
} as const

const settledOpeningFacts = {
  ...readyOpeningFacts,
  frameloop: 'demand',
  renderState: 'demand',
  settled: 'true',
} as const

const intermediateVeilSignature = {
  bins: Array.from({ length: 144 }, (_value, index) =>
    index === 12 || index === 96 ? 0.5 : 0,
  ),
  centroidX: 0.42,
  centroidY: 0.57,
  edgeCount: 93,
}

const activeDetailVeilFacts = {
  handoffVeilVisible: true,
  navigationPhase: 'arriving',
  navigationProgress: '0.42',
  navigationToken: '41',
  routeHandoffSurfaceVisible: false,
} as const

const activeArcRouteSurfaceFacts = {
  handoffVeilVisible: false,
  navigationPhase: 'arriving',
  navigationProgress: '0.28',
  navigationToken: '42',
  routeHandoffSurfaceVisible: true,
} as const

describe('cinematic evidence semantic contracts', () => {
  it('selects full Chromium at file scope for cinematic evidence', () => {
    const motionSource = readCinematicMotionSource()
    const channelUseIndex = motionSource.indexOf(
      "test.use({ channel: 'chromium' })",
    )
    const firstTestIndex = motionSource.indexOf("test('")

    expect(channelUseIndex).toBeGreaterThanOrEqual(0)
    expect(channelUseIndex).toBeLessThan(firstTestIndex)
    expect(
      motionSource.match(/test\.use\(\{ channel: 'chromium' \}\)/g),
    ).toHaveLength(1)
  })

  it('accepts only High or Medium as enhanced cinematic evidence quality', () => {
    expect(requireCinematicEnhancedQuality('high')).toBe('high')
    expect(requireCinematicEnhancedQuality('medium')).toBe('medium')

    for (const quality of [
      'low',
      'static',
      null,
      undefined,
      'unknown',
      '',
    ]) {
      expect(() =>
        requireCinematicEnhancedQuality(quality, 'quality evidence'),
      ).toThrow(/high|medium/i)
    }
  })

  it('captures Home opening from a prewarmed same-origin cold page without changing screencast fidelity', () => {
    const motionSource = readCinematicMotionSource()
    const homeOpeningSource = readHomeOpeningTestSource()
    const prewarmIndex = homeOpeningSource.indexOf('await prewarmHomeOpening(page)')
    const recorderIndex = homeOpeningSource.indexOf('await installMotionEventRecorder(page)')
    const armIndex = homeOpeningSource.indexOf("await armCinematicScreencast(page, 'home-opening')")

    expect(motionSource).toContain('async function prewarmHomeOpening(page: Page)')
    expect(motionSource).toContain("await page.goto('/arc/signal-ledger')")
    expect(motionSource).not.toContain("await page.goto('about:blank')")
    expect(prewarmIndex).toBeGreaterThanOrEqual(0)
    expect(recorderIndex).toBeGreaterThan(prewarmIndex)
    expect(armIndex).toBeGreaterThan(recorderIndex)
    expect(homeOpeningSource).toContain("await page.goto('/')")
    expect(homeOpeningSource).not.toContain('await page.reload()')
    expect(motionSource).toContain('everyNthFrame: 1')
    expect(motionSource).toContain("format: 'png'")
    expect(motionSource).toContain('maxHeight: 500')
    expect(motionSource).toContain('maxWidth: 720')
  })

  it('accepts static → booting → ready → settled without treating the first canvas as terminal', () => {
    expect(
      requireCinematicHomeOpeningStartupSequence([
        staticOpeningFacts,
        bootingOpeningFacts,
        readyOpeningFacts,
        settledOpeningFacts,
      ]),
    ).toEqual(['static', 'booting', 'ready', 'settled'])
  })

  it('accepts Medium throughout an enhanced Home opening sequence', () => {
    expect(
      requireCinematicHomeOpeningStartupSequence([
        {
          ...bootingOpeningFacts,
          quality: 'medium',
        },
        {
          ...readyOpeningFacts,
          quality: 'medium',
        },
        {
          ...settledOpeningFacts,
          quality: 'medium',
        },
      ]),
    ).toEqual(['booting', 'ready', 'settled'])
  })

  it('rejects a ready → booting regression and a settled → active regression', () => {
    expect(() =>
      requireCinematicHomeOpeningStartupSequence([
        bootingOpeningFacts,
        readyOpeningFacts,
        bootingOpeningFacts,
        settledOpeningFacts,
      ]),
    ).toThrow(/ready|booting|regress|回退/i)

    expect(() =>
      requireCinematicHomeOpeningStartupSequence([
        bootingOpeningFacts,
        settledOpeningFacts,
        readyOpeningFacts,
      ]),
    ).toThrow(/settled|active|regress|回退|末帧/i)
  })

  it('requires the Home opening terminal frame to remain ready, demand, and settled', () => {
    expect(() =>
      requireCinematicHomeOpeningStartupSequence([
        bootingOpeningFacts,
        readyOpeningFacts,
      ]),
    ).toThrow(/terminal|末帧|settled/i)
  })

  it('admits a structurally non-empty 93-edge signature only for an explicit intermediate veil', () => {
    expect(
      requireCinematicPageSpatialSignature(
        intermediateVeilSignature,
        activeDetailVeilFacts,
        'detail veil',
      ),
    ).toBe(intermediateVeilSignature)

    expect(() =>
      requireCinematicPageSpatialSignature(
        intermediateVeilSignature,
        {
          ...activeDetailVeilFacts,
          handoffVeilVisible: false,
        },
        'non-veil frame',
      ),
    ).toThrow(/100|strong|强签名/i)

    expect(() =>
      requireCinematicPageSpatialSignature(
        intermediateVeilSignature,
        {
          ...activeDetailVeilFacts,
          navigationProgress: '1',
        },
        'terminal frame',
      ),
    ).toThrow(/100|strong|强签名/i)
  })

  it('admits a 93-edge Arc arriving frame only when its real route surface is visible', () => {
    expect(
      requireCinematicPageSpatialSignature(
        intermediateVeilSignature,
        activeArcRouteSurfaceFacts,
        'Arc arriving route surface',
      ),
    ).toBe(intermediateVeilSignature)
  })

  it.each([
    [
      'hidden route surface',
      {
        ...activeArcRouteSurfaceFacts,
        routeHandoffSurfaceVisible: false,
      },
    ],
    [
      'idle phase',
      {
        ...activeArcRouteSurfaceFacts,
        navigationPhase: 'idle',
      },
    ],
    [
      'zero progress',
      {
        ...activeArcRouteSurfaceFacts,
        navigationProgress: '0',
      },
    ],
    [
      'terminal progress',
      {
        ...activeArcRouteSurfaceFacts,
        navigationProgress: '1',
      },
    ],
    [
      'empty token',
      {
        ...activeArcRouteSurfaceFacts,
        navigationToken: '',
      },
    ],
    [
      'initial token',
      {
        ...activeArcRouteSurfaceFacts,
        navigationToken: '0',
      },
    ],
  ])('keeps the strong signature gate for %s', (_label, facts) => {
    expect(() =>
      requireCinematicPageSpatialSignature(
        intermediateVeilSignature,
        facts,
        _label,
      ),
    ).toThrow(/100|strong|强签名/i)
  })

  it('rejects empty or non-finite structural evidence even inside an intermediate veil', () => {
    expect(() =>
      requireCinematicPageSpatialSignature(
        {
          ...intermediateVeilSignature,
          bins: intermediateVeilSignature.bins.map(() => 0),
          edgeCount: 0,
        },
        activeDetailVeilFacts,
        'empty veil',
      ),
    ).toThrow(/edge|边缘|non-empty|非空/i)

    expect(() =>
      requireCinematicPageSpatialSignature(
        {
          ...intermediateVeilSignature,
          bins: intermediateVeilSignature.bins.map((_value, index) =>
            index === 12 ? 1 : 0,
          ),
        },
        activeDetailVeilFacts,
        'single-bin veil',
      ),
    ).toThrow(/bin|跨度|span/i)

    expect(() =>
      requireCinematicPageSpatialSignature(
        {
          ...intermediateVeilSignature,
          centroidX: Number.NaN,
        },
        activeDetailVeilFacts,
        'invalid veil',
      ),
    ).toThrow(/centroid|质心|finite|有限/i)
  })
})

function record(
  selector: ReturnType<typeof createSelector>,
  payload: CinematicScreencastPayload,
  acknowledge: (sessionId: number) => Promise<void> = async () => {},
) {
  selector.record(payload, acknowledge)
}

describe('cinematic screencast collection window', () => {
  it('keeps capture active through the last checkpoint plus the fixed 50ms gate', () => {
    expect(
      planCinematicScreencastCollection({
        browserNowMs: eventStartedAtMs + 100,
        checkpoints: [80, 170, 260, 350, 450, 570, 720],
        eventStartedAtMs,
      }),
    ).toEqual({
      deadlineMs: eventStartedAtMs + 770,
      waitMs: 670,
    })
  })

  it('returns zero wait when the trigger callback already consumed the window', () => {
    expect(
      planCinematicScreencastCollection({
        browserNowMs: eventStartedAtMs + 800,
        checkpoints: [100, 220, 920],
        eventStartedAtMs,
      }),
    ).toEqual({
      deadlineMs: eventStartedAtMs + 970,
      waitMs: 170,
    })
    expect(
      planCinematicScreencastCollection({
        browserNowMs: eventStartedAtMs + 971,
        checkpoints: [100, 220, 920],
        eventStartedAtMs,
      }).waitMs,
    ).toBe(0)
  })

  it.each([
    ['empty checkpoints', [], /checkpoint/i],
    ['unordered checkpoints', [100, 80], /checkpoint|increasing|order/i],
    ['duplicate checkpoints', [100, 100], /checkpoint|increasing|duplicate/i],
    ['non-finite checkpoints', [100, Number.NaN], /checkpoint|finite/i],
  ])('rejects %s', (_label, checkpoints, message) => {
    expect(() =>
      planCinematicScreencastCollection({
        browserNowMs: eventStartedAtMs + 10,
        checkpoints,
        eventStartedAtMs,
      }),
    ).toThrow(message)
  })

  it('rejects seconds masquerading as epoch milliseconds', () => {
    expect(() =>
      planCinematicScreencastCollection({
        browserNowMs: eventStartedAtMs / 1000 + 1,
        checkpoints: [100],
        eventStartedAtMs: eventStartedAtMs / 1000,
      }),
    ).toThrow(/epoch|millisecond/i)
  })

  it('rejects a browser clock earlier than the event anchor', () => {
    expect(() =>
      planCinematicScreencastCollection({
        browserNowMs: eventStartedAtMs - 1,
        checkpoints: [100],
        eventStartedAtMs,
      }),
    ).toThrow(/browser|event|clock/i)
  })
})

async function select(
  selector: ReturnType<typeof createSelector>,
  checkpoints: readonly number[],
  facts: readonly CinematicBrowserFacts<TestFacts>[],
  decodePng: (data: string) => Buffer = (data) => Buffer.from(data, 'base64'),
) {
  selector.bindEventStart(eventStartedAtMs)
  selector.beginStopping()

  const selection = await selector.finalize({
    checkpoints,
    decodePng,
    factsTimeline: facts,
  })

  return selection.checkpointFrames
}

async function selectWithEventBoundary(
  selector: ReturnType<typeof createSelector>,
  checkpoints: readonly number[],
  facts: readonly CinematicBrowserFacts<TestFacts>[],
) {
  selector.bindEventStart(eventStartedAtMs)
  selector.beginStopping()

  return selector.finalize({
    checkpoints,
    decodePng: (data) => Buffer.from(data, 'base64'),
    factsTimeline: facts,
    includeEventBoundary: true,
  })
}

describe('cinematic screencast checkpoint selector', () => {
  it('selects the post-frame facts boundary when only it exactly matches screencast scroll metadata', async () => {
    const selector = createSelector()
    const payload = makePayload(100)
    const afterFacts = makeFacts(101)

    record(selector, {
      ...payload,
      metadata: {
        ...payload.metadata,
        scrollOffsetY: 480,
      },
    })

    const [selected] = await select(selector, [100], [
      makeFacts(99),
      {
        ...afterFacts,
        visualViewport: {
          ...afterFacts.visualViewport,
          pageY: 480,
        },
      },
    ])

    expect(selected).toMatchObject({
      factsCapturedAtMs: eventStartedAtMs + 101,
      factsFrameAbsoluteSkewMs: 1,
      factsFrameSignedSkewMs: 1,
      factsVersion: 102,
      visualViewport: {
        pageY: 480,
      },
    })
  })

  it('prefers the pre-frame facts boundary when both adjacent facts exactly match metadata', async () => {
    const selector = createSelector()
    const sharedFacts = {
      progress: 'same-frame-state',
    }

    record(selector, makePayload(100))

    const [selected] = await select(selector, [100], [
      makeFacts(99, { facts: sharedFacts }),
      makeFacts(101, { facts: sharedFacts }),
    ])

    expect(selected).toMatchObject({
      factsCapturedAtMs: eventStartedAtMs + 99,
      factsFrameAbsoluteSkewMs: 1,
      factsFrameSignedSkewMs: -1,
      factsVersion: 100,
    })
  })

  it('searches the full local skew window when the immediate facts boundaries do not match metadata', async () => {
    const selector = createSelector()
    const payload = makePayload(100)
    const matchingFacts = makeFacts(90)

    record(selector, {
      ...payload,
      metadata: {
        ...payload.metadata,
        scrollOffsetY: 480,
      },
    })

    const [selected] = await select(selector, [100], [
      {
        ...matchingFacts,
        visualViewport: {
          ...matchingFacts.visualViewport,
          pageY: 480,
        },
      },
      makeFacts(99),
      makeFacts(101),
    ])

    expect(selected).toMatchObject({
      factsCapturedAtMs: eventStartedAtMs + 90,
      factsFrameAbsoluteSkewMs: 10,
      factsFrameSignedSkewMs: -10,
    })
  })

  it('selects the exact metadata match with the smallest absolute facts-to-frame skew', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))

    const [selected] = await select(selector, [100], [
      makeFacts(95),
      makeFacts(102),
    ])

    expect(selected).toMatchObject({
      factsCapturedAtMs: eventStartedAtMs + 102,
      factsFrameAbsoluteSkewMs: 2,
      factsFrameSignedSkewMs: 2,
    })
  })

  it('skips the first post-checkpoint raw frame when only a later frame within 50ms has an exact facts join', async () => {
    const selector = createSelector()
    const unmatched = makePayload(100)
    const matching = makePayload(130)
    const matchingFacts = makeFacts(129)

    record(selector, {
      ...unmatched,
      metadata: {
        ...unmatched.metadata,
        scrollOffsetY: 480,
      },
    })
    record(selector, matching)

    const [selected] = await select(selector, [100], [
      matchingFacts,
      makeFacts(149, {
        visualViewport: {
          ...matchingFacts.visualViewport,
          pageY: 240,
        },
      }),
    ])

    expect(selected).toMatchObject({
      actualOffsetMs: 130,
      factsCapturedAtMs: eventStartedAtMs + 129,
      factsFrameAbsoluteSkewMs: 1,
      latenessMs: 30,
    })
  })

  it('chooses one complete origin/timeOrigin context instead of the locally closest context', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))
    record(selector, makePayload(200))

    const selected = await select(selector, [100, 200], [
      makeFacts(100, {
        facts: {
          progress: 'local-only',
        },
        origin: 'http://a.test',
      }),
      makeFacts(102, {
        facts: {
          progress: 'complete-first',
        },
        origin: 'http://b.test',
      }),
      makeFacts(200, {
        facts: {
          progress: 'complete-second',
        },
        origin: 'http://b.test',
      }),
    ])

    expect(selected.map((frame) => frame.origin)).toEqual([
      'http://b.test',
      'http://b.test',
    ])
    expect(selected.map((frame) => frame.facts.progress)).toEqual([
      'complete-first',
      'complete-second',
    ])
  })

  it('uses a later raw frame when the locally earliest frame would make selected facts move backward', async () => {
    const selector = createSelector()
    const backwardFrame = makePayload(150)

    record(selector, makePayload(100))
    record(selector, {
      ...backwardFrame,
      metadata: {
        ...backwardFrame.metadata,
        scrollOffsetY: 480,
      },
    })
    record(selector, makePayload(170))

    const selected = await select(selector, [100, 150], [
      makeFacts(110, {
        facts: {
          progress: 'backward-local-choice',
        },
        visualViewport: {
          ...makeFacts(110).visualViewport,
          pageY: 480,
        },
      }),
      makeFacts(140, {
        facts: {
          progress: 'first-checkpoint',
        },
      }),
      makeFacts(170, {
        facts: {
          progress: 'second-checkpoint',
        },
      }),
    ])

    expect(selected.map((frame) => frame.actualOffsetMs)).toEqual([100, 170])
    expect(selected.map((frame) => frame.factsCapturedAtMs)).toEqual([
      eventStartedAtMs + 140,
      eventStartedAtMs + 170,
    ])
    expect(selected.map((frame) => frame.factsVersion)).toEqual([141, 171])
  })

  it('disqualifies an equal-skew different-facts raw/context join and selects a later unambiguous raw frame', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))
    record(selector, makePayload(120))

    const [selected] = await select(selector, [100], [
      makeFacts(99, {
        facts: {
          progress: 'ambiguous-before',
        },
      }),
      makeFacts(101, {
        facts: {
          progress: 'ambiguous-after',
        },
      }),
      makeFacts(120, {
        facts: {
          progress: 'unambiguous-later-frame',
        },
      }),
    ])

    expect(selected).toMatchObject({
      actualOffsetMs: 120,
      facts: {
        progress: 'unambiguous-later-frame',
      },
      factsFrameAbsoluteSkewMs: 0,
      latenessMs: 20,
    })
  })

  it('fails closed when equally ranked contexts produce different facts sequences', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))

    await expect(
      select(selector, [100], [
        makeFacts(99, {
          facts: {
            progress: 'context-a',
          },
          origin: 'http://a.test',
        }),
        makeFacts(101, {
          facts: {
            progress: 'context-b',
          },
          origin: 'http://b.test',
        }),
      ]),
    ).rejects.toThrow(/ambiguous|context|facts/i)
  })

  it('deterministically selects equally ranked contexts only when their facts sequences are identical', async () => {
    const selector = createSelector()
    const sharedFacts = {
      progress: 'shared-context-facts',
    }

    record(selector, makePayload(100))

    const [selected] = await select(selector, [100], [
      makeFacts(99, {
        facts: sharedFacts,
        origin: 'http://a.test',
      }),
      makeFacts(101, {
        facts: sharedFacts,
        origin: 'http://b.test',
      }),
    ])

    expect(selected).toMatchObject({
      facts: sharedFacts,
      origin: 'http://a.test',
    })
  })

  it('keeps the first qualified raw frame even when a later frame has a smaller facts skew', async () => {
    const selector = createSelector()
    const laterFrame = makePayload(110)
    const laterFacts = makeFacts(110)

    record(selector, makePayload(100))
    record(selector, {
      ...laterFrame,
      metadata: {
        ...laterFrame.metadata,
        scrollOffsetY: 480,
      },
    })

    const [selected] = await select(selector, [100], [
      {
        ...laterFacts,
        visualViewport: {
          ...laterFacts.visualViewport,
          pageY: 480,
        },
      },
      makeFacts(149, {
        facts: {
          progress: 'earliest-qualified-frame',
        },
      }),
    ])

    expect(selected).toMatchObject({
      actualOffsetMs: 100,
      facts: {
        progress: 'earliest-qualified-frame',
      },
      factsFrameAbsoluteSkewMs: 49,
    })
  })

  it('fails closed when equal-skew exact metadata candidates contain different facts', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))

    await expect(
      select(selector, [100], [makeFacts(99), makeFacts(101)]),
    ).rejects.toThrow(/ambiguous|facts|skew/i)
  })

  it('fails closed when neither adjacent facts boundary exactly matches viewport scale and scroll', async () => {
    const selector = createSelector()
    const payload = makePayload(100)
    const afterFacts = makeFacts(101)

    record(selector, {
      ...payload,
      metadata: {
        ...payload.metadata,
        scrollOffsetY: 480,
      },
    })

    await expect(
      select(selector, [100], [
        makeFacts(99),
        {
          ...afterFacts,
          visualViewport: {
            ...afterFacts.visualViewport,
            pageY: 240,
          },
        },
      ]),
    ).rejects.toThrow(/viewport|scale|scroll|match/i)
  })

  it.each([
    ['before', 50, -50],
    ['after', 150, 50],
  ])('accepts the exact 50ms facts-to-frame skew boundary %s the frame', async (
    _label,
    factsOffsetMs,
    expectedSignedSkewMs,
  ) => {
    const selector = createSelector()

    record(selector, makePayload(100))

    const [selected] = await select(selector, [100], [makeFacts(factsOffsetMs)])

    expect(selected).toMatchObject({
      factsFrameAbsoluteSkewMs: 50,
      factsFrameSignedSkewMs: expectedSignedSkewMs,
    })
  })

  it('fails closed above the 50ms facts-to-frame skew boundary by epsilon', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))

    await expect(
      select(selector, [100], [
        makeFacts(150.001, {
          version: 151,
        }),
      ]),
    ).rejects.toThrow(/50ms|skew/i)
  })

  it('includes frame metadata, local-window candidates, and nearest boundaries in no-match diagnostics', async () => {
    const selector = createSelector()
    const payload = makePayload(100)

    record(selector, {
      ...payload,
      metadata: {
        ...payload.metadata,
        scrollOffsetY: 480,
      },
    })

    let failure: unknown

    try {
      await select(selector, [100], [makeFacts(99), makeFacts(101)])
    } catch (error) {
      failure = error
    }

    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toMatch(/frame metadata/i)
    expect((failure as Error).message).toMatch(/window candidates/i)
    expect((failure as Error).message).toMatch(/nearest before/i)
    expect((failure as Error).message).toMatch(/nearest after/i)
  })

  it('fails closed when selected facts capturedAt/version would move backward across frames', async () => {
    const selector = createSelector()
    const firstPayload = makePayload(100)
    const secondPayload = makePayload(150)
    const earlierFacts = makeFacts(110)
    const laterFacts = makeFacts(140)

    record(selector, firstPayload)
    record(selector, {
      ...secondPayload,
      metadata: {
        ...secondPayload.metadata,
        scrollOffsetY: 480,
      },
    })

    await expect(
      select(selector, [100, 150], [
        {
          ...earlierFacts,
          visualViewport: {
            ...earlierFacts.visualViewport,
            pageY: 480,
          },
        },
        laterFacts,
      ]),
    ).rejects.toThrow(/facts|backward|nondecreasing|version/i)
  })

  it('separates the earliest raw event boundary, real event facts anchor, and fixed checkpoint evidence', async () => {
    const selector = createSelector()

    for (const offsetMs of [-1, 77.508, 170]) {
      record(selector, makePayload(offsetMs))
    }

    const selection = await selectWithEventBoundary(selector, [160], [
      makeFacts(4, {
        facts: {
          progress: 'event-anchor',
        },
        version: 5,
      }),
      makeFacts(191, {
        facts: {
          progress: 'fixed-frame',
        },
        version: 192,
      }),
    ])

    expect(selection.eventBoundary).toMatchObject({
      latenessMs: null,
      plannedCheckpointMs: null,
      previousFrameSwapAtMs: eventStartedAtMs - 1,
      selectionKind: 'event-boundary',
    })
    expect(selection.eventBoundary?.actualOffsetMs).toBeCloseTo(77.508, 3)
    expect(selection.eventBoundary?.png).toBeInstanceOf(Buffer)
    expect(selection.eventBoundary?.metadata.timestamp).toBe(
      (eventStartedAtMs + 77.508) / 1000,
    )
    expect(selection.eventBoundary).not.toHaveProperty('facts')
    expect(selection.eventBoundary).not.toHaveProperty('factsCapturedAtMs')
    expect(selection.eventBoundary).not.toHaveProperty('factsFrameAbsoluteSkewMs')
    expect(selection.eventBoundary).not.toHaveProperty('origin')
    expect(selection.eventBoundary).not.toHaveProperty('timeOriginMs')
    expect(selection.eventBoundary).not.toHaveProperty('visualViewport')
    expect(selection.eventFactsAnchor).toMatchObject({
      capturedAtMs: eventStartedAtMs + 4,
      eventAbsoluteSkewMs: 4,
      eventSignedSkewMs: 4,
      facts: {
        progress: 'event-anchor',
      },
      origin: 'http://127.0.0.1:3100',
      selectionKind: 'event-facts-anchor',
      timeOriginMs: eventStartedAtMs - 5000,
      version: 5,
    })
    expect(
      selection.eventFactsAnchor?.anchorToBoundarySignedSkewMs,
    ).toBeCloseTo(-73.508, 3)
    expect(selection.checkpointFrames).toHaveLength(1)
    expect(selection.checkpointFrames[0]).toMatchObject({
      actualOffsetMs: 170,
      facts: {
        progress: 'fixed-frame',
      },
      factsCapturedAtMs: eventStartedAtMs + 191,
      factsFrameAbsoluteSkewMs: 21,
      factsFrameSignedSkewMs: 21,
      latenessMs: 10,
      plannedCheckpointMs: 160,
      selectionKind: 'fixed-checkpoint',
    })
  })

  it('chooses the absolute earliest post-event raw frame and records its true predecessor', async () => {
    const selector = createSelector()

    for (const offsetMs of [-20, -1, 77.508, 100, 170]) {
      record(selector, makePayload(offsetMs))
    }

    const selection = await selectWithEventBoundary(selector, [160], [
      makeFacts(4, { version: 5 }),
      makeFacts(170),
    ])

    expect(selection.eventBoundary?.actualOffsetMs).toBeCloseTo(77.508, 3)
    expect(selection.eventBoundary?.previousFrameSwapAtMs).toBe(
      eventStartedAtMs - 1,
    )
    expect(
      selection.eventBoundary?.previousFrameSwapAtMs ??
        Number.POSITIVE_INFINITY,
    ).toBeLessThan(eventStartedAtMs)
  })

  it.each([
    ['before', -50, -50],
    ['after', 50, 50],
  ])('accepts an event facts anchor exactly 50ms %s the event', async (
    _label,
    factsOffsetMs,
    expectedSignedSkewMs,
  ) => {
    const selector = createSelector()

    record(selector, makePayload(20))
    record(selector, makePayload(100))

    const selection = await selectWithEventBoundary(selector, [100], [
      makeFacts(factsOffsetMs, {
        version: factsOffsetMs < 0 ? 1 : factsOffsetMs + 1,
      }),
      makeFacts(100, { version: 101 }),
    ])

    expect(selection.eventFactsAnchor).toMatchObject({
      eventAbsoluteSkewMs: 50,
      eventSignedSkewMs: expectedSignedSkewMs,
    })
  })

  it('rejects an event facts anchor above 50ms by epsilon', async () => {
    const selector = createSelector()

    record(selector, makePayload(20))
    record(selector, makePayload(100))

    await expect(
      selectWithEventBoundary(selector, [100], [
        makeFacts(50.001, { version: 51 }),
        makeFacts(100, { version: 101 }),
      ]),
    ).rejects.toThrow(/event|anchor|50ms|skew/i)
  })

  it('fails closed when the event facts anchor does not exactly match boundary viewport metadata', async () => {
    const selector = createSelector()
    const boundary = makePayload(20)

    record(selector, {
      ...boundary,
      metadata: {
        ...boundary.metadata,
        scrollOffsetY: 480,
      },
    })
    record(selector, makePayload(100))

    await expect(
      selectWithEventBoundary(selector, [100], [
        makeFacts(4, { version: 5 }),
        makeFacts(100, { version: 101 }),
      ]),
    ).rejects.toThrow(/event|anchor|viewport|scale|scroll|match/i)
  })

  it('does not let event-boundary or event-anchor evidence bypass a missing fixed checkpoint gate', async () => {
    const selector = createSelector()

    record(selector, makePayload(77.508))
    record(selector, makePayload(211))

    await expect(
      selectWithEventBoundary(selector, [160], [
        makeFacts(4, { version: 5 }),
        makeFacts(191, { version: 192 }),
      ]),
    ).rejects.toThrow(/checkpoint|lateness|50ms/i)
  })

  it('selects the event facts anchor and fixed checkpoints as one complete context path', async () => {
    const selector = createSelector()

    record(selector, makePayload(20))
    record(selector, makePayload(100))

    const selection = await selectWithEventBoundary(selector, [100], [
      makeFacts(0, {
        facts: {
          progress: 'locally-closest-incomplete-anchor',
        },
        origin: 'http://a.test',
      }),
      makeFacts(10, {
        facts: {
          progress: 'complete-context-anchor',
        },
        origin: 'http://b.test',
      }),
      makeFacts(100, {
        facts: {
          progress: 'complete-context-fixed',
        },
        origin: 'http://b.test',
      }),
    ])

    expect(selection.eventFactsAnchor).toMatchObject({
      eventAbsoluteSkewMs: 10,
      facts: {
        progress: 'complete-context-anchor',
      },
      origin: 'http://b.test',
    })
    expect(selection.checkpointFrames[0]).toMatchObject({
      actualOffsetMs: 100,
      facts: {
        progress: 'complete-context-fixed',
      },
      origin: 'http://b.test',
    })
  })

  it('never reuses the event-boundary raw frame as a fixed checkpoint frame', async () => {
    const selector = createSelector()

    record(selector, makePayload(170))
    record(selector, makePayload(171))

    const selection = await selectWithEventBoundary(selector, [160], [
      makeFacts(4, { version: 5 }),
      makeFacts(170, { version: 171 }),
    ])

    expect(selection.eventBoundary?.actualOffsetMs).toBe(170)
    expect(selection.checkpointFrames[0].actualOffsetMs).toBe(171)
    expect(selection.checkpointFrames[0].sessionId).toBe(
      selection.eventBoundary?.sessionId,
    )
  })

  it('fails closed when equal event-skew exact anchors contain different facts', async () => {
    const selector = createSelector()

    record(selector, makePayload(20))
    record(selector, makePayload(100))

    await expect(
      selectWithEventBoundary(selector, [100], [
        makeFacts(-4, {
          facts: {
            progress: 'before-event',
          },
          version: 1,
        }),
        makeFacts(4, {
          facts: {
            progress: 'after-event',
          },
          version: 5,
        }),
        makeFacts(100, { version: 101 }),
      ]),
    ).rejects.toThrow(/event|anchor|ambiguous|facts|skew/i)
  })

  it('fails closed when event-boundary evidence has no post-event raw frame', async () => {
    const selector = createSelector()

    record(selector, makePayload(-20))
    record(selector, makePayload(-1))

    await expect(
      selectWithEventBoundary(selector, [100], [makeFacts(-1, { version: 1 })]),
    ).rejects.toThrow(/event|boundary|post-event/i)
  })

  it('selects the first post-checkpoint frame and never the preceding frame', async () => {
    const selector = createSelector()

    record(selector, makePayload(99))
    record(selector, makePayload(101))

    const [selected] = await select(selector, [100], [
      makeFacts(90),
      makeFacts(100),
    ])

    expect(selected).toMatchObject({
      actualOffsetMs: 101,
      factsVersion: 101,
      frameSwapAtMs: eventStartedAtMs + 101,
      latenessMs: 1,
      plannedCheckpointMs: 100,
      sessionId: screencastSessionId,
    })
  })

  it('selects chronological frames from one stable session without reuse and ACKs every event once', async () => {
    const selector = createSelector()
    const acknowledged: number[] = []

    for (const offsetMs of [99, 101, 151]) {
      record(selector, makePayload(offsetMs), async (sessionId) => {
        acknowledged.push(sessionId)
      })
    }

    const selected = await select(selector, [100, 150], [
      makeFacts(90),
      makeFacts(100),
      makeFacts(150),
    ])

    expect(selected.map((frame) => frame.actualOffsetMs)).toEqual([101, 151])
    expect(selected.map((frame) => frame.sessionId)).toEqual([
      screencastSessionId,
      screencastSessionId,
    ])
    expect(acknowledged).toEqual([
      screencastSessionId,
      screencastSessionId,
      screencastSessionId,
    ])
  })

  it('canonicalizes unique encode-completion inversion without detaching PNG identity or arrival ACKs', async () => {
    const selector = createSelector()
    const acknowledgedArrivals: number[] = []
    const frames = new Map<number, ReturnType<typeof makeDistinctPayload>>(
      [
        [151, makeDistinctPayload(151, 0x51)],
        [101, makeDistinctPayload(101, 0x31)],
        [201, makeDistinctPayload(201, 0x71)],
      ],
    )

    for (const offsetMs of [151, 101, 201]) {
      const frame = frames.get(offsetMs)

      expect(frame).toBeDefined()
      record(selector, frame!.payload, async () => {
        acknowledgedArrivals.push(offsetMs)
      })
    }

    const selected = await select(selector, [100, 150, 200], [
      makeFacts(101),
      makeFacts(151),
      makeFacts(201),
    ])

    expect(selected.map((frame) => frame.actualOffsetMs)).toEqual([
      101, 151, 201,
    ])
    expect(selected.map((frame) => frame.png)).toEqual([
      frames.get(101)!.png,
      frames.get(151)!.png,
      frames.get(201)!.png,
    ])
    expect(selected.map((frame) => frame.pngSha256)).toEqual(
      [101, 151, 201].map((offsetMs) =>
        createHash('sha256').update(frames.get(offsetMs)!.png).digest('hex'),
      ),
    )
    expect(acknowledgedArrivals).toEqual([151, 101, 201])
  })

  it('canonicalizes a Home-like inverted arrival around the event boundary and true predecessor', async () => {
    const selector = createSelector()
    const acknowledgedArrivals: number[] = []
    const arrivals = [
      makeDistinctPayload(260, 0x64),
      makeDistinctPayload(170, 0x54),
      makeDistinctPayload(-1, 0x14),
      makeDistinctPayload(77.508, 0x34),
    ]

    arrivals.forEach((frame, arrivalIndex) => {
      const offsetMs = [260, 170, -1, 77.508][arrivalIndex]

      record(selector, frame.payload, async () => {
        acknowledgedArrivals.push(offsetMs)
      })
    })

    const selection = await selectWithEventBoundary(selector, [160, 250], [
      makeFacts(4, { version: 5 }),
      makeFacts(170),
      makeFacts(260),
    ])

    expect(selection.eventBoundary?.actualOffsetMs).toBeCloseTo(77.508, 3)
    expect(selection.eventBoundary?.previousFrameSwapAtMs).toBe(
      eventStartedAtMs - 1,
    )
    expect(selection.eventBoundary?.png).toEqual(arrivals[3].png)
    expect(selection.eventBoundary?.pngSha256).toBe(
      createHash('sha256').update(arrivals[3].png).digest('hex'),
    )
    expect(
      selection.checkpointFrames.map((frame) => frame.actualOffsetMs),
    ).toEqual([170, 260])
    expect(selection.checkpointFrames.map((frame) => frame.png)).toEqual([
      arrivals[1].png,
      arrivals[0].png,
    ])
    expect(
      selection.checkpointFrames.map((frame) => frame.pngSha256),
    ).toEqual(
      [arrivals[1].png, arrivals[0].png].map((png) =>
        createHash('sha256').update(png).digest('hex'),
      ),
    )
    expect(acknowledgedArrivals).toEqual([260, 170, -1, 77.508])
  })

  it('accepts the exact 50ms lateness boundary', async () => {
    const selector = createSelector()

    record(selector, makePayload(150))

    const [selected] = await select(selector, [100], [makeFacts(140)])

    expect(selected.latenessMs).toBe(50)
  })

  it('fails closed above the 50ms lateness boundary', async () => {
    const selector = createSelector()

    record(selector, makePayload(150.001))

    await expect(select(selector, [100], [makeFacts(140)])).rejects.toThrow(
      /50ms|lateness/i,
    )
  })

  it('uses each chronological raw frame at most once across overlapping checkpoint windows', async () => {
    const selector = createSelector()

    record(selector, makePayload(101))
    record(selector, makePayload(102))

    const selected = await select(selector, [100, 101], [
      makeFacts(101),
      makeFacts(102),
    ])

    expect(selected.map((frame) => frame.actualOffsetMs)).toEqual([101, 102])
    expect(selected[1].frameSwapAtMs).toBeGreaterThan(selected[0].frameSwapAtMs)
  })

  it('does not reuse one screencast frame for two checkpoints', async () => {
    const selector = createSelector()

    record(selector, makePayload(101))

    await expect(select(selector, [100, 101], [makeFacts(100)])).rejects.toThrow(
      /reuse|unique|checkpoint/i,
    )
  })

  it.each([
    [
      'missing timestamp',
      [
        makePayload(100, {
          metadata: {
            ...makePayload(100).metadata,
            timestamp: undefined,
          },
        }),
      ],
      /timestamp/i,
    ],
    [
      'duplicate timestamp with the same PNG',
      [makePayload(100), makePayload(100)],
      /timestamp|duplicate/i,
    ],
    [
      'duplicate timestamp with different PNGs',
      [
        makeDistinctPayload(100, 0x21).payload,
        makeDistinctPayload(100, 0x22).payload,
      ],
      /timestamp|duplicate/i,
    ],
  ])('rejects %s', async (_label, payloads, message) => {
    const selector = createSelector()
    const decodePng = vi.fn((data: string) => Buffer.from(data, 'base64'))

    payloads.forEach((payload) => record(selector, payload))

    await expect(
      select(selector, [100], [makeFacts(99)], decodePng),
    ).rejects.toThrow(message)
    expect(decodePng).not.toHaveBeenCalled()
  })

  it('fails closed when adjacent raw timestamp Numbers project to one frameSwapAtMs key', async () => {
    const selector = createSelector()
    const decodePng = vi.fn((data: string) => Buffer.from(data, 'base64'))
    const rawTimestamp = 1_800_000_000.000005
    const neighboringTimestamp = nextRepresentableNumber(rawTimestamp)
    const projectedFrameSwapAtMs =
      cdpTimestampSecondsToEpochMilliseconds(rawTimestamp)

    expect(neighboringTimestamp).not.toBe(rawTimestamp)
    expect(
      cdpTimestampSecondsToEpochMilliseconds(neighboringTimestamp),
    ).toBe(projectedFrameSwapAtMs)

    for (const [timestamp, marker] of [
      [rawTimestamp, 0x23],
      [neighboringTimestamp, 0x24],
    ] as const) {
      const frame = makeDistinctPayload(0, marker)

      record(selector, {
        ...frame.payload,
        metadata: {
          ...frame.payload.metadata,
          timestamp,
        },
      })
    }

    await expect(
      select(selector, [0], [makeFacts(0)], decodePng),
    ).rejects.toThrow(/duplicate|timestamp/i)
    expect(decodePng).not.toHaveBeenCalled()
  })

  it('retains the same PNG bytes at distinct timestamps as distinct frames', async () => {
    const selector = createSelector()
    const sharedPng = makeDistinctPayload(101, 0x41).png

    record(
      selector,
      makePayload(101, { data: sharedPng.toString('base64') }),
    )
    record(
      selector,
      makePayload(151, { data: sharedPng.toString('base64') }),
    )

    const selected = await select(selector, [100, 150], [
      makeFacts(101),
      makeFacts(151),
    ])

    expect(selected.map((frame) => frame.actualOffsetMs)).toEqual([101, 151])
    expect(selected.map((frame) => frame.png)).toEqual([sharedPng, sharedPng])
    expect(new Set(selected.map((frame) => frame.pngSha256))).toHaveLength(1)
  })

  it('rejects a CDP seconds value passed as an event epoch and never guesses units', () => {
    const selector = createSelector()

    expect(() => selector.bindEventStart(eventStartedAtMs / 1000)).toThrow(
      /epoch|millisecond/i,
    )
  })

  it('fails closed when the frame ring overflows', async () => {
    const selector = createSelector({ maxFrames: 1 })

    record(selector, makePayload(100))
    record(selector, makePayload(120))

    await expect(select(selector, [100], [makeFacts(99)])).rejects.toThrow(
      /ring|frame|overflow/i,
    )
  })

  it('fails closed when encoded frame bytes overflow', async () => {
    const selector = createSelector({ maxEncodedBytes: 1 })

    record(selector, makePayload(100))

    await expect(select(selector, [100], [makeFacts(99)])).rejects.toThrow(
      /byte|overflow/i,
    )
  })
})

describe('cinematic screencast ACK lifecycle', () => {
  it('ACKs every frame exactly once before any PNG decode', async () => {
    const selector = createSelector()
    const operations: string[] = []

    record(selector, makePayload(100), async (sessionId) => {
      operations.push(`ack:${sessionId}`)
    })

    const [selected] = await select(
      selector,
      [100],
      [makeFacts(99)],
      (data) => {
        operations.push('decode')

        return Buffer.from(data, 'base64')
      },
    )

    expect(operations).toEqual([`ack:${screencastSessionId}`, 'decode'])
    expect(selected.pngSha256).toBe(
      createHash('sha256').update(selected.png).digest('hex'),
    )
  })

  it('poisons the recorder on ACK failure and never decodes', async () => {
    const selector = createSelector()
    const decodePng = vi.fn((data: string) => Buffer.from(data, 'base64'))

    record(selector, makePayload(100), async () => {
      throw new Error('ACK poison')
    })

    await expect(
      select(selector, [100], [makeFacts(99)], decodePng),
    ).rejects.toThrow(/ACK poison/)
    expect(decodePng).not.toHaveBeenCalled()
  })

  it('waits for reverse-order ACK completion before decoding canonical frames', async () => {
    const selector = createSelector()
    const ackResolvers = new Map<number, () => void>()
    const decodePng = vi.fn((data: string) => Buffer.from(data, 'base64'))

    for (const offsetMs of [151, 101, 201]) {
      record(
        selector,
        makeDistinctPayload(offsetMs, offsetMs % 256).payload,
        () =>
          new Promise<void>((resolve) => {
            ackResolvers.set(offsetMs, resolve)
          }),
      )
    }

    const finalizePromise = select(
      selector,
      [100, 150, 200],
      [makeFacts(101), makeFacts(151), makeFacts(201)],
      decodePng,
    )
    let finalizeSettled = false

    void finalizePromise.then(
      () => {
        finalizeSettled = true
      },
      () => {
        finalizeSettled = true
      },
    )
    await Promise.resolve()
    expect(finalizeSettled).toBe(false)
    expect(decodePng).not.toHaveBeenCalled()

    for (const offsetMs of [201, 101]) {
      ackResolvers.get(offsetMs)!()
      await Promise.resolve()
      expect(finalizeSettled).toBe(false)
      expect(decodePng).not.toHaveBeenCalled()
    }

    ackResolvers.get(151)!()
    const selected = await finalizePromise

    expect(selected.map((frame) => frame.actualOffsetMs)).toEqual([
      101, 151, 201,
    ])
    expect(decodePng).toHaveBeenCalledTimes(3)
  })

  it('ACKs but does not select a better frame received while stopping', async () => {
    const selector = createSelector()
    const acknowledgedArrivals: number[] = []
    const recorded = makeDistinctPayload(150, 0x61)
    const stopping = makeDistinctPayload(100, 0x62)

    record(selector, recorded.payload, async () => {
      acknowledgedArrivals.push(150)
    })
    selector.bindEventStart(eventStartedAtMs)
    selector.beginStopping()
    selector.beginStopping()
    record(selector, stopping.payload, async () => {
      acknowledgedArrivals.push(100)
    })

    const { checkpointFrames } = await selector.finalize({
      checkpoints: [100],
      decodePng: (data) => Buffer.from(data, 'base64'),
      factsTimeline: [makeFacts(140)],
    })
    const [selected] = checkpointFrames

    expect(acknowledgedArrivals).toEqual([150, 100])
    expect(selected.actualOffsetMs).toBe(150)
    expect(selected.png).toEqual(recorded.png)
    expect(selected.png).not.toEqual(stopping.png)
    expect(selected.sessionId).toBe(screencastSessionId)
    expect(() => selector.close()).not.toThrow()
    expect(() => selector.close()).not.toThrow()
  })

  it('fails closed when the CDP session closes unexpectedly', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))
    selector.markSessionClosed()

    await expect(select(selector, [100], [makeFacts(99)])).rejects.toThrow(
      /session|closed/i,
    )
  })
})

describe('cinematic screencast frame integrity', () => {
  it('fails closed when one recorder receives frames from different sessions', async () => {
    const selector = createSelector()
    const decodePng = vi.fn((data: string) => Buffer.from(data, 'base64'))

    record(selector, makePayload(100))
    record(selector, makePayload(120, { sessionId: screencastSessionId + 1 }))

    await expect(
      select(selector, [100], [makeFacts(99)], decodePng),
    ).rejects.toThrow(/session|contamination|stable/i)
    expect(decodePng).not.toHaveBeenCalled()
  })

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects non-positive or unsafe sessionId %s',
    async (sessionId) => {
      const selector = createSelector()

      record(selector, makePayload(100, { sessionId }))

      await expect(select(selector, [100], [makeFacts(99)])).rejects.toThrow(
        /sessionId|positive|safe/i,
      )
    },
  )

  it.each([
    [
      'viewport',
      makePayload(100, {
        metadata: {
          ...makePayload(100).metadata,
          deviceWidth: 1280,
        },
      }),
      makeFacts(99),
      makePng(),
      /viewport|width/i,
    ],
    [
      'PNG dimensions',
      makePayload(100),
      makeFacts(99),
      makePng(719, 500),
      /PNG|dimension|720/i,
    ],
    [
      'page scale',
      makePayload(100, {
        metadata: {
          ...makePayload(100).metadata,
          pageScaleFactor: 1.25,
        },
      }),
      makeFacts(99),
      makePng(),
      /scale/i,
    ],
    [
      'visual viewport scale',
      makePayload(100),
      makeFacts(99, {
        visualViewport: {
          ...makeFacts(99).visualViewport,
          scale: 1.25,
        },
      }),
      makePng(),
      /scale/i,
    ],
    [
      'scroll offset',
      makePayload(100, {
        metadata: {
          ...makePayload(100).metadata,
          scrollOffsetY: 480,
        },
      }),
      makeFacts(99),
      makePng(),
      /scroll|viewport/i,
    ],
  ])('rejects %s mismatch', async (_label, payload, facts, png, message) => {
    const selector = createSelector()

    record(selector, payload)

    await expect(
      select(selector, [100], [facts], () => png),
    ).rejects.toThrow(message)
  })

  it('rejects an invalid PNG signature and IHDR', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))

    await expect(
      select(selector, [100], [makeFacts(99)], () => Buffer.alloc(33)),
    ).rejects.toThrow(/PNG|IHDR/i)
  })

  it('fails when no adjacent browser facts exist for the frame swap', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))

    await expect(select(selector, [100], [])).rejects.toThrow(
      /facts|adjacent/i,
    )
  })

  it('requires a stable page origin and performance time origin', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))
    record(selector, makePayload(200))

    await expect(
      select(selector, [100, 200], [
        makeFacts(99),
        makeFacts(199, {
          origin: 'http://localhost:3100',
        }),
      ]),
    ).rejects.toThrow(/origin/i)
  })

  it('proves the event absoluteTime belongs to the selected page time origin', async () => {
    const selector = createSelector()

    record(selector, makePayload(100))

    await expect(
      select(selector, [100], [
        makeFacts(99, {
          timeOriginMs: eventStartedAtMs + 1,
        }),
      ]),
    ).rejects.toThrow(/event|timeOrigin/i)
  })
})
