# Handoff Task Package — A 版重构 Slice 12B6 Arc CTA Ownership

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6 / Arc responsive CTA ownership`
- AgentId: `/root/fix_redesign_12b6`
- SliceId: `arc-responsive-cta-ownership`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- GitBaseline: `UNBORN_HEAD`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## 当前唯一问题

12B5 已通过：

- typecheck
- 聚焦 Instrument Stage 1/1
- verify：lint/typecheck/29 files/187 tests
- build：14/14 pages

完整9-spec收集69 tests，结果68 passed/1 failed。唯一失败：

- `tests/e2e/responsive.spec.ts:492`
- `/arc` 的可见内容断言使用：
  `main.getByRole('link', { name: 'Open SIGNAL/LEDGER case file' })`
- 当前正确产品DOM中有两个同名CTA：
  1. Arc Instrument Stage 的 primary CTA
  2. 下方 SIGNAL/LEDGER project card 的 secondary CTA
- Playwright strict mode 因2个owner而失败

产品不应删除任何CTA。响应式路由可见性断言应明确验证首屏 Instrument Stage 的CTA owner。

## Editable file

- `tests/e2e/responsive.spec.ts`

其余全部禁止修改。

## Required TDD

1. 不改文件先运行：

```bash
npx playwright test tests/e2e/responsive.spec.ts \
  --config playwright.config.ts \
  --grep "immersive routes meet responsive geometry"
```

必须复现唯一 Arc strict-mode 2-link失败。
2. 只把 `/arc` 分支的断言收窄到：

```ts
main
  .locator('[data-instrument-stage="arc"]')
  .getByRole('link', { name: 'Open SIGNAL/LEDGER case file' })
```

等价的明确 stage owner selector可接受。禁止 `.first()`、`.nth()`、删除断言、改accessible name、改产品或影响Home分支。
3. 同一聚焦测试必须GREEN。
4. 运行 `npm run typecheck`、`npm run verify`、`npm run build`、12B5完整9-spec；必须69/69。
5. 全绿后生成并实际查看12B5指定的14张临候选截图，逐页报告。

## Stop conditions

- RED不是唯一Arc strict-mode 2-link问题。
- owner scope后聚焦或类型失败。
- 需要第二文件或改变其他测试行为。
- 完整门禁出现新的未冻结失败。

## Baseline

- 单文件初始 SHA-256：`fb6ce942b3b010fe25458afe9394ef22abcb8824a28b3887c474336ce63fd5b5`
- 12B3 product CSS frozen SHA-256：`61ee3b44a865afd1d60c73c98f2a9fdc19d0c9f4bf7186c4ba326f15908efe5b`

保护、参考、Han、端口与handback要求沿用12B5。不要更新OpenSpec/docs/session-state，不要commit或部署，不要触碰3000。
