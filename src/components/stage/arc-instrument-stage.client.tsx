'use client'

import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'

import type { Ecosystem, Project } from '../../content/types'
import {
  SceneTargetBoundary,
  useSceneTargetController,
} from '../scene/scene-target-controller.client'
import { serializeSceneTarget } from '../scene/scene-target'
import { ControlLink } from '../ui/control-link'
import { InstrumentStage } from './instrument-stage'

import styles from './instrument-stage.module.css'

const domainLabels = ['Research', 'Exchange', 'Forecast'] as const
const projectStatements = {
  'signal-ledger': 'Every autonomous action leaves a receipt worth trusting.',
  hadron: 'Issue the asset. Watch the market find its price.',
  arcpredict: 'Uncertainty becomes a market before it becomes a decision.',
} as const

type ArcInstrumentStageProps = Readonly<{
  ecosystem: Ecosystem
  projects: readonly Project[]
}>

function wrapIndex(index: number, count: number) {
  return (index + count) % count
}

function ArcProjectMachine({ ecosystem, projects }: ArcInstrumentStageProps) {
  const { commitTarget, committedTarget, effectiveTarget } = useSceneTargetController()
  const committedIndex =
    committedTarget.kind === 'project'
      ? projects.findIndex((project) => project.slug === committedTarget.project)
      : -1
  const activeIndex = committedIndex >= 0 ? committedIndex : 0
  const activeProject = projects[activeIndex]
  const [focusIndex, setFocusIndex] = useState(activeIndex)
  const selectorRefs = useRef<Array<HTMLButtonElement | null>>([])

  if (projects.length !== domainLabels.length) {
    throw new Error('ArcInstrumentStage requires exactly three catalog projects.')
  }

  function focusSelector(index: number) {
    const nextIndex = wrapIndex(index, projects.length)

    setFocusIndex(nextIndex)
    selectorRefs.current[nextIndex]?.focus()
  }

  function commitProject(index: number) {
    commitTarget(`project:${projects[index].slug}`)
    setFocusIndex(index)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        focusSelector(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        focusSelector(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusSelector(0)
        break
      case 'End':
        event.preventDefault()
        focusSelector(projects.length - 1)
        break
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault()
        commitProject(index)
        break
      default:
        break
    }
  }

  return (
    <>
      <InstrumentStage
        index={
          <div aria-label="Arc observation modes" className={styles.arcSelectors} role="group">
            {projects.map((project, index) => {
              const active = activeIndex === index

              return (
                <button
                  aria-label={`${String(index + 1).padStart(2, '0')} ${domainLabels[index]} — ${project.name}`}
                  aria-current={active ? 'true' : undefined}
                  aria-pressed={active}
                  className={styles.arcSelector}
                  data-control-role="stage"
                  data-scene-target={`project:${project.slug}`}
                  key={project.slug}
                  onClick={() => commitProject(index)}
                  onFocus={() => setFocusIndex(index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  onMouseEnter={() => commitProject(index)}
                  ref={(node) => {
                    selectorRefs.current[index] = node
                  }}
                  tabIndex={focusIndex === index ? 0 : -1}
                  type="button"
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{domainLabels[index]}</strong>
                </button>
              )
            })}
          </div>
        }
        readout={
          <section
            aria-label="Active project"
            className={styles.arcReadout}
            data-active-project={activeProject.slug}
          >
            <p className={styles.readoutCoordinate}>
              {String(activeIndex + 1).padStart(2, '0')} / {domainLabels[activeIndex]}
            </p>
            <h2>{activeProject.name}</h2>
            <p className={styles.readoutClaim} data-active-project-statement>
              {projectStatements[activeProject.slug as keyof typeof projectStatements]}
            </p>
            <ControlLink
              aria-label={`Open ${activeProject.name} case file`}
              className={styles.stagePrimaryLink}
              controlRole="primary"
              data-scene-target={`project:${activeProject.slug}`}
              href={`/${activeProject.ecosystem}/${activeProject.slug}`}
            >
              Open case file
            </ControlLink>
            <p aria-live="polite" className={styles.srOnly} data-arc-live>
              {activeProject.name}:{' '}
              {projectStatements[activeProject.slug as keyof typeof projectStatements]}
            </p>
          </section>
        }
        rootData={{
          'data-active-project': activeProject.slug,
          'data-committed-target': serializeSceneTarget(committedTarget),
          'data-ecosystem-hero': '',
          'data-ecosystem-theme': ecosystem.slug,
          'data-effective-target': serializeSceneTarget(effectiveTarget),
        }}
        scene={
          <div
            aria-hidden="true"
            className={styles.arcMachine}
            data-active-project={activeProject.slug}
            data-arc-form={domainLabels[activeIndex].toLowerCase()}
            data-cinematic-spatial
            style={{ '--node-accent': activeProject.theme.accent } as CSSProperties}
          >
            <span className={styles.arcMass} />
            <span className={styles.arcMass} />
            <span className={styles.arcMass} />
            <span className={styles.arcHalo} />
            <span className={styles.arcSignalPath} />
          </div>
        }
        style={
          {
            '--ecosystem-accent': ecosystem.theme.accent,
            '--ecosystem-surface': ecosystem.theme.surface,
            '--ecosystem-glow': ecosystem.theme.glow,
            '--stage-accent': activeProject.theme.accent,
          } as CSSProperties
        }
        title={
          <h1 className={styles.ecosystemTitle}>Arc</h1>
        }
        variant="arc"
      />
      <noscript>
        <nav aria-label="Arc project links" className={styles.noScriptRail}>
          <p>Arc project case files</p>
          {projects.map((project) => (
            <a href={`/${project.ecosystem}/${project.slug}`} key={project.slug}>
              {project.name}
            </a>
          ))}
        </nav>
      </noscript>
    </>
  )
}

export function ArcInstrumentStage(props: ArcInstrumentStageProps) {
  return (
    <SceneTargetBoundary scene="arc">
      <ArcProjectMachine {...props} />
    </SceneTargetBoundary>
  )
}
