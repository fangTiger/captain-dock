import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

export type ControlRole = 'quiet' | 'primary' | 'secondary' | 'stage'

type InternalHref = '/' | `/${string}` | `#${string}`

type ControlLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  children: ReactNode
  controlRole: ControlRole
  href: InternalHref
}

const controlRoles = new Set<ControlRole>(['quiet', 'primary', 'secondary', 'stage'])

function isInternalHref(href: string): href is InternalHref {
  return href === '/' || (href.startsWith('/') && !href.startsWith('//')) || href.startsWith('#')
}

export function ControlLink({ children, className, controlRole, href, ...props }: ControlLinkProps) {
  if (!controlRoles.has(controlRole)) {
    throw new Error(`Unknown control role: ${String(controlRole)}`)
  }

  if (!isInternalHref(href)) {
    throw new Error('ControlLink only accepts internal routes. Use ExternalLink for external sites.')
  }

  const classes = ['control-link', className].filter(Boolean).join(' ')

  return (
    <Link {...props} className={classes} data-control-role={controlRole} href={href}>
      {children}
    </Link>
  )
}
