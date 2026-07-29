# Handoff Task Package — A 版重构 Slice 12B4 Responsive Type Contract

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6 / responsive route-label type recovery`
- AgentId: `/root/fix_redesign_12b4`
- SliceId: `responsive-route-label-type-recovery`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- SessionStatePath: `.codex/session-state.md`
- GitBaseline: `UNBORN_HEAD`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## 当前状态

12B3 已完成唯一允许的产品修改：

- `src/components/rialo/rialo-reactive-loop.module.css`
- 基础 `.headline` `2.6rem → 2.4rem`
- 聚焦 RED 唯一复现 Rialo desktop `371/394`
- 同一聚焦测试 GREEN
- 当前 CSS SHA-256：`61ee3b44a865afd1d60c73c98f2a9fdc19d0c9f4bf7186c4ba326f15908efe5b`

随后 `npm run verify`：

- lint PASS
- typecheck FAIL，退出2
- 唯一类型错误：
  `tests/e2e/responsive.spec.ts:551 TS2345`
- `routeLabel(route, viewportWidth)` 的 `route` 来自 `instrumentStageRoutes`，只有 `path/variant`；而 `routeLabel` 错误地要求完整 `ResponsiveRoute` 的 `group/heading/path`

这是12B2新增测试的静态类型契约错误，与12B3 CSS无关。12B3 worker 正确禁止修改第二文件。本任务只恢复 helper 的最窄输入类型，不改变任何运行时断言。

## Editable file

- `tests/e2e/responsive.spec.ts`

## Forbidden files

除上述文件外全部禁止修改，特别是：

- `src/components/rialo/rialo-reactive-loop.module.css`
- `src/components/stage/instrument-stage.module.css`
- `src/styles/universe-pages.module.css`
- 所有产品TS/TSX/CSS、其他测试、配置、依赖
- docs、OpenSpec、session-state、`.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`
- 3000、commit、部署、Task12C snapshots

## Required TDD

1. 不改文件先运行 `npm run typecheck`，必须唯一复现上述TS2345。
2. 只把：

```ts
function routeLabel(route: ResponsiveRoute, viewportWidth: number)
```

改为只要求 path 的最窄类型，例如：

```ts
function routeLabel(route: Pick<ResponsiveRoute, 'path'>, viewportWidth: number)
```

等价的只读 `{ path: string }` 也可，但不能增加 `as`、`any`、忽略注释或给 `instrumentStageRoutes` 填充虚假的group/heading。
3. `npm run typecheck` 必须 GREEN。
4. 聚焦 Instrument Stage 测试必须仍 GREEN。
5. 不得改任何断言、宽度、容差、等待、selector、测试数量或产品行为。

## 完整门禁与视觉矩阵

随后运行：

```bash
npm run verify
npm run build
npx playwright test \
  tests/e2e/routes.spec.ts \
  tests/e2e/home.spec.ts \
  tests/e2e/ecosystems.spec.ts \
  tests/e2e/project-detail.spec.ts \
  tests/e2e/keyboard.spec.ts \
  tests/e2e/progressive-enhancement.spec.ts \
  tests/e2e/responsive.spec.ts \
  tests/e2e/accessibility.spec.ts \
  tests/e2e/seo-security.spec.ts \
  --config playwright.config.ts
```

全绿后生成并实际查看14张临时候选截图：

- 1440×1000：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- 390×844：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- reduced motion：`/`、`/arc`、`/rialo`
- 561×900：`/`、`/arc`、`/rialo`

逐页对照冻结参考；截图只在临时目录，不建立正式 snapshot。

## Stop conditions

- typecheck RED 不是唯一TS2345。
- 需要第二个文件。
- 最窄签名修复后 typecheck或聚焦测试仍失败。
- 完整门禁出现不能由冻结状态解释的新失败。
- 需要改变测试行为、产品、配置、依赖、3000、部署或提交。

## Baseline

- 单文件初始 SHA-256：`5ea585f378d3e3cbbd0605191a90a2b54f66b58e73c6eac2c5f5fd2ad641dd97`
- 12B3 CSS frozen SHA-256：`61ee3b44a865afd1d60c73c98f2a9fdc19d0c9f4bf7186c4ba326f15908efe5b`
- 12B2三文件实现前聚合：`97856a3a36ac9bf2df6acd815e2f7f9ee0f7ccd2fbbc6c5d2b54514a744d4a86`

受保护与参考hash沿用12B3 handoff，必须复核。

## Handback

- 单文件最终hash
- typecheck RED/GREEN、聚焦GREEN、完整门禁
- 14张截图路径和逐页自审
- Han/scope/protected/reference/3100证明

不要更新OpenSpec、docs、session-state，不要commit，不要部署。
