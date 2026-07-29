# Handoff Task Package — Task 14.18 Editorial Instrument Cut

> 状态：`APPROVED_FOR_IMPLEMENTATION`。Slice A 已完成 Architecture 静态集成，以下 baseline 在派工前冻结。

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.18`
- SliceId: `editorial-instrument-cut`
- Executor: GPT-5.6 Sol Implementation worker
- IntegrationOwner: Architecture Codex `/root`
- ReviewMode: independent Review Codex after all slices integrate
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- Baseline aggregate: `608f04b77c3b60afc35356ec324c88b9ddd9695f38c2367af58a906ca0a398fa`

## Frozen Baseline SHA-256

按 Editable Files 顺序：

1. `src/components/project/project-case-study.tsx` — `3434becc89725b355d578e9ebf13134014bea88e0d284da9a9b3b8bf2df6148d`
2. `src/components/project/project-case-study.module.css` — `80f622634c179e0140a9caa19801fd6690af82267c85550ab07a87295deb92ee`
3. `src/components/project/project-gallery.tsx` — `450d83a5d02f4ba8a52089d8086b8169edcb7c3678ffe7b5d4b68d6846c31e23`
4. `src/components/project/signature/project-signature.module.css` — `8ff674597dcfa88fb3b1b1c92fd5e1803a642cfc5edd528b11db2309b7799579`
5. `src/components/project/project-case-study.test.tsx` — `cdd6a2e7b0bde77bdb50c31e8e7bbc1c8bb8230e542f504fbaed3233b342a90a`
6. `tests/e2e/project-detail.spec.ts` — `4f4745f6d01c786c3311500e33d1274af2b525d46975388db66d0ef7c0036218`

## Acceptance Criteria

1. 四个项目继续精确只有 `Problem / Mechanism / Proof` 三个顶层 region、一个 live CTA、真实生态返回和下一项目链接。
2. Proof 的真实 DOM 顺序为 representative media → product evidence；不得只用 CSS `order` 伪造。
3. 每页 `gallery[0]` 使用 `loading="eager"`，但不传 `priority`、`preload` 或 high `fetchPriority`；`gallery[1..]` 保持 lazy。
4. 详情 Hero 在 1440×1000 与 390×844 为 viewport 的 70–78%。
5. Mechanism 最多五节点：≥1180px 为一行五列，820–1179px 为 3+2，≤819px 为紧凑单列。
6. desktop Proof 约 2fr media / 1fr evidence，移动端 media 在 evidence 上方；图片填满其 media column。
7. 删除 Hero 中部全宽线、gallery 顶部全宽线与图片四边框；保留章节短节奏线、Technical notes/Navigator 功能分隔、signature 内部轴/节点/刻度和 focus/CTA 边界。
8. 默认 disclosures 关闭、字体和 eager image 稳定后，四页 document height 在 1440×1000 不超过 3200px，在 390×844 不超过 3400px。
9. 展开全部原生 disclosures 后允许自然增高，但所有 catalog limits/roles/tags/stack/steps/evidence/captions、alt、状态、live URL、no-JS 与 reduced-motion 事实可读且无横向溢出。
10. 不恢复 Slice A 已删除的 dark veil 或旧 arrival API，不新增 Canvas、依赖、scroll listener、route/content/SEO 改动。

## Editable Files

```text
src/components/project/project-case-study.tsx
src/components/project/project-case-study.module.css
src/components/project/project-gallery.tsx
src/components/project/signature/project-signature.module.css
src/components/project/project-case-study.test.tsx
tests/e2e/project-detail.spec.ts
```

## Forbidden Files / Actions

- 上述文件之外的全部文件。
- Carrier bridge/CSS、ProjectHero、CoreLoop、EvidenceSection、StackLanes、Navigator、catalog、Project types、media registry/assets、routes、metadata/JSON-LD、dependencies、budgets、Playwright config。
- `.codex/**`、`openspec/**`、`docs/**`、`.gitignore`、`main.py`、`AGENTS.md`、`.agents/**`。
- browser、build、server、Lighthouse、端口、Vercel、commit、reset/restore。

## Frozen Implementation Contract

- Proof 在 TSX 中直接渲染 `<ProjectGallery />` 后渲染 `<EvidenceSection />`。
- ProjectGallery 按 index 决定 `loading`；即使当前 catalog 每页只有一张，单元 synthetic gallery 也必须证明未来 `[1..]` lazy。
- `next/image` 的 no-priority/no-preload 在 mock 捕获的 props 层断言，不能只依赖最终 `<img>` attributes。
- 不给图片设置 priority、preload 或 high fetch priority；不修改静态媒体注册。
- Hero 使用 70–78svh 范围的简单 viewport contract，最终由真实 geometry 裁决。
- CSS 结构断点固定为 ≥1180 五列、820–1179 三列、≤819 单列；E2E 必须验证级联后的真实行数。
- 默认高度 gate 只在 disclosures 关闭时执行；展开后只要求事实完整、原生可操作与横向无溢出。

## TDD Requirements

RED 先固定：

- Proof region 的 media/evidence 共享 `.proofBody` 直接父级，children 顺序严格为 `[gallerySection, evidenceSection]`。
- 用三张已注册资产构造 synthetic gallery；Image prop spy 断言 `[eager, lazy, lazy]` 且无 priority/preload/high fetchPriority。
- CSS source contract：Hero 70–78svh；五列/三列/单列；Proof 2fr/1fr；无 `.heroStage::after` 全宽线、gallery 顶线和 gallery image 四边框。
- E2E 在不滚动时监听实际 Next Image `currentSrc/src` 请求，证明 gallery[0] eager、无 image preload/high priority、natural size 非零且无 4xx/5xx。
- E2E 在 1440/980/390 对五个 mechanism item 按 top 2px 容差聚类，行数严格为 `[5]`、`[3,2]`、`[1,1,1,1,1]`。
- E2E 对四项目测量 Hero ratio、Proof 2/3/stacked geometry、默认全文 height 和 expanded horizontal overflow。
- 现有三章、事实、native details、static params、唯一 CTA、真实链接、no-JS、无 Canvas/iframe 与 reduced-motion 断言不得删除或放宽。

## Worker Validation

```bash
npm test -- --run src/components/project/project-case-study.test.tsx

./node_modules/.bin/eslint \
  src/components/project/project-case-study.tsx \
  src/components/project/project-gallery.tsx \
  src/components/project/project-case-study.test.tsx \
  tests/e2e/project-detail.spec.ts \
  --max-warnings=0

npm run typecheck
npx playwright test tests/e2e/project-detail.spec.ts --list
git diff --check
```

真实 browser geometry、3100、build、Lighthouse 与 Art Director 只由 Architecture 在集成阶段执行。

## Deliverables

- RED 与 GREEN 命令、失败/通过数量。
- changed files 与逐文件 SHA-256、allowlist-ordered aggregate。
- 对十条 acceptance 的逐项覆盖。
- 未验证项、风险、scope expansion 请求。
- 明确确认未运行 browser/build/server/端口/Vercel/commit。
