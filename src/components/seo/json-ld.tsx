import { getEcosystem, getProject, getProjectsByEcosystem } from '../../content/selectors'
import type { EcosystemSlug, ProjectSlug } from '../../content/types'
import {
  SITE_NAME,
  getCanonicalUrl,
  getRouteDescriptor,
  getShareImageUrl,
  routeForEcosystem,
  routeForProject,
} from '../../lib/metadata'
import type { MetadataEnvironment } from '../../lib/metadata'

export type JsonPrimitive = string | number | boolean | null
export type JsonLdValue =
  | JsonPrimitive
  | readonly JsonLdValue[]
  | {
      readonly [key: string]: JsonLdValue
    }

type JsonLdProps = Readonly<{
  data: JsonLdValue
}>

function assertJsonLdValue(value: unknown, path = 'data'): asserts value is JsonLdValue {
  if (value === null) {
    return
  }

  if (typeof value === 'string') {
    if (value.trim() === '') {
      throw new Error(`JSON-LD ${path} cannot be empty.`)
    }

    return
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`JSON-LD ${path} must be a finite number.`)
    }

    return
  }

  if (typeof value === 'boolean') {
    return
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new Error(`JSON-LD ${path} cannot be an empty array.`)
    }

    value.forEach((item, index) => assertJsonLdValue(item, `${path}[${index}]`))
    return
  }

  if (typeof value === 'object') {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new Error(`JSON-LD ${path} must be JSON-compatible plain data.`)
    }

    const entries = Object.entries(value as Record<string, unknown>)

    if (entries.length === 0) {
      throw new Error(`JSON-LD ${path} cannot be an empty object.`)
    }

    for (const [key, entryValue] of entries) {
      if (key.trim() === '') {
        throw new Error(`JSON-LD ${path} cannot include an empty field name.`)
      }

      if (entryValue === undefined) {
        throw new Error(`JSON-LD ${path}.${key} must be JSON-compatible and cannot be undefined.`)
      }

      assertJsonLdValue(entryValue, `${path}.${key}`)
    }

    return
  }

  throw new Error(`JSON-LD ${path} must be JSON-compatible data.`)
}

export function serializeJsonLd(data: unknown): string {
  assertJsonLdValue(data)

  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function JsonLd({ data }: JsonLdProps) {
  return <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} type="application/ld+json" />
}

export function buildHomeJsonLd(env?: MetadataEnvironment): JsonLdValue {
  const descriptor = getRouteDescriptor('/')

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: descriptor.description,
    url: getCanonicalUrl('/', env),
    inLanguage: 'en',
  }
}

export function buildEcosystemJsonLd(ecosystemSlug: EcosystemSlug, env?: MetadataEnvironment): JsonLdValue {
  const ecosystem = getEcosystem(ecosystemSlug)

  if (!ecosystem) {
    throw new Error(`Unknown ecosystem ${ecosystemSlug}.`)
  }

  const route = routeForEcosystem(ecosystem.slug)
  const descriptor = getRouteDescriptor(route)
  const ecosystemProjects = getProjectsByEcosystem(ecosystem.slug)

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      inLanguage: 'en',
      name: descriptor.title,
      description: descriptor.description,
      url: getCanonicalUrl(route, env),
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: getCanonicalUrl('/', env),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      inLanguage: 'en',
      name: `${ecosystem.name} project list`,
      numberOfItems: ecosystemProjects.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: ecosystemProjects.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'CreativeWork',
          inLanguage: 'en',
          name: project.name,
          url: getCanonicalUrl(routeForProject(project.ecosystem, project.slug), env),
        },
      })),
    },
  ]
}

export function buildProjectJsonLd(
  ecosystemSlug: EcosystemSlug,
  projectSlug: ProjectSlug,
  env?: MetadataEnvironment,
): JsonLdValue {
  const project = getProject(ecosystemSlug, projectSlug)

  if (!project) {
    throw new Error(`Unknown project ${ecosystemSlug}/${projectSlug}.`)
  }

  const route = routeForProject(project.ecosystem, project.slug)
  const descriptor = getRouteDescriptor(route)

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    inLanguage: 'en',
    name: project.name,
    description: descriptor.description,
    url: getCanonicalUrl(route, env),
    image: getShareImageUrl(descriptor.imagePath, env),
    sameAs: [project.liveUrl],
    keywords: project.tags.join(', '),
  }
}
