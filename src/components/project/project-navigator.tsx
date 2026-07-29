import type { Ecosystem, Project } from '../../content/types'
import { ControlLink } from '../ui/control-link'

import styles from './project-case-study.module.css'

type ProjectNavigatorProps = Readonly<{
  ecosystem: Ecosystem
  nextProject: Project
}>

export function ProjectNavigator({ ecosystem, nextProject }: ProjectNavigatorProps) {
  return (
    <nav aria-label="Project navigation" className={styles.navigator}>
      <p className={styles.navigatorLabel}>Case-file routes</p>
      <div className={styles.navigatorLinks}>
        <ControlLink className={styles.navLink} controlRole="quiet" href={`/${ecosystem.slug}`}>
          Back to {ecosystem.name} projects
        </ControlLink>
        <ControlLink
          className={styles.navLink}
          controlRole="secondary"
          href={`/${nextProject.ecosystem}/${nextProject.slug}`}
        >
          Next case file: {nextProject.name}
        </ControlLink>
      </div>
    </nav>
  )
}
