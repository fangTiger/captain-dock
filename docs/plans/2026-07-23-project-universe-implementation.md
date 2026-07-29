# Project Universe Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个包含 Arc、Rialo 与四个项目案例的可访问个人项目宇宙，并以渐进增强的单 Canvas 3D 场景形成统一空间叙事。

**Architecture:** Next.js App Router 在构建期从类型化 catalog 生成八个公开路由、元数据和 sitemap。Server Components 承载全部内容与导航；只有 Rialo 状态切换、DOM 动效和 `(immersive)` route group 的单 Canvas 使用 Client Components。

**Tech Stack:** Next.js 16.2.11 Active LTS、React 19.2.7、TypeScript、CSS Modules、Motion、Three.js、React Three Fiber 9、Drei、Vitest、Testing Library、Playwright、axe、Lighthouse CI。

---

## 执行前提

当前 Git 仓库没有初始提交，并且已有用户文件处于 staged/modified 状态。实现者不得提交、取消暂存或改写 `main.py`、现有 `.gitignore`、`.agents/`、`.codex/`；在创建 worktree 或执行任何 commit 前，由用户或 Architecture Codex 明确建立 Git baseline。

OpenSpec 源：

- `openspec/changes/build-project-universe/proposal.md`
- `openspec/changes/build-project-universe/design.md`
- `openspec/changes/build-project-universe/specs/*/spec.md`
- `openspec/changes/build-project-universe/tasks.md`

建议先由一个 Implementation Codex 固化工程、catalog 与路由契约；契约通过后，再把页面、案例内容、3D 与质量门禁拆为 editable files 不重叠的实施包。共享 `package.json`、锁文件、Next/Vitest/Playwright 配置由 IntegrationOwner 单独维护。

## Task 1: 建立不覆盖用户文件的工程与验证骨架

**Files:**

- Create: `package.json`
- Create: `package-lock.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `src/lib/smoke.test.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`

**Step 1: 写工程契约测试**

先创建一个最小 smoke test，验证测试运行器可以工作：

```ts
// src/lib/smoke.test.ts
import { describe, expect, it } from 'vitest'

describe('工程基线', () => {
  it('运行 TypeScript 测试', () => {
    expect(true).toBe(true)
  })
})
```

**Step 2: 运行测试并确认 RED**

Run:

```bash
npm test -- --run src/lib/smoke.test.ts
```

Expected: FAIL，因为 `package.json` 和测试依赖尚不存在。

**Step 3: 创建最小依赖与脚本**

固定安全补丁版本，并使用锁文件：

```json
{
  "private": true,
  "engines": { "node": ">=20.9.0" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "verify": "npm run lint && npm run typecheck && npm run test -- --run && npm run build"
  }
}
```

安装运行依赖：

```bash
npm install next@16.2.11 react@19.2.7 react-dom@19.2.7 motion three @react-three/fiber@9 @react-three/drei
```

安装开发依赖：

```bash
npm install --save-dev typescript @types/node @types/react @types/react-dom @types/three eslint eslint-config-next vitest jsdom @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @axe-core/playwright @lhci/cli
```

**Step 4: 创建最小根布局**

根布局只输出跳至正文、页面 children 和全局样式，暂不加入 3D。

**Step 5: 验证 GREEN**

Run:

```bash
npm run lint
npm run typecheck
npm test -- --run src/lib/smoke.test.ts
```

Expected: 全部 PASS。

**Step 6: 建议提交点**

在 Git baseline 已授权后：

```bash
git add package.json package-lock.json next.config.ts tsconfig.json next-env.d.ts eslint.config.mjs vitest.config.ts vitest.setup.ts playwright.config.ts src/app src/lib/smoke.test.ts
git commit -m "chore: establish project universe frontend"
```

## Task 2: 用 TDD 固化项目 catalog

**Files:**

- Create: `src/content/types.ts`
- Create: `src/content/catalog.ts`
- Create: `src/content/selectors.ts`
- Create: `src/content/catalog.test.ts`
- Create: `src/content/selectors.test.ts`

**Step 1: 写失败的 catalog 测试**

测试至少覆盖：

```ts
expect(projects).toHaveLength(4)
expect(projects.filter((project) => project.ecosystem === 'arc')).toHaveLength(3)
expect(projects.filter((project) => project.ecosystem === 'rialo')).toHaveLength(1)
expect(new Set(projects.map((project) => project.slug)).size).toBe(4)
expect(projects.every((project) => project.liveUrl.startsWith('https://'))).toBe(true)
expect(JSON.stringify(projects)).not.toContain('/Users/captain/')
```

并逐项断言四个在线地址。

**Step 2: 运行并确认 RED**

Run:

```bash
npm test -- --run src/content/catalog.test.ts
```

Expected: FAIL，因为 catalog 尚不存在。

**Step 3: 实现最小类型和四条内容**

定义 `Ecosystem`、`Project`、`CoreLoopStep`、`EvidenceItem`、`StackLane`、`ProjectImage`、`ProjectTheme` 与 `SeoFields`。使用 `satisfies readonly Project[]` 进行编译期约束，不引入运行时 schema 库。

**Step 4: 为 selector 写失败测试**

覆盖：

- `getEcosystem('arc')`
- `getProject('arc', 'hadron')`
- `getProjectsByEcosystem('rialo')`
- `getAllPublicRoutes()` 精确返回八条路由
- 未知 slug 返回 `undefined`
- `getNextProject()` 在四个项目间稳定循环

**Step 5: 实现 selector 并验证 GREEN**

Run:

```bash
npm test -- --run src/content/catalog.test.ts src/content/selectors.test.ts
npm run typecheck
```

Expected: PASS。

**Step 6: 建议提交点**

```bash
git add src/content
git commit -m "feat: add typed project catalog"
```

## Task 3: 建立八条静态路由与 404 契约

**Files:**

- Create: `src/app/(immersive)/layout.tsx`
- Create: `src/app/(immersive)/page.tsx`
- Create: `src/app/(immersive)/[ecosystem]/page.tsx`
- Create: `src/app/(case-files)/[ecosystem]/[project]/page.tsx`
- Create: `src/app/(content)/about/page.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/error.tsx`
- Create: `tests/e2e/routes.spec.ts`
- Modify: `playwright.config.ts`（使用隔离测试端口且不得复用其他项目服务）
- Modify: `tsconfig.json`（接受 Next 16 首次生产构建生成的 JSX 与 `.next/dev/types` 配置修正）

**Step 1: 写失败的路由 E2E**

使用 `getAllPublicRoutes()` 参数化八条 URL，断言：

```ts
for (const route of routes) {
  test(`${route} 可直接访问`, async ({ page }) => {
    const response = await page.goto(route)
    expect(response?.ok()).toBe(true)
    await expect(page.locator('h1')).toHaveCount(1)
  })
}
```

另断言 `/arc/not-exists` 返回 404，并存在返回项目入口。

**Step 2: 运行并确认 RED**

Playwright 必须在当前项目的隔离端口启动自己的开发服务；不得复用 3000 端口上可能属于其他本地项目的进程。默认测试端口使用 3100，`reuseExistingServer` 保持 `false`。

Run:

```bash
npm run test:e2e -- tests/e2e/routes.spec.ts
```

Expected: FAIL，因为页面尚不存在。

**Step 3: 实现最小 Server Component 页面**

- `[ecosystem]` 从 `getEcosystem()` 读取内容。
- `[ecosystem]/[project]` 从 `getProject()` 读取内容。
- 两个动态段都实现 `generateStaticParams()`。
- 对未知参数调用 `notFound()`。
- 使用 `export const dynamicParams = false`。

暂时只输出标题、摘要和返回链接，不添加视觉。

**Step 4: 验证路由 GREEN**

Run:

```bash
npm run build
npm run test:e2e -- tests/e2e/routes.spec.ts
```

Expected: 八条路由成功、未知路由 404、构建无动态内容错误。

**Step 5: 建议提交点**

```bash
git add src/app tests/e2e/routes.spec.ts
git commit -m "feat: add static portfolio routes"
```

## Task 4: 建立设计 token、壳层和基础组件

**Files:**

- Create: `src/styles/tokens.css`
- Create: `src/styles/motion.css`
- Create: `src/components/shell/site-header.tsx`
- Create: `src/components/shell/site-footer.tsx`
- Create: `src/components/ui/external-link.tsx`
- Create: `src/components/ui/status-label.tsx`
- Create: `src/components/project/project-card.tsx`
- Create: `src/components/ui/external-link.test.tsx`
- Create: `src/components/project/project-card.test.tsx`
- Create: `src/styles/design-contract.test.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: 写基础组件 RED 测试**

`ProjectCard` 必须显示名称、生态、摘要、正确的站内详情链接和明确区分的外部在线作品链接。`ExternalLink` 必须只接受 HTTPS，输出不可被调用方覆盖的 `target="_blank"`、`rel="noopener noreferrer"` 和“打开外部站点”的辅助名称。

设计契约测试必须扫描 `src/app/**/*.css` 与 `src/styles/**/*.css`，拒绝 `font-size` 中使用 `vw`（门禁自身至少用 `13vw`、`0.2vw`、`calc(1rem + 1vw)` 合成反例证明有效），并拒绝任何非零 `letter-spacing`；响应式字号使用固定 `rem` 档位而不是 viewport 连续缩放。

**Step 2: 运行并确认 RED**

Run:

```bash
npm test -- --run src/components/ui/external-link.test.tsx src/components/project/project-card.test.tsx src/styles/design-contract.test.ts
```

**Step 3: 实现 token 与组件**

使用近黑背景、温灰正文、项目 accent、低圆角、细刻度与明确焦点环。展示字体、正文和等宽字体通过 `next/font/local` 配置；没有字体文件时先使用 fallback，不得临时热链远程字体。

**Step 4: 验证组件与类型**

Run:

```bash
npm test -- --run src/components src/styles/design-contract.test.ts
npm run lint
npm run typecheck
```

**Step 5: 建议提交点**

```bash
git add src/styles src/components src/app/layout.tsx src/app/globals.css
git commit -m "feat: add project universe design system"
```

## Task 5A: 实现静态优先的首页、About 与生态分类

**Files:**

- Create: `src/components/ecosystem/ecosystem-hero.tsx`
- Create: `src/components/ecosystem/ecosystem-index.tsx`
- Create: `src/styles/universe-pages.module.css`
- Create: `tests/e2e/home.spec.ts`
- Create: `tests/e2e/ecosystems.spec.ts`
- Modify: `src/app/(immersive)/page.tsx`
- Modify: `src/app/(immersive)/[ecosystem]/page.tsx`
- Modify: `src/app/(content)/about/page.tsx`

**Step 1: 写首页 RED 测试**

断言首页：

- 只有一个 `h1`。
- 可以发现 Arc、Rialo 和四个项目。
- 所有入口是原生链接。
- 禁用 Canvas 相关脚本时内容仍存在。
- ProjectCard 同时提供站内案卷与明确的 HTTPS 在线作品入口。

**Step 2: 实现静态首页和 About**

先实现没有 3D 的完整信息架构。首页采用 “轨道仪器 × 编辑案卷” 的项目索引与生态分支，复用已审查的 `ProjectCard`。About 使用可替换常量，不编造姓名、经历、客户、奖项或联系方式，并提供返回项目索引的路径。

**Step 3: 写生态页 RED 测试**

Arc 只显示三个 Arc 项目；Rialo 只显示 Rialo Captain。两个页面共享信息结构，但具有各自主题。

**Step 4: 添加静态降级与键盘覆盖**

- `javaScriptEnabled: false` 时，首页仍显示两个生态和四个项目入口。
- 375px 与 1440px 均无横向溢出。
- 从首个 skip link 开始的键盘路径能到达全局导航、生态入口、项目 CTA 与 About 返回入口。
- 页面中没有 iframe；本切片不创建 Canvas。

**Step 5: 实现 GREEN**

组件从 typed catalog/selectors 读取内容，不在页面重复硬编码项目元数据。生态主题通过受控 CSS 自定义属性或 `data-ecosystem` 表达，不接受任意 HTML/CSS 注入。

**Step 6: 验证**

Run:

```bash
npm run test:e2e -- tests/e2e/home.spec.ts tests/e2e/ecosystems.spec.ts
npm run verify
npm run build
```

**Step 7: 建议提交点**

```bash
git add src/app src/components/ecosystem src/components/rialo tests/e2e
git commit -m "feat: build universe and ecosystem pages"
```

## Task 5B: 实现 Rialo 五阶段渐进增强

**Files:**

- Create: `src/components/rialo/rialo-reactive-loop.tsx`
- Create: `src/components/rialo/rialo-reactive-loop.test.tsx`
- Create: `src/components/rialo/rialo-reactive-loop.module.css`
- Modify: `src/app/(immersive)/[ecosystem]/page.tsx`
- Modify: `tests/e2e/ecosystems.spec.ts`

**Step 1: 写 Rialo 交互 RED 测试**

使用原生 `button` 和明确的当前阶段契约验证：

- 默认 Observe。
- 点击或触摸 Cover 后标题与说明更新。
- ArrowLeft/ArrowRight/ArrowUp/ArrowDown/Home/End 可以移动焦点，Enter/Space 以手动激活模式更新阶段。
- 当前按钮同时使用 `aria-pressed` 或 `aria-current="step"` 的明确状态，并且通过编号、文字与边框而非只靠颜色表达。

**Step 2: 保证服务端完整输出**

初始 HTML 必须包含 Observe、Cover、Trigger、Settle、Explain 五个阶段的标题和全部中文说明，且不得通过 `hidden` 折叠未选阶段；Client Component 只增强当前阶段视觉、活动读数与键盘状态，JavaScript 失败时不得丢失任何阶段内容。英文阶段信号与 catalog 的五条 `coreLoop` 按受控顺序组合，中文业务内容不得复制成第二事实源。

**Step 3: 实现 GREEN**

在 Rialo 生态页挂载阶段轨；Arc 页面不得出现 Rialo 阶段。触控目标至少 44×44px，窄屏为纵向时间线，桌面可使用“完整阶段轨 + 当前读数”双栏，`prefers-reduced-motion` 下不依赖动画说明状态。E2E 必须覆盖 JavaScript disabled、真实 touch context 和 reduced-motion context。

**Step 4: 验证**

Run:

```bash
npm test -- --run src/components/rialo/rialo-reactive-loop.test.tsx
npm run test:e2e -- tests/e2e/ecosystems.spec.ts
npm run verify
npm run build
```

**Step 5: 建议提交点**

```bash
git add src/components/rialo src/app/'(immersive)'/'[ecosystem]'/page.tsx tests/e2e/ecosystems.spec.ts
git commit -m "feat: add rialo reactive loop"
```

## Task 6A: 实现通用项目案例案卷骨架

**Files:**

- Create: `src/components/project/project-case-study.tsx`
- Create: `src/components/project/project-case-study.module.css`
- Create: `src/components/project/project-hero.tsx`
- Create: `src/components/project/core-loop.tsx`
- Create: `src/components/project/evidence-section.tsx`
- Create: `src/components/project/stack-lanes.tsx`
- Create: `src/components/project/project-navigator.tsx`
- Create: `src/components/project/project-case-study.test.tsx`
- Modify: `src/app/(case-files)/[ecosystem]/[project]/page.tsx`

**Step 1: 写案卷骨架 RED 测试**

使用真实 catalog 项目参数化渲染，断言每个项目均出现：

- 唯一 Hero 标题、价值主张、角色、标签和全部状态。
- 使用既有 `summary` 诚实表达的问题背景，不新增无法验证的成绩或指标。
- 不超过五步且顺序与 catalog 完全一致的核心闭环。
- 至少三项带状态说明的产品证据。
- 四条技术泳道、全部限制说明和明确的测试网/演示边界。
- HTTPS 在线 CTA、返回所属生态和从 selector 派生的下一项目入口。

测试先失败，并确认失败来自案卷组件尚未实现，而不是测试环境错误。本切片不提前勾选 OpenSpec 7.1，因为图库断言在 Task 6B2 才补齐。

**Step 2: 实现 Server Component 骨架**

`ProjectCaseStudy` 只接收类型化的 `project`、`ecosystem` 和 `nextProject`，按固定信息契约组合专用章节组件，不接受任意嵌套 block。详情路由继续使用 `generateStaticParams()`、`dynamicParams = false` 和 `notFound()`，并通过现有 `getNextProject()` 生成下一项目。

- Hero 使用项目主题 token，保留一个 `h1`，在线作品通过既有 `ExternalLink` 独立打开。
- “问题与约束”只能复用 catalog 的 `summary`、状态和 `limits`，不推断外部项目未声明的能力。
- 核心闭环使用有序列表；证据与技术泳道使用语义化章节。
- 返回生态与下一项目使用真实 `href`，不依赖 JavaScript。
- 不添加 `use client`、iframe、Canvas、图库占位图或签名视觉占位数据。
- 新增 CSS 必须满足设计契约：所有 `letter-spacing` 为 `0`，`font-size` 不使用 `vw`，320px 不裁切正文或 CTA。

**Step 3: 验证**

Run:

```bash
npm test -- --run src/components/project/project-case-study.test.tsx
npm run lint
npm run typecheck
npm run build
```

Expected: 四条详情路由静态生成，结构完整、无客户端案卷代码、无 iframe 和无本地绝对路径；媒体与签名模块仍明确留给后续切片。

## Task 6B1: 审核、脱敏并转换可追溯素材

**Files:**

- Create: `src/content/project-media-assets.test.ts`
- Create: `public/projects/arc/signal-ledger/live-research.webp`
- Create: `public/projects/arc/hadron/hadron-market.webp`
- Create: `public/projects/arc/arcpredict/crypto-home.webp`
- Create: `public/projects/rialo/rialo-captain/rialo-tower.webp`
- Create: `docs/assets/project-sources.md`

**Step 1: 写媒体完整性 RED 测试**

从真实 catalog 的 `gallery[].src` 派生四个预期 `public` 文件，断言：

- 文件存在且前 12 字节符合 RIFF/WebP 文件头，不允许只改扩展名。
- 每张输出保留可读产品证据，长边不超过 1600px，不放大低分辨率源图，单文件预算不超过 450 KiB。
- 来源文档覆盖四个 catalog 媒体路径、四个原始来源、公开性判断、脱敏/裁切说明、转换参数、输出尺寸、文件大小和校验和。
- 公开 catalog 与产物不含 `/Users/captain`、`file://` 或其他本地绝对路径。

测试不得为读取尺寸新增依赖；文件头和大小使用 Node 内置 `fs`，像素尺寸作为 worker 转换证据和 Review Codex 的独立检查项。先运行测试，确认因四个 WebP 和来源文档尚不存在而 RED。

**Step 2: 审核源素材**

仅从已确认的公开素材读取，不探测外部作品运行状态：

```text
/Users/captain/python/arc-lepton/docs/assets/readme/live-research.png
/Users/captain/python/arc-hadron/docs/assets/readme/hadron-market.png
/Users/captain/python/ArcPredict/artifacts/project-intro-video/screens/crypto-home.png
/Users/captain/python/rialo-captain/docs/assets/readme/rialo-tower.png
```

Architecture 预审结论：

- SIGNAL/LEDGER：只出现 Arc Testnet、区块号、截断交易线索和演示数值；未发现密钥、真实钱包或私有地址。
- HADRON：钱包未连接，界面明确标注 testnet illustrative data / not financial advice；未发现个人身份或私有数据。
- ArcPredict：只出现 Arc Testnet、模拟市场与日期；源文件名为 `.png` 但实际编码是 JPEG，转换时按真实格式读取。
- Rialo Captain：右上角存在 `CAPTAIN@LOCAL.DEV` 本地演示身份。公开衍生图必须移除这一文本，只修复对应导航背景，不添加替代账号，不改变航线、面板、数值或其他证据。图像编辑必须使用已安装的 imagegen 工作流并做前后视觉比对；如果不能保持其余界面，停止并报告，不能用整图重绘冒充真实截图。

所有截图中的数值均按 DEMO/TESTNET/EXPERIMENTAL 语境说明，不表述为真实营收、流动性、收益、赔率或赔付记录。

**Step 3: 转换与记录**

- 使用确定性图片工具把审核后的源图转换为 sRGB WebP，自动旋转并移除元数据。
- 长边最多 1600px；禁止放大；优先保持细小 UI 文本可读，质量参数和实际输出尺寸写入来源文档。
- 输出目录和文件名必须与 catalog 已有 `gallery[].src` 精确一致。
- `docs/assets/project-sources.md` 是开发来源记录，不得被导入客户端；原始绝对路径只允许出现在这份内部文档中。
- 不修改 catalog、类型、组件、路由、配置或依赖。

**Step 4: 验证**

Run:

```bash
npm test -- --run src/content/project-media-assets.test.ts
npm run lint
npm run typecheck
npm run build
```

Expected: 四个真实 WebP 与来源记录通过完整性测试，转换前后证据含义一致；图库接线仍留给 Task 6B2。

## Task 6B2: 接入静态图库并建立资源失败门禁

**Files:**

- Create: `src/components/project/project-media.ts`
- Create: `src/components/project/project-gallery.tsx`
- Create: `tests/e2e/project-detail.spec.ts`
- Modify: `src/components/project/project-case-study.tsx`
- Modify: `src/components/project/project-case-study.module.css`
- Modify: `src/components/project/project-case-study.test.tsx`
- Modify: `src/content/project-media-assets.test.ts`
- Modify: `src/styles/design-contract.test.ts`
- Modify: `tests/e2e/routes.spec.ts`

**Step 1: 收紧媒体与运行时失败检测**

先修改测试并确认 RED：

- `routes.spec.ts` 不再忽略任意 “Failed to load resource 404”。成功路由的 document、图片、字体、脚本或样式 4xx/5xx、`requestfailed`、page error 与 console error 都必须失败。
- 只有显式验证未知路由的测试可以接受该次顶层 document 的预期 404；其子资源错误仍必须失败。
- 设计契约递归扫描 `src/app/**/*.css`、`src/styles/**/*.css` 和 `src/components/**/*.css`，保证所有 `letter-spacing` 精确为 `0` 且 `font-size` 不使用 `vw`。

**Step 2: 建立静态媒体注册表**

`project-media.ts` 对四个 WebP 使用静态 import，并以 catalog 的 `ProjectImage['src']` 为键建立穷尽注册表。`ProjectGallery` 只接收 `project.gallery`，不得根据 slug 重复硬编码标题、alt 或 caption；未知媒体路径必须 fail fast，不能静默渲染破图。

- 使用 `next/image` 的静态尺寸和响应式 `sizes`。
- 图库位于产品证据之后、技术泳道之前，属于非首屏内容，保持默认 lazy loading，不错误添加 `priority`。
- 每张图使用 `figure`、可见 `figcaption` 和 catalog alt；不使用灯箱客户端状态、iframe 或热链。
- 案卷仍是 Server Component，不新增 `use client`。

**Step 3: 扩展案卷与端到端测试**

扩展案卷单元测试和端到端测试，要求：

- 每个项目仅展示自己 catalog 中的真实媒体、alt 与可见 caption。
- `next/image` 使用可确定尺寸、响应式 `sizes` 和非首屏懒加载；静态资源在生产构建中存在。
- 四条详情路由在 320、375 和 1440 视口不横向溢出；无 JavaScript 时仍能读取全部案卷内容与图片说明。
- 在线 CTA 使用精确 HTTPS 地址，页面无 iframe、无原始本地绝对路径，成功路由没有资源 404。

完成独立审查后再由 Architecture 勾选 OpenSpec 4.4、4.5、7.1、7.2。

**Step 4: 验证**

Run:

```bash
npm test -- --run src/content/project-media-assets.test.ts src/components/project/project-case-study.test.tsx src/styles/design-contract.test.ts
npm run test:e2e -- tests/e2e/project-detail.spec.ts tests/e2e/routes.spec.ts
npm run verify
npm run build
```

Expected: 四张媒体经过公开性审核与现代格式转换，图库结构、响应式资源、可见说明和资源失败检测全部通过。

## Task 6C: 实现四套项目签名模块并收口详情页

**Files:**

- Create: `src/components/project/signature/project-signature.tsx`
- Create: `src/components/project/signature/project-signature.module.css`
- Create: `src/components/project/signature/ledger-signature.tsx`
- Create: `src/components/project/signature/market-signature.tsx`
- Create: `src/components/project/signature/probability-signature.tsx`
- Create: `src/components/project/signature/flight-signature.tsx`
- Create: `src/components/project/signature/project-signature.test.tsx`
- Modify: `src/components/project/project-case-study.tsx`
- Modify: `src/components/project/project-case-study.test.tsx`
- Modify: `tests/e2e/project-detail.spec.ts`

**Step 1: 写签名映射 RED 测试**

以 `project.theme.motif` 为穷尽枚举输入，签名模块读取 catalog 的 `coreLoop` 作为业务文字单一事实源，断言：

- `ledger` 呈现预算、付费调用、报告与 Receipt 的扫描账本。
- `market` 呈现资产行、订单簿、成交与 USDC 结算。
- `probability` 呈现概率弧、结果提议、挑战窗口与 Claim，并明确 AI 不做最终裁决。
- `flight` 呈现航线、延误触发、自动结算、Evidence 与解释。
- 未知 motif 在 TypeScript 层不可达；任何装饰图形都不是唯一信息来源。
- 四个模块统一标注“流程示意 / 非实时数据”，不得编造余额、价格、概率、航班号或结算结果。

**Step 2: 实现轻量 CSS/SVG 签名视觉**

使用共享签名接口和四个项目专用 Server Component。允许 CSS 与内联 SVG，不允许 Canvas、额外 WebGL 上下文、客户端定时器或虚构实时数据。动画仅作渐进增强，并为 `prefers-reduced-motion` 提供稳定终态。

签名模块紧随 Hero，位于“问题与约束”之前；它不改变问题、核心闭环、证据、图库、技术泳道、限制和导航之间的既有相对顺序。视觉以形状而非颜色作为首要区分：琥珀扫描账本、冷青双边订单簿、靛蓝概率弧/挑战窗口、雷达绿航线/触发轨；CSS 保持硬边、低圆角、`letter-spacing: 0`，字号不使用 viewport/container query 单位。

**Step 3: 详情页端到端收口**

验证四条详情页具有一致章节顺序但签名视觉可区分；320、375 与 1440 不产生横向溢出，禁用 JavaScript 时签名文字仍完整；键盘可依次到达在线 CTA、返回生态和下一项目；外链正确且独立打开；任何页面都没有 iframe、Canvas、本地绝对路径或依赖颜色才能理解的状态。

完成独立审查后勾选 OpenSpec 7.3–7.7。

**Step 4: 验证**

Run:

```bash
npm test -- --run src/components/project/signature/project-signature.test.tsx src/components/project/project-case-study.test.tsx src/styles/design-contract.test.ts
npm run test:e2e -- tests/e2e/project-detail.spec.ts
npm run verify
npm run build
```

Expected: 四套签名模块映射准确、轻量、可访问，四条项目详情路由完成并通过独立 Review Codex。

**建议提交点（仅在用户明确要求提交后执行）**

```bash
git add src/components/project src/app/'(case-files)' public/projects docs/assets tests/e2e
git commit -m "feat: add four project case studies"
```

## Task 7: 先完成静态 fallback 与质量决策

**Files:**

- Create: `src/components/scene/quality.ts`
- Create: `src/components/scene/quality.test.ts`
- Create: `src/components/scene/static-universe-fallback.tsx`
- Create: `src/components/scene/static-universe-fallback.module.css`
- Create: `src/components/scene/capability-gate.client.tsx`
- Create: `src/components/scene/scene-error-boundary.client.tsx`
- Create: `src/components/scene/capability-gate.test.tsx`

**Step 1: 写纯函数 RED 测试**

```ts
expect(selectQuality({ reducedMotion: true, ...base })).toBe('static')
expect(selectQuality({ saveData: true, ...base })).toBe('static')
expect(selectQuality({ webgl2: false, ...base })).toBe('static')
expect(selectQuality({ width: 375, ...base })).toBe('medium')
expect(selectQuality({ width: 1440, ...base })).toBe('high')
```

另测试用户选择只能作为安全上限、不能覆盖 reduced motion / saveData / WebGL 不可用；运行时连续两个采样窗口低于 24 FPS 时只降一级，Low 连续两个窗口低于 18 FPS 时进入 Static；High → Medium → Low → Static 单向降级，不因后续高 FPS 自动升级或振荡。

**Step 2: 运行并确认 RED**

Run:

```bash
npm test -- --run src/components/scene/quality.test.ts
```

**Step 3: 实现 quality 与 fallback**

Static fallback 必须覆盖项目星盘、Arc 轨道和 Rialo 雷达三种路由语义，并以服务端可输出的 DOM/SVG 和独立 CSS Module 呈现；不得创建 Canvas、依赖浏览器 API或动画。三种 fallback 使用不同 `data-static-scene`、图形结构和可访问说明，不承载唯一导航或项目事实。Canvas 尚未实现时页面已经完整。

**Step 4: 实现错误隔离**

`CapabilityGate` 首次服务端输出必须保留 Static fallback；浏览器端依次尊重 reduced motion、saveData、WebGL2、视口和用户质量上限。非 Static 质量只渲染调用方传入的增强内容，并在增强内容报告首帧 ready 前继续保留 fallback，避免空白闪烁。

`SceneErrorBoundary` 捕获增强内容渲染/初始化错误并回到传入的 Static fallback，不把错误抛到路由级 error boundary。Task 7 不挂载真实 R3F Canvas；context loss、资源释放与“同时一个 Canvas”的浏览器验证留给 Task 8。

**Step 5: 验证**

Run:

```bash
npm test -- --run src/components/scene
npm run verify
npm run build
openspec validate build-project-universe --strict --no-interactive
```

**Step 6: 建议提交点**

```bash
git add src/components/scene
git commit -m "feat: add progressive scene fallback"
```

## Task 8A: 先冻结单 Canvas 的控制契约

本切片只建立纯状态和类型契约，不挂载 Canvas、不修改路由布局。它由 Implementation Codex 执行 TDD，完成后先经过独立 Review Codex，Task 8B 才能消费这些契约。

**Files:**

- Create: `src/components/scene/scene-types.ts`
- Create: `src/components/scene/scene-route.ts`
- Create: `src/components/scene/scene-route.test.ts`
- Create: `src/components/scene/transition-machine.ts`
- Create: `src/components/scene/transition-machine.test.ts`
- Create: `src/components/scene/runtime-scene-state.ts`
- Create: `src/components/scene/runtime-scene-state.test.ts`
- Create: `src/components/scene/scene-target.ts`
- Create: `src/components/scene/scene-target.test.ts`

**Step 1: 写路由与目标解析 RED 测试**

- pathname 只允许 `/ → home`、`/arc → arc`、`/rialo → rialo`。
- `/about`、四条详情路径、未知一级路径、查询/尾斜杠异常输入全部 fail closed，不允许启动 CapabilityGate。
- `data-scene-target` 只解析三类稳定信号：`ecosystem:*`、`project:*`、`rialo-step:*`；值域复用 catalog 的 `EcosystemSlug` / `ProjectSlug`，未知值返回 `null`。

**Step 2: 写可取消过渡 RED 测试**

覆盖 `idle → departing → swapping → arriving → idle`、每次导航的新 token、快速第二次导航使旧 token 失效、reduced motion 直接进入稳定终态，以及 back/forward 只更新场景状态而不拦截浏览器导航。离场上限 180ms、入场 360–420ms，总等待不超过 700ms。

**Step 3: 写生命周期 RED 测试**

用纯 reducer 覆盖 `static / booting / ready / paused / failed / disposed`：

- 首帧之前保持 booting。
- 页面 hidden 或场景 host 离开主要视区时进入 paused，恢复后只回到按需渲染。
- 初始化失败或 `webglcontextlost` 只报告一次 failure，不自动重试。
- 卸载进入 disposed，后续事件不得复活状态。
- 稳定场景使用 demand；不得用路由或质量值作为 Canvas 实例 key。

**Step 4: 最小实现并验证**

Run:

```bash
npm test -- --run src/components/scene/scene-route.test.ts src/components/scene/transition-machine.test.ts src/components/scene/runtime-scene-state.test.ts src/components/scene/scene-target.test.ts
npm run verify
npm run build
openspec validate build-project-universe --strict --no-interactive
```

Expected: 控制契约完全由纯函数覆盖，仍没有 R3F import、真实 Canvas 或 immersive layout 修改。

## Task 8B: 挂载持久单 Canvas 并实现三套程序化场景

Task 8B 拆成两个串行、各自独立审查的子切片；Task 8A 的控制文件始终设为只读契约：

- **Task 8B1 — 程序化几何与场景层**：只实现纯几何生成、SharedUniverse、CameraRig、SceneRouter 与三套场景，不挂载真实 Canvas，不修改布局或浏览器测试。
- **Task 8B2 — 持久 Canvas 与页面集成层**：只在 8B1 Review Codex 给出 PASS 后，接入 CapabilityGate、唯一 Canvas owner、生命周期、布局协调与浏览器基础门禁。

两个子切片均由 Implementation Codex 实现并分别交给新的独立 Review Codex。8B1 与 8B2 不并发直写；8B2 只消费已通过审查的 8B1 契约，不回头重写场景几何。

**Task 8B1 Files:**

- Create: `src/components/scene/scene-router.client.tsx`
- Create: `src/components/scene/camera-rig.tsx`
- Create: `src/components/scene/shared-universe.tsx`
- Create: `src/components/scene/scene-primitives.ts`
- Create: `src/components/scene/scene-primitives.test.ts`
- Create: `src/components/scene/scene-composition.test.tsx`
- Create: `src/components/scene/scenes/home-astrolabe.tsx`
- Create: `src/components/scene/scenes/arc-orbital-circuit.tsx`
- Create: `src/components/scene/scenes/rialo-reactive-field.tsx`

**Task 8B2 Files:**

- Create: `src/components/scene/universe-shell.client.tsx`
- Create: `src/components/scene/universe-shell.module.css`
- Create: `src/components/scene/universe-shell.test.tsx`
- Create: `src/components/scene/universe-canvas.client.tsx`
- Create: `src/components/scene/universe-canvas.test.tsx`
- Create: `tests/e2e/progressive-enhancement.spec.ts`
- Modify: `src/app/(immersive)/layout.tsx`
- Modify: `src/styles/universe-pages.module.css`
- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/ecosystems.spec.ts`

**Step 1（8B2）: 写真实边界 RED 测试**

- Server `immersive` layout 仍为 Server Component，只让 `UniverseShell` 包裹 children；根 layout、About 和详情路由不 import 3D shell。
- `UniverseShell` 服务端首屏输出当前路由的 Static fallback；未知一级路径直接返回 children。
- 只在 `CapabilityGate` 的 enhanced 分支中通过 Client `next/dynamic({ ssr: false })` 加载 `UniverseCanvas`；Static 分支不得请求 Three/R3F/场景 chunk。
- 当前动态 scene 解析后，由一次性 `useFrame` 只 arm 首帧，再用 `addAfterEffect` 在 `gl.render` 后确认 `gl.info.render.frame` 已增长，之后才调用一次 `reportReady`；不能把 SharedUniverse、`onCreated` 或 render 前的 `useFrame` 当成已完成首帧。
- 实际 `<canvas>` 与外层 host 都是 `aria-hidden`、`tabIndex=-1`、`pointer-events: none`。
- `webglcontextlost` 主动 `preventDefault()` 并调用一次 `reportFailure`；卸载清除 visibility、IntersectionObserver、context 与性能采样监听。
- R3F 的异步 `configure()` 不能假设会被外层 React ErrorBoundary 捕获；稳定 `gl` factory 必须在 renderer 构造失败时先桥接一次 `reportFailure`，测试不得用同步 mock throw 冒充真实初始化失败覆盖。

**Step 2（8B2）: 挂载唯一场景 owner**

唯一挂载点是 `src/app/(immersive)/layout.tsx`。Canvas layer 与 DOM main 是 shell 内 sibling：scene 使用 `z-index: 0`，DOM 使用 `z-index: 1`，禁止负层级；scene host 限定在沉浸式首屏区域而不是覆盖 footer，使用 `overflow: clip`，桌面高度不超过 `clamp(36rem, 72svh, 48rem)`，窄屏不超过 `clamp(33rem, 78svh, 40rem)`。Canvas、测量 wrapper 和真实 canvas 都不得捕获 pointer/wheel/touch，也不得改变正常文档流或滚动容器。

`UniverseShell` 通过 Task 8A 的 exact pathname map 选择 scene。不得以 pathname、quality 或 transition token 给 `UniverseCanvas` 加 key；在 `/ → /arc → /rialo` 导航时只替换 `SceneRouter` subtree，Canvas DOM 实例保持不变。离开 immersive route group 后完整卸载。

`universe-pages.module.css` 只在 `data-universe-shell` 祖先下协调现有 Hero：降低右侧 astrolabe / ecosystem instrument 的不透明度，把它们保留为校准 reticle；Hero 文本安全区仍保持高对比暗底。禁止为了绕过不透明面板而把 Canvas 提到 DOM 文字之上。

**Step 3（8B1）: 字面量动态导入三个场景**

`SceneRouter` 使用三个显式 import 路径，不使用模板变量：

- HomeAstrolabe：两套生态轨道与四个项目信标。
- ArcOrbitalCircuit：冷色账本环、订单簿平面和概率分岔。
- RialoReactiveField：雷达、航线、风险走廊与五阶段节点。

`SharedUniverse` 只持有注册网格、边缘刻度和 High/Medium 的稀疏静态 Points；轨道、雷达、项目节点和案卷板必须留在各自 scene subtree。`scene-primitives.ts` 以纯函数生成椭圆、雷达、路径顶点和实例矩阵，并用测试锁定样本数、实例数与保守 draw/triangle 估算。颜色从 catalog 在 SceneRouter 一次派生后作为窄 props 传入动态场景，三个 scene chunk 不各自复制事实源。

只使用程序化 BufferGeometry、Line/LineSegments、平面、InstancedMesh 和共享 MeshBasic/LineBasic 材质；不引入 GLB、lights、动态阴影、OrbitControls、Canvas 内文字/按钮或 Bloom。粗轨使用实例化窄 Box 或双平行线，不依赖 WebGL 中不可控的 `linewidth`。

- Home：闭合 Arc 轨道、开放 Rialo 雷达弧、四个固定项目节点与中央案卷 hub。
- Arc：三条同心回路、ledger 平行栏、market 双边轴与 probability 分岔透镜，灰度下也能按形状区分。
- Rialo：三层雷达环、Observe/Cover/Trigger/Settle/Explain 五种轮廓、航路与有限风险走廊。

High 使用 `dpr={[1, 1.5]}`，Medium 使用 `dpr={[1, 1.25]}`，Low 使用 `dpr={1}`；不要用固定 1.5 在 1x 屏强制超采样。renderer 创建参数在整个 Canvas 生命周期稳定，统一 `alpha: true`、`antialias: false`、`depth: true`、`stencil: false`、`preserveDrawingBuffer: false`，不得把 quality 写进 context 创建参数。Medium/Low 依次削减曲线 samples、instances、Points 和透明 plane，Low 首个有效 frame 后立即 settled/demand。

内部硬告警目标低于 OpenSpec 上限：High 过渡峰值 ≤24 draw calls / 5k triangles，Medium ≤18 / 3k，Low ≤8 / 1k；SceneRouter 任何时刻最多存在当前场景与一个过渡场景，不能积累第三个 subtree。相机采用固定浅透视预设，`760px` 以下居中并下移构图，320/375 不得让 3D 穿过 H1/lede 文本安全区。

**Step 4（8B2）: 生命周期与开发指标**

- R3F 初始 booting 使用 `always`；High 最多 400ms、Medium 最多 260ms 后 settled，Low 首帧后立即 settled。稳定后切换 `frameloop="demand"`；页面 hidden 或 host 离屏时先切 `never` 且不 invalidate，恢复时先恢复原 active loop 再只 invalidate 必要帧。只在 loop 真正变化时调用 `setFrameloop`，避免反复重置 clock。
- Runtime FPS 复用 Task 7 的两窗口降级契约，调用 gate 的 `degrade`，Static 时卸载 enhanced 内容且不自动升级。
- Low 对 Task 8A 的 `always` 派生结果施加 `demand` 上限，不修改已经 Review PASS 的 reducer。
- context listener 通过真实 canvas ref 安装并在 React 卸载阶段先移除；不得手动 `gl.dispose()` / `forceContextLoss()` 与 R3F owner 竞争。E2E 资源检查轮询至 1.5s，覆盖 R3F 约 500ms 的延迟清理窗。
- 开发环境用 render 后的 `addAfterEffect` 从最新 store 读取 draw calls、triangles、textures、programs、DPR、frame count；不用 React state 每帧刷新 HUD。生产不注册指标回调、不渲染 HUD，也不读取或记录 GPU vendor/renderer。

**Step 5（8B2）: 浏览器基础门禁**

更新旧的“正常 JS 下 Canvas=0”断言，但保留无 JavaScript 的 Static 断言。新增 E2E 覆盖：

- `/`、`/arc`、`/rialo` 各只有一个 Canvas，真实 Link 连续导航后仍是同一 DOM 实例。
- `/about`、四条详情和未知 404 为零 Canvas。
- reduced motion、`saveData=true`、WebGL 禁用只显示对应 Static fallback，零 Canvas。
- fallback 保留到首个真实 frame；Canvas 不进入 Tab 序列，滚轮/触摸仍滚动 DOM。
- 正常 JS 的旧内容测试移除“必须零 Canvas”的过期断言；无 JavaScript 的首页/Rialo/Arc 静态内容与零 Canvas 断言必须保留。
- 为重型入口保留一个构建时可定位的稳定 sentinel；最终冷路由 chunk 门禁从同一次 build 的 App Router client-reference manifest 解析真实 hash 路径，集合为空或解析失败必须 fail closed，不能用 URL 中的 `three`/`scene` 字样猜测。

Task 8B1 Run:

```bash
npm test -- --run src/components/scene/scene-primitives.test.ts src/components/scene/scene-composition.test.tsx
npx eslint src/components/scene/scene-primitives.ts src/components/scene/scene-primitives.test.ts src/components/scene/scene-composition.test.tsx src/components/scene/shared-universe.tsx src/components/scene/camera-rig.tsx src/components/scene/scene-router.client.tsx src/components/scene/scenes/home-astrolabe.tsx src/components/scene/scenes/arc-orbital-circuit.tsx src/components/scene/scenes/rialo-reactive-field.tsx
openspec validate build-project-universe --strict --no-interactive
```

Task 8B1 的共享工作树中会暂存 8B2 的未实现 RED 测试，因此全量 `npm run verify`、`npm run build` 和浏览器门禁明确延后到 8B2；8B1 Review 必须把这项降级记录为已知未验证项，不能误报为全量通过。

`scene-composition.test.tsx` 必须从 SharedUniverse 与三套真实场景的渲染结构盘点 draw calls，并覆盖 idle 与 transition 峰值；不得只断言与 JSX 脱节的预算常量。Low 档过渡只保留 incoming/current 单场景，High/Medium 可保留 outgoing + current，但三档峰值仍分别满足 24/18/8 上限。

Task 8B2 Run:

```bash
npm test -- --run src/components/scene/universe-shell.test.tsx src/components/scene/universe-canvas.test.tsx src/components/scene/scene-primitives.test.ts
npm run test:e2e -- tests/e2e/progressive-enhancement.spec.ts tests/e2e/home.spec.ts tests/e2e/ecosystems.spec.ts
npm run verify
npm run build
openspec validate build-project-universe --strict --no-interactive
```

## Task 8C: 接入 DOM 信标、快速切换与资源释放门禁

本任务只消费已经 Review PASS 的 Canvas、状态机与场景契约，不重新设计 scene owner。为避免共享的 Shell、Canvas、Router 和浏览器测试并发直写，按依赖关系串行拆成两个 handoff：

- **Task 8C1 — DOM target 同步与 demand 刷新**：建立信标生产者、Shell 四事件委托、Router 严格过滤、target-only invalidate 和交互 E2E。
- **Task 8C2 — 快速导航与资源门禁**：只在 8C1 的规格审查与代码质量审查均 PASS 后，扩展开发快照并完成快速 history、context loss、停帧、资源基线、冷路由脚本与运行时预算 E2E。

每个子切片都由一个新的 Implementation Codex 执行 RED-GREEN-REFACTOR；先由新的 Review Codex 做规格符合性审查，再由另一个新的 Review Codex 做代码质量审查。任何审查未 PASS 都回交原 worker 修正并重新审查。共享 worktree 保持单 worker 串行，不提交、不部署。

### Task 8C1: DOM target 同步与 demand 刷新

**Files:**

- Modify: `src/app/(immersive)/page.tsx`
- Modify: `src/components/project/project-card.tsx`
- Modify: `src/components/project/project-card.test.tsx`
- Modify: `src/components/rialo/rialo-reactive-loop.tsx`
- Modify: `src/components/rialo/rialo-reactive-loop.test.tsx`
- Modify: `src/components/scene/universe-shell.client.tsx`
- Modify: `src/components/scene/universe-shell.test.tsx`
- Modify: `src/components/scene/universe-canvas.client.tsx`
- Modify: `src/components/scene/universe-canvas.test.tsx`
- Modify: `src/components/scene/scene-router.client.tsx`
- Modify: `src/components/scene/scene-composition.test.tsx`
- Modify: `tests/e2e/progressive-enhancement.spec.ts`

三个已经 Review PASS 的 `scenes/*.tsx` 保持只读：它们已用既有材质 opacity、实例颜色和 buffer color 响应 ecosystem、project 与 Rialo step，不新增文字、CTA、交互、几何或动画。若真实 E2E 暴露场景文件内的 R3F prop 错误，worker 必须停止并申请受控扩围，不能静默修改。

**Step 1: 写信标生产者 RED 测试**

- 首页两个真实生态 Link 分别使用 `ecosystem:arc` 与 `ecosystem:rialo`。
- 每张 ProjectCard 根 article 使用 `project:<ProjectSlug>`；两个内部链接的 `closest('[data-scene-target]')` 都指向同一 article，article 本身不增加 `tabIndex`。
- Rialo 五个真实 button 直接消费 Task 8A 的 `RIALO_STEP_SIGNALS`，依次使用 `rialo-step:observe|cover|trigger|settle|explain`。Arrow/Home/End 仍只移动 roving focus，Enter/Space/click 才更新 `activeIndex` 与可见 readout。
- 不给 Hero、section/grid、li、readout、Static fallback 或 Canvas 增加 target，不复制 target 到 ProjectCard 内部链接。

运行 ProjectCard 与 Rialo 定向测试，确认新增 exact target 断言先因缺失属性失败，再实现最小属性映射。

**Step 2: 写 Shell 四事件委托 RED 测试**

`UniverseShell` 只在 `data-universe-content` 根节点安装原生冒泡 `focusin`、`focusout`、`pointerover`、`pointerout` 监听。DOM 字符串必须先经 `parseSceneTarget`，再保存 canonical value；非法、越界或 root 外 marker 一律归零。

状态保留 `focusTarget`、`pointerTarget` 与 `latestSource`：

- 最近进入的有效模态优先；
- 当前模态离开后回退仍有效的另一通道；
- 同一 marker 的子节点移动、ProjectCard 两个 sibling link 之间换焦，不得先闪成 null；
- marker A 直接进入 marker B 时原子切换；
- pathname/scene 改变时旧 target 在同一 render 中失效，不能依赖可能缺失的 focusout/pointerout；
- unmount 与 StrictMode replay 后四个监听不重复、不残留；
- 不调用 `preventDefault()`，不读取或复制 Rialo `aria-pressed` / `data-active`。

Shell 根输出只读 `data-universe-target="<canonical>"` 供 E2E 观察，并把解析后的 `SceneTarget | null` 传给唯一 Canvas。触摸仍使用 pointer 事件；不增加 click 状态，移动浏览器不保证 tap 后持久强调时，DOM button、ARIA 与可见 readout 仍是完整事实源。

**Step 3: 写 Router 过滤与 demand invalidate RED 测试**

- 把 Router 的 scene-target 过滤整理为可直接测试的纯函数。
- `home` 只接受 ecosystem 与 project；`rialo-step:*` 对 home 清零。
- `arc` 只接受 `ecosystem:arc` 与 catalog 中属于 Arc 的项目。
- `rialo` 只接受 `ecosystem:rialo`、catalog 中属于 Rialo 的项目与五个 Rialo step。
- 项目所属生态从 catalog 派生，不再复制硬编码三项 Arc/一项 Rialo 表。
- outgoing/current 各自按所属 scene 过滤；target 变化不改变 entry 数、scene-only render key、draw call 或三角形预算。

Canvas 比较 canonical target key。target-only 变化不得重建 Canvas、Renderer、SceneRouter 或 transition token；当当前 loop 不是 `never` 时只 invalidate 一次。当 hidden/offscreen 为 `never` 时只保存最新 props，不 invalidate；恢复路径沿既有顺序恢复 active loop，再用一次必要 invalidate 绘制最新 target。首次 `null` 不增加无意义 invalidate。

**Step 4: 8C1 浏览器门禁**

在 `progressive-enhancement.spec.ts` 中使用真实 DOM 与 Shell `data-universe-target` 验证：

- 首页生态 Link hover/focus、ProjectCard 整卡 hover与两个内部链接 focus 映射 exact target；
- 同 marker 子节点移动和同卡链接换焦不产生 null 闪烁；
- focus 与 pointer 最近模态切换及离开回退正确；
- Rialo ArrowRight 时 target 跟随 focused Cover，但 Observe 仍是 active/readout；Enter 后 DOM active/readout 才切换；
- target 变化期间 Canvas DOM node 与 SceneRouter transition identity 不变；
- touch 只要求真实 button/DOM readout 等价，不要求复制 active state形成持久 Canvas target。

只允许 `127.0.0.1:3100`；不得触碰 3000，结束必须证明 3100 已释放。

**Task 8C1 Run:**

```bash
npm test -- --run src/components/project/project-card.test.tsx src/components/rialo/rialo-reactive-loop.test.tsx src/components/scene/universe-shell.test.tsx src/components/scene/universe-canvas.test.tsx src/components/scene/scene-composition.test.tsx
npm run test:e2e -- tests/e2e/progressive-enhancement.spec.ts
npm run verify
npm run build
openspec validate build-project-universe --strict --no-interactive
```

8C1 的规格审查与代码质量审查都 PASS 后，Architecture Codex 才能勾选 OpenSpec 8.6；8.7 与 8.9 保留给 8C2。

### Task 8C2: 快速导航与资源门禁

**Files:**

- Modify: `src/components/scene/universe-canvas.client.tsx`
- Modify: `src/components/scene/universe-canvas.test.tsx`
- Modify: `tests/e2e/progressive-enhancement.spec.ts`
- Create: `tests/e2e/support/universe-resource-probe.ts`

`tests/e2e/project-detail.spec.ts` 保持只读；冷 About 与四条详情的脚本门禁集中在 progressive spec。Task 8A reducer、CapabilityGate、8C1 Shell/Router/DOM producers、Playwright 配置、依赖与构建脚本全部冻结。

**Step 1: 扩展只读开发快照 RED 测试**

复用现有 `addAfterEffect` 与 refs，在 `NODE_ENV !== 'production'` 的只读 primitive snapshot 中加入：

- `quality`
- `transitionScene`、`targetScene`、`transitionPhase`、`transitionToken`
- `runtimePhase`、`settled`、`documentVisible`、`hostVisible`
- `frameloop`、`frameCount`、`dpr`、`calls`、`triangles`、`textures`、`programs`

进入 `never` 后不能等下一帧才更新状态快照；在已有 runtime/transition/frameloop effect 中同步发布，不新增生产 RAF、listener、React 每帧 state，不暴露 renderer/store/callback/context，也不读取 GPU vendor/renderer。卸载仍删除 debug global。

**Step 2: 建立仅测试环境资源探针**

`universe-resource-probe.ts` 只通过 `BrowserContext.addInitScript` 观察原始 API，不进入生产 bundle：

- 保持 listener callback identity，按 target/type/capture 统计增减；
- 包装 IntersectionObserver 的 observe/disconnect；
- RAF callback 执行或 cancel 后从 pending 集合移除；
- WebGL 只统计 connected universe Canvas 的唯一 context，off-DOM capability probe 不计入；
- 用 WeakMap/WeakSet 或及时删除的计数结构，不能因探针强引用制造假泄漏；
- 以冷 `/about` 为基线做差值，不断言会被 Next dev/HMR 污染的绝对全局数量。

离开 immersive layout 后使用 `expect.poll(..., { timeout: 1500 })`，覆盖 R3F 延迟清理窗，不把内部约 500ms 实现细节锁死成固定 sleep。

**Step 3: 完成高风险 E2E**

- 首次 goto 前收集 `pageerror`、console error、requestfailed 与 ≥400 response。
- 用持久 Header 的真实 Link 快速 `/ → /arc → /rialo → /`，每步只等待 URL 提交、不等待过渡结束；再做 back/forward。最终 debug 必须是最新 token、`phase=idle`、`scene=targetScene=URL`，700ms 后不被旧 timer 改写，Canvas 始终一个且是同一 DOM node。
- 在同一真实 Canvas 上同步派发两个 cancelable `webglcontextlost`；两者都被 preventDefault，单测保持一次 failure，页面切回匹配路由的 fallback、Canvas 卸载，同一 immersive 会话在 resize/visibility/Link 后等待 1.5s 仍不重试。
- settled demand、真实 scroll offscreen、受控 visibilityState hidden 都停止 frame；恢复时先恢复 loop、只 invalidate 必要帧，随后再次稳定。
- 从冷 About 基线重复三轮 About → Home → About；每轮在 1.5s 内 listener、observer、pending RAF 与 active universe context 回到基线。
- 在 dev server 中从正常 enhanced 路由响应体精确识别包含 `CAPTAIN_DOCK_UNIVERSE_CANVAS_V1` 的脚本集合；reduced/saveData、About 与四条详情不得请求该集合。不得根据 URL 中的 `three` / `scene` 字样猜测，也不得禁止合法 RSC/Link prefetch。
- 按 debug 的实际 quality 验证 High DPR≤1.5、calls≤70、triangles≤120k；Medium DPR≤1.25、calls≤40、triangles≤50k。正式 production manifest fail-closed、gzip≤260KiB、单 scene≤45KiB 与 Lighthouse 保留给 Task 10/11。

**Task 8C2 Run:**

```bash
npm test -- --run src/components/scene/universe-canvas.test.tsx src/components/scene/runtime-scene-state.test.ts src/components/scene/transition-machine.test.ts
npm run test:e2e -- tests/e2e/progressive-enhancement.spec.ts
npm run verify
npm run build
openspec validate build-project-universe --strict --no-interactive
```

8C2 的规格审查与代码质量审查都 PASS 后，再由最终 Review Codex 对完整 Task 8C 做只读集成审查。只有最终 PASS，Architecture Codex 才勾选 OpenSpec 8.7 与 8.9，并进入 Task 9。

**建议提交点（仅在用户明确要求提交后执行）**

```bash
git add src/components/scene src/components/project src/components/rialo src/app/'(immersive)' tests/e2e
git commit -m "feat: add adaptive project universe scenes"
```

## Task 9: SEO、结构化数据和安全头

Task 9 属于跨路由公共契约，串行拆成两个 worker handoff；9A 的规格与质量审查均 PASS 后才开始 9B，最后再做完整 Task 9 集成审查。Graphify 仍不存在，影响分析降级为 catalog、路由、构建产物和现有测试的人工检查。

**验收标准：**

- 八条公开路由具有唯一 title、description、canonical、Open Graph 与 Twitter 信息；canonical 只来自本站 origin，绝不使用外部作品 URL。
- `NEXT_PUBLIC_SITE_URL` 是正式 canonical origin 的唯一配置源；本地和 Preview 缺省为 `http://localhost:3000`，`VERCEL_ENV=preview` 明确 `noindex`，`VERCEL_ENV=production` 缺失或非 HTTPS 正式 origin 时 fail closed。本地 `next build` 不因 `NODE_ENV=production` 被误判为 Vercel Production。
- 首页输出 `WebSite`，生态页输出 `CollectionPage + ItemList`，项目页输出 `CreativeWork`；结构化数据完全由 catalog 派生，不输出 `Person`、作者、奖项、日期、客户或其他未确认信息。
- `sitemap.xml` 恰好包含八条公开路由；`robots.txt` 指向同源 sitemap；404 具有有意义的元数据；本地图标和分享图不产生 404。
- 所有页面响应包含 `nosniff`、严格 referrer policy、禁用 camera/microphone/geolocation 的 Permissions Policy，以及限制 `object-src`、`base-uri`、`frame-ancestors` 的 CSP 基线。
- 构建和测试不探测四个外部站点，不泄露本地绝对路径，不创建 Vercel 部署。

**排除项：**

- 作者身份、联系方式、正式域名、分析工具、CMS、动态 OG 服务、CSP nonce/middleware 与任何 Vercel Preview/Production。
- 不为方便测试放宽现有外链安全组件、路由白名单、3D 渐进增强或 Server Component 边界。

### Task 9A: 元数据、分享图与 JSON-LD

**Files:**

- Create: `src/lib/metadata.ts`
- Create: `src/lib/metadata.test.ts`
- Create: `src/components/seo/json-ld.tsx`
- Create: `src/components/seo/json-ld.test.tsx`
- Create: `src/app/opengraph-image.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(immersive)/page.tsx`
- Modify: `src/app/(content)/about/page.tsx`
- Modify: `src/app/not-found.tsx`
- Modify: `src/app/(immersive)/[ecosystem]/page.tsx`
- Modify: `src/app/(case-files)/[ecosystem]/[project]/page.tsx`

其他文件全部冻结，尤其是 catalog、selectors、路由结构、Canvas/场景、`next.config.ts`、Playwright 配置与 OpenSpec。

**Step 1（9A）: 写 metadata 与 JSON-LD RED 测试**

- 从 `getAllPublicRoutes()` 派生八条路由，断言 title、description、canonical 与 OG URL 全部唯一，Twitter/OG 都有同源本地图片，项目路由使用各自 catalog 图片。
- 断言 configured origin 被规范化，拒绝 credential、path/query/hash、非 HTTP(S) 和无效 URL；Vercel Production 缺失或非 HTTPS 时抛错，local/Preview 使用明确非生产行为。
- 断言 canonical/OG URL 不等于或包含任一 `liveUrl` origin。
- 断言 JSON-LD 类型、ItemList 顺序与项目数量来自 catalog，序列化转义 `<`，且输出中不存在空字段、`Person` 或未确认作者资料。

**Step 2（9A）: 实现单一元数据工厂**

`src/lib/metadata.ts` 是 metadataBase、route descriptor、canonical、OG/Twitter 和结构化数据 URL 的唯一实现。首页、About 和 404 使用明确静态导出；生态与项目页面通过 `generateMetadata()` 消费同一个工厂。catalog 中已经确认的 SEO 字段保持事实源，禁止在页面复制项目表。

根 layout 只提供站点级默认值、metadataBase 与 Preview `noindex`；页面 title 使用绝对值，避免 catalog 已含站点名时再次套 title template。

**Step 3（9A）: 实现本地分享图与安全 JSON-LD**

- `opengraph-image.tsx` 生成本地 1200×630 Project Universe 默认分享图；项目路由继续使用项目自己的本地 WebP。
- `JsonLd` 只接受 JSON-compatible primitive/object/array，序列化时至少转义 `<`，不接受任意 HTML。
- 首页渲染 `WebSite`；生态渲染 `CollectionPage` 和按 catalog 顺序排列的 `ItemList`；项目渲染 `CreativeWork`。外部作品 URL 只可作为已确认的 `sameAs`/作品出口，不得成为 canonical。
- 不在 layout 全局重复所有页面的 JSON-LD。

**Task 9A Run:**

```bash
npm test -- --run src/lib/metadata.test.ts src/components/seo/json-ld.test.tsx
npm run verify
npm run build
openspec validate build-project-universe --strict --no-interactive
```

### Task 9B: 发现文件、安全头与浏览器门禁

**Files:**

- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Create: `src/app/icon.svg`
- Create: `tests/e2e/seo-security.spec.ts`
- Modify: `next.config.ts`

Task 9A 的实现文件与所有其他源文件冻结；如果浏览器门禁暴露 9A 缺陷，停止并把修复交回 9A 原 worker，不在 9B 静默扩围。

**Step 1（9B）: 写发现与安全 RED 浏览器测试**

- 在首次导航前安装 pageerror、console error、requestfailed 与 ≥400 response 收集器。
- 请求八条公开路由，验证 unique metadata、同源 canonical/OG、项目主题图片、预期 JSON-LD 和零 favicon/share-image 404。
- 请求未知路由，验证 404 status、标题/描述与恢复入口。
- 解析 `sitemap.xml`，要求集合与 `getAllPublicRoutes()` 精确相等；解析 `robots.txt`，要求同源 sitemap，Preview 行为单独由纯函数测试固定。
- 对 HTML/响应头做真实断言，不能只再次调用 metadata 工厂形成实现同构测试。

**Step 2（9B）: 实现发现文件与最小安全头**

- `sitemap.ts` 与 `robots.ts` 只消费 metadata origin helper 和 selectors，不维护第二份路由数组。
- `icon.svg` 使用简单本地矢量标记，不引入外链、脚本或嵌入位图。
- `next.config.ts` 为 `/:path*` 设置：
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - CSP 至少含 `object-src 'none'`、`base-uri 'self'`、`frame-ancestors 'none'`
- 不为了 CSP 基线破坏 Next hydration；不在未设计 nonce/middleware 的情况下伪造严格 `script-src`。

**Step 3（9B）: 构建扫描与验证**

```bash
npm test -- --run src/lib/metadata.test.ts src/components/seo/json-ld.test.tsx src/components/ui/external-link.test.tsx
npm run test:e2e -- tests/e2e/seo-security.spec.ts
npm run verify
npm run build
rg -n '/Users/captain/|file://' .next/server .next/static
openspec validate build-project-universe --strict --no-interactive
```

`rg` 预期无匹配；若 source map 或框架构建元数据产生匹配，必须先区分是否会进入公开响应，不能直接删除证据或放宽扫描。

9A 与 9B 的规格审查、代码质量审查以及最终 Task9 集成审查都 PASS 后，Architecture Codex 才勾选 OpenSpec 10.1–10.6。

**建议提交点（仍仅在用户明确要求提交后执行）**

```bash
git add src/lib/metadata.ts src/lib/metadata.test.ts src/components/seo src/app/sitemap.ts src/app/robots.ts src/app/layout.tsx next.config.ts tests/e2e/seo-security.spec.ts
git commit -m "feat: add portfolio discovery and security"
```

## Task 10: 响应式、无障碍和性能门禁

### Architecture slicing decision

Task 10 必须严格串行拆成三个切片；每个切片均由 `worker-codex` 按 RED-GREEN-REFACTOR 实现，并在冻结文件哈希后交给独立 `review-codex`。Reviewer 返回 `PASS` 前不得解冻下一切片的共享文件。

#### Task 10A：本地字体基础

受控解冻：

- Modify: `src/app/layout.tsx`
- Modify: `src/styles/tokens.css`
- Create: `src/styles/font-contract.test.ts`
- Create: `src/assets/fonts/GeistPixel-Square.woff2`
- Create: `src/assets/fonts/Geist-Variable.woff2`
- Create: `src/assets/fonts/GeistMono-Variable.woff2`
- Create: `src/assets/fonts/OFL.txt`
- Create: `src/assets/fonts/README.md`

字体来源固定为 Vercel 官方 `vercel/geist-font` tag `1.8.0`、signed commit `91158e012bdc4abd59fa066d0eae9fc11c2c9f24`，不得改用 `main`、npm 包、Next 内部字体或远程运行时热链：

| 用途 | 上游文件 | SHA-256 |
| --- | --- | --- |
| 展示 | `fonts/GeistPixel/webfonts/GeistPixel-Square.woff2` | `d06b084005982345edbb503d5df8dccdbe74cb70bd23b8f2d1fc09f35174c8e7` |
| 正文 | `fonts/Geist/webfonts/Geist[wght].woff2` | `c2a45610c45081b940562b38437b3128ee287c564ae759a758dbad8a90a32349` |
| 等宽 | `fonts/GeistMono/webfonts/GeistMono[wght].woff2` | `4e772ac3c650b07abd180140088b0a7c84ec016cc6385cb7dfc21beb9e258815` |
| 许可证 | `OFL.txt` | `1781d2806a07d91c4edf4740b88449fab7d0eadad53f7c351b94cd4d4eb8c00f` |

实现必须先建立失败测试，检查三个真实 WOFF2 的 magic、固定哈希、许可证与来源映射、无远程字体 URL；再使用 `next/font/local` 输出 display/body/mono 三个 CSS variable，并保留中文系统 CJK fallback。生产构建必须实际生成本地字体文件，不能只做字符串断言。若视觉取样证明 Pixel Square 影响标题可读性，停止并回到 DESIGN，不允许 worker 自行换字体。

#### Task 10B：响应式与无障碍

受控解冻：

- Create: `tests/e2e/responsive.spec.ts`
- Create: `tests/e2e/keyboard.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `src/app/globals.css`
- Modify: `src/styles/universe-pages.module.css`
- Conditional Create: `src/components/shell/skip-link.client.tsx`
- Conditional Modify: `src/app/layout.tsx`
- Read-only context: `src/app/not-found.tsx`

RED 门禁覆盖批准契约中的八条公开路由 `/`、`/arc`、`/rialo`、`/about`、`/arc/signal-ledger`、`/arc/hadron`、`/arc/arcpredict`、`/rialo/rialo-captain` 和一条真实 404；不得为测试新增 `/projects/*` 别名、rewrite 或 redirect。视口为 320、375、767、768、1440、1920。除 document 宽度外还检查可见元素边界，证明 `<768px` 无长 sticky、多栏交错或横向闭环，主要交互目标至少 44×44px。键盘门禁必须覆盖 skip link 激活后焦点进入正文、导航、Rialo 方向键/Enter/Space、项目 CTA、Shift+Tab 和可计算的焦点环。axe 对八条公开路由和 404 的 serious/critical 必须为零。

响应式矩阵仍覆盖 `9 routes × 6 widths`，但只允许每条路由一次 `goto()`，随后 resize 并等待 `document.fonts.ready` 与两个 animation frame；测试分 immersive、case-files、content/error 三个 shard，全文件固定 reduced motion，避免 54 次冷导航和 WebGL 首帧造成假失败。每个样本都检查 document/body 宽度、可见语义元素 bounding box、clip ancestor 和自身 scroll size；只跳过 Canvas 像素面、SVG 内部 primitive 和满足显式标记契约的合法横向 scroller，不得把 `overflow-x: clip`、absolute/fixed 或整个 `aria-hidden` subtree 当作通用豁免。

现有 CSS 的已知 RED 边界为：移动 header/footer 在 720 结束、桌面字号在 720 开始、`universe-pages.module.css` 多栏在 760 开始。GREEN 应把移动/桌面结构边界统一到 `<768` / `>=768`，并使移动 header 不再 sticky；不得因此强制 768 必须多栏。404 恢复链接优先在 `globals.css` 用精确 `nav[aria-label="404 recovery routes"] a` 选择器满足 44×44，不先修改页面。

skip link 使用新的轻量 Client Component：保留真实 `href="#main-content"`，激活时为现有 `#main-content` 设置 `tabIndex=-1` 并调用 `focus()`，不新增 keydown 拦截，不破坏无 JavaScript 时的原生 fragment 行为。测试必须证明 Enter 后 `document.activeElement` 是 main。

当前不存在 dialog、popover 或 overlay，焦点恢复验收记录为明确 `N/A`；不得为勾选任务人为新增覆盖层。320px reflow 只是 400% 缩放的自动化代理，真实 400% 浏览器验证由 Architecture 在 Task 11 完成。

Playwright 生成物移至 `.next/playwright/`，HTML report 使用 `open: 'never'`；端口固定 `127.0.0.1:3100`，不得探测、占用或终止 3000。若修复需要改变 palette、3D、catalog、项目内容或额外 CSS Module，停止并回到 DESIGN。

#### Task 10C：生产资源、链接与 Lighthouse

Task 10C 再严格串行拆成 10C1 与 10C2。10C1 的规格与质量审查双 PASS 后，才能受控解冻共享的 `package.json` 并开始 10C2；两片都禁止修改产品页面、场景、catalog、媒体和锁文件。Graphify 继续记录 `DEGRADED_NO_GRAPHIFY_OUT`。

##### Task 10C1：生产构建、预算与离线链接门禁

受控解冻：

- Create: `scripts/check-budgets.mjs`
- Create: `scripts/check-links.mjs`
- Create: `scripts/build-gates.test.mjs`
- Modify: `package.json`

先用 `node:test` 临时 fixture 建立 RED，证明下列情况全部 fail closed：

- `.next/BUILD_ID` 或必要 manifest 缺失、为空、损坏、schema 不符合预期；
- manifest 引用不存在的 chunk，或路径逃逸 `.next`；
- `CAPTAIN_DOCK_UNIVERSE_CANVAS_V1` 缺失、重复、不可达，两个 immersive manifest 解析出不同增强根组，或增强闭包为空；
- About、四个案例页或 404 的生产 HTML 初始脚本闭包可达 3D 增强闭包；
- 3D 增量 gzip 超过 260 KiB、单 immersive 路由初始 3D 传输超过 250 KiB、任一场景专属闭包超过 45 KiB；
- 任一本地项目图片缺失或超过 300 KiB；
- 本地 route 或 fragment 不存在；
- 空 href、协议相对 URL、credential URL、`javascript:` / `data:` / `file:` / `vbscript:`，或外部 `http:` URL。

正式实现从同一次 production build 读取 `BUILD_ID`、App Router route/prerender manifest、每路由 client-reference/react-loadable manifest、生产 HTML、`.next/static/chunks` 与 `.next/static/media`。以 HTML `<script src>` 为路由根、以现有 Canvas/scene sentinel 为可达性锚点，保守构造 chunk 传递闭包；不得硬编码构建 hash、当前 chunk 文件名或 Turbopack 私有快照数值。manifest schema 一旦无法无歧义解析，必须失败并回到 DESIGN。

gzip 使用 `gzipSync(..., { level: 9 })`，`1 KiB = 1024 B`，同一文件在一个闭包内只计一次。链接门禁只解析生产 HTML 的 `<a href>`，离线检查本站 route、fragment 与协议；不得向四个外部作品站发送请求。为避免“首屏”定义被布局变化绕开，四个项目页面引用的全部本地图片都执行 300 KiB 上限。

Task 10C1 验证：

```bash
node --test scripts/build-gates.test.mjs
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build
npm run check:links
npm run check:budgets
npm run verify
openspec validate build-project-universe --strict --no-interactive
```

若预算超限、链接修复需要改页面/catalog、需要新增依赖或改 `package-lock.json`，停止并回到 DESIGN；不得提高阈值或静默扩 scope。

##### Task 10C2：production Playwright 与 Lighthouse

受控解冻：

- Create: `tests/e2e/performance.spec.ts`
- Create: `scripts/run-lighthouse.mjs`
- Create: `lighthouserc.json`
- Modify: `package.json`，从已审查的 10C1 哈希受控解冻
- Modify: `playwright.config.ts`，从已审查的 10B 哈希受控解冻，仅增加“复用外部 production server、不启动 dev server”的环境开关

`run-lighthouse.mjs` 是 3100 的唯一 server owner：

1. 确认 production `BUILD_ID` 存在，并通过尝试绑定 `127.0.0.1:3100` 做空闲预检；若已占用立即失败，不终止未知进程。
2. 直接启动本地 Next CLI：`next start --hostname 127.0.0.1 --port 3100`，轮询 `/` 至 ready。
3. 通过显式环境开关运行 `performance.spec.ts`，此时 Playwright 配置不得再次启动 dev server。
4. 串行运行 LHCI，报告与临时目录都写入 `.next/lighthouse/`，不上传临时公共存储。
5. `finally` 只终止自己创建的进程组，先 SIGTERM、超时再 SIGKILL；结束再次证明 3100 可绑定。全程不得探测、占用或终止 3000。

production Playwright 复核生产 bundle 的路由运行时错误、冷路由 3D 隔离和已通过的关键运行时预算，不重复以 dev server 证据替代生产门禁。Lighthouse 至少覆盖首页、一个 canonical 项目详情与 About，每个 URL 三次；以每类结果的中位数验收，禁止使用 optimistic 最优样本：

- Performance ≥ 0.90；
- Accessibility、Best Practices、SEO ≥ 0.95；
- LCP ≤ 2500ms；
- CLS ≤ 0.1。

navigation Lighthouse、TBT 或 Performance 分数都不能冒充 INP。INP ≤ 200ms 明确保留为获准部署后的真实 RUM/Web Vitals 验收；本地也不能证明真实用户设备、网络、缓存与 Vercel Edge/CDN 表现。

Task 10C2 验证：

```bash
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build
npm run lighthouse
lsof -nP -iTCP:3100 -sTCP:LISTEN
npm run verify
openspec validate build-project-universe --strict --no-interactive
```

`lsof` 预期无输出。若 Chrome/Lighthouse 不可用、三次中位数不达标或 production E2E 暴露产品问题，停止并回到 DESIGN，另建最小优化切片；不得降低运行次数、阈值、审计范围或改为 optimistic。

##### Task 10C2-O1：受限网络下的文本 LCP 字体优化

Task 10C2 首轮真实移动端审计已按停止条件返回 DESIGN。三条代表路由各运行三次后，FCP 稳定在约 `0.905s`，但 LCP 稳定在 `3.07–3.10s`；LCP 元素在三条路由上都是首屏正文段落。每次导航同时高优先级预载三套本地字体，共 `171000B`，而页面没有作用于这些元素的入场动画。当前最小、可证伪的优化假设是：`font-display: swap` 在受限网络首访中触发了延迟字体替换，使已经可见的正文重新成为 LCP。

本切片只受控解冻：

- Modify: `src/app/layout.tsx`
- Modify: `src/styles/font-contract.test.ts`

先以字体契约测试建立 RED，再做最小实现：

1. 三套已审核 WOFF2、许可证、来源、CSS variable 和中文系统 fallback 全部保留，禁止换字体、裁剪字体、热链远程字体或改变页面文案。
2. 三套 `next/font/local` 均使用 `display: 'optional'`，让受限网络首访保持已经绘制的系统 fallback，避免迟到的字体交换重置文本 LCP；字体缓存命中或在可选窗口内完成时仍使用本地 Geist。
3. 只让正文 Geist Variable 保持 `preload: true`；展示字体和等宽字体显式 `preload: false`，避免三份高优先级字体竞争首屏正文资源。
4. 不改变 Lighthouse 的 mobile 模式、URL、三次运行、中位数、阈值、runner、Playwright production 契约或任何 3D/页面结构。

生产构建后必须从代表路由 HTML 与生成 CSS 证明：

- 首页、`/arc/signal-ledger` 和 `/about` 每条都只输出一个 `as="font"` preload，且目标是正文 Geist Variable；
- 三个带 `url(...woff2)` 的真实字体 `@font-face` 都使用 `font-display: optional`；Next 为度量校正生成的 `src: local(...)` fallback face 可以保留，且不要求重复声明 `font-display`；
- 仍只引用仓库内三套固定哈希字体，不出现远程字体请求。

Task 10C2-O1 验证：

```bash
npm test -- --run src/styles/font-contract.test.ts
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build
npm run lighthouse
lsof -nP -iTCP:3100 -sTCP:LISTEN
npm run verify
openspec validate build-project-universe --strict --no-interactive
```

只有 production Playwright 继续 `10/10` 且三个 URL 的三次移动端中位数全部满足 Performance ≥ `0.90`、Accessibility/Best Practices/SEO ≥ `0.95`、LCP ≤ `2500ms`、CLS ≤ `0.1`，本优化切片才可进入 Review。若 LCP 仍失败，停止并带回新的 LCP 元素、阶段分解、字体请求和九份报告；不得继续猜测式修改、隐藏 LCP 元素或降低门槛。

##### Task 10C2-R1：unknown-route RSC 404 的本站 origin 约束

Task 10C2 规格审查已 PASS，代码质量审查发现一项测试有效性缺口：unknown-route RSC 404 例外匹配 pathname、`_rsc`、Next headers 与 `text/x-component`，但没有要求响应来自 `http://127.0.0.1:3100`。因此同 pathname、同协议特征的跨站 404 fetch 可能被误计为本站预期预取。

本修复只解冻 `tests/e2e/performance.spec.ts`。先建立一个不依赖真实外网的 RED 负例，证明“同 pathname、同 Next 协议字段、但 origin 不同”的 404 必须进入 runtime HTTP errors；再让生产响应分类显式接收 `localOrigin` 并要求 exact origin 相等。本站预期 RSC 404 仍需满足原有全部字段，其他 HTTP、console 与 pageerror 规则不放宽。禁止修改 runner、LHCI、阈值、字体优化或产品代码。

修复后重新运行：

```bash
npm run verify
node --test scripts/build-gates.test.mjs
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build
npm run lighthouse
lsof -nP -iTCP:3100 -sTCP:LISTEN
openspec validate build-project-universe --strict --no-interactive
```

##### Task 10C2-O2：移除最后一份首屏字体预载

Task 10C2-R1 已通过独立 classifier RED/GREEN，production Playwright 扩展为 `12/12` 后通过；随后未挑样本的完整 LHCI run 暴露 O1 的稳定余量不足。三轮相互独立的首页 3-run 中位 LCP 分别约为 `2492.03ms`、`2488.85ms` 和 `2525.99ms`。第三轮首页三次为 `2526.40 / 2525.99 / 2497.26ms`，因此按门禁失败。三轮共同的 LCP 元素仍是首屏正文，且每次仍有唯一一份 High-priority、preloaded 的 Geist Variable 正文字体请求。

本切片由 fresh worker-codex 执行，只受控解冻：

- Modify: `src/app/layout.tsx`
- Modify: `src/styles/font-contract.test.ts`

先修改字体契约建立 RED，再把 body font 从 `preload: true` 改为 `preload: false`。三套固定 WOFF2 继续使用 `display: 'optional'`，所有 src、weight、variable、body attachment、中文/CJK fallback、许可证与哈希保持不变。设计取舍是：快网或缓存命中时仍可使用本地 Geist；受限网络首访则直接保持系统 fallback，不再由 68KiB 正文字体的完成时刻重置文本 LCP。不得删除字体、隐藏 LCP 文本、缩短文案、改字号/布局/3D 或改变 Lighthouse 门槛。

生产构建必须证明代表路由不再输出 `as="font"` preload；生成 CSS 仍包含三份 `url(...woff2)` 且全部 `font-display: optional`，Next 的 local metric fallback 保留，无远程字体。LHR 必须记录实际字体请求情况，但“零请求”不是脱离浏览器行为的硬编码契约；最终仍以未修改的 3×3 mobile median 门禁为准。

Task 10C2-O2 验证：

```bash
npm test -- --run src/styles/font-contract.test.ts
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build
npm run lighthouse
lsof -nP -iTCP:3100 -sTCP:LISTEN
node --test scripts/build-gates.test.mjs
npm run check:links
npm run check:budgets
npm run verify
openspec validate build-project-universe --strict --no-interactive
```

不得通过重复运行挑选通过样本；这一轮完整 3×3 若仍有任何中位数失败，立即停止并返回 DESIGN。

10C1、10C2 分别通过规格审查与代码质量审查后，Architecture Codex 才运行完整 Task 10 fresh verification，并将 Task 10A/10B/10C 的冻结证据交给独立 Task 10 集成 reviewer。只有最终 PASS 才更新 OpenSpec 11.1、11.2；11.3 由完整 `verify` 组成证据决定。9.5、11.4、11.5、11.6、11.7 保留给 Task 11 或部署授权后的阶段。

**建议提交点（仍仅在用户明确要求提交后执行）**

```bash
git add scripts tests/e2e/performance.spec.ts lighthouserc.json package.json playwright.config.ts
git commit -m "test: enforce portfolio quality gates"
```

## Task 11: Architecture Codex 专属 Review、OpenSpec 状态与部署边界

本任务只由 Architecture Codex 在 REVIEW/VERIFY 阶段执行，不属于任何 Implementation Codex 的 editable files。Implementation Codex 继续把 `.codex/` 视为禁止修改范围。

**Files（Architecture Codex only）:**

- Modify: `openspec/changes/build-project-universe/tasks.md`
- Modify: `.codex/session-state.md`
- Create: `.codex/session-state.archive/<timestamp>-build-project-universe.md`

**Step 1: 对照实现更新 tasks**

只把有测试/构建证据的条目标记为 `[x]`，不得因为页面“看起来完成”而勾选。

**Step 2: 准备独立 Review Codex 输入**

包含：

- Handoff Task Package。
- OpenSpec proposal/design/spec/tasks。
- Git baseline 与完整 diff。
- 预先存在的 dirty files。
- `npm run verify` 和 strict validation 输出。
- Graphify 查询或无图谱降级说明。

**Step 3: 消费 Review Decision**

只有 `PASS` 才进入最终 VERIFY；`FIX_REQUIRED` 返回对应实施任务，`DOWNGRADE` 返回 Architecture Codex 重新设计。

**Step 4: 最终验证**

Architecture Codex 从干净进程重新运行：

```bash
npm ci
npm run verify
openspec validate build-project-universe --strict --no-interactive
```

**Step 5: 保持部署未执行**

此计划结束于“可部署”。只有用户确认最终视觉、作者信息和正式域名后，才进入单独的 Vercel Preview/Production 任务。

部署前必须重新运行 `npm audit --omit=dev --json`，并检查稳定版 Next 是否已经携带 PostCSS 8.5.10+ 与 Sharp 0.35.0+。当前 Next 16.2.11 的传递依赖审计告警不影响本地实施切片，但不得带着未裁决的 high 告警进入 Preview/Production；不得通过降级 Next 9、默认切换 preview/canary 或未经生产构建与图片验证的强制 override 来规避告警。
