'use client'

import { useEffect, useRef } from 'react'

import type { Ecosystem, Project } from '../../content/types'
import {
  CURSOR_LERP_MULTIPLIER,
  RESPONSIVENESS,
  SENSITIVITY,
} from '../../lib/constellation-motion'
import styles from './constellation-facade.module.css'

type ConstellationFacadeProps = Readonly<{
  ecosystems: readonly Ecosystem[]
  projects: readonly Project[]
}>

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], [data-cursor-interactive]'
const WORDMARK_TRAVEL_X = 18
const WORDMARK_TRAVEL_Y = 12
const MANIFESTO = "A universe of things I've built."

export function ConstellationFacade({
  ecosystems,
  projects,
}: ConstellationFacadeProps) {
  const facadeRef = useRef<HTMLElement>(null)
  const wordmarkRef = useRef<HTMLHeadingElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const facade = facadeRef.current
    const wordmark = wordmarkRef.current
    const cursor = cursorRef.current

    if (!facade || !wordmark || !cursor) {
      return
    }

    const motionPreference =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : undefined
    const wordmarkLerp = Math.min(1, RESPONSIVENESS * SENSITIVITY)
    const cursorLerp = Math.min(
      1,
      RESPONSIVENESS * CURSOR_LERP_MULTIPLIER,
    )
    let frameId: number | null = null
    let pointerListenersActive = false
    let targetWordmarkX = 0
    let targetWordmarkY = 0
    let currentWordmarkX = 0
    let currentWordmarkY = 0
    let targetCursorX = window.innerWidth / 2
    let targetCursorY = window.innerHeight / 2
    let currentCursorX = targetCursorX
    let currentCursorY = targetCursorY
    let targetCursorScale = 1
    let currentCursorScale = 1

    const renderFrame = () => {
      currentWordmarkX += (targetWordmarkX - currentWordmarkX) * wordmarkLerp
      currentWordmarkY += (targetWordmarkY - currentWordmarkY) * wordmarkLerp
      currentCursorX += (targetCursorX - currentCursorX) * cursorLerp
      currentCursorY += (targetCursorY - currentCursorY) * cursorLerp
      currentCursorScale +=
        (targetCursorScale - currentCursorScale) * cursorLerp

      wordmark.style.transform = `translate3d(${currentWordmarkX}px, ${currentWordmarkY}px, 0)`
      cursor.style.transform = `translate3d(${currentCursorX}px, ${currentCursorY}px, 0) translate3d(-50%, -50%, 0) scale(${currentCursorScale})`
      frameId = window.requestAnimationFrame(renderFrame)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const viewportWidth = Math.max(window.innerWidth, 1)
      const viewportHeight = Math.max(window.innerHeight, 1)
      const normalizedX = event.clientX / viewportWidth - 0.5
      const normalizedY = event.clientY / viewportHeight - 0.5

      targetWordmarkX = normalizedX * -2 * WORDMARK_TRAVEL_X * SENSITIVITY
      targetWordmarkY = normalizedY * -2 * WORDMARK_TRAVEL_Y * SENSITIVITY
      targetCursorX = event.clientX
      targetCursorY = event.clientY
      targetCursorScale =
        event.target instanceof Element &&
        event.target.closest(INTERACTIVE_SELECTOR)
          ? 1.65
          : 1
      cursor.dataset.active = 'true'
    }

    const handlePointerLeave = () => {
      targetWordmarkX = 0
      targetWordmarkY = 0
      targetCursorScale = 1
      cursor.dataset.active = 'false'
    }

    const addPointerListeners = () => {
      if (pointerListenersActive) {
        return
      }

      window.addEventListener('pointermove', handlePointerMove, {
        passive: true,
      })
      window.addEventListener('pointerleave', handlePointerLeave)
      window.addEventListener('blur', handlePointerLeave)
      pointerListenersActive = true
    }

    const removePointerListeners = () => {
      if (!pointerListenersActive) {
        return
      }

      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
      window.removeEventListener('blur', handlePointerLeave)
      pointerListenersActive = false
    }

    const stopAnimation = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
        frameId = null
      }
    }

    const settleStatic = () => {
      targetWordmarkX = 0
      targetWordmarkY = 0
      currentWordmarkX = 0
      currentWordmarkY = 0
      targetCursorScale = 1
      currentCursorScale = 1
      wordmark.style.transform = 'translate3d(0, 0, 0)'
      cursor.style.transform = 'translate3d(0, 0, 0)'
      cursor.dataset.active = 'false'
    }

    const syncMotionPreference = (reducedMotion: boolean) => {
      stopAnimation()
      removePointerListeners()

      if (reducedMotion) {
        facade.dataset.motion = 'static'
        settleStatic()
        return
      }

      facade.dataset.motion = 'animated'
      addPointerListeners()
      frameId = window.requestAnimationFrame(renderFrame)
    }

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      syncMotionPreference(event.matches)
    }

    syncMotionPreference(motionPreference?.matches ?? false)
    motionPreference?.addEventListener('change', handleMotionPreferenceChange)

    return () => {
      motionPreference?.removeEventListener(
        'change',
        handleMotionPreferenceChange,
      )
      stopAnimation()
      removePointerListeners()
    }
  }, [])

  return (
    <section
      className={styles.facade}
      data-constellation-facade
      data-motion="animated"
      ref={facadeRef}
    >
      <div className={styles.door} data-constellation-door>
        <h1 className={styles.wordmark} ref={wordmarkRef}>
          CAPTAIN DOCK
        </h1>
        <div className={styles.statement}>
          <p className={styles.manifesto}>{MANIFESTO}</p>
          <p className={styles.meta}>
            {projects.length} works · {ecosystems.length} systems · 2026
          </p>
        </div>
      </div>

      <div
        aria-hidden="true"
        className={styles.cursor}
        data-active="false"
        data-constellation-cursor
        ref={cursorRef}
      />
    </section>
  )
}
