import { Fragment } from 'react'

import type { Project } from '../../content/types'
import { ExternalLink } from '../ui/external-link'
import { StatusLabel } from '../ui/status-label'

import styles from './project-case-study.module.css'

type ProjectHeroProps = Readonly<{
  project: Project
}>

function renderTitleWithBreakpoints(name: string) {
  const segments = name.split('/')

  return segments.map((segment, index) => (
    <Fragment key={`${segment}-${index}`}>
      <span className={styles.titleSegment} data-project-title-segment>
        {segment}
      </span>
      {index < segments.length - 1 ? (
        <>
          /<wbr />
        </>
      ) : null}
    </Fragment>
  ))
}

export function ProjectHero({ project }: ProjectHeroProps) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroCopy} data-project-hero-copy>
        <h1 className={styles.heroTitle}>{renderTitleWithBreakpoints(project.name)}</h1>
        <p className={styles.tagline}>{project.tagline}</p>
        <ExternalLink className={styles.primaryCta} controlRole="primary" href={project.liveUrl}>
          Launch live site
        </ExternalLink>
        <ul
          aria-label="Project status"
          className={`${styles.statusList} ${styles.heroStatus}`}
          data-project-status-rail
        >
          {project.status.map((status) => (
            <li key={status}>
              <StatusLabel status={status} />
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
