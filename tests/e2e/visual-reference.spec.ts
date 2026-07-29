import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

type VisualReference = Readonly<{
  name: string
  path: string
  scene?: 'arc' | 'home' | 'rialo'
  viewport: Readonly<{
    height: number
    width: number
  }>
}>

const visualReferences = [
  {
    name: 'home-1440.png',
    path: '/',
    scene: 'home',
    viewport: { height: 1000, width: 1440 },
  },
  {
    name: 'arc-1440.png',
    path: '/arc',
    scene: 'arc',
    viewport: { height: 1000, width: 1440 },
  },
  {
    name: 'rialo-1440.png',
    path: '/rialo',
    scene: 'rialo',
    viewport: { height: 1000, width: 1440 },
  },
  {
    name: 'signal-ledger-1440.png',
    path: '/arc/signal-ledger',
    viewport: { height: 1000, width: 1440 },
  },
  {
    name: 'home-390.png',
    path: '/',
    scene: 'home',
    viewport: { height: 844, width: 390 },
  },
  {
    name: 'arc-390.png',
    path: '/arc',
    scene: 'arc',
    viewport: { height: 844, width: 390 },
  },
  {
    name: 'rialo-390.png',
    path: '/rialo',
    scene: 'rialo',
    viewport: { height: 844, width: 390 },
  },
] as const satisfies readonly VisualReference[]

test.use({ reducedMotion: 'reduce' } as Parameters<typeof test.use>[0])

function collectRuntimeFailures(page: Page) {
  const failures: string[] = []

  page.on('pageerror', (error) => {
    failures.push(`pageerror: ${error.message}`)
  })
  page.on('console', (message) => {
    if (message.type() === 'error') {
      failures.push(`console error: ${message.text()}`)
    }
  })
  page.on('requestfailed', (request) => {
    failures.push(
      `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`,
    )
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failures.push(`response ${response.status()}: ${response.url()}`)
    }
  })

  return failures
}

async function expectStaticRendering(page: Page, reference: VisualReference) {
  if (reference.scene) {
    await expect(page.locator('[data-static-scene]')).toHaveCount(1)
    await expect(page.locator(`[data-static-scene="${reference.scene}"]`)).toHaveCount(1)
    await expect(page.locator('canvas')).toHaveCount(0)
    return
  }

  await expect(page.locator('[data-universe-shell]')).toHaveCount(0)
  await expect(page.locator('canvas')).toHaveCount(0)
}

type OpenSurfaceRail = 'inline-start' | 'none' | 'top'

async function expectOpenSurface(
  locator: ReturnType<Page['locator']>,
  rail: OpenSurfaceRail,
  label: string,
) {
  await expect(locator, `${label} exact surface owner`).toHaveCount(1)

  const surface = await locator.evaluate((element) => {
    const style = getComputedStyle(element)

    return {
      backgroundColor: style.backgroundColor,
      borderBottomWidth: style.borderBottomWidth,
      borderLeftWidth: style.borderLeftWidth,
      borderRightWidth: style.borderRightWidth,
      borderTopWidth: style.borderTopWidth,
    }
  })

  expect.soft(surface.backgroundColor, `${label} background`).toBe('rgba(0, 0, 0, 0)')

  if (rail === 'inline-start') {
    expect.soft(Number.parseFloat(surface.borderLeftWidth), `${label} left rail`).toBeGreaterThan(0)
  } else {
    expect.soft(surface.borderLeftWidth, `${label} left boundary`).toBe('0px')
  }

  if (rail === 'top') {
    expect.soft(Number.parseFloat(surface.borderTopWidth), `${label} top datum`).toBeGreaterThan(0)
  } else {
    expect.soft(surface.borderTopWidth, `${label} top boundary`).toBe('0px')
  }

  expect.soft(surface.borderRightWidth, `${label} right boundary`).toBe('0px')
  expect.soft(surface.borderBottomWidth, `${label} bottom boundary`).toBe('0px')
}

async function expectStageLightFieldContainedByStage(
  locator: ReturnType<Page['locator']>,
  label: string,
) {
  const contract = await locator.evaluate((element) => {
    const stageRect = element.getBoundingClientRect()
    const style = getComputedStyle(element, '::after')
    const main = element.closest('main')

    if (!main) {
      throw new Error('舞台缺少所属 main，无法验证横向包含关系。')
    }

    const readResolvedInset = (property: string) => {
      const value = style.getPropertyValue(property).trim()
      const parsed = Number.parseFloat(value)

      if (!Number.isFinite(parsed) || !value.endsWith('px')) {
        throw new Error(`无法读取舞台光场的 resolved ${property}。`)
      }

      return parsed
    }
    const inlineStart = readResolvedInset('inset-inline-start')
    const inlineEnd = readResolvedInset('inset-inline-end')
    const isRightToLeft = getComputedStyle(element).direction === 'rtl'
    const physicalLeftInset = isRightToLeft ? inlineEnd : inlineStart
    const physicalRightInset = isRightToLeft ? inlineStart : inlineEnd
    const readHorizontalOwner = (owner: Element, ownerLabel: string) => {
      const ownerStyle = getComputedStyle(owner)
      const contain = ownerStyle.getPropertyValue('contain').trim()

      return {
        clip: ownerStyle.getPropertyValue('clip').trim(),
        clipPath: ownerStyle.getPropertyValue('clip-path').trim(),
        contain,
        contentVisibility: ownerStyle.getPropertyValue('content-visibility').trim(),
        horizontalOverflow: owner.scrollWidth - owner.clientWidth,
        label: ownerLabel,
        maskImage: ownerStyle.getPropertyValue('mask-image').trim(),
        overflowX: ownerStyle.overflowX,
        paintContained: contain
          .split(/\s+/)
          .some((value) => value === 'paint' || value === 'strict' || value === 'content'),
      }
    }

    return {
      backgroundImage: style.backgroundImage,
      content: style.content,
      display: style.display,
      inlineEnd,
      inlineStart,
      opacity: Number.parseFloat(style.opacity),
      owners: [
        readHorizontalOwner(document.documentElement, 'document'),
        readHorizontalOwner(document.body, 'body'),
        readHorizontalOwner(main, 'main'),
        readHorizontalOwner(element, 'stage'),
      ],
      projectedLeft: stageRect.left + physicalLeftInset,
      projectedRight: stageRect.right - physicalRightInset,
      stageHeight: stageRect.height,
      stageLeft: stageRect.left,
      stageRight: stageRect.right,
      stageWidth: stageRect.width,
      visibility: style.visibility,
    }
  })

  expect(contract.stageWidth, `${label} stage width`).toBeGreaterThan(0)
  expect(contract.stageHeight, `${label} stage height`).toBeGreaterThan(0)
  expect(Math.abs(contract.inlineStart), `${label} light field inline start inset`).toBeLessThanOrEqual(
    0.01,
  )
  expect(Math.abs(contract.inlineEnd), `${label} light field inline end inset`).toBeLessThanOrEqual(
    0.01,
  )
  expect(
    Math.abs(contract.projectedLeft - contract.stageLeft),
    `${label} light field stage-local left edge`,
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(contract.projectedRight - contract.stageRight),
    `${label} light field stage-local right edge`,
  ).toBeLessThanOrEqual(1)
  expect(contract.content, `${label} light field generated content`).not.toBe('none')
  expect(contract.content, `${label} light field generated content`).not.toBe('normal')
  expect(contract.display, `${label} light field display`).not.toBe('none')
  expect(contract.visibility, `${label} light field visibility`).toBe('visible')
  expect(contract.opacity, `${label} light field opacity`).toBeGreaterThan(0)
  expect(contract.backgroundImage, `${label} light field radial background`).toMatch(
    /radial-gradient\(/i,
  )

  for (const owner of contract.owners) {
    expect(
      owner.horizontalOverflow,
      `${label} ${owner.label} horizontal overflow`,
    ).toBeLessThanOrEqual(1)
    expect(owner.overflowX, `${label} ${owner.label} overflow-x clipping`).toBe('visible')
    expect(owner.clip, `${label} ${owner.label} legacy clipping`).toBe('auto')
    expect(owner.clipPath, `${label} ${owner.label} clip-path`).toBe('none')
    expect(owner.maskImage, `${label} ${owner.label} mask clipping`).toBe('none')
    expect(owner.paintContained, `${label} ${owner.label} paint containment`).toBe(false)
    expect(owner.contentVisibility, `${label} ${owner.label} content visibility`).toBe(
      'visible',
    )
  }
}

async function expectBorderlessComposition(page: Page, reference: VisualReference) {
  if (reference.scene) {
    const stage = page.locator(`[data-instrument-stage="${reference.scene}"]`)

    await expect(stage).toHaveCount(1)
    await expectOpenSurface(stage, 'none', `${reference.scene} stage`)

    if (reference.scene === 'home' || reference.scene === 'arc') {
      await expectStageLightFieldContainedByStage(stage, reference.scene)
    }

    const stageDatum = await stage.evaluate((element) => {
      const style = getComputedStyle(element, '::before')

      return {
        borderBottomWidth: style.borderBottomWidth,
        borderLeftWidth: style.borderLeftWidth,
        borderRightWidth: style.borderRightWidth,
        borderTopWidth: style.borderTopWidth,
        display: style.display,
      }
    })

    expect.soft(stageDatum).toMatchObject({
      borderBottomWidth: '0px',
      borderLeftWidth: '0px',
      borderRightWidth: '0px',
      borderTopWidth: '0px',
    })

    if (reference.viewport.width <= 560) {
      expect.soft(stageDatum.display, `${reference.scene} mobile datum`).toBe('none')
    }

    if (reference.scene === 'home') {
      const projectReel = stage.getByRole('group', { name: 'Project reel' })
      const projectButtons = projectReel.getByRole('button')

      await expect(projectReel).toHaveCount(1)
      await expect(projectButtons).toHaveCount(4)
      await expectOpenSurface(
        projectButtons.first(),
        'inline-start',
        'home project node',
      )
    } else if (reference.scene === 'arc') {
      const readout = stage.locator('[data-stage-readout] > *')
      const selectorGroup = stage.getByRole('group', { name: 'Arc observation modes' })
      const selectorButtons = selectorGroup.getByRole('button')

      await expect(readout).toHaveCount(1)
      await expect(selectorGroup).toHaveCount(1)
      await expect(selectorButtons).toHaveCount(3)
      await expectOpenSurface(stage.locator('[data-stage-readout] > *'), 'none', 'Arc readout')
      await expectOpenSurface(
        selectorButtons.first(),
        'none',
        'Arc selector',
      )
    } else {
      const readout = stage.locator('[data-rialo-readout]')
      const timeline = stage.getByRole('list', { name: 'Rialo Captain core loop' })
      const stageButtons = timeline.getByRole('button')

      await expect(readout).toHaveCount(1)
      await expect(timeline).toHaveCount(1)
      await expect(stageButtons).toHaveCount(5)
      await expectOpenSurface(stage.locator('[data-rialo-readout]'), 'none', 'Rialo readout')
      await expectOpenSurface(
        stageButtons.first(),
        'none',
        'Rialo loop step',
      )
    }

    return
  }

  const signature = page.locator('[data-signature-motif]')
  const diagram = signature.locator(':scope > div[aria-hidden="true"]')
  const diagramSvg = diagram.locator(':scope > svg')
  const internalPaths = diagramSvg.locator('path')
  const caseFile = page.locator('main#main-content > article')
  const heroStage = caseFile.locator(':scope > [data-case-hero-stage]')
  const heroCopy = heroStage.locator(':scope > header')
  const chapters = caseFile.locator(':scope > section[role="region"]')

  await expect(caseFile).toHaveCount(1)
  await expect(heroStage).toHaveCount(1)
  await expect(heroCopy).toHaveCount(1)
  await expect(chapters).toHaveCount(3)
  await expect(signature).toHaveCount(1)
  await expect(diagram).toHaveCount(1)
  await expect(diagramSvg).toHaveCount(1)
  await expect(internalPaths).toHaveCount(3)
  await expectOpenSurface(heroStage, 'none', 'overlapping detail hero')
  await expectOpenSurface(signature, 'none', 'project signature')
  await expectOpenSurface(diagram, 'none', 'signature diagram')

  const heroComposition = await heroStage.evaluate((hero) => {
    const copy = hero.querySelector<HTMLElement>(':scope > header')
    const signature = hero.querySelector<HTMLElement>(':scope > [data-signature-motif]')

    if (!copy || !signature) {
      throw new Error('缺少详情 hero copy 或 signature。')
    }

    const copyRect = copy.getBoundingClientRect()
    const signatureRect = signature.getBoundingClientRect()

    return {
      overlapArea:
        Math.max(
          0,
          Math.min(copyRect.right, signatureRect.right) -
            Math.max(copyRect.left, signatureRect.left),
        ) *
        Math.max(
          0,
          Math.min(copyRect.bottom, signatureRect.bottom) -
            Math.max(copyRect.top, signatureRect.top),
        ),
    }
  })
  const chapterDividers = await chapters.evaluateAll((sections) =>
    sections.map((section) => {
      const sectionRect = section.getBoundingClientRect()
      const style = getComputedStyle(section)
      const marker = getComputedStyle(section, '::before')

      return {
        borderBottomWidth: style.borderBottomWidth,
        borderLeftWidth: style.borderLeftWidth,
        borderRightWidth: style.borderRightWidth,
        borderTopWidth: style.borderTopWidth,
        markerWidth: Number.parseFloat(marker.width),
        sectionWidth: sectionRect.width,
      }
    }),
  )

  expect(
    heroComposition.overlapArea,
    'detail hero copy and signature intentionally overlap',
  ).toBeGreaterThan(0)
  expect(
    chapterDividers.every(
      (divider) =>
        divider.borderBottomWidth === '0px' &&
        divider.borderLeftWidth === '0px' &&
        divider.borderRightWidth === '0px' &&
        divider.borderTopWidth === '0px' &&
        divider.markerWidth > 0 &&
        divider.markerWidth < divider.sectionWidth * 0.35,
    ),
    'detail chapters use short markers without full-width hard dividers',
  ).toBe(true)

  const pathStrokes = await internalPaths.evaluateAll((paths) =>
    paths.map((path) => {
      const style = getComputedStyle(path)

      return {
        stroke: style.stroke,
        strokeWidth: Number.parseFloat(style.strokeWidth),
      }
    }),
  )

  expect(pathStrokes, 'signature internal SVG paths/axes remain rendered').toHaveLength(3)
  expect(
    pathStrokes.every(
      ({ stroke, strokeWidth }) => stroke !== 'none' && strokeWidth > 0,
    ),
    'signature internal SVG paths/axes retain a visible stroke',
  ).toBe(true)
}

async function settleAtViewportTop(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
    window.scrollTo(0, 0)
  })

  const layout = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    scrollY: window.scrollY,
  }))

  expect(layout.scrollY).toBe(0)
  expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.documentClientWidth)
  expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.documentClientWidth)
}

async function readProductOverlayInventory(page: Page) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll('dialog, [role="dialog"], [role="alertdialog"], [popover]'),
    )
      .filter((element) => !element.closest('nextjs-portal'))
      .map((element) => ({
        ariaLabel: element.getAttribute('aria-label'),
        id: element.id,
        popover: element.getAttribute('popover'),
        role: element.getAttribute('role'),
        tagName: element.tagName.toLowerCase(),
      })),
  )
}

async function hideNextDevelopmentPortal(page: Page) {
  const productOverlaysBefore = await readProductOverlayInventory(page)

  await page.addStyleTag({
    content: 'nextjs-portal { display: none !important; }',
  })

  const productOverlaysAfter = await readProductOverlayInventory(page)
  const visibleNextPortals = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll('nextjs-portal')).filter(
        (portal) => window.getComputedStyle(portal).display !== 'none',
      ).length,
  )

  expect(productOverlaysAfter).toEqual(productOverlaysBefore)
  expect(visibleNextPortals).toBe(0)
}

expect(visualReferences.map((reference) => reference.name)).toEqual([
  'home-1440.png',
  'arc-1440.png',
  'rialo-1440.png',
  'signal-ledger-1440.png',
  'home-390.png',
  'arc-390.png',
  'rialo-390.png',
])

for (const reference of visualReferences) {
  test(`${reference.name} keeps the accepted static composition`, async ({ page }) => {
    await page.setViewportSize(reference.viewport)
    const runtimeFailures = collectRuntimeFailures(page)
    const response = await page.goto(reference.path)

    expect(response, `${reference.path} navigation response`).not.toBeNull()
    expect(response?.ok(), `${reference.path} navigation response`).toBe(true)

    await expectStaticRendering(page, reference)
    await settleAtViewportTop(page)
    await expectBorderlessComposition(page, reference)
    await hideNextDevelopmentPortal(page)
    expect(runtimeFailures).toEqual([])

    await expect(page).toHaveScreenshot(reference.name, {
      animations: 'disabled',
      caret: 'hide',
    })

    expect(runtimeFailures).toEqual([])
  })
}
