# Handoff Task Package — Task 14.17 Carrier Spine

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.17`
- SliceId: `carrier-spine`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after all slices integrate
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- Baseline aggregate: `1752761b0f03942a0fabaf711e11515818ea78fdc5110ac59bc4110ccb9a3ad4`
- New file baseline: `src/components/scene/cinematic-navigation-bridge.module.css = ABSENT`

聚合按 Editable Files 的精确顺序计算，`ABSENT` 行位于新文件对应的第二行：

```bash
{
  shasum -a 256 src/components/scene/cinematic-navigation-bridge.client.tsx
  echo 'ABSENT  src/components/scene/cinematic-navigation-bridge.module.css'
  shasum -a 256 \
    src/components/scene/cinematic-navigation-bridge.test.tsx \
    src/components/scene/universe-shell.module.css \
    src/components/project/project-case-study.tsx \
    src/components/project/project-case-study.module.css \
    tests/e2e/cinematic-motion.spec.ts
} | shasum -a 256
```

## Acceptance Criteria

1. 用唯一 carrier actor 替代 `.contentLayer::before` 和项目详情 `.handoffVeil` 的深色全屏遮罩。
2. actor 由 track、hard-edge mass、leading signal 三部分组成；`aria-hidden`、不可聚焦、`pointer-events:none`。
3. actor 发布 `data-cinematic-handoff-signal/target/token/progress`，内部 track/mass/signal 分别发布可量测的 `data-cinematic-carrier-*`；progress 与既有 bridge 单调一致。
4. immersive route 与 detail arrival 消费相同 carrier destination/target/token；progress 继续从 persisted start 重算，destination 首帧不小于 source 末帧且详情不得从 0 播放第二套动画。
5. actor 只动画 transform/opacity，中段可遮 Canvas swap；透明 viewport positioning root 不得有背景，120/300/480ms 的真实 track/mass/signal rect 总面积除以 viewport 始终不超过 35%。
6. 快速二次导航只保留最新 token；terminal、direct detail、expired、hidden 与 reduced-motion 不渲染 actor。
7. 600ms total、120ms push、≤700ms Canvas terminal、storage schema、history、单 Canvas 与 demand frameloop不变。
8. 公开路由、四项目、真实链接和英文内容不变。
9. 只拦截 `[data-universe-content]` 内既有 ecosystem/project 链接与活动 CTA；Header/Footer/history/modified click/direct load 保持原生且不遗留 stale carrier。
10. actor 的离场方向按 source scene 映射 Home beacon、Arc signal path、Rialo route；目标沉浸页或详情 signature 使用相同方向接力，不把所有 route 套成 Home motif。

## Frozen Implementation Contract

- 可在 bridge 文件中建立纯函数 carrier frame projection；不得新增状态机。
- `CinematicNavigationBridge` 与 `CinematicDetailArrival` 复用同一内部 carrier component 和同一 CSS module。
- `CinematicDetailArrival` 删除 `veilClassName` 公共 prop；本 slice 同步更新唯一调用方。
- `motif` 可继续作为 detail carrier 的装饰性 data attribute。
- 不向 R3F 注入 progress，不新增 Canvas mesh/shader，不修改 transition-machine。
- carrier token/target 与 `SceneTransitionState` 的 Canvas token/target 独立，不得互相复用或断言相等。
- carrier host 可以 viewport-fixed 且透明；面积门禁测量实际 actor，而不是透明 host。

## Editable Files

```text
src/components/scene/cinematic-navigation-bridge.client.tsx
src/components/scene/cinematic-navigation-bridge.module.css
src/components/scene/cinematic-navigation-bridge.test.tsx
src/components/scene/universe-shell.module.css
src/components/project/project-case-study.tsx
src/components/project/project-case-study.module.css
tests/e2e/cinematic-motion.spec.ts
```

## Forbidden Files / Actions

- 上述文件之外的全部文件。
- transition-machine、tokens、UniverseCanvas、SceneRouter、Three scenes、catalog、routes、metadata、media registry、dependencies、budgets、Playwright config。
- `.codex/**`、`openspec/**`、`docs/**`、`.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`。
- browser、build、server、Lighthouse、端口、Vercel、commit、reset/restore。

## TDD Requirements

RED 先固定：

- 非 reduced handoff 恰好渲染一个 actor，且包含 track/mass/signal。
- actor 与 bridge 的 carrier target/token/progress 一致，progress `0 → mid → 1` 时 X 单调前进、中段 mass 最大、两端透明。
- Home、Arc、Rialo 三个 source scene 产生可区分且与各自既有方向性载体一致的 data/CSS direction contract。
- detail arrival 消费相同 carrier token/target，首次 frame 从 persisted start 重算且不回退。
- rapid navigation 不保留旧 actor；reduced/direct/expired/terminal 不渲染。
- Header/Footer/history/modified click 不创建 actor，且切换后没有 stale carrier。
- CSS 不包含旧 `.contentLayer::before` 深色 veil、`.handoffVeil`、filter/blur/backdrop-filter/mix-blend 或 infinite。
- cinematic E2E 在 120/300/480ms 或等价既有 checkpoint 验证一个 actor、carrier token/target 连续、X 单调、三个真实部件 rect 总面积/viewport ≤35%、terminal 清理和 reduced no actor；不得放宽任何既有 gate。

## Worker Validation

```bash
npm test -- --run \
  src/components/scene/cinematic-navigation-bridge.test.tsx \
  src/components/project/project-case-study.test.tsx

./node_modules/.bin/eslint \
  src/components/scene/cinematic-navigation-bridge.client.tsx \
  src/components/scene/cinematic-navigation-bridge.test.tsx \
  src/components/project/project-case-study.tsx \
  tests/e2e/cinematic-motion.spec.ts \
  --max-warnings=0

npm run typecheck
npx playwright test tests/e2e/cinematic-motion.spec.ts --list
git diff --check
```

若现有 production 3100 可用于 test-only RED，也不得由 worker 访问；真实 E2E 由 Architecture 在集成阶段执行。

## Deliverables

- RED 与 GREEN 命令、失败/通过数量。
- changed files 与逐文件 SHA-256。
- 对八条 acceptance 的逐项覆盖。
- 未验证项、风险、scope expansion 请求。
- 明确确认未运行 browser/build/server/端口/Vercel/commit。
