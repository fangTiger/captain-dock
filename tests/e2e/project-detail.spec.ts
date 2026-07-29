import { expect, test } from '@playwright/test'
import type { Browser, Locator, Page, Response } from '@playwright/test'

import { projects } from '../../src/content/catalog'
import { getEcosystem, getNextProject } from '../../src/content/selectors'
import type { Project, ProjectTheme } from '../../src/content/types'

const viewports = [
  { width: 320, height: 900 },
  { width: 375, height: 900 },
  { width: 1440, height: 960 },
] as const

const defaultHeightViewports = [
  { width: 1440, height: 1000, limit: 3200 },
  { width: 390, height: 844, limit: 3400 },
] as const

const signatureGrammars = {
  ledger: 'scan-ledger',
  market: 'order-book',
  probability: 'probability-arc',
  flight: 'flight-route',
} satisfies Record<ProjectTheme['motif'], string>

function projectPath(project: Pick<Project, 'ecosystem' | 'slug'>) {
  return `/${project.ecosystem}/${project.slug}`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countRawImagePreloads(html: string) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].filter(
    ([tag]) => /\brel=["']preload["']/i.test(tag) && /\bas=["']image["']/i.test(tag),
  ).length
}

function projectNameMatcher(projectName: string) {
  return new RegExp(`^${projectName.split('/').map(escapeRegExp).join('\\s*/\\s*')}$`)
}

async function expectProjectNameHeading(scope: Locator, project: Project) {
  const heading = scope.getByRole('heading', { level: 1 })

  await expect(heading).toHaveCount(1)
  await expect(heading).toBeVisible()
  await expect(heading).toHaveText(project.name)
  await expect(heading).toHaveAccessibleName(projectNameMatcher(project.name))
}

async function expectNoLocalAbsolutePaths(page: Page) {
  const html = await page.locator('body').innerHTML()

  expect(html).not.toContain('/Users/captain')
  expect(html).not.toContain('file://')
}

async function expectNoHorizontalOverflow(page: Page, viewportWidth: number) {
  const widths = await page.evaluate(() => ({
    articleClientWidth: document.querySelector('article')?.clientWidth ?? 0,
    articleScrollWidth: document.querySelector('article')?.scrollWidth ?? 0,
    documentWidth: document.documentElement.scrollWidth,
  }))

  expect(widths.documentWidth, `document width at ${viewportWidth}`).toBe(viewportWidth)
  expect(widths.articleScrollWidth, `article overflow at ${viewportWidth}`).toBe(widths.articleClientWidth)
}

async function expectVisibleElementsStayWithinViewport(page: Page, label: string) {
  const outliers = await page.locator('article *').evaluateAll((elements) =>
    elements
      .map((element) => {
        const htmlElement = element as HTMLElement
        const style = window.getComputedStyle(htmlElement)
        const box = htmlElement.getBoundingClientRect()
        const viewportWidth = document.documentElement.clientWidth
        const text = htmlElement.innerText?.replace(/\s+/g, ' ').trim() ?? ''

        return {
          display: style.display,
          height: box.height,
          left: box.left,
          right: box.right,
          text,
          visibility: style.visibility,
          viewportWidth,
          width: box.width,
        }
      })
      .filter((element) => element.display !== 'none' && element.visibility !== 'hidden')
      .filter((element) => element.width > 0 && element.height > 0)
      .filter((element) => element.left < -1 || element.right > element.viewportWidth + 1),
  )

  expect(outliers, `${label} visible horizontal outliers`).toEqual([])
}

async function expectReadableTextDoesNotClip(page: Page, label: string) {
  const clipped = await page
    .locator('article p, article a, article figcaption')
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const htmlElement = element as HTMLElement
          const text = htmlElement.innerText.replace(/\s+/g, ' ').trim()

          return {
            clientHeight: htmlElement.clientHeight,
            clientWidth: htmlElement.clientWidth,
            scrollHeight: htmlElement.scrollHeight,
            scrollWidth: htmlElement.scrollWidth,
            text,
          }
        })
        .filter((element) => element.text.length > 0)
        .filter(
          (element) =>
            element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
        ),
    )

  expect(clipped, `${label} text clipping`).toEqual([])
}

async function expectSingleGalleryFigureUsesAvailableWidth(page: Page, label: string) {
  const measurements = await page.getByRole('region', { name: 'Interface evidence' }).evaluate((section) => {
    const grid = section.querySelector('figure')?.parentElement
    const figure = section.querySelector('figure')
    const image = section.querySelector('img')

    if (!grid || !figure || !image) {
      throw new Error('缺少界面证物图库、figure 或图片。')
    }

    const gridWidth = grid.getBoundingClientRect().width
    const figureWidth = figure.getBoundingClientRect().width
    const imageWidth = image.getBoundingClientRect().width

    return {
      figureRatio: figureWidth / gridWidth,
      figureWidth,
      gridWidth,
      imageRatio: imageWidth / gridWidth,
      imageWidth,
    }
  })

  expect(measurements.figureRatio, `${label} single figure should use gallery width`).toBeGreaterThanOrEqual(0.9)
  expect(measurements.imageRatio, `${label} gallery image should use gallery width`).toBeGreaterThanOrEqual(0.9)
}

async function waitForFontsAndRepresentativeMedia(caseFile: Locator, project: Project) {
  await caseFile.page().evaluate(() => document.fonts.ready.then(() => undefined))

  const representativeImage = caseFile.getByRole('img', { name: project.gallery[0].alt })

  await expect
    .poll(() =>
      representativeImage.evaluate((element) => {
        const image = element as HTMLImageElement

        return image.naturalWidth > 0 && image.naturalHeight > 0
      }),
    )
    .toBe(true)

  const dimensions = await representativeImage.evaluate((element) => {
    const image = element as HTMLImageElement

    return {
      height: image.naturalHeight,
      width: image.naturalWidth,
    }
  })

  expect(dimensions.width, `${project.name} representative media natural width`).toBeGreaterThan(0)
  expect(dimensions.height, `${project.name} representative media natural height`).toBeGreaterThan(0)
}

async function expectRepresentativeMediaGate(page: Page, project: Project) {
  const imageResponses: { status: number; url: string }[] = []
  const handleResponse = (response: Response) => {
    if (response.request().resourceType() === 'image') {
      imageResponses.push({
        status: response.status(),
        url: response.url(),
      })
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 })
  page.on('response', handleResponse)

  try {
    const navigationResponse = await page.goto(projectPath(project))

    expect(navigationResponse, `${project.name} navigation response`).not.toBeNull()
    const rawNavigationHtml = await navigationResponse?.text()

    expect(
      countRawImagePreloads(rawNavigationHtml ?? ''),
      `${project.name} raw navigation HTML image preload count`,
    ).toBe(0)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

    const gallery = page.locator('main#main-content').getByRole('region', { name: 'Interface evidence' })
    const representativeImage = gallery.getByRole('img', { name: project.gallery[0].alt })

    await expect(page.locator('head link[rel="preload"][as="image"]')).toHaveCount(0)
    await expect(representativeImage).toHaveAttribute('loading', 'eager')
    await expect(representativeImage).toHaveAttribute('fetchpriority', 'low')
    await waitForFontsAndRepresentativeMedia(page.locator('main#main-content'), project)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

    const representativeSource = await representativeImage.evaluate((element) => {
      const image = element as HTMLImageElement

      return image.currentSrc || image.src
    })

    await expect
      .poll(() => imageResponses.find((response) => response.url === representativeSource))
      .toEqual(
        expect.objectContaining({
          status: expect.any(Number),
          url: representativeSource,
        }),
      )

    const representativeResponse = imageResponses.find(
      (response) => response.url === representativeSource,
    )

    expect(representativeResponse?.status, `${project.name} representative media status`).toBeGreaterThanOrEqual(200)
    expect(representativeResponse?.status, `${project.name} representative media status`).toBeLessThan(400)

    for (const image of project.gallery.slice(1)) {
      const deferredImage = gallery.getByRole('img', { name: image.alt })

      await expect(deferredImage).toHaveAttribute('loading', 'lazy')
      await expect(deferredImage).not.toHaveAttribute('fetchpriority')
    }
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  } finally {
    page.off('response', handleResponse)
  }
}

async function expectMechanismRows(
  page: Page,
  project: Project,
  viewport: { width: number; height: number },
  expectedRows: readonly number[],
) {
  await page.setViewportSize(viewport)
  await page.goto(projectPath(project))

  const mechanismItems = await page
    .getByRole('region', { name: 'Mechanism' })
    .getByRole('list', { name: 'Project mechanism' })
    .getByRole('listitem')
    .evaluateAll((items) => {
      const positions = items.map((item) => {
        const box = item.getBoundingClientRect()

        return {
          label: item.querySelector('h3')?.textContent?.trim() ?? '',
          left: box.left,
          top: box.top,
        }
      })
      const rows: (typeof positions)[] = []

      for (const item of positions) {
        const currentRow = rows.at(-1)

        if (!currentRow || Math.abs(item.top - currentRow[0].top) > 2) {
          rows.push([item])
        } else {
          currentRow.push(item)
        }
      }

      return {
        positions,
        rowCounts: rows.map((row) => row.length),
        rows,
      }
    })

  expect(mechanismItems.positions.map((item) => item.label)).toEqual(
    project.coreLoop.map((step) => step.label),
  )
  expect(mechanismItems.rowCounts, `${project.name} mechanism rows at ${viewport.width}`).toEqual(expectedRows)

  for (const row of mechanismItems.rows) {
    for (let index = 1; index < row.length; index += 1) {
      expect(row[index].left, `${project.name} row x order at ${viewport.width}`).toBeGreaterThan(
        row[index - 1].left,
      )
    }
  }

  for (let index = 1; index < mechanismItems.rows.length; index += 1) {
    expect(
      mechanismItems.rows[index][0].top,
      `${project.name} row top order at ${viewport.width}`,
    ).toBeGreaterThan(mechanismItems.rows[index - 1][0].top)
  }
}

async function expectEditorialGeometry(page: Page, project: Project, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport)
  await page.goto(projectPath(project))

  const caseFile = page
    .locator('main#main-content')
    .getByRole('article', { name: `${project.name} case file` })
  await expect(caseFile.locator('details[open]')).toHaveCount(0)
  await waitForFontsAndRepresentativeMedia(caseFile, project)

  const heroRatio = await caseFile
    .locator('[data-case-hero-stage]')
    .evaluate((stage) => stage.getBoundingClientRect().height / window.innerHeight)
  const proofGeometry = await caseFile.getByRole('region', { name: 'Proof' }).evaluate((proof) => {
    const gallery = proof.querySelector<HTMLElement>('[aria-labelledby="visual-exhibit-heading"]')
    const evidence = proof.querySelector<HTMLElement>('[aria-label="Product evidence"]')?.parentElement

    if (!gallery || !evidence) {
      throw new Error('缺少 Proof gallery 或 evidence。')
    }

    const galleryRect = gallery.getBoundingClientRect()
    const evidenceRect = evidence.getBoundingClientRect()

    return {
      evidenceLeft: evidenceRect.left,
      evidenceTop: evidenceRect.top,
      evidenceWidth: evidenceRect.width,
      galleryBottom: galleryRect.bottom,
      galleryLeft: galleryRect.left,
      galleryTop: galleryRect.top,
      galleryWidth: galleryRect.width,
    }
  })

  expect(heroRatio, `${project.name} hero ratio at ${viewport.width}`).toBeGreaterThanOrEqual(0.7)
  expect(heroRatio, `${project.name} hero ratio at ${viewport.width}`).toBeLessThanOrEqual(0.78)

  if (viewport.width >= 1180) {
    expect(
      proofGeometry.galleryWidth / proofGeometry.evidenceWidth,
      `${project.name} proof media/evidence ratio at ${viewport.width}`,
    ).toBeGreaterThanOrEqual(1.75)
    expect(
      proofGeometry.galleryWidth / proofGeometry.evidenceWidth,
      `${project.name} proof media/evidence ratio at ${viewport.width}`,
    ).toBeLessThanOrEqual(2.35)
    expect(Math.abs(proofGeometry.galleryTop - proofGeometry.evidenceTop)).toBeLessThanOrEqual(2)
    expect(proofGeometry.galleryLeft).toBeLessThan(proofGeometry.evidenceLeft)
  } else {
    expect(proofGeometry.galleryBottom).toBeLessThanOrEqual(proofGeometry.evidenceTop + 2)
  }
}

type DefaultHeightSample = Readonly<{
  height: number
  limit: number
  project: string
  viewport: string
}>

async function measureDefaultDocumentHeight(
  page: Page,
  project: Project,
  viewport: (typeof defaultHeightViewports)[number],
): Promise<DefaultHeightSample> {
  await page.setViewportSize(viewport)
  await page.goto(projectPath(project))

  const caseFile = page
    .locator('main#main-content')
    .getByRole('article', { name: `${project.name} case file` })

  await expect(caseFile.locator('details[open]')).toHaveCount(0)
  await waitForFontsAndRepresentativeMedia(caseFile, project)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

  return {
    height: await page.evaluate(() =>
      Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    ),
    limit: viewport.limit,
    project: project.name,
    viewport: `${viewport.width}x${viewport.height}`,
  }
}

async function expectExpandedDetailsWithoutOverflow(
  page: Page,
  project: Project,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport)
  await page.goto(projectPath(project))

  const label = `${project.name} expanded ${viewport.width}`
  const caseFile = page
    .locator('main#main-content')
    .getByRole('article', { name: `${project.name} case file` })
  const disclosures = await expectNativeDisclosuresInitiallyClosed(caseFile, project)

  await openNativeDisclosuresWithKeyboard(page, disclosures)
  await expectExpandedCatalogFacts(caseFile, project)
  await expectNoHorizontalOverflow(page, viewport.width)
  await expectVisibleElementsStayWithinViewport(page, label)
  await expectReadableTextDoesNotClip(page, label)
}

async function expectProjectSignature(page: Page, project: Project) {
  const main = page.locator('main#main-content')
  const signature = main.getByRole('region', { name: 'System signature' })

  await expect(signature).toBeVisible()
  await expect(signature.getByRole('heading', { level: 2, name: 'System signature' })).toHaveAttribute(
    'id',
    `${project.slug}-signature-heading`,
  )
  await expect(signature).toHaveAttribute('data-signature-motif', project.theme.motif)
  await expect(signature).toHaveAttribute('data-signature-grammar', signatureGrammars[project.theme.motif])
  await expect(signature.getByText(project.name)).toBeVisible()
  await expect(signature.getByText('Process diagram / not live data')).toBeVisible()

  await expect(signature.getByRole('list')).toHaveCount(0)
  await expect(signature.getByRole('listitem')).toHaveCount(0)

  if (project.theme.motif === 'probability') {
    await expect(signature.getByText('AI does not participate in final settlement')).toBeVisible()
  }
}

async function openProjectWithoutJavaScript(
  browser: Browser,
  baseURL: string | undefined,
  route: string,
) {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: {
      width: 375,
      height: 900,
    },
  })
  const page = await context.newPage()

  await page.goto(route)

  return { context, page }
}

async function expectExactCaseChapters(caseFile: ReturnType<Page['locator']>) {
  const sectionsAndRegions = caseFile.locator(
    ':scope > section, :scope > [role="region"]',
  )

  await expect(sectionsAndRegions).toHaveCount(3)
  const chapters = await sectionsAndRegions.evaluateAll((chapterSections) =>
    [...new Set(chapterSections)].map((section) => {
      const labelledBy = section.getAttribute('aria-labelledby')

      return {
        name:
          section.getAttribute('aria-label') ??
          (labelledBy ? document.getElementById(labelledBy)?.textContent?.trim() : null),
        role: section.getAttribute('role'),
      }
    }),
  )
  const names = chapters.map((chapter) => chapter.name)

  expect(chapters.every((chapter) => chapter.role === 'region')).toBe(true)
  expect(new Set(names).size).toBe(3)
  expect(names).toEqual(['Problem', 'Mechanism', 'Proof'])
}

type NativeDisclosure = Readonly<{
  details: Locator
  label: string
}>

function getNativeDisclosures(caseFile: Locator, project: Project): NativeDisclosure[] {
  const labels = [
    'Boundaries',
    'Technical notes',
    ...project.coreLoop.map((step) => `Step notes for ${step.label}`),
    ...project.evidence.map((evidence) => `Evidence notes for ${evidence.label}`),
    ...project.gallery.map((image) => `Media notes for ${image.alt}`),
  ]

  return labels.map((label) => ({
    details: caseFile.getByRole('group', { includeHidden: true, name: label }),
    label,
  }))
}

function getTechnicalNotesList(
  technicalNotes: Locator,
  label: 'Roles' | 'Tags',
  includeHidden = false,
) {
  return technicalNotes
    .getByText(label, { exact: true })
    .locator('..')
    .getByRole('list', { includeHidden })
}

async function expectNativeDisclosuresInitiallyClosed(caseFile: Locator, project: Project) {
  const disclosures = getNativeDisclosures(caseFile, project)

  await expect(caseFile.locator('details')).toHaveCount(disclosures.length)
  for (const disclosure of disclosures) {
    const summary = disclosure.details.locator(':scope > summary')

    await expect(disclosure.details, `${disclosure.label} 必须唯一存在。`).toHaveCount(1)
    await expect(disclosure.details).not.toHaveAttribute('open')
    await expect(summary).toHaveCount(1)
    await expect(summary).toBeVisible()
    expect(await disclosure.details.evaluate((element) => element.tagName)).toBe('DETAILS')
  }

  return disclosures
}

async function openNativeDisclosuresWithKeyboard(
  page: Page,
  disclosures: readonly NativeDisclosure[],
) {
  for (const [index, disclosure] of disclosures.entries()) {
    const summary = disclosure.details.locator(':scope > summary')

    await summary.scrollIntoViewIfNeeded()
    await summary.focus()
    await expect(summary).toBeFocused()
    await page.keyboard.press(index % 2 === 0 ? 'Enter' : 'Space')
    await expect(disclosure.details).toHaveAttribute('open', '')
  }
}

async function expectExpandedCatalogFacts(caseFile: Locator, project: Project) {
  const boundaries = caseFile.getByRole('group', { name: 'Boundaries' })
  const limits = boundaries.getByRole('list', { name: 'Limits and boundaries' })
  const technicalNotes = caseFile.getByRole('group', { name: 'Technical notes' })
  const rolesList = getTechnicalNotesList(technicalNotes, 'Roles')
  const tagsList = getTechnicalNotesList(technicalNotes, 'Tags')
  const stackLanes = technicalNotes.getByRole('region', { name: 'Stack lanes' })
  const statusRail = caseFile.getByRole('list', { name: 'Project status' })
  const evidenceList = caseFile.getByRole('list', { name: 'Product evidence' })

  await expect(rolesList).toHaveCount(1)
  await expect(rolesList.getByRole('listitem')).toHaveCount(project.roles.length)
  await expect(tagsList).toHaveCount(1)
  await expect(tagsList.getByRole('listitem')).toHaveCount(project.tags.length)
  await expect(stackLanes).toHaveCount(1)
  await expect(stackLanes.getByRole('listitem')).toHaveCount(project.stack.length)
  await expect(statusRail).toHaveCount(1)
  for (const status of project.status) {
    await expect(
      statusRail.locator('[data-status-label]').filter({ hasText: new RegExp(`^${status}$`) }),
    ).toHaveCount(1)
  }

  await expect(limits.getByRole('listitem')).toHaveCount(project.limits.length)
  for (const limit of project.limits) {
    await expect(limits.getByText(limit, { exact: true })).toBeVisible()
  }

  for (const role of project.roles) {
    await expect(rolesList.getByText(role, { exact: true })).toBeVisible()
  }
  for (const tag of project.tags) {
    await expect(tagsList.getByText(tag, { exact: true })).toBeVisible()
  }
  for (const lane of project.stack) {
    const laneHeading = stackLanes.getByRole('heading', { level: 3, name: lane.lane })
    const stackLane = laneHeading.locator('..')

    await expect(laneHeading).toHaveCount(1)
    await expect(laneHeading).toBeVisible()
    await expect(stackLane).toHaveCount(1)
    await expect(stackLane).toBeVisible()
    expect(await stackLane.evaluate((element) => element.tagName)).toBe('LI')
    for (const item of lane.items) {
      await expect(stackLane.getByText(item, { exact: true })).toBeVisible()
    }
  }

  for (const step of project.coreLoop) {
    const notes = caseFile.getByRole('group', { name: `Step notes for ${step.label}` })

    await expect(notes.getByText(step.description, { exact: true })).toBeVisible()
  }

  for (const evidence of project.evidence) {
    const notes = caseFile.getByRole('group', {
      name: `Evidence notes for ${evidence.label}`,
    })
    const evidenceItem = evidenceList
      .getByRole('listitem')
      .filter({ hasText: evidence.label })

    await expect(evidenceItem).toHaveCount(1)
    await expect(evidenceItem.locator('[data-status-label]')).toHaveText(evidence.status)
    await expect(notes.getByText(evidence.description, { exact: true })).toBeVisible()
  }

  for (const image of project.gallery) {
    const notes = caseFile.getByRole('group', {
      name: `Media notes for ${image.alt}`,
    })

    await expect(notes.getByText(image.caption, { exact: true })).toBeVisible()
  }
}

for (const project of projects) {
  test(`${project.name} renders only its catalog gallery and navigation contract`, async ({ page }) => {
    const route = projectPath(project)
    const ecosystem = getEcosystem(project.ecosystem)
    const nextProject = getNextProject(project.ecosystem, project.slug)

    if (!ecosystem || !nextProject) {
      throw new Error(`测试目录缺少 ${project.name} 的生态或下一项目。`)
    }

    await page.goto(route)

    const main = page.locator('main#main-content')
    const gallery = main.getByRole('region', { name: 'Interface evidence' })

    await expect(page.locator('h1')).toHaveCount(1)
    await expectProjectNameHeading(main, project)
    await expectProjectSignature(page, project)
    await expect(gallery).toHaveCount(1)
    await expect(gallery.getByRole('heading', { level: 3, name: 'Interface evidence' })).toHaveCount(
      1,
    )
    await expect(gallery.getByRole('heading', { level: 3, name: 'Interface evidence' })).toBeVisible()
    await expect(gallery.locator('figure')).toHaveCount(project.gallery.length)

    const heroStage = main.locator('[data-case-hero-stage]')
    const caseFile = main.getByRole('article', { name: `${project.name} case file` })
    const heroCopy = heroStage.locator('[data-project-hero-copy]')
    const heroStatus = heroCopy.getByRole('list', { name: 'Project status' })

    await expect(heroStage).toHaveCount(1)
    await expect(heroStage.locator('header')).toHaveCount(1)
    await expect(heroStage.getByRole('region', { name: 'System signature' })).toHaveCount(1)
    await expect(heroStage.locator('[data-control-role="primary"]')).toHaveCount(1)
    await expect(heroCopy).toHaveCount(1)
    await expectProjectNameHeading(heroCopy, project)
    await expect(heroCopy.getByText(project.tagline, { exact: true })).toHaveCount(1)
    await expect(heroCopy.getByText(project.tagline, { exact: true })).toBeVisible()
    await expect(heroCopy.locator(':scope > *')).toHaveCount(4)
    await expect(heroStatus).toHaveCount(1)
    await expect(heroCopy.getByText(project.summary, { exact: true })).toHaveCount(0)
    await expect(caseFile.locator('[data-control-role="primary"]')).toHaveCount(1)
    await expectExactCaseChapters(caseFile)
    await expect(caseFile.getByRole('region', { name: 'Problem' })).toHaveCount(1)
    await expect(caseFile.getByRole('region', { name: 'Mechanism' })).toHaveCount(1)
    await expect(caseFile.getByRole('region', { name: 'Proof' })).toHaveCount(1)

    const disclosures = await expectNativeDisclosuresInitiallyClosed(caseFile, project)

    await openNativeDisclosuresWithKeyboard(page, disclosures)
    await expectExpandedCatalogFacts(caseFile, project)

    for (const otherProject of projects.filter((item) => item.slug !== project.slug)) {
      for (const image of otherProject.gallery) {
        await expect(gallery.getByRole('img', { name: image.alt })).toHaveCount(0)
        await expect(gallery.getByText(image.caption)).toHaveCount(0)
      }
    }

    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(0)

    for (const [index, image] of project.gallery.entries()) {
      const figure = gallery.locator('figure').filter({
        has: page.getByRole('img', { name: image.alt }),
      })
      const renderedImage = figure.getByRole('img', { name: image.alt })

      await expect(figure).toHaveCount(1)
      await expect(figure.getByText(image.caption, { exact: true })).toHaveCount(1)
      await expect(figure.getByText(image.caption, { exact: true })).toBeVisible()
      if (index > 0) {
        await renderedImage.scrollIntoViewIfNeeded()
      }
      await expect(renderedImage).toBeVisible()
      await expect(renderedImage).toHaveAttribute('loading', index === 0 ? 'eager' : 'lazy')
      await expect(renderedImage).not.toHaveAttribute('fetchpriority', /high/i)
      await expect(renderedImage).toHaveAttribute('sizes', /calc\(100vw - 7rem\)/)
      await expect(renderedImage).toHaveAttribute('sizes', /^(?!.*(?:^|,\s*)100vw(?:,|$))(?!.*50vw).*/)
      expect(
        await renderedImage.evaluate((element) => {
          const imageElement = element as HTMLImageElement

          return imageElement.currentSrc || imageElement.src
        }),
      ).toBeTruthy()
      await expect
        .poll(() => renderedImage.evaluate((element) => (element as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0)
    }

    const liveLink = heroStage.getByRole('link', {
      name: /Launch live site.*opens an external site/i,
    })
    const liveLabel = liveLink.getByText('Launch live site', { exact: true })

    await expect(liveLink).toHaveAttribute('data-control-role', 'primary')
    await expect(liveLink).toHaveAttribute('href', project.liveUrl)
    await expect(liveLabel).toHaveCount(1)
    await expect(liveLabel).toBeVisible()
    await expect(liveLabel).toHaveText('Launch live site')
    await expect(
      liveLink,
    ).toHaveAttribute('target', '_blank')
    await expect(
      liveLink,
    ).toHaveAttribute('rel', /noopener/)
    await expect(
      liveLink,
    ).toHaveAttribute('rel', /noreferrer/)
    await expect(main.getByRole('link', { name: `Back to ${ecosystem.name} projects` })).toHaveAttribute(
      'href',
      `/${ecosystem.slug}`,
    )
    await expect(main.getByRole('link', { name: `Next case file: ${nextProject.name}` })).toHaveAttribute(
      'href',
      projectPath(nextProject),
    )
    await expect(page.locator('iframe, canvas')).toHaveCount(0)
    await expectNoLocalAbsolutePaths(page)
  })
}

test('project detail representative media starts loading at the top of each route without preload priority', async ({
  page,
}) => {
  for (const project of projects) {
    await expectRepresentativeMediaGate(page, project)
  }
})

test('project detail pages do not overflow or clip at mobile and desktop widths', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)

    for (const project of projects) {
      await page.goto(projectPath(project))

      const label = `${project.name} ${viewport.width}`

      await expectNoHorizontalOverflow(page, viewport.width)
      await expectVisibleElementsStayWithinViewport(page, label)
      await expectReadableTextDoesNotClip(page, label)
    }
  }
})

test('project detail gallery uses the full desktop content width for single-image case files', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })

  for (const project of projects) {
    await page.goto(projectPath(project))
    await expectSingleGalleryFigureUsesAvailableWidth(page, `${project.name} 1440`)
  }
})

test('project detail default height gate collects the complete desktop and mobile matrix', async ({
  page,
}) => {
  const samples: DefaultHeightSample[] = []

  for (const viewport of defaultHeightViewports) {
    for (const project of projects) {
      samples.push(await measureDefaultDocumentHeight(page, project, viewport))
    }
  }

  expect(samples).toHaveLength(defaultHeightViewports.length * projects.length)
  expect(
    samples.filter((sample) => sample.height > sample.limit),
    `default detail height matrix: ${JSON.stringify(samples)}`,
  ).toEqual([])
})

test('project detail editorial instrument cut uses compact hero, sequencer rows, and media-led proof', async ({
  page,
}) => {
  for (const project of projects) {
    await expectMechanismRows(page, project, { width: 1440, height: 1000 }, [5])
    await expectMechanismRows(page, project, { width: 980, height: 900 }, [3, 2])
    await expectMechanismRows(page, project, { width: 390, height: 844 }, [1, 1, 1, 1, 1])
    await expectEditorialGeometry(page, project, { width: 1440, height: 1000 })
    await expectEditorialGeometry(page, project, { width: 390, height: 844 })
    await expectExpandedDetailsWithoutOverflow(page, project, { width: 1440, height: 1000 })
    await expectExpandedDetailsWithoutOverflow(page, project, { width: 390, height: 844 })
  }
})

test('project detail server DOM keeps every native disclosure operable without JavaScript', async ({
  browser,
  baseURL,
}) => {
  for (const project of projects) {
    const { context, page } = await openProjectWithoutJavaScript(browser, baseURL, projectPath(project))

    try {
      const main = page.locator('main#main-content')
      const caseFile = main.getByRole('article', { name: `${project.name} case file` })
      const problem = caseFile.getByRole('region', { name: 'Problem' })
      const projectSummary = problem.getByText(project.summary, { exact: true })

      await expectProjectNameHeading(main, project)
      await expect(projectSummary).toHaveCount(1)
      await expect(projectSummary).toBeVisible()
      await expectProjectSignature(page, project)
      await expect(problem).toBeVisible()
      await expect(caseFile.getByRole('region', { name: 'Mechanism' })).toBeVisible()
      await expect(caseFile.getByRole('region', { name: 'Proof' })).toBeVisible()
      await expectExactCaseChapters(caseFile)
      const disclosures = await expectNativeDisclosuresInitiallyClosed(caseFile, project)
      const projectStatusList = caseFile.getByRole('list', { name: 'Project status' })
      const boundaries = caseFile.getByRole('group', {
        includeHidden: true,
        name: 'Boundaries',
      })
      const technicalNotes = caseFile.getByRole('group', {
        includeHidden: true,
        name: 'Technical notes',
      })
      const rolesList = getTechnicalNotesList(technicalNotes, 'Roles', true)
      const tagsList = getTechnicalNotesList(technicalNotes, 'Tags', true)
      const stackLanes = technicalNotes.getByRole('region', {
        includeHidden: true,
        name: 'Stack lanes',
      })

      await expect(projectStatusList).toHaveCount(1)
      await expect(projectStatusList).toBeVisible()
      for (const status of project.status) {
        const statusLabel = projectStatusList
          .locator('[data-status-label]')
          .filter({ hasText: new RegExp(`^${status}$`) })

        await expect(statusLabel).toHaveCount(1)
        await expect(statusLabel).toHaveText(status)
      }

      for (const step of project.coreLoop) {
        const stepHeading = caseFile.getByRole('heading', { level: 3, name: step.label })
        const stepNotes = caseFile.getByRole('group', {
          includeHidden: true,
          name: `Step notes for ${step.label}`,
        })

        await expect(stepHeading).toHaveCount(1)
        await expect(stepHeading).toBeVisible()
        await expect(stepNotes.getByText(step.description, { exact: true })).toBeAttached()
        await expect(stepNotes.getByText(step.description, { exact: true })).toBeHidden()
      }

      const proof = caseFile.getByRole('region', { name: 'Proof' })

      for (const evidence of project.evidence) {
        const evidenceHeading = proof.getByRole('heading', {
          level: 3,
          name: evidence.label,
        })
        const evidenceNotes = proof.getByRole('group', {
          includeHidden: true,
          name: `Evidence notes for ${evidence.label}`,
        })
        const evidenceItem = proof
          .getByRole('listitem')
          .filter({ hasText: evidence.label })

        await expect(evidenceHeading).toHaveCount(1)
        await expect(evidenceHeading).toBeVisible()
        await expect(evidenceItem).toHaveCount(1)
        await expect(evidenceItem.locator('[data-status-label]')).toBeVisible()
        await expect(evidenceItem.locator('[data-status-label]')).toHaveText(evidence.status)
        await expect(evidenceNotes.getByText(evidence.description, { exact: true })).toBeAttached()
        await expect(evidenceNotes.getByText(evidence.description, { exact: true })).toBeHidden()
      }

      const limitsList = boundaries.getByRole('list', {
        includeHidden: true,
        name: 'Limits and boundaries',
      })

      await expect(boundaries).toHaveCount(1)
      await expect(technicalNotes).toHaveCount(1)
      await expect(rolesList).toHaveCount(1)
      await expect(rolesList.getByRole('listitem', { includeHidden: true })).toHaveCount(
        project.roles.length,
      )
      await expect(tagsList).toHaveCount(1)
      await expect(tagsList.getByRole('listitem', { includeHidden: true })).toHaveCount(
        project.tags.length,
      )
      await expect(stackLanes).toHaveCount(1)
      await expect(stackLanes.getByRole('listitem', { includeHidden: true })).toHaveCount(
        project.stack.length,
      )
      await expect(limitsList.getByRole('listitem', { includeHidden: true })).toHaveCount(
        project.limits.length,
      )

      for (const role of project.roles) {
        await expect(rolesList.getByText(role, { exact: true })).toBeAttached()
      }
      for (const tag of project.tags) {
        await expect(tagsList.getByText(tag, { exact: true })).toBeAttached()
      }
      for (const lane of project.stack) {
        const laneHeading = stackLanes.getByRole('heading', {
          includeHidden: true,
          level: 3,
          name: lane.lane,
        })
        const stackLane = laneHeading.locator('..')

        await expect(laneHeading).toHaveCount(1)
        await expect(laneHeading).toBeAttached()
        await expect(stackLane).toHaveCount(1)
        await expect(stackLane).toBeAttached()
        expect(await stackLane.evaluate((element) => element.tagName)).toBe('LI')
        for (const item of lane.items) {
          await expect(stackLane.getByText(item, { exact: true })).toBeAttached()
        }
      }

      for (const limit of project.limits) {
        await expect(limitsList.getByText(limit, { exact: true })).toBeAttached()
      }

      for (const image of project.gallery) {
        const mediaNotes = proof.getByRole('group', {
          includeHidden: true,
          name: `Media notes for ${image.alt}`,
        })

        await expect(main.getByRole('img', { name: image.alt })).toBeVisible()
        await expect(mediaNotes.getByText(image.caption, { exact: true })).toBeAttached()
        await expect(mediaNotes.getByText(image.caption, { exact: true })).toBeHidden()
      }

      await openNativeDisclosuresWithKeyboard(page, disclosures)
      await expectExpandedCatalogFacts(caseFile, project)

      const heroStage = main.locator('[data-case-hero-stage]')
      const liveLink = heroStage.getByRole('link', {
        name: /Launch live site.*opens an external site/i,
      })
      const liveLabel = liveLink.getByText('Launch live site', { exact: true })
      const ecosystem = getEcosystem(project.ecosystem)
      const nextProject = getNextProject(project.ecosystem, project.slug)

      if (!ecosystem || !nextProject) {
        throw new Error(`测试目录缺少 ${project.name} 的生态或下一项目。`)
      }

      await expect(liveLink).toHaveAttribute('data-control-role', 'primary')
      await expect(caseFile.locator('[data-control-role="primary"]')).toHaveCount(1)
      await expect(liveLabel).toHaveCount(1)
      await expect(liveLabel).toBeVisible()
      await expect(liveLabel).toHaveText('Launch live site')
      await expect(liveLink).toHaveAttribute('href', project.liveUrl)
      await expect(liveLink).toHaveAttribute('target', '_blank')
      await expect(liveLink).toHaveAttribute('rel', /noopener/)
      await expect(liveLink).toHaveAttribute('rel', /noreferrer/)
      await expect(main.getByRole('link', { name: `Back to ${ecosystem.name} projects` })).toHaveAttribute(
        'href',
        `/${ecosystem.slug}`,
      )
      await expect(main.getByRole('link', { name: `Next case file: ${nextProject.name}` })).toHaveAttribute(
        'href',
        projectPath(nextProject),
      )
      await expect(page.locator('iframe, canvas')).toHaveCount(0)
      await expectNoLocalAbsolutePaths(page)
    } finally {
      await context.close()
    }
  }
})

test('project detail signatures expose motion only when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(projectPath(projects[0]))

  const activeAnimationNames = await page.locator('[data-signature-motion]').evaluateAll((elements) =>
    elements.map((element) => window.getComputedStyle(element).animationName),
  )

  expect(activeAnimationNames.some((name) => name !== 'none')).toBe(true)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(projectPath(projects[0]))

  const reducedMotion = await page.locator('[data-signature-motion]').evaluateAll((elements) =>
    elements.map((element) => {
      const style = window.getComputedStyle(element)
      const box = element.getBoundingClientRect()

      return {
        animationName: style.animationName,
        height: box.height,
        width: box.width,
      }
    }),
  )

  expect(reducedMotion.length).toBeGreaterThan(0)
  expect(reducedMotion.every((motion) => motion.animationName === 'none')).toBe(true)
  expect(reducedMotion.every((motion) => motion.width > 0 && motion.height > 0)).toBe(true)
})

test('project detail Tab order reaches live CTA, ecosystem return, then next case file', async ({ page }) => {
  for (const project of projects) {
    const ecosystem = getEcosystem(project.ecosystem)
    const nextProject = getNextProject(project.ecosystem, project.slug)

    if (!ecosystem || !nextProject) {
      throw new Error(`测试目录缺少 ${project.name} 的生态或下一项目。`)
    }

    await page.goto(projectPath(project))

    const focused: { href: string | null; text: string }[] = []

    for (let index = 0; index < 24; index += 1) {
      await page.keyboard.press('Tab')
      focused.push(
        await page.evaluate(() => {
          const element = document.activeElement

          return {
            href: element instanceof HTMLAnchorElement ? element.href : null,
            text: element?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          }
        }),
      )
    }

    const liveIndex = focused.findIndex(
      (item) => item.href === project.liveUrl && item.text.includes('Launch live site'),
    )
    const ecosystemIndex = focused.findIndex((item) => item.text === `Back to ${ecosystem.name} projects`)
    const nextIndex = focused.findIndex((item) => item.text === `Next case file: ${nextProject.name}`)

    expect(liveIndex, `${project.name} live CTA tab stop`).toBeGreaterThanOrEqual(0)
    expect(ecosystemIndex, `${project.name} ecosystem tab stop`).toBeGreaterThan(liveIndex)
    expect(nextIndex, `${project.name} next tab stop`).toBeGreaterThan(ecosystemIndex)
  }
})
