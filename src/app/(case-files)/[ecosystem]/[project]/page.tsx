import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { projects } from '../../../../content/catalog'
import { getEcosystem, getNextProject, getProject } from '../../../../content/selectors'
import { ProjectCaseStudy } from '../../../../components/project/project-case-study'
import { JsonLd, buildProjectJsonLd } from '../../../../components/seo/json-ld'
import { buildNotFoundMetadata, buildRouteMetadata, routeForProject } from '../../../../lib/metadata'

export const dynamicParams = false

type ProjectPageProps = Readonly<{
  params: Promise<{
    ecosystem: string
    project: string
  }>
}>

export function generateStaticParams() {
  return projects.map((project) => ({
    ecosystem: project.ecosystem,
    project: project.slug,
  }))
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { ecosystem: ecosystemSlug, project: projectSlug } = await params
  const project = getProject(ecosystemSlug, projectSlug)

  if (!project) {
    return buildNotFoundMetadata()
  }

  return buildRouteMetadata(routeForProject(project.ecosystem, project.slug))
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { ecosystem: ecosystemSlug, project: projectSlug } = await params
  const project = getProject(ecosystemSlug, projectSlug)

  if (!project) {
    notFound()
  }

  const ecosystem = getEcosystem(project.ecosystem)
  const nextProject = getNextProject(project.ecosystem, project.slug)

  if (!ecosystem || !nextProject) {
    notFound()
  }

  return (
    <main id="main-content">
      <JsonLd data={buildProjectJsonLd(project.ecosystem, project.slug)} />
      <ProjectCaseStudy ecosystem={ecosystem} nextProject={nextProject} project={project} />
    </main>
  )
}
