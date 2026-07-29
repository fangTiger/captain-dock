# Handoff Task Package — Task 14.20 Cinematic Full-Chromium Evidence Fix D4

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.20`
- SliceId: `cinematic-full-chromium-evidence-fix-d4`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after D1–D4 integration
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- Baseline aggregate: `a69b13f1d135368d801489afe59aed23c1443768843ab0e035f6624539320813`

## Findings

- Legacy headless shell repeats a 298–316ms ANGLE first-scene draw/main-thread gap; Home opening exact repeat is 0/3 with facts-frame skew about 122–126ms. Full Chromium has no equivalent LongTask.
- The route-handoff capture load can legally trigger High→Medium. OpenSpec allows desktop High or Medium; Low/Static/null remain forbidden.
- Carrier/path/Canvas/demand/settled terminal facts otherwise pass.

## Editable Files

```text
src/test-support/cinematic-screencast-selector.ts
src/test-support/cinematic-screencast-selector.test.ts
tests/e2e/cinematic-motion.spec.ts
```

## Frozen Baseline SHA-256

1. `src/test-support/cinematic-screencast-selector.ts` — `881cb0da4ebd9f509289021dd35a5260aa596225ddc0a332bc27f1bcef020ed9`
2. `src/test-support/cinematic-screencast-selector.test.ts` — `c2d580eefa755cc49a0540a30a1237e3d7c76a143285e47536cb4119dc69822f`
3. `tests/e2e/cinematic-motion.spec.ts` — `1c4057335c1a894aa596d044f7288f757e9deb78c6f83afb219c74a1f1c07b4b`

## Acceptance Criteria

1. `cinematic-motion.spec.ts` selects full Chromium/new headless with file-top `test.use({ channel: 'chromium' })`; do not modify global Playwright config.
2. A shared fail-closed evidence-quality guard accepts only `high | medium`; rejects `low`, `static`, null, undefined and unknown strings.
3. Replace hardcoded terminal/startup `high` assertions only where the OpenSpec enhanced contract is High-or-Medium.
4. Keep all 50ms checkpoint lateness/facts-frame skew constants, epsilon tests, planned offsets, PNG dimensions, frame counts, spatial/material/terminal thresholds and 200ms feedback unchanged.
5. Do not reduce capture load, move checkpoints, change Carrier/Canvas/product CSS, or add retry/skip.

## TDD

RED first:

- source contract requires file-level full Chromium;
- selector unit tests require High/Medium acceptance and Low/Static/null rejection;
- exact current browser failures remain external RED evidence.

GREEN worker runs only unit/lint/type/list. Architecture will run exact two browser tests repeat=3, the full cinematic file and the changed suite against production 3100.

## Forbidden

- Every file outside the three-file allowlist.
- Carrier, Canvas, quality algorithm, scene code, CSS, content/routes, Playwright config, thresholds/constants, OpenSpec/session/docs.
- Browser, build, server, ports, Lighthouse, Vercel, commit/reset/restore.

## Worker Validation

```bash
npm test -- --run src/test-support/cinematic-screencast-selector.test.ts
./node_modules/.bin/eslint src/test-support/cinematic-screencast-selector.ts src/test-support/cinematic-screencast-selector.test.ts tests/e2e/cinematic-motion.spec.ts --max-warnings=0
npm run typecheck
npx playwright test tests/e2e/cinematic-motion.spec.ts --list
git diff --check
```

Deliver RED/GREEN evidence, final hashes/aggregate and explicit confirmation that no timing/spatial threshold changed.
