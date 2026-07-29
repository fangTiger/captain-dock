# Project Universe Reference-First Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把现有卡片式作品站重构成与 A 版原型一致的全英文机械观测舞台，同时保留已验证的路由、内容模型、3D 生命周期、无障碍、安全与性能基础。

**Architecture:** 先用测试固定全英文和视觉契约，再建立共享 Instrument Stage 与控件层级；首页、Arc、Rialo 复用舞台语法但保留各自状态模型，项目详情只重写视觉外壳。实现使用单个串行 `gpt-5.6-sol + xhigh` worker，Architecture 在每个 slice 后检查范围与证据，最终交给独立 reviewer。

**Tech Stack:** Next.js 16.2 App Router、React 19.2、TypeScript、CSS Modules、Three.js、React Three Fiber、Vitest、Testing Library、Playwright、axe、Lighthouse CI。

---

## 执行约束

- 必须使用 RED → GREEN → REFACTOR。
- 当前仓库为 `UNBORN_HEAD` 且存在用户脏基线；用户未授权 commit，因此每个“提交”步骤替换为 Architecture 哈希检查点。
- 只使用 `127.0.0.1:3100` 运行浏览器验证，严禁触碰 3000。
- 不新增依赖、不部署、不修改 `.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`、OpenSpec 或 `.codex/session-state.md`。
- 原型路径与 SHA-256 见 `docs/plans/2026-07-24-project-universe-reference-first-redesign.md`。

### Task 1：全英文公开表面

**Files:**

- Modify: `src/content/catalog.ts`
- Modify: `src/content/catalog.test.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/seo/json-ld.tsx`
- Modify: `src/components/seo/json-ld.test.tsx`
- Modify: `src/lib/metadata.ts`
- Modify: `src/lib/metadata.test.ts`
- Modify: `src/app/(immersive)/page.tsx`
- Modify: `src/app/(immersive)/[ecosystem]/page.tsx`
- Modify: `src/app/(content)/about/page.tsx`
- Modify: `src/components/shell/skip-link.client.tsx`
- Modify: `src/components/shell/site-footer.tsx`
- Modify: `src/components/project/project-card.tsx`
- Modify: `src/components/project/project-card.test.tsx`
- Modify: `src/components/project/project-case-study.tsx`
- Modify: `src/components/project/core-loop.tsx`
- Modify: `src/components/project/evidence-section.tsx`
- Modify: `src/components/project/project-gallery.tsx`
- Modify: `src/components/project/stack-lanes.tsx`
- Modify: `src/components/project/project-navigator.tsx`
- Modify: `src/components/project/signature/flight-signature.tsx`
- Modify: `src/components/project/signature/ledger-signature.tsx`
- Modify: `src/components/project/signature/market-signature.tsx`
- Modify: `src/components/project/signature/probability-signature.tsx`
- Modify: `src/components/project/signature/project-signature.test.tsx`
- Modify: `src/components/ui/external-link.tsx`
- Modify: `src/components/ui/external-link.test.tsx`
- Create: `src/content/english-surface.test.ts`
- Modify: `tests/e2e/routes.spec.ts`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/ecosystems.spec.ts`
- Modify: `tests/e2e/project-detail.spec.ts`
- Modify: `tests/e2e/keyboard.spec.ts`
- Modify: `tests/e2e/progressive-enhancement.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`
- Modify: `tests/e2e/seo-security.spec.ts`

**Step 1: 写 RED 语言门禁**

- 新增测试读取 catalog、metadata 和生产 UI 源，要求公开表面不含 `\p{Script=Han}`。
- 添加 `<html lang="en">` 与 JSON-LD `inLanguage === "en"` 断言。
- 更新现有 UI 测试的期望文本为 A 版英文文案。

**Step 2: 验证 RED**

Run:

```bash
npm test -- --run src/content/english-surface.test.ts src/content/catalog.test.ts src/components/seo/json-ld.test.tsx src/lib/metadata.test.ts
```

Expected: 因 `lang="zh-Hans"`、`inLanguage` 与 catalog/UI 中文失败。

**Step 3: 最小 GREEN**

- 按事实语义翻译 catalog 全部 statement、description、tagline、summary、coreLoop、evidence、gallery、limits 与 SEO。
- 把页面章节、CTA、隐藏外链提示、alt/caption 和内部公开错误改成英文。
- 不改变 slug、项目顺序、状态、live URL、五阶段顺序或 schema。

**Step 4: 验证 GREEN**

Run:

```bash
npm test -- --run src/content/english-surface.test.ts src/content/catalog.test.ts src/components/seo/json-ld.test.tsx src/lib/metadata.test.ts src/components/project/project-card.test.tsx src/components/project/signature/project-signature.test.tsx src/components/ui/external-link.test.tsx
```

Expected: 全部通过。

**Step 5: Architecture 检查点**

- 扫描 `src` 生产文件的 Han 字符，逐条区分公开表面与允许的中文注释/内部测试。
- 记录 changed files 和 SHA-256；不 commit。

### Task 2：A 版设计 token 与控件体系

**Files:**

- Modify: `src/styles/tokens.css`
- Modify: `src/app/globals.css`
- Modify: `src/styles/design-contract.test.ts`
- Modify: `src/styles/font-contract.test.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/shell/site-header.tsx`
- Modify: `src/components/shell/site-footer.tsx`
- Create: `src/components/ui/control-link.tsx`
- Create: `src/components/ui/control-link.test.tsx`
- Modify: `src/components/ui/external-link.tsx`
- Modify: `src/app/error.tsx`

**Step 1: 写 RED 视觉契约**

- 允许 mono label `.08em–.13em` tracking，禁止旧版全局 `letter-spacing: 0` 约束。
- 要求 display stack 使用 Georgia/Times，不再把 GeistPixel 作为 H1 主字体。
- 要求 token 包含 stage 比例、serif/mono 层级、Arc/Signal/Hadron/Predict/Rialo 颜色关系。
- 要求 control primitive 支持 `quiet`、`primary`、`secondary`、`stage` 角色。

**Step 2: 验证 RED**

Run:

```bash
npm test -- --run src/styles/design-contract.test.ts src/styles/font-contract.test.ts src/components/ui/control-link.test.tsx
```

Expected: 缺少新控件、字体与 tracking 契约而失败。

**Step 3: 最小 GREEN**

- 重写 token 和全局基线，删除大面积 blur、厚重卡片阴影与超大 8rem H1。
- Header 改为 A 版式安静顶栏；移动端保留可见导航但避免四个等权方框。
- ExternalLink 复用视觉角色但保留安全属性。
- Error retry 使用真实 Button 样式。

**Step 4: 验证 GREEN**

Run:

```bash
npm test -- --run src/styles/design-contract.test.ts src/styles/font-contract.test.ts src/components/ui/control-link.test.tsx src/components/ui/external-link.test.tsx
```

Expected: 全部通过。

### Task 3：Instrument Stage、首页与生态首屏

**Files:**

- Create: `src/components/stage/instrument-stage.tsx`
- Create: `src/components/stage/instrument-stage.module.css`
- Create: `src/components/stage/instrument-stage.test.tsx`
- Create: `src/components/stage/home-instrument-stage.tsx`
- Create: `src/components/stage/arc-instrument-stage.client.tsx`
- Create: `src/components/stage/arc-instrument-stage.test.tsx`
- Modify: `src/app/(immersive)/page.tsx`
- Modify: `src/app/(immersive)/[ecosystem]/page.tsx`
- Modify: `src/components/ecosystem/ecosystem-hero.tsx`
- Modify: `src/components/ecosystem/ecosystem-index.tsx`
- Modify: `src/styles/universe-pages.module.css`
- Modify: `src/components/rialo/rialo-reactive-loop.tsx`
- Modify: `src/components/rialo/rialo-reactive-loop.module.css`
- Modify: `src/components/rialo/rialo-reactive-loop.test.tsx`
- Modify: `src/components/scene/universe-shell.module.css`
- Modify: `src/components/scene/static-universe-fallback.tsx`
- Modify: `src/components/scene/static-universe-fallback.module.css`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/ecosystems.spec.ts`
- Modify: `tests/e2e/progressive-enhancement.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`

**Step 1: 写 RED 结构测试**

- 首页首屏必须包含三行 A 版 headline、四个项目节点、Arc/Rialo 纵向索引和一个主舞台。
- Arc 首屏必须具有三个真实按钮、`aria-pressed`、active project readout 和正确 scene target。
- Rialo 五阶段必须成为首屏舞台内容，保留 roving tabindex。
- 移动端必须使用精简结构，而不是把完整桌面舞台强行纵向堆叠。

**Step 2: 验证 RED**

Run:

```bash
npm test -- --run src/components/stage/instrument-stage.test.tsx src/components/stage/arc-instrument-stage.test.tsx src/components/rialo/rialo-reactive-loop.test.tsx
```

Expected: 新舞台组件不存在或当前结构不满足要求。

**Step 3: 最小 GREEN**

- 建立共享舞台骨架，但不把 Home/Arc/Rialo 抽象成相同内容组件。
- 把现有 scene target 连接到首屏项目节点和 selector。
- 保留 UniverseShell、Canvas identity、质量分级和静态 fallback。
- 首屏之后的目录降级为安静索引，不能重新成为主要视觉。

**Step 4: 验证 GREEN**

Run:

```bash
npm test -- --run src/components/stage/instrument-stage.test.tsx src/components/stage/arc-instrument-stage.test.tsx src/components/rialo/rialo-reactive-loop.test.tsx src/components/scene/universe-shell.test.tsx
```

Expected: 全部通过。

**Step 5: 浏览器检查**

Run:

```bash
npm run build
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test tests/e2e/home.spec.ts tests/e2e/ecosystems.spec.ts tests/e2e/progressive-enhancement.spec.ts tests/e2e/responsive.spec.ts --config playwright.config.ts
```

Expected: A 版结构、scene target、移动端、Canvas 复用和静态降级通过；只使用 3100。

### Task 4：扁平项目详情与 About

**Files:**

- Modify: `src/components/project/project-case-study.tsx`
- Modify: `src/components/project/project-case-study.module.css`
- Modify: `src/components/project/project-case-study.test.tsx`
- Modify: `src/components/project/project-hero.tsx`
- Modify: `src/components/project/project-signature.tsx`
- Modify: `src/components/project/signature/project-signature.module.css`
- Modify: `src/components/project/signature/project-signature.test.tsx`
- Modify: `src/components/project/core-loop.tsx`
- Modify: `src/components/project/evidence-section.tsx`
- Modify: `src/components/project/project-gallery.tsx`
- Modify: `src/components/project/stack-lanes.tsx`
- Modify: `src/components/project/project-navigator.tsx`
- Modify: `src/app/(content)/about/page.tsx`
- Modify: `src/styles/universe-pages.module.css`
- Modify: `tests/e2e/project-detail.spec.ts`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`

**Step 1: 写 RED 详情视觉层级测试**

- 首屏必须为左文案/CTA、右签名仪器的非对称布局。
- 只允许一个 primary CTA；次级动作不得与其同权。
- 保留全部语义章节和顺序，但禁止每个 section 都成为嵌套 panel/card。
- About 使用同一排版语法，保持未知个人信息边界。

**Step 2: 验证 RED**

Run:

```bash
npm test -- --run src/components/project/project-case-study.test.tsx src/components/project/signature/project-signature.test.tsx
```

Expected: 当前卡片式外壳或 CTA 层级不满足要求。

**Step 3: 最小 GREEN**

- 主要通过 CSS Module 和少量 wrapper 语义重构完成，不改变 catalog schema。
- 签名 SVG 与真实项目媒体保留。
- 删除重复的流程展示与不必要的面板边界。

**Step 4: 验证 GREEN**

Run:

```bash
npm test -- --run src/components/project/project-case-study.test.tsx src/components/project/signature/project-signature.test.tsx
npx playwright test tests/e2e/project-detail.spec.ts tests/e2e/home.spec.ts tests/e2e/responsive.spec.ts --config playwright.config.ts
```

Expected: 详情内容、CTA、安全链接、响应式和章节顺序全部通过。

### Task 5：确定性视觉回归与集成验证

**Files:**

- Create: `tests/e2e/visual-reference.spec.ts`
- Create: `tests/e2e/visual-reference.spec.ts-snapshots/*`
- Modify: `tests/e2e/accessibility.spec.ts`
- Modify: `tests/e2e/keyboard.spec.ts`
- Modify: `tests/e2e/seo-security.spec.ts`
- Modify: `tests/e2e/performance.spec.ts` only if selectors changed; thresholds and collector semantics are forbidden
- Modify: `scripts/check-links.mjs` only if new valid DOM structure exposes an existing parser defect; otherwise forbidden
- Modify: `scripts/check-budgets.mjs` only if route chunk ownership legitimately changes; budget thresholds are forbidden

**Step 1: 写 RED 视觉回归**

- Static 模式覆盖 1440px 的 `/`、`/arc`、`/rialo`、`/arc/signal-ledger`。
- 覆盖 390px 的 `/` 与 `/arc`。
- 固定动画、隐藏无关时间值，不屏蔽标题、控件、项目节点或签名仪器。

**Step 2: 验证 RED**

Run:

```bash
npx playwright test tests/e2e/visual-reference.spec.ts --config playwright.config.ts
```

Expected: 基线不存在或当前视觉不匹配。

**Step 3: 生成候选基线并人工查看**

Run:

```bash
npx playwright test tests/e2e/visual-reference.spec.ts --config playwright.config.ts --update-snapshots
```

Architecture 必须查看每张候选图；不得仅因快照生成成功就接受。

**Step 4: 全量 GREEN**

Run:

```bash
npm run verify
npm run build
npm run test:build-gates
npm run check:links
npm run check:budgets
npm run test:e2e
openspec validate build-project-universe --strict --no-interactive
```

随后运行单次无重试的生产 Playwright + Lighthouse 门禁，并确认 3100 被释放。

**Step 5: 交回**

Worker 输出：

- Changed files。
- 每个 Task 的 RED/GREEN 证据。
- 视觉快照路径与 hash。
- 全英文扫描结果。
- 需求覆盖矩阵、未验证项、范围扩展。
- 自审 PASS/FAIL。

Architecture 形成 Integration Evidence 后，交给独立 Review Codex；Reviewer 给出 PASS 前不得进入最终 VERIFY。
