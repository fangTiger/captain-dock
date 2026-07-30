import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps, ReactElement } from 'react'
import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  forEachChild,
  isIdentifier,
  isImportDeclaration,
  isJsxAttribute,
  isJsxElement,
  isJsxExpression,
  isJsxOpeningElement,
  isJsxSelfClosingElement,
  isStringLiteral,
  type Node,
} from 'typescript'

import { projects } from '../../content/catalog'
import * as scenePrimitives from './scene-primitives'
import * as sceneRouter from './scene-router.client'
import * as sceneTypes from './scene-types'
import { parseSceneTarget } from './scene-target'
import { SharedUniverse } from './shared-universe'
import type { ImmersiveSceneId } from './scene-types'
import type { SceneTransitionState } from './transition-machine'
import { ConstellationField } from '../constellation/constellation-field.client'
import ArcOrbitalCircuit from './scenes/arc-orbital-circuit'
import RialoReactiveField from './scenes/rialo-reactive-field'
import * as homeScene from './scenes/home-constellation'
import * as arcScene from './scenes/arc-orbital-circuit'
import * as rialoScene from './scenes/rialo-reactive-field'
import type { ProgrammaticScenePalette, ProgrammaticSceneProps } from './scene-router.client'

type EnhancedSceneQuality = scenePrimitives.EnhancedSceneQuality
type SceneEntryForQuality = {
  scene: ImmersiveSceneId
  variant: ProgrammaticSceneProps['variant']
  ready: boolean
  renderKey: ImmersiveSceneId
}
type SceneRouterProps = ComponentProps<typeof sceneRouter.SceneRouter>
type SceneRouterProbeHarness = {
  camera: Readonly<{ name: string }>
  compileAsync: ReturnType<typeof vi.fn>
  compileDeferreds: Array<Deferred<void>>
  events: string[]
  extensionHas: ReturnType<typeof vi.fn>
  rootScene: Readonly<{ name: string }>
  SceneRouter: typeof sceneRouter.SceneRouter
}

type Deferred<T> = {
  promise: Promise<T>
  reject: (error: unknown) => void
  resolve: (value: T | PromiseLike<T>) => void
}

const qualities = ['high', 'medium', 'low'] as const satisfies readonly EnhancedSceneQuality[]
const scenes = ['home', 'arc', 'rialo'] as const satisfies readonly ImmersiveSceneId[]
const ceilings = {
  high: 24,
  medium: 18,
  low: 8,
} as const satisfies Record<EnhancedSceneQuality, number>
const r3fSourceOwners = [
  'src/components/scene/shared-universe.tsx',
  'src/components/constellation/constellation-field.client.tsx',
  'src/components/scene/scenes/home-constellation.tsx',
  'src/components/scene/scenes/arc-orbital-circuit.tsx',
  'src/components/scene/scenes/rialo-reactive-field.tsx',
] as const
const r3fSceneRootOwners = [
  {
    expectedName: 'home-constellation',
    sourcePath: 'src/components/scene/scenes/home-constellation.tsx',
  },
  {
    expectedName: 'arc-orbital-circuit',
    sourcePath: 'src/components/scene/scenes/arc-orbital-circuit.tsx',
  },
  {
    expectedName: 'rialo-reactive-field',
    sourcePath: 'src/components/scene/scenes/rialo-reactive-field.tsx',
  },
] as const

const colors = {
  ecosystems: {
    arc: '#7dd3fc',
    rialo: '#fbbf24',
  },
  projects: {
    'signal-ledger': '#38bdf8',
    hadron: '#a78bfa',
    arcpredict: '#22d3ee',
    'rialo-captain': '#f59e0b',
  },
  neutral: '#d8eef2',
  grid: '#5f7480',
  panel: '#d6dee5',
  risk: '#fb7185',
} as const satisfies ProgrammaticScenePalette

function createDeferred<T>(): Deferred<T> {
  let resolve: Deferred<T>['resolve'] = () => {}
  let reject: Deferred<T>['reject'] = () => {}
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return {
    promise,
    reject,
    resolve,
  }
}

async function createSceneRouterProbeHarness({
  extensionHasImplementation,
  supportsParallelShaderCompile = true,
}: {
  extensionHasImplementation?: (extensionName: string) => boolean
  supportsParallelShaderCompile?: boolean
} = {}): Promise<SceneRouterProbeHarness> {
  const React = await import('react')
  const camera = Object.freeze({ name: 'probe-camera' })
  const rootScene = Object.freeze({ name: 'probe-root-scene' })
  const events: string[] = []
  const compileDeferreds: Array<Deferred<void>> = []
  const extensionHas = vi.fn((extensionName: string) => {
    events.push(`extension:${extensionName}`)

    if (extensionHasImplementation) {
      return extensionHasImplementation(extensionName)
    }

    return extensionName === 'KHR_parallel_shader_compile' && supportsParallelShaderCompile
  })
  const compileAsync = vi.fn((scene: unknown, compileCamera: unknown) => {
    events.push('compile')
    const deferred = createDeferred<void>()

    expect(scene).toBe(rootScene)
    expect(compileCamera).toBe(camera)
    compileDeferreds.push(deferred)

    return deferred.promise
  })

  const createSceneMock = (scene: string) => ({
    default: function MockLazyScene() {
      React.useLayoutEffect(() => {
        events.push(`layout:${scene}`)
      }, [])

      return React.createElement('group', {
        'data-testid': `lazy-scene-${scene}`,
      })
    },
  })

  vi.resetModules()
  vi.doMock('react', () => React)
  vi.doMock('@react-three/fiber', () => ({
    useFrame: vi.fn(),
    useThree<T>(
      selector: (state: {
        camera: typeof camera
        gl: {
          compileAsync: typeof compileAsync
          extensions: {
            has: typeof extensionHas
          }
        }
        scene: typeof rootScene
      }) => T,
    ) {
      return selector({
        camera,
        gl: {
          compileAsync,
          extensions: {
            has: extensionHas,
          },
        },
        scene: rootScene,
      })
    },
  }))
  vi.doMock('./scenes/home-constellation', () => createSceneMock('home'))
  vi.doMock('./scenes/arc-orbital-circuit', () => createSceneMock('arc'))
  vi.doMock('./scenes/rialo-reactive-field', () => createSceneMock('rialo'))

  const routerModule = await import('./scene-router.client')

  return {
    camera,
    compileAsync,
    compileDeferreds,
    events,
    extensionHas,
    rootScene,
    SceneRouter: routerModule.SceneRouter,
  }
}

function sceneRouterProps(overrides: Partial<SceneRouterProps> = {}): SceneRouterProps {
  return {
    compileKey: '9:home:high',
    morphDurationMs: 780,
    motionEnabled: true,
    onSceneCompileError: vi.fn(),
    onSceneCompiled: vi.fn(),
    onSceneReady: vi.fn(),
    quality: 'high',
    reducedMotion: false,
    requestFrame: vi.fn(),
    target: null,
    transition: transitionState('idle', 'home', null),
    ...overrides,
  }
}

type SceneMetadataExports = {
  SCENE_ECOSYSTEM_ACCENTS?: Readonly<Record<'arc' | 'rialo', string>>
  SCENE_PROJECT_ACCENTS?: Readonly<
    Record<'signal-ledger' | 'hadron' | 'arcpredict' | 'rialo-captain', string>
  >
  SCENE_PROJECT_ECOSYSTEMS?: Readonly<
    Record<'signal-ledger' | 'hadron' | 'arcpredict' | 'rialo-captain', 'arc' | 'rialo'>
  >
}

function getImportSpecifiers(sourcePath: string) {
  const source = createSourceFile(
    sourcePath,
    readFileSync(join(process.cwd(), sourcePath), 'utf8'),
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  )

  return source.statements
    .filter(isImportDeclaration)
    .map((declaration) =>
      isStringLiteral(declaration.moduleSpecifier) ? declaration.moduleSpecifier.text : '',
    )
}

function getDomOnlyR3fAttributes(sourcePath: string) {
  const source = createSourceFile(
    sourcePath,
    readFileSync(join(process.cwd(), sourcePath), 'utf8'),
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  )
  const violations: string[] = []

  function visit(node: Node) {
    if (isJsxOpeningElement(node) || isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(source)

      for (const property of node.attributes.properties) {
        if (!isJsxAttribute(property)) {
          continue
        }

        const attributeName = property.name.getText(source)

        if (attributeName.startsWith('data-') || attributeName.startsWith('aria-')) {
          violations.push(`${sourcePath}:${tagName}:${attributeName}`)
        }
      }
    }

    forEachChild(node, visit)
  }

  visit(source)

  return violations
}

// three.js 在 material.vertexColors 为真时定义 USE_COLOR，顶点着色器随即执行
// `vColor.rgb *= color`。若几何体没有 color 属性，WebGL 对缺失属性返回默认值
// (0, 0, 0)，diffuse 被乘成零、物体渲染为纯黑。
// 逐实例颜色（setColorAt）不需要这个开关：instanceColor 非空时 three.js 会自动
// 启用 USE_INSTANCING_COLOR 并在片元前缀补上 USE_COLOR。
function getUnbackedVertexColorMaterials(sourcePath: string) {
  const source = createSourceFile(
    sourcePath,
    readFileSync(join(process.cwd(), sourcePath), 'utf8'),
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  )
  const violations: string[] = []

  function getTagName(node: Node) {
    if (isJsxSelfClosingElement(node)) {
      return node.tagName.getText(source)
    }

    if (isJsxElement(node)) {
      return node.openingElement.tagName.getText(source)
    }

    return null
  }

  function getAttributes(node: Node) {
    if (isJsxSelfClosingElement(node)) {
      return node.attributes.properties.filter(isJsxAttribute)
    }

    if (isJsxElement(node)) {
      return node.openingElement.attributes.properties.filter(isJsxAttribute)
    }

    return []
  }

  function declaresColorAttribute(root: Node) {
    let found = false

    function walk(node: Node) {
      if (found) {
        return
      }

      if (getTagName(node) === 'bufferAttribute') {
        const attach = getAttributes(node).find(
          (attribute) => attribute.name.getText(source) === 'attach',
        )

        if (
          attach?.initializer !== undefined &&
          isStringLiteral(attach.initializer) &&
          attach.initializer.text === 'attributes-color'
        ) {
          found = true

          return
        }
      }

      forEachChild(node, walk)
    }

    walk(root)

    return found
  }

  function visit(node: Node) {
    if (isJsxElement(node)) {
      for (const child of node.children) {
        const usesVertexColors = getAttributes(child).some(
          (attribute) => attribute.name.getText(source) === 'vertexColors',
        )

        if (usesVertexColors && !declaresColorAttribute(node)) {
          violations.push(`${sourcePath}:${getTagName(node)}>${getTagName(child)}`)
        }
      }
    }

    forEachChild(node, visit)
  }

  visit(source)

  return violations
}

function getSceneRootGroupName(sourcePath: string) {
  const source = createSourceFile(
    sourcePath,
    readFileSync(join(process.cwd(), sourcePath), 'utf8'),
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX,
  )
  const rootGroupNames: Array<string | null> = []

  function visit(node: Node) {
    if (
      (isJsxOpeningElement(node) || isJsxSelfClosingElement(node)) &&
      node.tagName.getText(source) === 'group'
    ) {
      const attributes = node.attributes.properties.filter(isJsxAttribute)
      const referencesSceneRef = attributes.some(
        (attribute) =>
          attribute.name.getText(source) === 'ref' &&
          attribute.initializer !== undefined &&
          isJsxExpression(attribute.initializer) &&
          attribute.initializer.expression !== undefined &&
          isIdentifier(attribute.initializer.expression) &&
          attribute.initializer.expression.text === 'sceneRef',
      )

      if (referencesSceneRef) {
        const nameAttributes = attributes.filter(
          (attribute) => attribute.name.getText(source) === 'name',
        )
        const initializer = nameAttributes.length === 1 ? nameAttributes[0].initializer : undefined

        rootGroupNames.push(
          initializer !== undefined && isStringLiteral(initializer) ? initializer.text : null,
        )
      }
    }

    forEachChild(node, visit)
  }

  visit(source)

  return rootGroupNames.length === 1 ? rootGroupNames[0] : null
}

function silenceR3fDomWarnings() {
  const originalError = console.error
  const originalWarn = console.warn
  const shouldIgnore = (args: readonly unknown[]) => {
    const text = args.map(String).join(' ')

    return (
      text.includes('is using incorrect casing') ||
      text.includes('React does not recognize') ||
      text.includes('Received `true` for a non-boolean attribute')
    )
  }
  const error = vi.spyOn(console, 'error').mockImplementation((...args) => {
    if (shouldIgnore(args)) {
      return
    }

    originalError(...args)
  })
  const warn = vi.spyOn(console, 'warn').mockImplementation((...args) => {
    if (shouldIgnore(args)) {
      return
    }

    originalWarn(...args)
  })

  return {
    restore: () => {
      error.mockRestore()
      warn.mockRestore()
    },
  }
}

function countDrawBearingTags(markup: string) {
  return [...markup.matchAll(/<(line|linesegments|mesh|instancedmesh|points)(?=[\s>])/gi)].length
}

function countDrawCalls(element: ReactElement) {
  const consoleError = silenceR3fDomWarnings()

  try {
    return countDrawBearingTags(renderToStaticMarkup(element))
  } finally {
    consoleError.restore()
  }
}

function sceneElement(scene: ImmersiveSceneId, quality: EnhancedSceneQuality) {
  const props = {
    colors,
    morphDurationMs: 780,
    motionEnabled: true,
    quality,
    reducedMotion: false,
    requestFrame: vi.fn(),
    target: null,
    variant: 'current',
  } as const satisfies ProgrammaticSceneProps

  switch (scene) {
    case 'home':
      return (
        <ConstellationField
          quality={props.quality}
          target={props.target}
          variant={props.variant}
        />
      )
    case 'arc':
      return <ArcOrbitalCircuit {...props} />
    case 'rialo':
      return <RialoReactiveField {...props} />
  }
}

function actualSharedDrawCalls(quality: EnhancedSceneQuality) {
  return countDrawCalls(<SharedUniverse quality={quality} />)
}

function actualSceneDrawCalls(scene: ImmersiveSceneId, quality: EnhancedSceneQuality) {
  return countDrawCalls(sceneElement(scene, quality))
}

function getSceneEntriesForQuality(
  quality: EnhancedSceneQuality,
  transition: SceneTransitionState,
): readonly SceneEntryForQuality[] {
  const getter = (
    sceneRouter as unknown as {
      getVisibleSceneEntriesForQuality?: (
        quality: EnhancedSceneQuality,
        transition: SceneTransitionState,
      ) => readonly SceneEntryForQuality[]
    }
  ).getVisibleSceneEntriesForQuality

  expect(getter).toEqual(expect.any(Function))

  return getter?.(quality, transition) ?? []
}

function filterSceneTarget(scene: ImmersiveSceneId, value: string) {
  const filter = (
    sceneRouter as unknown as {
      filterSceneTargetForScene?: (
        scene: ImmersiveSceneId,
        target: ReturnType<typeof parseSceneTarget>,
      ) => ReturnType<typeof parseSceneTarget>
    }
  ).filterSceneTargetForScene

  expect(filter).toEqual(expect.any(Function))

  return filter?.(scene, parseSceneTarget(value))
}

function getSharedBudget(quality: EnhancedSceneQuality) {
  const estimator = (
    scenePrimitives as unknown as {
      estimateSharedUniverseBudget?: (quality: EnhancedSceneQuality) => scenePrimitives.SceneBudgetEstimate
    }
  ).estimateSharedUniverseBudget

  expect(estimator).toEqual(expect.any(Function))

  return estimator?.(quality)
}

function getTransitionBudget(quality: EnhancedSceneQuality, entries: readonly SceneEntryForQuality[]) {
  const estimator = (
    scenePrimitives as unknown as {
      estimateSceneTransitionBudget?: (
        quality: EnhancedSceneQuality,
        entries: readonly Pick<SceneEntryForQuality, 'scene'>[],
      ) => scenePrimitives.SceneBudgetEstimate
    }
  ).estimateSceneTransitionBudget

  expect(estimator).toEqual(expect.any(Function))

  return estimator?.(quality, entries)
}

function transitionState(
  phase: SceneTransitionState['phase'],
  scene: ImmersiveSceneId,
  previousScene: ImmersiveSceneId | null,
): SceneTransitionState {
  return {
    phase,
    scene,
    previousScene,
    targetScene: scene,
    token: 8,
  }
}

afterEach(() => {
  cleanup()
  vi.doUnmock('react')
  vi.doUnmock('@react-three/fiber')
  vi.doUnmock('./scenes/home-constellation')
  vi.doUnmock('./scenes/arc-orbital-circuit')
  vi.doUnmock('./scenes/rialo-reactive-field')
  vi.resetModules()
})

describe('scene composition draw budgets', () => {
  it('cross-checks idle draw-call estimates against actual SharedUniverse and scene JSX composition', () => {
    for (const quality of qualities) {
      const sharedDrawCalls = actualSharedDrawCalls(quality)

      expect(getSharedBudget(quality)?.maxDrawCalls).toBe(sharedDrawCalls)

      for (const scene of scenes) {
        const drawCalls = sharedDrawCalls + actualSceneDrawCalls(scene, quality)

        expect(scenePrimitives.estimateSceneBudget(scene, quality).maxDrawCalls).toBe(drawCalls)
        expect(drawCalls).toBeLessThanOrEqual(ceilings[quality])
      }
    }
  })

  it('keeps transition peaks within budget using router entries and actual scene JSX composition', () => {
    const transitions = [
      transitionState('arriving', 'arc', 'home'),
      transitionState('arriving', 'rialo', 'arc'),
      transitionState('arriving', 'arc', 'rialo'),
    ] as const

    for (const quality of qualities) {
      for (const transition of transitions) {
        const entries = getSceneEntriesForQuality(quality, transition)
        const drawCalls =
          actualSharedDrawCalls(quality) +
          entries.reduce((total, entry) => total + actualSceneDrawCalls(entry.scene, quality), 0)

        expect(entries).toHaveLength(quality === 'low' ? 1 : 2)
        expect(entries.length).toBeLessThanOrEqual(2)
        expect(getTransitionBudget(quality, entries)?.maxDrawCalls).toBe(drawCalls)
        expect(drawCalls).toBeLessThanOrEqual(ceilings[quality])
      }
    }
  })
})

describe('R3F intrinsic attribute safety', () => {
  it('rejects DOM-only data and aria attributes from every scene source owner', () => {
    expect(r3fSourceOwners.flatMap(getDomOnlyR3fAttributes)).toEqual([])
  })

  it('never enables vertexColors without a geometry color attribute backing it', () => {
    expect(r3fSourceOwners.flatMap(getUnbackedVertexColorMaterials)).toEqual([])
  })

  it('keeps one exact literal chunk ownership name on each scene root group', () => {
    for (const owner of r3fSceneRootOwners) {
      expect.soft(getSceneRootGroupName(owner.sourcePath), owner.sourcePath).toBe(owner.expectedName)
    }
  })
})

describe('scene router composition entries', () => {
  it('compiles only after the ready lazy scene commits and resolves the current compile payload', async () => {
    const { compileAsync, compileDeferreds, events, extensionHas, SceneRouter } =
      await createSceneRouterProbeHarness()
    const onSceneCompiled = vi.fn()
    const onSceneCompileError = vi.fn()

    render(
      <SceneRouter
        {...sceneRouterProps({
          onSceneCompileError,
          onSceneCompiled,
        })}
      />,
    )

    await waitFor(() => expect(compileAsync).toHaveBeenCalledTimes(1))
    expect(extensionHas).toHaveBeenCalledWith('KHR_parallel_shader_compile')
    expect(events).toEqual(['layout:home', 'extension:KHR_parallel_shader_compile', 'compile'])
    expect(onSceneCompiled).not.toHaveBeenCalled()
    expect(onSceneCompileError).not.toHaveBeenCalled()

    await act(async () => {
      compileDeferreds[0].resolve()
      await compileDeferreds[0].promise
    })

    expect(onSceneCompiled).toHaveBeenCalledWith({
      compileKey: '9:home:high',
      scene: 'home',
      token: 8,
    })
    expect(onSceneCompileError).not.toHaveBeenCalled()
  })

  it('releases the current payload synchronously without compileAsync when parallel shader compile is unsupported', async () => {
    const { compileAsync, events, extensionHas, SceneRouter } =
      await createSceneRouterProbeHarness({ supportsParallelShaderCompile: false })
    const onSceneCompiled = vi.fn()
    const onSceneCompileError = vi.fn()

    render(
      <SceneRouter
        {...sceneRouterProps({
          compileKey: '12:rialo:medium',
          onSceneCompileError,
          onSceneCompiled,
          quality: 'medium',
          transition: transitionState('idle', 'rialo', null),
        })}
      />,
    )
    await act(async () => {})

    expect(onSceneCompiled).toHaveBeenCalledWith({
      compileKey: '12:rialo:medium',
      scene: 'rialo',
      token: 8,
    })
    expect(extensionHas).toHaveBeenCalledWith('KHR_parallel_shader_compile')
    expect(compileAsync).not.toHaveBeenCalled()
    expect(events).toEqual(['layout:rialo', 'extension:KHR_parallel_shader_compile'])
    expect(onSceneCompileError).not.toHaveBeenCalled()
  })

  it('forwards extension capability query throws without invoking compileAsync or compiled callbacks', async () => {
    const extensionError = new Error('extension query failed')
    const { compileAsync, extensionHas, SceneRouter } = await createSceneRouterProbeHarness({
      extensionHasImplementation: () => {
        throw extensionError
      },
    })
    const onSceneCompiled = vi.fn()
    const onSceneCompileError = vi.fn()

    render(
      <SceneRouter
        {...sceneRouterProps({
          onSceneCompileError,
          onSceneCompiled,
        })}
      />,
    )

    await waitFor(() =>
      expect(onSceneCompileError).toHaveBeenCalledWith(
        {
          compileKey: '9:home:high',
          scene: 'home',
          token: 8,
        },
        extensionError,
      ),
    )
    expect(extensionHas).toHaveBeenCalledWith('KHR_parallel_shader_compile')
    expect(compileAsync).not.toHaveBeenCalled()
    expect(onSceneCompiled).not.toHaveBeenCalled()
  })

  it('forwards compileAsync rejection for the current ready scene', async () => {
    const { compileAsync, compileDeferreds, SceneRouter } = await createSceneRouterProbeHarness()
    const onSceneCompiled = vi.fn()
    const onSceneCompileError = vi.fn()
    const compileError = new Error('compile rejected')

    render(
      <SceneRouter
        {...sceneRouterProps({
          compileKey: '9:arc:high',
          onSceneCompileError,
          onSceneCompiled,
          transition: transitionState('idle', 'arc', null),
        })}
      />,
    )

    await waitFor(() => expect(compileAsync).toHaveBeenCalledTimes(1))
    await act(async () => {
      compileDeferreds[0].reject(compileError)
      await compileDeferreds[0].promise.catch(() => undefined)
    })

    expect(onSceneCompileError).toHaveBeenCalledWith(
      {
        compileKey: '9:arc:high',
        scene: 'arc',
        token: 8,
      },
      compileError,
    )
    expect(onSceneCompiled).not.toHaveBeenCalled()
  })

  it('forwards compileAsync synchronous throws only when the parallel shader extension is supported', async () => {
    const { compileAsync, SceneRouter } = await createSceneRouterProbeHarness()
    const onSceneCompiled = vi.fn()
    const onSceneCompileError = vi.fn()
    const compileError = new Error('compile threw')

    compileAsync.mockImplementationOnce(() => {
      throw compileError
    })

    render(
      <SceneRouter
        {...sceneRouterProps({
          compileKey: '9:home:high',
          onSceneCompileError,
          onSceneCompiled,
        })}
      />,
    )

    await waitFor(() =>
      expect(onSceneCompileError).toHaveBeenCalledWith(
        {
          compileKey: '9:home:high',
          scene: 'home',
          token: 8,
        },
        compileError,
      ),
    )
    expect(onSceneCompiled).not.toHaveBeenCalled()
  })

  it('cleans up a departing probe so old promise settlement does not call back', async () => {
    for (const settlement of ['resolve', 'reject'] as const) {
      cleanup()

      const { compileAsync, compileDeferreds, SceneRouter } = await createSceneRouterProbeHarness()
      const onSceneCompiled = vi.fn()
      const onSceneCompileError = vi.fn()
      const view = render(
        <SceneRouter
          {...sceneRouterProps({
            onSceneCompileError,
            onSceneCompiled,
          })}
        />,
      )

      await waitFor(() => expect(compileAsync).toHaveBeenCalledTimes(1))

      view.rerender(
        <SceneRouter
          {...sceneRouterProps({
            onSceneCompileError,
            onSceneCompiled,
            transition: {
              phase: 'departing',
              previousScene: 'home',
              scene: 'home',
              targetScene: 'arc',
              token: 9,
            },
          })}
        />,
      )
      await waitFor(() => expect(compileAsync).toHaveBeenCalledTimes(1))

      await act(async () => {
        if (settlement === 'resolve') {
          compileDeferreds[0].resolve()
          await compileDeferreds[0].promise
        } else {
          compileDeferreds[0].reject(new Error('stale compile rejected'))
          await compileDeferreds[0].promise.catch(() => undefined)
        }
      })

      expect(onSceneCompiled).not.toHaveBeenCalled()
      expect(onSceneCompileError).not.toHaveBeenCalled()
    }
  })

  it('starts compile only for the ready current entry while outgoing overlap is mounted', async () => {
    const { compileAsync, compileDeferreds, events, SceneRouter } = await createSceneRouterProbeHarness()
    const onSceneCompiled = vi.fn()

    render(
      <SceneRouter
        {...sceneRouterProps({
          compileKey: '9:arc:high',
          onSceneCompiled,
          transition: {
            phase: 'arriving',
            previousScene: 'home',
            scene: 'arc',
            targetScene: 'arc',
            token: 9,
          },
        })}
      />,
    )

    await waitFor(() => expect(compileAsync).toHaveBeenCalledTimes(1))
    expect(events).toEqual([
      'layout:home',
      'layout:arc',
      'extension:KHR_parallel_shader_compile',
      'compile',
    ])

    await act(async () => {
      compileDeferreds[0].resolve()
      await compileDeferreds[0].promise
    })

    expect(onSceneCompiled).toHaveBeenCalledWith({
      compileKey: '9:arc:high',
      scene: 'arc',
      token: 9,
    })
  })

  it('places the compile probe after the lazy scene in the same Suspense boundary', () => {
    const sourcePath = 'src/components/scene/scene-router.client.tsx'
    const sourceText = readFileSync(join(process.cwd(), sourcePath), 'utf8')
    const sceneHostStart = sourceText.indexOf('function SceneHost')
    const sceneRouterStart = sourceText.indexOf('export function SceneRouter')
    const sceneHostSource = sourceText.slice(sceneHostStart, sceneRouterStart)
    const lazySceneIndex = sceneHostSource.indexOf('<Scene')
    const compileProbeIndex = sceneHostSource.indexOf('<SceneCompileProbe')
    const readyProbeIndex = sceneHostSource.indexOf('<SceneReadyProbe')

    expect.soft(sceneHostStart).toBeGreaterThanOrEqual(0)
    expect.soft(sceneRouterStart).toBeGreaterThan(sceneHostStart)
    expect.soft(lazySceneIndex).toBeGreaterThanOrEqual(0)
    expect.soft(compileProbeIndex).toBeGreaterThan(lazySceneIndex)
    expect.soft(readyProbeIndex).toBeGreaterThan(compileProbeIndex)
    expect.soft(sceneHostSource).toContain('compileKey={compileKey}')
    expect.soft(sceneHostSource).toContain('onSceneCompiled={onSceneCompiled}')
    expect.soft(sceneHostSource).toContain('onSceneCompileError={onSceneCompileError}')
  })

  it('defines compileAsync as a layout-effect gate with cleanup and synchronous error forwarding', () => {
    const sourcePath = 'src/components/scene/scene-router.client.tsx'
    const sourceText = readFileSync(join(process.cwd(), sourcePath), 'utf8')
    const probeStart = sourceText.indexOf('function SceneCompileProbe')
    const hostStart = sourceText.indexOf('function SceneHost')
    const probeSource = sourceText.slice(probeStart, hostStart)

    expect.soft(probeStart).toBeGreaterThanOrEqual(0)
    expect.soft(hostStart).toBeGreaterThan(probeStart)
    expect.soft(probeSource).toContain('useLayoutEffect')
    expect.soft(probeSource).toContain('useThree((state) => state.gl)')
    expect.soft(probeSource).toContain('useThree((state) => state.camera)')
    expect.soft(probeSource).toContain('useThree((state) => state.scene)')
    expect.soft(probeSource).toContain("gl.extensions.has('KHR_parallel_shader_compile')")
    expect.soft(probeSource).toContain('gl.compileAsync(rootScene, camera)')
    expect.soft(probeSource).toContain('active = false')
    expect.soft(probeSource).toContain('onSceneCompileError')
    expect.soft(probeSource).not.toMatch(/\\b(?:fenceSync|clientWaitSync|flush|finish|LINK_STATUS)\\b/)
  })

  it('keeps exact scene accents and project ownership local to the shared enhanced scene layer', () => {
    const metadata = sceneTypes as unknown as SceneMetadataExports
    const routerImports = getImportSpecifiers('src/components/scene/scene-router.client.tsx')

    expect.soft(routerImports).not.toContain('../../content/catalog')
    expect.soft(routerImports).not.toContain('../../content/selectors')
    expect.soft(metadata.SCENE_ECOSYSTEM_ACCENTS).toStrictEqual({
      arc: '#7dd3fc',
      rialo: '#fbbf24',
    })
    expect.soft(metadata.SCENE_PROJECT_ACCENTS).toStrictEqual({
      'signal-ledger': '#38bdf8',
      hadron: '#a78bfa',
      arcpredict: '#22d3ee',
      'rialo-captain': '#f59e0b',
    })
    expect.soft(metadata.SCENE_PROJECT_ECOSYSTEMS).toStrictEqual({
      'signal-ledger': 'arc',
      hadron: 'arc',
      arcpredict: 'arc',
      'rialo-captain': 'rialo',
    })
  })

  it('defines target-specific spatial morph profiles instead of opacity-only variants', () => {
    const homeSignal = homeScene.getHomeConstellationMorphProfile?.(
      parseSceneTarget('project:signal-ledger'),
    )
    const homeRialo = homeScene.getHomeConstellationMorphProfile?.(
      parseSceneTarget('project:rialo-captain'),
    )
    const arcResearch = arcScene.getArcSceneMorphProfile?.(parseSceneTarget('project:signal-ledger'))
    const arcExchange = arcScene.getArcSceneMorphProfile?.(parseSceneTarget('project:hadron'))
    const arcForecast = arcScene.getArcSceneMorphProfile?.(parseSceneTarget('project:arcpredict'))
    const rialoObserve = rialoScene.getRialoSceneMorphProfile?.(parseSceneTarget('rialo-step:observe'))
    const rialoCover = rialoScene.getRialoSceneMorphProfile?.(parseSceneTarget('rialo-step:cover'))
    const rialoTrigger = rialoScene.getRialoSceneMorphProfile?.(parseSceneTarget('rialo-step:trigger'))

    expect(homeSignal).toEqual(expect.objectContaining({ positionX: expect.any(Number) }))
    expect(homeRialo).not.toEqual(homeSignal)
    expect(new Set([arcResearch, arcExchange, arcForecast].map((profile) => JSON.stringify(profile))).size).toBe(3)
    expect(arcResearch).toEqual(expect.objectContaining({
      rotationZ: expect.any(Number),
      scaleX: expect.any(Number),
      scaleY: expect.any(Number),
    }))
    expect(rialoTrigger).not.toEqual(rialoObserve)
    expect(rialoCover).toEqual({
      impact: 0,
      positionX: -0.06,
      positionY: -0.16,
      rotationZ: 0.14,
      scaleX: 1.1,
      scaleY: 0.9,
    })
    expect(rialoTrigger).toEqual(expect.objectContaining({ impact: 1 }))

    if (!rialoCover || !rialoTrigger) {
      throw new Error('Rialo Cover and Trigger morph profiles must be defined')
    }

    const profileDelta = (profile: typeof rialoCover) =>
      Math.abs(profile.impact ?? 0) +
      Math.abs(profile.positionX ?? 0) +
      Math.abs(profile.positionY ?? 0) +
      Math.abs(profile.rotationZ ?? 0) +
      Math.abs((profile.scaleX ?? 1) - 1) +
      Math.abs((profile.scaleY ?? 1) - 1)

    expect(profileDelta(rialoTrigger)).toBeGreaterThan(profileDelta(rialoCover) * 1.25)
  })

  it('keeps the home facade unnamed and within its seven-draw constellation budget', () => {
    const consoleError = silenceR3fDomWarnings()

    try {
      const markup = renderToStaticMarkup(
        <ConstellationField quality="high" target={null} variant="current" />,
      )

      expect(countDrawBearingTags(markup)).toBe(7)
      expect(markup).toContain('#7fb0ff')
      expect(markup).toContain('#e7a94b')

      for (const project of projects) {
        expect(markup).not.toContain(project.name)
        expect(markup).not.toContain(project.tagline)
        expect(markup).not.toContain(project.statement)
      }
    } finally {
      consoleError.restore()
    }
  })

  it('does not pass DOM-only dashed attributes to the R3F scene router group', () => {
    const consoleError = silenceR3fDomWarnings()

    try {
      const markup = renderToStaticMarkup(
        <sceneRouter.SceneRouter
          morphDurationMs={780}
          motionEnabled
          onSceneReady={vi.fn()}
          quality="high"
          reducedMotion={false}
          requestFrame={vi.fn()}
          target={null}
          transition={transitionState('idle', 'home', null)}
        />,
      )

      expect(markup).not.toContain('data-scene-router')
    } finally {
      consoleError.restore()
    }
  })

  it('drops outgoing scene overlap for low quality but keeps at most current and outgoing for high and medium', () => {
    const transition = transitionState('arriving', 'arc', 'rialo')

    expect(getSceneEntriesForQuality('low', transition).map((entry) => entry.scene)).toEqual(['arc'])
    expect(getSceneEntriesForQuality('high', transition).map((entry) => entry.scene)).toEqual(['rialo', 'arc'])
    expect(getSceneEntriesForQuality('medium', transition).map((entry) => entry.scene)).toEqual(['rialo', 'arc'])
  })

  it('keeps the previous scene render key stable when current becomes outgoing', () => {
    const beforeTransition = getSceneEntriesForQuality('high', transitionState('idle', 'rialo', null))
    const duringTransition = getSceneEntriesForQuality('high', transitionState('arriving', 'arc', 'rialo'))

    expect(beforeTransition[0]).toMatchObject({
      scene: 'rialo',
      variant: 'current',
      renderKey: 'rialo',
    })
    expect(duringTransition[0]).toMatchObject({
      scene: 'rialo',
      variant: 'outgoing',
      renderKey: beforeTransition[0].renderKey,
    })
  })

  it('filters scene targets by route semantics using catalog project ownership', () => {
    expect(filterSceneTarget('home', 'ecosystem:arc')).toEqual({ kind: 'ecosystem', ecosystem: 'arc' })
    expect(filterSceneTarget('home', 'project:rialo-captain')).toEqual({
      kind: 'project',
      project: 'rialo-captain',
    })
    expect(filterSceneTarget('home', 'rialo-step:cover')).toBeNull()

    for (const project of projects) {
      expect(filterSceneTarget('arc', `project:${project.slug}`)).toEqual(
        project.ecosystem === 'arc' ? { kind: 'project', project: project.slug } : null,
      )
      expect(filterSceneTarget('rialo', `project:${project.slug}`)).toEqual(
        project.ecosystem === 'rialo' ? { kind: 'project', project: project.slug } : null,
      )
    }

    expect(filterSceneTarget('arc', 'ecosystem:arc')).toEqual({ kind: 'ecosystem', ecosystem: 'arc' })
    expect(filterSceneTarget('arc', 'ecosystem:rialo')).toBeNull()
    expect(filterSceneTarget('arc', 'rialo-step:cover')).toBeNull()

    expect(filterSceneTarget('rialo', 'ecosystem:rialo')).toEqual({ kind: 'ecosystem', ecosystem: 'rialo' })
    expect(filterSceneTarget('rialo', 'ecosystem:arc')).toBeNull()
    expect(filterSceneTarget('rialo', 'rialo-step:cover')).toEqual({ kind: 'rialo-step', step: 'cover' })
  })

  it('keeps scene entries, render keys, and budgets independent from target-only changes', () => {
    const transition = transitionState('arriving', 'rialo', 'arc')
    const entries = getSceneEntriesForQuality('high', transition)
    const filteredTargets = entries.map((entry) => filterSceneTarget(entry.scene, 'rialo-step:cover'))

    expect(entries).toEqual(getSceneEntriesForQuality('high', transition))
    expect(entries.map((entry) => entry.renderKey)).toEqual(['arc', 'rialo'])
    expect(filteredTargets).toEqual([null, { kind: 'rialo-step', step: 'cover' }])
    expect(getTransitionBudget('high', entries)).toEqual(getTransitionBudget('high', getSceneEntriesForQuality('high', transition)))
  })
})
