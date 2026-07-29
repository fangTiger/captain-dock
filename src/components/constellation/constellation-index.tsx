import type { Project } from '../../content/types'
import styles from './constellation-index.module.css'

type ConstellationIndexProps = Readonly<{
  projects: readonly Project[]
}>

/** 首页底部的作品索引条：星场负责氛围，这里负责可扫读的信息。 */
export function ConstellationIndex({ projects }: ConstellationIndexProps) {
  return (
    <nav aria-label="Project index" className={styles.index} id="project-index">
      {projects.map((project) => (
        <a
          className={styles.entry}
          data-ecosystem={project.ecosystem}
          data-scene-target={`project:${project.slug}`}
          href={`/${project.ecosystem}/${project.slug}`}
          key={project.slug}
        >
          <span className={styles.name}>{project.name}</span>
          <span className={styles.statement}>{project.statement}</span>
          <span className={styles.meta}>
            {project.ecosystem} · {project.status[0]}
          </span>
        </a>
      ))}
    </nav>
  )
}
