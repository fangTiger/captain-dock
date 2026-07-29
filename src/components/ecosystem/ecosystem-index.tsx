import type { Ecosystem, Project } from '../../content/types'
import { ProjectCard } from '../project/project-card'
import styles from '../../styles/universe-pages.module.css'

type EcosystemIndexProps = Readonly<{
  ecosystem: Ecosystem
  projects: readonly Project[]
}>

export function EcosystemIndex({ ecosystem, projects }: EcosystemIndexProps) {
  return (
    <section
      aria-labelledby="ecosystem-project-index-heading"
      className={styles.ecosystemProjectIndex}
      id="project-index"
    >
      <div className={styles.sectionHeader}>
        <p className={styles.kicker}>Filtered dossier index</p>
        <h2 id="ecosystem-project-index-heading">Projects in {ecosystem.name}</h2>
        <p className={styles.bodyText}>
          {projects.length} project{projects.length === 1 ? '' : 's'} indexed in {ecosystem.name}.
        </p>
      </div>
      <div className={styles.projectGrid}>
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  )
}
