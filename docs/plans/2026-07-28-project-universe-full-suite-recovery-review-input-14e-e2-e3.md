# Review Input — Task 14.20 Full-Suite Recovery E2–E3

## Decision Requested

Return exactly one decision: `PASS`, `FIX_REQUIRED` or `DOWNGRADE`.

This is an independent source/static review. Do not run a browser, build, server, port, Lighthouse, Vercel or Git write operation. Architecture owns production 3100, candidate images and snapshot acceptance.

## Identity

- ChangeId: `build-project-universe`
- TaskId: `14.20`
- Slices:
  - `rialo-committed-preview-race-fix-e2`
  - `stage-local-static-visual-contract-e3`
- GitBaseline: `UNBORN_HEAD`
- Graphify: `DEGRADED_NO_GRAPHIFY_OUT`
- ImplementationExecutors:
  - GPT-5.6 Sol `/root/implement_rialo_race_e2`
  - GPT-5.6 Sol `/root/implement_visual_contract_e3`
- IntegrationOwner: Architecture Codex `/root`

## Required Inputs

Read:

1. `AGENTS.md`
2. `.codex/session-state.md`
3. OpenSpec design §21.5–21.7, progressive same-committed scenario and site-quality visual migration scenarios
4. E2 handoff: `docs/plans/2026-07-28-project-universe-rialo-committed-preview-race-handoff-14e-e2.md`
5. E3 handoff: `docs/plans/2026-07-28-project-universe-stage-local-visual-contract-handoff-14e-e3.md`
6. all three final files in full
7. frozen `tests/e2e/cinematic-motion.spec.ts` only where needed to verify unchanged gates

## Scope and Hashes

E2 editable files:

1. `src/components/scene/scene-target-controller.client.tsx`
   - baseline `44fff3042ba2894b759aec5a7b9f038ef548381e4ae3299f890a5ac067937afb`
   - final `e5a0d64191ae97c06bd867d1e39fc4416bd4ca185499eeed68c93818b2980cd4`
2. `src/components/scene/scene-target-controller.test.tsx`
   - baseline `72b721ae09c34d1988582216e197f5b1632dcc780aa0d1ed5fb5019bdb296fd7`
   - final `6c2009051443231f1e5e9081fa761f6e8ba41936318d5ba6c59a964df61e2895`

E2 baseline aggregate:
`8e94d9049bee00809f4668bc0d9985912db1a502a659a3310f948e6ff22c7d63`

E2 final aggregate:
`45188a40b8abc632c4f3be813008d7170ef82b982b823ab9117b6955bd45a44d`

E3 editable file:

1. `tests/e2e/visual-reference.spec.ts`
   - baseline `926922dbf04b21d868c5b872f91c0de1bbaa1a1533185650f899ba5feb384755`
   - final `3d4fff21603cc70bf3c9672f1733558433173b8c42f08ff90a4ec5f3aabc8f98`

E3 baseline aggregate:
`b97a66e889f875717d91655eae2a53a1bf6b2f44701c09733a2772ce190c9540`

E3 final aggregate:
`2b592ac45a0f730b69f5bb81b8e992c08148d87a523e44a8b3b590b0e42ada8e`

Final three-file aggregate:
`3f621107ace635e836ed4b38bd75d5b2f1a9902d897778ef4283b9e6e273698f`

Protected hashes:

- `.gitignore` — `af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94`
- `main.py` — `bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0`
- `AGENTS.md` — `1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf`
- `.agents/**` aggregate — `0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770`
- `playwright.config.ts` — `141b884d843e21c451d1e129b4458f67c166dc311f5be60372223cee800d7c54`

Snapshot state:

- six existing expected binaries remain at their Task13 hashes;
- `rialo-390-chromium-darwin.png` is `ABSENT`;
- no snapshot binary is accepted by this review.

## TDD and Architecture Evidence

E2 RED:

- 4 intended failures / 10 preserved passes;
- same-committed clear order incorrectly published `preview`;
- dual-modality true different-target return incorrectly published `commit`;
- product client remained at baseline hash.

E2 GREEN:

- 14/14 focused PASS;
- same-committed enter with no genuine visual preview returns the existing state and stores no phantom source;
- a genuine different-target preview retains the existing preview/fallback state path.

E3 RED:

- production Static Home/Arc structure failed at `57.59375px` desktop and `16px` mobile because the old test required viewport edges;
- those values are exact stage gutters after the approved D2 containment fix.

E3 integrated browser evidence on the unchanged E1 production build:

- explicit `--update-snapshots=none`;
- all seven tests reached `toHaveScreenshot`, proving the migrated structural/open-surface/radial/overflow/clipping checks passed;
- result was exactly six old-snapshot mismatches plus one missing Rialo390;
- no source snapshot was created.

Architecture fresh static evidence:

- `npm run verify`: PASS; 33 files / 392 tests
- strict OpenSpec: PASS
- cinematic + visual collection: PASS; 12 tests
- `git diff --check`: PASS
- final/protected hashes: exact

## Required Review Questions

1. Does E2 make same-committed enter/leave a true no-op only when no genuinely different visual preview is active?
2. Does E2 preserve a real different-target preview and its dual-modality 220ms return/fallback?
3. Are commit revision, announcement, route filtering and unknown-target fail-closed behavior preserved?
4. Does E3 assert pseudo `inset-inline` zero, stage-edge projection, radial presence/visibility and no horizontal overflow?
5. Does E3 fail closed against overflow clipping, clip-path, mask and paint containment without changing screenshot thresholds?
6. Are all seven reference names/viewports and all pre-existing structural/static/runtime checks retained?
7. Are all snapshot binaries still unaccepted/frozen and is the gate order Review PASS → candidate inspection → Art Director GO → Architecture snapshot update explicit?
8. Are UniverseShell, Canvas/Three, scene/Rialo product code, 780/220ms constants, four material steps, 50ms, routes, English copy and production debug surface unchanged?

## Forbidden Review Actions

- Do not edit any file.
- Do not run browser/build/server/ports/Lighthouse/Vercel/Git writes.
- Do not create or update snapshot binaries.
- Do not weaken timing, material, overflow, screenshot or accessibility gates.
