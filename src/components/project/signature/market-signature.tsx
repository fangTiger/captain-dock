import type { Project } from '../../../content/types'

import styles from './project-signature.module.css'

type MarketSignatureProps = Readonly<{
  project: Project
}>

export function MarketSignature({ project }: MarketSignatureProps) {
  return (
    <section
      aria-labelledby={`${project.slug}-signature-heading`}
      className={`${styles.signature} ${styles.market}`}
      data-signature-grammar="order-book"
      data-signature-motif="market"
    >
      <div className={styles.header}>
        <p className={styles.eyebrow}>Order-book axis</p>
        <h2 className={styles.title} id={`${project.slug}-signature-heading`}>
          System signature
        </h2>
        <p className={styles.projectName}>{project.name}</p>
        <p className={styles.statusNote}>Process diagram / not live data</p>
      </div>

      <div aria-hidden="true" className={`${styles.diagram} ${styles.marketDiagram}`}>
        <span className={`${styles.motionTrace} ${styles.matchTrace}`} data-signature-motion />
        <svg className={styles.diagramSvg} focusable="false" viewBox="0 0 420 220">
          <path className={styles.centerAxis} d="M210 26V194" />
          <path className={styles.gridLine} d="M70 54H184M70 94H184M70 134H184M236 54H350M236 94H350M236 134H350" />
          <path className={styles.signalLine} d="M92 174H174L210 110L246 70H328" />
          <rect className={styles.block} height="30" width="90" x="82" y="44" />
          <rect className={styles.block} height="30" width="90" x="248" y="84" />
          <rect className={styles.block} height="30" width="90" x="82" y="124" />
        </svg>
        <div className={styles.diagramLabels}>
          <span>Asset row</span>
          <span>Bid / ask</span>
          <span>Match axis</span>
        </div>
      </div>

    </section>
  )
}
