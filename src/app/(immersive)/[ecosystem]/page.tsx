import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { JsonLd, buildEcosystemJsonLd } from '../../../components/seo/json-ld'
import { ArcInstrumentStage } from '../../../components/stage/arc-instrument-stage.client'
import { RialoInstrumentStage } from '../../../components/stage/rialo-instrument-stage'
import { ecosystems } from '../../../content/catalog'
import { getEcosystem, getProjectsByEcosystem } from '../../../content/selectors'
import { buildNotFoundMetadata, buildRouteMetadata, routeForEcosystem } from '../../../lib/metadata'
import styles from '../../../styles/universe-pages.module.css'

export const dynamicParams = false

type EcosystemPageProps = Readonly<{
  params: Promise<{
    ecosystem: string
  }>
}>

export function generateStaticParams() {
  return ecosystems.map((ecosystem) => ({
    ecosystem: ecosystem.slug,
  }))
}

export async function generateMetadata({ params }: EcosystemPageProps): Promise<Metadata> {
  const { ecosystem: ecosystemSlug } = await params
  const ecosystem = getEcosystem(ecosystemSlug)

  if (!ecosystem) {
    return buildNotFoundMetadata()
  }

  return buildRouteMetadata(routeForEcosystem(ecosystem.slug))
}

export default async function EcosystemPage({ params }: EcosystemPageProps) {
  const { ecosystem: ecosystemSlug } = await params
  const ecosystem = getEcosystem(ecosystemSlug)

  if (!ecosystem) {
    notFound()
  }

  const ecosystemProjects = getProjectsByEcosystem(ecosystem.slug)
  const rialoCaptain =
    ecosystem.slug === 'rialo' ? ecosystemProjects.find((project) => project.slug === 'rialo-captain') : undefined

  if (ecosystem.slug === 'rialo' && !rialoCaptain) {
    throw new Error('Rialo Captain catalog content is required for the Rialo reactive loop.')
  }

  return (
    <main className={styles.ecosystemPage} id="main-content">
      <JsonLd data={buildEcosystemJsonLd(ecosystem.slug)} />
      {rialoCaptain ? (
        <RialoInstrumentStage ecosystem={ecosystem} project={rialoCaptain} />
      ) : (
        <ArcInstrumentStage ecosystem={ecosystem} projects={ecosystemProjects} />
      )}
    </main>
  )
}
