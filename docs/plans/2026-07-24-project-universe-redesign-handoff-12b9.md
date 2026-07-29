# Handoff Task Package — A 版重构 Slice 12B9 Compact Instrument Stage

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6 / compact Instrument Stage visual geometry`
- AgentId: `/root/fix_redesign_12b9`
- SliceId: `compact-stage-non-overlap`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- GitBaseline: `UNBORN_HEAD`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## 视觉 Gate 结论

Task12B8 的代码与自动门禁已 GREEN：

- responsive focused：1/1
- typecheck：PASS
- verify：29 files / 187 tests
- build：14 pages
- 正确完整9-spec：69/69

但 Architecture 与 worker 独立查看14张截图后均判为 `VISUAL_FIX_REQUIRED`：

- `/arc @ 561px`：readout/CTA 与三模式 rail 正面积重叠，标题每个设计行又被拆成多行。
- `/rialo @ 561px`：readout/CTA、五阶段 rail、阶段说明与标题大面积叠压。
- 自 overflow 全为0并不等于兄弟区域不相交；现有测试遗漏了这个维度。

本 slice 只修 561–640px compact Stage；reduced-motion 静态背景问题由后续独立 slice 处理。

## 冻结设计决定

- `<=560px`：继续使用现有纵向 flex。
- `561–640px`：继续使用单行三栏首行与现有约5:3 Stage，不改为移动堆叠，也不把 Stage 拉成长列表。
- `>640px`：保持现有布局。
- 所有 Arc 三模式、Rialo 五阶段、active readout、primary CTA、footer 与语义 DOM 必须保留。
- 允许只在 561–640px 降噪：
  - 隐藏 Arc 的 `aria-hidden` machine label。
  - 视觉隐藏 Rialo 每阶段长说明；五个按钮与 signal 必须可见，说明节点和 `aria-describedby` 关系必须仍存在且非空。
  - 可隐藏 `Current readout` 这类重复微标签。
- 不得隐藏 mode signal、active project/step、primary CTA 或 footer，不得缩小触控目标到44px以下。

## Editable files

- `tests/e2e/responsive.spec.ts`
- `src/components/stage/instrument-stage.module.css`
- `src/components/rialo/rialo-reactive-loop.module.css`

其余全部禁止修改，包括 TSX/DOM、Static fallback、Canvas/scene/runtime、其他测试、配置、docs、OpenSpec、session-state、依赖、3000、commit 与部署。

## Required TDD RED

先只改 `responsive.spec.ts`，扩充现有
`Instrument Stage geometry stays inside immersive main content boxes`，不要新建截图快照：

1. compact 样本至少加入 `600`、`640`，与现有 `561` 一起覆盖；保留 `767+` 与现有全部宽度。
2. 对 Arc/Rialo 的真实可见 owner 计算 DOMRect 正面积相交，不比较容器空白：
   - Arc readout：`[data-stage-readout] > [data-active-project]`
   - Arc mode rail：`[aria-label="Arc observation modes"]`
   - Arc decorative machine label：若可见，不得与 mode rail 相交
   - Rialo readout：`[data-rialo-readout]`
   - Rialo rail：`[aria-label="Rialo Captain core loop"]`
3. 在 561/600/640px 断言：
   - readout 与 rail 的交集宽或高不超过1px。
   - primary CTA 与任一 mode/stage button 无正面积相交。
   - `h1 + p > span` 每个设计行高度不超过 computed line-height + 1px，即设计行不再二次折行。
   - Arc 3个模式与 Rialo 5个阶段按钮均存在、可见、至少43.5×43.5。
   - Rialo 五个 `aria-describedby` 均指向存在且非空的说明节点。
4. 保留并继续通过现有断言：
   - Stage `display:grid`
   - title/scene/readout 同一首行
   - 约 `5/3`
   - horizontal/vertical capacity
   - lower section capacity
   - 1920→561 reverse resize
   - Arc 三状态561容量

不改产品时运行：

```bash
npx playwright test tests/e2e/responsive.spec.ts \
  --config playwright.config.ts \
  --grep "Instrument Stage geometry stays inside immersive main content boxes"
```

RED 必须精确显示 compact Arc/Rialo 的 readout/rail 或 headline 重排碰撞；若先出现无关失败，停止。

## GREEN 方向与 Architecture 原型证据

Architecture 只读 CSS 注入原型在561px测得：

- Arc readout/rail 交集：`9115.08px² → 0`
- Rialo readout/rail 交集：`27657.24px² → 0`
- Arc/Rialo headline span：由2行回到各1行
- Stage 保持约 `516×310`、grid 三栏、全部按钮与 CTA

原型使用的设计语义，可等价优化但不可直接复制测试结果：

- compact title 横向 padding 收紧，Arc/Rialo headline 使用能保持设计行的较小字号与 nowrap。
- compact readout 改为首行顶部对齐，内部 gap/padding/标题/CTA 排版收紧，但保留44px控制高度。
- Arc decorative machine label 在 compact 隐藏。
- Rialo 五段长 description 在 compact 视觉隐藏，rail 只承载5个控制；active readout 继续提供当前阶段说明。
- Rialo readout 与 stage button 微排版相应收紧。

原型图片仅作诊断，不是交付 snapshot：

- `/private/tmp/arc-candidate-561.png`
- `/private/tmp/rialo-candidate-561.png`

## GREEN 与回归

聚焦测试 GREEN 后运行：

```bash
npm run typecheck
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

必须仍为69/69。全绿后只生成并实际查看6张 compact 候选图：

- 561×900：`/arc`、`/rialo`
- 600×900：`/arc`、`/rialo`
- 640×900：`/arc`、`/rialo`

逐张确认无标题二次折行、readout/CTA/rail碰撞，全部控制仍可辨。截图只放临时目录。

## Stop conditions

- 需要第四个 editable 文件、TSX/DOM 改动或改变560断点。
- 需要取消现有5:3、grid或首行三栏断言。
- 需要隐藏任何 core control、active readout、CTA 或 footer。
- RED 未复现截图中的 compact 碰撞。
- 聚焦 GREEN 后出现新的未冻结失败。

## Baseline

- `tests/e2e/responsive.spec.ts`：`e104e775e81b96c72612d23beec8bb5738d50e5ee42cb0a488d1adb18d969180`
- `src/components/stage/instrument-stage.module.css`：`11adb976608820884a60b97f6d06babd2aa3802cfb2fae006f71d356cfab3ab5`
- `src/components/rialo/rialo-reactive-loop.module.css`：`61ee3b44a865afd1d60c73c98f2a9fdc19d0c9f4bf7186c4ba326f15908efe5b`
- 三文件聚合：`19774bdc23cf8208f304cc010e891c5314cac08bacf202ae3a905495a7e7967e`

冻结参考 SHA-256：

- Home/Arc：`bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a`
- Rialo/detail：`9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c`

保护 SHA-1 保持：`.gitignore` `613e0fce4c277f89e2b71560729e5f9ec7fb1029`、`main.py` `5208159b5d005aa3948e987504fe0b9468de43f7`、`AGENTS.md` `e7ce54099d2f4e547da9432b7ac6e7c8d4486161`、`.agents/**` aggregate `4883e15249ea055bafb35cb37ef9c440db7e0991`。

不要更新 OpenSpec/docs/session-state，不要 commit 或部署，不要触碰3000；3100仅可临时使用并须在 handback 前释放。
