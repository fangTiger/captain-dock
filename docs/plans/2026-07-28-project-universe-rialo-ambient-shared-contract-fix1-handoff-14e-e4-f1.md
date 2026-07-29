# Task 14.20 E4 Fix1 — Rialo ambient 共享测试契约迁移 Handoff

## 任务身份

- ChangeId：`build-project-universe`
- TaskId：`14.20 / E4 Fix1`
- Executor：GPT-5.6 Sol Implementation worker
- IntegrationOwner：Architecture Codex `/root`
- ReviewMode：与 E4 产品实现合并后交给独立 Review Codex
- SessionStatePath：`.codex/session-state.md`
- GitBaseline：`UNBORN_HEAD`，工作区存在用户与既有任务的 dirty baseline
- Graphify：`DEGRADED_NO_GRAPHIFY_OUT`

## 触发原因与 RED 证据

E4 产品切片已严格按 OpenSpec §21.8 修改且本地 CSS 契约 `10/10 PASS`。Architecture fresh `npm run verify` 返回 `31 files PASS / 2 files FAIL；390 tests PASS / 2 FAIL`，两处失败都来自共享测试仍编码旧 Rialo owner：

1. `instrument-stage.test.tsx` 把主循环硬编码为 `.radar`，并要求 Rialo animation 声明本身依赖 `morph-phase=idle`；新设计要求真实 `.corridorPlane:first-child` 在稳定生命周期内保持 animation identity、默认 paused，只有独立 idle 规则切为 running。
2. `design-contract.test.ts` 不能把 reduced-motion 的短 owner selector 映射到带稳定生命周期前缀的长 owner selector，且 compositor 白名单仍只承认 `opacity` / `transform`，未承认 CSS independent transform property `translate`。

这些失败是本 Fix1 的既存 RED；不得修改产品代码来适配旧断言。

## 精确可编辑范围

1. `src/components/stage/instrument-stage.test.tsx`
2. `src/styles/design-contract.test.ts`

基线 SHA-256：

- instrument-stage：`42e377dbe42ec68248be56d5b12dafe0ce5f24f5442b8e16020a1c76d0b368b9`
- design-contract：`83d859776ca0d32ec478ae4f831a641e13a1b52ead650434d38d0854d0904d6d`
- 两文件以上述顺序聚合：`a9fe8dcb7f671282756cbbaee45ec364dbd2047a9926feca404828929035a4b4`

## 禁止范围

- 只能修改上述两个测试文件；不得修改 Rialo CSS、本地测试、controller、TSX/DOM、UniverseShell、Canvas/Three、E2E、snapshot、配置或 OpenSpec。
- 不得删除六个真实 ambient owner 的数量检查、真实 DOM owner 检查、7–10 秒主循环、负 delay、High/Medium、ready/demand/entry-settled、no pseudo、reduced-motion terminal 或 compositor-friendly 检查。
- compositor 白名单最多新增 independent `translate`，不得加入 layout、filter、background、clip-path 或通配接受。
- reduced selector 覆盖规则只可支持有明确 selector 边界的末端 owner 映射，不得用任意 substring 或总是 true。
- 不得降低 780/220ms、四步、650–900ms、200ms 或 50ms 门槛。
- 不得运行 browser/build/server/Lighthouse，不得访问、启动、停止或占用任何端口。
- 不得部署 Vercel，不得 commit/push，不得回退其他 agent 或用户改动。
- 如测试迁移需要第三个文件、产品变更或契约放宽，立即停止并向 Architecture 请求回到 DESIGN。

## GREEN / REFACTOR 要求

### `instrument-stage.test.tsx`

- 把 Rialo 主 owner 从 `radar` 迁移为真实渲染的 `corridorPlane`，仅匹配 `.corridorPlane:first-child`，不能把其他 corridor plane 误计为 owner。
- 保持六条 infinite animation：Home、Arc、Rialo 各一个主循环和一个辅助循环。
- Home / Arc 继续使用既有 idle-gated animation 声明；Rialo corridor / route 的 animation 声明必须位于稳定 ready + High/Medium + demand + entry-settled selector，默认 `paused` 且 selector 不含 morph phase。
- 另行证明 Rialo corridor / route 只有 idle selector 切换 `animation-play-state: running`，该规则不重复声明或重建 `animation`。
- 保持真实 owner、负 delay、High/Medium、no pseudo、主循环 7–10 秒及 Home morph pause 契约。

### `design-contract.test.ts`

- 让一个简写 reduced selector 只在它作为完整末端 selector（空格组合边界）时覆盖长生命周期 owner；保留 exact 与既有 wildcard 行为。
- 把 independent `translate` 加入 compositor-friendly keyframe property allowlist，仅此一项。
- 若添加 utility-level 断言，应覆盖 exact、末端组合、wildcard，以及容易误判的相似 class / 中间 substring 反例。

## Worker 可运行验证

```bash
npm test -- --run src/components/stage/instrument-stage.test.tsx src/styles/design-contract.test.ts
npx eslint src/components/stage/instrument-stage.test.tsx src/styles/design-contract.test.ts
npm run typecheck
git diff --check -- src/components/stage/instrument-stage.test.tsx src/styles/design-contract.test.ts
```

Worker 不得运行真实 Playwright、build、server、port、Lighthouse 或 snapshot 命令。

## 交付证据

- 说明如何消费 Architecture 已有 RED，或在修改前复跑并给出同样的两处失败。
- GREEN focused test、ESLint、typecheck、diff-check。
- 两个最终文件的 SHA-256 与排序聚合。
- changed-files allowlist。
- 逐条说明仍保留的 fail-closed 契约、未验证项与残余风险。

## Architecture 后续门禁

1. 检查 E4 + Fix1 四文件 source、allowlist 与最终 hashes。
2. fresh focused/full verify、OpenSpec strict、diff-check 与 protected hashes。
3. 冻结合并 Review Input，交给独立 Review Codex；只有 `PASS` 才可进入浏览器。
4. 停止旧 3100，仅重建/启动 exact `127.0.0.1:3100`，保持 3000 空闲。
5. frozen Rialo exact repeat8 必须 `8/8 PASS`，随后完整 cinematic file 必须一次 GREEN。
6. 只有浏览器门禁全部通过，才恢复候选截图与专业 Art Director gate。
