import { ecosystems, projects } from '../../content/catalog'
import { ConstellationFacade } from '../../components/constellation/constellation-facade.client'
import { ConstellationIndex } from '../../components/constellation/constellation-index'
import { JsonLd, buildHomeJsonLd } from '../../components/seo/json-ld'
import { buildRouteMetadata } from '../../lib/metadata'
import styles from '../../styles/universe-pages.module.css'

export const metadata = buildRouteMetadata('/')

export default function HomePage() {
  return (
    <main className={styles.homePage} data-home-facade id="main-content">
      <JsonLd data={buildHomeJsonLd()} />
      <ConstellationFacade ecosystems={ecosystems} projects={projects} />
      <ConstellationIndex projects={projects} />
    </main>
  )
}
