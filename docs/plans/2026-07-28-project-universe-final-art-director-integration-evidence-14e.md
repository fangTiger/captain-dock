# Project Universe 最终 Art Director Recovery — Integration Evidence 14e

## 决策

- ChangeId：`build-project-universe`
- Tasks：OpenSpec 14.17–14.20
- Architecture 决策：`PASS_READY_FOR_USER_VISUAL_ACCEPTANCE`
- Architecture / Integration Owner：`/root`
- Implementation：GPT-5.6 Sol workers，按 Carrier、Editorial、motion/density、production recovery、E2–E5 切片执行
- Independent Review：各实现切片独立 Review Codex；最终 E5 reviewer `/root/review_recorder_ordering_e5` 为 `PASS`
- Professional Art Director：`/root/art_director_e4` 为 `GO`，无 P0/P1
- GitBaseline：`UNBORN_HEAD`；保留用户与历史任务 dirty baseline
- Graphify：`DEGRADED_NO_GRAPHIFY_OUT`
- PostToolUse tracker：当前环境无可消费 runtime verification summary；以 frozen hashes、fresh CLI、生产浏览器、23 张候选、九份 Lighthouse 原始报告和端口/路由探针替代
- 部署/版本控制：未部署 Vercel，未 commit/push

## 最终设计结果

本轮完成用户选择的 A 方向，并把既有 `Borderless Cinematic Canvas / Seamless Instrument Field` 推进到可感知的电影化系统：

- Home、Arc、Rialo 共用无闭合舞台边界、单一持续 Canvas、开放 instrument rails 和大体量 protagonist；三页分别保留项目卷盘、轨道观测器与反应式飞行场的独立形态。
- 首页只保留一个主判断、一个主动作；220ms preview 驱动 mass/horizon/accent，但 committed 文案、CTA 与 ARIA 只在 780ms commit 更新。
- Arc/Rialo 的 ambient 与 committed motion 已分离；Rialo 主循环位于第一块真实 corridor plane 的 independent `translate` 通道，route 只保留 opacity 辅助，morph 时稳定 pause 而非重建。
- 详情页采用 media-led `Problem / Mechanism / Proof` 编辑式画布；Carrier Spine 取代深色全屏 veil，四项目事实、路由、真实链接、no-JS 和渐进披露保持。
- 移动端是真实重排而非桌面缩放；reduced-motion、saveData、Low/Static、隐藏、离视口和 WebGL unavailable 均回到完整静态终态。
- 公开页面继续全英文；四项目、八条公开路由与真实 HTTPS live URL 保留。

## 专业视觉门禁

专业 Art Director 查看 23 张 fresh candidates、metadata、formal stabilizer candidates 与旧母版后给出 `GO`：

- 无 P0/P1；
- 确认电影化尺度、文案删减、无边界 instrument field；
- 确认 Home/Arc/Rialo 主角差异、preview/Carrier/Rialo motion 与 390px 真实重排。

保留两个非阻断 P2：

1. Signal Ledger 390px dossier/title texture 有局部接近；
2. Home 1440px CTA 靠近首屏下缘。

Art Director 授权后，七张 snapshot 只更新一次，随后立即 no-update `7/7 PASS`；E5 完成后 full production 和最终显式 `--update-snapshots=none` 又分别 `7/7 PASS`，未再更新。

## E5 recorder readiness

E4 Fix2 独立 `PASS` 后，首次 full production 的唯一失败是 Home recorder：

```text
Screencast timestamp duplicate or backward order。
```

Architecture 没有重跑掩盖。Chromium 源码诊断证明 timestamp 在 capture 时写入，PNG 随后并发编码，事件按 encode completion 到达；旧 selector 错把 transport arrival 当 capture chronology。

E5 只修改：

```text
7f8e8532bd0ed5967f98c19190b32985e2e02171d24e9b0c15ac06cb33e637c7  src/test-support/cinematic-screencast-selector.ts
85500b8300751c7578118838ba710d32846e914152ae1287d93e0da9246991b1  src/test-support/cinematic-screencast-selector.test.ts
68e81666a161d542dec04e7a704e01cc4800042cae32b8abe052894540c75910  ordered repository-relative aggregate
```

TDD：

- RED：`3 failed / 84 passed`，均精确命中旧 backward-arrival rejection；
- GREEN：focused `88/88`；
- raw `sequence` 只保留 arrival/boundary identity；
- converted `frameSwapAtMs` 排序前碰撞一律 fail closed；
- unique timestamp 建立 canonical boundary/predecessor/checkpoint/DFS chronology；
- same PNG + different timestamp 不合并；
- deferred ACK、projection collision 与 stronger stopping exclusion 均有测试。

Architecture 与独立 reviewer 均 fresh 通过 focused 88/88、full verify 33/398、strict OpenSpec、list5、diff-check 和 frozen hashes。Reviewer 决策 `PASS`，findings none，无 DOWNGRADE。

## Architecture fresh verification

### 静态与构建产物

```text
npm run verify
PASS — ESLint；TypeScript；Vitest 33 files / 398 tests

openspec validate build-project-universe --strict --no-interactive
PASS

E4 production build
PASS — 14/14 routes；E5/Fix2 之后只有 test-support/E2E/docs 变化，产品 build 保持冻结

npm run test:build-gates
PASS — 45/45

npm run check:links
PASS — 121 total / 117 local / 4 external HTTPS

npm run check:budgets
PASS — full enhanced 252.8/260.0KiB
       Home 249.1/250.0KiB
       Arc 249.2/250.0KiB
       Rialo 249.5/250.0KiB
       scenes 1.6/1.7/2.0KiB，均低于 45KiB
       4 images，largest 75.4KiB
```

### 固定顺序生产浏览器

独立 Review `PASS` 后，Architecture 按固定顺序执行：

```text
Home opening focused
PASS — 1/1

full cinematic-motion.spec.ts
PASS — 5/5

full production matrix
PASS — 113 passed / 3 intentional development-only skipped / 0 failed

visual-reference.spec.ts --update-snapshots=none
PASS — 7/7
```

第一次 sandbox 命令在 Chromium 启动、页面与测试逻辑创建前即因环境权限 `SIGABRT`；Architecture 停止序列并改用获授权的 host browser，记录上述首次有效 Home 执行。没有产品或 collector 测试被 retry 来选择一次通过。

完整 production 覆盖 axe serious/critical、键盘、触摸、no-JS、320–1920px、reduced-motion、saveData、WebGL unavailable、快速路由、资源释放、SEO/安全、详情、视觉、cinematic、首次反馈与冷路由隔离。

### Lighthouse

为保持用户正在查看的 exact 3100 不间断，未调用会强制要求端口空闲并自行启停服务的 wrapper；Architecture 直接使用同一 `lighthouserc.json`、同一 Playwright Chromium、同一三个 URL × 三次采样、同一 median/assert 阈值审计现有受审 production 服务。

| Route | Performance | Accessibility | Best Practices | SEO | Median LCP | Median CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 0.97 | 1.00 | 1.00 | 1.00 | 2487ms | 0 |
| `/arc/signal-ledger` | 0.98 | 1.00 | 1.00 | 1.00 | 2412ms | 0 |
| `/about` | 0.98 | 1.00 | 1.00 | 1.00 | 2337ms | 0 |

九份报告全部通过；assertion results 为 `[]`：

```text
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  .next/lighthouse/.lighthouseci/assertion-results.json
9030044839e15bffaa9fd68e86d8b9c61c83d30c721d489cca7f3ac24ea6eb67  .next/lighthouse/reports/manifest.json
```

Home median LCP 2487ms 仅比 2500ms 本地门槛低 13ms；它是透明保留的非阻断性能余量风险，不能冒充部署后的真实 RUM/INP。

## Frozen visual / protected hashes

```text
00d8235e6bdc3aec69ceeb90de9793a0fb0be0d62b2e32b44882db386f187ea4  Home1440
a40523e3f89d54c5349f397d63bd0e787ea14f9de22012d8f72cf4c6f09d629f  Home390
8b43040ec99c5db3fff1d0f3915aac0f8db3c66ee3c903120b4566af44ed55f9  Arc1440
88482ebaa302b7fae6b33f4aa1e2787bc44ee13c5c5f1691c25da70326d5ee62  Arc390
1f53dfeb3a0765e279c9791dc37006c2ffe9afe3d59b7c369eebf90b32a4a50a  Rialo1440
5407afe846a2882ce47d7f675813568cf81cb51893243b21f4387a1ebe058661  Rialo390
9ec872dd7039a371253c7e2b37724f1b92a677d40e9ebb27bb0736112f0c24c3  SignalLedger1440

af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94  .gitignore
bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0  main.py
1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf  AGENTS.md
0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770  .agents aggregate
141b884d843e21c451d1e129b4458f67c166dc311f5be60372223cee800d7c54  playwright.config.ts
```

## 本地交付状态

- production preview：`http://127.0.0.1:3100`
- PID：`42398`
- 八条公开路由：全部 HTTP 200
- 3000：空闲
- 未启动或占用任何其他端口
- 未部署 Vercel，未 commit/push

## 保留风险与后续

- Chromium stop/drain 生命周期仍是 recorder 的明确残余边界；若未来出现 stopping 后供帧空洞，必须回 DESIGN 扩为调用方切片，不能放宽 50ms 或重试掩盖。
- Home 本地 Lighthouse LCP 余量较小；部署后的真实网络/RUM 仍需独立授权后验证。
- Art Director 两个 P2 可作为未来微调，不阻断当前 GO；任何继续修改都必须重新走 snapshot/visual gate。
- 当前交付等待用户在 exact 3100 上进行最终主观视觉确认；Vercel 仍需单独授权。
