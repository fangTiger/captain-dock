import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { projects } from './catalog'
import { getProjectMediaAsset, projectMediaAssetKeys } from '../components/project/project-media'
import type { ProjectImage } from './types'

const projectRoot = process.cwd()
const publicRoot = path.join(projectRoot, 'public')
const sourceDocPath = path.join(projectRoot, 'docs/assets/project-sources.md')

const sourceInputs = [
  {
    fileName: 'live-research.png',
    sha1: 'df8de7bd283df1bbf25f6bb909967272f3cbd8e0',
  },
  {
    fileName: 'hadron-market.png',
    sha1: 'd66934a47595e511d18dfe73579d5eb76d6b8f69',
  },
  {
    fileName: 'crypto-home.png',
    sha1: '00a34fded617bfca78e849e8cfe120d90c5165e1',
  },
  {
    fileName: 'rialo-tower.png',
    sha1: '7f9ab5ae47745a015c35da939b173d6e35cf984d',
  },
] as const

function getCatalogGallerySources(): ProjectImage['src'][] {
  return projects.flatMap((project) => project.gallery.map((image) => image.src))
}

describe('project media assets', () => {
  it('ships exactly the audited project gallery media as compact WebP files', () => {
    const gallerySources = getCatalogGallerySources()
    const uniqueGallerySources = [...new Set(gallerySources)]

    expect(uniqueGallerySources).toHaveLength(4)

    for (const src of uniqueGallerySources) {
      const absolutePath = path.join(publicRoot, src.slice(1))
      expect(existsSync(absolutePath), `${src} should exist`).toBe(true)

      const header = readFileSync(absolutePath).subarray(0, 12)
      expect(header.subarray(0, 4).toString('ascii')).toBe('RIFF')
      expect(header.subarray(8, 12).toString('ascii')).toBe('WEBP')
      expect(statSync(absolutePath).size, `${src} should be no larger than 450 KiB`).toBeLessThanOrEqual(450 * 1024)
    }
  })

  it('keeps the static media registry exhaustive against catalog gallery paths', () => {
    const gallerySources = getCatalogGallerySources()
    const uniqueGallerySources = [...new Set(gallerySources)]

    expect(gallerySources).toHaveLength(projects.length)
    expect(projectMediaAssetKeys.slice().sort()).toEqual(uniqueGallerySources.slice().sort())

    for (const src of uniqueGallerySources) {
      expect(getProjectMediaAsset(src), `${src} should resolve to a static import`).toBeTruthy()
    }
  })

  it('fails fast when a catalog-shaped project media path is not registered', () => {
    expect(() => getProjectMediaAsset('/projects/not-registered.webp')).toThrow('Unknown project media asset')
  })

  it('documents source provenance, privacy review, conversion details, and output hashes', () => {
    expect(existsSync(sourceDocPath)).toBe(true)

    const sourceDocument = readFileSync(sourceDocPath, 'utf8')

    for (const src of getCatalogGallerySources()) {
      const publicPath = path.posix.join('public', src.slice(1))
      const section = sourceDocument.match(new RegExp(`## .*${escapeRegExp(src)}[\\s\\S]*?(?=\\n## |$)`))?.[0] ?? ''

      expect(section, `${src} should have a source document section`).not.toBe('')
      expect(section).toContain(src)
      expect(section).toContain(publicPath)
      expect(section).toMatch(/公开性判断：.+/)
      expect(section).toMatch(/需删除内容：.+/)
      expect(section).toMatch(/脱敏\/转换：.+/)
      expect(section).toMatch(/工具\/参数：.+/)
      expect(section).toMatch(/原始尺寸：\d+x\d+/)
      expect(section).toMatch(/输出尺寸：\d+x\d+/)
      expect(section).toMatch(/输出字节数：\d+/)
      expect(section).toMatch(/输出 SHA-256：(?:`[a-f0-9]{64}`|[a-f0-9]{64})/)
      expect(section).toMatch(/DEMO\/TESTNET 语境：.+/)
    }

    for (const sourceInput of sourceInputs) {
      expect(sourceDocument).toContain(sourceInput.fileName)
      expect(sourceDocument).toContain(sourceInput.sha1)
    }
  })

  it('keeps local filesystem paths out of the client catalog', () => {
    const catalogSource = readFileSync(path.join(projectRoot, 'src/content/catalog.ts'), 'utf8')

    expect(catalogSource).not.toContain('/Users/captain')
    expect(catalogSource).not.toContain('file://')
  })
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
