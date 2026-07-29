'use client'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'

import type { CoreLoopStep, Ecosystem, Project } from '../../content/types'
import {
  SceneTargetBoundary,
  useSceneTargetController,
} from '../scene/scene-target-controller.client'
import { serializeSceneTarget } from '../scene/scene-target'
import { RIALO_STEP_SIGNALS, type RialoStepSignal } from '../scene/scene-types'
import { InstrumentStage } from '../stage/instrument-stage'
import { ControlLink } from '../ui/control-link'

import styles from './rialo-reactive-loop.module.css'

const SIGNAL_LABELS = {
  observe: 'Observe',
  cover: 'Cover',
  trigger: 'Trigger',
  settle: 'Settle',
  explain: 'Explain',
} as const satisfies Record<RialoStepSignal, string>

type RialoReactiveLoopProps = Readonly<{
  coreLoop: readonly CoreLoopStep[]
  ecosystem?: Ecosystem
  project?: Project
}>

type RialoEventPhase = 'active' | 'idle' | 'settled'
type RialoEventState = Readonly<{
  phase: RialoEventPhase
  progress: number
  signal: RialoStepSignal
}>

const RIALO_EVENT_DURATION_MS = 780

function clampStepIndex(index: number) {
  return Math.min(Math.max(index, 0), RIALO_STEP_SIGNALS.length - 1)
}

function getStepDescriptionId(index: number) {
  return `rialo-step-${index + 1}-description`
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function RialoEventField({ coreLoop, ecosystem, project }: RialoReactiveLoopProps) {
  const { commitTarget, committedTarget, effectiveTarget } = useSceneTargetController()
  const committedIndex =
    committedTarget.kind === 'rialo-step'
      ? RIALO_STEP_SIGNALS.indexOf(committedTarget.step)
      : -1
  const activeIndex = committedIndex >= 0 ? committedIndex : 0
  const activeSignalValue = RIALO_STEP_SIGNALS[activeIndex]
  const activeSignal = SIGNAL_LABELS[activeSignalValue]
  const activeStep = coreLoop[activeIndex]
  const [focusIndex, setFocusIndex] = useState(activeIndex)
  const [rialoEvent, setRialoEvent] = useState<RialoEventState>({
    phase: 'settled',
    progress: 1,
    signal: activeSignalValue,
  })
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const eventFrameRef = useRef<number | null>(null)
  const eventTerminalTimerRef = useRef<number | null>(null)

  if (coreLoop.length !== RIALO_STEP_SIGNALS.length) {
    throw new Error('RialoReactiveLoop requires exactly five core loop steps.')
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') {
        return
      }

      if (eventFrameRef.current !== null) {
        window.cancelAnimationFrame(eventFrameRef.current)
        eventFrameRef.current = null
      }
      if (eventTerminalTimerRef.current !== null) {
        window.clearTimeout(eventTerminalTimerRef.current)
        eventTerminalTimerRef.current = null
      }
      setRialoEvent((current) => ({
        ...current,
        phase: 'settled',
        progress: 1,
      }))
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (eventFrameRef.current !== null) {
        window.cancelAnimationFrame(eventFrameRef.current)
      }
      if (eventTerminalTimerRef.current !== null) {
        window.clearTimeout(eventTerminalTimerRef.current)
      }
    }
  }, [])

  function moveFocus(nextIndex: number) {
    const clampedIndex = clampStepIndex(nextIndex)

    setFocusIndex(clampedIndex)
    buttonRefs.current[clampedIndex]?.focus()
  }

  function commitStep(index: number) {
    const signal = RIALO_STEP_SIGNALS[index]

    if (eventFrameRef.current !== null) {
      window.cancelAnimationFrame(eventFrameRef.current)
      eventFrameRef.current = null
    }
    if (eventTerminalTimerRef.current !== null) {
      window.clearTimeout(eventTerminalTimerRef.current)
      eventTerminalTimerRef.current = null
    }

    if (prefersReducedMotion() || document.visibilityState === 'hidden') {
      setRialoEvent({ phase: 'settled', progress: 1, signal })
      commitTarget(`rialo-step:${signal}`)
      setFocusIndex(index)
      return
    }

    let startedAt: number | null = null
    const updateProgress = (now: number) => {
      startedAt ??= now
      const progress = Math.min(1, Math.max(0, (now - startedAt) / RIALO_EVENT_DURATION_MS))

      if (progress >= 1) {
        eventFrameRef.current = null
        setRialoEvent({ phase: 'settled', progress: 1, signal })
        return
      }

      setRialoEvent({ phase: 'active', progress, signal })
      eventFrameRef.current = window.requestAnimationFrame(updateProgress)
    }

    setRialoEvent({ phase: 'active', progress: 0, signal })
    eventFrameRef.current = window.requestAnimationFrame(updateProgress)
    eventTerminalTimerRef.current = window.setTimeout(() => {
      if (eventFrameRef.current !== null) {
        window.cancelAnimationFrame(eventFrameRef.current)
        eventFrameRef.current = null
      }

      eventTerminalTimerRef.current = null
      setRialoEvent({ phase: 'settled', progress: 1, signal })
    }, RIALO_EVENT_DURATION_MS)
    commitTarget(`rialo-step:${signal}`)
    setFocusIndex(index)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        moveFocus(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        moveFocus(index - 1)
        break
      case 'Home':
        event.preventDefault()
        moveFocus(0)
        break
      case 'End':
        event.preventDefault()
        moveFocus(RIALO_STEP_SIGNALS.length - 1)
        break
      case ' ':
      case 'Spacebar':
      case 'Enter':
        event.preventDefault()
        commitStep(index)
        break
      default:
        break
    }
  }

  const stageTimeline = (
    <ol aria-label="Rialo Captain core loop" className={styles.timeline}>
      {coreLoop.map((step, index) => {
        const signal = RIALO_STEP_SIGNALS[index]
        const signalLabel = SIGNAL_LABELS[signal]
        const isActive = activeIndex === index

        return (
          <li
            className={styles.stage}
            data-active={isActive ? 'true' : undefined}
            data-rialo-step
            key={signal}
          >
            <button
              aria-current={isActive ? 'step' : undefined}
              aria-describedby={getStepDescriptionId(index)}
              aria-pressed={isActive}
              className={styles.stageButton}
              data-control-role="stage"
              data-scene-target={`rialo-step:${signal}`}
              onClick={() => commitStep(index)}
              onFocus={() => setFocusIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              ref={(node) => {
                buttonRefs.current[index] = node
              }}
              tabIndex={focusIndex === index ? 0 : -1}
              type="button"
            >
              <span className={styles.stageIndex}>{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.stageCopy}>
                <span className={styles.stageSignal}>{signalLabel}</span>
                <span className={styles.stageTitle}>{step.label}</span>
              </span>
              <span className={styles.stageLamp} aria-hidden="true" />
            </button>
            <p
              className={styles.stageDescription}
              data-rialo-step-description
              hidden={!isActive}
              id={getStepDescriptionId(index)}
            >
              {step.description}
            </p>
          </li>
        )
      })}
    </ol>
  )

  return (
    <>
      <InstrumentStage
        className={styles.field}
        index={stageTimeline}
        readout={
          <section
            aria-label="Active stage"
            aria-labelledby="rialo-active-readout-heading"
            className={styles.readout}
            data-rialo-readout
            data-testid="rialo-active-readout"
          >
            <p aria-hidden="true" className={styles.readoutSignal}>
              {String(activeIndex + 1).padStart(2, '0')} / 05
            </p>
            <h3 id="rialo-active-readout-heading">{activeSignal}</h3>
            <p className={styles.activeProjectStatement} data-active-project-statement>
              Disruption becomes evidence, settlement, and a clear next move.
            </p>
            {project ? (
              <ControlLink
                aria-label={`Open ${project.name} case file`}
                className={styles.projectLink}
                controlRole="primary"
                data-scene-target={`project:${project.slug}`}
                href={`/${project.ecosystem}/${project.slug}`}
              >
                Open case file
              </ControlLink>
            ) : null}
            <p aria-live="polite" className={styles.srOnly} data-rialo-live>
              {activeSignal}: {activeStep.label}. {activeStep.description}
            </p>
          </section>
        }
        rootData={{
          'data-committed-target': serializeSceneTarget(committedTarget),
          'data-ecosystem-hero': '',
          'data-ecosystem-theme': ecosystem?.slug ?? 'rialo',
          'data-effective-target': serializeSceneTarget(effectiveTarget),
          'data-rialo-event': rialoEvent.signal,
          'data-rialo-event-phase': rialoEvent.phase,
          'data-rialo-event-progress': String(rialoEvent.progress),
          'data-rialo-reactive-loop': '',
        }}
        scene={
          <div
            aria-hidden="true"
            className={styles.radar}
            data-cinematic-spatial
            data-rialo-active-signal={activeSignalValue}
            data-rialo-event-phase={rialoEvent.phase}
            data-rialo-event-progress={String(rialoEvent.progress)}
          >
            <span className={styles.corridorPlane} />
            <span className={styles.corridorPlane} />
            <span className={styles.radarReference} />
            <span className={styles.radarRoute} />
            <span className={styles.triggerLock} />
            {RIALO_STEP_SIGNALS.map((signal, index) => (
              <span
                className={styles.radarNode}
                data-active={activeIndex === index ? 'true' : undefined}
                data-radar-node={signal}
                key={signal}
              />
            ))}
          </div>
        }
        style={
          ecosystem
            ? ({
                '--ecosystem-accent': ecosystem.theme.accent,
                '--ecosystem-surface': ecosystem.theme.surface,
                '--ecosystem-glow': ecosystem.theme.glow,
              } as CSSProperties)
            : undefined
        }
        title={
          <h1 className={styles.ecosystemTitle}>Rialo</h1>
        }
        variant="rialo"
      />
      <noscript>
        <div className={styles.noScriptRail}>
          {project ? (
            <a href={`/${project.ecosystem}/${project.slug}`}>{project.name}</a>
          ) : null}
          <p>Observe · Cover · Trigger · Settle · Explain</p>
          <ol>
            {coreLoop.map((step, index) => (
              <li key={step.label}>
                <strong>{SIGNAL_LABELS[RIALO_STEP_SIGNALS[index]]}</strong>: {step.label}.{' '}
                {step.description}
              </li>
            ))}
          </ol>
        </div>
      </noscript>
    </>
  )
}

export function RialoReactiveLoop(props: RialoReactiveLoopProps) {
  return (
    <SceneTargetBoundary scene="rialo">
      <RialoEventField {...props} />
    </SceneTargetBoundary>
  )
}
