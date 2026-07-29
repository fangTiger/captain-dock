# Project Universe Borderless Cinematic Canvas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把现有 A 版封闭机械舞台演进为无边界电影化画布，并以克制动效统一首页、Arc、Rialo 和四个项目详情。

**Architecture:** 保留 Server Component、InstrumentStage、UniverseShell、CapabilityGate、scene-target、单 Canvas 和内容模型。实现采用 CSS-first：先用契约与浏览器测试锁定开放边界、动效降级和响应式行为，再修改共享视觉层；只有 Arc 活动项目色同步需要最小 Client Component 状态输出。

**Tech Stack:** Next.js 16.2、React 19.2、TypeScript、CSS Modules、现有 `motion` 依赖、Three.js / React Three Fiber、Vitest、Testing Library、Playwright、axe、Lighthouse CI。

---

## 执行边界

- 单个 GPT-5.6 Sol worker 串行执行，避免共享 CSS 与视觉快照并发冲突。
- 必须 RED → GREEN → REFACTOR；每个 slice 交回 RED/GREEN 命令与关键输出。
- 不新增依赖，不修改 catalog、路由、metadata、JSON-LD、外链、安全头、构建配置、测试配置或 Canvas 生命周期。
- 不修改 `.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`、OpenSpec、Architecture 计划或 `.codex/session-state.md`。
- 浏览器和 Lighthouse 只允许使用 `127.0.0.1:3100`；不得探测、停止或占用其他端口。
- 不部署、不 commit。

### Task 1：无边界与动效契约 RED

**Files:**

- Modify: `src/styles/design-contract.test.ts`
- Modify: `src/components/stage/instrument-stage.test.tsx`
- Modify: `src/components/stage/arc-instrument-stage.test.tsx`
- Modify: `src/components/rialo/rialo-reactive-loop.test.tsx`
- Modify: `src/components/project/project-case-study.test.tsx`
- Modify: `src/components/project/signature/project-signature.test.tsx`

**Step 1: 写失败测试**

- 断言共享舞台仍包含 title/scene/index/footer 语义，但视觉契约要求主舞台无闭合外框与内缩矩形。
- 断言 Arc/Rialo readout 和详情 signature 使用开放侧轨而非四边框。
- 断言首页项目节点、Arc selector、Rialo timeline 对 hover/focus/pressed 具有同源状态钩子。
- 断言动效只使用 transform / opacity 友好属性，并存在 reduced-motion 终态。
- 断言 Arc 活动项目色进入机械核心样式变量。

**Step 2: 运行 RED**

```bash
npm test -- --run src/styles/design-contract.test.ts src/components/stage/instrument-stage.test.tsx src/components/stage/arc-instrument-stage.test.tsx src/components/rialo/rialo-reactive-loop.test.tsx src/components/project/project-case-study.test.tsx src/components/project/signature/project-signature.test.tsx
```

Expected: 因现有完整 stage/readout/signature 边框、缺少共享动效契约或 Arc 活动色未传入而失败。

### Task 2：首页与 Arc 无边界场域 GREEN

**Files:**

- Modify: `src/styles/tokens.css`
- Modify: `src/styles/motion.css`
- Modify: `src/app/globals.css`
- Modify: `src/styles/universe-pages.module.css`
- Modify: `src/components/stage/instrument-stage.module.css`
- Modify: `src/components/stage/arc-instrument-stage.client.tsx`
- Modify: `src/components/scene/universe-shell.module.css`

**Step 1: 最小实现**

- 删除 `.stage` 四边框、内缩完整矩形和不透明面板；以开放网格、淡出十字轴和局部 datum line 代替。
- 首页项目入口改为节点 + 开放侧轨；保留真实链接、名称、编号和标签。
- Arc readout 改为单侧项目色轨，selector 只保留分段线和活动刻度。
- 把 active project accent 作为 CSS 变量传入 Arc 机械核心。
- 加入 600–800ms 入场、低频轨道/核心微动和 hover/focus 等价反馈。
- Universe scene layer 与全站背景在舞台之外保持连续，不新增 Canvas 或渲染循环。
- 沉浸式 main 与首屏后的索引轨继续共享背景和开放 datum line，不恢复大卡片容器。

**Step 2: 运行 GREEN**

```bash
npm test -- --run src/styles/design-contract.test.ts src/components/stage/instrument-stage.test.tsx src/components/stage/home-instrument-stage.test.tsx src/components/stage/arc-instrument-stage.test.tsx src/components/scene/universe-shell.test.tsx
```

Expected: 全部通过。

### Task 3：Rialo 开放任务轨与动态 GREEN

**Files:**

- Modify: `src/components/rialo/rialo-reactive-loop.module.css`
- Modify: `src/components/rialo/rialo-reactive-loop.test.tsx`

**Step 1: 写或确认 RED**

- 活动阶段使用文本、状态灯和开放刻度，不依赖闭合按钮边框。
- readout 使用单侧绿轨；Trigger 使用琥珀状态但保留文字。
- radar sweep 低频运行，reduced-motion 完全停止。

**Step 2: 最小实现并运行 GREEN**

```bash
npm test -- --run src/components/rialo/rialo-reactive-loop.test.tsx src/components/stage/rialo-instrument-stage.test.tsx
```

Expected: 全部通过。

### Task 4：项目详情开放签名场域 GREEN

**Files:**

- Modify: `src/components/project/project-case-study.module.css`
- Modify: `src/components/project/signature/project-signature.module.css`
- Modify: `src/components/project/project-case-study.test.tsx`
- Modify: `src/components/project/signature/project-signature.test.tsx`

**Step 1: 写或确认 RED**

- 签名外层与 diagram 不得形成双重四边框。
- 内部 SVG 轴线、网格、信号和标签继续存在。
- 首屏保留左文案/唯一主要 CTA、右签名布局。
- reduced-motion 停止扫描光带。

**Step 2: 最小实现并运行 GREEN**

```bash
npm test -- --run src/components/project/project-case-study.test.tsx src/components/project/signature/project-signature.test.tsx
```

Expected: 全部通过。

### Task 5：响应式、渐进增强与视觉基线

**Files:**

- Modify: `tests/e2e/progressive-enhancement.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`
- Modify: `tests/e2e/visual-reference.spec.ts`
- Modify: `tests/e2e/visual-reference.spec.ts-snapshots/*.png`

**Step 1: 浏览器 RED**

- 320、390、561、768、1440、1920 验证无完整舞台矩形、无水平溢出和文本/仪器碰撞。
- reduced-motion、saveData、WebGL unavailable 验证零持续动画、Static 构图和完整内容。
- 快速切换 Home/Arc/Rialo 验证单 Canvas、真实 history 和无运行时错误。
- 六张旧 Static 基线必须产生预期差异。

**Step 2: 更新候选基线并由 Architecture 查看**

```bash
npx playwright test tests/e2e/visual-reference.spec.ts --config playwright.config.ts --update-snapshots
npx playwright test tests/e2e/visual-reference.spec.ts --config playwright.config.ts
```

Expected: 更新后 6/6，通过且候选图体现无边界终态。

### Task 6：全量验证与交回

Run:

```bash
npm run verify
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build
npm run test:build-gates
npm run check:links
npm run check:budgets
npm run test:e2e
openspec validate build-project-universe --strict --no-interactive
```

随后只在 3100 运行单次无重试 production Playwright 与 Lighthouse，并确认 3100 最终释放。

Worker 交回：

- Changed files 与最终 SHA-256。
- 每个 Task 的 RED / GREEN 证据。
- 六张视觉候选路径。
- 验收矩阵、未验证项、范围扩展记录。
- TDD、设计一致性、范围和无障碍自审结论。
