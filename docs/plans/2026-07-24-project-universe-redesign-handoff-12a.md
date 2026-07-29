# Handoff Task Package — A 版重构 Slice 12A

- ChangeId: `build-project-universe`
- TaskId: `12.1-12.4`
- AgentId: `/root/implement_redesign_12a`
- SliceId: `reference-first-english-and-design-system`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- SessionStatePath: `.codex/session-state.md`
- GitBaseline: `UNBORN_HEAD`
- Patch artifact / worktree: `DEGRADED_SHARED_WORKTREE_SINGLE_WORKER_SERIAL`；当前没有可用 HEAD 创建 worktree，本 slice 期间只允许一个 implementation worker 写入
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`；仓库不存在 `graphify-out/graph.json` 或 `graphify-out/GRAPH_REPORT.md`，影响分析来自源码、测试和两份已冻结 A 版原型

## 任务背景

用户否决首轮视觉实现，并明确选择方案 A。完整设计与实施计划：

- `docs/plans/2026-07-24-project-universe-reference-first-redesign.md`
- `docs/plans/2026-07-24-project-universe-reference-first-redesign-implementation.md`
- `openspec/changes/build-project-universe/`

冻结视觉参考：

- `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/project-universe-design.html`
  - SHA-256 `bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a`
- `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/rialo-detail-design.html`
  - SHA-256 `9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c`

本 slice 只完成 Tasks 12.1–12.4：全英文契约、事实安全翻译、A 版 token/字体契约和统一控件层级。不要提前实现 Instrument Stage、Arc/Rialo 舞台或详情页母版；这些属于后续 slice。

## Editable files / TaskScopeFiles

- `src/content/catalog.ts`
- `src/content/catalog.test.ts`
- `src/content/project-media-assets.test.ts`
- `src/content/english-surface.test.ts`（新建）
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/error.tsx`
- `src/app/(immersive)/page.tsx`
- `src/app/(immersive)/[ecosystem]/page.tsx`
- `src/app/(content)/about/page.tsx`
- `src/styles/tokens.css`
- `src/styles/design-contract.test.ts`
- `src/styles/font-contract.test.ts`
- `src/components/seo/json-ld.tsx`
- `src/components/seo/json-ld.test.tsx`
- `src/lib/metadata.ts`
- `src/lib/metadata.test.ts`
- `src/lib/smoke.test.ts`
- `src/components/shell/site-header.tsx`
- `src/components/shell/site-footer.tsx`
- `src/components/shell/skip-link.client.tsx`
- `src/components/ui/control-link.tsx`（新建）
- `src/components/ui/control-link.test.tsx`（新建）
- `src/components/ui/external-link.tsx`
- `src/components/ui/external-link.test.tsx`
- `src/components/project/project-card.tsx`
- `src/components/project/project-card.test.tsx`
- `src/components/project/project-case-study.tsx`
- `src/components/project/project-case-study.test.tsx`
- `src/components/project/core-loop.tsx`
- `src/components/project/evidence-section.tsx`
- `src/components/project/project-gallery.tsx`
- `src/components/project/stack-lanes.tsx`
- `src/components/project/project-navigator.tsx`
- `src/components/project/project-hero.tsx`
- `src/components/project/signature/flight-signature.tsx`
- `src/components/project/signature/ledger-signature.tsx`
- `src/components/project/signature/market-signature.tsx`
- `src/components/project/signature/probability-signature.tsx`
- `src/components/project/signature/project-signature.test.tsx`
- `src/components/project/project-media.ts`
- `src/components/project/signature/project-signature.tsx`
- `tests/e2e/routes.spec.ts`
- `tests/e2e/home.spec.ts`
- `tests/e2e/ecosystems.spec.ts`
- `tests/e2e/project-detail.spec.ts`
- `tests/e2e/keyboard.spec.ts`
- `tests/e2e/progressive-enhancement.spec.ts`
- `tests/e2e/responsive.spec.ts`
- `tests/e2e/seo-security.spec.ts`

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
- `src/components/scene/**`
- `src/components/rialo/**`
- `src/components/project/project-case-study.module.css`
- `src/components/project/signature/project-signature.module.css`
- `src/styles/universe-pages.module.css`
- 依赖、环境变量、Vercel、外部项目、端口 3000 和 Git commit

## Acceptance criteria

1. 先写并运行 RED：
   - catalog、metadata、JSON-LD、公开组件文案的 Han 字符门禁失败。
   - `html lang` / `inLanguage` 英文契约失败。
   - A 版 serif/mono/tracking/color/control 契约失败。
   - `ControlLink` 缺失测试失败。
2. GREEN 后：
   - 八条公开路由、404/error 的可见与隐藏用户文案为英文。
   - `html lang="en"`，JSON-LD `inLanguage: "en"`。
   - catalog 全部 statement、description、tagline、summary、coreLoop、evidence、gallery alt/caption、limits、SEO 为事实安全英文。
   - 不改变 slug、项目顺序、status、live URL、coreLoop 顺序、schema、canonical 或外链安全属性。
   - H1 展示栈改为 Georgia/Times 系；Geist 保留正文，Geist Mono 保留数据标签；不再使用 GeistPixel 作为主标题。
   - mono label 允许 `.08em–.13em` tracking；旧的全局零 tracking 契约移除。
   - 新增小型本地 `ControlLink`，只表达 `quiet | primary | secondary | stage` 视觉角色；不引入依赖。
   - ExternalLink 继续独占 HTTPS、`_blank`、`noopener noreferrer` 与英文外链提示。
   - Header/Footer/项目 CTA/About/404/error 控件开始复用统一 token；本 slice 不要求最终 A 版版面。
3. 所有既有语义行为、键盘行为、触控尺寸和安全测试继续通过。

## Out of scope

- 不创建 Instrument Stage。
- 不实现 Arc 三状态或重排 Rialo 五阶段。
- 不重写项目详情 CSS 母版。
- 不修改 Canvas、3D scene、quality、transition、performance collector、预算或 Lighthouse 阈值。
- 不生成最终视觉快照。
- 不部署、不提交。

## TDD / Validation

必须逐行为 RED → GREEN → REFACTOR，至少提供：

```bash
npm test -- --run src/content/english-surface.test.ts src/content/catalog.test.ts src/components/seo/json-ld.test.tsx src/lib/metadata.test.ts
npm test -- --run src/styles/design-contract.test.ts src/styles/font-contract.test.ts src/components/ui/control-link.test.tsx src/components/ui/external-link.test.tsx
npm test -- --run src/components/project/project-card.test.tsx src/components/project/project-case-study.test.tsx src/components/project/signature/project-signature.test.tsx
npm run verify
npm run build
npx playwright test tests/e2e/routes.spec.ts tests/e2e/home.spec.ts tests/e2e/ecosystems.spec.ts tests/e2e/project-detail.spec.ts tests/e2e/keyboard.spec.ts tests/e2e/progressive-enhancement.spec.ts tests/e2e/responsive.spec.ts tests/e2e/seo-security.spec.ts --config playwright.config.ts
```

浏览器命令只能使用配置中的 3100；沙箱监听失败时按工具策略申请授权。结束时 `lsof -nP -iTCP:3100 -sTCP:LISTEN` 必须无监听。

## Stop conditions

- 需要修改 allowlist 外文件。
- 翻译需要新增或猜测事实。
- 现有类型无法表达英文内容而需要 schema 变更。
- 必须改动 3D/runtime、构建配置、依赖或性能阈值。
- 参考 HTML hash 不匹配。
- RED 无法证明当前缺口，或既有测试与批准规范发生新冲突。
- 同一问题修复三次仍失败。

触发任一条件时停止并报告，不得自行扩大范围。

## PreExistingDirtyBaseline

- 仓库为 `UNBORN_HEAD`。
- `.gitignore` 已 staged，`main.py` staged 且 modified，`.agents/**` 为用户/脚手架资产。
- `docs/**`、`openspec/**`、`.codex/session-state.md` 为 Architecture 资产。
- 当前 Next.js 应用绝大多数文件在 Git 中显示 untracked；范围必须通过 handoff 前后 SHA-256 与精确 allowlist 判断，不能依赖 `git diff --name-only`。
- TaskScopeFiles 的规范化初始基线聚合 SHA-256 为 `26517f747ef8af0181e5a17e7ddc5e7836ca9f5df1293f5a3f75e33f103ce009`。原记录 `0c445df837fc7c5ebe93022ce8fc9ff3951b566e8579a099376c1d38a0b7e56f` 未绑定可复现命令，已由 Architecture 判定为记录错误；实现者在报告差异前没有编辑产品文件。第二次扩展发生在首个 RED→GREEN 后，因此最终初始聚合由 Architecture 保存的原始 digest 清单，加上 `src/lib/smoke.test.ts` 的原始 SHA-256 `52ec5317e454838e82be404bc75b2f594eb72c3701d602b14e1c8d483d9d7008` 与 `src/content/project-media-assets.test.ts` 的原始 SHA-256 `30519004ceac90dba379069fb5f1d2b9020b3ad340432038a51781b8789010f9` 按 Editable files 顺序重建。
- Architecture 批准一次最小范围扩展：将 `src/lib/smoke.test.ts` 加入 TaskScopeFiles，因为该测试硬编码旧的中文 Skip Link，若不更新会使 12.2 与 `npm run verify` 互相冲突。该扩展只允许同步英文 Skip Link 与布局字体契约断言，不允许修改其他 smoke 行为。
- Architecture 批准第二次最小范围扩展：将 `src/content/project-media-assets.test.ts` 加入 TaskScopeFiles，因为该测试硬编码 `project-media.ts` 的旧中文异常。只允许把该异常断言同步为英文；媒体文件、registry、provenance 与隐私审计断言不得改动。
- 精确复算命令如下；新建文件也以稳定的 `MISSING  <path>` 哨兵参与聚合：

```bash
awk '/^## Editable files/{capture=1; next} /^## Forbidden files/{capture=0} capture && /^- `/{line=$0; sub(/^- `/, "", line); sub(/`.*/, "", line); print line}' docs/plans/2026-07-24-project-universe-redesign-handoff-12a.md \
  | while IFS= read -r task_file; do
      if [ -f "$task_file" ]; then
        shasum -a 256 "$task_file"
      else
        printf 'MISSING  %s\n' "$task_file"
      fi
    done \
  | shasum -a 256
```

## GeneratedOrNoisyArtifacts

- `node_modules/**`
- `.next/**`
- `coverage/**`
- `test-results/**`
- `playwright-report/**`
- `.playwright-cli/**`
- `tsconfig.tsbuildinfo`
- `next-env.d.ts`

## Handback

输出：

- Changed files。
- 每个 RED 的命令、预期失败与实际失败。
- 每个 GREEN/回归命令与结果。
- 公开表面 Han 扫描结果。
- 需求覆盖矩阵。
- allowlist/forbidden/protected hash 证明。
- 未验证项、范围扩展请求和自审结论。

不要更新 OpenSpec checkbox、docs、session-state，不要 commit。
