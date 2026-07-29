'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { SceneErrorBoundary } from './scene-error-boundary.client'
import {
  compareQuality,
  degradeQuality,
  selectQuality,
  type SceneQuality,
  type UserQualityPreference,
} from './quality'

export type EnhancedSceneQuality = Exclude<SceneQuality, 'static'>

export type CapabilityGateRenderProps = {
  quality: EnhancedSceneQuality
  reportReady: () => void
  reportFailure: (error?: unknown) => void
  degrade: () => void
}

type CapabilityGateProps = {
  fallback: ReactNode
  renderEnhanced: (props: CapabilityGateRenderProps) => ReactNode
  userPreference?: UserQualityPreference
  onFailure?: (error?: unknown) => void
}

type NetworkInformationLike = {
  saveData?: boolean
  addEventListener?: EventTarget['addEventListener']
  removeEventListener?: EventTarget['removeEventListener']
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike
}

function getConnection() {
  return (navigator as NavigatorWithConnection).connection
}

function readSaveData() {
  return Boolean(getConnection()?.saveData)
}

function probeWebGL2() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2')

    if (!context) {
      return false
    }

    context.getExtension('WEBGL_lose_context')?.loseContext()

    return true
  } catch {
    return false
  }
}

function detectQuality(
  mediaQuery: MediaQueryList | undefined,
  userPreference: UserQualityPreference,
  readWebGL2: () => boolean,
) {
  const reducedMotion = Boolean(mediaQuery?.matches)
  const saveData = readSaveData()
  const width = window.innerWidth

  if (reducedMotion || saveData || userPreference === 'static') {
    return selectQuality({
      width,
      reducedMotion,
      saveData,
      webgl2: false,
      userPreference,
    })
  }

  return selectQuality({
    width,
    reducedMotion,
    saveData,
    webgl2: readWebGL2(),
    userPreference,
  })
}

function lowerOnly(current: SceneQuality, next: SceneQuality) {
  return compareQuality(next, current) < 0 ? next : current
}

function addMediaListener(mediaQuery: MediaQueryList, listener: () => void) {
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener)

    return () => mediaQuery.removeEventListener('change', listener)
  }

  mediaQuery.addListener(listener)

  return () => mediaQuery.removeListener(listener)
}

export function CapabilityGate({
  fallback,
  renderEnhanced,
  userPreference = 'auto',
  onFailure,
}: CapabilityGateProps) {
  const initializedRef = useRef(false)
  const webgl2Ref = useRef<boolean | null>(null)
  const [quality, setQuality] = useState<SceneQuality>('static')
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const reportFailure = useCallback(
    (error?: unknown) => {
      setFailed(true)
      setReady(false)
      setQuality('static')
      onFailure?.(error)
    },
    [onFailure],
  )

  const reportReady = useCallback(() => {
    setReady(true)
  }, [])

  const degrade = useCallback(() => {
    const nextQuality = degradeQuality(quality)

    if (nextQuality === 'static') {
      setReady(false)
    }

    setQuality(nextQuality)
  }, [quality])

  useEffect(() => {
    if (failed) {
      return undefined
    }

    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : undefined
    const connection = getConnection()
    let disposed = false

    const readWebGL2 = () => {
      if (webgl2Ref.current === null) {
        webgl2Ref.current = probeWebGL2()
      }

      return webgl2Ref.current
    }

    const evaluate = () => {
      if (disposed) {
        return
      }

      const nextQuality = detectQuality(mediaQuery, userPreference, readWebGL2)

      setQuality((current) => {
        if (!initializedRef.current) {
          initializedRef.current = true
          return nextQuality
        }

        return lowerOnly(current, nextQuality)
      })
    }

    evaluate()

    const removeMediaListener = mediaQuery ? addMediaListener(mediaQuery, evaluate) : undefined

    window.addEventListener('resize', evaluate)
    connection?.addEventListener?.('change', evaluate)

    return () => {
      disposed = true
      removeMediaListener?.()
      window.removeEventListener('resize', evaluate)
      connection?.removeEventListener?.('change', evaluate)
    }
  }, [failed, userPreference])

  const shouldRenderEnhanced = quality !== 'static' && !failed
  const shouldRenderFallback = quality === 'static' || !ready

  return (
    <>
      {shouldRenderFallback ? fallback : null}
      {shouldRenderEnhanced ? (
        <SceneErrorBoundary fallback={fallback} onFailure={reportFailure}>
          {renderEnhanced({
            quality,
            reportReady,
            reportFailure,
            degrade,
          })}
        </SceneErrorBoundary>
      ) : null}
    </>
  )
}
