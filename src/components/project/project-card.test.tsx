import { render, screen, within } from '@testing-library/react'

import { projects } from '../../content/catalog'

import { ProjectCard } from './project-card'

describe('ProjectCard', () => {
  it('renders catalog content, readable statuses, and the exact internal detail route', () => {
    const project = projects.find((item) => item.slug === 'signal-ledger')

    if (!project) {
      throw new Error('测试目录中缺少 SIGNAL/LEDGER 项目。')
    }

    const { container } = render(<ProjectCard project={project} />)

    expect(screen.getByRole('heading', { name: project.name })).toBeInTheDocument()
    expect(screen.getByText('Arc')).toBeInTheDocument()
    expect(screen.getByText(project.tagline)).toBeInTheDocument()
    expect(screen.getByText(project.summary)).toBeInTheDocument()

    for (const status of project.status) {
      expect(screen.getByText(status, { selector: '[data-status-label]' })).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: `Open ${project.name} case file` })).toHaveAttribute(
      'href',
      '/arc/signal-ledger',
    )

    const liveLink = screen.getByRole('link', {
      name: /Visit SIGNAL\/LEDGER live site.*opens an external site/i,
    })

    expect(liveLink).toHaveAttribute('href', project.liveUrl)
    expect(liveLink).toHaveAttribute('target', '_blank')
    expect(liveLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(liveLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'))

    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('data-scene-target', 'project:signal-ledger')
    expect(card).not.toHaveAttribute('tabindex')
    expect(within(card).getAllByRole('link')).toHaveLength(2)
    for (const link of within(card).getAllByRole('link')) {
      expect(link).not.toHaveAttribute('data-scene-target')
      expect(link.closest('[data-scene-target]')).toBe(card)
    }
    expect(container.querySelector('a a')).toBeNull()
  })
})
