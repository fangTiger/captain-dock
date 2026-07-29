import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  ScriptKind,
  ScriptTarget,
  createSourceFile,
  isImportDeclaration,
  isStringLiteral,
} from 'typescript'

import {
  SceneTargetController,
  useSceneTargetController,
} from './scene-target-controller.client'
import { serializeSceneTarget } from './scene-target'
import type { ImmersiveSceneId, SceneTarget } from './scene-types'

function targetValue(target: SceneTarget | null) {
  return target ? serializeSceneTarget(target) : ''
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

function ControllerProbe() {
  const {
    announcementTarget,
    clearPreviewTarget,
    commitRevision,
    commitTarget,
    committedTarget,
    effectiveTarget,
    motionMode,
    previewTarget,
    setPreviewTarget,
  } = useSceneTargetController()
  const committedValue = targetValue(committedTarget)

  return (
    <main>
      <p data-testid="committed-target">{committedValue}</p>
      <p data-testid="commit-revision">{commitRevision}</p>
      <p data-testid="preview-target">{targetValue(previewTarget)}</p>
      <p data-testid="effective-target">{targetValue(effectiveTarget)}</p>
      <p data-testid="motion-mode">{motionMode}</p>
      <h1>{`Heading ${committedValue}`}</h1>
      <a href={`/case/${committedValue}`}>{`CTA ${committedValue}`}</a>
      <button
        aria-pressed={committedValue === 'project:hadron'}
        onClick={() => commitTarget('project:hadron')}
        type="button"
      >
        Commit HADRON
      </button>
      <button
        onClick={() => commitTarget('project:arcpredict')}
        type="button"
      >
        Commit ArcPredict
      </button>
      <button
        onClick={() => commitTarget('project:rialo-captain')}
        type="button"
      >
        Commit Rialo Captain
      </button>
      <button
        onClick={() => commitTarget('project:not-real')}
        type="button"
      >
        Commit unknown
      </button>
      <button
        onFocus={() => setPreviewTarget('project:hadron', 'focus')}
        onBlur={() => clearPreviewTarget('focus')}
        type="button"
      >
        Focus preview HADRON
      </button>
      <button
        onPointerEnter={() => setPreviewTarget('project:arcpredict', 'pointer')}
        onPointerLeave={() => clearPreviewTarget('pointer')}
        type="button"
      >
        Pointer preview ArcPredict
      </button>
      <button
        onPointerEnter={() => setPreviewTarget('project:not-real', 'pointer')}
        type="button"
      >
        Preview unknown
      </button>
      <p aria-live="polite" role="status">
        {announcementTarget ? `Committed ${targetValue(announcementTarget)}` : ''}
      </p>
    </main>
  )
}

function MatchingTargetPreviewProbe({
  differentTarget,
  target,
}: Readonly<{
  differentTarget: string
  target: string
}>) {
  const {
    announcementTarget,
    clearPreviewTarget,
    commitRevision,
    commitTarget,
    committedTarget,
    effectiveTarget,
    motionMode,
    previewTarget,
    setPreviewTarget,
  } = useSceneTargetController()

  return (
    <main>
      <p data-testid="committed-target">{targetValue(committedTarget)}</p>
      <p data-testid="commit-revision">{commitRevision}</p>
      <p data-testid="preview-target">{targetValue(previewTarget)}</p>
      <p data-testid="effective-target">{targetValue(effectiveTarget)}</p>
      <p data-testid="motion-mode">{motionMode}</p>
      <p data-testid="announcement-target">{targetValue(announcementTarget)}</p>
      <button onClick={() => commitTarget(target)} type="button">
        Commit matching target
      </button>
      <button
        onBlur={() => clearPreviewTarget('focus')}
        onFocus={() => setPreviewTarget(target, 'focus')}
        type="button"
      >
        Focus matching target
      </button>
      <button
        onPointerEnter={() => setPreviewTarget(target, 'pointer')}
        onPointerLeave={() => clearPreviewTarget('pointer')}
        type="button"
      >
        Pointer matching target
      </button>
      <button
        onBlur={() => clearPreviewTarget('focus')}
        onFocus={() => setPreviewTarget(differentTarget, 'focus')}
        type="button"
      >
        Focus different target
      </button>
    </main>
  )
}

function renderController(
  scene: ImmersiveSceneId,
  children: ReactNode = <ControllerProbe />,
) {
  return render(
    <SceneTargetController scene={scene}>
      {children}
    </SceneTargetController>,
  )
}

afterEach(() => {
  cleanup()
})

describe('SceneTargetController', () => {
  it('keeps the enhanced controller independent from the full content catalog and selectors', () => {
    const controllerImports = getImportSpecifiers(
      'src/components/scene/scene-target-controller.client.tsx',
    )

    expect.soft(controllerImports).not.toContain('../../content/catalog')
    expect.soft(controllerImports).not.toContain('../../content/selectors')
  })

  it.each([
    ['home', 'project:signal-ledger'],
    ['arc', 'project:signal-ledger'],
    ['rialo', 'rialo-step:observe'],
  ] as const)('uses the %s route default as the initial committed and effective target', (scene, expected) => {
    renderController(scene)

    expect(screen.getByTestId('committed-target')).toHaveTextContent(expected)
    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent(expected)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('applies preview over committed over default without changing semantic state or the live region', () => {
    renderController('home')
    const focusPreview = screen.getByRole('button', { name: 'Focus preview HADRON' })
    const pointerPreview = screen.getByRole('button', { name: 'Pointer preview ArcPredict' })

    fireEvent.focus(focusPreview)

    expect(screen.getByTestId('preview-target')).toHaveTextContent('project:hadron')
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:hadron')
    expect(screen.getByRole('heading')).toHaveTextContent('project:signal-ledger')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/case/project:signal-ledger')
    expect(screen.getByRole('button', { name: 'Commit HADRON' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    fireEvent.pointerEnter(pointerPreview)
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:arcpredict')

    fireEvent.pointerLeave(pointerPreview)
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:hadron')
    expect(screen.getByTestId('motion-mode')).toHaveTextContent('preview')
    expect(screen.getByTestId('commit-revision')).toHaveTextContent('0')

    fireEvent.blur(focusPreview)
    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:signal-ledger')
    expect(screen.getByTestId('motion-mode')).toHaveTextContent('preview')
    expect(screen.getByTestId('commit-revision')).toHaveTextContent('0')
  })

  it('commits stable semantic state and exposes at most one live region update target per commit', () => {
    renderController('home')

    fireEvent.click(screen.getByRole('button', { name: 'Commit HADRON' }))

    expect(screen.getByTestId('committed-target')).toHaveTextContent('project:hadron')
    expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:hadron')
    expect(screen.getByRole('heading')).toHaveTextContent('project:hadron')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/case/project:hadron')
    expect(screen.getByRole('button', { name: 'Commit HADRON' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Committed project:hadron')

    fireEvent.click(screen.getByRole('button', { name: 'Commit HADRON' }))
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Committed project:hadron')
    expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
  })

  it.each([
    ['home', 'project:hadron', 'project:signal-ledger'],
    ['rialo', 'rialo-step:cover', 'rialo-step:observe'],
  ] as const)(
    'keeps committed %s motion stable when focus and pointer preview the same %s target',
    (scene, target, differentTarget) => {
      renderController(
        scene,
        <MatchingTargetPreviewProbe differentTarget={differentTarget} target={target} />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Commit matching target' }))

      expect(screen.getByTestId('committed-target')).toHaveTextContent(target)
      expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
      expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
      expect(screen.getByTestId('effective-target')).toHaveTextContent(target)
      expect(screen.getByTestId('motion-mode')).toHaveTextContent('commit')
      expect(screen.getByTestId('announcement-target')).toHaveTextContent(target)

      const focusTarget = screen.getByRole('button', { name: 'Focus matching target' })
      const pointerTarget = screen.getByRole('button', { name: 'Pointer matching target' })

      fireEvent.focus(focusTarget)

      expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
      expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
      expect(screen.getByTestId('effective-target')).toHaveTextContent(target)
      expect(screen.getByTestId('motion-mode')).toHaveTextContent('commit')
      expect(screen.getByTestId('announcement-target')).toHaveTextContent(target)

      fireEvent.pointerEnter(pointerTarget)

      expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
      expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
      expect(screen.getByTestId('effective-target')).toHaveTextContent(target)
      expect(screen.getByTestId('motion-mode')).toHaveTextContent('commit')
      expect(screen.getByTestId('announcement-target')).toHaveTextContent(target)

      fireEvent.pointerLeave(pointerTarget)

      expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
      expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
      expect(screen.getByTestId('effective-target')).toHaveTextContent(target)
      expect(screen.getByTestId('motion-mode')).toHaveTextContent('commit')
      expect(screen.getByTestId('announcement-target')).toHaveTextContent(target)

      fireEvent.blur(focusTarget)

      expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
      expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
      expect(screen.getByTestId('effective-target')).toHaveTextContent(target)
      expect(screen.getByTestId('motion-mode')).toHaveTextContent('commit')
      expect(screen.getByTestId('announcement-target')).toHaveTextContent(target)
    },
  )

  it('keeps a committed Rialo target inert when same-target modalities clear in reverse order', () => {
    const target = 'rialo-step:cover'

    renderController(
      'rialo',
      <MatchingTargetPreviewProbe differentTarget="rialo-step:observe" target={target} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Commit matching target' }))
    const focusTarget = screen.getByRole('button', { name: 'Focus matching target' })
    const pointerTarget = screen.getByRole('button', { name: 'Pointer matching target' })

    fireEvent.focus(focusTarget)
    fireEvent.pointerEnter(pointerTarget)
    fireEvent.blur(focusTarget)

    expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent(target)
    expect(screen.getByTestId('motion-mode')).toHaveTextContent('commit')
    expect(screen.getByTestId('announcement-target')).toHaveTextContent(target)

    fireEvent.pointerLeave(pointerTarget)

    expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent(target)
    expect(screen.getByTestId('motion-mode')).toHaveTextContent('commit')
    expect(screen.getByTestId('announcement-target')).toHaveTextContent(target)
  })

  it('preserves preview return and dual-modality fallback around a committed Rialo target', () => {
    const committedTarget = 'rialo-step:cover'
    const differentTarget = 'rialo-step:observe'

    renderController(
      'rialo',
      <MatchingTargetPreviewProbe
        differentTarget={differentTarget}
        target={committedTarget}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Commit matching target' }))
    const differentFocus = screen.getByRole('button', { name: 'Focus different target' })
    const matchingPointer = screen.getByRole('button', { name: 'Pointer matching target' })

    fireEvent.focus(differentFocus)

    expect(screen.getByTestId('preview-target')).toHaveTextContent(differentTarget)
    expect(screen.getByTestId('effective-target')).toHaveTextContent(differentTarget)
    expect(screen.getByTestId('motion-mode')).toHaveTextContent('preview')

    fireEvent.pointerEnter(matchingPointer)

    expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent(committedTarget)
    expect(screen.getByTestId('motion-mode')).toHaveTextContent('preview')
    expect(screen.getByTestId('announcement-target')).toHaveTextContent(committedTarget)

    fireEvent.pointerLeave(matchingPointer)

    expect(screen.getByTestId('preview-target')).toHaveTextContent(differentTarget)
    expect(screen.getByTestId('effective-target')).toHaveTextContent(differentTarget)
    expect(screen.getByTestId('motion-mode')).toHaveTextContent('preview')

    fireEvent.blur(differentFocus)

    expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent(committedTarget)
    expect(screen.getByTestId('motion-mode')).toHaveTextContent('preview')
    expect(screen.getByTestId('announcement-target')).toHaveTextContent(committedTarget)
  })

  it('clears both preview modalities on commit and keeps a repeated committed target inert', () => {
    renderController('home')
    const focusPreview = screen.getByRole('button', { name: 'Focus preview HADRON' })
    const pointerPreview = screen.getByRole('button', { name: 'Pointer preview ArcPredict' })

    fireEvent.focus(focusPreview)
    fireEvent.pointerEnter(pointerPreview)

    expect(screen.getByTestId('preview-target')).toHaveTextContent('project:arcpredict')
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:arcpredict')

    fireEvent.click(screen.getByRole('button', { name: 'Commit HADRON' }))

    expect(screen.getByTestId('committed-target')).toHaveTextContent('project:hadron')
    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:hadron')
    expect(screen.getByTestId('motion-mode')).toHaveTextContent('commit')

    fireEvent.pointerLeave(pointerPreview)
    fireEvent.blur(focusPreview)

    expect(screen.getByTestId('motion-mode')).toHaveTextContent('commit')
    expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:hadron')

    fireEvent.focus(focusPreview)
    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:hadron')
    expect(screen.getByTestId('motion-mode')).toHaveTextContent('commit')

    fireEvent.click(screen.getByRole('button', { name: 'Commit HADRON' }))

    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:hadron')
    expect(screen.getByTestId('commit-revision')).toHaveTextContent('1')
  })

  it('resets synchronously to each route default and keeps only the final rapid commit', () => {
    const { rerender } = renderController('home')

    fireEvent.click(screen.getByRole('button', { name: 'Commit HADRON' }))
    fireEvent.click(screen.getByRole('button', { name: 'Commit ArcPredict' }))

    expect(screen.getByTestId('committed-target')).toHaveTextContent('project:arcpredict')
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:arcpredict')
    expect(screen.getByRole('status')).toHaveTextContent('Committed project:arcpredict')

    rerender(
      <SceneTargetController scene="rialo">
        <ControllerProbe />
      </SceneTargetController>,
    )

    expect(screen.getByTestId('committed-target')).toHaveTextContent('rialo-step:observe')
    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent('rialo-step:observe')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('fails closed for unknown and route-incompatible preview or commit targets', () => {
    renderController('arc')

    fireEvent.click(screen.getByRole('button', { name: 'Commit Rialo Captain' }))
    expect(screen.getByTestId('committed-target')).toHaveTextContent('project:signal-ledger')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    fireEvent.click(screen.getByRole('button', { name: 'Commit unknown' }))
    expect(screen.getByTestId('committed-target')).toHaveTextContent('project:signal-ledger')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Preview unknown' }))
    expect(screen.getByTestId('preview-target')).toBeEmptyDOMElement()
    expect(screen.getByTestId('effective-target')).toHaveTextContent('project:signal-ledger')

    cleanup()
    renderController('rialo')

    fireEvent.click(screen.getByRole('button', { name: 'Commit HADRON' }))
    expect(screen.getByTestId('committed-target')).toHaveTextContent('rialo-step:observe')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    fireEvent.click(screen.getByRole('button', { name: 'Commit Rialo Captain' }))
    expect(screen.getByTestId('committed-target')).toHaveTextContent('project:rialo-captain')
    expect(screen.getByRole('status')).toHaveTextContent('Committed project:rialo-captain')
  })

  it('fails fast when the hook is used outside its provider', () => {
    expect(() => render(<ControllerProbe />)).toThrow(
      'useSceneTargetController must be used within SceneTargetController',
    )
  })
})
