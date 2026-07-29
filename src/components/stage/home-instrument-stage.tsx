'use client'

import Link from 'next/link'
import { Fragment, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'

import type { Ecosystem, Project } from '../../content/types'
import {
  SceneTargetBoundary,
  useSceneTargetController,
} from '../scene/scene-target-controller.client'
import { serializeSceneTarget } from '../scene/scene-target'
import { ControlLink } from '../ui/control-link'
import { InstrumentStage } from './instrument-stage'

import styles from './instrument-stage.module.css'

type HomeInstrumentStageProps = Readonly<{
  ecosystems: readonly Ecosystem[]
  projects: readonly Project[]
}>

const projectStatements = {
  'signal-ledger': 'Every autonomous action leaves a receipt worth trusting.',
  hadron: 'Issue the asset. Watch the market find its price.',
  arcpredict: 'Uncertainty becomes a market before it becomes a decision.',
  'rialo-captain': 'Disruption becomes evidence, settlement, and a clear next move.',
} as const satisfies Record<Project['slug'], string>

function wrapProjectIndex(index: number, count: number) {
  return (index + count) % count
}

function HomeProjectReel({ ecosystems, projects }: HomeInstrumentStageProps) {
  const {
    clearPreviewTarget,
    commitTarget,
    committedTarget,
    effectiveTarget,
    motionMode,
    setPreviewTarget,
  } = useSceneTargetController()
  const committedProjectIndex =
    committedTarget.kind === 'project'
      ? projects.findIndex((project) => project.slug === committedTarget.project)
      : -1
  const activeIndex = committedProjectIndex >= 0 ? committedProjectIndex : 0
  const activeProject = projects[activeIndex]
  const effectiveProjectIndex =
    effectiveTarget.kind === 'project'
      ? projects.findIndex((project) => project.slug === effectiveTarget.project)
      : -1
  const visualProject =
    effectiveProjectIndex >= 0 ? projects[effectiveProjectIndex] : activeProject
  const [focusIndex, setFocusIndex] = useState(activeIndex)
  const selectorRefs = useRef<Array<HTMLButtonElement | null>>([])

  if (projects.length !== 4) {
    throw new Error('HomeInstrumentStage requires exactly four catalog projects.')
  }

  if (ecosystems.length !== 2) {
    throw new Error('HomeInstrumentStage requires exactly two catalog ecosystems.')
  }

  function focusProject(index: number) {
    const nextIndex = wrapProjectIndex(index, projects.length)

    setFocusIndex(nextIndex)
    selectorRefs.current[nextIndex]?.focus()
  }

  function handleSelectorKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        focusProject(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        focusProject(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusProject(0)
        break
      case 'End':
        event.preventDefault()
        focusProject(projects.length - 1)
        break
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault()
        commitTarget(`project:${projects[index].slug}`)
        setFocusIndex(index)
        break
      default:
        break
    }
  }

  return (
    <>
      <InstrumentStage
      index={
        <div className={styles.homeIndex}>
          <div
            aria-label="Project reel"
            className={styles.projectReel}
            id="project-index"
            role="group"
          >
            {projects.map((project, index) => {
              const active = project.slug === activeProject.slug

              return (
                <button
                  aria-current={active ? 'true' : undefined}
                  aria-pressed={active}
                  className={styles.projectNode}
                  data-node-index={String(index + 1).padStart(2, '0')}
                  data-scene-target={`project:${project.slug}`}
                  key={project.slug}
                  onBlur={() => clearPreviewTarget('focus')}
                  onClick={() => {
                    commitTarget(`project:${project.slug}`)
                    setFocusIndex(index)
                  }}
                  onFocus={() => {
                    setFocusIndex(index)
                    setPreviewTarget(`project:${project.slug}`, 'focus')
                  }}
                  onKeyDown={(event) => handleSelectorKeyDown(event, index)}
                  onPointerEnter={() => setPreviewTarget(`project:${project.slug}`, 'pointer')}
                  onPointerLeave={() => clearPreviewTarget('pointer')}
                  ref={(node) => {
                    selectorRefs.current[index] = node
                  }}
                  style={{ '--node-accent': project.theme.accent } as CSSProperties}
                  tabIndex={focusIndex === index ? 0 : -1}
                  type="button"
                >
                  <span aria-hidden="true" className={styles.projectNodeIndex}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.projectNodeName}>{project.name}</span>
                </button>
              )
            })}
          </div>
          <nav aria-label="Ecosystem stage index" className={styles.ecosystemStageIndex}>
            {ecosystems.map((ecosystem) => (
              <Link
                className={styles.ecosystemStageLink}
                data-scene-target={`ecosystem:${ecosystem.slug}`}
                href={`/${ecosystem.slug}`}
                key={ecosystem.slug}
              >
                <span className={styles.ecosystemNumber}>{ecosystem.index}</span>
                <strong>{ecosystem.name}</strong>
              </Link>
            ))}
          </nav>
        </div>
      }
      readout={
        <section
          aria-label="Active project"
          className={styles.homeReadout}
          data-active-project={activeProject.slug}
        >
          <p className={styles.activeProjectCoordinate}>
            {String(activeIndex + 1).padStart(2, '0')} / 04
          </p>
          <p className={styles.activeProjectStatement} data-active-project-statement>
            {projectStatements[activeProject.slug]}
          </p>
          <ControlLink
            aria-label={`Open ${activeProject.name} case file`}
            className={styles.homePrimaryLink}
            controlRole="primary"
            data-scene-target={`project:${activeProject.slug}`}
            href={`/${activeProject.ecosystem}/${activeProject.slug}`}
          >
            Open case file
          </ControlLink>
          <p aria-live="polite" className={styles.srOnly} data-project-reel-live>
            {activeProject.name}: {projectStatements[activeProject.slug]}
          </p>
        </section>
      }
      rootData={{
        'data-active-project': activeProject.slug,
        'data-committed-target': serializeSceneTarget(committedTarget),
        'data-effective-target': serializeSceneTarget(effectiveTarget),
        'data-scene-motion': motionMode,
        'data-visual-project': visualProject.slug,
      }}
      scene={
        <div
          aria-hidden="true"
          className={styles.homeMachine}
          data-cinematic-spatial
          data-home-monument
          data-project-shape={visualProject.slug}
        >
          <span className={styles.monumentPlane} />
          <span className={styles.monumentPlane} />
          <span className={styles.monumentPlane} />
          <span className={styles.monumentHorizon} data-home-horizon />
          <span className={styles.monumentBeacon} />
        </div>
      }
      style={
        {
          '--stage-accent': visualProject.theme.accent,
          '--stage-accent-soft': visualProject.theme.aura,
        } as CSSProperties
      }
      title={
        <h1
          aria-label="A UNIVERSE OF THINGS I’VE BUILT."
          className={styles.homeHeadline}
          data-scene-target={`project:${activeProject.slug}`}
        >
          <span className={styles.srOnly}>A UNIVERSE OF THINGS I’VE BUILT.</span>
          <span aria-hidden="true">
            {activeProject.name.split('/').map((segment, index) => (
              <Fragment key={`${segment}-${index}`}>
                {index > 0 ? (
                  <>
                    {'/'}
                    <wbr />
                  </>
                ) : null}
                {segment}
              </Fragment>
            ))}
          </span>
        </h1>
      }
      variant="home"
      />
      <noscript>
        <nav aria-label="Home project and ecosystem links" className={styles.noScriptRail}>
          <p>Project case files</p>
          {projects.map((project) => (
            <a href={`/${project.ecosystem}/${project.slug}`} key={project.slug}>
              {project.name}
            </a>
          ))}
          <p>Ecosystems</p>
          {ecosystems.map((ecosystem) => (
            <a href={`/${ecosystem.slug}`} key={ecosystem.slug}>
              {ecosystem.name}
            </a>
          ))}
        </nav>
      </noscript>
    </>
  )
}

export function HomeInstrumentStage(props: HomeInstrumentStageProps) {
  return (
    <SceneTargetBoundary scene="home">
      <HomeProjectReel {...props} />
    </SceneTargetBoundary>
  )
}
