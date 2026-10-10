'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'

import type { ImmersiveSceneId } from './scene-types'
import styles from './cinematic-navigation-bridge.module.css'
import {
  CINEMATIC_HANDOFF_DEPART_MS,
  CINEMATIC_HANDOFF_TOTAL_MS,
} from './transition-machine'

type CinematicNavigationBridgeProps = Readonly<{
  children: ReactNode
  className?: string
  rootRef?: RefObject<HTMLDivElement | null>
  scene: ImmersiveSceneId
}>

type NavigationPhase = 'arriving' | 'departing' | 'idle' | 'settled'
type CarrierDirection = 'arc-signal-path' | 'home-beacon' | 'rialo-route'

type NavigationState = Readonly<{
  destination: string
  direction: CarrierDirection | null
  phase: NavigationPhase
  progress: number
  reduced: boolean
  target: string
  token: number
}>

const initialNavigationState: NavigationState = {
  destination: '',
  direction: null,
  phase: 'idle',
  progress: 1,
  reduced: false,
  target: '',
  token: 0,
}

type PersistedHandoff = Readonly<{
  destination: string
  reduced: boolean
  start: number
  target: string
  token: number
}>

type CinematicDetailArrivalProps = Readonly<{
  className?: string
  destination: string
  motif: string
}>

type DetailArrivalState = Readonly<{
  destination: string
  direction: CarrierDirection | null
  phase: 'entering' | 'settled'
  progress: number
  reduced: boolean
  target: string
  token: number
}>

const CINEMATIC_HANDOFF_STORAGE_KEY = 'captain-dock:cinematic-handoff'
const carrierDirectionByScene: Readonly<Record<ImmersiveSceneId, CarrierDirection>> = {
  arc: 'arc-signal-path',
  home: 'home-beacon',
  rialo: 'rialo-route',
}
const activeCarrierDirections = new Map<number, CarrierDirection>()
const activeDetailArrivalLeases = new Map<number, number>()

const initialDetailArrivalState: DetailArrivalState = {
  destination: '',
  direction: null,
  phase: 'settled',
  progress: 1,
  reduced: false,
  target: '',
  token: 0,
}

function projectCarrierFrame(progress: number) {
  const normalized = Math.min(1, Math.max(0, progress))
  const mass =
    normalized === 0 || normalized === 1
      ? 0
      : Math.sin(normalized * Math.PI)
  const opacity =
    normalized <= 0.2
      ? normalized / 0.2
      : normalized >= 0.8
        ? (1 - normalized) / 0.2
        : 1

  return {
    mass,
    massOpacity: 0.28 + mass * 0.72,
    massScale: 0.38 + mass * 0.62,
    opacity: Math.min(1, Math.max(0, opacity)),
    xVw: -72 + normalized * 156,
  } as const
}

type CarrierSpineProps = Readonly<{
  active: boolean
  destination: string
  direction: CarrierDirection | null
  motif?: string
  progress: number
  target: string
  token: number
}>

function CarrierSpine({
  active,
  destination,
  direction,
  motif,
  progress,
  target,
  token,
}: CarrierSpineProps) {
  if (!active || !direction || token <= 0) {
    return null
  }

  const frame = projectCarrierFrame(progress)
  const carrierStyle = {
    '--cinematic-carrier-mass-opacity': frame.massOpacity,
    '--cinematic-carrier-mass-scale': frame.massScale,
    '--cinematic-carrier-opacity': frame.opacity,
    '--cinematic-carrier-x': `${frame.xVw}vw`,
  } as CSSProperties

  return (
    <div
      aria-hidden="true"
      className={styles.carrierRoot}
      data-cinematic-carrier-direction={direction}
      data-cinematic-carrier-mass-strength={String(frame.mass)}
      data-cinematic-carrier-opacity={String(frame.opacity)}
      data-cinematic-carrier-x={String(frame.xVw)}
      data-cinematic-handoff-destination={destination}
      data-cinematic-handoff-progress={String(progress)}
      data-cinematic-handoff-signal={direction}
      data-cinematic-handoff-target={target}
      data-cinematic-handoff-token={token}
      data-project-motif={motif}
      style={carrierStyle}
    >
      <div className={styles.carrierLane}>
        <span className={styles.carrierTrack} data-cinematic-carrier-track />
        <span className={styles.carrierMass} data-cinematic-carrier-mass />
        <span className={styles.carrierSignal} data-cinematic-carrier-signal />
      </div>
    </div>
  )
}

function getTimelineTime() {
  return performance.timeOrigin + performance.now()
}

function isPersistedHandoff(value: unknown): value is PersistedHandoff {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PersistedHandoff>

  return (
    typeof candidate.destination === 'string' &&
    typeof candidate.reduced === 'boolean' &&
    typeof candidate.start === 'number' &&
    Number.isFinite(candidate.start) &&
    typeof candidate.target === 'string' &&
    typeof candidate.token === 'number' &&
    Number.isFinite(candidate.token)
  )
}

function readPersistedHandoff() {
  try {
    const raw = window.sessionStorage.getItem(CINEMATIC_HANDOFF_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null

    return isPersistedHandoff(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writePersistedHandoff(handoff: PersistedHandoff) {
  try {
    window.sessionStorage.setItem(CINEMATIC_HANDOFF_STORAGE_KEY, JSON.stringify(handoff))
  } catch {
    // sessionStorage 不可用时仍保留当前文档内的导航语义。
  }
}

function clearPersistedHandoff(token: number) {
  try {
    const current = readPersistedHandoff()

    if (!current || current.token === token) {
      window.sessionStorage.removeItem(CINEMATIC_HANDOFF_STORAGE_KEY)
    }
  } catch {
    // 清理失败不会影响已经完成的导航。
  }
}

function releaseDetailArrivalLease(token: number) {
  const current = activeDetailArrivalLeases.get(token) ?? 0
  const next = current - 1

  if (next > 0) {
    activeDetailArrivalLeases.set(token, next)
    return
  }

  activeDetailArrivalLeases.delete(token)
  queueMicrotask(() => {
    if (!activeDetailArrivalLeases.has(token)) {
      clearPersistedHandoff(token)
      activeCarrierDirections.delete(token)
    }
  })
}

function retainDetailArrivalLease(token: number) {
  activeDetailArrivalLeases.set(token, (activeDetailArrivalLeases.get(token) ?? 0) + 1)

  let released = false

  return () => {
    if (released) {
      return
    }

    released = true
    releaseDetailArrivalLease(token)
  }
}

function resolvePersistedHandoff(
  handoff: PersistedHandoff,
  destination: string,
) {
  const elapsed = getTimelineTime() - handoff.start
  const direction = activeCarrierDirections.get(handoff.token) ?? null

  if (
    handoff.destination !== destination ||
    elapsed < 0 ||
    elapsed > CINEMATIC_HANDOFF_TOTAL_MS ||
    !direction
  ) {
    return null
  }

  return { direction, elapsed, handoff } as const
}

function consumePersistedHandoff(destination: string) {
  const handoff = readPersistedHandoff()

  if (!handoff) {
    return null
  }

  const resolved = resolvePersistedHandoff(handoff, destination)

  if (!resolved) {
    clearPersistedHandoff(handoff.token)
    activeCarrierDirections.delete(handoff.token)
    return null
  }

  return resolved
}

function createInitialDetailArrivalState(
  destination: string,
): DetailArrivalState {
  const handoff = readPersistedHandoff()

  if (!handoff || handoff.reduced) {
    return initialDetailArrivalState
  }

  const resolved = resolvePersistedHandoff(handoff, destination)
  const progress = resolved
    ? Math.min(1, Math.max(0, resolved.elapsed / CINEMATIC_HANDOFF_TOTAL_MS))
    : 1

  if (!resolved || progress >= 1) {
    return initialDetailArrivalState
  }

  return {
    destination,
    direction: resolved.direction,
    phase: 'entering',
    progress,
    reduced: false,
    target: handoff.target,
    token: handoff.token,
  }
}

function hasModifiedActivation(event: MouseEvent<HTMLDivElement>) {
  return (
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
}

function getNavigationAnchor(event: MouseEvent<HTMLDivElement>) {
  if (!(event.target instanceof Element)) {
    return null
  }

  return event.target.closest('a[href]')
}

function getCarrierTarget(anchor: HTMLAnchorElement, root: HTMLDivElement) {
  const marker = anchor.closest('[data-scene-target]')
  const target = marker?.getAttribute('data-scene-target') ?? ''

  if (
    !marker ||
    !root.contains(marker) ||
    (!target.startsWith('ecosystem:') && !target.startsWith('project:'))
  ) {
    return null
  }

  return target
}

function getInternalDestination(anchor: HTMLAnchorElement, pathname: string) {
  if (
    anchor.hasAttribute('download') ||
    (anchor.target && anchor.target !== '_self') ||
    anchor.rel.split(/\s+/).includes('external')
  ) {
    return null
  }

  const destination = new URL(anchor.href, window.location.href)

  if (destination.origin !== window.location.origin) {
    return null
  }

  const currentSearch = window.location.search

  if (
    destination.pathname === pathname &&
    destination.search === currentSearch &&
    destination.hash
  ) {
    return null
  }

  if (
    destination.pathname === pathname &&
    destination.search === currentSearch &&
    destination.hash === window.location.hash
  ) {
    return null
  }

  return `${destination.pathname}${destination.search}${destination.hash}`
}

function shouldRouteWithoutCarrier(scene: ImmersiveSceneId, target: string) {
  return scene === 'home' && target.startsWith('project:')
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function CinematicNavigationBridge({
  children,
  className,
  rootRef,
  scene,
}: CinematicNavigationBridgeProps) {
  const pathname = usePathname()
  const router = useRouter()
  const routerPush = router.push
  const localRootRef = useRef<HTMLDivElement | null>(null)
  const departureTimerRef = useRef<number | null>(null)
  const terminalTimerRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingDestinationRef = useRef<string | null>(null)
  const activeTokenRef = useRef(0)
  const nextTokenRef = useRef(0)
  const [navigation, setNavigation] = useState(initialNavigationState)

  const cancelTimeline = useCallback(() => {
    if (departureTimerRef.current !== null) {
      window.clearTimeout(departureTimerRef.current)
      departureTimerRef.current = null
    }
    if (terminalTimerRef.current !== null) {
      window.clearTimeout(terminalTimerRef.current)
      terminalTimerRef.current = null
    }
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [])

  const cancelPendingNativeNavigation = useCallback(
    (settleNavigation: boolean) => {
      const pendingDestination = pendingDestinationRef.current
      const activeToken = activeTokenRef.current

      if (!pendingDestination || activeToken <= 0) {
        return false
      }

      pendingDestinationRef.current = null
      nextTokenRef.current = Math.max(nextTokenRef.current, activeToken + 1)
      cancelTimeline()
      clearPersistedHandoff(activeToken)
      activeCarrierDirections.delete(activeToken)

      if (settleNavigation) {
        setNavigation((current) =>
          current.token === activeToken
            ? { ...current, phase: 'idle', progress: 1 }
            : current,
        )
      }

      return true
    },
    [cancelTimeline],
  )

  useEffect(() => {
    const cancelForNativeHistory = () => {
      cancelPendingNativeNavigation(true)
    }

    window.addEventListener('popstate', cancelForNativeHistory)

    return () => {
      window.removeEventListener('popstate', cancelForNativeHistory)
    }
  }, [cancelPendingNativeNavigation])

  useEffect(() => {
    cancelPendingNativeNavigation(true)
  }, [cancelPendingNativeNavigation, pathname])

  useEffect(() => {
    const completeHiddenNavigation = () => {
      if (document.visibilityState !== 'hidden') {
        return
      }

      const pendingDestination = pendingDestinationRef.current
      const activeToken = activeTokenRef.current

      pendingDestinationRef.current = null
      cancelTimeline()
      setNavigation((current) =>
        current.token === activeToken
          ? { ...current, phase: 'idle', progress: 1 }
          : current,
      )
      clearPersistedHandoff(activeToken)
      activeCarrierDirections.delete(activeToken)

      if (pendingDestination) {
        routerPush(pendingDestination)
      }
    }

    document.addEventListener('visibilitychange', completeHiddenNavigation)

    return () => {
      document.removeEventListener('visibilitychange', completeHiddenNavigation)

      if (!cancelPendingNativeNavigation(false)) {
        cancelTimeline()
      }
    }
  }, [cancelPendingNativeNavigation, cancelTimeline, routerPush])

  function assignRoot(node: HTMLDivElement | null) {
    localRootRef.current = node

    if (rootRef) {
      rootRef.current = node
    }
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || hasModifiedActivation(event)) {
      return
    }

    const anchor = getNavigationAnchor(event)

    const root = localRootRef.current

    if (!(anchor instanceof HTMLAnchorElement) || !root?.contains(anchor)) {
      return
    }

    const target = getCarrierTarget(anchor, root)

    if (!target) {
      return
    }

    const destination = getInternalDestination(anchor, pathname)

    if (!destination) {
      return
    }

    if (shouldRouteWithoutCarrier(scene, target)) {
      event.preventDefault()
      const activeToken = activeTokenRef.current

      pendingDestinationRef.current = null
      activeTokenRef.current = 0
      cancelTimeline()
      clearPersistedHandoff(activeToken)
      activeCarrierDirections.delete(activeToken)
      setNavigation(initialNavigationState)
      routerPush(destination)
      return
    }

    event.preventDefault()
    activeCarrierDirections.delete(activeTokenRef.current)
    cancelTimeline()

    const start = getTimelineTime()
    nextTokenRef.current = Math.max(nextTokenRef.current + 1, Math.floor(start))
    const token = nextTokenRef.current
    const reduced = prefersReducedMotion()
    const direction = carrierDirectionByScene[scene]
    const handoff: PersistedHandoff = {
      destination,
      reduced,
      start,
      target,
      token,
    }

    activeTokenRef.current = token
    writePersistedHandoff(handoff)

    if (reduced) {
      setNavigation({
        destination,
        direction,
        phase: 'settled',
        progress: 1,
        reduced: true,
        target,
        token,
      })
      routerPush(destination)
      clearPersistedHandoff(token)
      activeCarrierDirections.delete(token)
      return
    }

    activeCarrierDirections.set(token, direction)
    setNavigation({
      destination,
      direction,
      phase: 'departing',
      progress: 0,
      reduced: false,
      target,
      token,
    })
    pendingDestinationRef.current = destination

    const updateProgress = (now: number) => {
      const progress = Math.min(1, Math.max(0, (performance.timeOrigin + now - start) / CINEMATIC_HANDOFF_TOTAL_MS))

      setNavigation((current) => {
        if (current.token !== token) {
          return current
        }

        return {
          ...current,
          phase: progress >= 1
            ? 'idle'
            : progress * CINEMATIC_HANDOFF_TOTAL_MS >= CINEMATIC_HANDOFF_DEPART_MS
              ? 'arriving'
              : 'departing',
          progress,
        }
      })

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(updateProgress)
      } else {
        frameRef.current = null
      }
    }

    frameRef.current = window.requestAnimationFrame(updateProgress)
    departureTimerRef.current = window.setTimeout(() => {
      if (nextTokenRef.current !== token) {
        return
      }

      departureTimerRef.current = null
      pendingDestinationRef.current = null
      setNavigation((current) =>
        current.token === token
          ? {
              ...current,
              phase: 'arriving',
              progress: Math.max(
                current.progress,
                CINEMATIC_HANDOFF_DEPART_MS / CINEMATIC_HANDOFF_TOTAL_MS,
              ),
            }
          : current,
      )
      routerPush(destination)
    }, CINEMATIC_HANDOFF_DEPART_MS)

    terminalTimerRef.current = window.setTimeout(() => {
      if (nextTokenRef.current !== token) {
        return
      }

      terminalTimerRef.current = null
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      setNavigation((current) =>
        current.token === token
          ? { ...current, phase: 'idle', progress: 1 }
          : current,
      )
      clearPersistedHandoff(token)
      activeCarrierDirections.delete(token)
    }, CINEMATIC_HANDOFF_TOTAL_MS)
  }

  return (
    <div
      className={className}
      data-cinematic-navigation
      data-cinematic-navigation-phase={navigation.phase}
      data-cinematic-navigation-progress={String(navigation.progress)}
      data-cinematic-navigation-scene={scene}
      data-cinematic-navigation-target={navigation.target}
      data-cinematic-navigation-token={navigation.token}
      data-universe-content
      onClickCapture={handleClickCapture}
      ref={assignRoot}
    >
      {children}
      <CarrierSpine
        active={
          !navigation.reduced &&
          (navigation.phase === 'arriving' || navigation.phase === 'departing')
        }
        destination={navigation.destination}
        direction={navigation.direction}
        progress={navigation.progress}
        target={navigation.target}
        token={navigation.token}
      />
    </div>
  )
}

export function CinematicDetailArrival({
  className,
  destination,
  motif,
}: CinematicDetailArrivalProps) {
  const [arrival, setArrival] = useState(() =>
    createInitialDetailArrivalState(destination),
  )
  const frameRef = useRef<number | null>(null)
  const terminalTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const consumed = consumePersistedHandoff(destination)

    if (!consumed || consumed.handoff.destination !== destination) {
      return undefined
    }
    const { direction, handoff } = consumed
    const releaseLease = retainDetailArrivalLease(handoff.token)
    let finished = false

    const finish = () => {
      if (finished) {
        return
      }

      finished = true
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
      if (terminalTimerRef.current !== null) {
        window.clearTimeout(terminalTimerRef.current)
      }
      frameRef.current = null
      terminalTimerRef.current = null
      setArrival({
        destination,
        direction,
        phase: 'settled',
        progress: 1,
        reduced: handoff.reduced,
        target: handoff.target,
        token: handoff.token,
      })
      clearPersistedHandoff(handoff.token)
      activeCarrierDirections.delete(handoff.token)
    }
    const completeHiddenArrival = () => {
      if (document.visibilityState === 'hidden') {
        finish()
      }
    }
    const updateProgress = (now: number) => {
      const elapsed = performance.timeOrigin + now - handoff.start
      const progress = Math.min(1, Math.max(0, elapsed / CINEMATIC_HANDOFF_TOTAL_MS))

      if (handoff.reduced || progress >= 1) {
        finish()
        return
      }

      setArrival({
        destination,
        direction,
        phase: 'entering',
        progress,
        reduced: false,
        target: handoff.target,
        token: handoff.token,
      })
      frameRef.current = window.requestAnimationFrame(updateProgress)
    }

    frameRef.current = window.requestAnimationFrame(updateProgress)

    const remaining = Math.max(0, CINEMATIC_HANDOFF_TOTAL_MS - (getTimelineTime() - handoff.start))

    terminalTimerRef.current = window.setTimeout(finish, remaining)
    document.addEventListener('visibilitychange', completeHiddenArrival)

    return () => {
      document.removeEventListener('visibilitychange', completeHiddenArrival)

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      if (terminalTimerRef.current !== null) {
        window.clearTimeout(terminalTimerRef.current)
        terminalTimerRef.current = null
      }
      releaseLease()
    }
  }, [destination])

  const visibleArrival =
    arrival.destination === destination ? arrival : initialDetailArrivalState
  const active =
    visibleArrival.phase === 'entering' && !visibleArrival.reduced

  return (
    <div
      aria-hidden="true"
      className={className}
      data-case-arrival={visibleArrival.phase}
      data-case-arrival-progress={String(visibleArrival.progress)}
      data-cinematic-navigation
      data-cinematic-navigation-phase={active ? 'arriving' : 'idle'}
      data-cinematic-navigation-progress={String(visibleArrival.progress)}
      data-cinematic-navigation-target={visibleArrival.target}
      data-cinematic-navigation-token={visibleArrival.token}
    >
      <CarrierSpine
        active={active}
        destination={destination}
        direction={visibleArrival.direction}
        motif={motif}
        progress={visibleArrival.progress}
        target={visibleArrival.target}
        token={visibleArrival.token}
      />
    </div>
  )
}
