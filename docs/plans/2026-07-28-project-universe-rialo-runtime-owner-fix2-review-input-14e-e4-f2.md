# Task 14.20 E4 Fix2 — 独立 Review Codex 输入

## Review Decision

独立 reviewer 只能输出：

- `PASS`
- `FIX_REQUIRED`
- `DOWNGRADE`

本次 review 是单文件 test-only runtime contract 迁移。产品、七张 snapshot、controller、Canvas/Three 与所有 cinematic 门槛均冻结。

## 身份与规范源

- ChangeId：`build-project-universe`
- TaskId：`14.20 / E4 Fix2`
- IntegrationOwner：Architecture Codex `/root`
- Graphify：`DEGRADED_NO_GRAPHIFY_OUT`
- GitBaseline：`UNBORN_HEAD`，存在用户与历史任务 dirty baseline
- OpenSpec：design §21.8、tasks 14.20
- Handoff：`docs/plans/2026-07-28-project-universe-rialo-runtime-owner-fix2-handoff-14e-e4-f2.md`

## 既有门禁与唯一 RED

E4 + Fix1 已先后获得：

- 独立 Review Codex `PASS`；
- production Rialo exact repeat8 `8/8 PASS`；
- full cinematic `5/5 PASS`；
- Art Director `GO`；
- 七张 snapshot 一次更新后 no-update `7/7 PASS`。

fresh full production 116 tests 得到：

```text
112 PASS
3 intentional development-only SKIP
1 FAIL
```

唯一失败是 `progressive-enhancement.spec.ts` 的 ambient runtime contract 仍要求旧 `.radar` 自身拥有一条 direct infinite animation。E4 后正确运行时关系是：

```text
radar spatial scope
├─ first corridor plane：direct main infinite translate loop
├─ second corridor plane
├─ radar reference
└─ route：sibling auxiliary opacity loop
```

因此 `.radar.getAnimations()` 为 0 是产品正确结果，而 `.radar.getAnimations({ subtree: true })` 包含 main + auxiliary。测试必须同时证明 direct main 与整个 scope，而不能删除 direct-owner 契约。

## 冻结文件与哈希

唯一修改文件：

`tests/e2e/progressive-enhancement.spec.ts`

- 基线 SHA-256：`e1f99cd9a7e6aa5051502a509653e17fc231a95f4eb9852df1b13f15f9a4121c`
- 最终 SHA-256：`34e86e43f0b80d39a7b53273301f51cdfa38dfe79dd2de67e8df61a2a7fce1e2`

E4 + Fix1 产品/测试四文件聚合继续冻结：

`e39af99ed367a4f85dbc0fc01cba6891c80e2b1fb5ce9977397dd8ecbb4152fe`

## Implementation Evidence

GPT-5.6 Sol worker 只修改上述一个 E2E 文件：

- `ambientMotionRoutes` 现在分别声明 `spatialScope` 与 `mainOwner`。
- Home、Arc 的 scope 与 main owner 相同。
- Rialo scope 仍是唯一 radar；main owner 是精确的 direct `> span:first-child`。
- 运行时验证 Rialo main owner 是 scope 的 `firstElementChild`、直接子节点且 `localName === 'span'`。
- helper 分别读取 `mainOwner.getAnimations()` 与 `spatialScope.getAnimations({ subtree: true })`。
- 非 Element / pseudo target 不能通过 containment。
- High/Medium 强制 main direct 恰 1、scope all 为 1–2、all 中 target 等于 main owner 的 animation 恰 1、所有 target 在 scope 内。
- 7–10s、负 delay、ready/demand/entry-settled/morph-idle、Canvas demand、control feedback ≤220ms 保留。
- Low 与 390px mobile 继续检查整个 scope subtree 为 0，不能漏掉 route sibling。
- keyframe property 白名单只从 `opacity/transform` 精确增加 `translate`。

worker 静态证据：

```text
npx eslint tests/e2e/progressive-enhancement.spec.ts
=> PASS

npm run typecheck
=> PASS

CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test tests/e2e/progressive-enhancement.spec.ts --list
=> 20 tests / 1 file

git diff --check -- tests/e2e/progressive-enhancement.spec.ts
=> PASS
```

## Architecture Fresh Verification

Architecture 检查最终 source 与 hash 后，在同一 reviewed production `127.0.0.1:3100` 上只运行原失败测试：

```text
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test \
  tests/e2e/progressive-enhancement.spec.ts \
  --grep "real protagonists own one gated" \
  --workers=1 --reporter=line
=> 1/1 PASS
```

其他 fresh 证据：

```text
npx eslint tests/e2e/progressive-enhancement.spec.ts
=> PASS

npm run typecheck
=> PASS

npm run verify
=> lint PASS
=> typecheck PASS
=> 33 files / 393 tests PASS

openspec validate build-project-universe --strict
=> valid

git diff --check -- <Fix2/OpenSpec/handoff/session/snapshot paths>
=> PASS
```

Protected hashes保持：

- `.gitignore`：`af9796baf2e93c6fa43c07ab8affe59ffca80ad57ba8ffcc14390bf090868f94`
- `main.py`：`bec6b07c8dc4f5cca9a44b4d1ea001eb4bdc141a8f258929a81519b600905ea0`
- `AGENTS.md`：`1d83a7cd803e5b77dc182e492f097eba1ec072d0b68229e7a6595dcaa88b86cf`
- `.agents/**` 聚合：`0603ddc338fa5cdbc19e271aeb54b6a4638f18234814ea087dea0865c8be7770`
- `playwright.config.ts`：`141b884d843e21c451d1e129b4458f67c166dc311f5be60372223cee800d7c54`

七张 snapshot hash 与 Art Director GO 后的冻结状态一致，详见 `.codex/session-state.md` 的 `Task14FinalRecoverySnapshotsE4`；worker 与 Architecture focused 验证均未再更新。

## Reviewer 必查

1. 最终 hash、单文件 allowlist 与 baseline 是否匹配。
2. scope/main 拆分是否保留 `.radar` 全范围保护，而不是只看 corridor。
3. Rialo main owner 是否精确证明 direct first real span，未用 `.first()`、class substring 或任意后代。
4. `mainDirect === 1`、scope `all === 1..2`、scope 内 main target 恰 1 是否同时成立。
5. pseudo/non-Element target 是否 fail-closed。
6. High/Medium、Low、mobile、demand、duration、delay、feedback 和 Canvas 契约是否未放宽。
7. property 白名单是否只新增 `translate`。
8. 产品、其他 E2E、snapshot、config、controller/Canvas/Three 与门槛是否未修改。

## Reviewer 可运行

```bash
npx eslint tests/e2e/progressive-enhancement.spec.ts
npm run typecheck
CAPTAIN_DOCK_EXTERNAL_PRODUCTION=1 npx playwright test tests/e2e/progressive-enhancement.spec.ts --list
npm run verify
openspec validate build-project-universe --strict
git diff --check -- tests/e2e/progressive-enhancement.spec.ts
```

reviewer 不得修改文件，不得运行真实 browser/build/server/port/Lighthouse/snapshot，不得部署 Vercel，不得 commit/push。

## PASS 后 Architecture 门禁

1. 重跑 full production 116 tests，必须 `113 PASS / 3 SKIP / 0 FAIL`。
2. 运行 build-gates、links、budgets 与 Lighthouse。
3. 复核 no-update visuals、OpenSpec strict、full verify、hashes、端口与最终 evidence。
4. 保持 reviewed build 只在 exact `127.0.0.1:3100` 运行，3000 空闲；不部署 Vercel。
