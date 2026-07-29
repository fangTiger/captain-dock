import { createElement } from 'react'
import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'

import { ControlLink } from './control-link'

describe('ControlLink', () => {
  it.each(['quiet', 'primary', 'secondary', 'stage'] as const)(
    'renders the %s visual role as a real internal link',
    (controlRole) => {
      render(
        <ControlLink className="source-class" controlRole={controlRole} href="/arc">
          Open Arc
        </ControlLink>,
      )

      const link = screen.getByRole('link', { name: 'Open Arc' })

      expect(link).toHaveAttribute('href', '/arc')
      expect(link).toHaveAttribute('data-control-role', controlRole)
      expect(link).toHaveClass('control-link', 'source-class')
    },
  )

  it('keeps external URLs exclusive to ExternalLink', () => {
    expect(() =>
      render(
        createElement(ControlLink, {
          children: 'Unsafe external route',
          controlRole: 'secondary',
          href: 'https://example.com',
        } as unknown as ComponentProps<typeof ControlLink>),
      ),
    ).toThrow(/internal/)
  })

  it('rejects control roles outside the four-role contract at runtime', () => {
    expect(() =>
      render(
        createElement(ControlLink, {
          children: 'Unknown control',
          controlRole: 'tertiary',
          href: '/about',
        } as unknown as ComponentProps<typeof ControlLink>),
      ),
    ).toThrow(/control role/)
  })
})
