# Project Universe 无边界电影化画布 — Integration Evidence 13

## 决策

- ChangeId：`build-project-universe`
- Task：OpenSpec 13.1–13.6
- Architecture 决策：`PASS_PENDING_INDEPENDENT_REVIEW`
- Implementation Executor：GPT-5.6 Sol worker `/root/implement_borderless_13`
- Integration Owner：Architecture Codex `/root`
- Git 基线：`UNBORN_HEAD`
- Graphify：`DEGRADED_NO_GRAPHIFY_OUT`；仓库不存在 `graphify-out/graph.json` 或 `GRAPH_REPORT.md`
- PostToolUse tracker：当前环境未提供可消费的 runtime verification summary，以 frozen hashes、fresh CLI、浏览器矩阵、九份 Lighthouse 原始报告和端口检查替代
- 范围：25 个实际变更文件，全部位于 27 文件 handoff allowlist；无范围扩展、依赖变化、提交或部署

## 设计结论

本增量采用用户确认的 `Borderless Cinematic Canvas + Open Instrument Rails`：

- 首页、Arc、Rialo 的 Instrument Stage 删除闭合外框、内缩矩形和不透明面板，保留衰减 datum、项目色单侧轨、可操作 DOM 与单一 Canvas。
- Arc readout、Arc selector、Rialo readout、Rialo 五阶段轨改为开放式仪器表面；唯一主要 CTA 保留实体边界。
- 四个详情 Hero 与签名场删除重复闭合容器，保留 SVG 网格、轴线、信号、标签和项目色。
- 入场为 720ms；交互反馈为 220ms；Home、Arc、Rialo 环境微动分别为 20/24s、18s、12s。
- 环境微动只在 desktop、`prefers-reduced-motion: no-preference` 与 `data-universe-ready=true` 下启用；Canvas 继续 `frameloop=demand`。
- reduced-motion、saveData、WebGL unavailable 和移动端关闭持续循环或使用完整静态终态。

## TDD 与实现证据

- RED：6 个 Vitest 文件，33 个断言中 24 PASS / 9 expected FAIL；失败精确覆盖闭合边界、缺失动效 token/keyframe、hover/focus/pressed 等价和 Arc active accent。
- Home / Arc GREEN：5 files / 25 tests PASS。
- Rialo GREEN：2 files / 7 tests PASS。
- 详情 / 签名 GREEN：2 files / 14 tests PASS。
- 浏览器 RED：21 个结构、响应式与动效契约 PASS，仅六张旧视觉基线按预期差异。
- 更新候选后：Visual 6/6 PASS；progressive/responsive/visual 三规范 27/27 PASS。
- Architecture 独立复验：上述三组 focused Vitest、实现哈希、六张 Static 原图、三张 normal-motion 增强态和完整质量门均通过。

## Frozen hashes

完整 27 文件 allowlist 聚合 SHA-256：

`c2a15c822e90f164db141c965ba99a1356c5135b30d97925bd8f9b818fdb20c6`

实际 25 个变更文件聚合 SHA-256：

`3923c83faeb1a5aacd7a658954a306e5fc31b314b6ebcc1af979714b170b0f42`

受保护基线保持：

```text
af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94  .gitignore
bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0  main.py
1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf  AGENTS.md
0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770  .agents aggregate
```

逐文件最终 SHA-256：

```text
5c1a6fd16c50cd00acfbeedfda1bd60db16980f4c07ae086e6ede26d56fa7aee  src/styles/design-contract.test.ts
7c7a45fc07d24f2b1f7ee8df64fe03d5bb61ce1e0145784455a9309d53ac2465  src/components/stage/instrument-stage.test.tsx
0030ec07c78788ae86d27ba88f0c72dff95a7e8285d76cea254a119d06fb2cae  src/components/stage/home-instrument-stage.test.tsx
6fd9582627910932a99912df7d85998b8fef8399d66f22c546780b490ec88a55  src/components/stage/arc-instrument-stage.test.tsx
b23c8e2f2a9488fae3b85d23fa4323cf2f312d707f48e049ccdbb60fb3992e95  src/components/stage/rialo-instrument-stage.test.tsx
20b1aa8823d488a795ed410b33bedb09b7c4370f714668cab9ffc7d83d19e814  src/components/rialo/rialo-reactive-loop.test.tsx
df8bfc6269451d9a042bf73d8cff0d1120204560cd2a7b5fcb81d1a445dd8577  src/components/project/project-case-study.test.tsx
47ca9ae5a302a85ab04cbbb4901632ee511b58a4b6da4cbaf3dc1aa663f39700  src/components/project/signature/project-signature.test.tsx
724e93cc365f930fc6e3d123e75676364674d6e5fa4fba7afefcf807145ada0c  src/styles/tokens.css
4e77aade4e59b9a7e5fe7cc45d2f39e5fdf69a53631edd6164f7a34701d35f31  src/styles/motion.css
a4c429787e15eba9b5301d1f7634d1cc96f249fce0f2c3aaae598be8c0fa864d  src/app/globals.css
305319387a1ff2e941f37f3b74bf90ee9a654210ea0c27c066b405b2e62eb91c  src/styles/universe-pages.module.css
fc1a67ca908a03261c346a16a1dbd3833736681dcdddadada411310aede2d13e  src/components/stage/instrument-stage.module.css
5c32dd218d5e00ed413e20b62f2d7982fd5334689e9b361b5c569d5cf423b562  src/components/stage/arc-instrument-stage.client.tsx
e3e0692d611d404ea30def03d5ca3569545d17e2b7c86bde4fc9de1742f1b2f8  src/components/scene/universe-shell.module.css
9ebc47c1ddefc31ed6b608d8223c123a449f1bb396993e1ba750ed834f66330b  src/components/rialo/rialo-reactive-loop.module.css
38a599929e90e34ff1a341220f8c5516ad035840b769c1de48b71eb8037d1875  src/components/project/project-case-study.module.css
b55629ed904612e6bc7ef32d26c88306e2958f1bf38ad2d438a1e3d1709baf77  src/components/project/signature/project-signature.module.css
57e98139aadf9e65f28f1c4c522443d0c350577197080ea5c08e4ec97cb7e96e  tests/e2e/progressive-enhancement.spec.ts
1fa627a64b6cee8c316781fb9ffd77793ffdc82c023b48e2fd0be1ef65167ea7  tests/e2e/responsive.spec.ts
2fd54c29dd0eb79a073502b2c641a8a46d0c41d7d298b75803a4166f00194b59  tests/e2e/visual-reference.spec.ts
a081b5c205479e57cf4bdd4d0cac6beafd0a9cff5deee5a6db4769795dcdc251  tests/e2e/visual-reference.spec.ts-snapshots/arc-1440-chromium-darwin.png
f2595087844403f63c61fe5a72321971bd45b2cb8280783e0313c77804c473a7  tests/e2e/visual-reference.spec.ts-snapshots/arc-390-chromium-darwin.png
d38a398abf00a39866d37011cf842c66a0affd0d79a3b5d85ae5e64786071cf5  tests/e2e/visual-reference.spec.ts-snapshots/home-1440-chromium-darwin.png
7f13caaa40eb00c8822beeb6bca3e36ea269272e5445e27e3228d5e42f0d1634  tests/e2e/visual-reference.spec.ts-snapshots/home-390-chromium-darwin.png
fca9bb96ad34675655b24b0d6425a940333d36d1006c187bcf932640c8c0601d  tests/e2e/visual-reference.spec.ts-snapshots/rialo-1440-chromium-darwin.png
9d2b6b6c7c3faba5b0713d395b38b0de0ef976931c223bdcfb3637f2fe6e904c  tests/e2e/visual-reference.spec.ts-snapshots/signal-ledger-1440-chromium-darwin.png
```

## Architecture fresh verification

```text
npm run verify
PASS — ESLint；TypeScript；Vitest 29 files / 195 tests

NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build
PASS — compiled；TypeScript；14/14 static pages

npm run test:build-gates
PASS — 45/45

npm run check:links
PASS — 133 total / 121 local / 12 external HTTPS

npm run check:budgets
PASS — full enhanced 249.5/260.0KiB
       Home 246.3/250.0KiB
       Arc 246.4/250.0KiB
       Rialo 246.7/250.0KiB

npm run test:e2e
PASS — 79 passed / 10 production-only skipped

npm run lighthouse
PASS — production Playwright 13/13；LHCI 9 reports；assertion-results []

openspec validate build-project-universe --strict --no-interactive
PASS
```

Lighthouse 三次运行的中位数：

| Route | Performance | Accessibility | Best Practices | SEO | LCP | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 0.98 | 1.00 | 1.00 | 1.00 | 2330.8576ms | 0 |
| `/arc/signal-ledger` | 0.98 | 1.00 | 1.00 | 1.00 | 2328.679ms | 0 |
| `/about` | 0.99 | 1.00 | 1.00 | 1.00 | 2177.3774ms | 0 |

Home 首次 Lighthouse performance 为 0.77，后两次均为 0.98；配置按三次中位数判定并全部通过。此离群运行透明保留给 reviewer 判断。

完整浏览器验证包含 axe serious/critical、键盘、八条公开路由、404、无 JavaScript、320–1920px、reduced-motion、saveData、WebGL unavailable、快速路由切换、资源释放、SEO、安全头和六张视觉基线。开发日志仍包含上游 `THREE.Clock` deprecated 与 Next smooth-scroll 提示；无测试、控制台错误门禁或运行时断言失败。

## 视觉证据

Architecture 查看了以下六张 Static 原图：

- `tests/e2e/visual-reference.spec.ts-snapshots/home-1440-chromium-darwin.png`
- `tests/e2e/visual-reference.spec.ts-snapshots/arc-1440-chromium-darwin.png`
- `tests/e2e/visual-reference.spec.ts-snapshots/rialo-1440-chromium-darwin.png`
- `tests/e2e/visual-reference.spec.ts-snapshots/signal-ledger-1440-chromium-darwin.png`
- `tests/e2e/visual-reference.spec.ts-snapshots/home-390-chromium-darwin.png`
- `tests/e2e/visual-reference.spec.ts-snapshots/arc-390-chromium-darwin.png`

并查看 normal-motion 增强态：

```text
b8a0645cb7367de95e3e66be9f82ddde615d4bce762498b9ec008f0fc664862e  /tmp/captain-dock-enhanced-home-1440.png
f61ef2919a7f411e77fff9af73858f1af8bcfb9b33f4751d5c9d562e81b1fec3  /tmp/captain-dock-enhanced-arc-1440.png
6834115a4513cf70dd01edaa3edd2192872ebf0ab6c276deca2acf99c759f6e5  /tmp/captain-dock-enhanced-rialo-1440.png
```

三页增强态均为 `canvasCount=1`、`data-universe-ready=true`、`frameloop=demand`、`runtimePhase=ready`、`settled=true`、`transitionPhase=idle`、`quality=high`。

Signal Ledger 候选曾固化一次 Playwright expected-match 合成污染。只读复现证明真实页面 `scrollX=0`、document/body 1440/1440、品牌与 header/main 几何稳定，两次直接截图 hash 均为最终 `9d2b6b...`。Architecture 仅批准替换该 PNG；之后单图 1/1、全视觉 6/6、三规范 27/27 和完整 E2E 均稳定通过。

## 验收覆盖

1. Home / Arc / Rialo 无闭合 Stage 外框：源码契约、计算样式、六张原图通过。
2. DOM、按钮/链接、scene-target 和四项目顺序保留：Vitest、路由、键盘、渐进增强通过。
3. 开放 readout/selector/loop rails 与实体主要 CTA：源码契约、计算样式、视觉通过。
4. 四详情开放签名且保留内部 SVG 语义：14 个 focused tests、详情 E2E、代表视觉通过。
5. 720ms 入场、12–24s 环境微动、220ms 反馈：normal-motion 浏览器断言通过。
6. Canvas demand rendering 与既有状态机不变：增强态、快速路由与资源释放测试通过。
7. reduced-motion/saveData/WebGL fallback：无 Canvas、无持续循环、完整终态测试通过。
8. 320–1920px：响应式几何与水平溢出门禁通过。
9. 八条路由、四项目、真实 HTTPS live URL、英文表面、SEO、安全与预算：完整门禁通过。
10. 六张 Static 与三张 enhanced 原图：Architecture 已查看并接受。

## Independent Review Decision

- Reviewer：独立 Review Codex `/root/review_borderless_13`
- Decision：`PASS`
- Findings：none
- Reviewer 独立重算 27 文件 aggregate `c2a15c...` 与全部 protected hashes，复验 verify 29/195、Task 13 focused 8 files/36 tests、build-gates 45/45、links、budgets、strict OpenSpec、Lighthouse 九份 raw JSON 与 3100 空闲。
- Reviewer 接受 Home 首次 Lighthouse 0.77 离群值：`lighthouserc.json` 明确定义 median aggregation，Home 中位 0.98、LCP 中位低于 2.5s、CLS 0。
- Reviewer 查看六张 Static 与三张 enhanced 原图，未发现 boxed-stage 回归、Signal Ledger 污染、移动端纵向舞台框或明显层级丢失。

Review PASS 后，Architecture 在 `127.0.0.1:3100` 恢复 production preview；`/`、`/arc`、`/rialo`、`/arc/signal-ledger` 均返回 HTTP 200，未使用其他端口。

## 保留项

保留项：

- `9.5`、`11.4–11.7` 与最终用户视觉验收仍保持待办。
- Vercel Preview/Production、正式域名、Git commit 均不在本轮授权范围。
- 本地 production preview 当前占用 `127.0.0.1:3100`，仅供用户最终视觉验收；不得使用其他端口或部署。
