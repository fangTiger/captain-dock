# Project Universe Borderless Cinematic Canvas — Handoff Task Package 13

## Gate 1

- ChangeId: `build-project-universe`
- TaskId: `13.1–13.5`
- AgentId: `/root/implement_borderless_13`
- SliceId: `borderless-cinematic-canvas-css-first`
- Executor: GPT-5.6 Sol Implementation worker，`xhigh`
- IntegrationOwner: Architecture Codex `/root`
- SessionStatePath: `.codex/session-state.md`
- GitBaseline: `UNBORN_HEAD`
- Patch artifact / worktree: `DEGRADED_SHARED_WORKTREE_SINGLE_WORKER_SERIAL`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`；仓库不存在 `graphify-out/graph.json` 或 `GRAPH_REPORT.md`，以 OpenSpec、A 版 12C evidence、六张视觉基线、相关源码和测试替代
- Security boundary matrix: 不涉及认证、权限、密钥、数据写入或外部网关；必须保持既有外链安全、CSP/headers、路由与全英文门禁

## 批准输入

- `AGENTS.md`
- `.codex/session-state.md`
- `openspec/changes/build-project-universe/{proposal.md,design.md,tasks.md,specs/**}`
- `docs/plans/2026-07-25-project-universe-borderless-cinematic-canvas.md`
- `docs/plans/2026-07-25-project-universe-borderless-cinematic-canvas-implementation.md`
- `docs/plans/2026-07-24-project-universe-redesign-integration-evidence-12c.md`
- 当前六张 `tests/e2e/visual-reference.spec.ts-snapshots/*.png`

## Editable files / TaskScopeFiles

1. `src/styles/design-contract.test.ts`
2. `src/components/stage/instrument-stage.test.tsx`
3. `src/components/stage/home-instrument-stage.test.tsx`
4. `src/components/stage/arc-instrument-stage.test.tsx`
5. `src/components/stage/rialo-instrument-stage.test.tsx`
6. `src/components/rialo/rialo-reactive-loop.test.tsx`
7. `src/components/project/project-case-study.test.tsx`
8. `src/components/project/signature/project-signature.test.tsx`
9. `src/styles/tokens.css`
10. `src/styles/motion.css`
11. `src/app/globals.css`
12. `src/styles/universe-pages.module.css`
13. `src/components/stage/instrument-stage.module.css`
14. `src/components/stage/arc-instrument-stage.client.tsx`
15. `src/components/scene/universe-shell.module.css`
16. `src/components/rialo/rialo-reactive-loop.module.css`
17. `src/components/project/project-case-study.module.css`
18. `src/components/project/signature/project-signature.module.css`
19. `tests/e2e/progressive-enhancement.spec.ts`
20. `tests/e2e/responsive.spec.ts`
21. `tests/e2e/visual-reference.spec.ts`
22. `tests/e2e/visual-reference.spec.ts-snapshots/arc-1440-chromium-darwin.png`
23. `tests/e2e/visual-reference.spec.ts-snapshots/arc-390-chromium-darwin.png`
24. `tests/e2e/visual-reference.spec.ts-snapshots/home-1440-chromium-darwin.png`
25. `tests/e2e/visual-reference.spec.ts-snapshots/home-390-chromium-darwin.png`
26. `tests/e2e/visual-reference.spec.ts-snapshots/rialo-1440-chromium-darwin.png`
27. `tests/e2e/visual-reference.spec.ts-snapshots/signal-ledger-1440-chromium-darwin.png`

Handoff 初始 27 文件聚合 SHA-256：

`75fdf57068e7477060b9b5d4f27009dc542a84862f0443feef95ef95f807e3ef`

逐文件初始 SHA-256 以 Architecture 于 2026-07-25 10:33 Asia/Shanghai 的冻结输出为准；六张图片和 12C evidence 中的历史 hash 已交叉一致。

## Forbidden files

- 除上述 27 个路径外的全部文件
- `.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`
- `.codex/**`、`openspec/**`、`docs/**`
- `package.json`、`package-lock.json`、Next/TypeScript/Vitest/Playwright/Lighthouse/ESLint 配置
- `src/content/**`、所有公开 route page/layout、metadata、JSON-LD、sitemap、robots、headers
- `src/components/scene/**/*.tsx` 与 scene runtime/state/quality/transition 逻辑，但 `universe-shell.module.css` 除外
- 任何新依赖、Git commit、Vercel 操作、3100 之外端口

## Acceptance criteria

1. 首页、Arc、Rialo 的 Instrument Stage 不再具有闭合外框、内缩完整矩形或不透明面板边界；背景、Static fallback 与 Canvas 视觉连续。
2. 首页四项目、Arc selector、Rialo 五阶段保留真实 DOM、链接/按钮、名称、编号、状态和 scene-target；常态使用开放节点/基线，hover 与 focus 等价。
3. Arc 与 Rialo readout 使用单侧强调轨和数据基线；唯一主要 CTA 的实体边界保留。
4. 项目详情签名删除外层强框与 diagram 重复框，保留内部 SVG 轴线、网格、信号、标签、项目色和唯一主要 CTA。
5. 首屏入场不超过 800ms；环境微动低频且同屏最多一至两个明显运动源；交互反馈约 180–280ms。
6. Canvas 继续按需渲染，不修改 runtime/quality/transition 生命周期，不因环境微动常驻 60fps。
7. `prefers-reduced-motion`、saveData、Low/Static、WebGL unavailable 关闭持续循环和非必要过渡，并保留完整终态。
8. 320–1920px 无水平滚动、裁切、内容/CTA/仪器碰撞；`≤560px` 无贯穿首屏左右竖框。
9. 八条路由、四项目顺序、live URL、全英文公开表面、SEO、JSON-LD、外链安全和既有性能预算不变。
10. 六张 Static 视觉候选必须由 Architecture 查看原图后才能接受。

## Out-of-scope

- 新页面、内容翻译或 catalog/schema 变化
- 新的 Canvas/Three 架构、GLB、shader 系统、常驻动画循环或状态管理
- CMS、数据库、账号、分析、监控
- 作者身份、履历、联系方式
- 正式域名、Vercel Preview/Production、Git commit

## TDD / Validation

先执行计划 Task 1 的 focused Vitest，并提供正确 RED；不得先修改生产 CSS/TSX。每个 slice GREEN 后运行对应 focused tests。

最终 worker 验证：

```bash
npm run verify
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build
npm run test:build-gates
npm run check:links
npm run check:budgets
npm run test:e2e
openspec validate build-project-universe --strict --no-interactive
```

浏览器测试由固定 `playwright.config.ts` 使用 `127.0.0.1:3100`。需要 production server 时，只能在 3100 启动，并在交回前释放。不得探测或操作其他端口。

## Stop conditions

立即停止并报告，不得自行扩大范围：

- 需要修改 allowlist 外文件或新增文件
- 需要新依赖、测试/构建配置或 Canvas runtime 改动
- RED 不能由目标行为触发，或现有测试与新 spec 产生不可裁决冲突
- 同一问题连续三次修复仍失败
- reduced-motion、键盘语义、全英文、路由、外链安全或性能预算回退
- 浏览器验证需要 3100 之外端口
- 发现 3100 已被其他未确认任务占用

## Dirty baseline

- TaskScopeFiles：上述 27 个路径；Handoff 前 focused baseline 为 8 files / 28 tests PASS。
- PreExistingDirtyBaseline：仓库为 `UNBORN_HEAD`；`.gitignore` staged，`main.py` staged+modified，`.agents/**` 及其余当前项目实现/历史计划/OpenSpec 均为既有未提交基线。
- Protected SHA-256：`.gitignore af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94`；`main.py bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0`；`AGENTS.md 1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf`；`.agents` aggregate `0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770`。
- GeneratedOrNoisyArtifacts：`node_modules/**`、`.next/**`、`coverage/**`、`test-results/**`、`playwright-report/**`、`.playwright-cli/**`、`tsconfig.tsbuildinfo`。

## Handback

Worker 必须交回：

1. Changed files 与每个最终 SHA-256。
2. 每个 Task 的 RED、GREEN、REFACTOR 证据。
3. 六张更新视觉候选的绝对路径。
4. 验收标准覆盖矩阵。
5. 未验证项、范围扩展请求和停止条件记录。
6. TDD、设计一致性、范围、无障碍、性能与安全自审 `PASS/FAIL`。

Worker 不更新 OpenSpec checkbox、Architecture 文档或 session-state；这些由 IntegrationOwner 在独立检查和 reviewer gate 后维护。
