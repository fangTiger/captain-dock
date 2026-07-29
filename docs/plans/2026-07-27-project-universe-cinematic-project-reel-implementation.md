# Project Universe Cinematic Project Reel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把当前说明书式 Project Universe 重构为 Living Monument / Cinematic Project Reel，使 Home、Arc、Rialo 由一个可感知变形的 3D 主体统一，并把四个详情页压缩为 `Problem / Mechanism / Proof` 三章。

**Architecture:** 保留 `(immersive)` route group 的单 Canvas、现有质量分级和 cold detail routes；新增 committed/preview/effective scene target 协议，让真实 DOM 控件驱动有限时长的 3D morph。Home、Arc、Rialo 共享电影化舞台语法但保留各自 owner，详情页使用项目 motif 的轻量 handoff，不把 Three.js 扩展到根布局。

**Tech Stack:** Next.js 16.2 App Router、React 19.2、TypeScript、CSS Modules、motion 12、Three.js、React Three Fiber、Vitest、Testing Library、Playwright、axe、Lighthouse CI。

---

## 执行约束

- 使用单一串行 GPT-5.6 Sol Implementation Codex；当前仓库为 `UNBORN_HEAD`，无法创建可靠独立 worktree。
- 使用 RED → GREEN → REFACTOR；每个 task 先交付失败证据，再修改生产代码。
- 不新增依赖、不部署、不 commit。
- 不修改 `.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`、`.codex/**`、构建配置、依赖文件、SEO/security 文件或真实内容事实。
- 只允许 `127.0.0.1:3100`；当前预览保持运行期间不得执行会自行启停 3100 的完整 E2E/Lighthouse。
- 每个 task 完成后输出 changed files、RED、GREEN、未验证项和范围扩展。

### Task 1：新信息架构与电影化设计契约

**Files:**

- Modify: `src/styles/design-contract.test.ts`
- Modify: `src/components/stage/instrument-stage.test.tsx`
- Modify: `src/components/stage/home-instrument-stage.test.tsx`
- Modify: `src/components/stage/arc-instrument-stage.test.tsx`
- Modify: `src/components/rialo/rialo-reactive-loop.test.tsx`
- Modify: `src/components/project/project-case-study.test.tsx`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/ecosystems.spec.ts`
- Modify: `tests/e2e/project-detail.spec.ts`
- Create: `tests/e2e/cinematic-motion.spec.ts`
- Modify: `tests/e2e/performance.spec.ts`

**Step 1: 写结构 RED**

测试必须固定：

- Home 只有一个活动项目、一个主要 CTA、四项目真实入口和两生态入口。
- Home 不再渲染重复 `Ecosystems`、`Projects` 和 About 说明区。
- Arc 三个状态持续可发现，但一次只有一个活动 readout/CTA。
- Rialo 五阶段持续可发现，但一次只展开一个说明。
- Arc/Rialo 不再渲染重复项目卡片索引和 route 解释。
- 详情页只有 `Problem / Mechanism / Proof` 三个主章节，技术/限制事实仍可访问。
- 首屏文案与动效 token 使用 Task 14 的预算和尺度。
- Home commit、Arc commit 与 Rialo Trigger 的首个活动属性/结构反馈 ≤200ms，完整 morph 另在 650–900ms 结束。

**Step 2: 运行 Vitest RED**

```bash
npm test -- --run \
  src/styles/design-contract.test.ts \
  src/components/stage/instrument-stage.test.tsx \
  src/components/stage/home-instrument-stage.test.tsx \
  src/components/stage/arc-instrument-stage.test.tsx \
  src/components/rialo/rialo-reactive-loop.test.tsx \
  src/components/project/project-case-study.test.tsx
```

Expected: 只因当前重复区块、旧六槽舞台、旧七章节和旧动效尺度失败。

**Step 3: 使用现有 3100 运行浏览器 RED**

不得停止或重启当前 Task 13 preview。把它作为 external production server：

```bash
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test \
  tests/e2e/home.spec.ts \
  tests/e2e/ecosystems.spec.ts \
  tests/e2e/project-detail.spec.ts \
  tests/e2e/cinematic-motion.spec.ts \
  tests/e2e/performance.spec.ts \
  --config playwright.config.ts
```

Expected: 旧实现继续满足保留契约，但新 Project Reel、重复区块删除、三章详情、committed state、normal-motion 分帧与首次反馈断言精确失败。RED artifact 保存在 `.next/playwright/test-results/`，不得用更新 snapshot 消除失败。

**Step 4: 冻结 RED**

- 输出每个失败对应的 Task 14 requirement。
- 确认保护文件和其他生产文件 hash 未改变。

### Task 2：Committed Scene Target 控制器

**Files:**

- Create: `src/components/scene/scene-target-controller.client.tsx`
- Create: `src/components/scene/scene-target-controller.test.tsx`
- Modify: `src/components/scene/universe-shell.client.tsx`
- Modify: `src/components/scene/universe-shell.test.tsx`
- Modify: `src/components/scene/scene-types.ts`
- Modify: `src/components/scene/static-universe-fallback.tsx`
- Modify: `src/components/scene/static-universe-fallback.module.css`
- Modify: `src/components/scene/capability-gate.test.tsx`

**Step 1: 写控制器 RED**

覆盖：

- route default committed target；
- `preview ?? committed ?? default` 优先级；
- pointer/focus 离开后回到 committed；
- `commitTarget()` 替换稳定状态；
- preview 只改变装饰性 highlight/Canvas，不改变语义标题、CTA、`aria-pressed/current` 或 live region；
- 单次 commit 最多产生一次 live-region 更新；
- route scene 变化重置到对应默认；
- 快速连续 commit 只保留最后目标；
- 未知 target fail closed。

**Step 2: 运行 RED**

```bash
npm test -- --run \
  src/components/scene/scene-target-controller.test.tsx \
  src/components/scene/universe-shell.test.tsx
```

Expected: 新控制器缺失，现有 pointer/focus 离开后 target 为空。

**Step 3: 实现最小 GREEN**

- Controller 由 UniverseShell 提供。
- 现有 event delegation 只更新 preview。
- Home/Arc/Rialo 可通过 hook 提交 committed target。
- Canvas 接收 effective target。
- StaticUniverseFallback 接收 effective target 并只更新装饰性 active highlight。
- 不用 document query 反向读取业务状态。

**Step 4: 运行 GREEN**

```bash
npm test -- --run \
  src/components/scene/scene-target-controller.test.tsx \
  src/components/scene/universe-shell.test.tsx \
  src/components/scene/capability-gate.test.tsx \
  src/components/scene/scene-target.test.ts
```

Expected: 全部通过。

### Task 3：Home Project Reel

**Files:**

- Modify: `src/app/(immersive)/page.tsx`
- Modify: `src/components/stage/instrument-stage.tsx`
- Modify: `src/components/stage/instrument-stage.module.css`
- Modify: `src/components/stage/home-instrument-stage.tsx`
- Modify: `src/styles/universe-pages.module.css`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/motion.css`
- Modify: `src/components/stage/instrument-stage.test.tsx`
- Modify: `src/components/stage/home-instrument-stage.test.tsx`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/keyboard.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`

**Step 1: 运行 Task 1 Home RED**

```bash
npm test -- --run \
  src/components/stage/instrument-stage.test.tsx \
  src/components/stage/home-instrument-stage.test.tsx
```

Expected: 旧静态 Home 舞台和重复页面区块失败。

**Step 2: 实现 Project Reel**

- HomeInstrumentStage 成为最小 Client Island。
- 默认活动项目 SIGNAL/LEDGER。
- 方向键/Home/End 移动 selector focus；Enter/Space 只提交活动项，详情导航只由活动项目的主要 CTA 承担。
- pointer/focus 只预览装饰状态，click/Enter/Space commit。
- 一次只显示活动项目 name、6–12 word statement 和主要 CTA。
- JS 增强态始终显示四项目 selector 与两生态真实链接；无 JavaScript fallback 显示四项目和两生态的可见真实链接。
- 删除 HomePage 的三个重复 section。
- 不自动轮播、不 preventDefault 全页 wheel。

**Step 3: 实现视觉层级**

- 主视觉覆盖大部分首屏，允许裁出常规内容栏。
- 保留一条主地平线、活动轨和必要 focus outline。
- 删除 calibration 00/30/60/90、重复 footer 说明和无语义刻度。
- normal motion 使用 1000–1400ms 首次空间建立、180–260ms preview。

**Step 4: 运行 GREEN**

```bash
npm test -- --run \
  src/styles/design-contract.test.ts \
  src/components/stage/instrument-stage.test.tsx \
  src/components/stage/home-instrument-stage.test.tsx
```

Expected: 全部通过。

### Task 4：Arc 与 Rialo 状态演出

**Files:**

- Modify: `src/app/(immersive)/[ecosystem]/page.tsx`
- Modify: `src/components/stage/arc-instrument-stage.client.tsx`
- Modify: `src/components/stage/arc-instrument-stage.test.tsx`
- Modify: `src/components/rialo/rialo-reactive-loop.tsx`
- Modify: `src/components/rialo/rialo-reactive-loop.module.css`
- Modify: `src/components/rialo/rialo-reactive-loop.test.tsx`
- Modify: `src/components/stage/instrument-stage.module.css`
- Modify: `src/styles/universe-pages.module.css`
- Modify: `tests/e2e/ecosystems.spec.ts`
- Modify: `tests/e2e/keyboard.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`
- Modify: `tests/e2e/progressive-enhancement.spec.ts`

**Step 1: 运行 Arc/Rialo RED**

```bash
npm test -- --run \
  src/components/stage/arc-instrument-stage.test.tsx \
  src/components/rialo/rialo-reactive-loop.test.tsx
```

Expected: committed target、单 readout、重复区块删除和 Trigger 事件契约失败。

**Step 2: 实现 Arc**

- 三 selector commit 对应 project target。
- active DOM、CTA、CSS machine 和 Canvas target 同步。
- preview 离开后回到 active project。
- 删除长 ecosystem.description，仅保留一个短 statement。
- no-JS fallback 显示三个项目的可见真实详情链接；不可操作 button 不能成为唯一入口。

**Step 3: 实现 Rialo**

- 五阶段名称持续可发现。
- 只有 active description 在视觉上展开；aria 关系保持完整。
- Trigger 使用独立 data-state 驱动明显但有限的异常/锁定/脉冲序列。
- roving tabindex 与方向键保持。
- no-JS fallback 显示 Rialo Captain 的可见真实详情链接和五阶段等价文字。

**Step 4: 删除重复生态目录**

- EcosystemPage 不再渲染 `EcosystemIndex` 与 route 说明 section。
- JS 增强态的三 Arc 项目发现能力由舞台控件承担；no-JS fallback rail 承担三个真实详情链接。
- Rialo 的唯一项目 CTA 保留。

**Step 5: 运行 GREEN**

```bash
npm test -- --run \
  src/components/stage/arc-instrument-stage.test.tsx \
  src/components/rialo/rialo-reactive-loop.test.tsx \
  src/components/stage/rialo-instrument-stage.test.tsx
```

Expected: 全部通过。

### Task 5：有限 3D Morph 与 Route Handoff

**Files:**

- Create: `src/components/scene/finite-scene-morph.ts`
- Create: `src/components/scene/finite-scene-morph.test.ts`
- Create: `src/components/scene/cinematic-navigation-bridge.client.tsx`
- Create: `src/components/scene/cinematic-navigation-bridge.test.tsx`
- Modify: `src/components/scene/universe-canvas.client.tsx`
- Modify: `src/components/scene/universe-canvas.test.tsx`
- Modify: `src/components/scene/universe-shell.client.tsx`
- Modify: `src/components/scene/universe-shell.test.tsx`
- Modify: `src/components/scene/camera-rig.tsx`
- Modify: `src/components/scene/scene-router.client.tsx`
- Modify: `src/components/scene/transition-machine.ts`
- Modify: `src/components/scene/transition-machine.test.ts`
- Modify: `src/components/scene/scenes/home-astrolabe.tsx`
- Modify: `src/components/scene/scenes/arc-orbital-circuit.tsx`
- Modify: `src/components/scene/scenes/rialo-reactive-field.tsx`
- Modify: `src/components/scene/scene-composition.test.tsx`
- Modify: `src/components/scene/universe-shell.module.css`
- Modify: `tests/e2e/progressive-enhancement.spec.ts`
- Modify: `tests/e2e/performance.spec.ts`

**Step 1: 写有限插值 RED**

纯函数覆盖：

- 0、midpoint、1 的插值；
- 650–900ms 完成；
- 新 token 从当前视觉状态重新定向；
- reduced/low/static 直接终态；
- hidden/dispose 立即停止；
- 完成后不再请求 frame。

**Step 2: 运行 RED**

```bash
npm test -- --run \
  src/components/scene/finite-scene-morph.test.ts \
  src/components/scene/cinematic-navigation-bridge.test.tsx \
  src/components/scene/universe-canvas.test.tsx \
  src/components/scene/scene-composition.test.tsx \
  src/components/scene/universe-shell.test.tsx \
  src/components/scene/transition-machine.test.ts
```

Expected: morph helper、有限 burst、可取消 navigation bridge 与新 handoff 时序行为缺失；所有失败在任何 Task 5 生产实现前冻结。

**Step 3: 实现场景 morph**

- Home：beacon 吸附、核心偏移/缩放、轨道倾角或能量路径变化。
- Arc：Research / Exchange / Forecast 至少有两项构型差异，不只改变 opacity。
- Rialo：节点/航迹状态变化；Trigger 有明确锁定与脉冲。
- CameraRig 可接受 effective target 的轻量偏移，但不得自由镜头。
- 插值期间主动 invalidate，完成回到 demand。

**Step 4: 实现 route handoff**

- 扩展现有 transition token，不创建第二套不可取消状态机。
- CinematicNavigationBridge 只负责在 UniverseShell 卸载前发布可取消的 DOM departure phase，并把最终 scene 路由变化交给现有 transition machine；不得复制场景状态。
- Home/Arc/Rialo 之间总时长 ≤700ms。
- 进入 detail 的 departure veil 使用项目 accent/motif；真实 link、modifier click、external target 和 history 语义保持。
- 普通左键可触发 handoff；middle click、Cmd/Ctrl/Shift/Alt click、`target`、download、external、hash-only 与 no-JS 保持浏览器默认语义。
- 快速连续点击取消旧 token；reduced-motion 不等待 departure；history/back/forward 不被阻塞。
- detail 仍无 Canvas。

**Step 5: 运行 GREEN**

```bash
npm test -- --run \
  src/components/scene/finite-scene-morph.test.ts \
  src/components/scene/cinematic-navigation-bridge.test.tsx \
  src/components/scene/universe-canvas.test.tsx \
  src/components/scene/scene-composition.test.tsx \
  src/components/scene/universe-shell.test.tsx \
  src/components/scene/transition-machine.test.ts
```

Expected: 全部通过，现有 draw-call/triangle 构成预算不回退。

### Task 6：详情页三章化

**Files:**

- Modify: `src/components/project/project-case-study.tsx`
- Modify: `src/components/project/project-case-study.module.css`
- Modify: `src/components/project/project-case-study.test.tsx`
- Modify: `src/components/project/project-hero.tsx`
- Modify: `src/components/project/core-loop.tsx`
- Modify: `src/components/project/evidence-section.tsx`
- Modify: `src/components/project/project-gallery.tsx`
- Modify: `src/components/project/stack-lanes.tsx`
- Modify: `src/components/project/project-navigator.tsx`
- Modify: `src/components/project/signature/project-signature.module.css`
- Modify: `tests/e2e/project-detail.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`
- Modify: `tests/e2e/progressive-enhancement.spec.ts`

**Step 1: 运行详情 RED**

```bash
npm test -- --run \
  src/components/project/project-case-study.test.tsx \
  src/components/project/signature/project-signature.test.tsx
```

Expected: 旧七段同权结构失败。

**Step 2: 实现三章**

- Hero 只保留项目名、短判断、状态边界、唯一 `Launch live site` 和 signature。
- `Problem`：summary 与必要限制。
- `Mechanism`：core loop；技术栈放入可访问渐进披露。
- `Proof`：evidence 与必要 gallery。
- limits 保留在 Problem 或 technical notes，不创建第四个同权章节。
- Navigator 保持返回生态和下一项目。

**Step 3: 实现 detail handoff 终态**

- 通过 project accent 和 motif 接住 immersive departure。
- reduced-motion 下直接静态终态。
- 详情不出现 Canvas 或 Three scene loader。

**Step 4: 运行 GREEN**

```bash
npm test -- --run \
  src/components/project/project-case-study.test.tsx \
  src/components/project/signature/project-signature.test.tsx
```

Expected: 三章、证据、技术/限制事实、CTA 与导航全部通过。

### Task 7：浏览器、视觉与完整回归

**Files:**

- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/ecosystems.spec.ts`
- Modify: `tests/e2e/project-detail.spec.ts`
- Modify: `tests/e2e/keyboard.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`
- Modify: `tests/e2e/progressive-enhancement.spec.ts`
- Modify: `tests/e2e/accessibility.spec.ts`
- Modify: `tests/e2e/performance.spec.ts`
- Modify: `tests/e2e/visual-reference.spec.ts`
- Modify: `tests/e2e/visual-reference.spec.ts-snapshots/*`
- Modify: `tests/e2e/cinematic-motion.spec.ts`

**Step 1: 先运行非浏览器完整门禁**

```bash
npm run verify
openspec validate build-project-universe --strict --no-interactive
```

Expected: lint、typecheck、Vitest 与 OpenSpec 全部通过。

**Step 2: 获得 3100 生命周期授权后构建**

```bash
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build
npm run test:build-gates
npm run check:links
npm run check:budgets
```

Expected: 14/14 routes；links、cold-route、scene closure 与所有既有预算通过。

**Step 3: 运行浏览器 GREEN**

```bash
npm run test:e2e
```

覆盖：

- 八路由、404、真实外链；
- Home/Arc/Rialo committed state；
- keyboard/touch/no-JS；
- 320–1920px；
- reduced-motion/saveData/WebGL unavailable；
- 快速路由与资源释放；
- Home commit、Arc commit 和 Rialo Trigger 的首个活动属性/结构反馈 ≤200ms；
- axe serious/critical = 0。

**Step 4: 生成并查看 Static 候选**

```bash
npx playwright test tests/e2e/visual-reference.spec.ts --config playwright.config.ts
```

只有在旧基线因已批准结构变化失败、Architecture 查看全部候选原图后，才允许 `--update-snapshots`。

**Step 5: 保存 normal-motion 证据**

`tests/e2e/cinematic-motion.spec.ts` 必须使用 `test.info().outputPath()` 和 `test.info().attach()` 保存可复现 PNG，artifact 位于 `.next/playwright/test-results/**/cinematic-*.png`。固定视口、质量、活动 target 和捕获时间，不写入仓库视觉基线。

至少输出并检查：

- Home opening：0ms、约 650ms、≥1400ms；
- Home SIGNAL/LEDGER → HADRON：0ms、约 400ms、≥900ms；
- Arc 一次 morph：0ms、约 400ms、≥900ms；
- Rialo Observe → Trigger → Settle 的起始、中间与终态；
- immersive → detail depart / arrive；
- 390px mobile normal 与 reduced-motion 终态。

自动断言必须同时检查活动 DOM state、Canvas debug/morph phase 和终态 demand；截图用于证明主体构型、位置、尺度、镜头或能量路径发生肉眼可辨变化。Architecture 必须查看原图并明确接受。

**Step 6: Lighthouse**

```bash
npm run lighthouse
```

Expected: 三个 URL 各三次中位数；Performance ≥0.90，A11y/BP/SEO ≥0.95，LCP ≤2.5s，CLS ≤0.1。交互首次反馈 ≤200ms 由 `tests/e2e/performance.spec.ts` 单独证明，不能以 Lighthouse 静态分数替代。

### Task 8：Evidence、Review 与 handback

**Files:**

- Create: `docs/plans/2026-07-27-project-universe-cinematic-project-reel-integration-evidence-14.md`
- Modify: `openspec/changes/build-project-universe/tasks.md`

**Step 1: Worker 自审**

输出：

- changed files 与 hash；
- Task 1–7 RED/GREEN；
- OpenSpec requirement 覆盖矩阵；
- Static 与 normal-motion 视觉证据；
- performance/a11y/safety 矩阵；
- 未验证项与范围扩展。

**Step 2: Architecture integration checkpoint**

- 匹配 allowlist 和保护文件 hash。
- fresh 运行与风险匹配的验证。
- 查看全部视觉证据。
- 形成 Integration Evidence。

**Step 3: Independent Review Codex**

Reviewer 只能给出：

- `PASS`
- `FIX_REQUIRED`
- `DOWNGRADE`

只有 PASS 才能进入最终 VERIFY、更新 Task 14 checkbox 和恢复 3100 新预览。
