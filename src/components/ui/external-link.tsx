import type { AnchorHTMLAttributes, ReactNode } from 'react'

import type { ControlRole } from './control-link'

type ExternalControlRole = Extract<ControlRole, 'primary' | 'secondary'>

type ExternalLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'rel' | 'target'> & {
  href: `https://${string}`
  children: ReactNode
  controlRole?: ExternalControlRole
}

const externalControlRoles = new Set<ExternalControlRole>(['primary', 'secondary'])

export function ExternalLink({ href, children, className, controlRole = 'secondary', ...props }: ExternalLinkProps) {
  if (!href.startsWith('https://')) {
    throw new Error('ExternalLink only accepts HTTPS external links.')
  }

  if (!externalControlRoles.has(controlRole)) {
    throw new Error(`ExternalLink does not support the ${String(controlRole)} control role.`)
  }

  const classes = ['control-link', 'external-link', className].filter(Boolean).join(' ')

  return (
    <a
      {...props}
      className={classes}
      data-control-role={controlRole}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span>{children}</span>
      <span aria-hidden="true" className="external-link__mark">
        ↗
      </span>
      <span className="visually-hidden">(opens an external site)</span>
    </a>
  )
}
