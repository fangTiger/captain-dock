import type { Project } from '../../content/types'
import { StatusLabel } from '../ui/status-label'

import styles from './project-case-study.module.css'

type EvidenceSectionProps = Readonly<{
  evidence: Project['evidence']
}>

export function EvidenceSection({ evidence }: EvidenceSectionProps) {
  return (
    <div className={styles.evidenceSection}>
      <ul aria-label="Product evidence" className={styles.evidenceList}>
        {evidence.map((item) => (
          <li className={styles.evidenceItem} key={item.label}>
            <div className={styles.evidenceHeader}>
              <h3 className={styles.evidenceTitle}>{item.label}</h3>
              <span className={styles.evidenceStatus}>
                <StatusLabel status={item.status} />
              </span>
            </div>
            <details
              aria-label={`Evidence notes for ${item.label}`}
              className={styles.evidenceNotes}
            >
              <summary>Evidence notes</summary>
              <p className={styles.evidenceDescription}>{item.description}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  )
}
