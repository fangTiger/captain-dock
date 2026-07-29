# Handoff Task Package — A 版重构 Slice 12B1 Reslice

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6 / responsive container recovery`
- AgentId: `/root/fix_redesign_12b1`
- SliceId: `instrument-stage-container-recovery`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- SessionStatePath: `.codex/session-state.md`
- GitBaseline: `UNBORN_HEAD`
- Patch artifact / worktree: `DEGRADED_SHARED_WORKTREE_SINGLE_WORKER_SERIAL`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## Reslice 原因

Slice 12B 的主体成果保留，但原 worker 在同一响应式问题达到修复上限后按护栏停线：

- 当前 44-file TaskScope 聚合 SHA-256：`5549f8322d8b752c8940da10cf380a2f8609e96a75e89d1497c86ea3e6c871da`。
- 当前 `npm run verify`：29 files / 187 tests，lint/typecheck 通过。
- 当前 `npm run build`：14 pages。
- 当前完整 9-spec Chromium：67/68；唯一失败为 `/ @ 1440px` 的 `main#main-content` self overflow，`clientWidth=1180`、`scrollWidth=1258`。
- H1、project nodes、Home machine、scene 自身 overflow 已消失；3100 已释放。
- 视觉截图矩阵尚未执行，12.5/12.6 未进入 Review。

独立只读诊断确认根因：

1. 全局 `#main-content` 是 1180px border-box；1440 时内容区约 1064.8px。
2. `.stage` 强制 1200px，并用 `margin-inline:50%` + `translate:-50%` 从内容坐标系逃逸。
3. `57.6px gutter + 1200px stage = 1257.6px`，精确对应 main 的 1258px scrollWidth。
4. 单纯把 stage 缩到 1052–1065px 虽能消错，但会弱化 A 版 1200×720 桌面舞台，因此不采用。
5. 901–约991px 还存在现有紧凑 media 结束后、固定 Arc/Rialo 列最小宽度重新生效的采样空档，必须用测试封口。

## 冻结参考

- `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/project-universe-design.html`
  - SHA-256 `bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a`
- `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/rialo-detail-design.html`
  - SHA-256 `9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c`

必须先完整阅读：

- `docs/plans/2026-07-24-project-universe-redesign-handoff-12b.md`
- `docs/plans/2026-07-24-project-universe-reference-first-redesign.md`
- 当前三个 TaskScope 文件。

## Editable files / TaskScopeFiles

- `src/components/stage/instrument-stage.module.css`
- `src/styles/universe-pages.module.css`
- `tests/e2e/responsive.spec.ts`

## Forbidden files

除上述三个精确文件外，仓库内全部产品、测试、配置、文档、OpenSpec、session-state、依赖、生成资产和用户文件均禁止修改。特别禁止：

- `.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`
- `.codex/**`、`docs/**`、`openspec/**`
- `package*.json`、`*.config.*`、`scripts/**`、`public/**`
- 所有 TS/TSX 产品文件
- `src/app/globals.css`、`src/styles/tokens.css`
- Canvas、scene、quality、router、runtime、catalog、metadata、SEO、外链
- Task12C visual snapshot 文件
- 端口 3000、Git commit、部署

## Required implementation

### A. 先写 RED 几何回归

在 `tests/e2e/responsive.spec.ts` 新增一个聚焦 Instrument Stage 几何测试，至少覆盖：

- 路由：`/`、`/arc`、`/rialo`
- 宽度：561、767、768、900、901、992、1024、1025、1440、1920
- `main.scrollWidth <= main.clientWidth + 1`
- stage 位于 main 的内容盒内
- 所有 `>560` stage 宽高比约为 `5/3`
- 1440/1920 stage 约为 `1200×720`
- Home H1、Home machine、scene、Arc readout、Rialo readout 无 self horizontal overflow
- 下方 section 无 self horizontal overflow
- 1440/1920 的 About 与代表详情 main 仍为 1180px，证明只扩大 immersive main

先运行该聚焦测试并记录 RED；当前至少应在 Home 1440 外层宽度失败。

### B. 实现精确容器修复

在 `src/styles/universe-pages.module.css` 使用同元素 CSS Modules selector，不能写成后代：

```css
:global(#main-content).homePage,
:global(#main-content).ecosystemPage {
  max-width: calc(
    var(--stage-max-width) +
    var(--page-gutter) +
    var(--page-gutter)
  );
}
```

允许按项目格式压成一行，但语义必须相同。它只扩大 Home/Arc/Rialo main，不能影响 About、详情、header 或 footer。

在 `src/components/stage/instrument-stage.module.css`：

- `inline-size: min(var(--stage-max-width), 100%)`
- `justify-self: center`
- 同时删除 `margin-inline: 50%` 与 `translate: -50% 0`
- `<=560` 精简移动结构、单 DOM、5:3 边界保持不变

为封口 901–约991px 空档，允许把现有 **单一 5:3 紧凑三列规则** 的上界从 900 调整到经测试证明足够的值，例如 1024；禁止扩大 `<=560` 的纵向移动堆叠，禁止新增第二套 DOM。

预期：

- 1440/1920 Home、Arc、Rialo 的舞台真实保持约 `1200×720`。
- 767/768 几何与当前通过状态一致。
- 901/992 等边界不使用纵向堆叠且不溢出。

### C. 完整验证与视觉矩阵

GREEN 后必须运行：

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

完整 9-spec 必须 68/68；不得通过跳过、删除或放宽原有 overflow/触控/axe/安全断言来过门禁。

然后完成原 12B 要求的真实 Chromium 自审：

- 1440×1000：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- 390×844：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- reduced motion：`/`、`/arc`、`/rialo`

截图只放临时目录，不创建正式 snapshot。必须实际查看并逐页对照两份冻结参考，报告：

- Home 是否是三行标题、四节点、01/02 索引同舞台。
- Arc 是否是同一机器的三状态，不是三张卡。
- Rialo 五阶段是否为首屏仪器。
- 详情是否左文案/右签名且无大卡套小卡。
- 390px 是否精简、无重复 DOM、无横向滚动。

## Stop conditions

- 需要第四个 editable 文件。
- 聚焦 RED 没有复现当前 1440 缺陷。
- 容器修复后 1440/1920 不再保持 1200×720。
- 需要把移动堆叠断点扩大到 560 以上。
- 同一容器问题一次修复后仍失败。
- 出现新的产品/行为失败，不能由三文件范围内的测试定位或 CSS 修复解释。
- 需要改 DOM、runtime、配置、依赖、3000、部署或提交。

触发即停止，不得扩大范围。

## PreExistingDirtyBaseline

- 三文件规范化初始聚合 SHA-256：`e0215e9d2fab20bd87429f1b35e5fe58dfd31c7c52ccf60dc9cc65d6bde6dd82`。
- 上游完整 12B TaskScope 聚合：`5549f8322d8b752c8940da10cf380a2f8609e96a75e89d1497c86ea3e6c871da`。
- 规范复算命令：

```bash
awk '/^## Editable files/{capture=1; next} /^## Forbidden files/{capture=0} capture && /^- `/{line=$0; sub(/^- `/, "", line); sub(/`.*/, "", line); print line}' docs/plans/2026-07-24-project-universe-redesign-handoff-12b1.md \
  | while IFS= read -r task_file; do
      shasum -a 256 "$task_file"
    done \
  | shasum -a 256
```

受保护 SHA-1：

- `.gitignore` `613e0fce4c277f89e2b71560729e5f9ec7fb1029`
- `main.py` `5208159b5d005aa3948e987504fe0b9468de43f7`
- `AGENTS.md` `e7ce54099d2f4e547da9432b7ac6e7c8d4486161`
- `.agents/**` aggregate `4883e15249ea055bafb35cb37ef9c440db7e0991`

## Handback

- 三文件 changed hashes 与最终 aggregate。
- 聚焦 RED/GREEN 和完整 verify/build/68 E2E 证据。
- 11 张临时候选截图路径与逐页自审。
- 生产 Han 扫描、范围、protected/reference、端口证明。
- 未验证项和自审结论。

不要更新 OpenSpec、docs、session-state，不要 commit，不要部署。
