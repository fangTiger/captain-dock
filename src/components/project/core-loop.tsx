import type { Project } from '../../content/types'

import styles from './project-case-study.module.css'

type CoreLoopProps = Readonly<{
  steps: Project['coreLoop']
}>

export function CoreLoop({ steps }: CoreLoopProps) {
  return (
    <div className={styles.coreLoop}>
      <ol aria-label="Project mechanism" className={styles.loopList}>
        {steps.map((step, index) => (
          <li className={styles.loopItem} key={step.label}>
            <span aria-hidden="true" className={styles.stepIndex}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className={styles.stepCopy}>
              <h3 className={styles.stepTitle}>{step.label}</h3>
              <details
                aria-label={`Step notes for ${step.label}`}
                className={styles.stepNotes}
              >
                <summary>Step notes</summary>
                <p className={styles.stepDescription}>{step.description}</p>
              </details>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
