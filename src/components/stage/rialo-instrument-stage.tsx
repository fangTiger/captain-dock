import type { Ecosystem, Project } from '../../content/types'
import { RialoReactiveLoop } from '../rialo/rialo-reactive-loop'

type RialoInstrumentStageProps = Readonly<{
  ecosystem: Ecosystem
  project: Project
}>

export function RialoInstrumentStage({ ecosystem, project }: RialoInstrumentStageProps) {
  return <RialoReactiveLoop coreLoop={project.coreLoop} ecosystem={ecosystem} project={project} />
}
