# Handoff Task Package — A 版重构 Slice 12B2 Compact Capacity Recovery

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6 / Instrument Stage compact capacity recovery`
- AgentId: `/root/fix_redesign_12b2`
- SliceId: `instrument-stage-compact-capacity-recovery`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- SessionStatePath: `.codex/session-state.md`
- GitBaseline: `UNBORN_HEAD`
- Patch artifact / worktree: `DEGRADED_SHARED_WORKTREE_SINGLE_WORKER_SERIAL`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## 上游状态

12B 主体成果保留；12B1 的外层容器修复也保留：

- Home、Arc、Rialo 已使用共享 Instrument Stage。
- Arc 已是同一机器的三状态；Rialo 已是五阶段首屏仪器。
- 项目详情与 About 已改为扁平案卷布局。
- 12B1 已把 immersive main 扩大到可容纳真实 `1200×720` 舞台，并移除 50%/translate 逃逸。
- 12B1 后 1440/1920 外层舞台、About/详情 1180px main 均不再失败。
- 当前 12B 44-file TaskScope 聚合 SHA-256：`b7e204bcdc78f1ff2f8946172408f5116524b1bb57610cded507191bfd918e7d`。
- 12B1 三文件聚合 SHA-256：`5848c09ee347e0b2cd2f0b8442509c1e45224e1278bc95f6b80616e81763cadf`。

12B1 在唯一一次修复后按 stop condition 停线，因为 `/arc @ 561px` 仍有：

- scene `228/242`
- machine `204/230`
- readout wrapper `138/184`

独立盒模型诊断和 Architecture 真实 Chromium 审计进一步证明：仅给 readout 184px 不足以完成修复；Home/Arc/Rialo 的 title 在若干边界宽度还有隐藏横向溢出，Arc/Rialo 在 561/767/768 还有 title/readout 纵向容量冲突。因此本任务是经过 DESIGN 的新 reslice，不是继续 12B1 的第二次盲修。

## 冻结参考

- `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/project-universe-design.html`
  - SHA-256 `bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a`
- `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/rialo-detail-design.html`
  - SHA-256 `9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c`

必须先完整阅读：

- `docs/plans/2026-07-24-project-universe-redesign-handoff-12b.md`
- `docs/plans/2026-07-24-project-universe-redesign-handoff-12b1.md`
- `docs/plans/2026-07-24-project-universe-reference-first-redesign.md`
- 当前三个 TaskScope 文件。

## Editable files / TaskScopeFiles

- `src/components/stage/instrument-stage.module.css`
- `src/components/rialo/rialo-reactive-loop.module.css`
- `tests/e2e/responsive.spec.ts`

## Forbidden files

除上述三个精确文件外，仓库内全部产品、测试、配置、文档、OpenSpec、session-state、依赖、生成资产和用户文件均禁止修改。特别禁止：

- `.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`
- `.codex/**`、`docs/**`、`openspec/**`
- `src/styles/universe-pages.module.css`：12B1 的 immersive main 扩容已冻结
- 所有 TS/TSX、其他 CSS、Canvas/scene/runtime/catalog/metadata/SEO/路由/外链
- `package*.json`、`*.config.*`、`scripts/**`、`public/**`
- Task12C visual snapshot 文件
- 端口 3000、Git commit、部署

## Architecture 诊断证据

561px 冷启动精确盒模型：

- gutter `22.44px × 2`
- main content `516.12px`
- stage grid 可分配 `512.12px`
- 当前 `.72 / 1.12 / .68` 为 `146.32 / 227.61 / 138.19px`
- scene 扣除 `12px × 2` padding 后 machine `203.61px`
- `.arcMachineLabel` 的 `absolute + nowrap` 固有宽约230px
- readout 内容 auto-min 外宽约172px，连左 padding 传播为184px

Architecture 在不写产品文件的 Chromium style injection 中验证了下述完整方向：

- 路由：Home、Arc、Rialo
- 宽度：561、767、768、900、901、992、1024、1025、1200、1279、1280、1440、1920
- 验证项：main/stage 横向尺寸、title/scene/readout/index/footer 与直接子项横向自溢出、主要容器纵向自溢出
- 加入 100ms viewport-unit 稳定窗口后连续两轮结果均为 `[]`
- 未写工作区产品文件；这里只是 DESIGN 证明，正式实现和测试仍由 worker 完成

## Required TDD

### A. 扩充 RED，不能只测原三条 selector

在现有聚焦测试 `Instrument Stage geometry stays inside immersive main content boxes` 中：

1. 三条路由都检查：
   - `[data-stage-title]`
   - `[data-stage-title] > *`
   - `[data-stage-scene]`
   - `[data-stage-scene] > *`
   - `[data-stage-readout]` 与直接子项（不存在时跳过）
   - `[data-stage-index]` 与直接子项
   - `[data-stage-footer]` 与直接子项
2. 横向：`scrollWidth <= clientWidth + 1`。
3. 纵向只对主要容器 title/readout/index/footer 检查；允许最多4px字体/line-box容差：
   `scrollHeight <= clientHeight + 4`。
4. 保留 561、767、768、900、901、992、1024、1025、1440、1920，并新增1200、1279、1280。
5. 在每条路由测试前先把 viewport 设为561再 `goto`；宽度切换后等待字体与两帧，再通过 `expect.poll` 或等价稳定条件等待 `--page-gutter` / main padding 与当前 viewport 对应，避免 Chromium 在大幅反向 resize 时短暂保留上一宽度的 `vw` used value。
6. 至少增加一条 1920 → 561 的反向 resize 回归，稳定后 stage 仍填满 main 内容盒，不能保持64px旧 gutter。
7. `/arc @ 561px` 依次点击三个 observation mode，逐状态检查 machine、readout、CTA 横纵向容量。
8. 明确检查 `>560` 的 title/scene/readout 仍位于同一首行；不能通过纵向堆叠过门禁。

先运行聚焦命令并记录 RED。当前预期至少复现：

- Arc 561 scene/machine/readout 横向失败
- Home/Arc/Rialo title 的新增失败
- Arc/Rialo 窄宽 title/readout 纵向失败

若扩充测试未产生这些 RED，立即停线。

### B. 实现共享舞台容量策略

在 `instrument-stage.module.css` 中实现以下语义，可按现有格式整理：

1. 消除百分比/implicit-grid 历史依赖：
   - stage 使用 `inline-size: auto`
   - `max-inline-size: var(--stage-max-width)`
   - `justify-self: stretch`
   - 保持已删除的 `margin-inline` / `translate` 不得恢复
   - Home/Arc/Rialo main 的内容盒在桌面已精确为1200px，因此 stretch 仍得到真实1200×720
2. `.title > *`：
   - `max-inline-size: 100%`
   - `min-inline-size: 0`
   - `overflow-wrap: anywhere`
3. 桌面 `>=1280`：
   - Home headline 约 `3.1rem`
   - Arc headline 约 `2.65rem`
   - Arc columns：
     `minmax(24rem,.9fr) minmax(18rem,1fr) minmax(16rem,.72fr)`
   - Rialo columns：
     `minmax(28rem,.95fr) minmax(18rem,.95fr) minmax(16rem,.65fr)`
   - 目标是三行标题、主机器、readout 同舞台，不得通过隐藏桌面主内容消错
4. 把现有共享 compact media 从 `561–1024` 延伸到 `561–1279`。
5. compact 内：
   - Home 保持现有通用三列
   - Arc/Rialo 使用：
     `minmax(0,.72fr) minmax(0,1.12fr) minmax(11.5rem,.68fr)`
   - Home/Arc headline spans 可换行
   - `.arcMachineLabel` 使用 `inline-size:100%`、居中、允许换行
   - `.arcReadout` 和 `.stagePrimaryLink` 可收缩并 `overflow-wrap:anywhere`
6. `561–768`：
   - Arc/Rialo 隐藏 title 中的次级 caption/body，但保留生态标题与核心 headline
   - readout wrapper `padding-block` 约 `1.25rem`
   - Arc inner readout `padding-block` 约 `0.5rem`
7. `561–640` 的极窄非堆叠状态：
   - Home headline 约 `1.25rem`，三条既定 headline span 保持三行
   - Arc/Rialo ecosystem title 约 `2rem`，headline 约 `1.05rem`
   - Arc/Rialo 隐藏 title kicker；保留生态标题与核心 headline
   - title `padding-block` 约 `1rem`
   - readout wrapper `padding-block` 约 `0.75rem`
   - Arc 隐藏 readoutClaim/readoutList，仅保留 coordinate、项目名和主 CTA
   - 不能隐藏 Arc observation controls
8. `<=560` 原移动纵向结构保持不变，不得扩大断点，不得新增第二套 DOM。

### C. Rialo 模块的同构 compact 策略

在 `rialo-reactive-loop.module.css`：

- 把现有 `561–900` compact media 延伸到 `561–1279`。
- 让 kicker、routeCaption、routeBody、ecosystemTitle、headline、readout、projectLink 可收缩和换行。
- `561–768` 隐藏 routeCaption/routeBody，只保留 Rialo、核心 headline、五阶段控制与 readout。
- `561–640` 隐藏 kicker 和 readoutBody；项目主 CTA 保留并可换行。
- 保持五阶段按钮、roving focus、44px触控、Observe/Cover/Trigger/Settle/Explain 内容与 scene target 不变。
- `<=560` 原移动规则不变。

## GREEN 与完整门禁

聚焦 GREEN 后必须运行：

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

完整 9-spec 必须全部通过；不得删除、跳过或放宽原有 overflow、触控、axe、安全、键盘断言。

## 视觉矩阵

完整门禁后生成并实际查看临时候选截图：

- 1440×1000：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- 390×844：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- reduced motion：`/`、`/arc`、`/rialo`
- 新增 561×900：`/`、`/arc`、`/rialo`

截图只放临时目录，不创建 Task12C 正式 snapshot。逐页报告：

- Home 是否是三行标题、四节点、01/02索引同舞台
- Arc 是否是同一机器三状态，标题/readout/CTA无裁切
- Rialo 是否是五阶段首屏仪器，标题/readout/CTA无裁切
- 561 是否仍同一三栏首行且信息经过降噪，而不是堆叠或隐藏核心控制
- 390 是否单DOM移动精简、无横向滚动
- 详情是否左文案/右签名且无大卡套小卡

## Stop conditions

- 需要第四个 editable 文件。
- RED 未复现既有横向失败或新增 title/readout 容量失败。
- 需要改 DOM、TSX、catalog、runtime、配置或依赖。
- 需要扩大 `<=560` 移动堆叠断点。
- 1440/1920 不再保持约1200×720。
- 需要隐藏桌面主标题、Arc selectors、Rialo五阶段控制或主 CTA。
- 一次实现后聚焦测试仍失败。
- 出现新的产品/行为失败，不能由三个文件范围解释。

触发即停止，不得继续叠补丁或扩大范围。

## PreExistingDirtyBaseline

- 三文件规范化初始聚合 SHA-256：`00097724ddc6bec925e120333fb0cedcb63e4609ab0dae556efc8a7fd7518151`。
- 上游完整12B TaskScope聚合：`b7e204bcdc78f1ff2f8946172408f5116524b1bb57610cded507191bfd918e7d`。

受保护 SHA-1：

- `.gitignore` `613e0fce4c277f89e2b71560729e5f9ec7fb1029`
- `main.py` `5208159b5d005aa3948e987504fe0b9468de43f7`
- `AGENTS.md` `e7ce54099d2f4e547da9432b7ac6e7c8d4486161`
- `.agents/**` aggregate `4883e15249ea055bafb35cb37ef9c440db7e0991`

## Handback

- 三文件 changed hashes 与最终 aggregate
- 聚焦 RED/GREEN、反向 resize、Arc三状态证据
- verify/build/完整9-spec证据
- 14张临时候选截图路径与逐页视觉自审
- 生产 Han 扫描、范围、protected/reference、3100释放证明
- 未验证项与自审结论

不要更新 OpenSpec、docs、session-state，不要 commit，不要部署。
