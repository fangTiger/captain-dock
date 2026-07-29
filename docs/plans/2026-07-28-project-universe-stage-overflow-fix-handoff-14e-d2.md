# Handoff Task Package — Task 14.20 Stage Overflow Fix D2

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.20`
- SliceId: `stage-accent-overflow-fix-d2`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after D1–D4 integration
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- Baseline aggregate: `2f42c0a62f3eca9fcf66a159465749df31a2200fbe642d780548eb87bd5a3d66`

## Finding

The Home/Arc radial accent pseudos use `inset-inline: calc(50% - 50vw)`. This creates real internal overflow:

- 1920: stage `1440/1680`, main `1568/1744`
- Home 320: stage `288/304`

Removing only that inline bleed in a live one-variable probe returns exact client/scroll equality without moving the machine, horizon or planes. Carrier is absent and not causal.

## Editable Files

```text
src/components/stage/instrument-stage.module.css
src/components/stage/instrument-stage.test.tsx
src/components/stage/home-instrument-stage.test.tsx
src/components/stage/arc-instrument-stage.test.tsx
tests/e2e/responsive.spec.ts
```

## Frozen Baseline SHA-256

1. `src/components/stage/instrument-stage.module.css` — `56bc6dd9643e7d2f0bf52a15961c2e70073d8006d59f563c57a2824a6c1c8429`
2. `src/components/stage/instrument-stage.test.tsx` — `b8bafc9de349d98836dbef1ac2b1e77735d21ca6269f11b42be2cde78d544db9`
3. `src/components/stage/home-instrument-stage.test.tsx` — `9f1e2137790fe2d66f964bab56810d1ff9655cc008beeff7d2d1f978a08da193`
4. `src/components/stage/arc-instrument-stage.test.tsx` — `977b762e7060b6de10efd803c560bf2a8287832848efbf92cb07f61c2e6d72b5`
5. `tests/e2e/responsive.spec.ts` — `ff907da6fda63215b3ef47caf77e1cf059038b79cebdcd35b7b17ff0813710ac`

## Acceptance Criteria

1. Delete only the two Home/Arc `inset-inline: calc(50% - 50vw)` overrides. Existing earlier `inset:0` owns the horizontal bounds.
2. Preserve both radial pseudos, negative block-start feather, gradients, opacity, z-index and Home 220/780ms accent transition.
3. Preserve Home mass/outline/horizon/planes and Arc machine geometry, ambient owner amplitudes, negative delay and transform/opacity-only rules.
4. Home/Arc at 1920 have stage/main `scrollWidth <= clientWidth + 1`; Home at 320 has stage equality within 1px.
5. Do not add overflow hidden/clip to stage/main/global, shrink instruments, change max-width, or touch Carrier.
6. Existing 320–1920, 44px, whole-word, stage→footer and reduced-motion geometry gates remain strict.

## TDD

RED first updates the three unit source contracts to reject `50vw`/negative horizontal inset while still requiring radial fields and no dark board/clip/mask/filter. Current responsive browser failures are the real RED.

GREEN changes one production CSS file only. E2E changes are limited to clearer fail-closed pseudo/style/internal-scroll evidence; do not weaken any existing geometry threshold.

## Forbidden

- Every file outside the five-file allowlist.
- Home/Arc TSX, UniverseShell/Carrier, global/universe-page CSS, Rialo, Canvas/Three, routes/content/links, dependencies/config/OpenSpec/session/docs.
- Browser, build, server, ports, Lighthouse, Vercel, commit/reset/restore.

## Worker Validation

```bash
npm test -- --run src/components/stage/instrument-stage.test.tsx src/components/stage/home-instrument-stage.test.tsx src/components/stage/arc-instrument-stage.test.tsx
./node_modules/.bin/eslint src/components/stage/instrument-stage.test.tsx src/components/stage/home-instrument-stage.test.tsx src/components/stage/arc-instrument-stage.test.tsx tests/e2e/responsive.spec.ts --max-warnings=0
npm run typecheck
npx playwright test tests/e2e/responsive.spec.ts --list
git diff --check
```

Deliver RED/GREEN evidence, final hashes/aggregate and explicit no-overflow-hiding confirmation.
