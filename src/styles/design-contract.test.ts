import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type CssDeclaration = {
  filePath: string
  property: string
  value: string
}

type CssBlock = {
  body: string
  header: string
}

function collectCssFiles(relativeDir: string): string[] {
  const root = join(process.cwd(), relativeDir)
  const cssFiles: string[] = []

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(relativeDir, entry.name)

    if (entry.isDirectory()) {
      cssFiles.push(...collectCssFiles(entryPath))
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      cssFiles.push(entryPath)
    }
  }

  return cssFiles.sort()
}

function collectDeclarations(property: 'font-size' | 'letter-spacing'): CssDeclaration[] {
  return ['src/app', 'src/styles', 'src/components']
    .flatMap((relativeDir) => collectCssFiles(relativeDir))
    .flatMap((filePath) => {
      const source = readFileSync(join(process.cwd(), filePath), 'utf8')
      const declarationPattern = new RegExp(`${property}\\s*:\\s*([^;]+);`, 'gi')

      return Array.from(source.matchAll(declarationPattern), (match) => ({
        filePath,
        property,
        value: match[1].trim(),
      }))
    })
}

function readSource(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

function readCssBlocks(rawSource: string): CssBlock[] {
  const source = rawSource.replace(/\/\*[\s\S]*?\*\//g, '')
  const blocks: CssBlock[] = []
  let cursor = 0

  while (cursor < source.length) {
    while (cursor < source.length && /[\s;]/.test(source[cursor])) {
      cursor += 1
    }

    const openingBrace = source.indexOf('{', cursor)
    const statementEnd = source.indexOf(';', cursor)

    if (openingBrace < 0) {
      break
    }
    if (statementEnd >= 0 && statementEnd < openingBrace) {
      cursor = statementEnd + 1
      continue
    }

    const header = source.slice(cursor, openingBrace).trim()
    let depth = 1
    let closingBrace = openingBrace + 1

    while (closingBrace < source.length && depth > 0) {
      if (source[closingBrace] === '{') {
        depth += 1
      } else if (source[closingBrace] === '}') {
        depth -= 1
      }
      closingBrace += 1
    }

    expect(depth, `${header} should have balanced braces`).toBe(0)
    blocks.push({
      body: source.slice(openingBrace + 1, closingBrace - 1),
      header,
    })
    cursor = closingBrace
  }

  return blocks
}

function expectBalancedBraces(rawSource: string, label: string) {
  const source = rawSource.replace(/\/\*[\s\S]*?\*\//g, '')
  let depth = 0

  for (const character of source) {
    if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1
      expect(depth, `${label} 不得出现多余的右花括号。`).toBeGreaterThanOrEqual(0)
    }
  }

  expect(depth, `${label} 的 media/keyframes 花括号必须平衡。`).toBe(0)
}

function collectAtRuleBlocks(source: string, atRule: string): CssBlock[] {
  return readCssBlocks(source).flatMap((block) => {
    const nested = block.header.startsWith('@keyframes')
      ? []
      : collectAtRuleBlocks(block.body, atRule)

    return block.header === atRule ? [block, ...nested] : nested
  })
}

function readAtRuleBodies(source: string, atRule: string) {
  return collectAtRuleBlocks(source, atRule).map((block) => block.body)
}

function collectQualifiedRules(source: string): CssBlock[] {
  return readCssBlocks(source).flatMap((block) => {
    if (block.header.startsWith('@keyframes')) {
      return []
    }
    if (block.header.startsWith('@media')) {
      const isReduced = block.header === '@media (prefers-reduced-motion: reduce)'

      if (isReduced) {
        return []
      }

      return collectQualifiedRules(block.body)
    }
    if (block.header.startsWith('@')) {
      return collectQualifiedRules(block.body)
    }

    return [block]
  })
}

function readDeclarations(body: string) {
  return Array.from(body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g), (match) => ({
    property: match[1].trim(),
    value: match[2].trim(),
  }))
}

function splitSelectors(selectorList: string) {
  return selectorList.split(',').map((selector) => selector.replace(/\s+/g, ' ').trim())
}

function reducedSelectorCoversOwner(reducedSelector: string, ownerSelector: string) {
  if (reducedSelector === ownerSelector) {
    return true
  }
  if (ownerSelector.endsWith(` ${reducedSelector}`)) {
    return true
  }
  const wildcardIndex = reducedSelector.lastIndexOf('*')

  if (wildcardIndex < 0) {
    return false
  }

  const prefix = reducedSelector.slice(0, wildcardIndex)
  const suffix = reducedSelector.slice(wildcardIndex + 1)

  return ownerSelector.startsWith(prefix) && ownerSelector.endsWith(suffix)
}

function hasViewportRelativeUnit(value: string) {
  return /(?:^|[^a-z0-9_-])[+-]?(?:\d+|\d*\.\d+)(?:vw|cqw|cqi)\b/i.test(value)
}

describe('reduced-motion owner selector matcher', () => {
  it('matches exact, terminal descendant, and wildcard owners without accepting substrings', () => {
    const stableOwner =
      ":global([data-universe-ready='true'][data-universe-quality='high']) .field[data-cinematic-entry='settled'] .corridorPlane:first-child"

    expect(reducedSelectorCoversOwner('.radarRoute', '.radarRoute')).toBe(true)
    expect(reducedSelectorCoversOwner('.corridorPlane:first-child', stableOwner)).toBe(true)
    expect(reducedSelectorCoversOwner('.field *', '.field .radarRoute')).toBe(true)
    expect(
      reducedSelectorCoversOwner(
        '.corridorPlane:first-child',
        '.field .active-corridorPlane:first-child',
      ),
    ).toBe(false)
    expect(
      reducedSelectorCoversOwner(
        '.corridorPlane:first-child',
        '.field .corridorPlane:first-childish',
      ),
    ).toBe(false)
    expect(
      reducedSelectorCoversOwner(
        '.corridorPlane:first-child',
        '.field .corridorPlane:first-child .radarNode',
      ),
    ).toBe(false)
  })
})

describe('viewport-relative font-size detector', () => {
  it('identifies viewport-relative units in plain and calculated font-size values', () => {
    expect(hasViewportRelativeUnit('13vw')).toBe(true)
    expect(hasViewportRelativeUnit('0.2cqw')).toBe(true)
    expect(hasViewportRelativeUnit('calc(1rem + 1cqi)')).toBe(true)
  })

  it('does not report non-viewport-relative font-size values', () => {
    expect(hasViewportRelativeUnit('1rem')).toBe(false)
    expect(hasViewportRelativeUnit('var(--preview-size)')).toBe(false)
  })
})

describe('design CSS contract', () => {
  it('keeps the root cinematic canvas free of global horizontal clipping', () => {
    const globals = readSource('src/app/globals.css')
    const bodyRules = Array.from(globals.matchAll(/body\s*\{([^}]+)\}/g), (match) => match[1])

    expect(bodyRules.length).toBeGreaterThan(0)
    expect(bodyRules.join('\n')).not.toMatch(/overflow-x:\s*(?:clip|hidden);/)
  })

  it('does not use viewport-relative units for font-size declarations', () => {
    const viewportFontSizes = collectDeclarations('font-size').filter((declaration) =>
      hasViewportRelativeUnit(declaration.value),
    )

    expect(viewportFontSizes).toEqual([])
  })

  it('uses tight display tracking and keeps positive mono tracking between .08em and .13em', () => {
    const nonZeroLetterSpacing = collectDeclarations('letter-spacing').filter(
      (declaration) => declaration.value !== '0',
    )
    const numericTracking = nonZeroLetterSpacing.map((declaration) => ({
      ...declaration,
      numericValue: Number.parseFloat(declaration.value),
    }))
    const displayTracking = numericTracking.filter((declaration) => declaration.numericValue < 0)
    const monoTracking = numericTracking.filter((declaration) => declaration.numericValue > 0)

    expect(nonZeroLetterSpacing.every((declaration) => /^-?(?:0?\.)\d+em$/.test(declaration.value))).toBe(true)
    expect(displayTracking.length).toBeGreaterThan(0)
    expect(
      displayTracking.every(
        (declaration) => declaration.numericValue >= -0.05 && declaration.numericValue <= -0.01,
      ),
    ).toBe(true)
    expect(monoTracking.length).toBeGreaterThan(0)
    expect(
      monoTracking.every(
        (declaration) => declaration.numericValue >= 0.08 && declaration.numericValue <= 0.13,
      ),
    ).toBe(true)
  })

  it('retires the fixed A-reference stage box while preserving distinct Arc and Rialo color roles', () => {
    const tokens = readSource('src/styles/tokens.css')
    const requiredColorTokens = [
      '--color-arc',
      '--color-signal',
      '--color-hadron',
      '--color-predict',
      '--color-rialo',
      '--color-warning',
    ] as const
    const colorValues = requiredColorTokens.map((token) => {
      const value = tokens.match(new RegExp(`${token}:\\s*(#[a-f\\d]{6});`, 'i'))?.[1]

      expect(value, `${token} should be an explicit color`).toBeTruthy()

      return value
    })

    expect(tokens).not.toMatch(/--stage-aspect-ratio:\s*5\s*\/\s*3;/)
    expect(tokens).not.toMatch(/--stage-max-width:\s*1200px;/)
    expect(new Set(colorValues).size).toBe(requiredColorTokens.length)
    expect(tokens).toContain('--color-arc-signal: var(--color-signal)')
    expect(tokens).toContain('--color-rialo-radar: var(--color-rialo)')
    expect(tokens).toContain('--color-rialo-amber: var(--color-warning)')
  })

  it('adds the deep-space palette without replacing existing ecosystem roles', () => {
    const tokens = readSource('src/styles/tokens.css')

    expect(tokens).toMatch(/--color-deep-space-canvas:\s*#05060a;/i)
    expect(tokens).toMatch(/--color-deep-space-text:\s*rgba\(226,\s*236,\s*252,\s*0\.92\);/i)
    expect(tokens).toMatch(
      /--color-deep-space-arc:\s*(?:rgb\(127,\s*176,\s*255\)|#7fb0ff);/i,
    )
    expect(tokens).toMatch(/--color-deep-space-rialo:\s*#e7a94b;/i)
  })

  it('exports only the locked constellation motion feel constants', () => {
    const relativePath = 'src/lib/constellation-motion.ts'
    const absolutePath = join(process.cwd(), relativePath)
    const source = existsSync(absolutePath) ? readSource(relativePath) : ''

    expect(existsSync(absolutePath), `${relativePath} should exist`).toBe(true)
    expect(source).toMatch(/export const RESPONSIVENESS\s*=\s*0\.28\b/)
    expect(source).toMatch(/export const SENSITIVITY\s*=\s*1\.0\b/)
    expect(source).toMatch(/export const CURSOR_LERP_MULTIPLIER\s*=\s*2\.4\b/)
    expect(source).not.toMatch(/\b(?:class|function|document|window|requestAnimationFrame)\b/)
  })

  it('defines four control roles and applies the primitive across shared navigation and CTA surfaces', () => {
    const tokens = readSource('src/styles/tokens.css')
    const globals = readSource('src/app/globals.css')
    const sharedSources = [
      'src/components/shell/site-header.tsx',
      'src/components/shell/site-footer.tsx',
      'src/components/project/project-card.tsx',
      'src/components/project/project-hero.tsx',
      'src/components/project/project-navigator.tsx',
      'src/app/(content)/about/page.tsx',
      'src/app/error.tsx',
    ].map(readSource)

    for (const role of ['quiet', 'primary', 'secondary', 'stage']) {
      expect(tokens).toContain(`--control-${role}-`)
      expect(globals).toContain(`[data-control-role="${role}"]`)
    }

    expect(sharedSources.join('\n')).toContain('ControlLink')
    expect(sharedSources.join('\n')).toContain('controlRole=')
    expect(readSource('src/app/error.tsx')).toContain('data-control-role="primary"')
  })

  it('defines the cinematic entry, preview, finite morph, handoff, and ambient motion budgets', () => {
    const tokens = readSource('src/styles/tokens.css')

    expect(tokens).toMatch(/--duration-stage-enter:\s*(?:1[0-3]\d\d|1400)ms;/)
    expect(tokens).toMatch(/--duration-interaction:\s*(?:1[89]\d|2[0-5]\d|260)ms;/)
    expect(tokens).toMatch(/--duration-scene-morph:\s*(?:6[5-9]\d|[78]\d\d|900)ms;/)
    expect(tokens).toMatch(/--duration-route-handoff:\s*(?:5\d\d|6\d\d|700)ms;/)
    expect(tokens).toMatch(/--duration-ambient-orbit:\s*(?:[6-9]|10)s;/)
    expect(tokens).toMatch(/--duration-ambient-radar:\s*(?:[6-9]|10)s;/)
    expect(tokens).toMatch(/--duration-reduced-state:\s*(?:\d|[1-9]\d|1\d\d|2[0-3]\d|240)ms;/)
  })

  it('keeps open instrument feedback equivalent for hover, focus, and pressed state', () => {
    const stageCss = readSource('src/components/stage/instrument-stage.module.css')
    const rialoCss = readSource('src/components/rialo/rialo-reactive-loop.module.css')

    expect(stageCss).toMatch(/\.projectNode:hover,\s*\.projectNode:focus-visible\s*\{/)
    expect(stageCss).toMatch(
      /\.arcSelector:hover,\s*\.arcSelector:focus-visible,\s*\.arcSelector\[aria-pressed="true"\]\s*\{/,
    )
    expect(rialoCss).toMatch(
      /\.stageButton:hover,\s*\.stageButton:focus-visible,\s*\.stage\[data-active="true"\]\s+\.stageButton\s*\{/,
    )
  })

  it('uses compositor-friendly motion and provides an explicit reduced-motion terminal state', () => {
    const stageCss = readSource('src/components/stage/instrument-stage.module.css')
    const rialoCss = readSource('src/components/rialo/rialo-reactive-loop.module.css')
    const signatureCss = readSource('src/components/project/signature/project-signature.module.css')
    const allCssSources = ['src/app', 'src/styles', 'src/components']
      .flatMap((relativeDir) => collectCssFiles(relativeDir))
      .map((filePath) => ({ filePath, source: readSource(filePath) }))
    const animatedCss = [stageCss, rialoCss, signatureCss].join('\n')
    const reducedAtRule = '@media (prefers-reduced-motion: reduce)'
    const reducedRules = allCssSources.flatMap(({ filePath, source }) =>
      readAtRuleBodies(source, reducedAtRule).flatMap((body) =>
        collectQualifiedRules(body).map((rule) => ({ ...rule, filePath })),
      ),
    )
    const spatialTerminalRule = reducedRules.find((rule) =>
      splitSelectors(rule.header).includes('[data-cinematic-spatial]'),
    )
    const normalRules = allCssSources.flatMap(({ filePath, source }) =>
      collectQualifiedRules(source).map((rule) => ({ ...rule, filePath })),
    )
    const infiniteAnimationOwners = normalRules.flatMap((rule) => {
      const hasInfiniteAnimation = readDeclarations(rule.body).some(
        (declaration) =>
          (declaration.property === 'animation' && /\binfinite\b/.test(declaration.value)) ||
          (declaration.property === 'animation-iteration-count' &&
            declaration.value.split(',').some((value) => value.trim() === 'infinite')),
      )

      return hasInfiniteAnimation
        ? splitSelectors(rule.header).map((selector) => ({
            filePath: rule.filePath,
            selector,
          }))
        : []
    })
    const keyframes = allCssSources.flatMap(({ source }) =>
      readCssBlocks(source).flatMap(function collectKeyframes(block): CssBlock[] {
        if (block.header.startsWith('@keyframes ')) {
          return [block]
        }

        return readCssBlocks(block.body).flatMap(collectKeyframes)
      }),
    )

    expect(animatedCss).toContain('@keyframes stage-enter')
    expect(animatedCss).toContain('@keyframes home-monument-breathe')
    expect(animatedCss).not.toMatch(/(?:backdrop-)?filter\s*:/)
    expect(readAtRuleBodies(stageCss, reducedAtRule)).not.toHaveLength(0)
    expect(readAtRuleBodies(rialoCss, reducedAtRule)).not.toHaveLength(0)
    expect(readAtRuleBodies(signatureCss, reducedAtRule)).not.toHaveLength(0)
    for (const { filePath, source } of allCssSources) {
      expectBalancedBraces(source, filePath)
    }
    expect(spatialTerminalRule).toBeDefined()
    expect(readDeclarations(spatialTerminalRule?.body ?? '')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'animation', value: expect.stringMatching(/^none\b/) }),
        expect.objectContaining({ property: 'transform', value: expect.stringMatching(/^none\b/) }),
        { property: 'transition-property', value: 'opacity' },
        { property: 'transition-duration', value: 'var(--duration-reduced-state)' },
      ]),
    )
    expect(
      reducedRules.flatMap((rule) => readDeclarations(rule.body)).filter(
        (declaration) =>
          declaration.property === 'transition-property' &&
          /\b(?:transform|translate|rotate|left|right|top|bottom)\b/.test(declaration.value),
      ),
    ).toEqual([])
    expect(
      reducedRules.flatMap((rule) => readDeclarations(rule.body)).filter(
        (declaration) =>
          declaration.property === 'animation-iteration-count' &&
          declaration.value.split(',').some((value) => value.trim() === 'infinite'),
      ),
    ).toEqual([])
    expect(infiniteAnimationOwners.length).toBeGreaterThan(0)
    for (const owner of infiniteAnimationOwners) {
      const ownerIsDisabled = reducedRules.some(
        (rule) =>
          rule.filePath === owner.filePath &&
          splitSelectors(rule.header).some((selector) =>
            reducedSelectorCoversOwner(selector, owner.selector),
          ) &&
          readDeclarations(rule.body).some(
            (declaration) =>
              declaration.property === 'animation' && /^none\b/.test(declaration.value),
          ),
      )

      expect(
        ownerIsDisabled,
        `${owner.filePath}: ${owner.selector} must be explicitly disabled under reduced motion`,
      ).toBe(true)
    }

    expect(keyframes.length).toBeGreaterThan(0)
    for (const keyframe of keyframes) {
      const animatedProperties = readCssBlocks(keyframe.body).flatMap((frame) =>
        readDeclarations(frame.body).map((declaration) => declaration.property),
      )

      expect(animatedProperties.length, `${keyframe.header} must contain declarations`).toBeGreaterThan(0)
      expect(
        animatedProperties.filter(
          (property) => !['opacity', 'transform', 'translate'].includes(property),
        ),
        `${keyframe.header} must remain compositor-friendly`,
      ).toEqual([])
    }
  })
})
