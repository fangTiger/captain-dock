# Task 14.20 E4 + Fix1 — 独立 Review Codex 输入

## Review Decision

待独立 Review Codex 输出且只能输出以下之一：

- `PASS`
- `FIX_REQUIRED`
- `DOWNGRADE`

浏览器、build、端口、snapshot、Lighthouse 与 Art Director 均不是本次 reviewer 的执行范围；reviewer 必须把它们保留为 Architecture 后续门禁，不能把非浏览器 PASS 描述成最终视觉通过。

## 任务与规范源

- ChangeId：`build-project-universe`
- TaskId：`14.20 / E4 + E4 Fix1`
- IntegrationOwner：Architecture Codex `/root`
- Graphify：`DEGRADED_NO_GRAPHIFY_OUT`
- GitBaseline：`UNBORN_HEAD`，存在用户及历史任务 dirty baseline
- OpenSpec：design §21.8、progressive visual delta「Rialo 环境姿态与 committed 构型解耦」、tasks 14.20
- E4 handoff：`docs/plans/2026-07-28-project-universe-rialo-ambient-commit-decoupling-handoff-14e-e4.md`
- Fix1 handoff：`docs/plans/2026-07-28-project-universe-rialo-ambient-shared-contract-fix1-handoff-14e-e4-f1.md`

## 问题证据与设计裁决

E2/E3 独立 Review 已 PASS，但新 production Rialo exact repeat8 只有 `3 PASS / 5 FAIL`；失败轮次 Cover 只有 2–3 个 material steps。Architecture 五次只读 production 探针都证明：

- click 后 preview 为空，controller 保持 commit；
- Canvas、Rialo event 与 corridor 继续完整约 780ms；
- 约 720ms 仍 morphing，约 925ms 才 idle；
- 同目标 synthetic pointerout/over 已由 E2 no-op guard 正确处理。

因此 E2 controller、UniverseShell、Canvas/Three、780/220ms 与 cinematic 门槛全部冻结。

复合空间签名 A/B：

- 当前 `.radar` ancestor ambient：约 3 steps；
- ambient disabled：4/4 均 5 steps；
- 旧 ancestor animation 仅稳定+pause：1–2 steps；
- 主循环解耦到首块 corridor plane 的 independent translate、route 仅 opacity、morph pause：4/4 均 4–5 steps。

E4 的最小裁决是让 ambient 与 committed transform 使用独立合成通道，同时保持 animation identity；A/B 只证明因果，正式 production repeat8 仍待 reviewer PASS 后由 Architecture 执行。

## 实现文件与冻结哈希

按以下顺序：

1. `src/components/rialo/rialo-reactive-loop.module.css`
   - SHA-256：`1ef6a3a49de6c99813d6f72d78ed3dec8fb83722a7d815d6a6decdeb22d9f853`
2. `src/components/rialo/rialo-reactive-loop.test.tsx`
   - SHA-256：`5ac41d1bce8b083196e81a2cf04a810fe7e28788c6d635489835d619cb85587b`
3. `src/components/stage/instrument-stage.test.tsx`
   - SHA-256：`729c2061b9f47e030df72555f7c78f81ff483d8eb69565d5a9fa6468a5c5c001`
4. `src/styles/design-contract.test.ts`
   - SHA-256：`52e37dafcca310d58bdafe4f7eb30988deb45f8dede9fc40aedb905221ae724e`

四文件有序聚合：

`e39af99ed367a4f85dbc0fc01cba6891c80e2b1fb5ce9977397dd8ecbb4152fe`

E4 原始两文件基线聚合：

`75a2c80a1ea9b7780fc5c3d59013cd6c0c7ab27936443a0626d42c6f1aa690b0`

Fix1 原始两文件基线聚合：

`a9fe8dcb7f671282756cbbaee45ec364dbd2047a9926feca404828929035a4b4`

## Implementation Evidence

### E4 产品与本地契约

GPT-5.6 Sol worker 只修改 Rialo CSS 与本地 CSS 测试：

- RED：旧 `.radar` owner 导致 `1 FAIL / 9 PASS`。
- GREEN：focused `10/10 PASS`。
- scoped ESLint、typecheck、Playwright list `5 tests / 1 file`、diff-check 均 PASS。
- `.radar` 不再承担持续 transform animation。
- `.corridorPlane:first-child` 承担 8.8s、`-4.4s`、约 12px × 7px 的 independent `translate` 主循环。
- `.radarRoute` 只动画 opacity。
- stable ready + High/Medium + demand + entry-settled 规则创建 animation，默认 paused；idle 规则只切换 running。
- reduced-motion 显式关闭两条循环；Low/Static、移动端、非 demand 仍无增强循环。
- signal-specific transform endpoint 与 `var(--duration-scene-morph)` transition 保持不变。

### E4 Fix1 共享测试迁移

Architecture 首次 full verify 暴露两个真实 RED：`31 files PASS / 2 files FAIL；390 tests PASS / 2 FAIL`。共享测试仍硬编码旧 `.radar` owner、idle 才创建 animation、只接受 exact reduced owner 和 `opacity/transform` 白名单。

新的 GPT-5.6 Sol worker 只修改两个共享测试：

- 消费既有 RED：`18 PASS / 2 FAIL`。
- focused 最终：`2 files / 21 tests PASS`。
- scoped ESLint、typecheck、diff-check 均 PASS。
- Rialo 主 owner 精确为 `.corridorPlane:first-child`，六个真实 owner 数量保持。
- Rialo stable 规则必须且只能有一个 `animation-play-state: paused`，显式拒绝混入 running。
- idle 规则 body 必须精确只含 `animation-play-state: running`，不重建 animation。
- reduced selector 只允许 exact、带空格组合边界的末端 selector 或既有 wildcard；相似 class、假后缀和中间 substring 负例保持失败。
- compositor property 白名单只新增 independent `translate`。

一次并行只读 specialty audit 曾指出 stable 只用 `toContain(paused)` 会允许同规则后置 running。Architecture 据此判为 Fix1.1 并退回同一 worker；最终 hash `729c...c001` 已改为 play-state 声明数组必须精确等于 `['paused']`。

specialty audit 另提出两个未来测试收紧点，Architecture 当前裁决为不扩大切片：

- shared generic test 的 High/Medium selector 可能在混合 owner 的单一规则内相互代偿，但 E4 本地契约已对 corridor 与 route 的 stable selector 数组逐项精确匹配 High/Medium，四文件组合契约不会放过当前风险。
- `.corridorPlane:first-child` 的 DOM 结构可增加专门回归断言；当前 TSX 源码第一、第二真实 child 都是 corridor plane，Architecture 已检查。该建议不构成当前实现错误，且本次生产 repeat8 与 Art Director 仍会验证真实运行结果。

reviewer 应独立判断上述组合契约是否足够；如认为不够，应给出具体 `FIX_REQUIRED`，不得自行修改文件或扩大到产品 DOM。

## Architecture Fresh Verification

```text
npm test -- --run \
  src/components/rialo/rialo-reactive-loop.test.tsx \
  src/components/stage/instrument-stage.test.tsx \
  src/styles/design-contract.test.ts
=> 3 files / 31 tests PASS

npm run verify
=> ESLint PASS
=> typecheck PASS
=> 33 files / 393 tests PASS

openspec validate build-project-universe --strict
=> valid

git diff --check -- <E4/Fix1/OpenSpec/handoff/session-state paths>
=> PASS
```

Protected SHA-256 复核：

- `.gitignore`：`af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94`
- `main.py`：`bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0`
- `AGENTS.md`：`1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf`
- `.agents/**` 有序聚合：`0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770`
- `playwright.config.ts`：`141b884d843e21c451d1e129b4458f67c166dc311f5be60372223cee800d7c54`

## Reviewer 必查

1. 四文件 hash、两个 handoff allowlist 与最终 changed-files 是否匹配。
2. independent `translate` 是否与 signal-specific `transform` 真正解耦，且 stable animation identity 在 morph 时只 pause、不删除/restart。
3. route helper 是否只动画 opacity，是否仍只有一个 main + 一个 auxiliary。
4. reduced-motion、移动端、Low/Static、非 demand 是否继续 fail-closed 静态。
5. 本地与共享测试是否确实约束六个真实 owner、High/Medium、ready/demand/settled、负 delay、7–10s、no pseudo、stable paused / idle running。
6. reduced selector suffix 映射是否有边界，`translate` 白名单是否只新增精确一项。
7. E2/controller/Canvas/Three/E2E/snapshot/阈值与 protected files 是否未被修改。
8. OpenSpec 与实现是否一致；tasks 14.20 仍保持未完成，浏览器与 Art Director 门禁不得提前勾选。

## Reviewer 允许的验证

```bash
npm test -- --run src/components/rialo/rialo-reactive-loop.test.tsx src/components/stage/instrument-stage.test.tsx src/styles/design-contract.test.ts
npx eslint src/components/rialo/rialo-reactive-loop.test.tsx src/components/stage/instrument-stage.test.tsx src/styles/design-contract.test.ts
npm run typecheck
npm run verify
openspec validate build-project-universe --strict
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test tests/e2e/cinematic-motion.spec.ts --list
git diff --check -- src/components/rialo/rialo-reactive-loop.module.css src/components/rialo/rialo-reactive-loop.test.tsx src/components/stage/instrument-stage.test.tsx src/styles/design-contract.test.ts
```

Reviewer 不得运行真实 browser/build/server/port/Lighthouse/snapshot，不得部署 Vercel，不得 commit/push，不得修改文件。

## PASS 后 Architecture 门禁

1. 停止当前旧 E2 3100，确认 3000 与 3100 释放。
2. build 并仅启动 exact `127.0.0.1:3100`，保持 3000 空闲。
3. frozen Rialo cinematic exact repeat8 必须 `8/8 PASS`，每轮 Cover 至少 4 steps，原 780ms / 650–900ms / 50ms 不变。
4. 完整 cinematic file 必须一次 GREEN；若 collector 异常复现则保留 NO_GO。
5. 只有浏览器门禁通过才捕获候选并交给专业 Art Director；只有 GO 才可更新七张 snapshot。
