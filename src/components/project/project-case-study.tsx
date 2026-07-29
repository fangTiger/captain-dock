import type { CSSProperties } from 'react'

import type { Ecosystem, Project } from '../../content/types'
import { CinematicDetailArrival } from '../scene/cinematic-navigation-bridge.client'

import { CoreLoop } from './core-loop'
import { EvidenceSection } from './evidence-section'
import styles from './project-case-study.module.css'
import { ProjectHero } from './project-hero'
import { ProjectGallery } from './project-gallery'
import { ProjectNavigator } from './project-navigator'
import { ProjectSignature } from './signature/project-signature'
import { StackLanes } from './stack-lanes'

type ProjectCaseStudyProps = Readonly<{
  project: Project
  ecosystem: Ecosystem
  nextProject: Project
}>

export function ProjectCaseStudy({ project, ecosystem, nextProject }: ProjectCaseStudyProps) {
  const themeStyle = {
    '--project-accent': project.theme.accent,
    '--project-aura': project.theme.aura,
  } as CSSProperties

  return (
    <article
      aria-label={`${project.name} case file`}
      className={styles.caseFile}
      data-project-motif={project.theme.motif}
      style={themeStyle}
    >
      <div className={styles.heroStage} data-case-hero-stage>
        <CinematicDetailArrival
          className={styles.caseArrival}
          destination={`/${project.ecosystem}/${project.slug}`}
          motif={project.theme.motif}
        />
        <ProjectHero project={project} />
        <ProjectSignature project={project} />
      </div>

      <section
        aria-labelledby="problem-heading"
        className={`${styles.chapter} ${styles.problemChapter}`}
        role="region"
      >
        <div className={styles.chapterHeader}>
          <p className={styles.chapterIndex}>01 / Context</p>
          <h2 className={styles.sectionTitle} id="problem-heading">
            Problem
          </h2>
        </div>
        <div className={styles.problemBody}>
          <p className={styles.sectionBody}>{project.summary}</p>
          <details aria-label="Boundaries" className={styles.boundaryBlock}>
            <summary>Boundaries</summary>
            <ul aria-label="Limits and boundaries" className={styles.limitList}>
              {project.limits.map((limit) => (
                <li className={styles.limitItem} key={limit}>
                  <span aria-hidden="true" className={styles.limitMarker}>
                    /
                  </span>
                  <span className={styles.limitText}>{limit}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </section>

      <section
        aria-labelledby="mechanism-heading"
        className={`${styles.chapter} ${styles.mechanismChapter}`}
        role="region"
      >
        <div className={styles.chapterHeader}>
          <p className={styles.chapterIndex}>02 / System</p>
          <h2 className={styles.sectionTitle} id="mechanism-heading">
            Mechanism
          </h2>
        </div>
        <div className={styles.mechanismBody}>
          <CoreLoop steps={project.coreLoop} />
          <details aria-label="Technical notes" className={styles.technicalNotes}>
            <summary>Technical notes</summary>
            <div className={styles.technicalContent}>
              <div className={styles.projectFacts}>
                <div>
                  <p className={styles.metaLabel}>Roles</p>
                  <ul className={styles.pillList}>
                    {project.roles.map((role) => (
                      <li className={styles.pill} key={role}>
                        {role}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className={styles.metaLabel}>Tags</p>
                  <ul className={styles.pillList}>
                    {project.tags.map((tag) => (
                      <li className={styles.pill} key={tag}>
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <StackLanes lanes={project.stack} />
            </div>
          </details>
        </div>
      </section>

      <section
        aria-labelledby="proof-heading"
        className={`${styles.chapter} ${styles.proofChapter}`}
        role="region"
      >
        <div className={styles.chapterHeader}>
          <p className={styles.chapterIndex}>03 / Evidence</p>
          <h2 className={styles.sectionTitle} id="proof-heading">
            Proof
          </h2>
        </div>
        <div className={styles.proofBody}>
          <ProjectGallery gallery={project.gallery} />
          <EvidenceSection evidence={project.evidence} />
        </div>
      </section>

      <ProjectNavigator ecosystem={ecosystem} nextProject={nextProject} />
    </article>
  )
}
