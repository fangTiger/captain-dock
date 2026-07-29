import type { ProjectStatus } from '../../content/types'

const statusTone = {
  DEMO: 'demo',
  TESTNET: 'testnet',
  EXPERIMENTAL: 'experimental',
} as const satisfies Record<ProjectStatus, string>

const statusMarker = {
  DEMO: '◇',
  TESTNET: '◎',
  EXPERIMENTAL: '△',
} as const satisfies Record<ProjectStatus, string>

type StatusLabelProps = Readonly<{
  status: ProjectStatus
}>

export function StatusLabel({ status }: StatusLabelProps) {
  return (
    <span className="status-label" data-status-tone={statusTone[status]}>
      <span aria-hidden="true" className="status-label__marker">
        {statusMarker[status]}
      </span>
      <span data-status-label>{status}</span>
    </span>
  )
}
