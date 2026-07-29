'use client'

import { usePathname } from 'next/navigation'

import { ControlLink } from '../ui/control-link'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/arc', label: 'Arc' },
  { href: '/rialo', label: 'Rialo' },
  { href: '/about', label: 'About' },
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
      </div>
    </header>
  )
}
