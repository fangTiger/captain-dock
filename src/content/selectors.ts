import { ecosystems, projects } from './catalog'
import type { Ecosystem, Project } from './types'

export type PublicRoute =
  | '/'
  | '/arc'
  | '/arc/signal-ledger'
  | '/arc/hadron'
  | '/arc/arcpredict'
  | '/rialo'
  | '/rialo/rialo-captain'
  | '/about'

const projectRoutesBySlug = {
  'signal-ledger': '/arc/signal-ledger',
  hadron: '/arc/hadron',
  arcpredict: '/arc/arcpredict',
  'rialo-captain': '/rialo/rialo-captain',
} as const satisfies Record<Project['slug'], PublicRoute>

export function getEcosystem(slug: string): Ecosystem | undefined {
  return ecosystems.find((ecosystem) => ecosystem.slug === slug)
}

export function getProject(ecosystemSlug: string, projectSlug: string): Project | undefined {
  return projects.find((project) => project.ecosystem === ecosystemSlug && project.slug === projectSlug)
}

export function getProjectsByEcosystem(ecosystemSlug: string): readonly Project[] {
  return projects.filter((project) => project.ecosystem === ecosystemSlug)
}

export function getAllPublicRoutes(): readonly PublicRoute[] {
  const routes: PublicRoute[] = ['/']

  for (const ecosystem of ecosystems) {
    routes.push(ecosystem.slug === 'arc' ? '/arc' : '/rialo')

    for (const project of getProjectsByEcosystem(ecosystem.slug)) {
      routes.push(projectRoutesBySlug[project.slug])
    }
  }

  routes.push('/about')

  return routes
}

export function getNextProject(ecosystemSlug: string, projectSlug: string): Project | undefined {
  const currentIndex = projects.findIndex(
    (project) => project.ecosystem === ecosystemSlug && project.slug === projectSlug,
  )

  if (currentIndex === -1) {
    return undefined
  }

  return projects[(currentIndex + 1) % projects.length]
}
