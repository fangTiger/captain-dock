# Handoff Task Package — A 版重构 Slice 12C 确定性视觉回归与生产门禁

- ChangeId: `build-project-universe`
- TaskId: `12.7-12.8`
- AgentId: `/root/implement_redesign_12c`
- SliceId: `static-visual-baselines-and-production-gates`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- GitBaseline: `UNBORN_HEAD`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## 上游 Gate

- 用户明确选择 A 版，且要求实现 worker 使用 GPT-5.6 Sol。
- OpenSpec 12.1–12.4 已通过独立 review。
- Task12B 的 Instrument Stage、详情外壳、compact 修复与 Static mechanical backdrop
  已通过 Architecture fresh `verify 29/187`、build `14/14`、9-spec Chromium
  `69/69`、20 张集成视觉矩阵。
- 独立 Review Codex `/root/review_redesign_12b_integration` 对 12.5–12.6
  给出 `PASS`；Architecture 已勾选 12.5–12.6，OpenSpec strict validation 通过。
- 3100 当前无监听；3000 未触碰。部署仍未授权。

冻结视觉源：

- `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/project-universe-design.html`
  - SHA-256 `bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a`
- `/Users/captain/.codex/visualizations/2026/07/23/019f8db4-c8fa-7541-b6da-19544efb2e29/rialo-detail-design.html`
  - SHA-256 `9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c`

Architecture 已批准的候选构图证据在：

- `/private/tmp/captain-dock-architecture-visual-matrix/`

## Editable files

- `tests/e2e/visual-reference.spec.ts`（当前不存在，新建）
- `tests/e2e/visual-reference.spec.ts-snapshots/**`（当前不存在，仅生成本任务六张确定性 PNG）

其余全部禁止修改。尤其禁止：

- 产品源码、CSS、catalog、路由、Canvas、Static fallback、场景或依赖。
- `playwright.config.ts`、`package.json`、lockfile、Lighthouse 配置与 runner。
- `accessibility.spec.ts`、`keyboard.spec.ts`、`seo-security.spec.ts`、
  `performance.spec.ts`、其他 E2E/Unit。
- `scripts/**`、docs、OpenSpec、session-state、3000、commit、部署。

若现有 selector 或产品状态使视觉测试无法稳定，不得修改产品或配置；停止并返回
Architecture 重新设计。

## 六张确定性视觉基线

只使用 Static/减少动态效果终态，避免把 WebGL 帧时序固化为快照。每个 case 必须
使用 fresh page navigation、等待本地字体、滚动到顶部、禁用截图动画并隐藏 caret。
不得 mask 标题、按钮、项目节点、readout、签名仪器或任何实际 UI；不得设置宽松
`maxDiffPixels` / `maxDiffPixelRatio` 来吞掉布局漂移。

| 名称 | 路由 | 视口 |
| --- | --- | --- |
| `home-1440.png` | `/` | `1440×1000` |
| `arc-1440.png` | `/arc` | `1440×1000` |
| `rialo-1440.png` | `/rialo` | `1440×1000` |
| `signal-ledger-1440.png` | `/arc/signal-ledger` | `1440×1000` |
| `home-390.png` | `/` | `390×844` |
| `arc-390.png` | `/arc` | `390×844` |

实现约束：

1. `test.use({ reducedMotion: 'reduce' })` 或等价的每-context 静态设置；不能让沉浸路由
   挂载 Canvas。
2. Home/Arc/Rialo 必须断言匹配当前路由的 `[data-static-scene]` 且 Canvas 为 0；
   详情页必须断言无 Universe Shell/Canvas。
3. `page.goto()` 响应必须成功；收集并拒绝 `pageerror`、console error、
   request failure 与意外 HTTP `>=400`。
4. 等待 `document.fonts.ready`，每次截图前 `window.scrollTo(0, 0)`，并断言
   `scrollY === 0`、document 无横向 overflow。
5. 使用 Playwright `expect(page).toHaveScreenshot(<稳定名称>, ...)` 的 viewport
   screenshot；不生成 full-page 长图，不手写 PNG。
6. 1440 图必须固定 A 版首屏整体构图；390 图固定移动端真实首屏，不渲染或隐藏
   第二套重复可访问 DOM。

## TDD RED → GREEN

### RED

先只创建 `visual-reference.spec.ts`，不要创建 snapshot。运行：

```bash
npx playwright test tests/e2e/visual-reference.spec.ts --config playwright.config.ts
```

预期六个 case 仅因 expected snapshot 缺失而 RED；路由、静态模式、runtime、
overflow 等结构断言必须已经通过。若 RED 原因不是缺失基线，停止。

### 生成候选与 GREEN

```bash
npx playwright test tests/e2e/visual-reference.spec.ts \
  --config playwright.config.ts \
  --update-snapshots
npx playwright test tests/e2e/visual-reference.spec.ts \
  --config playwright.config.ts
```

预期第二次无 update 运行 `6/6`。Worker 必须用原图实际查看六张 expected snapshot，
并对照冻结 HTML；不得只报告命令成功。报告每张图路径和：

- Home：三行标题、四项目节点、01/02 索引是一台仪器。
- Arc：三 selector、active readout、唯一 primary CTA 同属一台机器。
- Rialo：绿色五阶段 rail、radar、readout 无碰撞。
- 详情：左 narrative/CTA、右 signature，无卡片墙。
- 390：无横向溢出、标题/控件不裁切，移动阅读顺序清楚。

## 12.8 全量回归

六张 snapshot GREEN 后，按顺序执行：

```bash
npm run verify
npm run build
npm run test:build-gates
npm run check:links
npm run check:budgets
npm run test:e2e
openspec validate build-project-universe --strict --no-interactive
```

随后执行冻结的 production Playwright + 三 URL、每 URL 三次、中位数门禁：

```bash
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100 npm run build
npm run lighthouse
lsof -nP -iTCP:3100 -sTCP:LISTEN
```

要求：

- production Playwright 全绿。
- Lighthouse 三个 URL 的三次中位数继续满足：
  Performance `>=0.90`，Accessibility / Best Practices / SEO `>=0.95`，
  LCP `<=2500ms`，CLS `<=0.1`。
- 链接、预算、Lighthouse 阈值与运行次数均不可调整。
- 最终 `lsof` 必须无输出；不得探测、占用或终止 3000。
- 若 Lighthouse/production gate 失败，保留全部报告并停止；不得挑最好样本、
  重跑到偶然通过、降低门槛或扩大文件范围。

## Frozen guard hashes

- `playwright.config.ts`
  `141b884d843e21c451d1e129b4458f67c166dc311f5be60372223cee800d7c54`
- `package.json`
  `d0047771f10af443047ec146e7e147defd776843b3a056c79af91e5c1b8eec0b`
- `scripts/check-budgets.mjs`
  `a55a5a12db91cc4c285b3183ddbfae194108ca8c83639a9824d241877d6971c7`
- `scripts/check-links.mjs`
  `ede935477219cb79b795b480dea2eb0b37584a541512002c5d49c3d93e5bd6f7`
- `scripts/run-lighthouse.mjs`
  `145e47dbb205f602545a77e20c313092cb10c147e034ee875119d3c22487480d`
- `lighthouserc.json`
  `a4fce4d59979c1fab0ba1f7010b4b9c6a3b70217ec923af38cd030289124023b`
- `tests/e2e/performance.spec.ts`
  `1fc065fc558576921bad807d3b6fb320cd6fd0c25eedfabba26f8c0293453a49`

`visual-reference.spec.ts` 与 snapshot 目录基线均为 `MISSING`。

## Stop conditions / handback

- RED 不是“六张 expected snapshot 缺失”。
- 任一 candidate 与 Architecture 20-image approved matrix 或冻结 HTML 明显不一致。
- 需要第三类文件、产品修复、selector/config/threshold 修改。
- 任一全量 gate、production Playwright 或 Lighthouse 失败。
- 3100 不能释放，或任何命令需要触碰 3000。

Handback 必须包含：

- 精确 changed files 与 SHA-256；snapshot 文件数必须为 6。
- RED / update / no-update GREEN 证据。
- 六张 expected snapshot 的绝对路径与逐图视觉自审。
- 所有 12.8 命令结果、Lighthouse 三 URL × 三次的中位数、报告路径。
- 端口释放、保护 hash、未 commit/未部署/未触碰 3000 的证明。
