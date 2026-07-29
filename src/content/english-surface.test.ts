import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { ecosystems, projects } from './catalog'

const hanPattern = /\p{Script=Han}/u

const publicSurfaceSources = [
  'src/app/layout.tsx',
  'src/app/not-found.tsx',
  'src/app/error.tsx',
  'src/app/(immersive)/page.tsx',
  'src/app/(immersive)/[ecosystem]/page.tsx',
  'src/app/(content)/about/page.tsx',
  'src/components/ecosystem/ecosystem-hero.tsx',
  'src/components/ecosystem/ecosystem-index.tsx',
  'src/components/rialo/rialo-reactive-loop.tsx',
  'src/components/seo/json-ld.tsx',
  'src/components/shell/site-header.tsx',
  'src/components/shell/site-footer.tsx',
  'src/components/shell/skip-link.client.tsx',
  'src/components/ui/external-link.tsx',
  'src/components/ui/status-label.tsx',
  'src/components/project/project-card.tsx',
  'src/components/project/project-case-study.tsx',
  'src/components/project/project-gallery.tsx',
  'src/components/project/project-hero.tsx',
  'src/components/project/project-navigator.tsx',
  'src/components/project/core-loop.tsx',
  'src/components/project/evidence-section.tsx',
  'src/components/project/stack-lanes.tsx',
  'src/components/project/signature/flight-signature.tsx',
  'src/components/project/signature/ledger-signature.tsx',
  'src/components/project/signature/market-signature.tsx',
  'src/components/project/signature/probability-signature.tsx',
] as const

function readSource(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('English public surface', () => {
  it('keeps every catalog field exposed to users and crawlers free of Han characters', () => {
    expect(JSON.stringify({ ecosystems, projects })).not.toMatch(hanPattern)
  })

  it.each(publicSurfaceSources)('keeps %s free of Han characters', (relativePath) => {
    expect(readSource(relativePath)).not.toMatch(hanPattern)
  })

  it('declares English and the Next.js smooth-scroll contract on the root HTML element', () => {
    expect(readSource('src/app/layout.tsx')).toMatch(
      /<html(?=[^>]*\blang="en")(?=[^>]*\bdata-scroll-behavior="smooth")[^>]*>/,
    )
  })
})
