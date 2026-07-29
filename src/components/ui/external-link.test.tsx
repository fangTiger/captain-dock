import { createElement } from 'react'
import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'

import { ExternalLink } from './external-link'

type RuntimeExternalLinkProps = ComponentProps<typeof ExternalLink> & {
  href: string
  rel?: string
  target?: string
}

describe('ExternalLink', () => {
  it('opens HTTPS external sites in a new tab with an explicit accessible warning', () => {
    render(<ExternalLink href="https://arc-signal-ledger.vercel.app/">Open SIGNAL/LEDGER</ExternalLink>)

    const link = screen.getByRole('link', {
      name: /Open SIGNAL\/LEDGER.*opens an external site/i,
    })

    expect(link).toHaveAttribute('href', 'https://arc-signal-ledger.vercel.app/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    expect(link).toHaveAttribute('data-control-role', 'secondary')
  })

  it('shares primary and secondary visual roles without accepting stage controls', () => {
    render(
      <ExternalLink controlRole="primary" href="https://arc-signal-ledger.vercel.app/">
        Launch live site
      </ExternalLink>,
    )

    expect(screen.getByRole('link', { name: /Launch live site.*opens an external site/i })).toHaveAttribute(
      'data-control-role',
      'primary',
    )

    expect(() =>
      render(
        createElement(ExternalLink, {
          children: 'Invalid external control',
          controlRole: 'stage',
          href: 'https://arc-signal-ledger.vercel.app/',
        } as unknown as RuntimeExternalLinkProps),
      ),
    ).toThrow(/control role/)
  })

  it('rejects non-HTTPS href values at runtime', () => {
    expect(() =>
      render(
        createElement(ExternalLink, {
          children: 'Unsafe link',
          href: 'http://arc-signal-ledger.vercel.app/',
        } as unknown as RuntimeExternalLinkProps),
      ),
    ).toThrow(/HTTPS/)

    expect(() =>
      render(
        createElement(ExternalLink, {
          children: 'Script link',
          href: 'javascript:alert(1)',
        } as unknown as RuntimeExternalLinkProps),
      ),
    ).toThrow(/HTTPS/)
  })

  it('keeps forced target and rel values even when callers pass unsafe overrides', () => {
    render(
      createElement(ExternalLink, {
        children: 'Override test',
        href: 'https://arc-signal-ledger.vercel.app/',
        rel: 'opener',
        target: '_self',
      } as RuntimeExternalLinkProps),
    )

    const link = screen.getByRole('link', {
      name: /Override test.*opens an external site/i,
    })

    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
