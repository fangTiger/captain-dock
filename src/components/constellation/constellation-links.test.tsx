import { render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ecosystems, projects } from '../../content/catalog'
import {
  ConstellationNoScriptLinks,
  ConstellationSemanticLinks,
} from './constellation-links'

describe('constellation equivalent links', () => {
  it('renders four project and two ecosystem real links', () => {
    render(<ConstellationSemanticLinks ecosystems={ecosystems} projects={projects} />)

    const navigation = screen.getByRole('navigation', {
      name: 'Constellation project and ecosystem links',
    })
    const links = within(navigation).getAllByRole('link')

    expect(links).toHaveLength(6)

    for (const project of projects) {
      expect(
        within(navigation).getByRole('link', { name: project.name }),
      ).toHaveAttribute('href', `/${project.ecosystem}/${project.slug}`)
    }

    for (const ecosystem of ecosystems) {
      expect(
        within(navigation).getByRole('link', { name: ecosystem.name }),
      ).toHaveAttribute('href', `/${ecosystem.slug}`)
    }
  })

  it('server-renders the same six hrefs inside noscript', () => {
    const markup = renderToStaticMarkup(
      <ConstellationNoScriptLinks ecosystems={ecosystems} projects={projects} />,
    )

    expect(markup).toContain('<noscript>')

    for (const project of projects) {
      expect(markup).toContain(`href="/${project.ecosystem}/${project.slug}"`)
    }

    for (const ecosystem of ecosystems) {
      expect(markup).toContain(`href="/${ecosystem.slug}"`)
    }
  })
})
