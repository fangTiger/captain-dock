import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ecosystems, projects } from '../../content/catalog'
import { getEcosystem, getNextProject } from '../../content/selectors'
import { dynamicParams, generateStaticParams } from '../../app/(case-files)/[ecosystem]/[project]/page'

import { projectMediaAssetKeys } from './project-media'
import { ProjectCaseStudy } from './project-case-study'
import { ProjectGallery } from './project-gallery'

type MockImageProps = Readonly<{
  alt: string
  className?: string
  fetchPriority?: 'auto' | 'high' | 'low'
  loading?: 'eager' | 'lazy'
  preload?: boolean
  priority?: boolean
  sizes?: string
  src: string | { src: string }
}>

const imagePropCalls = vi.hoisted(() => [] as MockImageProps[])

vi.mock('next/image', () => ({
  default: ({
    alt,
    fetchPriority,
    preload,
    priority,
    src,
    ...props
  }: MockImageProps) => {
    const resolvedSrc = typeof src === 'string' ? src : src.src

    imagePropCalls.push({ alt, fetchPriority, preload, priority, src, ...props })

    // eslint-disable-next-line @next/next/no-img-element -- Vitest 只在 jsdom 中验证 next/image 渲染边界。
    return <img alt={alt} fetchPriority={fetchPriority} src={resolvedSrc} {...props} />
  },
}))

describe('ProjectCaseStudy', () => {
  it.each(projects)('renders the complete case-file shell for $name from catalog data', (project) => {
    const ecosystem = getEcosystem(project.ecosystem)
    const nextProject = getNextProject(project.ecosystem, project.slug)

    if (!ecosystem || !nextProject) {
      throw new Error(`测试目录缺少 ${project.name} 的生态或下一项目。`)
    }

    const { container } = render(
      <ProjectCaseStudy ecosystem={ecosystem} nextProject={nextProject} project={project} />,
    )

    const h1 = screen.getAllByRole('heading', { level: 1, name: project.name })
    expect(h1).toHaveLength(1)
    expect(h1[0]).toHaveTextContent(project.name)
    expect(h1[0].querySelectorAll('wbr')).toHaveLength(project.name.match(/\//g)?.length ?? 0)
    const titleSegments = h1[0].querySelectorAll('[data-project-title-segment]')

    if (project.name.includes('/')) {
      const titleStructure = Array.from(h1[0].childNodes)
        .map((node) => (node.nodeName === 'WBR' ? '<wbr>' : node.textContent))
        .join('')

      expect(titleStructure).toBe(project.name.split('/').join('/<wbr>'))
      expect(Array.from(titleSegments, (segment) => segment.textContent)).toEqual(
        project.name.split('/'),
      )
    } else {
      expect(h1[0].childNodes).toHaveLength(1)
      expect(Array.from(titleSegments, (segment) => segment.textContent)).toEqual([project.name])
    }

    const caseFile = screen.getByRole('article', { name: `${project.name} case file` })
    const heroStage = caseFile.querySelector('[data-case-hero-stage]')

    expect(heroStage).not.toBeNull()
    expect(heroStage?.querySelector('header')).not.toBeNull()
    expect(heroStage?.querySelector('[data-signature-motif]')).not.toBeNull()
    expect(heroStage?.querySelectorAll('[data-control-role="primary"]')).toHaveLength(1)
    expect(caseFile).toHaveStyle({
      '--project-accent': project.theme.accent,
      '--project-aura': project.theme.aura,
    })

    expect(screen.getByText(project.tagline)).toBeInTheDocument()
    expect(screen.getAllByText(project.summary).length).toBeGreaterThan(0)

    for (const role of project.roles) {
      expect(screen.getAllByText(role).length).toBeGreaterThan(0)
    }

    for (const tag of project.tags) {
      expect(screen.getAllByText(tag).length).toBeGreaterThan(0)
    }

    for (const status of project.status) {
      expect(screen.getAllByText(status, { selector: '[data-status-label]' }).length).toBeGreaterThan(0)
    }

    const problemSection = screen.getByRole('region', { name: 'Problem' })
    const mechanismSection = screen.getByRole('region', { name: 'Mechanism' })
    const proofSection = screen.getByRole('region', { name: 'Proof' })

    expect(within(problemSection).getByText(project.summary)).toBeInTheDocument()

    const coreLoop = within(
      within(mechanismSection).getByRole('list', { name: 'Project mechanism' }),
    ).getAllByRole('listitem')
    expect(coreLoop).toHaveLength(project.coreLoop.length)
    expect(coreLoop.length).toBeLessThanOrEqual(5)
    for (const [index, step] of project.coreLoop.entries()) {
      expect(coreLoop[index]).toHaveTextContent(step.label)
      expect(coreLoop[index]).toHaveTextContent(step.description)
    }

    const evidenceList = within(proofSection).getByRole('list', { name: 'Product evidence' })
    const evidenceSection = evidenceList.parentElement
    const evidenceItems = within(evidenceList).getAllByRole('listitem')
    expect(evidenceItems.length).toBeGreaterThanOrEqual(3)
    expect(evidenceItems).toHaveLength(project.evidence.length)
    for (const [index, evidence] of project.evidence.entries()) {
      expect(evidenceItems[index]).toHaveTextContent(evidence.label)
      expect(evidenceItems[index]).toHaveTextContent(evidence.description)
      expect(within(evidenceItems[index]).getByText(evidence.status, { selector: '[data-status-label]' })).toBeInTheDocument()
    }

    const visualExhibitSection = within(proofSection).getByRole('region', { name: 'Interface evidence' })
    const proofBody = visualExhibitSection.parentElement

    expect(proofBody).not.toBeNull()
    expect(evidenceSection).not.toBeNull()
    expect(Array.from(proofBody?.children ?? [])).toEqual([
      visualExhibitSection,
      evidenceSection,
    ])
    expect(
      within(visualExhibitSection).getByRole('heading', { level: 3, name: 'Interface evidence' }),
    ).toBeInTheDocument()
    expect(within(visualExhibitSection).getAllByRole('figure')).toHaveLength(project.gallery.length)

    for (const [index, image] of project.gallery.entries()) {
      const renderedImage = within(visualExhibitSection).getByRole('img', { name: image.alt })

      expect(renderedImage).toHaveAttribute('alt', image.alt)
      expect(renderedImage).toHaveAttribute('loading', index === 0 ? 'eager' : 'lazy')
      expect(renderedImage).toHaveAttribute('sizes', expect.stringContaining('calc(100vw - 7rem)'))
      expect(renderedImage).toHaveAttribute('sizes', expect.not.stringContaining('50vw'))
      expect(renderedImage).toHaveAttribute('sizes', expect.not.stringMatching(/(?:^|,\s*)100vw(?:,|$)/))
      expect(within(visualExhibitSection).getByText(image.caption)).toBeInTheDocument()
    }

    const technicalNotes = within(mechanismSection).getByRole('group', { name: 'Technical notes' })
    expect(technicalNotes.tagName).toBe('DETAILS')
    expect(technicalNotes).not.toHaveAttribute('open')

    const stackSection = within(technicalNotes).getByRole('region', { name: 'Stack lanes' })
    expect(within(stackSection).getAllByRole('listitem')).toHaveLength(4)
    for (const lane of project.stack) {
      expect(within(stackSection).getByRole('heading', { level: 3, name: lane.lane })).toBeInTheDocument()
      for (const item of lane.items) {
        expect(within(stackSection).getByText(item)).toBeInTheDocument()
      }
    }

    const limitsList =
      within(problemSection).queryByRole('list', { name: 'Limits and boundaries' }) ??
      within(technicalNotes).getByRole('list', { name: 'Limits and boundaries' })
    const limits = within(limitsList).getAllByRole('listitem')
    expect(limits).toHaveLength(project.limits.length)
    for (const [index, limit] of project.limits.entries()) {
      expect(limits[index]).toHaveTextContent(limit)
    }

    const liveLink = within(heroStage as HTMLElement).getByRole('link', {
      name: /Launch live site.*opens an external site/i,
    })
    expect(liveLink).toHaveAttribute('data-control-role', 'primary')
    expect(caseFile.querySelectorAll('[data-control-role="primary"]')).toHaveLength(1)
    expect(liveLink).toHaveAttribute('href', project.liveUrl)
    expect(liveLink).toHaveAttribute('target', '_blank')
    expect(liveLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(liveLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'))

    expect(screen.getByRole('link', { name: `Back to ${ecosystem.name} projects` })).toHaveAttribute(
      'href',
      `/${ecosystem.slug}`,
    )
    expect(screen.getByRole('link', { name: `Next case file: ${nextProject.name}` })).toHaveAttribute(
      'href',
      `/${nextProject.ecosystem}/${nextProject.slug}`,
    )

    expect(caseFile.firstElementChild).toBe(heroStage)
    const directChapterRegions = Array.from(caseFile.children).filter(
      (child): child is HTMLElement =>
        child.tagName === 'SECTION' || child.getAttribute('role') === 'region',
    )
    const topLevelLandmarks = directChapterRegions.map((region) => {
      expect(region).toHaveAttribute('role', 'region')
      const labelledBy = region.getAttribute('aria-labelledby')

      return labelledBy
        ? document.getElementById(labelledBy)?.textContent?.trim()
        : region.getAttribute('aria-label')
    })

    expect(directChapterRegions).toHaveLength(3)
    expect(topLevelLandmarks).toEqual(['Problem', 'Mechanism', 'Proof'])
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('loads only the representative gallery image eagerly without preload or high-priority hints', () => {
    imagePropCalls.length = 0

    const syntheticGallery = projectMediaAssetKeys.slice(0, 3).map((src, index) => ({
      alt: `Synthetic registered project evidence ${index + 1}`,
      caption: `Synthetic registered caption ${index + 1}`,
      src,
    }))

    render(<ProjectGallery gallery={syntheticGallery} />)

    expect(imagePropCalls).toHaveLength(3)
    expect(imagePropCalls.map((props) => props.loading)).toEqual(['eager', 'lazy', 'lazy'])
    expect(imagePropCalls.map((props) => props.fetchPriority)).toEqual(['low', undefined, undefined])
    for (const props of imagePropCalls) {
      expect(props.priority).toBeUndefined()
      expect(props.preload).toBeUndefined()
      expect(props.fetchPriority).not.toBe('high')
    }
  })

  it.each(projects)(
    'keeps the $name primary narrative concise and every catalog fact in native disclosure',
    (project) => {
      const ecosystem = getEcosystem(project.ecosystem)
      const nextProject = getNextProject(project.ecosystem, project.slug)

      if (!ecosystem || !nextProject) {
        throw new Error(`测试目录缺少 ${project.name} 的生态或下一项目。`)
      }

      render(<ProjectCaseStudy ecosystem={ecosystem} nextProject={nextProject} project={project} />)

      const caseFile = screen.getByRole('article', { name: `${project.name} case file` })
      const hero = caseFile.querySelector('[data-project-hero-copy]')
      const problemSection = screen.getByRole('region', { name: 'Problem' })
      const mechanismSection = screen.getByRole('region', { name: 'Mechanism' })
      const proofSection = screen.getByRole('region', { name: 'Proof' })

      expect(hero).not.toBeNull()
      expect(within(hero as HTMLElement).getByRole('heading', { level: 1, name: project.name })).toBeInTheDocument()
      expect(within(hero as HTMLElement).getByText(project.tagline)).toBeInTheDocument()
      expect(within(hero as HTMLElement).getAllByRole('link')).toHaveLength(1)
      expect(within(hero as HTMLElement).queryByText('Current boundary')).not.toBeInTheDocument()
      expect(hero?.querySelector('[class*="eyebrow"]')).toBeNull()
      const statusRail = within(hero as HTMLElement).getByRole('list', { name: 'Project status' })
      expect(statusRail).toHaveAttribute('data-project-status-rail')
      expect(statusRail.previousElementSibling).toHaveAttribute('data-control-role', 'primary')
      for (const status of project.status) {
        expect(within(statusRail).getByText(status, { selector: '[data-status-label]' })).toBeInTheDocument()
      }

      const boundaries = within(problemSection).getByRole('group', { name: 'Boundaries' })
      expect(boundaries.tagName).toBe('DETAILS')
      expect(boundaries).not.toHaveAttribute('open')
      expect(within(boundaries).getByRole('list', { name: 'Limits and boundaries' })).toBeInTheDocument()

      const technicalNotes = within(mechanismSection).getByRole('group', { name: 'Technical notes' })
      expect(technicalNotes.tagName).toBe('DETAILS')
      expect(technicalNotes).not.toHaveAttribute('open')
      for (const status of project.status) {
        expect(
          within(technicalNotes).queryByText(status, { selector: '[data-status-label]' }),
        ).not.toBeInTheDocument()
      }

      const loopItems = within(
        within(mechanismSection).getByRole('list', { name: 'Project mechanism' }),
      ).getAllByRole('listitem')
      for (const [index, step] of project.coreLoop.entries()) {
        const stepNotes = within(loopItems[index]).getByRole('group', {
          name: `Step notes for ${step.label}`,
        })

        expect(stepNotes.tagName).toBe('DETAILS')
        expect(stepNotes).not.toHaveAttribute('open')
        expect(within(stepNotes).getByText(step.description)).toBeInTheDocument()
      }

      const evidenceItems = within(
        within(proofSection).getByRole('list', { name: 'Product evidence' }),
      ).getAllByRole('listitem')
      for (const [index, evidence] of project.evidence.entries()) {
        const evidenceNotes = within(evidenceItems[index]).getByRole('group', {
          name: `Evidence notes for ${evidence.label}`,
        })

        expect(evidenceNotes.tagName).toBe('DETAILS')
        expect(evidenceNotes).not.toHaveAttribute('open')
        expect(within(evidenceNotes).getByText(evidence.description)).toBeInTheDocument()
      }

      const figures = within(proofSection).getAllByRole('figure')
      for (const [index, image] of project.gallery.entries()) {
        const mediaNotes = within(figures[index]).getByRole('group', {
          name: `Media notes for ${image.alt}`,
        })

        expect(mediaNotes.tagName).toBe('DETAILS')
        expect(mediaNotes).not.toHaveAttribute('open')
        expect(within(mediaNotes).getByText(image.caption)).toBeInTheDocument()
      }
    },
  )

  it('keeps every catalog project reachable through static case-file params', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams()).toEqual([
      { ecosystem: 'arc', project: 'signal-ledger' },
      { ecosystem: 'arc', project: 'hadron' },
      { ecosystem: 'arc', project: 'arcpredict' },
      { ecosystem: 'rialo', project: 'rialo-captain' },
    ])
    expect(ecosystems.map((ecosystem) => ecosystem.slug)).toEqual(['arc', 'rialo'])
  })

  it('uses one overlapping borderless hero canvas instead of desktop card islands', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/project/project-case-study.module.css'),
      'utf8',
    )
    const caseFileRule = css.match(/\.caseFile\s*\{([^}]+)\}/)?.[1] ?? ''
    const ambientLayerRule = css.match(/\.caseFile::before\s*\{([^}]+)\}/)?.[1] ?? ''
    const mobileAmbientLayerRule =
      css.match(
        /@media \(max-width:\s*819px\)\s*\{\s*\.caseFile::before\s*\{([^}]+)\}/,
      )?.[1] ?? ''
    const heroStageRule = css.match(/\.heroStage\s*\{([^}]+)\}/)?.[1] ?? ''
    const heroRule = css.match(/\.hero\s*\{([^}]+)\}/)?.[1] ?? ''
    const desktopHeroStageRule =
      css.match(
        /@media \(min-width:\s*820px\)\s*\{[^]*?\.heroStage\.heroStage\s*\{([^}]+)\}/,
      )?.[1] ?? ''

    const chapterRule = css.match(/\.chapter\s*\{([^}]+)\}/)?.[1] ?? ''
    const chapterMarkerRule = css.match(/\.chapter::before\s*\{([^}]+)\}/)?.[1] ?? ''
    const chapterBodyRule =
      css.match(/\.problemBody,\s*\.mechanismBody,\s*\.proofBody\s*\{([^}]+)\}/)?.[1] ?? ''
    const sectionTitleRule = css.match(/\.sectionTitle\.sectionTitle\s*\{([^}]+)\}/)?.[1] ?? ''
    const sectionBodyRule = css.match(/\.sectionBody\.sectionBody\s*\{([^}]+)\}/)?.[1] ?? ''
    const desktopLoopListRule =
      css.match(
        /@media \(min-width:\s*1180px\)\s*\{[^]*?\.loopList\s*\{([^}]+)\}/,
      )?.[1] ?? ''
    const tabletLoopListRule =
      css.match(
        /@media \(min-width:\s*820px\) and \(max-width:\s*1179px\)\s*\{[^]*?\.loopList\s*\{([^}]+)\}/,
      )?.[1] ?? ''
    const mobileLoopListRule =
      css.match(
        /@media \(max-width:\s*819px\)\s*\{[^]*?\.loopList\s*\{([^}]+)\}/,
      )?.[1] ?? ''
    const loopItemRule = css.match(/\.coreLoop \.loopItem\s*\{([^}]+)\}/)?.[1] ?? ''
    const desktopProofBodyRule =
      css.match(
        /@media \(min-width:\s*820px\)\s*\{[^]*?\.proofBody\s*\{([^}]+)\}/,
      )?.[1] ?? ''
    const evidenceItemRule = css.match(/\.evidenceItem\.evidenceItem\s*\{([^}]+)\}/)?.[1] ?? ''
    const gallerySectionRule = css.match(/\.gallerySection\s*\{([^}]+)\}/)?.[1] ?? ''
    const galleryImageRule = css.match(/\.galleryImage\s*\{([^}]+)\}/)?.[1] ?? ''
    const navigatorRule = css.match(/\.navigator\.navigator\s*\{([^}]+)\}/)?.[1] ?? ''
    const narrowRhythmRules = css.match(
      /@media \(max-width:\s*560px\)\s*\{\s*\.heroStage\s*\{([^}]+)\}\s*\.chapter,\s*\.navigator\.navigator\s*\{([^}]+)\}\s*\.problemChapter,\s*\.mechanismChapter,\s*\.proofChapter\s*\{([^}]+)\}/,
    )

    expect(caseFileRule).toContain('background: transparent;')
    expect(caseFileRule).toContain('isolation: isolate;')
    expect(caseFileRule).not.toMatch(/(?:radial|linear)-gradient/)
    expect(caseFileRule).not.toMatch(/overflow:\s*(?:clip|hidden)/)
    expect(caseFileRule).not.toMatch(/clip-path\s*:/)
    expect(caseFileRule).not.toMatch(/mask(?:-image)?\s*:/)
    expect(ambientLayerRule).toMatch(/background:\s*radial-gradient\(/)
    expect(ambientLayerRule).toContain('transparent 100%')
    expect(ambientLayerRule).toContain('inset-block: -10vw;')
    expect(ambientLayerRule).toContain('inset-inline: 0;')
    expect(ambientLayerRule).not.toMatch(/(?:^|[;\s])inset\s*:\s*[^;]*-/)
    expect(ambientLayerRule).not.toMatch(/inset-inline(?:-start|-end)?\s*:\s*[^;]*-/)
    expect(mobileAmbientLayerRule).not.toMatch(
      /inset-inline(?:-start|-end)?\s*:\s*[^;]*-/,
    )
    expect(mobileAmbientLayerRule).not.toContain('var(--page-gutter)')
    expect(ambientLayerRule).toContain('pointer-events: none;')
    expect(ambientLayerRule).toContain('z-index: -1;')
    expect(ambientLayerRule).not.toMatch(/overflow:\s*(?:clip|hidden)/)
    expect(heroStageRule).not.toMatch(/(?:^|\s)border\s*:/)
    expect(heroStageRule).not.toMatch(/border-block\s*:/)
    expect(heroStageRule).not.toMatch(/border-block-start\s*:/)
    expect(heroStageRule).toContain('block-size: clamp(70svh, 74svh, 78svh);')
    expect(heroStageRule).not.toMatch(/overflow:\s*(?:clip|hidden)/)
    expect(heroRule).not.toMatch(/(?:^|\s)border\s*:/)
    expect(desktopHeroStageRule).toContain('grid-template-areas: "canvas";')
    expect(desktopHeroStageRule).toContain('block-size: clamp(70svh, 74svh, 78svh);')
    expect(desktopHeroStageRule).not.toMatch(
      /grid-template-columns:\s*minmax\([^;]+\)\s+minmax\(/,
    )
    expect(css).not.toMatch(/\.heroStage::after/)
    expect(css).toMatch(
      /\.heroStage > header,\s*\.heroStage > \[data-signature-motif\]\s*\{[^}]*grid-area:\s*canvas;/,
    )

    expect(chapterRule).not.toMatch(/border(?:-block|-inline)?(?:-[a-z]+)?\s*:/)
    expect(chapterRule).toContain('padding-block: clamp(2.5rem, 5vw, 3.5rem);')
    expect(navigatorRule).toContain('padding-block: clamp(2.5rem, 5vw, 3.5rem) 0;')
    expect(narrowRhythmRules?.[1] ?? '').toContain('padding-block: var(--space-xl);')
    expect(narrowRhythmRules?.[2] ?? '').toContain('padding-block: var(--space-md);')
    expect(narrowRhythmRules?.[3] ?? '').toContain('gap: var(--space-lg);')
    expect(chapterMarkerRule).toContain('inline-size: clamp(')
    expect(chapterMarkerRule).not.toMatch(/inline-size:\s*100%/)
    expect(chapterBodyRule).toContain('max-inline-size: 72rem;')
    expect(chapterBodyRule).not.toMatch(/inline-size:\s*min\(100%/)
    expect(sectionTitleRule).toContain('overflow-wrap: normal;')
    expect(sectionTitleRule).not.toMatch(/overflow-wrap:\s*anywhere/)
    expect(sectionTitleRule).not.toMatch(/word-break:\s*break-all/)
    expect(sectionBodyRule).toMatch(/max-inline-size:\s*(?:4[4-9]|[5-9]\d)ch/)
    expect(desktopLoopListRule).toContain('grid-template-columns: repeat(5, minmax(0, 1fr));')
    expect(tabletLoopListRule).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));')
    expect(mobileLoopListRule).toContain('grid-template-columns: minmax(0, 1fr);')
    expect(loopItemRule).not.toMatch(/border(?:-block|-inline)?(?:-[a-z]+)?\s*:/)
    expect(desktopProofBodyRule).toContain('grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);')
    expect(evidenceItemRule).not.toMatch(/border(?:-block|-inline)?(?:-[a-z]+)?\s*:/)
    expect(gallerySectionRule).not.toMatch(/border-block-start\s*:/)
    expect(galleryImageRule).not.toMatch(/(?:^|\s)border\s*:/)
    expect(css).not.toMatch(/\.boundaryBlock\s*\{[^}]*border(?:-block|-inline)?(?:-[a-z]+)?\s*:/)
  })

  it('keeps project names intact on desktop and exposes only semantic slash breaks on mobile', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/project/project-case-study.module.css'),
      'utf8',
    )
    const heroTitleRule = css.match(/\.heroTitle\s*\{([^}]+)\}/)?.[1] ?? ''
    const heroStageRule = css.match(/\.heroStage\s*\{([^}]+)\}/)?.[1] ?? ''
    const titleSegmentRule = css.match(/\.titleSegment\s*\{([^}]+)\}/)?.[1] ?? ''
    const desktopHeroRule =
      css.match(
        /@media \(min-width:\s*820px\)\s*\{[^]*?\.heroStage > header\s*\{([^}]+)\}/,
      )?.[1] ?? ''
    const desktopTitleBreakRule =
      css.match(
        /@media \(min-width:\s*820px\)\s*\{[^]*?\.heroTitle wbr\s*\{([^}]+)\}/,
      )?.[1] ?? ''
    const mobileHeroTitleRule =
      css.match(
        /@media \(max-width:\s*819px\)\s*\{[^]*?\.heroTitle\s*\{([^}]+)\}/,
      )?.[1] ?? ''
    const mobileTitleBreakRule =
      css.match(
        /@media \(max-width:\s*819px\)\s*\{[^]*?\.heroTitle wbr\s*\{([^}]+)\}/,
      )?.[1] ?? ''
    const mobileTitleSegmentRule =
      css.match(
        /@media \(max-width:\s*819px\)\s*\{[^]*?\.titleSegment\s*\{([^}]+)\}/,
      )?.[1] ?? ''
    const narrowHeroTitleRule =
      css.match(
        /@media \(max-width:\s*560px\)\s*\{[^]*?\.heroTitle\s*\{([^}]+)\}/,
      )?.[1] ?? ''

    expect(heroStageRule).not.toMatch(/overflow:\s*(?:clip|hidden)/)
    expect(heroTitleRule).toContain('font-size: 6.5rem;')
    expect(heroTitleRule).toContain('white-space: nowrap;')
    expect(heroTitleRule).toContain('max-inline-size: 100%;')
    expect(heroTitleRule).toContain('overflow-wrap: normal;')
    expect(heroTitleRule).toContain('word-break: normal;')
    expect(titleSegmentRule).toContain('white-space: nowrap;')
    expect(desktopHeroRule).toContain('inline-size: min(78%, 64rem);')
    expect(desktopTitleBreakRule).toContain('display: none;')
    expect(mobileHeroTitleRule).toContain('white-space: normal;')
    expect(mobileTitleBreakRule).toContain('display: inline;')
    expect(mobileTitleSegmentRule).toContain('white-space: normal;')
    expect(mobileTitleSegmentRule).toContain('overflow-wrap: normal;')
    expect(mobileTitleSegmentRule).toContain('word-break: normal;')
    expect(narrowHeroTitleRule).toContain('font-size: 3.25rem;')
    expect([heroTitleRule, mobileHeroTitleRule, narrowHeroTitleRule]).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/font-size:[^;]*(?:vw|cqw|cqi)/)]),
    )
  })

  it('makes reduced-motion hero arrival a static terminal state', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/components/project/project-case-study.module.css'),
      'utf8',
    )
    const reducedMotionRule =
      css.match(
        /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[^]*?\.heroStage > \*\s*\{([^}]+)\}/,
      )?.[1] ?? ''

    expect(reducedMotionRule).toContain('animation: none !important;')
    expect(reducedMotionRule).toContain('transform: none;')
  })
})
