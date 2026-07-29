import type { Project } from '../../content/types'

import styles from './project-case-study.module.css'

type StackLanesProps = Readonly<{
  lanes: Project['stack']
}>

export function StackLanes({ lanes }: StackLanesProps) {
  return (
    <section aria-labelledby="stack-heading" className={styles.stackSection}>
      <div className={styles.innerHeader}>
        <p className={styles.eyebrow}>Build lanes</p>
        <h3 className={styles.innerTitle} id="stack-heading">
          Stack lanes
        </h3>
      </div>
      <ul className={styles.stackList}>
        {lanes.map((lane) => (
          <li className={styles.stackLane} key={lane.lane}>
            <h3 className={styles.stackTitle}>{lane.lane}</h3>
            <div className={styles.stackItems}>
              {lane.items.map((item) => (
                <span className={styles.stackItem} key={item}>
                  {item}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
