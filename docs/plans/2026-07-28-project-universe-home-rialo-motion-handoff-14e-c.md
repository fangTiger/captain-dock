# Handoff Task Package — Task 14.19 Home / Rialo Motion Density

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.19`
- SliceId: `home-rialo-motion-density`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after all slices integrate
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- Baseline aggregate: `959889255dd97f33a9982cee50acb558fb11f4a74cec9c4bcd24c4320f99eeb0`
- Known focused baseline: `src/styles/design-contract.test.ts` currently has 1 pre-existing RED because the normal Home ambient selector omits `data-universe-morph-phase='idle'` while its reduced-motion counterpart includes it. This is an in-scope lifecycle defect and must become GREEN, but does not count as the worker's new Task14.19 RED evidence.

## Acceptance Criteria

1. Home 同时维护 committed `activeProject` 与 effective `visualProject`；前者拥有所有语义，后者只拥有装饰形态/accent。
2. root 发布 `data-visual-project` 和 `data-scene-motion="preview|commit"`；machine shape 与视觉 CSS variables 绑定 visual project。
3. 220ms preview 同时改变三条明显通道：主 mass/outline、monument horizon、accent field；planes 可作为第四通道。
4. hover/focus 不改变标题、statement、CTA href/label、pressed/current、live region；click/Enter 后才以 780ms commit 更新。
5. 同 committed target 的 hover/focus 为视觉 no-op；离开其他 preview 回到 committed visual project。
6. 既有 Home/Arc/Rialo 环境 owner 保持每页最多一主一辅，只动画 transform/opacity；使用负 delay 或等价方式从可观察中段开始，主角约 12–18px/6–8°，signal/beacon 约 24–30px。
7. Low/Static/mobile/saveData/hidden/offscreen/morph/reduced-motion 仍完全停止循环，Canvas 保持 demand。
8. ≤420px Rialo inactive 行只视觉显示编号与短信号，active 行显示完整标题与唯一 description；完整 accessible name、44px buttons、事实、no-JS 与键盘语义不变。
9. Home/Arc/Rialo stage height 保持，desktop stage bottom 到 footer top 为 0–48px。

## Editable Files

```text
src/components/stage/home-instrument-stage.tsx
src/components/stage/home-instrument-stage.test.tsx
src/components/stage/instrument-stage.module.css
src/components/stage/instrument-stage.test.tsx
src/components/rialo/rialo-reactive-loop.module.css
src/components/rialo/rialo-reactive-loop.test.tsx
src/styles/universe-pages.module.css
src/styles/design-contract.test.ts
tests/e2e/home.spec.ts
tests/e2e/responsive.spec.ts
tests/e2e/progressive-enhancement.spec.ts
```

## Forbidden Files / Actions

- 上述文件之外的全部文件。
- scene-target-controller、finite morph、UniverseCanvas/SceneRouter、Three scenes、Rialo TSX、catalog、routes、metadata、dependencies、budgets、Playwright config。
- `.codex/**`、`openspec/**`、`docs/**`、`.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`。
- browser、build、server、Lighthouse、端口、Vercel、commit、reset/restore。

## TDD Requirements

RED 先固定：

- 先复现并保留上述 1 个 known baseline RED；正常 Home ambient owner 必须补齐 idle gate，使 reduced owner 精确覆盖。
- Home hover/focus 后 active semantic facts 不变，但 effective/visual project、machine shape、accent 与 motion mode 改变。
- Home click/Enter 后语义只更新一次并进入 commit mode。
- CSS 对四项目定义不同的 mass、horizon、accent 终点；preview 220ms，commit 780ms。
- 六个既有环境 owner 数量不增加，规则只使用 transform/opacity，具负 delay/可观察中段及更清晰端点。
- 390px 恰好一个 Rialo active 长标题/description 可见，四个 inactive 只显示编号/短信号但 accessible name 完整，控制尺寸 ≥44px。
- desktop 三个 immersive route 的 stage/footer gap 为 0–48px。
- 所有现有 progressive、Static、reduced、mobile、saveData、demand gate 保持。

## Worker Validation

```bash
npm test -- --run \
  src/components/stage/home-instrument-stage.test.tsx \
  src/components/stage/instrument-stage.test.tsx \
  src/components/rialo/rialo-reactive-loop.test.tsx \
  src/styles/design-contract.test.ts

./node_modules/.bin/eslint \
  src/components/stage/home-instrument-stage.tsx \
  src/components/stage/home-instrument-stage.test.tsx \
  src/components/stage/instrument-stage.test.tsx \
  src/components/rialo/rialo-reactive-loop.test.tsx \
  src/styles/design-contract.test.ts \
  tests/e2e/home.spec.ts \
  tests/e2e/responsive.spec.ts \
  tests/e2e/progressive-enhancement.spec.ts \
  --max-warnings=0

npm run typecheck
npx playwright test \
  tests/e2e/home.spec.ts \
  tests/e2e/responsive.spec.ts \
  tests/e2e/progressive-enhancement.spec.ts \
  --list
git diff --check
```

真实浏览器像素、computed geometry、3100 与 Art Director 由 Architecture 在集成阶段执行。

## Deliverables

- RED 与 GREEN 命令、失败/通过数量。
- changed files 与逐文件 SHA-256。
- 对九条 acceptance 的逐项覆盖。
- 未验证项、风险、scope expansion 请求。
- 明确确认未运行 browser/build/server/端口/Vercel/commit。
