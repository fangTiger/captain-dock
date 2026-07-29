# Task 14.20 E5 — Cinematic recorder canonical frame chronology Handoff

## 任务身份

- ChangeId：`build-project-universe`
- TaskId：`14.20 / E5`
- Executor：GPT-5.6 Sol Implementation worker
- IntegrationOwner：Architecture Codex `/root`
- ReviewMode：独立 Review Codex
- SessionStatePath：`.codex/session-state.md`
- GitBaseline：`UNBORN_HEAD`，工作区存在用户与历史任务 dirty baseline
- Graphify：`DEGRADED_NO_GRAPHIFY_OUT`

## 触发证据

E4 产品、Fix1、Fix2、专业 Art Director `GO` 与七张 snapshot 均已通过并冻结。E4 Fix2 独立 Review `PASS` 后，Architecture 只执行一次 fresh full production 116-test 矩阵：

```text
112 passed
3 intentional development-only skipped
1 failed
```

唯一失败发生在 Home opening cinematic recorder：

```text
Screencast timestamp duplicate or backward order。
src/test-support/cinematic-screencast-selector.ts:707
```

没有重试。§21.7 已规定该异常再次出现时必须单独修 recorder readiness。

只读源码诊断确认 Chromium 在采集时写 `metadata.timestamp`，随后并行编码 PNG，并按编码完成顺序发送 `Page.screencastFrame`。因此唯一 timestamp 可以合法按 `t2 → t1` 到达。当前 selector 的 `sequence` 是 arrival identity，却同时被用作 frame chronology；这会在合法 encode-completion inversion 上失败。`sessionId` 是稳定 screencast generation，不是逐帧 ordinal，ACK 也不能用于排序。

本切片只修测试支持层；不代表产品、视觉或 motion 回归。

既有把 `[101ms, 100ms]` arrival inversion 作为 backward error 的负例与本设计冲突，明确授权在本切片中把它迁移为 canonical chronology 正例；duplicate timestamp 的两个负例必须保留并收紧。

## 精确可编辑范围

仅以下两个文件：

1. `src/test-support/cinematic-screencast-selector.ts`
2. `src/test-support/cinematic-screencast-selector.test.ts`

基线 SHA-256：

- selector：`3fb0908f8a0a911fd46c1aa1f488b78c3927f9fda1ef6f4c038d2d7cfb3560f7`
- tests：`164da59fe0b169c67028281a5f63708cc8b7f9b85845fabf106f4e12765312e8`
- 以上述顺序、repository-relative `shasum` 输出聚合：`5ff765dcdd662061de332e3162d627464d2c9a86fdc0746329239c185935aaf8`

## 禁止范围

- 不得修改 `tests/e2e/cinematic-motion.spec.ts`、任何产品文件、其他测试、OpenSpec、config、snapshot 或依赖。
- 不得更新、删除或重新生成七张 snapshot。
- 不得更改 checkpoint、50ms lateness、50ms facts-frame skew、四步、200ms、650–900ms、780/220ms 或任何视觉/性能门槛。
- 不得按 PNG hash 去重、round/coalesce timestamp、插值、补帧、复制上一帧、用 epsilon 改写时间，或丢弃一个 duplicate 后继续。
- 不得把 `sessionId` 或 ACK completion order 当成逐帧顺序。
- 不得改变 stopping capture boundary：stopping 后的 frame 继续 ACK，但不参与本次选择。
- 不得运行真实 Playwright、build、server、Lighthouse、snapshot、浏览器或端口命令。
- 不得启动、停止或占用任何端口；不得触碰现有 3100，必须保持 3000 空闲。
- 不得部署 Vercel，不得 commit/push，不得回退其他 agent 或用户改动。
- 如需第三个文件、collector 调用方、阈值或产品修改，立即停止并请求回到 DESIGN。

## RED 要求

先在测试文件中加入最小、可区分真实帧 identity 的 RED。不要全局改写既有 `makePayload()` 默认 fixture；为新场景构造不同合法 PNG bytes。

### RED 1：唯一 timestamp 的 encode-completion inversion

- 用不同 PNG 依次按 arrival `151ms → 101ms → 201ms` record。
- checkpoints 必须选择 canonical `101ms → 151ms → 201ms`。
- 断言每个输出的 PNG/SHA 仍绑定原 timestamp，没有丢帧或交换 payload。
- 断言每个 arrival 恰好 ACK 一次；ACK 观测仍保持原 arrival identity。
- 当前实现必须因 backward arrival 失败；仅在数组上 `.sort()` 但保留 DFS arrival-sequence gate 也必须失败。

### RED 2：Home opening event boundary

- 用不同 PNG 按 arrival `260ms → 170ms → -1ms → 77.508ms` record。
- `includeEventBoundary=true`，checkpoints `[160, 250]`。
- canonical 结果必须是：boundary `77.508ms`、predecessor `-1ms`、fixed frames `170ms / 260ms`。
- 四个到达事件必须全部 ACK，boundary 与 fixed PNG/SHA 必须分别绑定正确 payload。

### 必须保留的 fail-closed 反例

- duplicate timestamp + 不同 PNG：拒绝。
- duplicate timestamp + 相同 PNG：拒绝；协议没有可证明安全的逐帧 ordinal。
- 相同 PNG + 不同 timestamp：两个时间帧都保留，不得 hash-dedupe。
- ACK Promise 逆序完成：canonical selection 不变，且 finalize 在全部 ACK settle 前不 decode/resolve。
- stopping 后收到更适合 checkpoint 的 frame：仍只 ACK、不选择；测试必须让 recording frame 较差但仍在 50ms 内，并用不同 PNG/ACK 标签证明真实选择边界。
- 两个不同、可表示的原始 `metadata.timestamp` 若转换后得到相同 `frameSwapAtMs`：保守视为 collision 并拒绝，不能以原始 seconds 或 arrival 顺序打破平局。
- 既有 session contamination、ring/bytes、50ms epsilon、facts/timeOrigin/version、event-boundary unique-frame 与 PNG/viewport guards 全部继续通过。

## GREEN / REFACTOR 要求

1. 保留 raw `sequence` 作为 arrival identity。
2. finalize 独立转换并验证全部 `frameSwapAtMs`。
3. 排序前用转换后的 `frameSwapAtMs` 作为精确 `Map<number>` key 检测 duplicate；两个不同原始 seconds Number 若投影成同一毫秒 Number 也必须 fail closed。任何碰撞的错误必须明确包含 duplicate/timestamp，不得 decode 任一 PNG；不得 `toFixed`、round 或 epsilon。
4. 对 timestamp 唯一的 frames 按 `frameSwapAtMs` 建立 canonical chronology。
5. event boundary、真实 predecessor、checkpoint candidates 与 path 时间前进使用 canonical chronology / timestamp。
6. fixed path 的前序状态从 `previousFrameSequence` 迁移为 `previousFrameSwapAtMs` 或等价 canonical ordinal；不能用 arrival sequence 阻断合法 inversion。
7. event-boundary exclusion 继续比较 raw `sequence` identity，确保同一 raw frame 不复用。
8. ACK lifecycle、ring/byte accounting、capture state 与所有既有 guards 保持不变；“等待全部 ACK”精确指 finalize 调用前已经登记的全部 ACK。测试必须用 deferred Promise 证明最后一个既有 ACK settle 前 finalize 保持 pending 且 decode 为 0。

实现应保持局部、命名清晰，不添加依赖，不暴露 base64 payload。若增加诊断，只可记录 arrival index/timestamp/安全摘要。

## Worker 可运行验证

```bash
npm test -- --run src/test-support/cinematic-screencast-selector.test.ts
npx eslint src/test-support/cinematic-screencast-selector.ts src/test-support/cinematic-screencast-selector.test.ts
npm run typecheck
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test tests/e2e/cinematic-motion.spec.ts --list
git diff --check -- src/test-support/cinematic-screencast-selector.ts src/test-support/cinematic-screencast-selector.test.ts
```

worker 不得运行真实 browser/build/server/port/Lighthouse/snapshot 命令。

## 交付证据

- RED 命令与精确失败。
- GREEN focused unit、ESLint、typecheck、Playwright list、diff-check。
- 两个最终文件的 SHA-256 与以上述顺序、repository-relative `shasum` 输出计算的聚合。
- changed-files allowlist。
- 逐条说明 arrival identity 与 canonical chronology 的分工、duplicate 处理、ACK/stopping/50ms 等不变量。
- 未验证项与残余 stop/drain 风险。

## Architecture 后续门禁

1. 检查两文件 diff、allowlist、hash 与 TDD 证据。
2. fresh focused unit、full verify、OpenSpec strict、diff-check 与 protected/product/snapshot hashes。
3. 冻结 Review Input，交给独立 Review Codex；只有 `PASS` 才进入真实浏览器。
4. 在现有 exact `127.0.0.1:3100` 上按固定顺序、每项只运行一次：
   - Home opening focused；
   - 完整 cinematic file；
   - full production 116-test matrix。
5. 预期 full production `113 PASS / 3 SKIP / 0 FAIL`；任何失败都停止，不得 retry 选择成功。
6. 随后完成 build-gates、links、budgets、Lighthouse、七张 snapshot `--update-snapshots=none`、full verify、strict、hashes/evidence/session-state；保持 3100 运行、3000 空闲。
