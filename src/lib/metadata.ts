import type { Metadata } from 'next'

import { ecosystems, projects } from '../content/catalog'
import type { EcosystemSlug, ProjectSlug } from '../content/types'
import { getAllPublicRoutes } from '../content/selectors'
import type { PublicRoute } from '../content/selectors'

export const SITE_NAME = 'Captain Dock'
export const DEFAULT_SITE_ORIGIN = 'http://localhost:3000'
export const DEFAULT_SHARE_IMAGE_PATH = '/opengraph-image'

export type MetadataEnvironment = Partial<
  Record<'NEXT_PUBLIC_SITE_URL' | 'VERCEL_ENV' | 'NODE_ENV', string | undefined>
>

export type RouteDescriptor = Readonly<{
  route: PublicRoute
  canonicalPath: PublicRoute
  title: string
  description: string
  imagePath: `/projects/${string}` | typeof DEFAULT_SHARE_IMAGE_PATH
  kind: 'home' | 'ecosystem' | 'project' | 'about'
  ecosystem?: EcosystemSlug
  project?: ProjectSlug
}>

function currentEnvironment(): MetadataEnvironment {
  return process.env
}

function isVercelProduction(env: MetadataEnvironment): boolean {
  return env.VERCEL_ENV === 'production'
}

function isPreview(env: MetadataEnvironment): boolean {
  return env.VERCEL_ENV === 'preview'
}

const SPECIAL_USE_PRODUCTION_SUFFIXES = [
  'localhost',
  'local',
  'internal',
  'home.arpa',
  'test',
  'invalid',
  'example',
  'onion',
] as const

function isIpv4Literal(hostname: string): boolean {
  const parts = hostname.split('.')

  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function isIpv6Literal(hostname: string): boolean {
  return hostname.includes(':') || hostname.startsWith('[') || hostname.endsWith(']')
}

function hasSpecialUseProductionSuffix(hostname: string): boolean {
  return SPECIAL_USE_PRODUCTION_SUFFIXES.some((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`))
}

function hasValidDnsLabels(hostname: string): boolean {
  if (hostname.length > 253) {
    return false
  }

  return hostname.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
}

function isPublicProductionHostname(hostname: string): boolean {
  const host = hostname.toLowerCase()

  return (
    !host.endsWith('.') &&
    !isIpv4Literal(host) &&
    !isIpv6Literal(host) &&
    host.includes('.') &&
    hasValidDnsLabels(host) &&
    !hasSpecialUseProductionSuffix(host)
  )
}

function normalizeConfiguredOrigin(value: string): string {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL must be a valid URL.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SITE_URL must use HTTP or HTTPS.')
  }

  if (url.username || url.password) {
    throw new Error('NEXT_PUBLIC_SITE_URL must not include credentials.')
  }

  if (url.pathname !== '/') {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an origin without a path.')
  }

  if (url.search) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an origin without a query string.')
  }

  if (url.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an origin without a hash.')
  }

  return url.origin
}

export function getSiteOrigin(env: MetadataEnvironment = currentEnvironment()): string {
  const configuredOrigin = env.NEXT_PUBLIC_SITE_URL?.trim()

  if (!configuredOrigin) {
    if (isVercelProduction(env)) {
      throw new Error('NEXT_PUBLIC_SITE_URL is required for Vercel production metadata.')
    }

    return DEFAULT_SITE_ORIGIN
  }

  const origin = normalizeConfiguredOrigin(configuredOrigin)

  if (isVercelProduction(env)) {
    const url = new URL(origin)

    if (url.protocol !== 'https:') {
      throw new Error('NEXT_PUBLIC_SITE_URL must use HTTPS in Vercel production.')
    }

    if (url.port) {
      throw new Error('NEXT_PUBLIC_SITE_URL must use the default HTTPS port for a production origin.')
    }

    if (!isPublicProductionHostname(url.hostname)) {
      throw new Error('NEXT_PUBLIC_SITE_URL must use a public production origin with a multi-label DNS hostname.')
    }
  }

  return origin
}

function absoluteUrl(path: string, env: MetadataEnvironment = currentEnvironment()): string {
  return new URL(path, getSiteOrigin(env)).toString()
}

export function getCanonicalUrl(route: PublicRoute, env: MetadataEnvironment = currentEnvironment()): string {
  return absoluteUrl(route, env)
}

export function getShareImageUrl(
  path: RouteDescriptor['imagePath'],
  env: MetadataEnvironment = currentEnvironment(),
): string {
  return absoluteUrl(path, env)
}

function homeDescriptor(): RouteDescriptor {
  return {
    route: '/',
    canonicalPath: '/',
    title: SITE_NAME,
    description:
      'A readable universe of Arc and Rialo projects, connecting ecosystem indexes, case files, and live project links.',
    imagePath: DEFAULT_SHARE_IMAGE_PATH,
    kind: 'home',
  }
}

function aboutDescriptor(): RouteDescriptor {
  return {
    route: '/about',
    canonicalPath: '/about',
    title: 'About | Captain Dock',
    description:
      'The information boundaries of Captain Dock: confirmed Arc and Rialo projects without an invented author biography.',
    imagePath: DEFAULT_SHARE_IMAGE_PATH,
    kind: 'about',
  }
}

function ecosystemDescriptor(route: PublicRoute): RouteDescriptor | undefined {
  const ecosystem = ecosystems.find((item) => route === `/${item.slug}`)

  if (!ecosystem) {
    return undefined
  }

  return {
    route,
    canonicalPath: route,
    title: ecosystem.seo.title,
    description: ecosystem.seo.description,
    imagePath: DEFAULT_SHARE_IMAGE_PATH,
    kind: 'ecosystem',
    ecosystem: ecosystem.slug,
  }
}

function projectDescriptor(route: PublicRoute): RouteDescriptor | undefined {
  const project = projects.find((item) => route === `/${item.ecosystem}/${item.slug}`)

  if (!project?.seo.image) {
    return undefined
  }

  return {
    route,
    canonicalPath: route,
    title: project.seo.title,
    description: project.seo.description,
    imagePath: project.seo.image,
    kind: 'project',
    ecosystem: project.ecosystem,
    project: project.slug,
  }
}

export function getRouteDescriptor(route: PublicRoute): RouteDescriptor {
  const descriptor =
    route === '/'
      ? homeDescriptor()
      : route === '/about'
        ? aboutDescriptor()
        : ecosystemDescriptor(route) ?? projectDescriptor(route)

  if (!descriptor) {
    throw new Error(`Route ${route} is not a public Captain Dock route.`)
  }

  return descriptor
}

export function routeForEcosystem(ecosystem: EcosystemSlug): PublicRoute {
  const route = `/${ecosystem}` as PublicRoute

  if (!getAllPublicRoutes().includes(route)) {
    throw new Error(`Missing public route for ecosystem ${ecosystem}.`)
  }

  return route
}

export function routeForProject(ecosystem: EcosystemSlug, project: ProjectSlug): PublicRoute {
  const route = `/${ecosystem}/${project}` as PublicRoute

  if (!getAllPublicRoutes().includes(route)) {
    throw new Error(`Missing public route for project ${ecosystem}/${project}.`)
  }

  return route
}

export function getRobots(env: MetadataEnvironment = currentEnvironment()): Metadata['robots'] | undefined {
  if (!isPreview(env)) {
    return undefined
  }

  return {
    follow: false,
    index: false,
  }
}

export function buildRootMetadata(env: MetadataEnvironment = currentEnvironment()): Metadata {
  const origin = getSiteOrigin(env)

  return {
    metadataBase: new URL(origin),
    title: SITE_NAME,
    description: homeDescriptor().description,
    applicationName: SITE_NAME,
    openGraph: {
      title: SITE_NAME,
      description: homeDescriptor().description,
      siteName: SITE_NAME,
      type: 'website',
      url: getCanonicalUrl('/', env),
      images: [
        {
          url: getShareImageUrl(DEFAULT_SHARE_IMAGE_PATH, env),
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} share image`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: homeDescriptor().description,
      images: [
        {
          url: getShareImageUrl(DEFAULT_SHARE_IMAGE_PATH, env),
          alt: `${SITE_NAME} share image`,
        },
      ],
    },
    robots: getRobots(env),
  }
}

export function buildRouteMetadata(route: PublicRoute, env: MetadataEnvironment = currentEnvironment()): Metadata {
  const descriptor = getRouteDescriptor(route)
  const canonical = getCanonicalUrl(descriptor.canonicalPath, env)
  const imageUrl = getShareImageUrl(descriptor.imagePath, env)
  const image = {
    url: imageUrl,
    alt: `${descriptor.title} share image`,
    ...(descriptor.imagePath === DEFAULT_SHARE_IMAGE_PATH ? { width: 1200, height: 630 } : {}),
  }

  return {
    metadataBase: new URL(getSiteOrigin(env)),
    title: descriptor.title,
    description: descriptor.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: descriptor.title,
      description: descriptor.description,
      siteName: SITE_NAME,
      type: 'website',
      url: canonical,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: descriptor.title,
      description: descriptor.description,
      images: [
        {
          url: imageUrl,
          alt: `${descriptor.title} share image`,
        },
      ],
    },
    robots: getRobots(env),
  }
}

export function buildNotFoundMetadata(env: MetadataEnvironment = currentEnvironment()): Metadata {
  const title = 'Project Not Found | Captain Dock'
  const description = 'The requested route is not part of the public Captain Dock map.'
  const imageUrl = getShareImageUrl(DEFAULT_SHARE_IMAGE_PATH, env)

  return {
    metadataBase: new URL(getSiteOrigin(env)),
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${title} share image`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: `${title} share image`,
        },
      ],
    },
    robots: {
      follow: false,
      index: false,
    },
  }
}
