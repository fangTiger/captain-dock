import type { Metadata } from 'next'
import { describe, expect, it } from 'vitest'

import { projects } from '../content/catalog'
import { getAllPublicRoutes } from '../content/selectors'
import type { PublicRoute } from '../content/selectors'

import {
  DEFAULT_SHARE_IMAGE_PATH,
  SITE_NAME,
  buildNotFoundMetadata,
  buildRootMetadata,
  buildRouteMetadata,
  getRouteDescriptor,
  getSiteOrigin,
} from './metadata'

const productionOrigin = 'https://project-universe.example.com'

type MetadataImage = {
  url?: string | URL
  width?: number
  height?: number
  alt?: string
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (value instanceof URL) {
    return value.toString()
  }

  throw new Error(`Expected a string-like metadata value, received ${String(value)}`)
}

function metadataTitle(metadata: Metadata): string {
  return stringValue(metadata.title)
}

function metadataCanonical(metadata: Metadata): string {
  return stringValue(metadata.alternates?.canonical)
}

function metadataBaseOrigin(metadata: Metadata): string {
  return new URL(stringValue(metadata.metadataBase)).origin
}

function openGraphUrl(metadata: Metadata): string {
  return stringValue(metadata.openGraph?.url)
}

function twitterMetadata(metadata: Metadata): { card?: string; title?: unknown; description?: unknown; images?: unknown } {
  return metadata.twitter as { card?: string; title?: unknown; description?: unknown; images?: unknown }
}

function firstOpenGraphImage(metadata: Metadata): URL {
  return new URL(stringValue(firstOpenGraphImageObject(metadata).url))
}

function firstOpenGraphImageObject(metadata: Metadata): MetadataImage {
  const images = metadata.openGraph?.images

  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('Open Graph images are required.')
  }

  const [image] = images as MetadataImage[]
  return image
}

function firstTwitterImage(metadata: Metadata): URL {
  const images = twitterMetadata(metadata).images

  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('Twitter images are required.')
  }

  const [image] = images as MetadataImage[]
  return new URL(stringValue(image.url))
}

function projectForRoute(route: PublicRoute) {
  return projects.find((project) => route === `/${project.ecosystem}/${project.slug}`)
}

describe('site metadata 工厂', () => {
  it('在根 metadata 的公开品牌字段统一使用 Captain Dock', () => {
    const metadata = buildRootMetadata({
      NEXT_PUBLIC_SITE_URL: productionOrigin,
      VERCEL_ENV: 'production',
    })

    expect(SITE_NAME).toBe('Captain Dock')
    expect(metadataTitle(metadata)).toBe('Captain Dock')
    expect(metadata.applicationName).toBe('Captain Dock')
    expect(metadata.openGraph?.siteName).toBe('Captain Dock')
    expect(twitterMetadata(metadata).title).toBe('Captain Dock')
  })

  it('keeps titles, descriptions, Open Graph, and Twitter metadata in English', () => {
    const hanPattern = /\p{Script=Han}/u

    for (const route of getAllPublicRoutes()) {
      const descriptor = getRouteDescriptor(route)
      const metadata = buildRouteMetadata(route, {
        NEXT_PUBLIC_SITE_URL: productionOrigin,
        VERCEL_ENV: 'production',
      })

      expect(JSON.stringify({ descriptor, metadata })).not.toMatch(hanPattern)
    }

    expect(
      JSON.stringify(
        buildNotFoundMetadata({
          NEXT_PUBLIC_SITE_URL: productionOrigin,
          VERCEL_ENV: 'production',
        }),
      ),
    ).not.toMatch(hanPattern)
  })

  it('从公开路由目录生成唯一且同源的 title、description、canonical 与分享信息', () => {
    const entries = getAllPublicRoutes().map((route) => ({
      route,
      descriptor: getRouteDescriptor(route),
      metadata: buildRouteMetadata(route, {
        NEXT_PUBLIC_SITE_URL: productionOrigin,
        VERCEL_ENV: 'production',
      }),
    }))

    expect(entries).toHaveLength(8)
    expect(new Set(entries.map(({ descriptor }) => descriptor.title)).size).toBe(entries.length)
    expect(new Set(entries.map(({ descriptor }) => descriptor.description)).size).toBe(entries.length)
    expect(new Set(entries.map(({ descriptor }) => descriptor.canonicalPath)).size).toBe(entries.length)

    for (const { route, descriptor, metadata } of entries) {
      const canonical = new URL(metadataCanonical(metadata))
      const ogUrl = new URL(openGraphUrl(metadata))
      const ogImage = firstOpenGraphImage(metadata)
      const twitterImage = firstTwitterImage(metadata)
      const expectedProject = projectForRoute(route)

      expect(metadataTitle(metadata)).toBe(descriptor.title)
      expect(metadata.description).toBe(descriptor.description)
      expect(canonical.origin).toBe(productionOrigin)
      expect(canonical.pathname).toBe(route)
      expect(ogUrl.toString()).toBe(canonical.toString())
      expect(ogImage.origin).toBe(productionOrigin)
      expect(twitterImage.origin).toBe(productionOrigin)
      expect(metadata.openGraph?.title).toBe(descriptor.title)
      expect(metadata.openGraph?.description).toBe(descriptor.description)
      expect(twitterMetadata(metadata).title).toBe(descriptor.title)
      expect(twitterMetadata(metadata).description).toBe(descriptor.description)
      expect(twitterMetadata(metadata).card).toBe('summary_large_image')

      if (expectedProject) {
        expect(ogImage.pathname).toBe(expectedProject.seo.image)
        expect(twitterImage.pathname).toBe(expectedProject.seo.image)
        expect(ogImage.pathname.endsWith('.webp')).toBe(true)
      } else {
        expect(ogImage.pathname).toBe(DEFAULT_SHARE_IMAGE_PATH)
        expect(twitterImage.pathname).toBe(DEFAULT_SHARE_IMAGE_PATH)
      }
    }
  })

  it('拒绝不安全 origin，并且只有 Vercel production 缺少正式 HTTPS origin 时 fail closed', () => {
    expect(getSiteOrigin({})).toBe('http://localhost:3000')
    expect(getSiteOrigin({ NODE_ENV: 'production' })).toBe('http://localhost:3000')
    expect(getSiteOrigin({ VERCEL_ENV: 'preview' })).toBe('http://localhost:3000')
    expect(
      buildRouteMetadata('/', {
        VERCEL_ENV: 'preview',
      }).robots,
    ).toMatchObject({
      follow: false,
      index: false,
    })
    expect(
      metadataBaseOrigin(
        buildRouteMetadata('/', {
          NEXT_PUBLIC_SITE_URL: 'https://Project-Universe.Example.Com/',
          VERCEL_ENV: 'production',
        }),
      ),
    ).toBe(productionOrigin)

    expect(() => getSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'not a url' })).toThrow(/valid URL/)
    expect(() => getSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'ftp://project-universe.example.com' })).toThrow(/HTTP/)
    expect(() => getSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'https://user:pass@project-universe.example.com' })).toThrow(
      /credentials/,
    )
    expect(() => getSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'https://project-universe.example.com/path' })).toThrow(/path/)
    expect(() => getSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'https://project-universe.example.com?draft=1' })).toThrow(
      /query/,
    )
    expect(() => getSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'https://project-universe.example.com#share' })).toThrow(/hash/)
    expect(() => getSiteOrigin({ VERCEL_ENV: 'production' })).toThrow(/NEXT_PUBLIC_SITE_URL/)
    expect(() =>
      getSiteOrigin({
        NEXT_PUBLIC_SITE_URL: 'http://project-universe.example.com',
        VERCEL_ENV: 'production',
      }),
    ).toThrow(/HTTPS/)
    expect(() =>
      getSiteOrigin({
        NEXT_PUBLIC_SITE_URL: 'https://localhost:3000',
        VERCEL_ENV: 'production',
      }),
    ).toThrow(/production/)
    expect(() =>
      getSiteOrigin({
        NEXT_PUBLIC_SITE_URL: 'https://10.0.0.8',
        VERCEL_ENV: 'production',
      }),
    ).toThrow(/production/)
  })

  it('Vercel production 要求正式 DNS canonical origin，但保留本地和 preview 行为', () => {
    const rejectedProductionOrigins = [
      ['public IPv4 literal', 'https://8.8.8.8'],
      ['link-local IPv4', 'https://169.254.169.254'],
      ['CGNAT IPv4', 'https://100.64.0.1'],
      ['localhost hostname', 'https://localhost'],
      ['localhost subdomain', 'https://preview.localhost'],
      ['single-label hostname', 'https://intranet'],
      ['local mDNS hostname', 'https://portal.local'],
      ['internal hostname', 'https://portal.internal'],
      ['home.arpa hostname', 'https://router.home.arpa'],
      ['test reserved hostname', 'https://fixture.test'],
      ['invalid reserved hostname', 'https://fixture.invalid'],
      ['example reserved hostname', 'https://fixture.example'],
      ['legacy example production origin', 'https://project-universe.example'],
      ['onion reserved hostname', 'https://fixture.onion'],
      ['exact local hostname', 'https://local'],
      ['exact internal hostname', 'https://internal'],
      ['exact home.arpa hostname', 'https://home.arpa'],
      ['exact test hostname', 'https://test'],
      ['exact invalid hostname', 'https://invalid'],
      ['exact example hostname', 'https://example'],
      ['exact onion hostname', 'https://onion'],
      ['trailing-dot hostname', 'https://project-universe.example.com.'],
      ['IPv6 unspecified', 'https://[::]'],
      ['IPv6 loopback', 'https://[::1]'],
      ['IPv6 ULA', 'https://[fc00::1]'],
      ['IPv6 link-local', 'https://[fe80::1]'],
      ['global IPv6 literal compressed', 'https://[2001:4860:4860::8888]'],
      ['global IPv6 literal expanded', 'https://[2001:4860:4860:0:0:0:0:8888]'],
      ['3fff documentation IPv6 lower boundary', 'https://[3fff::1]'],
      ['3fff documentation IPv6 upper boundary', 'https://[3fff:0fff:ffff:ffff:ffff:ffff:ffff:ffff]'],
      ['IPv4-mapped private IPv6', 'https://[::ffff:192.168.0.1]'],
      ['IPv4-compatible dotted private IPv6', 'https://[::192.168.0.1]'],
      ['IPv4-compatible hex private IPv6', 'https://[::c0a8:1]'],
      ['expanded IPv4-compatible private IPv6', 'https://[0:0:0:0:0:0:c0a8:1]'],
    ] as const

    for (const [label, origin] of rejectedProductionOrigins) {
      expect(
        () =>
          getSiteOrigin({
            NEXT_PUBLIC_SITE_URL: origin,
            VERCEL_ENV: 'production',
          }),
        label,
      ).toThrow(/public production origin/)
    }

    expect(
      getSiteOrigin({
        NEXT_PUBLIC_SITE_URL: 'https://intranet',
        VERCEL_ENV: 'preview',
      }),
    ).toBe('https://intranet')
    expect(getSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'http://localhost:5173' })).toBe('http://localhost:5173')
    expect(
      getSiteOrigin({
        NEXT_PUBLIC_SITE_URL: 'https://preview.example.test:8443',
        VERCEL_ENV: 'preview',
      }),
    ).toBe('https://preview.example.test:8443')
    expect(() =>
      getSiteOrigin({
        NEXT_PUBLIC_SITE_URL: 'https://portfolio.example.com:8443',
        VERCEL_ENV: 'production',
      }),
    ).toThrow(/production origin/)
    expect(
      getSiteOrigin({
        NEXT_PUBLIC_SITE_URL: 'https://portfolio.example.com:443',
        VERCEL_ENV: 'production',
      }),
    ).toBe('https://portfolio.example.com')
    expect(
      getSiteOrigin({
        NEXT_PUBLIC_SITE_URL: 'https://portfolio.example.com',
        VERCEL_ENV: 'production',
      }),
    ).toBe('https://portfolio.example.com')
    expect(
      getSiteOrigin({
        NEXT_PUBLIC_SITE_URL: 'https://project-universe.vercel.app',
        VERCEL_ENV: 'production',
      }),
    ).toBe('https://project-universe.vercel.app')
  })

  it('默认分享图声明 1200x630，项目本地图片不声明虚假尺寸', () => {
    const homeImage = firstOpenGraphImageObject(
      buildRouteMetadata('/', {
        NEXT_PUBLIC_SITE_URL: productionOrigin,
        VERCEL_ENV: 'production',
      }),
    )

    expect(new URL(stringValue(homeImage.url)).pathname).toBe(DEFAULT_SHARE_IMAGE_PATH)
    expect(homeImage.width).toBe(1200)
    expect(homeImage.height).toBe(630)

    for (const project of projects) {
      const route = `/${project.ecosystem}/${project.slug}` as PublicRoute
      const projectImage = firstOpenGraphImageObject(
        buildRouteMetadata(route, {
          NEXT_PUBLIC_SITE_URL: productionOrigin,
          VERCEL_ENV: 'production',
        }),
      )

      expect(new URL(stringValue(projectImage.url)).pathname).toBe(project.seo.image)
      expect(projectImage).not.toHaveProperty('width')
      expect(projectImage).not.toHaveProperty('height')
    }
  })

  it('404 metadata 显式覆盖分享信息且不声明 canonical 或请求 URL', () => {
    const metadata = buildNotFoundMetadata({
      NEXT_PUBLIC_SITE_URL: productionOrigin,
      VERCEL_ENV: 'production',
    })
    const ogImage = firstOpenGraphImageObject(metadata)
    const twitterImage = firstTwitterImage(metadata)

    expect(metadataTitle(metadata)).toBe('Project Not Found | Captain Dock')
    expect(metadata.description).toBe('The requested route is not part of the public Captain Dock map.')
    expect(metadata.alternates?.canonical).toBeUndefined()
    expect(metadata.robots).toMatchObject({
      follow: false,
      index: false,
    })
    expect(metadata.openGraph?.title).toBe('Project Not Found | Captain Dock')
    expect(metadata.openGraph?.description).toBe('The requested route is not part of the public Captain Dock map.')
    expect(metadata.openGraph).not.toHaveProperty('url')
    expect(new URL(stringValue(ogImage.url)).pathname).toBe(DEFAULT_SHARE_IMAGE_PATH)
    expect(ogImage.alt).toBe('Project Not Found | Captain Dock share image')
    expect(twitterMetadata(metadata).title).toBe('Project Not Found | Captain Dock')
    expect(twitterMetadata(metadata).description).toBe(
      'The requested route is not part of the public Captain Dock map.',
    )
    expect(new URL(twitterImage.toString()).pathname).toBe(DEFAULT_SHARE_IMAGE_PATH)
  })

  it('不会把外部作品 liveUrl origin 用作 canonical 或 Open Graph URL', () => {
    for (const project of projects) {
      const route = `/${project.ecosystem}/${project.slug}` as PublicRoute
      const metadata = buildRouteMetadata(route, {
        NEXT_PUBLIC_SITE_URL: productionOrigin,
        VERCEL_ENV: 'production',
      })
      const liveOrigin = new URL(project.liveUrl).origin

      expect(metadataCanonical(metadata)).not.toContain(liveOrigin)
      expect(openGraphUrl(metadata)).not.toContain(liveOrigin)
      expect(metadataCanonical(metadata)).toBe(`${productionOrigin}${route}`)
    }
  })
})
