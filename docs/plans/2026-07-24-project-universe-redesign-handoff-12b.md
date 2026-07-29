# Handoff Task Package — A 版重构 Slice 12B

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6`
- AgentId: `/root/implement_redesign_12b`
- SliceId: `reference-first-instrument-stage-and-case-shell`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- SessionStatePath: `.codex/session-state.md`
- GitBaseline: `UNBORN_HEAD`
- Patch artifact / worktree: `DEGRADED_SHARED_WORKTREE_SINGLE_WORKER_SERIAL`；当前没有 HEAD 可用于独立 worktree，本 slice 只允许一个 implementation worker 写产品文件
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`；仓库没有 `graphify-out/graph.json` 或 `graphify-out/GRAPH_REPORT.md`

## 上游 Gate

- 用户已明确选择 A 版。
- Slice 12A 已由 `gpt-5.6-sol + xhigh` worker 完成，并由独立 Review Codex `/root/review_redesign_12a` 判定 `PASS`。
- OpenSpec 12.1–12.4 已由 Architecture 勾选，strict validation 通过。
- 12A 精确 TaskScope 最终聚合 SHA-256：`73b2689fe8017798712bc50440577c97a14a968fcb6b16bf4f0bdba15ae0fdb9`。
- 当前公开表面为英文，`npm run verify` 为 25 files / 182 tests，build 为 14 pages，指定 Playwright 为 66/66；这些是 12B 必须保留的基线。

## 唯一视觉事实源

- `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/project-universe-design.html`
  - SHA-256 `bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a`
- `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/rialo-detail-design.html`
  - SHA-256 `9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c`

必须完整阅读：

- `docs/plans/2026-07-24-project-universe-reference-first-redesign.md`
- `docs/plans/2026-07-24-project-universe-reference-first-redesign-implementation.md`
- `openspec/changes/build-project-universe/`

## Editable files / TaskScopeFiles

- `src/components/stage/instrument-stage.tsx`（新建）
- `src/components/stage/instrument-stage.module.css`（新建）
- `src/components/stage/instrument-stage.test.tsx`（新建）
- `src/components/stage/home-instrument-stage.tsx`（新建）
- `src/components/stage/home-instrument-stage.test.tsx`（新建）
- `src/components/stage/arc-instrument-stage.client.tsx`（新建）
- `src/components/stage/arc-instrument-stage.test.tsx`（新建）
- `src/components/stage/rialo-instrument-stage.tsx`（新建）
- `src/components/stage/rialo-instrument-stage.test.tsx`（新建）
- `src/app/(immersive)/page.tsx`
- `src/app/(immersive)/[ecosystem]/page.tsx`
- `src/components/ecosystem/ecosystem-hero.tsx`
- `src/components/ecosystem/ecosystem-index.tsx`
- `src/styles/universe-pages.module.css`
- `src/components/rialo/rialo-reactive-loop.tsx`
- `src/components/rialo/rialo-reactive-loop.module.css`
- `src/components/rialo/rialo-reactive-loop.test.tsx`
- `src/components/scene/universe-shell.module.css`
- `src/components/scene/static-universe-fallback.tsx`
- `src/components/scene/static-universe-fallback.module.css`
- `src/components/project/project-case-study.tsx`
- `src/components/project/project-case-study.module.css`
- `src/components/project/project-case-study.test.tsx`
- `src/components/project/project-hero.tsx`
- `src/components/project/signature/project-signature.tsx`
- `src/components/project/signature/project-signature.module.css`
- `src/components/project/signature/project-signature.test.tsx`
- `src/components/project/signature/flight-signature.tsx`
- `src/components/project/signature/ledger-signature.tsx`
- `src/components/project/signature/market-signature.tsx`
- `src/components/project/signature/probability-signature.tsx`
- `src/components/project/core-loop.tsx`
- `src/components/project/evidence-section.tsx`
- `src/components/project/project-gallery.tsx`
- `src/components/project/stack-lanes.tsx`
- `src/components/project/project-navigator.tsx`
- `src/app/(content)/about/page.tsx`
- `tests/e2e/routes.spec.ts`
- `tests/e2e/home.spec.ts`
- `tests/e2e/ecosystems.spec.ts`
- `tests/e2e/project-detail.spec.ts`
- `tests/e2e/keyboard.spec.ts`
- `tests/e2e/progressive-enhancement.spec.ts`
- `tests/e2e/responsive.spec.ts`

## Forbidden files

- `.gitignore`
- `main.py`
- `AGENTS.md`
- `.agents/**`
- `.codex/**`
- `docs/**`
- `openspec/**`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `playwright.config.ts`
- `vitest.config.ts`
- `eslint.config.mjs`
- `scripts/**`
- `public/**`
- `src/assets/fonts/**`
- `src/content/**`
- `src/lib/**`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/styles/tokens.css`
- `src/styles/design-contract.test.ts`
- `src/styles/font-contract.test.ts`
- `src/components/ui/**`
- `src/components/seo/**`
- `src/components/shell/**`
- `src/components/project/project-card.tsx`
- `src/components/project/project-card.test.tsx`
- `src/components/project/project-media.ts`
- `src/components/scene/*.client.tsx`
- `src/components/scene/scenes/**`
- `src/components/scene/scene-*.ts`
- `src/components/scene/scene-*.tsx`
- `src/components/scene/quality.ts`
- `src/components/scene/runtime-scene-state.ts`
- `src/components/scene/transition-machine.ts`
- `tests/e2e/accessibility.spec.ts`
- `tests/e2e/seo-security.spec.ts`
- `tests/e2e/performance.spec.ts`
- `tests/e2e/visual-reference.spec.ts`
- `tests/e2e/visual-reference.spec.ts-snapshots/**`
- 依赖、环境变量、Vercel、外部项目、端口 3000、Git commit

明确例外：Editable files 中列出的 `src/content`、`src/lib`、scene、UI 或测试路径优先于目录级 Forbidden；当前 editable list 没有这类冲突。禁止通过重命名、复制或新建平行 runtime 绕过上述边界。

## Acceptance criteria

### A. 共享 Instrument Stage

1. 新建小型 `InstrumentStage` 结构 primitive，只负责舞台 frame、标题区、scene window、index/readout 区和底部提示；不能把 Home、Arc、Rialo 内容压成一个巨型条件组件。
2. `>560px` 使用接近 `1200:720` / `5:3` 的单一桌面舞台；`<=560px` 用同一语义 DOM 切换为精简移动布局，不渲染第二套重复且仅靠 CSS 隐藏的可访问内容。
3. 舞台使用细网格、2px/1px 机械线、局部核心辉光和克制表面；禁止恢复 backdrop blur、70px 阴影、圆角大卡或 SaaS dashboard 视觉。
4. Canvas/Static fallback 只作为舞台机械层；DOM 始终承载标题、项目链接、状态和按钮。

### B. 首页

1. 首屏可见 H1 为三行 `A UNIVERSE / OF THINGS / I’VE BUILT.`；站点名 `Project Universe` 仍保留在 header、metadata 与 JSON-LD，不改 SEO 契约。
2. 同一首屏舞台直接展示四个项目节点，每个节点具有项目名、简短能力标签、真实详情 `href` 与既有 `data-scene-target`。
3. Arc / Rialo 使用右侧 `01 / 02` 纵向生态索引；禁止用两个等权大生态卡作为首屏主结构。
4. 首屏后的完整目录可以保留，但必须降为安静索引轨，不得重新抢过舞台。
5. `tests/e2e/routes.spec.ts` 只允许同步 `/` 的可见 H1 期望和测试内非公开诊断文本；其他七条路由、404 与错误收集语义冻结。

### C. Arc

1. `/arc` 首屏是同一机器的三个状态：`01 RESEARCH`、`02 EXCHANGE`、`03 FORECAST`，分别映射 SIGNAL/LEDGER、HADRON、ArcPredict。
2. 三个 selector 是真实 `button`，具有 `data-control-role="stage"`、`aria-pressed`、44×44 最小目标；点击、Enter/Space 均更新 active 项目的标题、短主张、仪器 readout、详情链接和 scene target。
3. active 内容来自现有 catalog，不能复制或猜测项目事实；不能改 schema、slug、顺序或 live URL。
4. 首屏最多一个 primary CTA；其余 selector/索引/返回动作使用 stage、quiet 或 secondary 权重。

### D. Rialo

1. `/rialo` 的 Observe / Cover / Trigger / Settle / Explain 五阶段进入首屏主仪器，位于项目索引之前。
2. 保留现有 roving tabindex、箭头/Home/End、Enter/Space、`aria-pressed`、`aria-current`、readout 与 scene target 协议。
3. 雷达正常链统一使用 Rialo 绿；触发/警告才使用琥珀。不得改 coreLoop 顺序或文本事实。
4. 首屏最多一个 primary CTA；项目卡和长说明退到首屏之后。

### E. 项目详情与 About

1. 项目详情首屏为左侧项目定位/正文/唯一 `Launch live site` primary CTA，右侧签名仪器；移动端按阅读顺序折叠。
2. 保留一个 H1、真实外链、status/roles/tags、Context、Core Loop、Product Proof、Gallery、Stack、Limits 和 Project navigation 的语义与顺序。
3. 每个 section 使用扁平章节轨、分隔线、编号和留白；禁止每节再成为带背景、圆角、阴影的嵌套 card/panel。
4. 签名 SVG 保留，但不能再重复输出完整五阶段列表；完整步骤仍由 Core Loop 唯一呈现。
5. About 使用同一排版语法，继续明确 author/bio/contact 未确认，不新增 mailto、tel、履历或身份事实。
6. ExternalLink 安全属性、图片、alt/caption、lazy loading 和 sizes 契约全部保留。

### F. 保留行为

1. 八条公开路由、404、metadata、JSON-LD、sitemap、headers、四个 live URL、catalog、全英文门禁不变。
2. UniverseShell、CapabilityGate、Canvas identity、quality、resource cleanup、scene target parser/router 和三个场景实现不得修改。
3. JavaScript 关闭、reduced motion、saveData、WebGL2 不可用时仍有匹配当前路由的静态舞台和全部关键链接/文字。
4. 所有主要控件至少 44×44、focus ring 可见；页面无横向 overflow 或裁切。

## TDD / Validation

必须 RED → GREEN → REFACTOR。先新增结构/层级测试并运行失败，再写实现。

### RED

```bash
npm test -- --run \
  src/components/stage/instrument-stage.test.tsx \
  src/components/stage/home-instrument-stage.test.tsx \
  src/components/stage/arc-instrument-stage.test.tsx \
  src/components/stage/rialo-instrument-stage.test.tsx \
  src/components/rialo/rialo-reactive-loop.test.tsx \
  src/components/project/project-case-study.test.tsx \
  src/components/project/signature/project-signature.test.tsx
```

RED 必须分别证明：旧首页没有四项目同舞台、Arc 没有三状态、Rialo 不在首屏、详情是卡片套卡且签名重复步骤。

### GREEN / regression

```bash
npm test -- --run \
  src/components/stage/instrument-stage.test.tsx \
  src/components/stage/home-instrument-stage.test.tsx \
  src/components/stage/arc-instrument-stage.test.tsx \
  src/components/stage/rialo-instrument-stage.test.tsx \
  src/components/rialo/rialo-reactive-loop.test.tsx \
  src/components/project/project-case-study.test.tsx \
  src/components/project/signature/project-signature.test.tsx \
  src/components/scene/universe-shell.test.tsx
npm run verify
npm run build
npx playwright test \
  tests/e2e/routes.spec.ts \
  tests/e2e/home.spec.ts \
  tests/e2e/ecosystems.spec.ts \
  tests/e2e/project-detail.spec.ts \
  tests/e2e/keyboard.spec.ts \
  tests/e2e/progressive-enhancement.spec.ts \
  tests/e2e/responsive.spec.ts \
  tests/e2e/accessibility.spec.ts \
  tests/e2e/seo-security.spec.ts \
  --config playwright.config.ts
```

浏览器命令只能使用配置中的 `127.0.0.1:3100`；沙箱监听失败时按工具策略申请授权。结束时 3100 必须无监听，且不得启动或探测 3000。

## 视觉自审证据

在最终 handback 前，worker 必须用真实 Chromium 渲染并人工查看：

- 1440×1000：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- 390×844：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- reduced motion：`/`、`/arc`、`/rialo`

候选截图放入临时目录（不得创建正式 snapshot，也不得修改 Task12C 文件），逐页对照两份冻结 HTML，报告以下内容：

- 首页三行标题、四节点、右侧 01/02 索引是否属于一个舞台。
- Arc 三 selector 与 active readout 是否像同一观测仪，而不是三张项目卡。
- Rialo 五阶段是否为首屏主仪器。
- 详情是否为左文案/右签名，且没有大卡套小卡。
- 390px 是否为精简结构、无横向滚动、无重复可访问内容。

## Stop conditions

- 需要修改 allowlist 外文件。
- 需要改变 catalog/schema、项目事实、route、metadata、JSON-LD、live URL、外链安全或依赖。
- 需要修改 Canvas/quality/router/scene runtime 或场景几何才能完成布局。
- 参考 HTML hash 不匹配。
- 无法用真实语义 DOM 实现而准备嵌入原型 SVG/iframe。
- RED 无法证明缺口，或同一问题修复三次仍失败。
- 需要占用 3000、部署、提交或访问外部项目内容。

触发时立即停止并报告，不得自行扩大范围。

## PreExistingDirtyBaseline

- 仓库为 `UNBORN_HEAD`，不能依赖 `git diff --name-only` 识别本 slice。
- `.gitignore` 已 staged；`main.py` staged+modified；`.agents/**` 为用户/脚手架资产。
- docs、OpenSpec 与 session-state 是 Architecture 资产。
- TaskScopeFiles 规范化初始聚合 SHA-256：`c61b676c44d60cf6bb826f1d3028effc320424ca56283852e4b48c084cd9cfc7`。
- 规范复算命令；新建文件用稳定的 `MISSING  <path>` 哨兵参与聚合：

```bash
awk '/^## Editable files/{capture=1; next} /^## Forbidden files/{capture=0} capture && /^- `/{line=$0; sub(/^- `/, "", line); sub(/`.*/, "", line); print line}' docs/plans/2026-07-24-project-universe-redesign-handoff-12b.md \
  | while IFS= read -r task_file; do
      if [ -f "$task_file" ]; then
        shasum -a 256 "$task_file"
      else
        printf 'MISSING  %s\n' "$task_file"
      fi
    done \
  | shasum -a 256
```

受保护 SHA-1：

- `.gitignore` `613e0fce4c277f89e2b71560729e5f9ec7fb1029`
- `main.py` `5208159b5d005aa3948e987504fe0b9468de43f7`
- `AGENTS.md` `e7ce54099d2f4e547da9432b7ac6e7c8d4486161`
- `.agents/**` aggregate `4883e15249ea055bafb35cb37ef9c440db7e0991`

## GeneratedOrNoisyArtifacts

- `node_modules/**`
- `.next/**`
- `coverage/**`
- `test-results/**`
- `playwright-report/**`
- `.playwright-cli/**`
- `tsconfig.tsbuildinfo`
- `next-env.d.ts`
- 临时候选截图目录

## Handback

输出：

- Changed files。
- 每个 RED 的命令、预期失败与实际失败。
- 每个 GREEN/回归命令与结果。
- 视觉自审逐页结论与临时截图路径。
- 八路由/404 Han 扫描、语义/控件/触控/overflow 证据。
- allowlist/forbidden/protected/reference hash 证明。
- 需求覆盖矩阵、未验证项、范围扩展请求和自审结论。

不要更新 OpenSpec checkbox、docs、session-state，不要 commit，不要部署。
