import type { Project } from '../../../content/types'

import styles from './project-signature.module.css'

type ProbabilitySignatureProps = Readonly<{
  project: Project
}>

export function ProbabilitySignature({ project }: ProbabilitySignatureProps) {
  return (
    <section
      aria-labelledby={`${project.slug}-signature-heading`}
      className={`${styles.signature} ${styles.probability}`}
      data-signature-grammar="probability-arc"
      data-signature-motif="probability"
    >
      <div className={styles.header}>
        <p className={styles.eyebrow}>Challenge window</p>
        <h2 className={styles.title} id={`${project.slug}-signature-heading`}>
          System signature
        </h2>
        <p className={styles.projectName}>{project.name}</p>
        <p className={styles.statusNote}>Process diagram / not live data</p>
        <p className={styles.boundaryNote}>AI does not participate in final settlement</p>
      </div>

      <div aria-hidden="true" className={`${styles.diagram} ${styles.probabilityDiagram}`}>
        <span className={`${styles.motionTrace} ${styles.arcTrace}`} data-signature-motion />
        <svg className={styles.diagramSvg} focusable="false" viewBox="0 0 420 220">
          <path className={styles.gridLine} d="M70 172C112 70 176 34 242 68S322 128 350 48" />
          <path className={styles.heavyLine} d="M84 172C142 112 192 98 240 116S312 122 346 82" />
          <path className={styles.signalLine} d="M96 166C152 92 206 78 258 104S314 128 344 96" />
          <rect className={styles.block} height="34" width="76" x="78" y="136" />
          <rect className={styles.block} height="34" width="92" x="190" y="66" />
          <rect className={styles.block} height="34" width="76" x="300" y="106" />
        </svg>
        <div className={styles.diagramLabels}>
          <span>Proposal</span>
          <span>Challenge</span>
          <span>Claim</span>
        </div>
      </div>

    </section>
  )
}
