import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'

import { SkipLink } from '../components/shell/skip-link.client'
import { SiteFooter } from '../components/shell/site-footer'
import { SiteFooterSlot } from '../components/shell/site-footer-slot.client'
import { SiteHeader } from '../components/shell/site-header'
import { buildRootMetadata } from '../lib/metadata'
import '../styles/tokens.css'
import '../styles/motion.css'
import './globals.css'

export const metadata: Metadata = buildRootMetadata()

export const viewport: Viewport = {
  colorScheme: 'dark',
  initialScale: 1,
  themeColor: '#050608',
  width: 'device-width',
}

const bodyFont = localFont({
  display: 'optional',
  preload: false,
  src: '../assets/fonts/Geist-Variable.woff2',
  variable: '--font-body-local',
  weight: '100 900',
})

const monoFont = localFont({
  display: 'optional',
  preload: false,
  src: '../assets/fonts/GeistMono-Variable.woff2',
  variable: '--font-mono-local',
  weight: '100 900',
})

const displayFont = localFont({
  display: 'optional',
  preload: false,
  src: [
    {
      path: '../assets/fonts/ChakraPetch-Regular.woff2',
      weight: '400',
    },
    {
      path: '../assets/fonts/ChakraPetch-Medium.woff2',
      weight: '500',
    },
    {
      path: '../assets/fonts/ChakraPetch-SemiBold.woff2',
      weight: '600',
    },
    {
      path: '../assets/fonts/ChakraPetch-Bold.woff2',
      weight: '700',
    },
  ],
  variable: '--font-display-local',
})

type RootLayoutProps = Readonly<{
  children: ReactNode
}>

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        id="top"
        className={`${bodyFont.variable} ${monoFont.variable} ${displayFont.variable}`}
      >
        <SkipLink />
        <SiteHeader />
        <div className="site-content">{children}</div>
        <SiteFooterSlot>
          <SiteFooter />
        </SiteFooterSlot>
      </body>
    </html>
  )
}
