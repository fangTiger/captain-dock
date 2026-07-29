import type { CSSProperties } from 'react'

import type { EcosystemSlug, Project } from '../../content/types'
import { ControlLink } from '../ui/control-link'
import { ExternalLink } from '../ui/external-link'
import { StatusLabel } from '../ui/status-label'

const ecosystemLabel = {
  arc: 'Arc',
  rialo: 'Rialo',
} as const satisfies Record<EcosystemSlug, string>

type ProjectCardProps = Readonly<{
  project: Project
}>

export function ProjectCard({ project }: ProjectCardProps) {
  const detailHref = `/${project.ecosystem}/${project.slug}` as const
  const style = {
    '--project-accent': project.theme.accent,
    '--project-aura': project.theme.aura,
  } as CSSProperties

  return (
    <article
      className="project-card scan-line"
      data-ecosystem={project.ecosystem}
      data-scene-target={`project:${project.slug}`}
      style={style}
    >
      <div className="project-card__rail" aria-hidden="true" />
      <div className="project-card__meta">
        <span>{ecosystemLabel[project.ecosystem]}</span>
        <span>{project.theme.motif}</span>
      </div>
      <h3 className="project-card__title">{project.name}</h3>
      <p className="project-card__tagline">{project.tagline}</p>
      <p className="project-card__summary">{project.summary}</p>
      <div className="project-card__status" aria-label="Project status">
        {project.status.map((status) => (
          <StatusLabel key={status} status={status} />
        ))}
      </div>
      <div className="project-card__actions">
        <ControlLink className="project-card__link" controlRole="secondary" href={detailHref}>
          Open {project.name} case file
        </ControlLink>
        <ExternalLink
          className="project-card__link project-card__live-link"
          controlRole="secondary"
          href={project.liveUrl}
        >
          Visit {project.name} live site
        </ExternalLink>
      </div>
    </article>
  )
}
