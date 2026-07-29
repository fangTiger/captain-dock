import { ConstellationStaticFallback } from '../constellation/constellation-static-fallback'
import { serializeSceneTarget } from './scene-target'
import type { SceneTarget } from './scene-types'
import styles from './static-universe-fallback.module.css'

export type StaticUniverseScene = 'home' | 'arc' | 'rialo'

type StaticUniverseFallbackProps = {
  scene: StaticUniverseScene
  className?: string
  target?: SceneTarget | null
}

const sceneLabels: Record<StaticUniverseScene, string> = {
  home: 'Deep-space project constellation',
  arc: 'Arc orbital circuit',
  rialo: 'Rialo reactive radar',
}

function classNames(...names: Array<string | undefined>) {
  return names.filter(Boolean).join(' ')
}

function unknownScene(scene: never): never {
  throw new Error(`Unknown static universe scene: ${scene}`)
}

function ArcCircuit({ target }: Pick<StaticUniverseFallbackProps, 'target'>) {
  const activeProject = target?.kind === 'project' ? target.project : null

  return (
    <>
      <svg
        className={styles.plate}
        viewBox="0 0 320 220"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse className={styles.trackPrimary} cx="160" cy="110" rx="112" ry="66" data-orbit-ring="outer" />
        <ellipse className={styles.trackSecondary} cx="160" cy="110" rx="78" ry="42" data-orbit-ring="middle" />
        <ellipse className={styles.gridLine} cx="160" cy="110" rx="42" ry="22" data-orbit-ring="inner" />
        <rect className={styles.signalPlate} x="54" y="78" width="66" height="42" data-active={activeProject === 'signal-ledger' ? 'true' : undefined} data-arc-signal="ledger" />
        <rect className={styles.signalPlate} x="130" y="52" width="60" height="72" data-active={activeProject === 'hadron' ? 'true' : undefined} data-arc-signal="market" />
        <path
          className={styles.signalPlate}
          d="M226 70L270 110L226 150L205 110Z"
          data-active={activeProject === 'arcpredict' ? 'true' : undefined}
          data-arc-signal="probability"
        />
        <path className={styles.signalLine} d="M120 99H130M190 89L226 92M190 118L226 128" />
        <path className={styles.trackPrimary} d="M67 92h38M68 105h38M68 118h38" />
        <path className={styles.trackSecondary} d="M145 68h30M145 86h30M145 104h30" />
        <text className={styles.label} x="52" y="176">
          ledger / market / probability
        </text>
      </svg>
      <figcaption className={styles.caption}>
        Ledger plates, market rails, and probability signals sit on one static orbital circuit
        for the Arc route.
      </figcaption>
    </>
  )
}

function RialoRadar({ target }: Pick<StaticUniverseFallbackProps, 'target'>) {
  const activeStep = target?.kind === 'rialo-step' ? target.step : null
  const nodes = [
    ['Observe', 72, 142],
    ['Cover', 112, 92],
    ['Trigger', 164, 74],
    ['Settle', 216, 104],
    ['Explain', 250, 150],
  ] as const

  return (
    <>
      <svg
        className={styles.plate}
        viewBox="0 0 320 220"
        aria-hidden="true"
        focusable="false"
      >
        <circle className={styles.radarSweep} cx="160" cy="112" r="84" />
        <path className={styles.gridLine} d="M160 28V196M76 112H244M100 52L220 172M220 52L100 172" />
        <path className={styles.route} d="M72 142L112 92L164 74" data-rialo-route="observe-trigger" />
        <path className={styles.route} d="M164 74L216 104" data-rialo-route="trigger-settle" />
        <path className={styles.route} d="M216 104L250 150" data-rialo-route="settle-explain" />
        {nodes.map(([label, cx, cy], index) => (
          <g data-active={activeStep === label.toLowerCase() ? 'true' : undefined} key={label} data-rialo-node={label.toLowerCase()}>
            <circle className={index % 2 === 0 ? styles.nodePrimary : styles.nodeSecondary} cx={cx} cy={cy} r="7" />
            <text className={styles.label} x={cx + 10} y={cy + 4}>
              {label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className={styles.caption}>
        Observe, Cover, Trigger, Settle, and Explain form a static radar route for Rialo.
      </figcaption>
    </>
  )
}

export function StaticUniverseFallback({ scene, className, target }: StaticUniverseFallbackProps) {
  const serializedTarget = target ? serializeSceneTarget(target) : ''

  switch (scene) {
    case 'home':
      return (
        <figure
          className={classNames(styles.figure, styles.home, className)}
          role="img"
          aria-label={sceneLabels.home}
          data-static-scene="home"
          data-static-target={serializedTarget}
        >
          <ConstellationStaticFallback target={target} />
        </figure>
      )
    case 'arc':
      return (
        <figure
          className={classNames(styles.figure, styles.arc, className)}
          role="img"
          aria-label={sceneLabels.arc}
          data-static-scene="arc"
          data-static-target={serializedTarget}
        >
          <ArcCircuit target={target} />
        </figure>
      )
    case 'rialo':
      return (
        <figure
          className={classNames(styles.figure, styles.rialo, className)}
          role="img"
          aria-label={sceneLabels.rialo}
          data-static-scene="rialo"
          data-static-target={serializedTarget}
        >
          <RialoRadar target={target} />
        </figure>
      )
    default:
      return unknownScene(scene)
  }
}
