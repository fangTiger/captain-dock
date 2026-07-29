# Handoff Task Package — Task 14.20 Detail Carrier Initial-State Fix E1

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.20`
- SliceId: `detail-carrier-initial-state-fix-e1`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after Architecture static verification
- GitBaseline: `UNBORN_HEAD`
- SessionStatePath: `.codex/session-state.md`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- OpenSpec: existing Carrier Spine continuity requirements are authoritative; this is a bugfix restoring the approved same-token/target/progress behavior, so no spec delta is required
- Baseline aggregate: `9f5dffe412332a3ba5110a443f45dd818c5f74871fa6f557afcae85182f0ff6c`

## Production Diagnosis

The exact full-Chromium repeat exposed a real destination-mount gap:

1. At the 80ms checkpoint Home publishes `departing`, progress `0.1215`, one carrier and token `1785199638493`.
2. At the 120ms checkpoint the detail route is mounted but publishes the default `idle/progress=1/token=0`, no carrier and `caseArrival=settled`.
3. At the 220ms checkpoint it recovers the original token and publishes `arriving/progress=0.3673`, then remains monotonic to terminal.

All failing-frame checkpoint lateness is at most 27.78ms, facts/frame skew is at most 5.61ms and facts versions increase. The handoff record is intact. The defect is `CinematicDetailArrival` rendering its default settled state before it projects the valid persisted `start`.

Evidence: `/private/tmp/captain-dock-diag-detail-progress-14e-repeat8.json`.

The separate cold full-Chromium checkpoint-lateness/timestamp issue is not owned by this slice and must not be hidden or used to weaken the 50ms gate.

## Editable Files

```text
src/components/scene/cinematic-navigation-bridge.client.tsx
src/components/scene/cinematic-navigation-bridge.test.tsx
```

## Frozen Baseline SHA-256

1. `src/components/scene/cinematic-navigation-bridge.client.tsx` — `ba246e8c59762d583bc5e213dde765e1edf89ed0aac617bd3ee56766c8b3f628`
2. `src/components/scene/cinematic-navigation-bridge.test.tsx` — `8a3a7723a1ab0384070442f30da9eb573ba9aa051b3d29ca641973cf3006c595`

## Acceptance Criteria

1. When a valid non-reduced persisted detail handoff exists, the first observable destination state is `entering` with the same destination, direction, target and token.
2. Initial destination progress is derived from the persisted absolute `start`, is at least the last source progress and remains below `1`; subsequent rAF updates are monotonic and use the existing 600ms timeline.
3. There is no observable `settled/progress=1/token=0` frame between a valid source handoff and its destination arrival.
4. Direct loads, SSR, expired/mismatched handoffs, reduced motion, hidden-document completion, true unmount cleanup and StrictMode effect replay retain their existing static/fail-closed semantics.
5. Keep the start-only sessionStorage schema. Do not persist progress, add a second state machine, query business state from the DOM, or change the 120ms departure / 600ms total constants.
6. Render-time initialization must not destructively consume or clear storage. Effect ownership, token lease cleanup and stale-token cleanup remain explicit and StrictMode-safe.
7. No public copy, routes, project data, CSS, Canvas, capability logic or production debug surface changes.

## TDD

RED first in the existing “resumes detail arrival” contract:

- after destination `render()` and before advancing any timer, assert `entering`, the original nonzero token/target/direction, progress greater than or equal to source progress and less than `1`, and one carrier actor;
- retain the later monotonic/settled assertions and all StrictMode/direct-load/expired/hidden/unmount coverage;
- the current implementation must fail with `settled/progress=1/token=0`.

GREEN with the minimum production change that projects a valid handoff into the initial observable detail state and lets the existing effect/rAF own continuation and cleanup.

## Forbidden

- Every file outside the two-file allowlist.
- `tests/e2e/cinematic-motion.spec.ts`, selector/support files, OpenSpec, session-state, docs, CSS, scene/Canvas code and configuration.
- Any threshold, checkpoint, planned offset, frame count, retry, skip or timeout change.
- Browser, build, server, port, Lighthouse, Vercel, commit, reset or restore actions.

## Worker Validation

```bash
npm test -- --run src/components/scene/cinematic-navigation-bridge.test.tsx
./node_modules/.bin/eslint src/components/scene/cinematic-navigation-bridge.client.tsx src/components/scene/cinematic-navigation-bridge.test.tsx --max-warnings=0
npm run typecheck
npx playwright test tests/e2e/cinematic-motion.spec.ts --list
git diff --check
```

Deliver exact RED/GREEN evidence, final individual hashes and ordered aggregate. Confirm that both files matched the frozen baseline before editing and that no timing/evidence threshold changed.
