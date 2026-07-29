# Task 14.20 E5 — Cinematic recorder canonical frame chronology 独立 Review 输入

## Review 身份

- ChangeId：`build-project-universe`
- TaskId：`14.20 / E5`
- Implementation Executor：GPT-5.6 Sol worker `/root/implement_recorder_ordering_e5`
- IntegrationOwner：Architecture Codex `/root`
- Review Executor：独立 Review Codex
- Review Decision：只能为 `PASS`、`FIX_REQUIRED` 或 `DOWNGRADE`
- Graphify：`DEGRADED_NO_GRAPHIFY_OUT`
- GitBaseline：`UNBORN_HEAD`，工作区存在用户与历史任务 dirty baseline

## 权威输入

1. `AGENTS.md`
2. `.codex/session-state.md`
3. `openspec/changes/build-project-universe/design.md` §21.9
4. `openspec/changes/build-project-universe/tasks.md` 14.20
5. `docs/plans/2026-07-28-project-universe-cinematic-recorder-ordering-handoff-14e-e5.md`
6. 本文件
7. 两个实现文件的当前源码与 Architecture 验证输出

## 触发与范围

E4 产品、Fix1、Fix2、专业 Art Director `GO` 和七张 snapshot 已冻结。Fix2 独立 Review `PASS` 后，Architecture 只运行一次 full production：

```text
112 PASS / 3 intentional development-only SKIP / 1 FAIL
```

唯一失败是 Home opening recorder 在生成附件前抛出：

```text
Screencast timestamp duplicate or backward order。
```

没有重试。Chromium 源码诊断证明 timestamp 在采集时写入，PNG 随后由 ThreadPool 并发编码，CDP 事件按编码完成顺序到达；因此 unique timestamp 的 transport arrival inversion 合法。旧 selector 错把 arrival `sequence` 当 capture chronology。

本切片唯一可编辑文件：

1. `src/test-support/cinematic-screencast-selector.ts`
2. `src/test-support/cinematic-screencast-selector.test.ts`

基线：

- selector：`3fb0908f8a0a911fd46c1aa1f488b78c3927f9fda1ef6f4c038d2d7cfb3560f7`
- test：`164da59fe0b169c67028281a5f63708cc8b7f9b85845fabf106f4e12765312e8`
- repository-relative ordered aggregate：`5ff765dcdd662061de332e3162d627464d2c9a86fdc0746329239c185935aaf8`

最终：

- selector：`7f8e8532bd0ed5967f98c19190b32985e2e02171d24e9b0c15ac06cb33e637c7`
- test：`85500b8300751c7578118838ba710d32846e914152ae1287d93e0da9246991b1`
- repository-relative ordered aggregate：`68e81666a161d542dec04e7a704e01cc4800042cae32b8abe052894540c75910`

## TDD 与实现证据

### RED

在 selector 仍为基线 hash 时，focused Vitest：

```text
1 file failed
3 failed / 84 passed
```

三项 RED 均精确命中旧 selector 的 arrival-order rejection：

- distinct PNG `151 → 101 → 201ms` encode-completion inversion；
- Home-like `260 → 170 → -1 → 77.508ms` event boundary inversion；
- deferred ACK 逆序完成下的 canonical selection。

### GREEN

worker fresh：

- focused Vitest `88/88 PASS`
- scoped ESLint `PASS`
- typecheck `PASS`
- cinematic Playwright collection `5 tests / 1 file`
- scoped diff-check `PASS`

Architecture fresh：

- focused Vitest `88/88 PASS`
- full `npm run verify`：lint、typecheck、`33 files / 398 tests PASS`
- OpenSpec strict `PASS`
- cinematic Playwright collection `5 tests / 1 file`
- scoped diff-check `PASS`
- final file hashes、protected hashes、E4/Fix2 hashes与七张 snapshot hashes全部匹配

真实 browser/build/Lighthouse/snapshot update 尚未运行；Review `PASS` 前禁止运行。

## 需要独立审查的实现语义

### 双时间线

- raw `sequence` 只保留 arrival identity。
- 所有 timestamp 先转换、验证为 `frameSwapAtMs`。
- 排序前以转换后的毫秒 Number 做精确碰撞检测；任何 duplicate，包括不同 raw seconds 投影到同一 `frameSwapAtMs`，都 fail closed 且 PNG decode 为 0。
- unique timestamps 复制排序为 `canonicalFrames`。
- event boundary、真实 predecessor、checkpoint candidates、first-late 与 DFS path 的前进均使用 canonical timestamp。
- raw `sequence` 只允许用于 event-boundary raw-frame identity 排除；不得用于 path chronology 或 tie-break。

### 不得丢失的证据

- distinct PNG inversion 的 timestamp、PNG、SHA 一一绑定，所有 arrival 各 ACK 一次。
- Home-like inversion 得到 boundary `77.508ms`、predecessor `-1ms`、fixed `170/260ms`。
- duplicate same/different PNG 均拒绝，decode 为 0。
- same PNG + different timestamp 保留两个逻辑帧。
- deferred ACK 逆序完成不影响 canonical order；finalize 在调用前已登记的最后 ACK settle 前保持 pending/decode 0。
- recording 150ms 与 stopping 100ms 的不同 PNG 场景只选择 recording frame，但两个 arrival 都 ACK。

### 冻结契约

- stable session、ring frames/bytes、PNG/viewport、origin/timeOrigin、facts capturedAt/version、event anchor、unique raw frame 不变。
- 50ms checkpoint lateness 与 facts-frame skew 不变。
- stopping capture boundary 不变；真实 stop/drain 生命周期是明确残余风险，需要第三个调用方文件时必须回 DESIGN。
- 不得 timestamp round/coalesce/hash-dedupe/interpolate/epsilon，不得修改 cinematic checkpoints、四步、200ms、650–900ms、780/220ms 或产品动效。

## 已消费的设计审计

只读 explorer `/root/audit_recorder_e5_design` 最初给出 `FIX_REQUIRED`：

1. 旧 `[101,100]` backward negative 与新设计冲突；
2. raw seconds 到 converted milliseconds 的 IEEE-754 投影碰撞语义未明确；
3. DFS/comparator/error wording 仍可能误用 arrival sequence；
4. “全部 ACK”未限定 finalize snapshot 边界；
5. stopping 测试不能证明更优 late arrival 被排除。

Architecture 已在 OpenSpec/handoff 明确授权迁移旧负例、选择 converted `frameSwapAtMs` conservative collision、限定 finalize 调用前已登记 ACK；worker 又添加 projection collision、deferred ACK 和 stronger stopping 测试，并移除 DFS/comparator 的 arrival chronology。Reviewer 必须独立确认这些 closure，不得只引用 worker 结论。

## Protected / frozen hashes

- `.gitignore`：`af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94`
- `main.py`：`bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0`
- `AGENTS.md`：`1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf`
- `.agents/**` repository-relative aggregate：`0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770`
- `playwright.config.ts`：`141b884d843e21c451d1e129b4458f67c166dc311f5be60372223cee800d7c54`
- E4 + Fix1 four-file aggregate：`e39af99ed367a4f85dbc0fc01cba6891c80e2b1fb5ce9977397dd8ecbb4152fe`
- Fix2 E2E：`34e86e43f0b80d39a7b53273301f51cdfa38dfe79dd2de67e8df61a2a7fce1e2`

七张 snapshot：

- Home1440 `00d8235e6bdc3aec69ceeb90de9793a0fb0be0d62b2e32b44882db386f187ea4`
- Home390 `a40523e3f89d54c5349f397d63bd0e787ea14f9de22012d8f72cf4c6f09d629f`
- Arc1440 `8b43040ec99c5db3fff1d0f3915aac0f8db3c66ee3c903120b4566af44ed55f9`
- Arc390 `88482ebaa302b7fae6b33f4aa1e2787bc44ee13c5c5f1691c25da70326d5ee62`
- Rialo1440 `1f53dfeb3a0765e279c9791dc37006c2ffe9afe3d59b7c369eebf90b32a4a50a`
- Rialo390 `5407afe846a2882ce47d7f675813568cf81cb51893243b21f4387a1ebe058661`
- SignalLedger1440 `9ec872dd7039a371253c7e2b37724f1b92a677d40e9ebb27bb0736112f0c24c3`

## Reviewer 可运行命令

```bash
npm test -- --run src/test-support/cinematic-screencast-selector.test.ts
npm run verify
openspec validate build-project-universe --strict --no-interactive
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test tests/e2e/cinematic-motion.spec.ts --list
git diff --check -- src/test-support/cinematic-screencast-selector.ts src/test-support/cinematic-screencast-selector.test.ts openspec/changes/build-project-universe/design.md openspec/changes/build-project-universe/tasks.md docs/plans/2026-07-28-project-universe-cinematic-recorder-ordering-handoff-14e-e5.md docs/plans/2026-07-28-project-universe-cinematic-recorder-ordering-review-input-14e-e5.md .codex/session-state.md
shasum -a 256 src/test-support/cinematic-screencast-selector.ts src/test-support/cinematic-screencast-selector.test.ts
shasum -a 256 src/test-support/cinematic-screencast-selector.ts src/test-support/cinematic-screencast-selector.test.ts | shasum -a 256
rg -n '\\bsequence\\b|canonicalFrames|frameSwapAtMs|pendingAcknowledgements' src/test-support/cinematic-screencast-selector.ts
```

Reviewer 不得运行真实 Playwright、build、server、Lighthouse、snapshot、端口、Vercel、commit/push，不得修改文件。

## Decision gate

- `PASS`：两文件严格实现 §21.9，审计 findings 全部关闭，原有 guards 与范围冻结，无 P0/P1。
- `FIX_REQUIRED`：可在同两文件内修复的语义、测试或回归缺口。
- `DOWNGRADE`：需要第三个文件、collector lifecycle、产品、阈值、config 或扩大权限。

只有独立 `PASS` 后，Architecture 才按固定顺序各运行一次 Home opening、完整 cinematic、完整 production；任何失败都停止，不得 retry 选择成功。
