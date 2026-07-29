# Review Input — Task 14.20 Production Recovery D1–D4

## Decision Contract

Independent Review Codex returns exactly `PASS`, `FIX_REQUIRED`, or `DOWNGRADE`. It is read-only and must not run browser, build, server, ports, Lighthouse, Vercel or git mutation.

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.20`
- Architecture owner: `/root`
- Implementation executor: four disjoint GPT-5.6 Sol workers
- Git baseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- Current 3100: previous unaccepted build remains running; reviewer must not touch it
- Final 15-file ordered aggregate: `3497a38e367fda4829ab86beb9b1973dcaab1efaabe5ea073a8369d52ddb8e31`

## Sources

Read completely:

1. `AGENTS.md`
2. `.codex/session-state.md`
3. OpenSpec design §20.8 and §21.5–21.6, Task 14.20, project-detail/progressive/site-quality deltas
4. D1–D4 handoff packages
5. This manifest and all changed source/tests

## Pre-change Browser Evidence

- Changed production Chromium: `38/52 PASS`, `14 FAIL`.
- Art Director: `NO_GO`, no P0, one P1: SIGNAL/LEDGER mobile default height `3487 > 3400`.
- Read-only diagnoses:
  - ReactDOM server auto-hoisted eager image preload;
  - detail height matrix exceeded limits in all 8 samples;
  - Home/Arc `50vw` pseudo bleed caused internal scroll;
  - CapabilityGate skipped off-DOM probe and production runner read development-only debug;
  - legacy headless ANGLE gap caused deterministic cinematic facts-frame skew, while full Chromium did not;
  - High→Medium is legal OpenSpec adaptive behavior.

## Acceptance Summary

### D1 Detail

- representative image remains eager and uses native low fetch priority only to suppress React auto-preload;
- no Next priority/preload/high fetch priority; deferred images remain lazy;
- raw/hydrated preload count zero, unscrolled real request/natural size preserved;
- full 4×2 height matrix must meet 3200/3400 without deleting facts or constraining expanded height.

### D2 Stage overflow

- only two `calc(50% - 50vw)` inline bleeds are removed;
- radial pseudos, feather, opacity, 220/780ms and protagonist geometry remain;
- stage/main internal scroll is fail-closed and no overflow hiding/clipping is introduced.

### D3 Capability / production evidence

- reduced/saveData zero probe; other candidates one StrictMode-safe off-DOM WebGL2 probe;
- failed probe remains Static without real Canvas or enhanced sentinel; successful probe releases temp context;
- production debug remains absent;
- development debug tests remain precise, production has equivalent navigation/lifecycle black-box gates;
- offscreen geometry is proven before pause assertions; no skip-only coverage.

### D4 Cinematic evidence

- file-local full Chromium, no global config change;
- enhanced quality accepts only High/Medium and rejects Low/Static/null;
- every 50ms, checkpoint, PNG, spatial/material/frame and 200ms gate is unchanged.

## Final Manifest

1. `src/components/project/project-gallery.tsx` — `6dbc2126a2797b950744371ab18e121c4991ce224473a2c632f204169345ea9a`
2. `src/components/project/project-case-study.module.css` — `971f23a2a9109f8ad845eaa53b659882d278f538081be66d04447811368f9110`
3. `src/components/project/project-case-study.test.tsx` — `c705959697519fe550fcee5783dd5bc5d2748f539d9a118702e7731919483206`
4. `tests/e2e/project-detail.spec.ts` — `43552185facacd759be70941048c9bf7e59d848f5964f8bdaaef93e11b031e6d`
5. `src/components/stage/instrument-stage.module.css` — `7d4825316586be342962fd3168afb560e0ba7109389bd27e486548c4e10bcba2`
6. `src/components/stage/instrument-stage.test.tsx` — `42e377dbe42ec68248be56d5b12dafe0ce5f24f5442b8e16020a1c76d0b368b9`
7. `src/components/stage/home-instrument-stage.test.tsx` — `9019eb5a4e43d36f16741507e3cff745b8a2cb76e0bcdf9299f0d1e918d0270b`
8. `src/components/stage/arc-instrument-stage.test.tsx` — `0789e417fafa5ef7036a3d892b88e8402296490c0b4a19eea3fbc7e7017d34c9`
9. `tests/e2e/responsive.spec.ts` — `ee67ee429ee27e7b0445df0c2a6c73d307e811b8bac9f847e6761fd20f986a79`
10. `src/components/scene/capability-gate.client.tsx` — `8c2e4bea42d53a0cc85f46e1409eb8477c502b5a262d09d326a75a9027899a40`
11. `src/components/scene/capability-gate.test.tsx` — `549e28af57456982ef7769b955701a0548ba3f1bfbc744a684bba79226208913`
12. `tests/e2e/progressive-enhancement.spec.ts` — `e1f99cd9a7e6aa5051502a509653e17fc231a95f4eb9852df1b13f15f9a4121c`
13. `src/test-support/cinematic-screencast-selector.ts` — `3fb0908f8a0a911fd46c1aa1f488b78c3927f9fda1ef6f4c038d2d7cfb3560f7`
14. `src/test-support/cinematic-screencast-selector.test.ts` — `164da59fe0b169c67028281a5f63708cc8b7f9b85845fabf106f4e12765312e8`
15. `tests/e2e/cinematic-motion.spec.ts` — `31b3323e175437b1c5d9b8393f1094322e86974fbebc5bea4a4bfe52b93c91a9`

Slice aggregates:

- D1 `6d61dbc092bf2b216e857c7fa03be50837406f986dfca7a030ebe39bf03d856d`
- D2 `222cb45f4935d5fe0a06421e50090f3ef3e115237a1bd42531140297eeca3100`
- D3 `3c8747fbe5e1717dc35704dfef53bc87593cc9b79d04c8a5b22219ed99318f78`
- D4 `c7e875baa4ed948558e073b7e6debcb283a6add7b258acd6b05b5a31272b1b86`

## TDD / Architecture Evidence

- D1 RED `2 fail / 11 pass`, GREEN `13/13`.
- D2 RED `3 fail / 24 pass`, GREEN `27/27`.
- D3 RED `3 fail / 12 pass`, GREEN `15/15`.
- D4 RED `3 fail / 80 pass`, GREEN `83/83`.
- Architecture combined focused: 6 files / 138 tests PASS.
- Architecture `npm run verify`: lint PASS, typecheck PASS, 33 files / 390 tests PASS.
- Strict OpenSpec PASS.
- `git diff --check` PASS.
- Production-mode changed E2E collection: 46 tests / 4 files PASS.

## Protected State

- `.gitignore` — `af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94`
- `main.py` — `bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0`
- `AGENTS.md` — `1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf`
- `.agents/**` aggregate — `0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770`
- `playwright.config.ts` — `141b884d843e21c451d1e129b4458f67c166dc311f5be60372223cee800d7c54`

## Mandatory Review Focus

1. Ensure native low fetch priority is narrowly scoped and does not undermine eager request evidence.
2. Ensure detail height tests collect every route/viewport and no content/expanded-height contract was weakened.
3. Ensure D2 did not replace overflow with clipping or shrink the protagonist.
4. Audit CapabilityGate probe lifetime, StrictMode replay, failed/success paths and context release.
5. Audit production E2E mode split for false skips, missing equivalents or debug leakage.
6. Confirm full-Chromium selection is file-local and all timing/spatial thresholds are byte-for-byte unchanged where frozen.
7. Re-run `npm run verify`, strict OpenSpec, diff-check and changed E2E `--list`; do not run browser/build/server/ports.
