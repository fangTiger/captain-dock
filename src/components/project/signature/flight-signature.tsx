import type { Project } from '../../../content/types'

import styles from './project-signature.module.css'

type FlightSignatureProps = Readonly<{
  project: Project
}>

export function FlightSignature({ project }: FlightSignatureProps) {
  return (
    <section
      aria-labelledby={`${project.slug}-signature-heading`}
      className={`${styles.signature} ${styles.flight}`}
      data-signature-grammar="flight-route"
      data-signature-motif="flight"
    >
      <div className={styles.header}>
        <p className={styles.eyebrow}>Reactive route</p>
        <h2 className={styles.title} id={`${project.slug}-signature-heading`}>
          System signature
        </h2>
        <p className={styles.projectName}>{project.name}</p>
        <p className={styles.statusNote}>Process diagram / not live data</p>
      </div>

      <div aria-hidden="true" className={`${styles.diagram} ${styles.flightDiagram}`}>
        <span className={`${styles.motionTrace} ${styles.routeTrace}`} data-signature-motion />
        <svg className={styles.diagramSvg} focusable="false" viewBox="0 0 420 220">
          <path className={styles.gridLine} d="M54 174A156 156 0 0 1 366 174M96 174A114 114 0 0 1 324 174M138 174A72 72 0 0 1 282 174" />
          <path className={styles.heavyLine} d="M64 164C132 88 220 74 354 54" />
          <path className={styles.signalLine} d="M70 162C154 118 226 126 350 58" />
          <rect className={styles.block} height="28" width="82" x="70" y="134" />
          <rect className={styles.block} height="28" width="82" x="178" y="94" />
          <rect className={styles.block} height="28" width="82" x="286" y="54" />
        </svg>
        <div className={styles.diagramLabels}>
          <span>Condition</span>
          <span>Trigger</span>
          <span>Evidence</span>
        </div>
      </div>

    </section>
  )
}
