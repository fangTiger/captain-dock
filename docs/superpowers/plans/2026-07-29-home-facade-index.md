# 首页门面：星场 + 索引条（零滚动）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首页从「一屏星空 + 溢出的文字 + 空白 + 页脚」改成一个不滚动的门面：保留现有 340 颗星的密集星场，底部加四列项目索引条，两者悬停双向联动。

**Architecture:** 首页 `main` 改为固定高的两行网格（星场区 `minmax(0,1fr)` + 索引条 `auto`）。索引条是服务端渲染的纯 `<a>` 列表，通过给每个链接挂 `data-scene-target="project:<slug>"` 复用现有的 `SceneTargetController` 通路驱动星场高亮——不新建联动机制。反向联动通过给星场的 `instancedMesh` 加 R3F 指针事件实现。首页不再渲染 `SiteFooter`。

**Tech Stack:** Next.js App Router（server components 优先）、CSS Modules、React Three Fiber（instancedMesh + 指针事件）、Vitest + @testing-library/react、Playwright + axe。

**设计依据：** `docs/superpowers/specs/2026-07-29-home-facade-index-design.md`

---

## 关键背景（实现者必读）

零上下文的实现者容易在这几处踩空，先说清楚：

1. **星场不在 facade 组件里。** `ConstellationFacade` 只渲染 DOM 层（manifesto、光标环、隐藏链接）。星空是 `(immersive)/layout.tsx` → `UniverseShell` → `UniverseCanvas` 里的 layout 级 canvas，`ConstellationField` 在其中。两者是叠在一起的独立层。

2. **联动通路已存在，不要新建。** `universe-shell.client.tsx` 已有 `[data-scene-target]` 的事件委托（`getSceneTargetFromEventTarget`），`scene-target-controller.client.tsx` 已有 `setPreviewTarget` / `clearPreviewTarget` 并区分 pointer / focus 两种 source，`scene-target.ts` 的 `PROJECT_TARGETS` 已列全 4 个 slug，序列化格式是 `project:<slug>`。索引条只需要挂属性。

3. **索引条用 `statement` 不用 `tagline`。** 见 `src/content/types.ts:63-66` 的注释：`statement` 是「星座节点与首页使用的一句话判断语」，`tagline` 是「详情页与项目卡片使用的描述性副标题」。

4. **4 个节点是一个 `instancedMesh`。** 见 `constellation-field.client.tsx:94`。R3F 的指针事件会带 `instanceId`，用它索引 `CONSTELLATION_NODES` 即可，不需要拆成 4 个 mesh。

5. **测试是全局 API。** vitest 配置了 globals，`describe` / `it` / `expect` / `vi` 都不需要 import。参考 `constellation-facade.test.tsx`。

## 文件结构

**新建：**

| 文件 | 职责 |
|---|---|
| `src/components/constellation/constellation-index.tsx` | 索引条，服务端组件，渲染 4 个带 `data-scene-target` 的 `<a>` |
| `src/components/constellation/constellation-index.module.css` | 索引条样式，含移动端 2×2 网格 |
| `src/components/constellation/constellation-index.test.tsx` | 索引条单元测试 |
| `src/components/shell/site-footer-slot.client.tsx` | 客户端 wrapper，首页不渲染 children |

**修改：**

| 文件 | 改动 |
|---|---|
| `src/app/(immersive)/page.tsx` | 接入索引条 |
| `src/app/layout.tsx:76` | `SiteFooter` 包进 `SiteFooterSlot` |
| `src/styles/universe-pages.module.css:8-19` | `.homePage` 改固定高网格、移除 `padding-block-end` |
| `src/components/constellation/constellation-facade.module.css` | `.door` 去掉 `flex-end`、删 `.semanticLinks`、manifesto 重新定位 |
| `src/components/constellation/constellation-facade.client.tsx` | 移除 `ConstellationSemanticLinks` 用法 |
| `src/components/constellation/constellation-links.tsx` | 删除 `ConstellationSemanticLinks` 导出，`ConstellationNoScriptLinks` 自带实现 |
| `src/components/constellation/constellation-field.client.tsx` | `NodeLayer` 加指针事件（hover / click） |
| `src/components/constellation/constellation-facade.test.tsx` | 调整与新方向冲突的断言 |
| `tests/e2e/progressive-enhancement.spec.ts:82,987` | 两处滚动依赖迁移到其他路由 |
| `openspec/changes/redesign-home-constellation/{proposal,tasks}.md` + spec delta | 同步变更 |

---

### Task 1: 索引条组件

**Files:**
- Create: `src/components/constellation/constellation-index.tsx`
- Create: `src/components/constellation/constellation-index.module.css`
- Test: `src/components/constellation/constellation-index.test.tsx`

- [ ] **Step 1: 写失败的测试**

创建 `src/components/constellation/constellation-index.test.tsx`：

```tsx
import { cleanup, render } from '@testing-library/react'

import { projects } from '../../content/catalog'
import { ConstellationIndex } from './constellation-index'

afterEach(() => {
  cleanup()
})

describe('ConstellationIndex', () => {
  it('renders one linked entry per project with a scene target', () => {
    const { container } = render(<ConstellationIndex projects={projects} />)
    const nav = container.querySelector('nav[aria-label="Project index"]')
    const entries = nav?.querySelectorAll('a') ?? []

    expect(nav).not.toBeNull()
    expect(entries).toHaveLength(4)

    for (const project of projects) {
      const entry = nav?.querySelector<HTMLAnchorElement>(
        `a[href="/${project.ecosystem}/${project.slug}"]`,
      )

      expect(entry).not.toBeNull()
      expect(entry).toHaveAttribute('data-scene-target', `project:${project.slug}`)
      expect(entry).toHaveAttribute('data-ecosystem', project.ecosystem)
    }
  })

  it('shows the statement, not the tagline', () => {
    const { container } = render(<ConstellationIndex projects={projects} />)

    for (const project of projects) {
      expect(container).toHaveTextContent(project.statement)
      expect(container).not.toHaveTextContent(project.tagline)
    }
  })

  it('labels each entry with its ecosystem and leading status', () => {
    const { container } = render(<ConstellationIndex projects={projects} />)

    for (const project of projects) {
      const entry = container.querySelector(
        `a[href="/${project.ecosystem}/${project.slug}"]`,
      )

      expect(entry).toHaveTextContent(project.ecosystem)
      expect(entry).toHaveTextContent(project.status[0])
    }
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm test -- --run src/components/constellation/constellation-index.test.tsx
```

预期：FAIL，报错 `Failed to resolve import "./constellation-index"`。

- [ ] **Step 3: 写实现**

创建 `src/components/constellation/constellation-index.tsx`：

```tsx
import type { Project } from '../../content/types'
import styles from './constellation-index.module.css'

type ConstellationIndexProps = Readonly<{
  projects: readonly Project[]
}>

/** 首页底部的作品索引条：星场负责氛围，这里负责可扫读的信息。 */
export function ConstellationIndex({ projects }: ConstellationIndexProps) {
  return (
    <nav aria-label="Project index" className={styles.index}>
      {projects.map((project) => (
        <a
          className={styles.entry}
          data-ecosystem={project.ecosystem}
          data-scene-target={`project:${project.slug}`}
          href={`/${project.ecosystem}/${project.slug}`}
          key={project.slug}
        >
          <span className={styles.name}>{project.name}</span>
          <span className={styles.statement}>{project.statement}</span>
          <span className={styles.meta}>
            {project.ecosystem} · {project.status[0]}
          </span>
        </a>
      ))}
    </nav>
  )
}
```

创建 `src/components/constellation/constellation-index.module.css`：

```css
.index {
  border-block-start: 1px solid rgba(127, 176, 255, 0.16);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  max-block-size: 22svh;
  position: relative;
  z-index: 2;
}

.entry {
  align-content: start;
  border-inline-end: 1px solid rgba(127, 176, 255, 0.1);
  color: inherit;
  display: grid;
  gap: 0.5rem;
  padding: clamp(0.85rem, 1.6vh, 1.15rem) clamp(0.9rem, 1.6vw, 1.25rem);
  text-decoration: none;
  transition: background-color 180ms ease-out;
}

.entry:last-child {
  border-inline-end: 0;
}

.entry:hover,
.entry:focus-visible {
  background-color: rgba(127, 176, 255, 0.08);
}

.entry[data-ecosystem="rialo"]:hover,
.entry[data-ecosystem="rialo"]:focus-visible {
  background-color: rgba(231, 169, 75, 0.08);
}

.name {
  color: #dceaff;
  font-family: var(--font-mono);
  font-size: clamp(0.72rem, 0.82vw, 0.86rem);
  font-weight: 600;
  letter-spacing: 0.05em;
}

.entry[data-ecosystem="rialo"] .name {
  color: #ffe6c8;
}

.statement {
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: rgba(220, 234, 255, 0.5);
  display: -webkit-box;
  font-size: clamp(0.68rem, 0.72vw, 0.78rem);
  line-height: 1.4;
  overflow: hidden;
}

.meta {
  color: #7fb0ff;
  font-family: var(--font-mono);
  font-size: clamp(0.6rem, 0.6vw, 0.68rem);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.entry[data-ecosystem="rialo"] .meta {
  color: #e7a94b;
}

/* 移动端：2×2 网格，statement 让位保住零滚动 */
@media (max-width: 42rem) {
  .index {
    grid-template-columns: repeat(2, 1fr);
    max-block-size: 28svh;
  }

  .entry:nth-child(2n) {
    border-inline-end: 0;
  }

  .entry:nth-child(-n + 2) {
    border-block-end: 1px solid rgba(127, 176, 255, 0.1);
  }

  .statement {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .entry {
    transition: none;
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
npm test -- --run src/components/constellation/constellation-index.test.tsx
```

预期：3 个用例全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add src/components/constellation/constellation-index.tsx src/components/constellation/constellation-index.module.css src/components/constellation/constellation-index.test.tsx
git commit -m "feat: 新增首页作品索引条组件"
```

---

### Task 2: 首页骨架改为固定高两行网格

**Files:**
- Modify: `src/app/(immersive)/page.tsx`
- Modify: `src/styles/universe-pages.module.css:8-19`
- Modify: `src/components/constellation/constellation-facade.module.css`

- [ ] **Step 1: 接入索引条**

把 `src/app/(immersive)/page.tsx` 整个替换为：

```tsx
import { ecosystems, projects } from '../../content/catalog'
import { ConstellationFacade } from '../../components/constellation/constellation-facade.client'
import { ConstellationIndex } from '../../components/constellation/constellation-index'
import { JsonLd, buildHomeJsonLd } from '../../components/seo/json-ld'
import { buildRouteMetadata } from '../../lib/metadata'
import styles from '../../styles/universe-pages.module.css'

export const metadata = buildRouteMetadata('/')

export default function HomePage() {
  return (
    <main className={styles.homePage} id="main-content">
      <JsonLd data={buildHomeJsonLd()} />
      <ConstellationFacade ecosystems={ecosystems} projects={projects} />
      <ConstellationIndex projects={projects} />
    </main>
  )
}
```

- [ ] **Step 2: 改首页容器为固定高网格**

在 `src/styles/universe-pages.module.css` 中，把第 8-11 行的 `.homePage` 规则：

```css
.homePage {
  gap: 0;
  min-block-size: calc(100svh - 5rem);
}
```

替换为：

```css
.homePage {
  /* 固定高而非 min-height：首页零滚动，星场区可压缩、索引条按内容 */
  block-size: calc(100svh - 5rem);
  gap: 0;
  grid-template-rows: minmax(0, 1fr) auto;
}
```

- [ ] **Step 3: 移除首页的底部内边距**

同文件第 13-19 行当前是：

```css
:global(#main-content).homePage,
:global(#main-content).ecosystemPage {
  isolation: isolate;
  max-width: calc(var(--stage-max-width) + var(--page-gutter) + var(--page-gutter));
  padding-block-end: clamp(20px, 2vw, 40px);
  position: relative;
}
```

拆成两条——`padding-block-end` 是首页 40px 溢出的直接来源，生态页仍需保留：

```css
:global(#main-content).homePage,
:global(#main-content).ecosystemPage {
  isolation: isolate;
  max-width: calc(var(--stage-max-width) + var(--page-gutter) + var(--page-gutter));
  position: relative;
}

:global(#main-content).ecosystemPage {
  padding-block-end: clamp(20px, 2vw, 40px);
}
```

- [ ] **Step 4: manifesto 不再贴盒子底边**

在 `src/components/constellation/constellation-facade.module.css` 中，把 `.facade` 的 `min-block-size` 去掉（高度现在由父网格给），并改 `.door` 的对齐方式。

`.facade` 规则改为：

```css
.facade {
  color: var(--color-deep-space-text);
  isolation: isolate;
  min-block-size: 0;
  overflow: clip;
  position: relative;
}
```

`.door` 规则改为：

```css
.door {
  block-size: 100%;
  display: flex;
  padding: 0 max(1rem, var(--page-gutter));
  pointer-events: none;
  position: relative;
  z-index: 1;
}

.statement {
  align-self: end;
  display: grid;
  gap: 0.9rem;
  margin-block-end: clamp(2rem, 6vh, 4rem);
  max-width: 34ch;
}
```

注意 `.statement` 原有的 `display: grid` / `gap` / `max-width` 保留，只是新增 `align-self` 与 `margin-block-end`，并从 `.door` 上移除 `align-items: flex-end`——那正是 manifesto 骑在折叠线上的原因。

- [ ] **Step 5: 目视确认**

```bash
npm run dev
```

用浏览器打开 `http://localhost:3000`，确认：星空仍在且密度不变、manifesto 完整可见不被裁切、索引条四列在底部、**页面没有垂直滚动条**。

- [ ] **Step 6: 提交**

```bash
git add src/app/\(immersive\)/page.tsx src/styles/universe-pages.module.css src/components/constellation/constellation-facade.module.css
git commit -m "feat: 首页改为固定高两行网格并接入索引条"
```

---

### Task 3: 首页不渲染页脚

**Files:**
- Create: `src/components/shell/site-footer-slot.client.tsx`
- Modify: `src/app/layout.tsx:76`

- [ ] **Step 1: 写 slot 组件**

`RootLayout` 是服务端组件、拿不到 pathname，所以用一个只做判断的客户端 wrapper。`SiteFooter` 通过 children 传入，因此它本身仍是服务端组件，不会被迫客户端化。

创建 `src/components/shell/site-footer-slot.client.tsx`：

```tsx
'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

type SiteFooterSlotProps = Readonly<{
  children: ReactNode
}>

/** 首页是零滚动门面，页脚在此让位；其余路由照常渲染。 */
export function SiteFooterSlot({ children }: SiteFooterSlotProps) {
  const pathname = usePathname()

  if (pathname === '/') {
    return null
  }

  return <>{children}</>
}
```

- [ ] **Step 2: 在 layout 中包裹页脚**

在 `src/app/layout.tsx` 的 import 区（第 6 行 `SiteFooter` 之后）加入：

```tsx
import { SiteFooterSlot } from '../components/shell/site-footer-slot.client'
```

把第 76 行的 `<SiteFooter />` 替换为：

```tsx
        <SiteFooterSlot>
          <SiteFooter />
        </SiteFooterSlot>
```

- [ ] **Step 3: 确认首页无页脚、其他页有**

```bash
npm run dev
```

打开 `http://localhost:3000`：无页脚、无滚动条。
打开 `http://localhost:3000/about`：页脚正常显示。
打开 `http://localhost:3000/arc`：页脚正常显示。

- [ ] **Step 4: 提交**

```bash
git add src/components/shell/site-footer-slot.client.tsx src/app/layout.tsx
git commit -m "feat: 首页不渲染站点页脚"
```

---

### Task 4: 清理 sr-only 备用链接

索引条本身就是可见的语义化导航，`.semanticLinks` 那组 `clip-path: inset(50%)` 的隐藏链接和 `<noscript>` 块都失去了存在理由——无 JS 时索引条是 SSR 的纯 `<a>`，照常可用。

**Files:**
- Modify: `src/components/constellation/constellation-facade.test.tsx:57-82`
- Modify: `src/components/constellation/constellation-facade.client.tsx`
- Modify: `src/components/constellation/constellation-links.tsx`
- Modify: `src/components/constellation/constellation-facade.module.css`

- [ ] **Step 1: 先改测试**

这是重构现有行为，所以先让测试表达新契约。把 `constellation-facade.test.tsx` 第 57-82 行整个用例替换为：

```tsx
  it('exposes four project hrefs through the server-rendered index', () => {
    const { container } = render(<HomePage />)
    const index = container.querySelector('nav[aria-label="Project index"]')
    const markup = renderToStaticMarkup(<HomePage />)

    expect(index).not.toBeNull()
    expect(index?.querySelectorAll('a')).toHaveLength(4)
    expect(
      container.querySelector(
        'nav[aria-label="Constellation project and ecosystem links"]',
      ),
    ).toBeNull()
    expect(markup).not.toContain('<noscript>')

    for (const project of projects) {
      const href = `/${project.ecosystem}/${project.slug}`

      expect(index?.querySelector(`a[href="${href}"]`)).not.toBeNull()
      expect(markup).toContain(`href="${href}"`)
    }
  })
```

同时删除文件顶部 `import { ecosystems, projects } from '../../content/catalog'` 中不再使用的 `ecosystems`，改为：

```tsx
import { projects } from '../../content/catalog'
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm test -- --run src/components/constellation/constellation-facade.test.tsx
```

预期：FAIL，`nav[aria-label="Constellation project and ecosystem links"]` 仍存在、markup 仍含 `<noscript>`。

- [ ] **Step 3: 从 facade 中移除两组备用链接**

在 `constellation-facade.client.tsx` 中：

删除 import：

```tsx
import {
  ConstellationNoScriptLinks,
  ConstellationSemanticLinks,
} from './constellation-links'
```

删除 JSX 中这一整段（在 `.door` 之后、光标 div 之前）：

```tsx
      <div className={styles.semanticLinks}>
        <ConstellationSemanticLinks
          ecosystems={ecosystems}
          projects={projects}
        />
      </div>
      <div className={styles.noScriptLinks}>
        <ConstellationNoScriptLinks
          ecosystems={ecosystems}
          projects={projects}
        />
      </div>
```

此时 `ecosystems` 与 `projects` 两个 prop 在组件内只剩 `.meta` 那行计数用到，保持不变。

- [ ] **Step 4: 删除链接组件文件**

```bash
git rm src/components/constellation/constellation-links.tsx src/components/constellation/constellation-links.test.tsx
```

- [ ] **Step 5: 删除对应样式**

在 `constellation-facade.module.css` 中删除这些规则块：`.semanticLinks`、`.semanticLinks:focus-within`、`.semanticLinks nav, .noScriptLinks nav`、`.semanticLinks p, .noScriptLinks p`、`.semanticLinks a, .noScriptLinks a`、`.noScriptLinks`。

- [ ] **Step 6: 跑测试确认通过**

```bash
npm test -- --run src/components/constellation/
```

预期：全部 PASS。

- [ ] **Step 7: 提交**

```bash
git add -A src/components/constellation/
git commit -m "refactor: 索引条取代 sr-only 与 noscript 备用链接"
```

---

### Task 5: 星场节点的 DOM 热区层

**架构约束（务必遵守）：** canvas 是刻意的零交互装饰层，三重锁不许动——`universe-canvas.client.tsx:912` 的 `events={createDisabledCanvasEvents}`、第 905 行外层容器的 `pointerEvents: 'none'`、第 909 行 Canvas 的 `aria-hidden="true"`。热区用 drei 的 `<Html>` 渲染成真 DOM，portal 到 canvas 的父容器（在 `<Canvas>` 元素之外，因此不继承 `aria-hidden`），用 `wrapperClass` 把 `pointer-events` 改回 `auto`。R3F 事件系统保持禁用。

**Files:**
- Modify: `src/components/constellation/constellation-field.client.tsx`
- Create: `src/components/constellation/constellation-hotspots.module.css`

- [ ] **Step 1: 写热区样式**

创建 `src/components/constellation/constellation-hotspots.module.css`：

```css
/* 父容器是 pointer-events:none 的装饰层，这里把交互能力要回来 */
.hotspotWrapper {
  pointer-events: auto;
}

.hotspot {
  align-items: center;
  block-size: 2.75rem;
  color: inherit;
  display: flex;
  inline-size: 2.75rem;
  justify-content: center;
  position: relative;
  text-decoration: none;
  transform: translate(-50%, -50%);
}

.label {
  background: rgba(5, 6, 10, 0.72);
  border: 1px solid rgba(127, 176, 255, 0.28);
  color: #dceaff;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  inset-inline-start: 100%;
  letter-spacing: 0.06em;
  opacity: 0;
  padding: 0.3rem 0.5rem;
  pointer-events: none;
  position: absolute;
  transition: opacity 160ms ease-out;
  white-space: nowrap;
}

.hotspot[data-ecosystem="rialo"] .label {
  border-color: rgba(231, 169, 75, 0.28);
  color: #ffe6c8;
}

.hotspot:hover .label,
.hotspot:focus-visible .label {
  opacity: 1;
}

/* 触屏没有悬停态：不显示标签，单击直接进详情 */
@media (pointer: coarse) {
  .label {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .label {
    transition: none;
  }
}
```

- [ ] **Step 2: 在星场中渲染热区**

在 `constellation-field.client.tsx` 顶部加入 import：

```tsx
import { Html } from '@react-three/drei'

import { projects } from '../../content/catalog'
import hotspotStyles from './constellation-hotspots.module.css'
```

在 `ConstellationField` 的 `return (<group ...>` 内、`</group>` 之前，加入热区层：

```tsx
      {CONSTELLATION_NODES.map((node) => {
        const project = projects.find((entry) => entry.slug === node.project)

        if (!project) {
          return null
        }

        return (
          <Html
            center
            key={node.project}
            position={node.position}
            wrapperClass={hotspotStyles.hotspotWrapper}
            zIndexRange={[10, 0]}
          >
            <a
              className={hotspotStyles.hotspot}
              data-ecosystem={project.ecosystem}
              data-scene-target={`project:${project.slug}`}
              href={`/${project.ecosystem}/${project.slug}`}
              tabIndex={-1}
            >
              <span className={hotspotStyles.label}>{project.name}</span>
            </a>
          </Html>
        )
      })}
```

两个要点：
- `tabIndex={-1}` 是刻意的。焦点统一由索引条承担，热区不进 Tab 顺序，避免同一导航目标出现两个 tab stop——这与现有 e2e 断言「canvas 不进 tab 顺序」一致。
- `data-scene-target` 让热区复用 `UniverseShell` 已有的事件委托，悬停热区同样会驱动星场自身高亮。

- [ ] **Step 3: 目视确认**

```bash
npm run dev
```

打开 `http://localhost:3000`：鼠标移到 4 颗亮星上应浮出项目名并出现手型光标，点击进入对应详情页。移到别处不应有任何热区反应。

- [ ] **Step 4: 确认没有回归 canvas 交互契约**

```bash
npx playwright test tests/e2e/progressive-enhancement.spec.ts -g "canvas stays out of tab order"
```

预期：PASS。若失败说明热区意外进入了 Tab 顺序，检查 `tabIndex={-1}`。

- [ ] **Step 5: 确认 drei 引入没有撑破体积预算**

drei 此前在本项目中从未被使用，这是首次引入，需确认打包体积。

```bash
npm run build && npm run check:budgets
```

预期：PASS。若超预算，把 import 改为深路径 `import { Html } from '@react-three/drei/web/Html'` 后重跑。

- [ ] **Step 6: 提交**

```bash
git add src/components/constellation/constellation-field.client.tsx src/components/constellation/constellation-hotspots.module.css
git commit -m "feat: 星场节点新增 DOM 热区层，可悬停可点击"
```

---

### Task 6: 星场悬停反向高亮索引条

Task 5 完成后联动还是单向的：索引条 → 星场已通，星场 → 索引条未通。原因是索引条在 page 的 React 树里，热区在 canvas 内部，两者不共享 context。用 DOM 属性把状态桥接过去。

**Files:**
- Modify: `src/components/scene/universe-shell.client.tsx`
- Modify: `src/components/constellation/constellation-index.module.css`
- Test: `src/components/constellation/constellation-index.test.tsx`

- [ ] **Step 1: 在 shell 根元素上广播当前预览目标**

`UniverseShell` 已经在做 `[data-scene-target]` 的事件委托。在它设置 preview target 的地方，同步把值写到 shell 根元素的 `data-active-scene-target` 属性上；清除 preview 时移除该属性。

具体做法：找到 shell 中调用 `setPreviewTarget` 与 `clearPreviewTarget` 的事件处理函数（搜索 `getSceneTargetFromEventTarget` 的调用点），在设置时加：

```tsx
      root.dataset.activeSceneTarget = marker
```

在清除时加：

```tsx
      delete root.dataset.activeSceneTarget
```

其中 `root` 是该处已有的 shell 根元素引用，`marker` 是已解析出的 scene target 字符串。

- [ ] **Step 2: 索引条按该属性高亮**

在 `constellation-index.module.css` 末尾追加。用属性选择器而非 CSS Modules 类名，因为匹配的是 shell 根元素上的属性：

```css
/* 星场热区悬停时，反向点亮索引条对应列 */
:global([data-active-scene-target="project:signal-ledger"])
  .entry[data-scene-target="project:signal-ledger"],
:global([data-active-scene-target="project:hadron"])
  .entry[data-scene-target="project:hadron"],
:global([data-active-scene-target="project:arcpredict"])
  .entry[data-scene-target="project:arcpredict"] {
  background-color: rgba(127, 176, 255, 0.08);
}

:global([data-active-scene-target="project:rialo-captain"])
  .entry[data-scene-target="project:rialo-captain"] {
  background-color: rgba(231, 169, 75, 0.08);
}
```

- [ ] **Step 3: 手动验证双向**

```bash
npm run dev
```

打开 `http://localhost:3000`：
- 鼠标移到底部索引条某列 → 星场对应节点变亮（Task 1 已有的方向）
- 鼠标移到星场某颗亮星 → 底部索引条对应列背景点亮（本任务新增的方向）

- [ ] **Step 4: 提交**

```bash
git add src/components/scene/universe-shell.client.tsx src/components/constellation/constellation-index.module.css
git commit -m "feat: 星场悬停反向高亮索引条"
```

---

### Task 7: 重写首页 e2e（含存量红用例）

**基线警告：** 动手前先认清——e2e 现在就是红的，不是本次改动弄红的。首页实际 HTML 里 `data-instrument-stage` 出现 0 次、`Project reel` 0 次，而 `home.spec.ts` 仍在断言它们存在。这批用例属于更早的 instrument-stage 首页，在 `redesign-home-constellation` 第 1-4 章改掉首页结构时没有跟着更新（这也是 `tasks.md` 第 6 章全空的原因）。单元测试则是全绿的（418 个）。

本任务一次性把首页相关 e2e 迁到新结构，同时补上零滚动等新断言。

**Files:**
- Modify: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/progressive-enhancement.spec.ts:82,1232,1292,987`

- [ ] **Step 1: 清理 home.spec.ts 中失效的旧用例**

删除这些针对 instrument stage / Project Reel 的用例（它们描述的首页形态已不存在）：
- `home renders one committed Project Reel without duplicate directory sections`（第 202 行）
- `home preview changes visual mass, horizon, and accent without committing semantics`（第 243 行）
- `home pointer and keyboard commits synchronize the complete Project Reel state`（第 361 行）
- `home visible first-screen copy keeps one project judgment and stays below structured budgets`（第 386 行）
- `home Project Reel keeps four 44px selectors and one active statement at mobile and desktop widths`（第 471 行）

保留并按需调整：`home has no horizontal overflow at mobile and desktop widths`、`home keeps the static index readable without JavaScript`、`home exposes skip link, navigation, ecosystem entries, project CTAs, and about by keyboard`、`about keeps unknown author details explicit and links back to the index`。

- [ ] **Step 2: 新增零滚动用例**

追加到 `tests/e2e/home.spec.ts`：

```ts
test('home fits one screen with no vertical scroll at desktop and mobile sizes', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 375, height: 900 },
    { width: 375, height: 667 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')

    const overflow = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }))

    expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.innerHeight + 1)
    await expect(page.locator('footer.site-footer')).toHaveCount(0)
  }
})

test('home index lists four projects and links to their case files', async ({ page }) => {
  await page.goto('/')

  const index = page.locator('nav[aria-label="Project index"]')
  await expect(index.locator('a')).toHaveCount(projects.length)

  for (const project of projects) {
    const entry = index.locator(`a[href="/${project.ecosystem}/${project.slug}"]`)

    await expect(entry).toHaveCount(1)
    await expect(entry).toContainText(exactProjectStatements[project.slug])
  }
})

test('home keeps the project index usable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto(`${baseURL}/`)

  const index = page.locator('nav[aria-label="Project index"]')
  await expect(index.locator('a')).toHaveCount(projects.length)

  await context.close()
})
```

`exactProjectStatements` 是 `home.spec.ts` 顶部已有的常量，直接复用。

- [ ] **Step 3: 迁移两处依赖首页滚动的用例**

首页既不滚动也没有 footer，这两处必须换路由。`/arc` 仍是 immersive 场景（`scene-route.ts` 映射为 `'arc'`）、仍会滚动、仍有 footer。

在 `progressive-enhancement.spec.ts` 第 1232 与 1292 行，把：

```ts
  await page.goto('/')
```

改为：

```ts
  await page.goto('/arc')
```

第 1292 行那个用例还要把：

```ts
  await waitForPublicSettledDemand(page, 'home')
```

改为：

```ts
  await waitForPublicSettledDemand(page, 'arc')
```

第 987 行的用例（`wheel scroll remains DOM-native`）把 `await page.goto('/', ...)` 改为 `await page.goto('/arc', ...)`，并把 `[data-static-scene="home"]` 改为 `[data-static-scene="arc"]`。该用例中「canvas 不进 tab 顺序」的断言与新设计一致，保持不变。

- [ ] **Step 4: 跑首页与渐进增强 e2e**

```bash
npx playwright test tests/e2e/home.spec.ts tests/e2e/progressive-enhancement.spec.ts --reporter=line
```

预期：全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add tests/e2e/home.spec.ts tests/e2e/progressive-enhancement.spec.ts
git commit -m "test: 首页 e2e 迁移到星场+索引条结构并补零滚动断言"
```

---

### Task 8: 扫清其余 e2e 中的首页残留

**Files:**
- Modify: `tests/e2e/{cinematic-motion,performance,responsive,visual-reference,keyboard}.spec.ts`（按实际失败情况）

- [ ] **Step 1: 跑全量 e2e 看还剩什么**

```bash
npx playwright test --reporter=line 2>&1 | tail -40
```

- [ ] **Step 2: 逐个判定**

对每个失败用例，判断它引用的 instrument stage 是**首页的**还是**生态页的**：
- 生态页（`goto('/arc')` / `goto('/rialo')`）的引用是合法的——原 proposal 明确「本期不改动生态页的既有造型」，不要动。
- 首页（`goto('/')`）的引用已失效，改写为星场 + 索引条结构，或在确属旧形态专有断言时删除。

- [ ] **Step 3: 跑到全绿后提交**

```bash
npx playwright test --reporter=line
git add tests/e2e/
git commit -m "test: 清理其余 e2e 中的旧首页结构引用"
```

---

### Task 9: 同步 OpenSpec

**Files:**
- Modify: `openspec/changes/redesign-home-constellation/proposal.md`
- Modify: `openspec/changes/redesign-home-constellation/tasks.md`
- Modify: `openspec/changes/redesign-home-constellation/specs/*/spec.md`

- [ ] **Step 1: 改 proposal.md**

第 8 行删除「**门面阶段不显示作品名**」这一表述；第 10 行整条「新增"下滑进入"转场」删除；第 11 行改写为首屏即导航 + 索引条双向联动。在 What Changes 中补充：首页不渲染 footer、移除 sr-only 与 noscript 备用链接。

- [ ] **Step 2: 改 tasks.md 第 5 章**

按设计文档的处置表重写：删除 5.1、5.4；改写 5.2、5.3；保留 5.5。补充索引条、布局修复、footer 让位、sr-only 清理、热区层、反向高亮六项新任务，并把已完成项标 `[x]`。

- [ ] **Step 3: 更新 spec delta**

`progressive-visual-experience`：删除「下滑飞入转场」相关需求，新增「首屏零滚动」与「索引条降级为主导航路径」。
`project-universe-navigation`：进入路径从「门面 → 下滑 → 星座导航 → 详情」改为「首屏星场 + 索引条 → 详情」。

- [ ] **Step 4: 校验并提交**

```bash
openspec validate redesign-home-constellation --strict
git add openspec/
git commit -m "docs: 同步 OpenSpec 到首屏即导航方案"
```

---

### Task 10: 全量验证

- [ ] **Step 1: 单元 + lint + 类型**

```bash
npm run verify
```

预期：PASS。基线是 36 文件 / 418 用例，本次应在此基础上有净增。

- [ ] **Step 2: e2e 全量**

```bash
npm run test:e2e
```

- [ ] **Step 3: 体积与性能预算**

```bash
npm run build && npm run check:budgets
```

重点关注 drei 首次引入带来的体积变化。

- [ ] **Step 4: Lighthouse**

```bash
npm run lighthouse
```

预期：可访问性与性能达标。

- [ ] **Step 5: 收尾提交**

```bash
git add -A
git commit -m "chore: 首页门面重设计收尾验证"
```

---

## 自检记录

- **规范覆盖：** 设计文档各节均有对应任务——页面骨架 → Task 2；索引条（含 statement、移动端 2×2）→ Task 1；页脚让位 → Task 3；sr-only 清理 → Task 4；节点可点 → Task 5；双向联动 → Task 1 + Task 6；触屏行为 → Task 5 的 CSS；测试迁移 → Task 7；OpenSpec → Task 9。
- **与设计文档的偏差：** 设计文档写「星场加 raycasting 拾取」，实现改为 drei `<Html>` 热区层。原因是 canvas 有三重零交互锁（`events` 禁用、`pointerEvents:none`、`aria-hidden`），拆锁会波及所有 immersive 路由。热区层保住了同样的体验且不动架构契约。
- **新发现的存量问题：** e2e 基线已红（8 文件 85 处引用旧 instrument stage 结构），与本次改动无关，在 Task 7-8 中一并处理。
