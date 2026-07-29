# Handoff Task Package — Task 14 Living Monument / Cinematic Project Reel

## Gate 1

- ChangeId: `build-project-universe`
- TaskId: `14.1–14.7`
- AgentId: `/root/implement_cinematic_14`
- SliceId: `cinematic-project-reel-serial`
- Executor: GPT-5.6 Sol Implementation Codex，`xhigh`
- IntegrationOwner: Architecture Codex `/root`
- Review mode: 独立 Review Codex
- SessionStatePath: `.codex/session-state.md`
- GitBaseline: `UNBORN_HEAD`
- Worktree path: `DEGRADED_SHARED_WORKTREE_SERIAL`
- Patch artifact: 无；唯一串行 Implementation Codex 直接写入当前共享工作树
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`；`graphify` 可执行，但项目不存在 `graphify-out/graph.json` 或 `graphify-out/GRAPH_REPORT.md`，query 返回 `graph file not found`

## 批准事实源

按优先级：

1. 用户于 2026-07-27 选择方向 A：`Living Monument / Cinematic Project Reel`。
2. `openspec/changes/build-project-universe/{proposal.md,design.md,tasks.md,specs/**}`。
3. `docs/plans/2026-07-27-project-universe-cinematic-project-reel.md`。
4. `docs/plans/2026-07-27-project-universe-cinematic-project-reel-implementation.md`。
5. 当前源码、测试与 Task 12/13 已通过的集成证据。

冻结 Architecture 文件 SHA-256：

- `proposal.md`: `4274c5a7c1d00e52777092eb3cf2218679355625bdfe2d59f456528c86cff5cb`
- `design.md`: `226d03fa9cbf7e7eebd334088b3a2044b26143345c09dd386d207c7acaedae79`
- `tasks.md`: `b5134f45985c3906726c25a5b44336d9731fcd49f1a1b735c7cf8849fb034d82`
- `progressive-visual-experience/spec.md`: `7b5115022df651909da3351a0bac366c3092aa3129f8cee031e57e316a86394f`
- `project-content-and-detail/spec.md`: `c4db25b4c28396e590dc1e4a4f5ec343613ecf1ed82cea8fe93e581ff9e14532`
- `project-universe-navigation/spec.md`: `caa639792ddbb83a67f4efd2940842be90acef48c64f5068a6d796949466f47e`
- `site-quality-and-discovery/spec.md`: `19be297fbf86cd58e9220149877c3160538e544ac4e77f917595294554918dab`
- Task 14 design: `1256cc19599f839ee9892ad2f08a39506f71bd93012c5731e584a9e932a61504`
- Task 14 implementation plan: `387092a0e5bff7ca588de69845cfa924644aae35e6e34ec069129a5d58b52e04`

OpenSpec gate：

```text
openspec validate build-project-universe --strict --no-interactive
Change 'build-project-universe' is valid
```

独立规格审查：`PASS`。

## Acceptance criteria

1. Home 成为近单屏 Project Reel，一次只有一个活动项目、一句短判断和一个主要 CTA；删除重复 Ecosystems、Projects 卡墙和 About 说明。
2. Arc 三项目和 Rialo 五阶段使用同一 committed/preview/effective target 契约；只有 commit 更新语义标题、CTA、pressed/current 和 live region，preview 只更新装饰性 DOM、Static fallback highlight 与 Canvas。
3. Arc 三状态产生可感知的构型变化；Rialo Trigger 产生全站最强但有限时长的异常/锁定/脉冲事件。
4. committed selection morph 在 650–900ms 内完成，首个可见反馈 ≤200ms；完成后 Canvas 回到 demand，不长期 60fps。
5. Home/Arc/Rialo route handoff 总计 ≤700ms、可取消、保留普通链接/modifier/history/no-JS 语义；详情页通过项目 motif 感知连续但继续无 Canvas。
6. 详情页只有 `Problem / Mechanism / Proof` 三个同权主章节；真实 evidence、核心闭环、技术/限制事实、live URL、返回生态和下一项目全部保留。
7. JS 增强态 selector 使用 button，Enter/Space commit；no-JS 下 Home 四项目/两生态、Arc 三项目、Rialo 唯一项目与五阶段等价文字通过可见真实链接/文本访问。
8. Static、saveData、WebGL unavailable、reduced-motion、Low 与移动端保持完整内容和终态；preview 不触发 live-region churn。
9. 八条公开路由、四项目顺序、真实 HTTPS live URL、全英文、SEO、安全头、外链安全和 About 保持。
10. full enhanced ≤260KiB、每条沉浸式 route ≤250KiB、scene closure ≤45KiB；LCP/CLS/Lighthouse、draw call、triangle、DPR、axe、键盘和 320–1920px 门禁不回退。
11. normal-motion 分帧必须显示主体构型、位置、尺度、镜头或能量路径变化，不能只换颜色/文字；Architecture 查看原图后才可接受。

## Out of scope

- 新项目、新路由、CMS、数据库、登录、多语言或作者资料。
- 修改 catalog 事实、slug、项目顺序、status、live URL、metadata、JSON-LD、sitemap、robots、安全头或外部项目。
- 把 UniverseShell 提升到根布局，或让详情/About 加载完整 Canvas。
- 新依赖、GLB、视频背景、物理引擎、第二 Canvas、长期 `frameloop="always"`。
- Vercel Preview/Production、Git commit、端口 3100 之外的任何监听。
- 修改 Architecture OpenSpec、docs、`.codex/session-state.md` 或 Integration Evidence。

## Editable files / TaskScopeFiles

仅以下精确路径可修改或创建：

```text
src/app/(immersive)/page.tsx
src/app/(immersive)/[ecosystem]/page.tsx
src/app/globals.css
src/components/stage/instrument-stage.tsx
src/components/stage/instrument-stage.module.css
src/components/stage/instrument-stage.test.tsx
src/components/stage/home-instrument-stage.tsx
src/components/stage/home-instrument-stage.test.tsx
src/components/stage/arc-instrument-stage.client.tsx
src/components/stage/arc-instrument-stage.test.tsx
src/components/stage/rialo-instrument-stage.test.tsx
src/components/rialo/rialo-reactive-loop.tsx
src/components/rialo/rialo-reactive-loop.module.css
src/components/rialo/rialo-reactive-loop.test.tsx
src/components/scene/scene-target-controller.client.tsx
src/components/scene/scene-target-controller.test.tsx
src/components/scene/cinematic-navigation-bridge.client.tsx
src/components/scene/cinematic-navigation-bridge.test.tsx
src/components/scene/finite-scene-morph.ts
src/components/scene/finite-scene-morph.test.ts
src/components/scene/universe-shell.client.tsx
src/components/scene/universe-shell.module.css
src/components/scene/universe-shell.test.tsx
src/components/scene/static-universe-fallback.tsx
src/components/scene/static-universe-fallback.module.css
src/components/scene/capability-gate.test.tsx
src/components/scene/scene-types.ts
src/components/scene/universe-canvas.client.tsx
src/components/scene/universe-canvas.test.tsx
src/components/scene/camera-rig.tsx
src/components/scene/scene-router.client.tsx
src/components/scene/transition-machine.ts
src/components/scene/transition-machine.test.ts
src/components/scene/scene-composition.test.tsx
src/components/scene/scenes/home-astrolabe.tsx
src/components/scene/scenes/arc-orbital-circuit.tsx
src/components/scene/scenes/rialo-reactive-field.tsx
src/components/project/project-case-study.tsx
src/components/project/project-case-study.module.css
src/components/project/project-case-study.test.tsx
src/components/project/project-hero.tsx
src/components/project/core-loop.tsx
src/components/project/evidence-section.tsx
src/components/project/project-gallery.tsx
src/components/project/stack-lanes.tsx
src/components/project/project-navigator.tsx
src/components/project/signature/project-signature.module.css
src/components/project/signature/project-signature.test.tsx
src/styles/design-contract.test.ts
src/styles/tokens.css
src/styles/motion.css
src/styles/universe-pages.module.css
tests/e2e/home.spec.ts
tests/e2e/ecosystems.spec.ts
tests/e2e/project-detail.spec.ts
tests/e2e/keyboard.spec.ts
tests/e2e/responsive.spec.ts
tests/e2e/progressive-enhancement.spec.ts
tests/e2e/accessibility.spec.ts
tests/e2e/performance.spec.ts
tests/e2e/visual-reference.spec.ts
tests/e2e/cinematic-motion.spec.ts
tests/e2e/visual-reference.spec.ts-snapshots/arc-1440-chromium-darwin.png
tests/e2e/visual-reference.spec.ts-snapshots/arc-390-chromium-darwin.png
tests/e2e/visual-reference.spec.ts-snapshots/home-1440-chromium-darwin.png
tests/e2e/visual-reference.spec.ts-snapshots/home-390-chromium-darwin.png
tests/e2e/visual-reference.spec.ts-snapshots/rialo-1440-chromium-darwin.png
tests/e2e/visual-reference.spec.ts-snapshots/signal-ledger-1440-chromium-darwin.png
```

初始有 7 个批准新路径不存在：

```text
src/components/scene/scene-target-controller.client.tsx
src/components/scene/scene-target-controller.test.tsx
src/components/scene/cinematic-navigation-bridge.client.tsx
src/components/scene/cinematic-navigation-bridge.test.tsx
src/components/scene/finite-scene-morph.ts
src/components/scene/finite-scene-morph.test.ts
tests/e2e/cinematic-motion.spec.ts
```

按上述顺序，以 `shasum -a 256` 行或 `ABSENT  <path>` 行计算的 TaskScope 初始 aggregate：

```text
84ee4cfb01aac6db46512e5fad89dca93230973be6689a4b2a59d999fd524db7
```

## Forbidden files

除 allowlist 外全部禁止，特别包括：

```text
.gitignore
main.py
AGENTS.md
.agents/**
.codex/**
openspec/**
docs/**
package.json
package-lock.json
next.config.ts
playwright.config.ts
vitest.config.ts
eslint.config.mjs
tsconfig.json
scripts/**
src/content/**
src/lib/metadata.ts
src/components/seo/**
src/app/layout.tsx
src/app/sitemap.ts
src/app/robots.ts
src/app/icon.svg
src/app/(case-files)/**
src/app/(content)/**
public/**
```

保护文件 SHA-256：

- `.gitignore`: `af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94`
- `main.py`: `bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0`
- `AGENTS.md`: `1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf`
- `.agents/**` aggregate: `0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770`

## PreExistingDirtyBaseline

- Git 是 `UNBORN_HEAD`。
- staged：`.gitignore` 新增、`main.py` 索引为空。
- unstaged tracked：`main.py` 相对索引有用户 16 行内容，状态 `AM`。
- 其余 Next 工程、OpenSpec、docs、测试和资产均为既有 untracked 项目状态。
- Task 12/13 已审查 PASS 的实现属于前置基线，不得回滚。
- Architecture 新增/更新的 Task 14 OpenSpec、docs 和 session-state 属于前置规划资产，不在 worker scope。

## GeneratedOrNoisyArtifacts

```text
node_modules/**
.next/**
coverage/**
test-results/**
playwright-report/**
.playwright-cli/**
tsconfig.tsbuildinfo
```

这些只解释 status，不得加入 editable scope。

## TDD / Validation

必须严格执行实施计划 Task 1–7。

### 第一检查点：测试 RED

1. 只修改批准测试文件和创建批准测试文件。
2. 运行实施计划的 Vitest RED。
3. 保持当前 3100 Task 13 preview 运行，使用 external server 运行浏览器 RED：

```bash
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test \
  tests/e2e/home.spec.ts \
  tests/e2e/ecosystems.spec.ts \
  tests/e2e/project-detail.spec.ts \
  tests/e2e/cinematic-motion.spec.ts \
  tests/e2e/performance.spec.ts \
  --config playwright.config.ts
```

4. RED 必须精确对应 Task 14，不得为了通过而放宽旧保留契约。
5. 输出证据并等待 Architecture 允许进入生产实现。

### 第二检查点：单元/组件 GREEN

按 Task 2–6 顺序推进，每个 task 单独运行 focused suites。实现完成后：

```bash
npm run verify
openspec validate build-project-universe --strict --no-interactive
```

`openspec validate` 只读；禁止 worker 修改 OpenSpec。

### 第三检查点：浏览器 GREEN

当前 3100 preview 未授权停止，且 production build 会改写其 `.next`。因此在 Architecture 明确发送 `PORT_3100_LIFECYCLE_AUTHORIZED` 前：

- 禁止 `npm run build`。
- 禁止 `npm run test:e2e`。
- 禁止 `npm run lighthouse`。
- 禁止更新六张 Static snapshots。
- 禁止启动/停止任何服务器。

获得授权后才执行实施计划 Task 7，并把 normal-motion artifacts 保存到 `.next/playwright/test-results/**/cinematic-*.png`。

## Stop conditions

立即停止并报告，不得擅自扩围：

- 需要 allowlist 外文件或新依赖。
- 需要修改 catalog 事实、SEO/security、配置、OpenSpec/docs/session-state。
- 需要详情共享真实 Canvas、第二 Canvas、长期 60fps、滚动劫持或自动轮播。
- committed state 只能通过 DOM query/attribute 反向读取，无法使用明确 React 协议。
- preview 会更新语义标题、主要 CTA、pressed/current 或产生 live-region churn。
- no-JS 无法提供可见真实链接/等价文字。
- modifier/middle/history/快速导航/reduced-motion 语义无法保留。
- 包体、场景预算、冷路由、LCP、CLS、首次反馈、axe、键盘、响应式或真实链接门禁回退。
- 同一 task 连续三次修复仍失败。
- 需要更新视觉快照但 Architecture 尚未查看候选。
- 需要停止当前 3100 或使用其他端口但未获得明确授权。

## Handback format

每个检查点输出：

1. Task 编号与状态。
2. changed files。
3. RED / GREEN 命令、exit code 和关键结果。
4. 需求覆盖。
5. allowlist/protected hash 检查。
6. 未验证项。
7. 范围扩展请求。

最终 Gate 2 Implementation Evidence 必须包含：

- 全部 changed files 与 SHA-256。
- TaskScope aggregate。
- RED、GREEN、verify、build/E2E/Lighthouse（如获授权）证据。
- Static 与 normal-motion artifact 路径/hash。
- OpenSpec requirement 覆盖矩阵。
- 性能、无障碍和安全边界矩阵。
- 未验证项与剩余风险。
