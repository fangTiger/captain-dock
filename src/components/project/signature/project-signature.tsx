import type { ReactElement } from 'react'

import type { Project, ProjectTheme } from '../../../content/types'

import { FlightSignature } from './flight-signature'
import { LedgerSignature } from './ledger-signature'
import { MarketSignature } from './market-signature'
import { ProbabilitySignature } from './probability-signature'

type ProjectSignatureProps = Readonly<{
  project: Project
}>

type SignatureRenderer = (props: ProjectSignatureProps) => ReactElement

const signatureRenderers = {
  ledger: LedgerSignature,
  market: MarketSignature,
  probability: ProbabilitySignature,
  flight: FlightSignature,
} satisfies Record<ProjectTheme['motif'], SignatureRenderer>

export function ProjectSignature({ project }: ProjectSignatureProps) {
  const Signature = (signatureRenderers as Partial<Record<string, SignatureRenderer>>)[project.theme.motif]

  if (!Signature) {
    throw new Error(`Unknown project signature motif: ${project.theme.motif}`)
  }

  return <Signature project={project} />
}
