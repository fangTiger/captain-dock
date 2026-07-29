import type { CSSProperties } from 'react'

import type { Ecosystem } from '../../content/types'
import styles from '../../styles/universe-pages.module.css'

type EcosystemHeroProps = Readonly<{
  ecosystem: Ecosystem
  projectCount: number
}>

export function EcosystemHero({ ecosystem, projectCount }: EcosystemHeroProps) {
  const style = {
    '--ecosystem-accent': ecosystem.theme.accent,
    '--ecosystem-surface': ecosystem.theme.surface,
    '--ecosystem-glow': ecosystem.theme.glow,
  } as CSSProperties

  return (
    <header
      className={styles.ecosystemHero}
      data-ecosystem-hero
      data-ecosystem-theme={ecosystem.slug}
      style={style}
    >
      <div className={styles.ecosystemHeroCopy}>
        <p className={styles.kicker}>Ecosystem {ecosystem.index}</p>
        <h1>{ecosystem.name}</h1>
        <p className={styles.lede}>{ecosystem.statement}</p>
        <p className={styles.bodyText}>{ecosystem.description}</p>
        <dl className={styles.meterList} aria-label={`${ecosystem.name} ecosystem summary`}>
          <div>
            <dt>Project files</dt>
            <dd>
              {projectCount} project{projectCount === 1 ? '' : 's'}
            </dd>
          </div>
          <div>
            <dt>Signal system</dt>
            <dd>{ecosystem.theme.motif}</dd>
          </div>
        </dl>
      </div>
      <div className={styles.ecosystemInstrument} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </header>
  )
}
