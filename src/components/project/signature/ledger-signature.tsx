import type { Project } from '../../../content/types'

import styles from './project-signature.module.css'

type LedgerSignatureProps = Readonly<{
  project: Project
}>

export function LedgerSignature({ project }: LedgerSignatureProps) {
  return (
    <section
      aria-labelledby={`${project.slug}-signature-heading`}
      className={`${styles.signature} ${styles.ledger}`}
      data-signature-grammar="scan-ledger"
      data-signature-motif="ledger"
    >
      <div className={styles.header}>
        <p className={styles.eyebrow}>Receipt dossier</p>
        <h2 className={styles.title} id={`${project.slug}-signature-heading`}>
          System signature
        </h2>
        <p className={styles.projectName}>{project.name}</p>
        <p className={styles.statusNote}>Process diagram / not live data</p>
      </div>

      <div aria-hidden="true" className={`${styles.diagram} ${styles.ledgerDiagram}`}>
        <span className={`${styles.motionTrace} ${styles.scanTrace}`} data-signature-motion />
        <svg className={styles.diagramSvg} focusable="false" viewBox="0 0 420 220">
          <path className={styles.gridLine} d="M40 42H380M40 82H380M40 122H380M40 162H380" />
          <path className={styles.heavyLine} d="M56 42V178M146 42V178M260 42V178M364 42V178" />
          <path className={styles.signalLine} d="M58 166H142L170 86H256L286 126H364" />
          <rect className={styles.block} height="34" width="78" x="60" y="54" />
          <rect className={styles.block} height="34" width="78" x="172" y="94" />
          <rect className={styles.block} height="34" width="78" x="286" y="134" />
        </svg>
        <div className={styles.diagramLabels}>
          <span>Budget rail</span>
          <span>Paid call</span>
          <span>Receipt file</span>
        </div>
      </div>

    </section>
  )
}
