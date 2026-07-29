# Handoff Task Package — Task 14.17 Carrier Spine Fix 1

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.17`
- SliceId: `carrier-spine-history-hidden-fix1`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after A1/B/C integration
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- Baseline aggregate: `98d64d3999d8bf1030b5f04ef0f42e2bf2a82ffc7086ec91034b47d55d815fe3`

## Review Finding

Architecture 的只读静态审计对 Slice A 给出 `FIX_REQUIRED`：

1. source bridge 能在 `visibilitychange:hidden` 收口，但 destination `CinematicDetailArrival` 没有同等处理，后台 timer 被节流时会残留 actor。
2. marker handoff 的 120ms depart window 内若发生 `popstate` / pathname history change，旧 timer 或 unmount cleanup 仍可能 `router.push` 旧 destination；详情 arrival 真正卸载时也未清除 storage/direction map，forward 可重播 stale actor。
3. CSS 虽已是 transparent fixed full-viewport root，测试尚未 fail-closed 冻结 `position:fixed` 和真实 viewport rect。

## Editable Files

```text
src/components/scene/cinematic-navigation-bridge.client.tsx
src/components/scene/cinematic-navigation-bridge.test.tsx
tests/e2e/cinematic-motion.spec.ts
```

## Frozen Baseline SHA-256

按 Editable Files 顺序：

1. `src/components/scene/cinematic-navigation-bridge.client.tsx` — `3f3c31653e440d26157831f3650af54607f4b6aa5cff69067454bb51a3a41e1d`
2. `src/components/scene/cinematic-navigation-bridge.test.tsx` — `11efbc7786fd4238a532060125411e7ca63576bdd67bca4ba281eb971a00d303`
3. `tests/e2e/cinematic-motion.spec.ts` — `eebb530ee7c915f852dc1c42d2667a09488c28a5b36d9db7fe3d68fa51e457ef`

## Acceptance Criteria

1. marker handoff 启动后、`router.push` 前发生 `popstate` 或不同 pathname history 导航时，立即取消旧 rAF/timers、清除 pending destination、matching storage/direction 和 actor；之后推进到 600ms 也不得 push 旧 destination。
2. bridge 的真实卸载不再强推 pending destination；全局 Header/Footer/history 导致的卸载保持原生目标，且 matching handoff 被清除。
3. source 自身在 120ms 调用既有 `router.push` 前继续先清空 pending destination，因此正常 Home/Arc/Rialo/详情 handoff 的同 token 连续性不变。
4. detail arrival 在 `visibilitychange:hidden` 时立即进入 settled/progress 1、移除 actor并清除 matching storage/direction。
5. detail arrival 真正卸载时清除 matching storage/direction，后退再前进不得重播；React StrictMode effect replay 必须仍保留同一一次性 arrival。
6. StrictMode-safe cleanup 使用 token-scoped active lease/refcount 加 microtask terminal check，或同等可证明机制；不得新增 storage 字段、任意等待时长或全局永久 listener。
7. direct、expired、destination mismatch、reduced-motion、rapid latest-token、600/120ms、五字段 storage schema 与三方向保持不变。
8. 单元 CSS source gate 断言 `.carrierRoot` 为 transparent、`position: fixed`、`inset: 0`、pointer-none。
9. 现有 120/300/480ms Chromium helper 对 carrier root 额外断言 computed position fixed、透明背景、pointer-events none，root rect 以最多 1px 容差覆盖当前 viewport；面积仍只计算 track/mass/signal 并保持 ≤35%。
10. 不修改 Carrier CSS、project case、Canvas/transition/storage schema、routes、content、links、dependencies 或 thresholds。

## TDD Requirements

RED 必须先证明：

- source click 后立即派发 `popstate`，推进超过 600ms 后旧 destination 仍被错误 push，actor/storage 仍可能残留。
- detail actor 已进入 `entering` 后切换 document hidden，当前 actor 仍存在。
- detail actor 已进入 `entering` 后真实 unmount，再 mount 同 destination 会重播 stale actor。
- CSS source gate 当前没有 fixed/inset 断言；E2E helper 当前没有 root viewport rect/computed-style gate。

GREEN 必须同时证明：

- source history cancel 不影响普通 120ms router push。
- detail hidden/unmount terminal 与 StrictMode replay one-shot 同时成立。
- 所有清理按 matching token fail-closed，旧 cleanup 不得删除更新 token。
- 不注册重复 document/window listener；effect cleanup 完整。

## Forbidden Files / Actions

- 上述三个文件之外的全部文件。
- 特别禁止 Carrier CSS、project case/gallery/signature、Home/Arc/Rialo、transition-machine、tokens、Canvas、scene controller、OpenSpec/session/docs/config、catalog/routes/metadata/links。
- 禁止 browser、build、server、任何端口（含 3100/3000）、Lighthouse、Vercel、commit、reset、restore。

## Worker Validation

```bash
npm test -- --run src/components/scene/cinematic-navigation-bridge.test.tsx

./node_modules/.bin/eslint \
  src/components/scene/cinematic-navigation-bridge.client.tsx \
  src/components/scene/cinematic-navigation-bridge.test.tsx \
  tests/e2e/cinematic-motion.spec.ts \
  --max-warnings=0

npm run typecheck
npx playwright test tests/e2e/cinematic-motion.spec.ts --list
git diff --check
```

## Deliverables

- RED/GREEN 命令与失败/通过数量。
- 三文件最终 SHA-256 与 allowlist-ordered aggregate。
- 十条 acceptance 的逐项覆盖。
- StrictMode lease/cleanup 机制说明与残余 browser-only 风险。
- 明确确认无 scope expansion，未运行 browser/build/server/端口/Vercel/commit。
