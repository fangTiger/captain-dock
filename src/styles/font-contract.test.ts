import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

type FontAsset = {
  localPath: string
  weight?: string
  upstreamPath: string
  sha256: string
}

const geistSourceRepoUrl = 'https://github.com/vercel/geist-font'
const geistSourceTag = '1.8.0'
const geistSourceCommit = '91158e012bdc4abd59fa066d0eae9fc11c2c9f24'
const geistLicenseSha256 = '1781d2806a07d91c4edf4740b88449fab7d0eadad53f7c351b94cd4d4eb8c00f'
const chakraPetchSourceRepoUrl = 'https://github.com/google/fonts'
const chakraPetchSourcePath = 'ofl/chakrapetch'
const chakraPetchHelperUrl = 'https://gwfh.mranftl.com'
const chakraPetchLicenseSha256 =
  '13831d02389d917d22fcfa6c79f98f8acbf61d230add0e73a4d4dc5f3bfb9e56'

const geistFontAssets: FontAsset[] = [
  {
    localPath: 'src/assets/fonts/GeistPixel-Square.woff2',
    upstreamPath: 'fonts/GeistPixel/webfonts/GeistPixel-Square.woff2',
    sha256: 'd06b084005982345edbb503d5df8dccdbe74cb70bd23b8f2d1fc09f35174c8e7',
  },
  {
    localPath: 'src/assets/fonts/Geist-Variable.woff2',
    upstreamPath: 'fonts/Geist/webfonts/Geist[wght].woff2',
    sha256: 'c2a45610c45081b940562b38437b3128ee287c564ae759a758dbad8a90a32349',
  },
  {
    localPath: 'src/assets/fonts/GeistMono-Variable.woff2',
    upstreamPath: 'fonts/GeistMono/webfonts/GeistMono[wght].woff2',
    sha256: '4e772ac3c650b07abd180140088b0a7c84ec016cc6385cb7dfc21beb9e258815',
  },
]

const chakraPetchFontAssets: FontAsset[] = [
  {
    localPath: 'src/assets/fonts/ChakraPetch-Regular.woff2',
    upstreamPath: 'ofl/chakrapetch/ChakraPetch-Regular.ttf',
    sha256: '7d75be85dd1627e27ec151e9a3701e661bc4f8c2a93611bdd92f3a05d6bbd942',
    weight: '400',
  },
  {
    localPath: 'src/assets/fonts/ChakraPetch-Medium.woff2',
    upstreamPath: 'ofl/chakrapetch/ChakraPetch-Medium.ttf',
    sha256: '36ad966cb653de70ba37355c41003b02de8940b2df6cbcd46480a6ad8cadd65d',
    weight: '500',
  },
  {
    localPath: 'src/assets/fonts/ChakraPetch-SemiBold.woff2',
    upstreamPath: 'ofl/chakrapetch/ChakraPetch-SemiBold.ttf',
    sha256: 'a5888696e9eb1b4bbbecc8eb3922b8369f49d4bddb72263e033cbd17f399be76',
    weight: '600',
  },
  {
    localPath: 'src/assets/fonts/ChakraPetch-Bold.woff2',
    upstreamPath: 'ofl/chakrapetch/ChakraPetch-Bold.ttf',
    sha256: 'ce5095dc1cb200aaa939e38067a0677018d10e9f26ec38cdcf1557ac524fc775',
    weight: '700',
  },
]

const fontAssets = [...geistFontAssets, ...chakraPetchFontAssets]

function readText(relativePath: string) {
  const absolutePath = join(process.cwd(), relativePath)
  expect(existsSync(absolutePath), `${relativePath} should exist`).toBe(true)

  if (!existsSync(absolutePath)) {
    return ''
  }

  return readFileSync(absolutePath, 'utf8')
}

function readBytes(relativePath: string) {
  const absolutePath = join(process.cwd(), relativePath)
  expect(existsSync(absolutePath), `${relativePath} should exist`).toBe(true)

  if (!existsSync(absolutePath)) {
    return Buffer.from([])
  }

  return readFileSync(absolutePath)
}

function sha256(bytes: Buffer | string) {
  return createHash('sha256').update(bytes).digest('hex')
}

function localFontConfigFor(layoutSource: string, variableName: string) {
  const configMatch = layoutSource.match(
    new RegExp(`const\\s+${variableName}\\s*=\\s*localFont\\(\\{([\\s\\S]*?)\\}\\)`),
  )

  expect(configMatch, `${variableName} should be configured with next/font/local`).not.toBeNull()

  return configMatch?.[1] ?? ''
}

describe('local font assets', () => {
  it('vendors the selected Geist WOFF2 files byte-for-byte', () => {
    for (const asset of fontAssets) {
      const bytes = readBytes(asset.localPath)

      expect(bytes.subarray(0, 4).toString('ascii')).toBe('wOF2')
      expect(sha256(bytes)).toBe(asset.sha256)
    }
  })

  it('records the pinned Geist upstream provenance and OFL license', () => {
    const readme = readText('src/assets/fonts/README.md')
    const license = readBytes('src/assets/fonts/OFL.txt')

    expect(readme).toContain(geistSourceRepoUrl)
    expect(readme).toContain(`tag ${geistSourceTag}`)
    expect(readme).toContain(geistSourceCommit)
    expect(readme).toContain('获取日期：2026-07-23')
    expect(readme).toContain('OFL-1.1')
    expect(sha256(license)).toBe(geistLicenseSha256)

    for (const asset of geistFontAssets) {
      expect(readme).toContain(asset.upstreamPath)
      expect(readme).toContain(asset.localPath)
      expect(readme).toContain(asset.sha256)
    }

    expect(readme).toContain('OFL.txt')
    expect(readme).toContain(geistLicenseSha256)
  })

  it('records the Chakra Petch Google Fonts provenance, latin subset source, and OFL license', () => {
    const readme = readText('src/assets/fonts/README.md')
    const license = readBytes('src/assets/fonts/OFL-ChakraPetch.txt')

    expect(readme).toContain(chakraPetchSourceRepoUrl)
    expect(readme).toContain(chakraPetchSourcePath)
    expect(readme).toContain(chakraPetchHelperUrl)
    expect(readme).toContain('Google Fonts')
    expect(readme).toContain('google-webfonts-helper')
    expect(readme).toContain('获取日期：2026-07-29')
    expect(readme).toContain('OFL-1.1')
    expect(sha256(license)).toBe(chakraPetchLicenseSha256)

    for (const asset of chakraPetchFontAssets) {
      expect(readme).toContain(asset.upstreamPath)
      expect(readme).toContain(asset.localPath)
      expect(readme).toContain(asset.sha256)
    }

    expect(readme).toContain('OFL-ChakraPetch.txt')
    expect(readme).toContain(chakraPetchLicenseSha256)
  })
})

describe('font integration contract', () => {
  it('loads only local fonts through next/font/local and attaches all font variables to body', () => {
    const layoutSource = readText('src/app/layout.tsx')
    const bodyFontConfig = localFontConfigFor(layoutSource, 'bodyFont')
    const displayFontConfig = localFontConfigFor(layoutSource, 'displayFont')
    const monoFontConfig = localFontConfigFor(layoutSource, 'monoFont')

    expect(layoutSource).toContain("from 'next/font/local'")
    expect(layoutSource).not.toContain("src: '../assets/fonts/GeistPixel-Square.woff2'")
    for (const asset of chakraPetchFontAssets) {
      const layoutPath = asset.localPath.replace('src/', '../')

      expect(displayFontConfig).toContain(`path: '${layoutPath}'`)
      expect(displayFontConfig).toMatch(
        new RegExp(
          `path:\\s*'${layoutPath.replaceAll('.', '\\.')}'[\\s\\S]*?weight:\\s*'${asset.weight}'`,
        ),
      )
    }
    expect(displayFontConfig).toMatch(/variable:\s*'--font-display-local'/)
    expect(displayFontConfig).toMatch(/display:\s*'optional'/)
    expect(displayFontConfig).toMatch(/preload:\s*false/)
    expect(bodyFontConfig).toContain("src: '../assets/fonts/Geist-Variable.woff2'")
    expect(bodyFontConfig).toMatch(/variable:\s*'--font-body-local'/)
    expect(bodyFontConfig).toMatch(/weight:\s*'100 900'/)
    expect(bodyFontConfig).toMatch(/display:\s*'optional'/)
    expect(bodyFontConfig).toMatch(/preload:\s*false/)
    expect(monoFontConfig).toContain("src: '../assets/fonts/GeistMono-Variable.woff2'")
    expect(monoFontConfig).toMatch(/variable:\s*'--font-mono-local'/)
    expect(monoFontConfig).toMatch(/weight:\s*'100 900'/)
    expect(monoFontConfig).toMatch(/display:\s*'optional'/)
    expect(monoFontConfig).toMatch(/preload:\s*false/)
    expect(layoutSource).toMatch(
      /<body\s+id="top"\s+className=\{`\${bodyFont\.variable} \${monoFont\.variable} \${displayFont\.variable}`}/,
    )
    expect(layoutSource).not.toMatch(/https?:\/\/|fonts\.(?:googleapis|gstatic)\.com|@import/)
  })

  it('uses local Chakra Petch for display while keeping local Geist body and Geist Mono data stacks', () => {
    const tokensSource = readText('src/styles/tokens.css')

    expect(tokensSource).toContain('--font-display-local')
    expect(tokensSource).toContain('--font-body-local')
    expect(tokensSource).toContain('--font-mono-local')
    expect(tokensSource).toMatch(/--font-display:\s*var\(--font-display-local\),/)
    expect(tokensSource).toMatch(/--font-body:\s*var\(--font-body-local\),/)
    expect(tokensSource).toMatch(/--font-mono:\s*var\(--font-mono-local\),/)
    expect(tokensSource).not.toContain('GeistPixel')
    expect(tokensSource).not.toMatch(/https?:\/\/|fonts\.(?:googleapis|gstatic)\.com|@import/)
  })

  it('binds headings to the display stack and data labels to the mono stack', () => {
    const globalsSource = readText('src/app/globals.css')

    expect(globalsSource).toMatch(/h1,\s*\n\s*h2,\s*\n\s*h3\s*\{[\s\S]*?font-family:\s*var\(--font-display\)/)
    expect(globalsSource).toMatch(/h1,\s*\n\s*h2,\s*\n\s*h3\s*\{[\s\S]*?font-weight:\s*400/)
    expect(globalsSource).toMatch(
      /\.site-brand__index,[\s\S]*?\.status-label,[\s\S]*?\[data-control-role\]\s*\{[\s\S]*?font-family:\s*var\(--font-mono\)/,
    )
  })
})
