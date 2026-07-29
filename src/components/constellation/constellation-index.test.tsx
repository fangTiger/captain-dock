import { cleanup, render } from '@testing-library/react'

import { projects } from '../../content/catalog'
import { ConstellationIndex } from './constellation-index'

afterEach(() => {
  cleanup()
})

describe('ConstellationIndex', () => {
  it('renders one linked entry per project with a scene target', () => {
    const { container } = render(<ConstellationIndex projects={projects} />)
    const nav = container.querySelector('nav[aria-label="Project index"]')
    const entries = nav?.querySelectorAll('a') ?? []

    expect(nav).not.toBeNull()
    expect(entries).toHaveLength(4)

    for (const project of projects) {
      const entry = nav?.querySelector<HTMLAnchorElement>(
        `a[href="/${project.ecosystem}/${project.slug}"]`,
      )

      expect(entry).not.toBeNull()
      expect(entry).toHaveAttribute('data-scene-target', `project:${project.slug}`)
      expect(entry).toHaveAttribute('data-ecosystem', project.ecosystem)
    }
  })

  it('shows the statement, not the tagline', () => {
    const { container } = render(<ConstellationIndex projects={projects} />)

    for (const project of projects) {
      expect(container).toHaveTextContent(project.statement)
      expect(container).not.toHaveTextContent(project.tagline)
    }
  })

  it('labels each entry with its ecosystem and leading status', () => {
    const { container } = render(<ConstellationIndex projects={projects} />)

    for (const project of projects) {
      const entry = container.querySelector(
        `a[href="/${project.ecosystem}/${project.slug}"]`,
      )

      expect(entry).toHaveTextContent(project.ecosystem)
      expect(entry).toHaveTextContent(project.status[0])
    }
  })
})
