# Handoff Task Package — A 版重构 Slice 12B8 Responsive Breakpoint Contract

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6 / responsive breakpoint contract`
- AgentId: `/root/fix_redesign_12b8`
- SliceId: `instrument-stage-mobile-stacking-contract`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- GitBaseline: `UNBORN_HEAD`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## 当前唯一问题

12B7 已只修改移动端 `.arcMachineLabel`，把 `/arc @ 320px` 的 `.arcMachine 252/254` 自溢出修复。聚焦 immersive responsive 测试继续运行后，新的唯一失败是：

- `/arc @ 767px`
- `expectMobileOwnersAreStacked` 仍要求 `main#main-content > [data-ecosystem-hero] > *` 纵向堆叠
- 冻结的 A 版响应式设计明确规定 Instrument Stage 在 `>560px` 继续使用单行三栏 grid，只有 `<=560px` 才切为纵向 flex

因此这是旧测试契约，不是产品缺陷。产品 CSS、DOM 和断点均不得更改。

## Editable file

- `tests/e2e/responsive.spec.ts`

其余全部禁止修改，包括所有产品文件、其他测试、配置、docs、OpenSpec、session-state、依赖、3000、commit 与部署。

## Required TDD

1. 不改文件先运行：

```bash
npx playwright test tests/e2e/responsive.spec.ts \
  --config playwright.config.ts \
  --grep "immersive routes meet responsive geometry"
```

必须复现 `/arc @ 767px` 的旧纵向堆叠断言失败；若先出现其他失败，停止。

2. 只修正测试中的断点所有权：

- `expectMobileHeaderAndStickyRules` 继续在 `<768px` 执行。
- immersive 路由的 `expectMobileOwnersAreStacked` 只在 `<=560px` 执行。
- case-file/content 路由的现有纵向断言继续在 `<768px` 执行。
- 禁止用跳过、软断言、扩大 epsilon、隐藏元素或删除容量断言绕过失败。

3. 同时把 immersive 的纵向 owner selector 绑定到真实 Instrument Stage 直接子区，而不是旧的通用 hero selector：

- Home：`data-instrument-stage="home"` 下的 title、scene、index、footer。
- Arc：`data-instrument-stage="arc"` 下的 title、scene、readout、index、footer。
- Rialo：`data-instrument-stage="rialo"` 下的 title、scene、readout、index、footer。
- 保留 Home/Arc/Rialo 下方 project/ecosystem/step 的原有移动堆叠断言。

可以用一个按 route 映射 variant 的小 helper，或等价的显式 selector。必须让 `<=560px` 的真实 stage owner 纵向顺序被验证，同时让 `561–767px` 由现有 `Instrument Stage geometry stays inside immersive main content boxes` 继续验证为 grid/首行三栏。

4. 同一聚焦测试必须 GREEN。

5. 继续运行：

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

完整门禁必须 69/69。若出现新的未冻结失败，立即停止，不扩大文件范围。

> Architecture correction（2026-07-24）：初版任务包误写了不存在的
> `visual-contract.spec.ts` 与 `interaction-states.spec.ts`，导致命令只收集
> 30 项。上面的九个现有 spec 文件是 12B1–12B6 一直使用且曾收集 69 项的
> 冻结完整门禁；此修正只更正验证清单，不授权任何额外代码修改。

6. 全绿后生成并实际查看14张临时候选截图：

- 1440×1000：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- 390×844：`/`、`/arc`、`/rialo`、`/arc/signal-ledger`
- reduced motion：`/`、`/arc`、`/rialo`
- 561×900：`/`、`/arc`、`/rialo`

截图只放临时目录，不创建正式 Task12C snapshot。逐页报告结构、裁切、层级，以及与两份冻结参考是否仍属同一视觉产品。

## Stop conditions

- RED 不是 `/arc @ 767px` 的旧堆叠契约。
- 需要修改第二个文件或任何产品代码。
- 聚焦测试、typecheck、verify、build 或完整9-spec出现新的未冻结失败。
- 需要放宽现有 overflow、触控、axe、安全、键盘或首行三栏断言。

## Baseline

- editable test SHA-256：`5fcbeb468c85bcc56d56027f61afb6ec1e23f50c4c6d4d683b5fdafbb7e4263b`
- frozen Instrument Stage CSS SHA-256：`11adb976608820884a60b97f6d06babd2aa3802cfb2fae006f71d356cfab3ab5`
- frozen Rialo CSS SHA-256：`61ee3b44a865afd1d60c73c98f2a9fdc19d0c9f4bf7186c4ba326f15908efe5b`
- frozen reference SHA-256：
  - Home：`bde0b1b6b1971fe10d933848a0c96080badf1dc0b508a540c30bd97db530bf7a`
  - Rialo：`9019ad540f92ecca89d057b498e4a45dff4220e48f5ef511a07896fb164cc91c`

保护 SHA-1 必须保持：`.gitignore` `613e0fce4c277f89e2b71560729e5f9ec7fb1029`、`main.py` `5208159b5d005aa3948e987504fe0b9468de43f7`、`AGENTS.md` `e7ce54099d2f4e547da9432b7ac6e7c8d4486161`、`.agents/**` aggregate `4883e15249ea055bafb35cb37ef9c440db7e0991`。

不要更新 OpenSpec/docs/session-state，不要 commit 或部署，不要触碰3000；只可临时使用3100并在 handback 前释放。
