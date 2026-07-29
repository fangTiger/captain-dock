# Task 14.20 E4 — Rialo ambient / committed 空间通道解耦 Handoff

## 任务身份

- ChangeId：`build-project-universe`
- TaskId：`14.20 / E4`
- Executor：GPT-5.6 Sol Implementation worker
- IntegrationOwner：Architecture Codex `/root`
- ReviewMode：独立 Review Codex
- SessionStatePath：`.codex/session-state.md`
- GitBaseline：`UNBORN_HEAD`，工作区存在用户与既有任务的 dirty baseline
- Graphify：`DEGRADED_NO_GRAPHIFY_OUT`

## 已批准设计

OpenSpec design §21.8 与 progressive visual delta 是本切片的当前规范源。

E2 已经修复 same-committed preview race。Architecture 在真实 production `127.0.0.1:3100` 上连续五次证明：

- click 后 preview 为空；
- Canvas 与 Rialo event 保持完整约 780ms committed morph；
- 720ms 仍为 morphing，约 925ms 才 idle；
- 同目标 synthetic pointerout/over 不会重启 timeline。

最新 exact repeat8 仍只有 `3/8 PASS`。根因是 `.radar` 祖先与 `.radarRoute` 的 8.8s ambient animation 只在 idle 规则内存在，morph 开始时被卸载、结束时以负 delay 重建；复合页面空间签名因此受到环境 owner 的 transform 回落/重启和过高 ambient threshold 污染。

Architecture 只读 A/B：

- 当前 owner：约 3 个 material steps；
- 关闭 ambient：4/4 均为 5 steps；
- 仅保留旧祖先 animation 并 pause：只有 1–2 steps；
- 主循环解耦到第一块真实 corridor plane、route 收为 opacity、morph 时 pause：4/4 均为 4–5 steps。

这些 A/B 只证明实现方向，不替代最终 production exact repeat8。

## 精确可编辑范围

1. `src/components/rialo/rialo-reactive-loop.test.tsx`
2. `src/components/rialo/rialo-reactive-loop.module.css`

基线 SHA-256：

- test：`8d61979ae505389257cfc03b3b1ed4f322234efa8307ac61be6139e918c6b54d`
- CSS：`be79d938994ce76db9b18b011fe5c9edb69f0f37c225f7cd4f4e0e3fba155d72`
- 两文件排序聚合：`75a2c80a1ea9b7780fc5c3d59013cd6c0c7ab27936443a0626d42c6f1aa690b0`

## 禁止范围

- 不得修改 controller、UniverseShell、Canvas/Three、finite morph、Rialo TSX/DOM、Stage API 或任何 E2E。
- 不得修改 780/220ms 常量、四步 material gate、650–900ms、200ms 或 50ms 门槛。
- 不得修改或生成 snapshot。
- 不得启动、停止或访问服务，不得运行 browser/build/Lighthouse，不得触碰任何端口。
- 不得部署 Vercel，不得 commit/push。
- 不得回退其他 agent 或用户的已有改动。
- 如实现需要第三个文件、DOM wrapper、公共 API 或测试阈值变化，立即停止并向 Architecture 请求回到 DESIGN。

## TDD 要求

### RED

先只修改 `rialo-reactive-loop.test.tsx`，把现有 ambient CSS 契约升级为以下 fail-closed 断言，并运行 focused Vitest，保存预期失败：

1. `.radar` 不再声明 `rialo-corridor-breathe`。
2. 第一块真实 `.corridorPlane` 是 8.8s 主循环 owner。
3. 主循环 keyframes 使用独立 `translate` 通道，不写 `transform`，总水平位移约 12px、垂直位移约 7px。
4. `.radarRoute` 的辅助 keyframes只改变 opacity，不写 transform。
5. ready + desktop High/Medium + demand + entry-settled 的稳定 owner 规则声明 animation name/duration/delay，且不依赖 `morph-phase=idle` 才创建 animation。
6. 稳定 owner 默认 `animation-play-state: paused`；单独的 idle 规则只切换为 `running`。
7. reduced-motion 继续对 corridor 主循环和 route 辅助设置 `animation: none !important`；Low/Static、移动端、非 demand 不得获得循环。
8. 既有 `.corridorPlane` signal-specific `transform` endpoint 与 `transform var(--duration-scene-morph)` committed transition 契约继续保留，不得被 ambient animation 覆盖。

RED 必须来自当前 CSS 仍把 animation 绑定到 idle `.radar` / transform route 的真实缺陷，不能制造与规范无关的失败。

### GREEN / REFACTOR

只修改 `rialo-reactive-loop.module.css`：

- 把 8.8s、`-4.4s` 的环境主循环从 `.radar` 祖先移动到第一块 `.corridorPlane`。
- 环境主循环只动画独立 `translate`，让现有 signal-specific `transform` 与 780ms transition 独立工作。
- route 辅助循环只动画低幅 opacity。
- animation 声明在 ready / desktop High 或 Medium / demand / entry-settled 生命周期中保持稳定，默认 paused；idle 只负责 running。
- 保持一个主循环加一个辅助循环，不新增 DOM、第三条循环、filter/blur/layout 动画或持续 Canvas 帧。
- reduced-motion、移动端、Low/Static、saveData、隐藏、离视口与非 demand 保持静态终态。
- 不扩大视觉重构，不改变排版、文案、路由、项目事实或真实链接。

## Worker 可运行验证

```bash
npm test -- --run src/components/rialo/rialo-reactive-loop.test.tsx
npx eslint src/components/rialo/rialo-reactive-loop.test.tsx
npm run typecheck
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test tests/e2e/cinematic-motion.spec.ts --list
git diff --check -- src/components/rialo/rialo-reactive-loop.test.tsx src/components/rialo/rialo-reactive-loop.module.css
```

Worker 不得运行真实 Playwright、build、server、port、Lighthouse 或 snapshot 命令。

## 交付证据

- RED 命令与精确失败数/原因。
- GREEN focused test、ESLint、typecheck、Playwright list、diff-check。
- 两个最终文件的 SHA-256 与排序聚合。
- changed-files allowlist。
- 规范覆盖说明、未验证项和残余风险。

## Architecture 后续门禁

1. 源码与 allowlist 检查。
2. fresh focused/full unit、typecheck、lint、OpenSpec strict、diff-check。
3. 独立 Review Codex `PASS`。
4. 停止旧 3100，仅重建/启动 exact `127.0.0.1:3100`，保持 3000 空闲。
5. frozen Rialo exact repeat8 必须 `8/8 PASS`，每轮 Cover 至少 4 个 material steps，原 780ms/50ms 门槛不变。
6. 运行完整 cinematic file；collector 异常若复现则保留 NO_GO，不得重试掩盖。
7. 只有上述全部通过，才恢复七张候选与专业 Art Director gate。

