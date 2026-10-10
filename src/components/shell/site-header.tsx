'use client'

import { usePathname } from 'next/navigation'

import { ControlLink } from '../ui/control-link'
import { ExternalLink } from '../ui/external-link'

const demosHref = 'https://demos.captain-dock.xyz' as const

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/arc', label: 'Arc' },
  { href: '/rialo', label: 'Rialo' },
] as const

function isCurrentRoute(pathname: string, href: (typeof navItems)[number]['href']) {
  if (href === '/') {
    return pathname === '/'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SiteHeader() {
  const pathname = usePathname() ?? '/'

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <ControlLink
          aria-label="Captain Dock home"
          className="site-brand"
          controlRole="quiet"
          href="/"
        >
          <span
            className="site-brand__name"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            CAPTAIN DOCK
          </span>
        </ControlLink>
        <div className="site-header__actions">
          <nav className="site-nav" aria-label="Primary navigation">
            {navItems.map((item) => {
              const isCurrent = isCurrentRoute(pathname, item.href)

              return (
                <ControlLink
                  aria-current={isCurrent ? 'page' : undefined}
                  className="site-nav__link"
                  controlRole="quiet"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </ControlLink>
              )
            })}
          </nav>
          <div className="site-header__utility">
            <ExternalLink className="site-header__demos-link" href={demosHref}>
              Demos
            </ExternalLink>
          </div>
        </div>
      </div>
    </header>
  )
}
