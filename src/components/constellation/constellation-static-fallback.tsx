import type { SceneTarget } from '../scene/scene-types'
import {
  CONSTELLATION_EDGES,
  CONSTELLATION_NODES,
} from './constellation-model'
import styles from './constellation-static-fallback.module.css'

type ConstellationStaticFallbackProps = Readonly<{
  target?: SceneTarget | null
}>

const staticPositions = {
  'signal-ledger': [72, 118],
  hadron: [126, 66],
  arcpredict: [178, 126],
  'rialo-captain': [258, 102],
} as const satisfies Record<
  (typeof CONSTELLATION_NODES)[number]['project'],
  readonly [number, number]
>

const staticStars = [
  [28, 42, 1.2],
  [52, 82, 0.8],
  [83, 35, 0.9],
  [109, 154, 1.1],
  [145, 30, 0.7],
  [157, 184, 1],
  [197, 50, 1.1],
  [216, 166, 0.8],
  [242, 44, 0.7],
  [284, 66, 1.2],
  [298, 146, 0.9],
  [43, 178, 0.7],
] as const

export function ConstellationStaticFallback({
  target,
}: ConstellationStaticFallbackProps) {
  const activeEcosystem = target?.kind === 'ecosystem' ? target.ecosystem : null
  const activeProject = target?.kind === 'project' ? target.project : null

  return (
    <>
      <svg
        aria-hidden="true"
        className={styles.plate}
        focusable="false"
        viewBox="0 0 320 220"
      >
        <g className={styles.stars}>
          {staticStars.map(([cx, cy, radius]) => (
            <circle cx={cx} cy={cy} key={`${cx}:${cy}`} r={radius} />
          ))}
        </g>
        <g className={styles.edges}>
          {CONSTELLATION_EDGES.map((edge) => {
            const [x1, y1] = staticPositions[edge.from]
            const [x2, y2] = staticPositions[edge.to]

            return (
              <line
                data-constellation-edge={`${edge.from}:${edge.to}`}
                key={`${edge.from}:${edge.to}`}
                x1={x1}
                x2={x2}
                y1={y1}
                y2={y2}
              />
            )
          })}
        </g>
        {(['arc', 'rialo'] as const).map((ecosystem) => (
          <g
            className={styles[ecosystem]}
            data-active={activeEcosystem === ecosystem ? 'true' : undefined}
            data-constellation-cluster={ecosystem}
            key={ecosystem}
          >
            <ellipse
              className={styles.clusterAura}
              cx={ecosystem === 'arc' ? 124 : 258}
              cy={ecosystem === 'arc' ? 104 : 102}
              rx={ecosystem === 'arc' ? 88 : 38}
              ry={ecosystem === 'arc' ? 64 : 38}
            />
            {CONSTELLATION_NODES.filter((node) => node.ecosystem === ecosystem).map(
              (node) => {
                const [cx, cy] = staticPositions[node.project]

                return (
                  <g
                    data-active={activeProject === node.project ? 'true' : undefined}
                    data-constellation-node={node.project}
                    key={node.project}
                  >
                    <circle className={styles.nodeGlow} cx={cx} cy={cy} r="12" />
                    <circle className={styles.nodeCore} cx={cx} cy={cy} r="4.5" />
                  </g>
                )
              },
            )}
          </g>
        ))}
      </svg>
      <figcaption className={styles.caption}>
        Two ecosystem clusters hold four unnamed project nodes in a static deep-space
        constellation without motion or Canvas.
      </figcaption>
    </>
  )
}
