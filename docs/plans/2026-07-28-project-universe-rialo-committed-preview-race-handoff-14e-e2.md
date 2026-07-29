# Handoff Task Package — Task 14.20 Rialo Committed/Preview Race Fix E2

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.20`
- SliceId: `rialo-committed-preview-race-fix-e2`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after E2/E3 integration
- GitBaseline: `UNBORN_HEAD`
- SessionStatePath: `.codex/session-state.md`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- OpenSpec: design §21.7 and progressive visual same-committed scenario
- Baseline aggregate: `8e94d9049bee00809f4668bc0d9985912db1a502a659a3310f948e6ff22c7d63`

## Production RED and Diagnosis

The final 116-test production matrix returned one non-snapshot product failure:

```text
Rialo Cover morph material steps: expected >=4, received 2
```

The committed DOM event remains 780ms. The race is controller-only:

1. Cover commit publishes `motionMode=commit`, revision `+1`.
2. A late same-target focus/pointer enter stores a phantom preview source.
3. Its blur/pointer leave calls `updatePreviewState`, which unconditionally publishes `motionMode=preview`.
4. Shell therefore sends `preview=false + morphMode=preview`; Canvas legitimately treats this identity as a 220ms preview return and truncates the 780ms commit.

The changed suite sometimes passes because the late input ordering is scheduler-dependent. The frozen cinematic E2E and all four-step/50ms thresholds are correct.

## Editable Files

```text
src/components/scene/scene-target-controller.client.tsx
src/components/scene/scene-target-controller.test.tsx
```

## Frozen Baseline SHA-256

1. client — `44fff3042ba2894b759aec5a7b9f038ef548381e4ae3299f890a5ac067937afb`
2. test — `72b721ae09c34d1988582216e197f5b1632dcc780aa0d1ed5fb5019bdb296fd7`

## Acceptance Criteria

1. With no true different-target visual preview active, focus/pointer enter on the current committed target is a true state no-op: it stores no phantom source and does not change `motionMode`, effective target, commit revision or announcement.
2. The corresponding blur/pointer leave in either order is also a no-op and keeps `motionMode=commit`.
3. If another modality currently previews a genuinely different target, entering the committed target may end that visual preview through the existing 220ms preview-return semantics; clearing it may reveal the still-active different-target modality. Dual-modality fallback remains deterministic.
4. A true different-target preview and its final clear still use `motionMode=preview`, including the 220ms return to committed.
5. Commit continues to clear both preview modalities, increments revision once only for a new committed target and does not duplicate the live announcement.
6. Unknown/route-incompatible targets remain fail-closed.
7. No change to UniverseShell, UniverseCanvas, Canvas/Three scenes, Rialo DOM/CSS, route state, 780/220ms constants, cinematic E2E, screenshots or evidence thresholds.

## TDD

RED first:

- commit Rialo Cover;
- send same-target focus and pointer enter after commit;
- pointer leave while focus remains, then blur; current code must fail because it publishes `preview`;
- cover the reverse clear order;
- assert no phantom preview, revision remains `1`, effective target remains Cover and mode remains `commit`;
- add/retain a dual-modality different-target case proving legitimate preview-return remains `preview`.

GREEN with the minimum controller state transition. Do not patch Canvas to reinterpret `preview=false`, because that combination is valid while returning from a true different-target preview.

## Forbidden

- Every file outside the two-file allowlist.
- UniverseShell/Canvas/finite morph/scenes/stages/CSS, cinematic E2E, visual spec/snapshots, OpenSpec/session/docs/config.
- Threshold, timing, retry, skip, checkpoint or browser-channel changes.
- Browser, build, server, ports, Lighthouse, Vercel, commit, reset or restore.

## Worker Validation

```bash
npm test -- --run src/components/scene/scene-target-controller.test.tsx
./node_modules/.bin/eslint src/components/scene/scene-target-controller.client.tsx src/components/scene/scene-target-controller.test.tsx --max-warnings=0
npm run typecheck
npx playwright test tests/e2e/cinematic-motion.spec.ts --list
git diff --check
```

Deliver exact RED/GREEN evidence, final hashes/aggregate, unchanged constants/evidence confirmation and residual browser risk.
