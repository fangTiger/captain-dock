# Handoff Task Package — Task 14.20 Capability / Production Evidence Fix D3

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.20`
- SliceId: `capability-production-evidence-fix-d3`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after D1–D4 integration
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- Baseline aggregate: `73813544cf1e60f21f6b65deca18da007a10ec88e7e709151c2c647fe6f6b904`

## Findings

1. CapabilityGate hardcodes `webgl2:true`; Three performs two real-Canvas `getContext('webgl2')` attempts when unavailable. The contract requires one off-DOM probe and no renderer load on failure.
2. Three progressive tests read a development-only debug global while Architecture runs the changed suite against production. Production intentionally does not publish the global.
3. Task 14.19 shortened the page; at 1280×720 the scene remains visible after footer scroll, so the old offscreen precondition is false.

## Editable Files

```text
src/components/scene/capability-gate.client.tsx
src/components/scene/capability-gate.test.tsx
tests/e2e/progressive-enhancement.spec.ts
```

## Frozen Baseline SHA-256

1. `src/components/scene/capability-gate.client.tsx` — `2ef8e9f1d9553333005b78e171821c106b1e3f8d7aaac6925ca991809e736c0a`
2. `src/components/scene/capability-gate.test.tsx` — `28d9df15bed7662881000fc2e6460bacf8ee219a9a5b6de3069aaee768c6965e`
3. `tests/e2e/progressive-enhancement.spec.ts` — `6313a5ed4728ef2c7b37dd8afc070fc72654ce701615e4b16b3744a17d632cf9`

## Acceptance Criteria

1. reduced-motion/saveData perform zero WebGL probe and stay Static.
2. Other candidates perform exactly one StrictMode-safe off-DOM `webgl2` probe per capability lifecycle.
3. Probe failure immediately selects Static; enhanced scene/real Canvas never mounts and enhanced scene sentinel scripts are not requested.
4. Probe success loses/releases the temporary context when supported and then preserves High/Medium/Low selection and existing ready/failure/degrade behavior.
5. Resize, connection/media events and StrictMode effect replay do not repeat the probe; true component remount may start a new lifecycle.
6. Production keeps `__CAPTAIN_DOCK_UNIVERSE_DEBUG__` absent. Never expose debug to make tests pass.
7. Development retains precise token/frame/draw/DPR/call/triangle assertions.
8. Production equivalents are black-box and fail-closed: route→scene/ready/render-state DOM, same Canvas identity across immersive history, latest route after the full terminal window, Carrier count zero, handoff storage null, no runtime failures and debug global absent.
9. Offscreen gate first establishes and asserts real scene-layer geometry outside the viewport, then verifies pause/stability/resume; hidden lifecycle remains covered. Do not assert offscreen while the scene remains visible.
10. Do not skip production coverage without an equivalent gate.

## TDD

RED first replaces the optimistic “without a probe” unit contract with:

- unavailable = one probe, no enhanced render;
- reduced/saveData = zero;
- successful StrictMode replay/resize = one and released context.

Production E2E RED is the current `2` probe count plus missing-debug failures. Split mode using `CAPTAIN_DOCK_EXTERNAL_PRODUCTION` or an equally explicit runner fact; preserve development contracts and add production black-box equivalents.

## Forbidden

- Every file outside the three-file allowlist.
- Universe Canvas/debug publisher, Three scenes/renderer, quality algorithm, Carrier, routes/content, dependencies, Playwright config, budgets, OpenSpec/session/docs.
- Browser, build, server, ports, Lighthouse, Vercel, commit/reset/restore.

## Worker Validation

```bash
npm test -- --run src/components/scene/capability-gate.test.tsx
./node_modules/.bin/eslint src/components/scene/capability-gate.client.tsx src/components/scene/capability-gate.test.tsx tests/e2e/progressive-enhancement.spec.ts --max-warnings=0
npm run typecheck
npx playwright test tests/e2e/progressive-enhancement.spec.ts --list
git diff --check
```

Deliver RED/GREEN evidence, final hashes/aggregate, development/production matrix and remaining browser-only risk.
