'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import styles from './instrument-stage.module.css'

export type InstrumentStageVariant = 'home' | 'arc' | 'rialo'
export type InstrumentStageEntryMotion = 'animate' | 'auto' | 'reduced' | 'settled'

const INSTRUMENT_STAGE_ENTRY_DURATION_MS = 1200

type InstrumentStageProps = Readonly<{
  className?: string
  entryMotion?: InstrumentStageEntryMotion
  footer?: ReactNode
  index: ReactNode
  readout?: ReactNode
  rootData?: Readonly<Record<`data-${string}`, string>>
  scene: ReactNode
  style?: CSSProperties
  title: ReactNode
  variant: InstrumentStageVariant
}>

function classNames(...names: Array<string | undefined>) {
  return names.filter(Boolean).join(' ')
}

function getInitialEntryState(entryMotion: InstrumentStageEntryMotion) {
  return entryMotion === 'reduced' || entryMotion === 'settled'
    ? { phase: 'settled' as const, progress: 1 }
    : { phase: 'entering' as const, progress: 0 }
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function InstrumentStage({
  className,
  entryMotion = 'auto',
  footer,
  index,
  readout,
  rootData,
  scene,
  style,
  title,
  variant,
}: InstrumentStageProps) {
  const [entry, setEntry] = useState(() => getInitialEntryState(entryMotion))
  const frameRef = useRef<number | null>(null)
  const terminalTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (entryMotion === 'settled' || entryMotion === 'reduced') {
      return undefined
    }

    let active = true
    const cancelScheduledEntry = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      if (terminalTimerRef.current !== null) {
        window.clearTimeout(terminalTimerRef.current)
        terminalTimerRef.current = null
      }
    }
    const settleEntry = () => {
      if (!active) {
        return
      }

      cancelScheduledEntry()
      setEntry({ phase: 'settled', progress: 1 })
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        settleEntry()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (document.visibilityState === 'hidden') {
      queueMicrotask(settleEntry)

      return () => {
        active = false
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        cancelScheduledEntry()
      }
    }

    if (entryMotion === 'auto' && prefersReducedMotion()) {
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        setEntry({ phase: 'settled', progress: 1 })
      })

      return () => {
        active = false
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        cancelScheduledEntry()
      }
    }

    const startedAt = performance.now()

    const updateProgress = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - startedAt) / INSTRUMENT_STAGE_ENTRY_DURATION_MS))

      if (progress >= 1) {
        frameRef.current = null
        setEntry({ phase: 'settled', progress: 1 })
        return
      }

      setEntry({ phase: 'entering', progress })
      frameRef.current = window.requestAnimationFrame(updateProgress)
    }

    frameRef.current = window.requestAnimationFrame(updateProgress)
    terminalTimerRef.current = window.setTimeout(() => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }

      terminalTimerRef.current = null
      setEntry({ phase: 'settled', progress: 1 })
    }, INSTRUMENT_STAGE_ENTRY_DURATION_MS)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cancelScheduledEntry()
    }
  }, [entryMotion])

  return (
    <section
      {...rootData}
      aria-label={`${variant} instrument stage`}
      className={classNames(styles.stage, styles[variant], className)}
      data-cinematic-entry={entry.phase}
      data-cinematic-entry-progress={String(entry.progress)}
      data-instrument-stage={variant}
      style={style}
    >
      <header className={styles.title} data-stage-title>
        {title}
      </header>
      <div className={styles.scene} data-stage-protagonist data-stage-scene>
        {scene}
      </div>
      {readout ? (
        <div className={styles.readout} data-stage-readout>
          {readout}
        </div>
      ) : null}
      <div className={styles.index} data-stage-index>
        {index}
      </div>
      {footer ? (
        <footer className={styles.footer} data-stage-footer>
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
