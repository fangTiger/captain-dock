import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

export const CINEMATIC_MAXIMUM_LATENESS_MS = 50
const CINEMATIC_MAXIMUM_FACTS_FRAME_SKEW_MS = 50

export type CinematicScreencastMetadata = Readonly<{
  deviceHeight: number
  deviceWidth: number
  offsetTop: number
  pageScaleFactor: number
  scrollOffsetX: number
  scrollOffsetY: number
  timestamp?: number
}>

export type CinematicScreencastPayload = Readonly<{
  data: string
  metadata: CinematicScreencastMetadata
  sessionId: number
}>

export type CinematicVisualViewport = Readonly<{
  height: number
  pageX: number
  pageY: number
  scale: number
  width: number
}>

export type CinematicBrowserFacts<TFacts> = Readonly<{
  capturedAtMs: number
  facts: TFacts
  origin: string
  timeOriginMs: number
  version: number
  visualViewport: CinematicVisualViewport
}>

type SelectedCinematicFrameEvidence<TFacts> = Readonly<{
  actualOffsetMs: number
  facts: TFacts
  factsCapturedAtMs: number
  factsFrameAbsoluteSkewMs: number
  factsFrameSignedSkewMs: number
  factsVersion: number
  frameSwapAtMs: number
  metadata: CinematicScreencastMetadata
  origin: string
  png: Buffer
  pngSha256: string
  sessionId: number
  timeOriginMs: number
  visualViewport: CinematicVisualViewport
}>

export type SelectedCinematicScreencastFrame<TFacts> =
  SelectedCinematicFrameEvidence<TFacts> &
    Readonly<{
      latenessMs: number
      plannedCheckpointMs: number
      selectionKind: 'fixed-checkpoint'
    }>

export type SelectedCinematicEventBoundaryFrame = Readonly<{
  actualOffsetMs: number
  frameSwapAtMs: number
  latenessMs: null
  metadata: CinematicScreencastMetadata
  plannedCheckpointMs: null
  png: Buffer
  pngSha256: string
  previousFrameSwapAtMs: number | null
  selectionKind: 'event-boundary'
  sessionId: number
}>

export type SelectedCinematicEventFactsAnchor<TFacts> = Readonly<{
  anchorToBoundarySignedSkewMs: number
  capturedAtMs: number
  eventAbsoluteSkewMs: number
  eventSignedSkewMs: number
  facts: TFacts
  origin: string
  selectionKind: 'event-facts-anchor'
  timeOriginMs: number
  version: number
  visualViewport: CinematicVisualViewport
}>

export type CinematicScreencastSelection<TFacts> = Readonly<{
  checkpointFrames: SelectedCinematicScreencastFrame<TFacts>[]
  eventBoundary: SelectedCinematicEventBoundaryFrame | null
  eventFactsAnchor: SelectedCinematicEventFactsAnchor<TFacts> | null
}>

type SelectorOptions = Readonly<{
  expectedImageScale: number
  expectedViewport: Readonly<{
    height: number
    width: number
  }>
  maxEncodedBytes: number
  maxFrames: number
}>

type FinalizeOptions<TFacts> = Readonly<{
  checkpoints: readonly number[]
  decodePng: (data: string) => Buffer
  factsTimeline: readonly CinematicBrowserFacts<TFacts>[]
  includeEventBoundary?: boolean
}>

type RawFrame = Readonly<{
  payload: CinematicScreencastPayload
  sequence: number
}>

type RecorderState = 'recording' | 'stopping' | 'closed'

export type CinematicHomeOpeningStartupFacts = Readonly<{
  canvasCount: number
  frameloop: string | null
  path: string
  quality: string | null
  ready: string | null
  renderState: string | null
  scene: string | null
  settled: string | null
}>

export type CinematicHomeOpeningStartupPhase =
  | 'static'
  | 'booting'
  | 'ready'
  | 'settled'

export type CinematicEnhancedQuality = 'high' | 'medium'

export type CinematicPageSpatialSignature = Readonly<{
  bins: readonly number[]
  centroidX: number
  centroidY: number
  edgeCount: number
}>

export type CinematicIntermediateHandoffFacts = Readonly<{
  handoffVeilVisible: boolean
  navigationPhase: string | null
  navigationProgress: string | null
  navigationToken: string | null
  routeHandoffSurfaceVisible: boolean
}>

const homeOpeningPhaseRank: Readonly<
  Record<CinematicHomeOpeningStartupPhase, number>
> = {
  static: 0,
  booting: 1,
  ready: 2,
  settled: 3,
}

function requireHomeOpeningFacts(
  facts: CinematicHomeOpeningStartupFacts,
  expected: Readonly<
    Partial<Record<keyof CinematicHomeOpeningStartupFacts, string | number>>
  >,
  label: string,
) {
  for (const [key, value] of Object.entries(expected)) {
    if (facts[key as keyof CinematicHomeOpeningStartupFacts] !== value) {
      throw new Error(
        `${label} 的 ${key} 必须是 ${String(value)}，实际为 ${String(
          facts[key as keyof CinematicHomeOpeningStartupFacts],
        )}。`,
      )
    }
  }
}

export function requireCinematicEnhancedQuality(
  quality: unknown,
  label = 'cinematic evidence',
): CinematicEnhancedQuality {
  if (quality !== 'high' && quality !== 'medium') {
    throw new Error(
      `${label} 的 quality 必须是 high 或 medium，实际为 ${String(quality)}。`,
    )
  }

  return quality
}

function classifyHomeOpeningStartupFacts(
  facts: CinematicHomeOpeningStartupFacts,
  label: string,
): CinematicHomeOpeningStartupPhase {
  requireHomeOpeningFacts(
    facts,
    {
      path: '/',
      scene: 'home',
    },
    label,
  )

  if (facts.canvasCount === 0) {
    requireHomeOpeningFacts(
      facts,
      {
        frameloop: 'static',
        quality: 'static',
        ready: 'false',
        renderState: 'static',
        settled: 'true',
      },
      `${label} static`,
    )
    return 'static'
  }

  if (facts.canvasCount !== 1) {
    throw new Error(`${label} 的 canvasCount 必须是 0 或 1。`)
  }

  requireCinematicEnhancedQuality(facts.quality, `${label} enhanced`)

  if (facts.ready === 'false') {
    requireHomeOpeningFacts(
      facts,
      {
        frameloop: 'always',
        renderState: 'active',
        settled: 'false',
      },
      `${label} booting`,
    )
    return 'booting'
  }

  if (facts.ready !== 'true') {
    throw new Error(`${label} enhanced ready 必须显式为 true 或 false。`)
  }

  if (facts.settled === 'true') {
    requireHomeOpeningFacts(
      facts,
      {
        frameloop: 'demand',
        renderState: 'demand',
      },
      `${label} settled`,
    )
    return 'settled'
  }

  requireHomeOpeningFacts(
    facts,
    {
      frameloop: 'always',
      renderState: 'active',
      settled: 'false',
    },
    `${label} ready`,
  )
  return 'ready'
}

export function requireCinematicHomeOpeningStartupSequence(
  frames: readonly CinematicHomeOpeningStartupFacts[],
  label = 'Home opening',
) {
  if (frames.length === 0) {
    throw new Error(`${label} 必须包含启动证据帧。`)
  }

  let highestPhaseRank = -1
  let bootingSeen = false
  const phases = frames.map((facts, index) => {
    const phase = classifyHomeOpeningStartupFacts(
      facts,
      `${label} 样本 ${index + 1}`,
    )
    const phaseRank = homeOpeningPhaseRank[phase]

    if (phaseRank < highestPhaseRank) {
      throw new Error(
        `${label} 状态发生回退：已到达 rank ${highestPhaseRank} 后又出现 ${phase}。`,
      )
    }

    highestPhaseRank = phaseRank
    bootingSeen ||= phase === 'booting'
    return phase
  })

  if (!bootingSeen) {
    throw new Error(`${label} 必须保留 canvas ready 前的 booting 证据。`)
  }
  if (phases.at(-1) !== 'settled') {
    throw new Error(
      `${label} 末帧必须是 ready=true、frameloop=demand、settled=true 的 terminal 状态。`,
    )
  }

  return phases
}

function isExplicitIntermediateHandoffSurface(
  facts: CinematicIntermediateHandoffFacts | null | undefined,
) {
  if (
    !facts ||
    !['departing', 'arriving'].includes(facts.navigationPhase ?? '') ||
    (!facts.handoffVeilVisible && !facts.routeHandoffSurfaceVisible) ||
    facts.navigationProgress === null
  ) {
    return false
  }

  const progress = Number(facts.navigationProgress)
  const token = facts.navigationToken?.trim() ?? ''

  return (
    Number.isFinite(progress) &&
    progress > 0 &&
    progress < 1 &&
    token.length > 0 &&
    token !== '0'
  )
}

export function requireCinematicPageSpatialSignature<
  TSignature extends CinematicPageSpatialSignature,
>(
  signature: TSignature,
  facts: CinematicIntermediateHandoffFacts | null | undefined,
  label: string,
) {
  if (!isExplicitIntermediateHandoffSurface(facts)) {
    if (!Number.isFinite(signature.edgeCount) || signature.edgeCount <= 100) {
      throw new Error(`${label} 页面空间签名必须保留 edgeCount > 100 的强签名。`)
    }

    return signature
  }

  if (
    !Number.isSafeInteger(signature.edgeCount) ||
    signature.edgeCount <= 0
  ) {
    throw new Error(`${label} intermediate veil 必须包含非零可分析边缘。`)
  }
  if (
    signature.bins.length === 0 ||
    signature.bins.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    throw new Error(`${label} intermediate veil 的 occupied bins 必须有限且非负。`)
  }

  const occupiedBinIndexes = signature.bins.flatMap((value, index) =>
    value > 0 ? [index] : [],
  )
  const binMass = signature.bins.reduce((total, value) => total + value, 0)

  if (
    occupiedBinIndexes.length < 2 ||
    occupiedBinIndexes.at(-1) === occupiedBinIndexes[0] ||
    Math.abs(binMass - 1) > 0.001
  ) {
    throw new Error(
      `${label} intermediate veil 必须保留归一化、跨 bin 的结构亮度跨度。`,
    )
  }
  if (
    !Number.isFinite(signature.centroidX) ||
    !Number.isFinite(signature.centroidY) ||
    signature.centroidX < 0 ||
    signature.centroidX > 1 ||
    signature.centroidY < 0 ||
    signature.centroidY > 1
  ) {
    throw new Error(`${label} intermediate veil 必须提供 [0,1] 内的有限质心。`)
  }

  return signature
}

function asError(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason : new Error(`${fallback}: ${String(reason)}`)
}

function requireFiniteNumber(value: unknown, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} 必须是有限数值。`)
  }

  return value
}

function requireEpochMilliseconds(value: unknown, label: string) {
  const milliseconds = requireFiniteNumber(value, label)

  if (milliseconds < 1_000_000_000_000 || milliseconds > 10_000_000_000_000) {
    throw new Error(`${label} 必须是 Unix epoch millisecond，禁止猜测时间单位。`)
  }

  return milliseconds
}

function requireCinematicCheckpoints(checkpoints: readonly number[]) {
  if (checkpoints.length === 0) {
    throw new Error('Screencast sequence 必须声明至少一个 checkpoint。')
  }

  let previousCheckpoint = -1

  for (const checkpoint of checkpoints) {
    if (
      !Number.isFinite(checkpoint) ||
      checkpoint < 0 ||
      checkpoint <= previousCheckpoint
    ) {
      throw new Error('Screencast checkpoints 必须是严格递增的非负有限毫秒。')
    }
    previousCheckpoint = checkpoint
  }
}

export function planCinematicScreencastCollection({
  browserNowMs,
  checkpoints,
  eventStartedAtMs,
}: Readonly<{
  browserNowMs: number
  checkpoints: readonly number[]
  eventStartedAtMs: number
}>) {
  const eventEpochMs = requireEpochMilliseconds(
    eventStartedAtMs,
    'Event absoluteTime',
  )
  const browserEpochMs = requireEpochMilliseconds(
    browserNowMs,
    'Browser current epoch',
  )

  if (browserEpochMs < eventEpochMs) {
    throw new Error('Browser current epoch 不得早于 event absoluteTime。')
  }

  requireCinematicCheckpoints(checkpoints)
  const lastCheckpointMs = checkpoints[checkpoints.length - 1]
  const deadlineMs = requireEpochMilliseconds(
    eventEpochMs + lastCheckpointMs + CINEMATIC_MAXIMUM_LATENESS_MS,
    'Screencast collection deadline',
  )

  return {
    deadlineMs,
    waitMs: browserEpochMs < deadlineMs ? deadlineMs - browserEpochMs : 0,
  }
}

export function cdpTimestampSecondsToEpochMilliseconds(timestamp: unknown) {
  const seconds = requireFiniteNumber(timestamp, 'CDP screencast timestamp')

  if (seconds < 1_000_000_000 || seconds > 10_000_000_000) {
    throw new Error('CDP screencast timestamp 必须是 Network.TimeSinceEpoch 秒。')
  }

  return requireEpochMilliseconds(
    seconds * 1000,
    'CDP screencast frame swap epoch',
  )
}

function readPngDimensions(png: Buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  if (
    !Buffer.isBuffer(png) ||
    png.length < 33 ||
    !png.subarray(0, signature.length).equals(signature)
  ) {
    throw new Error('Screencast frame 不是有效 PNG。')
  }
  if (png.readUInt32BE(8) !== 13 || png.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('Screencast PNG 缺少有效 IHDR。')
  }

  return {
    height: png.readUInt32BE(20),
    width: png.readUInt32BE(16),
  }
}

function requireViewport(viewport: CinematicVisualViewport, label: string) {
  const values = [
    viewport.height,
    viewport.pageX,
    viewport.pageY,
    viewport.scale,
    viewport.width,
  ]

  if (
    values.some((value) => !Number.isFinite(value)) ||
    viewport.height <= 0 ||
    viewport.width <= 0 ||
    viewport.pageX < 0 ||
    viewport.pageY < 0 ||
    viewport.scale <= 0
  ) {
    throw new Error(`${label} 必须提供有限、正尺寸的 visual viewport。`)
  }
}

function requirePositiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} 必须是正安全整数。`)
  }
}

export function createCinematicScreencastSelector<TFacts>(
  options: SelectorOptions,
) {
  requirePositiveInteger(options.maxFrames, 'Screencast ring maxFrames')
  requirePositiveInteger(options.maxEncodedBytes, 'Screencast ring maxEncodedBytes')
  requirePositiveInteger(options.expectedViewport.width, 'Screencast viewport width')
  requirePositiveInteger(options.expectedViewport.height, 'Screencast viewport height')

  if (options.expectedImageScale !== 0.5) {
    throw new Error('定时 screencast 证据必须严格使用 0.5 空间缩放。')
  }

  const expectedPngWidth = options.expectedViewport.width * options.expectedImageScale
  const expectedPngHeight = options.expectedViewport.height * options.expectedImageScale

  requirePositiveInteger(expectedPngWidth, 'Screencast PNG width')
  requirePositiveInteger(expectedPngHeight, 'Screencast PNG height')

  let state: RecorderState = 'recording'
  let poison: Error | null = null
  let encodedBytes = 0
  let eventStartedAtMs: number | null = null
  let finalized = false
  let warmupComplete = false
  let warmupFailure: Error | null = null
  let recorderSessionId: number | null = null
  let sequence = 0
  const rawFrames: RawFrame[] = []
  const pendingAcknowledgements: Promise<void>[] = []
  const warmupWaiters: Array<Readonly<{
    reject: (reason: Error) => void
    resolve: () => void
  }>> = []

  const setPoison = (error: Error) => {
    poison ??= error
  }
  const settleWarmup = (error?: Error) => {
    if (warmupComplete || warmupFailure) {
      return
    }
    if (error) {
      warmupFailure = error
      warmupWaiters.splice(0).forEach((waiter) => waiter.reject(error))
      return
    }

    warmupComplete = true
    warmupWaiters.splice(0).forEach((waiter) => waiter.resolve())
  }

  const record = (
    payload: CinematicScreencastPayload,
    acknowledge: (sessionId: number) => Promise<void>,
  ) => {
    if (state === 'closed') {
      setPoison(new Error('Screencast recorder 已关闭却仍收到 frame。'))
    }
    if (!Number.isSafeInteger(payload.sessionId) || payload.sessionId <= 0) {
      setPoison(new Error('Screencast frame sessionId 必须是正安全整数。'))
    } else if (recorderSessionId === null) {
      recorderSessionId = payload.sessionId
    } else if (payload.sessionId !== recorderSessionId) {
      setPoison(new Error('Screencast recorder 出现跨 session frame 污染。'))
    }

    if (state === 'recording') {
      const nextEncodedBytes =
        encodedBytes + (typeof payload.data === 'string' ? payload.data.length : 0)

      sequence += 1
      rawFrames.push({
        payload,
        sequence,
      })
      encodedBytes = nextEncodedBytes

      if (rawFrames.length > options.maxFrames) {
        setPoison(new Error('Screencast ring frame overflow。'))
      }
      if (encodedBytes > options.maxEncodedBytes) {
        setPoison(new Error('Screencast ring encoded byte overflow。'))
      }
    }

    let acknowledgement: Promise<void>

    try {
      acknowledgement = Promise.resolve(acknowledge(payload.sessionId))
    } catch (error) {
      acknowledgement = Promise.reject(error)
    }

    const observedAcknowledgement = acknowledgement.then(
      () => {
        settleWarmup()
      },
      (reason) => {
        const error = asError(reason, 'Screencast frame ACK 失败')

        setPoison(error)
        settleWarmup(error)
      },
    )

    pendingAcknowledgements.push(observedAcknowledgement)
  }

  const waitForWarmup = () => {
    if (warmupComplete) {
      return Promise.resolve()
    }
    if (warmupFailure) {
      return Promise.reject(warmupFailure)
    }

    return new Promise<void>((resolve, reject) => {
      warmupWaiters.push({ reject, resolve })
    })
  }

  const bindEventStart = (value: number) => {
    if (eventStartedAtMs !== null) {
      throw new Error('每个 screencast recorder 只能绑定一个事件。')
    }
    if (state !== 'recording') {
      throw new Error('Screencast event 必须在 recorder 停止前绑定。')
    }

    eventStartedAtMs = requireEpochMilliseconds(value, 'Event absoluteTime')
  }

  const beginStopping = () => {
    if (state === 'recording') {
      state = 'stopping'
    }
  }

  const markSessionClosed = () => {
    if (state !== 'closed') {
      setPoison(new Error('CDP screencast session 意外关闭。'))
    }
  }

  const finalize = async ({
    checkpoints,
    decodePng,
    factsTimeline,
    includeEventBoundary = false,
  }: FinalizeOptions<TFacts>): Promise<CinematicScreencastSelection<TFacts>> => {
    if (finalized) {
      throw new Error('每个 screencast recorder 只能 finalize 一次。')
    }
    finalized = true

    if (state !== 'stopping') {
      throw new Error('Screencast recorder 必须先进入 STOPPING 再选择证据帧。')
    }
    if (eventStartedAtMs === null) {
      throw new Error('Screencast recorder 缺少事件 absoluteTime 绑定。')
    }

    await Promise.all(pendingAcknowledgements).catch(() => undefined)
    if (poison) {
      throw poison
    }

    requireCinematicCheckpoints(checkpoints)

    const normalizedFrames = rawFrames.map((frame) => {
      return {
        ...frame,
        frameSwapAtMs: cdpTimestampSecondsToEpochMilliseconds(
          frame.payload.metadata.timestamp,
        ),
      }
    })
    const seenFrameSwapAtMs = new Set<number>()

    for (const frame of normalizedFrames) {
      if (seenFrameSwapAtMs.has(frame.frameSwapAtMs)) {
        throw new Error(
          `Screencast duplicate timestamp ${frame.frameSwapAtMs}；缺少可证明安全的逐帧 ordinal。`,
        )
      }
      seenFrameSwapAtMs.add(frame.frameSwapAtMs)
    }
    const canonicalFrames = [...normalizedFrames].sort(
      (left, right) => left.frameSwapAtMs - right.frameSwapAtMs,
    )

    let previousFactAt = Number.NEGATIVE_INFINITY
    let previousFactVersion = 0

    for (const [index, fact] of factsTimeline.entries()) {
      requireEpochMilliseconds(fact.capturedAtMs, `Browser facts ${index + 1} capturedAtMs`)
      requireEpochMilliseconds(fact.timeOriginMs, `Browser facts ${index + 1} timeOriginMs`)
      requirePositiveInteger(fact.version, `Browser facts ${index + 1} version`)
      requireViewport(fact.visualViewport, `Browser facts ${index + 1}`)

      if (fact.origin.length === 0) {
        throw new Error(`Browser facts ${index + 1} 缺少 origin。`)
      }
      if (fact.capturedAtMs < fact.timeOriginMs) {
        throw new Error(
          `Browser facts ${index + 1} capturedAtMs 不得早于 performance timeOrigin。`,
        )
      }
      if (fact.capturedAtMs <= previousFactAt) {
        throw new Error('Browser facts 时间线必须严格递增。')
      }
      if (fact.version <= previousFactVersion) {
        throw new Error('Browser facts version 必须严格递增。')
      }

      previousFactAt = fact.capturedAtMs
      previousFactVersion = fact.version
    }

    const boundEventStartedAtMs = eventStartedAtMs
    type NormalizedFrame = (typeof normalizedFrames)[number]
    type RawCheckpointSelection = Readonly<{
      frame: NormalizedFrame
      latenessMs: number
      plannedCheckpointMs: number
    }>
    type JoinedCheckpointSelection = RawCheckpointSelection &
      Readonly<{
        facts: CinematicBrowserFacts<TFacts>
        factsFrameAbsoluteSkewMs: number
        factsFrameSignedSkewMs: number
        selectionKind: 'fixed-checkpoint'
      }>
    type EventAnchorCandidate = Readonly<{
      absoluteSkewMs: number
      fact: CinematicBrowserFacts<TFacts>
    }>
    type ContextPath = Readonly<{
      actualOffsetVector: number[]
      eventAnchor: CinematicBrowserFacts<TFacts> | null
      eventAnchorSkewMs: number
      factsSkewVector: number[]
      key: string
      selections: JoinedCheckpointSelection[]
    }>
    let eventBoundaryFrame: NormalizedFrame | null = null
    let previousBoundaryFrameSwapAtMs: number | null = null

    if (includeEventBoundary) {
      const eventBoundaryIndex = canonicalFrames.findIndex(
        (frame) => frame.frameSwapAtMs >= boundEventStartedAtMs,
      )

      if (eventBoundaryIndex === -1) {
        throw new Error(
          'Screencast event boundary 缺少 earliest post-event raw frame；所有已记录 raw frame 均早于 event。',
        )
      }
      eventBoundaryFrame = canonicalFrames[eventBoundaryIndex]
      previousBoundaryFrameSwapAtMs =
        eventBoundaryIndex > 0
          ? canonicalFrames[eventBoundaryIndex - 1].frameSwapAtMs
          : null

      if (
        previousBoundaryFrameSwapAtMs !== null &&
        previousBoundaryFrameSwapAtMs >= boundEventStartedAtMs
      ) {
        throw new Error(
          'Screencast event boundary 不是 absolute earliest post-event raw frame。',
        )
      }
    }

    const validateFrameMetadata = (frame: NormalizedFrame) => {
      const { metadata } = frame.payload
      const metadataValues = [
        metadata.deviceHeight,
        metadata.deviceWidth,
        metadata.offsetTop,
        metadata.pageScaleFactor,
        metadata.scrollOffsetX,
        metadata.scrollOffsetY,
      ]

      if (metadataValues.some((value) => !Number.isFinite(value))) {
        throw new Error('Screencast metadata viewport/scale/scroll 必须是有限数值。')
      }
      if (
        metadata.deviceWidth !== options.expectedViewport.width ||
        metadata.deviceHeight !== options.expectedViewport.height
      ) {
        throw new Error('Screencast metadata viewport 尺寸不匹配。')
      }
      if (metadata.offsetTop !== 0 || metadata.pageScaleFactor !== 1) {
        throw new Error('Screencast page/visual viewport scale 不匹配。')
      }
    }

    if (eventBoundaryFrame) {
      validateFrameMetadata(eventBoundaryFrame)
    }

    const metadataMatchesFacts = (
      frame: NormalizedFrame,
      fact: CinematicBrowserFacts<TFacts>,
    ) => {
      const { metadata } = frame.payload
      const { visualViewport } = fact

      return (
        metadata.deviceWidth === visualViewport.width &&
        metadata.deviceHeight === visualViewport.height &&
        metadata.pageScaleFactor === visualViewport.scale &&
        metadata.scrollOffsetX === visualViewport.pageX &&
        metadata.scrollOffsetY === visualViewport.pageY
      )
    }
    const summarizeFact = (fact: CinematicBrowserFacts<TFacts> | undefined) =>
      fact
        ? {
            capturedAtMs: fact.capturedAtMs,
            origin: fact.origin,
            timeOriginMs: fact.timeOriginMs,
            version: fact.version,
            visualViewport: fact.visualViewport,
          }
        : null
    const joinDiagnostic = (frame: NormalizedFrame) => {
      const nearestBefore = factsTimeline
        .filter((fact) => fact.capturedAtMs <= frame.frameSwapAtMs)
        .at(-1)
      const nearestAfter = factsTimeline.find(
        (fact) => fact.capturedAtMs >= frame.frameSwapAtMs,
      )
      const windowCandidates = factsTimeline
        .filter(
          (fact) =>
            Math.abs(fact.capturedAtMs - frame.frameSwapAtMs) <=
            CINEMATIC_MAXIMUM_FACTS_FRAME_SKEW_MS,
        )
        .map(summarizeFact)

      return [
        `frame metadata=${JSON.stringify(frame.payload.metadata)}`,
        `window candidates=${JSON.stringify(windowCandidates)}`,
        `nearest before=${JSON.stringify(summarizeFact(nearestBefore))}`,
        `nearest after=${JSON.stringify(summarizeFact(nearestAfter))}`,
      ].join('; ')
    }
    const contextKeyFor = (fact: CinematicBrowserFacts<TFacts>) =>
      `${fact.origin}\u0000${fact.timeOriginMs}`
    const factsByContext = new Map<string, CinematicBrowserFacts<TFacts>[]>()

    for (const fact of factsTimeline) {
      const key = contextKeyFor(fact)
      const contextFacts = factsByContext.get(key)

      if (contextFacts) {
        contextFacts.push(fact)
      } else {
        factsByContext.set(key, [fact])
      }
    }

    const exactWindowCandidates = (
      frame: NormalizedFrame,
      contextFacts: readonly CinematicBrowserFacts<TFacts>[],
    ) =>
      contextFacts.filter(
        (fact) =>
          metadataMatchesFacts(frame, fact) &&
          Math.abs(fact.capturedAtMs - frame.frameSwapAtMs) <=
            CINEMATIC_MAXIMUM_FACTS_FRAME_SKEW_MS,
      )
    const checkpointFrameCandidates = checkpoints.map(
      (plannedCheckpointMs): RawCheckpointSelection[] => {
        const checkpointAtMs = boundEventStartedAtMs + plannedCheckpointMs
        const checkpointDeadlineMs =
          checkpointAtMs + CINEMATIC_MAXIMUM_LATENESS_MS
        const candidates = canonicalFrames
          .filter(
            (frame) =>
              frame.frameSwapAtMs >= checkpointAtMs &&
              frame.frameSwapAtMs <= checkpointDeadlineMs &&
              frame.sequence !== eventBoundaryFrame?.sequence,
          )
          .map((frame) => ({
            frame,
            latenessMs:
              frame.frameSwapAtMs -
              boundEventStartedAtMs -
              plannedCheckpointMs,
            plannedCheckpointMs,
          }))

        if (candidates.length === 0) {
          const firstLateFrame = canonicalFrames.find(
            (frame) =>
              frame.frameSwapAtMs >= checkpointAtMs &&
              frame.sequence !== eventBoundaryFrame?.sequence,
          )

          if (firstLateFrame) {
            const latenessMs =
              firstLateFrame.frameSwapAtMs -
              boundEventStartedAtMs -
              plannedCheckpointMs

            throw new Error(
              `Screencast checkpoint lateness ${latenessMs}ms 超过 50ms。`,
            )
          }
          throw new Error(
            `Screencast checkpoint ${plannedCheckpointMs}ms 缺少 unique post-checkpoint frame，禁止 reuse。`,
          )
        }

        for (const { frame } of candidates) {
          validateFrameMetadata(frame)
        }

        return candidates
      },
    )
    type FactJoinResult =
      | Readonly<{
          kind: 'ambiguous'
          message: string
        }>
      | Readonly<{
          kind: 'joined'
          fact: CinematicBrowserFacts<TFacts>
          factsFrameAbsoluteSkewMs: number
          factsFrameSignedSkewMs: number
        }>
      | Readonly<{
          kind: 'none'
        }>
    const deterministicFactOrder = (
      left: CinematicBrowserFacts<TFacts>,
      right: CinematicBrowserFacts<TFacts>,
    ) =>
      left.capturedAtMs - right.capturedAtMs ||
      left.version - right.version ||
      left.origin.localeCompare(right.origin) ||
      left.timeOriginMs - right.timeOriginMs
    const joinFrameToContext = (
      frame: NormalizedFrame,
      contextFacts: readonly CinematicBrowserFacts<TFacts>[],
    ): FactJoinResult => {
      const candidates = exactWindowCandidates(frame, contextFacts)

      if (candidates.length === 0) {
        return { kind: 'none' }
      }
      const minimumSkewMs = Math.min(
        ...candidates.map((fact) =>
          Math.abs(fact.capturedAtMs - frame.frameSwapAtMs),
        ),
      )
      const minimumCandidates = candidates.filter(
        (fact) =>
          Math.abs(fact.capturedAtMs - frame.frameSwapAtMs) ===
          minimumSkewMs,
      )
      const referenceFacts = minimumCandidates[0].facts

      if (
        minimumCandidates.some(
          (candidate) => !isDeepStrictEqual(candidate.facts, referenceFacts),
        )
      ) {
        return {
          kind: 'ambiguous',
          message: `Screencast facts join ambiguous：相同 absolute skew 的 exact candidates 包含不同 facts；${joinDiagnostic(frame)}`,
        }
      }
      const fact = [...minimumCandidates].sort(deterministicFactOrder)[0]
      const factsFrameSignedSkewMs =
        fact.capturedAtMs - frame.frameSwapAtMs

      return {
        fact,
        factsFrameAbsoluteSkewMs: Math.abs(factsFrameSignedSkewMs),
        factsFrameSignedSkewMs,
        kind: 'joined',
      }
    }
    const ambiguousJoinMessages = new Set<string>()
    const eventAnchorAmbiguities = new Set<string>()
    let qualifiedEventAnchorCount = 0
    const eventAnchorCandidatesFor = (
      contextFacts: readonly CinematicBrowserFacts<TFacts>[],
    ): EventAnchorCandidate[] => {
      if (!eventBoundaryFrame) {
        return []
      }
      const candidates = contextFacts.filter(
        (fact) =>
          metadataMatchesFacts(eventBoundaryFrame as NormalizedFrame, fact) &&
          Math.abs(fact.capturedAtMs - boundEventStartedAtMs) <=
            CINEMATIC_MAXIMUM_FACTS_FRAME_SKEW_MS,
      )
      const candidatesBySkew = new Map<
        number,
        CinematicBrowserFacts<TFacts>[]
      >()

      for (const fact of candidates) {
        const absoluteSkewMs = Math.abs(
          fact.capturedAtMs - boundEventStartedAtMs,
        )
        const sameSkew = candidatesBySkew.get(absoluteSkewMs)

        if (sameSkew) {
          sameSkew.push(fact)
        } else {
          candidatesBySkew.set(absoluteSkewMs, [fact])
        }
      }

      const selected: EventAnchorCandidate[] = []

      for (const [absoluteSkewMs, sameSkew] of candidatesBySkew) {
        const referenceFacts = sameSkew[0].facts

        if (
          sameSkew.some(
            (candidate) =>
              !isDeepStrictEqual(candidate.facts, referenceFacts),
          )
        ) {
          eventAnchorAmbiguities.add(
            `Screencast event facts anchor ambiguous：相同 event absolute skew 的 exact candidates 包含不同 facts；event=${boundEventStartedAtMs}; boundary metadata=${JSON.stringify(eventBoundaryFrame.payload.metadata)}。`,
          )
          continue
        }
        selected.push({
          absoluteSkewMs,
          fact: [...sameSkew].sort(deterministicFactOrder)[0],
        })
      }

      qualifiedEventAnchorCount += selected.length

      return selected.sort(
        (left, right) =>
          left.absoluteSkewMs - right.absoluteSkewMs ||
          deterministicFactOrder(left.fact, right.fact),
      )
    }
    const solveFixedPath = (
      contextFacts: readonly CinematicBrowserFacts<TFacts>[],
      eventAnchor: CinematicBrowserFacts<TFacts> | null,
    ) => {
      const joinedByCheckpoint = checkpointFrameCandidates.map((candidates) =>
        candidates.flatMap((selection) => {
          const joined = joinFrameToContext(selection.frame, contextFacts)

          if (joined.kind === 'ambiguous') {
            ambiguousJoinMessages.add(joined.message)
            return []
          }
          if (joined.kind === 'none') {
            return []
          }

          return [
            {
              ...selection,
              facts: joined.fact,
              factsFrameAbsoluteSkewMs:
                joined.factsFrameAbsoluteSkewMs,
              factsFrameSignedSkewMs: joined.factsFrameSignedSkewMs,
              selectionKind: 'fixed-checkpoint' as const,
            },
          ]
        }),
      )
      const failedStates = new Set<string>()
      const search = (
        checkpointIndex: number,
        previousFrameSwapAtMs: number,
        previousFactCapturedAtMs: number,
        previousFactVersion: number,
      ): JoinedCheckpointSelection[] | null => {
        if (checkpointIndex === joinedByCheckpoint.length) {
          return []
        }
        const stateKey = [
          checkpointIndex,
          previousFrameSwapAtMs,
          previousFactCapturedAtMs,
          previousFactVersion,
        ].join(':')

        if (failedStates.has(stateKey)) {
          return null
        }

        const candidates = [...joinedByCheckpoint[checkpointIndex]].sort(
          (left, right) =>
            left.frame.frameSwapAtMs - right.frame.frameSwapAtMs ||
            left.factsFrameAbsoluteSkewMs -
              right.factsFrameAbsoluteSkewMs ||
            deterministicFactOrder(left.facts, right.facts),
        )

        for (const candidate of candidates) {
          if (candidate.frame.frameSwapAtMs <= previousFrameSwapAtMs) {
            continue
          }
          if (
            candidate.facts.capturedAtMs < previousFactCapturedAtMs ||
            candidate.facts.version < previousFactVersion
          ) {
            continue
          }
          const tail = search(
            checkpointIndex + 1,
            candidate.frame.frameSwapAtMs,
            candidate.facts.capturedAtMs,
            candidate.facts.version,
          )

          if (tail) {
            return [candidate, ...tail]
          }
        }

        failedStates.add(stateKey)
        return null
      }

      return search(
        0,
        Number.NEGATIVE_INFINITY,
        eventAnchor?.capturedAtMs ?? Number.NEGATIVE_INFINITY,
        eventAnchor?.version ?? 0,
      )
    }
    const contextPaths: ContextPath[] = []

    for (const [key, contextFacts] of factsByContext) {
      const eventAnchors = eventBoundaryFrame
        ? eventAnchorCandidatesFor(contextFacts)
        : [null]

      for (const eventAnchorCandidate of eventAnchors) {
        const eventAnchor =
          eventAnchorCandidate === null ? null : eventAnchorCandidate.fact
        const selections = solveFixedPath(contextFacts, eventAnchor)

        if (!selections) {
          continue
        }
        contextPaths.push({
          actualOffsetVector: selections.map(
            ({ frame }) => frame.frameSwapAtMs - boundEventStartedAtMs,
          ),
          eventAnchor,
          eventAnchorSkewMs:
            eventAnchorCandidate === null
              ? 0
              : eventAnchorCandidate.absoluteSkewMs,
          factsSkewVector: selections.map(
            ({ factsFrameAbsoluteSkewMs }) =>
              factsFrameAbsoluteSkewMs,
          ),
          key,
          selections,
        })
      }
    }
    const compareNumberVectors = (
      left: readonly number[],
      right: readonly number[],
    ) => {
      for (let index = 0; index < left.length; index += 1) {
        const difference = left[index] - right[index]

        if (difference !== 0) {
          return difference
        }
      }

      return left.length - right.length
    }
    const comparePathRank = (left: ContextPath, right: ContextPath) =>
      compareNumberVectors(
        left.actualOffsetVector,
        right.actualOffsetVector,
      ) ||
      compareNumberVectors(left.factsSkewVector, right.factsSkewVector) ||
      left.eventAnchorSkewMs - right.eventAnchorSkewMs
    const readPathFacts = (path: ContextPath) => [
      ...(path.eventAnchor ? [path.eventAnchor.facts] : []),
      ...path.selections.map(({ facts }) => facts.facts),
    ]

    if (contextPaths.length === 0) {
      if (eventBoundaryFrame && qualifiedEventAnchorCount === 0) {
        if (eventAnchorAmbiguities.size > 0) {
          throw new Error([...eventAnchorAmbiguities][0])
        }
        const exactMetadataFacts = factsTimeline.filter((fact) =>
          metadataMatchesFacts(eventBoundaryFrame as NormalizedFrame, fact),
        )
        const nearestEventSkewMs =
          exactMetadataFacts.length > 0
            ? Math.min(
                ...exactMetadataFacts.map((fact) =>
                  Math.abs(fact.capturedAtMs - boundEventStartedAtMs),
                ),
              )
            : null

        if (
          nearestEventSkewMs !== null &&
          nearestEventSkewMs >
            CINEMATIC_MAXIMUM_FACTS_FRAME_SKEW_MS
        ) {
          throw new Error(
            `Screencast event facts anchor absolute skew ${nearestEventSkewMs}ms 超过 50ms；event=${boundEventStartedAtMs}; boundary metadata=${JSON.stringify(eventBoundaryFrame.payload.metadata)}。`,
          )
        }
        throw new Error(
          `Screencast event facts anchor 在 50ms event window 内无 exact viewport/scale/scroll match；event=${boundEventStartedAtMs}; boundary metadata=${JSON.stringify(eventBoundaryFrame.payload.metadata)}。`,
        )
      }

      for (const candidates of checkpointFrameCandidates) {
        const hasJoinedCandidate = candidates.some(({ frame }) =>
          [...factsByContext.values()].some(
            (contextFacts) =>
              joinFrameToContext(frame, contextFacts).kind === 'joined',
          ),
        )

        if (hasJoinedCandidate) {
          continue
        }
        if (ambiguousJoinMessages.size > 0) {
          throw new Error([...ambiguousJoinMessages][0])
        }
        const frame = candidates[0].frame
        const exactFacts = factsTimeline.filter((fact) =>
          metadataMatchesFacts(frame, fact),
        )

        if (exactFacts.length > 0) {
          const nearestSkewMs = Math.min(
            ...exactFacts.map((fact) =>
              Math.abs(fact.capturedAtMs - frame.frameSwapAtMs),
            ),
          )

          if (
            nearestSkewMs >
            CINEMATIC_MAXIMUM_FACTS_FRAME_SKEW_MS
          ) {
            throw new Error(
              `Screencast facts-frame absolute skew ${nearestSkewMs}ms 超过 50ms；${joinDiagnostic(frame)}`,
            )
          }
        }
        throw new Error(
          `Screencast frame 在同 origin/timeOrigin 的 50ms window 内无 exact viewport/scale/scroll facts match；${joinDiagnostic(frame)}`,
        )
      }

      throw new Error(
        eventBoundaryFrame
          ? 'Screencast event facts anchor 与 fixed checkpoints 没有共同的完整稳定 context path；必须保持 unique frame timestamp order 与 facts capturedAt/version nondecreasing。'
          : 'Screencast 没有覆盖完整 canonical checkpoint path 的稳定 origin/timeOrigin context；必须保持 unique frame timestamp order、禁止 reuse，并确保 facts capturedAt/version nondecreasing 而不 backward join。',
      )
    }

    const rankedPaths = [...contextPaths].sort(
      (left, right) =>
        comparePathRank(left, right) ||
        left.key.localeCompare(right.key) ||
        (left.eventAnchor?.capturedAtMs ?? Number.NEGATIVE_INFINITY) -
          (right.eventAnchor?.capturedAtMs ?? Number.NEGATIVE_INFINITY) ||
        (left.eventAnchor?.version ?? 0) -
          (right.eventAnchor?.version ?? 0),
    )
    const minimumPaths = rankedPaths.filter(
      (candidate) => comparePathRank(candidate, rankedPaths[0]) === 0,
    )
    const referencePathFacts = readPathFacts(minimumPaths[0])

    if (
      minimumPaths.some(
        (candidate) =>
          !isDeepStrictEqual(
            readPathFacts(candidate),
            referencePathFacts,
          ),
      )
    ) {
      throw new Error(
        'Screencast path ambiguous：同最优 origin/timeOrigin context path 具有相同 rank 但不同 facts timeline。',
      )
    }

    const chosenPath = minimumPaths[0]
    const selectedEventAnchorFact = chosenPath.eventAnchor
    const selectedFrames = chosenPath.selections

    for (const selected of selectedFrames) {
      if (
        boundEventStartedAtMs < selected.facts.timeOriginMs ||
        selected.frame.frameSwapAtMs < selected.facts.timeOriginMs
      ) {
        throw new Error(
          'Event absoluteTime 与 CDP frame swap 必须属于 browser performance timeOrigin 之后的同一 epoch。',
        )
      }
    }

    const decodeFramePng = (frame: NormalizedFrame) => {
      const png = decodePng(frame.payload.data)
      const dimensions = readPngDimensions(png)

      if (
        dimensions.width !== expectedPngWidth ||
        dimensions.height !== expectedPngHeight
      ) {
        throw new Error(
          `Screencast PNG dimension ${dimensions.width}×${dimensions.height} 与 ${expectedPngWidth}×${expectedPngHeight} 不匹配。`,
        )
      }

      return png
    }
    const decodeSelectedFrame = (
      selected: (typeof selectedFrames)[number],
    ): SelectedCinematicScreencastFrame<TFacts> => {
      const { metadata } = selected.frame.payload
      const { visualViewport } = selected.facts
      const png = decodeFramePng(selected.frame)

      return {
        actualOffsetMs:
          selected.frame.frameSwapAtMs - boundEventStartedAtMs,
        facts: selected.facts.facts,
        factsCapturedAtMs: selected.facts.capturedAtMs,
        factsFrameAbsoluteSkewMs: selected.factsFrameAbsoluteSkewMs,
        factsFrameSignedSkewMs: selected.factsFrameSignedSkewMs,
        factsVersion: selected.facts.version,
        frameSwapAtMs: selected.frame.frameSwapAtMs,
        metadata,
        origin: selected.facts.origin,
        png,
        pngSha256: createHash('sha256').update(png).digest('hex'),
        sessionId: selected.frame.payload.sessionId,
        timeOriginMs: selected.facts.timeOriginMs,
        visualViewport,
        latenessMs: selected.latenessMs,
        plannedCheckpointMs: selected.plannedCheckpointMs,
        selectionKind: 'fixed-checkpoint',
      }
    }
    const checkpointFrames = selectedFrames.map(decodeSelectedFrame)
    const eventBoundary: SelectedCinematicEventBoundaryFrame | null =
      eventBoundaryFrame
        ? (() => {
            const png = decodeFramePng(eventBoundaryFrame as NormalizedFrame)

            return {
              actualOffsetMs:
                eventBoundaryFrame.frameSwapAtMs - boundEventStartedAtMs,
              frameSwapAtMs: eventBoundaryFrame.frameSwapAtMs,
              latenessMs: null,
              metadata: eventBoundaryFrame.payload.metadata,
              plannedCheckpointMs: null,
              png,
              pngSha256: createHash('sha256').update(png).digest('hex'),
              previousFrameSwapAtMs: previousBoundaryFrameSwapAtMs,
              selectionKind: 'event-boundary',
              sessionId: eventBoundaryFrame.payload.sessionId,
            }
          })()
        : null
    const eventFactsAnchor: SelectedCinematicEventFactsAnchor<TFacts> | null =
      selectedEventAnchorFact && eventBoundaryFrame
        ? {
            anchorToBoundarySignedSkewMs:
              selectedEventAnchorFact.capturedAtMs -
              eventBoundaryFrame.frameSwapAtMs,
            capturedAtMs: selectedEventAnchorFact.capturedAtMs,
            eventAbsoluteSkewMs: Math.abs(
              selectedEventAnchorFact.capturedAtMs -
                boundEventStartedAtMs,
            ),
            eventSignedSkewMs:
              selectedEventAnchorFact.capturedAtMs -
              boundEventStartedAtMs,
            facts: selectedEventAnchorFact.facts,
            origin: selectedEventAnchorFact.origin,
            selectionKind: 'event-facts-anchor',
            timeOriginMs: selectedEventAnchorFact.timeOriginMs,
            version: selectedEventAnchorFact.version,
            visualViewport: selectedEventAnchorFact.visualViewport,
          }
        : null

    return {
      checkpointFrames,
      eventBoundary,
      eventFactsAnchor,
    }
  }

  const close = () => {
    state = 'closed'
  }

  return {
    beginStopping,
    bindEventStart,
    close,
    finalize,
    markSessionClosed,
    record,
    waitForWarmup,
  }
}
