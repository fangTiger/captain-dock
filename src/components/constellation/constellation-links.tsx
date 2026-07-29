import type { Ecosystem, Project } from '../../content/types'

type ConstellationLinksProps = Readonly<{
  ecosystems: readonly Ecosystem[]
  projects: readonly Project[]
}>

export function ConstellationSemanticLinks({
  ecosystems,
  projects,
}: ConstellationLinksProps) {
  return (
    <nav aria-label="Constellation project and ecosystem links">
      <p>Project case files</p>
      {projects.map((project) => (
        <a href={`/${project.ecosystem}/${project.slug}`} key={project.slug}>
          {project.name}
        </a>
      ))}
      <p>Ecosystems</p>
      {ecosystems.map((ecosystem) => (
        <a href={`/${ecosystem.slug}`} key={ecosystem.slug}>
          {ecosystem.name}
        </a>
      ))}
    </nav>
  )
}

export function ConstellationNoScriptLinks(props: ConstellationLinksProps) {
  return (
    <noscript>
      <ConstellationSemanticLinks {...props} />
    </noscript>
  )
}
