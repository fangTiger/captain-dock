# Handoff Task Package — A 版重构 Slice 12B7 Arc Mobile Machine Label

- ChangeId: `build-project-universe`
- TaskId: `12.5-12.6 / Arc mobile machine label capacity`
- AgentId: `/root/fix_redesign_12b7`
- SliceId: `arc-mobile-machine-label-capacity`
- Executor: `worker role / gpt-5.6-sol / xhigh`
- IntegrationOwner: `Architecture Codex /root`
- GitBaseline: `UNBORN_HEAD`
- Graphify context: `DEGRADED_NO_GRAPHIFY_OUT`

## 当前唯一问题

12B6 已正确把 `/arc` CTA 可见性断言限定到 Instrument Stage。继续运行同一 immersive responsive 分片后，唯一失败为：

- `/arc @ 320px`
- `.arcMachine clientWidth=252`
- `.arcMachine scrollWidth=254`
- 原因：基础 `.arcMachineLabel` 使用 `white-space:nowrap`
- `561–1279` compact media 已把该标签约束为100%并允许换行，但 `<=560` mobile 不匹配该media，因此回退到基础nowrap

这是产品CSS的2px移动盒模型误差，不得放宽测试或忽略aria-hidden装饰。

## Editable file

- `src/components/stage/instrument-stage.module.css`

其余全部禁止修改，包括 tests/e2e/responsive.spec.ts（当前hash冻结）、所有其他产品/测试/配置/docs/OpenSpec/session-state、3000、commit、部署。

## Required TDD

1. 不改文件运行：

```bash
npx playwright test tests/e2e/responsive.spec.ts \
  --config playwright.config.ts \
  --grep "immersive routes meet responsive geometry"
```

必须唯一复现 `/arc @ 320px` machine `252/254` self overflow。
2. 只在现有 `@media (max-width:560px)` 内为 `.arcMachineLabel`复用已验证的compact约束：

```css
.arcMachineLabel {
  inline-size: 100%;
  max-inline-size: 100%;
  min-inline-size: 0;
  overflow-wrap: anywhere;
  text-align: center;
  white-space: normal;
}
```

也可把完全相同语义提升为基础规则，但不能隐藏标签、改变机器尺寸、改DOM或测试。
3. 同一聚焦测试必须GREEN。
4. 运行typecheck、verify、build、完整9-spec，必须69/69。
5. 全绿后生成并实际查看前述14张临时候选截图，逐页报告。

## Stop conditions

- RED不是唯一320px machine 252/254。
- CSS约束后聚焦仍失败。
- 需要第二文件或改变机器/测试行为。
- 完整门禁出现新失败。

## Baseline

- 单文件初始 SHA-256：`6586322b5ab81d7869c4a5878105dacb1a02526e6c82a595e4215e7b71f92e70`
- frozen responsive spec SHA-256：`5fcbeb468c85bcc56d56027f61afb6ec1e23f50c4c6d4d683b5fdafbb7e4263b`
- frozen Rialo CSS SHA-256：`61ee3b44a865afd1d60c73c98f2a9fdc19d0c9f4bf7186c4ba326f15908efe5b`

保护、参考、Han、端口与handback要求沿用12B6。不要更新OpenSpec/docs/session-state，不要commit或部署。
