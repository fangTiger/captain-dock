# Handoff Task Package — Task 14.16 Cold Bootstrap Runtime

## Clarify Gate

- ChangeId: `build-project-universe`
- TaskId: `14.16`
- Executor: Implementation Codex (`worker-codex`)
- IntegrationOwner: Architecture Codex `/root`
- Review mode: independent Review Codex
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`；`graphify-out/graph.json` 不存在
- 当前 production preview: 只允许 Architecture 管理现有 `127.0.0.1:3100`

## 背景与设计判断

精确 production trace 已证明：

- legacy `chromium_headless_shell` 不支持 `KHR_parallel_shader_compile`；
- current whole-scene `compileAsync` 在约 4ms 内提交五个 program，但首次真实 draw/commit 仍触发约 330–360ms ANGLE backend pipeline task；
- `flush`、WebGL2 fence、`LINK_STATUS`、uniform/attribute metadata 和 `finish` 均不能证明 shader/link 或首次 pipeline ready；
- 单独真实 draw 的 LongTask 仍分别为 97/95/65/95/79ms，因此继续把 pipeline 拆成更小 renderable 不能满足 50ms；
- Playwright 完整 Chromium/new headless `channel: chromium` 三次 cold production 运行均支持 `KHR_parallel_shader_compile`，现有 50ms collector 原样 3/3 PASS，LongTask 最大值均为 0。

证据位于：

- `/private/tmp/captain-dock-home-bootstrap-trace-compileasync/`
- `/private/tmp/captain-dock-channel-probe.mjs`
- `/private/tmp/captain-dock-playwright-channel.config.ts`

## Acceptance Criteria

1. `SceneCompileProbe` 在 layout effect 中读取当前 renderer context 的 `KHR_parallel_shader_compile`。
2. 支持扩展时才调用现有 `gl.compileAsync(rootScene, camera)`；resolve、reject、throw、cleanup 和 stale payload 语义保持。
3. 不支持扩展时不调用 `compileAsync`，不调用 fence/flush/finish/link-status，不等待 timeout；使用同一 current payload 立即 `onSceneCompiled`，缺少可选扩展不得触发 Canvas failure。
4. `UniverseCanvas` 的 current compile payload 判定直接绑定本次 render 的 `sceneCompileKey`、transition scene/token，不能等待 passive effect 更新 refs；unsupported 同步 layout-effect 回调在 route、quality 或 runtime generation 变化时必须正确放行，旧 payload 仍被拒绝。
5. `UniverseCanvas` 的 actual/logical frameloop、单一 Canvas prop owner、generation/scene/quality compile key、ready real frame 和 demand 终态保持不变；不得新增手工 `setFrameloop`/`invalidate` 第二 owner。
6. 在 `tests/e2e/performance.spec.ts` 文件顶层使用 `test.use({ channel: 'chromium' })`；Playwright 的 `channel` 是 worker-scoped option，禁止放在 `describe` 内。不得把整个 Playwright project、Static visual 或 cinematic screencast 文件迁移到另一个渲染器。production runner、外部 3100、workers、baseURL、trace、webServer 条件和测试选择不变。
7. production performance contract 必须从运行时 worker option fixture 直接断言 `browserName === 'chromium'` 且 `channel === 'chromium'`；不得仅检查一段可能未生效的源码字符串。
8. Home cold bootstrap test 保持真实 Canvas、ready、settled、demand、`PerformanceObserver` 和 LongTask `<=50ms` 断言，不修改 collector 或阈值。
9. 公开页面、四项目、路由、真实链接、英文内容、包体、draw-call、triangle、DPR、首次反馈、cinematic checkpoint、Lighthouse 和无障碍契约全部保持。

## TDD 要求

RED 必须先证明至少以下行为失败：

- unsupported context 仍错误调用 `compileAsync` 或不能立即 release；
- performance spec 尚未以 Playwright 允许的文件级 worker option 声明并运行 `channel: chromium`。

GREEN 后至少覆盖：

- supported extension：layout scene commit 后调用一次 `compileAsync`，resolve 才回调 compiled；
- unsupported extension：`compileAsync` 零调用，同一 layout-effect cycle 回调 current payload；
- supported rejection/throw：仍向 current error callback 转发；
- stale/unmount/outgoing/departing：旧 settlement 不回调；
- UniverseCanvas 模拟 SceneRouter 在 layout effect 同步回调：route scene/token、quality 和 runtime generation 变化均用本次 render identity 放行；旧 payload 不得解锁当前 gate；
- full scene unit、typecheck、targeted lint、`git diff --check`。

Implementation Codex 不得运行 build、browser、实际 Playwright test、server、Lighthouse、端口或部署；Fix1 仅允许使用 `npx playwright test tests/e2e/performance.spec.ts --list` 做无浏览器收集验证，实际执行仍由 Architecture VERIFY。

## Editable Files

1. `src/components/scene/scene-router.client.tsx`
2. `src/components/scene/scene-composition.test.tsx`
3. `src/components/scene/universe-canvas.client.tsx`
4. `src/components/scene/universe-canvas.test.tsx`
5. `tests/e2e/performance.spec.ts`

## Frozen Baseline SHA-256

- `src/components/scene/scene-router.client.tsx`: `33dafef0e55bd4ab3d0bbee7c609c8ec983cea9edd595f0746dde414af9fc3f9`
- `src/components/scene/scene-composition.test.tsx`: `0b4645356e714f22ef74a1378ebed51f1fd634eb2b40f5d13c772850f6f0ab3e`
- `src/components/scene/universe-canvas.client.tsx`: `584d1310985035878c131d1db1c40c0264354b677846099fc318a4275e0f8620`
- `src/components/scene/universe-canvas.test.tsx`: `590d766a3fb93ab214ef4b04331ad833861201c15992d4cff93408c5aa591270`
- `tests/e2e/performance.spec.ts`: `83b14309e54e8113f77f211f2cb219548bd750060222ac33d301e1ba1aa3249e`

保护文件：

- `playwright.config.ts`: `141b884d843e21c451d1e129b4458f67c166dc311f5be60372223cee800d7c54`
- `.gitignore`: `af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94`
- `main.py`: `bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0`
- `AGENTS.md`: `1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf`
- `.agents/**` aggregate: `0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770`

## Validation

Worker：

```bash
npm test -- --run src/components/scene/scene-composition.test.tsx
npm test -- --run src/components/scene
npm run typecheck
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test tests/e2e/performance.spec.ts --list
./node_modules/.bin/eslint \
  src/components/scene/scene-router.client.tsx \
  src/components/scene/scene-composition.test.tsx \
  src/components/scene/universe-canvas.client.tsx \
  src/components/scene/universe-canvas.test.tsx \
  tests/e2e/performance.spec.ts \
  --max-warnings=0
git diff --check
```

Architecture fresh：

```bash
openspec validate build-project-universe --strict --no-interactive
npm run build
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test \
  tests/e2e/performance.spec.ts \
  --grep "Home cold bootstrap reaches settled demand rendering without long tasks" \
  --repeat-each=3
```

Architecture 还必须从 Playwright launch evidence 确认实际 executable 是完整 Chrome for Testing，而不是 `chrome-headless-shell`，然后继续 cinematic、视觉和完整门禁。

## Stop Conditions

- 需要修改 allowlist 外产品文件、预算/阈值、collector、browser launch flags、路由或内容。
- unsupported 分支需要 fence、同步状态查询、timeout 或隐藏 fallback。
- current identity 修复需要改写 transition state、compile key 格式、Canvas prop ownership 或 ready-frame 语义。
- `channel: chromium` 逃出 `performance.spec.ts` 文件边界，或留在禁止 worker option 的 `describe` 内，导致收集失败、测试重复、静默跳过、production server 语义变化或视觉/cinematic 基线迁移。
- supported compile error 不再进入现有安全 fallback。
- 任何端口、Vercel、依赖、lockfile 或 git commit/push 需求。
