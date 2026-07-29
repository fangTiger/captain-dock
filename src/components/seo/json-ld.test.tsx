import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ecosystems, projects } from '../../content/catalog'
import { getProjectsByEcosystem } from '../../content/selectors'

import {
  JsonLd,
  buildEcosystemJsonLd,
  buildHomeJsonLd,
  buildProjectJsonLd,
  serializeJsonLd,
} from './json-ld'

const productionOrigin = 'https://project-universe.example.com'
const productionEnv = {
  NEXT_PUBLIC_SITE_URL: productionOrigin,
  VERCEL_ENV: 'production',
} as const

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a JSON object.')
  }

  return value as JsonObject
}

function asArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected a JSON array.')
  }

  return value
}

function typeOf(value: JsonObject): string {
  const jsonType = value['@type']

  if (typeof jsonType !== 'string') {
    throw new Error('Expected @type to be a string.')
  }

  return jsonType
}

function findSchema(values: readonly unknown[], schemaType: string): JsonObject {
  const match = values.map(asObject).find((value) => typeOf(value) === schemaType)

  if (!match) {
    throw new Error(`Missing ${schemaType} schema.`)
  }

  return match
}

function stringify(value: unknown): string {
  return JSON.stringify(value)
}

describe('JsonLd', () => {
  it('只输出 application/ld+json script，并安全转义小于号', () => {
    render(
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: '<script>alert(1)</script>',
          url: productionOrigin,
        }}
      />,
    )

    const script = document.querySelector('script[type="application/ld+json"]')

    expect(script).not.toBeNull()
    expect(script?.textContent).toContain('\\u003cscript>')
    expect(script?.textContent).not.toContain('<script>')
    expect(screen.queryByText(/alert/)).not.toBeInTheDocument()
  })

  it('拒绝 undefined、函数和任意非 JSON-compatible 数据', () => {
    expect(() =>
      serializeJsonLd({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: undefined,
      } as unknown),
    ).toThrow(/JSON-compatible/)
    expect(() =>
      serializeJsonLd({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        action: () => 'unsafe',
      } as unknown),
    ).toThrow(/JSON-compatible/)
    expect(() =>
      serializeJsonLd({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        nested: { empty: '' },
      }),
    ).toThrow(/empty/)
  })

  it('首页 JSON-LD 是 WebSite，且不输出未确认人物或作者字段', () => {
    const schema = asObject(buildHomeJsonLd(productionEnv))
    const serialized = stringify(schema)

    expect(typeOf(schema)).toBe('WebSite')
    expect(schema.inLanguage).toBe('en')
    expect(schema.url).toBe(`${productionOrigin}/`)
    expect(schema.name).toBe('Captain Dock')
    expect(serialized).not.toContain('Person')
    expect(serialized).not.toContain('author')
    expect(serialized).not.toContain('creator')
    expect(serialized).not.toContain('award')
    expect(serialized).not.toContain('datePublished')
  })

  it('生态 JSON-LD 输出 CollectionPage 与按 catalog 顺序排列的 ItemList', () => {
    for (const ecosystem of ecosystems) {
      const schemas = asArray(buildEcosystemJsonLd(ecosystem.slug, productionEnv))
      const collectionPage = findSchema(schemas, 'CollectionPage')
      const itemList = findSchema(schemas, 'ItemList')
      const itemListElements = itemList.itemListElement

      if (!Array.isArray(itemListElements)) {
        throw new Error('ItemList.itemListElement must be an array.')
      }

      const ecosystemProjects = getProjectsByEcosystem(ecosystem.slug)

      expect(collectionPage.name).toBe(ecosystem.seo.title)
      expect(collectionPage.inLanguage).toBe('en')
      expect(collectionPage.url).toBe(`${productionOrigin}/${ecosystem.slug}`)
      expect(itemList.inLanguage).toBe('en')
      expect(itemListElements).toHaveLength(ecosystemProjects.length)
      expect(itemListElements.map((item) => asObject(item).position)).toEqual(
        ecosystemProjects.map((_, index) => index + 1),
      )
      expect(itemListElements.map((item) => asObject(asObject(item).item).name)).toEqual(
        ecosystemProjects.map((project) => project.name),
      )
      expect(itemListElements.map((item) => asObject(asObject(item).item).url)).toEqual(
        ecosystemProjects.map((project) => `${productionOrigin}/${project.ecosystem}/${project.slug}`),
      )
      expect(itemListElements.map((item) => asObject(asObject(item).item).inLanguage)).toEqual(
        ecosystemProjects.map(() => 'en'),
      )
    }
  })

  it('项目 JSON-LD 是 CreativeWork，sameAs 可用 liveUrl，但 canonical url 仍是本站 URL', () => {
    for (const project of projects) {
      const schema = asObject(buildProjectJsonLd(project.ecosystem, project.slug, productionEnv))
      const serialized = stringify(schema)

      expect(typeOf(schema)).toBe('CreativeWork')
      expect(schema.inLanguage).toBe('en')
      expect(schema.name).toBe(project.name)
      expect(schema.description).toBe(project.seo.description)
      expect(schema.url).toBe(`${productionOrigin}/${project.ecosystem}/${project.slug}`)
      expect(schema.sameAs).toEqual([project.liveUrl])
      expect(schema.image).toBe(`${productionOrigin}${project.seo.image}`)
      expect(schema.url).not.toContain(new URL(project.liveUrl).origin)
      expect(serialized).not.toContain('Person')
      expect(serialized).not.toContain('author')
      expect(serialized).not.toContain('creator')
      expect(serialized).not.toContain('customer')
      expect(serialized).not.toContain('award')
      expect(serialized).not.toContain('dateCreated')
    }
  })
})
