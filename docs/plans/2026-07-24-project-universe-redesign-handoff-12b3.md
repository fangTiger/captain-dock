# Handoff Task Package — A 版重构 Slice 12B3 Rialo Desktop Headline

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6 / Rialo desktop headline capacity`
- AgentId: `/root/fix_redesign_12b3`
- SliceId: `rialo-desktop-headline-capacity`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- SessionStatePath: `.codex/session-state.md`
- GitBaseline: `UNBORN_HEAD`
- Patch artifact / worktree: `DEGRADED_SHARED_WORKTREE_SINGLE_WORKER_SERIAL`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## 原因与当前证据

12B2 的 RED 与一次 CSS 实现均按护栏完成。它已消除：

- Arc 561 scene `228/242`
- Arc machine `204/230`
- Arc readout `138/184`
- Arc 三状态容量失败
- Home/Arc/Rialo 窄宽 title/readout 容量失败
- 1920→561反向 resize 与首行结构失败

当前聚焦测试只剩一个确定问题：

- `/rialo @ 1280/1440/1920`
- `.headline` 直接子项 `clientWidth=371`
- `scrollWidth=394`
- 文案 `The sky changes. / The policy reacts.`

Architecture 的无写入 Chromium 原型已经验证：把 Rialo 基础 `.headline` 从 `2.6rem` 改为 `2.4rem` 后，该区域在1280/1440/1920均无横向自溢出；现有 `561–1279` 与 `<=560` media 会继续分别覆盖为 `1.5rem` 与 `1.85rem`，因此本变更只影响桌面。

12B2 handoff 漏写了这个已经在原型使用的桌面字号，原 worker 正确按一次实现 stop condition 停线。本任务是 Architecture 对交接遗漏的单文件恢复，不允许扩大。

## Editable file

- `src/components/rialo/rialo-reactive-loop.module.css`

## Forbidden files

除上述单一文件外全部禁止修改。特别禁止：

- `src/components/stage/instrument-stage.module.css`
- `tests/e2e/responsive.spec.ts`
- `src/styles/universe-pages.module.css`
- 所有TS/TSX、其他CSS、配置、依赖、docs、OpenSpec、session-state
- `.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`
- 端口3000、commit、部署、Task12C snapshots

## Required TDD

1. 不改测试，先运行：

```bash
npx playwright test tests/e2e/responsive.spec.ts \
  --config playwright.config.ts \
  --grep "Instrument Stage geometry stays inside immersive main content boxes"
```

2. RED 必须仍为1 failed，且唯一产品断言类别为 Rialo desktop headline `371/394`。
3. 只把基础 `.headline` 的 `font-size: 2.6rem` 改为 `2.4rem`。
4. 同一聚焦命令必须 GREEN。
5. 禁止为了通过修改 line-height、隐藏 headline、改变列宽、扩大 compact/mobile 断点或放宽测试。

## 完整门禁

GREEN 后运行：

```bash
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

不得删除、跳过、放宽任何既有断言。

## 视觉矩阵

门禁全绿后生成并实际查看临时候选截图：

- 1440×1000：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- 390×844：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- reduced motion：`/`、`/arc`、`/rialo`
- 561×900：`/`、`/arc`、`/rialo`

共14张。不得创建正式 Task12C snapshot。逐页对照两份冻结参考并报告结构、裁切、层级和是否仍像同一产品。

## Stop conditions

- RED 不再是唯一 Rialo desktop headline 问题。
- 需要第二个 editable file。
- 单一字号修改后聚焦测试仍失败。
- 完整门禁产生不能由现有冻结状态解释的新失败。
- 需要改测试、隐藏主内容、改变断点、DOM、runtime、配置、依赖、3000、部署或提交。

命中即停止。

## Baseline

- 单文件初始 SHA-256：`d414d89c531b96ed655f609472e1bd3814625819a3e7628f0f9888ca19c2cafe`
- 12B2 三文件聚合：`97856a3a36ac9bf2df6acd815e2f7f9ee0f7ccd2fbbc6c5d2b54514a744d4a86`
- 当前上游12B TaskScope聚合由 Architecture 在交回后复算

受保护 SHA-1：

- `.gitignore` `613e0fce4c277f89e2b71560729e5f9ec7fb1029`
- `main.py` `5208159b5d005aa3948e987504fe0b9468de43f7`
- `AGENTS.md` `e7ce54099d2f4e547da9432b7ac6e7c8d4486161`
- `.agents/**` aggregate `4883e15249ea055bafb35cb37ef9c440db7e0991`

冻结参考 SHA-256：

- `bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a`
- `9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c`

## Handback

- 单文件最终hash
- RED/GREEN与完整门禁
- 14张临时截图路径和逐页自审
- Han、scope、protected/reference、3100释放证明
- 未验证项与自审结论

不要更新OpenSpec、docs、session-state，不要commit，不要部署。
