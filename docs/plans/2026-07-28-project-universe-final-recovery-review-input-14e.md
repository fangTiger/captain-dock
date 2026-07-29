# Review Input — Task 14.17–14.19 Final Art Recovery

## Decision Contract

独立 Review Codex 只输出：

- `PASS`
- `FIX_REQUIRED`
- `DOWNGRADE`

Reviewer 不修改文件，不运行 browser、build、server、Lighthouse、任何端口、Vercel 或 git mutation。

## Identity

- ChangeId: `build-project-universe`
- Tasks: `14.17`, `14.18`, `14.19`
- Architecture owner: `/root`
- Implementation executor: GPT-5.6 Sol worker
- Review executor: independent Review Codex
- Git baseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- Current 3100: pre-change production remains running and must not be touched
- Final 23-file ordered aggregate: `f95aca73830e0e97ae9e2129a7911bf82a003ba090088d567074f2755a7198b8`

## Sources of Truth

完整阅读：

1. `AGENTS.md`
2. `.codex/session-state.md`
3. `openspec/changes/build-project-universe/design.md` section 21
4. `openspec/changes/build-project-universe/tasks.md` tasks 14.17–14.20
5. navigation、project-detail、progressive-visual-experience 与 site-quality delta specs
6. 总计划与 A/A1/B/C handoff packages
7. 本文件列出的最终实现与测试

## Acceptance Summary

### 14.17 Carrier Spine

- `[data-universe-content]` 内 ecosystem/project marker links 使用单一 inert Carrier Spine；Header/Footer、unmarked、modified、external、history、direct load 保持原生。
- 既有 600ms/120ms、五字段 storage schema、carrier destination/target/token/elapsed progress 保持；carrier 与 Canvas transition token/target 仍为独立协议。
- Home/Arc/Rialo 分别保留 beacon/signal-path/route 方向；详情消费同一 source direction 与 persisted start，不从零重播。
- 透明 fixed full-viewport root 无背景；track/mass/signal 实际面积 gate ≤35%；只动画 transform/opacity。
- popstate/pathname 可在 120ms 前取消旧 pending destination；source 真卸载不强推旧 route。
- detail hidden 立即 terminal；真卸载清 stale token；StrictMode effect replay 用 token lease + microtask check 保留一次性 arrival。
- 深色 shell pseudo veil 与 detail handoff veil 已删除。

### 14.18 Editorial Instrument Cut

- 四页仍只有 Problem/Mechanism/Proof 三章、唯一 live CTA、真实 ecosystem/next/external links 和全部 catalog/no-JS facts。
- Proof 真实 DOM 为 media → evidence；desktop 约 2fr/1fr，mobile media 在前。
- gallery[0] eager，但无 priority/preload/high fetchPriority；gallery[1..] lazy。
- Hero 为 74svh（满足 70–78%）；Mechanism ≥1180 五列、820–1179 三列形成 3+2、≤819 单列。
- 删除 Hero 中部全宽线、gallery 顶线与图片四边框；保留功能分隔、focus、signature 内部轴/节点/刻度。
- E2E 在 scrollY=0 将 currentSrc 精确匹配 2xx/3xx image response；高度在 fonts + representative media 稳定、details 关闭后用 max(document/body) 测量。
- 默认高度 1440 ≤3200、390 ≤3400；展开态在 1440 与 390 都验证 facts、document/article width、outlier 与 clipping，但不设纵高上限。

### 14.19 Home / Rialo / Footer

- Home `activeProject` 仅取 committed target；`visualProject` 取 effective target。220ms preview 改 mass/outline、horizon、accent field，文案/CTA/ARIA/live region 只在 780ms commit 更新。
- Home horizon 为固定宽度 + scaleX；Home planes/horizon 只 transition transform，accent field 只 transition opacity。
- Home/Arc/Rialo 既有一主一辅环境 owner 使用 8.4–9.2s、negative delay、transform/opacity-only 可感知中段；Canvas 保持 demand。
- Rialo ≤420px 只视觉隐藏 inactive 长标题，button、accessible name、roving tabindex、active description、live/no-JS facts 不变。
- immersive main bottom padding 20–40px，真实 stage→footer gate 0–48px，舞台高度不得缩小。
- Arc 旧 endpoint 单测已同步批准的增强值，没有生产改动。

## Final Manifest

按 aggregate 顺序：

1. `src/components/scene/cinematic-navigation-bridge.client.tsx` — `ba246e8c59762d583bc5e213dde765e1edf89ed0aac617bd3ee56766c8b3f628`
2. `src/components/scene/cinematic-navigation-bridge.module.css` — `be08fdd331036aa90b5c696c5ea28eb922f54044b7009abb8f24dae55630e578`
3. `src/components/scene/cinematic-navigation-bridge.test.tsx` — `8a3a7723a1ab0384070442f30da9eb573ba9aa051b3d29ca641973cf3006c595`
4. `src/components/scene/universe-shell.module.css` — `87afdfb2e2beaa9f553d7f9b4c4ebc3badc352c77e5fd7b4cce34cad94385dc0`
5. `src/components/project/project-case-study.tsx` — `2e009b9524b9a4ba6478c44cb321521708a22f2ca8c34962fc0c7f217fe2b1b7`
6. `src/components/project/project-case-study.module.css` — `16289966b1635a0d41bcea476739b5e88bbf0f614dba4191b2ff8df60356a0a2`
7. `tests/e2e/cinematic-motion.spec.ts` — `1c4057335c1a894aa596d044f7288f757e9deb78c6f83afb219c74a1f1c07b4b`
8. `src/components/project/project-gallery.tsx` — `4ff900309d283adf60741ff64dbe6494ea8e1f9c04f6ed7c7e0aa1c9d13a35b8`
9. `src/components/project/signature/project-signature.module.css` — `083d426d9a095c90388acf39e10b43a9d873be646158ddbe5026e4d02a01d5b0`
10. `src/components/project/project-case-study.test.tsx` — `ea64989d045a398fe76cda624f43041b59867b3b87b86dd15a5fea29fe04f44a`
11. `tests/e2e/project-detail.spec.ts` — `841ff8ab8d503724776f1a7c380c710c17eecc009b2a794e506f6e9ae0ac1e2c`
12. `src/components/stage/home-instrument-stage.tsx` — `df479f370965ced6a587c490d10d559c5d5b6d59162c802665f4b0b0b98785e2`
13. `src/components/stage/home-instrument-stage.test.tsx` — `9f1e2137790fe2d66f964bab56810d1ff9655cc008beeff7d2d1f978a08da193`
14. `src/components/stage/instrument-stage.module.css` — `56bc6dd9643e7d2f0bf52a15961c2e70073d8006d59f563c57a2824a6c1c8429`
15. `src/components/stage/instrument-stage.test.tsx` — `b8bafc9de349d98836dbef1ac2b1e77735d21ca6269f11b42be2cde78d544db9`
16. `src/components/rialo/rialo-reactive-loop.module.css` — `be79d938994ce76db9b18b011fe5c9edb69f0f37c225f7cd4f4e0e3fba155d72`
17. `src/components/rialo/rialo-reactive-loop.test.tsx` — `8d61979ae505389257cfc03b3b1ed4f322234efa8307ac61be6139e918c6b54d`
18. `src/styles/universe-pages.module.css` — `ae73a17caec59719d6edb97158652f2e0c2c18c88eecf7aa9038fa07f8dbe67e`
19. `src/styles/design-contract.test.ts` — `83d859776ca0d32ec478ae4f831a641e13a1b52ead650434d38d0854d0904d6d`
20. `tests/e2e/home.spec.ts` — `f2e755ea91f6f5ad698f35f364a657379dc955f3c2fb677b0b55d146da0365e8`
21. `tests/e2e/responsive.spec.ts` — `ff907da6fda63215b3ef47caf77e1cf059038b79cebd35b7b17ff0813710ac`
22. `tests/e2e/progressive-enhancement.spec.ts` — `6313a5ed4728ef2c7b37dd8afc070fc72654ce701615e4b16b3744a17d632cf9`
23. `src/components/stage/arc-instrument-stage.test.tsx` — `977b762e7060b6de10efd803c560bf2a8287832848efbf92cb07f61c2e6d72b5`

## Implementation Evidence

- A initial: RED `9 failed / 18 pass` plus 3 focused REDs; final 29/29.
- A static audit: `FIX_REQUIRED` for detail hidden/unmount and pending history.
- A1: RED `5 failed / 16 pass`; final 21/21; aggregate `4ae1c9dacca181a007b70b9aad61bd5f32093b45dd72aff11ba011ebd31b6de5`.
- B initial: RED `6 failed / 7 pass`; final 13/13.
- B Architecture E2E evidence review: `FIX_REQUIRED`; Fix1 changed only E2E, final six-file aggregate `ca20d6d38ee1101c05a9b03bbbd1cc6d45eeba67d40f2319cd1655c2a509f3d0`.
- C initial: 8 intended RED plus one pre-existing selector baseline defect; final 40/40. Architecture returned inline-size transition; follow-up RED 2/40 and final 40/40. Aggregate `90dd83826c20647e2a7e97345e89d76af57f70afb413e8eec0d1fabf163202d3`.
- Arc contract Fix1: existing RED 1/7, final 7/7; only test file changed.
- Architecture fresh combined focused: 6 files / 74 tests PASS.
- Architecture fresh full `npm run verify`: lint PASS, typecheck PASS, 33 files / 385 tests PASS.
- `openspec validate build-project-universe --strict --no-interactive`: PASS.
- `git diff --check`: PASS.
- Playwright static collection: 52 tests / 5 changed E2E files PASS.

## Protected State

- `.gitignore` — `af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94`
- `main.py` — `bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0`
- `AGENTS.md` — `1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf`
- `.agents/**` aggregate — `0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770`
- `playwright.config.ts` — `141b884d843e21c451d1e129b4458f67c166dc311f5be60372223cee800d7c54`

## Mandatory Review Focus

1. Source history cancellation only clears a genuinely pending destination and does not break the normal 120ms source→detail token handoff.
2. Detail token lease cleanly distinguishes StrictMode replay from true unmount; hidden/finish paths do not leave listeners, timers, storage or map entries.
3. Carrier root/parts geometry facts are fail-closed and do not count the full viewport root toward the ≤35% component-area rule.
4. Project E2E unscrolled eager proof cannot be satisfied by later disclosure scrolling; currentSrc is matched to a real successful response.
5. Default height waits for fonts/media and closed details; expanded overflow checks both viewports without applying the closed-height cap.
6. Home visual preview never mutates committed title/CTA/ARIA/live region and uses no layout-property transition.
7. Rialo mobile visual hiding keeps complete accessible controls and only one visible active description.
8. No route/content/catalog/SEO/real-link/Canvas demand/threshold/config drift.

## Reviewer Validation

Run:

```bash
npm run verify
openspec validate build-project-universe --strict --no-interactive
git diff --check
npx playwright test \
  tests/e2e/cinematic-motion.spec.ts \
  tests/e2e/project-detail.spec.ts \
  tests/e2e/home.spec.ts \
  tests/e2e/responsive.spec.ts \
  tests/e2e/progressive-enhancement.spec.ts \
  --list
```

Do not run real Playwright/browser, build, server, ports or deployment. Those remain Architecture VERIFY gates after `PASS`.
