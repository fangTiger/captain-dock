# Handoff Task Package — Task 14.20 Stage-Local Static Visual Contract E3

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.20`
- SliceId: `stage-local-static-visual-contract-e3`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after E2/E3 integration
- GitBaseline: `UNBORN_HEAD`
- SessionStatePath: `.codex/session-state.md`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- OpenSpec: design §21.7 and site-quality stage-local radial / baseline migration scenarios
- Baseline aggregate: `b97a66e889f875717d91655eae2a53a1bf6b2f44701c09733a2772ce190c9540`

## Architecture RED

In the full production matrix, Home/Arc Static cases fail before screenshot comparison:

- desktop pseudo left edge: `57.59375px`
- mobile pseudo left edge: `16px`
- obsolete expectation: viewport edge `<=1px`

Those values are the approved stage/page gutter. D2 removed `calc(50% - 50vw)` and design §21.5 requires the radial pseudo to remain at stage-local `inset:0` without main/stage horizontal overflow or clipping. The product behavior is correct; the visual evidence contract is stale.

The same run also proves old Task13 snapshots are not accepted Task14 candidates:

- Rialo 1440 and SIGNAL/LEDGER 1440 reach pixel mismatch after structural checks.
- Home/Arc snapshot comparison is currently masked by the stale structure assertion.
- Rialo 390 is intentionally absent. Playwright automatically wrote a file while reporting the missing expected image; Architecture removed that unaccepted artifact. Its candidate remains recoverable in `.next/playwright/test-results`.

## Editable Files

```text
tests/e2e/visual-reference.spec.ts
```

## Frozen Baseline SHA-256

- spec — `926922dbf04b21d868c5b872f91c0de1bbaa1a1533185650f899ba5feb384755`
- one-file ordered aggregate — `b97a66e889f875717d91655eae2a53a1bf6b2f44701c09733a2772ce190c9540`

## Acceptance Criteria

1. Replace the obsolete “light field covers viewport” helper/labels with a stage-contained contract.
2. For Home and Arc, resolve `::after` inline insets and require both to be `0px` within numeric epsilon; projected pseudo left/right edges must match the stage rect within 1px.
3. Require the pseudo background to retain a radial gradient and remain visible; do not accept `none`, zero opacity or a deleted pseudo.
4. Fail closed if document/body/main/stage has positive horizontal overflow beyond 1px.
5. Fail closed if product code relies on `overflow-x:hidden|clip` or equivalent clipping to satisfy the contract.
6. Preserve all existing open-surface, structural, route, Static/reduced-motion, runtime-failure and seven-reference assertions.
7. Do not edit, create, delete, copy or update any snapshot binary. Rialo 390 expected remains absent until professional Art Director GO.
8. Do not modify product CSS/DOM to make this test pass and do not relax screenshot comparison.

## Evidence Workflow

The current four Home/Arc geometry failures are the RED evidence. Worker performs the one-file contract migration and static validation only. Architecture will run the real browser:

1. all structural assertions must pass;
2. failures may then be only seven expected snapshot mismatch/missing results;
3. Architecture saves actuals outside the snapshot directory;
4. independent Review PASS and Art Director GO are required before Architecture updates all seven binaries;
5. fresh no-update visual/full E2E must then pass.

## Forbidden

- Every file outside `tests/e2e/visual-reference.spec.ts`.
- All snapshot binaries, product source/CSS, cinematic/performance/responsive tests, OpenSpec/session/docs/config.
- `--update-snapshots`, browser, build, server, ports, Lighthouse, Vercel, commit/reset/restore.
- Any screenshot threshold, retry, skip or viewport change.

## Worker Validation

```bash
./node_modules/.bin/eslint tests/e2e/visual-reference.spec.ts --max-warnings=0
npm run typecheck
npx playwright test tests/e2e/visual-reference.spec.ts --list
git diff --check
```

Deliver the exact source change, static validation, final hash/aggregate, and explicit proof that all seven snapshot paths remain byte-identical/absent as frozen.
