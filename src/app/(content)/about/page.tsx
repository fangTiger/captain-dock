import { ControlLink } from '../../../components/ui/control-link'
import { buildRouteMetadata } from '../../../lib/metadata'
import styles from '../../../styles/universe-pages.module.css'

export const metadata = buildRouteMetadata('/about')

export default function AboutPage() {
  return (
    <main className={styles.aboutPage} data-about-layout="editorial-rail" id="main-content">
      <header className={styles.aboutHero}>
        <div className={styles.aboutCopy}>
          <p className={styles.kicker}>Captain Dock field note</p>
          <h1>About</h1>
          <p className={styles.lede}>
            A readable index of Arc and Rialo work, organized around project branches, case files, and live project
            entries.
          </p>
          <p className={styles.bodyText}>
            This page does not invent an author name, biography, clients, awards, or contact details. Unconfirmed
            information remains explicitly outside the published record.
          </p>
        </div>
      </header>

      <section aria-labelledby="about-boundaries-heading">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Confirmed scope</p>
          <h2 id="about-boundaries-heading">Information boundaries</h2>
        </div>
        <div className={styles.aboutGrid}>
          <article className={styles.aboutNote} data-about-boundary="identity">
            <p className={styles.aboutLabel}>Identity</p>
            <p>The author name is unconfirmed; Captain Dock remains the working name of this project index.</p>
          </article>
          <article className={styles.aboutNote} data-about-boundary="background">
            <p className={styles.aboutLabel}>Background</p>
            <p>The author background is unconfirmed; this site describes only the Arc and Rialo work in the catalog.</p>
          </article>
          <article className={styles.aboutNote} data-about-boundary="contact">
            <p className={styles.aboutLabel}>Contact</p>
            <p>Contact details are unconfirmed; no email address, phone number, or social account is published.</p>
          </article>
        </div>
      </section>

      <nav aria-label="About recovery routes" className={styles.returnNav}>
        <ControlLink controlRole="quiet" href="/">
          Return to Captain Dock
        </ControlLink>
        <ControlLink controlRole="primary" href="/#project-index">
          Browse the project index
        </ControlLink>
      </nav>
    </main>
  )
}
