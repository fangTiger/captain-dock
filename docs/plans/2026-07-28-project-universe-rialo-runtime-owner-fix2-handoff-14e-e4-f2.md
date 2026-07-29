# Task 14.20 E4 Fix2 — Rialo 运行时 spatial scope / main owner 契约迁移 Handoff

## 任务身份

- ChangeId：`build-project-universe`
- TaskId：`14.20 / E4 Fix2`
- Executor：GPT-5.6 Sol Implementation worker
- IntegrationOwner：Architecture Codex `/root`
- ReviewMode：独立 Review Codex
- SessionStatePath：`.codex/session-state.md`
- GitBaseline：`UNBORN_HEAD`，工作区存在用户与历史任务 dirty baseline
- Graphify：`DEGRADED_NO_GRAPHIFY_OUT`

## 触发证据

E4 + Fix1 已完成以下真实门禁：

- 独立 Review Codex `PASS`；
- production Rialo cinematic exact repeat8 `8/8 PASS`；
- 完整 cinematic file `5/5 PASS`；
- 专业 Art Director `GO`；
- 七张 snapshot 经一次更新后，立即以 `--update-snapshots=none` 复验 `7/7 PASS`。

随后 Architecture fresh full production E2E 得到：

```text
116 tests
112 passed
3 intentional development-only skipped
1 failed
```

唯一失败：

```text
progressive-enhancement.spec.ts
real protagonists own one gated 7–10s transform/opacity loop while Canvas stays demand
Rialo direct infinite animation count: expected 1, received 0
```

根因不是产品回归。旧 E2E 把 Rialo 的 spatial scope 与 main animation owner 都表示为 `.radar`。E4 后 `.radar` 仍是包含 corridor 与 route 的真实空间范围，但直接主循环 owner 已迁移为第一块真实 corridor plane；因此 `radar.getAnimations()` 正确为 0，而 `radar.getAnimations({ subtree: true })` 仍包含 corridor 主循环与 route 辅助循环。

## 精确可编辑范围

唯一文件：

`tests/e2e/progressive-enhancement.spec.ts`

基线 SHA-256：

`e1f99cd9a7e6aa5051502a509653e17fc231a95f4eb9852df1b13f15f9a4121c`

## 禁止范围

- 不得修改任何产品文件、unit test、其他 E2E、OpenSpec、config 或 snapshot。
- 不得把 Rialo 旧 direct 期望简单改为 0，不得用 subtree 的第一条 animation 冒充 main。
- 不得用 `.first()`、CSS Modules class substring、任意后代 selector、伪元素或宽泛 transform-family 正则。
- 不得放宽 High/Medium、Low、mobile、ready、demand、entry-settled、morph-idle、Canvas demand、7–10s、负 delay、真实 target、一个主循环+至多一个辅助循环或反馈 ≤220ms 契约。
- keyframe property 白名单最多精确新增 `translate`；不得新增 layout、filter、background、clip-path 或通配。
- 不得修改 780/220ms、四步、650–900ms、200ms 或 50ms 门槛。
- 七张已获 Art Director GO 的 snapshot 完全冻结，不得更新、删除或生成。
- 不得运行真实 browser/build/server/Lighthouse，不得访问、启动、停止或占用任何端口。
- 不得部署 Vercel，不得 commit/push，不得回退其他 agent 或用户改动。
- 如需第二个文件或产品 attribute，立即停止并请求回到 DESIGN。

## RED

Architecture 已提供真实 RED：full production `112 PASS / 3 SKIP / 1 FAIL`，失败精确发生在 Rialo direct owner 为旧 `.radar`。

worker 可通过源码检查确认当前 `ambientMotionRoutes` 只提供一个 `owner`，helper 同时用它调用 direct 与 subtree `getAnimations`。不得制造新的非规范失败。

## GREEN / REFACTOR

### 路由契约

把每条 ambient route 明确拆为：

- `spatialScope`：真实大体量空间范围；
- `mainOwner`：直接拥有主无限循环的真实节点。

Home 与 Arc 两者相同。Rialo：

- `spatialScope` 必须仍是唯一 `[data-cinematic-spatial][data-rialo-active-signal]` radar；
- `mainOwner` 必须是该 scope 的直接第一个 `span`，并在运行时证明它等于 `scope.firstElementChild`，不能用 `.first()` 或 class substring 隐藏重复/错位节点。

### animation 读取

helper 必须分别读取：

- `mainOwner.getAnimations()` 的 infinite animations，作为 `mainDirect`；
- `spatialScope.getAnimations({ subtree: true })` 的 infinite animations，作为 `all`。

对每条 animation 记录并验证：

- target 是否严格等于 main owner；
- target 是否严格位于 spatial scope 内；
- pseudo/non-Element target 不能靠 `target !== null` 兜底通过。

### 保留并收紧的断言

High 与 Medium 每轮：

- spatial scope 与 main owner 各恰好一个；
- main owner 位于 scope 内且满足 Rialo 直接第一 child 契约；
- `mainDirect.length === 1`；
- `all` 中 target 等于 main owner 的 animation 恰好一条；
- `1 <= all.length <= 2`，即一个主循环、至多一个辅助循环；
- 所有 `all` target 都在 scope 内；
- duration 仍为 7000–10000ms，delay 仍小于 0；
- keyframe properties 只允许 `opacity`、`transform`、`translate`；
- Canvas/shell frameloop 继续为 demand。

Low 与 390px mobile：

- 必须针对整个 `spatialScope` 检查 `all.length === 0`，不能只检查 corridor，以免漏掉 sibling route。

既有 control feedback、ready、entry-settled、morph idle、quality 与 Canvas 单实例断言原样保留。

## Worker 可运行验证

```bash
npx eslint tests/e2e/progressive-enhancement.spec.ts
npm run typecheck
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test tests/e2e/progressive-enhancement.spec.ts --list
git diff --check -- tests/e2e/progressive-enhancement.spec.ts
```

worker 不得运行真实 Playwright、build、server、port、Lighthouse 或 snapshot 命令。

## 交付证据

- 对 Architecture 既有 RED 的消费说明。
- scoped ESLint、typecheck、Playwright list、diff-check。
- 最终文件 SHA-256。
- changed-files allowlist。
- 逐条说明 scope/main 分离后仍保留的 fail-closed 契约、未验证项与残余风险。

## Architecture 后续门禁

1. 检查单文件 diff 与 hash。
2. fresh lint/typecheck/list，然后在现有 exact 3100 上运行唯一 focused browser test。
3. 运行 full verify、OpenSpec strict、diff-check 与 protected/snapshot hashes。
4. 冻结 Review Input，交给独立 Review Codex；只有 `PASS` 才重跑 full production E2E。
5. full production 必须 `112+1 = 113 PASS / 3 SKIP / 0 FAIL`。
6. 随后完成 build-gates、links、budgets、Lighthouse、最终 hashes/evidence/session-state；保持 exact 3100 运行、3000 空闲。
